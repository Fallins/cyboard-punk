# NYX Meshy GLB static inspection — 2026-09-02

This report records binary-level inspection of the two Meshy rig exports supplied for NYX v1.0. Values come from GLB JSON, buffer views, accessors and embedded image bytes; filenames were not used to infer content.

## Inputs

| File                                                           |      Bytes | SHA-256                                                            | glTF generator                   |
| -------------------------------------------------------------- | ---------: | ------------------------------------------------------------------ | -------------------------------- |
| `Meshy_AI_NYX_2_biped_Character_output(1).glb`                 | 53,940,520 | `a489b7ff88fc62a0a7e298771f811b6084d1771091a42989dbfab2003af6298e` | Khronos glTF Blender I/O v4.0.43 |
| `Meshy_AI_NYX_2_biped_Meshy_AI_Meshy_Merged_Animations(1).glb` | 68,712,232 | `cdb657ece29034444c0b8534ce988944e5ef6ced6d478aedbbecea5c3de7ff2a` | Khronos glTF Blender I/O v4.2.57 |

Both files are valid self-contained glTF 2.0 binary containers with one default scene and no external buffers or images.

## Geometry

| Metric                  |                                  Character output |                            Merged animations |
| ----------------------- | ------------------------------------------------: | -------------------------------------------: |
| Meshes / primitives     |                                             1 / 1 |                                        1 / 1 |
| Nodes                   |                                                26 |                                           26 |
| Uploaded vertices       |                                           560,481 |                                      570,231 |
| Exact indexed triangles |                                           878,513 |                                      878,513 |
| Primitive mode          |                                         TRIANGLES |                                    TRIANGLES |
| Index type              |                                    `UNSIGNED_INT` |                               `UNSIGNED_INT` |
| Vertex attributes       | POSITION, NORMAL, TEXCOORD_0, JOINTS_0, WEIGHTS_0 |                                         same |
| Bounds min              |      (-0.003582579, 0.000000000061, -0.001602640) | (-0.003582579, 0.000000000071, -0.001602641) |
| Bounds max              |           (0.003582579, 0.016999999, 0.001602641) |      (0.003582579, 0.016999999, 0.001602640) |
| Bounds size             |           (0.007165158, 0.016999999, 0.003205281) |      (0.007165158, 0.016999999, 0.003205281) |

The scene root carries a 0.01 scale, explaining the small scene-space bounds. The merged export does not provide a lower-detail mesh; it keeps the same triangle count and increases uploaded vertices by 9,750.

## Rig and skinning

Both inputs contain one skin named `Armature` with 24 joints and 24 inverse-bind matrices. The optional glTF `skin.skeleton` field is omitted; the scene hierarchy nevertheless has the `Armature` root with `Hips` and the skinned `char1` node below it.

Joint names, identical and in skin order:

```text
Hips, LeftUpLeg, LeftLeg, LeftFoot, LeftToeBase,
RightUpLeg, RightLeg, RightFoot, RightToeBase,
Spine02, Spine01, Spine,
LeftShoulder, LeftArm, LeftForeArm, LeftHand,
RightShoulder, RightArm, RightForeArm, RightHand,
neck, Head, head_end, headfront
```

The rig is humanoid: hips, three spine joints, neck/head, bilateral shoulders/arms/hands and bilateral upper legs/legs/feet/toes are present. It has no finger or eye joints.

| Skin check                          |        Character output |       Merged animations |
| ----------------------------------- | ----------------------: | ----------------------: |
| POSITION vertices                   |                 560,481 |                 570,231 |
| JOINTS_0 + WEIGHTS_0 coverage       |                    100% |                    100% |
| Vertices with non-zero weights      |                    100% |                    100% |
| Zero-sum vertices                   |                       0 |                       0 |
| Weight-sum range                    | 0.999999844–1.000000132 | 0.999999844–1.000000132 |
| Weight-sum errors (> 0.02)          |                       0 |                       0 |
| Weighted joint indices outside skin |                       0 |                       0 |

No obvious invalid skin data was found.

## Source animations

All animation targets are joints from the 24-bone list above.

### Character output

| Clip                         | Duration | Channels | Translation | Rotation | Scale | Targets       |
| ---------------------------- | -------: | -------: | ----------: | -------: | ----: | ------------- |
| `Armature\|clip0\|baselayer` |      0 s |       72 |          24 |       24 |    24 | all 24 joints |

Every track contains one key at t=0.033333 s, so the duration is zero. This is a bind-pose snapshot, not a playable animation.

### Merged animations

| Clip      |   Duration | Channels | Translation | Rotation | Scale | Animated targets |
| --------- | ---------: | -------: | ----------: | -------: | ----: | ---------------- |
| `Running` | 0.633333 s |       72 |          24 |       24 |    24 | 24 joints        |
| `Walking` | 1.033333 s |       72 |          24 |       24 |    24 | 24 joints        |

