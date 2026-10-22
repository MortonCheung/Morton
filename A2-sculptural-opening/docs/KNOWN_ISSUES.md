# KNOWN ISSUES — A2 Sculptural Opening

> Nothing here is hidden. Items that were not actually measured are marked **UNVERIFIED**,
> not described as working.

## 1. Renderer-internal textures remain after dispose (OPEN)

After `dispose()` the owned registry is all zero, listeners are zero, the canvas is removed and
`renderer.info.memory.geometries` is 0 — but `renderer.info.memory.textures` was still **3** in the
verification snapshot. Light shadow-map disposal was added after that run, so the post-patch number
is **UNVERIFIED** (could be 1–2 internal allocations: shadow map / PMREM-related targets / default
textures). Do not claim "all GPU textures released"; the honest statement is "all owned resources
released; renderer texture count still shows a small residual". Next step: enumerate
`renderer.properties` texture keys or run a WebGL memory snapshot.

## 2. Cold dev-server boot can push absolute `heroAt` beyond 2000 ms

The designed animation is 1650 ms (draw 1150 + expand 500) and measured 1658–1693 ms in warm
captures; absolute `heroAt` after navigation was 1901–1999 ms in all five final capture views.
The Lead's cold run (drawingAt=993, heroAt=2672) shows the **real Vite dev module + TTF boot**,
not an artificial delay. The brief allows real asset waiting; this is attributed, not hidden.
Production preview cold boot was not measured → **UNVERIFIED**.

## 3. Final five-view capture blocked by the shared browser lock; evidence-set version gap

The final `--no-video` recapture was attempted after the 0.14 beveled base / targetX / 1150 ms draw
tuning and **failed with `browser lock timeout (/tmp/morton-browser-gate)`** (the lock was held by
another prototype for >20 min). Consequences:

- `desktop-1440.png` **is** from the final code (real single-frame shutter at 1440×900).
- `desktop-1920.png`, `laptop-1366.png`, `tablet-1024.png`, `mobile-390.png` and
  `A2-opening.webm/.mp4` are the 04:20 build (complete, valid evidence, but pre-tuning base/camera).
- Post-tuning probe timings and a final five-view overflow/console sweep are **UNVERIFIED**.
Re-running the capture when the machine lock is free is the next step; nothing was faked or
substituted except the disclosed 1440 final-code frame.

## 4. Only headless Chrome was tested

All browser evidence is system Chrome 155 via `playwright-core`, headless, with SwiftShader/ANGLE
fallback flags. Safari, Firefox, real iOS/Android devices, touch scrolling and mobile Safari
`100svh` behaviour are **UNVERIFIED**.

## 5. Performance evidence is coarse

No Chrome DevTools performance trace, no GPU timer query, no WebGL memory snapshot, no long
session (>5 replays). Heap numbers come from `performance.memory` (noisy, 42–51 MB across reloads).
No formal FPS measurement on a real GPU. The 8 GB shared machine makes absolute performance
comparisons unreliable.

## 6. No WebGL context-loss recovery

If the GPU context is lost, the page shows the fatal panel with a RELOAD button; there is no
`webglcontextrestored` re-initialisation. Acceptable for a prototype, not for production.

## 7. Visual caveats

- The letters can still read as machined/silver metal rather than cast mineral at 1440; the
  roughness/bump tooth is subtle. A coarser normal map is the next material experiment.
- The scene is intentionally dark; on a low-brightness or uncalibrated display the floor/wall
  separation can collapse. The wall halo and floor fill were tuned on a calibrated screenshot.
- The wall is a smooth sweep with no architectural detail; the "exhibition space" reading depends
  on the light pool, base shadow and vignette. No full room/set dressing was added (scope).
- The idle camera drift is ±0.43° and starts 1.6 s after hero. It is intentional; reduced-motion
  removes it entirely.

## 8. Typography / content

- Marcellus has one weight only; hierarchy is carried by size, tracking, case and colour.
- No i18n; the chrome/sentence are English. The page language is `en`.
- No audio track; the recording is silent.
- The copy is placeholder-safe (no fake awards or credentials).

## 9. Accessibility not fully audited

There is a real `<h1>` (screen-reader only), `aria-live` state line, a focusable replay button with
`aria-label`, and a fatal `role="alert"`. But no full screen-reader pass, no automated axe run, no
measured colour-contrast ratios, and the canvas is `aria-hidden` with no textual equivalent of the
visual composition. **UNVERIFIED**.

## 10. Debug handle retention

`window.__MORTON_DEBUG__` intentionally stays reachable after dispose so the automated lifecycle
test can read the final counts. It holds JS references to the (disposed) scene object but no GPU
resources. This is a test surface, not part of the public experience.
