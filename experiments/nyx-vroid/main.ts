import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import {
  VRMAnimation,
  VRMAnimationLoaderPlugin,
  VRMLookAtQuaternionProxy,
  createVRMAnimationClip,
} from '@pixiv/three-vrm-animation';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import {
  EXPERIMENTAL_VRM_CHARACTERS,
  NYX_VROID_AMBIENT_DEFAULT,
  NYX_VROID_CHARACTER,
  NYX_RANDOM_ACTION_INTERVALS,
  NYX_REST_MOTION_ID,
  NYX_RUNTIME_EVENTS,
  experimentalVrmAvailableOutfits,
  experimentalVrmCharacterFor,
  experimentalVrmMotionFor,
  experimentalVrmOutfitFor,
  nyxLocalizedLabel,
  nyxProductionVrmMotions,
  nyxVroidMorphTargetFor,
  type NyxVroidExpression,
} from '../../src/experiments/nyxVroidExperiment';
import { SIG_BREATH_EXPERIMENT, sigBreathFrontBackAt } from '../../src/experiments/sigBreath';
import {
  assessExperimentalVrmCapability,
  type ExperimentalVrmMotion,
} from '../../src/experiments/vrmCharacterRuntime';
import {
  isNyxVrmExpressionId,
  registerNyxVrmCustomExpressions,
  type NyxVrmExpressionId,
} from '../../src/experiments/nyxVrmExpressions';
import { shouldKeepNyxRestPoseDuringMotionLoad } from '../../src/ui/nyxVrmMotion';
import { loadSettings, sanitizeSettings, saveSettings, type AppSettings, type NyxEventMotionMap } from '../../src/settings/settings';
import './style.css';

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`NYX VRoid experiment host is missing ${selector}`);
  return element;
}

const canvas = requiredElement<HTMLCanvasElement>('#nyx-vroid-canvas');
const status = requiredElement<HTMLElement>('#viewer-status');
const motionButtons = requiredElement<HTMLElement>('#motion-buttons');
const breathToggle = requiredElement<HTMLButtonElement>('#breath-toggle');
const characterTitle = requiredElement<HTMLElement>('#character-title');
const workbenchControls = requiredElement<HTMLElement>('#workbench-controls');
const selectedMotion = requiredElement<HTMLElement>('#selected-motion');
const replayMotionButton = requiredElement<HTMLButtonElement>('#replay-motion');
const stopMotionButton = requiredElement<HTMLButtonElement>('#stop-motion');
const searchParams = new URLSearchParams(window.location.search);
const loadedSettings = loadSettings();
const requestedLanguage = searchParams.get('lang');
const language = requestedLanguage === 'en' || requestedLanguage === 'zh-TW' ? requestedLanguage : loadedSettings.language;
const character = experimentalVrmCharacterFor(searchParams.get('character') ?? loadedSettings.nyxCharacterId);
let workbenchSettings = sanitizeSettings({ ...loadedSettings, nyxCharacterId: character.id });

const staticWorkbenchCopy = language === 'zh-TW'
  ? {
      stageEyebrow: 'CYBOARD · 角色舞台',
      subtitle: '在這裡調整角色視角，同步設定主舞台。',
      returnToCyboard: '回到 CYBOARD',
      workbench: '角色工作台',
      stagePreview: 'NYX GLB 互動預覽',
      interactivePreview: '可互動的 GLB 角色預覽',
      loadingModel: '正在載入原始 GLB…',
      currentPreview: '目前預覽',
      replay: '再播一次',
      restoreRest: '回復待機',
      viewControls: '視角控制',
      frontView: '正面',
      sideView: '側面',
      resetView: '回復視角',
      workbenchEyebrow: 'CYBOARD · 角色設定',
      workbenchHelp: '調整會立刻在左側舞台預覽，並儲存到 CYBOARD。',
      localPreview: '本機預覽',
      advancedControls: '動作庫與表情測試',
      modelControls: '角色預覽控制',
      expressions: '表情',
      neutral: '中性',
      happy: '開心',
      relaxed: '放鬆',
      surprised: '驚訝',
      blink: '眨眼',
      softSmile: '淺笑',
      warmGaze: '溫柔注視',
      bashful: '害羞',
      gentleSurprise: '微微驚訝',
      ambientBreathing: '環境呼吸',
      pauseBreathing: '暫停呼吸',
      startBreathing: '開始呼吸',
      motionLibrary: 'VRMA 動作庫',
      motionControls: 'VRMA 動作控制',
      assetNotes: '素材與授權說明',
      motionCredit: '動作來源：pixiv Inc. 的 VRoid Project。',
      wonderfulNote: 'Wonderful 動作包：只供本機實驗預覽，不會包入應用程式。',
      ambientCredit: '呼吸來源：Bekosan 的 Sig Breath Mod；Signiyamo 的 VRC_Breath_Animation（MIT）。',
      experimentTitle: '角色實驗',
    }
  : {
      stageEyebrow: 'CYBOARD · CHARACTER STAGE',
      subtitle: 'Orbit the character here while configuring the primary stage.',
      returnToCyboard: 'Return to CYBOARD',
      workbench: 'Character workbench',
      stagePreview: 'Interactive NYX GLB preview',
      interactivePreview: 'Interactive GLB model preview',
      loadingModel: 'Loading original GLB…',
      currentPreview: 'CURRENT PREVIEW',
      replay: 'Replay',
      restoreRest: 'Restore rest',
      viewControls: 'View controls',
      frontView: 'Front',
      sideView: 'Side',
      resetView: 'Reset view',
      workbenchEyebrow: 'CYBOARD · CHARACTER RIG',
      workbenchHelp: 'Changes are previewed on the stage at left and saved for CYBOARD.',
      localPreview: 'LOCAL PREVIEW',
      advancedControls: 'Action library and expression test',
      modelControls: 'Model preview controls',
      expressions: 'Expressions',
      neutral: 'Neutral',
      happy: 'Happy',
      relaxed: 'Relaxed',
      surprised: 'Surprised',
      blink: 'Blink',
      softSmile: 'Soft smile',
      warmGaze: 'Warm gaze',
      bashful: 'Bashful',
      gentleSurprise: 'Gentle surprise',
      ambientBreathing: 'Ambient breathing',
      pauseBreathing: 'Pause breathing',
      startBreathing: 'Start breathing',
      motionLibrary: 'VRMA motion library',
      motionControls: 'VRMA motion controls',
      assetNotes: 'Asset and license notes',
      motionCredit: 'Motion credit: Animation credits to pixiv Inc.\'s VRoid Project.',
      wonderfulNote: 'Wonderful set: local experimental copy only; never bundled.',
      ambientCredit: 'Ambient credit: Sig Breath Mod by Bekosan; VRC_Breath_Animation by Signiyamo (MIT).',
      experimentTitle: 'Character experiment',
    };

