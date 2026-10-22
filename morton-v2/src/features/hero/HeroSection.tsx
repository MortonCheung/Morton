/**
 * Hero section — the approved Phase 1 final hero, unchanged, as the first
 * section of the live site. The opening cover reveals this exact DOM.
 */
import HeroFinal from '../../styleframes/HeroFinal'

export function HeroSection() {
  return (
    <section id="index" className="site-hero" aria-label="MORTON — index">
      <HeroFinal />
      <a className="site-hero__scroll label" href="#about">
        scroll ↓
      </a>
    </section>
  )
}
