/**
 * Bidirectional section reveals driven by IntersectionObserver.
 * CSS owns all easing and movement; JavaScript only toggles visibility state.
 * If either observer API is unavailable, the page stays fully readable.
 */
interface RevealMotionOptions {
  enabled?: boolean
  scope?: ParentNode
  root?: HTMLElement
  visibleClass?: string
}

const REVEAL_SELECTOR = '[data-reveal]'
const READING_MARGIN = '-48px 0px -48px 0px'
const INITIAL_CALLBACK_FALLBACK_MS = 1800

function findTargets(scope: ParentNode): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(REVEAL_SELECTOR))
}

function showEverything(root: HTMLElement, scope: ParentNode, visibleClass: string): void {
  root.removeAttribute('data-reveal-ready')
  findTargets(scope).forEach((element) => {
    element.classList.add(visibleClass)
    element.dataset.revealState = 'in'
  })
}

/**
 * Installs the reveal controller once per rendered view.
 * Entering and leaving the reading viewport toggles .is-visible both ways,
 * so scrolling down fades content out and scrolling back reveals it again.
 */
export function installScrollReveal(options: RevealMotionOptions = {}): () => void {
  const root = options.root ?? document.documentElement
  const scope = options.scope ?? document.getElementById('main-content') ?? document.body
  const enabled = options.enabled ?? true
  const visibleClass = options.visibleClass ?? 'is-visible'

  // A no-motion or unsupported-browser fallback must never hide content.
  if (!enabled || typeof IntersectionObserver === 'undefined' || typeof MutationObserver === 'undefined') {
    showEverything(root, scope, visibleClass)
    return () => undefined
  }

  const tracked = new Set<HTMLElement>()
  let disposed = false
  let receivedInitialBatch = false
  let fallbackTimer = 0

  const observer = new IntersectionObserver((entries) => {
    receivedInitialBatch = true
    if (fallbackTimer) {
      window.clearTimeout(fallbackTimer)
      fallbackTimer = 0
    }

    for (const entry of entries) {
      const element = entry.target as HTMLElement
      if (!tracked.has(element) || !element.isConnected) continue
      const visible = entry.isIntersecting && entry.intersectionRatio > 0
      element.classList.toggle(visibleClass, visible)
      element.dataset.revealState = visible ? 'in' : 'out'
    }
  }, {
    root: null,
    rootMargin: READING_MARGIN,
    threshold: 0,
  })

  const register = (element: HTMLElement) => {
    if (disposed || tracked.has(element) || !element.matches(REVEAL_SELECTOR)) return
    tracked.add(element)

    const siblings = element.parentElement
      ? Array.from(element.parentElement.children).filter((item) => item.matches(REVEAL_SELECTOR))
      : []
    const index = Math.max(0, siblings.indexOf(element))
    element.style.setProperty('--reveal-delay', `${Math.min(index, 4) * 58}ms`)
    element.classList.remove(visibleClass)
    element.dataset.revealState = 'out'
    observer.observe(element)
  }

  const scan = (node: Node) => {
    if (!(node instanceof HTMLElement)) return
    if (node.matches(REVEAL_SELECTOR)) register(node)
    node.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach(register)
  }

  findTargets(scope).forEach(register)
  if (tracked.size === 0) {
    observer.disconnect()
    root.removeAttribute('data-reveal-ready')
    return () => undefined
  }

  const mutationObserver = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach(scan)
      record.removedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return
        const removed = [
          ...(node.matches(REVEAL_SELECTOR) ? [node] : []),
          ...node.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
        ]
        removed.forEach((element) => {
          observer.unobserve(element)
          tracked.delete(element)
        })
      })
    }
  })

  mutationObserver.observe(scope as Node, { childList: true, subtree: true })
  root.dataset.revealReady = 'true'

  // Safety path: if an embedded/old browser exposes IO but never dispatches
  // its initial observation batch, reveal content rather than leave it hidden.
  fallbackTimer = window.setTimeout(() => {
    if (disposed || receivedInitialBatch) return
    showEverything(root, scope, visibleClass)
    observer.disconnect()
    mutationObserver.disconnect()
  }, INITIAL_CALLBACK_FALLBACK_MS)

  return () => {
    disposed = true
    if (fallbackTimer) window.clearTimeout(fallbackTimer)
    observer.disconnect()
    mutationObserver.disconnect()
    root.removeAttribute('data-reveal-ready')
  }
}
