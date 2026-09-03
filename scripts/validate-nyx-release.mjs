import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const fail = (message) => errors.push(message);

const read = (path) => readFileSync(resolve(root, path), 'utf8');
const app = read('src/ui/App.tsx');
const stage = read('src/ui/OperatorStage.tsx');
const renderer = read('src/ui/Nyx2DWebGL.tsx');
const attention = read('src/ui/nyx2dAttention.ts');
const motion = read('src/ui/nyx2dMotion.ts');
const articulation = read('src/ui/nyx2dArticulation.ts');
const articulationFrame = read('src/ui/nyx2dArticulationFrame.ts');
const articulationLayer = read('src/ui/nyx2dArticulationLayer.ts');
const geometry = read('src/ui/nyx2dGeometry.ts');
const calibration = read('src/ui/nyx2dUpperBodyCalibration.ts');
const tuning = read('src/ui/nyx2dTuning.ts');
const simulator = read('src/ui/OperatorSimulator.tsx');
const motionMatrix = read('src/ui/nyx2dMotionMatrix.test.ts');
const manifest = JSON.parse(read('src/ui/operator-manifest.json'));
const packageJson = JSON.parse(read('package.json'));
const checkScript = packageJson.scripts?.check ?? '';
const nyxQaLaunchers = [
  'scripts/dev-nyx2d-preview.mjs',
  'scripts/dev-nyx2d-gaze-off.mjs',
].map(read).join('\n');

const forbiddenNyx3DFiles = [
  'src/ui/NyxProductionWebGL.tsx',
  'scripts/dev-nyx3d-rollback.mjs',
  'scripts/build-nyx-production.mjs',
  'public/operator/nyx/nyx.glb',
  'public/operator/nyx/poster.webp',
];

const retiredWholeSpriteFiles = [
  'src/ui/nyx2dGesture.ts',
  'src/ui/nyx2dGesture.test.ts',
  'src/ui/nyx2dStatePose.ts',
  'src/ui/nyx2dStatePose.test.ts',
  'scripts/dev-nyx2d-gestures-off.mjs',
];

for (const path of forbiddenNyx3DFiles) {
  if (existsSync(resolve(root, path))) fail(`retired NYX 3D artifact must not exist: ${path}`);
}

for (const path of retiredWholeSpriteFiles) {
  if (existsSync(resolve(root, path))) fail(`retired whole-sprite NYX motion artifact must not exist: ${path}`);
}

for (const forbidden of ['NyxProductionWebGL', 'VITE_NYX_RENDERER', 'resolveNyxRenderer', 'legacy-rollback']) {
  if (stage.includes(forbidden)) fail(`OperatorStage must not contain retired NYX 3D token: ${forbidden}`);
}

for (const forbidden of ['data-nyx-entry-gesture', 'data-nyx-gesture-scale', 'data-nyx-stance-scale']) {
  if (stage.includes(forbidden)) fail(`OperatorStage must not expose retired whole-sprite motion token: ${forbidden}`);
}

if (!app.includes("import OperatorStage from './OperatorStage';")) {
  fail('App must statically import OperatorStage so the production operator stays mounted');
}
for (const forbidden of ["lazy(() => import('./OperatorStage'))", '<Suspense']) {
  if (app.includes(forbidden)) {
    fail(`App must not put the production operator behind a runtime suspense boundary: ${forbidden}`);
  }
}

if (nyxQaLaunchers.includes('VITE_NYX_RENDERER')) {
  fail('NYX QA launchers must not expose the retired VITE_NYX_RENDERER switch');
}

if (manifest.operators?.nyx) {
  fail('operator-manifest.json must not contain a NYX GLB/3D entry');
}

if (packageJson.scripts?.['operator:preview:3d']) {
  fail('package.json must not expose operator:preview:3d');
}

if (packageJson.scripts?.['operator:build:nyx']) {
  fail('package.json must not expose the retired NYX 3D build command');
}

if (packageJson.scripts?.['operator:preview:gestures-off']) {
  fail('package.json must not expose the retired whole-sprite gesture launcher');
}

if (!renderer.includes('createNyx2DArticulationLayer')) {
  fail('NYX production renderer must construct the articulated forearm layer');
}

if (!renderer.includes('createNyx2DArticulatedBodyTexture')) {
  fail('NYX production renderer must use the source-alpha forearm-free body composite');
}

