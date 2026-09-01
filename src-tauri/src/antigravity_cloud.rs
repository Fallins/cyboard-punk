use crate::models::{ProviderIssue, ProviderSnapshot, QuotaWindow};
use chrono::Utc;
use reqwest::blocking::Client;
use reqwest::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE, USER_AGENT};
use reqwest::Url;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::thread;
use std::time::{Duration, Instant};

const KEYCHAIN_SERVICE: &str = "com.fallins.cyboard-punk.antigravity";
const KEYCHAIN_ACCOUNT: &str = "google-oauth";
const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const USERINFO_URL: &str = "https://www.googleapis.com/oauth2/v2/userinfo";
const CLOUD_BASE_URL: &str = "https://cloudcode-pa.googleapis.com";
const LOAD_CODE_ASSIST_URL: &str = "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist";
const FETCH_AVAILABLE_MODELS_URL: &str = "https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels";
const RETRIEVE_USER_QUOTA_URL: &str = "https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota";
const OAUTH_TIMEOUT: Duration = Duration::from_secs(120);
const NETWORK_TIMEOUT: Duration = Duration::from_secs(15);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AntigravityAuthStatus {
    pub connected: bool,
    pub email: Option<String>,
    pub client_source: Option<String>,
    pub message: Option<String>,
}

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

#[derive(Debug, Clone, PartialEq, Eq)]
struct OAuthClient {
    client_id: String,
    client_secret: String,
    source: String,
}

#[derive(Debug, Clone)]
struct RemoteQuota {
    model_id: String,
    label: String,
    remaining_fraction: f64,
    reset_at: Option<String>,
}

#[derive(Debug)]
enum CloudError {
    NotLoggedIn,
    PermissionDenied(String),
    Other(String),
}

pub fn auth_status() -> AntigravityAuthStatus {
    match load_credentials() {
        Ok(Some(credentials)) => AntigravityAuthStatus {
            connected: true,
            email: credentials.email,
            client_source: Some(credentials.client_source),
            message: None,
        },
        Ok(None) => AntigravityAuthStatus {
            connected: false,
            email: None,
            client_source: resolve_oauth_client().map(|client| client.source),
            message: None,
        },
        Err(message) => AntigravityAuthStatus {
            connected: false,
            email: None,
            client_source: None,
            message: Some(message),
        },
    }
}

pub fn connect() -> Result<AntigravityAuthStatus, String> {
    let oauth_client = resolve_oauth_client().ok_or_else(|| {
        "CYBOARD could not find Antigravity's Google OAuth client. Install Antigravity.app or set ANTIGRAVITY_OAUTH_CLIENT_ID and ANTIGRAVITY_OAUTH_CLIENT_SECRET for development.".to_string()
    })?;

    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|error| format!("Unable to start Google OAuth callback listener: {error}"))?;
    listener
        .set_nonblocking(true)
        .map_err(|error| format!("Unable to configure Google OAuth callback listener: {error}"))?;
    let port = listener
        .local_addr()
        .map_err(|error| format!("Unable to read Google OAuth callback address: {error}"))?
        .port();
    let redirect_uri = format!("http://127.0.0.1:{port}/callback");
    let state = oauth_state();
    let auth_url = authorization_url(&oauth_client, &redirect_uri, &state)?;

    let opened = Command::new("/usr/bin/open")
        .arg(auth_url.as_str())
        .status()
        .map(|status| status.success())
        .unwrap_or(false);
    if !opened {
        return Err("CYBOARD could not open the browser for Google sign-in".into());
    }

    let code = wait_for_oauth_callback(&listener, &state, OAUTH_TIMEOUT)?;
    let token_payload = exchange_code(&oauth_client, &redirect_uri, &code)?;
    let access_token = token_payload
        .get("access_token")
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Google token response did not contain an access token".to_string())?
        .to_string();
    let refresh_token = token_payload
        .get("refresh_token")
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .map(ToString::to_string);
    let expires_in = token_payload
        .get("expires_in")
        .and_then(Value::as_i64)
        .unwrap_or(3600)
        .max(60);
    let id_token = token_payload
        .get("id_token")
        .and_then(Value::as_str)
        .map(ToString::to_string);
    let email = fetch_user_email(&access_token).ok().flatten();

    let credentials = OAuthCredentials {
        access_token,
        refresh_token,
        expires_at_millis: Utc::now().timestamp_millis() + expires_in * 1000,
        id_token,
        email: email.clone(),
        project_id: None,
        client_id: oauth_client.client_id,
        client_secret: oauth_client.client_secret,
        client_source: oauth_client.source.clone(),
    };
    save_credentials(&credentials)?;

    Ok(AntigravityAuthStatus {
        connected: true,
        email,
        client_source: Some(oauth_client.source),
        message: None,
    })
}

