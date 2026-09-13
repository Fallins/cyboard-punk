# NYX Live2D 素材生成指南

分支：`feature/nyx-live2d`
資料夾：`assets/operator/nyx-live2d/inbox/`

這份文件給**負責生圖的 agent**（例如 GPT）照著執行。
生出來的圖會交給 Claude 拆圖層、做 Live2D 風格的 rig 和動畫。

## 目前授權到哪一輪

| 輪次 | 狀態 |
|---|---|
| 第一輪：底圖候選 | **已完成**。定案為 `base.png`（內容與 `base-1.png` 相同，1024×1536） |
| 第二輪：表情與手臂變體 | **授權執行** |

第一輪不要再執行，也不要更換 `base.png`。

---

## 通用規則

### 生圖工具與尺寸

- **只用內建的生圖工具**。不要呼叫任何需要 API key 的服務或付費模型
- 不指定像素尺寸，用內建工具的直式輸出（已出現過 1024×1536、941×1672、854×1840，無法控制）
- **不可以**縮放、放大、裁切或補邊。實際輸出尺寸照實記錄在 log

### 參考圖

- 參考圖在 `reference-upload/`：`ref-front.png`、`ref-side.png`、`ref-back.png`、`ref-detail.png`
- 生圖時**必須把這 4 張當作視覺參考圖輸入**，不能只靠文字描述
- **沒辦法把 repo 裡的圖當參考圖輸入的話，就不要生成，直接回報這個限制**。沒有參考圖生出來的角色一定會跑掉
- 不要使用 `assets/operator/nyx-redesign/references/stage-01/` 裡的 `face.webp`、`hero.webp`、`3q.webp`，這三個是壞檔

### 檔案與範圍

- 輸出格式：PNG，不要轉成 JPG 或 WebP
- 只能在 `assets/operator/nyx-live2d/inbox/` 裡新增檔案
- **不要修改** repo 裡其他任何檔案，包括程式碼、文件、`assets/operator/nyx/` 底下的 production 素材、`assets/operator/nyx-redesign/`
- 不要改這份 README

---

## 第一輪：底圖候選（已完成，不要再執行）

### 1. 生成

用下面這段 prompt，搭配 4 張參考圖生成：

```text
Use the attached images as the locked character reference for NYX (front, side, back and detail views of the same character). Recreate exactly this character — same face, same hairstyle, same costume, same colors — as a single high-quality full-body character illustration prepared for 2D animation rigging (Live2D-style).

Character (locked, do not redesign):
- NYX, adult mature woman, refined semi-realistic premium illustration style, beautiful elegant face, cool composed expression
- hair: near-black with a restrained violet sheen, long elegant waves gathered into a refined low ponytail
- costume: fitted black/graphite high-fashion operator tailoring, high collar, long coat tails, smoked semi-sheer technical panels, fitted black gloves, heeled black ankle boots
- chest: small diamond-shaped signal core with a cyan center and a restrained violet/magenta frame
- palette: matte black, graphite, deep navy; restrained cyan and violet accents with a touch of magenta; glow subtle and premium, not neon-heavy

Pose and framing (required for rigging):
- full body, head to boots fully visible, nothing cropped, small empty margin above the head and below the boots
- standing straight, facing the viewer directly, front-on and symmetrical
- head level, eyes open looking straight at the viewer, mouth closed, neutral calm expression
- both arms relaxed and hanging down, held slightly away from the body (about 15 degrees) so there is a clear gap between each arm and the torso and coat
- hands relaxed and fully visible, five fingers each, fingers slightly separated, not touching the body, coat or hips
- feet slightly apart, weight evenly on both legs
- the ponytail falls behind her back; no hair strands cross over the eyes, shoulders or arms
- coat tails hang straight down with visible gaps between the coat tails and the legs

Background and lighting (required for a clean cut-out):
- isolated character on a seamless, flat, solid light gray background (#E6E6E6), like a studio cut-out sprite
- the background is one uniform color from edge to edge: no floor, no horizon line, no ground plane, no gradient, no vignette
- no cast shadow and no contact shadow under the boots
- no text, no labels, no frame, no props, no particles
- soft even front studio lighting, no strong cast shadows on the body
- emissive accents must not glow or bleed onto the background

Output: one character only, tall portrait orientation.
```

### 2. 自我檢查，淘汰不合格的

每張生成結果都對照下表檢查。任何一項不合格就淘汰重生，直到有 **3–4 張合格**，或總共試了 16 次為止。

