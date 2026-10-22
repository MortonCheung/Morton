# TEST REPORT — A2 Sculptural Opening

> Evidence-first. Numbers below come from the real browser runs in
> `docs/TEST_REPORT_RAW.json` and `docs/VERIFICATION.json`. Anything not measured is marked
> **UNVERIFIED**.

## Environment

| Item | Value |
|---|---|
| OS | macOS (Darwin), Apple Silicon, 8 GB RAM shared with four sibling prototypes |
| Browser | system Chrome 155 via `playwright-core` 1.62, headless, `channel: 'chrome'` |
| Node / npm | v24.15.0 / 11.12.1 |
| Dev server | `npm run dev` → `http://127.0.0.1:5182/` (pid 20651 at delivery) |
| Preview | `http://127.0.0.1:5282/` (`npm run preview`) |
| Git baseline | `606cfb5` scaffold → `2a75b86` working prototype → final delivery commit (see report message) |

## Commands and results

```text
$ npm run build
> tsc -b && vite build
✓ 38 modules transformed.
dist/index.html                0.86 kB │ gzip: 0.48 kB
dist/assets/index-...css       5.79 kB │ gzip: 2.06 kB
dist/assets/index-...js    1,061.99 kB │ gzip: 300.10 kB
✓ built in 208ms                                      exit 0

$ node scripts/verify.mjs
30 PASS / 1 FAIL  (the fail is the renderer-internal texture residual, see §6)
exit 1 (by design, one check failed)

$ node scripts/capture.mjs --url http://127.0.0.1:5182/ --name A2-opening
problems: []   consoleErrors: 0   pageErrors: 0   overflowX: 0 in all five views
5 screenshots + A2-opening.webm + A2-opening.mp4 + 5 reload heap samples

$ node scripts/capture.mjs --url http://127.0.0.1:5182/ --name A2-opening --no-video --settle 2500
FAILED: browser lock timeout (/tmp/morton-browser-gate) after 20 min — another prototype held
the machine-wide lock. No new five-view set was written. The 1440 screenshot was replaced with a
real final-code frame from `scripts/shot.mjs`; the other four views and the video remain the 04:20
build. This is an evidence limitation, not a hidden pass.
```

## 1. State sequence and timing (real capture, warm dev server)

Recorded by the probe, ms after navigation (`performance.now()`):

| View | drawingAt | builtAt | expandingAt | heroAt | draw | expand | draw+expand | hero absolute |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1920×1080 | 321 | 1468 | 1483 | 1999 | 1147 | 516 | 1678 | **1999** |
| 1440×900 | 246 | 1387 | 1403 | 1904 | 1141 | 501 | 1658 | **1904** |
| 1366×768 | 246 | 1406 | 1422 | 1939 | 1160 | 517 | 1693 | **1939** |
| 1024×768 | 224 | 1386 | 1401 | 1901 | 1162 | 500 | 1677 | **1901** |
| 390×844 | 226 | 1390 | 1406 | 1907 | 1164 | 501 | 1681 | **1907** |
| video run (1440) | 265 | 1420 | 1438 | 1938 | 1155 | 500 | 1673 | **1938** |

`verify.mjs` run (different cache state): drawingAt 374, builtAt 1539, expandingAt 1555,
heroAt 2056 → draw 1165, expand 501, animation budget 1682 ms.

**Result:** draw ≥ 1000 ms ✓; expand in 450–650 ms ✓; animation budget ≤ 2000 ms ✓.
After the final tuning pass the configured budget is draw 1150 + expand 500 = 1650 ms.
The final full capture could not be re-run because the shared browser lock timed out (20 min held by
another prototype); post-tuning probe timings are therefore **UNVERIFIED**. The table above is the
last full measured set (pre-tuning, draw 1141–1165 ms), which is still valid evidence for the same
state machine and choreography.

### The 2672 ms total the Lead observed — honest attribution

The Lead's independent run reported:

