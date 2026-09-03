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
  polygon: SourcePoint[];
}

/**
 * Source-safe elbow-down masks.
 *
 * One polygon is deliberately shared by BOTH the extracted forearm texture and
 * the body erase pass. 0.19.1 used separate layer/erase masks and the erase mask
 * did not cover the full hand/fingers, which left the canonical hand behind when
 * the articulated layer moved and produced duplicate limbs.
 *
 * These polygons include the complete wrist/hand silhouette plus a small elbow
 * overlap. Shoulders and upper arms remain untouched in the canonical body.
 */
const LEFT_FOREARM: ForearmSpec = {
  elbow: { x: 307, y: 590 },
  crop: { left: 225, top: 565, right: 336, bottom: 915 },
  polygon: [
    { x: 292, y: 578 },
    { x: 330, y: 580 },
    { x: 323, y: 614 },
    { x: 316, y: 648 },
    { x: 307, y: 686 },
    { x: 298, y: 722 },
    { x: 286, y: 750 },
    { x: 275, y: 760 },
    { x: 288, y: 780 },
    { x: 296, y: 810 },
    { x: 300, y: 840 },
    { x: 296, y: 863 },
    { x: 285, y: 878 },
    { x: 281, y: 900 },
    { x: 270, y: 910 },
    { x: 255, y: 907 },
    { x: 244, y: 898 },
    { x: 236, y: 884 },
    { x: 232, y: 866 },
    { x: 234, y: 844 },
    { x: 239, y: 822 },
    { x: 235, y: 800 },
    { x: 236, y: 778 },
    { x: 242, y: 758 },
    { x: 255, y: 748 },
    { x: 267, y: 724 },
    { x: 276, y: 690 },
    { x: 284, y: 652 },
    { x: 289, y: 615 },
  ],
};

const RIGHT_FOREARM: ForearmSpec = {
  elbow: { x: 625, y: 580 },
  crop: { left: 606, top: 560, right: 714, bottom: 905 },
  polygon: [
    { x: 610, y: 570 },
    { x: 645, y: 572 },
    { x: 649, y: 606 },
    { x: 656, y: 640 },
    { x: 664, y: 676 },
    { x: 673, y: 714 },
    { x: 681, y: 738 },
    { x: 699, y: 742 },
    { x: 708, y: 760 },
    { x: 705, y: 784 },
    { x: 708, y: 815 },
    { x: 710, y: 842 },
    { x: 705, y: 868 },
    { x: 697, y: 888 },
    { x: 683, y: 900 },
    { x: 670, y: 895 },
    { x: 663, y: 882 },
    { x: 660, y: 864 },
    { x: 662, y: 840 },
    { x: 660, y: 816 },
    { x: 662, y: 790 },
    { x: 663, y: 770 },
    { x: 672, y: 752 },
    { x: 668, y: 728 },
    { x: 660, y: 694 },
    { x: 652, y: 660 },
    { x: 644, y: 624 },
    { x: 636, y: 595 },
  ],
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

function drawPolygon(
  context: CanvasRenderingContext2D,
  points: SourcePoint[],
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

function eraseForearm(context: CanvasRenderingContext2D, spec: ForearmSpec): void {
  context.save();
  context.globalCompositeOperation = 'destination-out';
  drawPolygon(context, spec.polygon);
  context.fill();
  // Remove a tiny anti-aliased fringe too. This is intentionally much smaller
  // than the old repair patches and cannot recreate a second limb.
  context.lineWidth = 4;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.stroke();
  context.restore();
}

/**
 * Canonical body with ONLY the two forearm/hand silhouettes removed.
 *
 * No copied-pixel body repair is attempted here. The approved master contains no
 * trustworthy hidden pixels behind the hands; a transparent reveal is safer and
 * visually cleaner than inventing anatomy or restoring pieces of the old limb.
 */
export function createNyx2DArticulatedBodyTexture(image: HTMLImageElement): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = MASTER_WIDTH;
  canvas.height = MASTER_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.drawImage(image, 0, 0, MASTER_WIDTH, MASTER_HEIGHT);
  eraseForearm(context, LEFT_FOREARM);
  eraseForearm(context, RIGHT_FOREARM);

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
