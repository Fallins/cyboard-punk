use crate::models::{ProviderSnapshot, UsageSample};
use chrono::{DateTime, Utc};
use std::path::{Path, PathBuf};
use std::process::Command;

const MAX_USAGE_ROWS: usize = 200;
const SQLITE_SEPARATOR: &str = "\u{1f}";

pub fn attach(snapshots: &mut [ProviderSnapshot]) {
    let Some(snapshot) = snapshots
        .iter_mut()
        .find(|snapshot| snapshot.provider == "codex")
    else {
        return;
    };
    let Some(database) = codex_state_db() else {
        return;
    };
    let usage = query_usage(&database);
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

fn codex_home() -> PathBuf {
    std::env::var_os("CODEX_HOME")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".codex")))
        .unwrap_or_else(|| PathBuf::from("~/.codex"))
}

fn codex_state_db() -> Option<PathBuf> {
    let home = codex_home();
    let mut candidates = std::fs::read_dir(&home)
        .ok()?
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let name = entry.file_name();
            let name = name.to_str()?;
            let version = state_database_version(name)?;
            Some((version, entry.path()))
        })
        .filter(|(_, path)| path.is_file())
        .collect::<Vec<_>>();
    candidates.sort_by_key(|(version, _)| *version);
    candidates.pop().map(|(_, path)| path).or_else(|| {
        let legacy = home.join("state.sqlite");
        legacy.is_file().then_some(legacy)
    })
}

fn state_database_version(name: &str) -> Option<u32> {
    name.strip_prefix("state_")?
        .strip_suffix(".sqlite")?
        .parse()
        .ok()
}

fn query_usage(database: &Path) -> Vec<UsageSample> {
    let modern = format!(
        "SELECT updated_at_ms, COALESCE(tokens_used, 0), COALESCE(cwd, '') \
         FROM threads WHERE COALESCE(tokens_used, 0) > 0 \
         ORDER BY updated_at_ms DESC LIMIT {MAX_USAGE_ROWS};"
    );
    run_query(database, &modern)
        .or_else(|| {
            let legacy = format!(
                "SELECT updated_at, COALESCE(tokens_used, 0), COALESCE(cwd, '') \
                 FROM threads WHERE COALESCE(tokens_used, 0) > 0 \
                 ORDER BY updated_at DESC LIMIT {MAX_USAGE_ROWS};"
            );
            run_query(database, &legacy)
        })
        .map(|text| parse_usage_rows(&text))
        .unwrap_or_default()
}

fn run_query(database: &Path, query: &str) -> Option<String> {
    let output = Command::new("/usr/bin/sqlite3")
        .args(["-readonly", "-batch", "-noheader", "-separator", SQLITE_SEPARATOR])
        .arg(database)
        .arg(query)
        .output()
        .ok()?;
    output.status.success().then(|| String::from_utf8_lossy(&output.stdout).into_owned())
}

fn parse_usage_rows(text: &str) -> Vec<UsageSample> {
    text.lines()
        .filter_map(|line| {
            let mut fields = line.splitn(3, SQLITE_SEPARATOR);
            let raw_timestamp = fields.next()?.trim().parse::<i64>().ok()?;
            let tokens = fields.next()?.trim().parse::<u64>().ok()?;
            if tokens == 0 {
                return None;
            }
            let cwd = fields.next().unwrap_or("").trim();
            let at = timestamp_to_rfc3339(raw_timestamp)?;
            Some(UsageSample {
                at,
                tokens: Some(tokens),
                input_tokens: None,
                output_tokens: None,
                cached_input_tokens: None,
                cache_creation_input_tokens: None,
                cost_usd: None,
                project: project_name(cwd),
                model: None,
                scope: Some("thread-total".into()),
            })
        })
        .collect()
}

fn timestamp_to_rfc3339(raw: i64) -> Option<String> {
    let millis = if raw.unsigned_abs() < 10_000_000_000 {
        raw.checked_mul(1000)?
    } else {
        raw
    };
    DateTime::<Utc>::from_timestamp_millis(millis).map(|timestamp| timestamp.to_rfc3339())
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

    #[test]
    fn recognizes_versioned_codex_state_databases() {
        assert_eq!(state_database_version("state_5.sqlite"), Some(5));
        assert_eq!(state_database_version("state_12.sqlite"), Some(12));
        assert_eq!(state_database_version("logs_2.sqlite"), None);
        assert_eq!(state_database_version("state.sqlite"), None);
    }

    #[test]
    fn parses_token_totals_and_project_from_state_rows() {
        let text = format!(
            "1788403200000{SQLITE_SEPARATOR}12345{SQLITE_SEPARATOR}/Users/test/code/cyboard-punk\n\
             1788406800{SQLITE_SEPARATOR}678{SQLITE_SEPARATOR}/Users/test/code/another-project\n"
        );
        let usage = parse_usage_rows(&text);
        assert_eq!(usage.len(), 2);
        assert_eq!(usage[0].tokens, Some(12_345));
        assert_eq!(usage[0].project.as_deref(), Some("cyboard-punk"));
        assert_eq!(usage[0].scope.as_deref(), Some("thread-total"));
        assert_eq!(usage[1].tokens, Some(678));
        assert_eq!(usage[1].project.as_deref(), Some("another-project"));
        assert!(usage[0].at.starts_with("2026-"));
        assert!(usage[1].at.starts_with("2026-"));
    }

    #[test]
    fn ignores_zero_or_malformed_usage_rows() {
        let text = format!(
            "1788403200000{SQLITE_SEPARATOR}0{SQLITE_SEPARATOR}/Users/test/code/zero\n\
             bad{SQLITE_SEPARATOR}120{SQLITE_SEPARATOR}/Users/test/code/bad\n"
        );
        assert!(parse_usage_rows(&text).is_empty());
    }
}
