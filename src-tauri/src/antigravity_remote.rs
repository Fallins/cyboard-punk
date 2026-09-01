use crate::models::{ProviderIssue, ProviderSnapshot, QuotaWindow};
use chrono::Utc;
use reqwest::blocking::Client;
use reqwest::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE, USER_AGENT};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;

const KEYCHAIN_SERVICE: &str = "com.fallins.cyboard-punk.antigravity";
const KEYCHAIN_ACCOUNT: &str = "google-oauth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const LOAD_CODE_ASSIST_URL: &str = "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist";
const FETCH_AVAILABLE_MODELS_URL: &str = "https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels";
const RETRIEVE_USER_QUOTA_URL: &str = "https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota";
const NETWORK_TIMEOUT: Duration = Duration::from_secs(15);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OAuthCredentials {
    access_token: String,
    refresh_token: Option<String>,
    expires_at_millis: i64,
    id_token: Option<String>,
    email: Option<String>,
    project_id: Option<String>,
    client_id: String,
    client_secret: String,
    client_source: String,
}

#[derive(Debug, Clone)]
struct RemoteQuota {
    model_id: String,
    label: String,
    remaining_fraction: f64,
    reset_at: Option<String>,
}

#[derive(Debug)]
enum RemoteError {
    NotLoggedIn,
    PermissionDenied(String),
    Other(String),
}

pub fn collect() -> ProviderSnapshot {
    let Some(mut credentials) = (match load_credentials() {
        Ok(credentials) => credentials,
        Err(message) => return unavailable("keychain", message),
    }) else {
        return unavailable(
            "login-required",
            "Antigravity local service is unavailable and Google is not connected. Open Settings → Antigravity Cloud → Connect Google.",
        );
    };

    let access_token = match valid_access_token(&mut credentials) {
        Ok(token) => token,
        Err(message) => return unavailable("login-required", message),
    };

    match fetch_remote_snapshot(&access_token, &mut credentials) {
        Ok(snapshot) => {
            let _ = save_credentials(&credentials);
            snapshot
        }
        Err(RemoteError::NotLoggedIn) => unavailable(
            "login-required",
            "Antigravity Google authorization expired. Reconnect Google in Settings.",
        ),
        Err(RemoteError::PermissionDenied(message)) => unavailable(
            "cloud-not-permitted",
            format!(
                "Google sign-in is connected, but this account does not expose verifiable Antigravity quota through the remote Cloud Code API. Local Antigravity quota still works when the app is running. {message}"
            ),
        ),
        Err(RemoteError::Other(message)) => unavailable("network", message),
    }
}

fn unavailable(code: &str, message: impl Into<String>) -> ProviderSnapshot {
    ProviderSnapshot {
        provider: "antigravity".into(),
        display_name: "Antigravity".into(),
        capabilities: Vec::new(),
        quota: Vec::new(),
        quota_history: Vec::new(),
        usage: Vec::new(),
        sessions: Vec::new(),
        freshness: "unavailable".into(),
        updated_at: Utc::now().to_rfc3339(),
        issue: Some(ProviderIssue {
            code: code.into(),
            message: message.into(),
            retry_at: None,
        }),
    }
}

fn fresh_snapshot(quota: Vec<QuotaWindow>) -> ProviderSnapshot {
    ProviderSnapshot {
        provider: "antigravity".into(),
        display_name: "Antigravity".into(),
        capabilities: vec!["quota".into()],
        quota,
        quota_history: Vec::new(),
        usage: Vec::new(),
        sessions: Vec::new(),
        freshness: "fresh".into(),
        updated_at: Utc::now().to_rfc3339(),
        issue: None,
    }
}

