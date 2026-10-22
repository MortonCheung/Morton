# Isolation statement — A3 premium-tech opening

Project: `/Users/morton_cheung/Desktop/AI/Morton/MORTON-experiments/A3-premium-tech-opening`

## Result

**NO CROSS-PROJECT CODE OR CONTEXT USED.**

No source file, asset, screenshot, recording, document or design decision from
`A1-luxury-opening`, `A2-sculptural-opening`, `A4-hybrid-opening` or
`B1-site-skeleton` was opened, read, copied or referenced while building this
prototype.

## What was read (exhaustive)

| Path | Purpose |
|---|---|
| `MORTON_个人主页_独立Agent施工包_v1.1/00_总施工手册.md` | global brief |
| `.../01_独立执行与隔离规范.md` | isolation rules |
| `.../02_明日审稿与验收矩阵.md` | review matrix |
| `.../04_全局工程约束_架构与性能.md` | architecture / performance gates |
| `.../03_A3_高端科技产品开场/00_本类总施工手册.md` | A3 brief |
| `.../03_A3_高端科技产品开场/01_分阶段施工步骤.md` | phase checklist |
| `.../03_A3_高端科技产品开场/03_Agent专属提示词.txt` | A3 role |
| `.../03_A3_高端科技产品开场/04_验收清单.md` | A3 acceptance list |
| `.../03_A3_高端科技产品开场/05_设计记录模板.md` | design log template |
| `.../03_A3_高端科技产品开场/02_代码示例/*` (6 files) | reference patterns only |
| `/Users/morton_cheung/Desktop/AI/Morton/.shared-reference/kit/HARNESS.md` | shared technical base |
| `/Users/morton_cheung/Desktop/AI/Morton/.shared-reference/fonts/jost.ttf` | licensed font pool (project-agnostic infrastructure) |

## Disclosures

1. **Directory listing only.** Before the isolation boundary was clear, a single
   `ls -la` was run on `MORTON-experiments/`. It listed the five sibling
   directory names and their sizes. No file inside A1/A2/A4/B1 was opened, and no
   content, filename or design decision from those directories entered this
   project.
2. **Scaffold files.** The A3 directory arrived pre-populated by the shared
   harness (`package.json`, tsconfigs, `vite.config.ts`, `index.html`,
   `src/letters/font.ts`, `src/letters/buildWord.ts`, `src/lib/timeline.ts`,
   `scripts/capture.mjs`, `scripts/capture-b1.mjs`, `docs/RECORDING/.gitignore`).
   These are shared infrastructure, not another candidate's work. `capture.mjs`
   was kept byte-for-byte (its judgement logic untouched). `capture-b1.mjs` was
   B1-specific, unused here, and was deleted as part of workspace cleanup.
3. **Shared infrastructure.** The licensed font comes from
   `.shared-reference/fonts/` (the pool every candidate is given), and the
   machine-wide browser lock `/tmp/morton-browser-gate` is shared with the other
   captures by design. Neither carries project-specific content.
4. **No shared code.** Own `.git` repository (no branches/worktrees shared with
   other candidates), own `node_modules`, own screenshots/recording output.
5. **No copied visual assets.** Every visual element is procedural: glyph
   outlines from the licensed TTF, ExtrudeGeometry, procedural roughness/normal
   textures, CSS gradients, a generated grain tile and an inline SVG favicon. No
   third-party image, HDRI, reference-site asset or brand material is used.
6. **No external reference-site code.** Visual method only; no source, model or
   asset copied from any reference site.

## Verification

```bash
cd /Users/morton_cheung/Desktop/AI/Morton/MORTON-experiments/A3-premium-tech-opening
git rev-parse --show-toplevel   # -> this directory only
git remote -v                   # -> empty (no shared origin)
ls src                          # -> this project's own tree
```
