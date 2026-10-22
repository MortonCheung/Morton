# DESIGN DECISIONS

## 1. Typeface — Marcellus (SIL OFL 1.1)

Measured from the actual TTF with `opentype.js` (not estimated):

| Font | cap height / em | O outer ⌀ | O side stroke | word advance (MORTON) | width ÷ cap |
|---|---:|---:|---:|---:|---:|
| **Marcellus** | 0.700 | 0.726 | 0.104 | 4.557 em | 6.5 |
| Bodoni Moda | 0.750 | 0.639 | 0.115 | 4.541 em | 6.1 |
| Cormorant Garamond | 0.625 | 0.668 | 0.064 | 4.343 em | 6.9 |

Chosen: **Marcellus**.

- It is an inscriptional Roman capital (Trajan lineage) — the register of a
  maison plaque or a museum object, not a SaaS wordmark.
- The 0.104 em O side stroke is thick enough to survive a `0.016 em` bevel and
  still hold a specular edge at ~165 px cap height. Didone hairlines (the
  Bodoni direction) would be ~2–3 px wide on screen and shimmer under the
  bevel; the Cormorant stroke (0.064) is the thinnest of the three.
- The 6.5 width-to-cap ratio lets the six-letter word sit at 70–76 % of the
  viewport width while staying ~0.7 of the frame height — a wordmark
  proportion, not a banner.
- Tracking is `0.07 em` (≈ 0.05 world units ≈ 10 px at 1440): enough air for the
  letters to read as individually set, tight enough to stay one object.

License: Marcellus Regular, Copyright (c) 2012 Brian J. Bonislawsky DBA
Astigmatic (AOETI), SIL Open Font License 1.1. See `public/fonts/NOTICE.txt`.

## 2. Geometry

- One `ExtrudeGeometry` **per glyph**, five geometries for six meshes: the two
  O's share one `BufferGeometry` instance and have independent meshes,
  positions, rotation and visibility (verified by
  `letters.secondODiffers` / `letters.firstOUnchanged` and
  `extra.geometry.sharedOGeometry`).
- `depth 0.24`, `bevel 0.016`, 4 bevel segments, 16 curve segments (desktop) /
  12 & 3 (mobile). At 1440 the cap is ~165 px, so the bevel reads as a 2.6 px
  highlight line and the depth as ~40 px of visible wall at the hero angle.
- Depth was raised from 0.20 to 0.24 after round 3: at 0.20 the side walls
  disappeared at the hero angle and the letters read as cut paper.
- The line art is **not** an approximation of the 3D letters. Both come from
  `parseWord()` + `layoutWord()` in `src/letters/font.ts`; the SVG paths are
  generated offline from the same contours and layout (`npm run gen:outline`).
  The runtime re-checks the layout against the generated offsets and reports
  `extra.geometry.layoutMatch`.

## 3. Framing (derived, not per-breakpoint eyeballing)

`scenes/framing.ts` computes the lens distance from the ink width:

```
widthFraction = 0.62 (≥1800px) / 0.70 (≥1200) / 0.74 (≥900) / 0.86 (mobile)
visibleWidth  = inkWidth / widthFraction
visibleHeight = visibleWidth / aspect
distance      = visibleHeight / (2·tan(fov/2))       fov = 26° (long lens)
cameraY       = −(0.5 − 0.475)·visibleHeight         → content centre at 47.5 %
```

The SVG overlay uses the same numbers (`overlayTransform`), so the construction
lines are projected onto the exact z = 0 plane the camera faces. Because the
drawing camera is level and static, that projection is a pure affine scale —
which is why a transform on one `<g>` is enough and why no alignment can drift
on resize.

The hero move is a **10° yaw / 1.6° elevation orbit at 94 % radius**: the lens
pushes in 6 % during the reveal, then arcs slowly to reveal the extruded walls
(2.4 s, `power2.inOut`), then holds with a ±0.5° breathing drift and ±0.22°
pointer parallax on fine pointers. No turntable, no fast rotation.

## 4. Material — one hero finish: satin metal

`MeshPhysicalMaterial`: `color #c6c7c6`, `metalness 1`, `roughness 0.24`,
`envMapIntensity 1`, procedural roughness variation (±7 % fine brushing),
`dithering`.

Why metal and not ceramic: the brief allows one of satin metal / fine ceramic /
premium coating. A **ceramic** pass was rendered (metalness 0, roughness 0.40,
clearcoat 0.5, ivory) and rejected — it read as plaster in this dark studio,
because a dielectric on a dark environment has no shaped reflection to describe
its form. Satin metal gives the bevels their bright edge and the room its
presence.

Reflections are **shaped**, not mirror-like: the environment is a small studio
(see §5) with a soft key box, a long top strip, warm and cool side strips, a
large soft card behind the lens and a warm floor bounce. Roughness stays at
0.24 so those strips read as soft-edged reflections, not as a chrome mirror.

A normal map was tried (hand-finished surface undulation) and removed: at this
display size it turned the faces into mottled stone. Roughness variation is
kept, much subtler.

Rejected lighting experiments: PCFSoft shadow type no longer exists in three
r186 (warning); VSM with `radius 14 / blurSamples 12` is used instead, which
gives a soft contact shadow without a second shadow-catcher pass.

## 5. Studio

- Background: CSS, three gradient layers (warm halo at 45 %, neutral vertical
  sweep, near-black edges) + vignette + 3.2 % static grain to stop 8-bit banding.
