// Synergy of territories (deck slide 18), as three live 3D icons in one WebGL canvas (three scissored viewports):
//   1 Omnichannel marketing ecosystem: a ring of particles with channel nodes orbiting it
//   2 Agile & innovative methods: a molten red blob that keeps re-shaping itself (noise-displaced sphere; indexed, so the normals stay smooth)
//   3 Next-gen focused perspective: a glass core inside a scanning orbital ring
// Renders only while on screen and the tab is visible; the pointer tilts all three. Reduced motion: one still frame.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
export function mountSynergy(canvas) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  R.setPixelRatio(Math.min(devicePixelRatio, 1.5)); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping;
  const env = new THREE.PMREMGenerator(R).fromScene(new RoomEnvironment(R), 0.04).texture;
  const mk = () => { const s = new THREE.Scene(); s.environment = env; const c = new THREE.PerspectiveCamera(35, 1, 0.1, 50); c.position.set(0, 0, 8); const l = new THREE.PointLight("#ff5a1f", 30, 12); l.position.set(2, 2, 3); s.add(l, new THREE.AmbientLight("#ffffff", 0.3)); return { s, c }; };
  // 1 omnichannel ring
  const A = mk(), ringG = new THREE.BufferGeometry(), N = 2600, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const u = Math.random() * Math.PI * 2, v = Math.random() * Math.PI * 2, R1 = 1.6, r2 = 0.42 * Math.sqrt(Math.random());
    pos.set([(R1 + r2 * Math.cos(v)) * Math.cos(u), r2 * Math.sin(v), (R1 + r2 * Math.cos(v)) * Math.sin(u)], i * 3); }
  ringG.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const ring = new THREE.Points(ringG, new THREE.PointsMaterial({ color: "#ffffff", size: 0.025, transparent: true, opacity: 0.9 }));
  const nodes = new THREE.Group(); for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), new THREE.MeshStandardMaterial({ color: i % 2 ? "#D7000F" : "#ff7a1a", emissive: i % 2 ? "#5a0006" : "#7a2400", metalness: 0.3, roughness: 0.25 })); m.userData.a = (i / 6) * Math.PI * 2; nodes.add(m); }
  const gA = new THREE.Group(); gA.add(ring, nodes); gA.rotation.x = 1.0; A.s.add(gA);
  // 2 agile blob
  const B = mk(), blobG = new THREE.SphereGeometry(1.25, 160, 120), base = blobG.attributes.position.array.slice();
  const blob = new THREE.Mesh(blobG, new THREE.MeshStandardMaterial({ color: "#D7000F", metalness: 0.65, roughness: 0.18, envMapIntensity: 1.2 })); B.s.add(blob);
  const n3 = (x, y, z, t) => Math.sin(x * 2.1 + t) * Math.cos(y * 1.7 - t * 0.8) * Math.sin(z * 1.9 + t * 0.6);
  // 3 next-gen core
  const C = mk(), core = new THREE.Mesh(new THREE.SphereGeometry(0.9, 64, 48), new THREE.MeshPhysicalMaterial({ color: "#ffffff", transmission: 1, thickness: 0.8, roughness: 0.05, ior: 1.5 }));
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.42, 48, 32), new THREE.MeshStandardMaterial({ color: "#ff4a12", emissive: "#D7000F", emissiveIntensity: 1.4 }));
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.025, 12, 160), new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 1, roughness: 0.15 }));
  const orbit2 = orbit.clone(); orbit2.scale.setScalar(1.18);
  const gC = new THREE.Group(); gC.add(core, heart, orbit, orbit2); C.s.add(gC);
  const views = [A, B, C];
  let px = 0, py = 0, on = false, t0 = performance.now();
  canvas.addEventListener("pointermove", (e) => { const r = canvas.getBoundingClientRect(); px = (e.clientX - r.left) / r.width - 0.5; py = (e.clientY - r.top) / r.height - 0.5; });
  function size() { const w = canvas.clientWidth, h = canvas.clientHeight; R.setSize(w, h, false); views.forEach((v) => { v.c.aspect = (w / 3) / h; v.c.updateProjectionMatrix(); }); }
  addEventListener("resize", size); size();
  function draw(now) {
    const t = (now - t0) / 1000, w = canvas.clientWidth, h = canvas.clientHeight;
    gA.rotation.z = t * 0.25; gA.rotation.y = px * 0.6; nodes.children.forEach((m, i) => { const a = m.userData.a + t * 0.6; m.position.set(Math.cos(a) * 1.6, Math.sin(a * 2) * 0.15, Math.sin(a) * 1.6); });
    const p = blobG.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const x = base[i], y = base[i + 1], z = base[i + 2], d = 1 + 0.22 * n3(x, y, z, t * 1.2); p[i] = x * d; p[i + 1] = y * d; p[i + 2] = z * d; }
    blobG.attributes.position.needsUpdate = true; blobG.computeVertexNormals(); blob.rotation.set(py * 0.6, t * 0.3 + px * 0.8, 0);
    orbit.rotation.set(1.1 + Math.sin(t) * 0.2, t * 0.8, 0); orbit2.rotation.set(-0.6, -t * 0.5, 0.4); heart.scale.setScalar(1 + Math.sin(t * 3) * 0.06); gC.rotation.y = px * 0.8; gC.rotation.x = py * 0.4;
    R.setScissorTest(true);
    views.forEach((v, i) => { R.setViewport((w / 3) * i, 0, w / 3, h); R.setScissor((w / 3) * i, 0, w / 3, h); R.render(v.s, v.c); });
  }
  if (reduce) { draw(performance.now()); return; }
  new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) requestAnimationFrame(loop); }).observe(canvas);
  function loop(now) { if (!on || document.hidden) return; draw(now); requestAnimationFrame(loop); }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && on) requestAnimationFrame(loop); });
}
