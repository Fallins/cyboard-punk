# Localization contract

CYBOARD supports two persisted presentation languages:

- `en` — English, the migration/default language.
- `zh-TW` — Traditional Chinese with concise command-center wording.

Localization is a presentation-layer concern. Provider adapters, normalized domain models, quota math, alert thresholds, source metadata and session detection remain language-neutral.

## Runtime rules

- The language setting is stored with the existing CYBOARD settings payload and sanitized on load.
- Switching language in Settings updates the main dashboard immediately without a provider refresh.
- The compact menu reloads persisted settings on focus/storage changes so it follows the dashboard language.
- Native notification facts are produced in the selected language before the System / NYX / Minimal personality renderer is applied.
- Notification personality may change framing only; localization must not change provider identity, quota percentage, reset timestamp, threshold, timing or deduplication key.

## Traditional Chinese copy style

Chinese copy should stay short and operational rather than translating every technical term literally. Keep stable product/provider/telemetry identifiers in English when that is clearer, including names such as `CYBOARD`, `NYX`, `AXON`, `Codex`, `Claude Code`, `Cursor`, `Provider`, `Token`, `Cache`, `Project`, `Session`, `Request`, model identifiers and the evidence badges `LIVE / CACHE / OFFLINE`.

Relative durations use compact uppercase units in Chinese:

- `30M`
- `2H`
- `1D 6H`

Provider-supplied quota-window shorthand follows the same Chinese presentation rule when it is a simple duration label: `5h -> 5H`, `7d -> 7D`, `30m -> 30M`. This conversion happens only while rendering localized copy; the normalized provider value remains unchanged. Named windows such as `Current` and provider/model/project identifiers are not rewritten.

English retains its established lowercase duration copy where already used (`30m`, `2h`, `1d 6h`) and existing English UI wording should not be changed merely to accommodate localization.

Absolute Chinese timestamps use a concise Taiwan locale month/day + 24-hour time representation. English keeps the pre-localization `toLocaleString()` presentation contract.

## Coverage surface

The selected language applies to user-facing presentation in:

- dashboard navigation/status copy;
- provider quota cards and normalized issue states;
- Status Intelligence / System Brief;
- capacity routing;
- Ask CYBOARD prompts and deterministic answers;
- quota trend labels;
- Token Activity explanatory copy;
- active sessions and recent closeouts;
- Settings;
- NYX/AXON operator HUD and diagnostic controls where the label is not already a concise technical identifier;
- compact tray window;
- quota/reset native notifications.

Raw provider payload text is not treated as translated UI. Where an upstream issue reaches the UI, CYBOARD maps the normalized issue code to a concise localized message rather than attempting to translate arbitrary provider prose.

## Regression requirements

Tests must preserve these invariants:

- malformed or unsupported persisted language values fall back to English;
- English remains the default for older settings payloads;
- Chinese duration formatting uses `D / H / M` uppercase shorthand;
- simple provider quota-window duration labels use the same uppercase shorthand in Chinese without mutating normalized provider data;
- English duration/date/copy contracts do not regress due to localization work;
- provider/model/project identifiers are not translated or rewritten;
- localized Status Intelligence remains deterministic and uses the same normalized evidence as English;
- localized native notifications preserve the same factual alert and deduplication semantics;
- localization never causes a provider refresh, changes NYX motion/state semantics, or introduces an external translation/LLM dependency.
