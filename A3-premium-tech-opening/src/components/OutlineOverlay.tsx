import type { RefObject } from 'react'
import type { LayoutFrame } from '../lib/frame'
import type { DrawPath } from '../features/opening/svgPaths'

interface Props {
  paths: DrawPath[]
  frame: LayoutFrame
  svgRef: RefObject<SVGSVGElement | null>
}

/**
 * Drawing layer. Sits exactly on top of the canvas and uses a pixel-sized
 * viewBox, so each path is already authored in CSS pixels by the shared
 * projection in `svgPaths.ts`.
 */
export function OutlineOverlay({ paths, frame, svgRef }: Props) {
  return (
    <svg
      ref={svgRef}
      className="opening-outline"
      viewBox={`0 0 ${frame.cssW} ${frame.cssH}`}
      aria-hidden="true"
      focusable="false"
      style={{ opacity: 0 }}
    >
      {paths.map((path) => (
        <path key={path.key} d={path.d} data-draw data-letter={path.letterIndex} />
      ))}
    </svg>
  )
}
