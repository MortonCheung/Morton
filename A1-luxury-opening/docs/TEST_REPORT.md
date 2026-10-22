# TEST REPORT

All numbers below were produced by commands in this repository, in a real
Chrome (not a mock). Where something could not be measured it is marked
**UNVERIFIED**.

Evidence in §3 (production) and §5 (renderer) was captured against implementation
commit `f93bc24436ec7119abe62c03389b8276080b79e2`; the refinement round
(face sheen, contact shadow, raised floor, narrower framing) is the commit that
follows it. The 5-viewport capture was re-run after the refinement with
`--no-video` as instructed; the recording `docs/RECORDING/A1-opening.mp4` was
recorded at `f93bc24` (pre-refinement) and therefore shows the earlier terminal
material/floor while the *sequence and timings* are unchanged (~1.75 s,
draw 1.18 s / expand 0.56 s). Re-recording the video is the one remaining
evidence gap for the refinement commit.

## 1. Environment

| | |
|---|---|
| Machine | Apple Silicon Mac, 8 GB RAM, five prototypes running in parallel |
| OS | macOS (Darwin 24.x) |
| Node / npm | v24.15.0 / 11.12.1 |
| Browser | Google Chrome 155 via `playwright-core` `channel: 'chrome'`, headless, `--ignore-gpu-blocklist --enable-unsafe-swiftshader` |
| Renderer | hardware WebGL in headless Chrome (16 draw calls, 60 fps) |
| Dev server | `vite --host 127.0.0.1 --port 5181 --strictPort` |
| Prod build | `vite build` + `vite preview --port 5281` |

## 2. Commands and results

| Command | Exit | Result |
|---|---:|---|
| `npm install` | 0 | 1 package updated, 53 scaffold-only packages removed |
| `npm run gen:outline` | 0 | `MORTON · 6 letters · ink 4.806 × 0.727 em · cap 0.700 · contours 9` |
| `npm run typecheck` | 0 | `tsc -b`, no output |
| `npm run build` | 0 | `✓ built in 188 ms` → `dist/assets/index-7aqCBOCz.js 1,056.21 kB (gzip 300.20 kB)`, CSS 5.54 kB |
| `npm run capture -- --url http://127.0.0.1:5181/ --name A1-opening` | 0 | 5 screenshots, webm + mp4, `docs/TEST_REPORT_RAW.json` |
| `npm run verify` | 0 | **34/34 checks PASS**, `docs/VERIFY_REPORT.json` — re-run on the final commit after the refinement + shader-state fix |

## 3. Opening timings

`window.__MORTON__.timings`, ms, `performance.now()` clock. `draw = builtAt − drawingAt`,
`expand = heroAt − expandingAt`, `total = heroAt − drawingAt`.

### Production build (`vite preview`, 1440×900, 2 runs)

| run | drawingAt | builtAt | expandingAt | heroAt | draw | expand | total |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 151 | 1333 | 1333 | 1900 | **1182** | **567** | **1749** |
| 2 | 131 | 1309 | 1309 | 1875 | **1178** | **567** | **1745** |

Production transfer for the whole page: **339 kB, 5 resources**; DOMContentLoaded 69–94 ms.
Hero is reached ~1.88 s after navigation, ~1.75 s after the first drawn line.

### Refinement round (2nd pass: face sheen, contact shadow, framing)

Fresh 5-viewport capture (`--no-video --settle 2500`) after the refinement:

| viewport | state | draw | expand | total | console err | overflowX |
|---|---|---:|---:|---:|---:|---:|
| 1920×1080 | hero | 1183 | 564 | 1748 | 0 | 0 |
| 1440×900 | hero | 1191 | 567 | 1758 | 0 | 0 |
| 1366×768 | hero | 1187 | 568 | 1756 | 0 | 0 |
| 1024×768 | hero | 1193 | 564 | 1758 | 0 | 0 |
| 390×844 @2 | hero | 1182 | **881** | 2063 | 0 | 0 |

The mobile row exposed a real hitch: `beginReveal()` toggled
`material.transparent`, which forced a shader recompile on the first reveal
frame and stretched the expand to 881 ms on the DPR-2 mobile tier. Fixed by
keeping the material transparent for the whole run (no state change at reveal;
`depthWrite` keeps occlusion). Re-measured on mobile after the fix:

| mobile run | state | draw | expand | total |
|---|---|---:|---:|---:|
| 1 | hero | 1158 | 567 | 1724 |
| 2 | hero | 1187 | 567 | 1754 |
| 3 | hero | 1180 | 566 | 1747 |

Final screenshots: `desktop-1440.png` and `mobile-390.png` were re-shot on this
exact code (`draw 1177 / expand 564 / total 1741` and `draw 1175 / expand 565 /
total 1741`). The other three viewports are from the same refinement run; the
shader-state fix does not alter the hero frame.

- Optical centre of the ink box: **cy = 422.998 px** of 900 (47.0 %; the review
  band is 405–468). Ink width 950.4 px = 66 % of 1440 at the built state, ≈70 %
  at the hero dolly.
