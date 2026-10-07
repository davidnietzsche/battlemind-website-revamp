// Battle fire elements: shared kit. Classic script; exposes window.FX.
//   FX.ramp(t)            -> CSS colour on the heat ramp (black -> deep red -> brand red -> ember -> yellow -> white-hot)
//   FX.flame(canvas, o)   -> a WebGL flame band (fbm, temperature ramp); returns { set(k,v), stop() }
//   FX.embers(canvas, o)  -> a 2D ember/spark system; returns { burst(x,y,n,power), trail(x,y), stop() }
//   FX.loop(fn)           -> one rAF loop that pauses while the tab is hidden; fn(dt, t) returns false to idle at 24fps
//   FX.split(el, type)    -> GSAP SplitText (chars/words/lines) with words kept whole
//   FX.reduce             -> prefers-reduced-motion
// Every element page also calls FX.frame({ n, name, kind }) to draw its tag and wire Replay to window.EL.play().
(function () {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (window.self !== window.top) document.documentElement.classList.add("framed");
  const STOPS = [[0, [0, 0, 0]], [0.22, [82, 0, 5]], [0.42, [215, 0, 15]], [0.66, [255, 92, 31]], [0.86, [255, 189, 82]], [1, [255, 247, 224]]];
  function rampRGB(t) {
    t = Math.max(0, Math.min(1, t));
    for (let i = 1; i < STOPS.length; i++) if (t <= STOPS[i][0]) {
      const [k0, a] = STOPS[i - 1], [k1, b] = STOPS[i], f = (t - k0) / (k1 - k0);
      return a.map((v, j) => Math.round(v + (b[j] - v) * f));
    }
    return STOPS[STOPS.length - 1][1];
  }
  const ramp = (t, a = 1) => { const [r, g, b] = rampRGB(t); return a === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`; };

  function loop(fn) {
    let last = performance.now(), lastDraw = 0, run = true, busy = true;
    (function f(now) {
      if (!run) return; requestAnimationFrame(f);
      if (document.hidden) { last = now; return; }
      if (!busy && now - lastDraw < 1000 / 24) return;
      const dt = Math.min(0.08, (now - last) / 1000); last = now; lastDraw = now;
      busy = fn(dt, now / 1000) !== false;
    })(last);
    return { stop() { run = false; }, wake() { busy = true; } };
  }

  // ---------- flame band (WebGL) ----------
  const FS = `precision mediump float;uniform vec2 res;uniform float time,inten,band,cx,spread;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
  vec3 ramp(float t){vec3 c=mix(vec3(0.),vec3(.32,0.,.02),smoothstep(0.,.22,t));c=mix(c,vec3(.843,0.,.059),smoothstep(.18,.42,t));
    c=mix(c,vec3(1.,.36,.12),smoothstep(.4,.66,t));c=mix(c,vec3(1.,.74,.32),smoothstep(.62,.86,t));return mix(c,vec3(1.,.97,.88),smoothstep(.84,1.,t));}
  void main(){vec2 uv=gl_FragCoord.xy/res;float asp=res.x/res.y;if(uv.y>band*1.3){gl_FragColor=vec4(0.);return;}
    vec2 q=vec2(uv.x*asp*2.6,uv.y*2.2-time*1.25);float w=fbm(q*1.4+vec2(0.,-time*.6));float f=fbm(q+vec2(w*1.6,0.));
    float tongue=fbm(vec2(uv.x*asp*3.2,time*.45));float top=band*(.55+.9*tongue);
    float focus=spread>0.?exp(-pow((uv.x-cx)/spread,2.)):1.;
    float t=(1.-uv.y/(top*mix(.25,1.,focus)))*1.15+(f-.5)*1.25;t=clamp(t*(.72+inten*.42),0.,1.)*(spread>0.?smoothstep(.03,.45,focus):1.);
    float a=smoothstep(.13,.36,t);gl_FragColor=vec4(ramp(t)*a,a);}`;
  function flame(cv, o = {}) {
    const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return { set() {}, stop() {} };
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}")); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p); gl.useProgram(p);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const l = gl.getAttribLocation(p, "p"); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(p, n), u = { res: U("res"), time: U("time"), inten: U("inten"), band: U("band"), cx: U("cx"), spread: U("spread") };
    const st = Object.assign({ inten: 0.5, band: 0.3, cx: 0.5, spread: 0, scale: 0.5 }, o);
    const size = () => { const r = cv.getBoundingClientRect(); cv.width = Math.max(2, Math.round(r.width * st.scale)); cv.height = Math.max(2, Math.round(r.height * st.scale)); };
    addEventListener("resize", size); size();
    const lp = loop((dt, t) => {
      gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(u.res, cv.width, cv.height); gl.uniform1f(u.time, t); gl.uniform1f(u.inten, st.inten); gl.uniform1f(u.band, st.band);
      gl.uniform1f(u.cx, st.cx); gl.uniform1f(u.spread, st.spread); gl.drawArrays(gl.TRIANGLES, 0, 3);
      return !!st.busy;
    });
    return { st, set(k, v) { st[k] = v; lp.wake(); }, stop: lp.stop, size };
  }

  // ---------- embers / sparks (2D canvas, additive) ----------
  function embers(cv, o = {}) {
    const g = cv.getContext("2d"), N = o.max || 500, P = [];
    const size = () => { const r = cv.getBoundingClientRect(); cv.width = Math.round(r.width); cv.height = Math.round(r.height); };
    addEventListener("resize", size); size();
    const add = (x, y, vx, vy, life, s) => { if (P.length >= N) P.shift(); P.push({ x, y, vx, vy, life, max: life, s }); };
    const api = {
      burst(x, y, n = 40, pw = 1) { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4 * pw, v = (80 + Math.random() * 320) * pw; add(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.6 + Math.random() * 0.9, 1 + Math.random() * 2.2); } lp.wake(); },
      trail(x, y, k = 1) { for (let i = 0; i < k; i++) add(x + (Math.random() - 0.5) * 6, y, (Math.random() - 0.5) * 40, -30 - Math.random() * 90, 0.5 + Math.random() * 0.8, 0.8 + Math.random() * 1.8); lp.wake(); },
      rise(x, y, k = 1, w = 0) { for (let i = 0; i < k; i++) add(x + (Math.random() - 0.5) * w, y, (Math.random() - 0.5) * 20, -40 - Math.random() * 120, 1 + Math.random() * 2, 0.8 + Math.random() * 2); lp.wake(); },
      count: () => P.length, onFrame: null, stop() { lp.stop(); },
    };
    const lp = loop((dt, t) => {
      if (api.onFrame) api.onFrame(dt, t);
      g.clearRect(0, 0, cv.width, cv.height); g.globalCompositeOperation = "lighter";
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i]; p.life -= dt; if (p.life <= 0) { P.splice(i, 1); continue; }
        p.vy += (o.gravity ?? 60) * dt; p.vx += Math.sin(t * 2 + i) * 10 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        const k = p.life / p.max, r = p.s * (0.6 + k);
        g.fillStyle = ramp(0.35 + k * 0.6, Math.min(1, k * 1.4)); g.beginPath(); g.arc(p.x, p.y, r, 0, 6.283); g.fill();
        g.fillStyle = ramp(0.5 + k * 0.4, k * 0.18); g.beginPath(); g.arc(p.x, p.y, r * 4, 0, 6.283); g.fill();
      }
      g.globalCompositeOperation = "source-over";
      return P.length > 0 || !!api.onFrame;
    });
    return api;
  }

  function split(el, type = "chars") { return new SplitText(el, { type: type === "chars" ? "words,chars" : type, wordsClass: "w", charsClass: "c", linesClass: "ln" }); }

  function frame({ n, name, kind }) {
    const t = document.createElement("header"); t.className = "tag"; t.innerHTML = `<b>${n}</b><span>${name}</span><i>${kind}</i>`; document.body.prepend(t);
    const r = document.createElement("button"); r.className = "replay"; r.type = "button"; r.textContent = "Replay ↻"; r.onclick = () => window.EL && window.EL.play(); document.body.append(r);
    addEventListener("message", (e) => { if (e.data === "replay" && window.EL) window.EL.play(); });
  }
  window.FX = { reduce, ramp, rampRGB, loop, flame, embers, split, frame };
})();
