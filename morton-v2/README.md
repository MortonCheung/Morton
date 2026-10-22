# MORTON V2

The second round of the MORTON personal site: **one art system**, not five competing visual experiments.

> **Current status: Phase 0–4 implemented, `PENDING_VISUAL_APPROVAL` on the art itself.**
> Phase 0 (baseline audit), Phase 1 (art direction + five styleframes), Phase 2 (opening),
> Phase 3 (site skeleton) and Phase 4 (QA evidence) are all delivered. The visuals still need
> the user's sign-off; content is explicit placeholder text.

## What is in here

| Path | What |
|---|---|
| `docs/BASELINE_AUDIT.md` | Phase 0: repo/workspace audit, reusable *mechanisms*, and the visuals that must not be carried over from round 1 |
| `docs/art-direction/` | The art system: direction, reference matrix, typography, colour/spacing tokens, image rules, asset register, review notes, decisions |
| `docs/art-direction/styleframes/` | 15 real browser captures — five frames × 1440×900 / 1440×700 / 390×844 |
| `docs/art-direction/REVIEW.html` | Contact sheet you can open directly (no server needed) |
| `docs/art-direction/wordmark/` | The wordmark generator (single source of truth) + A/B/C comparison |
| `docs/PHASE1_HANDOFF.md` | Phase 1 handover |
| `docs/PHASE23_HANDOFF.md` | Phase 2/3/4 handover: SHAs, decisions, measured results, UNVERIFIED |
| `docs/storyboards/OPENING_SPEC.md` | Opening layer stack, geometry source, state machine, failure paths |
| `docs/qa/` | QA report, opening test report, site flow test, resource lifecycle, frame timings, 46 screenshots, 2 recordings |
| `src/styleframes/` | The five frames as React components + `wordmark.ts` (real path geometry, not a font) |
| `src/design/` | Tokens and the shared layout/typography layer |
| `public/assets/plates/` | Nine 100% original procedurally-generated material plates (clearly labelled placeholders) |
| `scripts/` | Screenshot harness, review-page generator, deliverable checker, plate generator |

## Run it

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
npm run dev          # http://127.0.0.1:5290/
                     #   #/         the site (opening + hero + sections)
                     #   #/review   Phase 1 styleframe index
                     #   #/01-hero-final … individual Phase 1 frames
npm run build        # tsc -b && vite build
npm run typecheck

node scripts/shot.mjs            # 15 styleframe captures -> docs/art-direction/styleframes/
node scripts/review-page.mjs     # rebuild REVIEW.html
node scripts/check-phase1.mjs    # 28/28 Phase 1 deliverable check
node scripts/qa.mjs --no-video   # Phase 2/3/4 evidence -> docs/qa/
node scripts/plates/to-jpeg.py   # regenerate the optimised plates (PNG -> JPEG)
```

## The five frames

| id | Frame | Role |
|---|---|---|
| `00-opening-cover` | Opening cover | Pre-reveal line-art built from the *hero's own* geometry — the Phase 2 master |
| `01-hero-final` | Final hero | The composed surface the opening reveals (wordmark knocked out of a lacquer plate) |
| `02-about-editorial` | About / record | Asymmetric editorial: image bleeding off two edges, 112px display crossing the image edge |
| `03-works-exhibition` | Works exhibition | Dark gallery section; one 64.7vw exhibit + three unequal secondary exhibits + index rail |
| `04-project-focus` | Project focus | Source-to-foreground focus, 2×2 meta table, keyboard-reachable back control |

The live site (`#/`) wraps these in: an opening cover built from the hero's own geometry, the
hero itself, then About / Record / Making / Works (dark exhibition ground) / Next, with a
source-anchored FLIP detail layer.

## Notes on honesty

- No third-party imagery, logos or copy. Reference sites were studied **for their layout grammar only**; their screenshots live in a gitignored `.tmp-ref/` and are not shipped.
- The material plates are **original placeholders**, not photographs of real work. `ASSET_REGISTER.md` and `PLATES.json` say so.
- Nothing here claims to be finished: `UNVERIFIED` items and open risks are listed in `docs/PHASE1_HANDOFF.md` §6–7.
