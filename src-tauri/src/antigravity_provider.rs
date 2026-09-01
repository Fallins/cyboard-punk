use crate::models::{ProviderIssue, ProviderSnapshot};

pub fn collect() -> ProviderSnapshot {
    let local = crate::antigravity::collect();
    if local.freshness == "fresh" && !local.quota.is_empty() {
        return local;
    }

    let mut cloud = crate::antigravity_cloud::collect();
    if cloud.freshness == "fresh" && !cloud.quota.is_empty() {
        return cloud;
    }

    if let Some(local_issue) = local.issue.as_ref() {
        if let Some(cloud_issue) = cloud.issue.as_mut() {
            cloud_issue.message = format!("{} Local source: {}", cloud_issue.message, local_issue.message);
        } else {
            cloud.issue = Some(ProviderIssue {
                code: "local-service-unavailable".into(),
                message: local_issue.message.clone(),
                retry_at: local_issue.retry_at.clone(),
            });
        }
    }
    cloud
}
