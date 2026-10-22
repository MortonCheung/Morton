# ISOLATION

**Conclusion: `NO CROSS-PROJECT CODE OR CONTEXT USED`.**

A1 was built in `/Users/morton_cheung/Desktop/AI/Morton/MORTON-experiments/A1-luxury-opening`
only. No file from `A2-sculptural-opening`, `A3-premium-tech-opening`,
`A4-hybrid-opening` or `B1-site-skeleton` was opened, listed, copied, diffed or
referenced. No sibling directory contents were read; no sibling screenshots,
recordings, design notes or Git history were inspected. This repository is its
own `git init` with its own history.

## What was read (complete list)

| Path | Why |
|---|---|
| `MORTON_个人主页_独立Agent施工包_v1.1/01_A1_奢侈品产品展示开场/00_本类总施工手册.md` | A1 brief |
| `…/01_A1_奢侈品产品展示开场/01_分阶段施工步骤.md` | A1 task list |
| `…/01_A1_奢侈品产品展示开场/03_Agent专属提示词.txt` | A1 agent brief |
| `…/01_A1_奢侈品产品展示开场/04_验收清单.md` | acceptance list |
| `…/01_A1_奢侈品产品展示开场/05_设计记录模板.md` | design-log template |
| `…/01_A1_奢侈品产品展示开场/02_代码示例/*` | reference patterns (not copied verbatim) |
| `MORTON_个人主页_独立Agent施工包_v1.1/00_总施工手册.md` | global rules |
| `…/01_独立执行与隔离规范.md` | isolation rules |
| `…/02_明日审稿与验收矩阵.md` | review criteria |
| `…/04_全局工程约束_架构与性能.md` | hard engineering gates |
| `.shared-reference/kit/HARNESS.md` | shared infrastructure (font→geometry pipeline, capture script, font pool) |
| `.shared-reference/fonts/marcellus.ttf` | font asset (SIL OFL 1.1), copied to `public/fonts/` |
| this project's own files | — |

The only material that came from outside this repository is the shared
infrastructure kit the review lead provided for all five prototypes
(`.shared-reference/kit`, `.shared-reference/fonts`) and the A1 construction
document. Neither is another candidate's intermediate work.

## Asset provenance

- `public/fonts/marcellus.ttf` — Marcellus Regular, Copyright (c) 2012 Brian J.
  Bonislawsky DBA Astigmatic (AOETI), SIL Open Font License 1.1. Copied
  unmodified from the shared font pool; not downloaded, not converted.
- Everything else (environment, floor, textures, shadows, copy) is generated in
  code in this repository. No third-party models, HDRIs, images or brand assets.
- No code was copied from a reference website or another candidate.

## Evidence

```bash
# one repository, one history, no remotes
cd MORTON-experiments/A1-luxury-opening && git remote -v   # (empty)
# every tracked path is inside this project
git ls-files | head
```
