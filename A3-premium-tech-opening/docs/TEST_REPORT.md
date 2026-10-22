# Test report — A3 premium-tech opening

All commands were run from
`/Users/morton_cheung/Desktop/AI/Morton/MORTON-experiments/A3-premium-tech-opening`
on 2026-10-22.

## Environment

| | |
|---|---|
| macOS | 15.7.4 |
| CPU / GPU | Apple M3 (ANGLE Metal Renderer), 8 cores, 8 GB |
| Chrome | 155.0.8059.85 (system Chrome via `playwright-core`, headless) |
| Node / npm | v24.15.0 / 11.12.1 |
| Ports | dev `127.0.0.1:5183`, preview `5283` |

## Build

```bash
$ npm run build
> tsc -b && vite build
✓ 53 modules transformed
dist/index.html                     1.11 kB │ gzip:   0.64 kB
dist/assets/index-BnCaH5B5.css      6.36 kB │ gzip:   2.30 kB
dist/assets/index-D0bRetYj.js   1,644.14 kB │ gzip: 502.24 kB
✓ built in 225ms
exit 0
```

Only warning: Vite's 1200 kB chunk advisory for the Three.js bundle (three core
+ RectAreaLight LTC tables + R3F). Accepted for a single-scene prototype; see
KNOWN_ISSUES.

## Browser evidence (full capture, 2026-10-22 04:20–04:52)

Command:

```bash
npm run capture -- --url http://127.0.0.1:5183/ --name A3-opening
```

All five viewports ended in `hero`, six letters exposed, zero console errors,
zero page errors, no horizontal overflow.

| view | state | drawing (built−drawing) | expanding (hero−expanding) | total (hero−mounted) | canvas | overflowX |
|---|---|---:|---:|---:|---|---:|
| desktop-1920 | hero | 1673 ms* | 549 ms | 2284 ms* | 2880×1620 | 0 |
| desktop-1440 | hero | 1127 ms | 550 ms | 1726 ms | 2160×1350 | 0 |
| laptop-1366 | hero | 1129 ms | 551 ms | 1729 ms | 2049×1152 | 0 |
| tablet-1024 | hero | 1130 ms | 552 ms | 1735 ms | 1536×1152 | 0 |
| mobile-390 | hero | 1135 ms | 551 ms | 1736 ms | 682×1477 (DPR 1.75) | 0 |

\* First navigation of the cold browser session: the PMREM environment bake ran
synchronously on the main thread during `drawing` and stretched the wall-clock
timeline (drawn states are authored at 1155 ms). Every later navigation was
clean at ~1.13 s.

### Fix applied after that capture

The environment bake is now deferred by two animation frames and runs at 64 px
(soft studio reflections do not need more), and the shaders are compiled in that
same deferred step. Re-measured on the latest build at 1440×900:

```
mountedAt 264 | drawingAt 326 | sceneReadyAt 584 | builtAt 1452 | heroAt 2005
drawing 1126 ms | expanding 553 ms | total 1741 ms
```

Screenshots in `docs/SCREENSHOTS/` were refreshed on the delivery build after
this fix: 1920/1366/1024 from a `--no-video` capture pass at 05:30, 1440 from the
`v17` check at 05:48, and 390 from a fresh DPR-2 check at 05:5x
(drawing 1138 ms, total 1689 ms). The timing table above comes from the earlier
full capture, so it documents the pre-fix cold-start behaviour; the latest-build
numbers are the ones immediately above and in `PROBE_CHECK.json`.

### Video

`docs/RECORDING/A3-opening.webm` + `A3-opening.mp4` — 1440×900, recorded from a
fresh reload in the same capture run. Probe timings inside that recording:
drawing **1123 ms** (`drawingAt 249 → builtAt 1372`), expanding **550 ms**
(`expandingAt 1373 → heroAt 1923`), total **1732 ms**. No page errors.

The recording predates the bake-timing fix; the visual design is identical, the
only difference is when the PMREM bake executes (reflections are marginally
softer at 64 px). It was kept rather than re-recorded, per the throughput
instruction.

## Console / resource

- `consoleErrors: 0`, `pageErrors: 0` at every viewport.
- 41 resources, ~14.5 MB transfer (includes the 61 KB font and the 1.4 MB JS;
  the rest is dev-server module graph — production is 397 KB gzip JS + 2 KB gzip CSS).
- No request failures.

## Renderer counters (desktop-1920, hero)

| metric | value |
|---|---|
| draw calls | 14 |
| triangles | 53,484 |
| geometries | 5 (six meshes, both O share one) |
| textures | 6 (PMREM + roughness + normal + grain + internal) |
| shader programs | 2 (face + edge) |
| drawing buffer | 2880×1620 (DPR 1.5) |

## Replay / lifecycle / reduced motion

Five reloads in the capture's leak check:

```
40.19 MB → 56.55 MB → 62.53 MB → 75.11 MB → 56.68 MB
```

Interpretation: allocation rises while the browser fills caches, then drops
below the 4th sample after GC. This is **not** a monotonic leak, but a five-sample
JS heap series is not a memory-leak proof — see KNOWN_ISSUES. Replay-specific
behaviour (timeline teardown, geometry/texture counters, heap) and the
reduced-motion / delayed-asset / font-failure paths are checked by
`npm run probe`; results: `docs/PROBE_CHECK.json`, summarised below.

### Probe check (`npm run probe`) — **23/23 PASS**

