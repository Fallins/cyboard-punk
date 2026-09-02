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

function parseGlb(buffer) {
  if (buffer.length < 20 || buffer.toString('utf8', 0, 4) !== 'glTF') {
    throw new Error('invalid GLB header');
  }
  const version = buffer.readUInt32LE(4);
  if (version !== 2) throw new Error(`unsupported GLB version ${version}`);
  const declaredLength = buffer.readUInt32LE(8);
  if (declaredLength !== buffer.length)
    throw new Error(`GLB length mismatch: header=${declaredLength}, file=${buffer.length}`);

  let gltf;
  let binary = Buffer.alloc(0);
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + chunkLength;
    if (end > buffer.length) throw new Error('truncated GLB chunk');
    if (chunkType === 0x4e4f534a) {
      gltf = JSON.parse(buffer.toString('utf8', start, end).replace(/\0+$/g, '').trim());
    }
    if (chunkType === 0x004e4942) binary = buffer.subarray(start, end);
    offset = end;
  }
  if (!gltf) throw new Error('GLB JSON chunk missing');
  return { gltf, binary };
}

function animationDuration(gltf, animation) {
  let start = Infinity;
  let end = -Infinity;
  for (const sampler of animation.samplers ?? []) {
    const accessor = gltf.accessors?.[sampler.input];
    if (!accessor) continue;
    if (Number.isFinite(accessor.min?.[0])) start = Math.min(start, accessor.min[0]);
    if (Number.isFinite(accessor.max?.[0])) end = Math.max(end, accessor.max[0]);
  }
  return Number.isFinite(start) && Number.isFinite(end) ? end - start : 0;
}

function imageDimensions(bytes, mimeType) {
  if ((mimeType === 'image/png' || bytes.subarray(1, 4).toString() === 'PNG') && bytes.length >= 24) {
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  }
  if (mimeType === 'image/jpeg' || (bytes[0] === 0xff && bytes[1] === 0xd8)) {
    for (let offset = 2; offset + 9 < bytes.length;) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      const length = bytes.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return [bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5)];
      }
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  return null;
}

function validateTextures(gltf, binary, displayName, maxResolution) {
  let inspected = 0;
  for (const [index, image] of (gltf.images ?? []).entries()) {
    if (!Number.isInteger(image.bufferView)) continue;
    const view = gltf.bufferViews?.[image.bufferView];
    if (!view) {
      fail(`${displayName} image ${index} references a missing bufferView`);
      continue;
    }
    const start = view.byteOffset ?? 0;
    const bytes = binary.subarray(start, start + view.byteLength);
    const dimensions = imageDimensions(bytes, image.mimeType);
    if (!dimensions) {
      warn(`${displayName} image ${index} dimensions could not be verified`);
      continue;
    }
    inspected += 1;
    if (Math.max(...dimensions) > maxResolution) {
      fail(`${displayName} image ${index} is ${dimensions[0]}x${dimensions[1]}; limit is ${maxResolution}px`);
    }
  }
  if (inspected > 0) ok(`${displayName} embedded textures are <= ${maxResolution}px`);
}

function validateSkinAccessors(gltf, displayName) {
  for (const [index, skin] of (gltf.skins ?? []).entries()) {
    if (Number.isInteger(skin.inverseBindMatrices)) {
      const count = gltf.accessors?.[skin.inverseBindMatrices]?.count ?? 0;
      if (count !== (skin.joints?.length ?? 0)) {
        fail(
          `${displayName} skin ${index} inverse-bind count ${count} does not match ${skin.joints?.length ?? 0} joints`,
        );
      }
    }
  }
  for (const [meshIndex, mesh] of (gltf.meshes ?? []).entries()) {
    for (const [primitiveIndex, primitive] of (mesh.primitives ?? []).entries()) {
      const positionCount = gltf.accessors?.[primitive.attributes?.POSITION]?.count ?? 0;
      const jointsCount = gltf.accessors?.[primitive.attributes?.JOINTS_0]?.count ?? 0;
      const weightsCount = gltf.accessors?.[primitive.attributes?.WEIGHTS_0]?.count ?? 0;
      if (jointsCount > 0 && (jointsCount !== positionCount || weightsCount !== positionCount)) {
        fail(`${displayName} mesh ${meshIndex} primitive ${primitiveIndex} skin accessor counts do not match POSITION`);
      }
    }
  }
}

