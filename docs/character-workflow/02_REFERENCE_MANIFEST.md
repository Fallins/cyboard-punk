# 02 — Reference Manifest

Status: **INITIALIZED / NEW MASTER SET NOT YET LOCKED**

This file records which images/assets are authoritative for visual comparison. References not recorded here may inform exploration but cannot override an approved master.

## A. Protected production baseline

These remain valid as rollback/fallback assets while redesign work is in progress.

| Reference | Path / record | Role | Status |
| --- | --- | --- | --- |
| Current NYX source lock | `assets/operator/nyx/source-lock.json` | Hashes and provenance of approved production reference series | PROTECTED |
| Current NYX master | `assets/operator/nyx/source/master.webp` | Current production visual source | PROTECTED |
| Current 2.5D spec | `docs/nyx-2.5d-asset-spec.md` | Current production art/render contract | PROTECTED |

Do not overwrite these during Stages 0–7.

## B. Redesign reference set

Stage 1 must populate this table after Stage 0 selects a direction.

| ID | Required view | Repo path / immutable attachment | SHA/hash if available | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| REF-HERO | Hero / presentation | PENDING | PENDING | PENDING | Character identity and overall art direction |
| REF-FRONT | Neutral front | PENDING | PENDING | PENDING | Proportion/silhouette source |
| REF-SIDE | Neutral profile | PENDING | PENDING | PENDING | Projection/profile source |
| REF-BACK | Neutral back | PENDING | PENDING | PENDING | Costume/hair/back structure |
| REF-3Q | Neutral 3/4 | PENDING | PENDING | PENDING | Face/body volume consistency |
| REF-FACE | Face close-up | PENDING | PENDING | PENDING | Primary identity source |
| REF-DETAIL | Detail sheet | PENDING | PENDING | PENDING | Core, hands/gloves, footwear, materials |

## C. Reference consistency requirements

Before Stage 1 can PASS:

- all views depict the same character, costume, hair, palette, and signature details;
- front/side/back proportions are mutually plausible;
- face close-up matches the full-body character;
- no view silently changes bust/waist/hip/shoulder/leg proportions;
- costume seams/panels/core placement do not teleport between views;
- footwear and hand design are consistent;
- hair volume and length are consistent;
- all intentional asymmetry is documented;
- the reference set is sufficiently clean to judge implementation without guessing.

## D. Authority rules

Once Stage 1 passes:

1. `REF-FACE` is authoritative for facial identity.
2. `REF-FRONT`, `REF-SIDE`, `REF-BACK`, and `REF-3Q` jointly define body/silhouette.
3. `REF-DETAIL` defines close material/detail decisions where it does not conflict with identity views.
4. `REF-HERO` defines final presentation mood but may not override neutral-view proportions.

If two approved references conflict materially, Stage 1 reopens. Do not let the implementation choose arbitrarily.

## E. Comparison captures

Implementation renders/screenshots are not references. Store or name them by iteration, for example:

```text
review/stage-02/v003/front
review/stage-02/v003/side
review/stage-02/v003/3q
```

The exact storage path may change with tooling, but `05_VISUAL_REVIEW.md` must identify the reviewed artifact/version and views.
