# Round 1 generation log

- Model: built-in image_gen (model/version not exposed)
- Generator: built-in (no API key)
- Reference images attached as visual inputs: yes
- Total attempts: 4

| File | Actual size | Checks failed (by #) | Notes |
|---|---|---|---|
| base-1.png | 1024x1536 | none | |
| base-2.png | 1024x1536 | none | |
| (rejected #3) | 854x1840 | N/A (same-round size rule) | Portrait and unmodified, but rejected because its size differed from the accepted round size. |
| base-3.png | 1024x1536 | none | |

## Deviations

- The built-in tool produced 1024x1536 for the three accepted candidates, rather than the README's currently known 941x1672 default. No size was specified and no output was resized, enlarged, cropped, or padded.
- Attempt #3 produced 854x1840. It was rejected to keep every accepted candidate in this round at the same actual size.
