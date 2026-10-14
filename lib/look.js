// Shared content + light interactions for the two homepage look & feel directions (look-a.html, look-b.html).
// Copy is Battle's own (Sue's deck). Motion is deliberately light: look & feel is being agreed before animation.
(function () {
  const R = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LK = {
    R,
    logos: ["Liverpool-logo-v2", "Good-Year-logo-v2", "BHP-Petrol-logo", "Maxis-Business-logo", "Grab-Express-logo-v2", "Tupperware-logo",
      "Colgate-logo-v2", "Arla-logo-v2", "Entropia-logo-v2", "Hovid-logo-v2", "Naturel-logo-v2", "Yaki-Soul-logo-v2"],
    // [figure, label, "up to" qualifier as in the deck]
    metrics: [["160+", "clients across 14+ industries", 0], ["500%", "client business growth in 3 years", 1], ["3×", "annual sales for our client", 1], ["67%", "decrease in cost per result", 1]],
    bridge: [["Ad budgets burning with zero leads?", "We focus strictly on CPL and revenue math."],
      ["AI write-ups all sound the same?", "We bring authentic human positioning."],
      ["Confusing performance reports?", "We bring results-driven clarity."]],
    layers: [["The high-velocity conversion foundation", "Most digital marketing fails long before an ad is clicked: it dies on slow, confusing websites. Layer 1 builds your digital headquarters on zero-bloat, mobile-first infrastructure engineered for fast local conversion.", "Web development · Landing pages · CRO"],
      ["The high-intent paid traffic engine", "Traffic without purchase intent is just a utility bill. Performance-targeted paid media engineered around aggressive ROAS targets and strict CAC thresholds.", "Meta · Google SEM · TikTok Shop · Shopee & Lazada"],
      ["The scroll-stopping creative factory", "In saturated feeds, creative strategy is your targeting strategy. UGC storytelling, localised influencer trust and AI production for high-volume, scroll-stopping ads.", "Video · Motion · KOL / UGC · AI-hybrid creative"],
      ["Organic authority & lifetime value", "Paid ads buy immediate revenue. Layer 4 builds long-term market dominance: organic search for your highest-margin lines, and automated nurturing for repeat purchases.", "SEO · Backlinks · WhatsApp / CRM nurturing"]],
    weapons: [["sword", "The Conversion Blade", "Performance marketing", "Paid ads, SEO, SEM & AI search, lead generation, tactical campaigns."],
      ["brush", "The Pixel Brush", "Creative & content", "Social media, video production, KOL & UGC, branding, AIGC."],
      ["shield", "The Code Shield", "Web development · Battle X", "Website & e-commerce, apps, hosting, AI chatbot, loyalty & retention."]],
    cases: [["case_yakisoul", "Yaki Soul", "From zero to No.1 izakaya in KL", "RM1.8M+", "single-outlet monthly, from RM300K"],
      ["case_bhpetrol", "BHPetrol", "Nationwide campaign for Malaysia's subsidy rollout", "7M+", "total organic reach"],
      ["case_easyeurope", "Easy Europe", "Travel revival: from pandemic to peak performance", "700+", "leads every week"]],
    reviews: [["Poi Ching", "General Manager, Write-Edge", "Poi-Ching", "Targeting the right audience helped us scale almost 4-fold in less than two years."],
      ["Elaine Tan", "Co-founder", "Elaine-Tan", "With the ads they manage on FB, my business had 30% growth in 3 months."],
      ["Marcus Teoh", "Bestselling Author & Speaker", "Marcus-Teoh", "My primary go-to Facebook/Instagram marketing solution whenever clients ask me for social help."],
      ["Cheanu Chew", "Network Marketing Coach", "Cheanu-Chew", "World-class professionalism: clients get the red-carpet treatment from first contact to execution."],
      ["Sheila", "Founder, SWET Image", "SWET-Image-International-Image-Branding", "Battle Mind truly lives up to their name: dynamic, creative, always going the extra mile."],
      ["Leonard Lai", "Founder", "Leonard-Lai", "Great, energetic, young but experienced. They pulled off great results on unusual products."]],
    // the three bosses (real photos), then the squad
    bosses: [["p21", "Ian"], ["p20", "Matthew"], ["p15", "Ben"]],
    squad: ["p16", "p11", "p02", "p19", "p12", "p18", "p05", "p06"],
    nm: (l) => l.replace(/-logo.*|-v2/g, "").replace(/-/g, " "),
  };
  // tabs: [data-tabs] container, buttons [data-t], panels [data-p]
  LK.tabs = (root, onChange) => {
    const bs = [...root.querySelectorAll("[data-t]")], ps = [...root.querySelectorAll("[data-p]")];
    const set = (k) => { bs.forEach((b) => b.setAttribute("aria-selected", b.dataset.t == k)); ps.forEach((p) => p.classList.toggle("on", p.dataset.p == k)); onChange && onChange(+k); };
    bs.forEach((b) => b.addEventListener("click", () => set(b.dataset.t))); set(bs[0].dataset.t);
  };
  LK.motion = () => {
    if (R || !window.gsap) return;
    gsap.registerPlugin(ScrollTrigger);
    // gentle float on every 3D object
    document.querySelectorAll("[data-float]").forEach((el, i) => gsap.to(el, { y: -14, rotation: i % 2 ? 2 : -2, duration: 3 + (i % 3) * 0.6, repeat: -1, yoyo: true, ease: "sine.inOut" }));
    // pointer parallax on [data-depth] inside [data-par]
    document.querySelectorAll("[data-par]").forEach((sc) => {
      const els = [...sc.querySelectorAll("[data-depth]")].map((el) => ({ d: +el.dataset.depth, x: gsap.quickTo(el, "x", { duration: 1 }), y: gsap.quickTo(el, "y", { duration: 1 }) }));
      sc.addEventListener("pointermove", (e) => { const r = sc.getBoundingClientRect(), kx = (e.clientX - r.left) / r.width - 0.5, ky = (e.clientY - r.top) / r.height - 0.5; els.forEach((m) => { m.x(kx * 40 * m.d); m.y(ky * 30 * m.d); }); });
      sc.addEventListener("pointerleave", () => els.forEach((m) => { m.x(0); m.y(0); }));
    });
    // simple reveals
    gsap.utils.toArray("[data-rise]").forEach((el) => gsap.from(el, { y: 36, opacity: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%" } }));
  };
  window.LK = LK;
})();
