// Hero v9.1 · what the cube carries (shared by the page and tool/stills91.html, so the stills are the hero's own cube).
// Face order = the engine's frames: front, right, top, back, left, bottom; keys row by row from the top left.
// Front: the face (drawn live by the engine). The rest is what the face gets lost among: social platforms (red glass),
// web & e-commerce (smoked), AI & search (wine), and business stats and trends on frost, the pale glass (top and
// bottom, so the solved cube shows three glasses: the red face, frost on top, smoke on the right). Platform marks
// are the white silhouettes of the official logos (assets/brand3p/cube, see ../SOURCES.txt); the stats are the site's
// own glyphs (lib/glyphs10.js), drawn white so the engine lights them like the marks.
import { ICON } from "./glyphs10.js";

export const MARKS = ["facebook", "instagram", "tiktok", "youtube", "whatsapp", "threads", "xiaohongshu", "shopify", "wordpress", "woocommerce",
  "magento", "shopee", "lazada", "webflow", "google", "gemini", "chatgpt", "copilot", "perplexity", "claude", "metaai", "deepseek"];
const STATS = ["bars", "trend", "pie", "percent", "target", "funnel", "star", "crown", "bolt", "search", "web", "play", "sprout", "cursor", "mega", "heart"];

// a glyph as a white silhouette on a transparent canvas (its cut-outs stay clear), tagged so the engine can cache its tints
export function glyphMark(name, S = 256) {
  const cv = document.createElement("canvas"); cv.width = cv.height = S; const g = cv.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, S, S); g.save(); g.scale(S / 100, S / 100); g.fillStyle = g.strokeStyle = "#fff";
  ICON[name](g, "#000", "#fff"); g.restore();
  const d = g.getImageData(0, 0, S, S), p = d.data;                  // luminance -> alpha, white ink
  for (let i = 0; i < p.length; i += 4) { const a = p[i]; p[i] = p[i + 1] = p[i + 2] = 255; p[i + 3] = a; }
  g.putImageData(d, 0, 0); cv.dataset.src = "glyph:" + name + ":" + S; return cv;
}
export function loadMarks(base = "assets/brand3p/cube/") {
  return Promise.all(MARKS.map((n) => new Promise((ok) => { const im = new Image(); im.onload = () => ok([n, im]); im.onerror = () => ok([n, null]); im.src = `${base}${n}.png`; })))
    .then((a) => Object.fromEntries(a));
}
export async function heroFaces(base) {
  const MK = await loadMarks(base), GL = Object.fromEntries(STATS.map((n) => [n, glyphMark(n)]));
  const M = (...ns) => ns.map((n) => MK[n] || GL[n] || null);
  return [
    { glass: "red", face: true },
    { glass: "smoke", keys: M("shopify", "wordpress", "woocommerce", "shopee", "webflow", "lazada", "magento", "woocommerce", "shopify") },
    { glass: "frost", keys: M("bars", "trend", "pie", "percent", "target", "funnel", "trend", "bars", "star") },
    { glass: "red", keys: M("instagram", "tiktok", "facebook", "youtube", "whatsapp", "threads", "xiaohongshu", "facebook", "instagram") },
    { glass: "wine", keys: M("google", "gemini", "chatgpt", "copilot", "perplexity", "claude", "metaai", "deepseek", "google") },
    { glass: "frost", keys: M("crown", "bolt", "trend", "search", "bars", "percent", "funnel", "pie", "target") }];
}
// v10, the services cube: the same face in front; every other side is one service's ground, so a drawn layer shows the
// platforms that service fights on: web & e-commerce (smoke, right), creative (frost, top), paid traffic (red, back),
// AI & search (wine, left); the stats stay on the bottom. SERVICE_FACE says which side each service card draws.
export const SERVICE_FACE = { web: 1, content: 2, ads: 3, organic: 4 };
export async function servicesFaces(base) {
  const MK = await loadMarks(base), GL = Object.fromEntries(STATS.map((n) => [n, glyphMark(n)]));
  const M = (...ns) => ns.map((n) => MK[n] || GL[n] || null);
  return [
    { glass: "red", face: true },
    { glass: "smoke", keys: M("shopify", "wordpress", "woocommerce", "shopee", "webflow", "lazada", "magento", "cursor", "web") },
    { glass: "frost", keys: M("play", "instagram", "tiktok", "heart", "youtube", "star", "xiaohongshu", "threads", "mega") },
    { glass: "red", keys: M("google", "facebook", "instagram", "tiktok", "youtube", "whatsapp", "shopee", "lazada", "target") },
    { glass: "wine", keys: M("google", "gemini", "chatgpt", "copilot", "perplexity", "claude", "metaai", "deepseek", "search") },
    { glass: "frost", keys: M("crown", "bolt", "trend", "search", "bars", "percent", "funnel", "pie", "target") }];
}
// one service piece: its main glyph on the front keys, two more on top and right (solo mode shows the corner cubie)
export const PIECES = {
  web: { glass: "red", f: "web", t: "cursor", r: "bolt" },
  ads: { glass: "smoke", f: "target", t: "trend", r: "mega" },
  content: { glass: "wine", f: "play", t: "heart", r: "star" },
  organic: { glass: "frost", f: "search", t: "crown", r: "sprout" },
  talk: { glass: "red", f: "heart", t: "bars", r: "trend" } };
export function pieceFaces(kind) {
  const p = PIECES[kind], K = (n) => Array(9).fill(glyphMark(n)), side = { glass: p.glass === "frost" ? "red" : "frost" };
  return [{ glass: p.glass, keys: K(p.f) }, { ...side, keys: K(p.r) }, { glass: p.glass === "smoke" ? "red" : "smoke", keys: K(p.t) },
    { glass: p.glass, keys: K(p.f) }, { ...side, keys: K(p.r) }, { glass: "smoke", keys: K(p.t) }];
}
