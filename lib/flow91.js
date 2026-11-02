// Hero v9.1 · the moving gradient behind the cube (Sue, 29 Oct: Ian's photo out, "a simpler moving gradient", like Ian's
// third reference). Ink with slow red light pooling around the cube and a few soft silk bands drifting along the flow;
// dark on the left so the copy stays crisp. Plain WebGL on its own canvas (no three.js), drawn at half resolution with a
// little grain, written straight out in sRGB so the brand red stays the brand red. Pauses while off screen; a single
// frame when motion is reduced. mountFlow(canvas, { still }) -> { focus(x, y, r), destroy() } (focus in canvas fractions).
const VS = "attribute vec2 a; varying vec2 vUv; void main(){ vUv = a * .5 + .5; gl_Position = vec4(a, 0., 1.); }";
const FS = `precision highp float; varying vec2 vUv; uniform float uT; uniform vec2 uRes, uC; uniform float uR;
const vec3 cInk = vec3(.039, .039, .043), cDeep = vec3(.30, .0, .02), cRed = vec3(.843, .0, .059), cHot = vec3(1., .17, .19);
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h(i), h(i + vec2(1., 0.)), f.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), f.x), f.y); }
float n2(vec2 p){ return .64 * n(p) + .36 * n(p * 2.1 + 7.3); }
void main(){
  float asp = uRes.x / uRes.y; vec2 p = vec2(vUv.x * asp, vUv.y); float t = uT * .00005;
  vec2 q = vec2(n2(p * .8 + vec2(t, -.7 * t)), n2(p * .8 + vec2(4.1 - .6 * t, 1.7 + t)));
  float f = n2(p * .95 + 1.5 * q + vec2(.4 * t, 0.));
  float band = .5 + .5 * sin((f * 4.2 + p.x * .9 - p.y * .7) * 3.14159 + t * 9.);
  float silk = pow(band, 4.);
  vec2 c = vec2(uC.x * asp, uC.y); float d = length((p - c) * vec2(.75, 1.));
  float pool = smoothstep(uR * 3.4, 0., d), side = smoothstep(.04, .62, vUv.x);
  float glow = (.55 * f + .45 * silk) * (.2 + .8 * pool) * (.1 + .9 * side);
  vec3 col = mix(cInk, cDeep, smoothstep(.05, .5, glow));
  col = mix(col, cRed, smoothstep(.4, .92, glow) * .8);
  col += cHot * pow(silk * pool * side, 3.) * .1;
  col += (h(gl_FragCoord.xy + fract(uT * .001) * 91.) - .5) * .03;
  gl_FragColor = vec4(col, 1.); }`;

export function mountFlow(canvas, { still = false, scale = 0.5 } = {}) {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, premultipliedAlpha: false, powerPreference: "low-power" });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(pr, n), uT = U("uT"), uRes = U("uRes"), uC = U("uC"), uR = U("uR");
  let W = 1, H = 1, fc = [0.7, 0.5, 0.3], on = true, raf = 0; const t0 = performance.now() - 40000;   // start mid-flow, never on a blank frame
  const draw = (now) => { gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform1f(uT, now - t0); gl.uniform2f(uRes, W, H);
    gl.uniform2f(uC, fc[0], fc[1]); gl.uniform1f(uR, fc[2]); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
  const size = () => { W = canvas.clientWidth || 1; H = canvas.clientHeight || 1; const k = Math.min(devicePixelRatio || 1, 2) * scale;
    canvas.width = Math.max(2, Math.round(W * k)); canvas.height = Math.max(2, Math.round(H * k)); draw(performance.now()); };
  const tick = (now) => { raf = 0; if (!on || document.hidden || still) return; draw(now); raf = requestAnimationFrame(tick); };
  const wake = () => { if (on && !still && !document.hidden && !raf) raf = requestAnimationFrame(tick); };
  const ro = new ResizeObserver(size); ro.observe(canvas); size();
  // entries can arrive batched: the last one is the current state
  const io = new IntersectionObserver((es) => { on = es[es.length - 1].isIntersecting; wake(); }); io.observe(canvas);
  document.addEventListener("visibilitychange", wake); wake();
  return {
    focus(x, y, r) { fc = [x, 1 - y, r]; if (still) draw(performance.now()); },
    destroy() { on = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", wake); },
  };
}