fn fetch_remote_snapshot(access_token: &str, credentials: &mut OAuthCredentials) -> Result<ProviderSnapshot, RemoteError> {
    let metadata = json!({
        "metadata": {
            "ideType": "ANTIGRAVITY",
            "platform": "PLATFORM_UNSPECIFIED",
            "pluginType": "GEMINI"
        }
    });
    let code_assist = remote_post(LOAD_CODE_ASSIST_URL, access_token, &metadata)?;
    if credentials.project_id.is_none() {
        credentials.project_id = code_assist
            .pointer("/cloudaicompanionProject/value")
            .and_then(Value::as_str)
            .filter(|value| !value.trim().is_empty())
            .map(ToString::to_string);
    }

    let body = credentials
        .project_id
        .as_ref()
        .map(|project| json!({ "project": project }))
        .unwrap_or_else(|| json!({}));

    match remote_post(RETRIEVE_USER_QUOTA_URL, access_token, &body) {
        Ok(payload) => {
            let quota = normalize_remote_quotas(parse_quota_buckets(&payload));
            if !quota.is_empty() {
                return Ok(fresh_snapshot(quota));
            }
        }
        Err(RemoteError::PermissionDenied(_)) => {}
        Err(error) => return Err(error),
    }

    let models = remote_post(FETCH_AVAILABLE_MODELS_URL, access_token, &body)?;
    let raw = parse_available_models(&models);
    if raw.is_empty() {
        return Err(RemoteError::Other(
            "Antigravity cloud returned no recognized quota models".into(),
        ));
    }

    if raw.iter().all(|quota| quota.remaining_fraction >= 0.999) {
        return Err(RemoteError::PermissionDenied(
            "Google returned availability-style model data without verifiable quota fractions.".into(),
        ));
    }

    let quota = normalize_remote_quotas(raw);
    if quota.is_empty() {
        Err(RemoteError::Other(
            "Antigravity cloud quota could not be mapped to Gemini or Claude/GPT model families".into(),
        ))
    } else {
        Ok(fresh_snapshot(quota))
    }
}

fn remote_post(url: &str, access_token: &str, body: &Value) -> Result<Value, RemoteError> {
    let response = http_client()
        .map_err(RemoteError::Other)?
        .post(url)
        .header(AUTHORIZATION, format!("Bearer {access_token}"))
        .header(CONTENT_TYPE, "application/json")
        .header(ACCEPT, "application/json")
        .header(USER_AGENT, "antigravity")
        .json(body)
        .send()
        .map_err(|error| RemoteError::Other(format!("Antigravity cloud request failed: {error}")))?;
    let status = response.status();
    let text = response
        .text()
        .map_err(|error| RemoteError::Other(format!("Unable to read Antigravity cloud response: {error}")))?;

    match status.as_u16() {
        200 => serde_json::from_str::<Value>(&text)
            .map_err(|error| RemoteError::Other(format!("Unable to parse Antigravity cloud response: {error}"))),
        401 => Err(RemoteError::NotLoggedIn),
        403 => Err(RemoteError::PermissionDenied(redacted_error_message(&text))),
        code => Err(RemoteError::Other(format!(
            "Antigravity cloud returned HTTP {code}: {}",
            redacted_error_message(&text)
        ))),
    }
}

fn redacted_error_message(text: &str) -> String {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return "no additional details".into();
    }
    if let Ok(payload) = serde_json::from_str::<Value>(trimmed) {
        if let Some(message) = payload
            .pointer("/error/message")
            .and_then(Value::as_str)
            .filter(|value| !value.trim().is_empty())
        {
            return message.chars().take(240).collect();
        }
    }
    trimmed.chars().take(240).collect()
}

fn parse_quota_buckets(payload: &Value) -> Vec<RemoteQuota> {
    let root = payload.get("response").unwrap_or(payload);
    let Some(buckets) = root.get("buckets").and_then(Value::as_array) else {
        return Vec::new();
    };

    buckets
        .iter()
        .filter_map(|bucket| {
            let model_id = bucket
                .get("modelId")
                .or_else(|| bucket.get("model_id"))
                .and_then(Value::as_str)?
                .trim();
            let remaining_fraction = json_number(
                bucket
                    .get("remainingFraction")
                    .or_else(|| bucket.get("remaining_fraction"))?,
            )?;
            Some(RemoteQuota {
                model_id: model_id.to_string(),
                label: model_id.to_string(),
                remaining_fraction: remaining_fraction.clamp(0.0, 1.0),
                reset_at: bucket
                    .get("resetTime")
                    .or_else(|| bucket.get("reset_time"))
                    .and_then(Value::as_str)
                    .map(ToString::to_string),
            })
        })
        .collect()
}

