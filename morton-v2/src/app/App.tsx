/**
 * Route shell.
 *
 *   #/                    -> the site (opening cover + hero + sections)
 *   #/review              -> Phase 1 styleframe index
 *   #/00-opening-cover …  -> individual Phase 1 frames (kept as the signed-off
 *                            visual reference; Phase 2/3 read from them)
 */
import { useEffect, useState } from 'react'
import { FRAMES } from './frames'
import Review from './Review'
import { Site } from './Site'
import { OpeningShell } from '../features/opening/OpeningShell'
import OpeningCover from '../styleframes/OpeningCover'
import HeroFinal from '../styleframes/HeroFinal'
import AboutEditorial from '../styleframes/AboutEditorial'
import WorksExhibition from '../styleframes/WorksExhibition'
import ProjectFocusFrame from '../styleframes/ProjectFocus'

const SCREENS: Record<string, () => React.ReactElement> = {
  '00-opening-cover': () => <OpeningCover />,
  '01-hero-final': () => <HeroFinal />,
  '02-about-editorial': () => <AboutEditorial />,
  '03-works-exhibition': () => <WorksExhibition />,
  '04-project-focus': () => <ProjectFocusFrame />,
}

function readRoute(): string {
  const raw = window.location.hash.replace(/^#\/?/, '')
  return raw.split('?')[0]
}

export default function App() {
  const [route, setRoute] = useState(readRoute())

  useEffect(() => {
    const onHash = () => setRoute(readRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (route === 'review') return <Review frames={FRAMES} />
  if (route && SCREENS[route]) {
    const screen = SCREENS[route]
    return (
      <div data-styleframe={route} className="frame-root">
        {screen()}
      </div>
    )
  }
  return (
    <OpeningShell>
      <Site />
    </OpeningShell>
  )
}