| # | 檢查項目 |
|---|---|
| 1 | 跟參考圖是同一個人：臉、髮型、服裝、配色都一致 |
| 2 | 全身完整：頭頂到靴底都在畫面內，上下都有留白 |
| 3 | 正面站姿，頭沒有歪 |
| 4 | 眼睛睜開、嘴巴閉著、表情平靜 |
| 5 | 兩隻手各 5 根手指，手完整、沒有碰到身體或外套 |
| 6 | 兩隻手臂和身體之間都看得到縫隙 |
| 7 | 馬尾在背後，頭髮沒有蓋住眼睛、肩膀、手臂 |
| 8 | 背景是淺色、單純，跟角色對比清楚。**可接受**：輕微漸層、靴底下很淡的小陰影。**不可接受**：深色背景、地板或地面延伸到腿部、陰影碰到靴子以外的部位、文字、邊框、道具 |
| 9 | 發光效果沒有暈到背景上 |
| 10 | 直式輸出，且沒有經過縮放、裁切、補邊 |

### 3. 存檔

合格的圖依序存成：

```text
assets/operator/nyx-live2d/inbox/base-1.png
assets/operator/nyx-live2d/inbox/base-2.png
assets/operator/nyx-live2d/inbox/base-3.png
assets/operator/nyx-live2d/inbox/base-4.png   （有第 4 張合格才存）
```

### 4. 寫生成紀錄

建立 `assets/operator/nyx-live2d/inbox/GENERATION_LOG.md`，格式如下：

```markdown
# Round 1 generation log

- Model: <實際使用的模型名稱與版本>
- Generator: built-in (no API key)
- Reference images attached as visual inputs: yes / no
- Total attempts: <數字>

| File | Actual size | Checks failed (by #) | Notes |
|---|---|---|---|
| base-1.png | 941x1672 | none | |
| (rejected #1) | 941x1672 | 5 | 左手 6 根手指 |
| ... | | | |

## Deviations
<任何跟這份 README 不一致的地方：尺寸不符、無法附參考圖、prompt 有修改等。沒有就寫 none>
```

被淘汰的圖不用存檔，但要在表格裡記一行。

### 5. Commit 並回報

- 直接 commit 到 `feature/nyx-live2d`，commit message：`chore: add NYX live2d round 1 base candidates`
- 如果你的環境不能直接 push 到這個分支，就開一個 PR，**目標分支是 `feature/nyx-live2d`**（不是 `main`）
- 回報內容：
  1. commit SHA 或 PR 連結
  2. 存了幾張候選
  3. `GENERATION_LOG.md` 的 Deviations 內容

然後停止。

---

## 第二輪：表情與手臂變體（授權執行）

### 規則

1. **每一張都以 `assets/operator/nyx-live2d/inbox/base.png` 當作輸入圖來修改**。不要拿改過的圖再改，誤差會累積；每做一張都重新附上 `base.png`
2. 這一輪不需要附 `reference-upload/` 的參考圖，`base.png` 就是唯一的視覺依據
3. 輸出尺寸**最好**跟 `base.png` 相同（1024×1536）。內建工具給出不同尺寸時**可以接受**，照實記錄即可，對齊由 Claude 處理；但不可以自己縮放、裁切或補邊
4. 每個 prompt 前面都加下面的共通開頭
5. 每張都用下方的「第二輪自我檢查」判斷。不合格就重生；同一張重生到第 3 次仍不合格，就跳過那張並記錄在 log

```text
Edit the attached image. Change ONLY the part described below. Everything else must stay exactly the same: the same character, pose, framing, scale and position in the image, the same hair, costume, lighting, colors and background. Do not crop, zoom, shift, restyle or re-render any other part of the image. Output at exactly the same resolution as the attached image.
```

### 第二輪自我檢查

把輸出和 `base.png` 並排比對：

| # | 檢查項目 |
|---|---|
| 1 | 還是同一個人：臉型、五官比例、髮型、服裝、配色都沒變 |
| 2 | **只有指定的部位改變**。表情變體：頭部以外看不出差異。手臂變體：指定的那隻手臂以外看不出差異 |
| 3 | 角色在畫面中的位置、大小、姿勢沒有變（尺寸不同時，看角色相對畫面的比例） |
| 4 | 背景仍是均勻淺灰，沒有新增地板、陰影、文字、道具 |
| 5 | 表情變體：指定的表情有做出來，而且自然、不誇張 |
| 6 | 手臂變體：手有 5 根手指、手臂沒有擋到身體或臉、看起來是在畫面平面內抬起，不是朝鏡頭伸出 |

### 存檔與生成紀錄

- 檔名照下方各段標題，存在 `assets/operator/nyx-live2d/inbox/`
- 建立 `assets/operator/nyx-live2d/inbox/GENERATION_LOG_ROUND2.md`（第一輪的 `GENERATION_LOG.md` 不要動），格式：

