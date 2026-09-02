import * as THREE from 'three';
import { NYX_2D_MASTER, NYX_2D_RIG_ZONES } from './nyx2dRig';

export interface Nyx2DHairOverlayMask {
  alphaMap: THREE.DataTexture;
  maskedPixels: number;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function insideSafeZone(u: number, v: number): boolean {
  for (const name of ['hairOuterLeft', 'hairCrown', 'hairOuterRight'] as const) {
    const rect = NYX_2D_RIG_ZONES[name];
    if (u >= rect.left && u <= rect.right && v >= rect.bottom && v <= rect.top) return true;
  }
  return false;
}

function hairConfidence(r: number, g: number, b: number, a: number): number {
  if (a <= 0.01) return 0;
  const maxChannel = Math.max(r, g, b);
  const minChannel = Math.min(r, g, b);
  const chroma = maxChannel - minChannel;
  const purple = smoothstep(0.025, 0.15, Math.min(r, b) - g * 0.72);
  const saturated = smoothstep(0.035, 0.18, chroma);
  const notNeon = 1 - smoothstep(0.78, 0.98, maxChannel);
  return a * purple * saturated * Math.max(0.28, notNeon);
}

export function createNyx2DHairOverlayMask(image: HTMLImageElement): Nyx2DHairOverlayMask | null {
  const canvas = document.createElement('canvas');
  canvas.width = NYX_2D_MASTER.width;
  canvas.height = NYX_2D_MASTER.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const source = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const output = new Uint8Array(canvas.width * canvas.height * 4);
  let maskedPixels = 0;

  for (let y = 0; y < canvas.height; y += 1) {
    const v = 1 - (y + 0.5) / canvas.height;
    const targetY = canvas.height - 1 - y;
    for (let x = 0; x < canvas.width; x += 1) {
      const u = (x + 0.5) / canvas.width;
      if (!insideSafeZone(u, v)) continue;

      const sourceOffset = (y * canvas.width + x) * 4;
      const r = source[sourceOffset] / 255;
      const g = source[sourceOffset + 1] / 255;
      const b = source[sourceOffset + 2] / 255;
      const a = source[sourceOffset + 3] / 255;
      const confidence = hairConfidence(r, g, b, a);
      if (confidence <= 0.015) continue;

      const value = Math.max(0, Math.min(255, Math.round(confidence * 255)));
      const outputOffset = (targetY * canvas.width + x) * 4;
      output[outputOffset] = value;
      output[outputOffset + 1] = value;
      output[outputOffset + 2] = value;
      output[outputOffset + 3] = 255;
      maskedPixels += 1;
    }
  }

  const alphaMap = new THREE.DataTexture(
    output,
    canvas.width,
    canvas.height,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  alphaMap.colorSpace = THREE.NoColorSpace;
  alphaMap.minFilter = THREE.LinearFilter;
  alphaMap.magFilter = THREE.LinearFilter;
  alphaMap.wrapS = THREE.ClampToEdgeWrapping;
  alphaMap.wrapT = THREE.ClampToEdgeWrapping;
  alphaMap.generateMipmaps = false;
  alphaMap.needsUpdate = true;

  return { alphaMap, maskedPixels };
}

export function createNyx2DHairOverlayMaterial(
  map: THREE.Texture,
  alphaMap: THREE.Texture,
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map,
    alphaMap,
    transparent: true,
    opacity: 0.62,
    alphaTest: 0.008,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

export const NYX_2D_HAIR_PIVOT = {
  x: (470 / NYX_2D_MASTER.width - 0.5) * (NYX_2D_MASTER.width / NYX_2D_MASTER.height),
  y: 1 - 102 / NYX_2D_MASTER.height - 0.5,
} as const;
