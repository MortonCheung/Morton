# Design decisions — A3 premium-tech opening

## 1. Type

**Chosen: Jost, pinned at `wght=500` (static instance).**

- Jost's circular O, pointed M and straight-cut N read as *geometry*, not as a
  UI font; that supports "precise, calm, product-launch".
- At the shipped size (cap height ≈155 px at 1440) the 400 weight was too thin:
  the first screenshot read as a delicate fashion mark, and a thin extrusion has
  almost no side wall to catch light. The 500 instance gives the word presence
  without becoming signage.
- Rejected **Sora** (rounder, squarer O, attached R leg — reads "modern SaaS"),
  **Archivo** (industrial grotesque, too signage/CAD-adjacent) and the serif
  pool (belongs to A1/A2 territory).
- The instance is generated from the shared variable TTF with
  `fontTools.varLib.instancer`, retains the OFL copyright/license, and is used
  for both WebGL outlines and the small UI type.

Optical details: cap height normalised to exactly 1.0 world unit; tracking
`0.075em`; a single pair kern `RT −0.006em` (an earlier −0.026em experiment
visibly broke the rhythm into "M ORT ON" and was reverted); the word is centred
on its **ink bounds**, not on advance widths.

## 2. Geometry

- One `ExtrudeGeometry` per **unique glyph** (5 for MORTON). Both O meshes
  reference the same `BufferGeometry`; only their `position` differs. Ownership
  lives in `buildWord`'s `glyphs` map, so no per-letter teardown can free a
  geometry another letter still renders.
- depth `0.30` cap units (≈46 px at 1440), bevel `0.024` with 7 bevel segments,
  `curveSegments` 24. The first build was depth 0.22 / bevel 0.014 — visibly a
  thin plate with a 1-px white outline. Thicker + wider chamfer is what makes the
  edges read as machined metal.
- The bevel flares **outward** by `bevelSize` (measured in a standalone Three
  test); the front cap keeps the original outline. This matters for the drawing
  hand-off (below).

## 3. Same-source drawing

The drawing state is not a separate SVG artwork. `font.ts` emits contours that
feed two consumers:

1. `buildWord` → `ExtrudeGeometry`;
2. `buildDrawPaths` → SVG `d` strings with the **exact same cubic/quadratic
   commands**, projected by the same orthographic numbers used for the camera.

Consequences:

- No contour jump at any frame: during `expanding`, the stroke traces the front
  cap edge while the chamfer flares ~3.5 px outside it, so the solid appears
  *around* the line and the line fades where the polished chamfer begins.
- The projection is affine (`screenX = cssW/2 + x/camW·cssW`,
  `screenY = cssH/2 − (y−camY)/camH·cssH`), so curve control points map exactly —
  no polyline approximation.
- Because the camera is **orthographic**, front cap and silhouette share the
  same screen coordinates; a perspective camera would misalign the carve by
  ~15 px at the word edges during the crossfade. This is the reason for ortho.

## 4. Camera and framing

- Orthographic, 12 units back, camera Y offset so the ink centre sits at 47.5% of
  the viewport (44% on phones). Fill: 66% (≥1600), 72% (1366–1449), 80% (1024),
  86% (820–519), 92% (<520) of viewport width.
- During `drawing`, `built` and `expanding` the camera is **locked** — only
  material and the SVG opacity animate. After `hero`, a 2.6 s ease settles into a
  9° yaw with a −0.5° pitch, then drifts ±0.23° and responds to the pointer by
  ±1°. The rotation only begins when the outline is already gone, so it cannot
  break the line/solid alignment.

## 5. The 500 ms expand

`built → hero` is a material event, not a camera move:

- solid opacity 0 → 1 over 420 ms;
- face roughness 0.58 → 0.50, clearcoat 0.08 → 0.16 (the surface "sharpens");
- environment rotation +0.16 rad, sweeping the softbox highlight across the
  chamfers;
- the stroke fades out over 340 ms starting at 140 ms;
- the silhouette contact shadow and the floor pool fade in;
- chrome and tagline arrive via CSS transitions (no second animation system).

## 6. Material

Two physical materials, split by `ExtrudeGeometry`'s two groups
(`group 0` = flat caps, `group 1` = chamfer + side walls):

| | face (caps) | edge (chamfer + sides) |
|---|---|---|
| color | `#7d8488` | `#d9e1e4` |
| metalness | 0.70 | 1.0 |
| roughness | 0.38 | 0.10 |
| clearcoat | 0.22 | 0.36 |
| normal map | broad satin waviness | none |

This is the difference between "anodised product" and "grey extruded plastic":
the face is quiet and coated, the machined edge carries the crisp highlight.

Procedural textures (no downloads):

- **brushed roughness** — 512² canvas, 72 smoothed columns (vertical brushing)
  plus per-pixel grain, repeat 2×2. Earlier versions used stronger streak
  contrast and read as "brushed steel sheet"/foil; the final amplitude is ±0.045
  around 0.5.
- **satin normal** — broad sine waviness, amplitude computed **per UV unit**
  (an earlier per-texel bug made it a no-op; a 0.032 amplitude then made the
  faces look like crumpled foil — final is 0.012).
