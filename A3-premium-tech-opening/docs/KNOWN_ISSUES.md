# Known issues — A3 premium-tech opening

Honest list, ordered by how much a reviewer is likely to notice.

1. **Cold navigation can still drop frames.** The PMREM environment bake is a
   synchronous main-thread job. It was moved behind two animation frames and
   reduced to 64 px; the authored 1155 ms drawing then measures ~1126 ms. On the
   very first navigation of a cold browser session the bake can still cost
   ~100–200 ms, so the drawing may visibly hitch once. Warm runs (replay,
   subsequent loads) are clean. Not hidden: the first full-capture run shows it
   (1673 ms drawing) before the fix; the post-fix measurement is 1126 ms.

2. **Evidence screenshots are headless.** They were captured with system Chrome
   in headless mode at DPR 1.5 (desktop) and 1.75 (mobile). A real display may
   render the thin chamfer marginally crisper. The delivered screenshots are
   real renders, not mockups, but the exact anti-aliasing is environment-specific.

3. **The recording predates the bake-timing fix.** `A3-opening.mp4`/`.webm` were
   recorded with the same visual design (only the environment bake resolution
   changed 128 → 64), but the recording was not redone after that timing fix,
   per the throughput instruction to reuse a playable recording.

4. **Bundle size.** 1.64 MB minified JS (502 KB gzip) for a single opening
   sequence, dominated by Three.js + R3F. No code splitting; the scene is one
   canvas. Vite prints its 1200 kB advisory.

5. **`?delayAsset=<ms>` ships in the production bundle.** It is a QA hold applied
   only to environment readiness when explicitly passed; the default route never
   reads a progress value and the app never invents percentages. Documented in
   the README.

6. **No real-time shadow maps.** Deliberate (see DESIGN_DECISIONS §8): a front-on
   floating wordmark has no visible ground plane, and a shadow map would only
   produce a ghost duplicate. Grounding uses a blurred silhouette contact shadow
   from the same contours plus a soft floor pool. A reviewer who expects a
   physically cast shadow will notice its absence.

7. **The R is Jost's Futura-style R.** Its leg is a separate diagonal stroke with
   a triangular notch against the bowl. At 3× zoom the bright chamfer on the
   leg's inner edge is noticeable. This is a type-design risk, not a geometry
   bug; switching family would change the identity of the whole wordmark.

8. **Mobile is tight at 390 px.** Word fill is 92% of the viewport; there is no
   horizontal overflow (measured 0), but the N sits close to the right edge.
   The replay button hides its text label at ≤420 px (icon only, `aria-label`
   remains).

9. **Memory evidence is not a leak proof.** Five JS heap samples per capture plus
   per-replay counters (`geometries=5`, `textures=6`) were recorded; the heap
   sample series is noisy (40 → 56 → 62 → 75 → 57 MB) and a browser GPU-memory
   profile was not captured. Deep GPU memory is `UNVERIFIED`.

10. **Real hardware and other engines untested.** Only system Chrome on Apple M3
    was used; Safari/Firefox and physical phones are `UNVERIFIED`.

11. **Reduced motion is decided at mount.** The static `reduced` state is verified
    (state, chrome visible, six letters, no drawing timeline), but toggling the OS
    setting *mid-sequence* does not re-enter it; a reload does.

12. **Font fallback is functional, not visual.** If the licensed TTF fails, the
    app renders a CSS fallback wordmark and sets `extra.assetFallback='font'`
    (asserted in the probe). The fallback typography has not been visually
    reviewed in a screenshot.

13. **Full-screen composition is intentionally quiet.** At 1920×1080 the word
    occupies 66% of the width with a large, empty lower third. This is a
    deliberate product-launch composition, but it can read as "too sparse" to a
    reviewer who expects more chrome; all auxiliary information is capped by the
    brief to a small wordmark tag, one sentence and a replay control.
