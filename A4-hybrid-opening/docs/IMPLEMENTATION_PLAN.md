# Implementation plan — A4 Hybrid Opening

Status: **delivered** (run, build, browser review and QA completed; open items in `KNOWN_ISSUES.md`).

## 0. Reading and isolation

Read the five A4 documents, the four global documents and `HARNESS.md`; copied one licensed TTF from
the shared pool. No sibling prototype was opened. Details: `ISOLATION.md`.

## 1. Baseline audit

- React 19 + Vite 8 + TS 5.9 scaffold builds; `window.__MORTON__` contract and `capture.mjs` provided.
- Existing `buildWord.ts` built one geometry per *letter*, so the two O instances were separate
  objects. That is allowed by the brief (“may share geometry”) but sharing is an explicit acceptance
  item here, so the builder was rewritten to build one geometry per **glyph** and to return the
  ownership map.
- The harness probe recorded absolute `performance.now()` values but had no replay reset; a
  `resetTimings()` was added so each replay is measured independently.

## 2. Architect the opening before styling it

Layers, each with one job:

| Layer | Module | Job |
|---|---|---|
| Typeface | `letters/font.ts`, `letters/buildWord.ts` | TTF → contours → per-glyph extrude geometry + SVG path data, from one source |
| Resources | `letters/letterAssets.ts` | own geometry/material, one dispose path, start/end surface identity |
| Scene | `scenes/*` | lights, generated environment, floor, contact shadow, responsive camera, render pump |
| Motion | `animation/openingTimelines.ts` | draw and expand timelines; exact durations; reset/hero snapshots |
| Machine | `features/opening/useOpeningSequence.ts` | states, real gate, replay, visibility pausing |
| Overlay | `features/opening/OutlineStage.tsx` | SVG paths + live camera projection |
| Chrome | `components/BrandChrome.tsx` | label, caption, scroll cue, replay, a11y status |

The mutable `StageRuntime` handle is deliberately not React state: per-frame camera/projection data
must not re-render the tree. React state changes only on the five phase transitions (plus replay).

## 3. Draw-to-solid transition

- Both layers derive from the same `WordOutline`; the SVG paths are serialised from the same
  `Contour` objects that feed `ExtrudeGeometry`, so they cannot drift at the source.
- During `drawing` the 3D letters are hidden. The SVG outline is locked to the 3D front-face plane by
  a matrix derived from the live camera (`applyOutlineProjection`); before WebGL exists the same
  matrix is computed analytically from the draw pose, so the outline can start earlier than the scene.
- `expanding` fades the outline out over 200 ms while the letters ease forward on Z (staggered 10 ms)
  and the shared surface animates from a dark, rough start state to champagne satin. The camera eases
  from frontal to a 3/4 pose over the full 480 ms.
- No vertex morph, no cross-origin geometry, no jump: the outline and front face occupy the same
  projected place at the first expand frame.

## 4. Real gate, not a fake bar

```
gate = Promise.all([document.fonts.ready, two painted frames, scene registered])
drawDone = 1040 ms GSAP timeline
await drawDone → state built
await gate     → state expanding (480 ms) → hero
```

`?gateDelay=3000` delays the real gate (test hook) and is the only way to force the `built` hold.
There is no percentage in the product code.

## 5. Performance / lifecycle decisions

- After `hero`, the render pump (GSAP ticker → `invalidate`) is removed: the resting page performs no
  RAF or GPU work. Replay or resize re-arms a frame.
- `frameloop="demand"` + pump rather than a permanently running loop.
- One directional shadow system is avoided in favour of drei `ContactShadows` (512, updated only
  while the pump runs) + an additive generated floor pool. Mobile disables contact shadows and
  reduces the environment to 128.
- Single shared `MeshPhysicalMaterial`; both O share one geometry; all per-letter transforms are
  Object3D transforms. No per-frame allocations in `useFrame` (scratch vectors are module-level).
- Timelines killed on cleanup; `visibilitychange` pauses/resumes the live timeline; the listener is
  removed with the effect.

## 6. Verification plan (executed)

1. `npm run build` after each visual round.
2. `capture.mjs` for five viewports + webm/mp4 + console/error/overflow/heap.
3. `scripts/qa-check.mjs` for letter independence, shared geometry, delayed gate, reduced motion,
   five-replay stability, console, overflow.
4. Inspect every screenshot with the image reader; extract frames from the recording to inspect
   `drawing`/`expanding`.
5. Record results, commands and residual risks in `TEST_REPORT.md` / `KNOWN_ISSUES.md`; commit twice
   (implementation + delivery evidence) and record SHAs.
