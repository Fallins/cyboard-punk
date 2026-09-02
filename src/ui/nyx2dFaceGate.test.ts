import { describe, expect, it } from 'vitest';
import {
  nyx2DFaceGateManifest,
  nyx2DFacialFeatureBlockReason,
  nyx2DFacialFeatureReady,
} from './nyx2dFaceGate';

describe('NYX 2D facial overlay asset gate', () => {
  it('locks the gate to the canonical NYX master', () => {
    const manifest = nyx2DFaceGateManifest();
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.policy).toBe('approved-source-only-no-synthetic-reconstruction');
    expect(manifest.master).toEqual({
      width: 941,
      height: 1672,
      sha256: '6ef57008ba843a57b614d148f4055c9fdf9235f303117098ac3e13387041f263',
    });
  });

  it('keeps blink blocked without an approved source-overlay implementation', () => {
    const manifest = nyx2DFaceGateManifest();
    expect(manifest.blink.status).toBe('blocked');
    expect(manifest.blink.implementation).toBe('none');
    expect(manifest.blink.approvedAssets).toEqual([]);
    expect(nyx2DFacialFeatureReady('blink')).toBe(false);
    expect(nyx2DFacialFeatureBlockReason('blink')).toContain('No approved source-derived');
  });

  it('documents the visual and implementation evidence required before graduation', () => {
    const evidence = nyx2DFaceGateManifest().blink.requiredEvidence.join('\n').toLowerCase();
    expect(evidence).toContain('sha-256');
    expect(evidence).toContain('alignment');
    expect(evidence).toContain('neutral frame');
    expect(evidence).toContain('source-overlay');
    expect(evidence).toContain('no sclera reconstruction');
    expect(evidence).toContain('no black-eye patch');
  });
});
