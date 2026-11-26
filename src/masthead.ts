/**
 * Direction-aware masthead scroll behavior.
 *
 * Scroll input is frame-batched. The header stays available while the visitor
 * is interacting with it, and only hides after deliberate downward movement.
 */
interface MastheadScrollOptions {
  header: HTMLElement
  progress?: HTMLElement | null
  motionEnabled?: boolean
  menuOpen?: boolean
  onHiddenChange: (hidden: boolean) => void
  topThreshold?: number
}

const HIDE_AFTER = 48
const REVEAL_AFTER = 10
const DEFAULT_TOP_THRESHOLD = 88

export function installMastheadScrollBehavior(options: MastheadScrollOptions): () => void {
  const {
    header,
    progress = null,
    motionEnabled = true,
    menuOpen = false,
    onHiddenChange,
    topThreshold = DEFAULT_TOP_THRESHOLD,
  } = options

  let frame = 0
  let lastY = Math.max(0, window.scrollY)
  let direction = 0
  let accumulated = 0
  let hiddenState: boolean | null = null
  let pointerInside = false
  let disposed = false

  const setHidden = (hidden: boolean) => {
    if (hiddenState === hidden) return
    hiddenState = hidden
    onHiddenChange(hidden)
  }

  const resetScrollIntent = () => {
    direction = 0
    accumulated = 0
    // Do not count scrolling that happened while the visitor was interacting
    // with the header toward the next hide/reveal threshold.
    lastY = Math.max(0, window.scrollY)
  }

  const revealForInteraction = () => {
    resetScrollIntent()
    setHidden(false)
  }

  const update = () => {
    frame = 0
    if (disposed) return

    const currentY = Math.max(0, window.scrollY)
    const delta = currentY - lastY
    const focused = header.matches(':focus-within')

    // Never slide the control surface away while it is being used.
    if (currentY <= topThreshold || menuOpen || !motionEnabled || focused || pointerInside) {
      setHidden(false)
      direction = 0
      accumulated = 0
    } else if (Math.abs(delta) >= 1) {
      const nextDirection = Math.sign(delta)
      if (nextDirection !== direction) {
        direction = nextDirection
        accumulated = 0
      }
      accumulated += Math.abs(delta)

      const threshold = direction < 0 ? REVEAL_AFTER : HIDE_AFTER
      if (accumulated >= threshold) {
        setHidden(direction > 0)
        accumulated = 0
      }
    }

    const max = document.documentElement.scrollHeight - window.innerHeight
    if (progress) {
      const percentage = max > 0 ? (currentY / max) * 100 : 0
      progress.style.width = `${Math.max(0, Math.min(100, percentage))}%`
    }
    lastY = currentY
  }

  const scheduleUpdate = () => {
    if (frame || disposed) return
    frame = window.requestAnimationFrame(update)
  }

  const onPointerEnter = (event: PointerEvent) => {
    // Touch has no persistent hover state. Do not pin the masthead after a tap.
    if (event.pointerType === 'touch') return
    pointerInside = true
    revealForInteraction()
  }

  const onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return
    pointerInside = false
    resetScrollIntent()
  }

  const onFocusIn = () => revealForInteraction()

  const onFocusOut = (event: FocusEvent) => {
    const nextTarget = event.relatedTarget
    if (nextTarget instanceof Node && header.contains(nextTarget)) return
    resetScrollIntent()
  }

  update()
  window.addEventListener('scroll', scheduleUpdate, { passive: true })
  window.addEventListener('resize', scheduleUpdate, { passive: true })
  window.visualViewport?.addEventListener('resize', scheduleUpdate, { passive: true })
  header.addEventListener('pointerenter', onPointerEnter)
  header.addEventListener('pointerleave', onPointerLeave)
  header.addEventListener('focusin', onFocusIn)
  header.addEventListener('focusout', onFocusOut)

  return () => {
    disposed = true
    if (frame) window.cancelAnimationFrame(frame)
    window.removeEventListener('scroll', scheduleUpdate)
    window.removeEventListener('resize', scheduleUpdate)
    window.visualViewport?.removeEventListener('resize', scheduleUpdate)
    header.removeEventListener('pointerenter', onPointerEnter)
    header.removeEventListener('pointerleave', onPointerLeave)
    header.removeEventListener('focusin', onFocusIn)
    header.removeEventListener('focusout', onFocusOut)
  }
}
