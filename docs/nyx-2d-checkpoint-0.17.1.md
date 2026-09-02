# NYX 2D checkpoint — 0.17.1

## Scope

This patch keeps the 0.17.0 motion/lifecycle behavior unchanged and adds a gated local runtime-state simulator for visual QA.

## Compact dashboard test fix

`CompactApp` opens the dashboard through an async sequence:

1. unminimize main window
2. show main window
3. focus main window
4. hide compact window

The test now waits for the complete async sequence instead of asserting immediately after the click event dispatch.

## NYX test controls

A new persisted setting is available:

- `operatorTestControlsEnabled`
- default: `false`

When enabled while the operator mode is NYX, CYBOARD renders a compact state-override strip below the hero area.

Buttons:

- AUTO
- IDLE
- OBSERVE
- PROCESS
- WARNING
- SUCCESS
- OFFLINE

`AUTO` returns control to the real provider/session state machine. The other buttons override only `OperatorStage` runtime state; provider snapshots, quota cards, provider HUD data, active sessions, refresh behavior and persisted provider state are not modified.

Turning the setting off or switching away from NYX clears the override back to AUTO.

## Production safety

- Controls are hidden by default.
- No renderer feature flag is changed by the simulator.
- Blink remains blocked by the facial overlay asset gate.
- The simulator exercises the same production NYX runtime-state path used by real provider events.

## QA

Run:

```bash
bun run check
bun run tauri dev
```

Then enable **Settings → NYX test controls** and step through the six states. Use AUTO to return to live provider behavior.
