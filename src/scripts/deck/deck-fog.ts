// The far-field fog (deck spec §8, "Fog"): three octaves of value noise scrolled upward, masked by a
// radial falloff around the energetic card, additive violet. Plain strings and uniform objects, no
// Three import, so the shader is unit-testable; deck-effects.ts wraps them in a ShaderMaterial.
// Coordinates: the plane's uv with x scaled by the stage's aspect, so distances are circular on
// screen; uCentre in uv, uRadius in stage-height units.
// A type literal gets an implicit index signature, so Three's ShaderMaterial accepts it as its
// uniforms map without a cast, while an interface does not.
export type FogUniforms = {
  uTime: { value: number };
  uCentre: { value: [number, number] };
  uRadius: { value: number };
  uStrength: { value: number };
  uAspect: { value: number };
  uColor: { value: [number, number, number] };
};

export function fogUniforms(color: [number, number, number]): FogUniforms {
  return {
    uTime: { value: 0 },
    uCentre: { value: [0.5, 0.5] },
    uRadius: { value: 0 },
    uStrength: { value: 0 },
    uAspect: { value: 1 },
    uColor: { value: color },
  };
}

export const FOG_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const FOG_FRAGMENT = /* glsl */ `
precision mediump float;
uniform float uTime;
uniform vec2 uCentre;
uniform float uRadius;
uniform float uStrength;
uniform float uAspect;
uniform vec3 uColor;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  vec2 q = vec2(vUv.x * uAspect, vUv.y);
  float rise = uTime * 0.00004;
  float n = 0.55 * vnoise(q * 3.0 + vec2(0.0, -rise * 2.0))
          + 0.30 * vnoise(q * 6.0 + vec2(7.3, -rise * 3.0))
          + 0.15 * vnoise(q * 12.0 + vec2(3.1, -rise * 5.0));
  float d = distance(q, vec2(uCentre.x * uAspect, uCentre.y));
  // smoothstep with equal edges is undefined (NaN on most GPUs) and the factory's neutral radius is 0, so the guard keeps a tiny radius that evaluates to no fog.
  float falloff = 1.0 - smoothstep(0.0, max(uRadius, 1e-4), d);
  float a = uStrength * n * falloff;
  gl_FragColor = vec4(uColor * a, a);
}
`;
