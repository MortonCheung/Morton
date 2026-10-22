# Test report — A4 Hybrid Opening

## Verdict

`RUNNABLE` · `BUILD_PASS` · `VISUAL_REVIEWED` · `INTERACTION_PASS` (state machine, replay, reduced
motion implemented; see UNVERIFIED for which interaction checks were machine-run).

Final implementation commit: **`826b012`** (second commit; scaffold baseline `0965b16`).
A delivery/evidence commit follows this report.

## Environment

- macOS, 8 GB RAM, 8 cores; five MORTON prototypes running concurrently behind the machine-wide
  browser lock `/tmp/morton-browser-gate`.
- Node `v24.15.0`, npm `11.12.1`, Playwright (`playwright-core` 1.62) driving system Chrome
  (channel `chrome`, headless, SwiftShader WebGL), ffmpeg 8.1.1.
- Dev server: `http://127.0.0.1:5184/` (`vite --port 5184 --strictPort`), preview `5284`.

## Commands actually run

| Command | Result |
|---|---|
| `npm run build` | **exit 0** — `dist/index.html 0.67 kB`, CSS `6.24 kB`, JS `1,450.91 kB` (gzip 416.07 kB) |
| `npm run dev` | listening on `127.0.0.1:5184` (pid 21108) |
| `npm run capture -- --url http://127.0.0.1:5184/ --name A4-opening` (video run, 03:45) | **exit 0**; 5 screenshots + webm/mp4 + raw JSON |
| `node scripts/qa-check.mjs` | harness written; **not executed to completion** inside the time box (see UNVERIFIED) |

## Measured opening timings (real probe, `performance.now()`)

Final video run (1440×900, 03:45 build):

| Marker | ms |
|---|---:|
| drawing start | 418 |
| built | 1470 |
| expanding | 1470 |
| hero | 1954 |
| **draw** | **1052** (gate: ≥1000) |
| **expand** | **484** (gate: 450–650) |
| **total from mount** | **1954** (target ≤2000) |
| critical assets ready | 490 (before the draw ended) |

State sequence observed: `loading → drawing → built → expanding → hero`; 6 letters exposed; page
reached `hero` in all 5 viewports.

The final tuning commit changes pixels plus the shadow/composition only; the 03:45 timing run was
taken before the dash-drawing fix, which changes stroke rendering but not the timeline. A full
re-measurement on the final commit is listed under UNVERIFIED.

## Per-view machine checks (03:45 run)

| View | Canvas | overflowX | console errors | page errors | state |
|---|---:|---:|---:|---:|---|
| desktop-1920 | 1920×1080 | 0 | 0 | 0 | hero |
| desktop-1440 | 1440×900 | 0 | 0 | 0 | hero |
| laptop-1366 | 1366×768 | 0 | 0 | 0 | hero |
| tablet-1024 | 1024×768 | 0 | 0 | 0 | hero |
| mobile-390 | 780×1688 (DPR 2) | 0 | 0 | 0 | hero |

Five successive full reloads (heap, `performance.memory.usedJSHeapSize`): **61.0 / 82.6 / 86.4 / 74.3 /
76.0 MB** — not monotonic; GC is not forced, so this is observational, not a leak proof.

## Visual review (real screenshots, read back with the image tool)

Round 1 (first render) — five ugliest points and what was done:

1. **Beige, clay-like letters with no light gradient** → measured the reflection band with a
   colour-banded probe environment, then placed a generated studio env inside it; satin
   metalness/roughness/clearcoat tuned over five rounds.
2. **Contact shadow was one smeared dark band** → separated into a blurred contact shadow and a weak
   directional cast shadow with an explicit offset direction.
3. **Brown horizontal floor stripe** → replaced the broad additive band with a wider, softer pool on
   a CSS floor gradient.
4. **Dull extrusion** → depth 0.28→0.24, bevel 0.012→0.02 (4 segments) so the edge catches the second
   (cool) light; camera pushed to a stronger 3/4.
5. **Empty bottom / competing chrome** → word enlarged from 68 % to 72 % width (ink ≈71 % of 1440),
   a soft reflection layer under the word, caption 15.5→14–15 px at lower contrast, SCROLL quieter.

Defect found and fixed during review: the SVG outline used `vector-effect: non-scaling-stroke`, so
Chrome treated the dash pattern in screen pixels — the “drawing” appeared as a field of dots. Stroke
width is now projected into local units and the outline draws progressively. A re-capture with the fix
is noted under UNVERIFIED (browser lock/time box).

Screenshots inspected with the image reader: 1920×1080 (final build, 04:53) and 1440/1366/1024/390
(03:45 build). Composition check on the final 1920: wordmark ≈72.6 % of viewport width, optical centre
≈47 % height, chrome de-emphasised, contact + directional shadow readable.

## Performance / lifecycle review

- Renderer: one WebGL context, DPR capped 1–2 (mobile 2, canvas 780×1688), ACES tone mapping,
  alpha canvas over CSS showroom layers.
- Draw calls at rest: 9 (6 letters + floor pool + contact shadow + env/background); triangles ~69k.
- Resting state: render pump stops after hero → **no RAF, no GPU work** (probe `extra.renderPaused`).
- During opening: one 512 contact-shadow pass + one 2048 shadow map; both disabled on mobile.
- Replay rebuilds no geometry/material (single `LetterAssets` owner); timelines are killed in the
  effect cleanup; `visibilitychange` pauses/resumes the live timeline.
- Environment/floor textures are generated canvases, disposed on unmount; no HDRI, no network asset
  beyond the 46 KB TTF.

## Gates

| Gate | Status |
|---|---|
| `ARCHITECTURE_REVIEWED` | **PASS** — layered modules, no mega-component; both O share one geometry; single resource owner; `capture.mjs` unmodified |
| `WORKSPACE_CLEAN` | **PASS** — `git status` clean after the delivery commit; `.tmp/` removed; only one app root; no `node_modules`/`dist` committed |
| `RESOURCE_LIFECYCLE_REVIEWED` | **PASS (code-reviewed)** — explicit dispose path for geometry/material/generated textures; R3F auto-dispose disabled on shared meshes; GSAP/ticker/listener cleanup |
| `PERFORMANCE_REVIEWED` | **PARTIAL** — real browser capture, console/overflow, heap samples, render-paused proof; no profiler and no replay/gate QA run to completion |

## UNVERIFIED

- `scripts/qa-check.mjs` (letter-independence assertions, `?gateDelay=3000` built-hold, reduced-motion
  state, five-replay geometry/heap stability) was written and syntax-checked but **did not complete in
  the time box**; it is queued behind the shared browser lock. Treat those four claims as code-reviewed
  only.
- Final-commit timing re-measurement and final-commit screenshots for 1440/1366/1024/390 (the
  screenshot-only capture was started twice and lost the browser lock to sibling prototypes).
- Real-device mobile performance; Safari/Firefox; DevTools allocation profile; forced background-tab
  behaviour.
- The mp4/webm in `docs/RECORDING/` was recorded from the **03:45 build** (before the dash fix and the
  final composition). It covers the complete opening (8.3 s) but is not the final build; the Lead's
  time box explicitly required reusing it rather than re-recording.
