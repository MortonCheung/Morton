import { useLayoutEffect, useRef } from 'react'
import type { LetterSpec } from '../../letters/buildWord'
import { applyDrawOutlineProjection, type OutlineTarget, type StageRuntime } from './stage'
import type { CameraLayout } from '../../scenes/cameraLayout'

interface OutlineStageProps {
  letters: LetterSpec[]
  capHeight: number
  stage: StageRuntime
  layout: CameraLayout | null
  viewport: { width: number; height: number }
  onReady: (target: OutlineTarget | null) => void
}

/**
 * The drawing layer. Paths are emitted from the *same* TTF contours that the
 * extruded meshes use, and a live camera projection matrix locks them to the
 * 3D silhouette at every viewport size.
 */
export function OutlineStage({ letters, capHeight, stage, layout, viewport, onReady }: OutlineStageProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const groupRef = useRef<SVGGElement>(null)

  useLayoutEffect(() => {
    if (!layout || !groupRef.current) return
    applyDrawOutlineProjection(
      { root: svgRef.current as SVGSVGElement, group: groupRef.current, letterGroups: [], paths: [] },
      layout,
      viewport.width,
      viewport.height,
    )
  }, [layout, viewport.width, viewport.height])

  useLayoutEffect(() => {
    if (!svgRef.current || !groupRef.current) return
    const letterGroups = Array.from(groupRef.current.querySelectorAll<SVGGElement>('[data-letter-index]'))
    const paths = letterGroups.map((group) => Array.from(group.querySelectorAll<SVGPathElement>('path')))
    const target: OutlineTarget = { root: svgRef.current, group: groupRef.current, letterGroups, paths }
    stage.outline = target
    onReady(target)
    return () => {
      if (stage.outline === target) stage.outline = null
      onReady(null)
    }
  }, [letters, onReady, stage])

  return (
    <svg ref={svgRef} className="outline" aria-hidden="true" focusable="false">
      <g ref={groupRef}>
        {letters.map((letter) => (
          <g
            key={letter.id}
            data-letter-index={letter.index}
            data-letter-char={letter.char}
            transform={`translate(${letter.offsetX} ${-capHeight / 2})`}
          >
            {letter.paths.map((d, index) => (
              <path key={index} d={d} fill="none" />
            ))}
          </g>
        ))}
      </g>
    </svg>
  )
}
