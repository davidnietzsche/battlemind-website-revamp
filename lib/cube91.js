// Hero v9.1 · the Battle cube (lib/cube9.js is the v9 engine and stays as it was).
// v9.1 (Ian + Sue, 29 Oct: one feeling, the cube more fun in movement and colour; a human face lost among social icons,
// business stats and trends, and the animation ends on a face whose eyes and mouth move):
//  - a face given { face: true } is drawn live: a neon face running across its nine keys in the same tube as the marks
//    (eyes that blink and follow the cursor, brows, a mouth that smiles, beams after a solve and opens on a tap). Scrambled,
//    its pieces are lost among the platform marks and the stats; solved, the face comes back together;
//  - keys may be canvases (stat and trend glyphs drawn by the page), cached by their `src` like the logo images;
//  - a fourth glass, frost (pale pearl glass with red neon), for colour;
//  - v10: enter "assemble" (the pieces fly in from beyond the frame and lock into one cube before the solve), calm (no
//    mixing on its own: a cube the page drives with show(k), draw(k, on) = slide face k's layer out like a drawn blade and
//    back in, pulse(k) = flash that face once). drawn() reports the draw for tests.
//  - tumble: the cube rolls about while it scrambles and squares up to the face as it solves; a solve speeds up in the
//    middle and lands its last turn slowly, then the cube hops and spins once; tap() (or a click on the cube) makes the
//    face jump and shuffles it again. beats = 1 keeps coming back to the face.
// (v9 header follows.)
// Hero v9 · the Battle cube (v8's engine is lib/cube8.js and stays as it was).
// v9 (Sue, 22 Oct): every key carries one platform's mark instead of a face-wide icon: social (Facebook, Instagram, TikTok),
// web & e-commerce (Shopify, WordPress, WooCommerce, Magento, Shopee, Lazada), AI & search (Google, Gemini, ChatGPT,
// Copilot). A scramble mixes the platforms, a solve sorts them back into their families, one family per pair of opposite
// faces, each in its own glass (red, smoked, wine) so the mix still reads as a Rubik's cube. The marks are white silhouettes
// of the official logos (assets/brand3p/cube, SOURCES.txt); a key lights its mark the way the tubes lit: a wide red glow,
// the red body, a hot core. A face given { d } instead of { keys } still draws v8's face-wide tube.
// (v8 header follows.)
// v8: the cube floats BESIDE Ian's face, so its sideways drift toward the cursor is an option (drift, world units; v7 used
// 0.32) and the scroll lift can carry it away from the face (away, world units, toward -x) while it grows.
// beats: how many faces the clip presents in turn (v8 shows five results on the six faces; 0 = all six).
// One transparent canvas covers the whole hero, so the cube can float, tilt, lift and burst apart without clipping.
// layout() places it in canvas pixels (centre + silhouette size) through a camera view offset, so it keeps the same
// 3/4 perspective wherever it sits on the photo.
// v8, 20 Oct night (David: the weapons, the armour and the cube looked like three different materials): the cube is now
// made of what the weapons are made of. Each sticker is a key of red or smoked glass set in polished chrome (the cubie
// body), and the face's icon is a neon tube running across its nine keys, the same outline style as the glass keycaps.
// The glow is drawn into the emissive map, so the tubes glow without a bloom pass (bloom breaks a transparent canvas);
// the chrome reflects a small black studio with strip lights, as the keycaps were shot.
// From v6 (the pixel icons are gone): one icon per face; the clip scrambles, solves and turns a solved face to the viewer; solving = the
// recorded moves played backwards; positions and rotations snap to the grid after every quarter turn.
// New in v7:
//  - drag a face to twist that layer. Twists are recorded like scramble moves, so the auto-solve undoes them;
//  - hovering pops a cubie out a little, and the key light follows the cursor;
//  - explode (driven by scroll) moves a CHILD of each cubie, never the cubie: the cubie's own position is the cube's
//    state (begin() picks layers by rounding it), so the clip is held while the cube is apart;
//  - intro(): the cube drops into the palm and settles.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

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

// glass: a soft radial body (light enters from the top left), a bevel line just inside each key's edge, a darker band inside
// that; emissive: the glass's faint inner glow and the neon (wide soft glow, the red tube, a hot core)
const GLASS = { red: { top: "#3e0006", bot: "#a0000e", hi: "rgba(255,72,84,.26)", rim: "rgba(255,52,66,1)", in: [0.34, 0.12], glow: 1 },
  smoke: { top: "#070304", bot: "#16050a", hi: "rgba(255,235,238,.07)", rim: "rgba(255,40,58,.45)", in: [0.02, 0.008], glow: 0.42 },   // smoked: the tube lights only the glass right around it
  wine: { top: "#140002", bot: "#4c0008", hi: "rgba(255,80,92,.13)", rim: "rgba(255,44,60,.78)", in: [0.13, 0.04], glow: 0.7 },   // v9: a third family, between the two
  frost: { top: "#e9e3e5", bot: "#b9aeb2", hi: "rgba(255,255,255,.7)", rim: "rgba(255,255,255,.95)", in: [0.035, 0.012], glow: 0.62 } };   // v9.1: pale pearl glass, red neon