pub fn disconnect() -> Result<AntigravityAuthStatus, String> {
    delete_credentials()?;
    Ok(AntigravityAuthStatus {
        connected: false,
        email: None,
        client_source: resolve_oauth_client().map(|client| client.source),
        message: None,
    })
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

    match fetch_cloud_snapshot(&access_token, &mut credentials) {
        Ok(snapshot) => {
            let _ = save_credentials(&credentials);
            snapshot
        }
        Err(CloudError::NotLoggedIn) => unavailable(
            "login-required",
            "Antigravity Google authorization expired. Reconnect Google in Settings.",
        ),
        Err(CloudError::PermissionDenied(message)) => unavailable(
            "cloud-not-permitted",
            format!(
                "Google sign-in is connected, but the Antigravity cloud quota endpoint is not permitted for this account. Local Antigravity quota still works when the app is running. {message}"
            ),
        ),
        Err(CloudError::Other(message)) => unavailable("network", message),
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

fn cloud_snapshot(quota: Vec<QuotaWindow>) -> ProviderSnapshot {
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

fn fetch_cloud_snapshot(access_token: &str, credentials: &mut OAuthCredentials) -> Result<ProviderSnapshot, CloudError> {
    let metadata = json!({
        "metadata": {
            "ideType": "ANTIGRAVITY",
            "platform": "PLATFORM_UNSPECIFIED",
            "pluginType": "GEMINI"
        }
    });
    let code_assist = cloud_post(LOAD_CODE_ASSIST_URL, access_token, &metadata)?;
    let discovered_project = code_assist
        .pointer("/cloudaicompanionProject/value")
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .map(ToString::to_string);
    if credentials.project_id.is_none() {
        credentials.project_id = discovered_project;
    }

    let quota_body = credentials
        .project_id
        .as_ref()
        .map(|project| json!({ "project": project }))
        .unwrap_or_else(|| json!({}));

    match cloud_post(RETRIEVE_USER_QUOTA_URL, access_token, &quota_body) {
        Ok(payload) => {
            let quota = normalize_remote_quotas(parse_quota_buckets(&payload));
            if !quota.is_empty() {
                return Ok(cloud_snapshot(quota));
            }
        }
        Err(CloudError::PermissionDenied(_)) => {
            // Keep going. Some Google account tiers deny retrieveUserQuota but still expose
            // useful model quota information through fetchAvailableModels.
        }
        Err(error) => return Err(error),
    }

    let models = cloud_post(FETCH_AVAILABLE_MODELS_URL, access_token, &quota_body)?;
    let raw = parse_available_models(&models);
    if raw.is_empty() {
        return Err(CloudError::Other(
            "Antigravity cloud returned no recognized quota models".into(),
        ));
    }
    let all_full = raw.iter().all(|quota| quota.remaining_fraction >= 0.999);
    if all_full {
        return Err(CloudError::PermissionDenied(
            "Google returned availability-style model data without verifiable quota fractions".into(),
        ));
    }
    let quota = normalize_remote_quotas(raw);
    if quota.is_empty() {
        Err(CloudError::Other(
            "Antigravity cloud quota could not be mapped to Gemini or Claude/GPT model families".into(),
        ))
    } else {
        Ok(cloud_snapshot(quota))
    }
}

fn cloud_post(url: &str, access_token: &str, body: &Value) -> Result<Value, CloudError> {
    let client = http_client().map_err(CloudError::Other)?;
    let response = client
        .post(url)
        .header(AUTHORIZATION, format!("Bearer {access_token}"))
        .header(CONTENT_TYPE, "application/json")
        .header(ACCEPT, "application/json")
        .header(USER_AGENT, "antigravity")
        .json(body)
        .send()
        .map_err(|error| CloudError::Other(format!("Antigravity cloud request failed: {error}")))?;
    let status = response.status();
    let text = response
        .text()
        .map_err(|error| CloudError::Other(format!("Unable to read Antigravity cloud response: {error}")))?;
    match status.as_u16() {
        200 => serde_json::from_str::<Value>(&text)
            .map_err(|error| CloudError::Other(format!("Unable to parse Antigravity cloud response: {error}"))),
        401 => Err(CloudError::NotLoggedIn),
        403 => Err(CloudError::PermissionDenied(redacted_error_message(&text))),
        code => Err(CloudError::Other(format!(
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
            let quota = model
                .get("quotaInfo")
                .or_else(|| model.get("quota_info"))?;
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
    let mut other: Option<RemoteQuota> = None;

    for quota in raw {
        let identity = format!("{} {}", quota.model_id, quota.label).to_lowercase();
        let target = if identity.contains("gemini") {
            &mut gemini
        } else if identity.contains("claude") || identity.contains("gpt") {
            &mut claude_gpt
        } else {
            &mut other
        };
        let replace = target
            .as_ref()
            .map(|current| quota.remaining_fraction < current.remaining_fraction)
            .unwrap_or(true);
        if replace {
            *target = Some(quota);
        }
    }

    let mut result = Vec::new();
    push_cloud_window(&mut result, "gemini", "Gemini Cloud", gemini);
    push_cloud_window(&mut result, "claude-gpt", "Claude/GPT Cloud", claude_gpt);
    push_cloud_window(&mut result, "other", "Other Cloud", other);
    result
}

fn push_cloud_window(result: &mut Vec<QuotaWindow>, id: &str, label: &str, quota: Option<RemoteQuota>) {
    let Some(quota) = quota else {
        return;
    };
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
    let client = http_client()?;
    let response = client
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

fn authorization_url(client: &OAuthClient, redirect_uri: &str, state: &str) -> Result<Url, String> {
    let mut url = Url::parse(AUTH_URL).map_err(|error| error.to_string())?;
    {
        let mut query = url.query_pairs_mut();
        query.append_pair("client_id", &client.client_id);
        query.append_pair("redirect_uri", redirect_uri);
        query.append_pair("response_type", "code");
        query.append_pair(
            "scope",
            "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/userinfo.email",
        );
        query.append_pair("access_type", "offline");
        query.append_pair("prompt", "select_account consent");
        query.append_pair("state", state);
    }
    Ok(url)
}

fn wait_for_oauth_callback(listener: &TcpListener, expected_state: &str, timeout: Duration) -> Result<String, String> {
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        match listener.accept() {
            Ok((mut stream, _)) => {
                let result = parse_callback_request(&mut stream, expected_state);
                write_callback_response(&mut stream, result.is_ok());
                return result;
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(50));
            }
            Err(error) => return Err(format!("Google OAuth callback failed: {error}")),
        }
    }
    Err("Google sign-in timed out after 120 seconds".into())
}

fn parse_callback_request(stream: &mut TcpStream, expected_state: &str) -> Result<String, String> {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
    let mut buffer = [0u8; 16_384];
    let size = stream
        .read(&mut buffer)
        .map_err(|error| format!("Unable to read Google OAuth callback: {error}"))?;
    let request = String::from_utf8_lossy(&buffer[..size]);
    let first_line = request
        .lines()
        .next()
        .ok_or_else(|| "Invalid Google OAuth callback request".to_string())?;
    let target = first_line
        .split_whitespace()
        .nth(1)
        .ok_or_else(|| "Invalid Google OAuth callback URL".to_string())?;
    let url = Url::parse(&format!("http://127.0.0.1{target}"))
        .map_err(|error| format!("Invalid Google OAuth callback URL: {error}"))?;
    if url.path() != "/callback" {
        return Err("Unexpected Google OAuth callback path".into());
    }
    let mut code = None;
    let mut state = None;
    let mut oauth_error = None;
    for (key, value) in url.query_pairs() {
        match key.as_ref() {
            "code" => code = Some(value.into_owned()),
            "state" => state = Some(value.into_owned()),
            "error" => oauth_error = Some(value.into_owned()),
            _ => {}
        }
    }
    if let Some(error) = oauth_error {
        return Err(format!("Google sign-in was not completed: {error}"));
    }
    if state.as_deref() != Some(expected_state) {
        return Err("Google OAuth state mismatch".into());
    }
    code.filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Google OAuth callback did not contain an authorization code".into())
}

fn write_callback_response(stream: &mut TcpStream, success: bool) {
    let (status, title, detail) = if success {
        (
            "200 OK",
            "CYBOARD connected",
            "Google authorization completed. You can close this tab and return to CYBOARD.",
        )
    } else {
        (
            "400 Bad Request",
            "CYBOARD connection failed",
            "Google authorization was not completed. Return to CYBOARD and try again.",
        )
    };
    let body = format!(
        "<html><body style=\"font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#050711;color:#f4f8ff;padding:48px;text-align:center\"><h1>{title}</h1><p>{detail}</p></body></html>"
    );
    let response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
}

fn exchange_code(client: &OAuthClient, redirect_uri: &str, code: &str) -> Result<Value, String> {
    let body = form_body(&[
        ("code", code),
        ("client_id", client.client_id.as_str()),
        ("client_secret", client.client_secret.as_str()),
        ("redirect_uri", redirect_uri),
        ("grant_type", "authorization_code"),
    ]);
    let response = http_client()?
        .post(TOKEN_URL)
        .header(CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(body)
        .send()
        .map_err(|error| format!("Google token exchange failed: {error}"))?;
    let status = response.status();
    let text = response
        .text()
        .map_err(|error| format!("Unable to read Google token response: {error}"))?;
    if !status.is_success() {
        return Err(format!(
            "Google token exchange failed with HTTP {}: {}",
            status.as_u16(),
            redacted_error_message(&text)
        ));
    }
    serde_json::from_str(&text).map_err(|error| format!("Unable to parse Google token response: {error}"))
}

fn fetch_user_email(access_token: &str) -> Result<Option<String>, String> {
    let response = http_client()?
        .get(USERINFO_URL)
        .header(AUTHORIZATION, format!("Bearer {access_token}"))
        .send()
        .map_err(|error| format!("Unable to read Google account identity: {error}"))?;
    if !response.status().is_success() {
        return Ok(None);
    }
    let payload = response
        .json::<Value>()
        .map_err(|error| format!("Unable to parse Google account identity: {error}"))?;
    Ok(payload
        .get("email")
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .map(ToString::to_string))
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

fn oauth_state() -> String {
    Command::new("/usr/bin/uuidgen")
        .output()
        .ok()
        .filter(|output| output.status.success())
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|value| value.trim().replace('-', ""))
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| format!("{}{}", Utc::now().timestamp_nanos_opt().unwrap_or_default(), std::process::id()))
}

fn resolve_oauth_client() -> Option<OAuthClient> {
    let configured_id = std::env::var("ANTIGRAVITY_OAUTH_CLIENT_ID").ok();
    let configured_secret = std::env::var("ANTIGRAVITY_OAUTH_CLIENT_SECRET").ok();
    if let (Some(client_id), Some(client_secret)) = (configured_id, configured_secret) {
        let client_id = client_id.trim();
        let client_secret = client_secret.trim();
        if !client_id.is_empty() && !client_secret.is_empty() {
            return Some(OAuthClient {
                client_id: client_id.into(),
                client_secret: client_secret.into(),
                source: "environment".into(),
            });
        }
    }
    discover_oauth_client_from_installed_app()
}

fn discover_oauth_client_from_installed_app() -> Option<OAuthClient> {
    for path in oauth_artifact_candidates() {
        if !path.exists() || !path.is_file() {
            continue;
        }
        let Ok(data) = std::fs::read(&path) else {
            continue;
        };
        let client_ids = find_client_ids(&data);
        let client_secrets = find_client_secrets(&data);
        if let Some((client_id, client_secret)) = choose_client(&client_ids, &client_secrets) {
            return Some(OAuthClient {
                client_id,
                client_secret,
                source: "installed-antigravity".into(),
            });
        }
    }
    None
}

fn oauth_artifact_candidates() -> Vec<PathBuf> {
    let mut roots = vec![PathBuf::from("/Applications/Antigravity.app")];
    if let Some(home) = std::env::var_os("HOME").map(PathBuf::from) {
        roots.push(home.join("Applications/Antigravity.app"));
    }
    let relative = [
        "Contents/Resources/app/extensions/antigravity/bin/language_server_macos_arm",
        "Contents/Resources/app/extensions/antigravity/bin/language_server_macos_x64",
        "Contents/Resources/app/extensions/antigravity/bin/language_server_macos",
        "Contents/Resources/app/out/main.js",
        "Contents/Resources/bin/language_server",
        "Contents/Resources/bin/language_server_macos",
    ];
    roots
        .into_iter()
        .flat_map(|root| relative.iter().map(move |item| root.join(item)))
        .collect()
}

fn find_client_ids(data: &[u8]) -> Vec<String> {
    let suffix = b".apps.googleusercontent.com";
    let mut result = Vec::new();
    let mut cursor = 0usize;
    while cursor + suffix.len() <= data.len() {
        let Some(offset) = data[cursor..].windows(suffix.len()).position(|window| window == suffix) else {
            break;
        };
        let end = cursor + offset + suffix.len();
        let mut start = cursor + offset;
        while start > 0 && is_oauth_token_byte(data[start - 1]) {
            start -= 1;
        }
        if let Ok(candidate) = std::str::from_utf8(&data[start..end]) {
            if candidate.contains('-')
                && candidate.ends_with(".apps.googleusercontent.com")
                && !result.iter().any(|value| value == candidate)
            {
                result.push(candidate.to_string());
            }
        }
        cursor = end;
    }
    result
}

fn find_client_secrets(data: &[u8]) -> Vec<String> {
    let prefix = b"GOCSPX-";
    let secret_length = 35usize;
    let mut result = Vec::new();
    let mut cursor = 0usize;
    while cursor + prefix.len() <= data.len() {
        let Some(offset) = data[cursor..].windows(prefix.len()).position(|window| window == prefix) else {
            break;
        };
        let start = cursor + offset;
        let end = start + secret_length;
        if end <= data.len() && data[start..end].iter().all(|byte| is_oauth_token_byte(*byte)) {
            if let Ok(candidate) = std::str::from_utf8(&data[start..end]) {
                if !result.iter().any(|value| value == candidate) {
                    result.push(candidate.to_string());
                }
            }
        }
        cursor = start + prefix.len();
    }
    result
}

fn choose_client(ids: &[String], secrets: &[String]) -> Option<(String, String)> {
    if ids.is_empty() || secrets.is_empty() {
        return None;
    }
    if secrets.len() == 1 && ids.len() > 1 {
        return Some((ids.last()?.clone(), secrets[0].clone()));
    }
    let secret = if ids.len() == secrets.len() && secrets.len() > 1 {
        secrets.last()?.clone()
    } else {
        secrets[0].clone()
    };
    Some((ids[0].clone(), secret))
}

fn is_oauth_token_byte(byte: u8) -> bool {
    byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_')
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

#[cfg(target_os = "macos")]
fn delete_credentials() -> Result<(), String> {
    use security_framework::passwords::delete_generic_password;
    match delete_generic_password(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT) {
        Ok(()) => Ok(()),
        Err(error) if error.code() == -25300 => Ok(()),
        Err(error) => Err(format!("Unable to remove Antigravity Google authorization from macOS Keychain: {error}")),
    }
}

#[cfg(not(target_os = "macos"))]
fn delete_credentials() -> Result<(), String> {
    Ok(())
}

#[allow(dead_code)]
fn path_exists(path: &Path) -> bool {
    path.exists()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn discovers_oauth_client_material_from_binary_bytes() {
        let data = b"prefix 123456-demo_client.apps.googleusercontent.com middle GOCSPX-abcdefghijklmnopqrstuvwxyz12 suffix";
        let ids = find_client_ids(data);
        let secrets = find_client_secrets(data);
        assert_eq!(ids, vec!["123456-demo_client.apps.googleusercontent.com"]);
        assert_eq!(secrets, vec!["GOCSPX-abcdefghijklmnopqrstuvwxyz12"]);
        assert_eq!(choose_client(&ids, &secrets), Some((ids[0].clone(), secrets[0].clone())));
    }

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
        assert_eq!(quota[0].used_percent, 48.0);
        assert_eq!(quota[1].label, "Claude/GPT Cloud");
        assert_eq!(quota[1].used_percent, 76.0);
    }

    #[test]
    fn parses_fetch_available_models_shape() {
        let payload = json!({
            "models": {
                "gemini-3-pro": {
                    "displayName": "Gemini 3 Pro",
                    "quotaInfo": {"remainingFraction": 0.6, "resetTime": "2026-09-02T00:00:00Z"}
                }
            }
        });
        let parsed = parse_available_models(&payload);
        assert_eq!(parsed.len(), 1);
        assert_eq!(parsed[0].model_id, "gemini-3-pro");
        assert_eq!(parsed[0].remaining_fraction, 0.6);
    }
}
