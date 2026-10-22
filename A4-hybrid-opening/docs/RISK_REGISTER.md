# Risk register — A4 Hybrid Opening

| # | Risk | Likelihood | Impact | Mitigation / action |
|---|---|---|---|---|
| 1 | Total opening exceeds 2 s on a slow machine | medium | medium | Timings are fixed (1.04 s + 0.48 s); the only variable is real WebGL/typeface startup. Re-measured; variance documented in KNOWN_ISSUES |
| 2 | Shared O geometry gets disposed by one mesh on unmount | low | high | R3F auto-dispose disabled on meshes (`dispose={null}`); a single `LetterAssets` owner disposes geometry/material; proven by identical UUIDs + code review |
| 3 | Replay stacks GSAP timelines or creates new geometry | medium | high | One timeline per run, killed in cleanup; geometry built once per font; QA samples geometry/texture counts over 5 replays |
| 4 | Outlined SVG drifts from the 3D silhouette (font/coordinate mismatch) | medium | high | Same contours feed both; SVG locked by live camera projection; draw-pose matrix also computed analytically before WebGL boots |
| 5 | Flat champagne faces read as cheap clay/matte plastic | high | medium | Iterated five surface/lighting rounds; measured the face's environment band with a colour probe; satin roughness + bevel highlights; acknowledged as the remaining visual gap |
| 6 | Shadow looks like a smeared stain | medium | medium | Two-part shadow: tight contact + directional cast with an explicit light direction; off on mobile |
| 7 | Browser lock starvation delays evidence capture | high (5 prototypes) | medium | capture/QA both use `/tmp/morton-browser-gate`; evidence runs are queued, never run a second Chrome |
| 8 | Mobile wordmark too small or off-centre | medium | medium | 86 % width, ink-bbox optical centring, mobile camera/DPR/shadow degradation, 390×844 capture |
| 9 | Font fetch failure strands the page | low | high | Explicit error → readable static fallback + probe `extra.fontError`; no infinite loader |
| 10 | Shared machine memory pressure / SwiftShader variance | high | low | Demand rendering, no idle RAF, no HDRI, 512 contact shadow, DPR ≤2; numbers recorded |
