import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const assetDir = path.join(root, 'assets/operator/nyx');
const rigPath = path.join(assetDir, 'rig.json');
const runtimeDir = path.join(root, 'public/operator/nyx-2d');

const deformationPolicies = new Set(['rigid', 'transform-only', 'mesh-deform', 'effect-only']);
const maskStrategies = new Set(['source-alpha', 'shader-alpha-mask', 'stencil', 'none']);
const sourceKinds = new Set(['authored', 'derived']);
const requiredExternalStates = ['idle', 'observing', 'processing', 'warning', 'success', 'offline'];
const requiredBaseStates = ['idle', 'observing', 'processing', 'offline'];
const requiredReactions = ['none', 'warning', 'success'];
const requiredAttentionTargets = ['center', 'codex', 'claude', 'cursor'];
const requiredLayers = [
  'hair_back',
  'torso_base',
  'face_base',
  'iris_left',
  'iris_right',
  'upper_lid_left',
  'upper_lid_right',
  'hair_front_center',
  'core',
  'core_glow',
  'suit_emissive',
];

let failures = 0;
let warnings = 0;

function fail(message) {
  failures += 1;
  console.error(`✗ ${message}`);
}

function warn(message) {
  warnings += 1;
  console.warn(`! ${message}`);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

function softMissing(message) {
  if (strict) fail(message);
  else warn(`${message} (allowed until prototype layer extraction is complete)`);
}

function isFinite01(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function hasAll(actual, required) {
  const set = new Set(actual ?? []);
  return required.filter((item) => !set.has(item));
}

function resolveAsset(relativePath) {
  return path.join(assetDir, relativePath);
}

async function sha256(filePath) {
  const bytes = await readFile(filePath);
  return createHash('sha256').update(bytes).digest('hex');
}

function validBounds(bounds, canvas) {
  return (
    bounds &&
    Number.isInteger(bounds.x) && bounds.x >= 0 &&
    Number.isInteger(bounds.y) && bounds.y >= 0 &&
    Number.isInteger(bounds.width) && bounds.width > 0 &&
    Number.isInteger(bounds.height) && bounds.height > 0 &&
    bounds.x + bounds.width <= canvas.width &&
    bounds.y + bounds.height <= canvas.height
  );
}

async function validateLayerSource(layer, canvas) {
  const label = layer.id;
  if (typeof layer.source !== 'string' || !layer.source) {
    fail(`${label} source path is required`);
    return;
  }

  const kind = layer.sourceKind ?? 'authored';
  if (!sourceKinds.has(kind)) fail(`${label} has invalid sourceKind: ${String(kind)}`);

  if (kind === 'derived') {
    if (typeof layer.generator !== 'string' || !layer.generator) {
      fail(`${label} derived source requires generator`);
    } else if (!existsSync(path.join(root, layer.generator))) {
      fail(`${label} generator missing at ${layer.generator}`);
    }
    if (!validBounds(layer.sourceBounds, canvas)) {
      fail(`${label} derived sourceBounds must be positive integers inside the master canvas`);
    }
  } else if (layer.sourceBounds !== undefined && !validBounds(layer.sourceBounds, canvas)) {
    fail(`${label} sourceBounds must be positive integers inside the master canvas`);
  }

  const sourcePath = resolveAsset(layer.source);
  if (!existsSync(sourcePath)) {
    softMissing(`${label} source missing at ${layer.source}`);
    return;
  }

  if (layer.sourceBounds) {
    const metadata = await sharp(sourcePath).metadata();
    if (metadata.width !== layer.sourceBounds.width || metadata.height !== layer.sourceBounds.height) {
      fail(
        `${label} source is ${metadata.width}x${metadata.height}; sourceBounds require ${layer.sourceBounds.width}x${layer.sourceBounds.height}`,
      );
    } else {
      ok(`${label} source dimensions match sourceBounds`);
    }
    if (!metadata.hasAlpha) fail(`${label} derived/source-bounds layer must contain alpha`);
  }
}

async function validateMaster(rig) {
  if (typeof rig.master !== 'string' || !rig.master) {
    fail('rig.master is required');
    return;
  }

  const masterPath = resolveAsset(rig.master);
  if (!existsSync(masterPath)) {
    fail(`NYX_MASTER missing at ${rig.master}`);
    return;
  }

  const info = await stat(masterPath);
  if (!info.isFile() || info.size === 0) {
    fail(`NYX_MASTER is empty at ${rig.master}`);
    return;
  }

  const metadata = await sharp(masterPath).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width !== rig.canvas?.width || height !== rig.canvas?.height) {
    fail(`NYX_MASTER is ${width}x${height}; rig canvas is ${rig.canvas?.width}x${rig.canvas?.height}`);
  } else {
    ok(`NYX_MASTER dimensions ${width}x${height}`);
  }

  if (!metadata.hasAlpha) fail('NYX_MASTER must have transparency');
  else ok('NYX_MASTER contains alpha');

  if (typeof rig.masterSha256 !== 'string' || rig.masterSha256.length !== 64) {
    fail('rig.masterSha256 must contain the approved SHA-256');
  } else {
    const actualHash = await sha256(masterPath);
    if (actualHash !== rig.masterSha256) fail(`NYX_MASTER SHA-256 mismatch: ${actualHash}`);
    else ok(`NYX_MASTER SHA-256 ${actualHash.slice(0, 12)}…`);
  }
}

if (!existsSync(rigPath)) {
  fail('assets/operator/nyx/rig.json is missing');
} else {
  try {
    const rig = JSON.parse(await readFile(rigPath, 'utf8'));

    if (rig.schemaVersion !== 1) fail(`unsupported NYX 2.5D rig schemaVersion: ${String(rig.schemaVersion)}`);
    else ok('NYX 2.5D rig schema version 1');

    if (rig.operatorId !== 'nyx') fail(`operatorId must be "nyx", got ${String(rig.operatorId)}`);

    if (typeof rig.sourceLock !== 'string' || !existsSync(resolveAsset(rig.sourceLock))) {
      fail(`approved source lock missing at ${rig.sourceLock ?? '(unset)'}`);
    } else {
      ok('approved NYX source lock exists');
    }

    if (!(Number.isInteger(rig.canvas?.width) && rig.canvas.width > 0)) fail('canvas.width must be a positive integer');
    if (!(Number.isInteger(rig.canvas?.height) && rig.canvas.height > 0)) fail('canvas.height must be a positive integer');
    if (rig.canvas?.resolutionPolicy !== 'approved-native') {
      fail('canvas.resolutionPolicy must be approved-native for the locked v1 source set');
    }

    await validateMaster(rig);

    const stateChecks = [
      ['external states', rig.stateContract?.external, requiredExternalStates],
      ['base states', rig.stateContract?.baseStates, requiredBaseStates],
      ['reactions', rig.stateContract?.reactions, requiredReactions],
      ['attention targets', rig.stateContract?.attentionTargets, requiredAttentionTargets],
    ];
    for (const [label, actual, required] of stateChecks) {
      const missing = hasAll(actual, required);
      if (missing.length) fail(`${label} missing: ${missing.join(', ')}`);
      else ok(`${label} contract complete`);
    }

    const layers = Array.isArray(rig.layers) ? rig.layers : [];
    if (!layers.length) fail('rig.layers must contain at least one layer');

    const ids = new Set();
    const renderOrders = new Map();
    let vertexBudget = 0;

    for (const [index, layer] of layers.entries()) {
      const label = layer?.id || `layer[${index}]`;
      if (typeof layer?.id !== 'string' || !layer.id.trim()) {
        fail(`layer[${index}] has no id`);
        continue;
      }
      if (ids.has(layer.id)) fail(`duplicate layer id: ${layer.id}`);
      ids.add(layer.id);

      if (!Number.isInteger(layer.renderOrder)) fail(`${label} renderOrder must be an integer`);
      else if (renderOrders.has(layer.renderOrder)) {
        fail(`${label} shares renderOrder ${layer.renderOrder} with ${renderOrders.get(layer.renderOrder)}`);
      } else {
        renderOrders.set(layer.renderOrder, layer.id);
      }

      if (!deformationPolicies.has(layer.deformationPolicy)) {
        fail(`${label} has invalid deformationPolicy: ${String(layer.deformationPolicy)}`);
      }
      if (!maskStrategies.has(layer.maskStrategy)) {
        fail(`${label} has invalid maskStrategy: ${String(layer.maskStrategy)}`);
      }
      if (typeof layer.renderGroup !== 'string' || !layer.renderGroup) fail(`${label} renderGroup is required`);
      if (typeof layer.batchGroup !== 'string' || !layer.batchGroup) fail(`${label} batchGroup is required`);
      if (!['base', 'effects'].includes(layer.atlas)) fail(`${label} atlas must be base or effects`);

      const columns = layer.mesh?.columns;
      const rows = layer.mesh?.rows;
      if (!(Number.isInteger(columns) && columns >= 1 && Number.isInteger(rows) && rows >= 1)) {
        fail(`${label} mesh columns/rows must be positive integers`);
      } else {
        vertexBudget += (columns + 1) * (rows + 1);
      }

      if (layer.pivot !== undefined) {
        if (!Array.isArray(layer.pivot) || layer.pivot.length !== 2 || !layer.pivot.every(isFinite01)) {
          fail(`${label} pivot must be [x,y] normalized to 0..1`);
        }
      } else if (strict) {
        fail(`${label} pivot is required in strict mode`);
      }

      await validateLayerSource(layer, rig.canvas);
    }

    const missingLayers = requiredLayers.filter((id) => !ids.has(id));
    if (missingLayers.length) fail(`required prototype layers missing: ${missingLayers.join(', ')}`);
    else ok('required prototype layer contract complete');

    const maxVertices = Number.isFinite(rig.runtime?.maxVertices) ? rig.runtime.maxVertices : 2000;
    if (vertexBudget > maxVertices) fail(`estimated grid vertices ${vertexBudget} exceed ${maxVertices} budget`);
    else ok(`estimated grid vertices ${vertexBudget}/${maxVertices}`);

    const face = layers.find((layer) => layer.id === 'face_base');
    if (face?.deformationPolicy !== 'rigid') fail('face_base must remain rigid');
    else ok('face_base protected as rigid');

    const runtimeFiles = [rig.runtime?.poster, 'manifest.json'].filter(Boolean);
    for (const file of runtimeFiles) {
      const fullPath = path.join(runtimeDir, file);
      if (!existsSync(fullPath)) {
        softMissing(`runtime master-stage output missing: public/operator/nyx-2d/${file}`);
        continue;
      }
      const info = await stat(fullPath);
      if (!info.isFile() || info.size === 0) fail(`runtime output is empty: ${file}`);
      else ok(`runtime output present: ${file}`);
    }

    const allLayerSourcesExist = layers.every((layer) => typeof layer.source === 'string' && existsSync(resolveAsset(layer.source)));
    if (allLayerSourcesExist) {
      for (const file of [rig.runtime?.baseAtlas, rig.runtime?.effectsAtlas].filter(Boolean)) {
        const fullPath = path.join(runtimeDir, file);
        if (!existsSync(fullPath)) softMissing(`runtime layered output missing: public/operator/nyx-2d/${file}`);
      }
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

console.log('');
if (failures) {
  console.error(`NYX 2.5D validation failed with ${failures} issue${failures === 1 ? '' : 's'}.`);
  process.exitCode = 1;
} else {
  console.log(`NYX 2.5D validation complete${warnings ? ` with ${warnings} warning${warnings === 1 ? '' : 's'}` : ''}.`);
}
