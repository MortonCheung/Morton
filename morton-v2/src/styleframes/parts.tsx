/**
 * Shared styleframe parts.
 *
 * `Plate` is the image slot. Until the original plate set is delivered it is a
 * flat, single-value field with a 1px hairline edge — deliberately a *sample*,
 * not a fake material. When `PLATES_READY` flips, the same box receives the real
 * <img> and nothing else in the composition moves.
 */
import { MARKS, type MarkId } from './wordmark'

export type PlateId = 'p01' | 'p02' | 'p03' | 'p04' | 'p05' | 'p06' | 'p07' | 'p07b' | 'p08'

/** Per-plate availability: only plates the art director has accepted render as
 *  images; the rest keep the flat field + 1px edge so the composition is still
 *  legible. Flip a flag when its replacement lands. */
const PLATE_AVAILABLE: Record<string, boolean> = {
  p01: true,
  p02: true,
  p03: true,
  p04: true,
  p05: true,
  p06: true,
  p07: true,
  p07b: true,
  p08: true,
}

interface PlateSpec {
  file: string
  tone: string
  name: string
  alt: string
}

export const PLATES: Record<PlateId, PlateSpec> = {
  p01: {
    file: '/assets/plates/p01-paper-4x5.jpg',
    tone: 'var(--plate-paper)',
    name: 'paper study',
    alt: 'Original placeholder plate: paper fibre study, 4:5',
  },
  p02: {
    file: '/assets/plates/p02-plaster-3x2.jpg',
    tone: 'var(--plate-plaster)',
    name: 'plaster study',
    alt: 'Original placeholder plate: plaster surface study, 3:2',
  },
  p03: {
    file: '/assets/plates/p03-ink-1x1.jpg',
    tone: 'var(--plate-ink)',
    name: 'ink study',
    alt: 'Original placeholder plate: ink field study, 1:1',
  },
  p04: {
    file: '/assets/plates/p04-linen-4x5.jpg',
    tone: 'var(--plate-linen)',
    name: 'linen study',
    alt: 'Original placeholder plate: linen weave study, 4:5',
  },
  p05: {
    file: '/assets/plates/p05-sand-16x9.jpg',
    tone: 'var(--plate-sand)',
    name: 'sand study',
    alt: 'Original placeholder plate: sand surface study, 16:9',
  },
  p06: {
    file: '/assets/plates/p06-lacquer-3x2.jpg',
    tone: 'var(--plate-lacquer)',
    name: 'lacquer study',
    alt: 'Original placeholder plate: lacquer surface study, 3:2',
  },
  p07: {
    file: '/assets/plates/p07-fold-2x3.jpg',
    tone: 'var(--plate-fold)',
    name: 'fold study',
    alt: 'Original placeholder plate: folded paper study, 2:3',
  },
  p08: {
    file: '/assets/plates/p08-grain-4x5.jpg',
    tone: 'var(--plate-grain)',
    name: 'grain study',
    alt: 'Original placeholder plate: grain study, 4:5',
  },
  p07b: {
    file: '/assets/plates/p07b-fold-deep-2x3.jpg',
    tone: 'var(--plate-fold)',
    name: 'fold study / deep',
    alt: 'Original placeholder plate: folded paper study, deep cut, 2:3',
  },
}

export function plateLabel(id: PlateId) {
  return `P.${id.slice(1)} — ${PLATES[id].name.toUpperCase()}`
}

export function Plate({
  id,
  className = '',
  style,
  loading = 'lazy',
}: {
  id: PlateId
  className?: string
  style?: React.CSSProperties
  loading?: 'lazy' | 'eager'
}) {
  const spec = PLATES[id]
  return (
    <div
      className={`plate ${className}`}
      data-plate={id}
      role="img"
      aria-label={spec.alt}
      style={{ ...style, ['--plate-tone' as string]: spec.tone }}
    >
      {PLATE_AVAILABLE[id] && (
        <img
          className="plate__img"
          src={spec.file}
          alt=""
          draggable={false}
          decoding="async"
          loading={loading}
        />
      )}
    </div>
  )
}

