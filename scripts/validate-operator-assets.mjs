import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const manifestPath = path.join(root, 'src/ui/operator-manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const unsupportedRuntimeExtensions = new Set([
  'KHR_draco_mesh_compression',
  'EXT_meshopt_compression',
  'KHR_texture_basisu',
]);
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
  const declaredLength = buffer.readUInt32LE(8);
  if (declaredLength !== buffer.length) throw new Error(`GLB length mismatch: header=${declaredLength}, file=${buffer.length}`);

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

function skinnedPrimitiveCount(gltf) {
  let count = 0;
  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const attributes = primitive.attributes ?? {};
      if (Number.isInteger(attributes.JOINTS_0) && Number.isInteger(attributes.WEIGHTS_0)) count += 1;
    }
  }
  return count;
}

function uniqueJointCount(gltf) {
  const joints = new Set();
  for (const skin of gltf.skins ?? []) {
    for (const joint of skin.joints ?? []) joints.add(joint);
  }
  return joints.size;
}

function validateSelfContained(gltf, displayName) {
  const externalBuffers = (gltf.buffers ?? []).filter((buffer) => typeof buffer.uri === 'string' && !buffer.uri.startsWith('data:'));
  const externalImages = (gltf.images ?? []).filter((image) => typeof image.uri === 'string' && !image.uri.startsWith('data:'));
  if (externalBuffers.length || externalImages.length) {
    fail(`${displayName} GLB must be self-contained; external buffers/images were found`);
  } else {
    ok(`${displayName} GLB is self-contained`);
  }
}

function validateRuntimeExtensions(gltf, displayName) {
  const used = new Set([...(gltf.extensionsUsed ?? []), ...(gltf.extensionsRequired ?? [])]);
  const unsupported = [...used].filter((extension) => unsupportedRuntimeExtensions.has(extension));
  if (unsupported.length) {
    fail(`${displayName} uses runtime-unsupported extensions: ${unsupported.join(', ')}`);
  } else {
    ok(`${displayName} uses runtime-compatible glTF extensions`);
  }
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
      validateSelfContained(gltf, operator.displayName);
      validateRuntimeExtensions(gltf, operator.displayName);

      if (!(gltf.scenes?.length > 0) || !Number.isInteger(gltf.scene)) {
        fail(`${operator.displayName} must declare a default glTF scene`);
      } else {
        ok(`${operator.displayName} default scene present`);
      }

      const animationNames = new Set((gltf.animations ?? []).map((animation) => String(animation.name ?? '').toLowerCase()));
      const requiredClips = operator.animationClips ?? ['idle', 'observing', 'processing', 'warning', 'success', 'offline'];
      const missingClips = requiredClips.filter((clip) => !animationNames.has(String(clip).toLowerCase()));
      if (missingClips.length) fail(`${operator.displayName} missing animation clips: ${missingClips.join(', ')}`);
      else ok(`${operator.displayName} animation contract complete`);

      const triangles = estimateTriangles(gltf);
      const triangleBudget = manifest.performanceBudget?.maxVisibleTriangles ?? 80000;
      if (triangles > triangleBudget) fail(`${operator.displayName} estimated ${triangles.toLocaleString()} triangles exceeds ${triangleBudget.toLocaleString()} budget`);
      else ok(`${operator.displayName} estimated ${triangles.toLocaleString()} triangles`);

      const materialCount = gltf.materials?.length ?? 0;
      const maxMaterials = manifest.performanceBudget?.maxMaterials ?? 12;
      if (materialCount > maxMaterials) warn(`${operator.displayName} uses ${materialCount} materials; target <= ${maxMaterials}`);
      else ok(`${operator.displayName} uses ${materialCount} material${materialCount === 1 ? '' : 's'}`);

      if (!(gltf.skins?.length > 0)) {
        fail(`${operator.displayName} has no skin; production operators must be rigged`);
      } else {
        const jointCount = uniqueJointCount(gltf);
        const minJoints = manifest.performanceBudget?.minHumanoidJoints ?? 20;
        const maxJoints = manifest.performanceBudget?.maxHumanoidJoints ?? 120;
        if (jointCount < minJoints) fail(`${operator.displayName} has only ${jointCount} unique joints; expected at least ${minJoints}`);
        else if (jointCount > maxJoints) fail(`${operator.displayName} has ${jointCount} unique joints; exceeds ${maxJoints} runtime budget`);
        else ok(`${operator.displayName} rig has ${jointCount} unique joints`);
      }

      const skinnedPrimitives = skinnedPrimitiveCount(gltf);
      if (skinnedPrimitives === 0) fail(`${operator.displayName} meshes have no JOINTS_0 / WEIGHTS_0 skinning attributes`);
      else ok(`${operator.displayName} has ${skinnedPrimitives} skinned mesh primitive${skinnedPrimitives === 1 ? '' : 's'}`);
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