const rrect = (g, x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); };
function neon(g, d, S, k, spread = 1) {
  const p = new Path2D(d); g.save(); g.scale(S / 100, S / 100); g.lineCap = g.lineJoin = "round";
  g.shadowColor = "#ff0019"; g.shadowBlur = 0.06 * S * spread; g.strokeStyle = `rgba(255,14,36,${0.62 * k})`; g.lineWidth = 6.4; g.stroke(p);
  g.shadowBlur = 0.02 * S; g.strokeStyle = "#ff1f34"; g.lineWidth = 2.8; g.stroke(p);
  g.shadowBlur = 0; g.strokeStyle = `rgba(255,224,228,${0.55 + 0.45 * k})`; g.lineWidth = 0.95; g.stroke(p); g.restore();
}
// a platform mark on one key: the silhouette tinted red with a wide glow, again with a tight glow (the body), then a pale
// copy over it at partial strength (the hot core), all the same size so thin rings stay crisp
const TINT = new Map();
function tinted(img, col) {
  const id = (img.src || img.dataset?.src) + "|" + col; if (TINT.has(id)) return TINT.get(id);
  const cv = document.createElement("canvas"); cv.width = img.naturalWidth || img.width; cv.height = img.naturalHeight || img.height;
  const g = cv.getContext("2d"); g.drawImage(img, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.fillRect(0, 0, cv.width, cv.height);
  TINT.set(id, cv); return cv;
}
function glyph(g, img, cx, cy, s, k, spread = 1) {
  const body = tinted(img, "#ff1f34"), core = tinted(img, "#ffdce0"), x = cx - s / 2, y = cy - s / 2;
  g.save(); g.shadowColor = "#ff0019";
  g.shadowBlur = s * 0.2 * spread; g.globalAlpha = Math.min(1, 0.8 * k); g.drawImage(body, x, y, s, s);
  g.shadowBlur = s * 0.05; g.globalAlpha = Math.min(1, 0.3 + 0.7 * k); g.drawImage(body, x, y, s, s);
  g.shadowBlur = 0; g.globalAlpha = 0.18 + 0.4 * k; g.drawImage(core, x, y, s, s); g.restore();
}
// the live face, in the tube's 100 x 100 face space (y down = the face's top first). Eyes sit in the middle row's outer
// keys, brows in the top row's, the mouth runs along the bottom row (a smile crosses two seams, as v8's icons did).
// st: blink 0..1 (shut), gx/gy -1..1 (gaze), joy 0..1 (beaming), o 0..1 (surprised)
const EYES = [[24, 47], [76, 47]];
// v10 (David: the smile reads unprofessional): "portrait" draws the face like a one-line illustration: almond eyes under long
// brows, one stroke for the nose, a quiet mouth. It still blinks, follows the cursor and smiles a little after a solve.
function portraitPath(st) {
  const bl = 1 - st.blink, joy = st.joy, o = st.o, lift = joy * 1.5 + o * 3; let d = "";
  for (const [cx, cy] of EYES) {
    const w = 9.5, up = 7.5 * bl, lo = 4.6 * bl, sg = cx < 50 ? 1 : -1;                      // sg: which way the inner corner lies
    d += `M${cx - w} ${cy}Q${cx} ${cy - up} ${cx + w} ${cy}M${cx - w} ${cy}Q${cx} ${cy + lo} ${cx + w} ${cy}`;
    if (st.blink < 0.5) { const px = cx + st.gx * 3.2, py = cy + st.gy * 1.8 + 0.5, r = 1.9; d += `M${px - r} ${py}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`; }
    d += `M${cx - sg * 12} ${33 - lift}Q${cx - sg * 1.5} ${27.5 - lift} ${cx + sg * 12} ${35.5 - lift}`;   // outer end to inner end
  }
  d += `M52 42Q55.5 56 47 61`;                                                                 // the nose, one stroke
  if (o > 0.5) { const R2 = 3.5 + 3 * o; d += `M${50 - R2} 80a${R2} ${R2 * 1.2} 0 1 0 ${2 * R2} 0a${R2} ${R2 * 1.2} 0 1 0 ${-2 * R2} 0`; }
  else d += `M38 79Q50 ${82.5 + 7 * joy} 62 79`;
  return d;
}
// one mark across the whole side, keeping its proportions ("mark": the BM monogram; "word": the wordmark), lit like a key's glyph
function markFace(g, img, S, k, spread) {
  const ar = (img.naturalWidth || img.width) / (img.naturalHeight || img.height), w = S * (ar > 2.5 ? 0.86 : 0.6), h = w / ar;
  const body = tinted(img, "#ff1f34"), core = tinted(img, "#ffdce0"), x = (S - w) / 2, y = (S - h) / 2;
  g.save(); g.shadowColor = "#ff0019";
  g.shadowBlur = S * 0.06 * spread; g.globalAlpha = Math.min(1, 0.8 * k); g.drawImage(body, x, y, w, h);
  g.shadowBlur = S * 0.015; g.globalAlpha = Math.min(1, 0.3 + 0.7 * k); g.drawImage(body, x, y, w, h);
  g.shadowBlur = 0; g.globalAlpha = 0.18 + 0.4 * k; g.drawImage(core, x, y, w, h); g.restore();
}
function facePath(st, style = "smile") {
  if (style === "portrait") return portraitPath(st);
  const r = 8.6, ry = Math.max(0.5, r * (1 - st.blink)), joy = st.joy, o = st.o; let d = "";
  for (const [cx, cy] of EYES) {
    if (joy > 0.5 && o < 0.5) d += `M${cx - r} ${cy + 3}Q${cx} ${cy - 10} ${cx + r} ${cy + 3}`;                 // ^ ^
    else { d += `M${cx - r} ${cy}A${r} ${ry} 0 1 0 ${cx + r} ${cy}A${r} ${ry} 0 1 0 ${cx - r} ${cy}`;
      if (st.blink < 0.5) { const px = cx + st.gx * 3.6, py = cy + st.gy * 3; d += `M${px - 0.7} ${py}a0.7 0.7 0 1 0 1.4 0a0.7 0.7 0 1 0 -1.4 0`; } }
    const b = 21 - o * 4 - joy * 1.5; d += `M${cx - 8} ${b + 4}Q${cx} ${b - 2} ${cx + 8} ${b + 4}`;
  }
  if (o > 0.5) { const R2 = 5 + 4 * o; d += `M${50 - R2} 82a${R2} ${R2 * 1.1} 0 1 0 ${2 * R2} 0a${R2} ${R2 * 1.1} 0 1 0 ${-2 * R2} 0`; }
  else if (joy > 0.5) d += `M22 74Q50 ${92 + 4 * joy} 78 74Z`;                                                   // open, beaming
  else { const sm = 0.45 + 0.55 * joy; d += `M24 76Q50 ${78 + 12 * sm} 76 76`; }
  return d;
}
function faceTextures(f, R) {
  const S = 768, c = S / 3, G = GLASS[f.glass] || GLASS.red;
  return [false, true].map((emi) => {
    const cv = document.createElement("canvas"); cv.width = cv.height = S; const g = cv.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, S, S);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      const x = i * c, y = j * c;
      if (emi) { const gr = g.createRadialGradient(x + c * 0.5, y + c * 0.62, c * 0.05, x + c * 0.5, y + c * 0.5, c * 0.8);
        gr.addColorStop(0, `rgba(200,0,20,${G.in[0]})`); gr.addColorStop(1, `rgba(130,0,12,${G.in[1]})`); g.fillStyle = gr; g.fillRect(x, y, c, c); }
      else { const lg = g.createLinearGradient(0, y, 0, y + c); lg.addColorStop(0, G.top); lg.addColorStop(1, G.bot); g.fillStyle = lg; g.fillRect(x, y, c, c);   // deeper at the top, lit through at the bottom
        const hg = g.createRadialGradient(x + c * 0.3, y + c * 0.24, 0, x + c * 0.3, y + c * 0.24, c * 0.55); hg.addColorStop(0, G.hi); hg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = hg; g.fillRect(x, y, c, c); }
      rrect(g, x + c * 0.04, y + c * 0.04, c * 0.92, c * 0.92, c * 0.1); g.strokeStyle = G.rim; g.globalAlpha = emi ? 0.5 : 1; g.lineWidth = c * 0.018; g.stroke(); g.globalAlpha = 1;
      if (!emi) { rrect(g, x + c * 0.085, y + c * 0.085, c * 0.83, c * 0.83, c * 0.075); g.strokeStyle = "rgba(0,0,0,.32)"; g.lineWidth = c * 0.045; g.stroke(); }
    }
    if (f.keys) f.keys.forEach((img, n) => img && glyph(g, img, (n % 3 + 0.5) * c, (Math.floor(n / 3) + 0.5) * c, c * 0.5, (emi ? 1 : 0.5) * Math.max(0.64, G.glow), 0.6 + 0.4 * G.glow));   // keys[] row by row from the top left; marks at 0.64 at least, so they read on smoked glass
    else if (f.d) neon(g, f.d, S, (emi ? 1 : 0.5) * G.glow, 0.6 + 0.4 * G.glow);
    let out = cv, live = null;
    if (f.face) { out = document.createElement("canvas"); out.width = out.height = S; const og = out.getContext("2d");   // the keys stay as a base; the face is redrawn over a copy
      live = { base: cv, g: og, k: (emi ? 1 : 0.5) * G.glow, spread: 0.6 + 0.4 * G.glow }; }
    const t = new THREE.CanvasTexture(out); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, R.capabilities.getMaxAnisotropy());
    if (live) t.userData.live = live; return t;
  });
}
// what the chrome and the glass reflect: a black studio with strip lights (white key strips, a red rim strip, red bounce)
function studio() {
  const s = new THREE.Scene(), pl = new THREE.PlaneGeometry(1, 1);
  [[0xffffff, 10, [-3, 5, 6], [6, 0.55]], [0xffffff, 6, [5.5, 1.5, 5], [0.45, 6]], [0xffffff, 2.2, [0, 8, -1], [7, 3]],
   [0xff1430, 7, [6, -1, -4], [0.7, 7]], [0xd7000f, 3, [-5, -4.5, 3], [6, 1.2]], [0xffffff, 1.4, [0, 3.5, 9], [5, 2.5]]].forEach(([c, i, p, sc]) => {
    const m = new THREE.Mesh(pl, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide }));
    m.position.set(...p); m.scale.set(sc[0], sc[1], 1); m.lookAt(0, 0, 0); s.add(m); });
  return s;
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

