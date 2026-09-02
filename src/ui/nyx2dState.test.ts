import { describe, expect, it } from 'vitest';
import { nyx2DEmissiveIntensity } from './nyx2dState';

describe('nyx2DEmissiveIntensity', () => {
  it('keeps offline dimmest and success brightest', () => {
    expect(nyx2DEmissiveIntensity('offline')).toBe(0.05);
    expect(nyx2DEmissiveIntensity('idle')).toBe(0.16);
    expect(nyx2DEmissiveIntensity('observing')).toBe(0.24);
    expect(nyx2DEmissiveIntensity('processing')).toBe(0.34);
    expect(nyx2DEmissiveIntensity('warning')).toBe(0.48);
    expect(nyx2DEmissiveIntensity('success')).toBe(0.58);
  });
});
