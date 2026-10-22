/** Project-level constants shared by the scene, the animation and the probe. */
export const WORD = 'MORTON'

export const FONT_URL = './fonts/Marcellus-Regular.ttf'
export const FONT_FAMILY = 'Marcellus'

export const MINERAL_TEXTURE_URL = './textures/mineral-tooth.png'
export const CONTACT_SHADOW_URL = './textures/contact-shadow.png'

/** Glyph extrusion. Tuned against screenshots, not guessed once. */
export const GLYPH = {
  depth: 0.36,
  bevel: 0.021,
  bevelSegments: 5,
  curveSegments: 20,
  tracking: 0.07,
} as const

/** Opening choreography, milliseconds. draw >= 1000 is a hard acceptance gate. */
export const TIMING = {
  drawMs: 1200,
  expandMs: 500,
  letterStaggerMs: 120,
  lineDrawMs: 260,
  solidDrawMs: 340,
  solidDelayMs: 200,
} as const

/** Low museum display base; a slab, deliberately not a trophy plinth. */
export const PLINTH = {
  height: 0.08,
  depth: 1.0,
  marginX: 0.14,
} as const

/** Required sequence for the probe / automated verification. */
export const STATE_SEQUENCE = [
  'loading',
  'drawing',
  'built',
  'expanding',
  'hero',
] as const
