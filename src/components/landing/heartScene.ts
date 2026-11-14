import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";

/**
 * The landing page's WebGL stage: a glossy teal heart that beats softly and
 * turns as the camera orbits it with the scroll, a thin glowing ring echoing
 * the MedLens logo's swoosh, rising sparks, and a slow liquid-wave background
 * that shifts from logo teal (top) to deep sapphire (bottom).
 *
 * The page drives it: call `frame(state)` once per animation frame.
 */
export type FrameState = {
  /** smoothed scroll progress 0..1 */
  scroll: number;
  /** raw (target) scroll progress 0..1, for scroll-speed effects */
  targetScroll: number;
  /** smoothed pointer, -1..1 */
  mouseX: number;
  mouseY: number;
};

export type HeartScene = { frame: (s: FrameState) => void; resize: () => void; dispose: () => void };

export function createHeartScene(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean; mobile: boolean }): HeartScene {
  const { reducedMotion, mobile } = opts;
  const sizes = { width: window.innerWidth, height: window.innerHeight };
  const clock = new THREE.Clock();

  // ---------- renderer, scene, camera ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: false, powerPreference: "high-performance" });
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.6;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#02060d");
  scene.fog = new THREE.FogExp2("#02060d", 0.01);

  // Soft studio reflections so the glossy heart catches light like the reference bronze.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;

  const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 100);
  camera.position.set(0, 0.35, 4.2);
  scene.add(camera);

  // ---------- background liquid-wave shader (child of the camera) ----------
  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(sizes.width, sizes.height) },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uScroll: { value: 0 },
  };
  const bgMaterial = new THREE.ShaderMaterial({
    uniforms,
    depthWrite: false,
    depthTest: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform float uScroll;
      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
        float aspect = uResolution.x / uResolution.y;
        float time = uTime * 0.08;
        float scroll = uScroll;
        float angle1 = 0.6; float angle2 = -0.7; float angle3 = 1.2;
        float freq1 = 2.4;  float freq2 = 3.2;  float freq3 = 4.0;
        vec2 warpedUv = uv;
        float scrollDeform = scroll * 5.0;
        warpedUv.x += sin(uv.y * 2.5 + time * 0.2 + scrollDeform) * 0.35;
        warpedUv.y += cos(uv.x * 2.5 - time * 0.15 - scrollDeform * 0.8) * 0.35;
        warpedUv.x += sin(uv.y * 1.2 - time * 0.1 - scrollDeform * 1.5) * 0.25;
        warpedUv.y += cos(uv.x * 1.2 + time * 0.18 + scrollDeform * 1.2) * 0.25;
        warpedUv += vec2(scroll * 0.04, -scroll * 0.02) + vec2(uMouse.x * aspect * 0.05, uMouse.y * 0.05);
        vec2 dir1 = vec2(cos(angle1), sin(angle1));
        vec2 dir2 = vec2(cos(angle2), sin(angle2));
        vec2 dir3 = vec2(cos(angle3), sin(angle3));
        float w1 = sin(dot(warpedUv, dir1) * freq1 + time * 1.0);
        float w2 = cos(dot(warpedUv, dir2) * freq2 - time * 1.4 + w1 * 0.4);
        float w3 = sin(dot(warpedUv, dir3) * freq3 + time * 1.8 + w2 * 0.5);
        float waveField = w1 * 0.50 + w2 * 0.35 + w3 * 0.15;
        float wideSheen = pow(max(0.0, 1.0 - abs(waveField - 0.1)), 2.5);
        float crispSpecular = pow(max(0.0, 1.0 - abs(waveField - 0.15)), 8.0);
        float crest = wideSheen * 0.5 + crispSpecular * 0.9;
        // Top palette (scroll 0): MedLens teal. Bottom palette (scroll 1): deep sapphire.
        vec3 c0_shadow = vec3(0.0004, 0.0010, 0.0012);
        vec3 c0_wave1  = vec3(0.006, 0.040, 0.046);
        vec3 c0_wave2  = vec3(0.003, 0.022, 0.028);
        vec3 c0_crest  = vec3(0.05, 0.26, 0.29);
        vec3 c1_shadow = vec3(0.0004, 0.0006, 0.0014);
        vec3 c1_wave1  = vec3(0.014, 0.032, 0.075);
        vec3 c1_wave2  = vec3(0.008, 0.018, 0.050);
        vec3 c1_crest  = vec3(0.12, 0.24, 0.48);
        float t = smoothstep(0.0, 1.0, scroll);
        vec3 color = mix(c0_shadow, c1_shadow, t);
        color = mix(color, mix(c0_wave2, c1_wave2, t), smoothstep(-0.6, 0.2, waveField));
        color = mix(color, mix(c0_wave1, c1_wave1, t), smoothstep(0.0, 0.8, waveField));
        color += mix(c0_crest, c1_crest, t) * crest * 1.4;
        color *= 1.0 - dot(uv, uv) * 0.12;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), bgMaterial);
  bgMesh.position.set(0, 0, -8);
  bgMesh.renderOrder = -10;
  camera.add(bgMesh);

  // ---------- lighting (chiaroscuro) ----------
  scene.add(new THREE.AmbientLight("#ffffff", 0.12));
  const keyLight = new THREE.SpotLight("#ffffff", 18.0);
  keyLight.position.set(4, 6, 3);
  keyLight.angle = Math.PI / 4;
  keyLight.penumbra = 0.9;
  keyLight.castShadow = !mobile;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 1.0;
  keyLight.shadow.camera.far = 15;
  keyLight.shadow.bias = -0.001;
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight("#9fdcff", 8.0);
  rimLight.position.set(-5, 3, -4);
  scene.add(rimLight);
  const fillLight = new THREE.DirectionalLight("#bff7f4", 0.8);
  fillLight.position.set(-2, -4, 2);
  scene.add(fillLight);

  // ---------- the heart ----------
  const pivot = new THREE.Group();
  pivot.position.y = -0.1;
  scene.add(pivot);

  const heartMaterial = new THREE.MeshPhysicalMaterial({
    color: "#13aebb",
    metalness: 0.35,
    roughness: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    iridescence: 0.25,
    iridescenceIOR: 1.3,
    emissive: "#05424b",
    emissiveIntensity: 0.25,
    envMapIntensity: 0.8,
  });
  // Height about 1.5 units (the surface spans ~1.6 local units at scale 1).
  const heartScale = 0.95;
  const heart = createHeartMesh(heartMaterial, mobile ? 72 : 100);
  heart.scale.setScalar(heartScale);
  heart.castShadow = true;
  heart.receiveShadow = true;
  pivot.add(heart);

  // A thin glowing ring orbiting the heart, like the swoosh in the MedLens logo.
  const ringMaterial = new THREE.MeshBasicMaterial({ color: "#5fe9f0", transparent: true, opacity: 0.85 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.01, 12, 220), ringMaterial);
  ring.rotation.set(Math.PI / 2.35, 0.35, -0.5);
  pivot.add(ring);

  // ---------- sparks ----------
  const sparkCount = mobile ? 220 : 450;
  const sparkData: { speedX: number; speedY: number; speedZ: number; swaySpeed: number; swayRadius: number; phase: number }[] = [];
  const positions = new Float32Array(sparkCount * 3);
  const colors = new Float32Array(sparkCount * 3);
  for (let i = 0; i < sparkCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 6.5;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 5.0 - 0.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 6.5;
    if (Math.random() < 0.6) {
      // MedLens teal
      colors[i * 3] = 0.15 + Math.random() * 0.1;
      colors[i * 3 + 1] = 0.85 + Math.random() * 0.15;
      colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
    } else {
      // cool white-blue
      colors[i * 3] = 0.7 + Math.random() * 0.15;
      colors[i * 3 + 1] = 0.85 + Math.random() * 0.1;
      colors[i * 3 + 2] = 1.0;
    }
    sparkData.push({
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: 0.15 + Math.random() * 0.3,
      speedZ: (Math.random() - 0.5) * 0.4,
      swaySpeed: 0.5 + Math.random() * 1.5,
      swayRadius: 0.05 + Math.random() * 0.15,
      phase: Math.random() * Math.PI * 2,
    });
  }
  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  sparkGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const sparkTexture = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 16;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.85)");
    g.addColorStop(0.6, "rgba(255,255,255,0.3)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 16);
    return new THREE.CanvasTexture(c);
  })();
  const sparkMaterial = new THREE.PointsMaterial({
    size: 0.025,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    map: sparkTexture,
  });
  const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
  scene.add(sparks);

  // Resting heartbeat (about 64 bpm): a strong "lub" then a softer "dub".
  const beat = (t: number) => {
    const ph = (t * 1.07) % 1;
    return Math.exp(-((ph - 0.0) ** 2) / 0.0018) * 0.055 + Math.exp(-((ph - 0.22) ** 2) / 0.0018) * 0.03;
  };

  const lookAt = new THREE.Vector3();
  const targetPos = new THREE.Vector3();

  function frame(s: FrameState) {
    const delta = Math.min(clock.getDelta(), 0.1);
    const time = clock.getElapsedTime();

    pivot.rotation.y = s.mouseX * 0.25;
    pivot.rotation.x = s.mouseY * 0.15;
    if (!reducedMotion) {
      heart.scale.setScalar(heartScale * (1 + beat(time)));
      ring.rotation.z = -0.5 + time * 0.12;
      ringMaterial.opacity = 0.55 + beat(time) * 6;
    }

    // Sparks rise; they swirl faster while the page is scrolling.
    if (!reducedMotion) {
      const v = Math.abs(s.targetScroll - s.scroll);
      const speed = 1 + v * 9;
      const turbulence = v * 0.8;
      for (let i = 0; i < sparkCount; i++) {
        const idx = i * 3;
        const d = sparkData[i];
        positions[idx] += d.speedX * delta * speed;
        positions[idx + 1] += d.speedY * delta * speed;
        positions[idx + 2] += d.speedZ * delta * speed;
        const sway = d.swayRadius * (1 + turbulence * 4);
        positions[idx] += Math.sin(time * d.swaySpeed + d.phase) * sway * delta;
        positions[idx + 2] += Math.cos(time * d.swaySpeed + d.phase) * sway * delta;
        if (positions[idx + 1] > 3.0 || Math.abs(positions[idx]) > 3.5 || Math.abs(positions[idx + 2]) > 3.5) {
          positions[idx + 1] = -2.5;
          positions[idx] = (Math.random() - 0.5) * 3.0;
          positions[idx + 2] = (Math.random() - 0.5) * 3.0;
        }
      }
      sparkGeometry.attributes.position.needsUpdate = true;
    }

    // The camera flies a full orbit around the heart as the page scrolls.
    const phi = s.scroll * Math.PI * 2;
    const arc = Math.sin(s.scroll * Math.PI);
    const radius = (mobile ? 6.2 : 4.2) - arc * 0.6;
    targetPos.set(radius * Math.sin(phi), 0.35 + arc * 0.8, radius * Math.cos(phi));
    // On the first screen the heart sits right of centre, leaving room for the text (desktop only).
    const p = Math.min(1, s.scroll / 0.28);
    const ease = (Math.cos(p * Math.PI) + 1) * 0.5;
    // Desktop: the heart sits right of the opening text. Phone: it sits above the text.
    lookAt.set(mobile ? 0 : -1.4 * ease, mobile ? -1.25 : -0.15, 0);
    // Scroll is already smoothed, so the camera sits exactly on its orbit; a
    // second straight-line lerp would cut across the circle, through the heart.
    camera.position.copy(targetPos);
    camera.lookAt(lookAt);

    uniforms.uTime.value = reducedMotion ? 0 : time;
    uniforms.uMouse.value.set(s.mouseX, -s.mouseY);
    uniforms.uScroll.value = s.scroll;
    renderer.render(scene, camera);
  }

  function resize() {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
    uniforms.uResolution.value.set(sizes.width, sizes.height);
  }

  function dispose() {
    heart.geometry.dispose();
    heartMaterial.dispose();
    ring.geometry.dispose();
    ringMaterial.dispose();
    sparkGeometry.dispose();
    sparkMaterial.dispose();
    sparkTexture.dispose();
    bgMesh.geometry.dispose();
    bgMaterial.dispose();
    envTexture.dispose();
    pmrem.dispose();
    renderer.dispose();
  }

  return { frame, resize, dispose };
}

/**
 * The classic 3D heart surface (Taubin):
 *   (x^2 + 9/4 d^2 + u^2 - 1)^3 - x^2 u^3 - 9/80 d^2 u^3 = 0
 * (x = width, u = up, d = depth), traced once with marching cubes. The result
 * is a seamless, rounded heart with smooth normals.
 */
function createHeartMesh(material: THREE.Material, res: number): MarchingCubes {
  const mc = new MarchingCubes(res, material, false, false, res * res * 12);
  mc.isolation = 0;
  const extent = 1.4; // field coordinates covered by the local -1..1 cube
  const half = res / 2;
  for (let k = 0; k < res; k++) {
    const d = ((k - half) / half) * extent; // local z: depth
    for (let j = 0; j < res; j++) {
      const u = ((j - half) / half) * extent + 0.12; // local y: up (centred)
      for (let i = 0; i < res; i++) {
        const x = ((i - half) / half) * extent;
        const base = x * x + 2.25 * d * d + u * u - 1;
        const u3 = u * u * u;
        const f = base * base * base - x * x * u3 - 0.1125 * d * d * u3;
        mc.field[i + j * res + k * res * res] = -f; // positive inside
      }
    }
  }
  mc.update();
  return mc;
}
