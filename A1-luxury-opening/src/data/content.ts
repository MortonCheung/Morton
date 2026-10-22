/** All user-facing copy. Kept out of components and animation callbacks. */
export const COPY = {
  mark: 'MORTON',
  subtitle: 'PERSONAL IDENTITY',
  index: '01',
  indexLabel: 'OPENING',
  line: 'An index of work, objects and craft.',
  replay: 'REPLAY',
  replayHint: 'R',
  status: {
    loading: 'PREPARING',
    drawing: 'FORMING',
    built: 'SETTLING',
    expanding: 'REVEALING',
    hero: '',
    reduced: 'STILL',
  },
  error: 'OBJECT COULD NOT SETTLE — R TO RETRY',
  webgl: 'WEBGL UNAVAILABLE — STATIC VIEW',
} as const
