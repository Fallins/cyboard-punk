#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "macos")]
fn configure_macos_cli_path() {
    use std::collections::HashSet;
    use std::ffi::OsString;
    use std::path::PathBuf;

    let mut paths = Vec::<PathBuf>::new();
    if let Some(home) = std::env::var_os("HOME").map(PathBuf::from) {
        paths.extend([
            home.join(".local/bin"),
            home.join(".bun/bin"),
            home.join(".npm-global/bin"),
            home.join(".local/share/pnpm"),
        ]);
    }
    paths.extend([
        PathBuf::from("/opt/homebrew/bin"),
        PathBuf::from("/usr/local/bin"),
        PathBuf::from("/usr/bin"),
        PathBuf::from("/bin"),
        PathBuf::from("/usr/sbin"),
        PathBuf::from("/sbin"),
    ]);

    if let Some(current) = std::env::var_os("PATH") {
        paths.extend(std::env::split_paths(&current));
    }

    let mut seen = HashSet::<OsString>::new();
    paths.retain(|path| seen.insert(path.as_os_str().to_os_string()));

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

    #[test]
    fn macos_cli_path_includes_user_and_homebrew_locations_without_dropping_existing_path() {
        let original_home = std::env::var_os("HOME");
        let original_path = std::env::var_os("PATH");
        std::env::set_var("HOME", "/Users/cyboard-test");
        std::env::set_var("PATH", "/custom/bin:/usr/bin");

        configure_macos_cli_path();
        let paths = std::env::split_paths(&std::env::var_os("PATH").expect("PATH should be set"))
            .collect::<Vec<_>>();

        assert!(paths.contains(&PathBuf::from("/Users/cyboard-test/.local/bin")));
        assert!(paths.contains(&PathBuf::from("/opt/homebrew/bin")));
        assert!(paths.contains(&PathBuf::from("/usr/local/bin")));
        assert!(paths.contains(&PathBuf::from("/custom/bin")));
        assert_eq!(paths.iter().filter(|path| path.as_path() == Path::new("/usr/bin")).count(), 1);

        match original_home {
            Some(value) => std::env::set_var("HOME", value),
            None => std::env::remove_var("HOME"),
        }
        match original_path {
            Some(value) => std::env::set_var("PATH", value),
            None => std::env::remove_var("PATH"),
        }
    }
}
