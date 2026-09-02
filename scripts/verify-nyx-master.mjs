import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const masterPath = path.join(root, 'assets/operator/nyx/source/master.webp');
const sourceLockPath = path.join(root, 'assets/operator/nyx/source-lock.json');

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

try {
  const [bytes, sourceLockBytes] = await Promise.all([
    readFile(masterPath),
    readFile(sourceLockPath, 'utf8'),
  ]);
  const sourceLock = JSON.parse(sourceLockBytes);
  const expected = sourceLock.masterReconstruction?.canonicalMaster;

  if (!expected) throw new Error('canonical master metadata missing from source-lock.json');

  const actualHash = createHash('sha256').update(bytes).digest('hex');
  const declaredRiffSize =
    bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
      ? bytes.readUInt32LE(4) + 8
      : null;
  const webpTag = bytes.length >= 12 ? bytes.subarray(8, 12).toString('ascii') : '';

  if (bytes.length !== expected.bytes) {
    fail(`NYX master byte length mismatch: ${bytes.length} != ${expected.bytes}`);
  }
  if (declaredRiffSize !== null && declaredRiffSize !== bytes.length) {
    fail(`NYX master is truncated: RIFF declares ${declaredRiffSize} bytes, file contains ${bytes.length}`);
  }
  if (webpTag !== 'WEBP') {
    fail(`NYX master is not a WEBP RIFF payload (tag=${JSON.stringify(webpTag)})`);
  }
  if (actualHash !== expected.sha256) {
    fail(`NYX master SHA-256 mismatch: ${actualHash} != ${expected.sha256}`);
  }

  if (!process.exitCode) {
    console.log(`✓ NYX master integrity OK (${bytes.length} bytes)`);
    console.log(`✓ SHA-256 ${actualHash}`);
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
