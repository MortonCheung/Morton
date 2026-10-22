# MORTON — A3 premium-tech opening

A real, runnable opening prototype for the MORTON personal identity site: six
metal letters are drawn stroke by stroke, then become a solid, chamfered
wordmark in a dark studio.

React 19 + Vite 8 + TypeScript 5.9 + Three.js (orthographic) + GSAP.

## Run it

```bash
npm install            # PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 is what the shared setup uses
npm run dev            # http://127.0.0.1:5183/
npm run build          # tsc -b && vite build
npm run preview        # http://127.0.0.1:5283/
```

The dev server is pinned to **port 5183** (`strictPort`), preview to **5283**.

Evidence capture uses the system Chrome through `playwright-core` and the
machine-wide browser lock at `/tmp/morton-browser-gate`:

```bash
npm run capture -- --url http://127.0.0.1:5183/ --name A3-opening
npm run probe   -- --url http://127.0.0.1:5183/     # behavioural/timing checks
npm run shot    -- --name hero-1440 --wait 2500     # fast single-frame iteration
```

## Opening sequence

```
loading → drawing (1155 ms authored) → built → [real assets ready] → expanding (500 ms) → hero
```

- **drawing** strokes the actual TTF contours (`stroke-dasharray`), in the order
  M → O → R → T → O → N. It is authored at 1155 ms, above the 1000 ms floor, and
  it is never skipped when the font/environment are already warm.
- **built** is a real waiting state: the outline is fully drawn and stays on
  screen until the environment map has actually baked (`assetsReady`).
- **expanding** is 500 ms: the solid fades up while the stroke retracts, the
  material sharpens (roughness/clearcoat) and the environment rotates slightly,
  which sweeps the softbox highlight across the chamfers. Camera and orientation
  are locked during the crossfade so the outline cannot drift off the solid.
- **hero** starts a 2.6 s settle into a ~9° three-quarter view with a gentle
  pointer parallax. `data-replay` restarts the whole sequence without stacking
  GSAP timelines or rebuilding geometry.
- **reduced** (`prefers-reduced-motion: reduce`): no timelines, fully lit static
  wordmark, chrome visible.

`window.__MORTON__` exposes `state`, `timings`, six `letters` and an `extra`
payload (unique geometry ids, renderer counters, measured run timings) for
automated checks. `window.__MORTON_DEBUG__` exposes per-letter transform control
and `rendererInfo()` used by `scripts/probe-check.mjs`.

## Layout

```
src/
  app/App.tsx                     composition root: assets → build → frame → sequence
  components/                     Backdrop, ShadowLayer, OutlineOverlay, Chrome, fallback
  features/opening/               asset gate, state machine, draw/expand timelines, SVG projection
  letters/                        TTF → contours, shared-glyph ExtrudeGeometry
  lib/                            frame/camera math, DOM hooks, window.__MORTON__ probe
  scenes/                         R3F canvas, two-surface material, studio PMREM environment
  data/copy.ts                    all interface copy in one place
  styles/global.css               backdrop layers, chrome typography, responsive rules
scripts/
  capture.mjs                     provided evidence capture (screenshots + video + heap)
  probe-check.mjs                 functional/timing/replay/reduced-motion checks
  shot.mjs                        fast single-view screenshot for design iteration
```

Resource ownership: `buildWord()` owns one `ExtrudeGeometry` per **unique**
glyph (5 geometries for 6 letters; both O meshes share one instance).
`createLetterMaterials()` owns both physical materials and their procedural
maps. `createStudioEnvironment()` owns the PMREM texture only — its bake scene is
disposed immediately. `App` disposes the word build on unmount; the scene
disposes materials and environment; `useOpeningSequence` kills every GSAP
timeline on unmount and on replay.

## Font

`public/fonts/jost-morton-medium.ttf` — **Jost**, Copyright 2020 The Jost Project
Authors, **SIL Open Font License 1.1**. It is a static `wght=500` instance
generated with `fontTools.varLib.instancer` from the shared variable font; the
upstream copyright/license notices are retained and the derivative is shipped
under the same OFL 1.1 terms. See `public/fonts/LICENSE.txt`. The same file is
used for the small interface type via `@font-face`.

`public/textures/grain.png` is a generated 128×128 monochrome noise tile used at
low opacity to break 8-bit gradient banding in the backdrop.

## Evidence

- `docs/SCREENSHOTS/desktop-1920.png`, `desktop-1440.png`, `laptop-1366.png`,
  `tablet-1024.png`, `mobile-390.png`
- `docs/RECORDING/A3-opening.webm` + `A3-opening.mp4` (refresh → hero, 1440×900)
- `docs/TEST_REPORT_RAW.json` (provided capture output)
- `docs/PROBE_CHECK.json` (state/timing/independence/replay/reduced-motion tests)
- `docs/TEST_REPORT.md`, `docs/KNOWN_ISSUES.md`, `docs/DESIGN_DECISIONS.md`,
  `docs/IMPLEMENTATION_PLAN.md`, `docs/ISOLATION.md`

## Notes

- `?delayAsset=<ms>` is a QA-only hold applied to the *environment readiness*
  promise so the "built waits for real assets" path can be exercised. It never
  fabricates progress and is not used by the default route.
- The scene intentionally uses no shadow maps: the front-on framing has no
  ground plane, so a shadow map would only project a second ghost word. Grounding
  comes from a blurred silhouette contact shadow + a soft floor pool, documented
  in `docs/DESIGN_DECISIONS.md`.
- Desktop renders at 1.5× device pixels (capped 2), mobile at ≤1.75×. The
  polished chamfer against a dark ground is the worst case for MSAA, so a small
  supersample is cheaper than post-process AA.
