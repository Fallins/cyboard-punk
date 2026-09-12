# 06 — Stage Handoffs / Copy-Ready New-Chat Prompts

Status: **MANDATORY AT STAGE BOUNDARIES**

At the end of each stage, stop and tell the user to open a new chat. Paste the appropriate prompt below verbatim unless branch/state paths have genuinely changed; if they changed, update this file first.

Every new-stage agent must read files before acting and must not trust remembered chat context.

---

## SETUP -> STAGE 0 — Character Direction

```text
請在 GitHub repo `Fallins/cyboard-punk` 的 `feature/visual-agent-workflow` 分支繼續 CYBOARD 角色工作。

這是一個全新的 Stage 0 對話。不要依賴任何舊聊天記憶，也不要假設你知道目前進度。

開始前請完整依序讀取：
1. `AGENTS.md`
2. `docs/character-workflow/README.md`
3. `docs/character-workflow/00_AGENT_PROTOCOL.md`
4. `docs/character-workflow/01_CHARACTER_DIRECTION.md`
5. `docs/character-workflow/02_REFERENCE_MANIFEST.md`
6. `docs/character-workflow/03_ACCEPTANCE_CRITERIA.md`
7. `docs/character-workflow/04_WORK_STATE.md`
8. `docs/character-workflow/05_VISUAL_REVIEW.md` 最新紀錄
9. `docs/character-workflow/07_TOOLING_LOOP.md`
10. 現有 `docs/brand.md`、`docs/nyx-2.5d-asset-spec.md` 與目前 NYX references/asset lock（只當 baseline，不可覆寫）

讀完後先用很短的方式回報：Current Stage、Protected Baseline、Allowed Changes、Forbidden Changes、Next Action。

本對話只執行 `STAGE 0 — CHARACTER DIRECTION`：
- 重新思考 CYBOARD 的人物，不必被舊 NYX 綁死；可以保留 NYX、重設計 NYX，或提出新 Operator。
- 根據 CYBOARD 產品定位提出 3–5 個「明顯不同」的角色方向，不要只是換髮色或衣服。
- 每個方向要包含角色定位、臉/髮/輪廓、服裝語言、signature motif、色彩、適合的 2D/2.5D/3D 路線、動畫潛力、成本與風險。
- 有助於判斷時可以產生概念圖，但不要開始 final model、rig、runtime integration。
- 跟我一起收斂直到我明確選定一個方向。

只有我明確選定方向後，才可把 Stage 0 標記 PASS，並更新 `01_CHARACTER_DIRECTION.md`、`04_WORK_STATE.md`、必要的 review/commit。

Stage 0 完成後不要直接做 Stage 1。請停止，提醒我要開新 chat，並從 `06_STAGE_HANDOFFS.md` 輸出 `STAGE 0 -> STAGE 1` 的完整提示詞讓我直接複製。
```

---

## STAGE 0 -> STAGE 1 — Master Reference Lock

```text
請在 GitHub repo `Fallins/cyboard-punk` 的 `feature/visual-agent-workflow` 分支執行 CYBOARD 角色 workflow 的 `STAGE 1 — MASTER REFERENCE LOCK`。

不要依賴前一個聊天。先依 `docs/character-workflow/README.md` 規定完整讀取所有 Source of Truth，尤其是 `01_CHARACTER_DIRECTION.md`、`02_REFERENCE_MANIFEST.md`、`03_ACCEPTANCE_CRITERIA.md`、`04_WORK_STATE.md` 與最新 `05_VISUAL_REVIEW.md`。

先確認 Stage 0 確實 PASS；若沒有 PASS，不得往下做。

本對話只負責把已選定的角色方向製作成一致、可實作、可比對的 Master Reference Set：Hero、Front、Side、Back、3/4、Face close-up、Detail sheet。你必須反覆檢查跨視角的臉、髮型、身材比例、服裝、核心標誌、材質與色彩一致性；有矛盾就修 reference，不要把矛盾留給後續建模自行猜。

直到我明確核准整套 references 前不得鎖定。核准後更新 `02_REFERENCE_MANIFEST.md`、`04_WORK_STATE.md`、`05_VISUAL_REVIEW.md`，記錄可取得的 path/hash/identifier 與 lock policy。

Stage 1 PASS 後停止，不要開始建模/切圖。提醒我開新 chat，並輸出 `STAGE 1 -> STAGE 2` 的完整提示詞。
```

---

## STAGE 1 -> STAGE 2 — Base Build & Silhouette

```text
請在 GitHub repo `Fallins/cyboard-punk` 的 `feature/visual-agent-workflow` 分支執行 `STAGE 2 — BASE BUILD & SILHOUETTE`。

這是新對話。先完整讀取 `docs/character-workflow/README.md` 要求的 Source of Truth 與已鎖定 Master References；確認 Stage 1 PASS 才能開始。

本 Stage 只建立角色 base asset/model 與比例輪廓。依 `01_CHARACTER_DIRECTION.md` 記錄的 medium 選擇適當方法；如果探索 3D，保持在 experimental 路徑，不得因此恢復 production 3D runtime。固定 Front/Profile/3/4（必要時 Back）視角反覆執行 Reference -> Build -> Render -> Critique -> Local Fix。

這一階段不要提前做精細材質、完整動畫或 runtime integration。先把 head/body scale、肩寬、torso、腰、髖、腿長、鞋高與整體 silhouette 做到 Gate PASS。

完成後更新 `04_WORK_STATE.md`，把已通過比例區域 freeze，append `05_VISUAL_REVIEW.md`。Stage 2 PASS 後停止並輸出 `STAGE 2 -> STAGE 3` 新 chat 提示詞。
```

---

## STAGE 2 -> STAGE 3 — Face & Hair Fidelity

