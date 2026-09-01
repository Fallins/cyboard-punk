use crate::models::{ProviderIssue, ProviderSnapshot, QuotaWindow};
use chrono::{DateTime, Utc};
use reqwest::blocking::Client;
use reqwest::header::{ACCEPT, CONTENT_TYPE, USER_AGENT};
use serde_json::{json, Value};
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;

const QUOTA_SUMMARY_PATH: &str = "/exa.language_server_pb.LanguageServerService/RetrieveUserQuotaSummary";
const USER_STATUS_PATH: &str = "/exa.language_server_pb.LanguageServerService/GetUserStatus";
const MODEL_CONFIGS_PATH: &str = "/exa.language_server_pb.LanguageServerService/GetCommandModelConfigs";
const TIMEOUT: Duration = Duration::from_secs(2);

#[derive(Debug, Clone, PartialEq, Eq)]
struct ProcessInfo {
    pid: u32,
    extension_port: Option<u16>,
    csrf_token: Option<String>,
    extension_csrf_token: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct LocalEndpoint {
    scheme: &'static str,
    port: u16,
    csrf_token: Option<String>,
}

pub fn collect() -> ProviderSnapshot {
    let processes = discover_processes();
    if processes.is_empty() {
        let installed = antigravity_installed();
        return ProviderSnapshot::unavailable(
            "antigravity",
            "Antigravity",
            if installed { "not-running" } else { "not-installed" },
            if installed {
                "Antigravity is installed, but CYBOARD could not detect a running Antigravity language server"
            } else {
                "Antigravity app or agy CLI was not found"
            },
        );
    }

    let client = match local_client() {
        Ok(client) => client,
        Err(message) => return unavailable("network", message),
    };

    let mut best_quota = Vec::new();
    let mut endpoint_count = 0usize;
    let mut last_error = None;

    for process in &processes {
        let endpoints = endpoints_for_process(process);
        endpoint_count += endpoints.len();
        for endpoint in endpoints {
            match fetch_from_endpoint(&client, &endpoint) {
                Ok(quota) if quota.len() > best_quota.len() => best_quota = quota,
                Ok(_) => {}
                Err(message) => last_error = Some(message),
            }
        }
    }

    if !best_quota.is_empty() {
        let mut snapshot = base_snapshot();
        snapshot.quota = best_quota;
        snapshot.capabilities.push("quota".into());
        return snapshot;
    }

    if endpoint_count == 0 {
        return unavailable(
            "local-service-unavailable",
            "Antigravity language server was detected, but CYBOARD could not find any listening quota-service ports",
        );
    }

    unavailable(
        "local-service-unavailable",
        last_error.unwrap_or_else(|| {
            format!(
                "Detected {} Antigravity language server process(es) and {} local endpoint candidate(s), but no quota endpoint returned recognized data",
                processes.len(),
                endpoint_count
            )
        }),
    )
}

fn base_snapshot() -> ProviderSnapshot {
    ProviderSnapshot {
        provider: "antigravity".into(),
        display_name: "Antigravity".into(),
        capabilities: Vec::new(),
        quota: Vec::new(),
        quota_history: Vec::new(),
        usage: Vec::new(),
        sessions: Vec::new(),
        freshness: "fresh".into(),
        updated_at: Utc::now().to_rfc3339(),
        issue: None,
    }
}

fn unavailable(code: &str, message: impl Into<String>) -> ProviderSnapshot {
    let mut snapshot = base_snapshot();
    snapshot.freshness = "unavailable".into();
    snapshot.issue = Some(ProviderIssue {
        code: code.into(),
        message: message.into(),
        retry_at: None,
    });
    snapshot
}

fn antigravity_installed() -> bool {
    let home = home_dir();
    which::which("agy").is_ok()
        || which::which("antigravity-cli").is_ok()
        || PathBuf::from("/Applications/Antigravity.app").exists()
        || PathBuf::from("/Applications/Antigravity IDE.app").exists()
        || home.join("Applications/Antigravity.app").exists()
        || home.join("Applications/Antigravity IDE.app").exists()
}

fn home_dir() -> PathBuf {
    std::env::var_os("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("~"))
}

fn discover_processes() -> Vec<ProcessInfo> {
    let output = match Command::new("/bin/ps")
        .args(["-ww", "-axo", "pid=,command="])
        .output()
    {
        Ok(output) => output,
        Err(_) => return Vec::new(),
    };
    let text = String::from_utf8_lossy(&output.stdout);
    text.lines().filter_map(parse_process_line).collect()
}

fn parse_process_line(line: &str) -> Option<ProcessInfo> {
    let command = line.trim();
    let pid = command.split_whitespace().next()?.parse::<u32>().ok()?;
    let lower = command.to_lowercase();
    let language_server = lower.contains("language_server") || lower.contains("language-server");
    let antigravity = lower.contains("antigravity")
        || lower.contains("/gemini.app/")
        || (lower.contains("--cloud_code_endpoint") && lower.contains("--extension_server_port"));
    if !language_server || !antigravity {
        return None;
    }

    Some(ProcessInfo {
        pid,
        extension_port: extract_flag(command, "--extension_server_port")
            .and_then(|value| value.parse::<u16>().ok()),
        csrf_token: extract_flag(command, "--csrf_token"),
        extension_csrf_token: extract_flag(command, "--extension_server_csrf_token"),
    })
}

fn extract_flag(command: &str, flag: &str) -> Option<String> {
    let parts = command.split_whitespace().collect::<Vec<_>>();
    for (index, part) in parts.iter().enumerate() {
        if let Some(value) = part.strip_prefix(&format!("{flag}=")) {
            let value = value.trim_matches(|character| character == '\'' || character == '"');
            return (!value.is_empty()).then(|| value.to_string());
        }
        if *part == flag {
            return parts
                .get(index + 1)
                .map(|value| value.trim_matches(|character| character == '\'' || character == '"').to_string())
                .filter(|value| !value.is_empty());
        }
    }
    None
}

fn listening_ports(pid: u32) -> Vec<u16> {
    let lsof = ["/usr/sbin/lsof", "/usr/bin/lsof"]
        .into_iter()
        .find(|path| PathBuf::from(path).exists());
    let Some(lsof) = lsof else {
        return Vec::new();
    };
    let output = match Command::new(lsof)
        .args(["-nP", "-iTCP", "-sTCP:LISTEN", "-a", "-p", &pid.to_string()])
        .output()
    {
        Ok(output) => output,
        Err(_) => return Vec::new(),
    };
    parse_lsof_ports(&String::from_utf8_lossy(&output.stdout))
}

fn parse_lsof_ports(output: &str) -> Vec<u16> {
    let mut ports = Vec::new();
    for line in output.lines().filter(|line| line.contains("(LISTEN)")) {
        let prefix = line.split("(LISTEN)").next().unwrap_or(line);
        let Some(colon) = prefix.rfind(':') else {
            continue;
        };
        let tail = prefix[colon + 1..].trim();
        let port_text = tail.split_whitespace().next().unwrap_or("");
        let Ok(port) = port_text.parse::<u16>() else {
            continue;
        };
        if !ports.contains(&port) {
            ports.push(port);
        }
    }
    ports.sort_unstable();
    ports
}

fn endpoints_for_process(process: &ProcessInfo) -> Vec<LocalEndpoint> {
    let mut ports = listening_ports(process.pid);
    if let Some(port) = process.extension_port {
        if !ports.contains(&port) {
            ports.push(port);
        }
    }
    ports.sort_unstable();

    let mut endpoints = Vec::new();
    let https_token = process.csrf_token.clone().or_else(|| process.extension_csrf_token.clone());
    for port in ports {
        push_endpoint(
            &mut endpoints,
            LocalEndpoint {
                scheme: "https",
                port,
                csrf_token: https_token.clone(),
            },
        );
    }

    if let Some(port) = process.extension_port {
        push_endpoint(
            &mut endpoints,
            LocalEndpoint {
                scheme: "http",
                port,
                csrf_token: process
                    .extension_csrf_token
                    .clone()
                    .or_else(|| process.csrf_token.clone()),
            },
        );
    }
    endpoints
}

fn push_endpoint(endpoints: &mut Vec<LocalEndpoint>, endpoint: LocalEndpoint) {
    if !endpoints.contains(&endpoint) {
        endpoints.push(endpoint);
    }
}

fn local_client() -> Result<Client, String> {
    Client::builder()
        .timeout(TIMEOUT)
        .connect_timeout(Duration::from_millis(600))
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|error| format!("Unable to create Antigravity localhost client: {error}"))
}

fn metadata_payload() -> Value {
    json!({
        "metadata": {
            "ideName": "antigravity",
            "extensionName": "antigravity",
            "locale": "en",
            "ideVersion": "unknown"
        }
    })
}

fn post_json(client: &Client, endpoint: &LocalEndpoint, path: &str, body: &Value) -> Result<Value, String> {
    let url = format!("{}://127.0.0.1:{}{}", endpoint.scheme, endpoint.port, path);
    let mut request = client
        .post(&url)
        .header(CONTENT_TYPE, "application/json")
        .header(ACCEPT, "application/json")
        .header(USER_AGENT, "CYBOARD/0.1.0")
        .header("Connect-Protocol-Version", "1")
        .json(body);
    if let Some(token) = endpoint.csrf_token.as_deref().filter(|token| !token.is_empty()) {
        request = request.header("X-Codeium-Csrf-Token", token);
    }
    let response = request
        .send()
        .map_err(|error| format!("Antigravity localhost {}:{} request failed: {error}", endpoint.scheme, endpoint.port))?;
    let status = response.status();
    if !status.is_success() {
        return Err(format!(
            "Antigravity localhost {}:{} returned HTTP {}",
            endpoint.scheme,
            endpoint.port,
            status.as_u16()
        ));
    }
    response
        .json::<Value>()
        .map_err(|error| format!("Antigravity localhost response could not be parsed: {error}"))
}

fn fetch_from_endpoint(client: &Client, endpoint: &LocalEndpoint) -> Result<Vec<QuotaWindow>, String> {
    let mut errors = Vec::new();

    match post_json(client, endpoint, QUOTA_SUMMARY_PATH, &json!({ "forceRefresh": true })) {
        Ok(payload) => {
            let quota = parse_quota_summary(&payload);
            if !quota.is_empty() {
                return Ok(quota);
            }
            errors.push("quota summary had no recognized buckets".to_string());
        }
        Err(message) => errors.push(message),
    }

    for path in [USER_STATUS_PATH, MODEL_CONFIGS_PATH] {
        match post_json(client, endpoint, path, &metadata_payload()) {
            Ok(payload) => {
                let quota = parse_legacy_quota(&payload);
                if !quota.is_empty() {
                    return Ok(quota);
                }
                errors.push(format!("{path} had no recognized quota models"));
            }
            Err(message) => errors.push(message),
        }
    }

    Err(errors
        .into_iter()
        .last()
        .unwrap_or_else(|| "Antigravity local quota endpoints returned no usable data".into()))
}

fn parse_quota_summary(payload: &Value) -> Vec<QuotaWindow> {
    let root = payload.get("response").unwrap_or(payload);
    let Some(groups) = root.get("groups").and_then(Value::as_array) else {
        return Vec::new();
    };
    let mut quota = Vec::new();
    for group in groups {
        let group_name = group
            .get("displayName")
            .or_else(|| group.get("display_name"))
            .and_then(Value::as_str)
            .unwrap_or("Models");
        let Some(buckets) = group.get("buckets").and_then(Value::as_array) else {
            continue;
        };
        for bucket in buckets {
            if bucket.get("disabled").and_then(Value::as_bool) == Some(true) {
                continue;
            }
            let Some(remaining_fraction) = remaining_fraction(bucket) else {
                continue;
            };
            let bucket_id = bucket
                .get("bucketId")
                .or_else(|| bucket.get("bucket_id"))
                .and_then(Value::as_str)
                .unwrap_or("quota");
            let bucket_name = bucket
                .get("displayName")
                .or_else(|| bucket.get("display_name"))
                .and_then(Value::as_str)
                .unwrap_or(bucket_id);
            let cadence = cadence_label(bucket_id, bucket_name);
            let family = family_label(group_name);
            quota.push(QuotaWindow {
                id: format!("antigravity-{bucket_id}"),
                label: format!("{family} {cadence}"),
                used_percent: ((1.0 - remaining_fraction.clamp(0.0, 1.0)) * 100.0).clamp(0.0, 100.0),
                reset_at: reset_at(bucket),
            });
        }
    }
    quota.sort_by_key(|window| sort_key(&window.label));
    quota
}

fn parse_legacy_quota(payload: &Value) -> Vec<QuotaWindow> {
    let mut candidates = Vec::new();
    collect_legacy_models(payload, &mut candidates);

    let mut gemini: Option<(f64, Option<String>)> = None;
    let mut claude_gpt: Option<(f64, Option<String>)> = None;
    for (model, remaining, reset_at) in candidates {
        let lower = model.to_lowercase();
        let target = if lower.contains("gemini") {
            &mut gemini
        } else if lower.contains("claude") || lower.contains("gpt") {
            &mut claude_gpt
        } else {
            continue;
        };
        let replace = target.as_ref().map(|(current, _)| remaining < *current).unwrap_or(true);
        if replace {
            *target = Some((remaining, reset_at));
        }
    }

    let mut quota = Vec::new();
    if let Some((remaining, reset_at)) = gemini {
        quota.push(QuotaWindow {
            id: "antigravity-gemini-session".into(),
            label: "Gemini 5h".into(),
            used_percent: ((1.0 - remaining.clamp(0.0, 1.0)) * 100.0).clamp(0.0, 100.0),
            reset_at,
        });
    }
    if let Some((remaining, reset_at)) = claude_gpt {
        quota.push(QuotaWindow {
            id: "antigravity-claude-gpt-session".into(),
            label: "Claude/GPT 5h".into(),
            used_percent: ((1.0 - remaining.clamp(0.0, 1.0)) * 100.0).clamp(0.0, 100.0),
            reset_at,
        });
    }
    quota
}

fn collect_legacy_models(value: &Value, candidates: &mut Vec<(String, f64, Option<String>)>) {
    match value {
        Value::Object(map) => {
            if let Some(quota_info) = map.get("quotaInfo").or_else(|| map.get("quota_info")) {
                if let Some(remaining) = remaining_fraction(quota_info) {
                    let model = map
                        .get("modelOrAlias")
                        .and_then(|value| value.get("model"))
                        .or_else(|| map.get("model_or_alias").and_then(|value| value.get("model")))
                        .or_else(|| map.get("modelId"))
                        .or_else(|| map.get("model_id"))
                        .or_else(|| map.get("label"))
                        .or_else(|| map.get("displayName"))
                        .and_then(Value::as_str)
                        .unwrap_or("unknown")
                        .to_string();
                    candidates.push((model, remaining, reset_at(quota_info)));
                }
            }
            for nested in map.values() {
                collect_legacy_models(nested, candidates);
            }
        }
        Value::Array(items) => {
            for nested in items {
                collect_legacy_models(nested, candidates);
            }
        }
        _ => {}
    }
}

fn remaining_fraction(bucket: &Value) -> Option<f64> {
    bucket
        .get("remainingFraction")
        .or_else(|| bucket.get("remaining_fraction"))
        .and_then(number)
        .or_else(|| {
            let remaining = bucket.get("remaining")?;
            remaining
                .get("remainingFraction")
                .or_else(|| remaining.get("remaining_fraction"))
                .and_then(number)
                .or_else(|| {
                    (remaining.get("case")?.as_str()? == "remainingFraction")
                        .then(|| remaining.get("value").and_then(number))
                        .flatten()
                })
        })
}

fn number(value: &Value) -> Option<f64> {
    value
        .as_f64()
        .or_else(|| value.as_str().and_then(|text| text.parse::<f64>().ok()))
}

fn reset_at(bucket: &Value) -> Option<String> {
    for key in ["resetTime", "reset_time", "resetsAt", "resets_at"] {
        if let Some(value) = bucket.get(key) {
            if let Some(text) = value.as_str().filter(|text| !text.trim().is_empty()) {
                return Some(text.to_string());
            }
            if let Some(seconds) = value.as_i64() {
                return DateTime::<Utc>::from_timestamp(seconds, 0).map(|date| date.to_rfc3339());
            }
        }
    }
    None
}

fn family_label(group_name: &str) -> &'static str {
    let lower = group_name.to_lowercase();
    if lower.contains("gemini") {
        "Gemini"
    } else if lower.contains("claude") || lower.contains("gpt") {
        "Claude/GPT"
    } else {
        "Models"
    }
}

