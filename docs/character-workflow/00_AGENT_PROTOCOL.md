# 00 — Agent Protocol

Status: **MANDATORY**

## 1. Core rule

CYBOARD character work uses a deterministic visual iteration loop:

```text
Approved Reference
  -> Implement
  -> Render / Capture
  -> Compare
  -> Critique
  -> Local Fix
  -> Render Again
  -> PASS / FAIL
```

Do not use a one-shot "generate the whole character and call it done" workflow.

## 2. Recovery before action

At the beginning of every new chat or after any suspected context compression:

1. read the required files listed in `README.md`;
2. report the current stage, current artifact version, frozen areas, allowed changes, and next action from `04_WORK_STATE.md`;
3. verify that the referenced assets/files actually exist before editing them;
4. if state conflicts with chat memory, follow the files and explicitly mention the mismatch.

Never guess missing state.

## 3. Local-fix discipline

When a review identifies a defect, change the smallest region that can solve it.

Examples:

- jaw too wide -> edit jaw/face region, not body proportions;
- shoulder silhouette wrong -> edit shoulder/upper torso, not hair and boots;
- material too plastic -> change material/lighting, not facial geometry;
- rig deformation issue -> fix weights/bones, not redesign the costume.

Broad regeneration is forbidden after unrelated regions are frozen unless the user explicitly authorizes a reset.

## 4. Freeze rule

A region that has passed its gate becomes frozen.

Frozen regions may change only when:

1. the user explicitly requests the change;
2. a later stage reveals a structural defect that cannot be solved locally;
3. the current stage documents why the frozen change is unavoidable;
4. the affected earlier gate is rerun and passes again.

Any such regression must be recorded in `05_VISUAL_REVIEW.md`.

## 5. Visual comparison protocol

Use fixed views whenever the medium supports them:

- front;
- left or right profile;
- 3/4;
- back when costume/silhouette requires it;
- face close-up for identity work;
- motion/deformation captures for rig and animation gates.

For 3D work, use fixed camera/lens/lighting presets for comparisons. For 2D work, compare at the same crop, scale, and background. Do not hide defects by changing the camera, lighting, pose, crop, or focal length between iterations.

## 6. Critique quality

A critique must describe actionable deltas. Prefer:

- landmark position;
- relative proportion;
- silhouette shape;
- projection/profile;
- material response;
- value/color mismatch;
- clipping/intersection;
- deformation error;
- timing/settling behavior.

Avoid unsupported comments such as "looks weird" or "make it prettier."

Each issue must have:

- severity: P0 / P1 / P2 / P3;
- affected region;
- evidence/view;
- expected result;
- allowed scope of fix.

## 7. Builder and Critic separation

During an iteration:

1. Builder makes the scoped change.
2. Builder captures the required comparison views.
3. Critic evaluates against references and criteria.
4. If FAIL, Critic returns defects only.
5. Builder fixes only those defects.

The Critic must not excuse a mismatch because the Builder's output is technically valid.

## 8. Production safety

Until Stage 8 is explicitly approved:

- do not overwrite current production NYX master/source lock/rig;
- do not delete existing fallback assets;
- do not silently switch the runtime default;
- keep experimental work isolated and reversible;
- prefer additive commits.

A successful experiment is not automatically a production migration.

## 9. State persistence

After every meaningful iteration, update `04_WORK_STATE.md` if any of these changed:

- current asset version;
- current stage/substage;
- passed/failed criteria;
- frozen areas;
- allowed/forbidden changes;
- active problems;
- reference set;
- next action.

After every formal visual review, append to `05_VISUAL_REVIEW.md`.

Do not leave important decisions only in chat.

## 10. Chat boundary

At the end of a stage:

1. run the gate;
2. update state;
3. append review;
4. commit/persist artifacts when possible;
5. stop;
6. tell the user to open a new chat;
7. output the exact next-stage prompt from `06_STAGE_HANDOFFS.md` in a copy-ready block.

Do not continue into the next stage in the same chat unless the user explicitly overrides the workflow.
