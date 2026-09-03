import * as THREE from 'three';
import type { Nyx2DArticulationPose } from './nyx2dArticulation';
import { NYX_2D_RIG_ZONES } from './nyx2dRig';
import {
  nyx2DUpperArmCalibration,
  type Nyx2DBodySide,
  type Nyx2DSourcePoint,
} from './nyx2dUpperBodyCalibration';

const MASTER_WIDTH = 941;
const MASTER_HEIGHT = 1672;
const MASTER_ASPECT = MASTER_WIDTH / MASTER_HEIGHT;
const DEG_TO_RAD = Math.PI / 180;
const ELBOW_TORSO_FOLLOW = 0.72;

interface ForearmPathPoint {
  y: number;
  x: number;
  radius: number;
}

interface ForearmSpec {
  side: Nyx2DBodySide;
  elbow: Nyx2DSourcePoint;
  crop: { left: number; top: number; right: number; bottom: number };
  path: readonly ForearmPathPoint[];
}

const LEFT_FOREARM: ForearmSpec = {
  side: 'left',
  elbow: nyx2DUpperArmCalibration('left').elbow,
  crop: { left: 210, top: 575, right: 350, bottom: 920 },
  path: [
    { y: 585, x: 320, radius: 28 },
    { y: 620, x: 310, radius: 30 },
    { y: 660, x: 295, radius: 32 },
    { y: 680, x: 307, radius: 38 },
    { y: 700, x: 298, radius: 36 },
    { y: 720, x: 290, radius: 34 },
    { y: 740, x: 280, radius: 33 },
    { y: 760, x: 265, radius: 38 },
    { y: 780, x: 263, radius: 37 },
    { y: 800, x: 260, radius: 34 },
    { y: 820, x: 253, radius: 34 },
    { y: 840, x: 247, radius: 34 },
    { y: 860, x: 247, radius: 34 },
    { y: 880, x: 257, radius: 38 },
    { y: 900, x: 255, radius: 30 },
    { y: 905, x: 255, radius: 28 },
    { y: 915, x: 242, radius: 14 },
  ],
};

const RIGHT_FOREARM: ForearmSpec = {
  side: 'right',
  elbow: nyx2DUpperArmCalibration('right').elbow,
  crop: { left: 590, top: 550, right: 730, bottom: 910 },
  path: [
    { y: 560, x: 638, radius: 42 },
    { y: 600, x: 649, radius: 43 },
    { y: 640, x: 659, radius: 40 },
    { y: 680, x: 670, radius: 34 },
    { y: 700, x: 676, radius: 30 },
    { y: 720, x: 681, radius: 30 },
    { y: 740, x: 690, radius: 37 },
    { y: 760, x: 691, radius: 37 },
    { y: 780, x: 686, radius: 31 },
    { y: 800, x: 685, radius: 34 },
    { y: 820, x: 686, radius: 35 },
    { y: 840, x: 684, radius: 35 },
    { y: 860, x: 677, radius: 31 },
    { y: 880, x: 672, radius: 27 },
    { y: 900, x: 669, radius: 16 },
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

function sourceToWorld(point: Nyx2DSourcePoint): THREE.Vector2 {
  return new THREE.Vector2(
    (point.x / MASTER_WIDTH - 0.5) * MASTER_ASPECT,
    0.5 - point.y / MASTER_HEIGHT,
  );
}

function interpolatePath(spec: ForearmSpec, y: number): { x: number; radius: number } | null {
  const points = spec.path;
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || y < first.y || y > last.y) return null;

  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    if (y < from.y || y > to.y) continue;
    const span = Math.max(1, to.y - from.y);
    const t = (y - from.y) / span;
    return {
      x: from.x + (to.x - from.x) * t,
      radius: from.radius + (to.radius - from.radius) * t,
    };
  }

  return { x: last.x, radius: last.radius };
}

