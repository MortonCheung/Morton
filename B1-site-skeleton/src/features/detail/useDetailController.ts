import { useCallback, useRef, useState } from 'react'
import type { Project } from '../../data/projects'
import { setDetail } from '../../lib/timeline'
import { lockBodyScroll, unlockBodyScroll, type ScrollLockState } from '../../lib/scrollLock'

export interface SourceRect {
  left: number
  top: number
  width: number
  height: number
}

export interface DetailSession {
  project: Project
  sourceEl: HTMLButtonElement | null
  sourceRect: SourceRect
  lock: ScrollLockState
}

export interface DetailController {
  session: DetailSession | null
  selectedId: string | null
  open: (project: Project, sourceEl: HTMLButtonElement) => void
  /** Restores background scroll and returns the session for the exit animation. */
  beginClose: () => DetailSession | null
  /** Clears the session and returns keyboard focus to the source card. */
  finishClose: () => void
}

export function useDetailController(): DetailController {
  const [session, setSession] = useState<DetailSession | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const sessionRef = useRef<DetailSession | null>(null)

  const open = useCallback((project: Project, sourceEl: HTMLButtonElement) => {
    if (sessionRef.current) return
    const rect = sourceEl.getBoundingClientRect()
    const lock = lockBodyScroll()
    const next: DetailSession = {
      project,
      sourceEl,
      sourceRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      lock,
    }
    sessionRef.current = next
    setSession(next)
    setSelectedId(project.id)
    setDetail({ open: true, sourceId: project.id })
  }, [])

  const beginClose = useCallback(() => {
    const current = sessionRef.current
    if (!current) return null
    unlockBodyScroll(current.lock)
    setDetail({ open: false, sourceId: current.project.id })
    return current
  }, [])

  const finishClose = useCallback(() => {
    const current = sessionRef.current
    sessionRef.current = null
    setSession(null)
    setDetail({ open: false, sourceId: null })
    const source = current?.sourceEl
    if (source && source.isConnected) {
      source.focus({ preventScroll: true })
    }
  }, [])

  return { session, selectedId, open, beginClose, finishClose }
}
