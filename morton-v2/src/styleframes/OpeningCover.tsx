/**
 * 00 · OPENING COVER — 1440×900 / 390×844
 *
 * The hero's exact geometry, un-inked: same plate rectangle (left 67.2vw, top
 * 96), same wordmark ink box (cap 344–580), same baseline. Three line layers:
 *   primary   1.4px / 100%  — wordmark silhouette + plate edges
 *   secondary 0.8px / 65%   — internal construction (arms, counters, serifs)
 *   tertiary  0.5px / 40%   — plate seam / highlight, baseline
 * Per-letter dashes put the drawing at a 62% state. The centre line is 74vw at
 * y 50vh, 1px and deliberately weaker (40%) than the drawing. No numbers.
 */
import { Plate, WordmarkDrawing } from './parts'

export default function OpeningCover() {
  return (
    <section className="sf sf-cover" data-frame="00-opening-cover">
      {/* the material field, barely there (9%) — it is a print underlay */}
      <Plate id="p06" className="sf-cover__underlay" />

      {/* plate rectangle: left + top edges, at the hero's coordinates */}
      <svg className="sf-cover__plate" viewBox="0 0 471 804" preserveAspectRatio="none" aria-hidden="true">
        <path className="sf-cover__edge" pathLength={100} strokeDasharray="100 100" d="M0 0 V804" />
        <path className="sf-cover__edge" pathLength={100} strokeDasharray="62 100" d="M0 0 H471" />
        <path className="sf-cover__seam" pathLength={100} strokeDasharray="46 100" d="M0 145 H471" />
      </svg>

      {/* the wordmark silhouette + structure, mid-plot */}
      <div className="sf-cover__drawing">
        <WordmarkDrawing
          mark="serif"
          progress={[
            [100, 92],
            [100, 80],
            [71, 46],
            [23, 0],
            [38, 18],
            [42, 20],
          ]}
        />
      </div>

      {/* baseline, as in the hero */}
      <span className="sf-cover__baseline" aria-hidden="true" />

      {/* centre progress line: weaker than the drawing */}
      <span className="sf-cover__line" aria-hidden="true" />
      <span className="sf-cover__head" aria-hidden="true" />

      <p className="label sf-cover__tl">MORTON</p>
      <p className="label label--muted sf-cover__tr">00 — OPENING</p>
      <p className="label label--muted sf-cover__br">PRE-REVEAL STUDY</p>
    </section>
  )
}
