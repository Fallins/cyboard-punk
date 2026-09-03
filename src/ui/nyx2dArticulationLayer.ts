import * as THREE from 'three';
import type { Nyx2DArticulationPose } from './nyx2dArticulation';

const MASTER_WIDTH = 941;
const MASTER_HEIGHT = 1672;
const MASTER_ASPECT = MASTER_WIDTH / MASTER_HEIGHT;

export const NYX_2D_FOREARM_ERASE_EXPANSION_PX = 14;
const ERASE_EXPANSION_START_Y_OFFSET_PX = 22;

interface SourcePoint {
  x: number;
  y: number;
}

interface ForearmSpec {
  elbow: SourcePoint;
  crop: { left: number; top: number; right: number; bottom: number };
  polygon: SourcePoint[];
}

/**
 * Forearm-only source-safe segmentation. Upper arms, shoulders and torso remain
 * canonical. The same polygon is used for the movable source layer and the body
 * erase footprint. The body erase additionally hard-clears a small outward band
 * below the elbow to remove source antialias/neon/hand fringes that otherwise
 * remain visible after the forearm moves.
 */
const LEFT_FOREARM: ForearmSpec = {
  elbow: { x: 307, y: 590 },
  crop: { left: 210, top: 565, right: 345, bottom: 915 },
  polygon: [
    { x: 283, y: 574 },
    { x: 329, y: 576 },
    { x: 323, y: 624 },
    { x: 310, y: 688 },
    { x: 296, y: 752 },
    { x: 286, y: 810 },
    { x: 279, y: 847 },
    { x: 292, y: 875 },
    { x: 285, y: 897 },
    { x: 268, y: 909 },
    { x: 253, y: 901 },
    { x: 244, y: 909 },
    { x: 229, y: 897 },
    { x: 220, y: 877 },
    { x: 221, y: 849 },
    { x: 230, y: 818 },
    { x: 239, y: 785 },
    { x: 250, y: 746 },
    { x: 263, y: 696 },
    { x: 275, y: 638 },
  ],
};

const RIGHT_FOREARM: ForearmSpec = {
  elbow: { x: 625, y: 580 },
  crop: { left: 595, top: 550, right: 725, bottom: 915 },
  polygon: [
    { x: 605, y: 560 },
    { x: 646, y: 562 },
    { x: 652, y: 615 },
    { x: 662, y: 674 },
    { x: 674, y: 731 },
    { x: 686, y: 788 },
    { x: 699, y: 831 },
    { x: 716, y: 856 },
    { x: 715, y: 881 },
    { x: 702, y: 904 },
    { x: 685, y: 913 },
    { x: 670, y: 903 },
    { x: 659, y: 884 },
    { x: 648, y: 873 },
    { x: 646, y: 844 },
    { x: 650, y: 815 },
    { x: 644, y: 778 },
    { x: 637, y: 731 },
    { x: 629, y: 684 },
    { x: 619, y: 626 },
  ],
};

const FOREARMS = [LEFT_FOREARM, RIGHT_FOREARM] as const;

export interface Nyx2DArticulationLayer {
  root: THREE.Group;
  leftElbow: THREE.Group;
  rightElbow: THREE.Group;
  textures: THREE.CanvasTexture[];
  materials: THREE.MeshBasicMaterial[];
}

function sourceToWorld(point: SourcePoint): THREE.Vector2 {
  return new THREE.Vector2(
    (point.x / MASTER_WIDTH - 0.5) * MASTER_ASPECT,
    0.5 - point.y / MASTER_HEIGHT,
  );
}

function drawPolygon(
  context: CanvasRenderingContext2D,
  points: readonly SourcePoint[],
  offsetX = 0,
  offsetY = 0,
): void {
  const first = points[0];
  if (!first) return;
  context.beginPath();
  context.moveTo(first.x - offsetX, first.y - offsetY);
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    context.lineTo(point.x - offsetX, point.y - offsetY);
  }
  context.closePath();
}

function createForearmEraseMask(): HTMLCanvasElement | null {
  const mask = document.createElement('canvas');
  mask.width = MASTER_WIDTH;
  mask.height = MASTER_HEIGHT;
  const context = mask.getContext('2d');
  if (!context) return null;

  context.fillStyle = '#fff';
  context.strokeStyle = '#fff';
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (const spec of FOREARMS) {
    // Exact authored footprint first.
    drawPolygon(context, spec.polygon);
    context.fill();

    // Expand only below the elbow. This deliberately removes every source
    // antialias/neon/hand fringe while keeping the elbow/upper-arm seam tight.
    context.save();
    context.beginPath();
    context.rect(
      0,
      spec.elbow.y + ERASE_EXPANSION_START_Y_OFFSET_PX,
      MASTER_WIDTH,
      MASTER_HEIGHT,
    );
    context.clip();
    context.lineWidth = NYX_2D_FOREARM_ERASE_EXPANSION_PX * 2;
    drawPolygon(context, spec.polygon);
    context.stroke();
    context.restore();
  }

  return mask;
}