```bash
$ node scripts/probe-check.mjs --url http://127.0.0.1:5183/
...
PASS  state order ends at hero  — hero
PASS  timings strictly ordered  — {"drawingAt":223,"builtAt":1351,"expandingAt":1351,"heroAt":1901}
PASS  drawing >= 1000ms  — 1128ms
PASS  expanding 450-700ms  — 550ms
PASS  total <= 2200ms (normal assets)  — 1734ms
PASS  six letters exposed  — 6
PASS  shared O geometry  — unique=5, meshes=6
PASS  letter 0 rotates independently  — M-0
PASS  second O hides independently, first O stays visible  — O-4
PASS  resetLetters restores transforms
PASS  hero frame rate sampled >= 40fps  — 60fps
PASS  replay reaches hero 5/5  — hero,hero,hero,hero,hero
PASS  replay counter tracked  — 5
PASS  geometry/texture counts stable across replays  — 5g/6t 5g/6t 5g/6t 5g/6t 5g/6t
PASS  heap does not grow monotonically over replays  — before=41MB after=43MB
PASS  delayed asset: waits in built state for the real asset promise  — built+410ms -> expanding
PASS  delayed asset: still ends at hero  — hero
PASS  reduced motion path is `reduced`  — reduced
PASS  reduced motion does not run the drawing timeline
PASS  reduced motion still shows the chrome  — opacity=1
PASS  reduced motion still exposes six letters  — 6
PASS  font failure falls back to a readable wordmark, never a permanent loader
PASS  no console / page errors
23 passed, 0 failed -> docs/PROBE_CHECK.json
```

Highlights:

- **Replay x5**: every run reaches `hero`; each replay measures draw 1125 ms /
  expand 566 ms / total 1708–1723 ms; geometry count stays 5 and texture count
  stays 6; JS heap 41 MB → 43 MB (rises and falls with GC, no monotonic growth).
- **Real asset gate**: with `?delayAsset`, `built` is reached at 1360 ms,
  `assetsReadyAt` 1779 ms, `expandingAt` 1783 ms — the solid waited 423 ms in the
  fully drawn state for the real environment promise, then expanded immediately.
- **Reduced motion**: state `reduced`, no `drawingAt` at all, chrome opacity 1,
  six letters present.
- **Font failure**: with every `*.ttf` request aborted, the page ends in `hero`
  with the CSS fallback wordmark visible and `extra.assetFallback='font'`, no
  canvas, no permanent loader.
- **Independence**: rotating M leaves every other letter at rotation 0; hiding
  the second O leaves the first O visible.

One assertion in the first probe run compared the texture count against a stale
constant (expected 4, actual 6) while the per-replay series was already constant.
The assertion was corrected to compare the series and the suite was re-run: 23/23.

## Visual review

Sixteen iteration rounds were captured and inspected at 1440×900 (plus 1920,
1366, 1024, 390). Each round changed one family of variables:

1. type weight (400 → 500) and spacing;
2. depth/bevel (0.22/0.014 → 0.30/0.024, 7 segments);
3. environment structure (uniform fill → gradient wall + top kicker → per-edge strips);
4. material split (single material → satin caps + polished chamfer);
5. lighting (3 directional → 3 area softboxes + 2 directional, key moved upper-left);
6. backdrop (single radial → diagonal wash + pool + floor glow + grain);
7. contact shadow (blurred halo → silhouette shadow + floor pool);
8. anti-aliasing (DPR 1× → 1.5× supersample);
9. camera (locked front → 9° hero settle after the crossfade).

What was rejected after inspection: per-texel normal map (no-op), 0.032 normal
amplitude (crumpled foil), strong brushed streaks (steel sheet), very dark
anodised faces (murky), RT kerning −0.026em (broken word rhythm).

## Four gates

- `ARCHITECTURE_REVIEWED` — **PASS**. Layered: app/composition, features/opening
  (state machine + gates + timelines), letters (geometry), scenes (WebGL),
  components (DOM), lib (math/hooks/probe), data (copy). No component over ~330
  lines; one implementation per concern; no global side channels other than the
  documented `window.__MORTON__` probe contract.
- `WORKSPACE_CLEAN` — **PASS** (verified with `git status` before the delivery
  commit; `.tmp/` gitignored; no stray files outside the project).
- `RESOURCE_LIFECYCLE_REVIEWED` — **PASS**: explicit owners for
  geometry/material/textures/environment; `dispose={null}` on meshes so R3F
  cannot free shared resources behind the owner; timelines killed on
  replay/unmount; observer and listeners disconnected; frameloop paused while
  hidden. Runtime evidence: five replays keep geometries=5 and textures=6 with a
  flat heap trend (`PROBE_CHECK.json`).
- `PERFORMANCE_REVIEWED` — **PASS with caveats**: renderer counters, five
  viewports, five reloads, five replays, a 60 fps rAF sample; deep GPU memory
  profiling and real mobile hardware remain `UNVERIFIED`.

## UNVERIFIED

- Deep GPU memory profiling (no browser GPU profiler capture in this session).
- Real iPhone/Android hardware (viewport + DPR emulation only).
- Safari / Firefox (system Chrome only).
- Font-failure fallback screenshot (functional assertion passes; no screenshot).
- A single capture run that produced both the JSON timing table and all five
  screenshots on the same build: the scheduled 05:30 pass was stopped after the
  screenshots but before it wrote `TEST_REPORT_RAW.json`, so the table above is
  from 04:52 and the screenshots are from 05:30/05:48/05:5x.
- Frame-rate under a real display refresh (headless rAF sample recorded).
