import * as THREE from 'three';
import { NYX_2D_GAZE_BOUNDS } from './nyx2dGaze';

export type Nyx2DGazeMaterial = THREE.ShaderMaterial & {
  uniforms: THREE.ShaderMaterial['uniforms'] & {
    uMap: { value: THREE.Texture | null };
    uOffset: { value: THREE.Vector2 };
  };
};

const LEFT_EYE_CENTER = [0.439, 0.908] as const;
const RIGHT_EYE_CENTER = [0.525, 0.908] as const;
const IRIS_RADIUS = [0.0105, 0.0057] as const;

export function createNyx2DGazeMaterial(): Nyx2DGazeMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: null as THREE.Texture | null },
      uOffset: { value: new THREE.Vector2() },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec2 uOffset;
      varying vec2 vUv;

      float ellipseMask(vec2 uv, vec2 center, vec2 radius) {
        vec2 d = (uv - center) / radius;
        return 1.0 - smoothstep(0.62, 1.0, dot(d, d));
      }

      vec4 irisAccent(vec2 uv, vec2 center, vec2 radius) {
        float movedMask = ellipseMask(uv, center + uOffset, radius * 0.92);
        if (movedMask <= 0.001) return vec4(0.0);

        // Non-destructive graduation path: reuse only approved iris/pupil pixels.
        // We intentionally do NOT erase/reconstruct the original iris with sampled
        // sclera. That earlier technique could expose dark eyelid/liner samples and
        // create the frightening black-eye artifact. The base face remains intact.
        vec4 iris = texture2D(uMap, uv - uOffset);
        vec2 normalizedOffset = vec2(
          uOffset.x / ${NYX_2D_GAZE_BOUNDS.u.toFixed(6)},
          uOffset.y / ${NYX_2D_GAZE_BOUNDS.v.toFixed(6)}
        );
        float movement = length(normalizedOffset);
        float strength = smoothstep(0.08, 0.72, movement) * 0.34;
        return vec4(iris.rgb, iris.a * movedMask * strength);
      }

      void main() {
        // Exact center means exact zero overlay. This avoids a permanent second
        // iris layer and keeps neutral fidelity identical to the approved master.
        if (length(uOffset) <= 0.00005) discard;

        vec4 left = irisAccent(vUv, vec2(${LEFT_EYE_CENTER[0]}, ${LEFT_EYE_CENTER[1]}), vec2(${IRIS_RADIUS[0]}, ${IRIS_RADIUS[1]}));
        vec4 right = irisAccent(vUv, vec2(${RIGHT_EYE_CENTER[0]}, ${RIGHT_EYE_CENTER[1]}), vec2(${IRIS_RADIUS[0]}, ${IRIS_RADIUS[1]}));
        vec4 result = left.a >= right.a ? left : right;
        if (result.a <= 0.001) discard;
        gl_FragColor = result;
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  }) as Nyx2DGazeMaterial;
}