function validateMaterials(gltf, displayName) {
  const materials = gltf.materials ?? [];
  if (!materials.some((material) => Number.isInteger(material.pbrMetallicRoughness?.baseColorTexture?.index))) {
    fail(`${displayName} has no PBR base-color texture`);
  }
  if (!materials.some((material) => Number.isInteger(material.emissiveTexture?.index))) {
    fail(`${displayName} has no emissive texture`);
  }
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
  const externalBuffers = (gltf.buffers ?? []).filter(
    (buffer) => typeof buffer.uri === 'string' && !buffer.uri.startsWith('data:'),
  );
  const externalImages = (gltf.images ?? []).filter(
    (image) => typeof image.uri === 'string' && !image.uri.startsWith('data:'),
  );
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
    if (strict) fail(message);
    else warn(message);
  } else {
    try {
      const info = await stat(glbPath);
      const targetBytes = manifest.performanceBudget?.targetCompressedGlbBytes ?? 8 * 1024 * 1024;
      if (info.size > targetBytes)
        warn(
          `${operator.glb} ${(info.size / 1024 / 1024).toFixed(2)} MB exceeds ${(targetBytes / 1024 / 1024).toFixed(2)} MB target`,
        );
      else ok(`${operator.glb} ${(info.size / 1024 / 1024).toFixed(2)} MB`);

      const buffer = await readFile(glbPath);
      const { gltf, binary } = parseGlb(buffer);
      validateSelfContained(gltf, operator.displayName);
      validateRuntimeExtensions(gltf, operator.displayName);
      validateTextures(gltf, binary, operator.displayName, manifest.performanceBudget?.maxTextureResolution ?? 2048);
      validateSkinAccessors(gltf, operator.displayName);
      validateMaterials(gltf, operator.displayName);

      if (!(gltf.scenes?.length > 0) || !Number.isInteger(gltf.scene)) {
        fail(`${operator.displayName} must declare a default glTF scene`);
      } else {
        ok(`${operator.displayName} default scene present`);
      }

      const animationNames = new Set(
        (gltf.animations ?? []).map((animation) => String(animation.name ?? '').toLowerCase()),
      );
      const requiredClips = operator.animationClips ?? [
        'idle',
        'observing',
        'processing',
        'warning',
        'success',
        'offline',
      ];
      const missingClips = requiredClips.filter((clip) => !animationNames.has(String(clip).toLowerCase()));
      if (missingClips.length) fail(`${operator.displayName} missing animation clips: ${missingClips.join(', ')}`);
      else {
        const animationsByName = new Map(
          (gltf.animations ?? []).map((animation) => [String(animation.name ?? '').toLowerCase(), animation]),
        );
        const staticClips = requiredClips.filter(
          (clip) => animationDuration(gltf, animationsByName.get(String(clip).toLowerCase())) <= 0,
        );
        if (staticClips.length)
          fail(`${operator.displayName} animation clips have zero duration: ${staticClips.join(', ')}`);
        else ok(`${operator.displayName} animation contract complete`);
      }

      const triangles = estimateTriangles(gltf);
      const triangleBudget = manifest.performanceBudget?.maxVisibleTriangles ?? 80000;
      if (triangles > triangleBudget)
        fail(
          `${operator.displayName} estimated ${triangles.toLocaleString()} triangles exceeds ${triangleBudget.toLocaleString()} budget`,
        );
      else ok(`${operator.displayName} estimated ${triangles.toLocaleString()} triangles`);

      const materialCount = gltf.materials?.length ?? 0;
      const maxMaterials = manifest.performanceBudget?.maxMaterials ?? 12;
      if (materialCount > maxMaterials)
        warn(`${operator.displayName} uses ${materialCount} materials; target <= ${maxMaterials}`);
      else ok(`${operator.displayName} uses ${materialCount} material${materialCount === 1 ? '' : 's'}`);

      if (!(gltf.skins?.length > 0)) {
        fail(`${operator.displayName} has no skin; production operators must be rigged`);
      } else {
        const jointCount = uniqueJointCount(gltf);
        const minJoints = manifest.performanceBudget?.minHumanoidJoints ?? 20;
        const maxJoints = manifest.performanceBudget?.maxHumanoidJoints ?? 120;
        if (jointCount < minJoints)
          fail(`${operator.displayName} has only ${jointCount} unique joints; expected at least ${minJoints}`);
        else if (jointCount > maxJoints)
          fail(`${operator.displayName} has ${jointCount} unique joints; exceeds ${maxJoints} runtime budget`);
        else ok(`${operator.displayName} rig has ${jointCount} unique joints`);
      }

      const skinnedPrimitives = skinnedPrimitiveCount(gltf);
      if (skinnedPrimitives === 0)
        fail(`${operator.displayName} meshes have no JOINTS_0 / WEIGHTS_0 skinning attributes`);
      else
        ok(
          `${operator.displayName} has ${skinnedPrimitives} skinned mesh primitive${skinnedPrimitives === 1 ? '' : 's'}`,
        );
    } catch (error) {
      fail(`${operator.glb}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!existsSync(posterPath)) {
    const message = `${operator.poster} missing${strict ? '' : ' (optional until production art lands)'}`;
    if (strict) fail(message);
    else warn(message);
  } else {
    const info = await stat(posterPath);
    if (info.size > 450 * 1024)
      warn(`${operator.poster} ${(info.size / 1024).toFixed(0)} KB exceeds 450 KB poster target`);
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
