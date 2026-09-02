import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';

const COMPONENTS = {
  5120: { bytes: 1, read: 'readInt8', max: 127, min: -128 },
  5121: { bytes: 1, read: 'readUInt8', max: 255, min: 0 },
  5122: { bytes: 2, read: 'readInt16LE', max: 32767, min: -32768 },
  5123: { bytes: 2, read: 'readUInt16LE', max: 65535, min: 0 },
  5125: { bytes: 4, read: 'readUInt32LE', max: 4294967295, min: 0 },
  5126: { bytes: 4, read: 'readFloatLE' },
};

const TYPE_COMPONENTS = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

function parseArgs() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output');
  const output = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
  const inputs = args.filter((value, index) => index !== outputIndex && index !== outputIndex + 1);
  if (inputs.length === 0 || (outputIndex >= 0 && !output)) {
    console.error('Usage: node scripts/inspect-operator-glb.mjs <file.glb> [...] [--output report.json]');
    process.exit(2);
  }
  return { inputs, output };
}

function parseGlb(buffer) {
  if (buffer.length < 20 || buffer.toString('utf8', 0, 4) !== 'glTF') throw new Error('invalid GLB header');
  const version = buffer.readUInt32LE(4);
  const declaredLength = buffer.readUInt32LE(8);
  if (version !== 2) throw new Error(`unsupported GLB version ${version}`);
  if (declaredLength !== buffer.length) throw new Error(`GLB length mismatch: ${declaredLength} != ${buffer.length}`);

  let json;
  let binary = Buffer.alloc(0);
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + length;
    if (end > buffer.length) throw new Error('truncated GLB chunk');
    if (type === 0x4e4f534a) json = JSON.parse(buffer.toString('utf8', start, end).replace(/\0+$/g, '').trim());
    if (type === 0x004e4942) binary = buffer.subarray(start, end);
    offset = end;
  }
  if (!json) throw new Error('GLB JSON chunk missing');
  return { json, binary };
}

function normalizedValue(value, componentType) {
  const definition = COMPONENTS[componentType];
  if (!definition || componentType === 5126) return value;
  if (definition.min === 0) return value / definition.max;
  return Math.max(value / definition.max, -1);
}

function readAccessor(gltf, binary, accessorIndex) {
  const accessor = gltf.accessors?.[accessorIndex];
  if (!accessor) throw new Error(`accessor ${accessorIndex} missing`);
  if (accessor.sparse) throw new Error(`accessor ${accessorIndex} uses unsupported sparse data`);
  const view = gltf.bufferViews?.[accessor.bufferView];
  if (!view) throw new Error(`accessor ${accessorIndex} bufferView missing`);
  const component = COMPONENTS[accessor.componentType];
  const width = TYPE_COMPONENTS[accessor.type];
  if (!component || !width) throw new Error(`accessor ${accessorIndex} has unsupported representation`);
  const packedStride = component.bytes * width;
  const stride = view.byteStride ?? packedStride;
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);

  return {
    accessor,
    width,
    value(row, column) {
      const offset = start + row * stride + column * component.bytes;
      const raw = binary[component.read](offset);
      return accessor.normalized ? normalizedValue(raw, accessor.componentType) : raw;
    },
    row(index) {
      return Array.from({ length: width }, (_, column) => this.value(index, column));
    },
  };
}

function identity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function multiply(a, b) {
  const result = new Array(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let index = 0; index < 4; index += 1) result[column * 4 + row] += a[index * 4 + row] * b[column * 4 + index];
    }
  }
  return result;
}

function nodeMatrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  return [
    (1 - 2 * y * y - 2 * z * z) * sx,
    (2 * x * y + 2 * z * w) * sx,
    (2 * x * z - 2 * y * w) * sx,
    0,
    (2 * x * y - 2 * z * w) * sy,
    (1 - 2 * x * x - 2 * z * z) * sy,
    (2 * y * z + 2 * x * w) * sy,
    0,
    (2 * x * z + 2 * y * w) * sz,
    (2 * y * z - 2 * x * w) * sz,
    (1 - 2 * x * x - 2 * y * y) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ];
}

