import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const root = process.cwd();
const assetDir = path.join(root, 'assets/operator/nyx');
const rigPath = path.join(assetDir, 'rig.json');
const outputDir = path.join(root, 'public/operator/nyx-2d');

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

function resolveAsset(relativePath) {
  return path.join(assetDir, relativePath);
}

if (!existsSync(rigPath)) {
  fail('assets/operator/nyx/rig.json is missing');
} else {
  const rig = JSON.parse(await readFile(rigPath, 'utf8'));
  const masterPath = typeof rig.master === 'string' ? resolveAsset(rig.master) : null;

  if (!masterPath || !existsSync(masterPath)) {
    fail(`approved NYX_MASTER is missing at ${rig.master ?? '(unset)'}`);
  } else {
    await mkdir(outputDir, { recursive: true });

    const missingLayerSources = (rig.layers ?? [])
      .filter((layer) => typeof layer.source !== 'string' || !existsSync(resolveAsset(layer.source)))
      .map((layer) => layer.id ?? layer.source ?? '(unknown)');
    const layerSourcesReady = missingLayerSources.length === 0;

    const posterPath = path.join(outputDir, rig.runtime?.poster ?? 'poster.webp');
    await sharp(masterPath)
      .webp({ quality: 95, alphaQuality: 100, smartSubsample: true })
      .toFile(posterPath);

    const manifest = {
      schemaVersion: rig.schemaVersion,
      operatorId: rig.operatorId,
      stage: layerSourcesReady ? 'layer-source-ready' : 'master',
      generatedFrom: 'assets/operator/nyx/rig.json',
      sourceLock: rig.sourceLock,
      master: {
        path: rig.master,
        sha256: rig.masterSha256,
        width: rig.canvas?.width,
        height: rig.canvas?.height,
        resolutionPolicy: rig.canvas?.resolutionPolicy,
      },
      stateContract: rig.stateContract,
      runtime: rig.runtime,
      layerSourcesReady,
      missingLayerSources,
      layers: (rig.layers ?? []).map((layer) => ({
        id: layer.id,
        atlas: layer.atlas,
        pivot: layer.pivot ?? null,
        anchor: layer.anchor ?? null,
        renderOrder: layer.renderOrder,
        mesh: layer.mesh,
        maskStrategy: layer.maskStrategy,
        deformationPolicy: layer.deformationPolicy,
        renderGroup: layer.renderGroup,
        batchGroup: layer.batchGroup,
        sourceAssetPath: layer.source,
        sourceReady: typeof layer.source === 'string' && existsSync(resolveAsset(layer.source)),
      })),
    };

    await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    console.log(`✓ emitted public/operator/nyx-2d/${path.basename(posterPath)} from approved NYX_MASTER`);
    console.log('✓ emitted public/operator/nyx-2d/manifest.json');

    if (!layerSourcesReady) {
      console.log(`! master-stage build: ${missingLayerSources.length} layer source(s) still need extraction / reconstruction`);
      console.log('! base.webp and effects.webp remain gated by the static fidelity layer pass');
    } else {
      console.log('✓ all declared layer sources are present');
      console.log('! atlas packing is the next build step; do not hand-maintain runtime atlases');
    }
  }
}
