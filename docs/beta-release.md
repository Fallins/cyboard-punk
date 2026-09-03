# CYBOARD macOS Beta Packaging

CYBOARD 0.36.0 is the first beta packaging checkpoint.

The app is designed as a menu-bar utility. On macOS it uses the Accessory activation policy at runtime and `LSUIElement` in the bundled `Info.plist`, so the app stays out of the Dock while its tray icon, compact window, dashboard, monitoring and notifications continue to work.

## 1. Validate the release candidate

From the repository root:

```bash
git pull
bun install
bun run check
```

Do not package a beta if `bun run check` is red.

For the final local smoke test:

```bash
bun run tauri dev
```

Verify at minimum:

- CYBOARD does not appear in the Dock.
- The menu-bar icon remains available.
- Clicking the menu-bar icon opens/closes the compact window.
- The dashboard can be opened and closed without quitting the process.
- Provider refresh, notifications and launch-at-login still work.
- English / Traditional Chinese switching works.
- NYX quick replies appear and dismiss automatically.

## 2. Build the beta

The repository provides one command that validates and bundles both the `.app` and `.dmg`:

```bash
bun run bundle:beta
```

For a local/tester beta without an Apple Developer ID certificate, use an ad-hoc signature:

```bash
APPLE_SIGNING_IDENTITY="-" bun run bundle:beta
```

Ad-hoc signing does not provide Apple notarization. Another Mac may still require the tester to explicitly allow the app in macOS Privacy & Security.

## 3. Build outputs

Tauri writes release artifacts under:

```text
src-tauri/target/release/bundle/macos/CYBOARD.app
src-tauri/target/release/bundle/dmg/*.dmg
```

The `.dmg` is the normal artifact to give a beta tester. The tester drags `CYBOARD.app` into Applications.

## 4. Verify the packaged artifact

After building, mount the generated DMG and install CYBOARD into `/Applications`. Test the installed copy, not only `tauri dev`.

Useful checks:

```bash
plutil -p /Applications/CYBOARD.app/Contents/Info.plist | grep LSUIElement
codesign -dv --verbose=4 /Applications/CYBOARD.app 2>&1 | head -30
```

`LSUIElement` should be `true`.

## 5. Distribution levels

### Private beta / your own Macs

Ad-hoc signing is sufficient for development and small private testing, with the Gatekeeper caveat above.

### Public beta without scary Gatekeeper warnings

Use an Apple **Developer ID Application** certificate and notarize the app. Keep signing credentials outside Git; Tauri can read them from environment variables / Keychain.

### Mac App Store / TestFlight

This is a separate packaging path and is not required for the current CYBOARD beta.

## Versioning

The bundle version remains a numeric macOS-compatible SemVer (`0.36.0`). `Beta` is the release channel/checkpoint rather than a prerelease suffix in the macOS bundle version.
