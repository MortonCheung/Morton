import type { CSSProperties } from 'react'
import type { Project } from '../data/projects'

type Shape = Project['visual']['shape']

interface ProjectVisualProps {
  shape: Shape
  a: string
  b: string
  label?: string
  className?: string
}

/**
 * Generated placeholder composition — deliberately NOT a screenshot.
 * Every card/detail media slot uses this so no fake project imagery exists.
 */
export function ProjectVisual({ shape, a, b, label = '占位图', className }: ProjectVisualProps) {
  return (
    <div className={`pv${className ? ` ${className}` : ''}`} style={{ '--pv-a': a, '--pv-b': b } as CSSProperties}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <rect width="100" height="100" fill="var(--pv-a)" />
        <g stroke="var(--pv-b)" fill="none" strokeWidth="0.55" opacity="0.92">
          {shape === 'circle' ? (
            <>
              <circle cx="50" cy="47" r="26" />
              <circle cx="50" cy="47" r="18" opacity="0.4" />
              <line x1="0" y1="78" x2="100" y2="78" opacity="0.5" />
              <circle cx="50" cy="47" r="2.4" fill="var(--pv-b)" stroke="none" />
            </>
          ) : null}
          {shape === 'ring' ? (
            <>
              <circle cx="50" cy="50" r="30" opacity="0.55" />
              <circle cx="50" cy="50" r="21" strokeWidth="0.9" />
              <circle cx="50" cy="50" r="9" opacity="0.45" />
              <line x1="50" y1="0" x2="50" y2="30" opacity="0.5" />
            </>
          ) : null}
          {shape === 'arc' ? (
            <>
              <path d="M8 78 A42 42 0 0 1 92 78" strokeWidth="0.9" />
              <path d="M22 78 A28 28 0 0 1 78 78" opacity="0.45" />
              <line x1="0" y1="78" x2="100" y2="78" opacity="0.6" />
              <line x1="50" y1="26" x2="50" y2="78" opacity="0.3" />
            </>
          ) : null}
          {shape === 'bars' ? (
            <>
              <line x1="12" y1="28" x2="88" y2="28" strokeWidth="3" />
              <line x1="12" y1="42" x2="70" y2="42" strokeWidth="3" opacity="0.55" />
              <line x1="12" y1="56" x2="80" y2="56" strokeWidth="0.8" />
              <line x1="12" y1="66" x2="58" y2="66" strokeWidth="0.8" opacity="0.6" />
              <line x1="12" y1="76" x2="40" y2="76" strokeWidth="0.8" opacity="0.4" />
            </>
          ) : null}
          {shape === 'grid' ? (
            <>
              {[20, 35, 50, 65, 80].map((x) => (
                <line key={x} x1={x} y1="16" x2={x} y2="84" opacity="0.42" />
              ))}
              {[28, 44, 60, 76].map((y) => (
                <line key={y} x1="12" y1={y} x2="88" y2={y} opacity="0.42" />
              ))}
              <rect x="35" y="44" width="30" height="16" fill="var(--pv-b)" stroke="none" opacity="0.9" />
            </>
          ) : null}
          {shape === 'stack' ? (
            <>
              <rect x="24" y="22" width="52" height="42" opacity="0.35" />
              <rect x="19" y="30" width="52" height="42" opacity="0.6" />
              <rect x="14" y="38" width="52" height="42" fill="var(--pv-b)" stroke="none" opacity="0.9" />
            </>
          ) : null}
          {shape === 'diagonal' ? (
            <>
              <line x1="8" y1="88" x2="92" y2="12" strokeWidth="1.1" />
              <line x1="8" y1="70" x2="74" y2="12" opacity="0.4" />
              <rect x="56" y="52" width="26" height="26" fill="var(--pv-b)" stroke="none" opacity="0.9" />
              <line x1="8" y1="88" x2="92" y2="88" opacity="0.5" />
            </>
          ) : null}
          {shape === 'column' ? (
            <>
              <rect x="22" y="14" width="10" height="72" fill="var(--pv-b)" stroke="none" opacity="0.9" />
              <line x1="46" y1="14" x2="46" y2="86" opacity="0.55" />
              <line x1="60" y1="14" x2="60" y2="86" opacity="0.35" />
              <line x1="74" y1="14" x2="74" y2="50" opacity="0.5" />
            </>
          ) : null}
        </g>
      </svg>
      <span className="pv__tag">{label}</span>
    </div>
  )
}