function applyStaticWorkbenchCopy() {
  document.documentElement.lang = language === 'zh-TW' ? 'zh-Hant-TW' : 'en';
  for (const element of document.querySelectorAll<HTMLElement>('[data-copy]')) {
    const key = element.dataset.copy as keyof typeof staticWorkbenchCopy | undefined;
    if (key) element.textContent = staticWorkbenchCopy[key];
  }
  for (const element of document.querySelectorAll<HTMLElement>('[data-aria-copy]')) {
    const key = element.dataset.ariaCopy as keyof typeof staticWorkbenchCopy | undefined;
    if (key) element.setAttribute('aria-label', staticWorkbenchCopy[key]);
  }
}

applyStaticWorkbenchCopy();
characterTitle.textContent = nyxLocalizedLabel(character, language);
document.title = `${nyxLocalizedLabel(character, language)} · ${staticWorkbenchCopy.experimentTitle}`;

const workbenchCopy = language === 'zh-TW'
  ? {
      character: '角色',
      characterHelp: '切換會重新載入此預覽與主舞台角色。',
      outfit: '服裝',
      outfitHelp: '僅能選取已驗證、與角色 mesh 相容的服裝變體。',
      idle: '預設待機姿勢',
      idleHelp: '目前使用模特定格的結尾姿勢與 Sig Breath；不會落回 A / T pose。',
      eventActions: '事件動作',
      eventHelp: '選擇後會立刻在此舞台試播，並同步儲存到主舞台。',
      random: '隨機動作',
      randomHelp: '事件動作優先；角色可見且允許動態效果時才播放。',
      interval: '隨機間隔',
      scale: '角色縮放',
      scaleHelp: '立即改變工作台與主舞台的角色比例。',
      localAssets: '本機素材狀態',
      localAssetsHelp: '外部素材不會被這個工作台自動複製或發佈。',
      unavailableOutfit: '需要原始 VRoid Studio 專案',
      staticPoses: '10 種姿勢：僅靜態 pose，禁止再配布；不納入應用程式 bundle。',
      standingIdle: '自然站立待機：完整 VRMA loop，待取得可用的本機資產流程後才能選用。',
      rest: '模特定格 + Sig Breath',
      replay: '再播一次',
      restoreRest: '回復待機',
      completed: '已播完；可按「再播一次」再次預覽。',
      saved: '已同步到主舞台',
      queued: '{motion} 會在角色載入完成後自動預覽。',
      loadingMotion: '正在載入 {motion}…',
      playingMotion: '正在播放 {motion}（{duration} 秒）。{face}',
      motionStopped: '已停止動作，恢復模特定格待機與環境呼吸。',
      modelLoading: 'VRM 角色尚未載入完成。',
      motionUnavailable: '{character} 缺少必要 humanoid 骨骼，無法播放 VRMA。',
      reducedMotion: '已啟用減少動態效果，無法播放動作。',
      stopFirst: '請先停止目前動作，再調整環境呼吸。',
      breathingStarted: '已開始依來源曲線播放環境呼吸。',
      breathingPaused: '已暫停環境呼吸。',
      previewUnavailable: 'VRMA 預覽不可用：{message}',
      modelUnavailable: 'GLB 預覽不可用：{message}',
      events: {
        idle: '待機',
        observing: '觀察中',
        processing: '處理中',
        warning: '警告',
        success: '成功',
        offline: '離線',
      },
    }
  : {
      character: 'Character',
      characterHelp: 'Changing this reloads the preview and primary-stage character.',
      outfit: 'Outfit',
      outfitHelp: 'Only reviewed outfit variations compatible with this character mesh can be selected.',
      idle: 'Default rest stance',
      idleHelp: 'Uses the Model pose end stance with Sig Breath; never falls back to an A or T pose.',
      eventActions: 'Event actions',
      eventHelp: 'A selection previews here immediately and is saved to the primary stage.',
      random: 'Random actions',
      randomHelp: 'Event actions win; playback runs only while the character is visible and motion is allowed.',
      interval: 'Random interval',
      scale: 'Character scale',
      scaleHelp: 'Immediately changes character size in this workbench and the primary stage.',
      localAssets: 'Local asset status',
      localAssetsHelp: 'The workbench never automatically copies or publishes external assets.',
      unavailableOutfit: 'Original VRoid Studio project required',
      staticPoses: '10 poses: static poses only and no redistribution; they are not bundled with the app.',
      standingIdle: 'Natural standing idle: a full VRMA loop that awaits a supported local-asset flow before it can be selected.',
      rest: 'Model pose + Sig Breath',
      replay: 'Replay',
      restoreRest: 'Restore rest',
      completed: 'Completed. Use Replay to preview it again.',
      saved: 'Saved to primary stage',
      queued: '{motion} will preview as soon as the character has loaded.',
      loadingMotion: 'Loading {motion}…',
      playingMotion: 'Playing {motion} ({duration}s). {face}',
      motionStopped: 'Motion stopped; the Model pose rest stance and ambient breathing were restored.',
      modelLoading: 'The VRM model has not finished loading.',
      motionUnavailable: '{character} is missing a required humanoid bone, so VRMA playback is unavailable.',
      reducedMotion: 'Motion playback is disabled because reduced motion is enabled.',
      stopFirst: 'Stop the active motion before changing ambient breathing.',
      breathingStarted: 'Source-derived Sig Breath ambient playback started.',
      breathingPaused: 'Ambient breathing paused.',
      previewUnavailable: 'VRMA preview unavailable: {message}',
      modelUnavailable: 'GLB preview unavailable: {message}',
      events: {
        idle: 'Idle',
        observing: 'Observing',
        processing: 'Processing',
        warning: 'Warning',
        success: 'Success',
        offline: 'Offline',
      },
    };

