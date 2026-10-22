# MORTON — A4 Hybrid Opening

A runnable opening study for a personal site: **MORTON** is drawn as a live outline, then the same
contours gain depth, champagne-satin surface and light, and settle into a release-style hero shot.

- **Stack:** React 19 · Vite 8 · TypeScript 5.9 · three.js (React Three Fiber) · GSAP
- **Typeface:** Marcellus (SIL OFL 1.1), see [`public/fonts/OFL.txt`](public/fonts/OFL.txt)
- **Dev port:** `5184` · **Preview port:** `5284`
- **Design canvas:** 1440×900; verified at 1920, 1440, 1366, 1024, 390.

> Not a plan or a mock-up. The screenshots and the recording in `docs/` were produced by a real
> Chrome against this code (see `docs/TEST_REPORT.md`).

## Run

```bash
npm install            # already installed in this folder
npm run dev            # http://127.0.0.1:5184/
npm run build          # tsc -b && vite build
npm run preview        # http://127.0.0.1:5284/
npm run capture -- --url http://127.0.0.1:5184/ --name A4-opening
node scripts/qa-check.mjs --url http://127.0.0.1:5184/
```

`capture` and `qa-check` both use the machine-wide browser lock `/tmp/morton-browser-gate`, so they
queue safely next to the other four prototypes. Do not start a second Chrome.

## The opening

```
loading → drawing (1.04 s) → built → expanding (0.48 s) → hero
```

- The six letters draw **M → O → R → T → O → N** from the real TTF contours (320 ms each, 150 ms stagger).
- `drawing` never runs shorter than 1000 ms; a fast cache cannot skip it.
- `built` is a genuine hold: the expand awaits real typeface/WebGL/font readiness. With the
  `?gateDelay=3000` test hook the stage visibly holds in `built` and expands only when the gate resolves.
- The expand crossfades the outline into extruded meshes (each letter eases forward on Z), animates
  surface roughness/clearcoat/env intensity, and eases the camera from frontal to a shallow 3/4.
- `REPLAY` (`[data-replay]`) restarts the whole sequence without rebuilding geometry or materials.
- `prefers-reduced-motion: reduce` skips the choreography and reports state `reduced`.
- After `hero` the WebGL render pump switches off: the resting hero costs no RAF/GPU work.

## Architecture

```
src/
├── app/App.tsx                     # installs the __MORTON__ probe, mounts the feature
├── features/opening/
│   ├── OpeningExperience.tsx       # typeface lifecycle, layout, scene/outline wiring
│   ├── useOpeningSequence.ts       # the state machine + the real resource gate
│   ├── OutlineStage.tsx            # SVG overlay generated from the same contours
│   ├── stage.ts                    # one mutable runtime handle, projection maths, debug API
├── scenes/
│   ├── OpeningCanvas.tsx           # Canvas, scene registration, render pump, camera rig
│   ├── cameraLayout.ts             # responsive fit + draw/hero poses (pure maths)
│   ├── Studio.tsx                  # key/rim/fill lights, floor pool, contact shadow
│   ├── studioEnvironment.ts        # generated equirect studio env (no HDRI download)
├── animation/openingTimelines.ts   # GSAP draw + expand timelines, hero/reset states
├── letters/
│   ├── font.ts                     # TTF → contours, holes, SVG path data
│   ├── buildWord.ts                # one ExtrudeGeometry per glyph (both O share it)
│   ├── letterAssets.ts             # single owner: material + geometries, one dispose path
├── components/BrandChrome.tsx      # label, one line, scroll cue, replay
├── hooks/useEnvironment.ts         # reduced-motion + coalesced viewport
├── lib/                            # probe contract, timings config, font loader
└── styles/global.css               # showroom backdrop, chrome, reduced-motion
```

**Resource ownership.** `createLetterAssets` is the only owner of the six meshes' geometry and the
shared `MeshPhysicalMaterial`. The two `O` meshes point at *one* `ExtrudeGeometry` (proved in
`window.__MORTON__.extra.twoO` and in `docs/QA_REPORT_RAW.json`); R3F auto-dispose is disabled on
those meshes (`dispose={null}`) so an individual letter can never free a shared resource. Unmount
disposes geometry, material, the generated environment texture, the floor texture and the renderer
via R3F. GSAP timelines, the render-pump ticker and the `visibilitychange` listener are all torn down
in the same cleanup that owns them.

## Verification contract (`window.__MORTON__`)

`state`, `timings` (`drawingAt / builtAt / expandingAt / heroAt`), six `letters` and `extra`
(renderer counts, both-O geometry UUIDs, durations, `renderPaused`) are exposed. A dev-only
`window.__MORTON_DEBUG__` exposes per-letter rotate/visibility and material/scene diagnostics for QA;
it is not part of the visual design.

## Test hooks (explicit, never fake progress)

| Query param | Meaning |
|---|---|
| `?gateDelay=3000` | delays the **real** critical-asset gate by 3 s so the `built` hold can be verified |

There is no artificial loading percentage anywhere in the code.

## Documents

- [`docs/ISOLATION.md`](docs/ISOLATION.md)
- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md)
- [`docs/DESIGN_DECISIONS.md`](docs/DESIGN_DECISIONS.md)
- [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md)
- [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md)
- [`docs/RISK_REGISTER.md`](docs/RISK_REGISTER.md)
- `docs/SCREENSHOTS/` — 1920 / 1440 / 1366 / 1024 / 390
- `docs/RECORDING/A4-opening.webm` + `.mp4`
