# Round 2 generation log

- Model: built-in image_gen (model/version not exposed)
- Generator: built-in (no API key)
- Input image: base.png

| File | Attempt | Actual size | Checks failed (by #) | Notes |
| --- | ---: | --- | --- | --- |
| face-eyes-closed.png | 1 | 1024 x 1536 | None | Passed checks 1-6: only both eyes changed to a natural closed expression. |
| face-smile.png | 1 | 1024 x 1536 | None | Passed checks 1-6: only the restrained closed-mouth smile changed. |
| face-mouth-open.png | 1 | 1024 x 1536 | None | Passed checks 1-6: only the slightly open mouth changed. |
| face-playful.png | 1 | 1024 x 1536 | None | Passed checks 1-6: only the subtle playful facial expression changed. |
| arm-right-45.png | 1 | 1024 x 1536 | None | Passed checks 1-6: only the character's right arm (image left) changed; hand has five fingers and does not overlap the torso. |
| arm-right-90.png | 1 | 1024 x 1536 | None | Passed checks 1-6: only the character's right arm (image left) changed; hand has five fingers and does not overlap the torso or face. |
| arm-left-45.png | 1 | 1024 x 1536 | None | Passed checks 1-6: only the character's left arm (image right) changed; hand has five fingers and does not overlap the torso. |
| arm-left-90.png | 1 | 1024 x 1536 | None | Passed checks 1-6: only the character's left arm (image right) changed; hand has five fingers and does not overlap the torso or face. |

## Skipped

- None.

## Deviations

- None.
