import * as THREE from 'three';
import type { Nyx2DArticulationPose } from './nyx2dArticulation';

const MASTER_WIDTH = 941;
const MASTER_HEIGHT = 1672;
const MASTER_ASPECT = MASTER_WIDTH / MASTER_HEIGHT;

interface SourcePoint {
  x: number;
  y: number;
}

interface SegmentSpec {
  from: SourcePoint;
  to: SourcePoint;
  radius: number;
  crop: { left: number; top: number; right: number; bottom: number };
  hand?: { center: SourcePoint; radius: number };
}

interface ArmSpec {
  shoulder: SourcePoint;
  elbow: SourcePoint;
  upper: SegmentSpec;
  lower: SegmentSpec;
}

const LEFT_ARM: ArmSpec = {
  shoulder: { x: 350, y: 330 },
  elbow: { x: 307, y: 590 },
  upper: {
    from: { x: 350, y: 330 },
    to: { x: 307, y: 590 },
    radius: 34,
    crop: { left: 270, top: 290, right: 395, bottom: 625 },
  },
  lower: {
    from: { x: 307, y: 590 },
    to: { x: 250, y: 850 },
    radius: 29,
    crop: { left: 215, top: 555, right: 340, bottom: 905 },
    hand: { center: { x: 250, y: 850 }, radius: 34 },
  },
};

const RIGHT_ARM: ArmSpec = {
  shoulder: { x: 590, y: 325 },
  elbow: { x: 625, y: 580 },
  upper: {
    from: { x: 590, y: 325 },
    to: { x: 625, y: 580 },
    radius: 36,
    crop: { left: 550, top: 285, right: 665, bottom: 620 },
  },
  lower: {
    from: { x: 625, y: 580 },
    to: { x: 670, y: 835 },
    radius: 30,
    crop: { left: 595, top: 545, right: 710, bottom: 895 },
    hand: { center: { x: 670, y: 835 }, radius: 34 },
  },
};

export interface Nyx2DArticulationLayer {
  root: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
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

function drawCapsule(
  context: CanvasRenderingContext2D,
  from: SourcePoint,
  to: SourcePoint,
  radius: number,
): void {
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.lineWidth = radius * 2;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.stroke();
}

function eraseArm(context: CanvasRenderingContext2D, arm: ArmSpec): void {
  context.strokeStyle = '#000';
  context.fillStyle = '#000';
  drawCapsule(context, arm.upper.from, arm.upper.to, arm.upper.radius);
  drawCapsule(context, arm.lower.from, arm.lower.to, arm.lower.radius);
  if (arm.lower.hand) {
    context.beginPath();
    context.arc(arm.lower.hand.center.x, arm.lower.hand.center.y, arm.lower.hand.radius, 0, Math.PI * 2);
    context.fill();
  }
}

export function createNyx2DArticulatedBodyTexture(image: HTMLImageElement): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = MASTER_WIDTH;
  canvas.height = MASTER_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.drawImage(image, 0, 0, MASTER_WIDTH, MASTER_HEIGHT);
  context.save();
  context.globalCompositeOperation = 'destination-out';
  eraseArm(context, LEFT_ARM);
  eraseArm(context, RIGHT_ARM);
  context.restore();

  context.save();
  context.globalCompositeOperation = 'destination-over';
  context.beginPath();
  context.rect(282, 295, 105, 390);
  context.clip();
  context.drawImage(image, -42, 0, MASTER_WIDTH, MASTER_HEIGHT);
  context.restore();

