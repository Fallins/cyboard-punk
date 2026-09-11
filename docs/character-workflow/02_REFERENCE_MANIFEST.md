# 02 — Reference Manifest

Status: **STAGE 1 PASS — MASTER SET LOCKED**

This file records which images/assets are authoritative for visual comparison. References not recorded here may inform exploration but cannot override an approved master.

## A. Protected production baseline

These remain valid as rollback/fallback assets while redesign work is in progress.

| Reference | Path / record | Role | Status |
| --- | --- | --- | --- |
| Current NYX source lock | `assets/operator/nyx/source-lock.json` | Hashes and provenance of approved production reference series | PROTECTED |
| Current NYX master | `assets/operator/nyx/source/master.webp` | Current production visual source | PROTECTED |
| Current 2.5D spec | `docs/nyx-2.5d-asset-spec.md` | Current production art/render contract | PROTECTED |

Do not overwrite these during Stages 0–7.

## B. Locked redesign reference set

Master reference set: **`nyx-stage1-master-reference-v1`**  
Lock metadata: `assets/operator/nyx-redesign/references/stage-01/reference-lock.json`

All seven views below are immutable crops from the single user-approved Stage 1 character sheet. This intentionally keeps identity, hairstyle, costume language, palette, proportions and core motif on one visual source rather than mixing separately generated images.

| ID | Required view | Repo path | SHA-256 | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| REF-HERO | Hero / presentation | `assets/operator/nyx-redesign/references/stage-01/hero.webp` | `a36682053b50bee27f1c28e1b08f5baed6b68de0ab050192523f7b716333cb94` | LOCKED | Character identity and presentation mood |
| REF-FRONT | Neutral front | `assets/operator/nyx-redesign/references/stage-01/front.webp` | `5f48668117061d07c5b3bd9ff52b03dceebbd9bf57f1e2fa488c45c70b657b1b` | LOCKED | Primary front silhouette/proportion source |
| REF-SIDE | Neutral profile | `assets/operator/nyx-redesign/references/stage-01/side.webp` | `38e70fb920d770154e9351ee87e0bace0ad8141ed77e8418a89627821ea6785a` | LOCKED | Projection/profile source |
| REF-BACK | Neutral back | `assets/operator/nyx-redesign/references/stage-01/back.webp` | `529f0ad95110b68f21099121ffd118f6f0a443c99258f9dae2bb907db67ec8a0` | LOCKED | Costume, coat-tail and hair-back structure |
| REF-3Q | Neutral 3/4 | `assets/operator/nyx-redesign/references/stage-01/3q.webp` | `7fb188e93c7078fc2923f0fa733ea355aa902155fb30f24850acaa61bff4d45d` | LOCKED | Face/body volume consistency |
| REF-FACE | Face close-up | `assets/operator/nyx-redesign/references/stage-01/face.webp` | `5472cf4ac63f30875fd9b379162b928e4b002f68bfa58c71cbd792071593246d` | LOCKED | Primary facial identity source |
| REF-DETAIL | Detail sheet | `assets/operator/nyx-redesign/references/stage-01/detail.webp` | `66619dce5491f62ae7ce969091ef12364c00db24b80cb8c8105e2d999d3c7610` | LOCKED | Core, glove/hand, boot, material seams and rear hair detail |

Approved source sheet SHA-256: `9a2be6e39d7a31bf067225251c104199427fe910b4d57d1edcc675fc12c505d5`.

### Locked visual decisions

- **Hair:** refined low ponytail with long elegant waves; near-black with restrained violet sheen.
- **Face:** adult, mature, refined semi-realistic beauty with a cool composed resting expression and human emotional readability.
- **Silhouette:** elegant mature hourglass tendency, defined waist, balanced bust/hips, long graceful leg line, premium sensuality without aggressive exaggeration.
- **Costume:** fitted black/graphite high-fashion operator tailoring, high collar, long coat tails, smoked/sheer technical panels, fitted gloves and heeled ankle boots.
- **Core:** diamond CYBOARD signal/chest core with cyan center and restrained violet/magenta framing.
- **Palette:** void/graphite/matte black/deep navy with restrained cyan, violet and selective magenta accents.

## C. Reference consistency result

Stage 1 review confirmed:

- the same identity is used across every required view;
- neutral proportions are mutually plausible and suitable for direct base-build comparison;
- the face close-up matches the full-body identity;
- bust/waist/hip/shoulder/leg relationships remain coherent;
- the selected low-ponytail/long-wave hair system reads consistently from front/profile/back/3/4;
- high-collar tailoring, coat tails, gloves, footwear and the diamond core repeat across the set;
- palette and material language remain within the Stage 0 premium-clean CYBOARD contract;
- no unresolved P0/P1 consistency defect remains;
- the user explicitly approved this set on 2026-09-12.

## D. Authority rules

With Stage 1 PASS:

1. `REF-FACE` is authoritative for facial identity.
2. `REF-FRONT`, `REF-SIDE`, `REF-BACK`, and `REF-3Q` jointly define body/silhouette.
3. `REF-DETAIL` defines close material/detail decisions where it does not conflict with identity views.
4. `REF-HERO` defines final presentation mood but may not override neutral-view proportions.
5. Minor micro-trim visibility differences caused by crop scale are resolved in favor of `REF-DETAIL`; they do not authorize costume redesign.

If approved references later conflict materially, Stage 1 reopens. Do not let implementation choose arbitrarily.

## E. Lock policy

- Do not generatively edit or regenerate these references in Stage 2 or later.
- A material change to face identity, hairstyle, silhouette, costume language, core motif or palette requires reopening Stage 1 and explicit user approval.
- Crops/resizes are allowed only if visual design content is unchanged and traceable to `reference-lock.json`.
- The protected production NYX baseline remains separate and untouched until a future Stage 8 Promotion Gate explicitly authorizes promotion.

## F. Comparison captures

Implementation renders/screenshots are not references. Store or name them by iteration, for example:

```text
review/stage-02/v003/front
review/stage-02/v003/side
review/stage-02/v003/3q
```

The exact storage path may change with tooling, but `05_VISUAL_REVIEW.md` must identify the reviewed artifact/version and views.