```
drawingAt=993  builtAt=2140  expandingAt=2157  heroAt=2672
draw=1147 ms   expand=515 ms   heroAt=2672 ms
```

The 993 ms *before* `drawingAt` is **real page boot, not an artificial delay**:

- There is no `setTimeout`, fake progress or planted wait in the opening code. The boot path is:
  `installProbe()` → `SculptureScene` constructor builds renderer/studio synchronously → `boot()`
  awaits `loadFontBuffer('/fonts/Marcellus-Regular.ttf')` → `startDrawing()`.
- In the Lead's cold browser context, Vite had to transform and serve the dev module graph and the
  TTF was fetched/parsed; in our five capture contexts the same gap was 224–321 ms because the
  modules were warm. Same code, different dev-server cache state.
- The designed animation is `drawingAt → heroAt` = **1658–1693 ms**, within the 2000 ms target.
  The absolute hero time on the warm captures is **1901–1999 ms**. In the cold run the extra
  ~0.7 s is real module + font boot and is allowed by the brief's rule "真实资源等待可超时，
  但必须如实归因".
- Production build boot is expected to be lower; a preview-server measurement was not taken before
  the time box → **UNVERIFIED** (not claimed as passing).

## 2. Real asset gate (deliberately delayed texture)

Playwright route interception delayed `mineral-tooth.png` by **2500 ms** (a real network hold; the
app was not modified for the test):

```
builtAt = 1459      state was still 'built' 500 ms later
expandingAt = 2747  (1288 ms hold after built)
heroAt = 3243       expand = 496 ms
```

Screenshot evidence: `docs/SCREENSHOTS/gate-hold-1440.png`.
Result: the hero does **not** appear early; expansion is a direct consequence of the real image
arriving. `consoleErrors/pageErrors/httpErrors = 0`.

## 3. Shared geometry + independent letters

`extra.letterGeometryIds` for 6 letters → 5 unique ids, and `ids[1] === ids[4]`
(the two O meshes share one `ExtrudeGeometry`). The debug API then:
rotated M (index 0) by Y 0.4, rotated R (2) by X 0.2, moved O (4) +0.1 X and hid T (3).
Only indices `0,2,3,4` changed; `1,5` were untouched. `resetLetters()` restored all transforms
exactly. Result: **PASS**.

## 4. Replay stress (5 consecutive replays)

| Run | draw ms | expand ms | canvases |
|---|---:|---:|---:|
| 2 | 1194 | 501 | 1 |
| 3 | 1194 | 501 | 1 |
| 4 | 1197 | 501 | 1 |
| 5 | 1193 | 501 | 1 |
| 6 | 1194 | 500 | 1 |

Before/after five replays: `renderer.info.memory.geometries = 18` (stable), `textures = 6`
(stable), listeners = 3 (stable), canvases = 1, controlled heap 47.09 MB → 41.83 MB
(Chrome `performance.memory`; no monotonic growth). No console/page errors. Result: **PASS**.

## 5. Reduced motion

`prefers-reduced-motion: reduce` → state **`reduced`**, `drawingAt` is `undefined` (the drawing
timeline never starts), six letters are present, one canvas, screenshot
`docs/SCREENSHOTS/reduced-motion-1440.png`. Result: **PASS**.

## 6. Resource lifecycle on dispose

`window.__MORTON_DEBUG__.dispose()`:

```
disposed: true   canvas: 0   listeners: 0
owned: { geometries: 0, materials: 0, textures: 0, others: 0 }
renderer.info.memory.geometries: 0
renderer.info.memory.textures: 3   ← residual
```

All **owned** geometries/materials/textures/render targets are released exactly once (registry
counts zero), the canvas is removed, listeners/observers/RAF/timelines are gone, and renderer
geometry count is zero. Three `renderer.info.memory.textures` remain at snapshot time. Shadow-map
disposal was added after this verification run; its effect is **UNVERIFIED** post-patch. The
remaining count is treated as a known issue rather than claimed clean
(see `docs/KNOWN_ISSUES.md` §1). The 30/31 verification result is therefore reported as
**PARTIAL / OPEN**, not a pass.

