/**
 * Direction-aware masthead scroll behavior.
 * One passive scroll listener is batched through requestAnimationFrame.
 * The React component owns rendering; this module only reports hidden state
 * and updates the decorative reading-progress bar.
 */
interface MastheadScrollOptions {
  header: HTMLElement
  progress?: HTMLElement | null
  motionEnabled?: boolean
  menuOpen?: boolean
  onHiddenChange: (hidden: boolean) => void
  topThreshold?: number
}

const HIDE_AFTER = 18
const REVEAL_AFTER = 8
const DEFAULT_TOP_THRESHOLD = 76

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
  let disposed = false

  const setHidden = (hidden: boolean) => {
    if (hiddenState === hidden) return
    hiddenState = hidden
    onHiddenChange(hidden)
  }

  const update = () => {
    frame = 0
    if (disposed) return

    const currentY = Math.max(0, window.scrollY)
    const delta = currentY - lastY
    const focused = header.matches(':focus-within')

    // Keep the masthead visible near the top, while a menu is open, whenever
    // keyboard focus is inside it, and whenever motion is disabled.
    if (currentY <= topThreshold || menuOpen || !motionEnabled || focused) {
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

  update()
  window.addEventListener('scroll', scheduleUpdate, { passive: true })
  window.addEventListener('resize', scheduleUpdate, { passive: true })
  window.visualViewport?.addEventListener('resize', scheduleUpdate, { passive: true })

  return () => {
    disposed = true
    if (frame) window.cancelAnimationFrame(frame)
    window.removeEventListener('scroll', scheduleUpdate)
    window.removeEventListener('resize', scheduleUpdate)
    window.visualViewport?.removeEventListener('resize', scheduleUpdate)
  }
}
