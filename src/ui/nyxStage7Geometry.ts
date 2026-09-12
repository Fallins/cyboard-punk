import stage2FrontSilhouetteSvg from '../../assets/operator/nyx-redesign/experimental/stage-02/base-v03/views/front.svg?raw';

export const NYX_STAGE7_SOURCE_WIDTH = 202;
export const NYX_STAGE7_SOURCE_HEIGHT = 648;
export const NYX_STAGE7_CANVAS_WIDTH = 302;
export const NYX_STAGE7_SOURCE_OFFSET_X = 50;

function stage2Path(id: string): string {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = stage2FrontSilhouetteSvg.match(
    new RegExp(`<path\\s+id=["']${escaped}["'][^>]*\\sd=["']([^"']+)["']`),
  );
  if (!match?.[1]) throw new Error(`NYX Stage 7 could not resolve Stage 2 silhouette path: ${id}`);
  return match[1];
}

// Runtime consumes the authoritative Stage 2 base-v03 paths as raw build-time
// text and emits them inline into the runtime SVG. This avoids WebKit's
// external-SVG mask behavior without duplicating/reinterpreting the silhouette.
export const NYX_STAGE7_SILHOUETTE_BASE_D = stage2Path('silhouette-base-v02');
export const NYX_STAGE7_SILHOUETTE_RIGHT_ARM_D = stage2Path('front-right-arm-corrective');

// Part segmentation shapes are only the second alpha term. Every moving layer
// is additionally intersected with the authoritative Stage 2 silhouette before
// any locked REF-FRONT pixel can be shown.
export const NYX_STAGE7_HEAD_REGION_D =
  'M 72 0 L 154 0 L 154 92 L 148 106 L 138 116 L 128 128 L 96 128 L 86 118 L 76 108 L 70 94 Z';
export const NYX_STAGE7_TORSO_REGION_D =
  'M 66 100 L 158 100 L 168 132 L 166 224 L 154 270 L 70 270 L 58 224 L 56 132 Z';
export const NYX_STAGE7_CHEST_REGION_D =
  'M 78 116 L 146 116 L 151 140 L 148 208 L 141 240 L 83 240 L 76 208 L 73 140 Z';
export const NYX_STAGE7_SHOULDER_REGION_D =
  'M 60 104 L 100 104 L 105 125 L 99 151 L 70 160 L 61 140 Z M 124 104 L 164 104 L 163 140 L 154 160 L 125 151 L 119 125 Z';
export const NYX_STAGE7_CORE_REGION_D =
  'M 112 103 L 124 118 L 112 136 L 100 118 Z';
export const NYX_STAGE7_ARM_REGION_D =
  'M 54 106 L 73 110 L 77 130 L 74 151 L 72 171 L 69 191 L 66 206 L 63 221 L 60 237 L 56 252 L 51 266 L 45 274 L 42 284 L 42 302 L 39 315 L 34 320 L 27 319 L 21 312 L 18 300 L 18 284 L 22 272 L 28 262 L 31 249 L 35 234 L 39 219 L 43 204 L 47 189 L 49 170 L 50 150 L 51 129 Z';
export const NYX_STAGE7_FOREARM_REGION_D =
  'M 45 182 L 68 187 L 68 205 L 65 221 L 61 238 L 57 254 L 52 268 L 46 276 L 43 285 L 43 303 L 40 316 L 34 321 L 27 319 L 21 312 L 18 300 L 18 284 L 22 272 L 28 262 L 31 249 L 35 234 L 39 219 L 42 204 Z';
export const NYX_STAGE7_HAND_REGION_D =
  'M 18 255 L 43 255 L 47 269 L 46 286 L 43 302 L 40 314 L 35 321 L 28 321 L 21 315 L 17 307 L 15 297 L 16 282 Z';

// Base punch-out follows the same refined arm segmentation. There is no
// rectangular cleanup region, so static cape/body/feet remain untouched.
export const NYX_STAGE7_ARM_BASE_REMOVAL_D = NYX_STAGE7_ARM_REGION_D;

export const NYX_STAGE7_EYE_APERTURES_D =
  'M 96.8 57.3 Q 104.8 53.5 113.0 57.2 Q 104.9 60.8 96.8 57.3 Z M 119.1 57.2 Q 127.0 53.5 135.0 57.2 Q 127.0 60.8 119.1 57.2 Z';
