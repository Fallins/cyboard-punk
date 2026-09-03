use crate::models::{ProviderSnapshot, UsageSample};
use chrono::{DateTime, Utc};
use serde_json::Value;
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader, Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

const MAX_TRANSCRIPT_FILES: usize = 24;
const MAX_TAIL_BYTES_PER_FILE: u64 = 1024 * 1024;
const MAX_USAGE_SAMPLES: usize = 200;
const MAX_DISCOVERY_DEPTH: usize = 6;

#[derive(Debug)]
struct UsageRecord {
    key: String,
    sample: UsageSample,
}

pub fn attach(snapshots: &mut [ProviderSnapshot]) {
    let Some(snapshot) = snapshots
        .iter_mut()
        .find(|snapshot| snapshot.provider == "claude")
    else {
        return;
    };

    let usage = collect_recent_usage();
    if usage.is_empty() {
        return;
    }

    let has_project_usage = usage.iter().any(|sample| sample.project.is_some());
    snapshot.usage = usage;
    snapshot.capabilities.push("usage".into());
    if has_project_usage {
        snapshot.capabilities.push("projectUsage".into());
    }
    snapshot.capabilities.sort();
    snapshot.capabilities.dedup();
}

fn claude_projects_root() -> Option<PathBuf> {
    let home = std::env::var_os("HOME").map(PathBuf::from)?;
    let root = home.join(".claude/projects");
    root.is_dir().then_some(root)
}

fn collect_recent_usage() -> Vec<UsageSample> {
    let Some(root) = claude_projects_root() else {
        return Vec::new();
    };
    let mut paths = transcript_paths(&root);
    paths.sort_by_key(|path| std::cmp::Reverse(modified_sort_key(path)));
    paths.truncate(MAX_TRANSCRIPT_FILES);

    let mut usage = paths
        .iter()
        .flat_map(|path| read_usage_tail(path))
        .collect::<Vec<_>>();
    usage.sort_by_key(|sample| std::cmp::Reverse(timestamp_sort_key(&sample.at)));
    usage.truncate(MAX_USAGE_SAMPLES);
    usage
}

fn transcript_paths(root: &Path) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    collect_transcript_paths(root, 0, &mut paths);
    paths
}

fn collect_transcript_paths(directory: &Path, depth: usize, paths: &mut Vec<PathBuf>) {
    if depth > MAX_DISCOVERY_DEPTH {
        return;
    }
    let Ok(entries) = std::fs::read_dir(directory) else {
        return;
    };
    for entry in entries.flatten() {
        let Ok(file_type) = entry.file_type() else {
            continue;
        };
        let path = entry.path();
        if file_type.is_dir() {
            collect_transcript_paths(&path, depth + 1, paths);
            continue;
        }
        if file_type.is_file() && path.extension().and_then(|extension| extension.to_str()) == Some("jsonl") {
            paths.push(path);
        }
    }
}

fn modified_sort_key(path: &Path) -> u128 {
    std::fs::metadata(path)
        .and_then(|metadata| metadata.modified())
        .ok()
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_nanos())
        .unwrap_or(0)
}

fn read_usage_tail(path: &Path) -> Vec<UsageSample> {
    let Ok(mut file) = File::open(path) else {
        return Vec::new();
    };
    let Ok(metadata) = file.metadata() else {
        return Vec::new();
    };
    let start = metadata.len().saturating_sub(MAX_TAIL_BYTES_PER_FILE);
    if file.seek(SeekFrom::Start(start)).is_err() {
        return Vec::new();
    }

    let mut reader = BufReader::new(file);
    if start > 0 {
        let mut partial = String::new();
        if reader.read_line(&mut partial).is_err() {
            return Vec::new();
        }
    }

    let mut text = String::new();
    if reader.read_to_string(&mut text).is_err() {
        return Vec::new();
    }
    parse_usage_text(&text)
}

fn parse_usage_text(text: &str) -> Vec<UsageSample> {
    let mut by_message = HashMap::<String, UsageSample>::new();
    for line in text.lines() {
        let Some(record) = parse_usage_line(line) else {
            continue;
        };
        match by_message.get(&record.key) {
            Some(existing) if !prefer_sample(&record.sample, existing) => {}
            _ => {
                by_message.insert(record.key, record.sample);
            }
        }
    }
    by_message.into_values().collect()
}

