import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const root = process.cwd();
const assetDir = path.join(root, 'assets/operator/nyx');
const rig = JSON.parse(await readFile(path.join(assetDir, 'rig.json'), 'utf8'));
const masterPath = path.join(assetDir, rig.master);
const layerDir = path.join(assetDir, 'source/layers');
const suitCrop = { left: 253, top: 220, width: 443, height: 1186 };
const coreCrop = { left: 388, top: 301, width: 66, height: 83 };

function rgbToHsvDegrees(r8, g8, b8) {
  const r = r8 / 255;
  const g = g8 / 255;
  const b = b8 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;

  if (delta > 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;

  return { h: hue, s: max === 0 ? 0 : delta / max, v: max };
}

function isNeonHue(hue) {
  return (hue >= 150 && hue <= 216) || (hue >= 236 && hue <= 358);
}

function isCoreHue(hue) {
  return hue >= 230 || hue <= 16;
}

async function sha256(filePath) {
  const bytes = await readFile(filePath);
  return createHash('sha256').update(bytes).digest('hex');
}

async function writeCroppedLosslessWebp(buffer, info, crop, outputName) {
  await sharp(buffer, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract(crop)
    .webp({ lossless: true, effort: 6 })
    .toFile(path.join(layerDir, outputName));
}

const actualMasterHash = await sha256(masterPath);
if (actualMasterHash !== rig.masterSha256) {
  throw new Error(`NYX master hash mismatch; expected ${rig.masterSha256}, got ${actualMasterHash}`);
}

const { data, info } = await sharp(masterPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
if (info.width !== rig.canvas.width || info.height !== rig.canvas.height || info.channels !== 4) {
  throw new Error(`unexpected NYX master raster ${info.width}x${info.height}x${info.channels}`);
}

const pixelCount = info.width * info.height;
const high = new Uint8Array(pixelCount);
const low = new Uint8Array(pixelCount);
const core = new Uint8Array(pixelCount);

for (let y = 0; y < info.height; y += 1) {
  for (let x = 0; x < info.width; x += 1) {
    const pixel = y * info.width + x;
    const offset = pixel * 4;
    const alpha = data[offset + 3];
    if (alpha <= 10) continue;

    const hsv = rgbToHsvDegrees(data[offset], data[offset + 1], data[offset + 2]);
    const neonHue = isNeonHue(hsv.h);

    if (y >= 225 && hsv.s > 140 / 255 && hsv.v > 145 / 255 && neonHue) high[pixel] = 1;
    if (y >= 220 && hsv.s > 90 / 255 && hsv.v > 105 / 255 && neonHue) low[pixel] = 1;

    if (
      x >= 392 && x <= 450 && y >= 305 && y <= 390 &&
      hsv.s > 80 / 255 && hsv.v > 105 / 255 && isCoreHue(hsv.h)
    ) {
      core[pixel] = 1;
    }
  }
}

const suitOutput = Buffer.alloc(pixelCount * 4);
const coreOutput = Buffer.alloc(pixelCount * 4);

for (let y = 0; y < info.height; y += 1) {
  for (let x = 0; x < info.width; x += 1) {
    const pixel = y * info.width + x;
    const offset = pixel * 4;

    if (low[pixel]) {
      let touchesHigh = false;
      for (let dy = -1; dy <= 1 && !touchesHigh; dy += 1) {
        const ny = y + dy;
        if (ny < 0 || ny >= info.height) continue;
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          if (nx < 0 || nx >= info.width) continue;
          if (high[ny * info.width + nx]) {
            touchesHigh = true;
            break;
          }
        }
      }
      if (touchesHigh) data.copy(suitOutput, offset, offset, offset + 4);
    }

    if (core[pixel]) data.copy(coreOutput, offset, offset, offset + 4);
  }
}

await mkdir(layerDir, { recursive: true });
await writeCroppedLosslessWebp(suitOutput, info, suitCrop, 'suit_emissive.webp');
await writeCroppedLosslessWebp(coreOutput, info, coreCrop, 'core_glow.webp');

console.log(`✓ extracted source/layers/suit_emissive.webp @ ${JSON.stringify(suitCrop)}`);
console.log(`✓ extracted source/layers/core_glow.webp @ ${JSON.stringify(coreCrop)}`);
console.log('! effect extraction is non-generative; anatomical layer extraction remains gated by static fidelity QA');
