// Pick your weapon · WebGL orbit (refs: "Choose Your Way!" ring + the neon glass keycaps on black).
// v9 (Sue: no click before you see a service): one weapon is always the main one. The page sets `active` as you scroll
// (one weapon per step) and the ring turns that weapon to the front, big and bright, the other two weapons and the small
// objects stepped back and dimmed; the ring sits right of centre (`shift`) so the page can show the service beside it.
// Clicking a weapon asks the page to go to it (onPick); there is no camera fly-in any more. The small objects are
// decoration. Images are glass objects rendered on black, drawn additively so black disappears.
// v8: the art is red, but bloom in linear light turns the halos salmon-orange once they are gamma-encoded, so a last
// grade pass pulls orange hues back to brand red (hue ~356) and lifts their saturation; whites and darks are untouched.
// cool (0 here; the armour sets 1): violet and purple reflections lose their colour, so chrome reads as silver, as on the weapons.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

export const RedGrade = {
  uniforms: { tDiffuse: { value: null }, target: { value: -4 / 360 }, boost: { value: 1.35 }, cool: { value: 0 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform float target, boost, cool; varying vec2 vUv;
    vec3 rgb2hsv(vec3 c){ vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
      vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y); float e = 1.0e-10;
      return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x); }
    vec3 hsv2rgb(vec3 c){ vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0); vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www); return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y); }
    void main(){ vec4 t = texture2D(tDiffuse, vUv); vec3 h = rgb2hsv(clamp(t.rgb, 0.0, 1.0)); float deg = h.x * 360.0;
      h.y *= 1.0 - cool * 0.88 * smoothstep(232.0, 252.0, deg) * (1.0 - smoothstep(318.0, 334.0, deg));   // cool > 0: violet reflections -> neutral chrome
      if (deg > 300.0) deg -= 360.0;
      float w = clamp((55.0 - deg) / 15.0, 0.0, 1.0) * step(-20.0, deg) * smoothstep(0.06, 0.22, h.y);
      h.x = fract(mix(deg, target * 360.0, w) / 360.0 + 1.0); h.y = clamp(h.y * mix(1.0, boost, w), 0.0, 1.0);
      gl_FragColor = vec4(hsv2rgb(h), t.a); }`,
};

export function mountOrbit(root, items, { onPick, shift = 2.4 } = {}) {
  const cv = root.querySelector("canvas.orb"), small = innerWidth < 760;
  let R; try { R = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { return null; }
  R.setPixelRatio(Math.min(devicePixelRatio, 1.5)); R.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#030304");
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100), home = new THREE.Vector3(0, 1.6, 13); cam.position.copy(home);
  const look = new THREE.Vector3(0, 0, 0);
  const loader = new THREE.TextureLoader(), objs = [];
  items.forEach((it, i) => {
    const tex = loader.load(it.src); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1 });
    const s = it.weapon ? 3.1 : 1.7, mesh = new THREE.Mesh(new THREE.PlaneGeometry(s, s), m);
    mesh.userData = { ...it, i, a0: (i / items.length) * Math.PI * 2, bob: Math.random() * 6, spin: (Math.random() - 0.5) * 0.4, s: 1 };
    scene.add(mesh); objs.push(mesh);
  });
  // a little dust for depth
  const N = 260, dp = new Float32Array(N * 3); for (let i = 0; i < N; i++) dp.set([(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 20], i * 3);
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  scene.add(new THREE.Points(dg, new THREE.PointsMaterial({ color: "#ffffff", size: 0.03, transparent: true, opacity: 0.5 })));
  const comp = new EffectComposer(R); comp.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.62, 0.5, 0.35); comp.addPass(bloom); comp.addPass(new OutputPass()); comp.addPass(new ShaderPass(RedGrade));
  function size() { const w = root.clientWidth, h = root.clientHeight; R.setSize(w, h, false); comp.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  addEventListener("resize", size); size();

  let prog = 0, active = 0, hover = null, on = true, raf = 0, last = performance.now(), clk = 0, px = 0, py = 0, A = null;
  const RX = small ? 3.6 : 6.2, RZ = small ? 2.6 : 3.4, OX = small ? 0 : shift;
  const ray = new THREE.Raycaster(), mp = new THREE.Vector2();
  // the ring's turn: the active weapon at the front (angle pi/2, nearest the camera), swaying a little as you scroll through its step
  const front = () => { const w = objs.find((o) => o.userData.weapon && o.userData.wi === active); return Math.PI / 2 - (w ? w.userData.a0 : 0) + (prog - 0.5) * 0.35; };
  const pos = (o, t) => { const a = o.userData.a0 + A, w = o.userData.weapon;
    return new THREE.Vector3(OX + Math.cos(a) * RX * (w ? 1 : 1.15), Math.sin(t * 0.6 + o.userData.bob) * 0.35 + (w ? 0 : Math.sin(a * 2) * 1.6), Math.sin(a) * RZ); };
  const pm = (e) => { const r = cv.getBoundingClientRect(); mp.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); px = mp.x; py = mp.y;
    ray.setFromCamera(mp, cam); const h = ray.intersectObjects(objs.filter((o) => o.userData.weapon))[0]; hover = h ? h.object : null; cv.style.cursor = hover ? "pointer" : ""; };
  const ck = () => { if (hover) onPick && onPick(hover.userData); };
  cv.addEventListener("pointermove", pm); cv.addEventListener("click", ck);
  function frame(now) {
    raf = 0; if (!on || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    clk += dt; const t = clk;
    // ease the ring toward the active weapon, the short way round
    const T = front(); if (A === null) A = T; let d = ((T - A) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; A += d * Math.min(1, dt * 3.2);
    objs.forEach((o) => { o.position.copy(pos(o, t));
      o.quaternion.copy(cam.quaternion); o.rotateZ(Math.sin(t * 0.5 + o.userData.bob) * 0.12 + o.userData.spin);
      const main = o.userData.weapon && o.userData.wi === active, target = main ? 1.55 : o.userData.weapon ? (o === hover ? 0.95 : 0.8) : 0.9;
      o.userData.s += (target - o.userData.s) * 0.1; o.scale.setScalar(o.userData.s);
      o.material.opacity += ((main ? 1 : o.userData.weapon ? 0.42 : 0.3) - o.material.opacity) * 0.1; });
    // camera: gentle parallax toward the pointer, looking at the ring's centre
    cam.position.lerp(home.clone().add(new THREE.Vector3(px * 0.8, py * 0.5, 0)), 0.08); look.lerp(new THREE.Vector3(small ? 0 : OX * 0.35, 0, 0), 0.08); cam.lookAt(look);
    comp.render(); raf = requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver((es) => { const e = es[es.length - 1]; on = e.isIntersecting; if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }); io.observe(root);
  raf = requestAnimationFrame(frame);
  return {
    set progress(v) { prog = v; },        // 0..1 within the active weapon's step (a little sway)
    set active(i) { active = i; },
    get active() { return active; },
    destroy() { on = false; cancelAnimationFrame(raf); io.disconnect(); removeEventListener("resize", size); R.dispose(); },
  };
}