For `Running`, Hips translation and 23 joint rotation tracks have 20 keys. The other 23 translations, all 24 scale tracks and `headfront` rotation contain two keys. `Walking` has the same track layout, with 32 keys on Hips translation and the 23 animated rotations. All samplers span t=0 to the clip duration and use LINEAR interpolation.

The merged file contains exactly two locomotion clips. It does not contain idle, observing, processing, warning, success or offline.

## Materials and textures

### Character output

- one material, `Material_1`, `OPAQUE`, double-sided;
- base color factor (1, 1, 1, 1), metallic 1.0, roughness 1.0;
- one embedded 4096x4096 RGBA PNG, 14,226,752 bytes;
- two texture objects point to that same image for base color and emissive;
- emissive factor is (1, 1, 1);
- no normal, metallic-roughness or occlusion texture;
- material extensions: `KHR_materials_specular` and `KHR_materials_ior` (IOR 1.45).

### Merged animations

- one material, `Material_1`, changed to `BLEND`, double-sided;
- base color factor (1, 1, 1, 1), metallic 1.0, roughness 1.0;
- two embedded 4096x4096 PNGs, 14,226,752 and 14,226,818 bytes;
- decoded pixel SHA-256 is identical for both images, so the emissive and base-color images are pixel-for-pixel the same;
- emissive factor is (1, 1, 1);
- no normal, metallic-roughness or occlusion texture;
- material extension: `KHR_materials_specular`.

Although both inputs technically connect an emissive texture, neither contains the black-background isolated emissive map from the earlier PBR source. Using the full base-color atlas as emissive would illuminate skin, hair and the entire suit. The merged export also makes the full character transparent, which creates avoidable sorting and depth-write problems.

## Extensions

| Extension                    | Character output | Merged animations | CYBOARD runtime         |
| ---------------------------- | ---------------- | ----------------- | ----------------------- |
| `KHR_materials_specular`     | used, optional   | used, optional    | supported by GLTFLoader |
| `KHR_materials_ior`          | used, optional   | absent            | supported by GLTFLoader |
| `KHR_draco_mesh_compression` | absent           | absent            | decoder not installed   |
| `EXT_meshopt_compression`    | absent           | absent            | decoder not installed   |
| `KHR_texture_basisu`         | absent           | absent            | decoder not installed   |

Neither input requires an unsupported extension.

## Production source decision

`Character_output` is the production source.

It has the same valid 24-joint rig and the same 878,513-triangle geometry, while using 9,750 fewer uploaded vertices, 14,771,712 fewer file bytes, one fewer embedded 4K image and an opaque material. The merged file adds only Running and Walking, which are unsuitable for a stationary command-center operator and do not satisfy the six-state runtime contract.

## Production result

The reproducible `operator:build:nyx` pipeline uses the chosen source and produces `public/operator/nyx/nyx.glb`:

| Gate                           |                              Production result |
| ------------------------------ | ---------------------------------------------: |
| File size                      |                     4,076,708 bytes (3.89 MiB) |
| Meshes / primitives            |                                          1 / 1 |
| Uploaded vertices              |                                         59,082 |
| Exact triangles                |                                         79,993 |
| Simplifier geometric error     |                       0.000280 of model extent |
| Skin / joints                  |                                         1 / 24 |
| Valid weighted coverage        |                                           100% |
| Materials                      |                                              1 |
| Base color                     |         embedded 2048x2048 JPEG, 407,231 bytes |
| Emissive                       | isolated embedded 2048x2048 JPEG, 96,294 bytes |
| Runtime-unsupported extensions |                                           none |

The source export did not include the earlier normal or metallic-roughness images, so they cannot be faithfully restored from these two GLBs. Production uses the preserved base-color atlas, scalar metallic/roughness PBR values and a separately generated cyan/magenta/violet emissive mask. The single unsegmented source material cannot isolate smoked-panel transparency; production intentionally remains opaque rather than making skin, hair and the whole suit transparent.

Canonical clips in the final asset:

| Clip         | Duration | Rotation channels | Target bones                    |
| ------------ | -------: | ----------------: | ------------------------------- |
| `idle`       |    4.0 s |                 2 | Spine01, Head                   |
| `observing`  |    2.4 s |                 2 | neck, Head                      |
| `processing` |    2.0 s |                 3 | Head, LeftForeArm, RightForeArm |
| `warning`    |    1.6 s |                 2 | Spine, Head                     |
| `success`    |    1.8 s |                 2 | Spine, Head                     |
| `offline`    |    4.0 s |                 3 | Spine01, neck, Head             |

All clips have non-zero duration, LINEAR quaternion tracks and seamless first/last loop poses. They avoid locomotion and large gestures that would collide with dashboard HUD panels.