/**
 * Canvas destination-out keeps antialiased edge pixels partially alive, which
 * was visible as neon/hand ghost silhouettes after articulation. Use a binary
 * mask pass instead: any touched erase-mask pixel becomes fully transparent.
 */
function hardClearForearmFootprints(context: CanvasRenderingContext2D): boolean {
  const mask = createForearmEraseMask();
  const maskContext = mask?.getContext('2d');
  if (!mask || !maskContext) return false;

  const source = context.getImageData(0, 0, MASTER_WIDTH, MASTER_HEIGHT);
  const erase = maskContext.getImageData(0, 0, MASTER_WIDTH, MASTER_HEIGHT);
  const sourceData = source.data;
  const eraseData = erase.data;

  for (let offset = 0; offset < sourceData.length; offset += 4) {
    if (eraseData[offset + 3] === 0) continue;
    sourceData[offset] = 0;
    sourceData[offset + 1] = 0;
    sourceData[offset + 2] = 0;
    sourceData[offset + 3] = 0;
  }

  context.putImageData(source, 0, 0);
  return true;
}

export function createNyx2DArticulatedBodyTexture(image: HTMLImageElement): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = MASTER_WIDTH;
  canvas.height = MASTER_HEIGHT;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(image, 0, 0, MASTER_WIDTH, MASTER_HEIGHT);
  if (!hardClearForearmFootprints(context)) return null;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function createForearmTexture(image: HTMLImageElement, spec: ForearmSpec): THREE.CanvasTexture | null {
  const width = spec.crop.right - spec.crop.left;
  const height = spec.crop.bottom - spec.crop.top;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.drawImage(
    image,
    spec.crop.left,
    spec.crop.top,
    width,
    height,
    0,
    0,
    width,
    height,
  );
  context.save();
  context.globalCompositeOperation = 'destination-in';
  context.fillStyle = '#fff';
  drawPolygon(context, spec.polygon, spec.crop.left, spec.crop.top);
  context.fill();
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function buildForearm(
  image: HTMLImageElement,
  spec: ForearmSpec,
  renderOrder: number,
  textures: THREE.CanvasTexture[],
  materials: THREE.MeshBasicMaterial[],
): THREE.Group {
  const elbowWorld = sourceToWorld(spec.elbow);
  const group = new THREE.Group();
  group.position.set(elbowWorld.x, elbowWorld.y, 0);

  const texture = createForearmTexture(image, spec);
  if (!texture) return group;
  textures.push(texture);

  const widthPx = spec.crop.right - spec.crop.left;
  const heightPx = spec.crop.bottom - spec.crop.top;
  const geometry = new THREE.PlaneGeometry(widthPx / MASTER_HEIGHT, heightPx / MASTER_HEIGHT);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.002,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  materials.push(material);

  const center = sourceToWorld({
    x: (spec.crop.left + spec.crop.right) * 0.5,
    y: (spec.crop.top + spec.crop.bottom) * 0.5,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(center.x - elbowWorld.x, center.y - elbowWorld.y, 0.006);
  mesh.renderOrder = renderOrder;
  group.add(mesh);
  return group;
}

export function createNyx2DArticulationLayer(image: HTMLImageElement): Nyx2DArticulationLayer {
  const textures: THREE.CanvasTexture[] = [];
  const materials: THREE.MeshBasicMaterial[] = [];
  const root = new THREE.Group();
  const leftElbow = buildForearm(image, LEFT_FOREARM, 4, textures, materials);
  const rightElbow = buildForearm(image, RIGHT_FOREARM, 4, textures, materials);
  root.add(leftElbow);
  root.add(rightElbow);

  return { root, leftElbow, rightElbow, textures, materials };
}

export function applyNyx2DArticulationLayer(
  layer: Nyx2DArticulationLayer,
  pose: Nyx2DArticulationPose,
): void {
  layer.leftElbow.rotation.z = THREE.MathUtils.degToRad(pose.left.elbowDeg);
  layer.rightElbow.rotation.z = THREE.MathUtils.degToRad(pose.right.elbowDeg);
  layer.root.position.set(0, 0, 0);
  layer.root.rotation.z = 0;
  layer.root.scale.set(1, 1, 1);
}

export function disposeNyx2DArticulationLayer(layer: Nyx2DArticulationLayer): void {
  layer.root.traverse((object) => {
    if (object instanceof THREE.Mesh) object.geometry.dispose();
  });
  for (const material of layer.materials) material.dispose();
  for (const texture of layer.textures) texture.dispose();
}