fn parse_available_models(payload: &Value) -> Vec<RemoteQuota> {
    let root = payload.get("response").unwrap_or(payload);
    let Some(models) = root.get("models").and_then(Value::as_object) else {
        return Vec::new();
    };

    models
        .iter()
        .filter_map(|(model_id, model)| {
            let quota = model.get("quotaInfo").or_else(|| model.get("quota_info"))?;
            let remaining_fraction = json_number(
                quota
                    .get("remainingFraction")
                    .or_else(|| quota.get("remaining_fraction"))?,
            )?;
            let label = model
                .get("displayName")
                .or_else(|| model.get("display_name"))
                .or_else(|| model.get("label"))
                .and_then(Value::as_str)
                .unwrap_or(model_id);
            Some(RemoteQuota {
                model_id: model_id.clone(),
                label: label.to_string(),
                remaining_fraction: remaining_fraction.clamp(0.0, 1.0),
                reset_at: quota
                    .get("resetTime")
                    .or_else(|| quota.get("reset_time"))
                    .and_then(Value::as_str)
                    .map(ToString::to_string),
            })
        })
        .collect()
}

fn normalize_remote_quotas(raw: Vec<RemoteQuota>) -> Vec<QuotaWindow> {
    let mut gemini: Option<RemoteQuota> = None;
    let mut claude_gpt: Option<RemoteQuota> = None;

    for quota in raw {
        let identity = format!("{} {}", quota.model_id, quota.label).to_lowercase();
        let target = if identity.contains("gemini") {
            Some(&mut gemini)
        } else if identity.contains("claude") || identity.contains("gpt") {
            Some(&mut claude_gpt)
        } else {
            None
        };
        let Some(target) = target else { continue };
        let replace = target
            .as_ref()
            .map(|current| quota.remaining_fraction < current.remaining_fraction)
            .unwrap_or(true);
        if replace {
            *target = Some(quota);
        }
    }

    let mut result = Vec::new();
    push_window(&mut result, "gemini", "Gemini Cloud", gemini);
    push_window(&mut result, "claude-gpt", "Claude/GPT Cloud", claude_gpt);
    result
}

fn push_window(result: &mut Vec<QuotaWindow>, id: &str, label: &str, quota: Option<RemoteQuota>) {
    let Some(quota) = quota else { return };
    result.push(QuotaWindow {
        id: format!("antigravity-cloud-{id}"),
        label: label.into(),
        used_percent: ((1.0 - quota.remaining_fraction) * 100.0).clamp(0.0, 100.0),
        reset_at: quota.reset_at,
    });
}

fn json_number(value: &Value) -> Option<f64> {
    value
        .as_f64()
        .or_else(|| value.as_str().and_then(|text| text.trim().parse::<f64>().ok()))
}

fn valid_access_token(credentials: &mut OAuthCredentials) -> Result<String, String> {
    let refresh_at = Utc::now().timestamp_millis() + 60_000;
    if credentials.expires_at_millis > refresh_at && !credentials.access_token.trim().is_empty() {
        return Ok(credentials.access_token.clone());
    }

    let refresh_token = credentials
        .refresh_token
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Antigravity Google authorization cannot be refreshed. Reconnect Google in Settings.".to_string())?;
    let body = form_body(&[
        ("client_id", credentials.client_id.as_str()),
        ("client_secret", credentials.client_secret.as_str()),
        ("refresh_token", refresh_token),
        ("grant_type", "refresh_token"),
    ]);
    let response = http_client()?
        .post(TOKEN_URL)
        .header(CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(body)
        .send()
        .map_err(|error| format!("Unable to refresh Antigravity Google authorization: {error}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "Antigravity Google authorization refresh failed with HTTP {}. Reconnect Google in Settings.",
            response.status().as_u16()
        ));
    }
    let payload = response
        .json::<Value>()
        .map_err(|error| format!("Unable to parse Google token refresh response: {error}"))?;
    let access_token = payload
        .get("access_token")
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Google token refresh returned no access token".to_string())?
        .to_string();
    let expires_in = payload
        .get("expires_in")
        .and_then(Value::as_i64)
        .unwrap_or(3600)
        .max(60);
    credentials.access_token = access_token.clone();
    credentials.expires_at_millis = Utc::now().timestamp_millis() + expires_in * 1000;
    if let Some(id_token) = payload.get("id_token").and_then(Value::as_str) {
        credentials.id_token = Some(id_token.to_string());
    }
    save_credentials(credentials)?;
    Ok(access_token)
}

