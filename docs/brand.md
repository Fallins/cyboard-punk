# CYBOARD Brand System

## Name
**CYBOARD** is the product mark. **CYBOARD PUNK** is the full project/world name. The wordplay combines cyberpunk with dashboard/board.

Tagline: **Cyberpunk command center for AI coding agents.**

## Visual direction
Premium clean cyberpunk rather than distressed neon: deep navy-black surfaces, cyan/magenta/purple energy accents, restrained glow, thin technical grid lines, glass/HUD panels, high information density with calm spacing.

### Core palette
- Void: `#050711`
- Deep panel: `#0A1020`
- Panel elevated: `#10182B`
- Cyan: `#20F6FF`
- Magenta: `#FF2FCF`
- Violet: `#8B5CFF`
- Text primary: `#F4F8FF`
- Text muted: `#8B9BB8`
- Warning: `#FFB020`
- Danger: `#FF3B6B`
- Success: `#59FFB3`

Provider brands are represented only by icons/small accents; large surfaces stay CYBOARD-branded.

## Logo concept
The icon is a geometric `C` built from two interrupted circuit arcs around a central diamond/node. The negative space subtly reads as a dashboard gauge. Cyan-to-magenta edge energy on a dark field. It must work as an app icon, favicon, and embossed mark.

Wordmark: `CYBOARD_` in a wide geometric/monospace-inspired sans. The terminal underscore may animate as a cursor in digital contexts but is static in accessibility/reduced-motion mode.

## macOS tray icon — C-CORE
The tray icon is a purpose-built system glyph, not a reduced version of the colorful app icon.

Canonical form:
- 18 pt target size / 36 × 36 px Retina source
- transparent background
- monochrome template image
- bold open `C` ring with rounded terminals
- one filled diamond core at the right-side opening
- no text, gradient, glow, square background, provider branding, or decorative detail
- macOS controls light/dark rendering through `icon_as_template(true)`

Asset: `src-tauri/icons/trayTemplate.png`.

Future active/warning state should preserve the C-CORE silhouette. Prefer a small status dot, badge, or optional menu-bar text rather than recoloring the template glyph. The tray icon must remain recognizable at native menu-bar size before any brand flourish is added.

## Motion language
- scan sweep: 1.8–3.0 s, low opacity
- glow pulse: 2.5–4.0 s
- provider updates: short 180–240 ms edge flare
- warning: amber/magenta, never rapid flashing
- reduced motion: no looping animation; state changes use opacity only

## UI rules
- minimum body text 13 px in compact popover, 14 px dashboard
- contrast remains readable without glow
- glow never carries semantic meaning by itself
- data bars use labels/percentages, not color alone
- monospace reserved for metrics/system labels, not long prose