/** The wordmark, as shipped geometry (not a text node). */
export function Wordmark({
  mark = 'serif',
  className = '',
  ink = 'fill',
  strokeWidth = 1,
  color,
  crop,
}: {
  mark?: MarkId
  className?: string
  ink?: 'fill' | 'line'
  strokeWidth?: number
  color?: string
  crop?: [number, number, number, number]
}) {
  const def = MARKS[mark]
  const isLine = ink === 'line'
  const [x0, y0, , y1] = def.ink
  const vb = crop
    ? `${crop[0]} ${crop[1]} ${crop[2] - crop[0]} ${crop[3] - crop[1]}`
    : `${x0} ${y0} ${def.width} ${y1 - y0}`
  return (
    <svg
      className={`wordmark ${className}`}
      viewBox={vb}
      role="img"
      aria-label="MORTON"
      style={color ? { color } : undefined}
    >
      {def.letters.map((l, i) => (
        <path
          key={`${l.ch}-${i}`}
          d={l.d}
          transform={`translate(${l.x} 0)`}
          fill={isLine ? 'none' : 'currentColor'}
          stroke={isLine ? 'currentColor' : 'none'}
          strokeWidth={isLine ? strokeWidth : undefined}
          vectorEffect={isLine ? 'non-scaling-stroke' : undefined}
        />
      ))}
    </svg>
  )
}

/**
 * The wordmark as *line art*, for the opening cover. Two layers share one
 * geometry:
 *   primary   — the silhouette, 1.4px, masked to the outside of the filled
 *               letter (so no internal construction edges leak into it);
 *   secondary — the internal construction lines (arms, counters, junctions),
 *               0.8px at 65%.
 * Each letter receives its own dash progress so the drawing can read as
 * "62% plotted": some strokes finished, some in progress, some not started.
 */
export function WordmarkDrawing({
  mark = 'serif',
  className = '',
  progress,
}: {
  mark?: MarkId
  className?: string
  /** per-letter [primary%, secondary%] */
  progress: [number, number][]
}) {
  const def = MARKS[mark]
  const [x0, y0, , y1] = def.ink
  const vb = `${x0} ${y0} ${def.width} ${y1 - y0}`
  const uid = `wd-${mark}`
  const pad = 40
  return (
    <svg className={`wordmark wordmark--draw ${className}`} viewBox={vb} role="img" aria-label="MORTON">
      <defs>
        <mask id={uid} maskUnits="userSpaceOnUse" x={x0 - pad} y={y0 - pad} width={def.width + pad * 2} height={y1 - y0 + pad * 2}>
          <rect x={x0 - pad} y={y0 - pad} width={def.width + pad * 2} height={y1 - y0 + pad * 2} fill="#fff" />
          {def.letters.map((l, i) => (
            <path key={`m${i}`} d={l.d} transform={`translate(${l.x} 0)`} fill="#000" />
          ))}
        </mask>
      </defs>
      <g mask={`url(#${uid})`}>
        {def.letters.map((l, i) => {
          const p = progress[i] ?? [0, 0]
          return (
            <path
              key={`p${i}`}
              d={l.d}
              transform={`translate(${l.x} 0)`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.8}
              vectorEffect="non-scaling-stroke"
              pathLength={100}
              strokeDasharray={p[0] >= 100 ? undefined : `${p[0]} 100`}
              strokeLinecap="butt"
            />
          )
        })}
      </g>
      {def.letters.map((l, i) => {
        const p = progress[i] ?? [0, 0]
        if (!l.structure || p[1] <= 0) return null
        return (
          <path
            key={`s${i}`}
            d={l.structure}
            transform={`translate(${l.x} 0)`}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.8}
            vectorEffect="non-scaling-stroke"
            opacity={0.65}
            pathLength={100}
            strokeDasharray={p[1] >= 100 ? undefined : `${p[1]} 100`}
          />
        )
      })}
    </svg>
  )
}
