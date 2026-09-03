#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "macos")]
fn node_version_key(path: &std::path::Path) -> (u64, u64, u64) {
    let raw = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .trim_start_matches('v');
    let mut parts = raw.split('.').map(|part| part.parse::<u64>().unwrap_or(0));
    (
        parts.next().unwrap_or(0),
        parts.next().unwrap_or(0),
        parts.next().unwrap_or(0),
    )
}

#[cfg(target_os = "macos")]
fn nvm_node_bin_paths(home: &std::path::Path) -> Vec<std::path::PathBuf> {
    let versions_root = home.join(".nvm/versions/node");
    let Ok(entries) = std::fs::read_dir(versions_root) else {
        return Vec::new();
    };

    let mut versions = entries
        .flatten()
        .filter_map(|entry| {
            let path = entry.path();
            let bin = path.join("bin");
            bin.is_dir().then_some((node_version_key(&path), bin))
        })
        .collect::<Vec<_>>();
    versions.sort_by(|left, right| right.0.cmp(&left.0));
    versions.into_iter().map(|(_, bin)| bin).collect()
}

#[cfg(target_os = "macos")]
fn macos_cli_paths(
    home: Option<std::path::PathBuf>,
    current_path: Option<std::ffi::OsString>,
) -> Vec<std::path::PathBuf> {
    use std::collections::HashSet;
    use std::ffi::OsString;
    use std::path::PathBuf;

    let mut paths = Vec::<PathBuf>::new();
    if let Some(home) = home {
        paths.extend([
            home.join(".local/bin"),
            home.join(".bun/bin"),
            home.join(".npm-global/bin"),
            home.join(".local/share/pnpm"),
            home.join(".volta/bin"),
            home.join(".asdf/shims"),
        ]);
        paths.extend(nvm_node_bin_paths(&home));
    }
    paths.extend([
        PathBuf::from("/opt/homebrew/bin"),
        PathBuf::from("/usr/local/bin"),
        PathBuf::from("/usr/bin"),
        PathBuf::from("/bin"),
        PathBuf::from("/usr/sbin"),
        PathBuf::from("/sbin"),
    ]);

    if let Some(current) = current_path {
        paths.extend(std::env::split_paths(&current));
    }

    let mut seen = HashSet::<OsString>::new();
    paths.retain(|path| seen.insert(path.as_os_str().to_os_string()));
    paths
}

#[cfg(target_os = "macos")]
fn configure_macos_cli_path() {
    use std::path::PathBuf;

    let paths = macos_cli_paths(
        std::env::var_os("HOME").map(PathBuf::from),
        std::env::var_os("PATH"),
    );
    if let Ok(joined) = std::env::join_paths(paths) {
        std::env::set_var("PATH", joined);
    }
}

fn main() {
    #[cfg(target_os = "macos")]
    configure_macos_cli_path();
    cyboard_punk_lib::run();
}

#[cfg(all(test, target_os = "macos"))]
mod tests {
    use super::*;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn macos_cli_path_includes_user_and_homebrew_locations_without_dropping_existing_path() {
        let paths = macos_cli_paths(
            Some(PathBuf::from("/Users/cyboard-test")),
            Some("/custom/bin:/usr/bin".into()),
        );

        assert!(paths.contains(&PathBuf::from("/Users/cyboard-test/.local/bin")));
        assert!(paths.contains(&PathBuf::from("/Users/cyboard-test/.volta/bin")));
        assert!(paths.contains(&PathBuf::from("/Users/cyboard-test/.asdf/shims")));
        assert!(paths.contains(&PathBuf::from("/opt/homebrew/bin")));
        assert!(paths.contains(&PathBuf::from("/usr/local/bin")));
        assert!(paths.contains(&PathBuf::from("/custom/bin")));
        assert_eq!(
            paths
                .iter()
                .filter(|path| path.as_path() == Path::new("/usr/bin"))
                .count(),
            1
        );
    }

    #[test]
    fn discovers_nvm_node_bins_newest_version_first() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after epoch")
            .as_nanos();
        let home = std::env::temp_dir().join(format!("cyboard-nvm-{unique}"));
        let older = home.join(".nvm/versions/node/v20.18.0/bin");
        let newer = home.join(".nvm/versions/node/v22.21.1/bin");
        std::fs::create_dir_all(&older).expect("older NVM bin should be created");
        std::fs::create_dir_all(&newer).expect("newer NVM bin should be created");

        let paths = nvm_node_bin_paths(&home);
        assert_eq!(paths, vec![newer, older]);

        let _ = std::fs::remove_dir_all(home);
    }
}
