# KNOWN ISSUES

Honest list, ordered by how much they matter for the review. Nothing here is
hidden in the report; anything not measured is marked `UNVERIFIED`.

## Visual

1. ~~**The hero frame is good, not jewellery-grade.**~~ **FIXED (refinement
   round).** Each glyph now gets normalised 0–1 UVs and a *smooth* per-letter
   normal sweep + roughness gradient (no noise). The 1440 crop shows a
   continuous bright→mid→dark ramp across the M face (≥3 levels) with no
   mottling. Remaining: the sweep repeats per letter, so the word reads as six
   individually lit objects rather than one hand-polished casting. A single
   world-space sweep is the next experiment, but it would reduce the bands on
   the M.
2. ~~**Contact shadow is a real-time VSM shadow, not a reflection.**~~ **FIXED
   (refinement round).** Added a word-shaped, pre-blurred contact shadow plane
   generated from the *same* outline paths, and raised the floor to 0.02 world
   units below the letter bases (≈4 px at 1440). The VSM shadow is kept for
   direction. There is still no floor *reflection* of the letters.
3. ~~**The floor is an 8-unit lit disc.**~~ **IMPROVED.** The floor is now at
   y = −0.38, the disc reads as a lit stage that the letters sit on, and the
   bottom of the frame has the contact shadow + a warm floor falloff instead of
   dead black. On very wide screens the disc's outer fade is still faintly
   visible at the bottom corners.
4. **Line/solid handoff is aligned, not pixel-identical for the first ~100 ms.**
   The solid starts 0.22 units behind the drawing plane, so at the very start of
   the reveal it is projected ~2 % smaller than the line it replaces, then grows
   forward while the line fades. `docs/SCREENSHOTS/state-handoff.png` shows it;
   there is no jump, but a careful reviewer can see the line sitting a hair
   outside the solid for a few frames.
5. **The wordmark is now ~70 % wide at 1440** (66 % at the built state, ×1.064
   from the reveal dolly) and the optical centre sits at **423 px / 900 =
   47.0 %** — inside the 405–468 px review band. On 1920 it is ~62 %.

## Engineering

6. ~~**Mobile reveal hitch (881 ms expand).**~~ **FIXED.** The reveal used to
   toggle `material.transparent`, forcing a shader recompile on its first
   frame; the material is now transparent for the whole run and mobile measures
   566–567 ms over three runs. Desktop unaffected (564–568 ms).
7. **Dev-server timings are noisier than production.** Cold Vite runs stretch the
   GSAP clock (one capture run: draw 1782 ms, total 2349 ms) because the main
   thread is busy with hundreds of unbundled module requests. Production
   (`vite preview`) is stable at draw 1178–1182 ms / total 1745–1749 ms.
   The 1050 ms observed-draw floor keeps the acceptance floor even on a cold run.
8. **No forced-GC leak analysis and no long soak.** Replay heap delta is
   +0.13 MB over three replays and timings do not drift, but a true leak test
   (heap snapshots with GC, 30+ minutes of replay) was not run — `UNVERIFIED`.
9. **Bundle size 1.06 MB (300 kB gzip)**, dominated by three.js + `opentype.js`.
   It is one route with no code-splitting; for a single opening that is
   acceptable, but it is not a light page. No vendor chunk split was introduced.
10. **Only Chrome was tested** (the harness launches the system Chrome). Safari's
   `alphaMap` / VSM shadow rendering and Firefox's PMREM path are `UNVERIFIED`.
11. **Mobile was emulated** (390×844, DPR 2, mobile quality tier) on the same
    desktop GPU. Real iPhone/Android thermal and GPU behaviour is `UNVERIFIED` —
    although the mobile tier does drop shadow maps to 512, curve segments to 12
    and bevel segments to 3.
12. **`prefers-reduced-motion` is read once at mount.** If the OS setting changes
    while the page is open, the running opening is not interrupted; it applies on
    the next load.
13. **Pointer parallax is subtle but untested on a trackpad** at real frame
    rates beyond headless Chrome; it only binds on `(pointer: fine)`.
14. **`?assetDelay` and `?freeze` are shipped QA hooks.** They are inert without
    the query string and documented in the README, but they are production code
    that exists for verification.
15. **The stats probe is an approximation:** FPS is an exponential moving average
    over frame deltas and `renderer.info` values are post-render. It is evidence,
    not a profiler.

18. **The recording predates the refinement commit.** `A1-opening.mp4` was
    recorded at `f93bc24`; the sequence/timings are unchanged but its terminal
    material and floor are the previous look. Re-recording was deprioritised by
    the delivery time box — `UNVERIFIED` as a video of the refined material.

## Content / scope

16. **The micro UI copy is placeholder copy** ("An index of work, objects and
    craft.", "PERSONAL IDENTITY"). No real biography, no real project data — this
    is the opening chapter only, as scoped.
17. **No audio, no scroll continuation.** The stage is a single viewport by
    design; the "continue" destination belongs to the next chapter.
