// Team parallax: the real team cut-outs from Battle's deck, arranged in depth rows like a movie poster, with a fireball
// held between the centre person's hands. On narrow screens the line-up sits on a wider track centred on that person. People are never edited or generated: they are the deck's own cut-outs,
// only positioned and moved. Mouse and scroll move the rows at different speeds; GSAP reveals them from the centre out,
// then the fireball ignites. Usage: <div class="tstage" data-team></div> + TEAM.mount(el)
(function () {
  // [cut-out id, centre x %, height % of stage, depth 0-1, width/height]. Front row = the three bosses: Matthew (p20) centre,
  // Ian (p21, cut from the 2025 team portrait) left, Ben (p15) right. Everyone else stands behind them.
  const L = [[20, 50, 90, 1, .4275], [21, 37, 72, .92, .5257], [15, 63, 84, .92, .3647],
    [16, 78, 70, .7, .555], [11, 23, 74, .7, .414], [2, 12.5, 72, .55, .517], [19, 87.5, 72, .55, .431],
    [12, 4.5, 66, .45, .421], [18, 95.5, 66, .45, .449], [5, 30, 60, .35, .403], [6, 70, 60, .35, .383],
    [9, 17.5, 57, .28, .428], [8, 82.5, 57, .28, .398], [3, 43, 56, .25, .383], [4, 57, 56, .25, .406]];
  const css = `.tstage{position:relative;overflow:hidden;border-radius:22px;width:100%;height:clamp(360px,45vw,560px);background:#2a0d0e}
  .tstage .trk{position:absolute;top:0;bottom:0;left:50%;translate:-50% 0;aspect-ratio:16/7.2;min-width:100%}
  .tstage .tbg{position:absolute;inset:-8%;width:116%;height:116%;max-width:none;object-fit:cover}
  .tstage .tp{position:absolute;bottom:-2%;translate:-50% 0;will-change:transform}
  .tstage .tp img{height:100%;width:100%;display:block;max-width:none}
  .tstage .fb{position:absolute;left:52%;top:58.5%;width:36%;aspect-ratio:1;translate:-50% -50%;pointer-events:none}
  .tstage .fb img{width:100%;height:100%;mix-blend-mode:screen;filter:saturate(1.15)}
  .tstage .fb::before{content:"";position:absolute;inset:-60%;border-radius:50%;background:radial-gradient(circle,rgba(255,170,80,.55),rgba(255,74,18,.25) 35%,transparent 65%)}
  .tstage canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:40}
  .tstage .vign{position:absolute;inset:0;background:linear-gradient(0deg,rgba(13,19,26,.55),transparent 35%);z-index:39;pointer-events:none}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  function mount(stage) {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    stage.innerHTML = `<img class="tbg" src="assets/team/bg.webp" alt=""><div class="trk">` + L.map(([id, x, h, d, ar]) => `<div class="tp" data-d="${d}" style="left:${x}%;height:${h}%;aspect-ratio:${ar};z-index:${id === 20 ? 31 : Math.round(d * 30)}"><img src="assets/team/p${String(id).padStart(2, "0")}.webp" alt="">${id === 20 ? '<div class="fb"><img src="assets/img/fireball_g.webp" alt=""></div>' : ""}</div>`).join("") + `</div><div class="vign"></div><canvas></canvas>`;
    stage.setAttribute("role", "img"); stage.setAttribute("aria-label", "The Battle team, led by Matthew, Ian and Ben, with a fireball in Matthew's hands");
    const people = [...stage.querySelectorAll(".tp")], fb = stage.querySelector(".fb"), bg = stage.querySelector(".tbg");
    if (reduce || !window.gsap) return;
    const sp = FX.embers(stage.querySelector("canvas"), { gravity: -30 });
    // reveal from the centre outward, then ignite
    const order = people.slice().sort((a, b) => Math.abs(parseFloat(a.style.left) - 50) - Math.abs(parseFloat(b.style.left) - 50));
    gsap.set(people, { yPercent: 18, opacity: 0 }); gsap.set(fb, { scale: 0, opacity: 0 });
    const tl = gsap.timeline({ paused: true });
    tl.to(order, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.07, ease: "power3.out" })
      .to(fb, { scale: 1, opacity: 1, duration: 0.7, ease: "back.out(2.5)" }, "-=0.3")
      .call(() => { const r = fb.getBoundingClientRect(), s = stage.getBoundingClientRect(); sp.burst(r.left - s.left + r.width / 2, r.top - s.top + r.height / 2, 90, 1.2); });
    ScrollTrigger.create({ trigger: stage, start: "top 75%", once: true, onEnter: () => tl.play() });
    gsap.to(fb, { rotate: 360, duration: 9, repeat: -1, ease: "none" });
    gsap.to(fb.querySelector("img"), { scale: 1.08, duration: 0.35, repeat: -1, yoyo: true, ease: "sine.inOut" });
    setInterval(() => { if (tl.progress() < 1) return; const r = fb.getBoundingClientRect(), s = stage.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; const side = Math.random() < 0.5 ? -0.35 : 1.35; sp.rise(r.left - s.left + r.width * side, r.top - s.top + r.height * 0.5, 1, r.width * 0.2); }, 90);
    // embers rise off the ball's left and right edges, so they never cross Matthew's face
    // mouse parallax (rows move by depth) + scroll parallax
    const movers = people.map((p) => ({ x: gsap.quickTo(p, "x", { duration: 0.8, ease: "power3" }), d: +p.dataset.d }));
    const bx = gsap.quickTo(bg, "x", { duration: 1.2, ease: "power3" }), by = gsap.quickTo(bg, "y", { duration: 1.2, ease: "power3" });
    stage.addEventListener("pointermove", (e) => { const r = stage.getBoundingClientRect(), k = (e.clientX - r.left) / r.width - 0.5, ky = (e.clientY - r.top) / r.height - 0.5;
      movers.forEach((m) => m.x(-k * 60 * (m.d - 0.2))); bx(k * 30); by(ky * 20); });
    stage.addEventListener("pointerleave", () => { movers.forEach((m) => m.x(0)); bx(0); by(0); });
    people.forEach((p) => gsap.to(p, { y: () => -40 * (+p.dataset.d - 0.2), ease: "none", scrollTrigger: { trigger: stage, start: "top bottom", end: "bottom top", scrub: true } }));
  }
  window.TEAM = { mount };
})();
