// Hero A · "Silk 3D": real WebGL silk. Glossy red glass ribbons flow in 3D; scrolling flies the camera forward through them
// while the hero stays pinned and three story beats play (scrollytelling). Mouse moves the camera a little (parallax).
// Bloom gives the hot edges their glow. Renders only while the hero is on screen. Returns { destroy } so the option switcher
// can tear it down. Uses three r166 (lib/t166) with its matching postprocessing addons.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export function mountSilk(root, { onProgress } = {}) {
  const cv = root.querySelector("canvas.silk");
  const small = innerWidth < 760;
  let R;
  try { R = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: "high-performance" }); } catch (e) { return null; }
  R.setPixelRatio(Math.min(devicePixelRatio, small ? 1.25 : 1.5));
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.92; R.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#060203"); scene.fog = new THREE.FogExp2("#060203", 0.055);
  scene.environment = new THREE.PMREMGenerator(R).fromScene(new RoomEnvironment(R), 0.04).texture;
  const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 120); cam.position.set(0, 0, 14);
  const key = new THREE.PointLight("#ff4a1a", 150, 60); key.position.set(6, 6, 8);
  const rim = new THREE.PointLight("#ffb347", 120, 60); rim.position.set(-8, -4, 2);
  const deep = new THREE.PointLight("#d7000f", 150, 80); deep.position.set(0, 2, -18);
  scene.add(key, rim, deep, new THREE.AmbientLight("#2a0004", 0.8));

  // ---- ribbons: a long strip whose centre line waves in y/z and whose cross-section twists along its length ----
  const SL = small ? 180 : 320, SW = small ? 10 : 18;
  const cols = ["#C4000E", "#8a0008", "#D7000F", "#6a0006", "#e0200f", "#ff3a12", "#a8000b"];
  const ribbons = [];
  const R0 = [ // y, z, width, amplitude, twist, speed, phase, x-tilt
    [-1.6, 2, 3.6, 1.4, 1.6, 0.35, 0.0, -0.10], [1.8, -2, 2.6, 1.1, 2.2, 0.42, 1.7, 0.16], [-0.4, -7, 4.2, 1.8, 1.2, 0.3, 3.1, 0.05],
    [2.6, -12, 3.0, 1.5, 2.6, 0.38, 4.4, -0.2], [-2.4, -16, 3.8, 1.6, 1.8, 0.33, 5.6, 0.12], [0.8, -22, 3.2, 1.3, 2.0, 0.4, 2.3, -0.08],
    [-1.0, -28, 4.6, 2.0, 1.4, 0.28, 0.9, 0.18]];
  R0.forEach(([y, z, w, amp, tw, sp, ph, tilt], i) => {
    const g = new THREE.PlaneGeometry(46, w, SL, SW); const base = g.attributes.position.array.slice();
    // deep red glass: tinted (metal) reflections, sharp clearcoat streaks, a dark glowing body; no sheen (it washes it pink)
    const m = new THREE.MeshPhysicalMaterial({ color: cols[i % cols.length], roughness: 0.1, metalness: 0.38, clearcoat: 1, clearcoatRoughness: 0.03,
      emissive: new THREE.Color("#5a0006"), emissiveIntensity: 0.55, envMapIntensity: 0.55, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, m); mesh.position.set(0, y, z); mesh.rotation.z = tilt; scene.add(mesh);
    ribbons.push({ g, base, amp, tw, sp, ph });
  });
  function flow(t, boost) {
    for (const rb of ribbons) {
      const p = rb.g.attributes.position.array, b = rb.base, T = t * rb.sp * (1 + boost);
      for (let k = 0; k < p.length; k += 3) {
        const x = b[k], v = b[k + 1];
        const cy = rb.amp * Math.sin(x * 0.18 + T + rb.ph) + 0.5 * rb.amp * Math.sin(x * 0.41 - T * 1.3 + rb.ph * 2);
        const cz = 1.6 * Math.cos(x * 0.15 + T * 0.8 + rb.ph);
        const th = rb.tw * Math.sin(x * 0.12 + T * 0.7 + rb.ph) + 0.4 * Math.sin(x * 0.33 - T);
        p[k] = x; p[k + 1] = cy + v * Math.cos(th); p[k + 2] = cz + v * Math.sin(th);
      }
      rb.g.attributes.position.needsUpdate = true; rb.g.computeVertexNormals();
    }
  }
  // ---- embers drifting through the depth ----
  const NE = small ? 220 : 520, ep = new Float32Array(NE * 3), es = new Float32Array(NE);
  for (let i = 0; i < NE; i++) { ep.set([(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 16, 10 - Math.random() * 44], i * 3); es[i] = 0.3 + Math.random(); }
  const eg = new THREE.BufferGeometry(); eg.setAttribute("position", new THREE.BufferAttribute(ep, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: "#ffb070", size: 0.07, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(embers);

  // ---- post: bloom for the hot edges ----
  const comp = new EffectComposer(R); comp.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), small ? 0.42 : 0.55, 0.4, 0.78); comp.addPass(bloom); comp.addPass(new OutputPass());
  function size() { const w = root.clientWidth, h = root.clientHeight; R.setSize(w, h, false); comp.setSize(w, h); bloom.resolution.set(w / 2, h / 2); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  addEventListener("resize", size); size();

  // ---- scroll + pointer state ----
  let prog = 0, vel = 0, px = 0, py = 0, sx = 0, sy = 0, on = true, raf = 0, t0 = performance.now();
  const pm = (e) => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; }; addEventListener("pointermove", pm);
  const ease = (a) => a * a * (3 - 2 * a);
  function frame(now) {
    raf = 0; if (!on || document.hidden) return;
    const t = (now - t0) / 1000; vel *= 0.92;
    flow(t, Math.min(2.5, Math.abs(vel) * 0.004));
    // camera flies forward through the ribbons as the story advances
    const p = ease(prog);
    sx += (px - sx) * 0.05; sy += (py - sy) * 0.05;
    cam.position.set(Math.sin(p * Math.PI) * 2.6 + sx * 1.6, -p * 1.2 - sy * 1.0, 14 - p * 34);
    cam.lookAt(sx * 2, -p * 1.5, cam.position.z - 12); cam.rotation.z += p * 0.35;
    deep.position.z = cam.position.z - 14; key.position.z = cam.position.z - 4;
    key.color.setHSL(0.02 + p * 0.06, 1, 0.55); R.toneMappingExposure = 0.92 + p * 0.18;
    const a = eg.attributes.position.array; for (let i = 0; i < NE; i++) { a[i * 3 + 1] += 0.004 * es[i]; if (a[i * 3 + 1] > 8) a[i * 3 + 1] = -8; } eg.attributes.position.needsUpdate = true;
    comp.render();
    raf = requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) raf = requestAnimationFrame(frame); }); io.observe(root);
  const vis = () => { if (!document.hidden && on && !raf) raf = requestAnimationFrame(frame); }; document.addEventListener("visibilitychange", vis);
  raf = requestAnimationFrame(frame);
  return {
    set progress(v) { prog = v; onProgress && onProgress(v); },
    set velocity(v) { vel = v; },
    destroy() { on = false; cancelAnimationFrame(raf); io.disconnect(); removeEventListener("resize", size); removeEventListener("pointermove", pm); document.removeEventListener("visibilitychange", vis);
      ribbons.forEach((r) => r.g.dispose()); eg.dispose(); comp.dispose && comp.dispose(); R.dispose(); },
  };
}
