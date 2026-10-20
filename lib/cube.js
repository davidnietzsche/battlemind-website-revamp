// Hero · the Battle cube (ref: Wprime's pixel Rubik's cube, recoloured to Battle red, white and black).
// It floats over Ian's palm and plays like a short clip: scramble, solve, then turn the solved face to the viewer.
// Each face is ONE pixel icon spread over its 9 stickers (one canvas per face, each sticker shows its third of it), so a
// twist breaks the icons apart and a solve puts the right combination back together: a result (followers, ROI, ...).
// Solving = playing the recorded scramble backwards (no solver). After every quarter turn, positions snap to the integer
// grid and rotations to 90 degrees, so the cube never drifts however long it plays.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// face frames of the solved cube: outward normal n, right u, up v (u x v = n). Order = faces[] order from the page.
export const FRAMES = [
  { n: V(0, 0, 1), u: V(1, 0, 0), v: V(0, 1, 0) },   // 0 front
  { n: V(1, 0, 0), u: V(0, 0, -1), v: V(0, 1, 0) },  // 1 right
  { n: V(0, 1, 0), u: V(1, 0, 0), v: V(0, 0, -1) },  // 2 top
  { n: V(0, 0, -1), u: V(-1, 0, 0), v: V(0, 1, 0) }, // 3 back
  { n: V(-1, 0, 0), u: V(0, 0, 1), v: V(0, 1, 0) },  // 4 left
  { n: V(0, -1, 0), u: V(1, 0, 0), v: V(0, 0, 1) },  // 5 bottom
];
const AX = ["x", "y", "z"], GRID = 21;
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// one canvas per face: base colour, a soft sheen per sticker, then the pixel icon ('#' ink, 'o' second colour)
function faceTexture(f, R) {
  const S = 21 * 24, p = S / GRID, c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d"); g.fillStyle = f.base; g.fillRect(0, 0, S, S);
  f.px.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = ch === "#" ? f.ink : f.alt; g.fillRect(x * p, y * p, p + 0.6, p + 0.6); }));
  for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
    const x0 = (sx * S) / 3, y0 = (sy * S) / 3, gr = g.createLinearGradient(x0, y0, x0 + S / 3, y0 + S / 3);
    gr.addColorStop(0, "rgba(255,255,255,.16)"); gr.addColorStop(0.45, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(0,0,0,.14)");
    g.fillStyle = gr; g.fillRect(x0, y0, S / 3, S / 3);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, R.capabilities.getMaxAnisotropy()); return t;
}
// a rounded-square sticker whose UVs cover sticker (i, j) of its face: i along u, j along v, both 0..2
function stickerGeo(i, j, s = 0.88, r = 0.075) {
  const h = s / 2, sh = new THREE.Shape();
  sh.moveTo(-h + r, -h); sh.lineTo(h - r, -h); sh.quadraticCurveTo(h, -h, h, -h + r); sh.lineTo(h, h - r); sh.quadraticCurveTo(h, h, h - r, h);
  sh.lineTo(-h + r, h); sh.quadraticCurveTo(-h, h, -h, h - r); sh.lineTo(-h, -h + r); sh.quadraticCurveTo(-h, -h, -h + r, -h);
  const geo = new THREE.ShapeGeometry(sh, 5), p = geo.attributes.position, uv = geo.attributes.uv;
  for (let k = 0; k < p.count; k++) uv.setXY(k, (i + p.getX(k) / s + 0.5) / 3, (j + p.getY(k) / s + 0.5) / 3);
  return geo;
}