function transformPoint(matrix, point) {
  const [x, y, z] = point;
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
  ];
}

function worldMatrices(gltf) {
  const result = new Map();
  const visit = (index, parent) => {
    const node = gltf.nodes?.[index];
    if (!node) return;
    const world = multiply(parent, nodeMatrix(node));
    result.set(index, world);
    for (const child of node.children ?? []) visit(child, world);
  };
  const scene = gltf.scenes?.[gltf.scene ?? 0];
  for (const root of scene?.nodes ?? []) visit(root, identity());
  return result;
}

function imageDimensions(bytes, mimeType) {
  if ((mimeType === 'image/png' || bytes.subarray(1, 4).toString() === 'PNG') && bytes.length >= 24) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
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
        return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
      }
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  if (mimeType === 'image/webp' && bytes.length >= 30) {
    const type = bytes.toString('ascii', 12, 16);
    if (type === 'VP8X') return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  }
  return { width: null, height: null };
}

function embeddedImage(gltf, binary, image) {
  if (Number.isInteger(image.bufferView)) {
    const view = gltf.bufferViews?.[image.bufferView];
    if (!view) return null;
    return binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
  }
  if (typeof image.uri === 'string' && image.uri.startsWith('data:')) {
    return Buffer.from(image.uri.slice(image.uri.indexOf(',') + 1), 'base64');
  }
  return null;
}

function inspectGeometry(gltf, binary) {
  let primitives = 0;
  let vertices = 0;
  let triangles = 0;
  const modes = {};
  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      primitives += 1;
      const mode = primitive.mode ?? 4;
      modes[mode] = (modes[mode] ?? 0) + 1;
      const position = gltf.accessors?.[primitive.attributes?.POSITION];
      vertices += position?.count ?? 0;
      const elementCount = Number.isInteger(primitive.indices)
        ? (gltf.accessors?.[primitive.indices]?.count ?? 0)
        : (position?.count ?? 0);
      if (mode === 4) triangles += Math.floor(elementCount / 3);
      if (mode === 5 || mode === 6) triangles += Math.max(0, elementCount - 2);
    }
  }

  const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  const matrices = worldMatrices(gltf);
  for (let nodeIndex = 0; nodeIndex < (gltf.nodes?.length ?? 0); nodeIndex += 1) {
    const node = gltf.nodes[nodeIndex];
    if (!Number.isInteger(node.mesh)) continue;
    const matrix = matrices.get(nodeIndex) ?? identity();
    for (const primitive of gltf.meshes?.[node.mesh]?.primitives ?? []) {
      if (!Number.isInteger(primitive.attributes?.POSITION)) continue;
      const positions = readAccessor(gltf, binary, primitive.attributes.POSITION);
      for (let row = 0; row < positions.accessor.count; row += 1) {
        const point = transformPoint(matrix, positions.row(row));
        for (let axis = 0; axis < 3; axis += 1) {
          bounds.min[axis] = Math.min(bounds.min[axis], point[axis]);
          bounds.max[axis] = Math.max(bounds.max[axis], point[axis]);
        }
      }
    }
  }
  const validBounds = Number.isFinite(bounds.min[0]);
  return {
    meshes: gltf.meshes?.length ?? 0,
    primitives,
    vertices,
    triangles,
    primitiveModes: modes,
    nodes: gltf.nodes?.length ?? 0,
    bounds: validBounds
      ? {
          min: bounds.min,
          max: bounds.max,
          size: bounds.max.map((value, index) => value - bounds.min[index]),
        }
      : null,
  };
}

