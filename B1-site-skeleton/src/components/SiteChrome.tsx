import { CHAPTERS } from '../data/chapters'

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__left">
        <span className="site-header__word">MORTON</span>
        <span className="site-header__divider" aria-hidden="true" />
        <span className="site-header__sub">全站叙事骨架</span>
      </div>
      <div className="site-header__right">
        <span className="site-header__chapter" aria-hidden="true" />
        <span className="site-header__note">占位内容</span>
      </div>
    </header>
  )
}

export function SideNav({ reduced }: { reduced: boolean }) {
  const go = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(`ch-${id}`)
    if (!target) return
    event.preventDefault()
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <nav className="sidenav" aria-label="章节导航">
      {CHAPTERS.map((chapter) => (
        <a
          key={chapter.id}
          href={`#ch-${chapter.id}`}
          className="sidenav__item"
          data-nav={chapter.id}
          onClick={(event) => go(event, chapter.id)}
        >
          <span className="sidenav__dot" aria-hidden="true" />
          <span className="sidenav__label">
            <span className="sidenav__index">{chapter.index}</span>
            <span className="sidenav__name">{chapter.label}</span>
          </span>
        </a>
      ))}
    </nav>
  )
}

export function ScrollProgress() {
  return (
    <div className="scroll-progress" aria-hidden="true">
      <span className="scroll-progress__bar" />
    </div>
  )
}