  context.save();
  context.globalCompositeOperation = 'destination-over';
  context.beginPath();
  context.rect(555, 290, 112, 505);
  context.clip();
  context.drawImage(image, 42, 0, MASTER_WIDTH, MASTER_HEIGHT);
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function createSegmentMask(spec: SegmentSpec): HTMLCanvasElement | null {
  const width = spec.crop.right - spec.crop.left;
  const height = spec.crop.bottom - spec.crop.top;
  const mask = document.createElement('canvas');
  mask.width = width;
  mask.height = height;
  const context = mask.getContext('2d');
  if (!context) return null;

  context.strokeStyle = '#fff';
  context.fillStyle = '#fff';
  drawCapsule(
    context,
    { x: spec.from.x - spec.crop.left, y: spec.from.y - spec.crop.top },
    { x: spec.to.x - spec.crop.left, y: spec.to.y - spec.crop.top },
    spec.radius,
  );
  if (spec.hand) {
    context.beginPath();
    context.arc(
      spec.hand.center.x - spec.crop.left,
      spec.hand.center.y - spec.crop.top,
      spec.hand.radius,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  return mask;
}

function createSegmentTexture(image: HTMLImageElement, spec: SegmentSpec): THREE.CanvasTexture | null {
  const width = spec.crop.right - spec.crop.left;
  const height = spec.crop.bottom - spec.crop.top;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const mask = createSegmentMask(spec);
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
  context.globalCompositeOperation = 'destination-in';
  context.drawImage(mask, 0, 0);
  context.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function createSegmentMesh(
  image: HTMLImageElement,
  spec: SegmentSpec,
  pivot: SourcePoint,
  renderOrder: number,
  textures: THREE.CanvasTexture[],
  materials: THREE.MeshBasicMaterial[],
): THREE.Mesh | null {
  const texture = createSegmentTexture(image, spec);
  if (!texture) return null;
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
  const pivotWorld = sourceToWorld(pivot);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(center.x - pivotWorld.x, center.y - pivotWorld.y, 0);
  mesh.renderOrder = renderOrder;
  return mesh;
}

function buildArm(
  image: HTMLImageElement,
  spec: ArmSpec,
  renderOrder: number,
  textures: THREE.CanvasTexture[],
  materials: THREE.MeshBasicMaterial[],
): { shoulder: THREE.Group; elbow: THREE.Group } {
  const shoulderWorld = sourceToWorld(spec.shoulder);
  const elbowWorld = sourceToWorld(spec.elbow);
  const shoulder = new THREE.Group();
  shoulder.position.set(shoulderWorld.x, shoulderWorld.y, 0);

  const upper = createSegmentMesh(image, spec.upper, spec.shoulder, renderOrder, textures, materials);
  if (upper) shoulder.add(upper);

  const elbow = new THREE.Group();
  elbow.position.set(elbowWorld.x - shoulderWorld.x, elbowWorld.y - shoulderWorld.y, 0);
  const lower = createSegmentMesh(image, spec.lower, spec.elbow, renderOrder + 1, textures, materials);
  if (lower) elbow.add(lower);
  shoulder.add(elbow);

  return { shoulder, elbow };
}

export function createNyx2DArticulationLayer(image: HTMLImageElement): Nyx2DArticulationLayer {
  const textures: THREE.CanvasTexture[] = [];
  const materials: THREE.MeshBasicMaterial[] = [];
  const root = new THREE.Group();
  const left = buildArm(image, LEFT_ARM, 4, textures, materials);
  const right = buildArm(image, RIGHT_ARM, 4, textures, materials);
  root.add(left.shoulder);
  root.add(right.shoulder);

  return {
    root,
    leftShoulder: left.shoulder,
    leftElbow: left.elbow,
    rightShoulder: right.shoulder,
    rightElbow: right.elbow,
    textures,
    materials,
  };
}

export function applyNyx2DArticulationLayer(
  layer: Nyx2DArticulationLayer,
  pose: Nyx2DArticulationPose,
): void {
  layer.leftShoulder.rotation.z = THREE.MathUtils.degToRad(pose.left.shoulderDeg);
  layer.leftElbow.rotation.z = THREE.MathUtils.degToRad(pose.left.elbowDeg);
  layer.rightShoulder.rotation.z = THREE.MathUtils.degToRad(pose.right.shoulderDeg);
  layer.rightElbow.rotation.z = THREE.MathUtils.degToRad(pose.right.elbowDeg);

  layer.root.position.x = pose.torsoShiftX + pose.torsoYaw * 0.004;
  layer.root.rotation.z = THREE.MathUtils.degToRad(pose.torsoLeanDeg);
  layer.root.scale.x = 1 - Math.abs(pose.torsoYaw) * 0.035;
  layer.root.scale.y = 1;
}

export function disposeNyx2DArticulationLayer(layer: Nyx2DArticulationLayer): void {
  layer.root.traverse((object) => {
    if (object instanceof THREE.Mesh) object.geometry.dispose();
  });
  for (const material of layer.materials) material.dispose();
  for (const texture of layer.textures) texture.dispose();
}
