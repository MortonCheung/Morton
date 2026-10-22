# MORTON — A1 · Luxury product opening

The first chapter of the MORTON personal site: the six letters are **drawn**
as fine construction lines, then the completed line art becomes **one cast
satin-metal object** in a dark studio. Runs in a real browser, can be recorded
from the first frame, and can be replayed.

- **Dev:** http://127.0.0.1:5181/ (fixed port, strict)
- **Preview:** http://127.0.0.1:5281/
- Stack: React 19 + Vite 8 + TypeScript 5.9 + three.js 0.186 + GSAP 3.15

## Quick start

```bash
npm install          # PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
npm run dev          # http://127.0.0.1:5181/
npm run build        # tsc -b && vite build
npm run preview      # production build on :5281
```

## Verification

```bash
# real browser: 5 screenshots + full opening video (webm+mp4) + console/heap
npm run capture -- --url http://127.0.0.1:5181/ --name A1-opening

# acceptance paths: replay ×3, delayed assets, reduced motion, shared-O
# geometry, independent letter transforms, heap delta
npm run verify
```

Outputs: `docs/SCREENSHOTS/*.png`, `docs/RECORDING/A1-opening.{webm,mp4}`,
`docs/TEST_REPORT_RAW.json`, `docs/VERIFY_REPORT.json`.

## What is on screen

| State | What happens |
|---|---|
| `loading` | stage and micro UI only |
| `drawing` | M→O→R→T→O→N drawn contour by contour (≥1000 ms, planned 1230 ms) |
| `built` | full line art held until the real font/geometry/GPU work resolves |
| `expanding` | ≈560 ms: line art dissolves, letters grow forward, studio comes up, lens pushes in |
| `hero` | satin-metal wordmark, slow 10° orbit, idle breathing, replay |
| `reduced` | terminal hero state immediately after assets, no animation |

Replay: the `REPLAY` control (`[data-replay]`) or the `R` key. The full drawing
always plays again (1220–1226 ms measured on 3 consecutive replays).

## Project structure

```
public/fonts/          Marcellus TTF + NOTICE (SIL OFL 1.1)
scripts/               capture.mjs (harness), verify.mjs (acceptance),
                       generate-outline.ts (offline line art)
src/app/               entry + probe installation
src/components/        stage composition, SVG outline, micro UI
src/hooks/useOpening.ts orchestration: asset gate, states, replay, cleanup
src/scenes/            WebGL owner, studio, framing, material, textures
src/animation/         GSAP draw + reveal timelines
src/letters/           TTF → contours → per-glyph ExtrudeGeometry
src/data/              word/tracking, generated outline, art direction, copy
src/lib/               probe contract, real asset loading, QA flags
src/styles/            stage layers, HUD, responsive, reduced motion
docs/                  isolation, plan, decisions, test report, known issues
```

## Design notes

- Font: **Marcellus** — Roman inscriptional capitals; measured metrics and why
  it beats Didone hairlines at this size are in `docs/DESIGN_DECISIONS.md`.
- The same contours drive both the SVG construction lines and the extruded
  letters (`npm run gen:outline` regenerates the line art). They cannot drift.
- Framing is derived from the ink width, so 1920/1440/1366/1024/390 all keep
  the wordmark at 62–86 % of the viewport width with the optical centre at
  47.5 % of the frame height.
- Two O meshes share one geometry instance; transforms, visibility and z are
  independent (probe: `extra.geometry.sharedOGeometry`).
- One material, one environment map, one shadow-casting light. No post-processing.

## Debug / QA URL flags

| Flag | Effect |
|---|---|
| `?assetDelay=2200` | delays the real font response (test the `built` wait) |
| `?motion=reduced` | forces the reduced-motion path |
| `?freeze=built` | stops after the drawing, full line art |
| `?freeze=mid` | pauses the reveal at 55 % |
| `?freeze=handoff` | pauses at 12 % — line/solid alignment proof |
| `?debug=1` | exposes `window.__MORTON_DEBUG__` (nudge a letter, read stats) |

These never change the default opening; they exist so
`scripts/verify.mjs` can exercise the acceptance paths.

## Probe contract

`window.__MORTON__` is installed at boot:

```ts
{
  state: 'loading' | 'drawing' | 'built' | 'expanding' | 'hero' | 'reduced',
  timings: { drawingAt, builtAt, expandingAt, heroAt, drawMs, expandMs, ... },
  letters: [{ id, position, rotation, visible }],   // 6 entries
  extra: { runs, geometry, renderer, quality, qa, word }
}
```

## Font licence

`public/fonts/marcellus.ttf` — Marcellus Regular, Copyright (c) 2012 Brian J.
Bonislawsky DBA Astigmatic (AOETI), **SIL Open Font License 1.1**. The exact
licence statement and links are in `public/fonts/NOTICE.txt`. The font is used
for the wordmark geometry and the display type; no other font is loaded.

## Known issues

See `docs/KNOWN_ISSUES.md`. Anything not measured is marked `UNVERIFIED` there
and in `docs/TEST_REPORT.md`.