- Letter base to contact-shadow contact: floor at −0.38, letter bottom at
  −0.36 → 0.02 world units ≈ **4 px** at this framing (band ±10 px).
- Face gradient: per-glyph normalised UVs + a smooth left→right normal sweep and
  roughness gradient (no 2D noise). The 1440 crop of the M shows a continuous
  bevel-highlight → light face → mid → dark-base ramp (≥3 levels) with no
  mottling.

### Dev server, official capture (`npm run capture`)

| viewport | state | draw | expand | total | console err | page err | overflowX |
|---|---|---:|---:|---:|---:|---:|---:|
| 1920×1080 | hero | 1782 | 567 | 2349 | 0 | 0 | 0 |
| 1440×900 | hero | 1073 | 566 | 1639 | 0 | 0 | 0 |
| 1366×768 | hero | 1152 | 565 | 1718 | 0 | 0 | 0 |
| 1024×768 | hero | 1140 | 567 | 1707 | 0 | 0 | 0 |
| 390×844 @2 | hero | 1136 | 565 | 1703 | 0 | 0 | 0 |

The first (1920) row is the cold Vite run: the TTF response took 841 ms and the
main thread was busy with 480+ unbundled module requests, which stretched the
GSAP clock (`drawMs 1782`). That is a dev-server artefact, not a designed delay —
the production build above is the honest normal-case number. The acceptance
floor (draw ≥ 1000, expand 450–650) holds in every run, including the cold one.

### Replay (3 consecutive, same page, `R` key)

| run | draw | expand | total |
|---|---:|---:|---:|
| 2 | 1218 | 567 | 1785 |
| 3 | 1218 | 567 | 1785 |
| 4 | 1217 | 567 | 1783 |

No drift between replays; `document.querySelectorAll('canvas').length === 1`
after all replays.

### Real asset gate (`?assetDelay=2200`, delays the real font response)

```
builtAt      1389   (line art complete, state = built)
fontFetchMs  3317   (real delayed response)
expandingAt  3576   → gap built→expanding = 2187 ms
drawMs       1187   (still ≥ 1000)
heroAt       4140
```

Sampled while waiting: `state === 'built'`, `timings.expandingAt === undefined`
(no early reveal). This is the required "construction finished, critical asset
not ready → stay in built" behaviour.

### Reduced motion

| path | result |
|---|---|
| OS setting (`context.reducedMotion: 'reduce'`) | `state = reduced`, 6 letters visible, no draw/reveal timelines |
| URL override (`?motion=reduced`) | `state = reduced` |

### Visibility

Synthetic `visibilitychange` with `document.hidden` overridden (headless Chrome
does not hide a background page): while hidden for 1.2 s the state stayed
`drawing` and `builtAt` stayed `undefined`; after resuming, the drawing
completed (`drawMs 2406`, i.e. 1.2 s of pause + normal draw) and reached `hero`.

## 4. Acceptance checklist

| Item | Result | Evidence |
|---|---|---|
| independent directory + Git repo | PASS | `git log`, no remote |
| `npm run build` | PASS | exit 0, 188 ms |
| dev server runs | PASS | `curl` 200 on :5181 |
| no blocking console errors | PASS | 0 in all 5 views + verify runs |
| no horizontal overflow | PASS | `scrollWidth − clientWidth = 0` at 5 viewports |
| drawing ≥ 1000 ms | PASS | 1073–1226 ms observed; 1178–1182 ms production |
| fast assets cannot skip drawing | PASS | gate is `Promise.all(draw, assets)`; assets ready at ~78 ms, drawing still 1.18 s |
| slow assets wait in built | PASS | `?assetDelay=2200` → gap 2187 ms |
| no fake percentage | PASS | no numeric progress anywhere; only the real draw-timeline hairline |
| expand 450–650 ms | PASS | 563–567 ms in every run |
| line art and solid do not jump | PASS (visual + numeric) | same contours/layout; `layoutMatch: true`; `docs/SCREENSHOTS/state-handoff.png` shows the solid inside the drawn line |
| hero stable after reveal | PASS | state `hero`, idle drift only, `R`/button replay |
| replay replays fully | PASS | 3 replays, 1217–1218 ms draw each |
| reduced-motion path | PASS | state `reduced` |
| six letters independent | PASS | probe letters + `letters.secondODiffers` |
| two O share geometry | PASS | `uniqueGeometries: 5`, `sharedOGeometry: true` (6 meshes) |
| no CAD/starfield/cyber styling | PASS | visual review of 5 viewports |
| background has depth | PASS | CSS gradient layers + lit floor disc + contact shadow + fog |
| assets disposed / animation cleaned | PASS (review) | see §6, and replay heap delta below |
| tab hidden pauses and resumes | PASS | see Visibility above |
| mobile DPR/shadow reduction | PASS | DPR 2, shadow 512, 74 698 triangles at 390×844 |

## 5. Performance evidence (real browser, `extra.renderer`)

| viewport | draw calls | triangles | programs | geometries | textures | DPR | shadow map | fps (EMA) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1440×900 | 16 | 123 730 | 8 | 15 | 14 | 1 | 1024 | 60 |
| 390×844 | 16 | 74 698 | 8 | 15 | 14 | 2 | 512 | 60 |