```markdown
# Round 2 generation log

- Model: <實際使用的模型名稱與版本>
- Generator: built-in (no API key)
- Input image: base.png

| File | Attempt | Actual size | Checks failed (by #) | Notes |
|---|---|---|---|---|
| face-eyes-closed.png | 1 | 1024x1536 | none | |
| (rejected) face-smile | 1 | 941x1672 | 2 | 頭髮也被重畫 |
| ... | | | | |

## Skipped
<重生 3 次仍不合格而跳過的檔案，以及原因。沒有就寫 none>

## Deviations
<任何跟這份 README 不一致的地方。沒有就寫 none>
```

- commit 到 `feature/nyx-live2d`，commit message：`chore: add NYX live2d round 2 variants`
- 不能直接 push 就開 PR，目標分支設為 `feature/nyx-live2d`（不是 `main`）

### 表情

`face-eyes-closed.png`
```text
Close both eyes gently and naturally, as in a calm relaxed blink: upper eyelids fully lowered, eyelashes forming a soft downward-curved line. Eyebrows, mouth and all other facial features unchanged.
```

`face-smile.png`
```text
Give her a subtle, warm closed-mouth smile: the corners of the lips lift slightly and the cheeks lift very slightly. Elegant and restrained, not a grin. Eyes stay open and unchanged.
```

`face-mouth-open.png`
```text
Open her mouth slightly as if softly saying "ah" in the middle of a sentence: lips parted, a hint of the upper teeth visible, jaw lowered only a little. Eyes and eyebrows unchanged.
```

`face-playful.png`（可選）
```text
Give her a playful, teasing expression: eyebrows raised very slightly, eyes narrowed a little with a softer gaze, and a faint one-sided smirk. Sophisticated and subtle, not cartoonish. Head position unchanged.
```

### 手臂

注意左右：**她的右手在圖片的左邊**。

`arm-right-45.png`
```text
Change ONLY her right arm (the arm on the LEFT side of the image). Keep the upper arm close to its original position and bend the elbow so the forearm rises halfway, angled outward to her side: the hand is at waist height, slightly away from the body, palm open and facing the viewer, fingers relaxed. The whole arm and hand must stay in the picture plane (no foreshortening toward the viewer) and must not overlap the torso. Her left arm and everything else unchanged.
```

`arm-right-90.png`
```text
Change ONLY her right arm (the arm on the LEFT side of the image). Keep the upper arm close to its original position and bend the elbow so the forearm rises up and outward to her side: the hand is at chest height beside her body, palm open and facing the viewer as if lightly touching a floating holographic panel, fingers relaxed and slightly spread. The whole arm and hand must stay in the picture plane (no foreshortening toward the viewer) and must not overlap the torso or face. Her left arm and everything else unchanged.
```

`arm-left-45.png`
```text
Change ONLY her left arm (the arm on the RIGHT side of the image). Keep the upper arm close to its original position and bend the elbow so the forearm rises halfway, angled outward to her side: the hand is at waist height, slightly away from the body, palm open and facing the viewer, fingers relaxed. The whole arm and hand must stay in the picture plane (no foreshortening toward the viewer) and must not overlap the torso. Her right arm and everything else unchanged.
```

`arm-left-90.png`
```text
Change ONLY her left arm (the arm on the RIGHT side of the image). Keep the upper arm close to its original position and bend the elbow so the forearm rises up and outward to her side: the hand is at chest height beside her body, palm open and facing the viewer as if lightly touching a floating holographic panel, fingers relaxed and slightly spread. The whole arm and hand must stay in the picture plane (no foreshortening toward the viewer) and must not overlap the torso or face. Her right arm and everything else unchanged.
```

---

## 為什麼要這樣要求

| 要求 | 原因 |
|---|---|
| 必須附參考圖 | 只靠文字描述，生出來的角色長相會跑掉 |
| 純淺灰背景、無陰影 | 去背才會乾淨。上一版失敗的主因之一，就是深色衣服疊在深灰背景上分不開 |
| 手臂離開身體 | 手臂後面的身體才不用靠猜的補圖 |
| 手抬起來要在畫面平面內 | 朝鏡頭伸出的手在 2D 裡轉不動，一轉就像紙片 |
| 馬尾放背後、頭髮不蓋肩膀 | 頭髮前後層才拆得開，物理擺動才自然 |
| 變體都從 base 改、尺寸相同 | 表情和手臂要逐像素疊回底圖，差幾 px 就會看到接縫 |
| 手臂分 45° 和 90° 兩張 | 動作中途切換素材，大角度才不會像硬轉紙片 |
| 內建預設直式（941×1672） | 角色全身約 1550px 高，已經高於面板實際顯示大小（約 1200 device px） |
| 背景檢查放寬 | 淡陰影、輕微漸層我這邊去背處理得掉；真正會壞事的是深色背景和碰到身體的地面 |
| 禁止縮放補尺寸 | 放大過的圖細節是假的，拆圖層時會出問題 |
