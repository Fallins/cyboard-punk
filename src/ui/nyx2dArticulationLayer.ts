import * as THREE from 'three';
import type { Nyx2DArticulationPose } from './nyx2dArticulation';

const MASTER_WIDTH = 941;
const MASTER_HEIGHT = 1672;
const MASTER_ASPECT = MASTER_WIDTH / MASTER_HEIGHT;

interface SourcePoint {
  x: number;
  y: number;
}

interface ForearmSpec {
  elbow: SourcePoint;
  crop: { left: number; top: number; right: number; bottom: number };
  layerPolygon: SourcePoint[];
  erasePolygon: SourcePoint[];
  repairPolygon: SourcePoint[];
  repairShiftX: number;
}

/**
 * The polygons are intentionally elbow-down only. Upper arms and shoulders stay
 * in the canonical master so motion cannot expose invented shoulder/chest pixels.
 * The layer polygon includes a small elbow overlap; the erase polygon starts
 * lower, allowing the rotated cuff to cover the fixed upper arm joint cleanly.
 */
const LEFT_FOREARM: ForearmSpec = {
  elbow: { x: 307, y: 590 },
  crop: { left: 220, top: 565, right: 338, bottom: 905 },
  layerPolygon: [
    { x: 286, y: 575 },
    { x: 326, y: 578 },
    { x: 317, y: 626 },
    { x: 302, y: 696 },
    { x: 286, y: 772 },
    { x: 278, y: 828 },
    { x: 264, y: 879 },
    { x: 246, y: 895 },
    { x: 231, y: 881 },
    { x: 238, y: 842 },
    { x: 244, y: 804 },
    { x: 255, y: 756 },
    { x: 268, y: 692 },
    { x: 280, y: 628 },
  ],
  erasePolygon: [
    { x: 289, y: 604 },
    { x: 320, y: 606 },
    { x: 310, y: 650 },
    { x: 296, y: 711 },
    { x: 282, y: 777 },
    { x: 274, y: 830 },
    { x: 262, y: 875 },
    { x: 247, y: 888 },
    { x: 236, y: 878 },
    { x: 243, y: 841 },
    { x: 250, y: 804 },
    { x: 261, y: 758 },
    { x: 274, y: 695 },
    { x: 284, y: 642 },
  ],
  // Only repair the narrow body-side overlap near waist/hip. The hand region is
  // intentionally left transparent after moving because it originally sat on
  // the silhouette edge, not over trustworthy hidden body source.
  repairPolygon: [
    { x: 289, y: 610 },
    { x: 318, y: 612 },
    { x: 305, y: 666 },
    { x: 293, y: 720 },
    { x: 281, y: 770 },
    { x: 273, y: 768 },
    { x: 282, y: 704 },
  ],
  repairShiftX: -46,
};

const RIGHT_FOREARM: ForearmSpec = {
  elbow: { x: 625, y: 580 },
  crop: { left: 602, top: 555, right: 710, bottom: 900 },
  layerPolygon: [
    { x: 608, y: 565 },
    { x: 643, y: 568 },
    { x: 650, y: 620 },
    { x: 661, y: 685 },
    { x: 675, y: 748 },
    { x: 688, y: 808 },
    { x: 702, y: 851 },
    { x: 697, y: 878 },
    { x: 679, y: 892 },
    { x: 663, y: 875 },
    { x: 654, y: 835 },
    { x: 646, y: 794 },
    { x: 637, y: 739 },
    { x: 627, y: 682 },
    { x: 618, y: 620 },
  ],
  erasePolygon: [
    { x: 611, y: 596 },
    { x: 640, y: 598 },
    { x: 647, y: 637 },
    { x: 658, y: 693 },
    { x: 671, y: 752 },
    { x: 684, y: 809 },
    { x: 697, y: 850 },
    { x: 692, y: 874 },
    { x: 680, y: 885 },
    { x: 668, y: 871 },
    { x: 659, y: 833 },
    { x: 651, y: 792 },
    { x: 642, y: 737 },
    { x: 633, y: 684 },
    { x: 623, y: 630 },
  ],
  repairPolygon: [
    { x: 612, y: 603 },
    { x: 639, y: 605 },
    { x: 650, y: 658 },
    { x: 661, y: 712 },
    { x: 671, y: 765 },
    { x: 663, y: 767 },
    { x: 650, y: 706 },
    { x: 638, y: 652 },
  ],
  repairShiftX: 46,
};

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

function drawPolygon(context: CanvasRenderingContext2D, points: SourcePoint[], offsetX = 0, offsetY = 0): void {
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

function eraseForearm(context: CanvasRenderingContext2D, spec: ForearmSpec): void {
  context.save();
  context.globalCompositeOperation = 'destination-out';
  drawPolygon(context, spec.erasePolygon);
  context.fill();
  context.restore();
}

function repairBodySide(context: CanvasRenderingContext2D, image: HTMLImageElement, spec: ForearmSpec): void {
  context.save();
  context.globalCompositeOperation = 'destination-over';
  drawPolygon(context, spec.repairPolygon);
  context.clip();
  context.drawImage(image, spec.repairShiftX, 0, MASTER_WIDTH, MASTER_HEIGHT);
  context.restore();
}

export function createNyx2DArticulatedBodyTexture(image: HTMLImageElement): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = MASTER_WIDTH;
  canvas.height = MASTER_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.drawImage(image, 0, 0, MASTER_WIDTH, MASTER_HEIGHT);
  eraseForearm(context, LEFT_FOREARM);
  eraseForearm(context, RIGHT_FOREARM);
  repairBodySide(context, image, LEFT_FOREARM);
  repairBodySide(context, image, RIGHT_FOREARM);

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
  drawPolygon(context, spec.layerPolygon, spec.crop.left, spec.crop.top);
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