function formatWorkbenchCopy(template: string, variables: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => String(variables[key] ?? `{${key}}`));
}

function saveWorkbenchSettings(next: AppSettings) {
  workbenchSettings = sanitizeSettings(next);
  saveSettings(workbenchSettings);
}

function appendWorkbenchField(
  parent: HTMLElement,
  label: string,
  help: string,
  control: HTMLElement,
) {
  const field = document.createElement('label');
  field.className = 'workbench-field';
  const copy = document.createElement('span');
  const title = document.createElement('strong');
  title.textContent = label;
  const description = document.createElement('small');
  description.textContent = help;
  copy.append(title, description);
  field.append(copy, control);
  parent.append(field);
}

function option(value: string, label: string, selected = false): HTMLOptionElement {
  const element = document.createElement('option');
  element.value = value;
  element.textContent = label;
  element.selected = selected;
  return element;
}

function workbenchSection(title: string): HTMLElement {
  const section = document.createElement('section');
  section.className = 'workbench-section';
  const heading = document.createElement('h3');
  heading.textContent = title;
  section.append(heading);
  workbenchControls.append(section);
  return section;
}

function renderCharacterWorkbench() {
  workbenchControls.replaceChildren();
  const selectedCharacter = experimentalVrmCharacterFor(character.id);
  const appearance = workbenchSection(workbenchCopy.character);
  const characterSelect = document.createElement('select');
  characterSelect.setAttribute('aria-label', workbenchCopy.character);
  for (const candidate of EXPERIMENTAL_VRM_CHARACTERS) {
    characterSelect.append(option(candidate.id, nyxLocalizedLabel(candidate, language), candidate.id === selectedCharacter.id));
  }
  characterSelect.addEventListener('change', () => {
    const nextCharacter = experimentalVrmCharacterFor(characterSelect.value);
    saveWorkbenchSettings({
      ...workbenchSettings,
      nyxCharacterId: nextCharacter.id,
      nyxOutfitId: nextCharacter.defaultOutfitId,
    });
    const nextQuery = new URLSearchParams(window.location.search);
    nextQuery.set('character', nextCharacter.id);
    nextQuery.set('lang', language);
    window.location.search = nextQuery.toString();
  });
  appendWorkbenchField(appearance, workbenchCopy.character, workbenchCopy.characterHelp, characterSelect);

  const outfitSelect = document.createElement('select');
  const selectedOutfit = experimentalVrmOutfitFor(selectedCharacter, workbenchSettings.nyxOutfitId);
  for (const outfit of experimentalVrmAvailableOutfits(selectedCharacter)) {
    outfitSelect.append(option(outfit.id, nyxLocalizedLabel(outfit, language), outfit.id === selectedOutfit.id));
  }
  outfitSelect.addEventListener('change', () => {
    saveWorkbenchSettings({ ...workbenchSettings, nyxOutfitId: outfitSelect.value });
  });
  appendWorkbenchField(appearance, workbenchCopy.outfit, workbenchCopy.outfitHelp, outfitSelect);

  for (const outfit of selectedCharacter.outfits.filter((candidate) => candidate.availability !== 'available')) {
    const note = document.createElement('a');
    note.className = 'workbench-compatibility-note';
    note.href = outfit.sourceUrl ?? '#';
    note.target = '_blank';
    note.rel = 'noreferrer';
    note.textContent = `${nyxLocalizedLabel(outfit, language)} · ${workbenchCopy.unavailableOutfit}`;
    appearance.append(note);
  }

  const behaviour = workbenchSection(workbenchCopy.eventActions);
  const idleSelect = document.createElement('select');
  idleSelect.disabled = true;
  idleSelect.append(option(NYX_REST_MOTION_ID, workbenchCopy.rest, true));
  appendWorkbenchField(behaviour, workbenchCopy.idle, workbenchCopy.idleHelp, idleSelect);

  for (const event of NYX_RUNTIME_EVENTS) {
    const actionSelect = document.createElement('select');
    actionSelect.setAttribute('aria-label', `${workbenchCopy.events[event]} ${workbenchCopy.eventActions}`);
    actionSelect.append(option(NYX_REST_MOTION_ID, workbenchCopy.rest, workbenchSettings.nyxEventMotions[event] === NYX_REST_MOTION_ID));
    for (const motion of nyxProductionVrmMotions()) {
      actionSelect.append(option(motion.id, nyxLocalizedLabel(motion, language), workbenchSettings.nyxEventMotions[event] === motion.id));
    }
    actionSelect.addEventListener('change', () => {
      const eventMotions: NyxEventMotionMap = { ...workbenchSettings.nyxEventMotions, [event]: actionSelect.value as NyxEventMotionMap[typeof event] };
      saveWorkbenchSettings({ ...workbenchSettings, nyxEventMotions: eventMotions });
      void previewSelectedMotion(actionSelect.value).catch((error: unknown) => {
        status.textContent = error instanceof Error ? error.message : String(error);
      });
    });
    appendWorkbenchField(behaviour, workbenchCopy.events[event], workbenchCopy.eventHelp, actionSelect);
  }

  const randomEnabled = document.createElement('input');
  randomEnabled.type = 'checkbox';
  randomEnabled.checked = workbenchSettings.nyxRandomActionsEnabled;
  randomEnabled.setAttribute('aria-label', workbenchCopy.random);
  randomEnabled.addEventListener('change', () => {
    saveWorkbenchSettings({ ...workbenchSettings, nyxRandomActionsEnabled: randomEnabled.checked });
  });
  appendWorkbenchField(behaviour, workbenchCopy.random, workbenchCopy.randomHelp, randomEnabled);

  const interval = document.createElement('select');
  interval.disabled = !workbenchSettings.nyxRandomActionsEnabled;
  for (const seconds of NYX_RANDOM_ACTION_INTERVALS) {
    interval.append(option(String(seconds), `${seconds} ${language === 'zh-TW' ? '秒' : 'sec'}`, workbenchSettings.nyxRandomActionIntervalSeconds === seconds));
  }
  interval.addEventListener('change', () => {
    saveWorkbenchSettings({ ...workbenchSettings, nyxRandomActionIntervalSeconds: Number(interval.value) as AppSettings['nyxRandomActionIntervalSeconds'] });
  });
  appendWorkbenchField(behaviour, workbenchCopy.interval, workbenchCopy.randomHelp, interval);

  const scale = document.createElement('select');
  for (const value of [0.8, 0.9, 1, 1.15, 1.3]) {
    scale.append(option(String(value), `${Math.round(value * 100)}%`, workbenchSettings.nyxCharacterScale === value));
  }
  scale.addEventListener('change', () => {
    saveWorkbenchSettings({ ...workbenchSettings, nyxCharacterScale: Number(scale.value) });
    applyCharacterScale();
  });
  appendWorkbenchField(behaviour, workbenchCopy.scale, workbenchCopy.scaleHelp, scale);

}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = false;
controls.minDistance = 0.8;
controls.maxDistance = 8;

