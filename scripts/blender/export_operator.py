"""CYBOARD production operator Blender export helper.

Usage from the repository root:

    blender --background path/to/nyx.blend \
      --python scripts/blender/export_operator.py -- nyx

The script validates the open Blender scene, then exports a self-contained glTF 2.0
GLB to public/operator/<operator>/<operator>.glb.

It intentionally does not enable Draco/Meshopt/KTX2 because the current CYBOARD
runtime does not configure those decoders.
"""

from __future__ import annotations

import sys
from pathlib import Path

import bpy

REQUIRED_ACTIONS = {"idle", "observing", "processing", "warning", "success", "offline"}
MAX_TRIANGLES = 80_000
MAX_MATERIALS = 12
MIN_JOINTS = 20
MAX_JOINTS = 120
SUPPORTED_OPERATORS = {"nyx", "axon"}


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def cli_operator_id() -> str:
    args = sys.argv
    if "--" not in args:
        raise SystemExit("Expected operator id after '--', e.g. -- nyx")
    extra = args[args.index("--") + 1 :]
    if not extra:
        raise SystemExit("Missing operator id; expected nyx or axon")
    operator_id = extra[0].strip().lower()
    if operator_id not in SUPPORTED_OPERATORS:
        raise SystemExit(f"Unsupported operator '{operator_id}'; expected nyx or axon")
    return operator_id


def mesh_triangle_count() -> int:
    total = 0
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            mesh.calc_loop_triangles()
            total += len(mesh.loop_triangles)
        finally:
            evaluated.to_mesh_clear()
    return total


def unique_material_count() -> int:
    materials = set()
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        for slot in obj.material_slots:
            if slot.material is not None:
                materials.add(slot.material.name)
    return len(materials)


def armatures() -> list[bpy.types.Object]:
    return [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]


def action_names() -> set[str]:
    return {action.name.strip().lower() for action in bpy.data.actions if action.name.strip()}


def validate_scene(operator_id: str) -> None:
    failures: list[str] = []
    warnings: list[str] = []

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    rigs = armatures()
    triangles = mesh_triangle_count()
    materials = unique_material_count()
    actions = action_names()
    missing_actions = sorted(REQUIRED_ACTIONS - actions)

    if not meshes:
        failures.append("scene contains no mesh objects")
    if not rigs:
        failures.append("scene contains no armature")
    elif len(rigs) > 1:
        warnings.append(f"scene contains {len(rigs)} armatures; ensure only the production humanoid rig is exported")

    if rigs:
        primary = max(rigs, key=lambda obj: len(obj.data.bones))
        joints = len(primary.data.bones)
        if joints < MIN_JOINTS:
            failures.append(f"primary rig has only {joints} bones; expected at least {MIN_JOINTS}")
        if joints > MAX_JOINTS:
            failures.append(f"primary rig has {joints} bones; exceeds runtime budget {MAX_JOINTS}")

    if triangles > MAX_TRIANGLES:
        failures.append(f"evaluated mesh has {triangles:,} triangles; budget is {MAX_TRIANGLES:,}")
    if materials > MAX_MATERIALS:
        warnings.append(f"scene uses {materials} unique materials; target is <= {MAX_MATERIALS}")
    if missing_actions:
        failures.append("missing required actions: " + ", ".join(missing_actions))

    print(f"\nCYBOARD operator scene: {operator_id.upper()}")
    print(f"  meshes:     {len(meshes)}")
    print(f"  triangles:  {triangles:,}")
    print(f"  materials:  {materials}")
    print(f"  armatures:  {len(rigs)}")
    print(f"  actions:    {', '.join(sorted(actions)) or 'none'}")

    for warning in warnings:
        print(f"! {warning}")
    if failures:
        for failure in failures:
            print(f"✗ {failure}")
        raise SystemExit(f"CYBOARD operator export blocked by {len(failures)} validation issue(s)")

    print("✓ Blender scene satisfies CYBOARD pre-export checks")


def supported_export_kwargs() -> set[str]:
    try:
        return {prop.identifier for prop in bpy.ops.export_scene.gltf.get_rna_type().properties}
    except Exception:
        return set()


def export_glb(operator_id: str) -> Path:
    output = repo_root() / "public" / "operator" / operator_id / f"{operator_id}.glb"
    output.parent.mkdir(parents=True, exist_ok=True)

    desired = {
        "filepath": str(output),
        "export_format": "GLB",
        "export_yup": True,
        "export_apply": False,
        "export_animations": True,
        "export_skins": True,
        "export_morph": True,
        "export_materials": "EXPORT",
        "export_cameras": False,
        "export_lights": False,
        "export_texcoords": True,
        "export_normals": True,
        "export_tangents": True,
        "export_attributes": False,
        "export_def_bones": False,
        "export_all_vertex_influences": False,
    }

    supported = supported_export_kwargs()
    kwargs = {key: value for key, value in desired.items() if not supported or key in supported}

    # Explicitly keep runtime-unsupported compression disabled when the Blender
    # version exposes the option.
    if not supported or "export_draco_mesh_compression_enable" in supported:
        kwargs["export_draco_mesh_compression_enable"] = False

    result = bpy.ops.export_scene.gltf(**kwargs)
    if "FINISHED" not in result:
        raise SystemExit(f"Blender glTF export failed: {result}")

    print(f"✓ Exported {output}")
    return output


def main() -> None:
    operator_id = cli_operator_id()
    validate_scene(operator_id)
    export_glb(operator_id)
    print("Next: run `bun run operator:validate` from the repository root.")


if __name__ == "__main__":
    main()
