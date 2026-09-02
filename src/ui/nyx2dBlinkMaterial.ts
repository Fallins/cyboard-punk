import * as THREE from 'three';

export interface Nyx2DBlinkMaterial extends THREE.ShaderMaterial {
  uniforms: {
    uMap: { value: THREE.Texture | null };
    uBlink: { value: number };
  };
}

// Calibrated against the approved 941×1672 NYX_MASTER. These are deliberately
// tight eye apertures; eyebrows and surrounding hair stay outside the overlay.
const LEFT_EYE_CENTER = [0.439, 0.908] as const;
const RIGHT_EYE_CENTER = [0.525, 0.908] as const;
const EYE_RADIUS = [0.026, 0.0095] as const;

export function createNyx2DBlinkMaterial(): Nyx2DBlinkMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: null as THREE.Texture | null },
      uBlink: { value: 0 },
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
      uniform float uBlink;
      varying vec2 vUv;

      float ellipseMask(vec2 uv, vec2 center, vec2 radius) {
        vec2 d = (uv - center) / radius;
        float dist = dot(d, d);
        return 1.0 - smoothstep(0.72, 1.0, dist);
      }

      vec4 eyelid(vec2 uv, vec2 center, vec2 radius) {
        float mask = ellipseMask(uv, center, radius);
        if (mask <= 0.001) return vec4(0.0);

        // Sample a narrow strip of skin immediately above the eye aperture.
        // Keeping x from the current fragment preserves local lighting gradients
        // instead of painting a flat skin-colored patch over the eye.
        vec2 skinUv = vec2(uv.x, center.y + radius.y * 1.35);
        vec4 skin = texture2D(uMap, skinUv);

        vec2 d = (uv - center) / radius;
        float lash = 1.0 - smoothstep(0.02, 0.22, abs(d.y + 0.03));
        vec3 lashColor = vec3(0.085, 0.045, 0.075);
        vec3 color = mix(skin.rgb, lashColor, lash * 0.34 * uBlink);
        return vec4(color, skin.a * mask * uBlink);
      }

      void main() {
        if (uBlink <= 0.001) discard;

        vec4 left = eyelid(vUv, vec2(${LEFT_EYE_CENTER[0]}, ${LEFT_EYE_CENTER[1]}), vec2(${EYE_RADIUS[0]}, ${EYE_RADIUS[1]}));
        vec4 right = eyelid(vUv, vec2(${RIGHT_EYE_CENTER[0]}, ${RIGHT_EYE_CENTER[1]}), vec2(${EYE_RADIUS[0]}, ${EYE_RADIUS[1]}));
        vec4 result = left.a >= right.a ? left : right;
        if (result.a <= 0.001) discard;
        gl_FragColor = result;
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  }) as Nyx2DBlinkMaterial;
}
