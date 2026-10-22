# Implementation plan — A3 premium-tech opening

Executed 2026-10-22, 03:00–04:4x CST. Status: **implemented and verified**; the
evidence and open items live in `TEST_REPORT.md` and `KNOWN_ISSUES.md`.

## 0. Constraints taken as hard requirements

- State machine `loading → drawing → built → expanding → hero`, drawing ≥1000 ms,
  expanding ≈500 ms, normal total ≤2000 ms.
- Drawing must not be skipped when assets are warm; `built` must hold when the
  real assets are not ready. No fabricated percentages.
- Six independently controllable letters; both O meshes share one geometry
  instance but never a transform.
- Same-source outline and solid (no hand-traced SVG).
- Layered source, explicit resource ownership, full teardown, responsive
  degradation, reduced motion.
- A3 look: precision / calm / restrained product launch; no HUD, no CAD UI, no
  blue-purple cyber, no starfield, no empty white page.

## 1. Phases

| Phase | Work | Result |
|---|---|---|
| 0 | Read A3 + global manuals, harness, scaffold audit, `git init` | done |
| 1 | TTF → contours → shared-glyph ExtrudeGeometry; orthographic framing; probe contract | done |
| 2 | same-source SVG drawing timeline (M→O→R→T→O→N) | done |
| 3 | real asset gate + expand choreography + hero settle | done |
| 4 | visual iteration (font weight, depth/chamfer, material, studio env, backdrop, camera) 16 rounds | done |
| 5 | evidence capture, functional probe checks, teardown review, docs, commits | done |

## 2. Architecture

```
App (composition root)
├─ useFontBuffer('/fonts/jost-morton-medium.ttf')      real network asset
├─ buildWord(buffer, 'MORTON')                          geometry owner (5 glyphs)
├─ useElementSize → computeFrame                         one source of truth for
│                                                        camera frustum + SVG px
├─ buildDrawPaths / buildShadowPaths                     same contours, projected
├─ useOpeningSequence                                   state machine + gate
│   ├─ createDrawTimeline(paths)                        GSAP, 1155 ms
│   ├─ assetsReady (scene PMREM bake + 2 frames)         real gate
│   └─ createExpandTimeline(scene.controls, svg)        500 ms
├─ OpeningScene (R3F canvas)
│   ├─ CameraRig                                        ortho bounds from frame
│   ├─ studioEnvironment (PMREM, one bake)               env owner
│   ├─ letterMaterials (face + edge)                     material owner
│   └─ 6 meshes on 5 shared geometries                   group drift + parallax
├─ ShadowLayer (SVG silhouette contact shadow)
├─ OutlineOverlay (SVG drawing layer)
└─ Chrome / Backdrop / FallbackWordmark
```

### Responsibilities

- **Data**: `src/data/copy.ts` holds every string; no copy inside animation code.
- **Geometry**: `letters/font.ts` parses TTF; `letters/buildWord.ts` creates one
  `ExtrudeGeometry` per unique glyph and lays out the word optically centred.
- **Projection**: `lib/frame.ts` computes the orthographic frustum and the
  world→CSS mapping; `features/opening/svgPaths.ts` uses the same numbers.
- **Animation**: `features/opening/*Timeline.ts` build pure GSAP timelines;
  `useOpeningSequence` owns their lifecycle and the state transitions.
- **Scene**: `scenes/*` owns all WebGL objects; exposes an imperative API
  (`reset / enterHero / showStatic / snapshot / setLetter / rendererInfo`).
- **UI**: `components/*` render DOM only; they never touch the scene.

### Data flow

```
fetch TTF → parse contours ─┬→ ExtrudeGeometry ×5 → 6 meshes (2 share O geo)
                            └→ SVG path strings (px) → drawing layer
frame (ResizeObserver) → camera frustum + CSS px projection + CSS vars (--word-*)
drawing timeline done → built → assetsReady resolves → expanding → hero
hero: scene drift in useFrame, probe letters snapshotted, no React state per frame
```

## 3. Resource ownership

| Resource | Owner | Released by |
|---|---|---|
| 5 glyph geometries | `buildWord()` result held by `App` | `disposeWord()` on App unmount |
| 2 physical materials + 3 procedural textures | `createLetterMaterials()` | scene unmount effect |
| PMREM environment texture | `createStudioEnvironment()` | scene unmount effect (source bake scene disposed immediately) |
| Renderer / canvas | R3F `<Canvas>` | React unmount (R3F owns it) |
| GSAP timelines | `useOpeningSequence` | killed on replay and on unmount |
| ResizeObserver | `useElementSize` | disconnected on unmount |
| Pointer / visibility listeners | `usePointer`, `usePageVisible` | removed on unmount |
| RAF | R3F loop + `onReady` double-rAF | `frameloop="never"` when hidden; rAF cancelled on unmount |

`dispose={null}` is set on the six meshes so R3F never auto-disposes the shared
material/geometry behind the owner's back.

## 4. Verification plan

1. `npm run build` (tsc + vite) — must pass.
2. `npm run capture` at 1920/1440/1366/1024/390 → screenshots, webm+mp4, console /
   pageerror / resource failures, heap after five reloads.
3. `npm run probe` → state order, measured durations, six letters, shared O
   geometry, independent transforms, five replays, delayed asset, reduced
   motion, font-failure fallback, frame-rate sample.
4. Visual review of every screenshot, at least two corrective rounds (done: 16).
5. `git status` audit, commits, SHA recorded in the final report.
