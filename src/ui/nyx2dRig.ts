export interface Nyx2DRect {
  left: number;
  bottom: number;
  right: number;
  top: number;
}

export interface Nyx2DMotionEnvelope {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotationDeg: number;
}

export const NYX_2D_MASTER = {
  width: 941,
  height: 1672,
  // Measured from the approved transparent master with alpha > 10.
  alphaBoundsPx: { left: 219, top: 38, right: 723, bottom: 1637 },
} as const;

export const NYX_2D_PARTITION = {
  // First lossless anatomy split. Source pixels above this line belong to the
  // head layer; pixels on/below it belong to body.
  headCutYPx: 300,
  headPivotPx: { x: 470, y: 300 },
  // Only this narrow source-space band may be procedurally reconstructed under
  // the head. It exists to support several visible pixels of life motion, not
  // large turns or pose changes.
  hiddenSeamBandPx: 24,
  hiddenSeamXMinPx: 356,
  hiddenSeamXMaxPx: 618,
  get headCutUvY() {
    return 1 - this.headCutYPx / NYX_2D_MASTER.height;
  },
  get headPivotWorldX() {
    return (this.headPivotPx.x / NYX_2D_MASTER.width - 0.5) * (NYX_2D_MASTER.width / NYX_2D_MASTER.height);
  },
  get headPivotWorldY() {
    return 1 - this.headPivotPx.y / NYX_2D_MASTER.height - 0.5;
  },
} as const;

function uvRect(leftPx: number, topPx: number, rightPx: number, bottomPx: number): Nyx2DRect {
  return {
    left: leftPx / NYX_2D_MASTER.width,
    right: rightPx / NYX_2D_MASTER.width,
    // Three.js texture UV origin is bottom-left after upload.
    bottom: 1 - bottomPx / NYX_2D_MASTER.height,
    top: 1 - topPx / NYX_2D_MASTER.height,
  };
}

export const NYX_2D_RIG_ZONES = {
  head: uvRect(286, 42, 649, 425),

  // Highest-fidelity area. No mesh deformation is permitted here in v1.
  protectedFace: uvRect(343, 92, 583, 323),

  // Hair can later use mesh-deform, but scalp/root vertices remain heavily weighted.
  hair: uvRect(278, 35, 657, 382),

  // Torso includes chest/waist but intentionally excludes most hips so breathing
  // cannot make the pelvis visibly pulse.
  torso: uvRect(254, 330, 684, 910),

  hips: uvRect(227, 770, 714, 1118),
  legs: uvRect(268, 1000, 672, 1639),

  // Existing approved diamond core location, used by effect-only motion.
  core: uvRect(388, 301, 454, 390),
} as const satisfies Record<string, Nyx2DRect>;

export const NYX_2D_MOTION_ENVELOPES = {
  head: {
    // These are intentionally readable at Dashboard scale. At the current hero
    // size, processing/idle should land around 4–8 CSS px horizontal travel,
    // roughly 2–5 px vertical travel, and ~1.5–2.2° visible roll.
    translateX: 0.016,
    translateY: 0.010,
    scaleX: 0.001,
    scaleY: 0.001,
    rotationDeg: 2.6,
  },
  torsoBreath: {
    // Breathing is allowed to be visible without close inspection. The weighted
    // torso mesh keeps these values away from hips/legs, so stronger chest motion
    // does not turn into whole-body rubber scaling.
    translateX: 0,
    translateY: 0.007,
    scaleX: 0.009,
    scaleY: 0.017,
    rotationDeg: 0,
  },
  hair: {
    translateX: 0.004,
    translateY: 0.002,
    scaleX: 0.001,
    scaleY: 0.001,
    rotationDeg: 1.2,
  },
} as const satisfies Record<string, Nyx2DMotionEnvelope>;

export function pointInNyx2DRect(x: number, y: number, rect: Nyx2DRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.bottom && y <= rect.top;
}

export function nyx2DRectToShader(rect: Nyx2DRect): readonly [number, number, number, number] {
  return [rect.left, rect.bottom, rect.right, rect.top] as const;
}

export function validateNyx2DRigZones(): string[] {
  const issues: string[] = [];
  for (const [name, rect] of Object.entries(NYX_2D_RIG_ZONES)) {
    const values = [rect.left, rect.bottom, rect.right, rect.top];
    if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
      issues.push(`${name} contains coordinates outside 0..1`);
    }
    if (rect.left >= rect.right || rect.bottom >= rect.top) {
      issues.push(`${name} has an inverted or empty rectangle`);
    }
  }

  const face = NYX_2D_RIG_ZONES.protectedFace;
  const head = NYX_2D_RIG_ZONES.head;
  if (
    face.left < head.left ||
    face.right > head.right ||
    face.bottom < head.bottom ||
    face.top > head.top
  ) {
    issues.push('protectedFace must remain fully inside head');
  }

  if (
    NYX_2D_PARTITION.headCutYPx <= NYX_2D_MASTER.alphaBoundsPx.top ||
    NYX_2D_PARTITION.headCutYPx >= NYX_2D_MASTER.alphaBoundsPx.bottom
  ) {
    issues.push('head/body partition must cross the visible operator bounds');
  }

  if (NYX_2D_PARTITION.hiddenSeamBandPx < 8 || NYX_2D_PARTITION.hiddenSeamBandPx > 32) {
    issues.push('hidden head seam band must stay narrowly constrained');
  }

  if (
    NYX_2D_PARTITION.hiddenSeamXMinPx >= NYX_2D_PARTITION.hiddenSeamXMaxPx ||
    NYX_2D_PARTITION.hiddenSeamXMinPx < NYX_2D_MASTER.alphaBoundsPx.left ||
    NYX_2D_PARTITION.hiddenSeamXMaxPx > NYX_2D_MASTER.alphaBoundsPx.right
  ) {
    issues.push('hidden head seam x-range must remain inside visible operator bounds');
  }

  return issues;
}
