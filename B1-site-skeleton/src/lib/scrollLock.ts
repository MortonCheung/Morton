/**
 * Body scroll lock for the project detail.
 *
 * `position: fixed` + negative top is used instead of `overflow: hidden`
 * because it keeps the exact scroll offset on every engine and never lets the
 * background scroll behind the overlay. The saved Y is restored on close.
 */
export interface ScrollLockState {
  scrollY: number
  extra: string
}

export function lockBodyScroll(): ScrollLockState {
  const scrollY = window.scrollY
  const body = document.body.style
  body.position = 'fixed'
  body.top = `-${scrollY}px`
  body.left = '0'
  body.right = '0'
  body.width = '100%'
  body.overflow = 'hidden'
  document.documentElement.dataset.detailOpen = 'true'
  return { scrollY, extra: 'detail' }
}

export function unlockBodyScroll(state: ScrollLockState): void {
  const body = document.body.style
  body.position = ''
  body.top = ''
  body.left = ''
  body.right = ''
  body.width = ''
  body.overflow = ''
  delete document.documentElement.dataset.detailOpen
  window.scrollTo({ top: state.scrollY, behavior: 'instant' as ScrollBehavior })
}
