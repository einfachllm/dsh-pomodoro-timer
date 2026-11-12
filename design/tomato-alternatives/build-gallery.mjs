// Builds the tomato-alternatives gallery from the SVG files in this folder.
// usage: node build-gallery.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const VARIANTS = [
  ['01-classic-gloss.svg', 'Classic Gloss', 'Polished sphere, specular highlights, five-leaf calyx. The safe, premium upgrade.'],
  ['02-timer-face.svg', 'Timer Face', 'The tomato becomes the dial: cream clock face, ticks and hands. Most on-message.'],
  ['03-neon-glass.svg', 'Neon Glass', 'Glowing gradient, glass sheen and aura. Made for the dark UI, still OK on light.'],
  ['04-sticker.svg', 'Sticker', 'Glossy tomato with a white die-cut rim and soft shadow. Reads on light and dark alike.'],
  ['05-geometric-flat.svg', 'Geometric Flat', 'Hard-edged flat shapes and a star calyx. Poster-like, punchy, very legible tiny.'],
  ['06-kawaii.svg', 'Kawaii', 'Blush and a smile. Fun in the dialog, but turns to mush below ~20 px.'],
];

const sizeRamp = [14, 20, 32, 56];

const cards = VARIANTS.map(([file, name, blurb], i) => {
  const idx = String(i + 1).padStart(2, '0');
  const ramp = sizeRamp
    .map((s) => `<figure class="step"><img src="${file}" width="${s}" height="${s}" alt="${name} at ${s}px"><figcaption>${s}</figcaption></figure>`)
    .join('');
  return `<article class="card">
  <header class="cardHead">
    <span class="idx">${idx}</span>
    <div><h2>${name}</h2><p>${blurb}</p></div>
  </header>
  <div class="showcase">
    <div class="hero"><img src="${file}" width="104" height="104" alt="${name} at 104px"></div>
    <div class="ramp">${ramp}</div>
  </div>
  <footer class="cardFoot"><code>design/tomato-alternatives/${file}</code></footer>
</article>`;
}).join('\n');

const pillsLight = VARIANTS.map(
  ([file, name]) => `<div class="pillRow"><img class="ico" src="${file}" width="14" height="14" alt=""><span class="phase">24:59</span><span class="sep">·</span><span class="sess">1h 12m</span><span class="pillName">${name}</span></div>`,
).join('');
const pillsDark = pillsLight;