```text
請在 `Fallins/cyboard-punk` / `feature/visual-agent-workflow` 執行 `STAGE 3 — FACE & HAIR FIDELITY`。

先依 workflow README 完整恢復狀態，確認 Stage 2 PASS，並讀取鎖定的 REF-FACE、Front、3/4、Side 及 frozen areas。

本 Stage 只把臉與髮型做到 identity fidelity Gate。使用固定 Front/3/4/Profile face captures，逐項檢查眼、眉、鼻、嘴、jaw/chin、臉寬、profile、髮際/瀏海、髮量、長度、主要色彩結構。每次只修 review 指出的局部，不得因為修臉而重新生成已 freeze 的全身比例。

達到 `03_ACCEPTANCE_CRITERIA.md` 的 Stage 3 Gate 且我沒有否決後，更新 state/review、freeze face/hair identity，停止並輸出 `STAGE 3 -> STAGE 4` 新 chat 提示詞。
```

---

## STAGE 3 -> STAGE 4 — Costume, Materials & Detail

```text
請在 `Fallins/cyboard-punk` / `feature/visual-agent-workflow` 執行 `STAGE 4 — COSTUME, MATERIALS & DETAIL`。

先依 workflow README 恢復全部 state/reference/frozen areas，確認 Stage 3 PASS。

只處理服裝結構、材質層次、signature core/motif、emissive、手/手套、鞋與必要 detail。保持 Stage 2 身材比例與 Stage 3 臉/髮完全 freeze；除非真的存在結構性 blocker，否則不得碰。

使用同角度 reference comparison 與局部 close-up review，避免用更戲劇化的 lighting 掩蓋材質或結構差異。

Gate PASS 後更新 state/review，停止並輸出 `STAGE 4 -> STAGE 5` 提示詞。
```

---

## STAGE 4 -> STAGE 5 — Rig & Deformation

```text
請在 `Fallins/cyboard-punk` / `feature/visual-agent-workflow` 執行 `STAGE 5 — RIG & DEFORMATION`。

先依 workflow README 完整讀取 state、references、frozen areas，確認 Stage 4 PASS。

依目前 medium 建立可動畫結構；3D 使用 rig/weights/correctives，2D/2.5D 使用對應 layer/mesh deformation。逐一測試 neutral、neck、shoulder/arm raise、elbow/wrist、torso、hip/knee 等實際需要的變形，並用 capture review 黑縫、穿模、體積崩壞、臉部意外變形與服裝分離。

不得以「動畫時看不太到」為理由接受明顯 deformation defect。Static identity 也必須重新驗證沒有 regression。

Gate PASS 後更新 state/review，停止並輸出 `STAGE 5 -> STAGE 6` 提示詞。
```

---

## STAGE 5 -> STAGE 6 — Animation & Secondary Motion

```text
請在 `Fallins/cyboard-punk` / `feature/visual-agent-workflow` 執行 `STAGE 6 — ANIMATION & SECONDARY MOTION`。

先從 repo Source of Truth 恢復狀態，確認 Stage 5 PASS。

只建立產品真正需要的動作：idle/breathing、注意力/視線/頭部、blink/expression、gesture/acknowledgement，以及角色規格明確要求的其他動作。若有 secondary motion，要自然衰減並收斂，不能像彈簧或永遠晃動。

每個重要 motion 都要用實際 capture 做 Critic review，檢查 timing、重量感、穿模、deformation、freeze 區 regression，以及 reduced-motion/hidden-window 的策略。

Gate PASS 後更新 state/review，停止並輸出 `STAGE 6 -> STAGE 7` 提示詞。
```

---

## STAGE 6 -> STAGE 7 — Runtime Integration & Performance

```text
請在 `Fallins/cyboard-punk` / `feature/visual-agent-workflow` 執行 `STAGE 7 — RUNTIME INTEGRATION & PERFORMANCE`。

先完整恢復 workflow state，確認 Stage 6 PASS，並讀 `docs/architecture.md`、`docs/performance.md`、目前 NYX runtime/checkpoint 文件。

把新角色接進「可回退、非破壞性」的 experimental path。不要直接移除/覆寫現有 production NYX，也不要擅自切換預設 renderer。驗證 lifecycle、persistently mounted 行為、state mapping、hidden/reduced-motion、fallback、runtime errors，以及專案目前既有 performance budgets。

Visual fidelity 與 runtime capture 必須再比對 Master References；不可為了達 budget 偷降畫質而不告知。

Gate PASS 後更新 state/review，停止並輸出 `STAGE 7 -> STAGE 8` 提示詞。
```

---

## STAGE 7 -> STAGE 8 — Final QA & Promotion Gate

```text
請在 `Fallins/cyboard-punk` / `feature/visual-agent-workflow` 執行 `STAGE 8 — FINAL QA & PROMOTION GATE`。

這個 Stage 不以新增功能為主。先完整讀取所有 workflow Source of Truth、全部 Gate 狀態、Master References、最新 runtime implementation 與重要 visual reviews。

重新做 final hero + neutral view comparison、face identity、silhouette、costume/material、deformation、motion、runtime/fallback/performance regression 檢查。任何 earlier frozen area 被改過都必須確認已重新驗證。

最後只提出三種明確結論供我選：
1. PROMOTE — 通過，允許另開整合變更把新角色升為 production；
2. KEEP EXPERIMENTAL — 保留可玩版本但不替換 production；
3. REJECT/REWORK — 指出要回到哪一個 Stage。

沒有我的明確 `PROMOTE`，不得覆寫現有 production NYX source lock/master 或切換 default runtime。

如果我選 PROMOTE，先更新 state/review 並停止；再提供一個新的「Production Promotion」chat 提示詞，不要在本聊天直接做破壞性切換。
```
