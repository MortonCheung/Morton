import type { LayoutFrame } from '../lib/frame'
import type { ShadowPath } from '../features/opening/svgPaths'

interface Props {
  paths: ShadowPath[]
  frame: LayoutFrame
}

/**
 * Contact shadow with the actual glyph silhouette (same contour data as the
 * solid), blurred and offset down-right for the upper-left key light. It fades
 * in with `expanding`, so the drawing state has no fake shadow floating under a
 * word that does not exist yet.
 */
export function ShadowLayer({ paths, frame }: Props) {
  return (
    <svg className="opening-shadow" viewBox={`0 0 ${frame.cssW} ${frame.cssH}`} aria-hidden="true" focusable="false">
      {paths.map((path) => (
        <path key={path.letterIndex} d={path.d} fillRule="evenodd" />
      ))}
    </svg>
  )
}