fn http_client() -> Result<Client, String> {
    Client::builder()
        .timeout(NETWORK_TIMEOUT)
        .connect_timeout(Duration::from_secs(8))
        .build()
        .map_err(|error| error.to_string())
}

fn form_body(values: &[(&str, &str)]) -> String {
    values
        .iter()
        .map(|(key, value)| format!("{}={}", percent_encode(key), percent_encode(value)))
        .collect::<Vec<_>>()
        .join("&")
}

fn percent_encode(value: &str) -> String {
    let mut encoded = String::new();
    for byte in value.as_bytes() {
        if byte.is_ascii_alphanumeric() || matches!(*byte, b'-' | b'_' | b'.' | b'~') {
            encoded.push(*byte as char);
        } else {
            encoded.push_str(&format!("%{byte:02X}"));
        }
    }
    encoded
}

#[cfg(target_os = "macos")]
fn save_credentials(credentials: &OAuthCredentials) -> Result<(), String> {
    use security_framework::passwords::set_generic_password;
    let bytes = serde_json::to_vec(credentials).map_err(|error| error.to_string())?;
    set_generic_password(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, &bytes)
        .map_err(|error| format!("Unable to save Antigravity Google authorization in macOS Keychain: {error}"))
}

#[cfg(not(target_os = "macos"))]
fn save_credentials(_credentials: &OAuthCredentials) -> Result<(), String> {
    Err("Antigravity Google authorization is currently supported on macOS only".into())
}

#[cfg(target_os = "macos")]
fn load_credentials() -> Result<Option<OAuthCredentials>, String> {
    use security_framework::passwords::{generic_password, PasswordOptions};
    let options = PasswordOptions::new_generic_password(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
    match generic_password(options) {
        Ok(bytes) => serde_json::from_slice::<OAuthCredentials>(&bytes)
            .map(Some)
            .map_err(|error| format!("Unable to decode Antigravity Google authorization from Keychain: {error}")),
        Err(error) if error.code() == -25300 => Ok(None),
        Err(error) => Err(format!("Unable to read Antigravity Google authorization from macOS Keychain: {error}")),
    }
}

#[cfg(not(target_os = "macos"))]
fn load_credentials() -> Result<Option<OAuthCredentials>, String> {
    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_and_normalizes_remote_quota_buckets() {
        let payload = json!({
            "buckets": [
                {"modelId": "gemini-3-pro", "remainingFraction": 0.71, "resetTime": "2026-09-02T00:00:00Z"},
                {"modelId": "gemini-3-flash", "remainingFraction": 0.52, "resetTime": "2026-09-02T01:00:00Z"},
                {"modelId": "claude-sonnet", "remainingFraction": 0.24, "resetTime": "2026-09-02T02:00:00Z"}
            ]
        });
        let quota = normalize_remote_quotas(parse_quota_buckets(&payload));
        assert_eq!(quota.len(), 2);
        assert_eq!(quota[0].label, "Gemini Cloud");
        assert!((quota[0].used_percent - 48.0).abs() < 0.0001);
        assert_eq!(quota[1].label, "Claude/GPT Cloud");
        assert!((quota[1].used_percent - 76.0).abs() < 0.0001);
    }

    #[test]
    fn detects_availability_style_all_full_remote_data() {
        let payload = json!({
            "models": {
                "gemini-3-pro": {
                    "displayName": "Gemini 3 Pro",
                    "quotaInfo": {"remainingFraction": 1.0, "resetTime": "2026-09-02T00:00:00Z"}
                }
            }
        });
        let parsed = parse_available_models(&payload);
        assert_eq!(parsed.len(), 1);
        assert!(parsed.iter().all(|quota| quota.remaining_fraction >= 0.999));
    }
}
