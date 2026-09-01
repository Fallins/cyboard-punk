import { copyFile, mkdir, rename, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const args = process.argv.slice(2);

function usage() {
  console.error('Usage: bun run operator:intake -- <nyx|axon> /path/to/model.glb [/path/to/poster.webp]');
}

if (args.length < 2) {
  usage();
  process.exit(2);
}

const operatorId = args[0]?.toLowerCase();
const sourceGlb = args[1] ? path.resolve(args[1]) : '';
const sourcePoster = args[2] ? path.resolve(args[2]) : undefined;

if (!['nyx', 'axon'].includes(operatorId)) {
  console.error(`Unsupported operator '${operatorId}'.`);
  usage();
  process.exit(2);
}

if (!existsSync(sourceGlb)) {
  console.error(`GLB does not exist: ${sourceGlb}`);
  process.exit(2);
}
if (path.extname(sourceGlb).toLowerCase() !== '.glb') {
  console.error('Candidate model must use the .glb extension.');
  process.exit(2);
}
if (sourcePoster && !existsSync(sourcePoster)) {
  console.error(`Poster does not exist: ${sourcePoster}`);
  process.exit(2);
}
if (sourcePoster && path.extname(sourcePoster).toLowerCase() !== '.webp') {
  console.error('Poster candidate must use the .webp extension.');
  process.exit(2);
}

const destinationDir = path.join(root, 'public', 'operator', operatorId);
const destinationGlb = path.join(destinationDir, `${operatorId}.glb`);
const destinationPoster = path.join(destinationDir, 'poster.webp');
const backupGlb = `${destinationGlb}.cyboard-backup`;
const backupPoster = `${destinationPoster}.cyboard-backup`;

async function backupIfPresent(target, backup) {
  await rm(backup, { force: true });
  if (existsSync(target)) await rename(target, backup);
}

async function restore(target, backup) {
  await rm(target, { force: true });
  if (existsSync(backup)) await rename(backup, target);
}

async function discardBackup(backup) {
  await rm(backup, { force: true });
}

await mkdir(destinationDir, { recursive: true });
await backupIfPresent(destinationGlb, backupGlb);
if (sourcePoster) await backupIfPresent(destinationPoster, backupPoster);

let committed = false;
try {
  await copyFile(sourceGlb, destinationGlb);
  if (sourcePoster) await copyFile(sourcePoster, destinationPoster);

  const info = await stat(destinationGlb);
  console.log(`Staged ${operatorId.toUpperCase()} candidate: ${(info.size / 1024 / 1024).toFixed(2)} MB`);

  const validation = spawnSync(process.execPath, ['scripts/validate-operator-assets.mjs'], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
  });

  if (validation.error) throw validation.error;
  if (validation.status !== 0) {
    throw new Error(`operator validation exited with code ${validation.status ?? 'unknown'}`);
  }

  committed = true;
  await discardBackup(backupGlb);
  if (sourcePoster) await discardBackup(backupPoster);
  console.log(`✓ ${operatorId.toUpperCase()} candidate accepted at ${path.relative(root, destinationGlb)}`);
  if (sourcePoster) console.log(`✓ poster accepted at ${path.relative(root, destinationPoster)}`);
  console.log('Next: run `bun run tauri dev` and complete the real-device operator smoke test.');
} catch (error) {
  console.error(`✗ Candidate rejected: ${error instanceof Error ? error.message : String(error)}`);
  await restore(destinationGlb, backupGlb);
  if (sourcePoster) await restore(destinationPoster, backupPoster);
  console.error('Previous production asset restored.');
  process.exitCode = 1;
} finally {
  if (!committed) {
    await discardBackup(backupGlb);
    if (sourcePoster) await discardBackup(backupPoster);
  }
}
