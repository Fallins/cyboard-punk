import { describe, expect, it } from 'vitest';
import { nyx2DRigDebugEnabled } from './nyx2dDebug';

describe('nyx2DRigDebugEnabled', () => {
  it('only enables explicit debug values', () => {
    expect(nyx2DRigDebugEnabled('1')).toBe(true);
    expect(nyx2DRigDebugEnabled('true')).toBe(true);
    expect(nyx2DRigDebugEnabled('ON')).toBe(true);
    expect(nyx2DRigDebugEnabled('0')).toBe(false);
    expect(nyx2DRigDebugEnabled(undefined)).toBe(false);
  });
});
