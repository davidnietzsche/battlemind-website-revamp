// Battle Armour · Iron-Man suit-up (ref: "Make magic happen" hand + glass keycap bracelet).
// One WebGL canvas: the Jimeng clip of armour plates flying onto the hand is drawn as a scroll-scrubbed texture
// (scroll forward = suit up, scroll back = it comes apart), and a 3D particle energy ring orbits the wrist in front of it,
// charging up a quarter at a time as each layer locks on (with a burst on every new layer).
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export function mountGauntlet(cv, frameSrc, { aspect = 0.75, wrist = [0, -0.2] } = {}) {
  let R; try { R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { return null; }
  R.setPixelRatio(Math.min(devicePixelRatio, 1.5)); R.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, 1, 0.1, 50); cam.position.set(0, 0, 6);
  // the clip, as a plane that fills the stage
  const frames = frameSrc.map((s) => { const im = new Image(); im.decoding = "async"; im.src = s; return im; });
  const tex = new THREE.Texture(); tex.colorSpace = THREE.SRGBColorSpace;
  const H = 2 * Math.tan((35 * Math.PI) / 360) * 6, W = H * aspect;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); scene.add(plane);
  let shown = -1; const show = (i) => { const im = frames[i]; if (i === shown || !im.complete || !im.naturalWidth) return false; tex.image = im; tex.needsUpdate = true; shown = i; return true; };
  frames[0].onload = () => show(0);
  // energy ring around the wrist: 4 arcs, one per layer
  const N = 640, rp = new Float32Array(N * 3), rc = new Float32Array(N * 3), seg = new Float32Array(N), ang = new Float32Array(N), rad = new Float32Array(N);
  for (let i = 0; i < N; i++) { ang[i] = (i / N) * Math.PI * 2; seg[i] = Math.floor((i / N) * 4); rad[i] = 1 + (Math.random() - 0.5) * 0.08; }
  const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.BufferAttribute(rp, 3)); rg.setAttribute("color", new THREE.BufferAttribute(rc, 3));
  const ring = new THREE.Points(rg, new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(ring);
  const burst = { t: 9, n: 0 };
  const comp = new EffectComposer(R); comp.addPass(new RenderPass(scene, cam));
  comp.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.45, 0.35, 0.88)); comp.addPass(new OutputPass());
  function size() { const r = cv.getBoundingClientRect(); R.setSize(r.width, r.height, false); comp.setSize(r.width, r.height); cam.aspect = r.width / r.height;
    // fit the clip inside the canvas (contain)
    cam.position.z = cam.aspect < aspect ? 6 * (aspect / cam.aspect) : 6; cam.updateProjectionMatrix(); }
  addEventListener("resize", size); size();
  let prog = 0, layer = -1, on = true, raf = 0, t0 = performance.now();
  const hot = new THREE.Color("#ffb347"), red = new THREE.Color("#ff2a12"), dim = new THREE.Color("#3a0006");
  function frame(now) {
    raf = 0; if (!on || document.hidden) return;
    const t = (now - t0) / 1000;
    show(Math.min(frames.length - 1, Math.round(prog * (frames.length - 1))));
    const charge = prog * 4; burst.t += 0.016;
    const cx = wrist[0] * W, cy = wrist[1] * H, rx = W * 0.19, ry = H * 0.03;
    for (let i = 0; i < N; i++) {
      const a = ang[i] + t * 0.9, lit = Math.min(1, Math.max(0, charge - seg[i])), b = burst.t < 0.6 ? (1 - burst.t / 0.6) * 0.5 : 0;
      const rr = rad[i] * (1 + b * Math.random());
      rp[i * 3] = cx + Math.cos(a) * rx * rr; rp[i * 3 + 1] = cy + Math.sin(a) * ry * rr + Math.sin(t * 3 + i) * 0.01; rp[i * 3 + 2] = Math.sin(a) * 0.6;
      const c = dim.clone().lerp(red, lit).lerp(hot, lit * (0.5 + 0.5 * Math.sin(t * 4 + i * 0.3)) * 0.6);
      const front = Math.sin(a) > 0 ? 1 : 0.35; rc[i * 3] = c.r * front; rc[i * 3 + 1] = c.g * front; rc[i * 3 + 2] = c.b * front;
    }
    rg.attributes.position.needsUpdate = true; rg.attributes.color.needsUpdate = true;
    comp.render(); raf = requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) raf = requestAnimationFrame(frame); }); io.observe(cv);
  raf = requestAnimationFrame(frame);
  return {
    set progress(v) { prog = v; const k = Math.min(3, Math.floor(v * 4.4)); if (k !== layer) { if (k > layer) burst.t = 0; layer = k; } },
    destroy() { on = false; cancelAnimationFrame(raf); io.disconnect(); removeEventListener("resize", size); R.dispose(); },
  };
}
