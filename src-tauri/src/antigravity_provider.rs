use crate::models::{ProviderIssue, ProviderSnapshot};

pub fn collect() -> ProviderSnapshot {
    let local = crate::antigravity::collect();
    if local.freshness == "fresh" && !local.quota.is_empty() {
        return local;
    }

    let mut remote = crate::antigravity_remote::collect();
    if remote.freshness == "fresh" && !remote.quota.is_empty() {
        return remote;
    }

    if let Some(local_issue) = local.issue.as_ref() {
        if let Some(remote_issue) = remote.issue.as_mut() {
            remote_issue.message = format!("{} Local source: {}", remote_issue.message, local_issue.message);
        } else {
            remote.issue = Some(ProviderIssue {
                code: "local-service-unavailable".into(),
                message: local_issue.message.clone(),
                retry_at: local_issue.retry_at.clone(),
            });
        }
    }
    remote
}
