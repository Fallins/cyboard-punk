use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuotaWindow {
    pub id: String,
    pub label: String,
    pub used_percent: f64,
    pub reset_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuotaSample {
    pub at: String,
    pub window_id: String,
    pub used_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageSample {
    pub at: String,
    pub tokens: Option<u64>,
    pub input_tokens: Option<u64>,
    pub output_tokens: Option<u64>,
    pub cached_input_tokens: Option<u64>,
    pub cost_usd: Option<f64>,
    pub project: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentSession {
    pub id: String,
    pub provider: String,
    pub project: Option<String>,
    pub status: String,
    pub started_at: Option<String>,
    pub last_activity_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderIssue {
    pub code: String,
    pub message: String,
    pub retry_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderSnapshot {
    pub provider: String,
    pub display_name: String,
    pub capabilities: Vec<String>,
    pub quota: Vec<QuotaWindow>,
    pub quota_history: Vec<QuotaSample>,
    pub usage: Vec<UsageSample>,
    pub sessions: Vec<AgentSession>,
    pub freshness: String,
    pub updated_at: String,
    pub issue: Option<ProviderIssue>,
}

impl ProviderSnapshot {
    pub fn unavailable(provider: &str, display_name: &str, code: &str, message: impl Into<String>) -> Self {
        Self {
            provider: provider.into(),
            display_name: display_name.into(),
            capabilities: Vec::new(),
            quota: Vec::new(),
            quota_history: Vec::new(),
            usage: Vec::new(),
            sessions: Vec::new(),
            freshness: "unavailable".into(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            issue: Some(ProviderIssue {
                code: code.into(),
                message: message.into(),
                retry_at: None,
            }),
        }
    }
}