## 7. Evidence capture + console + overflow

> **Evidence-set caveat (final, explicit):** the five-view `--no-video` recapture on the final code
> was attempted and **failed with `browser lock timeout (/tmp/morton-browser-gate)`** after 20 min.
> The delivered 1920/1366/1024/390 screenshots and the recording are the 04:20 build. The delivered
> `desktop-1440.png` was replaced by a real final-code frame (beveled 0.14 base, targetX centring).
> Post-tuning probe timing and the five-view overflow re-check are **UNVERIFIED**.

- Five viewports: 1920, 1440, 1366, 1024, 390. `overflowX = 0` in all five; one canvas each.
- Console errors 0, page errors 0, failed resources 0 (a favicon 404 from an earlier build was
  fixed by adding `public/favicon.svg`).
- Heap across five fresh reloads: 42.9 / 48.4 / 46.6 / 51.5 / 41.9 MB (fluctuating, no monotonic
  growth; this is a coarse signal, not a heap-snapshot proof).
- Video: 1440×900, complete reload→hero, webm 1.4 MB + mp4 523 KB. The video and four of the five
  screenshots were recorded before the final base-bevel/1150 ms tuning. Only
  `desktop-1440.png` is from the final code (single-frame shutter, not the five-view harness).
  **The video is content-complete but not pixel-identical to the final build.** Re-recording is
  optional and **UNVERIFIED**; the final five-view capture attempt failed on the shared lock.

## 8. Visual review (real screenshots, read and critiqued)

First hero (iteration 1) — five ugliest points:
1. Letters read as cream/beige flat type; no mineral weight.
2. A glowing blue-grey floor band cut the frame; the background was a brown void.
3. No grounding/contact shadow; plinth did not exist yet.
4. Extrusion sides invisible at 13°; no bevel read.
5. Warm/cool light split felt like a generic 3D render, not a designed object.

Changes made over rounds 2–5: deeper graphite material, cool-neutral palette, PBR sweep replaced by
a PBR-free Lambert sweep (removes the grazing Fresnel "shelf" line), low beveled display base with
contact shadow, hidden solids + contour-first construction, floor fill, base-width fit, targetX
centring, 1150 ms draw. Remaining weakness: at 1440 the letters still read a little more machined
metal than cast mineral. See `docs/DESIGN_DECISIONS.md` §8–10.

## 9. Four gates

- **ARCHITECTURE_REVIEWED = PASS** — clear `app/components/scenes/animation/letters/lib/data`
  boundaries; one renderer/scene owner; one timeline module; dependencies all used
  (three, gsap, opentype.js, React); no giant component, no duplicate scene.
- **WORKSPACE_CLEAN = PASS** — single project root, `node_modules/dist/.tmp/raw video` ignored,
  no sibling project touched, `git status` audited and committed. No scattered temp files in the
  delivery tree (`.tmp/` is ignored and is not part of the deliverable). Evidence-set version gap
  is disclosed above and in KNOWN_ISSUES (§3).
- **RESOURCE_LIFECYCLE_REVIEWED = PARTIAL** — registry + light shadow maps + listeners + RAF +
  observers + GSAP timelines are explicitly released; owned counts zero. Residual
  `renderer.info.memory.textures=3` is open (§6).
- **PERFORMANCE_REVIEWED = PASS (with caveats)** — 5 viewport loads, 5 replays, 5 reload heap
  samples, delayed gate, reduced motion, real Chrome. No real mobile device, Safari, Firefox,
  profiler trace or GPU timing → those remain **UNVERIFIED**.

## 10. Not verified

Real iOS/Android device, Safari/Firefox, production-server cold boot, long-session memory
(>5 replays), GPU frame-time profile, accessibility tree audit, screen-reader pass, color contrast
measurement, thermal throttling, and the post-shadow-map texture residual re-check.
