import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const fail = (message) => errors.push(message);

const read = (path) => readFileSync(resolve(root, path), 'utf8');
const stage = read('src/ui/OperatorStage.tsx');
const rollback = read('scripts/dev-nyx3d-rollback.mjs');
const packageJson = JSON.parse(read('package.json'));
const checkScript = packageJson.scripts?.check ?? '';

if (/import\s+NyxProductionWebGL\s+from\s+['"]\.\/NyxProductionWebGL['"]/.test(stage)) {
  fail('legacy NyxProductionWebGL must not be eagerly imported by OperatorStage');
}

if (!stage.includes("lazy(() => import('./NyxProductionWebGL'))")) {
  fail('legacy NyxProductionWebGL must remain behind a Solid lazy dynamic import');
}

if (!stage.includes("return value?.trim().toLowerCase() === '3d' ? '3d' : '2d';")) {
  fail('NYX renderer resolution must keep 2D as the default and 3D as explicit opt-in');
}

if (!stage.includes("renderer === '3d' ? 'legacy-rollback' : 'production'")) {
  fail('NYX renderer release tier must label 3D as legacy-rollback');
}

if (!stage.includes('fallback={usingNyx2D() ? <Nyx2DFallback /> : <StaticOperatorFallback mode={props.mode} />}')) {
  fail('NYX 2D renderer failure must fall back to the canonical 2D/static path, never legacy 3D');
}

if (!rollback.includes("VITE_NYX_RENDERER: '3d'")) {
  fail('legacy 3D rollback launcher must explicitly opt into VITE_NYX_RENDERER=3d');
}

if (packageJson.scripts?.['operator:preview:3d'] !== 'node scripts/dev-nyx3d-rollback.mjs') {
  fail('package.json must retain the explicit operator:preview:3d emergency rollback command');
}

if (packageJson.scripts?.['operator:validate:legacy'] !== 'node scripts/validate-operator-assets.mjs') {
  fail('legacy GLB validation must remain available as operator:validate:legacy');
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
  fail('bun run check must not depend on legacy GLB validation; use operator:validate:legacy separately');
}

if (errors.length) {
  console.error('NYX release validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('NYX release contract: 2D production validation isolated from static fallback and lazy legacy 3D rollback');
