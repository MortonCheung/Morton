# Known issues & residual risks — A4 Hybrid Opening

## Open issues

1. **Flat faces read closer to satin stone than polished champagne.** Physically, a flat face samples
   one environment direction, so it cannot show a vertical material gradient without a texture or an
   HDRI. The surface is deliberately between mirror and matte; an anisotropic/brushed map would be the
   next improvement. Not a correctness bug, but the honest visual gap.
2. **Total opening time is load-sensitive.** Under five-prototype CPU contention the recorded total was
   1.90–2.24 s (video probe 1.954 s; 1440 probe 1.944 s; one overloaded 1920 run 3.08 s while four
   other captures were running). The timeline itself is 1.040 s + 0.480 s; the variance comes from
   real WebGL startup before `drawing`, never from an artificial wait. Re-measure on a quiet machine
   before judging the 2 s target.
3. **Shadow system is two-pass.** A tight contact shadow plus a directional cast shadow. At 1440 it
   reads as contact + offset; on very low-end GPUs it is the first thing to disable (it is already off
   on mobile).
4. **Replay fades the chrome out for ~1 frame** while the probe returns to `loading`. Cosmetic only;
   the sequence itself restarts cleanly and does not stack timelines.
5. **Reduced-motion path hides the outline and shows the final composition immediately.** This is a
   degradation by design, but the first frame can be very slightly flat until the environment's
   PMREM conversion has run; in practice the still frame is correct by 2 painted frames.

## Explicitly UNVERIFIED

- **Real-device mobile performance** (iPhone/Android): only headless Chrome at 390×844, DPR 2, via
  SwiftShader on this Mac. No real-GPU frame-rate measurement.
- **Safari / Firefox**: not tested. `vector-effect` is no longer used; the remaining APIs are standard.
- **Background-tab pause**: implemented (`visibilitychange` pauses/resumes the live timeline), but the
  runtime behaviour could not be forced in this harness; code-reviewed only.
- **Memory**: five-reload heap samples and five-replay geometry/texture counts were captured, but no
  DevTools heap snapshot/allocation timeline was available. No leak is *observed*; no formal
  proof is claimed.
- **60 fps on a real GPU**: frame timings were not captured under a profiler, only visual smoothness
  in the recording.

## Accepted trade-offs

- No HDRI, no external textures: all environment/floor detail is generated. This keeps the repo
  self-contained and the licence clean, at the cost of some photographic realism.
- One font file only; the chrome uses the system sans for contrast.
- The page is intentionally non-scrollable (this is chapter one only); the `SCROLL` cue is
  compositional, not a working navigation element.
- Bundle is a single 1.45 MB chunk (three + drei + GSAP). The app is one screen; code splitting would
  only move bytes, and the TTF/JS are the only critical requests.
