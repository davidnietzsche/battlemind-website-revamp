// The v10 sticker glyphs (shared by the hero cube's tiles and the page's cards): flat shapes drawn on a 100 x 100 box
// in the tile's ink, cut-outs in its background. Paths only, no fonts to wait for. No three.js here, so the page can
// draw its cards even if the cube's engine never loads.
export const TAU = Math.PI * 2;
// roundRect is Baseline since 2023; older canvases get a plain arcTo version
if (typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect)
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) { const k = Math.max(0, Math.min(+r || 0, w / 2, h / 2));
    this.moveTo(x + k, y); this.arcTo(x + w, y, x + w, y + h, k); this.arcTo(x + w, y + h, x, y + h, k); this.arcTo(x, y + h, x, y, k); this.arcTo(x, y, x + w, y, k); this.closePath(); };
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); };
const seg = (g, a, b, c, d) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); };
const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
export const ICON = {
  heart(g) { g.beginPath(); g.moveTo(50, 84); g.bezierCurveTo(16, 62, 8, 40, 21, 26); g.bezierCurveTo(32, 14, 46, 18, 50, 32); g.bezierCurveTo(54, 18, 68, 14, 79, 26); g.bezierCurveTo(92, 40, 84, 62, 50, 84); g.fill(); },
  bubble(g, bg) { rr(g, 12, 16, 76, 54, 18); g.fill(); poly(g, [[28, 64], [22, 86], [48, 66]]); g.fill(); g.fillStyle = bg; [33, 50, 67].forEach((x) => { circ(g, x, 43, 6); g.fill(); }); },
  bell(g) { g.beginPath(); g.moveTo(50, 12); g.bezierCurveTo(30, 12, 25, 30, 25, 46); g.lineTo(25, 60); g.lineTo(14, 73); g.lineTo(86, 73); g.lineTo(75, 60); g.lineTo(75, 46); g.bezierCurveTo(75, 30, 70, 12, 50, 12); g.fill(); circ(g, 50, 82, 9); g.fill(); },
  play(g, bg) { rr(g, 10, 20, 80, 60, 20); g.fill(); g.fillStyle = bg; poly(g, [[41, 35], [65, 50], [41, 65]]); g.fill(); },
  share(g) { const P = [[71, 24], [27, 50], [71, 76]]; g.lineWidth = 9; g.beginPath(); g.moveTo(...P[0]); g.lineTo(...P[1]); g.lineTo(...P[2]); g.stroke(); P.forEach(([x, y]) => { circ(g, x, y, 13); g.fill(); }); },
  camera(g, bg, fg) { rr(g, 10, 28, 80, 56, 14); g.fill(); rr(g, 33, 16, 34, 18, 6); g.fill(); g.fillStyle = bg; circ(g, 50, 56, 17); g.fill(); g.fillStyle = fg; circ(g, 50, 56, 9); g.fill(); },
  hash(g) { g.lineWidth = 10; g.lineCap = "round"; seg(g, 41, 16, 33, 84); seg(g, 67, 16, 59, 84); seg(g, 19, 37, 83, 37); seg(g, 17, 63, 81, 63); },
  bars(g) { [[14, 58], [40, 38], [66, 16]].forEach(([x, y]) => { rr(g, x, y, 21, 86 - y, 7); g.fill(); }); },
  trend(g) { g.lineWidth = 10; g.lineCap = g.lineJoin = "round"; g.beginPath(); g.moveTo(12, 76); g.lineTo(37, 50); g.lineTo(54, 63); g.lineTo(78, 34); g.stroke(); poly(g, [[90, 20], [88, 50], [62, 26]]); g.fill(); },
  pie(g) { g.beginPath(); g.moveTo(46, 54); g.arc(46, 54, 36, -Math.PI / 2 + 1.7, Math.PI * 1.5); g.closePath(); g.fill(); g.beginPath(); g.moveTo(54, 46); g.arc(54, 46, 36, -Math.PI / 2, -Math.PI / 2 + 1.7); g.closePath(); g.fill(); },
  target(g, bg, fg) { circ(g, 50, 50, 38); g.fill(); g.fillStyle = bg; circ(g, 50, 50, 27); g.fill(); g.fillStyle = fg; circ(g, 50, 50, 16); g.fill(); g.fillStyle = bg; circ(g, 50, 50, 6); g.fill(); },
  search(g) { g.lineWidth = 11; g.lineCap = "round"; circ(g, 42, 42, 24); g.stroke(); g.lineWidth = 15; seg(g, 60, 60, 84, 84); },
  funnel(g) { poly(g, [[12, 16], [88, 16], [59, 52], [59, 80], [41, 90], [41, 52]]); g.lineJoin = "round"; g.lineWidth = 6; g.fill(); g.stroke(); },
  web(g, bg, fg) { rr(g, 10, 16, 80, 68, 12); g.fill(); g.fillStyle = bg; rr(g, 17, 33, 66, 44, 5); g.fill(); [22, 31, 40].forEach((x) => { circ(g, x, 25, 3.6); g.fill(); });
    g.fillStyle = fg; poly(g, [[44, 40], [44, 70], [51, 63], [57, 75], [62, 72], [56, 60], [66, 60]]); g.fill(); },
  cursor(g) { g.lineJoin = "round"; g.lineWidth = 5; poly(g, [[30, 12], [30, 80], [46, 65], [58, 89], [69, 84], [57, 60], [79, 60]]); g.fill(); g.stroke(); },
  bolt(g) { g.lineJoin = "round"; g.lineWidth = 4; poly(g, [[60, 8], [22, 56], [46, 56], [39, 92], [78, 42], [54, 42]]); g.fill(); g.stroke(); },
  mega(g) { g.lineJoin = "round"; g.lineWidth = 6; poly(g, [[16, 40], [60, 20], [60, 78], [16, 60]]); g.fill(); g.stroke(); rr(g, 22, 58, 14, 26, 5); g.fill();
    g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.arc(62, 49, 18, -0.6, 0.6); g.stroke(); g.beginPath(); g.arc(62, 49, 31, -0.55, 0.55); g.stroke(); },
  fire(g, bg) { g.beginPath(); g.moveTo(50, 90); g.bezierCurveTo(26, 90, 16, 72, 20, 56); g.bezierCurveTo(24, 42, 36, 36, 36, 20); g.bezierCurveTo(50, 28, 56, 40, 54, 50);
    g.bezierCurveTo(60, 44, 62, 36, 60, 28); g.bezierCurveTo(74, 38, 84, 54, 80, 68); g.bezierCurveTo(76, 82, 66, 90, 50, 90); g.fill();
    g.fillStyle = bg; g.beginPath(); g.moveTo(50, 84); g.bezierCurveTo(40, 84, 35, 76, 37, 69); g.bezierCurveTo(39, 62, 46, 59, 47, 52); g.bezierCurveTo(56, 58, 64, 66, 62, 74); g.bezierCurveTo(60, 81, 56, 84, 50, 84); g.fill(); },
  sparkle(g) { const st = (x, y, r) => { g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill(); };
    st(42, 56, 34); st(76, 22, 14); st(80, 74, 9); },
  star(g) { g.lineJoin = "round"; g.lineWidth = 7; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 17 : 39; g.lineTo(50 + Math.cos(a) * r, 54 + Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); },
  crown(g) { g.lineJoin = "round"; g.lineWidth = 6; poly(g, [[14, 70], [18, 28], [37, 48], [50, 20], [63, 48], [82, 28], [86, 70]]); g.fill(); g.stroke(); rr(g, 14, 76, 72, 11, 5); g.fill(); },
  sprout(g) { g.lineWidth = 9; g.lineCap = "round"; seg(g, 50, 88, 50, 48);
    g.beginPath(); g.moveTo(50, 58); g.bezierCurveTo(46, 36, 30, 26, 12, 28); g.bezierCurveTo(12, 48, 28, 60, 50, 58); g.fill();
    g.beginPath(); g.moveTo(50, 48); g.bezierCurveTo(54, 26, 70, 14, 88, 16); g.bezierCurveTo(88, 36, 72, 50, 50, 48); g.fill(); },
  percent(g) { g.lineWidth = 10; g.lineCap = "round"; seg(g, 76, 18, 24, 82); circ(g, 31, 31, 12); g.stroke(); circ(g, 69, 69, 12); g.stroke(); },
  mail(g, bg) { rr(g, 10, 22, 80, 56, 10); g.fill(); g.strokeStyle = bg; g.lineWidth = 7; g.lineJoin = "round"; g.beginPath(); g.moveTo(16, 30); g.lineTo(50, 55); g.lineTo(84, 30); g.stroke(); },
  cart(g) { g.lineWidth = 9; g.lineCap = g.lineJoin = "round"; g.beginPath(); g.moveTo(8, 18); g.lineTo(22, 18); g.lineTo(32, 62); g.lineTo(78, 62); g.lineTo(88, 30); g.lineTo(26, 30); g.stroke(); circ(g, 37, 80, 8); g.fill(); circ(g, 72, 80, 8); g.fill(); },
};

