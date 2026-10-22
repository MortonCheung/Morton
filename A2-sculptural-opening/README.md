# A2 — Sculptural Opening (MORTON)

A single-viewport opening for **MORTON**: six letters formed as a dark mineral series on a lit
museum base, in a dark exhibition space. Not a plan or a mock — a real React + Three.js prototype.

- **Dev:** `http://127.0.0.1:5182/` (`npm run dev`, pid is reported at delivery)
- **Preview:** `http://127.0.0.1:5282/` (`npm run preview`)
- **State machine:** `loading → drawing → built → expanding → hero` (`reduced` for reduced motion)
- **Measured opening budget:** `drawingAt → heroAt` ≈ **1626–1673 ms** (draw ≈1147–1165 ms, expand ≈515 ms).
  Absolute `heroAt` in the five capture runs: **1901–1999 ms** after navigation on a warm dev server.
  A cold Vite dev boot can add ~0.6–1.0 s before `drawingAt`; that is real module/font boot, not a
  planted delay (see `docs/TEST_REPORT.md`).

## Commands

```bash
npm install                  # PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 was used in this environment
npm run dev                  # http://127.0.0.1:5182/  (strict port)
npm run build                # tsc -b && vite build
npm run preview              # http://127.0.0.1:5282/
npm run capture -- --url http://127.0.0.1:5182/ --name A2-opening            # full evidence
node scripts/capture.mjs --url http://127.0.0.1:5182/ --name A2-opening --no-video --settle 2500
node scripts/verify.mjs      # state machine, timing, gate, replay, reduced motion, dispose
node scripts/shot.mjs --out .tmp/shot.png --width 1440 --height 900          # single-frame owner shutter
```

The capture/verify/shutter scripts all share the machine-wide browser lock `/tmp/morton-browser-gate`.

## What is on screen

- Six independent `ExtrudeGeometry` letters cut from **Marcellus** (TTF → outlines → per-glyph extrude).
  The two **O** meshes share one geometry instance but have independent meshes/transforms.
- A **real construction sequence** (M→O→R→T→O→N): each letter's contour draws from the *same* font
  contours, then its volume grows from a thin plate to the final extrusion. It is not a progress bar.
- A **real asset gate**: the mineral tooth map is fetched over the network and used by every letter.
  If it is slow, the finished construction holds at `built`; expansion starts only when it is ready.
- A lit gallery: seamless soft sweep, one shadow-casting spot key, cool rim, warm-neutral wall wash,
  low beveled display base, contact shadow and a restrained camera settle.
- `REPLAY` (a real `<button data-replay>`) replays the whole opening without stacking timelines.
- `prefers-reduced-motion` → static `reduced`, no drawing timeline, render on demand only.

## Structure

```
src/
  app/App.tsx                 page shell + probe install
  components/OpeningStage.tsx React ⇄ Three boundary
  components/Overlay.tsx      chrome, state sentence, replay, fatal fallback
  scenes/SculptureScene.ts    scene owner: renderer, camera, state machine, gate, lifecycle
  scenes/studio.ts            sweep, lights, environment, base, contact shadow
  scenes/letters.ts           six letter meshes + same-source contour lines
  scenes/materials.ts         mineral material (per-letter clone, shared maps)
  scenes/Resources.ts         dispose-once registry (shared O geometry is registered once)
  animation/cameraRig.ts      fit + spherical rig
  animation/openingTimeline.ts draw + expand GSAP timelines
  letters/font.ts             TTF outline parser (kit)
  letters/buildWord.ts        per-glyph extrude with shared glyph geometry
  lib/assets.ts               real font/texture loaders + critical gate
  lib/timeline.ts             window.__MORTON__ probe contract
  data/config.ts, data/copy.ts constants and copy
public/fonts/Marcellus-Regular.ttf + OFL.txt
public/textures/mineral-tooth.png, contact-shadow.png   authored, tileable
scripts/capture.mjs (kit, unmodified judging), verify.mjs, shot.mjs
docs/  ISOLATION, IMPLEMENTATION_PLAN, DESIGN_DECISIONS, TEST_REPORT, KNOWN_ISSUES,
       VERIFICATION.json, TEST_REPORT_RAW.json, SCREENSHOTS/, RECORDING/
```

## Font license

**Marcellus** by Brian J. Bonislawsky DBA Astigmatic (AOETI), 2012.
Licensed under the **SIL Open Font License 1.1**; the full license is
[`public/fonts/OFL.txt`](public/fonts/OFL.txt). Only one weight ships (`Marcellus-Regular.ttf`,
46 KB). The same TTF is parsed for geometry and served to the browser for the small-caps chrome.

## Evidence

- `docs/SCREENSHOTS/desktop-1920.png`, `desktop-1440.png` (final code), `laptop-1366.png`, `tablet-1024.png`, `mobile-390.png`
  — the 1440 frame is from the final build; the other four and the video are from the 04:20 build (the final full capture was blocked by the shared browser lock, see TEST_REPORT §1/§7).
- `docs/SCREENSHOTS/gate-hold-1440.png` (real delayed-texture hold), `reduced-motion-1440.png`
- `docs/RECORDING/A2-opening.webm` and `.mp4` (complete opening, 1440×900)
- `docs/VERIFICATION.json`, `docs/TEST_REPORT_RAW.json`

## Gates

- `ARCHITECTURE_REVIEWED` — layered scene/React/animation/data; no giant component; only used deps
  (`three`, `gsap`, `opentype.js`, React). R3F/drei were removed because they were unused.
- `WORKSPACE_CLEAN` — one project root, `.gitignore` covers node_modules/dist/.tmp/raw video,
  `git status` audited at delivery.
- `RESOURCE_LIFECYCLE_REVIEWED` — dispose registry + light shadow-map disposal + scene/canvas removal;
  listeners/RAF/observers/animation cleanup verified. One honest caveat remains about
  `renderer.info.memory.textures` (see KNOWN_ISSUES).
- `PERFORMANCE_REVIEWED` — 5 viewport loads, 5 replays, 5 reload heap samples, delayed gate and
  reduced-motion in real Chrome. No real mobile device / Safari / Firefox pass (UNVERIFIED).