fn cadence_label(bucket_id: &str, bucket_name: &str) -> &'static str {
    let text = format!("{} {}", bucket_id, bucket_name).to_lowercase();
    if text.contains("week") || text.contains("7d") || text.contains("seven") {
        "7d"
    } else {
        "5h"
    }
}

fn sort_key(label: &str) -> u8 {
    match (label.starts_with("Gemini"), label.ends_with("5h")) {
        (true, true) => 0,
        (true, false) => 1,
        (false, true) => 2,
        (false, false) => 3,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parses_antigravity_process_flags_and_pid() {
        let line = "101 /Applications/Antigravity.app/Contents/Resources/bin/language_server_macos_arm --csrf_token ide-token --app_data_dir antigravity --extension_server_port 54977 --extension_server_csrf_token extension-token";
        assert_eq!(
            parse_process_line(line),
            Some(ProcessInfo {
                pid: 101,
                extension_port: Some(54977),
                csrf_token: Some("ide-token".into()),
                extension_csrf_token: Some("extension-token".into()),
            })
        );
    }

    #[test]
    fn parses_antigravity_ide_process() {
        let line = "202 /Applications/Antigravity IDE.app/Contents/Resources/app/extensions/antigravity/bin/language_server_macos_arm --enable_lsp --csrf_token=ide-token --extension_server_port=45513 --extension_server_csrf_token=extension-token --app_data_dir antigravity-ide";
        assert_eq!(parse_process_line(line).map(|process| process.pid), Some(202));
    }

    #[test]
    fn parses_antigravity_process_without_extension_port() {
        let line = "303 /opt/homebrew/bin/antigravity-cli language_server --csrf_token=cli-token --app_data_dir antigravity";
        let process = parse_process_line(line).expect("process should still be detected");
        assert_eq!(process.pid, 303);
        assert_eq!(process.extension_port, None);
    }

    #[test]
    fn parses_lsof_listening_ports() {
        let output = "language_ 101 user 20u IPv4 0x0 0t0 TCP 127.0.0.1:54977 (LISTEN)\nlanguage_ 101 user 21u IPv6 0x0 0t0 TCP [::1]:61234 (LISTEN)";
        assert_eq!(parse_lsof_ports(output), vec![54977, 61234]);
    }

    #[test]
    fn prefers_extension_csrf_for_http_fallback() {
        let process = ProcessInfo {
            pid: 999_999,
            extension_port: Some(54977),
            csrf_token: Some("ide-token".into()),
            extension_csrf_token: Some("extension-token".into()),
        };
        let endpoints = endpoints_for_process(&process);
        let http = endpoints
            .iter()
            .find(|endpoint| endpoint.scheme == "http" && endpoint.port == 54977)
            .unwrap();
        assert_eq!(http.csrf_token.as_deref(), Some("extension-token"));
    }

    #[test]
    fn parses_gemini_and_claude_quota_pools() {
        let payload = json!({
            "groups": [
                {
                    "displayName": "Gemini Models",
                    "buckets": [
                        {"bucketId": "gemini-5h", "displayName": "5-hour Limit", "remainingFraction": 0.62, "resetTime": "2026-09-01T20:00:00Z"},
                        {"bucketId": "gemini-weekly", "displayName": "Weekly Limit", "remaining": {"case": "remainingFraction", "value": 0.41}}
                    ]
                },
                {
                    "displayName": "Claude and GPT models",
                    "buckets": [
                        {"bucketId": "3p-5h", "remaining": {"remainingFraction": 0.8}},
                        {"bucketId": "3p-weekly", "remainingFraction": 0.7}
                    ]
                }
            ]
        });
        let quota = parse_quota_summary(&payload);
        assert_eq!(quota.len(), 4);
        assert_eq!(quota[0].label, "Gemini 5h");
        assert_eq!(quota[1].label, "Gemini 7d");
        assert_eq!(quota[2].label, "Claude/GPT 5h");
        assert_eq!(quota[3].label, "Claude/GPT 7d");
        assert_eq!(quota[0].used_percent.round(), 38.0);
        assert_eq!(quota[2].used_percent.round(), 20.0);
    }

    #[test]
    fn parses_legacy_ide_model_quota() {
        let payload = json!({
            "userStatus": {
                "cascadeModelConfigData": {
                    "clientModelConfigs": [
                        {
                            "label": "Gemini Flash",
                            "modelOrAlias": { "model": "gemini-flash" },
                            "quotaInfo": { "remainingFraction": 0.2, "resetTime": "2026-09-01T20:00:00Z" }
                        },
                        {
                            "label": "Claude Sonnet",
                            "modelOrAlias": { "model": "claude-sonnet" },
                            "quotaInfo": { "remainingFraction": 0.5 }
                        }
                    ]
                }
            }
        });
        let quota = parse_legacy_quota(&payload);
        assert_eq!(quota.len(), 2);
        assert_eq!(quota[0].label, "Gemini 5h");
        assert_eq!(quota[0].used_percent.round(), 80.0);
        assert_eq!(quota[1].label, "Claude/GPT 5h");
        assert_eq!(quota[1].used_percent.round(), 50.0);
    }
}