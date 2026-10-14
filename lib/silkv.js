// Hero A · silk video as a real 3D surface (WebGL). The Jimeng silk loop is a video texture on a dense, gently curved plane;
// in the vertex shader each point is pushed toward the camera by its brightness, so the glowing folds stand out in relief
// and move as the video plays. A second, nearer layer carries only the hottest highlights (additive), and embers float in
// between, so scrolling and the mouse give true parallax. Scroll dollies the camera into the silk (eased, no pinning).
import * as THREE from "three";

const VS = `
uniform sampler2D map; uniform vec2 cover; uniform float relief, bend;
varying vec2 vUv;
vec2 cv(vec2 uv){ return (uv - 0.5) * cover + 0.5; }
void main(){
  vUv = cv(uv);
  // depth from a wide, soft average of brightness, so folds swell smoothly instead of following every hard edge
  float l = 0.0; const float RA = 0.045;
  for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) {
    vec2 o = vec2(float(i), float(j)) * RA * 0.5; float w = 1.0 - length(vec2(i, j)) / 3.2;
    l += dot(texture2D(map, vUv + o).rgb, vec3(.3,.55,.15)) * w; }
  l /= 13.9;
  vec3 p = position; p.z += l * relief - bend * p.x * p.x;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const FS_BASE = `
uniform sampler2D map; uniform float glow; varying vec2 vUv;
void main(){ vec3 c = texture2D(map, vUv).rgb; gl_FragColor = vec4(c * (1.0 + glow), 1.0); }`;
const FS_HOT = `
uniform sampler2D map; uniform float glow; varying vec2 vUv;
void main(){ vec3 c = texture2D(map, vUv).rgb; float l = dot(c, vec3(.3,.55,.15));
  float h = smoothstep(.45, .85, l); gl_FragColor = vec4(c * h * (0.9 + glow), 1.0); }`;

export function mountSilkV(root, video, poster) {
  const cv = root.querySelector("canvas.silk"), small = innerWidth < 760;
  let R; try { R = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: "high-performance" }); } catch (e) { return null; }
  if (!R.capabilities.maxVertexTextures) { R.dispose(); return null; }
  R.setPixelRatio(Math.min(devicePixelRatio, small ? 1.25 : 1.5)); R.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#050203");
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 60); cam.position.set(0, 0, 6);
  // texture: poster first, video once it is actually playing
  const pt = new THREE.TextureLoader().load(poster); pt.colorSpace = THREE.SRGBColorSpace;
  const vt = new THREE.VideoTexture(video); vt.colorSpace = THREE.SRGBColorSpace;
  const U = { map: { value: pt }, cover: { value: new THREE.Vector2(1, 1) }, relief: { value: 0.35 }, bend: { value: 0.012 }, glow: { value: 0 } };
  const useVideo = () => { U.map.value = vt; };
  if (video.readyState >= 2 && !video.paused) useVideo(); else video.addEventListener("playing", useVideo, { once: true });
  const seg = small ? [120, 90] : [220, 160];
  const geo = new THREE.PlaneGeometry(1, 1, seg[0], seg[1]);
  const base = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: FS_BASE }));
  const UH = { ...U, relief: { value: 0.6 } };
  const hot = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: UH, vertexShader: VS, fragmentShader: FS_HOT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  hot.position.z = 0.9; scene.add(base, hot);
  // embers drifting through the depth between the layers and the camera
  const NE = small ? 160 : 360, ep = new Float32Array(NE * 3), sp = new Float32Array(NE);
  for (let i = 0; i < NE; i++) { ep.set([(Math.random() - 0.5) * 12, (Math.random() - 0.5) * 7, Math.random() * 4.5], i * 3); sp[i] = 0.4 + Math.random(); }
  const eg = new THREE.BufferGeometry(); eg.setAttribute("position", new THREE.BufferAttribute(ep, 3));
  scene.add(new THREE.Points(eg, new THREE.PointsMaterial({ color: "#ffb070", size: 0.035, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })));

  function size() {
    const w = root.clientWidth, h = root.clientHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    // plane covers the view at z=0 with room to move, video cropped like object-fit: cover
    const vh = 2 * 6 * Math.tan((40 * Math.PI) / 360) * 1.45, vw = vh * cam.aspect;
    base.scale.set(vw, vh, 1); hot.scale.set(vw, vh, 1);
    const va = 1112 / 834, pa = vw / vh; U.cover.value.set(pa > va ? 1 : pa / va, pa > va ? va / pa : 1);
  }
  addEventListener("resize", size); size();

  let target = 0, prog = 0, px = 0, py = 0, sx = 0, sy = 0, on = true, raf = 0, last = performance.now();
  const pm = (e) => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; }; addEventListener("pointermove", pm);
  function frame(now) {
    raf = 0; if (!on || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    prog += (target - prog) * Math.min(1, dt * 4);          // eased follow: never jumps, never stalls
    sx += (px - sx) * Math.min(1, dt * 2.5); sy += (py - sy) * Math.min(1, dt * 2.5);
    cam.position.set(sx * 0.6 + prog * 0.8, -sy * 0.4 - prog * 0.5, 6 - prog * 2.6);
    cam.lookAt(sx * 0.3 + prog * 1.4, -prog * 0.4, -2);
    cam.rotation.z += prog * 0.06;
    U.relief.value = 0.35 + prog * 0.55; UH.relief.value = 0.6 + prog * 0.8; U.glow.value = prog * 0.25;
    const a = eg.attributes.position.array; for (let i = 0; i < NE; i++) { a[i * 3 + 1] += dt * 0.25 * sp[i]; if (a[i * 3 + 1] > 3.6) a[i * 3 + 1] = -3.6; } eg.attributes.position.needsUpdate = true;
    R.render(scene, cam); raf = requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }); io.observe(root);
  raf = requestAnimationFrame(frame);
  return {
    set progress(v) { target = v; },
    destroy() { on = false; cancelAnimationFrame(raf); io.disconnect(); removeEventListener("resize", size); removeEventListener("pointermove", pm); geo.dispose(); eg.dispose(); R.dispose(); },
  };
}
