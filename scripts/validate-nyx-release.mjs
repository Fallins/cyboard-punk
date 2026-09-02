import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const fail = (message) => errors.push(message);

const read = (path) => readFileSync(resolve(root, path), 'utf8');
const stage = read('src/ui/OperatorStage.tsx');
const renderer = read('src/ui/Nyx2DWebGL.tsx');
const articulation = read('src/ui/nyx2dArticulation.ts');
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
  fail('NYX production renderer must construct the articulated arm layer');
}

if (!renderer.includes('createNyx2DArticulatedBodyTexture')) {
  fail('NYX production renderer must use the arm-free articulated body composite');
}

for (const state of ['observing', 'processing', 'warning', 'success']) {
  if (!articulation.includes(`${state}: {`)) fail(`NYX articulation contract must define ${state}`);
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

console.log('NYX release contract: production is articulated 2D-only; legacy 3D and whole-sprite semantic gestures remain retired');
