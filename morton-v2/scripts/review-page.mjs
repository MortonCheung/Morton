#!/usr/bin/env node
/**
 * Build a single static review page from the captured styleframe screenshots.
 *
 *   node scripts/review-page.mjs
 *
 * Reads docs/art-direction/styleframes/*.png and writes
 * docs/art-direction/REVIEW.html — a contact sheet the user can open without
 * the dev server. The page lists, per frame: desktop (1440×900), short desktop
 * (1440×700) and mobile (390×844) captures, side by side, with a status line.
 */
import { readdir, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'

const DIR = 'docs/art-direction/styleframes'
const OUT = 'docs/art-direction/REVIEW.html'
const FRAMES = [
  ['00-opening-cover', 'Opening cover', 'Centre progress line + multi-path line art, pre-reveal state'],
  ['01-hero-final', 'Final hero', 'The composed surface the opening reveals'],
  ['02-about-editorial', 'About / record', 'Editorial personal narrative, asymmetric image + text'],
  ['03-works-exhibition', 'Works exhibition', 'Curated overview with unequal exhibit scales'],
  ['04-project-focus', 'Project focus', 'Source-to-foreground focus, product-level detail'],
]
const VIEWS = [
  ['desktop', '1440 × 900'],
  ['desktop-short', '1440 × 700'],
  ['mobile', '390 × 844 @2x'],
]

let files = []
try {
  files = (await readdir(DIR)).filter((f) => f.endsWith('.png'))
} catch {
  console.error(`no screenshots yet in ${DIR}`)
  process.exit(1)
}

const missing = []
const sections = []
for (const [id, title, note] of FRAMES) {
  const cards = []
  for (const [view, label] of VIEWS) {
    const file = `${id}.${view}.png`
    if (!files.includes(file)) {
      missing.push(file)
      cards.push(`<figure class="missing"><div>missing</div><figcaption>${label}</figcaption></figure>`)
      continue
    }
    const s = await stat(path.join(DIR, file))
    const kb = Math.round(s.size / 1024)
    cards.push(
      `<figure><a href="./styleframes/${file}" target="_blank"><img src="./styleframes/${file}" alt="${title} ${label}" loading="lazy"></a>` +
        `<figcaption><span>${label}</span><span>${kb} KB</span></figcaption></figure>`,
    )
  }
  sections.push(`
    <section>
      <header>
        <span class="idx">${id.slice(0, 2)}</span>
        <h2>${title}</h2>
        <p>${note}</p>
        <a class="open" href="http://127.0.0.1:5290/#/${id}" target="_blank">open live →</a>
      </header>
      <div class="row">${cards.join('')}</div>
    </section>`)
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MORTON V2 · Phase 1 styleframes — PENDING_VISUAL_APPROVAL</title>
<style>
  :root { --canvas:#f2efe8; --ink:#1b1a18; --muted:#6c6962; --divider:#d0cdc5; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--canvas); color:var(--ink); font-family: 'Helvetica Neue', system-ui, sans-serif; }
  .wrap { padding: clamp(24px, 4vw, 72px); max-width: 1680px; margin: 0 auto; }
  h1 { font-family: Georgia, 'Times New Roman', serif; font-size: clamp(36px, 4.4vw, 64px); margin: 8px 0 12px; letter-spacing: -0.02em; }
  .status { display:inline-block; border:1px solid var(--ink); padding:4px 10px; font-size:11px; letter-spacing:.1em; text-transform:uppercase; }
  .lede { color: var(--muted); max-width: 62ch; line-height:1.65; }
  section { border-top:1px solid var(--divider); padding: 28px 0 40px; }
  section header { display:grid; grid-template-columns: 56px 1fr; gap: 8px 16px; align-items: baseline; margin-bottom: 20px; }
  section h2 { font-size: clamp(20px, 2vw, 28px); margin:0; font-weight: 500; }
  section p { grid-column: 2; margin:0; color:var(--muted); font-size:14px; }
  .idx { font-size: 12px; letter-spacing: .12em; color: var(--muted); }
  .open { grid-column: 2; font-size:12px; color:var(--ink); text-decoration:none; border-bottom:1px solid var(--ink); justify-self:start; }
  .row { display:grid; grid-template-columns: 2fr 2fr 1fr; gap: 16px; align-items:start; }
  figure { margin:0; }
  figure a { display:block; }
  figure img { width:100%; height:auto; display:block; border:1px solid var(--divider); background:#fff; }
  figcaption { display:flex; justify-content:space-between; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); padding-top:6px; }
  .missing div { border:1px dashed var(--divider); aspect-ratio:16/10; display:grid; place-items:center; color:var(--muted); font-size:12px; }
  footer { border-top:1px solid var(--divider); padding-top: 20px; color: var(--muted); font-size: 13px; line-height:1.7; }
  code { font-size: 12px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="status">PENDING_VISUAL_APPROVAL</div>
  <h1>MORTON V2 · Phase 1 art direction</h1>
  <p class="lede">Five styleframes from one art system. This page is a contact sheet of the actual browser captures; each frame also runs live on the dev server at <code>127.0.0.1:5290</code>. Click any image for full resolution.</p>
  ${sections.join('\n')}
  <footer>
    Captures: <code>node scripts/shot.mjs</code> → <code>${DIR}/</code>.
    ${missing.length ? `<br><strong style="color:#8a3b2e">Missing captures: ${missing.join(', ')}</strong>` : ''}
  </footer>
</div>
</body>
</html>`

await writeFile(OUT, html)
console.log(`wrote ${OUT} (${sections.length} frames, ${missing.length} missing captures)`)
if (missing.length) process.exitCode = 2
