import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'src/ui/nyx2dFaceOverlayGate.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const errors = [];

const fail = (message) => errors.push(message);
const sha256Pattern = /^[a-f0-9]{64}$/i;

if (manifest.schemaVersion !== 1) fail(`schemaVersion must be 1, got ${manifest.schemaVersion}`);
if (manifest.policy !== 'approved-source-only-no-synthetic-reconstruction') {
  fail(`unexpected facial overlay policy: ${manifest.policy}`);
}
if (manifest.master?.width !== 941 || manifest.master?.height !== 1672) {
  fail(`facial overlay gate must target canonical 941x1672 master, got ${manifest.master?.width}x${manifest.master?.height}`);
}
if (!sha256Pattern.test(manifest.master?.sha256 ?? '')) fail('canonical master SHA-256 is missing or malformed');

const blink = manifest.blink;
if (!blink || !['blocked', 'ready'].includes(blink.status)) {
  fail(`blink.status must be blocked or ready, got ${blink?.status}`);
}
if (!Array.isArray(blink?.requiredEvidence) || blink.requiredEvidence.length < 6) {
  fail('blink.requiredEvidence must document the complete graduation evidence');
}
if (!Array.isArray(blink?.approvedAssets)) fail('blink.approvedAssets must be an array');

const validateApprovedAsset = async (asset, index) => {
  const label = `blink.approvedAssets[${index}]`;
  if (!asset || typeof asset !== 'object') {
    fail(`${label} must be an object`);
    return;
  }
  if (typeof asset.path !== 'string' || !asset.path.trim()) {
    fail(`${label}.path is required`);
    return;
  }
  if (!sha256Pattern.test(asset.sha256 ?? '')) fail(`${label}.sha256 is missing or malformed`);
  if (asset.width !== 941 || asset.height !== 1672) {
    fail(`${label} must be aligned to the full 941x1672 master coordinate space`);
  }
  if (!Array.isArray(asset.leftEyePx) || asset.leftEyePx.length !== 2) fail(`${label}.leftEyePx must be [x,y]`);
  if (!Array.isArray(asset.rightEyePx) || asset.rightEyePx.length !== 2) fail(`${label}.rightEyePx must be [x,y]`);

  for (const [name, point] of [['leftEyePx', asset.leftEyePx], ['rightEyePx', asset.rightEyePx]]) {
    if (!Array.isArray(point) || point.length !== 2) continue;
    const [x, y] = point;
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x >= 941 || y < 0 || y >= 1672) {
      fail(`${label}.${name} must lie inside the canonical master`);
    }
  }
  if (Array.isArray(asset.leftEyePx) && Array.isArray(asset.rightEyePx) && asset.leftEyePx[0] >= asset.rightEyePx[0]) {
    fail(`${label} eye landmarks are reversed`);
  }

  const assetPath = resolve(root, asset.path);
  if (!existsSync(assetPath)) {
    fail(`${label} file does not exist: ${asset.path}`);
    return;
  }

  const bytes = readFileSync(assetPath);
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== asset.sha256) fail(`${label} SHA-256 mismatch for ${asset.path}`);

  const { default: sharp } = await import('sharp');
  const metadata = await sharp(bytes).metadata();
  if (metadata.width !== 941 || metadata.height !== 1672) {
    fail(`${label} decoded as ${metadata.width}x${metadata.height}; expected 941x1672`);
  }
  if (!metadata.hasAlpha) fail(`${label} must contain a real alpha channel`);
};

if (blink?.status === 'blocked') {
  if (blink.approvedAssets?.length) fail('blocked blink gate must not list approvedAssets');
} else if (blink?.status === 'ready') {
  if (!blink.approvedAssets?.length) fail('ready blink gate requires at least one approved source-derived asset');
  for (let index = 0; index < (blink.approvedAssets?.length ?? 0); index += 1) {
    await validateApprovedAsset(blink.approvedAssets[index], index);
  }
}

if (errors.length) {
  console.error('NYX facial overlay gate validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`NYX facial overlay gate: ${blink.status.toUpperCase()} (${blink.approvedAssets.length} approved assets)`);
