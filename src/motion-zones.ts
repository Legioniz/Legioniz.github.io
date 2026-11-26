/**
 * Keeps decorative motion zones synchronized with the live DOM and viewport.
 *
 * The observer is attached to a stable page scope rather than a snapshot of
 * current nodes. Lazy React chunks, filtered cards, and other inserted content
 * are registered automatically. Removed nodes are unobserved and released.
 */
type MotionZoneObserverOptions = {
  scope?: ParentNode
  activeClass?: string
}

const MOTION_ZONE_SELECTOR = '[data-motion-zone]'
const ACTIVATION_MARGIN = 80
const ROOT_MARGIN = `${ACTIVATION_MARGIN}px 0px`

function isNearViewport(element: HTMLElement): boolean {
  const bounds = element.getBoundingClientRect()
  const visualViewport = window.visualViewport
  const viewportTop = visualViewport?.offsetTop ?? 0
  const viewportBottom = viewportTop + (visualViewport?.height || window.innerHeight || 0)
  return bounds.bottom >= viewportTop - ACTIVATION_MARGIN
    && bounds.top <= viewportBottom + ACTIVATION_MARGIN
}

export function installMotionZoneObserver(options: MotionZoneObserverOptions = {}): () => void {
  if (typeof document === 'undefined') return () => undefined

  const scope = options.scope ?? document.getElementById('main-content') ?? document.body
  if (!scope) return () => undefined

  const activeClass = options.activeClass ?? 'motion-active'
  const tracked = new Set<HTMLElement>()
  let disposed = false

  // IntersectionObserver and MutationObserver are treated as a pair. If either
  // is unavailable, current zones fail open; when MutationObserver exists,
  // subsequently inserted zones also receive the safe active fallback.
  const canTrackDynamicNodes = typeof MutationObserver !== 'undefined'
  const canTrackViewport = typeof IntersectionObserver !== 'undefined'
  const observer = canTrackDynamicNodes && canTrackViewport
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement
          if (!tracked.has(element) || !element.isConnected) {
            unregister(element)
            return
          }

          // IntersectionObserver callbacks are queued asynchronously. Re-read
          // the current geometry instead of applying a possibly stale entry
          // after a resize, zoom, or scroll that happened while it was queued.
          element.classList.toggle(activeClass, isNearViewport(element))
        })
      }, { rootMargin: ROOT_MARGIN, threshold: 0 })
    : null

  function register(element: HTMLElement): void {
    if (disposed || tracked.has(element) || !element.matches(MOTION_ZONE_SELECTOR) || !element.isConnected) return
    tracked.add(element)

    if (!observer) {
      element.classList.add(activeClass)
      return
    }

    // Apply the initial viewport state synchronously so first paint does not
    // wait for IntersectionObserver's asynchronous first callback.
    element.classList.toggle(activeClass, isNearViewport(element))
    observer.observe(element)
  }

  function unregister(element: HTMLElement): void {
    if (!tracked.delete(element)) return
    observer?.unobserve(element)
    element.classList.remove(activeClass)
  }

  function scanAddedNode(node: Node): void {
    if (!(node instanceof Element)) return
    if (node instanceof HTMLElement) register(node)
    node.querySelectorAll<HTMLElement>(MOTION_ZONE_SELECTOR).forEach(register)
  }

  function releaseRemovedNode(node: Node): void {
    if (!(node instanceof Element)) return
    if (node instanceof HTMLElement) unregister(node)
    node.querySelectorAll<HTMLElement>(MOTION_ZONE_SELECTOR).forEach(unregister)
  }

  function handleMutations(records: MutationRecord[]): void {
    records.forEach((record) => {
      if (record.type === 'attributes' && record.target instanceof HTMLElement) {
        const target = record.target
        if (target.matches(MOTION_ZONE_SELECTOR)) register(target)
        else unregister(target)
      }
      record.addedNodes.forEach(scanAddedNode)
      record.removedNodes.forEach(releaseRemovedNode)
    })
  }

  // Observe the scope even when it initially contains no motion zones. This is
  // essential for lazy-loaded feature sections that mount after the first render.
  scope.querySelectorAll<HTMLElement>(MOTION_ZONE_SELECTOR).forEach(register)

  const mutationObserver = canTrackDynamicNodes
    ? new MutationObserver(handleMutations)
    : null
  mutationObserver?.observe(scope as Node, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-motion-zone'],
  })

  return () => {
    if (disposed) return
    disposed = true
    mutationObserver?.disconnect()
    observer?.disconnect()
    tracked.forEach((element) => element.classList.remove(activeClass))
    tracked.clear()
  }
}
