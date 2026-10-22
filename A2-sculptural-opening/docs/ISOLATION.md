# ISOLATION — A2 Sculptural Opening

## Verdict

```
NO CROSS-PROJECT CODE OR CONTEXT USED
```

## What was read

| Path | Why |
|---|---|
| `MORTON_个人主页_独立Agent施工包_v1.1/00_总施工手册.md` | global brief |
| `MORTON_个人主页_独立Agent施工包_v1.1/01_独立执行与隔离规范.md` | isolation rules |
| `MORTON_个人主页_独立Agent施工包_v1.1/02_明日审稿与验收矩阵.md` | review matrix |
| `MORTON_个人主页_独立Agent施工包_v1.1/04_全局工程约束_架构与性能.md` | architecture / performance hard gates |
| `MORTON_个人主页_独立Agent施工包_v1.1/02_A2_雕塑陈列开场/**` | A2 manual, steps, prompt, checklist, design template, code examples |
| `.shared-reference/kit/HARNESS.md`, `.shared-reference/kit/scaffold/**` | shared, neutral infrastructure kit (explicitly provided to all five prototypes) |
| `.shared-reference/fonts/marcellus.ttf` | shared, SIL OFL 1.1 font pool |
| `A2-sculptural-opening/**` | this project only |

## What was not read

- `MORTON-experiments/A1-luxury-opening/` — not opened, not listed, not copied.
- `MORTON-experiments/A3-premium-tech-opening/` — not opened, not listed, not copied.
- `MORTON-experiments/A4-hybrid-opening/` — not opened, not listed, not copied.
- `MORTON-experiments/B1-site-skeleton/` — not opened, not listed, not copied.

No code, screenshot, recording, design decision, temporary file, `node_modules`, or build cache
was taken from any sibling prototype. The only shared inputs are the neutral kit and the font pool,
which are the common technical baseline, not another candidate's result.

## Shared infra used (and why it does not break isolation)

- React 19 + Vite 8 + TypeScript 5.9 scaffold, provided by the Lead.
- `src/letters/font.ts` (TTF → per-letter outline) and `src/letters/buildWord.ts` (independent
  `ExtrudeGeometry` per letter), provided by the kit. `buildWord.ts` was extended locally so
  repeated glyphs (the two **O**s) share one geometry instance; no sibling project was consulted.
- `src/lib/timeline.ts` probe contract, provided by the kit and extended locally.
- `scripts/capture.mjs`, provided by the kit; its judging/output logic was **not** modified.
- `docs/ISOLATION.md` conclusion checked at delivery time: `git status` contains only this
  directory, and no file outside `A2-sculptural-opening/` was created or modified.

## Cross-project contamination log

None. No accidental read of a sibling project occurred during this build.

---

Recorded by the A2 owner agent. If this statement ever becomes untrue, the fact must be added
here instead of being silently dropped.
