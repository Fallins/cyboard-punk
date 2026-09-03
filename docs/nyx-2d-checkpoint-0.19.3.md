# NYX 2D Checkpoint 0.19.3 — Source-alpha Forearm Cleanup

## Problem fixed

0.19.2 removed most duplicate forearm pixels but still left detached neon/hand silhouettes when a forearm rotated away from the canonical pose. The remaining pixels were source antialias, hand/finger detail and emissive edges that fell outside hand-authored polygons.

## Production contract

- Breathing remains user-approved at `2.00x`.
- Shoulders, upper arms and torso remain canonical/source-locked.
- Semantic limb motion remains elbow-down only.
- Forearm segmentation is derived from the canonical master itself:
  - a measured elbow-down centerline/radius corridor limits the anatomical region;
  - only pixels with canonical source alpha inside that corridor are selected;
  - the exact same generated mask is used to hard-clear the body texture and extract the movable forearm texture.
- Body clearing is binary alpha removal. It does not use Canvas `destination-out`, hand-authored erase polygons, neighbor-pixel repair or generated/inpainted body content.
- Blink remains blocked.

## Why this replaces polygons

Polygon masks approximated the visible silhouette and repeatedly missed thin neon edges, antialiased pixels and fingers. The source-alpha mask includes every real canonical pixel inside the anatomical corridor while avoiding unrelated hip/leg pixels outside the corridor.

## QA gate

Run:

```bash
bun run check
bun run tauri dev
```

With NYX test controls enabled, verify `PROCESS`, `WARNING` and `SUCCESS`:

1. the canonical hanging forearm/hand leaves no detached ghost silhouette after movement;
2. only one movable forearm/hand exists per side;
3. no large hip/thigh/body chunk disappears with the forearm;
4. return to `IDLE` remains smooth and aligned at the elbow.
