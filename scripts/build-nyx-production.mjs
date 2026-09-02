import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { compactPrimitive, dedup, prune, resample, sortPrimitiveWeights } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const MAX_TRIANGLES = 80_000;
const TEXTURE_SIZE = 2048;
const SIMPLIFICATION_ERROR = 0.005;
const OUTPUT_PATH = 'public/operator/nyx/nyx.glb';
const POSTER_PATH = 'public/operator/nyx/poster.webp';

const ACTIONS = {
  idle: {
    duration: 4,
    tracks: {
      Spine01: [
        [0, 0, -0.35],
        [0.5, 0, 0.35],
        [0, 0, -0.35],
      ],
      Head: [
        [0, 0, -0.6],
        [0.45, 0, 0.6],
        [0, 0, -0.6],
      ],
    },
  },
  observing: {
    duration: 2.4,
    tracks: {
      neck: [
        [0, -2.2, -3.5],
        [-0.7, 1.8, 3.5],
        [0, -2.2, -3.5],
      ],
      Head: [
        [-0.4, -1.1, -2.2],
        [0.5, 1.1, 2.2],
        [-0.4, -1.1, -2.2],
      ],
    },
  },
  processing: {
    duration: 2,
    tracks: {
      Head: [
        [-1.2, 0, -1.2],
        [-2.2, 0, 1.2],
        [-1.2, 0, -1.2],
      ],
      LeftForeArm: [
        [0, 0, 1.5],
        [0, 0, 5],
        [0, 0, 1.5],
      ],
      RightForeArm: [
        [0, 0, -1.5],
        [0, 0, -5],
        [0, 0, -1.5],
      ],
    },
  },
  warning: {
    duration: 1.6,
    tracks: {
      Spine: [
        [-0.5, 0, 0],
        [1.3, 0, 0],
        [-0.5, 0, 0],
      ],
      Head: [
        [-1.8, 0, 0],
        [1.2, 0, 0],
        [-1.8, 0, 0],
      ],
    },
  },
  success: {
    duration: 1.8,
    tracks: {
      Spine: [
        [0, 0, 0],
        [0.8, 0, 0],
        [-0.4, 0, 0],
        [0, 0, 0],
      ],
      Head: [
        [0, 0, 0],
        [3.2, 0, 0],
        [-1.8, 0, 0],
        [0, 0, 0],
      ],
    },
  },
  offline: {
    duration: 4,
    tracks: {
      Spine01: [
        [1.8, 0, 0],
        [2.2, 0, 0],
        [1.8, 0, 0],
      ],
      neck: [
        [3.5, 0, 0],
        [4.2, 0, 0],
        [3.5, 0, 0],
      ],
      Head: [
        [5.5, 0, 0],
        [6.2, 0, 0],
        [5.5, 0, 0],
      ],
    },
  },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const source = args.find((value) => !value.startsWith('--'));
  const outputIndex = args.indexOf('--output');
  const posterIndex = args.indexOf('--poster');
  if (!source) {
    console.error(
      'Usage: node scripts/build-nyx-production.mjs <source.glb> [--poster reference.png] [--output nyx.glb]',
    );
    process.exit(2);
  }
  return {
    source: path.resolve(source),
    output: path.resolve(outputIndex >= 0 ? args[outputIndex + 1] : OUTPUT_PATH),
    poster: posterIndex >= 0 ? path.resolve(args[posterIndex + 1]) : null,
  };
}

function quaternionFromEuler([xDegrees, yDegrees, zDegrees]) {
  const x = (xDegrees * Math.PI) / 360;
  const y = (yDegrees * Math.PI) / 360;
  const z = (zDegrees * Math.PI) / 360;
  const sx = Math.sin(x);
  const cx = Math.cos(x);
  const sy = Math.sin(y);
  const cy = Math.cos(y);
  const sz = Math.sin(z);
  const cz = Math.cos(z);
  return [
    sx * cy * cz + cx * sy * sz,
    cx * sy * cz - sx * cy * sz,
    cx * cy * sz + sx * sy * cz,
    cx * cy * cz - sx * sy * sz,
  ];
}

function multiplyQuaternion(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

function actionTimes(duration, keyframeCount) {
  return Array.from({ length: keyframeCount }, (_, index) => (duration * index) / (keyframeCount - 1));
}

function createActions(document) {
  for (const animation of document.getRoot().listAnimations()) animation.dispose();
  const nodes = new Map(
    document
      .getRoot()
      .listNodes()
      .map((node) => [node.getName(), node]),
  );
  const buffer = document.getRoot().listBuffers()[0] ?? document.createBuffer('NYX production buffer');

  for (const [name, definition] of Object.entries(ACTIONS)) {
    const animation = document.createAnimation(name);
    for (const [boneName, deltas] of Object.entries(definition.tracks)) {
      const node = nodes.get(boneName);
      if (!node) throw new Error(`NYX rig is missing required animation bone '${boneName}'`);
      const times = actionTimes(definition.duration, deltas.length);
      const baseRotation = Array.from(node.getRotation());
      const rotations = deltas.flatMap((delta) => multiplyQuaternion(baseRotation, quaternionFromEuler(delta)));
      const input = document
        .createAccessor(`${name}:${boneName}:time`)
        .setType('SCALAR')
        .setArray(new Float32Array(times))
        .setBuffer(buffer);
      const output = document
        .createAccessor(`${name}:${boneName}:rotation`)
        .setType('VEC4')
        .setArray(new Float32Array(rotations))
        .setBuffer(buffer);
      const sampler = document
        .createAnimationSampler(`${name}:${boneName}`)
        .setInput(input)
        .setOutput(output)
        .setInterpolation('LINEAR');
      const channel = document
        .createAnimationChannel(`${name}:${boneName}`)
        .setSampler(sampler)
        .setTargetNode(node)
        .setTargetPath('rotation');
      animation.addSampler(sampler).addChannel(channel);
    }
  }
}

function hueDegrees(red, green, blue) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  if (delta === 0) return 0;
  const raw =
    max === red ? ((green - blue) / delta) % 6 : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4;
  return (raw * 60 + 360) % 360;
}

