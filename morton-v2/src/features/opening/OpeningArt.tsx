/**
 * Opening cover line art.
 *
 * Three families, all derived from the *actual* final hero (same coordinates as
 * heroGeometry.ts and the same wordmark path data):
 *   silhouette — the wordmark ink boundary + the material plate edge + baseline
 *   detail     — the wordmark's internal construction lines (arms, counters, junctions)
 *   shading    — the plate's highlight band edges + masthead rule
 *
 * No coordinates, no annotations, no percentages. Two variants (desktop/mobile)
 * because the hero itself re-composes below 720px.
 */
import { MARKS } from '../../styleframes/wordmark'
import { HERO, MOBILE } from '../hero/heroGeometry'

type Family = 'silhouette' | 'detail' | 'shading'

interface StrokePath {
  d: string
  family: Family
  transform?: string
}

function wordmarkPaths(scale: number, originX: number, originY: number, unit: number): StrokePath[] {
  const def = MARKS.serif
  const s = unit * scale
  const out: StrokePath[] = []
  for (const l of def.letters) {
    out.push({
      d: l.d,
      family: 'silhouette',
      transform: `translate(${originX + l.x * s} ${originY}) scale(${s})`,
    })
    if (l.structure) {
      out.push({
        d: l.structure,
        family: 'detail',
        transform: `translate(${originX + l.x * s} ${originY}) scale(${s})`,
      })
    }
  }
  return out
}

function desktopPaths(): StrokePath[] {
  const { plate, mark, baselineY, masthead, plateBand } = HERO
  const paths: StrokePath[] = [
    // plate: only the two edges that are inside the frame
    { d: `M${plate.x} ${plate.y} H${plate.x + plate.w}`, family: 'silhouette' },
    { d: `M${plate.x} ${plate.y} V${plate.y + plate.h}`, family: 'silhouette' },
    // baseline, runs through both grounds
    { d: `M0 ${baselineY} H${1440}`, family: 'silhouette' },
    // masthead rule
    { d: `M${masthead.x} ${masthead.y} H${masthead.x + masthead.w}`, family: 'shading' },
    // plate highlight band (p06 sits at 25% of the plate)
    { d: `M${plate.x} ${plateBand - 4} H1440`, family: 'shading' },
    { d: `M${plate.x} ${plateBand + 4} H1440`, family: 'shading' },
  ]
  paths.push(...wordmarkPaths(1, mark.x, mark.inkTop, mark.unit))
  return paths
}

function mobilePaths(): StrokePath[] {
  const { plate, mark, baselineY } = MOBILE
  const paths: StrokePath[] = [
    { d: `M${plate.x} ${plate.y} H${plate.x + plate.w}`, family: 'silhouette' },
    { d: `M${plate.x} ${plate.y + plate.h} H${plate.x + plate.w}`, family: 'silhouette' },
    { d: `M0 ${baselineY} H${plate.w}`, family: 'silhouette' },
  ]
  const unit = mark.width / 6184
  paths.push(...wordmarkPaths(1, mark.x, mark.inkTop, unit))
  return paths
}

export function OpeningArt({ variant }: { variant: 'desktop' | 'mobile' }) {
  const paths = variant === 'desktop' ? desktopPaths() : mobilePaths()
  const viewBox = variant === 'desktop' ? '0 0 1440 900' : '0 0 390 844'
  return (
    <svg
      className="opening-art"
      data-variant={variant}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {(['silhouette', 'detail', 'shading'] as Family[]).map((family) => (
        <g key={family} data-line-family={family}>
          {paths
            .filter((p) => p.family === family)
            .map((p, i) => (
              <path
                key={`${family}-${i}`}
                d={p.d}
                transform={p.transform}
                data-stroke
                pathLength={100}
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
            ))}
        </g>
      ))}
    </svg>
  )
}