- `dithering: true` on both materials kills 8-bit banding from the large area
  lights.

## 7. Lighting and environment

No HDRI download. A purpose-built studio scene is baked once into a 128² PMREM:

- a **vertical gradient wall behind the camera** (6 stacked strips, 2.6 → 0.08)
  — this is what the flat faces reflect, so the face gets a genuine top-to-bottom
  satin falloff;
- a **broad overhead softbox** and a **thin overhead kicker** — the kicker
  reflects straight down onto the top chamfers, producing the single clean
  highlight line;
- a **narrow cool strip left** and a **warm strip right** for edge separation;
- broad **side fills** so the yawed side walls read as graphite, never black;
- a faint floor bounce.

On top of the environment: three `RectAreaLight` softboxes (main upper-left,
low fill below, broad front fill) and two dim directional lights. Area lights are
what create the continuous top-to-bottom gradient on the caps — a directional
light would light a flat face uniformly.

## 8. Backdrop and grounding

- Layered CSS gradients, not a WebGL backdrop: they sit behind the transparent
  canvas, cost nothing, and can be art-directed precisely (diagonal key wash from
  the upper-left, a large elliptical light pool behind the word, a warm bounce
  lower-right, a subtle floor glow, vignette).
- Corners are deliberately not equal (upper-left brighter, lower-right darker),
  so the frame reads as a lit space rather than a flat black panel.
- **No shadow maps.** A front-on floating wordmark has no visible ground plane; a
  shadow map would only project a second ghost word on the backdrop. Grounding
  uses (a) a blurred **silhouette contact shadow** built from the same contour
  data, offset down-right for the upper-left key, and (b) a soft floor pool under
  the ink. Both fade in with `expanding` so the drawing state has no shadow under
  a word that does not exist yet.
- A generated 128×128 grain tile at low opacity with `overlay` blending breaks
  the 8-bit banding of large CSS gradients.

## 9. Performance

- 6 meshes / 5 geometries / 6 draw calls at hero; 33k–47k triangles; one PMREM
  texture + 3 procedural maps.
- Desktop renders at 1.5× DPR (capped at 2), mobile at ≤1.75×. The chamfer against
  a dark ground aliases badly at 1×, and a small supersample is cheaper and
  cleaner than adding a post-process AA pass.
- No post-processing, no bloom, no real-time shadows, no HDRI.
- `frameloop="never"` while the document is hidden.
- Mobile uses a 64² PMREM bake.
- Replay kills and rebuilds only GSAP timelines; geometry, materials, textures
  and the environment are reused.

## 10. Iteration log (what actually changed and what was observed)

| # | Variable | Before | After | Kept? |
|---|---|---|---|---|
| 01 | font weight | Jost 400 | Jost 500 instance | yes — 400 was too thin for a metal extrusion |
| 02 | thickness / bevel | depth .22, bevel .014 | depth .30, bevel .024, 7 segs | yes — edge becomes a chamfer, not a 1px line |
| 03 | env structure | uniform front fill | vertical gradient wall + kicker | yes — face gains a continuous falloff |
| 04 | normal map | per-texel gradient (no-op) → 0.032 | per-UV slope, 0.012 | yes — first was invisible, second was foil |
| 05 | roughness map | random noise | 72-column vertical brushing | yes after 3 amplitude reductions |
| 06 | material split | single material | caps satin / chamfer polished | yes — biggest "product" gain |
| 07 | lighting | 3 directional | 3 `RectAreaLight` + 2 directional | yes — area falloff gives the face gradient |
| 08 | key direction | centred | upper-left, shadow offset matches | yes — asymmetry reads photographic |
| 09 | camera | locked front | 9° settle after hero only | yes — shows thickness without breaking alignment |
| 10 | backdrop | single radial | diagonal wash + pool + floor glow | yes — corners now differ |
| 11 | shadow | 18px halo @0.4 | silhouette @0.24, 14px, offset | yes — no more sticker halo |
| 12 | DPR | 1× | 1.5× desktop | yes — kills chamfer stair-stepping |
| 13 | kerning | RT −0.026em | RT −0.006em | reverted — −0.026 broke the word into "M ORT ON" |

## 11. Rejected approaches

- **Perspective camera** — misaligns the outline/solid crossfade.
- **Real-time shadow maps** — no visible ground; would produce a ghost word.
- **Mirrored floor reflection** — physically implausible with a front-on camera
  at the word's height; would read as a sticker reflection.
- **Bloom / UnrealBloom** — risks the "泛滥发光" prohibition and adds a post
  chain for a small highlight gain.
- **HDRI environment** — a 4k HDRI would fight the neutral graphite palette and
  cost download + memory for a soft, controlled look.
- **`@react-three/drei`** — one camera and six meshes do not justify a large
  helper dependency; it was removed from `package.json`.
- **Per-vertex morph between line and solid** — unnecessary and fragile when a
  crossfade of exactly aligned layers already reads as continuous.
- **Fake progress percentage / progress bar** — explicitly prohibited.