const page = (theme) => `<!doctype html>
<html lang="en" data-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>🍅 Tomato alternatives — pomodoro pill</title>
<style>
  :root{
    --font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --radius: 14px;
  }
  html[data-theme="dark"]{
    --bg:#0d1015; --panel:#161b23; --panel2:#1c2230; --line:#28303d;
    --ink:#e9edf4; --muted:#8d97a8; --accent:#ff6b6b;
    --surface-light:#f6f7f9; --surface-dark:#171b22;
  }
  html[data-theme="light"]{
    --bg:#f2f3f5; --panel:#ffffff; --panel2:#f7f8fa; --line:#e4e7ec;
    --ink:#1c2129; --muted:#69707e; --accent:#e03131;
    --surface-light:#f6f7f9; --surface-dark:#171b22;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font);-webkit-font-smoothing:antialiased;padding:40px 32px 56px}
  .wrap{max-width:1180px;margin:0 auto}
  h1{font-size:26px;font-weight:650;letter-spacing:-.02em;margin:0 0 6px}
  .sub{color:var(--muted);font-size:14px;line-height:21px;margin:0 0 26px;max-width:70ch}
  .toolbar{display:flex;align-items:center;gap:10px;margin:0 0 26px;flex-wrap:wrap}
  .themeBtn{font:inherit;font-size:12.5px;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:7px 14px;cursor:pointer}
  .themeBtn:hover{background:var(--panel2)}
  .hint{font-size:12px;color:var(--muted)}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(500px,1fr));gap:18px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:18px 20px 14px;display:flex;flex-direction:column;gap:14px}
  .cardHead{display:flex;gap:12px;align-items:flex-start}
  .idx{font-size:11px;font-weight:600;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:2px 6px;margin-top:2px;font-variant-numeric:tabular-nums}
  .cardHead h2{font-size:15px;font-weight:620;margin:0 0 3px;letter-spacing:-.01em}
  .cardHead p{margin:0;font-size:12.5px;line-height:18px;color:var(--muted)}
  .showcase{display:flex;align-items:center;justify-content:space-between;gap:18px;background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:14px 18px}
  .hero{flex:none;display:grid;place-items:center;width:120px;height:120px}
  .hero img{display:block;filter:drop-shadow(0 4px 10px rgba(0,0,0,.18))}
  .ramp{display:flex;align-items:flex-end;gap:18px}
  .step{margin:0;display:flex;flex-direction:column;align-items:center;gap:7px}
  .step img{display:block}
  .step figcaption{font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums}
  .cardFoot code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;color:var(--muted);word-break:break-all}
  section.real{margin-top:34px}
  section.real h2{font-size:16px;font-weight:620;margin:0 0 4px}
  section.real .sub{margin-bottom:14px}
  .surfaces{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .surface{border-radius:10px;border:1px solid var(--line);padding:14px 16px;display:flex;flex-direction:column;gap:10px}
  .surface.light{background:var(--surface-light);color:#4c525c}
  .surface.dark{background:var(--surface-dark);color:#9aa3b2}
  .surfaceLabel{font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.55}
  .pillRow{display:flex;align-items:center;gap:6px;font-size:13px;line-height:20px;font-variant-numeric:tabular-nums;padding:1px 8px;border-radius:6px}
  .pillRow:hover{background:rgba(128,128,128,.12)}
  .pillRow .ico{flex:none;width:14px;height:14px}
  .pillRow .phase{opacity:.92}
  .pillRow .sep{opacity:.45;margin:0 2px}
  .pillRow .sess{opacity:.62}
  .pillRow .pillName{margin-left:14px;font-size:10.5px;letter-spacing:.02em;opacity:.4}
  .note{margin-top:26px;font-size:12px;line-height:18px;color:var(--muted);border-top:1px solid var(--line);padding-top:16px}
  @media (max-width:760px){ .grid{grid-template-columns:1fr} .surfaces{grid-template-columns:1fr} }
</style>
</head>
<body>
<div class="wrap">
  <h1>🍅 Tomato alternatives for the pomodoro pill</h1>
  <p class="sub">Six directions for the 14&nbsp;px composer icon. Same 64×64 canvas as the shipped <code>icon.svg</code>. Arrow keys or the buttons switch the gallery theme — the real-size section below always shows both surfaces.</p>
  <div class="toolbar">
    <button class="themeBtn" id="themeBtn">Toggle light / dark</button>
    <span class="hint">sizes rendered: ${sizeRamp.join(' · ')} px</span>
  </div>
  <div class="grid">
${cards}
  </div>

  <section class="real">
    <h2>At real size — inside the composer pill</h2>
    <p class="sub">Icon is 14&nbsp;px, label 13/20. This is how each one reads next to the session time.</p>
    <div class="surfaces">
      <div class="surface light"><span class="surfaceLabel">light UI</span>${pillsLight}</div>
      <div class="surface dark"><span class="surfaceLabel">dark UI</span>${pillsDark}</div>
    </div>
  </section>

  <p class="note">Files live in <code>pomodoro-timer/design/tomato-alternatives/</code>. Say which one you want and I'll swap it into <code>client.js</code> (the inline <code>TomatoIcon</code> component), <code>icon.svg</code>, and the base64 icon in <code>index.json</code>.</p>
</div>
<script>
  const root = document.documentElement;
  const flip = () => { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; };
  document.getElementById('themeBtn').addEventListener('click', flip);
  addEventListener('keydown', (e) => { if (e.key === 't') flip(); });
</script>
</body>
</html>`;

writeFileSync(join(here, 'gallery.html'), page('dark'));
writeFileSync(join(here, 'gallery-light.html'), page('light'));

const files = readdirSync(here).filter((f) => f.endsWith('.svg')).sort();
console.log('gallery.html + gallery-light.html written; svgs:', files.join(', '));
