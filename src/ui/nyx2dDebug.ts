import * as THREE from 'three';
import { NYX_2D_RIG_ZONES, nyx2DRectToShader } from './nyx2dRig';

export function nyx2DRigDebugEnabled(value?: string): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'on';
}

function rectUniform(name: keyof typeof NYX_2D_RIG_ZONES) {
  const [left, bottom, right, top] = nyx2DRectToShader(NYX_2D_RIG_ZONES[name]);
  return new THREE.Vector4(left, bottom, right, top);
}

export function createNyx2DRigDebugMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uHead: { value: rectUniform('head') },
      uFace: { value: rectUniform('protectedFace') },
      uTorso: { value: rectUniform('torso') },
      uHips: { value: rectUniform('hips') },
      uLegs: { value: rectUniform('legs') },
      uCore: { value: rectUniform('core') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec4 uHead;
      uniform vec4 uFace;
      uniform vec4 uTorso;
      uniform vec4 uHips;
      uniform vec4 uLegs;
      uniform vec4 uCore;
      varying vec2 vUv;

      float rectInside(vec2 uv, vec4 rect) {
        return step(rect.x, uv.x) * step(uv.x, rect.z) * step(rect.y, uv.y) * step(uv.y, rect.w);
      }

      float rectBorder(vec2 uv, vec4 rect, float thickness) {
        float inside = rectInside(uv, rect);
        if (inside < 0.5) return 0.0;
        float edge = min(
          min(abs(uv.x - rect.x), abs(uv.x - rect.z)),
          min(abs(uv.y - rect.y), abs(uv.y - rect.w))
        );
        return inside * (1.0 - smoothstep(thickness * 0.45, thickness, edge));
      }

      void main() {
        float head = rectBorder(vUv, uHead, 0.0040);
        float face = max(rectBorder(vUv, uFace, 0.0045), rectInside(vUv, uFace) * 0.12);
        float torso = rectBorder(vUv, uTorso, 0.0035);
        float hips = rectBorder(vUv, uHips, 0.0035);
        float legs = rectBorder(vUv, uLegs, 0.0030);
        float core = max(rectBorder(vUv, uCore, 0.0045), rectInside(vUv, uCore) * 0.08);

        vec3 rgb = vec3(0.0);
        float alpha = 0.0;
        rgb += vec3(0.20, 0.95, 1.00) * head;
        alpha = max(alpha, head * 0.82);
        rgb += vec3(1.00, 0.25, 0.65) * face;
        alpha = max(alpha, face * 0.78);
        rgb += vec3(0.45, 1.00, 0.45) * torso;
        alpha = max(alpha, torso * 0.74);
        rgb += vec3(1.00, 0.78, 0.20) * hips;
        alpha = max(alpha, hips * 0.72);
        rgb += vec3(0.55, 0.48, 1.00) * legs;
        alpha = max(alpha, legs * 0.68);
        rgb += vec3(1.00, 0.15, 0.95) * core;
        alpha = max(alpha, core * 0.90);

        if (alpha <= 0.001) discard;
        gl_FragColor = vec4(rgb, alpha);
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.NormalBlending,
  });
}