scene.add(new THREE.HemisphereLight(0xd8f6ff, 0x130a26, 2.25));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(2, 3, 4);
const rimLight = new THREE.PointLight(0x8b5cff, 7, 8, 2);
rimLight.position.set(-2, 1.25, -0.5);
scene.add(keyLight, rimLight);

const ground = new THREE.GridHelper(2.5, 10, 0x20f6ff, 0x28345a);
ground.position.y = 0;
scene.add(ground, new THREE.AxesHelper(0.25));

let root: THREE.Group | null = null;
let vrm: VRM | null = null;
let mixer: THREE.AnimationMixer | null = null;
let currentAction: THREE.AnimationAction | null = null;
let currentMotionLabel: string | null = null;
let animationFrame: number | null = null;
let previousAnimationFrame = 0;
let isPlayingMotion = false;
let isBreathing = false;
let characterMotionReady = false;
let motionRequest = 0;
let selectedPreviewMotionId: string = NYX_REST_MOTION_ID;
let queuedPreviewMotionId: string | null = null;
let breathStartedAt = 0;
let focus = new THREE.Vector3(0, 0.82, 0);
let modelSize = new THREE.Vector3(1.4, 1.64, 0.32);
let rawModelMinY = 0;
let modelPoseRest: Array<{ node: THREE.Object3D; position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 }> = [];
const morphMeshes: THREE.Mesh[] = [];
const breathAxis = new THREE.Vector3(1, 0, 0);
const breathDelta = new THREE.Quaternion();
const breathBones: Array<{ node: THREE.Object3D; restRotation: THREE.Quaternion; multiplier: number }> = [];

