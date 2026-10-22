import gsap from 'gsap'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ProjectVisual } from '../../components/ProjectVisual'
import type { DetailSession } from './useDetailController'

interface ProjectDetailProps {
  session: DetailSession
  reduced: boolean
  onBeginClose: () => DetailSession | null
  onFinished: () => void
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea'

/**
 * Source-to-foreground detail.
 *
 * The card lands at its final layout rect, is measured, then inverted to the
 * clicked card's rect and animated to identity (FLIP). Text/media fade in only
 * after the geometry has mostly settled, so nothing readable is ever distorted
 * by a scale transform.
 */
export function ProjectDetail({ session, reduced, onBeginClose, onFinished }: ProjectDetailProps) {
  const { project } = session
  const [viewIndex, setViewIndex] = useState(0)
  const cardRef = useRef<HTMLElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const baseRectRef = useRef<DOMRect | null>(null)
  const openTlRef = useRef<gsap.core.Timeline | null>(null)
  const closingRef = useRef(false)

  useLayoutEffect(() => {
    const card = cardRef.current
    const copy = copyRef.current
    const media = mediaRef.current
    const scrim = scrimRef.current
    if (!card || !copy || !media || !scrim) return

    const rect = card.getBoundingClientRect()
    baseRectRef.current = rect
    if (reduced) {
      gsap.set(card, { opacity: 0 })
      gsap.set(copy, { opacity: 1, y: 0 })
      gsap.set(media, { opacity: 1, scale: 1 })
      gsap.set(scrim, { opacity: 0 })
      const simple = gsap.timeline()
      openTlRef.current = simple
      simple.to(scrim, { opacity: 1, duration: 0.12 }, 0).to(card, { opacity: 1, duration: 0.16 }, 0)
      return () => {
        simple.kill()
        openTlRef.current = null
      }
    }
    const source = session.sourceRect
    const scaleX = Math.min(1, Math.max(0.02, source.width / rect.width))
    const scaleY = Math.min(1, Math.max(0.02, source.height / rect.height))
    const x = source.left - rect.left
    const y = source.top - rect.top

    gsap.set(card, { x, y, scaleX, scaleY, transformOrigin: 'top left' })
    gsap.set(copy, { opacity: 0, y: 18 })
    gsap.set(media, { opacity: 0, scale: 1.04 })
    gsap.set(scrim, { opacity: 0 })

    const tl = gsap.timeline()
    openTlRef.current = tl
    tl.to(scrim, { opacity: 1, duration: 0.26, ease: 'power1.out' }, 0)
      .to(card, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.62, ease: 'power3.inOut' }, 0)
      .to(media, { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' }, 0.2)
      .to(copy, { opacity: 1, y: 0, duration: 0.38, ease: 'power2.out' }, 0.3)

    return () => {
      tl.kill()
      openTlRef.current = null
    }
    // Session identity is stable for the lifetime of one open detail.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, reduced])

  useEffect(() => {
    const id = window.requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(id)
  }, [])

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    openTlRef.current?.kill()
    openTlRef.current = null
    const detailSession = onBeginClose()
    const card = cardRef.current
    const copy = copyRef.current
    const media = mediaRef.current
    const scrim = scrimRef.current
    if (!card) {
      onFinished()
      return
    }
    gsap.to([copy, media], { opacity: 0, duration: reduced ? 0.06 : 0.14, overwrite: true })
    gsap.to(scrim, { opacity: 0, duration: reduced ? 0.12 : 0.3, ease: 'power1.out' })
    if (reduced) {
      gsap.to(card, { opacity: 0, duration: 0.14, onComplete: () => onFinished() })
      return
    }
    window.requestAnimationFrame(() => {
      const base = baseRectRef.current
      const source = detailSession?.sourceEl
      const target = source && source.isConnected ? source.getBoundingClientRect() : null
      const finish = () => onFinished()
      if (base && target && target.width > 0) {
        gsap.to(card, {
          x: target.left - base.left,
          y: target.top - base.top,
          scaleX: Math.max(0.02, target.width / base.width),
          scaleY: Math.max(0.02, target.height / base.height),
          duration: 0.4,
          ease: 'power2.inOut',
          onComplete: finish,
        })
      } else {
        gsap.to(card, { scaleX: 0.9, scaleY: 0.9, opacity: 0, duration: 0.28, ease: 'power2.in', onComplete: finish })
      }
    })
  }, [onBeginClose, onFinished, reduced])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
        return
      }
      if (event.key !== 'Tab') return
      const card = cardRef.current
      if (!card) return
      const nodes = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (!nodes.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [requestClose])

  const view = project.detail.views[viewIndex] ?? project.detail.views[0]

  return createPortal(
    <div className="detail" data-detail role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div className="detail__scrim" ref={scrimRef} onClick={requestClose} aria-hidden="true" />
      <article className="detail__card" ref={cardRef}>
        <header className="detail__head">
          <p className="detail__index">
            {project.index} <span aria-hidden="true">/</span> OUTPUT
          </p>
          <button className="detail__close" ref={closeRef} type="button" data-detail-close onClick={requestClose}>
            <span className="detail__close-label">返回总览</span>
            <span className="detail__close-key" aria-hidden="true">
              ESC
            </span>
          </button>
        </header>

        <div className="detail__body">
          <div className="detail__media" ref={mediaRef}>
            <ProjectVisual shape={view.shape} a={project.visual.a} b={project.visual.b} label="占位视觉" className="pv--detail" />
            <div className="detail__thumbs" role="group" aria-label="切换占位视图">
              {project.detail.views.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`detail__thumb${index === viewIndex ? ' is-active' : ''}`}
                  aria-pressed={index === viewIndex}
                  onClick={() => setViewIndex(index)}
                >
                  <span className="detail__thumb-key">{String(index + 1).padStart(2, '0')}</span>
                  <span className="detail__thumb-label">{item.label}</span>
                </button>
              ))}
            </div>
            <p className="detail__caption">{view.caption}</p>
          </div>

          <div className="detail__copy" ref={copyRef}>
            <p className="detail__kicker">{project.type}</p>
            <h2 className="detail__title" id="detail-title">
              {project.title}
            </h2>
            <p className="detail__summary">{project.summary}</p>

            <dl className="detail__meta">
              <div>
                <dt>角色</dt>
                <dd>{project.detail.role}</dd>
              </div>
              <div>
                <dt>年份</dt>
                <dd>{project.detail.year}</dd>
              </div>
              <div>
                <dt>状态</dt>
                <dd>{project.detail.status}</dd>
              </div>
              <div>
                <dt>链接</dt>
                <dd>{project.detail.link}</dd>
              </div>
            </dl>

            <div className="detail__sections">
              {(
                [
                  ['概述', project.detail.overview],
                  ['问题', project.detail.problem],
                  ['做法', project.detail.approach],
                  ['结果', project.detail.outcome],
                ] as const
              ).map(([label, body]) => (
                <section key={label} className="detail__section">
                  <h3>{label}</h3>
                  <p>{body}</p>
                </section>
              ))}
            </div>

            <p className="detail__footnote">
              以上标题、说明、链接与视觉均为占位内容。关闭后回到作品总览的原位。按 <kbd>Esc</kbd> 或点击「返回总览」。
            </p>
          </div>
        </div>
      </article>
    </div>,
    document.body,
  )
}
