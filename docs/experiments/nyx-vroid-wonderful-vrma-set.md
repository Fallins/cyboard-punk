# Wonderful VRMA set intake

## Scope

This records a read-only inspection of the user-supplied
`/Users/user/Downloads/ワンダフルなVRMAセット.zip` before its four VRMA files were copied,
unchanged, into the opt-in NYX VRoid preview. It does not approve the assets for production,
distribution, or use by the published NYX runtime.

| Item | Result |
| --- | --- |
| Archive size | 93 KB |
| Archive SHA-256 | `546032815ff89aeafad47d8331a01e9c28d8d2c319fabdcee26e3a67ac85b26f` |
| Integrity | ZIP test passed |
| VRMA extension | `VRMC_vrm_animation` spec `1.0` |
| Animation clips per file | 1 unnamed clip |
| Duration | 3.0 seconds each |
| Humanoid tracks | 53 channels: hips translation plus 52 humanoid rotations |
| Facial expression tracks | none (`expressions.preset` and `expressions.custom` are both empty) |
| Meshes or morph targets in VRMA | none; these are skeletal animation assets |

## Local asset mapping

The archive's legacy Japanese filenames were normalized to ASCII paths for URL safety. File
contents were not altered.

| Source filename | Local experimental path | SHA-256 | Preview cue |
| --- | --- | --- | --- |
| `みんなの笑顔で彩る世界.vrma` | `experiments/nyx-vroid/local-assets/wonderful/all-smiles-world.vrma` | `1097477ae0e3f5091ed3e07cd38ccc2b5badf0e4041a15b70c5072756a54a236` | happy, 85% |
| `みんな大好き素敵な世界.vrma` | `experiments/nyx-vroid/local-assets/wonderful/wonderful-world.vrma` | `35fcbfac99edc68a8640c71e89b356b22100e088dae739438aed4c1ff7f8915f` | happy, 78% |
| `気高く可愛く煌めく世界.vrma` | `experiments/nyx-vroid/local-assets/wonderful/sparkling-world.vrma` | `20759261009025ebe24e0a14584009df27a2006144620e0671aa7eae092e12cc` | relaxed, 75% |
| `結んで紡いで繋がる世界.vrma` | `experiments/nyx-vroid/local-assets/wonderful/connected-world.vrma` | `5f16ceb8f3364637cb086cc983b459b7f5315499fda35f8dfc8aa473f01d6157` | happy, 68% |

The English labels and face cues are preview metadata. They are not supplied animation data and
must not be represented as authored facial performance.

## Facial playback decision

All eleven available preview VRMAs (the preceding seven VRoid Project files and these four files)
have zero expression tracks. Without an explicit face track, the animation mixer cannot animate
the candidate's blend shapes. The experiment now uses the candidate's own VRM 1.0 expression
presets (`happy`, `relaxed`, `surprised`, and others) through `VRMExpressionManager`, rather than
writing arbitrary morph indices while a motion is playing.

The order of precedence is:

```text
VRMA source expression tracks, if present
    -> curated preview cue, only when source has none
        -> untouched source face, when the motion has no cue
```

This is deliberately a reviewable curation layer, not production state-to-motion logic. The
motion's full pose must still be visually reviewed with this specific avatar before a cue is kept.

## Included readme restrictions

The archive's `readme.txt` says the author assumes no responsibility for losses from use. It also
prohibits unmodified redistribution (paid or free), paid distribution of altered files, use for
defamation or harassment, and political or religious use. It names no author and gives no
commercial or publication permission.

Accordingly, the copied binaries remain untracked local experimental files. Any future commit,
release, bundle, or sharing decision needs asset-owner and license review first.
