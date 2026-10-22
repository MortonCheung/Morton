import { forwardRef } from 'react'
import { OUTLINE } from '../data/outline.generated'

/**
 * Construction lines, generated offline from the same contours the extruded
 * letters use. The frame group's transform is written imperatively by
 * useOpening from the shared camera framing, so the drawing lands exactly on
 * the z=0 plane the camera faces. Dash lengths are measured from the real
 * paths at runtime (see animation/draw.ts).
 */
export const OutlineLayer = forwardRef<SVGSVGElement>(function OutlineLayer(_props, ref) {
  return (
    <svg ref={ref} className="outline" aria-hidden="true" data-outline preserveAspectRatio="xMidYMid meet">
      <g data-outline-frame>
        <g data-outline-ink>
          {OUTLINE.letters.map((letter) => (
            <g
              key={letter.id}
              data-letter-index={letter.index}
              data-letter={letter.char}
              transform={`translate(${letter.offsetX} 0)`}
            >
              {letter.contours.map((contour, contourIndex) => (
                <path key={contourIndex} d={contour.d} data-contour-index={contourIndex} />
              ))}
            </g>
          ))}
        </g>
      </g>
    </svg>
  )
})
