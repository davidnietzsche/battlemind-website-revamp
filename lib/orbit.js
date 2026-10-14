// Pick your weapon · WebGL orbit (refs: "Choose Your Way!" ring + the neon glass keycaps on black).
// Glass weapons and objects hover and circle the title in 3D; scrolling turns the orbit; hovering a weapon lifts it;
// clicking flies the camera in to it and opens its details (Back or Esc to return). Only the three weapons are clickable;
// the small objects are decoration. Images are glass objects rendered on black, drawn additively so black disappears.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export function mountOrbit(root, items, { onPick, onClose } = {}) {
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
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.7, 0.5, 0.35); comp.addPass(bloom); comp.addPass(new OutputPass());
  function size() { const w = root.clientWidth, h = root.clientHeight; R.setSize(w, h, false); comp.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  addEventListener("resize", size); size();

  let prog = 0, hover = null, picked = null, zoom = 0, on = true, raf = 0, last = performance.now(), clk = 0, px = 0, py = 0;
  const RX = small ? 3.6 : 6.2, RZ = small ? 2.6 : 3.4;
  const ray = new THREE.Raycaster(), mp = new THREE.Vector2();
  const pos = (o, t) => { const a = o.userData.a0 + prog * Math.PI * 1.6 + t * 0.07, w = o.userData.weapon;
    return new THREE.Vector3(Math.cos(a) * RX * (w ? 1 : 1.15), Math.sin(t * 0.6 + o.userData.bob) * 0.35 + (w ? 0 : Math.sin(a * 2) * 1.6), Math.sin(a) * RZ); };
  function pick(o) { picked = o; hover = null; root.classList.add("zoomed"); onPick && onPick(o.userData); }
  function close() { picked = null; root.classList.remove("zoomed"); onClose && onClose(); }
  const pm = (e) => { const r = cv.getBoundingClientRect(); mp.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); px = mp.x; py = mp.y;
    if (picked) return; ray.setFromCamera(mp, cam); const h = ray.intersectObjects(objs.filter((o) => o.userData.weapon))[0]; hover = h ? h.object : null; cv.style.cursor = hover ? "pointer" : ""; };
  const ck = () => { if (picked) return; if (hover) pick(hover); };
  const esc = (e) => { if (e.key === "Escape" && picked) close(); };
  cv.addEventListener("pointermove", pm); cv.addEventListener("click", ck); addEventListener("keydown", esc);
  function frame(now) {
    raf = 0; if (!on || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    zoom += ((picked ? 1 : 0) - zoom) * 0.07;
    // the orbit's own clock slows to a stop while a weapon is open, then resumes smoothly
    clk += dt * (1 - zoom * 0.97); const t = clk;
    objs.forEach((o) => { o.position.copy(pos(o, t));
      o.quaternion.copy(cam.quaternion); o.rotateZ(Math.sin(t * 0.5 + o.userData.bob) * 0.12 + o.userData.spin);
      const target = o === picked ? 1.35 : o === hover ? 1.22 : 1; o.userData.s += (target - o.userData.s) * 0.12; o.scale.setScalar(o.userData.s);
      o.material.opacity += ((picked && o !== picked ? 0.03 : 1) - o.material.opacity) * 0.1; });
    // camera: gentle parallax at rest; flies in to the picked weapon
    const rest = home.clone().add(new THREE.Vector3(px * 0.8, py * 0.5, -prog * 2));
    if (picked) { const p = picked.position, dir = p.clone().sub(new THREE.Vector3(0, 0, 0)).setY(0).normalize(); const tgt = p.clone().add(dir.multiplyScalar(0.6)).add(new THREE.Vector3(small ? 0 : 1.6, 0.2, 6.2));
      cam.position.lerp(rest.clone().lerp(tgt, zoom), 0.12); look.lerp(p.clone().add(new THREE.Vector3(small ? 0 : 1.7, small ? -0.9 : 0, 0)), 0.12); }
    else { cam.position.lerp(rest, 0.08); look.lerp(new THREE.Vector3(0, 0, 0), 0.08); }
    cam.lookAt(look);
    comp.render(); raf = requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }); io.observe(root);
  raf = requestAnimationFrame(frame);
  return {
    set progress(v) { prog = v; },
    pickIndex(i) { const o = objs.find((x) => x.userData.weapon && x.userData.wi === i); if (o) pick(o); },
    close,
    destroy() { on = false; cancelAnimationFrame(raf); io.disconnect(); removeEventListener("resize", size); removeEventListener("keydown", esc); R.dispose(); },
  };
}
