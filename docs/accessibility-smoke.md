# macOS Accessibility Smoke Checklist

This checklist is the manual release gate for CYBOARD's VoiceOver and keyboard behavior. Automated component tests cover semantic regions, focus behavior, and bounded live announcements, but they do not prove that the macOS accessibility tree sounds natural in the packaged Tauri app.

## Setup

1. Pull the release candidate and run `bun run check`.
2. Launch the desktop shell with `bun run tauri dev`.
3. Turn on VoiceOver with `Command + F5`.
4. Test both the full dashboard and the compact menu-bar window.
5. Keep at least one provider with usable data if possible, but also verify empty/stale states.

## Full dashboard

### Navigation and landmarks

- VoiceOver can identify `System Brief`, `Ask CYBOARD`, `Token Activity`, provider quota content, and session/closeout content without relying on visual position alone.
- Repeated provider cards and token-activity cards expose their provider name in the accessibility tree.
- Decorative NYX/WebGL visuals do not create a noisy sequence of meaningless accessibility nodes.

### System Brief

- Initial load announces a concise syncing state rather than reading the entire panel repeatedly.
- A material brief change announces one concise tone/headline update.
- Routine refreshes do not cause the full signal list and explanatory copy to be re-read unnecessarily.

### Ask CYBOARD

- The question input has the accessible name `Ask CYBOARD about current status`.
- Suggested-question buttons are reachable by keyboard and have meaningful names.
- Submitting an answer announces the complete answer once as an atomic status update.
- Unsupported questions expose the supported-intent help instead of leaving VoiceOver silent.

### Session closeouts

- `Recent Closeouts` is exposed as a named region when closeouts exist.
- A new closeout announces the bounded recent-closeout count without reading every timestamp and metadata field automatically.
- Provider, project, observed duration, and last-seen metadata remain reachable through normal navigation.

### Token Activity

- `Token Activity` is exposed as a named region.
- Each provider token card is distinguishable by provider name.
- Input/cache/output breakdowns remain understandable without relying on layout or color.
- Missing project attribution is read as unavailable rather than zero or an empty unlabeled region.

## Settings and keyboard

- `Settings` receives focus when opened.
- `Escape` closes Settings and returns focus to the Settings button.
- Provider toggles, Operator mode, notification style, reset reminder, and launch-at-login controls all expose meaningful names and current values.
- `Notification style` offers System / NYX / Minimal and becomes unavailable when quota notifications are disabled.
- Visible keyboard focus remains obvious on buttons, inputs, selects, and toggles.

## Notification personality

Trigger or temporarily fixture a quota warning during development and verify:

- System preserves the factual provider alert copy.
- NYX adds operator framing without altering percentage, provider, window, or reset facts.
- Minimal uses the compact CYBOARD/provider title while preserving the factual body.
- Changing personality does not resend an already-deduplicated threshold alert.

## Compact window

- Provider status is navigable without trapping VoiceOver focus.
- `Escape` closes the compact window as expected.
- Hidden/full-dashboard NYX animation state does not generate accessibility chatter in the compact window.

## Pass criteria

The smoke pass is complete only when all applicable checks above are verified in the macOS Tauri shell. Record unavailable provider-specific checks rather than treating them as passed. Do not mark the roadmap VoiceOver gate complete from DOM/component tests alone.
