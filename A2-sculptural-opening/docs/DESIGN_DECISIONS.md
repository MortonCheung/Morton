# DESIGN DECISIONS — A2 Sculptural Opening

## 1. The intended object

Six letters are treated as **one designed cast series on a low museum base**, not as thick type.
The scene is a dark, lit exhibition space: a seamless sweep, one key spot, a cool rim, a warm-neutral
wall wash, a beveled dark base and a low 3/4 camera. The mark is shown being *made*: contour, then
volume, then a settled hero.

## 2. Font — Marcellus (SIL OFL 1.1)

Chosen from the shared font pool for its inscriptional Roman serif: narrow enough for six letters,
with real thick/thin modulation and a calm, institutional, award-like voice. Bodoni was rejected as
too fashion/editorial; Jost/Sora/Archivo as too tech. Only one weight ships, so hierarchy is carried
by size, tracking, case and colour instead of extra weights.
License: copyright 2012 Brian J. Bonislawsky DBA Astigmatic (AOETI), SIL OFL 1.1,
full text in `public/fonts/OFL.txt`.

## 3. Geometry and ownership

- `opentype.js` parses the TTF; each distinct glyph becomes one `ExtrudeGeometry`
  (depth 0.36 em, bevel 0.021 em, 5 bevel segments, 20 curve segments, tracking 0.07 em).
- The **two O meshes share exactly one geometry instance**; each has its own mesh, material,
  position and rotation. `extra.letterGeometryIds` proves it: 6 ids, 5 unique, `ids[1] === ids[4]`.
- A `ResourceRegistry` owns every geometry/material/texture/render-target and disposes each exactly
  once. Meshes never dispose shared resources. Light shadow maps are disposed explicitly.
- Raw Three.js (not R3F) was chosen so there is exactly one renderer, one RAF and an auditable
  dispose path. `@react-three/fiber` and `@react-three/drei` were removed as unused.

## 4. Construction animation (not a loading bar)

State machine: `loading → drawing (≥1000 ms) → built → expanding (~500 ms) → hero`.

Per letter, in M→O→R→T→O→N order:
1. **Contour draw** (260 ms): the zero-width line is built from the *same* contour points that
   produced the extrude geometry. There is no SVG/3D mismatch to jump.
2. **Volume growth**: the mesh is hidden until its turn, then its thickness grows from 3.5 % to 100 %
   while the back face stays pinned; a small vertical seat and a decaying cast-heat tint sell the
   material coming up. The contour fades as the solid reaches the front plane.
3. **Stagger** 110 ms; total timeline 1150 ms (`drawing` measured ≈1147–1165 ms).
4. **Expand** 500 ms: camera azimuth 8° → 17° (reveals the side thickness), radius to fit, contact
   shadow completes; then a 2.2 s settle to 16.2° and a ±0.43° idle drift.
No percentage, no progress bar. The state sentence is honest: `FORMING THE MARK` → `MATERIALS SETTLING`
→ `SETTLING THE FORM` → `SIX LETTERS, HELD IN ONE LIGHT.`

## 5. Real asset gate

The critical visual asset is the authored mineral tooth map (`mineral-tooth.png`) sampled by all six
letters as roughness + bump. `createCriticalAssets` starts a real network load at construction and the
gate waits for the image. The built state holds if it is late; `expandingAt` is then a direct function
of the real network response. This was proven with a Playwright route delaying the image 2500 ms:
`builtAt=1459`, `expandingAt=2747`, `heroAt=3243` (1288 ms hold), no early hero.

The TTF is also a real wait, but it is required to build the geometry; it is part of the 374–993 ms
pre-draw boot, not an artificial pause. There is no `setTimeout`/fake progress before `drawing`.

## 6. Lighting and material

- Procedural PMREM environment from four emissive softboxes (no HDRI download, no huge texture).
- **Key:** warm-neutral spot (430→240 over the tuning rounds), high front-left, the only shadow caster,
  2048² desktop / 1024² mobile, tight shadow camera; frozen after the opening.
- **Rim:** cool spot from behind-right, narrow, to separate the mineral from the wall.
- **Wash:** warm-neutral spot on the distant cyclorama — a lit wall, not a void.
- **Foreground fill:** broad, shadowless, to keep the near floor readable under the low camera.
- **Sweep:** `MeshLambertMaterial`. A PBR floor produced a bright grazing-Fresnel line at the cove
  tangent that read as a shelf edge; the diffuse sweep removed it with no visual loss.
- **Letters:** `MeshPhysicalMaterial`, base #34383b, metalness 0.22, roughness map effective ≈0.4–0.5,
  clearcoat 0.16, subtle per-letter tint/roughness variation so they read as a cast series.
- **Base:** 0.14-unit beveled slab (12 mm radius), near-black, sized from the word + 0.18 em margin.
  It is deliberately a low display base, not a trophy plinth.

## 7. Camera and composition

- 28° long lens, 3/4 azimuth ≈16°, elevation −1.2° (slight upward gaze), target 5 % below optical centre.
- Fit to **base width** at 75 % desktop / 80 % tablet / 90 % mobile, so the base is never clipped and
  the mark stays inside 58–76 % of viewport width on desktop. Horizontal target offset 0.12 units puts
  the visual mass on the frame centre; measured word centre ≈725/1440 at 1440×900.
- Reduced motion: no draw/expand/drift, state `reduced`, single render on demand.

## 8. Iteration log (each round changed a small set of variables)

| Round | Changed | Observation | Kept |
|---|---|---|---|
| 01 | first render: #77746E material, key spot 420, PBR floor | first shot: cream flat letters, a glowing blue-grey floor band, no grounding; the mark read as thick type | no |
| 02 | deep graphite material, cool palette, deeper hall, Lambert sweep | killed the PBR grazing line and the blue band; scene became a clean dark gallery | yes |
| 03 | display base added, contact shadow, floor fill | letters stopped floating; base initially read as a bright shelf | partially |
| 04 | base darkened/beveled, draw with hidden solids, contour-first sequence | build reads sequentially now; base still too thin / right end near frame | yes |
| 05 | base thickened 0.14 + 12 mm bevel, fit to base width, targetX 0.12, draw 1150 | base fully in frame, mark centred, draw ≈1.15 s, total from nav 1901–1999 ms | yes |

## 9. Rejected / removed

- SVG-only stroke drawing: no volume, fails the sculptural brief.
- HDRI / large textures / Reflector floor: cost without a clear gain in a single 6-letter scene.
- Particles, smoke, bloom, floating UI, CAD guides, star field, blue/purple cyber: explicitly excluded.
- Trophy-like tall plinth or gold trim: rejected; the base is low, dark and architectural.
- Random per-letter rotations: breaks the "one designed series" reading.
- R3F/drei: unused after choosing one explicit Three owner.

## 10. Honest self-assessment

Best details: the same-source contour → volume handoff (no jump), the real delayed-asset hold, and
the restraint of one key light on a dark mineral series.
Weakest detail: at 1440 the letters still read a little more like machined metal than cast mineral;
a coarser normal/roughness treatment would be the next material experiment.
