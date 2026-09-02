import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const rigPath = path.join(root, 'assets/operator/nyx/rig.json');
const outputDir = path.join(root, 'public/operator/nyx-2d');

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

if (!existsSync(rigPath)) {
  fail('assets/operator/nyx/rig.json is missing');
} else {
  const rig = JSON.parse(await readFile(rigPath, 'utf8'));
  const missingSources = [];

  if (!existsSync(path.join(root, 'assets/operator/nyx', rig.master))) {
    missingSources.push(rig.master);
  }

  for (const layer of rig.layers ?? []) {
    if (!existsSync(path.join(root, 'assets/operator/nyx', layer.source))) missingSources.push(layer.source);
  }

  if (missingSources.length) {
    console.error('NYX 2.5D source art is not complete; build stopped before emitting partial runtime assets.');
    for (const source of missingSources) console.error(`  - ${source}`);
    console.error('Finish NYX_MASTER and prototype layer extraction first, then rerun bun run operator:build:2d.');
    process.exitCode = 1;
  } else {
    await mkdir(outputDir, { recursive: true });

    const manifest = {
      schemaVersion: rig.schemaVersion,
      operatorId: rig.operatorId,
      generatedFrom: 'assets/operator/nyx/rig.json',
      stateContract: rig.stateContract,
      runtime: rig.runtime,
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
      })),
    };

    await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    console.log('✓ emitted public/operator/nyx-2d/manifest.json');
    console.log('! atlas packing is intentionally gated until final source layers include measured bounds / pivots');
    console.log('! no base.webp, effects.webp, or poster.webp were emitted by this scaffold');
  }
}
