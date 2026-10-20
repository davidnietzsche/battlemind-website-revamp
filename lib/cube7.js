// Hero v7 · the Battle cube, hero-sized (v6's engine is lib/cube.js and stays as it was).
// One transparent canvas covers the whole hero, so the cube can float, tilt, lift and burst apart without clipping.
// layout() places it in canvas pixels (centre + silhouette size) through a camera view offset, so it keeps the same
// 3/4 perspective wherever it sits on the photo.
// From v6: one pixel icon per face; the clip scrambles, solves and turns a solved face to the viewer; solving = the
// recorded moves played backwards; positions and rotations snap to the grid after every quarter turn.
// New in v7:
//  - drag a face to twist that layer. Twists are recorded like scramble moves, so the auto-solve undoes them;
//  - hovering pops a cubie out a little, and the key light follows the cursor;
//  - explode (driven by scroll) moves a CHILD of each cubie, never the cubie: the cubie's own position is the cube's
//    state (begin() picks layers by rounding it), so the clip is held while the cube is apart;
//  - intro(): the cube drops into the palm and settles.
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
const SIL = 4.16;                      // silhouette of the presented cube in world units at scale 1 (measured from v6's still)
const VIS = 2 * 13.5 * Math.tan(THREE.MathUtils.degToRad(13));   // visible height at the cube's depth (fov 26, z 13.5)
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const backOut = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

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