const BREATH_BONE_DEFINITIONS = [
  { name: 'spine', multiplier: 0.65 },
  { name: 'chest', multiplier: 1 },
  { name: 'upperChest', multiplier: 1.2 },
] as const;

function render() {
  renderer.render(scene, camera);
}

function stopAnimationLoop() {
  if (animationFrame === null) return;
  window.cancelAnimationFrame(animationFrame);
  animationFrame = null;
}

function renderAnimationFrame(timestamp: number) {
  animationFrame = window.requestAnimationFrame(renderAnimationFrame);
  if (document.hidden) return;

  const delta = Math.min((timestamp - previousAnimationFrame) / 1000, 0.1);
  previousAnimationFrame = timestamp;
  if (isBreathing && !isPlayingMotion) updateBreathing(timestamp);
  mixer?.update(delta);
  vrm?.update(delta);
  render();
}

function startAnimationLoop() {
  if (animationFrame !== null || (!isPlayingMotion && !isBreathing) || document.hidden) return;
  previousAnimationFrame = performance.now();
  animationFrame = window.requestAnimationFrame(renderAnimationFrame);
}

function resize() {
  const { clientWidth, clientHeight } = canvas;
  const width = Math.max(1, clientWidth);
  const height = Math.max(1, clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  render();
}

function frameModel(view: 'front' | 'side' | 'reset') {
  const direction = view === 'side' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  const verticalFovRadians = THREE.MathUtils.degToRad(camera.fov);
  const verticalDistance = modelSize.y / (2 * Math.tan(verticalFovRadians / 2));
  const horizontalDistance = modelSize.x / (2 * Math.tan(verticalFovRadians / 2) * camera.aspect);
  const distance = Math.max(verticalDistance, horizontalDistance, 1.2) * 1.12;
  camera.position.copy(focus).addScaledVector(direction, distance);
  controls.target.copy(focus);
  controls.update();
  render();
}

function applyCharacterScale() {
  if (!root) return;
  const scale = workbenchSettings.nyxCharacterScale;
  root.scale.setScalar(scale);
  root.position.y = -rawModelMinY * scale;
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) return;
  focus = bounds.getCenter(new THREE.Vector3());
  modelSize = bounds.getSize(new THREE.Vector3());
  frameModel('reset');
}

function resetMorphs() {
  for (const mesh of morphMeshes) {
    if (!mesh.morphTargetInfluences) continue;
    mesh.morphTargetInfluences.fill(0);
  }
}

function resetExpressions() {
  vrm?.expressionManager?.resetValues();
  resetMorphs();
}

function applyVrmExpressionValue(expression: NyxVrmExpressionId, intensity = 1): string {
  resetExpressions();
  const expressionPreset = vrm?.expressionManager?.getExpression(expression);
  if (expressionPreset) {
    vrm?.expressionManager?.setValue(expression, intensity);
    vrm?.update(0);
    return `VRM ${expression} expression at ${Math.round(intensity * 100)}%`;
  }

  vrm?.update(0);
  return `no source VRM ${expression} expression`;
}

type NyxPreviewExpression = NyxVroidExpression | NyxVrmExpressionId;

