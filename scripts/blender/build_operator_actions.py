"""Build restrained CYBOARD semantic actions on a humanoid Blender armature.

This is a best-effort production helper, not a replacement for animation review.
It creates subtle command-center motion intended for NYX / AXON after a model has
already been rigged.

Usage:

    blender path/to/nyx.blend \
      --python scripts/blender/build_operator_actions.py

Use --force after the script separator to replace existing canonical actions:

    blender path/to/nyx.blend \
      --python scripts/blender/build_operator_actions.py -- --force

The script creates: idle, observing, processing, warning, success, offline.
"""

from __future__ import annotations

import math
import re
import sys
from dataclasses import dataclass

import bpy

CANONICAL_ACTIONS = ("idle", "observing", "processing", "warning", "success", "offline")
FPS = 30


def normalize(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())


BONE_ALIASES = {
    "head": ("head", "mixamorighead"),
    "neck": ("neck", "mixamorigneck"),
    "chest": ("upperchest", "chest", "spine2", "spine3", "spine003", "mixamorigspine2"),
    "spine": ("spine1", "spine", "spine002", "mixamorigspine1", "mixamorigspine"),
    "left_forearm": ("leftforearm", "leftlowerarm", "forearml", "lowerarml", "mixamorigleftforearm"),
    "right_forearm": ("rightforearm", "rightlowerarm", "forearmr", "lowerarmr", "mixamorigrightforearm"),
}


@dataclass
class RigBones:
    head: bpy.types.PoseBone
    neck: bpy.types.PoseBone | None
    chest: bpy.types.PoseBone
    spine: bpy.types.PoseBone | None
    left_forearm: bpy.types.PoseBone | None
    right_forearm: bpy.types.PoseBone | None

    def all(self) -> list[bpy.types.PoseBone]:
        result = [self.head, self.chest]
        for bone in (self.neck, self.spine, self.left_forearm, self.right_forearm):
            if bone is not None and bone not in result:
                result.append(bone)
        return result


def args_after_separator() -> list[str]:
    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1 :]


def largest_armature() -> bpy.types.Object:
    rigs = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if not rigs:
        raise SystemExit("No armature found in the current scene")
    return max(rigs, key=lambda obj: len(obj.data.bones))


def find_bone(armature: bpy.types.Object, semantic: str) -> bpy.types.PoseBone | None:
    aliases = tuple(normalize(alias) for alias in BONE_ALIASES[semantic])
    indexed = {normalize(bone.name): bone for bone in armature.pose.bones}

    for alias in aliases:
        if alias in indexed:
            return indexed[alias]

    for alias in aliases:
        candidates = [bone for key, bone in indexed.items() if key.endswith(alias) or alias in key]
        if candidates:
            return min(candidates, key=lambda bone: len(normalize(bone.name)))
    return None


def resolve_rig(armature: bpy.types.Object) -> RigBones:
    head = find_bone(armature, "head")
    chest = find_bone(armature, "chest") or find_bone(armature, "spine")
    if head is None:
        raise SystemExit("Could not resolve a head bone; rename or extend BONE_ALIASES")
    if chest is None:
        raise SystemExit("Could not resolve a chest/spine bone; rename or extend BONE_ALIASES")

    return RigBones(
        head=head,
        neck=find_bone(armature, "neck"),
        chest=chest,
        spine=find_bone(armature, "spine"),
        left_forearm=find_bone(armature, "left_forearm"),
        right_forearm=find_bone(armature, "right_forearm"),
    )


def set_rot(bone: bpy.types.PoseBone | None, xyz_deg: tuple[float, float, float]) -> None:
    if bone is None:
        return
    bone.rotation_mode = "XYZ"
    bone.rotation_euler = tuple(math.radians(value) for value in xyz_deg)


def reset_rig(rig: RigBones) -> None:
    for bone in rig.all():
        bone.rotation_mode = "XYZ"
        bone.rotation_euler = (0.0, 0.0, 0.0)
        bone.location = (0.0, 0.0, 0.0)
        bone.scale = (1.0, 1.0, 1.0)


def key_pose(frame: int, rig: RigBones) -> None:
    bpy.context.scene.frame_set(frame)
    for bone in rig.all():
        bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone.name)


def smooth_action(action: bpy.types.Action) -> None:
    for fcurve in action.fcurves:
        for key in fcurve.keyframe_points:
            key.interpolation = "BEZIER"
            key.handle_left_type = "AUTO_CLAMPED"
            key.handle_right_type = "AUTO_CLAMPED"