export function mountCube(canvas, faces, { onBeat = () => {}, onHover = () => {}, onTap = () => {}, hold = 3.4, still = false, hit = null, idle = 2.6, maxDpr = 2, budget = 3.4e6, drift = 0.32, away = 0, beats = 0, tumble = false, scramble = 6, solo = false, enter = "drop", calm = false, faceStyle = "smile", faceImg = null } = {}) {
  let R; try { R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" }); } catch (e) { return null; }
  R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.NeutralToneMapping; R.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), pm = new THREE.PMREMGenerator(R);
  const env = studio(); scene.environment = pm.fromScene(env, 0.025).texture; scene.environmentIntensity = 1; pm.dispose();
  env.traverse((o) => { if (o.isMesh) { o.material.dispose(); o.geometry.dispose(); } });
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 100); cam.position.set(0, 0, 13.5);
  const KEY = V(-5, 7, 9), key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.copy(KEY);
  const rim = new THREE.DirectionalLight(0xff1430, 3.4); rim.position.set(6, 2.5, -9);      // brand red, not orange
  const low = new THREE.DirectionalLight(0xd7000f, 0.35); low.position.set(-6, -5, 4);
  scene.add(key, rim, low);

  // rig (placement, float, tilt, drag) > cube (presentation orientation) > cubies + pivot (the turning layer)
  // each cubie > inner (explode / hover offset only) > meshes
  const rig = new THREE.Group(), cube = new THREE.Group(), pivot = new THREE.Group(); scene.add(rig); rig.add(cube); cube.add(pivot);
  const tex = faces.map((f) => faceTextures(f, R));                 // [map, emissive map] per face
  // ---- the live face: state, and a repaint only when what it shows has changed ----
  const FS = { blink: 0, gx: 0, gy: 0, joy: 0, o: 0 }, shown = {}; let faceAt = -1, blinkT = 2.2, joyT = 0, oT = 0;
  const liveTex = tex.flat().filter((t) => t.userData.live);
  function paintFace(force) {
    const q = { blink: Math.round(FS.blink * 10) / 10, gx: Math.round(FS.gx * 8) / 8, gy: Math.round(FS.gy * 8) / 8, joy: Math.round(FS.joy * 4) / 4, o: Math.round(FS.o * 4) / 4 };
    if (!force && Object.keys(q).every((k2) => q[k2] === shown[k2])) return false;
    Object.assign(shown, q); const imgFace = faceImg && (faceStyle === "mark" || faceStyle === "word"), d = imgFace ? "" : facePath(q, faceStyle);
    for (const t of liveTex) { const L = t.userData.live; L.g.globalCompositeOperation = "copy"; L.g.drawImage(L.base, 0, 0); L.g.globalCompositeOperation = "source-over";
      if (imgFace) markFace(L.g, faceImg, L.base.width, L.k * (1 + 0.5 * q.joy), L.spread); else neon(L.g, d, L.base.width, L.k, L.spread); t.needsUpdate = true; }
    return true;
  }
  paintFace(true);
  const mats = tex.map(([map, emi]) => new THREE.MeshPhysicalMaterial({ map, emissiveMap: emi, emissive: 0xffffff, emissiveIntensity: 1.35, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04, specularIntensity: 0.7, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }));   // keys never z-fight the chrome under them
  const bodyGeo = new RoundedBoxGeometry(0.97, 0.97, 0.97, 4, 0.07);
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xd9d9df, metalness: 1, roughness: 0.13, clearcoat: 0.5, clearcoatRoughness: 0.06 });   // polished chrome
  const hitGeo = new THREE.BoxGeometry(1, 1, 1), hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const basis = FRAMES.map((F) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(F.u, F.v, F.n)));
  const geos = [], cubies = [], hits = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if (!x && !y && !z) continue;                                    // the core never shows and never turns
    if (solo && !(x === 1 && y === 1 && z === 1)) continue;
    const c = new THREE.Group(), inner = new THREE.Group(), pos = V(x, y, z); c.position.copy(pos); c.add(inner);
    inner.add(new THREE.Mesh(bodyGeo, bodyMat));
    const hb = new THREE.Mesh(hitGeo, hitMat); hb.userData.cubie = c; inner.add(hb); hits.push(hb);
    FRAMES.forEach((F, k) => {
      if (pos.dot(F.n) !== 1) return;
      const g = stickerGeo(pos.dot(F.u) + 1, pos.dot(F.v) + 1); geos.push(g);
      const s = new THREE.Mesh(g, mats[k]); s.quaternion.copy(basis[k]); s.position.copy(F.n).multiplyScalar(0.488); inner.add(s);
    });
    const ax = V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    if (solo) c.position.set(0, 0, 0);                               // centred; no layer ever holds it, so it never turns
    c.userData = { home: c.position.clone(), inner, jit: 0.8 + Math.random() * 0.5, ax, spin: (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 2.5), pop: 0, robo: V(0, 0, 0), rt: V(0, 0, 0), rd: 0 };
    cube.add(c); cubies.push(c);
  }

  // ---- v10 (David): the cube stands up into a figure. A figure = seats for the cube's own 26 pieces, extra pieces it adds
  // (plain red or frost glass, from a pool of 16), a frame it must fit (ext), and a few lines of motion: a screen rendering,
  // leads falling through a funnel and landing as coins, likes rising off a beating heart, a chart climbing inside a magnifier.
  // Seats take the nearest free piece and the lower a seat the earlier it moves, so a figure builds from the ground up; the
  // rig shrinks and rises so the frame stays in view ----
  const ring = (n, r) => Array.from({ length: n }, (_, i) => [r * Math.cos((i * 2 * Math.PI) / n), r * Math.sin((i * 2 * Math.PI) / n), 0]);
  const grid = (xs, ys, z = 0) => [].concat(...xs.map((x) => ys.map((y) => [x, y, z])));
  const seg = (P, ks, v) => { let j = 0; while (j < P.length - 2 && v > ks[j + 1]) j++; const k2 = (v - ks[j]) / (ks[j + 1] - ks[j]); return [P[j][0] + (P[j + 1][0] - P[j][0]) * k2, P[j][1] + (P[j + 1][1] - P[j][1]) * k2]; };
  const SHAPES = {
    robot: { seats: [].concat(...[-1, 0, 1].map((x) => [-1, 0, 1].map((y) => [x, y, 0])), ...[-1, 0, 1].map((y) => [[-2.18, y - 0.25, 0.15], [2.18, y - 0.25, 0.15]]),
      [[0, 2, 0], [0, 0, 1], [0, 0, -1]], ...[-2, -3, -4].map((y) => [[-0.58, y, 0], [0.58, y, 0]]), [[-0.58, -5, 0.3], [0.58, -5, 0.3]]), ext: [-2.7, 2.7, -5.5, 2.5] },
    // a monitor: the pieces make the bezel, neck and base; the screen is frost, and it renders in a sweep
    screen: { seats: grid([-3, -2, -1, 0, 1, 2, 3], [0, 1, 2, 3, 4]).filter(([x, y]) => Math.abs(x) === 3 || y === 0 || y === 4).concat([[0, -1, 0]], grid([-2, -1, 0, 1, 2], [-2])),
      extras: grid([-2, -1, 0, 1, 2], [1, 2, 3]).map((p) => ({ p, k: "frost", s: 1 })), ext: [-3.5, 3.5, -2.5, 4.5],
      anim(t, X) { X.forEach((e) => { const col = e.base.x + 2, row = e.base.y - 1, ph = ((t * 0.9) % 2.8) - (col * 0.22 + row * 0.1) - 0.3; e.glow = 1.0 + 2.4 * Math.max(0, 1 - Math.abs(ph) * 2.2); }); } },
    // a funnel over a money box: leads (red) fall in from above, slide to the spout, and come out below as coins (frost) that
    // land in the box; the box's own pieces are the tray, its sides and the first coins
    funnel: { seats: [[-3, 2.5], [-2.5, 2], [-2, 1.5], [-1.5, 1], [-1, 0.5], [3, 2.5], [2.5, 2], [2, 1.5], [1.5, 1], [1, 0.5], [-0.5, -0.5], [0.5, -0.5], [-0.5, -1.5], [0.5, -1.5],
        [-2, -5], [-1, -5], [0, -5], [1, -5], [2, -5], [-2.5, -4], [-2.5, -3], [2.5, -4], [2.5, -3], [-1, -4], [0, -4], [1, -4]].map(([x, y]) => [x, y, 0]),
      extras: Array.from({ length: 16 }, (_, i) => ({ p: [0, 0, 0], k: i < 8 ? "red" : "frost", s: i < 8 ? 0.5 : 0.62 })), ext: [-3.3, 3.3, -5.5, 4.6],
      anim(t, X) { for (let i = 0; i < 8; i++) { const u = (t * 0.2 + i * 0.125) % 1, L = X[i], C = X[8 + i], x0 = ((i * 1.37) % 5) - 2.5, sx = (i % 3) - 1, sy = -3 + (Math.floor(i / 3) % 2);
          if (u < 0.6) { const v = u / 0.6, p = seg([[x0, 4.8], [x0 * 0.72, 0.6 + Math.abs(x0) * 0.6], [0, 0.2], [0, -1.7]], [0, 0.42, 0.74, 1], v);
            L.on = true; L.pos.set(p[0], p[1], 0.25); L.glow = 1.5 + 1.6 * Math.max(0, 1 - Math.abs(v - 0.78) * 5); C.on = false; }   // it lights as it hits the spout
          else { const k2 = Math.min(1, (u - 0.6) / 0.3); L.on = false; C.on = true; C.pos.set(sx * k2, -2.0 + (sy + 2.0) * k2, 0.3); C.glow = 2.6 - 1.3 * k2; } } } },
    // a heart that beats (the swell is in the frame loop), with likes rising off it
    heart: { seats: [].concat([-2, -1, 1, 2].map((x) => [x, 2, 0]), [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((x) => [x, 1, 0]), [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((x) => [x, 0, 0]),
        [-2, -1, 0, 1, 2].map((x) => [x, -1, 0]), [-1, 0, 1].map((x) => [x, -2, 0]), [[-0.5, -3, 0], [0.5, -3, 0]]),
      extras: Array.from({ length: 6 }, () => ({ p: [0, 0, 0], k: "red", s: 0.45 })), ext: [-3, 3, -3.5, 5.6],
      anim(t, X) { X.forEach((e, i) => { const u = (t * 0.3 + i / 6) % 1, x = ((i * 1.7) % 3) - 1.5; e.on = u > 0.04; e.pos.set(x + Math.sin(u * 6 + i) * 0.4, 2.6 + u * 3.4, 0.5); e.sc = 0.45 * (1 - u) + 0.08; e.glow = 1.2 + 2 * (1 - u); }); } },
    // a magnifier (search) with a chart climbing inside it, and an arrow lighting up along the climb
    lens: { seats: ring(12, 2.8).concat(Array.from({ length: 6 }, (_, i) => [(3.6 + i * 0.8) * 0.707, -(3.6 + i * 0.8) * 0.707, 0]),
        [[-1.2, -1.6], [0, -1.6], [0, -0.6], [0, 0.4], [1.2, -1.6], [1.2, -0.6], [1.2, 0.4], [1.2, 1.4]].map(([x, y]) => [x, y, 0])),
      extras: [[-1.9, -0.4], [-1.3, -0.1], [-0.7, 0.3], [-0.1, 0.7], [0.5, 1.1], [1.1, 1.5]].map((p) => ({ p: [p[0], p[1], 0.75], k: "red", s: 0.42 })), ext: [-3, 6.2, -6.2, 3],
      anim(t, X) { X.forEach((e, i) => { const ph = ((t * 0.8) % 2.4) - i * 0.2 - 0.2, a = Math.max(0, 1 - Math.abs(ph) * 3); e.pos.y += a * 0.18; e.glow = 1.2 + 2.4 * a; }); } },
  };
  // the extra pieces: plain glass (no marks), their own materials so each can glow on its own, children of the cube group
  const blank = { red: faceTextures({ glass: "red" }, R), frost: faceTextures({ glass: "frost" }, R) };
  const xmat = (k2) => new THREE.MeshPhysicalMaterial({ map: blank[k2][0], emissiveMap: blank[k2][1], emissive: 0xffffff, emissiveIntensity: 1.35, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04, specularIntensity: 0.7, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
  const skGeo = stickerGeo(1, 1); geos.push(skGeo);
  const extras = solo ? [] : Array.from({ length: 16 }, () => { const g = new THREE.Group(); g.visible = false; g.add(new THREE.Mesh(bodyGeo, bodyMat));
    const m = { red: xmat("red"), frost: xmat("frost") }, sk = FRAMES.map((F, k2) => { const sm = new THREE.Mesh(skGeo, m.red); sm.quaternion.copy(basis[k2]); sm.position.copy(F.n).multiplyScalar(0.488); g.add(sm); return sm; });
    cube.add(g); return { g, m, sk, pos: V(0, 0, 0), base: V(0, 0, 0), on: false, sc: 0.5, s0: 0.5, glow: 1.35, k: "red" }; });
  let shapeKind = null, shapeScale = 1, shapeLift = 0, shapeExtras = 0; const shapeC = V(0, 0, 0);
  function setShape(kind) {
    const S2 = SHAPES[kind]; if (!S2 || solo) return false;
    const seats = S2.seats, free = cubies.slice(), ys = seats.map((q) => q[1]), yMin = Math.min(...ys), yMax = Math.max(...ys), [ex0, ex1, ey0, ey1] = S2.ext;
    shapeC.set((ex0 + ex1) / 2, (ey0 + ey1) / 2, 0); shapeScale = Math.min(1, 4.2 / Math.max(ex1 - ex0 + 1, ey1 - ey0 + 1)); shapeLift = -shapeC.y;
    for (const q of seats.slice().sort((a, b2) => a[1] - b2[1] || Math.abs(a[0]) - Math.abs(b2[0]))) {
      const t2 = V(q[0], q[1], q[2]); let bi = 0, bd = 1e9;
      free.forEach((c, i) => { const d = c.userData.home.distanceToSquared(t2); if (d < bd) { bd = d; bi = i; } });
      const c = free.splice(bi, 1)[0], u = c.userData; u.rt.copy(t2); u.robo.copy(t2).sub(u.home); u.rd = yMax > yMin ? ((yMax - q[1]) / (yMax - yMin)) * 0.45 : 0;
    }
    shapeExtras = Math.min(extras.length, (S2.extras || []).length);
    (S2.extras || []).slice(0, shapeExtras).forEach((x, i) => { const e = extras[i]; e.base.set(x.p[0], x.p[1], x.p[2]); e.s0 = x.s || 0.6; e.k = x.k || "red"; e.sk.forEach((sm) => { sm.material = e.m[e.k]; }); });
    shapeKind = kind; return true;
  }
  function animExtras() {
    if (!shapeKind || robo < 1e-3) { extras.forEach((e) => { e.g.visible = false; }); return; }
    const S2 = SHAPES[shapeKind], vis = sstep(0.3, 0.8, robo);
    for (let i = 0; i < extras.length; i++) { const e = extras[i]; if (i >= shapeExtras) { e.g.visible = false; continue; } e.on = true; e.pos.copy(e.base); e.sc = e.s0; e.glow = 1.35; }
    if (S2.anim) S2.anim(t, extras.slice(0, shapeExtras));
    for (let i = 0; i < shapeExtras; i++) { const e = extras[i]; e.g.visible = e.on && vis > 0.01; e.g.position.copy(e.pos); e.g.scale.setScalar(Math.max(0.001, e.sc * vis)); e.m[e.k].emissiveIntensity = e.glow; }
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

  // ---- face-safe scrambles: a layer turning through 45 degrees swings its corners up to ~8% of the cube past the cube's outline.
  // The clip's own scrambles only use layers that stay clear of the keep-out line beside his face, checked for the orientation
  // the cube turns from and the one it turns to, with the pointer where it is and at the right edge (the sway toward him).
  // Pure maths on the turning slab's 8 corners, nothing in the scene moves. The visitor's own twists can use any layer; the
  // face guard below covers those.
  const AXV = [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)], tq = new THREE.Quaternion(), tp = V(0, 0, 0), wm = new THREE.Matrix4(), wq = new THREE.Quaternion(), wpos = V(0, 0, 0), we = new THREE.Euler();
  function layerNeed(qc, ax, layer, M) {
    const o = [0, 1, 2].filter((i) => i !== ax), yMax = lay.keep[1]; let worst = -1e9;
    for (const th of [0.39, 0.785, 1.18, -0.39, -0.785, -1.18]) { tq.setFromAxisAngle(AXV[ax], th);
      for (let q = 0; q < 8; q++) { tp.set(0, 0, 0); tp[AX[o[0]]] = q & 1 ? 1.5 : -1.5; tp[AX[o[1]]] = q & 2 ? 1.5 : -1.5; tp[AX[ax]] = layer + (q & 4 ? 0.5 : -0.5);
        tp.applyQuaternion(tq).applyQuaternion(qc).applyMatrix4(M).project(cam);
        const x = ((tp.x + 1) / 2) * W, y = ((1 - tp.y) / 2) * H, e = x - Math.max(0, y - yMax) * 1.5; if (e > worst) worst = e; } }
    return worst - lay.keep[0];
  }
  function needs(qs) {                                               // worst need per (axis, layer) over orientations and the two rigs
    cam.updateMatrixWorld(); rig.updateMatrixWorld(true);
    we.copy(eu); we.y += (0.5 - sx) * 0.45; wq.setFromEuler(we).multiply(user);       // this frame's sway, with the pointer at the right edge wpos.copy(rig.position); wpos.x += (0.5 - sx) * drift * k;
    wm.compose(wpos, wq, rig.scale);
    const out = []; for (let ax = 0; ax < 3; ax++) for (const layer of [-1, 1]) {
      let n = -1e9; for (const qc of qs) n = Math.max(n, layerNeed(qc, ax, layer, rig.matrixWorld), layerNeed(qc, ax, layer, wm)); out.push({ ax, layer, need: n }); }
    return out;
  }
  // the whole cube turning to its next face is wider part-way through (up to ~8% of the cube): how far its 8 outer corners
  // reach past the keep-out line over that turn, with the pointer where it is and at the right edge
  function pathNeed(qs) {
    cam.updateMatrixWorld(); rig.updateMatrixWorld(true);
    we.copy(eu); we.y += (0.5 - sx) * 0.45; wq.setFromEuler(we).multiply(user); wpos.copy(rig.position); wpos.x += (0.5 - sx) * drift * k; wm.compose(wpos, wq, rig.scale);
    const yMax = lay.keep[1]; let worst = -1e9;
    for (const qc of qs) for (const M of [rig.matrixWorld, wm]) for (let q = 0; q < 8; q++) {
      tp.set(q & 1 ? 1.5 : -1.5, q & 2 ? 1.5 : -1.5, q & 4 ? 1.5 : -1.5).applyQuaternion(qc).applyMatrix4(M).project(cam);
      const x = ((tp.x + 1) / 2) * W, y = ((1 - tp.y) / 2) * H, e = x - Math.max(0, y - yMax) * 1.5; if (e > worst) worst = e; }
    return worst - lay.keep[0];
  }
  let planned = 0, plannedFor = -1;
  const planPush = (k2) => { planned = lay.keep ? Math.max(0, pathNeed(path(k2)) + 2) : 0; plannedFor = k2; };
  function rndSafe(n, avoid, qs) {
    if (!lay.keep) return rnd(n, avoid);
    const all = needs(qs).sort((a, b) => a.need - b.need); let ok = all.filter((p) => p.need <= -3);
    for (let i = ok.length; new Set(ok.map((p) => p.ax)).size < 2 && i < all.length; i++) ok = all.slice(0, i + 1);   // keep two axes at least
    const out = []; let last = avoid;
    for (let i = 0; i < n; i++) { const c = ok.filter((p) => p.ax !== last), pool = c.length ? c : ok, p = pool[(Math.random() * pool.length) | 0];
      last = p.ax; out.push({ ax: p.ax, layer: p.layer, dir: Math.random() < 0.5 ? -1 : 1 }); }
    return out;
  }
  // ---- the clip: intro solve, then per beat: scramble, solve, present, hold ----
  let plan = [], phase = "solve", beat = 0, holdT = 0, paused = false, frozen = false, want = null, solveN = 0;
  let explode = 0, lift = 0, userMode = false, userT = 0, twisted = false; const queue = [];
  // the orientations the cube passes through while it turns to face k (the scramble runs during that turn)
  const path = (k) => { const a = cube.quaternion.clone(); return Array.from({ length: 13 }, (_, i) => a.clone().slerp(present[k], i / 12)); };   // turns reach ~170 deg
  const roll = new THREE.Quaternion(), rollE = new THREE.Euler();
  const startBeat = (k, n = scramble) => { const qs = path(k); beat = k; target.copy(present[k]); plan = rndSafe(n, hist.length ? hist[hist.length - 1].ax : -1, qs); phase = "scramble"; onBeat(k, "start");
    if (tumble) { const sg = () => (Math.random() < 0.5 ? -1 : 1); rollE.set(sg() * (0.35 + Math.random() * 0.35), sg() * (0.9 + Math.random() * 0.8), sg() * 0.25);   // show its other sides while it mixes
      target.multiply(roll.setFromEuler(rollE)); } };
  let hopT = 1;
  // land scrambled, already facing roughly the first face, and solve on arrival
  if (!calm) rnd(tumble ? 12 : 7).forEach((m) => { begin(m, 0); hist.push(finish()); });
  target.copy(present[0]); cube.quaternion.copy(present[0]); if (!calm) cube.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5, 0.9, 0.2)));
  if (calm) { phase = "hold"; paused = true; } else onBeat(0, "start");    // calm: solved, presented, and it stays that way until the page says otherwise
  // v10: a layer drawn out of the cube (drawK, eased dAmt toward dTo) and a face flashed once (pulseK, pulseT)
  let drawK = -1, dAmt = 0, dTo = 0, pulseK = -1, pulseT = 0, robo = 0, roboTo = 0, pendingKind = null, beatUp = false;   // robo: 0 = the cube, 1 = the figure
  const ROBOQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.16, 0.42, 0)), tmpQ = new THREE.Quaternion();   // how the robot stands: facing you, turned a little

  function step(dt) {
    if (mv) { mv.t += dt / mv.dur; const a = easeIO(Math.min(1, mv.t)) * mv.dir * Math.PI / 2; pivot.rotation.set(0, 0, 0); pivot.rotation[AX[mv.ax]] = a;
      if (mv.t >= 1) { const m = finish(); if (m.rec) hist.push(m); } return; }
    if (explode > 0.001) return;                                     // apart (scroll): hold everything until it is whole again
    if (introT < 1) return;                                          // v9.1: it lands mixed up, waits a beat, then solves
    if (introWait > 0) { introWait -= dt; return; }
    if (queue.length) { begin({ ...queue.shift(), rec: true }, 0.22); return; }      // the visitor's own twists
    if (userMode) {                                                  // wait until they let go, then solve their twists too
      if (drag) { userT = 0; return; } userT += dt; if (userT < idle) return;
      userMode = false; plan = []; phase = "solve"; if (!twisted) { phase = hist.length ? "solve" : "hold"; }
      twisted = false;
    }
    if (want !== null) {                                             // a result was picked: go there now
      const k = want; want = null; planPush(k);
      if (phase === "hold") { startBeat(k, 4); } else { beat = k; target.copy(present[k]); plan = []; phase = "solve"; onBeat(k, "start"); }
    }
    if (phase === "scramble") { if (plan.length) begin({ ...plan.shift(), rec: true }, tumble ? 0.15 : 0.17); else { phase = "solve"; solveN = hist.length; target.copy(present[beat]); } return; }
    if (phase === "solve") { if (hist.length) { const m = hist.pop(), left = hist.length, i = solveN - left - 1;
        const dur = !tumble ? 0.3 : left === 0 ? 0.42 : left === 1 ? 0.26 : i === 0 ? 0.3 : 0.17;     // a slow first turn, quick ones, then it lands
        begin({ ax: m.ax, layer: m.layer, dir: -m.dir }, dur); }
      else { phase = "hold"; holdT = 0; onBeat(beat, "solved"); if (tumble) { hopT = 0; joyT = 1.6; } } return; }
    if (phase === "hold" && !paused && !still) { holdT += dt; const nx = (beat + 1) % (beats || faces.length);
      if (holdT >= hold - 0.4 && plannedFor !== nx) planPush(nx);      // glide clear of his face before the turn starts
      if (holdT >= hold) startBeat(nx); }
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
  const up = (e) => { const d = drag; drag = null; userT = 0;
    if (d && d.mode === "twist" && !d.done && e && e.type === "pointerup" && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 8) { userMode = false; tap(); } };
  function tap() {                                                   // the face jumps, then it shuffles and solves again
    if (still || frozen || explode > 0.001 || phase !== "hold" || mv || queue.length || oT > 0) return false;
    oT = 0.42; onTap(); setTimeout(() => { if (phase === "hold" && !frozen) startBeat(beat, scramble + 2); }, 300); return true;
  }
  const leave = () => { hovDirty = "off"; };
  if (hit) { hit.addEventListener("pointerdown", down); hit.addEventListener("pointermove", move); hit.addEventListener("pointerup", up); hit.addEventListener("pointercancel", up); hit.addEventListener("pointerleave", leave); }
  const pm2 = (e) => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; }; addEventListener("pointermove", pm2, { passive: true });

  // ---- intro: drop into the palm, settle ----
  let introT = 1, introRes = null, introWait = 0;
  const intro = () => new Promise((res) => { if (still || frozen) { res(); return; } introT = 0; introWait = tumble ? 0.9 : 0; introRes = res; });

  // how far right the cube reaches beside his face this frame (canvas px): every cubie corner, where corners below the bottom of
  // the face box (lay.keep = [x, yMax]) count 1.5 px less per px below it, so the reach stays continuous (no hop when a corner
  // rises past the chin line). The face guard and its test read it; lft = the cube's left edge.
  const corner = V(0, 0, 0); let guard = 0, lft = 0;
  function reach() {
    cam.updateMatrixWorld(); rig.updateMatrixWorld(true); let mx = -1e9, mn = 1e9;
    const yMax = lay.keep ? lay.keep[1] : 1e9;
    for (const c of cubies) { const m = c.userData.inner.matrixWorld;
      for (let q = 0; q < 8; q++) { corner.set(q & 1 ? 0.5 : -0.5, q & 2 ? 0.5 : -0.5, q & 4 ? 0.5 : -0.5).applyMatrix4(m).project(cam);
        const x = ((corner.x + 1) / 2) * W, y = ((1 - corner.y) / 2) * H, e = x - Math.max(0, y - yMax) * 1.5;
        if (e > mx) mx = e; if (x < mn) mn = x; } }
    lft = mn; return mx;
  }
  let on = true, raf = 0, last = performance.now(), t = 0;
  const off = V(0, 0, 0), tv = V(0, 0, 0), qc = new THREE.Quaternion(), pc = V(0, 0, 0), eu = new THREE.Euler(), qw = new THREE.Quaternion(), qwi = new THREE.Quaternion();
  function frame(now) {
    raf = 0; if (!on || document.hidden || frozen) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    step(dt);
    cube.quaternion.slerp(robo > 1e-3 ? tmpQ.copy(target).slerp(ROBOQ, sstep(0, 1, robo)) : target, 1 - Math.exp(-dt * 3.2));
    if (!drag || drag.mode !== "spin") user.slerp(tmp.identity(), 1 - Math.exp(-dt * 2.5));
    sx += (px - sx) * Math.min(1, dt * 2.4); sy += (py - sy) * Math.min(1, dt * 2.4);
    if (hovDirty) {                                                 // one raycast per frame at most
      const h = hovDirty === "off" || explode > 0.001 ? null : pick(hovDirty[0], hovDirty[1]); hovDirty = null;
      hov = h ? h.object.userData.cubie : null; if (!!hov !== hovOn) { hovOn = !!hov; onHover(hovOn); }
    }
    // inner offsets: burst apart along each cubie's direction from the centre (explode), or pop the hovered one. The burst
    // opens slowly, then throws the pieces out of frame (mostly sideways, little toward the lens) so Ian is revealed at the end
    // v10: the assembly intro runs the burst backwards (the pieces start far out and tumble in); a drawn layer slides out along its face
    const inX = enter === "assemble" && introT < 1 ? 1 - easeIO(introT) : 0, ex = Math.max(explode, inX), far = inX > explode ? 8.5 : 5.2;
    const e2 = ex * ex, e3 = e2 * ex; qw.copy(rig.quaternion).multiply(cube.quaternion); qwi.copy(qw).invert();
    dAmt += (dTo - dAmt) * Math.min(1, dt * 7); if (dTo === 0 && dAmt < 1e-3) dAmt = 0;
    robo = roboTo ? Math.min(1, robo + dt / 1.5) : Math.max(0, robo - dt / 1.1);
    if (!roboTo && robo === 0 && pendingKind) { if (setShape(pendingKind)) roboTo = 1; pendingKind = null; }   // a new figure waits for the old one to fold
    // the heart beats: the figure swells on each beat and its front flashes
    let hb = 1; if (shapeKind === "heart" && robo > 0.5) { const w = Math.pow(Math.max(0, Math.sin(t * 7)), 6); hb = 1 + 0.08 * w; if (w > 0.5 && !beatUp) { beatUp = true; pulseK = 0; pulseT = 0.5; } if (w < 0.1) beatUp = false; }
    const drawN = drawK >= 0 && dAmt > 1e-3 ? FRAMES[drawK].n : null;
    for (const c of cubies) {
      const u = c.userData; u.pop += ((c === hov && !drag ? 1 : 0) - u.pop) * Math.min(1, dt * 10);
      const inP = c.parent === pivot; qc.copy(c.quaternion); pc.copy(c.position); if (inP) { qc.premultiply(pivot.quaternion); pc.applyQuaternion(pivot.quaternion); }
      const amt = e3 * far * u.jit + u.pop * 0.07, dA = drawN && pc.dot(drawN) > 0.5 ? dAmt : 0;
      if (amt < 1e-4 && dA < 1e-4 && robo < 1e-4) { u.inner.position.set(0, 0, 0); u.inner.quaternion.identity(); continue; }
      off.set(0, 0, 0);
      if (amt >= 1e-4) { off.copy(pc).normalize().applyQuaternion(qw); off.x *= 1.15; off.y *= 0.8; off.z *= 0.35; off.applyQuaternion(qwi).multiplyScalar(amt); }
      if (dA >= 1e-4) off.addScaledVector(drawN, dA * 1.3);
      if (robo > 1e-4) { const ra = sstep(u.rd, u.rd + 0.55, robo); if (ra > 1e-4) { off.addScaledVector(u.robo, ra); if (hb !== 1) off.addScaledVector(tv.copy(u.rt).sub(shapeC), ra * (hb - 1)); } }
      off.applyQuaternion(qc.invert()); u.inner.position.copy(off);
      u.inner.quaternion.setFromAxisAngle(u.ax, e2 * u.spin);
    }
    if (pulseT > 0) { pulseT = Math.max(0, pulseT - dt); mats[pulseK].emissiveIntensity = 1.35 + 1.7 * Math.sin(Math.min(1, pulseT / 0.6) * Math.PI); }
    animExtras();
    // the face: blinks now and then, looks toward the cursor, beams after a solve, opens its mouth on a tap
    if (liveTex.length) {
      blinkT -= dt; if (blinkT < -0.16) blinkT = 2 + Math.random() * 3.2;
      FS.blink = blinkT < 0 ? Math.sin((-blinkT / 0.16) * Math.PI) : 0;
      FS.gx += (Math.max(-1, Math.min(1, sx * 2.4)) - FS.gx) * Math.min(1, dt * 6); FS.gy += (Math.max(-1, Math.min(1, sy * 2.4)) - FS.gy) * Math.min(1, dt * 6);
      joyT = Math.max(0, joyT - dt); oT = Math.max(0, oT - dt); FS.joy = joyT > 0.25 ? 1 : joyT / 0.25; FS.o = oT > 0 ? 1 : 0;
      paintFace(false);
    }
    // rig: placement scale, float, sway, look toward the cursor, scroll lift, intro drop
    let iy = 0, is = 1, ir = 0;
    if (hopT < 1) { hopT = Math.min(1, hopT + dt / 0.75); iy += Math.sin(hopT * Math.PI) * 0.55 * (1 - hopT * 0.3); ir += easeIO(hopT) * Math.PI * 2; }
    if (introT < 1) { introT = Math.min(1, introT + dt / (enter === "assemble" ? 1.9 : 1.25));
      if (enter === "assemble") { const a = easeIO(introT); is = 0.86 + 0.14 * a; ir = (1 - a) * 1.4; }     // the pieces do the travelling (inX above)
      else { const b = backOut(introT); iy = (1 - b) * 4.2; is = 0.55 + 0.45 * Math.min(1, b); ir = (1 - easeIO(introT)) * 2.4; }
      if (introT >= 1 && introRes) { introRes(); introRes = null; } }
    const L = sstep(0, 1, lift), rbs = sstep(0, 1, robo), s = k * is * (1 + 0.32 * L) * (1 - (1 - shapeScale) * rbs);   // a figure is taller than the cube: it shrinks to stay in frame
    rig.scale.setScalar(s);
    rig.position.set((sx * drift - L * away) * k, (Math.sin(t * 1.15) * 0.12 - sy * 0.18 + iy - L * 0.25) * k + rbs * shapeLift * s, 0);   // scroll: it grows toward you, so it drops a little to stay clear of the nav
    eu.set(sy * 0.3 + Math.sin(t * 0.6) * 0.03 + L * 0.5, sx * 0.45 + ir + L * 1.1, Math.sin(t * 0.8) * 0.035);
    rig.quaternion.setFromEuler(eu).multiply(user);
    // face guard (v8, render i): no corner of any cubie crosses the keep-out line beside Ian's face (lay.keep, canvas px),
    // whatever the turn, twist, sway, drift or hover pop. Before each turn to a new face the cube glides left by what that turn
    // will need (planned, eased in), this frame's measured need is a hard floor, and once the face is presented it drifts back.
    // Off while the cube bursts apart on scroll (the pieces fly out past him on purpose).
    if (lay.keep != null && explode < 0.001) {
      if (planned && phase === "hold" && plannedFor === beat && holdT > 0.3) planned = 0;     // presented: drift back
      const need = Math.max(0, reach() - lay.keep[0]), goal = Math.max(need, planned);
      guard = goal >= guard ? Math.max(need, guard + (goal - guard) * Math.min(1, dt * 7)) : guard + (goal - guard) * Math.min(1, dt * 1.8);
      if (guard > 0.01) rig.position.x -= guard * VIS / H;
    } else guard = 0;
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
    tap,
    get face() { return { ...FS, shown: { ...shown } }; },
    pick(k2) { if (still) { api.freeze(k2); return; } userMode = false; twisted = false; queue.length = 0; want = k2; },
    set paused(v) { paused = v; if (!v && phase === "hold") holdT = Math.min(holdT, hold - 1.2); },
    set explode(v) { const was = explode > 0.001; explode = Math.min(1, Math.max(0, v)); if (!was && explode > 0.001) { complete(); drag = null; } },
    get explode() { return explode; },
    set lift(v) { lift = Math.min(1, Math.max(0, v)); },
    get beat() { return beat; },
    // v10 (the services cube): turn to face k without mixing; draw face k's layer out (on) or push it back (off); flash face k once
    show(k2) { beat = k2; target.copy(present[k2]); },
    draw(k2, on = true) { if (on) drawK = k2; else if (k2 !== drawK) return; dTo = on ? 1 : 0; },
    pulse(k2) { pulseK = k2; pulseT = 0.6; },
    // stand up into a figure (robot | screen | funnel | heart | crown), or fold back into the cube (null); a new figure waits for the old one to fold
    morph(kind) { if (!kind) { roboTo = 0; pendingKind = null; return; } if (robo > 1e-3 && kind !== shapeKind) { roboTo = 0; pendingKind = kind; return; } if (setShape(kind)) roboTo = 1; },
    stand(on = true) { api.morph(on ? "robot" : null); },
    get robot() { return robo; },                                                    // 0 = the cube, 1 = the figure
    get shape() { return roboTo || robo > 1e-3 ? shapeKind : null; },
    drawn() { return { k: drawK, amt: +dAmt.toFixed(3), to: dTo, pulse: +pulseT.toFixed(2), intro: +introT.toFixed(2), beat, robo: +robo.toFixed(3), shape: api.shape, extras: api.shape ? shapeExtras : 0 }; },
    reach() { const x = reach(); return { x, left: lft, keep: lay.keep ?? null, guard, planned, phase, moving: !!mv, slerp: +cube.quaternion.angleTo(target).toFixed(3) }; },
    needs(k2) { return lay.keep ? needs(path(k2)).map((p) => ({ ...p, need: +p.need.toFixed(1) })) : null; },   // test hook: right reach at face height, left edge, guard (px)
    // test hooks: distance from solved (0 = every cubie home and unrotated), and the clip's state
    homeErr() { let e = 0; for (const c of cubies) e = Math.max(e, c.position.distanceTo(c.userData.home), 1 - Math.abs(c.quaternion.w)); return e; },
    state() { return { phase, hist: hist.length, queue: queue.length, moving: !!mv, user: userMode, explode, beat }; },
    // the same twist a drag makes, for tests that cannot drag: face n (e.g. [0,0,1]) of the cubie at grid cell g, screen direction (dx, dy)
    twistAt(g, n, dx, dy) { complete(); const c = cubies.find((q) => q.position.equals(V(...g))); if (!c) return null; const nn = V(...n);
      const tw = twistFor(c, nn, c.position.clone().addScaledVector(nn, 0.5), dx, dy); if (tw) { queue.push(tw); userMode = true; userT = 0; if (!twisted) { twisted = true; onBeat(beat, "start"); } } return tw; },
    // freeze on beat k, solved and presented (reduced motion, screenshots); mid = caught half-way through a twist
    freeze(k2, mid = false) {
      frozen = true; cancelAnimationFrame(raf); raf = 0; solveNow(); beat = k2; target.copy(present[k2]); cube.quaternion.copy(present[k2]); user.identity();
      introT = 1; if (introRes) { introRes(); introRes = null; } drawK = -1; dAmt = dTo = 0; robo = roboTo = 0; pendingKind = null; if (pulseT > 0) { pulseT = 0; mats[pulseK].emissiveIntensity = 1.35; }
      rig.position.set(0, 0, 0); rig.quaternion.identity(); rig.scale.setScalar(k); phase = "hold";
      cubies.forEach((c) => { c.userData.inner.position.set(0, 0, 0); c.userData.inner.quaternion.identity(); });
      if (mid) { const ms = rnd(3); ms.forEach((m) => { begin(m, 0); hist.push(finish()); }); begin({ ax: 1, layer: 1, dir: 1, rec: true }, 1); pivot.rotation.y = 0.62; }
      hopT = 1; joyT = 0; oT = 0; FS.blink = 0; FS.joy = 0.6; FS.o = 0; FS.gx = 0.2; FS.gy = 0.05; if (liveTex.length) paintFace(true);
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
      tex.flat().forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); extras.forEach((e) => { e.m.red.dispose(); e.m.frost.dispose(); }); Object.values(blank).flat().forEach((x) => x.dispose()); geos.forEach((x) => x.dispose()); bodyGeo.dispose(); bodyMat.dispose(); hitGeo.dispose(); hitMat.dispose(); R.dispose(); },
  };
  if (still) api.freeze(0);
  return api;
}