function applyExpressionValue(expression: NyxPreviewExpression, intensity = 1): string {
  if (expression !== 'mouthLarge') return applyVrmExpressionValue(expression, intensity);
  if (character.id !== NYX_VROID_CHARACTER.id) return 'source-specific mouthLarge control is unavailable for this character';

  const target = nyxVroidMorphTargetFor(expression);
  resetExpressions();

  let matched = 0;
  for (const mesh of morphMeshes) {
    const index = mesh.morphTargetDictionary?.[target];
    if (index === undefined || !mesh.morphTargetInfluences) continue;
    mesh.morphTargetInfluences[index] = 1;
    matched += 1;
  }
  vrm?.update(0);
  return matched > 0
    ? `raw ${target} across ${matched} source mesh part${matched === 1 ? '' : 's'}`
    : `no runtime expression named ${target}`;
}

function applyExpression(expression: NyxPreviewExpression) {
  applyExpressionValue(expression);
  status.textContent = language === 'zh-TW' ? '已套用表情。' : 'Expression applied.';
  render();
}

function faceCueFor(motion: ExperimentalVrmMotion, animation: VRMAnimation): string {
  const sourceTrackCount = animation.expressionTracks.preset.size + animation.expressionTracks.custom.size;
  if (sourceTrackCount > 0) {
    resetExpressions();
    vrm?.update(0);
    return language === 'zh-TW'
      ? `使用 ${sourceTrackCount} 個來源表情軌道`
      : `using ${sourceTrackCount} source facial track${sourceTrackCount === 1 ? '' : 's'}`;
  }

  const face = 'face' in motion ? motion.face : undefined;
  if (!face) {
    resetExpressions();
    vrm?.update(0);
    return language === 'zh-TW' ? '使用來源中性表情' : 'source-neutral face';
  }

  applyVrmExpressionValue(face.expression, face.intensity);
  return language === 'zh-TW' ? '已套用建議表情' : 'curated expression cue applied';
}

function discardCurrentAction() {
  if (!currentAction) return;
  const action = currentAction;
  action.stop();
  if (vrm) mixer?.uncacheAction(action.getClip(), vrm.scene);
  currentAction = null;
  currentMotionLabel = null;
}

function ensureMixer(loadedVrm: VRM): THREE.AnimationMixer {
  if (mixer) return mixer;
  mixer = new THREE.AnimationMixer(loadedVrm.scene);
  mixer.addEventListener('finished', (event) => {
    if (event.action !== currentAction) return;
    isPlayingMotion = false;
    stopAnimationLoop();
    status.textContent = `${currentMotionLabel ?? 'Motion'} ${workbenchCopy.completed}`;
    render();
  });
  return mixer;
}

function restoreModelPoseRest() {
  if (!vrm || modelPoseRest.length === 0) return;
  vrm.humanoid.autoUpdateHumanBones = false;
  for (const pose of modelPoseRest) {
    pose.node.position.copy(pose.position);
    pose.node.quaternion.copy(pose.quaternion);
    pose.node.scale.copy(pose.scale);
  }
}

async function captureModelPoseRest() {
  if (!vrm) return;
  const motion = experimentalVrmMotionFor(character, 'modelPose');
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
  const gltf = await loader.loadAsync(motion.assetPath);
  if (!vrm) return;
  const animation = firstVRMAnimation(gltf.userData.vrmAnimations);
  if (!animation) throw new Error('Model pose VRMA did not expose a VRMC_vrm_animation track');

  const poseMixer = ensureMixer(vrm);
  const clip = createVRMAnimationClip(animation, vrm);
  const action = poseMixer.clipAction(clip);
  vrm.humanoid.autoUpdateHumanBones = true;
  action.reset();
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  poseMixer.update(clip.duration);
  vrm.update(0);
  modelPoseRest = Object.values(vrm.humanoid.rawHumanBones)
    .filter((bone): bone is NonNullable<typeof bone> => bone != null)
    .map(({ node }) => ({
      node,
      position: node.position.clone(),
      quaternion: node.quaternion.clone(),
      scale: node.scale.clone(),
    }));
  action.stop();
  poseMixer.uncacheAction(clip, vrm.scene);
  restoreModelPoseRest();
}

function stopMotion() {
  motionRequest += 1;
  isPlayingMotion = false;
  discardCurrentAction();
  mixer?.stopAllAction();
  restoreModelPoseRest();
  const defaultFace = applyVrmExpressionValue(
    NYX_VROID_AMBIENT_DEFAULT.expression,
    NYX_VROID_AMBIENT_DEFAULT.intensity,
  );
  setBreathing(true);
  void defaultFace;
  status.textContent = workbenchCopy.motionStopped;
  render();
}

function previewLabel(id: string): string {
  return id === NYX_REST_MOTION_ID
    ? workbenchCopy.rest
    : nyxLocalizedLabel(experimentalVrmMotionFor(character, id), language);
}

function syncSelectedPreviewMotion(id: string) {
  selectedPreviewMotionId = id;
  selectedMotion.textContent = previewLabel(id);
  replayMotionButton.disabled = id === NYX_REST_MOTION_ID;
}