if (!renderer.includes('nyx2DArticulationTransitionMs(articulationState, articulationFrom, articulationTo)')) {
  fail('NYX production renderer must derive articulation transition duration from actual current-to-target travel');
}

// Attention target remains a live shared signal. It must not become a renderer
// createEffect dependency, because that would call syncRuntime and restart the
// breathing/motion clock whenever the active provider changes.
const rendererEffect = renderer.match(/createEffect\(\(\) => \{([\s\S]*?)syncRuntime\?\.\(\);\n  \}\);/)?.[1] ?? '';
if (/attention/i.test(rendererEffect)) {
  fail('NYX provider attention must not restart the WebGL runtime lifecycle');
}

for (const required of [
  'NYX_2D_HEAD_ATTENTION_RESPONSE_MS = 280',
  'NYX_2D_BODY_ATTENTION_RESPONSE_MS = 720',
  'setNyx2DRuntimeAttentionTarget',
  'resetNyx2DRuntimeAttentionTarget',
  'nyx2DRuntimeAttentionRevision',
  'nyx2DRuntimeAttentionSideMix',
  'nyx2DRuntimeHeadAttentionBias',
  'nyx2DAttentionSide',
  'dampingAmount',
]) {
  if (!attention.includes(required)) {
    fail(`NYX continuous provider attention contract must preserve: ${required}`);
  }
}

for (const forbidden of [
  'NYX_2D_ATTENTION_TRANSITION_MS',
  'nyx2DRuntimeAttentionTransition',
]) {
  if (attention.includes(forbidden) || articulation.includes(forbidden)) {
    fail(`NYX provider attention must not restore the retired restartable transition: ${forbidden}`);
  }
}

for (const required of [
  'setNyx2DRuntimeAttentionTarget(attentionTarget())',
  'data-attention-target',
  'data-attention-override',
  'attentionOverride?: Nyx2DAttentionTarget | null',
]) {
  if (!stage.includes(required)) {
    fail(`OperatorStage must preserve live provider attention routing: ${required}`);
  }
}

for (const required of [
  'attentionValue',
  'onAttentionChange',
  'Simulated NYX attention target',
  "{ value: 'codex', label: 'CODEX' }",
  "{ value: 'claude', label: 'CLAUDE' }",
  "{ value: 'cursor', label: 'CURSOR' }",
]) {
  if (!simulator.includes(required)) {
    fail(`NYX diagnostic attention controls must preserve: ${required}`);
  }
}

if (!app.includes('operatorAttentionSimulation')) {
  fail('App must keep the NYX attention override isolated to diagnostic controls');
}

for (const required of [
  'coordinateNyx2DArticulation',
  'coordinateNyx2DArticulationBySide',
  'nyx2DRuntimeAttentionSideMix',
  "state === 'observing' || state === 'processing'",
  "state === 'warning'",
  "state === 'success' && side > 0",
]) {
  if (!articulation.includes(required)) {
    fail(`NYX articulation must preserve provider-coordinated semantic motion: ${required}`);
  }
}

if (!motion.includes('nyx2DRuntimeHeadAttentionBias')) {
  fail('NYX head motion must consume continuous provider attention damping');
}
for (const required of ['envelope.translateX', 'envelope.translateY', 'envelope.rotationDeg']) {
  if (!motion.includes(required)) {
    fail(`NYX provider-directed head motion must stay clamped to the existing safe envelope: ${required}`);
  }
}

for (const required of [
  'NYX state × provider motion regression matrix',
  "['center', 'codex', 'claude', 'cursor']",
  "['idle', 'offline']",
  "['observing', 'processing']",
  "nyx2DArticulationTarget('warning', target)",
  "nyx2DArticulationTarget('success', 'cursor')",
]) {
  if (!motionMatrix.includes(required)) {
    fail(`NYX state/provider regression matrix must preserve: ${required}`);
  }
}

for (const state of ['observing', 'processing', 'warning', 'success']) {
  if (!articulation.includes(`${state}: {`)) fail(`NYX articulation contract must define ${state}`);
}

for (const required of [
  'maxArmTravelDeg',
  'degreesPerSecond',
  'minMs',
  'maxMs',
  'publishNyx2DArticulationFrame',
  'progress / 0.92',
]) {
  if (!articulation.includes(required)) {
    fail(`NYX articulation timing/frame contract must preserve: ${required}`);
  }
}

