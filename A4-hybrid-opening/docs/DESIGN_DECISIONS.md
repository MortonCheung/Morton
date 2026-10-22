# Design decisions — A4 Hybrid Opening

The brief: luxury-house first, premium-tech second, sculpture as support — one unified
form/light/motion language, not three skins. The three references each solve **one** problem here:

| Reference | The one problem it solves | Where it shows |
|---|---|---|
| Luxury house | **Precision and ritual** — a release that unfolds with restraint | Marcellus Roman capitals, 1.04 s drawn reveal, staggered build, quiet chrome |
| Premium tech | **Order and control** — nothing decorative, everything has a reason | Long 24° lens, exact timings, one accent, no particles/glow, render stops at rest |
| Sculpture / display | **Volume and display** — the object has thickness and a place | 0.24-unit extrusion, 0.02 bevel, contact + directional shadow, floor pool, 3/4 reveal |

## 1. Typeface: Marcellus (SIL OFL 1.1)

- Cormorant/Bodoni were rejected for the 3D pass: their hairlines are thinner than a safe bevel and
  would either self-intersect or force a bevel so small the edge loses its light.
- Marcellus is an inscriptional Roman face: high-status without being a fashion logo, thick enough
  for a real bevel, and its slightly narrow caps hold a long wordmark.
- Only one font file ships (46 KB); the caption reuses it via `@font-face` for a serif/sans contrast
  with the system-sans chrome. Licence and copyright are in `public/fonts/OFL.txt` and the README.
- Tracking is 0.09 em: Roman capitals need air, but a wider track would make the word read as a
  masthead rather than an object.

## 2. Form

- **One ExtrudeGeometry per glyph.** M/O/R/T/O/N all have real holes where the face has counters
  (both O, R). The two O meshes reference the *same* geometry instance, with independent Object3D
  transforms. This is proved at runtime (`extra.twoO.shared`, identical UUIDs) and in QA.
- Dimensions: cap height 0.70 em, depth 0.24 (≈34 % of cap height), bevel 0.02 × 4 segments. The
  deeper bevel is what makes the edges catch a second, cooler light and reads as a machined edge at
  150 px cap height. Depth was reduced from 0.28 to 0.24 once the camera went to a stronger 3/4.
- Each glyph geometry is re-centred on its own ink bbox for sane per-letter rotation; the baseline is
  preserved by centring Y on cap height, never on the glyph bbox (O overshoots).
- **Optical centring:** the layout is centred on the word's ink bbox, not its advance width. Advance
  width includes tracking and side bearings, which pushed the word ~4 px left on a 390 px screen.

## 3. Surface and light

The first rounds were the classic failure: either chalk-matte or a uniform cream wash. The decisive
discovery was to **measure** which longitude band the flat faces actually reflect, using a
colour-banded probe environment, then place the studio light inside that band.

- Generated equirect environment (1024×512, no HDRI download): dark room, a warm-to-dark sweep placed
  at the measured face band, three narrow specular strips, a high softbox for the top bevels and a low
  bounce for the under-bevels. Sides sample the dark half and stay in shadow.
- Base surface: `#c9beae`, metalness 0.38, roughness 0.28, clearcoat 0.8, clearcoat roughness 0.10,
  env intensity 1.8, ACES tone mapping at exposure 1.0. Mid-way between mirror and chalk, which is
  exactly the “restrained champagne” the brief asks for.
- Directional key (warm) from front-left, cool rim from back-right, low fill. The env does the
  material work; the directionals establish direction and the light on the bevels.
- Shadow: a tight blurred **contact shadow** (drei ContactShadows, 512) carries the "touching" read,
  plus a **directional cast shadow** for a clear offset direction. Both are cheap and only render
  while the opening pump is running.
- Background: CSS showroom gradient (wall pool + floor falloff + vignette + grain) with a 3D floor
  pool and shadow. Three perceptible layers, none of them an image.

## 4. Camera and composition

- 24° lens: a long lens keeps the wordmark from wide-angle distortion; at 1440 the word occupies
  68–72 % of the width (raised to ~71–72 % after review), centre at ~47 % height.
- Draw pose is frontal; the hero pose is a shallow 3/4 (≈10°, with a slight top-down tilt) so the
  extrusion and the top bevel reveal. The camera eases over the full 480 ms expand.
- The word's centre is placed just above optical centre, leaving the floor/shadow and chrome room.

## 5. Motion

- Timings are constants in `src/lib/openingConfig.ts`: 290 ms per letter, 150 ms stagger → 1040 ms
  timeline; 480 ms expand. Drawing is measured start-to-`built`, not estimated.
- Drawing is SVG dash-offset animation from the same contours as the mesh, so the final outline is the
  exact silhouette. The outline is projected onto the 3D front-face plane with a live camera matrix.
- Expand: outline fades in 200 ms while each letter eases forward on Z (10 ms stagger) and the shared
  material transitions from dark/rough to champagne, plus a slight key-light lift. No vertex morph
  is needed; alignment prevents the jump.
- After `hero` the pump stops. There is no idle drift: a release still is the point, and the machine
  is shared with four other prototypes.
- Chrome appears in three beats (label during the build, caption on materialise, cue at rest);
  `REPLAY` is only enabled at rest.

## 6. Iteration log (what changed, what was observed)

| Round | Variable | Before | After | Kept |
|---|---|---|---|---|
| 01 | first full render | beige letters, smeared shadow, brown floor band | structure works; surface and shadow weak | structure yes |
| 02 | material/lights | flat cream, hard shadow | more depth, finer bevels | yes |
| 03 | front softbox + contact shadow | uniform cream | softer ground, but still flat | partly |
| 04 | narrow strips | bronze, dull | directional value, still muddy | yes |
| 05 | generated env + measured band | muddy olive | controlled light sweep, readable bevel | yes |
| 06 | deeper bevel + backdrop | flat edges | precise rim light, wall pool | yes |
| 07 | 73 % width, tighter shadow, quieter chrome | see final screenshots | | |

## 7. Final self-assessment (honest)

- Most successful: the edge/bevel light on the serif caps; the staged build rhythm; the quiet chrome
  hierarchy.
- Weakest: flat faces cannot show a vertical material gradient (physics), so the letters still read
  closer to satin stone than to polished champagne under the current environment. A brushed
  anisotropic map or an HDRI would be the next step, but was deliberately avoided (no external
  assets, and a mirror finish is excluded by the brief).
- The biggest risk for review: the word, though precise, may feel more like a title card than a
  "designed object" until the composition's floor and reflection layers are fully dialled in.
- Unverified: sustained 60 fps on a real GPU/phone, and any memory claim beyond the sampled heap and
  constant geometry counts.