def begin_action(armature: bpy.types.Object, name: str, force: bool) -> bpy.types.Action:
    existing = bpy.data.actions.get(name)
    if existing is not None:
        if not force:
            raise SystemExit(f"Action '{name}' already exists. Review it or rerun with --force to replace canonical actions.")
        bpy.data.actions.remove(existing)

    action = bpy.data.actions.new(name=name)
    action.use_fake_user = True
    action["cyboard_state"] = name
    armature.animation_data_create()
    armature.animation_data.action = action
    return action


def build_idle(armature: bpy.types.Object, rig: RigBones, force: bool) -> None:
    action = begin_action(armature, "idle", force)
    for frame, head, chest in (
        (1, (0, 0, -1.0), (0.3, 0, -0.4)),
        (60, (-0.8, 0, 1.0), (-0.4, 0, 0.5)),
        (120, (0, 0, -1.0), (0.3, 0, -0.4)),
    ):
        reset_rig(rig)
        set_rot(rig.head, head)
        set_rot(rig.chest, chest)
        key_pose(frame, rig)
    smooth_action(action)


def build_observing(armature: bpy.types.Object, rig: RigBones, force: bool) -> None:
    action = begin_action(armature, "observing", force)
    for frame, head_z, chest_z in ((1, -4.0, -1.0), (30, 4.0, 1.0), (60, -4.0, -1.0)):
        reset_rig(rig)
        set_rot(rig.head, (-1.0, 0, head_z))
        set_rot(rig.neck, (0, 0, head_z * 0.25))
        set_rot(rig.chest, (0, 0, chest_z))
        key_pose(frame, rig)
    smooth_action(action)


def build_processing(armature: bpy.types.Object, rig: RigBones, force: bool) -> None:
    action = begin_action(armature, "processing", force)
    for frame, head_z, forearm in ((1, -2.0, 2.0), (30, 2.0, 7.0), (60, -2.0, 2.0)):
        reset_rig(rig)
        set_rot(rig.head, (-2.0, 0, head_z))
        set_rot(rig.chest, (-0.5, 0, -head_z * 0.2))
        set_rot(rig.left_forearm, (0, 0, forearm))
        set_rot(rig.right_forearm, (0, 0, -forearm))
        key_pose(frame, rig)
    smooth_action(action)


def build_warning(armature: bpy.types.Object, rig: RigBones, force: bool) -> None:
    action = begin_action(armature, "warning", force)
    for frame, head_x, chest_x in ((1, -2.0, -0.5), (24, 1.0, 1.2), (48, -2.0, -0.5)):
        reset_rig(rig)
        set_rot(rig.head, (head_x, 0, 0))
        set_rot(rig.chest, (chest_x, 0, 0))
        key_pose(frame, rig)
    smooth_action(action)


def build_success(armature: bpy.types.Object, rig: RigBones, force: bool) -> None:
    action = begin_action(armature, "success", force)
    for frame, head_x in ((1, 0.0), (18, 3.0), (34, -2.0), (54, 0.0)):
        reset_rig(rig)
        set_rot(rig.head, (head_x, 0, 0))
        set_rot(rig.chest, (head_x * 0.18, 0, 0))
        key_pose(frame, rig)
    smooth_action(action)


def build_offline(armature: bpy.types.Object, rig: RigBones, force: bool) -> None:
    action = begin_action(armature, "offline", force)
    for frame, head_x, chest_x in ((1, 5.5, 2.0), (60, 6.5, 2.5), (120, 5.5, 2.0)):
        reset_rig(rig)
        set_rot(rig.head, (head_x, 0, 0))
        set_rot(rig.neck, (head_x * 0.25, 0, 0))
        set_rot(rig.chest, (chest_x, 0, 0))
        key_pose(frame, rig)
    smooth_action(action)


def main() -> None:
    force = "--force" in args_after_separator()
    armature = largest_armature()
    rig = resolve_rig(armature)
    bpy.context.scene.render.fps = FPS

    print(f"CYBOARD armature: {armature.name}")
    print("Resolved bones:")
    for semantic, bone in (
        ("head", rig.head),
        ("neck", rig.neck),
        ("chest", rig.chest),
        ("spine", rig.spine),
        ("left_forearm", rig.left_forearm),
        ("right_forearm", rig.right_forearm),
    ):
        print(f"  {semantic:14} -> {bone.name if bone else 'not found (optional)'}")

    build_idle(armature, rig, force)
    build_observing(armature, rig, force)
    build_processing(armature, rig, force)
    build_warning(armature, rig, force)
    build_success(armature, rig, force)
    build_offline(armature, rig, force)

    armature.animation_data.action = bpy.data.actions.get("idle")
    bpy.context.scene.frame_set(1)
    print("✓ Created CYBOARD actions: " + ", ".join(CANONICAL_ACTIONS))
    print("Review motion in Blender before production export. Use --force only when replacing these generated actions intentionally.")


if __name__ == "__main__":
    main()
