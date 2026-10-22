/**
 * The one place where the word, its optical size and its tracking are defined.
 *
 * Both the runtime geometry (src/letters/buildWord.ts) and the offline outline
 * generator (scripts/generate-outline.ts) import these constants, so the SVG
 * construction lines and the solid letters are guaranteed to share a layout.
 *
 * Typographic rationale (see docs/DESIGN_DECISIONS.md):
 *  - Marcellus (SIL OFL 1.1) — Roman inscriptional capitals, moderate contrast.
 *    Its stems survive a 0.013 em bevel at this display size; Didone hairlines
 *    would shimmer once extruded.
 *  - tracking 0.07 em: enough air for a six-letter wordmark without losing the
 *    word as a single object.
 *  - emSize 1: the cap height (~0.70 em) then doubles as the world unit.
 */
export const WORD = 'MORTON'
export const EM_SIZE = 1
export const TRACKING = 0.07

/** Extrusion look. These are shared by runtime geometry and the QA checks. */
export const LETTER_GEOMETRY = {
  depth: 0.24,
  bevel: 0.016,
} as const