export function mountCube(canvas, faces, { onBeat = () => {}, onHover = () => {}, hold = 3.4, still = false, hit = null, idle = 2.6, maxDpr = 2, budget = 3.4e6 } = {}) {
  let R; try { R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" }); } catch (e) { return null; }
  R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.NeutralToneMapping; R.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), pm = new THREE.PMREMGenerator(R);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.3; pm.dispose();
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 100); cam.position.set(0, 0, 13.5);
  const KEY = V(-5, 7, 9), key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.copy(KEY);
  const rim = new THREE.DirectionalLight(0xff2a14, 3.4); rim.position.set(6, 2.5, -9);
  const low = new THREE.DirectionalLight(0xd7000f, 0.35); low.position.set(-6, -5, 4);
  scene.add(key, rim, low);

  // rig (placement, float, tilt, drag) > cube (presentation orientation) > cubies + pivot (the turning layer)
  // each cubie > inner (explode / hover offset only) > meshes
  const rig = new THREE.Group(), cube = new THREE.Group(), pivot = new THREE.Group(); scene.add(rig); rig.add(cube); cube.add(pivot);
  const tex = faces.map((f) => faceTexture(f, R));
  const mats = tex.map((t) => new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.36, clearcoat: 0.55, clearcoatRoughness: 0.22, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.14 }));
  const bodyGeo = new RoundedBoxGeometry(0.97, 0.97, 0.97, 4, 0.07);
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0c0e, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.2 });
  const hitGeo = new THREE.BoxGeometry(1, 1, 1), hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const basis = FRAMES.map((F) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(F.u, F.v, F.n)));
  const geos = [], cubies = [], hits = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if (!x && !y && !z) continue;                                    // the core never shows and never turns
    const c = new THREE.Group(), inner = new THREE.Group(), pos = V(x, y, z); c.position.copy(pos); c.add(inner);
    inner.add(new THREE.Mesh(bodyGeo, bodyMat));
    const hb = new THREE.Mesh(hitGeo, hitMat); hb.userData.cubie = c; inner.add(hb); hits.push(hb);
    FRAMES.forEach((F, k) => {
      if (pos.dot(F.n) !== 1) return;
      const g = stickerGeo(pos.dot(F.u) + 1, pos.dot(F.v) + 1); geos.push(g);
      const s = new THREE.Mesh(g, mats[k]); s.quaternion.copy(basis[k]); s.position.copy(F.n).multiplyScalar(0.488); inner.add(s);
    });
    const ax = V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    c.userData = { home: pos.clone(), inner, jit: 0.8 + Math.random() * 0.5, ax, spin: (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 2.5), pop: 0 };
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
  const hist = [];                                                   // moves since the last solved state
  function complete() { if (mv) { const m = finish(); if (m.rec) hist.push(m); } }   // land the move in flight now
  const rnd = (n, avoid = -1) => { const out = []; let last = avoid; for (let i = 0; i < n; i++) { let ax; do ax = (Math.random() * 3) | 0; while (ax === last); last = ax; out.push({ ax, layer: Math.random() < 0.5 ? -1 : 1, dir: Math.random() < 0.5 ? -1 : 1 }); } return out; };

  // ---- presentation: turn face k to the viewer, icon upright, in a 3/4 view showing two neighbours ----
  const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.36, -0.52, 0, "XYZ"));
  const present = FRAMES.map((F) => { const M = new THREE.Matrix4().makeBasis(F.u, F.v, F.n).transpose(); return tilt.clone().multiply(new THREE.Quaternion().setFromRotationMatrix(M)); });
  const target = new THREE.Quaternion();

  // ---- the clip: intro solve, then per beat: scramble, solve, present, hold ----
  let plan = [], phase = "solve", beat = 0, holdT = 0, paused = false, frozen = false, want = null;
  let explode = 0, lift = 0, userMode = false, userT = 0, twisted = false; const queue = [];
  const startBeat = (k, n = 6) => { beat = k; target.copy(present[k]); plan = rnd(n, hist.length ? hist[hist.length - 1].ax : -1); phase = "scramble"; onBeat(k, "start"); };
  // land scrambled, already facing roughly the first face, and solve on arrival
  rnd(7).forEach((m) => { begin(m, 0); hist.push(finish()); });
  target.copy(present[0]); cube.quaternion.copy(present[0]).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5, 0.9, 0.2)));
  onBeat(0, "start");

  function step(dt) {
    if (mv) { mv.t += dt / mv.dur; const a = easeIO(Math.min(1, mv.t)) * mv.dir * Math.PI / 2; pivot.rotation.set(0, 0, 0); pivot.rotation[AX[mv.ax]] = a;
      if (mv.t >= 1) { const m = finish(); if (m.rec) hist.push(m); } return; }
    if (explode > 0.001) return;                                     // apart (scroll): hold everything until it is whole again
    if (queue.length) { begin({ ...queue.shift(), rec: true }, 0.22); return; }      // the visitor's own twists
    if (userMode) {                                                  // wait until they let go, then solve their twists too
      if (drag) { userT = 0; return; } userT += dt; if (userT < idle) return;
      userMode = false; plan = []; phase = "solve"; if (!twisted) { phase = hist.length ? "solve" : "hold"; }
      twisted = false;
    }
    if (want !== null) {                                             // a result was picked: go there now
      const k = want; want = null;
      if (phase === "hold") { startBeat(k, 4); } else { beat = k; target.copy(present[k]); plan = []; phase = "solve"; onBeat(k, "start"); }
    }
    if (phase === "scramble") { if (plan.length) begin({ ...plan.shift(), rec: true }, 0.17); else phase = "solve"; return; }
    if (phase === "solve") { if (hist.length) { const m = hist.pop(); begin({ ax: m.ax, layer: m.layer, dir: -m.dir }, 0.3); } else { phase = "hold"; holdT = 0; onBeat(beat, "solved"); } return; }
    if (phase === "hold" && !paused && !still) { holdT += dt; if (holdT >= hold) startBeat((beat + 1) % faces.length); }
  }

  // ---- placement in canvas pixels ----
  let W = 1, H = 1, lay = { x: 0.5, y: 0.5, size: 300, rel: true }, k = 1;
  function place() {
    const x = lay.rel ? lay.x * W : lay.x, y = lay.rel ? lay.y * H : lay.y;
    cam.setViewOffset(W, H, W / 2 - x, H / 2 - y, W, H);            // the origin lands on (x, y), seen straight on
    k = lay.size / (SIL * (H / VIS));
  }
  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; W = w; H = h;
    R.setPixelRatio(Math.min(maxDpr, devicePixelRatio || 1, Math.sqrt(budget / (w * h)))); R.setSize(w, h, false);
    cam.aspect = w / h; place(); cam.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(() => { size(); if (frozen) R.render(scene, cam); }); ro.observe(canvas); size();

  // ---- pointer: hover pops a cubie, drag a face to twist its layer, drag elsewhere to spin the cube ----
  const user = new THREE.Quaternion(), qa = new THREE.Quaternion(), tmp = new THREE.Quaternion();
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let drag = null, px = 0, py = 0, sx = 0, sy = 0, hov = null, hovDirty = null, hovOn = false;
  const toNdc = (cx, cy) => { const b = canvas.getBoundingClientRect(); ndc.set(((cx - b.left) / b.width) * 2 - 1, -((cy - b.top) / b.height) * 2 + 1); return b; };
  function pick(cx, cy) {
    toNdc(cx, cy); cam.updateMatrixWorld(); rig.updateMatrixWorld(true); ray.setFromCamera(ndc, cam);
    const h = ray.intersectObjects(hits, false)[0]; return h || null;
  }
  const axisOf = (v) => { const a = [Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)]; const i = a.indexOf(Math.max(...a)); return i; };
  const roundAxis = (v) => { const i = axisOf(v), o = V(0, 0, 0); o[AX[i]] = Math.sign(v[AX[i]]) || 1; return o; };
  const cubeQ = new THREE.Quaternion(), cubeQi = new THREE.Quaternion();
  function toScreen(pLocal) { const w = cube.localToWorld(pLocal.clone()).project(cam); const b = canvas.getBoundingClientRect(); return new THREE.Vector2((w.x + 1) / 2 * b.width, (1 - w.y) / 2 * b.height); }
  // which layer turns, and which way, for a drag (dx, dy) that started on face n of a cubie at local point p
  function twistFor(c, n, p, dx, dy) {
    const d = new THREE.Vector2(dx, dy).normalize(); let best = null;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(n[AX[i]]) > 0.5) continue;
      const t = V(0, 0, 0); t[AX[i]] = 1; const s = toScreen(p.clone().addScaledVector(t, 0.5)).sub(toScreen(p));
      const len = s.length(); if (len < 1e-3) continue; const dot = s.dot(d) / len;
      if (!best || Math.abs(dot) > Math.abs(best.dot)) best = { t, dot };
    }
    if (!best) return null;
    const m = best.t.clone().multiplyScalar(Math.sign(best.dot)), r = n.clone().cross(m), ai = axisOf(r);
    return { ax: ai, layer: Math.round(c.position[AX[ai]]), dir: Math.sign(r[AX[ai]]) };
  }
  function down(e) {
    if (still || explode > 0.001 || e.button > 0) return;
    hit.setPointerCapture?.(e.pointerId);
    let h = pick(e.clientX, e.clientY);
    if (h && mv) { complete(); h = pick(e.clientX, e.clientY); }   // a layer caught mid-turn lands before we read the cube
    if (h) {
      const c = h.object.userData.cubie; cube.getWorldQuaternion(cubeQ); cubeQi.copy(cubeQ).invert();
      const n = roundAxis(h.face.normal.clone().transformDirection(h.object.matrixWorld).applyQuaternion(cubeQi));
      drag = { mode: "twist", c, n, p: cube.worldToLocal(h.point.clone()), x0: e.clientX, y0: e.clientY, done: false };
      userMode = true; userT = 0;
    } else drag = { mode: "spin", x: e.clientX, y: e.clientY };
  }
  function move(e) {
    if (!drag) { hovDirty = [e.clientX, e.clientY]; return; }
    if (drag.mode === "twist") {
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.done && Math.hypot(dx, dy) > 10) { const t = twistFor(drag.c, drag.n, drag.p, dx, dy); drag.done = true;
        if (t) { queue.push(t); if (!twisted) { twisted = true; onBeat(beat, "start"); } } }
      return;
    }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    user.premultiply(qa.setFromAxisAngle(V(0, 1, 0), dx * 0.008)).premultiply(qa.setFromAxisAngle(V(1, 0, 0), dy * 0.008));
  }
  const up = () => { drag = null; userT = 0; };
  const leave = () => { hovDirty = "off"; };
  if (hit) { hit.addEventListener("pointerdown", down); hit.addEventListener("pointermove", move); hit.addEventListener("pointerup", up); hit.addEventListener("pointercancel", up); hit.addEventListener("pointerleave", leave); }
  const pm2 = (e) => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; }; addEventListener("pointermove", pm2, { passive: true });

  // ---- intro: drop into the palm, settle ----
  let introT = 1, introRes = null;
  const intro = () => new Promise((res) => { if (still || frozen) { res(); return; } introT = 0; introRes = res; });

  let on = true, raf = 0, last = performance.now(), t = 0;
  const off = V(0, 0, 0), qc = new THREE.Quaternion(), pc = V(0, 0, 0), eu = new THREE.Euler(), qw = new THREE.Quaternion(), qwi = new THREE.Quaternion();
  function frame(now) {
    raf = 0; if (!on || document.hidden || frozen) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    step(dt);
    cube.quaternion.slerp(target, 1 - Math.exp(-dt * 3.2));
    if (!drag || drag.mode !== "spin") user.slerp(tmp.identity(), 1 - Math.exp(-dt * 2.5));
    sx += (px - sx) * Math.min(1, dt * 2.4); sy += (py - sy) * Math.min(1, dt * 2.4);
    if (hovDirty) {                                                 // one raycast per frame at most
      const h = hovDirty === "off" || explode > 0.001 ? null : pick(hovDirty[0], hovDirty[1]); hovDirty = null;
      hov = h ? h.object.userData.cubie : null; if (!!hov !== hovOn) { hovOn = !!hov; onHover(hovOn); }
    }
    // inner offsets: burst apart along each cubie's direction from the centre (explode), or pop the hovered one. The burst
    // opens slowly, then throws the pieces out of frame (mostly sideways, little toward the lens) so Ian is revealed at the end
    const e2 = explode * explode, e3 = e2 * explode; qw.copy(rig.quaternion).multiply(cube.quaternion); qwi.copy(qw).invert();
    for (const c of cubies) {
      const u = c.userData; u.pop += ((c === hov && !drag ? 1 : 0) - u.pop) * Math.min(1, dt * 10);
      const inP = c.parent === pivot; qc.copy(c.quaternion); pc.copy(c.position); if (inP) { qc.premultiply(pivot.quaternion); pc.applyQuaternion(pivot.quaternion); }
      const amt = e3 * 5.2 * u.jit + u.pop * 0.07;
      if (amt < 1e-4) { u.inner.position.set(0, 0, 0); u.inner.quaternion.identity(); continue; }
      off.copy(pc).normalize().applyQuaternion(qw); off.x *= 1.15; off.y *= 0.8; off.z *= 0.35; off.applyQuaternion(qwi).multiplyScalar(amt).applyQuaternion(qc.invert()); u.inner.position.copy(off);
      u.inner.quaternion.setFromAxisAngle(u.ax, e2 * u.spin);
    }
    // rig: placement scale, float, sway, look toward the cursor, scroll lift, intro drop
    let iy = 0, is = 1, ir = 0;
    if (introT < 1) { introT = Math.min(1, introT + dt / 1.25); const b = backOut(introT); iy = (1 - b) * 4.2; is = 0.55 + 0.45 * Math.min(1, b); ir = (1 - easeIO(introT)) * 2.4;
      if (introT >= 1 && introRes) { introRes(); introRes = null; } }
    const L = sstep(0, 1, lift), s = k * is * (1 + 0.32 * L);
    rig.scale.setScalar(s);
    rig.position.set(sx * 0.32 * k, (Math.sin(t * 1.15) * 0.12 - sy * 0.18 + iy - L * 0.25) * k, 0);   // scroll: it grows toward you, so it drops a little to stay clear of the nav
    eu.set(sy * 0.3 + Math.sin(t * 0.6) * 0.03 + L * 0.5, sx * 0.45 + ir + L * 1.1, Math.sin(t * 0.8) * 0.035);
    rig.quaternion.setFromEuler(eu).multiply(user);
    key.position.set(KEY.x + sx * 12, KEY.y - sy * 10, KEY.z);       // the light follows the cursor across the stickers
    R.render(scene, cam); raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (on && !document.hidden && !frozen && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  // entries can arrive batched (hidden, then visible, in one callback): the last one is the current state
  const io = new IntersectionObserver((es) => { on = es[es.length - 1].isIntersecting; wake(); }); io.observe(canvas);
  document.addEventListener("visibilitychange", wake);
  raf = requestAnimationFrame(frame);

  // solve everything instantly (used by freeze and reduced motion)
  function solveNow() { complete(); queue.length = 0; while (hist.length) { const m = hist.pop(); begin({ ax: m.ax, layer: m.layer, dir: -m.dir }, 0); finish(); } plan = []; }
  const api = {
    layout(o) { lay = { ...lay, ...o }; place(); cam.updateProjectionMatrix(); if (frozen) R.render(scene, cam); return api; },
    intro,
    pick(k2) { if (still) { api.freeze(k2); return; } userMode = false; twisted = false; queue.length = 0; want = k2; },
    set paused(v) { paused = v; if (!v && phase === "hold") holdT = Math.min(holdT, hold - 1.2); },
    set explode(v) { const was = explode > 0.001; explode = Math.min(1, Math.max(0, v)); if (!was && explode > 0.001) { complete(); drag = null; } },
    get explode() { return explode; },
    set lift(v) { lift = Math.min(1, Math.max(0, v)); },
    get beat() { return beat; },
    // test hooks: distance from solved (0 = every cubie home and unrotated), and the clip's state
    homeErr() { let e = 0; for (const c of cubies) e = Math.max(e, c.position.distanceTo(c.userData.home), 1 - Math.abs(c.quaternion.w)); return e; },
    state() { return { phase, hist: hist.length, queue: queue.length, moving: !!mv, user: userMode, explode, beat }; },
    // the same twist a drag makes, for tests that cannot drag: face n (e.g. [0,0,1]) of the cubie at grid cell g, screen direction (dx, dy)
    twistAt(g, n, dx, dy) { complete(); const c = cubies.find((q) => q.position.equals(V(...g))); if (!c) return null; const nn = V(...n);
      const tw = twistFor(c, nn, c.position.clone().addScaledVector(nn, 0.5), dx, dy); if (tw) { queue.push(tw); userMode = true; userT = 0; if (!twisted) { twisted = true; onBeat(beat, "start"); } } return tw; },
    // freeze on beat k, solved and presented (reduced motion, screenshots); mid = caught half-way through a twist
    freeze(k2, mid = false) {
      frozen = true; cancelAnimationFrame(raf); raf = 0; solveNow(); beat = k2; target.copy(present[k2]); cube.quaternion.copy(present[k2]); user.identity();
      introT = 1; if (introRes) { introRes(); introRes = null; }
      rig.position.set(0, 0, 0); rig.quaternion.identity(); rig.scale.setScalar(k); phase = "hold";
      cubies.forEach((c) => { c.userData.inner.position.set(0, 0, 0); c.userData.inner.quaternion.identity(); });
      if (mid) { const ms = rnd(3); ms.forEach((m) => { begin(m, 0); hist.push(finish()); }); begin({ ax: 1, layer: 1, dir: 1, rec: true }, 1); pivot.rotation.y = 0.62; }
      onBeat(k2, mid ? "start" : "solved"); R.render(scene, cam);
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
    destroy() { on = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); removeEventListener("pointermove", pm2); document.removeEventListener("visibilitychange", wake);
      if (hit) { hit.removeEventListener("pointerdown", down); hit.removeEventListener("pointermove", move); hit.removeEventListener("pointerup", up); hit.removeEventListener("pointercancel", up); hit.removeEventListener("pointerleave", leave); }
      tex.forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); geos.forEach((x) => x.dispose()); bodyGeo.dispose(); bodyMat.dispose(); hitGeo.dispose(); hitMat.dispose(); R.dispose(); },
  };
  if (still) api.freeze(0);
  return api;
}