fn parse_usage_line(line: &str) -> Option<UsageRecord> {
    let value = serde_json::from_str::<Value>(line).ok()?;
    if value.get("type").and_then(Value::as_str) != Some("assistant") {
        return None;
    }

    let message = value.get("message")?;
    let usage = message.get("usage")?;
    let input_tokens = usage_u64(usage, "input_tokens");
    let output_tokens = usage_u64(usage, "output_tokens");
    let cache_creation = usage_u64(usage, "cache_creation_input_tokens");
    let cache_read = usage_u64(usage, "cache_read_input_tokens");
    let tokens = input_tokens
        .saturating_add(output_tokens)
        .saturating_add(cache_creation)
        .saturating_add(cache_read);
    if tokens == 0 {
        return None;
    }

    let key = message
        .get("id")
        .and_then(Value::as_str)
        .or_else(|| value.get("requestId").and_then(Value::as_str))
        .or_else(|| value.get("uuid").and_then(Value::as_str))?
        .to_string();
    let at = normalize_timestamp(value.get("timestamp")?.as_str()?)?;
    let cwd = value.get("cwd").and_then(Value::as_str).unwrap_or("");

    Some(UsageRecord {
        key,
        sample: UsageSample {
            at,
            tokens: Some(tokens),
            input_tokens: Some(input_tokens),
            output_tokens: Some(output_tokens),
            cached_input_tokens: Some(cache_read),
            cache_creation_input_tokens: Some(cache_creation),
            cost_usd: None,
            project: project_name(cwd),
            model: message
                .get("model")
                .and_then(Value::as_str)
                .filter(|model| !model.is_empty())
                .map(ToString::to_string),
            scope: Some("request".into()),
        },
    })
}

fn usage_u64(usage: &Value, key: &str) -> u64 {
    usage.get(key).and_then(Value::as_u64).unwrap_or(0)
}

fn prefer_sample(candidate: &UsageSample, existing: &UsageSample) -> bool {
    candidate.tokens.unwrap_or(0) > existing.tokens.unwrap_or(0)
        || (candidate.tokens == existing.tokens
            && timestamp_sort_key(&candidate.at) > timestamp_sort_key(&existing.at))
}

fn normalize_timestamp(raw: &str) -> Option<String> {
    DateTime::parse_from_rfc3339(raw)
        .ok()
        .map(|timestamp| timestamp.with_timezone(&Utc).to_rfc3339())
}

fn timestamp_sort_key(raw: &str) -> i64 {
    DateTime::parse_from_rfc3339(raw)
        .ok()
        .map(|timestamp| timestamp.timestamp_millis())
        .unwrap_or(i64::MIN)
}

fn project_name(cwd: &str) -> Option<String> {
    if cwd.is_empty() {
        return None;
    }
    Path::new(cwd)
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .map(ToString::to_string)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn assistant_line(id: &str, output_tokens: u64, sidechain: bool) -> String {
        json!({
            "type": "assistant",
            "isSidechain": sidechain,
            "cwd": "/Users/test/code/cyboard-punk",
            "uuid": format!("uuid-{id}-{output_tokens}"),
            "requestId": format!("request-{id}"),
            "timestamp": "2026-09-03T08:15:30.000Z",
            "message": {
                "id": id,
                "model": "claude-opus-4-7",
                "role": "assistant",
                "usage": {
                    "input_tokens": 3,
                    "cache_creation_input_tokens": 100,
                    "cache_read_input_tokens": 200,
                    "output_tokens": output_tokens
                }
            }
        })
        .to_string()
    }

    #[test]
    fn parses_request_usage_without_exposing_transcript_content() {
        let usage = parse_usage_text(&assistant_line("message-a", 10, false));
        assert_eq!(usage.len(), 1);
        let sample = &usage[0];
        assert_eq!(sample.tokens, Some(313));
        assert_eq!(sample.input_tokens, Some(3));
        assert_eq!(sample.output_tokens, Some(10));
        assert_eq!(sample.cached_input_tokens, Some(200));
        assert_eq!(sample.cache_creation_input_tokens, Some(100));
        assert_eq!(sample.project.as_deref(), Some("cyboard-punk"));
        assert_eq!(sample.model.as_deref(), Some("claude-opus-4-7"));
        assert_eq!(sample.scope.as_deref(), Some("request"));
    }

    #[test]
    fn deduplicates_streaming_writes_by_message_id() {
        let text = format!(
            "{}\n{}\n",
            assistant_line("message-a", 1, false),
            assistant_line("message-a", 20, false),
        );
        let usage = parse_usage_text(&text);
        assert_eq!(usage.len(), 1);
        assert_eq!(usage[0].output_tokens, Some(20));
        assert_eq!(usage[0].tokens, Some(323));
    }

    #[test]
    fn counts_sidechain_requests_because_subagents_consume_tokens() {
        let usage = parse_usage_text(&assistant_line("message-agent", 5, true));
        assert_eq!(usage.len(), 1);
        assert_eq!(usage[0].tokens, Some(308));
    }

    #[test]
    fn ignores_non_assistant_and_zero_usage_records() {
        let user = json!({
            "type": "user",
            "timestamp": "2026-09-03T08:15:30.000Z",
            "message": {"role": "user", "content": "synthetic fixture"}
        });
        let zero = json!({
            "type": "assistant",
            "uuid": "zero",
            "timestamp": "2026-09-03T08:15:30.000Z",
            "message": {"id": "zero", "usage": {"input_tokens": 0, "output_tokens": 0}}
        });
        let text = format!("{user}\n{zero}\n");
        assert!(parse_usage_text(&text).is_empty());
    }
}