function inspectRig(gltf, binary) {
  const meshNodes = new Map();
  for (let index = 0; index < (gltf.nodes?.length ?? 0); index += 1) {
    const node = gltf.nodes[index];
    if (Number.isInteger(node.mesh)) meshNodes.set(node.mesh, [...(meshNodes.get(node.mesh) ?? []), index]);
  }

  let totalVertices = 0;
  let skinnedVertices = 0;
  let weightedVertices = 0;
  let zeroWeightVertices = 0;
  let invalidWeightVertices = 0;
  let invalidJointVertices = 0;
  let minWeightSum = Infinity;
  let maxWeightSum = -Infinity;
  const primitiveDetails = [];

  for (let meshIndex = 0; meshIndex < (gltf.meshes?.length ?? 0); meshIndex += 1) {
    const nodeIndices = meshNodes.get(meshIndex) ?? [];
    const skinIndices = [...new Set(nodeIndices.map((index) => gltf.nodes[index].skin).filter(Number.isInteger))];
    const jointLimit = skinIndices.length === 1 ? gltf.skins?.[skinIndices[0]]?.joints?.length : undefined;
    const mesh = gltf.meshes[meshIndex];
    for (let primitiveIndex = 0; primitiveIndex < (mesh.primitives?.length ?? 0); primitiveIndex += 1) {
      const primitive = mesh.primitives[primitiveIndex];
      const vertexCount = gltf.accessors?.[primitive.attributes?.POSITION]?.count ?? 0;
      totalVertices += vertexCount;
      const jointsIndex = primitive.attributes?.JOINTS_0;
      const weightsIndex = primitive.attributes?.WEIGHTS_0;
      const hasSkinAttributes = Number.isInteger(jointsIndex) && Number.isInteger(weightsIndex);
      if (!hasSkinAttributes) {
        primitiveDetails.push({
          mesh: meshIndex,
          primitive: primitiveIndex,
          vertices: vertexCount,
          hasSkinAttributes: false,
        });
        continue;
      }

      const joints = readAccessor(gltf, binary, jointsIndex);
      const weights = readAccessor(gltf, binary, weightsIndex);
      const rows = Math.min(vertexCount, joints.accessor.count, weights.accessor.count);
      skinnedVertices += rows;
      let primitiveZeroWeights = 0;
      let primitiveInvalidWeights = 0;
      let primitiveInvalidJoints = 0;
      for (let row = 0; row < rows; row += 1) {
        const rowWeights = weights.row(row);
        const rowJoints = joints.row(row);
        const sum = rowWeights.reduce((total, value) => total + value, 0);
        minWeightSum = Math.min(minWeightSum, sum);
        maxWeightSum = Math.max(maxWeightSum, sum);
        if (sum <= 1e-6) {
          zeroWeightVertices += 1;
          primitiveZeroWeights += 1;
        } else {
          weightedVertices += 1;
        }
        if (rowWeights.some((value) => !Number.isFinite(value) || value < 0) || Math.abs(sum - 1) > 0.02) {
          invalidWeightVertices += 1;
          primitiveInvalidWeights += 1;
        }
        if (
          jointLimit !== undefined &&
          rowJoints.some((joint, index) => rowWeights[index] > 1e-6 && joint >= jointLimit)
        ) {
          invalidJointVertices += 1;
          primitiveInvalidJoints += 1;
        }
      }
      primitiveDetails.push({
        mesh: meshIndex,
        primitive: primitiveIndex,
        vertices: vertexCount,
        hasSkinAttributes: true,
        jointsAccessor: jointsIndex,
        weightsAccessor: weightsIndex,
        zeroWeightVertices: primitiveZeroWeights,
        invalidWeightVertices: primitiveInvalidWeights,
        invalidJointVertices: primitiveInvalidJoints,
      });
    }
  }

  const skinDetails = (gltf.skins ?? []).map((skin, index) => ({
    index,
    name: skin.name ?? null,
    skeletonRoot: Number.isInteger(skin.skeleton)
      ? { index: skin.skeleton, name: gltf.nodes?.[skin.skeleton]?.name ?? null }
      : null,
    jointCount: skin.joints?.length ?? 0,
    inverseBindMatricesAccessor: skin.inverseBindMatrices ?? null,
    inverseBindMatricesCount: Number.isInteger(skin.inverseBindMatrices)
      ? (gltf.accessors?.[skin.inverseBindMatrices]?.count ?? 0)
      : 0,
    joints: (skin.joints ?? []).map((joint) => ({ index: joint, name: gltf.nodes?.[joint]?.name ?? null })),
  }));
  const boneNames = [...new Set(skinDetails.flatMap((skin) => skin.joints.map((joint) => joint.name).filter(Boolean)))];
  const normalizedNames = boneNames.map((name) => name.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const humanoidSignals = ['hips', 'spine', 'head', 'leftarm', 'rightarm', 'leftleg', 'rightleg'];
  const matchedSignals = humanoidSignals.filter((signal) => normalizedNames.some((name) => name.includes(signal)));

  return {
    skins: skinDetails,
    uniqueJointCount: new Set((gltf.skins ?? []).flatMap((skin) => skin.joints ?? [])).size,
    boneNames,
    humanoid: matchedSignals.length >= 6,
    humanoidSignals: { matched: matchedSignals, expected: humanoidSignals },
    hasJoints0: primitiveDetails.some((item) => item.hasSkinAttributes),
    hasWeights0: primitiveDetails.some((item) => item.hasSkinAttributes),
    skinningCoverage: {
      totalVertices,
      skinnedVertices,
      weightedVertices,
      percentSkinned: totalVertices > 0 ? (skinnedVertices / totalVertices) * 100 : 0,
      percentWeighted: totalVertices > 0 ? (weightedVertices / totalVertices) * 100 : 0,
      zeroWeightVertices,
      invalidWeightVertices,
      invalidJointVertices,
      minWeightSum: Number.isFinite(minWeightSum) ? minWeightSum : null,
      maxWeightSum: Number.isFinite(maxWeightSum) ? maxWeightSum : null,
    },
    primitives: primitiveDetails,
  };
}

function inspectAnimations(gltf, binary) {
  return (gltf.animations ?? []).map((animation, index) => {
    let start = Infinity;
    let end = -Infinity;
    const paths = { translation: 0, rotation: 0, scale: 0, weights: 0 };
    const targets = new Set();
    const targetBones = new Set();
    const tracks = [];
    for (const channel of animation.channels ?? []) {
      const sampler = animation.samplers?.[channel.sampler];
      const inputIndex = sampler?.input;
      const accessor = Number.isInteger(inputIndex) ? readAccessor(gltf, binary, inputIndex) : null;
      let trackStart = Infinity;
      let trackEnd = -Infinity;
      if (accessor) {
        if (accessor.accessor.min?.length && accessor.accessor.max?.length) {
          trackStart = accessor.accessor.min[0];
          trackEnd = accessor.accessor.max[0];
        } else {
          for (let row = 0; row < accessor.accessor.count; row += 1) {
            const value = accessor.value(row, 0);
            trackStart = Math.min(trackStart, value);
            trackEnd = Math.max(trackEnd, value);
          }
        }
      }
      start = Math.min(start, trackStart);
      end = Math.max(end, trackEnd);
      const targetIndex = channel.target?.node;
      const targetName = Number.isInteger(targetIndex)
        ? (gltf.nodes?.[targetIndex]?.name ?? `node_${targetIndex}`)
        : null;
      const pathName = channel.target?.path ?? 'unknown';
      if (Object.hasOwn(paths, pathName)) paths[pathName] += 1;
      if (targetName) {
        targets.add(targetName);
        targetBones.add(targetName);
      }
      tracks.push({
        targetNode: targetIndex ?? null,
        targetName,
        path: pathName,
        interpolation: sampler?.interpolation ?? 'LINEAR',
        keyframes: accessor?.accessor.count ?? 0,
        start: Number.isFinite(trackStart) ? trackStart : null,
        end: Number.isFinite(trackEnd) ? trackEnd : null,
      });
    }
    return {
      index,
      name: animation.name ?? `animation_${index}`,
      duration: Number.isFinite(end - start) ? end - start : 0,
      start: Number.isFinite(start) ? start : null,
      end: Number.isFinite(end) ? end : null,
      channels: animation.channels?.length ?? 0,
      samplers: animation.samplers?.length ?? 0,
      paths,
      targetCount: targets.size,
      targetBones: [...targetBones],
      tracks,
    };
  });
}

function textureInfo(gltf, binary) {
  return (gltf.images ?? []).map((image, index) => {
    const bytes = embeddedImage(gltf, binary, image);
    const dimensions = bytes ? imageDimensions(bytes, image.mimeType) : { width: null, height: null };
    return {
      index,
      name: image.name ?? null,
      mimeType: image.mimeType ?? null,
      embedded: Boolean(bytes),
      externalUri: typeof image.uri === 'string' && !image.uri.startsWith('data:') ? image.uri : null,
      byteLength: bytes?.length ?? null,
      sha256: bytes ? createHash('sha256').update(bytes).digest('hex') : null,
      ...dimensions,
    };
  });
}

function textureReference(gltf, info) {
  const texture = Number.isInteger(info?.index) ? gltf.textures?.[info.index] : null;
  return texture ? { texture: info.index, image: texture.source ?? null, texCoord: info.texCoord ?? 0 } : null;
}

function inspectMaterials(gltf, binary) {
  const images = textureInfo(gltf, binary);
  const materials = (gltf.materials ?? []).map((material, index) => ({
    index,
    name: material.name ?? null,
    baseColorFactor: material.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1],
    baseColorTexture: textureReference(gltf, material.pbrMetallicRoughness?.baseColorTexture),
    metallicFactor: material.pbrMetallicRoughness?.metallicFactor ?? 1,
    metallicRoughnessTexture: textureReference(gltf, material.pbrMetallicRoughness?.metallicRoughnessTexture),
    roughnessFactor: material.pbrMetallicRoughness?.roughnessFactor ?? 1,
    normalTexture: textureReference(gltf, material.normalTexture),
    emissiveFactor: material.emissiveFactor ?? [0, 0, 0],
    emissiveTexture: textureReference(gltf, material.emissiveTexture),
    occlusionTexture: textureReference(gltf, material.occlusionTexture),
    alphaMode: material.alphaMode ?? 'OPAQUE',
    alphaCutoff: material.alphaCutoff ?? null,
    doubleSided: material.doubleSided ?? false,
    extensions: material.extensions ?? {},
  }));
  return {
    materialCount: materials.length,
    textureCount: gltf.textures?.length ?? 0,
    imageCount: images.length,
    samplerCount: gltf.samplers?.length ?? 0,
    embeddedImages: images.filter((image) => image.embedded).length,
    externalImages: images.filter((image) => image.externalUri).length,
    emissiveMaterialCount: materials.filter(
      (material) => material.emissiveTexture || material.emissiveFactor.some((value) => value > 0),
    ).length,
    images,
    materials,
  };
}

async function inspectFile(file) {
  const resolved = path.resolve(file);
  const buffer = await readFile(resolved);
  const { json: gltf, binary } = parseGlb(buffer);
  return {
    file: resolved,
    fileSizeBytes: buffer.length,
    asset: gltf.asset ?? {},
    scene: gltf.scene ?? null,
    scenes: gltf.scenes?.length ?? 0,
    geometry: inspectGeometry(gltf, binary),
    rig: inspectRig(gltf, binary),
    animations: inspectAnimations(gltf, binary),
    materials: inspectMaterials(gltf, binary),
    extensions: {
      used: gltf.extensionsUsed ?? [],
      required: gltf.extensionsRequired ?? [],
    },
  };
}

const { inputs, output } = parseArgs();
const report = { generatedAt: new Date().toISOString(), files: [] };
for (const input of inputs) report.files.push(await inspectFile(input));
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (output) await writeFile(path.resolve(output), serialized);
else process.stdout.write(serialized);
