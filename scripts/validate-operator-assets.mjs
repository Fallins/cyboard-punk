import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const manifestPath = path.join(root, 'public/operator/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const requiredClips = ['idle', 'observing', 'processing', 'warning', 'success', 'offline'];
let failures = 0;

function localPath(publicPath) {
  return path.join(root, 'public', publicPath.replace(/^\//, ''));
}

function fail(message) {
  failures += 1;
  console.error(`✗ ${message}`);
}

function warn(message) {
  console.warn(`! ${message}`);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

function parseGlbJson(buffer) {
  if (buffer.length < 20 || buffer.toString('utf8', 0, 4) !== 'glTF') {
    throw new Error('invalid GLB header');
  }
  const version = buffer.readUInt32LE(4);
  if (version !== 2) throw new Error(`unsupported GLB version ${version}`);
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + chunkLength;
    if (end > buffer.length) throw new Error('truncated GLB chunk');
    if (chunkType === 0x4e4f534a) {
      return JSON.parse(buffer.toString('utf8', start, end).replace(/\0+$/g, '').trim());
    }
    offset = end;
  }
  throw new Error('GLB JSON chunk missing');
}

function estimateTriangles(gltf) {
  const accessors = gltf.accessors ?? [];
  let triangles = 0;
  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      if ((primitive.mode ?? 4) !== 4) continue;
      if (Number.isInteger(primitive.indices)) {
        triangles += Math.floor((accessors[primitive.indices]?.count ?? 0) / 3);
      } else if (Number.isInteger(primitive.attributes?.POSITION)) {
        triangles += Math.floor((accessors[primitive.attributes.POSITION]?.count ?? 0) / 3);
      }
    }
  }
  return triangles;
}

for (const [id, operator] of Object.entries(manifest.operators ?? {})) {
  console.log(`\n${operator.displayName ?? id}`);
  const glbPath = localPath(operator.glb);
  const posterPath = localPath(operator.poster);

  if (!existsSync(glbPath)) {
    const message = `${operator.glb} missing${strict ? '' : ' (optional until production art lands)'}`;
    if (strict) fail(message); else warn(message);
  } else {
    try {
      const info = await stat(glbPath);
      const targetBytes = manifest.performanceBudget?.targetCompressedGlbBytes ?? 8 * 1024 * 1024;
      if (info.size > targetBytes) warn(`${operator.glb} ${(info.size / 1024 / 1024).toFixed(2)} MB exceeds ${(targetBytes / 1024 / 1024).toFixed(2)} MB target`);
      else ok(`${operator.glb} ${(info.size / 1024 / 1024).toFixed(2)} MB`);

      const buffer = await readFile(glbPath);
      const gltf = parseGlbJson(buffer);
      const animationNames = new Set((gltf.animations ?? []).map((animation) => String(animation.name ?? '').toLowerCase()));
      const missingClips = requiredClips.filter((clip) => !animationNames.has(clip));
      if (missingClips.length) fail(`${operator.displayName} missing animation clips: ${missingClips.join(', ')}`);
      else ok(`${operator.displayName} animation contract complete`);

      const triangles = estimateTriangles(gltf);
      const triangleBudget = manifest.performanceBudget?.maxVisibleTriangles ?? 80000;
      if (triangles > triangleBudget) fail(`${operator.displayName} estimated ${triangles.toLocaleString()} triangles exceeds ${triangleBudget.toLocaleString()} budget`);
      else ok(`${operator.displayName} estimated ${triangles.toLocaleString()} triangles`);
    } catch (error) {
      fail(`${operator.glb}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!existsSync(posterPath)) {
    const message = `${operator.poster} missing${strict ? '' : ' (optional until production art lands)'}`;
    if (strict) fail(message); else warn(message);
  } else {
    const info = await stat(posterPath);
    if (info.size > 450 * 1024) warn(`${operator.poster} ${(info.size / 1024).toFixed(0)} KB exceeds 450 KB poster target`);
    else ok(`${operator.poster} ${(info.size / 1024).toFixed(0)} KB`);
  }
}

console.log('');
if (failures > 0) {
  console.error(`Operator asset validation failed with ${failures} issue${failures === 1 ? '' : 's'}.`);
  process.exitCode = 1;
} else {
  console.log('Operator asset validation complete.');
}
