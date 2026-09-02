import * as THREE from 'three';

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
        return 1.0 - smoothstep(0.72, 1.0, dot(d, d));
      }

      vec4 eyeLayer(vec2 uv, vec2 center, vec2 radius) {
        float originalMask = ellipseMask(uv, center, radius * 1.08);
        float movedMask = ellipseMask(uv, center + uOffset, radius);
        if (max(originalMask, movedMask) <= 0.001) return vec4(0.0);

        // Reconstruct the tiny area behind the original iris from the adjacent
        // sclera. Sampling left/right based on fragment position preserves some
        // of the eye's native horizontal lighting gradient.
        float side = uv.x < center.x ? -1.0 : 1.0;
        vec2 scleraUv = vec2(center.x + side * radius.x * 1.72, uv.y);
        vec4 sclera = texture2D(uMap, scleraUv);

        // At the moved iris location, sample back from the original iris so the
        // approved iris/pupil pixels themselves are reused rather than redrawn.
        vec4 iris = texture2D(uMap, uv - uOffset);
        vec3 color = mix(sclera.rgb, iris.rgb, movedMask);
        float alpha = max(originalMask, movedMask) * max(sclera.a, iris.a);
        return vec4(color, alpha);
      }

      void main() {
        vec4 left = eyeLayer(vUv, vec2(${LEFT_EYE_CENTER[0]}, ${LEFT_EYE_CENTER[1]}), vec2(${IRIS_RADIUS[0]}, ${IRIS_RADIUS[1]}));
        vec4 right = eyeLayer(vUv, vec2(${RIGHT_EYE_CENTER[0]}, ${RIGHT_EYE_CENTER[1]}), vec2(${IRIS_RADIUS[0]}, ${IRIS_RADIUS[1]}));
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
