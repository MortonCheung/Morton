/**
 * Single source of truth for the opening's timing + geometry constants.
 * Values are asserted against the live probe in docs/TEST_REPORT.md.
 */
export const OPENING = {
  /** MORTON draw must never be shorter than this (acceptance gate: >= 1000 ms). */
  drawMinMs: 1000,
  /** Six letters, each drawn for this long, staggered left-to-right. 5*172+320 = 1180 ms. */
  letterDrawMs: 290,
  letterStaggerMs: 150,
  /** Real expand duration (acceptance gate: approx 500 ms, 450-650 tolerated). */
  expandMs: 480,
  /** Letters begin pushed back on Z so the expand reads as volume emerging. */
  startZ: -0.38,
  depth: 0.24,
  bevel: 0.02,
  bevelSegments: 4,
  curveSegments: 18,
  /** Extra letterspacing in em; Marcellus is an inscriptional serif and likes air. */
  tracking: 0.09,
  word: 'MORTON',
  fontUrl: './fonts/marcellus.ttf',
  /** After hero the render pump is switched off; this grace period lets the last frame land. */
  idleAfterHeroMs: 450,
} as const

export const PALETTE = {
  /** Final surface: restrained champagne-grey, not gold. */
  champagne: '#c9beae',
  /** Surface before light "arrives" during the expand. */
  champagneDim: '#6d665c',
  outline: '#c9b89c',
  key: '#fff2df',
  rim: '#d8e2ee',
  fill: '#8c8174',
  ambient: '#3c352c',
  floorGlow: '#8a7354',
} as const

/**
 * Material preset from the A4 brief, tuned only after screenshot review.
 * metalness/roughness/clearcoat are deliberately mid-range: no mirror, no chalk.
 */
export const LIGHT = {
  keyBase: 1.7,
  keyHero: 2.05,
} as const

export const MATERIAL = {
  color: PALETTE.champagne,
  startColor: PALETTE.champagneDim,
  metalness: 0.38,
  roughness: 0.28,
  clearcoat: 0.8,
  clearcoatRoughness: 0.1,
  envMapIntensity: 1.8,
  startRoughness: 0.52,
  startClearcoat: 0.06,
  startEnvMapIntensity: 0.32,
  ior: 1.45,
} as const