async function previewSelectedMotion(id: string) {
  syncSelectedPreviewMotion(id);
  if (id === NYX_REST_MOTION_ID) {
    queuedPreviewMotionId = null;
    stopMotion();
    return;
  }

  if (!vrm) {
    queuedPreviewMotionId = id;
    status.textContent = formatWorkbenchCopy(workbenchCopy.queued, { motion: previewLabel(id) });
    return;
  }

  queuedPreviewMotionId = null;
  await playMotion(id);
}

function resetBreathingPose() {
  for (const breathBone of breathBones) {
    breathBone.node.quaternion.copy(breathBone.restRotation);
  }
}

function updateBreathing(timestamp: number) {
  const elapsedSeconds = (timestamp - breathStartedAt) / 1000;
  const sourceValue = sigBreathFrontBackAt(elapsedSeconds);
  for (const breathBone of breathBones) {
    const angleRadians = sourceValue * THREE.MathUtils.degToRad(28) * breathBone.multiplier;
    breathBone.node.quaternion.copy(breathBone.restRotation);
    breathBone.node.quaternion.multiply(breathDelta.setFromAxisAngle(breathAxis, angleRadians));
  }
}

function setBreathing(shouldEnable: boolean) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  isBreathing = shouldEnable && !reducedMotion && breathBones.length > 0;
  breathToggle.textContent = isBreathing ? staticWorkbenchCopy.pauseBreathing : staticWorkbenchCopy.startBreathing;

  if (!isBreathing) {
    resetBreathingPose();
    if (!isPlayingMotion) stopAnimationLoop();
    return;
  }

  if (vrm) vrm.humanoid.autoUpdateHumanBones = false;
  resetBreathingPose();
  breathStartedAt = performance.now();
  updateBreathing(breathStartedAt);
  startAnimationLoop();
}

function prepareBreathing(loadedVrm: VRM) {
  breathBones.length = 0;
  for (const definition of BREATH_BONE_DEFINITIONS) {
    const node = loadedVrm.humanoid.getRawBoneNode(definition.name);
    if (!node) continue;
    breathBones.push({
      node,
      restRotation: node.quaternion.clone(),
      multiplier: definition.multiplier,
    });
  }
}

function isVRM(value: unknown): value is VRM {
  return value instanceof VRM;
}

function firstVRMAnimation(value: unknown): VRMAnimation | null {
  if (!Array.isArray(value)) return null;
  const [animation] = value;
  return animation instanceof VRMAnimation ? animation : null;
}

function installLookAtProxy(loadedVrm: VRM) {
  if (!loadedVrm.lookAt) return;
  const proxy = new VRMLookAtQuaternionProxy(loadedVrm.lookAt);
  proxy.name = 'VRMLookAtQuaternionProxy';
  loadedVrm.scene.add(proxy);
}

async function playMotion(id: string) {
  if (!vrm) {
    status.textContent = workbenchCopy.modelLoading;
    return;
  }

  if (!characterMotionReady) {
    status.textContent = formatWorkbenchCopy(workbenchCopy.motionUnavailable, {
      character: nyxLocalizedLabel(character, language),
    });
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    status.textContent = workbenchCopy.reducedMotion;
    return;
  }

  const request = ++motionRequest;
  const motion = experimentalVrmMotionFor(character, id);
  setBreathing(false);
  isPlayingMotion = false;
  discardCurrentAction();
  if (shouldKeepNyxRestPoseDuringMotionLoad(false)) vrm.humanoid.autoUpdateHumanBones = false;
  status.textContent = formatWorkbenchCopy(workbenchCopy.loadingMotion, { motion: nyxLocalizedLabel(motion, language) });

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
  const gltf = await loader.loadAsync(motion.assetPath);
  if (request !== motionRequest || !vrm) return;

  const animation = firstVRMAnimation(gltf.userData.vrmAnimations);
  if (!animation) throw new Error(`${nyxLocalizedLabel(motion, language)} did not expose a VRMC_vrm_animation track`);

  const faceCue = faceCueFor(motion, animation);
  const clip = createVRMAnimationClip(animation, vrm);
  const action = ensureMixer(vrm).clipAction(clip);
  vrm.humanoid.autoUpdateHumanBones = true;
  action.reset();
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  mixer?.update(0);
  vrm.update(0);
  currentAction = action;
  currentMotionLabel = nyxLocalizedLabel(motion, language);
  isPlayingMotion = true;
  startAnimationLoop();
  status.textContent = formatWorkbenchCopy(workbenchCopy.playingMotion, {
    motion: nyxLocalizedLabel(motion, language),
    duration: clip.duration.toFixed(2),
    face: faceCue,
  });
}

function collectMorphMeshes(loadedRoot: THREE.Group) {
  loadedRoot.traverse((object) => {
    if (object instanceof THREE.Mesh && object.morphTargetDictionary && object.morphTargetInfluences) {
      morphMeshes.push(object);
    }
  });
}

