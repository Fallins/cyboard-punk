import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const rigPath = path.join(root, 'assets/operator/nyx/rig.json');
const runtimeDir = path.join(root, 'public/operator/nyx-2d');

const deformationPolicies = new Set(['rigid', 'transform-only', 'mesh-deform', 'effect-only']);
const maskStrategies = new Set(['source-alpha', 'shader-alpha-mask', 'stencil', 'none']);
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
  else warn(`${message} (allowed until final 2.5D art lands)`);
}

function isFinite01(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function hasAll(actual, required) {
  const set = new Set(actual ?? []);
  return required.filter((item) => !set.has(item));
}

function resolveAsset(relativePath) {
  return path.join(root, 'assets/operator/nyx', relativePath);
}

if (!existsSync(rigPath)) {
  fail('assets/operator/nyx/rig.json is missing');
} else {
  try {
    const rig = JSON.parse(await readFile(rigPath, 'utf8'));

    if (rig.schemaVersion !== 1) fail(`unsupported NYX 2.5D rig schemaVersion: ${String(rig.schemaVersion)}`);
    else ok('NYX 2.5D rig schema version 1');

    if (rig.operatorId !== 'nyx') fail(`operatorId must be "nyx", got ${String(rig.operatorId)}`);

    const masterPath = typeof rig.master === 'string' ? resolveAsset(rig.master) : null;
    if (!masterPath || !existsSync(masterPath)) softMissing(`NYX_MASTER missing at ${rig.master ?? '(unset)'}`);
    else ok('NYX_MASTER source exists');

    if (!(Number.isFinite(rig.canvas?.minWidth) && rig.canvas.minWidth >= 2048))
      fail('canvas.minWidth must be at least 2048');
    if (!(Number.isFinite(rig.canvas?.minHeight) && rig.canvas.minHeight >= 3072))
      fail('canvas.minHeight must be at least 3072');

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
      else if (renderOrders.has(layer.renderOrder))
        fail(`${label} shares renderOrder ${layer.renderOrder} with ${renderOrders.get(layer.renderOrder)}`);
      else renderOrders.set(layer.renderOrder, layer.id);

      if (!deformationPolicies.has(layer.deformationPolicy))
        fail(`${label} has invalid deformationPolicy: ${String(layer.deformationPolicy)}`);
      if (!maskStrategies.has(layer.maskStrategy))
        fail(`${label} has invalid maskStrategy: ${String(layer.maskStrategy)}`);
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
        if (!Array.isArray(layer.pivot) || layer.pivot.length !== 2 || !layer.pivot.every(isFinite01))
          fail(`${label} pivot must be [x,y] normalized to 0..1`);
      } else if (strict) {
        fail(`${label} pivot is required in strict mode`);
      }

      if (typeof layer.source !== 'string' || !layer.source) {
        fail(`${label} source path is required`);
      } else if (!existsSync(resolveAsset(layer.source))) {
        softMissing(`${label} source missing at ${layer.source}`);
      }
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

    const runtimeFiles = [
      rig.runtime?.baseAtlas,
      rig.runtime?.effectsAtlas,
      rig.runtime?.poster,
      'manifest.json',
    ].filter(Boolean);
    for (const file of runtimeFiles) {
      const fullPath = path.join(runtimeDir, file);
      if (!existsSync(fullPath)) {
        softMissing(`runtime output missing: public/operator/nyx-2d/${file}`);
        continue;
      }
      const info = await stat(fullPath);
      if (!info.isFile() || info.size === 0) fail(`runtime output is empty: ${file}`);
      else ok(`runtime output present: ${file}`);
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
