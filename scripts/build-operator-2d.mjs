import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
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

async function generateMissingDerivedSources(rig) {
  const generators = new Set(
    (rig.layers ?? [])
      .filter(
        (layer) =>
          layer.sourceKind === 'derived' &&
          typeof layer.generator === 'string' &&
          typeof layer.source === 'string' &&
          !existsSync(resolveAsset(layer.source)),
      )
      .map((layer) => layer.generator),
  );

  for (const generator of generators) {
    const generatorPath = path.join(root, generator);
    if (!existsSync(generatorPath)) throw new Error(`derived-source generator missing: ${generator}`);
    const { stdout, stderr } = await execFileAsync(process.execPath, [generatorPath], { cwd: root });
    if (stdout.trim()) process.stdout.write(stdout);
    if (stderr.trim()) process.stderr.write(stderr);
  }
}

if (!existsSync(rigPath)) {
  fail('assets/operator/nyx/rig.json is missing');
} else {
  try {
    const rig = JSON.parse(await readFile(rigPath, 'utf8'));
    const masterPath = typeof rig.master === 'string' ? resolveAsset(rig.master) : null;

    if (!masterPath || !existsSync(masterPath)) {
      fail(`approved NYX_MASTER is missing at ${rig.master ?? '(unset)'}`);
    } else {
      await mkdir(outputDir, { recursive: true });
      await generateMissingDerivedSources(rig);

      const layers = rig.layers ?? [];
      const missingLayerSources = layers
        .filter((layer) => typeof layer.source !== 'string' || !existsSync(resolveAsset(layer.source)))
        .map((layer) => layer.id ?? layer.source ?? '(unknown)');
      const layerSourcesReady = missingLayerSources.length === 0;
      const derivedLayers = layers.filter((layer) => layer.sourceKind === 'derived');
      const derivedSourcesReady = derivedLayers.every(
        (layer) => typeof layer.source === 'string' && existsSync(resolveAsset(layer.source)),
      );

      const posterPath = path.join(outputDir, rig.runtime?.poster ?? 'poster.webp');
      await copyFile(masterPath, posterPath);

      const manifest = {
        schemaVersion: rig.schemaVersion,
        operatorId: rig.operatorId,
        stage: layerSourcesReady ? 'layer-source-ready' : derivedSourcesReady ? 'master-effects' : 'master',
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
        derivedSourcesReady,
        missingLayerSources,
        layers: layers.map((layer) => ({
          id: layer.id,
          atlas: layer.atlas,
          pivot: layer.pivot ?? null,
          anchor: layer.anchor ?? null,
          sourceBounds: layer.sourceBounds ?? null,
          sourceKind: layer.sourceKind ?? 'authored',
          generator: layer.generator ?? null,
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

      console.log(`✓ emitted public/operator/nyx-2d/${path.basename(posterPath)} as a lossless copy of approved NYX_MASTER`);
      console.log('✓ emitted public/operator/nyx-2d/manifest.json');
      if (derivedSourcesReady && derivedLayers.length) {
        console.log(`✓ ${derivedLayers.length} deterministic effect source(s) ready`);
      }

      if (!layerSourcesReady) {
        console.log(`! ${missingLayerSources.length} authored anatomical layer source(s) still need extraction / reconstruction`);
        console.log('! base.webp and effects.webp remain gated by the static fidelity layer pass');
      } else {
        console.log('✓ all declared layer sources are present');
        console.log('! atlas packing is the next build step; do not hand-maintain runtime atlases');
      }
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}
