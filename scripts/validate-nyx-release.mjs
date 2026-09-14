import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const fail = (message) => errors.push(message);
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const app = read('src/ui/App.tsx');
const stage = read('src/ui/OperatorStage.tsx');
const runtime = read('src/ui/NyxVrmRuntime.tsx');
const settings = read('src/settings/settings.ts');
const catalog = read('src/experiments/nyxVroidExperiment.ts');
const runtimeContract = read('src/experiments/vrmCharacterRuntime.ts');
const packageJson = JSON.parse(read('package.json'));
const checkScript = packageJson.scripts?.check ?? '';

const productionAssets = [
  'public/experiments/nyx-vroid/7699905036472295605.glb',
  'public/experiments/nyx-vroid/vrma/VRMA_01.vrma',
  'public/experiments/nyx-vroid/vrma/VRMA_02.vrma',
  'public/experiments/nyx-vroid/vrma/VRMA_03.vrma',
  'public/experiments/nyx-vroid/vrma/VRMA_04.vrma',
  'public/experiments/nyx-vroid/vrma/VRMA_05.vrma',
  'public/experiments/nyx-vroid/vrma/VRMA_06.vrma',
  'public/experiments/nyx-vroid/vrma/VRMA_07.vrma',
];

for (const path of productionAssets) {
  if (!existsSync(resolve(root, path))) fail(`required production NYX asset is missing: ${path}`);
}

for (const required of [
  "import NyxVrmRuntime from './NyxVrmRuntime';",
  '<NyxVrmRuntime',
  'data-nyx-renderer-tier="production"',
  'data-nyx-motion-catalog="allowlisted"',
  '<NyxRuntimeUnavailable />',
  '<NyxSpeechBubble',
]) {
  if (!stage.includes(required)) fail(`OperatorStage must retain production VRM contract: ${required}`);
}

for (const forbidden of ['Nyx2DManagedRuntime', 'Nyx2DPrototype', 'Nyx2DWebGL', 'Nyx2DFallback', 'OperatorWebGL', 'OperatorSimulator']) {
  if (stage.includes(forbidden)) fail(`OperatorStage must not retain a 2D NYX fallback: ${forbidden}`);
}

for (const required of [
  'VRMLoaderPlugin',
  'VRMAnimationLoaderPlugin',
  'createVRMAnimationClip',
  'sigBreathFrontBackAt',
  "setValue('relaxed', 0.7)",
  'hasSourceExpressionTracks(animation)',
  'document.hidden',
  'reducedMotion',
  'scheduleRandomAction',
  'nextRandomNyxMotion',
  'restoreRestPose',
  'captureModelPoseRest',
  "nyxProductionVrmMotionFor('modelPose')",
  'applyCharacterScale',
]) {
  if (!runtime.includes(required)) fail(`NYX VRM runtime is missing required lifecycle behavior: ${required}`);
}

for (const forbidden of ['Nyx2D', 'VITE_NYX_2D_PROFILE']) {
  if (runtime.includes(forbidden)) fail(`NYX VRM runtime must not use retired 2D production code: ${forbidden}`);
}

for (const required of [
  'nyxEventMotions',
  'nyxRandomActionsEnabled',
  'nyxRandomActionIntervalSeconds',
  'nyxCharacterScale',
  'isNyxRuntimeMotionId',
  'sanitizeNyxRandomActionInterval',
  'NYX_RUNTIME_EVENTS',
]) {
  if (!settings.includes(required)) fail(`Settings must persist and sanitize NYX motion configuration: ${required}`);
}

for (const required of [
  "availability: 'production'",
  "availability: 'local-development'",
  'nyxProductionVrmMotions',
  'isNyxRuntimeMotionId',
  "Animation credits to pixiv Inc.'s VRoid Project",
]) {
  if (!catalog.includes(required)) fail(`NYX motion catalog is missing production provenance: ${required}`);
}

if (!runtimeContract.includes("readonly availability: 'production' | 'local-development'")) {
  fail('VRM contract must keep production and local-development motion packs explicit');
}

if (app.includes('Nyx2DManagedRuntime') || app.includes('Nyx2DPrototype')) {
  fail('App must not restore a retired NYX 2D production import');
}
if (!app.includes('latestSessionCloseout') || !app.includes('emitNyxPresenceState')) {
  fail('App must deliver observed session closeouts to both NYX character surfaces');
}
if (catalog.includes('FDL_VRM_CHARACTER')) {
  fail('The removed FDL candidate must not return to the published NYX catalog');
}

if (!checkScript.includes('operator:validate:release')) {
  fail('bun run check must include operator:validate:release');
}
for (const retiredCheck of ['operator:verify:2d-master', 'operator:validate:face', 'operator:validate:2d']) {
  if (checkScript.includes(retiredCheck)) fail(`bun run check must not require retired 2D validation: ${retiredCheck}`);
}

if (errors.length) {
  console.error('NYX release validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('NYX release contract: persistent VRM production runtime, allowlisted VRMA catalog, Model pose rest stance with relaxed Sig Breath, and no 2D fallback');
