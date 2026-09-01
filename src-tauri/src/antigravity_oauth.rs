use chrono::Utc;
use reqwest::blocking::Client;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use reqwest::Url;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use std::thread;
use std::time::{Duration, Instant};

const KEYCHAIN_SERVICE: &str = "com.fallins.cyboard-punk.antigravity";
const KEYCHAIN_ACCOUNT: &str = "google-oauth";
const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const USERINFO_URL: &str = "https://www.googleapis.com/oauth2/v2/userinfo";
const OAUTH_TIMEOUT: Duration = Duration::from_secs(90);
const NETWORK_TIMEOUT: Duration = Duration::from_secs(10);

static OAUTH_CANCELLED: AtomicBool = AtomicBool::new(false);
static CLIENT_CACHE: OnceLock<Mutex<ClientCache>> = OnceLock::new();

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

#[derive(Default)]
struct ClientCache {
    initialized: bool,
    client: Option<OAuthClient>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ClientProbe {
    Valid,
    Invalid,
    Unknown,
}

pub fn prewarm() {
    let _ = resolve_oauth_client();
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
            client_source: None,
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
    OAUTH_CANCELLED.store(false, Ordering::SeqCst);
    let oauth_client = resolve_oauth_client().ok_or_else(|| {
        "CYBOARD could not find a working Antigravity Google OAuth client in the installed app. Update Antigravity and try again, or configure ANTIGRAVITY_OAUTH_CLIENT_ID / ANTIGRAVITY_OAUTH_CLIENT_SECRET for development."
            .to_string()
    })?;
    if OAUTH_CANCELLED.load(Ordering::SeqCst) {
        return Err("Google connection cancelled".into());
    }

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

pub fn cancel() {
    OAUTH_CANCELLED.store(true, Ordering::SeqCst);
}

pub fn disconnect() -> Result<AntigravityAuthStatus, String> {
    OAUTH_CANCELLED.store(true, Ordering::SeqCst);
    delete_credentials()?;
    Ok(AntigravityAuthStatus {
        connected: false,
        email: None,
        client_source: None,
        message: None,
    })
}

fn resolve_oauth_client() -> Option<OAuthClient> {
    if let Some(client) = environment_client() {
        return Some(client);
    }

    let cache = CLIENT_CACHE.get_or_init(|| Mutex::new(ClientCache::default()));
    if let Ok(cache) = cache.lock() {
        if cache.initialized {
            return cache.client.clone();
        }
    }

    let candidates = discover_oauth_client_candidates();
    let mut unknown = None;
    let mut selected = None;
    for client in candidates {
        match probe_oauth_client(&client) {
            ClientProbe::Valid => {
                selected = Some(client);
                break;
            }
            ClientProbe::Invalid => {}
            ClientProbe::Unknown => {
                if unknown.is_none() {
                    unknown = Some(client);
                }
            }
        }
    }
    let selected = selected.or(unknown);

    if let Ok(mut cache) = cache.lock() {
        cache.initialized = true;
        cache.client = selected.clone();
    }
    selected
}

fn environment_client() -> Option<OAuthClient> {
    let client_id = std::env::var("ANTIGRAVITY_OAUTH_CLIENT_ID").ok()?;
    let client_secret = std::env::var("ANTIGRAVITY_OAUTH_CLIENT_SECRET").ok()?;
    let client_id = client_id.trim();
    let client_secret = client_secret.trim();
    (!client_id.is_empty() && !client_secret.is_empty()).then(|| OAuthClient {
        client_id: client_id.into(),
        client_secret: client_secret.into(),
        source: "environment".into(),
    })
}

fn discover_oauth_client_candidates() -> Vec<OAuthClient> {
    let mut candidates = Vec::new();
    for path in oauth_artifact_candidates() {
        if !path.is_file() {
            continue;
        }
        let Ok(data) = std::fs::read(&path) else {
            continue;
        };

        if let Some((client_id, client_secret)) = parse_marker_client(&data) {
            push_client_candidate(
                &mut candidates,
                OAuthClient {
                    client_id,
                    client_secret,
                    source: "installed-antigravity".into(),
                },
            );
        }

        let ids = find_client_ids(&data);
        let secrets = find_client_secrets(&data);
        if let Some((client_id, client_secret)) = choose_client(&ids, &secrets) {
            push_client_candidate(
                &mut candidates,
                OAuthClient {
                    client_id,
                    client_secret,
                    source: "installed-antigravity".into(),
                },
            );
        }

        for client_id in ids.iter().take(6) {
            for client_secret in secrets.iter().take(4) {
                push_client_candidate(
                    &mut candidates,
                    OAuthClient {
                        client_id: client_id.clone(),
                        client_secret: client_secret.clone(),
                        source: "installed-antigravity".into(),
                    },
                );
            }
        }
    }
    candidates
}

fn push_client_candidate(candidates: &mut Vec<OAuthClient>, candidate: OAuthClient) {
    if candidates
        .iter()
        .any(|existing| existing.client_id == candidate.client_id && existing.client_secret == candidate.client_secret)
    {
        return;
    }
    candidates.push(candidate);
}

fn parse_marker_client(data: &[u8]) -> Option<(String, String)> {
    let marker = b"vs/platform/cloudCode/common/oauthClient.js";
    let marker_start = data.windows(marker.len()).position(|window| window == marker)?;
    let end = (marker_start + 8_192).min(data.len());
    let slice = &data[marker_start..end];
    let ids = find_client_ids(slice);
    let secrets = find_client_secrets(slice);
    Some((ids.first()?.clone(), secrets.first()?.clone()))
}

fn probe_oauth_client(client: &OAuthClient) -> ClientProbe {
    let Ok(http) = http_client() else {
        return ClientProbe::Unknown;
    };
    let body = form_body(&[
        ("code", "cyboard-client-probe"),
        ("client_id", client.client_id.as_str()),
        ("client_secret", client.client_secret.as_str()),
        ("redirect_uri", "http://127.0.0.1"),
        ("grant_type", "authorization_code"),
    ]);
    let response = match http
        .post(TOKEN_URL)
        .header(CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(body)
        .send()
    {
        Ok(response) => response,
        Err(_) => return ClientProbe::Unknown,
    };
    let text = response.text().unwrap_or_default();
    let error = serde_json::from_str::<Value>(&text)
        .ok()
        .and_then(|payload| payload.get("error").and_then(Value::as_str).map(ToString::to_string));
    match error.as_deref() {
        Some("invalid_client") | Some("deleted_client") | Some("unauthorized_client") => ClientProbe::Invalid,
        _ => ClientProbe::Valid,
    }
}

fn oauth_artifact_candidates() -> Vec<PathBuf> {
    let mut application_roots = vec![PathBuf::from("/Applications")];
    if let Some(home) = std::env::var_os("HOME").map(PathBuf::from) {
        application_roots.push(home.join("Applications"));
    }

    let mut app_bundles = Vec::new();
    for root in application_roots {
        for name in [
            "Antigravity.app",
            "Antigravity IDE.app",
            "Antigravity 2.app",
            "Gemini.app",
            "Google Gemini.app",
        ] {
            let bundle = root.join(name);
            if bundle.is_dir() && !app_bundles.iter().any(|existing| existing == &bundle) {
                app_bundles.push(bundle);
            }
        }
        if let Ok(entries) = std::fs::read_dir(&root) {
            for entry in entries.flatten() {
                let path = entry.path();
                let name = path
                    .file_name()
                    .and_then(|value| value.to_str())
                    .unwrap_or_default()
                    .to_lowercase();
                if path.is_dir()
                    && path.extension().and_then(|value| value.to_str()) == Some("app")
                    && (name.contains("antigravity") || name == "gemini.app" || name == "google gemini.app")
                    && !app_bundles.iter().any(|existing| existing == &path)
                {
                    app_bundles.push(path);
                }
            }
        }
    }

    let relative = [
        "Contents/Resources/app/extensions/antigravity/bin/language_server_macos_arm",
        "Contents/Resources/app/extensions/antigravity/bin/language_server_macos_x64",
        "Contents/Resources/app/extensions/antigravity/bin/language_server_macos",
        "Contents/Resources/app/out/main.js",
        "Contents/Resources/bin/language_server",
        "Contents/Resources/bin/language_server_macos",
        "Contents/MacOS/Gemini",
    ];
    app_bundles
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
        if OAUTH_CANCELLED.load(Ordering::SeqCst) {
            return Err("Google connection cancelled".into());
        }
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
    Err("Google sign-in timed out. Click Connect Google to try again.".into())
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
    parse_callback_target(target, expected_state)
}

fn parse_callback_target(target: &str, expected_state: &str) -> Result<String, String> {
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

fn redacted_error_message(text: &str) -> String {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return "no additional details".into();
    }
    if let Ok(payload) = serde_json::from_str::<Value>(trimmed) {
        if let Some(message) = payload
            .pointer("/error_description")
            .or_else(|| payload.pointer("/error/message"))
            .and_then(Value::as_str)
            .filter(|value| !value.trim().is_empty())
        {
            return message.chars().take(240).collect();
        }
        if let Some(error) = payload.get("error").and_then(Value::as_str) {
            return error.chars().take(120).collect();
        }
    }
    trimmed.chars().take(240).collect()
}

fn http_client() -> Result<Client, String> {
    Client::builder()
        .timeout(NETWORK_TIMEOUT)
        .connect_timeout(Duration::from_secs(5))
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

#[cfg(test)]
mod tests {
    use super::*;

    fn client_id(name: &str) -> String {
        format!("123456-{name}.apps{}", ".googleusercontent.com")
    }

    fn client_secret(character: char) -> String {
        format!("{}{}{}", "GOC", "SPX-", character.to_string().repeat(28))
    }

    #[test]
    fn marker_client_wins_within_cloud_code_region() {
        let active_id = client_id("active");
        let active_secret = client_secret('a');
        let stale_id = client_id("stale");
        let stale_secret = client_secret('b');
        let data = format!(
            "{stale_id} {stale_secret} out-build/vs/platform/cloudCode/common/oauthClient.js clientId=\"{active_id}\"; clientSecret=\"{active_secret}\";"
        );
        assert_eq!(
            parse_marker_client(data.as_bytes()),
            Some((active_id, active_secret))
        );
    }

    #[test]
    fn binary_pairing_matches_antigravity_layout() {
        let primary_id = client_id("primary");
        let alternate_id = client_id("alternate");
        let alternate_secret = client_secret('b');
        let primary_secret = client_secret('a');
        assert_eq!(
            choose_client(
                &[primary_id.clone(), alternate_id],
                &[alternate_secret, primary_secret.clone()]
            ),
            Some((primary_id, primary_secret))
        );
    }

    #[test]
    fn callback_parser_handles_success_and_denial() {
        assert_eq!(
            parse_callback_target("/callback?code=abc&state=state1", "state1"),
            Ok("abc".into())
        );
        assert!(parse_callback_target("/callback?error=access_denied&state=state1", "state1").is_err());
    }
}
