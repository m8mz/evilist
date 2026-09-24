// Three.js aura: crimson particles rising behind the hero portrait, leaning toward the pointer.
// Loaded on demand by hero-aura.ts. One draw call; all motion computed in the vertex shader.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from "three";

const COUNT = 420;
const MAX_DPR = 1.5;

const vertexShader = /* glsl */ `
  attribute float aSeed;
  attribute float aSpeed;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  varying float vLife;

  void main() {
    vec3 p = position;
    float life = fract(aSeed + uTime * aSpeed);
    p.y = mix(-1.15, 1.35, life);
    p.x += sin(uTime * 0.7 + aSeed * 23.0) * 0.07 * life;
    vLife = life;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (1.0 - life * 0.55) / -mv.z;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHot;
  varying float vLife;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float disc = pow(smoothstep(0.5, 0.0, d), 2.2); // soft ember, not a hard dot
    float fade = smoothstep(0.0, 0.12, vLife) * (1.0 - smoothstep(0.55, 1.0, vLife));
    gl_FragColor = vec4(mix(uHot, uColor, vLife), disc * fade * 0.6);
  }
`;

function buildGeometry(): BufferGeometry {
  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  const speeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    // Denser near the silhouette's edges, so the glow reads as an outline around the portrait.
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side * (0.5 + Math.abs(gauss()) * 0.16);
    positions.set([x, 0, (Math.random() - 0.5) * 0.8], i * 3);
    seeds[i] = Math.random();
    speeds[i] = 0.07 + Math.random() * 0.1;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));
  geometry.setAttribute("aSpeed", new BufferAttribute(speeds, 1));
  return geometry;
}

function gauss(): number {
  // Box-Muller, good enough for particle placement.
  return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
}

export function mountAura(host: HTMLElement): void {
  const css = getComputedStyle(document.documentElement);
  const color = new Color(css.getPropertyValue("--color-hanko").trim() || "#d7263d");
  const hot = new Color(css.getPropertyValue("--color-hanko-hot").trim() || "#ff5a6b");

  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });
  const dpr = Math.min(devicePixelRatio, MAX_DPR);
  renderer.setPixelRatio(dpr);
  renderer.domElement.classList.add("aura-canvas");
  host.append(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.1, 10);
  camera.position.z = 3;

  const geometry = buildGeometry();
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: dpr },
      uSize: { value: 64 },
      uColor: { value: color },
      uHot: { value: hot },
    },
  });
  const points = new Points(geometry, material);
  scene.add(points);

  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false); // CSS sizes the canvas; don't touch its style
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);

  let targetTilt = 0;
  const onPointer = (e: PointerEvent) => {
    targetTilt = (e.clientX / innerWidth - 0.5) * 0.5;
  };
  addEventListener("pointermove", onPointer, { passive: true });

  let visible = true;
  let frame = 0;
  let last = performance.now();
  let elapsed = 0;

  const tick = (now: number) => {
    frame = 0;
    elapsed += Math.min(now - last, 100) / 1000; // don't jump after a pause
    last = now;
    material.uniforms.uTime.value = elapsed;
    points.rotation.y += (targetTilt - points.rotation.y) * 0.05;
    renderer.render(scene, camera);
    if (!host.classList.contains("is-live")) host.classList.add("is-live");
    schedule();
  };

  const schedule = () => {
    if (!frame && visible && !document.hidden) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };

  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  });
  intersection.observe(host);
  document.addEventListener("visibilitychange", schedule);

  addEventListener(
    "pagehide",
    () => {
      cancelAnimationFrame(frame);
      intersection.disconnect();
      resizeObserver.disconnect();
      removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", schedule);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
    { once: true },
  );

  schedule();
}