async function loadExperiment() {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync(character.assetPath);
  if (!isVRM(gltf.userData.vrm)) throw new Error('GLB did not expose VRM runtime metadata');
  vrm = gltf.userData.vrm;
  if (character.vrmVersion === '0.x') VRMUtils.rotateVRM0(vrm);
  if (character.faceForward === '-Z') vrm.scene.rotation.y += Math.PI;
  const capability = assessExperimentalVrmCapability({
    hasRawBone: (bone) => vrm?.humanoid.getRawBoneNode(bone as never) != null,
    hasExpression: (expression) => vrm?.expressionManager?.getExpression(expression) != null,
  });
  if (!capability.animationReady) {
    throw new Error(`${character.label} is missing required humanoid bones: ${capability.missingHumanoidBones.join(', ')}`);
  }
  characterMotionReady = true;
  registerNyxVrmCustomExpressions(vrm);
  installLookAtProxy(vrm);
  root = vrm.scene;
  root.name = `${character.id}-experiment`;
  scene.add(root);
  await captureModelPoseRest();
  if (modelPoseRest.length === 0) throw new Error('Model pose rest stance could not be captured');
  prepareBreathing(vrm);
  root.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) throw new Error('GLB loaded without a finite renderable bounding box');
  rawModelMinY = bounds.min.y;
  applyCharacterScale();
  collectMorphMeshes(root);

  vrm.update(0);
  const defaultFace = applyVrmExpressionValue(
    NYX_VROID_AMBIENT_DEFAULT.expression,
    NYX_VROID_AMBIENT_DEFAULT.intensity,
  );
  setBreathing(NYX_VROID_AMBIENT_DEFAULT.sigBreathEnabled);
  const motionCount = character.motionPacks.reduce((total, motionPack) => total + motionPack.motions.length, 0);
  void defaultFace;
  status.textContent = language === 'zh-TW'
    ? `已載入 ${nyxLocalizedLabel(character, language)}：${motionCount} 個 VRMA 動作可用，環境呼吸已啟用。`
    : `Loaded ${nyxLocalizedLabel(character, language)}: ${motionCount} VRMA motions ready and ambient breathing active.`;

  if (queuedPreviewMotionId) {
    const queuedMotionId = queuedPreviewMotionId;
    queuedPreviewMotionId = null;
    await playMotion(queuedMotionId);
  }
}

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-camera]')) {
  button.addEventListener('click', () => {
    const view = button.dataset.camera;
    if (view === 'front' || view === 'side' || view === 'reset') frameModel(view);
  });
}

renderCharacterWorkbench();
syncSelectedPreviewMotion(NYX_REST_MOTION_ID);

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-expression]')) {
  button.addEventListener('click', () => {
    const expression = button.dataset.expression;
    if (expression === 'mouthLarge' || (expression && isNyxVrmExpressionId(expression))) {
      applyExpression(expression);
    }
  });
}

breathToggle.addEventListener('click', () => {
  if (isPlayingMotion) {
    status.textContent = workbenchCopy.stopFirst;
    return;
  }
  setBreathing(!isBreathing);
  status.textContent = isBreathing
    ? workbenchCopy.breathingStarted
    : workbenchCopy.breathingPaused;
  render();
});

for (const motionPack of character.motionPacks) {
  const motionPackGroup = document.createElement('section');
  motionPackGroup.className = 'motion-pack';

  const motionPackLabel = document.createElement('h3');
  motionPackLabel.textContent = nyxLocalizedLabel(motionPack, language);
  motionPackGroup.append(motionPackLabel);

  const motionPackRow = document.createElement('div');
  motionPackRow.className = 'button-row';
  for (const motion of motionPack.motions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.motion = motion.id;
    button.textContent = nyxLocalizedLabel(motion, language);
    button.addEventListener('click', () => {
      void previewSelectedMotion(motion.id).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        status.textContent = formatWorkbenchCopy(workbenchCopy.previewUnavailable, { message });
      });
    });
    motionPackRow.append(button);
  }
  motionPackGroup.append(motionPackRow);
  motionButtons.append(motionPackGroup);
}

replayMotionButton.textContent = workbenchCopy.replay;
stopMotionButton.textContent = workbenchCopy.restoreRest;
replayMotionButton.addEventListener('click', () => {
  void previewSelectedMotion(selectedPreviewMotionId).catch((error: unknown) => {
    status.textContent = error instanceof Error ? error.message : String(error);
  });
});
stopMotionButton.addEventListener('click', () => {
  syncSelectedPreviewMotion(NYX_REST_MOTION_ID);
  stopMotion();
});

controls.addEventListener('change', render);
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopAnimationLoop();
    return;
  }
  startAnimationLoop();
});
window.addEventListener('pagehide', () => {
  stopAnimationLoop();
  controls.dispose();
  renderer.dispose();
});

resize();
void (async () => {
  try {
    await loadExperiment();
    const requestedMotion = new URLSearchParams(window.location.search).get('motion');
    if (requestedMotion) await previewSelectedMotion(requestedMotion);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    status.textContent = formatWorkbenchCopy(workbenchCopy.modelUnavailable, { message });
  }
})();
