/**
 * Lightweight environment profiling for progressive enhancement.
 * CSS remains responsible for layout; this module only tunes optional effects.
 */
type AdaptiveQuality = 'economy' | 'balanced' | 'full'
type AdaptiveOrientation = 'portrait' | 'landscape'
type AdaptivePointer = 'coarse' | 'fine'

interface AdaptiveInputs {
  width: number
  height: number
  devicePixelRatio: number
  visualScale: number
  pointer: AdaptivePointer
  saveData: boolean
  deviceMemory: number
  hardwareConcurrency: number
  reducedMotion: boolean
}

interface AdaptiveProfile {
  width: number
  height: number
  orientation: AdaptiveOrientation
  pointer: AdaptivePointer
  quality: AdaptiveQuality
  reducedMotion: boolean
  saveData: boolean
  particleLimit: number
  pixelRatioCap: number
  frameRate: number
  visualScale: number
}

interface NavigatorHints extends Navigator {
  deviceMemory?: number
  connection?: { saveData?: boolean; addEventListener?: (type: string, listener: EventListener) => void; removeEventListener?: (type: string, listener: EventListener) => void }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Pure decision function so adaptive behavior can be tested without a browser. */
export function deriveAdaptiveProfile(input: AdaptiveInputs): AdaptiveProfile {
  const width = Math.max(1, Math.round(Number.isFinite(input.width) ? input.width : 1))
  const height = Math.max(1, Math.round(Number.isFinite(input.height) ? input.height : 1))
  const scale = clamp(Number.isFinite(input.visualScale) ? input.visualScale : 1, 0.5, 4)
  const memory = Number.isFinite(input.deviceMemory) && input.deviceMemory > 0 ? input.deviceMemory : 4
  const cores = Number.isFinite(input.hardwareConcurrency) && input.hardwareConcurrency > 0 ? input.hardwareConcurrency : 4
  const dpr = clamp(Number.isFinite(input.devicePixelRatio) ? input.devicePixelRatio : 1, 0.75, 4)
  const smallViewport = width < 520 || height < 340
  const constrained = input.saveData || memory <= 2 || cores <= 2 || scale >= 1.65
  const balanced = input.pointer === 'coarse' || smallViewport || memory <= 4 || cores <= 4 || scale >= 1.25
  const quality: AdaptiveQuality = constrained || input.reducedMotion ? 'economy' : balanced ? 'balanced' : 'full'

  // Bound the visual workload. The desktop ceiling is 42 particles (861 possible pairs).
  const particleLimit = input.saveData || input.reducedMotion
    ? 0
    : quality === 'economy' ? 12 : quality === 'balanced' ? (input.pointer === 'coarse' ? 18 : 24) : 42

  return {
    width,
    height,
    orientation: width >= height ? 'landscape' : 'portrait',
    pointer: input.pointer,
    quality,
    reducedMotion: input.reducedMotion,
    saveData: input.saveData,
    particleLimit,
    pixelRatioCap: Math.min(dpr, quality === 'full' ? 1.25 : quality === 'balanced' ? 1.05 : 0.85),
    frameRate: quality === 'full' ? 24 : quality === 'balanced' ? 20 : 0,
    visualScale: scale,
  }
}

export function readAdaptiveProfile(): AdaptiveProfile {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return deriveAdaptiveProfile({ width: 1280, height: 800, devicePixelRatio: 1, visualScale: 1, pointer: 'fine', saveData: false, deviceMemory: 8, hardwareConcurrency: 8, reducedMotion: false })
  }

  const nav = navigator as NavigatorHints
  const visualViewport = window.visualViewport
  const pointerQuery = window.matchMedia?.('(pointer: coarse)')
  const pointer: AdaptivePointer = pointerQuery ? (pointerQuery.matches ? 'coarse' : 'fine') : (nav.maxTouchPoints > 0 ? 'coarse' : 'fine')
  const reducedMotion = document.documentElement.dataset.motion === 'off'
  const width = Math.min(window.innerWidth || 1, visualViewport?.width || window.innerWidth || 1)
  const height = Math.min(window.innerHeight || 1, visualViewport?.height || window.innerHeight || 1)

  return deriveAdaptiveProfile({
    width,
    height,
    devicePixelRatio: window.devicePixelRatio || 1,
    visualScale: visualViewport?.scale || 1,
    pointer,
    saveData: nav.connection?.saveData === true,
    deviceMemory: nav.deviceMemory ?? 4,
    hardwareConcurrency: nav.hardwareConcurrency ?? 4,
    reducedMotion,
  })
}

/**
 * Key only the values that change optional rendering work. Layout dimensions are
 * deliberately excluded: CSS and the canvas ResizeObserver already handle those.
 * This prevents React/Canvas work from being rescheduled for every dragged pixel.
 */
export function adaptiveEffectKey(profile: AdaptiveProfile): string {
  return [profile.orientation, profile.pointer, profile.quality, profile.reducedMotion, profile.saveData, profile.particleLimit, profile.pixelRatioCap, profile.frameRate].join('|')
}

/**
 * Coalesces resize/orientation/zoom/network changes to one update per frame.
 * Falls back to window resize when ResizeObserver or VisualViewport is absent.
 */
export function observeAdaptiveProfile(onChange: (profile: AdaptiveProfile) => void): () => void {
  if (typeof window === 'undefined') return () => undefined

  let frame = 0
  let lastKey = ''
  const emit = () => {
    frame = 0
    const next = readAdaptiveProfile()
    const nextKey = adaptiveEffectKey(next)
    if (nextKey === lastKey) return
    lastKey = nextKey
    onChange(next)
  }
  const schedule = () => {
    if (frame) return
    frame = window.requestAnimationFrame(emit)
  }

  const rootObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(schedule)
    : null
  rootObserver?.observe(document.documentElement)

  // A visitor pause or resume updates the optional rendering profile immediately.
  const motionPreferenceObserver = typeof MutationObserver !== 'undefined'
    ? new MutationObserver(schedule)
    : null
  motionPreferenceObserver?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] })

  const pointerQuery = window.matchMedia?.('(pointer: coarse)')
  const addMediaListener = (query: MediaQueryList | undefined) => {
    if (!query) return
    if (typeof query.addEventListener === 'function') query.addEventListener('change', schedule)
    else (query as MediaQueryList & { addListener?: (listener: () => void) => void }).addListener?.(schedule)
  }
  const removeMediaListener = (query: MediaQueryList | undefined) => {
    if (!query) return
    if (typeof query.removeEventListener === 'function') query.removeEventListener('change', schedule)
    else (query as MediaQueryList & { removeListener?: (listener: () => void) => void }).removeListener?.(schedule)
  }

  const nav = navigator as NavigatorHints
  nav.connection?.addEventListener?.('change', schedule)
  addMediaListener(pointerQuery)
  window.addEventListener('resize', schedule, { passive: true })
  window.addEventListener('orientationchange', schedule, { passive: true })
  window.visualViewport?.addEventListener('resize', schedule, { passive: true })
  const initialProfile = readAdaptiveProfile()
  lastKey = adaptiveEffectKey(initialProfile)
  onChange(initialProfile)

  return () => {
    if (frame) window.cancelAnimationFrame(frame)
    rootObserver?.disconnect()
    motionPreferenceObserver?.disconnect()
    nav.connection?.removeEventListener?.('change', schedule)
    removeMediaListener(pointerQuery)
    window.removeEventListener('resize', schedule)
    window.removeEventListener('orientationchange', schedule)
    window.visualViewport?.removeEventListener('resize', schedule)
  }
}
