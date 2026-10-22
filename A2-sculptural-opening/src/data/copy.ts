import type { OpeningState } from '../lib/timeline'

/**
 * All visible copy lives here, outside the animation callbacks.
 * The opening only exposes: identity label, one state/short sentence, chapter index, replay.
 */
export const COPY = {
  identity: 'MORTON',
  subIdentity: 'PERSONAL IDENTITY',
  chapter: '01 — 06',
  replay: 'REPLAY',
  heroSentence: 'SIX LETTERS, HELD IN ONE LIGHT.',
  errorTitle: 'THE MARK COULD NOT BE FORMED',
  errorBody: 'The glyph source did not load. Check the network panel and reload.',
  retry: 'RELOAD',
} as const

/** Honest state words. No percentage, no fake progress bar. */
export const STATE_COPY: Record<OpeningState, string> = {
  loading: 'PREPARING THE SPACE',
  drawing: 'FORMING THE MARK',
  built: 'MATERIALS SETTLING',
  expanding: 'SETTLING THE FORM',
  hero: COPY.heroSentence,
  reduced: COPY.heroSentence,
}
