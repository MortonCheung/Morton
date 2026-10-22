/**
 * Shared geometry between the final hero and the opening cover.
 *
 * These are the *same* numbers the hero CSS uses (see styleframes.css, .sf-hero),
 * expressed in the 1440x900 drawing space. The cover art is derived from them, so
 * the two states line up exactly and the reveal cannot jump.
 */
export const CANVAS = { w: 1440, h: 900 } as const

export const HERO = {
  /** plate: left 67.3vw, top 10.667vh, bleeds right/bottom */
  plate: { x: 0.673 * CANVAS.w, y: (10.667 / 100) * CANVAS.h, w: CANVAS.w * (1 - 0.673), h: CANVAS.h * (1 - 10.667 / 100) },
  /** wordmark: left -0.951vw, width 101.9vw, baseline 64.444vh */
  mark: {
    x: -0.00951 * CANVAS.w,
    width: 1.019 * CANVAS.w,
    inkTop: (64.444 / 100) * CANVAS.h - 0.16674 * CANVAS.w,
    /** word ink box is 6184 x 1024 design units */
    unit: (1.019 * CANVAS.w) / 6184,
  },
  baselineY: (64.444 / 100) * CANVAS.h,
  masthead: { x: 0.047 * CANVAS.w, y: (10.667 / 100) * CANVAS.h, w: 0.25 * CANVAS.w },
  /** p06 highlight band sits at 25% of the plate's rendered height */
  plateBand: (10.667 / 100) * CANVAS.h + 0.25 * (CANVAS.h * (1 - 10.667 / 100)),
} as const

export const MOBILE = {
  w: 390,
  h: 844,
  plate: { x: 0, y: 0.18 * 844, w: 390, h: 0.62 * 844 },
  mark: { x: 0.04 * 390, width: 0.92 * 390, inkTop: 0.37 * 844 - 0.1506 * 390 },
  baselineY: 0.55 * 844,
} as const
