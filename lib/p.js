// Battle website proposal: shared chrome. Renders the top bar (every page of the proposal), the prev/next footer, and
// common GSAP reveals: [data-split] headings split into lines that rise, [data-rise] blocks that fade up on scroll.
(function () {
  const PAGES = [
    ["index.html", "00", "Overview"], ["styles.html", "01", "Look & feel"], ["home.html", "02", "Homepage"], ["about.html", "03", "About"],
    ["services.html", "04", "Services"], ["service.html", "05", "Service page"], ["case-study.html", "06", "Case study"], ["team.html", "07", "Team"],
    ["icons.html", "08", "Icons & weapons"], ["next.html", "09", "Next steps"],
  ];
  const here = location.pathname.split("/").pop() || "index.html";
  const bar = document.createElement("header"); bar.className = "pbar";
  bar.innerHTML = `<div class="in"><a class="logo" href="index.html"><img src="assets/brand/battle-white.webp" alt="Battle"><span>Website proposal</span></a>
    <nav aria-label="Proposal pages">${PAGES.map(([f, n, t]) => `<a href="${f}"${f === here ? ' class="on" aria-current="page"' : ""}><i>${n}</i>${t}</a>`).join("")}</nav></div>`;
  document.body.prepend(bar);
  const i = PAGES.findIndex((p) => p[0] === here);
  if (i >= 0 && !document.body.hasAttribute("data-nonext")) {
    const prev = PAGES[i - 1], next = PAGES[i + 1], f = document.createElement("footer"); f.className = "pnext";
    f.innerHTML = (prev ? `<a href="${prev[0]}"><span>← ${prev[1]}</span><b>${prev[2]}</b></a>` : "<span></span>") + (next ? `<a href="${next[0]}"><span>${next[1]} →</span><b>${next[2]}</b></a>` : "<span></span>");
    document.body.append(f);
  }
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.P = { reduce };
  if (reduce || !window.gsap) return;
  gsap.registerPlugin(ScrollTrigger);
  document.fonts.ready.then(() => {
    document.querySelectorAll("[data-split]").forEach((h) => { const s = new SplitText(h, { type: "lines,words", linesClass: "ln" });
      gsap.set(s.lines, { overflow: "hidden" }); gsap.from(s.words, { yPercent: 110, duration: 0.9, stagger: 0.04, ease: "power4.out", scrollTrigger: { trigger: h, start: "top 88%" } }); });
    gsap.utils.toArray("[data-rise]").forEach((el) => gsap.from(el, { y: 40, opacity: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%" } }));
    ScrollTrigger.refresh();
  });
})();
