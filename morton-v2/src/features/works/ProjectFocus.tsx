/**
 * Project focus — a source-anchored detail layer, not a route change.
 *
 * The figure FLIPs from the exact rectangle the user clicked (first/last/invert/play),
 * the information column fades in after the geometry settles, and closing runs the
 * inverse FLIP back to the same source card. Scroll position and focus are restored
 * by the caller.
 */
import gsap from 'gsap'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { Plate } from '../../styleframes/parts'
import type { Work } from '../../data/site'
import type { OpenRequest } from './WorksSection'

export function ProjectFocus({ request, onClose }: { request: OpenRequest; onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const figureRef = useRef<HTMLDivElement>(null)
  const infoRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const closing = useRef(false)
  const { work, rect } = request

  // open: FLIP from the source rect to the settled layout position
  useLayoutEffect(() => {
    const figure = figureRef.current
    const info = infoRef.current
    if (!figure) return
    const last = figure.getBoundingClientRect()
    const dx = rect.left - last.left
    const dy = rect.top - last.top
    const sx = last.width ? rect.width / last.width : 1
    const sy = last.height ? rect.height / last.height : 1
    const tl = gsap.timeline()
    tl.fromTo(
      figure,
      { x: dx, y: dy, scaleX: sx, scaleY: sy, transformOrigin: 'top left' },
      { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.62, ease: 'power3.inOut' },
    )
    if (info) tl.fromTo(info, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.28)
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      tl.kill()
      gsap.set([figure, info], { clearProps: 'all' })
    }
  }, [rect])

  // close: inverse FLIP, then let the caller unmount and restore focus/scroll
  const close = () => {
    if (closing.current) return
    closing.current = true
    const figure = figureRef.current
    const info = infoRef.current
    if (!figure) {
      onClose()
      return
    }
    const last = figure.getBoundingClientRect()
    const dx = rect.left - last.left
    const dy = rect.top - last.top
    const sx = last.width ? rect.width / last.width : 1
    const sy = last.height ? rect.height / last.height : 1
    const tl = gsap.timeline({ onComplete: onClose })
    if (info) tl.to(info, { opacity: 0, duration: 0.18 }, 0)
    tl.to(figure, { x: dx, y: dy, scaleX: sx, scaleY: sy, duration: 0.5, ease: 'power3.inOut' }, 0)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  return (
    <div className="focus" role="dialog" aria-modal="true" aria-labelledby="focus-title" data-detail ref={rootRef}>
      <div className="focus__figure" ref={figureRef}>
        <Plate id={work.plate} loading="eager" />
      </div>

      <div className="focus__info" ref={infoRef}>
        <div className="focus__top">
          <span className="label">Project focus</span>
          <button type="button" className="btn-back" ref={closeRef} onClick={close} data-detail-close>
            Back to works <span aria-hidden="true">←</span>
          </button>
        </div>

        <h2 id="focus-title" className="display focus__title">
          {work.title}
        </h2>

        <dl className="focus__meta">
          <div>
            <dt className="label">Role</dt>
            <dd>{work.role}</dd>
          </div>
          <div>
            <dt className="label">Year</dt>
            <dd>{work.year}</dd>
          </div>
          <div>
            <dt className="label">Type</dt>
            <dd>{work.type}</dd>
          </div>
          <div>
            <dt className="label">Status</dt>
            <dd>{work.status}</dd>
          </div>
        </dl>

        <p className="body-copy focus__summary">{work.summary}</p>
        <p className="body-copy focus__detail">{work.detail}</p>

        <div className="focus__foot">
          <span className="label">Plate · {work.index}</span>
          <span className="label">Original placeholder material</span>
        </div>
      </div>
    </div>
  )
}
