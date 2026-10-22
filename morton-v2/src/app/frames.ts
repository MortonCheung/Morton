/**
 * Styleframe registry — Phase 1 review surface.
 *
 * Phase 1 ships five static high-fidelity frames. They are the contractual
 * reference for Phase 2 (opening) and Phase 3 (site skeleton); the opening must
 * reveal the final Hero from THIS list, not a newly invented composition.
 */
export interface FrameEntry {
  id: string
  title: string
  note: string
}

export const FRAMES: FrameEntry[] = [
  { id: '00-opening-cover', title: 'Opening cover', note: 'Centre progress line + multi-path line art, pre-reveal state' },
  { id: '01-hero-final', title: 'Final hero', note: 'The composed surface the opening reveals' },
  { id: '02-about-editorial', title: 'About / record', note: 'Editorial personal narrative, asymmetric image + text' },
  { id: '03-works-exhibition', title: 'Works exhibition', note: 'Curated overview with unequal exhibit scales' },
  { id: '04-project-focus', title: 'Project focus', note: 'Source-to-foreground focus, product-level detail' },
]
