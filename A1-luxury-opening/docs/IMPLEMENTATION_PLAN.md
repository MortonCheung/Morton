# IMPLEMENTATION PLAN

## 0. What is being built

A single-viewport opening for MORTON: the six letters are first *drawn* as
construction lines, then the completed line art becomes one cast satin-metal
object in a dark studio. It has to run, be watchable, and be recordable.

The engineering goal behind the visuals: **one owner per concern** — one module
owns the WebGL scene, one owns the opening state machine, one owns each
timeline, and data/art-direction constants are separate from all of them.

## 1. Layers

```
src/
├─ app/App.tsx                  entry: installs the probe, renders the stage
├─ components/
│  ├─ OpeningStage.tsx          DOM composition (stage, canvas, overlay, HUD)
│  ├─ OutlineLayer.tsx          SVG construction lines (generated data)
│  └─ MicroUI.tsx               lockup / index / status / replay
├─ hooks/
│  └─ useOpening.ts             the only orchestrator: assets, gate, states,
│                               replay, visibility, probe, cleanup
├─ scenes/
│  ├─ OpeningScene.ts           owns renderer, scene, camera, letters, loop
│  ├─ studio.ts                 environment map, lights, floor disc
│  ├─ framing.ts                derived lens/framing + overlay projection
│  ├─ letterMaterial.ts         the one shared letter material
│  ├─ proceduralTextures.ts     roughness / floor alpha / panel gradients
│  └─ quality.ts                desktop vs mobile budgets
├─ animation/
│  ├─ draw.ts                   construction-line timeline (GSAP)
│  └─ reveal.ts                reveal timeline + hero drift
├─ letters/
│  ├─ font.ts                   TTF → contours, layout, SVG paths
│  └─ buildWord.ts              one ExtrudeGeometry per glyph
├─ data/
│  ├─ wordSpec.ts               word / tracking / extrusion (single source)
│  ├─ outline.generated.ts      offline-generated line art (+ layout)
│  ├─ stageConfig.ts            camera, light, material, timing constants
│  └─ content.ts                copy
├─ lib/
│  ├─ timeline.ts               window.__MORTON__ probe (contract)
│  ├─ assets.ts                 real font fetch + browser font gate
│  └─ qa.ts                     QA-only URL flags
├─ types/
│  ├─ opening.ts                shared data types
│  └─ debug.d.ts                QA-only window surface
└─ styles/global.css            stage layers, HUD, responsive, reduced motion
```

Why this shape:

- `OpeningScene` is the **resource owner**. It is the only file that constructs
  or disposes three.js objects. Animation code never touches a mesh, material or
  light; it tweens `scene.motion`, and the render loop applies that state. That
  gives one writer per property and a single place to audit disposal.
- `useOpening` is the **time owner**. It records the probe timings, enforces the
  asset gate, and is the only caller of the timelines.
- `framing.ts` is the **shared geometry of the composition**: the camera framing
  and the SVG overlay projection come from the same function, which is why the
  line art lands on the plane the camera faces. No second coordinate system.
- `wordSpec.ts` + `outline.generated.ts` are the **shared typography**: runtime
  extrusion and offline line art both call `layoutWord()`.

## 2. Runtime flow

```
mount
 ├─ install probe (loading)
 ├─ create OpeningScene (PMREM environment, lights, floor, loop)
 ├─ layout overlay from computeFrame()/overlayTransform()
 ├─ start draw timeline ────────────────► state: drawing
 ├─ start asset pipeline (real) ────────► fetch TTF → parse → extrude →
 │                                        GPU upload → compileAsync
 │
 ├─ draw completes ─────────────────────► state: built  (hold)
 ├─ assets ready?  (Promise.all) ───────► state: expanding (≈560 ms)
 └─ reveal completes ──────────────────► state: hero (idle drift starts)
```

The gate is literally `Promise.all([drawTimelineComplete, assetsReady])`.
`assetsReady` resolves only after the TTF has been fetched, parsed into
contours, extruded, uploaded and shader-compiled. If it resolves late, the page
sits in `built` with the full line art (tested with `?assetDelay=2200`).

## 3. Phases actually executed

| Phase | Work | Evidence |
|---|---|---|
| 0 | audit, git init, baseline commit, isolation note | `git log` |
| 1 | font choice, contours → per-glyph extrusion, static studio | commit 1 |
| 2 | generated line art, draw timeline, real asset gate, reveal | commit 2 |
| 3 | framing from ink width, driven camera, HUD, reduced motion | inspect |
| 4 | material/light iteration (5 recorded rounds), floor disc, shadow | DESIGN_DECISIONS §4 |
| 5 | build, browser capture, replay/delay/reduced verification, docs | TEST_REPORT |

## 4. Resource ownership

| Resource | Owner | Disposal |
|---|---|---|
| renderer, canvas context | `OpeningScene` | `dispose()` → `renderer.dispose()` + `forceContextLoss()` |
| letter geometries (5) | `OpeningScene.geometries` (Set) | one `dispose()` per instance; the two O meshes share one instance, so disposing per mesh would double-free |
| letter material + roughness texture | `letterMaterial.ts` bundle | `bundle.dispose()` |
| PMREM render target + env texture | `studio` | `envTarget.dispose()` |
| env panels + gradient maps | `studio.disposables` | explicit loop |
| floor geometry/material/alpha texture | `studio.disposables` | explicit loop |
| GSAP timelines | `useOpening` refs | `kill()` before every replay and on unmount |
| render loop | `OpeningScene` | `cancelAnimationFrame` in `pause()`/`dispose()` |
| ResizeObserver | `useOpening` | `disconnect()` |
| keydown / visibilitychange | `useOpening` | `removeEventListener` |
| pointermove / pointerleave | `OpeningScene` | `detachPointer()` |
| stats interval | `useOpening` | `clearInterval` |

Replay never rebuilds GPU resources: `resetForReplay()` only resets pose/light
state, then the same geometry/material/environment are re-animated.

## 5. Replaceable points

- `stageConfig.ts` — camera, exposure, lights, material, timings.
- `wordSpec.ts` + regenerate `outline.generated.ts` (`npm run gen:outline`) to
  change word, tracking or extrusion.
- `studio.ts` — the whole lighting/environment rig is one function.
- `scenes/` is framework-agnostic three.js; the React layer is only
  `OpeningStage` + `useOpening`. Swapping to R3F or another renderer would not
  touch the letter/data pipeline.
