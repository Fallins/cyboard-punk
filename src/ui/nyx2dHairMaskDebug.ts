import * as THREE from 'three';
import { NYX_2D_RIG_ZONES, nyx2DRectToShader } from './nyx2dRig';

export type Nyx2DHairMaskDebugMaterial = THREE.ShaderMaterial & {
  uniforms: THREE.ShaderMaterial['uniforms'] & {
    uMap: { value: THREE.Texture | null };
  };
};

export function nyx2DHairMaskDebugEnabled(value?: string): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'on';
}

function rectVector(name: 'hairOuterLeft' | 'hairCrown' | 'hairOuterRight') {
  const [left, bottom, right, top] = nyx2DRectToShader(NYX_2D_RIG_ZONES[name]);
  return new THREE.Vector4(left, bottom, right, top);
}

export function createNyx2DHairMaskDebugMaterial(): Nyx2DHairMaskDebugMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: null as THREE.Texture | null },
      uLeft: { value: rectVector('hairOuterLeft') },
      uCrown: { value: rectVector('hairCrown') },
      uRight: { value: rectVector('hairOuterRight') },
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
      uniform vec4 uLeft;
      uniform vec4 uCrown;
      uniform vec4 uRight;
      varying vec2 vUv;

      float rectInside(vec2 uv, vec4 rect) {
        return step(rect.x, uv.x) * step(uv.x, rect.z) * step(rect.y, uv.y) * step(uv.y, rect.w);
      }

      void main() {
        float safeZone = max(rectInside(vUv, uLeft), max(rectInside(vUv, uCrown), rectInside(vUv, uRight)));
        if (safeZone <= 0.001) discard;

        vec4 source = texture2D(uMap, vUv);
        float maxChannel = max(source.r, max(source.g, source.b));
        float minChannel = min(source.r, min(source.g, source.b));
        float chroma = maxChannel - minChannel;

        // Purple hair generally keeps both red and blue above green. Restricting
        // this chroma test to the three face-safe spatial zones prevents suit/core
        // neon elsewhere in the master from entering the first hair candidate.
        float purple = smoothstep(0.025, 0.15, min(source.r, source.b) - source.g * 0.72);
        float saturated = smoothstep(0.035, 0.18, chroma);
        float notNeon = 1.0 - smoothstep(0.78, 0.98, maxChannel);
        float mask = source.a * safeZone * purple * saturated * max(0.28, notNeon);

        if (mask <= 0.015) discard;
        vec3 overlay = mix(vec3(0.20, 1.00, 0.62), vec3(1.00, 0.22, 0.88), smoothstep(0.15, 0.75, mask));
        gl_FragColor = vec4(overlay, 0.72 * mask);
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  }) as Nyx2DHairMaskDebugMaterial;
}