- Floor: a **lit disc** (CircleGeometry r = 8) whose alpha dissolves into the
  dark, not a 400-unit plane. At this camera height a plane produces a hard
  horizon line and a brown wash; the disc reads as a pool of light and carries
  the contact shadow in the only lit part of the frame.
- Environment: PMREM from a procedural scene of feathered emissive panels
  (sigma 0.045), generated once in the scene constructor and disposed with it.
- Lights: warm key (directional, shadow-casting), cool rim, faint fill. The
  room is **already lit during the drawing** (base intensities) so the
  background does not pop into existence with the object; the reveal ramps
  key/rim/fill/environment to full.

## 6. Opening rhythm

```
lead            30 ms
letter stagger 170 ms
contour draw   220 ms, +50 ms per extra contour
settle         80 ms
planned draw  1230 ms  (observed 1050–1230 ms)
reveal        560 ms   (observed 558–568 ms)
common total  ~1730 ms
```

Drawing order is M → O → R → T → O → N; within a glyph the outer contour is
drawn before its counter (the O and R draw their bowl before the hole). Each
path uses a real `getTotalLength()` dash, so the pen speed is constant along
contours of different lengths.

A 1050 ms **floor on the observed drawing phase** is enforced independently of
GSAP's clock: if the first GSAP tick lands late (asset work on the main
thread), the completed line art is held until the observed drawing phase is at
least 1.05 s. Nothing is skipped; the phase can only get longer.

The reveal crossfades the line art out over 340 ms while the letters grow
forward from the same plane (z −0.22 → 0, thickness 6 % → 100 %), the material
fades in over 420 ms and the studio comes up. The outline is same-source, so
the silhouette does not jump: the solid appears *inside* the drawn line and
fills it.

No percentage is shown anywhere. The only progress UI is a 92 px hairline whose
scale is driven by the real draw timeline, plus the status word
`FORMING → SETTLING → REVEALING`.

## 7. State machine

`loading → drawing → built → expanding → hero`, or `loading → reduced` when the
user prefers reduced motion. The transitions are written into
`window.__MORTON__.state` and timestamped into `window.__MORTON__.timings`.

- `drawing` may not be skipped when assets are fast (the gate is `Promise.all`).
- `built` is a real state, not a frame: with `?assetDelay=2200` it lasted
  2163 ms until the font request actually finished.
- Replays re-enter `drawing` and write a `runs[]` record; the first-run
  `timings` object is never overwritten (probe contract).

## 8. Reduced motion, visibility, replay

- `prefers-reduced-motion: reduce` (or `?motion=reduced`) renders the terminal
  hero state as soon as the real assets are ready, sets state `reduced`, disables
  the idle drift and pointer parallax, and never runs the draw/reveal timelines.
  A static complete construction line is shown while the assets load.
- `visibilitychange` pauses the render loop and any running timeline, then
  resumes exactly those that were running (a frozen QA timeline is not resumed).
- Replay (button `[data-replay]` or `R`) kills all timelines, resets pose/light
  state without rebuilding GPU resources, and replays the full draw + reveal.
  Three consecutive replays were measured: 1224 / 1226 / 1219 ms draw,
  567 / 566 / 566 ms reveal, one canvas, no console errors.

## 9. Quality tiers

| | desktop | mobile (<768 px) |
|---|---|---|
| DPR cap | 2 | 2 |
| shadow map | 1024 | 512 |
| curve segments | 16 | 12 |
| bevel segments | 4 | 3 |

Measured at 1440: 16 draw calls, ~124 k triangles, 8 programs, 60 fps.
Mobile 390×844 @2: ~75 k triangles, 512 shadow map, 60 fps in emulation.

## 10. Refinement round (review feedback)

**Face sheen.** `normalizeLetterUV()` in `letters/buildWord.ts` rewrites each
glyph's UVs to 0–1 across its own bounding box (ExtrudeGeometry's default cap
UVs are world-space and would tile any texture across the word). The material
then uses two *smooth* generated maps — a normal sweep (nx ±0.47, ny ±0.17) and
a roughness gradient (0.82 → 1.0, plus 1.8 % vertical brushing) — with
`normalScale 0.7`. This produces a continuous bright→mid→dark ramp on every
face instead of a flat tone, without the mottled look of the earlier 2D noise
normal map. The sweep is intentionally per letter; a world-space sweep was
rejected because it would leave the M nearly uniform.

**Contact shadow.** `createContactShadowTexture()` fills the *same* outline
paths (scaled from `OUTLINE.ink`) into a canvas, blurs them twice and maps the
result to a transparent plane at `floorY + 0.0025` (renderOrder 2). The floor
was raised from −0.52 to −0.38 so the letter bases sit 0.02 world units above
it (≈4 px). The VSM shadow from the key light stays for direction; the contact
plane is what makes the object read as placed.

**Framing.** `centerYFraction` 0.475 → 0.47 (ink centre 423 px / 900), and the
width fractions were reduced (desktop 0.70 → 0.66) so the lens is not too wide;
the bottom of the frame now carries the floor falloff + contact shadow instead
of empty black.

## 11. QA-only surfaces (documented, off by default)

`?assetDelay=<ms>` delays the real font response, `?freeze=built|mid|handoff`
pauses after the draw / mid-reveal / at the line-to-solid handoff,
`?motion=reduced` forces the reduced path, `?debug=1` exposes
`window.__MORTON_DEBUG__` (nudge one letter, read stats). None of these alter
the default opening; they exist so the acceptance paths can be exercised in a
real browser. See `docs/TEST_REPORT.md`.
