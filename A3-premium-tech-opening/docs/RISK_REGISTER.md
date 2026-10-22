# Risk register — A3 premium-tech opening

| # | Risk | Likelihood | Impact | Mitigation / status |
|---|---|---|---|---|
| R1 | Drawing skipped or shortened when the font is already cached | Medium | High (acceptance) | Authored fixed 1155 ms GSAP timeline; measured 1135–1155 ms across runs. Gate is `Promise.all([drawDone, assetsReady])` by construction. **Verified** (`PROBE_CHECK.json`). |
| R2 | Outline and solid visible at mismatched positions during the crossfade | High if perspective camera | High (visual) | Orthographic camera + one shared projection for both layers; camera locked through `expanding`. **Verified visually** at 1440 and in video. |
| R3 | Both O meshes accidentally share a transform, or one letter's teardown frees the shared geometry | Medium | High (acceptance) | One `ExtrudeGeometry` per unique glyph in a map owned by `buildWord`; meshes are separate Object3D with independent position/rotation; probe check asserts the two O meshes share a geometry UUID and rotate/hide independently. **Verified**. |
| R4 | Replay stacks timelines / grows GPU or JS memory | Medium | High | Replay kills the previous timeline, resets scene controls and material state, and reuses all geometry/textures/environment. Probe checks geometry=5, textures=4 across five replays and samples heap. **Verified** (see `TEST_REPORT.md`). |
| R5 | Asset failure leaves a permanent loading state | Low | High | Font fetch failure path: CSS fallback wordmark, probe state `hero`, `extra.assetFallback='font'`. **Verified** by aborting the font request. |
| R6 | Headless Chrome aliasing makes the chamfer look cheap in evidence screenshots | Medium | Medium (visual review) | 1.5× supersampling on desktop; screenshots are downsamples. Real Chrome renders at device DPR. **Partially mitigated** — see KNOWN_ISSUES. |
| R7 | Machine is shared by five prototypes (8 GB) → occasional slow frame / stretched timeline | High | Medium (timing) | Timeline is time-based; a blocked main thread can extend measured wall time. Reported per-run; the clean video run measured 1135 ms drawing / 551 ms expand. **Disclosed**, not hidden. |
| R8 | Material tuning overfits the 1440 screenshot | Medium | Medium | Checked at 1920, 1366, 1024 and 390; mobile reduces PMREM to 64² and DPR to 1.75. **Verified** at all five viewports. |
| R9 | `?delayAsset` test hook ships in production build | Low | Low | It only adds a hold when explicitly passed; the default route does not read it as a progress source. Documented in README and KNOWN_ISSUES. |
| R10 | No deep GPU memory profiler available | High | Low (evidence) | `renderer.info` counters + JS heap samples + five replays recorded; deep GPU memory marked `UNVERIFIED`. |
| R11 | Real touch device not tested | High | Low for a prototype | Emulated 390×844 at DPR 2 with `viewport-fit=cover`; hardware touch behaviour marked `UNVERIFIED`. |
| R12 | Shared browser lock starvation during final capture | High | Medium (delivery) | Captures queued behind the provided lock; all evidence captured. No second Chrome instance was launched. |
| R13 | Font licence: derivative instance must stay OFL | Low | High (legal) | Upstream is OFL 1.1 with no reserved font name; derivative keeps copyright/licence, is shipped under OFL 1.1, and is documented in `public/fonts/LICENSE.txt` and README. |
| R14 | Workspace pollution by iteration artifacts | Medium | Medium | All iteration output lives in `.tmp/` (gitignored); official evidence only under `docs/`; `git status` audited before delivery. |
