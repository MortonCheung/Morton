/**
 * 01 · HERO FINAL — 1440×900 / 1440×700 / 390×844
 *
 * The mark is set wider than the page (102.4vw): the frame crops its outer
 * stems, never a letter. A full-height lacquer plate bleeds off the right
 * edge; the last two letters that fall inside the plate are punched out of
 * the material (paper in the letter, material in the field), so type and
 * plate are one object rather than "type on a swatch". The baseline rule runs
 * the full width, through both grounds.
 */
import { Plate, Wordmark, plateLabel } from './parts'

export default function HeroFinal() {
  return (
    <section className="sf sf-hero" data-frame="01-hero-final">
      {/* left ground: paper, ink mark, clipped exactly at the plate edge */}
      <div className="sf-hero__paper">
        <Wordmark className="sf-hero__mark" mark="serif" />
      </div>

      {/* right ground: material field; the same mark, paper-coloured, punched in */}
      <div className="sf-hero__material">
        <Plate id="p06" className="sf-hero__plate" />
        <Wordmark className="sf-hero__mark sf-hero__mark--cut" mark="serif" color="var(--paper)" />
      </div>

      <p className="label sf-hero__index">MORTON — [待补副标题]</p>
      <span className="sf-hero__masthead" aria-hidden="true" />
      <p className="label sf-hero__plate-label">{plateLabel('p06')}</p>
      <span className="sf-hero__baseline sf-hero__baseline--paper" aria-hidden="true" />
      <span className="sf-hero__baseline sf-hero__baseline--material" aria-hidden="true" />
      <p className="caption sf-hero__note">
        Art direction, editorial{' '}
        <br />
        and exhibition design.
      </p>
      <span className="label label--muted sf-hero__folio">01 — 05</span>
    </section>
  )
}
