import { useRef } from 'react'
import { MicroUI } from './MicroUI'
import { OutlineLayer } from './OutlineLayer'
import { useOpening } from '../hooks/useOpening'

export function OpeningStage() {
  const stageRef = useRef<HTMLElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const outlineRef = useRef<SVGSVGElement | null>(null)
  const progressRef = useRef<HTMLElement | null>(null)

  const { phase, reducedMotion, error, replay } = useOpening({
    stage: stageRef,
    canvas: canvasRef,
    outline: outlineRef,
    progress: progressRef,
  })

  return (
    <main ref={stageRef} className="stage" data-phase={phase} data-morton-root>
      <div className="stage__backdrop" aria-hidden="true" />
      <canvas ref={canvasRef} className="stage__canvas" aria-hidden="true" />
      <OutlineLayer ref={outlineRef} />
      <div className="stage__vignette" aria-hidden="true" />
      <div className="stage__grain" aria-hidden="true" />
      <h1 className="sr-only">MORTON — Personal Identity</h1>
      <MicroUI phase={phase} reducedMotion={reducedMotion} error={error} onReplay={replay} progressRef={progressRef} />
    </main>
  )
}
