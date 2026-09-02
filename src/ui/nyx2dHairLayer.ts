import * as THREE from 'three';
import { NYX_2D_MASTER, NYX_2D_RIG_ZONES, type Nyx2DRect } from './nyx2dRig';

export interface Nyx2DHairOverlayMask {
  alphaMap: THREE.DataTexture;
  maskedPixels: number;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function rectContains(rect: Nyx2DRect, u: number, v: number): boolean {
  return u >= rect.left && u <= rect.right && v >= rect.bottom && v <= rect.top;
}

function normalizedAcross(rect: Nyx2DRect, u: number): number {
  return (u - rect.left) / Math.max(1e-8, rect.right - rect.left);
}

function normalizedUp(rect: Nyx2DRect, v: number): number {
  return (v - rect.bottom) / Math.max(1e-8, rect.top - rect.bottom);
}

export function nyx2DHairZoneWeight(u: number, v: number): number {
  const left = NYX_2D_RIG_ZONES.hairOuterLeft;
  const crown = NYX_2D_RIG_ZONES.hairCrown;
  const right = NYX_2D_RIG_ZONES.hairOuterRight;

  let weight = 0;
  if (rectContains(left, u, v)) {
    // Strongest at the outside silhouette, fading toward the protected face.
    weight = Math.max(weight, smoothstep(0.08, 0.82, 1 - normalizedAcross(left, u)));
  }
  if (rectContains(right, u, v)) {
    weight = Math.max(weight, smoothstep(0.08, 0.82, normalizedAcross(right, u)));
  }
  if (rectContains(crown, u, v)) {
    // Crown follow-through is concentrated on the upper silhouette; pixels near
    // the forehead boundary receive very little weight.
    weight = Math.max(weight, smoothstep(0.12, 0.88, normalizedUp(crown, v)) * 0.82);
  }
  return Math.max(0, Math.min(1, weight));
}

export function nyx2DHairConfidence(r: number, g: number, b: number, a: number): number {
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
      const zoneWeight = nyx2DHairZoneWeight(u, v);
      if (zoneWeight <= 0.001) continue;

      const sourceOffset = (y * canvas.width + x) * 4;
      const r = source[sourceOffset] / 255;
      const g = source[sourceOffset + 1] / 255;
      const b = source[sourceOffset + 2] / 255;
      const a = source[sourceOffset + 3] / 255;
      const confidence = nyx2DHairConfidence(r, g, b, a) * zoneWeight;
      if (confidence <= 0.035) continue;

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
    // This is deliberately an accent/follow-through layer, not a duplicate of
    // the entire hairstyle. Keeping opacity modest reduces visible ghosting while
    // we validate the mask before any destructive base-hair partition exists.
    opacity: 0.42,
    alphaTest: 0.02,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

export const NYX_2D_HAIR_PIVOT = {
  x: (470 / NYX_2D_MASTER.width - 0.5) * (NYX_2D_MASTER.width / NYX_2D_MASTER.height),
  y: 1 - 102 / NYX_2D_MASTER.height - 0.5,
} as const;
