import { createHash } from 'node:crypto';
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
const settingsPanel = read('src/ui/SettingsPanel.tsx');
const catalog = read('src/experiments/nyxVroidExperiment.ts');
const runtimeContract = read('src/experiments/vrmCharacterRuntime.ts');
const packageJson = JSON.parse(read('package.json'));
const checkScript = packageJson.scripts?.check ?? '';

const shionVrmAsset = 'public/experiments/nyx-vroid/shion.vrm';
const shionVrmSha256 = '4bb88b2f246be13fb2ca904edb1d18c670bd5f1ebb8d5fc236699059b96d2b41';
const productionAssets = [
  shionVrmAsset,
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

if (existsSync(resolve(root, shionVrmAsset))) {
  const shionVrmBuffer = readFileSync(resolve(root, shionVrmAsset));
  const actualShionVrmSha256 = createHash('sha256').update(shionVrmBuffer).digest('hex');
  if (actualShionVrmSha256 !== shionVrmSha256) {
    fail(`Shion VRM SHA-256 does not match the approved production asset: ${actualShionVrmSha256}`);
  }
  if (shionVrmBuffer.toString('ascii', 0, 4) !== 'glTF') {
    fail('Shion production source is not a binary glTF container');
  } else {
    const jsonLength = shionVrmBuffer.readUInt32LE(12);
    const json = JSON.parse(
      shionVrmBuffer
        .subarray(20, 20 + jsonLength)
        .toString('utf8')
        .trim(),
    );
    const primitiveCount = (json.meshes ?? []).flatMap((mesh) => mesh.primitives ?? []).length;
    const triangleCount = (json.meshes ?? [])
      .flatMap((mesh) => mesh.primitives ?? [])
      .reduce((total, primitive) => {
        const accessor = typeof primitive.indices === 'number' ? json.accessors?.[primitive.indices] : null;
        return total + (accessor?.count ?? 0) / 3;
      }, 0);
    const maximumMorphCount = (json.meshes ?? [])
      .flatMap((mesh) => mesh.primitives ?? [])
      .reduce((maximum, primitive) => Math.max(maximum, primitive.targets?.length ?? 0), 0);
    const skinJointCounts = (json.skins ?? []).map((skin) => skin.joints?.length ?? 0);

    if (json.asset?.generator !== 'VRoid Studio-2.14.0') fail(`unexpected Shion generator: ${json.asset?.generator}`);
    if (!json.extensionsUsed?.includes('VRMC_vrm')) fail('Shion production source must expose VRMC_vrm');
    if ((json.animations ?? []).length !== 0) fail('Shion production source must not contain embedded animation clips');
    if (json.nodes?.length !== 183 || json.meshes?.length !== 3 || primitiveCount !== 16) {
      fail('Shion production source geometry topology does not match the reviewed VRM export');
    }
    if (json.materials?.length !== 16 || json.images?.length !== 25 || triangleCount !== 64_320) {
      fail('Shion production source material or triangle budget does not match the reviewed full-quality export');
    }
    if (!skinJointCounts.every((count) => count === 145) || skinJointCounts.length !== 3 || maximumMorphCount !== 57) {
      fail('Shion production source rig or morph capability does not match the reviewed export');
    }
  }
}

for (const required of [
  "import NyxVrmRuntime from './NyxVrmRuntime';",
  '<NyxVrmRuntime',
  'data-nyx-renderer-tier="production"',
  'data-nyx-motion-catalog="allowlisted"',
  '<NyxRuntimeUnavailable',
  '<NyxSpeechBubble',
]) {
  if (!stage.includes(required)) fail(`OperatorStage must retain production VRM contract: ${required}`);
}

for (const forbidden of [
  'Nyx2DManagedRuntime',
  'Nyx2DPrototype',
  'Nyx2DWebGL',
  'Nyx2DFallback',
  'OperatorWebGL',
  'OperatorSimulator',
]) {
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
  'Character actions',
  'NYX_RUNTIME_EVENTS',
  'NYX_REST_MOTION_ID',
  'nyxProductionVrmMotions',
  'isNyxRuntimeMotionId',
  'nyxRandomActionsEnabled',
  'nyxRandomActionIntervalSeconds',
  'nyxCharacterScale',
]) {
  if (!settingsPanel.includes(required)) fail(`Formal Settings must expose the production NYX control: ${required}`);
}

for (const required of [
  "id: 'shion-vroid-2-14-v1'",
  "label: 'Shion'",
  "labelZhTW: '紫苑'",
  "sourceRevision: 'VRoid Studio 2.14'",
  "assetPath: '/experiments/nyx-vroid/shion.vrm'",
  "sourceSha256: '4bb88b2f246be13fb2ca904edb1d18c670bd5f1ebb8d5fc236699059b96d2b41'",
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

console.log(
  'NYX release contract: persistent VRM production runtime, allowlisted VRMA catalog, Model pose rest stance with relaxed Sig Breath, and no 2D fallback',
);
