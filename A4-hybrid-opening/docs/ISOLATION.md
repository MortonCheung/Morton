# Isolation statement — A4 Hybrid Opening

## Conclusion

**NO CROSS-PROJECT CODE OR CONTEXT USED.**

## Scope actually opened

| Source | What was read | Why |
|---|---|---|
| `MORTON_个人主页_独立Agent施工包_v1.1/04_A4_融合方向开场/` | all five documents + every file in `02_代码示例/` | assigned A4 manual/prompt/acceptance list/examples |
| `MORTON_个人主页_独立Agent施工包_v1.1/` (root) | `00_总施工手册.md`, `01_独立执行与隔离规范.md`, `02_明日审稿与验收矩阵.md`, `04_全局工程约束_架构与性能.md` | global rules explicitly required by the task |
| `.shared-reference/kit/HARNESS.md` + `scaffold/` | harness facts, font list, probe/capture contract | shared technical base provided by the Lead |
| `.shared-reference/fonts/marcellus.ttf` | copied verbatim into `public/fonts/` | licensed typeface pool (SIL OFL 1.1) |
| `A4-hybrid-opening/` (this repo) | all of it | the project |

The initial `ls` of `MORTON-experiments/` returned the five directory **names** only. No file from
`A1-luxury-opening`, `A2-sculptural-opening`, `A3-premium-tech-opening` or `B1-site-skeleton` was
opened, borrowed, copied, screenshotted or described to this project. No sibling dev server was
touched; only port 5184/5284 are used here.

## What is original to this project

- Typeface choice, material/lighting rig, generated equirect studio environment, camera fit and
  poses, the SVG/3D draw-to-solid transition, chrome layout and wording, the QA harness, and this
  documentation were authored here.
- The scaffold (`src/letters/font.ts`, `src/letters/buildWord.ts`, `src/lib/timeline.ts`,
  `scripts/capture.mjs`) came from the shared harness inside this repo. `font.ts` was extended with
  SVG path serialisation; `buildWord.ts` was rewritten to deduplicate geometry per glyph (so both O
  share one instance) and to expose the ownership map. `capture.mjs` is unmodified.

## Third-party assets

- `public/fonts/marcellus.ttf` — Marcellus by Astigmatic (AOETI), SIL Open Font License 1.1;
  full licence text at `public/fonts/OFL.txt`.
- No HDRI, image, model, video or other external asset is used. The environment map, floor glow and
  grain are generated at runtime (canvas/CSS).

## Runtime data

No network requests other than the app modules and the local TTF. No analytics, no CDN, no remote
fonts.