function isEmissivePixel(red, green, blue) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const hue = hueDegrees(red, green, blue);
  const cyberHue = (hue >= 175 && hue <= 205) || (hue >= 245 && hue <= 335);
  return max >= 92 && saturation >= 0.5 && cyberHue;
}

async function buildTextures(document) {
  const material = document.getRoot().listMaterials()[0];
  const baseTexture = material?.getBaseColorTexture();
  const sourceImage = baseTexture?.getImage();
  if (!material || !baseTexture || !sourceImage)
    throw new Error('NYX source must include an embedded base-color texture');

  const resized = sharp(sourceImage).resize(TEXTURE_SIZE, TEXTURE_SIZE, { fit: 'inside', withoutEnlargement: true });
  const { data, info } = await resized.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const emissivePixels = Buffer.alloc(data.length, 0);
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    if (!isEmissivePixel(red, green, blue)) continue;
    const gain = 1.35;
    emissivePixels[offset] = Math.min(255, red * gain);
    emissivePixels[offset + 1] = Math.min(255, green * gain);
    emissivePixels[offset + 2] = Math.min(255, blue * gain);
    emissivePixels[offset + 3] = 255;
  }

  const baseJpeg = await sharp(sourceImage)
    .resize(TEXTURE_SIZE, TEXTURE_SIZE, { fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#000000' })
    .jpeg({ quality: 86, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toBuffer();
  const emissiveJpeg = await sharp(emissivePixels, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .removeAlpha()
    .jpeg({ quality: 88, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toBuffer();

  baseTexture.setName('NYX Base Color 2K').setImage(baseJpeg).setMimeType('image/jpeg');
  const emissiveTexture = document.createTexture('NYX Emissive 2K').setImage(emissiveJpeg).setMimeType('image/jpeg');
  material
    .setName('NYX PBR')
    .setBaseColorTexture(baseTexture)
    .setEmissiveTexture(emissiveTexture)
    .setEmissiveFactor([1, 1, 1])
    .setMetallicFactor(0.48)
    .setRoughnessFactor(0.5)
    .setAlphaMode('OPAQUE')
    .setDoubleSided(true);
}

async function simplifyGeometry(document) {
  await MeshoptSimplifier.ready;
  const primitives = document
    .getRoot()
    .listMeshes()
    .flatMap((mesh) => mesh.listPrimitives());
  const triangleCounts = primitives.map((primitive) => (primitive.getIndices()?.getCount() ?? 0) / 3);
  const totalTriangles = triangleCounts.reduce((total, count) => total + count, 0);
  if (totalTriangles <= MAX_TRIANGLES) return;

  for (let index = 0; index < primitives.length; index += 1) {
    const primitive = primitives[index];
    const indices = primitive.getIndices()?.getArray();
    const positions = primitive.getAttribute('POSITION')?.getArray();
    if (!indices || !positions) throw new Error('NYX production mesh must be indexed and include POSITION');
    const targetTriangles = Math.max(1, Math.floor((MAX_TRIANGLES * triangleCounts[index]) / totalTriangles));
    const [simplifiedIndices, error] = MeshoptSimplifier.simplify(
      indices,
      positions,
      3,
      targetTriangles * 3,
      SIMPLIFICATION_ERROR,
      ['Permissive'],
    );
    if (simplifiedIndices.length / 3 > targetTriangles) {
      throw new Error(
        `NYX simplifier stopped at ${simplifiedIndices.length / 3} triangles (target ${targetTriangles})`,
      );
    }
    const accessor = document
      .createAccessor('NYX production indices')
      .setType('SCALAR')
      .setArray(simplifiedIndices)
      .setBuffer(primitive.getIndices().getBuffer());
    primitive.setIndices(accessor);
    compactPrimitive(primitive);
    console.log(
      `✓ Simplified primitive ${index}: ${triangleCounts[index].toLocaleString()} → ${(simplifiedIndices.length / 3).toLocaleString()} triangles (error ${error.toFixed(6)})`,
    );
  }
}

async function createPoster(source, output) {
  await mkdir(path.dirname(output), { recursive: true });
  await sharp(source).webp({ quality: 90, alphaQuality: 95, effort: 5 }).toFile(output);
  console.log(`✓ Wrote ${output}`);
}

const { source, output, poster } = parseArgs();
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(source);
await mkdir(path.dirname(output), { recursive: true });
await buildTextures(document);
await simplifyGeometry(document);
createActions(document);
for (const mesh of document.getRoot().listMeshes()) {
  mesh.setName('NYX Production Mesh');
  for (const primitive of mesh.listPrimitives()) sortPrimitiveWeights(primitive, 4);
}
await document.transform(dedup(), resample(), prune({ keepAttributes: true, keepIndices: true }));
await io.write(output, document);
console.log(`✓ Wrote ${output}`);
if (poster) await createPoster(poster, path.resolve(POSTER_PATH));