No post-processing, one shadow-casting light, one environment map, one material
for all six letters, 6 letter draw calls + floor + shadow depth pass.

### Heap / replay

- 5 cold page loads (capture harness `reloadHeapSamples`):
  44.15 → 51.48 → 52.78 → 62.56 → 58.86 MB. These are five *separate*
  contexts; the spread is loader/GC noise, not a growth curve.
- Same page, 3 replays: `usedJSHeapSize` 41.60 MB → 41.74 MB (**+0.13 MB**),
  and replay timings identical across runs. No timeline/RAF accumulation was
  observed.

**UNVERIFIED**: a forced-GC heap snapshot comparison and a long soak (30+ min)
were not run. The replay delta is evidence of no accumulation, not proof of no
leak.

## 6. Resource lifecycle review (code read, not just claimed)

| Resource | Created | Released |
|---|---|---|
| `WebGLRenderer` + context | `OpeningScene` constructor | `dispose()` → `renderer.dispose()`, `forceContextLoss()` |
| 5 letter geometries (6 meshes) | `loadLetters` → `geometries:Set` | one `dispose()` per set entry; the shared O geometry is released once |
| letter material + roughness texture | `createLetterMaterial` | `bundle.dispose()` |
| PMREM target + environment texture | `createStudio` | `envTarget.dispose()` in `studio.dispose()` |
| 6 env panels + panel gradient maps | `createStudio` | `studio.disposables` loop |
| floor geometry/material/alpha map | `createStudio` | `studio.disposables` loop |
| draw / reveal / drift timelines | `useOpening` | `killTimelines()` before replay and on unmount |
| render loop | `OpeningScene.start` | `cancelAnimationFrame` in `pause()` / `dispose()` |
| `ResizeObserver` | `useOpening` | `disconnect()` |
| `visibilitychange`, `keydown`, pointer listeners | `useOpening` / `OpeningScene` | `removeEventListener` / `detachPointer()` |
| stats interval | `useOpening` | `clearInterval` |

Replay deliberately does **not** rebuild GPU resources: `resetForReplay()` only
resets pose/light state. That is why the heap delta stays flat.

## 7. Architecture review

- No component over ~250 lines; `OpeningScene` is the single WebGL owner,
  `useOpening` the single time owner, `studio`/`framing`/`material`/`textures`
  are focused modules.
- Data (`outline.generated`, `wordSpec`, `content`) is separate from animation
  and rendering.
- No duplicate timeline owns the same property; animation writes only
  `scene.motion` + material opacity.
- Dependencies: `three`, `gsap`, `opentype.js`, `react`, `react-dom`; dev:
  `vite`, `typescript`, `playwright-core`. The scaffold's unused
  `@react-three/fiber` / `@react-three/drei` and the B1 capture script were
  removed.
- `ARCHITECTURE_REVIEWED`: **PASS**.

## 8. Workspace

- `.gitignore` covers `node_modules/`, `dist/`, `.tmp/`, logs, `*.tsbuildinfo`,
  `docs/RECORDING/.raw/`.
- Temporary artefacts live in `.tmp/` (ignored) and are cleaned before delivery.
- `git status` reviewed before each commit; the deliverable screenshots and
  recordings are intentionally tracked.
- No files were created outside this project directory.
- `WORKSPACE_CLEAN`: **PASS**.

## 9. Gate conclusions

| Gate | Conclusion | Evidence |
|---|---|---|
| `ARCHITECTURE_REVIEWED` | **PASS** | §7; module map in `IMPLEMENTATION_PLAN.md`; single WebGL owner, single time owner |
| `WORKSPACE_CLEAN` | **PASS** | §8; no files outside this directory; `.tmp/` ignored and cleared; `git status` reviewed |
| `RESOURCE_LIFECYCLE_REVIEWED` | **PASS** | §6 table + replay heap delta +0.13 MB over 3 replays |
| `PERFORMANCE_REVIEWED` | **PASS with qualifiers** | §5: 60 fps, 16 draw calls, 123 730 tris at 1440, 74 698 at 390; production transfer 339 kB. Long soak and forced-GC snapshots are **UNVERIFIED** |

## 10. UNVERIFIED / not claimed

- Real iOS/Android device testing (only desktop-Chrome emulation at 390×844 @2).
- Firefox / Safari (only Chrome was available through the harness).
- Forced-GC heap snapshot diff and a long-duration soak; see §5.
- Real hidden-tab behaviour (the handler path was exercised synthetically; the
  actual OS/browser tab switch was not reproducible in headless Chrome).
- Font-failure fallback was exercised by aborting every `/marcellus.ttf`
  request in Playwright (3 blocked attempts): the page stayed in `built` with
  the complete line art visible, the status read
  `OBJECT COULD NOT SETTLE — R TO RETRY`, `letters = 0`, no page errors, and
  `R` retried the load. Recovery after the font returns was not tested.
- Frame pacing under a heavy CPU load has not been profiled with DevTools.