function createForearmSourceMask(image: HTMLImageElement, spec: ForearmSpec): HTMLCanvasElement | null {
  const width = spec.crop.right - spec.crop.left;
  const height = spec.crop.bottom - spec.crop.top;
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) return null;

  sourceContext.drawImage(
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
  const source = sourceContext.getImageData(0, 0, width, height);

  const mask = document.createElement('canvas');
  mask.width = width;
  mask.height = height;
  const maskContext = mask.getContext('2d');
  if (!maskContext) return null;
  const output = maskContext.createImageData(width, height);

  for (let localY = 0; localY < height; localY += 1) {
    const globalY = spec.crop.top + localY;
    const sample = interpolatePath(spec, globalY);
    if (!sample) continue;

    const left = Math.max(0, Math.floor(sample.x - sample.radius - spec.crop.left));
    const right = Math.min(width - 1, Math.ceil(sample.x + sample.radius - spec.crop.left));
    for (let localX = left; localX <= right; localX += 1) {
      const offset = (localY * width + localX) * 4;
      if (source.data[offset + 3] === 0) continue;
      output.data[offset] = 255;
      output.data[offset + 1] = 255;
      output.data[offset + 2] = 255;
      output.data[offset + 3] = 255;
    }
  }

  maskContext.putImageData(output, 0, 0);
  return mask;
}

function hardClearMask(
  context: CanvasRenderingContext2D,
  mask: HTMLCanvasElement,
  left: number,
  top: number,
): void {
  const width = mask.width;
  const height = mask.height;
  const body = context.getImageData(left, top, width, height);
  const maskContext = mask.getContext('2d', { willReadFrequently: true });
  if (!maskContext) return;
  const erase = maskContext.getImageData(0, 0, width, height);

  for (let offset = 0; offset < body.data.length; offset += 4) {
    if (erase.data[offset + 3] === 0) continue;
    body.data[offset] = 0;
    body.data[offset + 1] = 0;
    body.data[offset + 2] = 0;
    body.data[offset + 3] = 0;
  }
  context.putImageData(body, left, top);
}

export function createNyx2DArticulatedBodyTexture(image: HTMLImageElement): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = MASTER_WIDTH;
  canvas.height = MASTER_HEIGHT;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(image, 0, 0, MASTER_WIDTH, MASTER_HEIGHT);
  for (const spec of FOREARMS) {
    const mask = createForearmSourceMask(image, spec);
    if (!mask) return null;
    hardClearMask(context, mask, spec.crop.left, spec.crop.top);
  }

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
  const mask = createForearmSourceMask(image, spec);
  if (!context || !mask) return null;

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
  context.drawImage(mask, 0, 0);
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

function torsoFollowPoint(point: THREE.Vector2, pose: Nyx2DArticulationPose): THREE.Vector2 {
  const torso = NYX_2D_RIG_ZONES.torso;
  const centerX = ((torso.left + torso.right) * 0.5 - 0.5) * MASTER_ASPECT;
  const centerY = (torso.bottom + torso.top) * 0.5 - 0.5;
  const squeeze = 1 - Math.abs(pose.torsoYaw) * 0.055;
  const yawX = centerX + (point.x - centerX) * squeeze;
  const turnShift = pose.torsoShiftX + pose.torsoYaw * 0.006;
  const leanShift = (point.y - centerY) * Math.tan(pose.torsoLeanDeg * DEG_TO_RAD);
  const targetX = yawX + turnShift - leanShift;
  return new THREE.Vector2(
    point.x + (targetX - point.x) * ELBOW_TORSO_FOLLOW,
    point.y,
  );
}

function rotatedElbow(side: Nyx2DBodySide, pose: Nyx2DArticulationPose): THREE.Vector2 {
  const calibration = nyx2DUpperArmCalibration(side);
  const shoulder = torsoFollowPoint(sourceToWorld(calibration.shoulder), pose);
  const elbow = torsoFollowPoint(sourceToWorld(calibration.elbow), pose);
  const angle = THREE.MathUtils.degToRad(side === 'left' ? pose.left.shoulderDeg : pose.right.shoulderDeg);
  const dx = elbow.x - shoulder.x;
  const dy = elbow.y - shoulder.y;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new THREE.Vector2(
    shoulder.x + dx * cos - dy * sin,
    shoulder.y + dx * sin + dy * cos,
  );
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
  const leftAnchor = rotatedElbow('left', pose);
  const rightAnchor = rotatedElbow('right', pose);

  layer.leftElbow.position.set(leftAnchor.x, leftAnchor.y, 0);
  layer.rightElbow.position.set(rightAnchor.x, rightAnchor.y, 0);
  layer.leftElbow.rotation.z = THREE.MathUtils.degToRad(pose.left.shoulderDeg + pose.left.elbowDeg);
  layer.rightElbow.rotation.z = THREE.MathUtils.degToRad(pose.right.shoulderDeg + pose.right.elbowDeg);
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