for (const required of [
  'leftUpperArmWeights',
  'rightUpperArmWeights',
  'leftShoulderCapWeights',
  'rightShoulderCapWeights',
  'upperArmWeight',
  'shoulderCapWeight',
  'applyShoulderOffsetInto',
  'torsoUpperFollow',
  'torsoWeightShiftProfile',
  'torsoYawProfile',
  'LOWER_TORSO_COUNTER_SHIFT',
  'nyx2DTransformBodyPoint',
  'publishNyx2DArticulationAnchors',
  'PlaneGeometry(MASTER_ASPECT, 1, 24, 40)',
]) {
  if (!geometry.includes(required)) {
    fail(`NYX upper-body geometry must preserve shoulder/spine-weighted exact-anchor contract: ${required}`);
  }
}

if (geometry.includes('const shoulderFade = smoothstep01(sample.along / 0.12)')) {
  fail('NYX upper-body geometry must not pin the shoulder cap with the retired 0.21 shoulderFade');
}

for (const required of [
  'referenceLock',
  "sha256: '0ae82526d703049ebc1bf63c273dfd0f44a787134f24c3f0b7fc985ac19ed9df'",
  "sha256: '5d1add76b3a6355c493923fefa59e91d859e63756d64a37050426c8c87f8412c'",
  'shoulderCapRadiusPx: 64',
  'shoulderCapFeatherPx: 24',
  'shoulderLiftWorld: 0.006',
  'shoulderInwardWorld: 0.0022',
  'shoulderDeg: 7',
  'torsoYaw: 0.16',
  'torsoLeanDeg: 0.6',
]) {
  if (!calibration.includes(required)) {
    fail(`NYX upper-body calibration must preserve approved source lock / shoulder safety envelope: ${required}`);
  }
}

for (const required of [
  'nyx2DArticulationAnchors',
  'exact?.leftElbow',
  'exact?.rightElbow',
  'fallbackRotatedElbow',
]) {
  if (!articulationLayer.includes(required)) {
    fail(`NYX forearm anchors must consume exact body endpoints with initialization fallback: ${required}`);
  }
}

for (const required of [
  'publishNyx2DArticulationFrame',
  'publishNyx2DArticulationAnchors',
  'nyx2DArticulationAnchors',
]) {
  if (!articulationFrame.includes(required)) {
    fail(`NYX shared articulation frame must expose pose + exact anchor handoff: ${required}`);
  }
}

for (const forbidden of [
  'createUpperArmTexture',
  'buildUpperArm(',
  'upperArmCrop',
  'shoulderRepair',
]) {
  if (articulationLayer.includes(forbidden)) {
    fail(`NYX must not synthesize a new shoulder/upper-arm sprite path: ${forbidden}`);
  }
}

for (const forbidden of [
  'erasePolygon',
  'repairPolygon',
  'repairShiftX',
  'destination-out',
  'drawPolygon(',
]) {
  if (articulationLayer.includes(forbidden)) {
    fail(`NYX forearm masking must not restore hand-drawn/divergent erase logic: ${forbidden}`);
  }
}

for (const required of [
  'createForearmSourceMask',
  'source.data[offset + 3] === 0',
  'hardClearMask',
  'context.drawImage(mask, 0, 0)',
]) {
  if (!articulationLayer.includes(required)) {
    fail(`NYX forearm layer must preserve source-alpha single-mask contract: ${required}`);
  }
}

if (!tuning.includes('torso: 1')) {
  fail('NYX production tuning must enable the source-guided upper-body channel at 1x');
}

if (packageJson.scripts?.['operator:validate:release'] !== 'node scripts/validate-nyx-release.mjs') {
  fail('package.json must expose operator:validate:release');
}

if (!checkScript.includes('operator:validate:release')) {
  fail('bun run check must include operator:validate:release');
}

if (!checkScript.includes('operator:validate:2d')) {
  fail('bun run check must include the NYX 2D production asset validator');
}

if (/\bbun run operator:validate(?=\s*(?:&&|$))/.test(checkScript)) {
  fail('bun run check must not depend on legacy GLB validation');
}

if (errors.length) {
  console.error('NYX release validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('NYX release contract: persistent 2D operator with continuous provider-coordinated head/torso/arms, state-provider regression coverage, exact elbow anchors, and source-alpha forearms');
