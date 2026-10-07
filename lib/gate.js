// Access-code screen for the published copy (GitHub Pages). Runs only off localhost.
// A soft lock: it keeps casual visitors out, but the files themselves stay in a public repo.
// The code is checked as a SHA-256 hash (case and extra spaces ignored); once entered, it's remembered on that browser.
(function () {
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  const HASH = "738b03df6cf89c64d1ae931cd787b2329fadc226f57434c2369d01aab5e472c3", KEY = "bmc-gate";
  try { if (localStorage.getItem(KEY) === HASH) return; } catch (e) {}
  const de = document.documentElement; de.classList.add("gated");
  const st = document.createElement("style");
  st.textContent = `html.gated body{visibility:hidden;overflow:hidden}
  .gate{visibility:visible;position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at 50% 110%,#5A0006,#0D131A 60%);color:#fff;font-family:Inter,system-ui,sans-serif}
  .gate form{width:min(380px,100%);display:grid;gap:14px;text-align:center}
  .gate b{font:700 30px/1 Oswald,Impact,sans-serif;letter-spacing:.04em;text-transform:uppercase}
  .gate p{margin:0;color:rgba(255,255,255,.7);font-size:14px}
  .gate input{font:inherit;font-size:16px;padding:14px 16px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff;text-align:center;outline:none}
  .gate input:focus{border-color:#FF7A1A}
  .gate button{font:600 13px Oswald,Impact,sans-serif;letter-spacing:.18em;text-transform:uppercase;padding:14px;border:0;border-radius:999px;color:#fff;cursor:pointer;background:linear-gradient(115deg,#5A0006,#D7000F 38%,#FF4A12 68%,#FFB347)}
  .gate .err{color:#ff8a6a;min-height:18px;font-size:13px}`;
  de.appendChild(st);
  const sha = async (s) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
  function show() {
    const g = document.createElement("div"); g.className = "gate";
    g.innerHTML = `<form><b>Battle · website</b><p>Enter the access code to continue.</p><input type="password" autocomplete="current-password" aria-label="Access code" placeholder="Access code" autofocus><button type="submit">Enter</button><div class="err" role="alert"></div></form>`;
    document.body.appendChild(g);
    g.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault(); const v = g.querySelector("input").value.trim().replace(/\s+/g, " ").toLowerCase();
      if ((await sha(v)) === HASH) { try { localStorage.setItem(KEY, HASH); } catch (x) {} g.remove(); de.classList.remove("gated"); }
      else g.querySelector(".err").textContent = "That code doesn't match.";
    });
  }
  document.body ? show() : document.addEventListener("DOMContentLoaded", show);
})();