export function mountCube(canvas, faces, { onBeat = () => {}, hold = 3.4, still = false } = {}) {
  let R; try { R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return null; }
  R.setPixelRatio(Math.min(devicePixelRatio, 2)); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.NeutralToneMapping; R.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), pm = new THREE.PMREMGenerator(R);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.3; pm.dispose();
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 100); cam.position.set(0, 0, 13.5);
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-5, 7, 9);
  const rim = new THREE.DirectionalLight(0xff2a14, 3.4); rim.position.set(6, 2.5, -9);
  const low = new THREE.DirectionalLight(0xd7000f, 0.35); low.position.set(-6, -5, 4);
  scene.add(key, rim, low);

  // rig (float, sway, pointer tilt, drag) > cube (presentation orientation) > cubies + pivot (the turning layer)
  const rig = new THREE.Group(), cube = new THREE.Group(), pivot = new THREE.Group(); scene.add(rig); rig.add(cube); cube.add(pivot);
  const tex = faces.map((f) => faceTexture(f, R));
  const mats = tex.map((t) => new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.36, clearcoat: 0.55, clearcoatRoughness: 0.22, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.14 }));
  const bodyGeo = new RoundedBoxGeometry(0.97, 0.97, 0.97, 4, 0.07);
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0c0e, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.2 });
  const basis = FRAMES.map((F) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(F.u, F.v, F.n)));
  const geos = [], cubies = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if (!x && !y && !z) continue;                                    // the core never shows and never turns
    const c = new THREE.Group(), pos = V(x, y, z); c.position.copy(pos); c.add(new THREE.Mesh(bodyGeo, bodyMat)); c.userData.home = pos.clone();
    FRAMES.forEach((F, k) => {
      if (pos.dot(F.n) !== 1) return;
      const g = stickerGeo(pos.dot(F.u) + 1, pos.dot(F.v) + 1); geos.push(g);
      const s = new THREE.Mesh(g, mats[k]); s.quaternion.copy(basis[k]); s.position.copy(F.n).multiplyScalar(0.488); c.add(s);
    });
    cube.add(c); cubies.push(c);
  }

  // ---- turning layers ----
  const m4 = new THREE.Matrix4(); let SNAP = true;
  function snap(c) {
    if (!SNAP) return;
    c.position.set(Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z));
    m4.makeRotationFromQuaternion(c.quaternion); const e = m4.elements;
    for (const i of [0, 1, 2, 4, 5, 6, 8, 9, 10]) e[i] = Math.round(e[i]);
    c.quaternion.setFromRotationMatrix(m4);
  }
  let mv = null;                                                     // the move in flight
  function begin(m, dur) {
    pivot.rotation.set(0, 0, 0); pivot.updateMatrixWorld(true);
    const list = cubies.filter((c) => Math.round(c.position[AX[m.ax]]) === m.layer); list.forEach((c) => pivot.attach(c));
    mv = { ...m, t: 0, dur, list };
  }
  function finish() {
    pivot.rotation.set(0, 0, 0); pivot.rotation[AX[mv.ax]] = (mv.dir * Math.PI) / 2; pivot.updateMatrixWorld(true);
    mv.list.forEach((c) => { cube.attach(c); snap(c); }); pivot.rotation.set(0, 0, 0); const done = mv; mv = null; return done;
  }
  const rnd = (n, avoid = -1) => { const out = []; let last = avoid; for (let i = 0; i < n; i++) { let ax; do ax = (Math.random() * 3) | 0; while (ax === last); last = ax; out.push({ ax, layer: Math.random() < 0.5 ? -1 : 1, dir: Math.random() < 0.5 ? -1 : 1 }); } return out; };

  // ---- presentation: turn face k to the viewer, icon upright, in a 3/4 view showing two neighbours ----
  const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.36, -0.52, 0, "XYZ"));
  const present = FRAMES.map((F) => { const M = new THREE.Matrix4().makeBasis(F.u, F.v, F.n).transpose(); return tilt.clone().multiply(new THREE.Quaternion().setFromRotationMatrix(M)); });
  const target = new THREE.Quaternion();

  // ---- the clip: intro solve, then per beat: scramble, solve, present, hold ----
  const hist = [];                                                   // moves since the last solved state
  let plan = [], phase = "solve", beat = 0, holdT = 0, paused = false, frozen = false, want = null;
  const startBeat = (k, n = 6) => { beat = k; target.copy(present[k]); plan = rnd(n, hist.length ? hist[hist.length - 1].ax : -1); phase = "scramble"; onBeat(k, "start"); };
  // land scrambled, already facing roughly the first face, and solve on arrival
  rnd(7).forEach((m) => { begin(m, 0); hist.push(finish()); });
  target.copy(present[0]); cube.quaternion.copy(present[0]).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5, 0.9, 0.2)));
  onBeat(0, "start");

  function step(dt) {
    if (mv) { mv.t += dt / mv.dur; const a = easeIO(Math.min(1, mv.t)) * mv.dir * Math.PI / 2; pivot.rotation.set(0, 0, 0); pivot.rotation[AX[mv.ax]] = a;
      if (mv.t >= 1) { const m = finish(); if (m.rec) hist.push(m); } return; }
    if (want !== null) {                                             // a chip was picked: go there now
      const k = want; want = null;
      if (phase === "hold") { startBeat(k, 4); } else { beat = k; target.copy(present[k]); plan = []; phase = "solve"; onBeat(k, "start"); }
    }
    if (phase === "scramble") { if (plan.length) begin({ ...plan.shift(), rec: true }, 0.17); else phase = "solve"; return; }
    if (phase === "solve") { if (hist.length) { const m = hist.pop(); begin({ ax: m.ax, layer: m.layer, dir: -m.dir }, 0.3); } else { phase = "hold"; holdT = 0; onBeat(beat, "solved"); } return; }
    if (phase === "hold" && !paused && !still) { holdT += dt; if (holdT >= hold) startBeat((beat + 1) % faces.length); }
  }

  // ---- motion around the cube: float, sway, pointer tilt, drag to spin ----
  const user = new THREE.Quaternion(), qa = new THREE.Quaternion(), tmp = new THREE.Quaternion();
  let drag = null, px = 0, py = 0, sx = 0, sy = 0;
  canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
    user.premultiply(qa.setFromAxisAngle(V(0, 1, 0), dx * 0.01)).premultiply(qa.setFromAxisAngle(V(1, 0, 0), dy * 0.01));
  });
  const up = () => { drag = null; }; canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  const pm2 = (e) => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; }; addEventListener("pointermove", pm2, { passive: true });

  function size() { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  const ro = new ResizeObserver(size); ro.observe(canvas); size();

  let on = true, raf = 0, last = performance.now(), t = 0;
  function frame(now) {
    raf = 0; if (!on || document.hidden || frozen) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    step(dt);
    cube.quaternion.slerp(target, 1 - Math.exp(-dt * 3.2));
    if (!drag) user.slerp(tmp.identity(), 1 - Math.exp(-dt * 2.5));
    sx += (px - sx) * Math.min(1, dt * 2); sy += (py - sy) * Math.min(1, dt * 2);
    rig.position.y = Math.sin(t * 1.15) * 0.12;
    rig.quaternion.setFromEuler(new THREE.Euler(sy * 0.25 + Math.sin(t * 0.6) * 0.03, sx * 0.35, Math.sin(t * 0.8) * 0.035)).multiply(user);
    R.render(scene, cam); raf = requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf && !frozen) { last = performance.now(); raf = requestAnimationFrame(frame); } }); io.observe(canvas);
  const vis = () => { if (!document.hidden && on && !raf && !frozen) { last = performance.now(); raf = requestAnimationFrame(frame); } }; document.addEventListener("visibilitychange", vis);
  raf = requestAnimationFrame(frame);

  // solve everything instantly (used by freeze and reduced motion)
  function solveNow() { if (mv) { const m = finish(); if (m.rec) hist.push(m); } while (hist.length) { const m = hist.pop(); begin({ ax: m.ax, layer: m.layer, dir: -m.dir }, 0); finish(); } plan = []; }
  const api = {
    pick(k) { if (still) { api.freeze(k); return; } want = k; },
    set paused(v) { paused = v; if (!v && phase === "hold") holdT = Math.min(holdT, hold - 1.2); },
    get beat() { return beat; },
    // test hook: how far the cube is from solved (0 = every cubie home, unrotated)
    homeErr() { let e = 0; for (const c of cubies) e = Math.max(e, c.position.distanceTo(c.userData.home), 1 - Math.abs(c.quaternion.w)); return e; },
    // freeze on beat k, solved and presented (for reduced motion and screenshots); mid = caught half-way through a twist
    freeze(k, mid = false) {
      frozen = true; cancelAnimationFrame(raf); raf = 0; solveNow(); beat = k; target.copy(present[k]); cube.quaternion.copy(present[k]); user.identity();
      rig.position.y = 0; rig.quaternion.identity(); phase = "hold";
      if (mid) { const ms = rnd(3); ms.forEach((m) => { begin(m, 0); hist.push(finish()); }); begin({ ax: 1, layer: 1, dir: 1, rec: true }, 1); pivot.rotation.y = 0.62; }
      onBeat(k, mid ? "start" : "solved"); R.render(scene, cam);
    },
    // test hook: n quarter turns through the same begin/finish path as the clip, then check the grid and undo them
    stress(n = 200, snapOn = true) {
      solveNow(); SNAP = snapOn; const ms = rnd(n); ms.forEach((m) => { begin(m, 0); finish(); });
      let posInt = true, rotErr = 0;
      for (const c of cubies) { const p = c.position; if (![p.x, p.y, p.z].every(Number.isInteger)) posInt = false;
        m4.makeRotationFromQuaternion(c.quaternion); for (const i of [0, 1, 2, 4, 5, 6, 8, 9, 10]) rotErr = Math.max(rotErr, Math.abs(m4.elements[i] - Math.round(m4.elements[i]))); }
      for (let i = ms.length - 1; i >= 0; i--) { begin({ ...ms[i], dir: -ms[i].dir }, 0); finish(); }
      let home = 0; for (const c of cubies) { home = Math.max(home, c.position.distanceTo(c.userData.home), 1 - Math.abs(c.quaternion.w)); }
      SNAP = true; cubies.forEach(snap);
      return { posInt, rotErr, homeErr: home };
    },
    // a transparent PNG of the current frame (used to make the no-WebGL still)
    snapshot() { R.render(scene, cam); return canvas.toDataURL("image/png"); },
    destroy() { on = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); removeEventListener("pointermove", pm2); document.removeEventListener("visibilitychange", vis);
      tex.forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); geos.forEach((x) => x.dispose()); bodyGeo.dispose(); bodyMat.dispose(); R.dispose(); },
  };
  if (still) api.freeze(0);
  return api;
}
