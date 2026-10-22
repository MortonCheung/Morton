# IMPLEMENTATION PLAN — A2 Sculptural Opening

## 1. Experience target

A single-viewport opening for **MORTON** built as a lit exhibition space, not a black stage.
Six extruded letters behave like one designed sculptural series — real side thickness, bevels,
key light shaping volume, contact shadow and a restrained cool rim. The mark is *formed* on
screen: contour → volume → physical object, then a 500 ms camera settle into a stable hero
composition.

## 2. State machine (probe contract)

```
loading → drawing → built → expanding → hero
        ↘ reduced (prefers-reduced-motion)
```

| State | Meaning | Real condition |
|---|---|---|
| `loading` | renderer + studio built, glyph source not parsed yet | font `fetch` + `opentype.parse` |
| `drawing` | six letters build in M→O→R→T→O→N order, ≥1000 ms | always fully played |
| `built` | drawing complete, waiting for **real** critical assets | mineral texture + contact texture + UI font |
| `expanding` | ~500 ms transition (camera reveal + material settle) | starts the instant assets are ready |
| `hero` | stable final composition, idle camera micro-drift | — |
| `reduced` | static hero, no motion, single render on demand | `prefers-reduced-motion: reduce` |

`window.__MORTON__.timings` records `drawingAt / builtAt / expandingAt / heroAt` with
`performance.now()`. `window.__MORTON__.letters` exposes position / rotation / visible for all six.
`extra.letterGeometryIds` exposes per-letter geometry UUIDs — indices 1 and 4 must match (shared O
geometry) while their transforms stay independent.

## 3. Architecture

```
src/
  app/App.tsx                 page shell, mounts stage, owns no 3D logic
  components/OpeningStage.tsx React ⇄ scene boundary, replay wiring
  components/Overlay.tsx      typographic chrome + state microcopy + replay
  scenes/SculptureScene.ts    owner: renderer, camera rig, RAF, GSAP, listeners, lifecycle
  scenes/studio.ts            sweep geometry, floor, exhibition lighting, environment
  scenes/letters.ts           letter meshes + same-source contour lines (pure factory)
  scenes/materials.ts         mineral material factory (per-letter clone, shared maps)
  scenes/Resources.ts         explicit owner registry: geometry/material/texture/rtt dispose-once
  animation/cameraRig.ts      spherical camera rig (no per-frame allocation)
  animation/openingTimeline.ts draw + expand GSAP timelines (killable, restartable)
  lib/assets.ts               font buffer + critical texture loaders with real failure fallback
  lib/timeline.ts             probe contract (extended for replay run bookkeeping)
  data/copy.ts                UI copy / state labels, separated from animation code
  styles/global.css           layout, chrome, grain, reduced-motion CSS
public/
  fonts/Marcellus-Regular.ttf  SIL OFL 1.1
  textures/mineral-tooth.png   authored tileable roughness/bump map (critical asset)
  textures/contact-shadow.png  authored soft contact shadow (critical asset)
```

**Why raw Three.js instead of R3F:** one scene, one owner, explicit dispose path and a single RAF.
It makes the resource-lifecycle gate demonstrable (`__MORTON_DEBUG__.stats()` after dispose) and
avoids unused `@react-three/fiber` / `@react-three/drei` dependencies, which were removed.

## 4. Build animation design

- **Same source**: contour lines are sampled from the exact `opentype` contours that produced the
  `ExtrudeGeometry`; no SVG/3D mismatch, no crossfade of two unrelated drawings.
- **Per letter**: 260 ms contour draw → solid thickness grows from 4 % to 100 % of `depth`
  (back face pinned, front advances toward camera) with a small settle; emissive "cast heat"
  decays to zero; the contour fades as the solid reaches the front plane.
- **Stagger**: M→O→R→T→O→N at 120 ms; total timeline 1150 ms (`drawing` ≥ 1000 ms guaranteed).
- **No fake progress**: only honest state words (`FORMING THE MARK` → the hero sentence). No
  percentage, no progress bar.
- **Expand**: 500 ms; azimuth 6.5° → 13° reveals side thickness; radius settles; material heat
  fully cools; contact shadow strengthens; chrome fades in. No position jump because the solid
  is already at full scale at `built`.
- **Hold**: if critical textures are late, `built` simply persists; the hero is not shown early.

## 5. Camera / composition

- Perspective 28° long lens, 3/4 azimuth ~12°, elevation ≈ −1.4° (slight upward gaze), target
  slightly below the word centre so the mark sits at ~47 % of viewport height.
- Fit width 70 % at ≥1024 px, 86 % at ≤760 px; no horizontal overflow at any tested viewport.
- Hero idle drift ±0.45° over 14 s, amplitude fades in after 2 s; composition returns to stable.
- Reduced motion: no drift, no timelines.

## 6. Performance budget

- 1 WebGLRenderer, 1 scene, 1 camera, ~6 letters + 4 contour line sets (only during drawing),
  1 sweep mesh, 1 contact plane, 1 shadow-casting spot, 1 rim spot, 1 wall wash, 1 fill, env map.
- Shadow map 2048² desktop / 1024² mobile; shadow map frozen after the opening
  (`autoUpdate = false`, updated only while geometry is moving).
- DPR capped at 2 desktop / 1.75 mobile; rendering paused when `document.hidden` or when the
  canvas leaves the viewport; reduced-motion renders on demand only.
- Shared geometry registry disposes unique glyph geometry once; two O meshes reference the same
  instance; per-letter material clones each dispose their own material; shared textures/maps
  dispose once at scene teardown.

## 7. Verification plan

1. `npm run build` (TypeScript + Vite).
2. `scripts/verify.mjs` (real Chrome, machine lock):
   - state order + measured draw/expand/total timings;
   - shared O geometry UUID + independent transform test for M, R, second O;
   - delayed critical texture (Playwright route delay 2500 ms) → must hold `built`, then expand;
   - reduced-motion path;
   - 5 × replay stress (heap, canvas count, geometries, listener count, console errors);
   - `dispose()` → geometry/texture/listener counts return to zero.
3. `npm run capture -- --url http://127.0.0.1:5182/ --name A2-opening` → 5 screenshots,
   webm + mp4, 5 reload heap samples, console/resource audit.
4. Read every screenshot with the image tool, log 5 ugliest points, iterate ≥2 visual rounds
   (type proportions → depth/bevel → material → light/shadow → background → camera → pacing).
5. `git status` review, clean `.tmp`, final commits, record SHA and gates.
