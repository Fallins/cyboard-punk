# Round 1 generation log

- Model: gpt-image 2.0 (attempts #1-#13); gpt-image-2.5-sunburst (attempts #14-#16)
- Requested size: 2160x3840
- Reference images attached as visual inputs: yes
- Total attempts: 16

| File | Actual size | Checks failed (by #) | Notes |
|---|---|---|---|
| rejected-attempt-01.png | 941x1672 | 10 | Retained at user request; rejected because the actual size was not allowed. |
| rejected-attempt-02.png | 941x1672 | 10 | Retained at user request; rejected because the actual size was not allowed. |
| rejected-attempt-03.png | 941x1672 | 10 | Retained at user request; rejected because the actual size was not allowed. |
| rejected-attempt-04.png | 941x1672 | 10 | Retained at user request; rejected because the actual size was not allowed. |
| rejected-attempt-05.png | 941x1672 | 10 | Retained at user request; rejected because the actual size was not allowed. |
| rejected-attempt-06.png | 941x1672 | 10 | Retained at user request; rejected because the actual size was not allowed. |
| rejected-attempt-07.png | 941x1672 | 10 | Retained at user request; rejected because the actual size was not allowed. |
| rejected-attempt-08.png | 941x1672 | 10 | Retained at user request; rejected because the actual size was not allowed. |
| rejected-attempt-09.png | 941x1672 | 10 | Retained at user request; rejected because the actual size was not allowed. |
| (rejected #10) | N/A | N/A | Built-in generator returned HTTP 409; no output was produced. |
| rejected-attempt-11.png | 941x1672 | 10 | Retained at user request; rejected because the actual size was not allowed. |
| rejected-attempt-12.png | 941x1672 | 10 | Retained at user request; rejected because the actual size was not allowed. |
| rejected-attempt-13.png | 940x1672 | 10 | Retained at user request; rejected because the actual size was not allowed. |
| (rejected #14) | N/A | N/A | GPT Image 2.5 request was security-terminated before its output was received; no output was retained. |
| (rejected #15) | 2160x3840 | 8 | Background contained a dark-gray gradient, floor, and ground shadow. |
| (rejected #16) | 2160x3840 | 8 | Background contained a visible floor and ground shadow. |

## Deviations

- Attempts #1-#13 used the built-in `gpt-image` 2.0 generator, rather than the required GPT Image 2.5, because that surface exposed neither the requested model nor fixed-size controls. The outputs were 941x1672 except attempt #13 at 940x1672; all were rejected on check #10. Attempt #1 also included a non-creative structured wrapper around the README prompt; attempts #2-#16 used the README first-round prompt verbatim.
- Attempt #10 failed with a built-in generator HTTP 409 and produced no image.
- Attempt #14 used `gpt-image-2.5-sunburst` with all four reference images and the requested 2160x3840 size, but was security-terminated before a response was received after its API key appeared in a local process diagnostic. No output was retained.
- Attempts #15-#16 used `gpt-image-2.5-sunburst`, all four reference images, the README prompt verbatim, and 2160x3840 PNG output. Their actual sizes met check #10, but both were rejected on check #8. No output was resized, enlarged, cropped, or padded.
- At user request after the round, the 12 recoverable rejected outputs from attempts #1-#9 and #11-#13 were retained as `rejected-attempt-*.png`. Attempts #10 and #14 had no retained output; the temporary outputs from attempts #15-#16 had already been securely removed and could not be recovered.
