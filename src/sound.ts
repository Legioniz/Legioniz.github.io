/**
 * Lightweight synthesized UI sound system.
 * No sound files are downloaded. Audio starts only after a real pointer/click
 * gesture, respecting browser autoplay policy. Every interactive control gets
 * a small hover cue and a context-specific action cue through event delegation.
 */
type UiSound =
  | 'hover'
  | 'hover-nav'
  | 'hover-link'
  | 'hover-project'
  | 'hover-control'
  | 'hover-disclosure'
  | 'focus'
  | 'click'
  | 'navigate'
  | 'toggle'
  | 'open'
  | 'close'
  | 'filter'
  | 'download'
  | 'copy'
  | 'input'
  | 'select'
  | 'submit'
  | 'success'

type Note = {
  frequency: number
  offset: number
  duration: number
  volume: number
  wave: OscillatorType
}

type SoundPattern = { notes: Note[] }

const note = (
  frequency: number,
  offset: number,
  duration: number,
  volume = 0.018,
  wave: OscillatorType = 'sine',
): Note => ({ frequency, offset, duration, volume, wave })

const patterns: Record<UiSound, SoundPattern> = {
  hover: { notes: [note(920, 0, 0.032, 0.008)] },
  'hover-nav': { notes: [note(1120, 0, 0.028, 0.007), note(1480, 0.022, 0.036, 0.006)] },
  'hover-link': { notes: [note(840, 0, 0.035, 0.007), note(690, 0.028, 0.042, 0.006)] },
  'hover-project': { notes: [note(620, 0, 0.045, 0.009, 'triangle'), note(930, 0.035, 0.055, 0.008)] },
  'hover-control': { notes: [note(760, 0, 0.026, 0.008, 'triangle')] },
  'hover-disclosure': { notes: [note(540, 0, 0.035, 0.008), note(680, 0.028, 0.035, 0.006)] },
  focus: { notes: [note(740, 0, 0.04, 0.008, 'sine')] },
  click: { notes: [note(480, 0, 0.045, 0.018, 'triangle'), note(710, 0.018, 0.052, 0.012)] },
  navigate: { notes: [note(440, 0, 0.075, 0.016), note(660, 0.055, 0.09, 0.014)] },
  toggle: { notes: [note(520, 0, 0.07, 0.015, 'triangle'), note(780, 0.045, 0.085, 0.014, 'triangle')] },
  open: { notes: [note(392, 0, 0.11, 0.015), note(523, 0.045, 0.12, 0.014), note(659, 0.09, 0.14, 0.012)] },
  close: { notes: [note(659, 0, 0.085, 0.013), note(523, 0.04, 0.095, 0.013), note(392, 0.08, 0.11, 0.012)] },
  filter: { notes: [note(587, 0, 0.055, 0.014, 'triangle'), note(880, 0.04, 0.07, 0.012, 'triangle')] },
  download: { notes: [note(587, 0, 0.07, 0.014), note(784, 0.05, 0.08, 0.014), note(988, 0.1, 0.12, 0.012)] },
  copy: { notes: [note(1047, 0, 0.045, 0.012), note(1319, 0.045, 0.06, 0.011)] },
  input: { notes: [note(390, 0, 0.025, 0.006, 'sine')] },
  select: { notes: [note(520, 0, 0.05, 0.01), note(690, 0.04, 0.06, 0.009)] },
  submit: { notes: [note(440, 0, 0.07, 0.013), note(554, 0.045, 0.08, 0.013), note(740, 0.095, 0.11, 0.012)] },
  success: { notes: [note(523, 0, 0.12, 0.014), note(659, 0.075, 0.13, 0.014), note(784, 0.15, 0.17, 0.012)] },
}

let audioContext: AudioContext | null = null
let lastPlayedAt = 0

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext }
  const AudioContextConstructor = window.AudioContext ?? audioWindow.webkitAudioContext
  if (!AudioContextConstructor) return null
  try {
    audioContext ??= new AudioContextConstructor()
    if (audioContext.state === 'suspended') void audioContext.resume().catch(() => undefined)
    return audioContext
  } catch {
    // Some privacy modes and embedded browsers can reject AudioContext creation.
    return null
  }
}

function playUiSound(sound: UiSound): void {
  try {
    const context = getAudioContext()
    if (!context) return
    const now = context.currentTime
    const pattern = patterns[sound]
    if (!pattern) return

    for (const item of pattern.notes) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const start = now + item.offset
      const end = start + item.duration
      oscillator.type = item.wave
      oscillator.frequency.setValueAtTime(item.frequency, start)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(item.volume, start + Math.min(0.012, item.duration * 0.24))
      gain.gain.exponentialRampToValueAtTime(0.0001, end)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start)
      oscillator.stop(end + 0.012)
      oscillator.onended = () => {
        oscillator.disconnect()
        gain.disconnect()
      }
    }
    lastPlayedAt = performance.now()
  } catch {
    // Audio is an optional enhancement; unsupported or blocked audio stays silent.
  }
}

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'summary',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[role="button"]',
  '[role="tab"]',
  '[tabindex="0"]',
].join(',')

function resolveHoverSound(element: HTMLElement): UiSound {
  if (element.classList.contains('project-card')) return 'hover-project'
  if (element.tagName === 'SUMMARY') return 'hover-disclosure'
  if (element.closest('.site-header, .site-footer, .primary-navigation')) return 'hover-nav'
  if (element instanceof HTMLAnchorElement) return 'hover-link'
  if (element.matches('input, select, textarea, button, [role="button"], [role="tab"]')) return 'hover-control'
  return 'hover'
}

function resolveActionSound(element: HTMLElement): UiSound {
  const explicit = element.dataset.sfx as UiSound | undefined
  if (explicit && explicit in patterns) return explicit
  if (element.tagName === 'SUMMARY') return 'toggle'
  if (element instanceof HTMLAnchorElement) {
    if (element.hasAttribute('download')) return 'download'
    if (element.getAttribute('href')?.startsWith('#')) return 'navigate'
    return 'open'
  }
  if (element.matches('select')) return 'select'
  if (element.matches('input:not([type="submit"]), textarea')) return 'input'
  if (element.matches('button[type="submit"], input[type="submit"]')) return 'submit'
  if (element.classList.contains('project-card')) return 'open'
  if (element.classList.contains('copy-profile')) return 'copy'
  if (element.classList.contains('sound-toggle') || element.classList.contains('theme-toggle') || element.classList.contains('motion-toggle') || element.classList.contains('mobile-menu-button')) return 'toggle'
  if (element.closest('.project-filters')) return 'filter'
  if (element.classList.contains('back-top')) return 'navigate'
  if (element.closest('.command-palette')) return 'navigate'
  return 'click'
}

/** Installs one delegated listener for the entire application, including dynamic cards. */
export function installInteractionSounds(isEnabled: () => boolean): () => void {
  let lastHoverElement: HTMLElement | null = null
  let lastHoverAt = 0
  let lastActionAt = 0
  let userGestureObserved = false
  let keyboardModality = false

  // Unlock audio only in a trusted user gesture. Hover audio is enabled after
  // the first click/tap/key action so a browser never treats hover as autoplay.
  const onPointerDown = () => {
    // Record the browser activation even if sound is currently muted. If the
    // visitor turns sound back on later, the next cue can start immediately.
    userGestureObserved = true
    keyboardModality = false
    if (!isEnabled()) return
    const context = getAudioContext()
    if (context?.state === 'suspended') void context.resume().catch(() => undefined)
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (!['Tab', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return
    userGestureObserved = true
    keyboardModality = true
    if (!isEnabled()) return
    const context = getAudioContext()
    if (context?.state === 'suspended') void context.resume().catch(() => undefined)
  }

  const onPointerOver = (event: PointerEvent) => {
    if (!isEnabled() || !userGestureObserved || event.pointerType === 'touch') return
    const target = event.target
    if (!(target instanceof Element)) return
    const interactive = target.closest<HTMLElement>(INTERACTIVE_SELECTOR)
    if (!interactive || interactive.matches(':disabled,[aria-disabled="true"]')) return
    if (event.relatedTarget instanceof Node && interactive.contains(event.relatedTarget)) return
    const now = performance.now()
    if (interactive === lastHoverElement && now - lastHoverAt < 260) return
    if (now - lastPlayedAt < 42 || now - lastHoverAt < 52) return
    lastHoverElement = interactive
    lastHoverAt = now
    playUiSound(resolveHoverSound(interactive))
  }

  const onFocusIn = (event: FocusEvent) => {
    if (!isEnabled() || !userGestureObserved || !keyboardModality) return
    const target = event.target
    if (!(target instanceof Element)) return
    const interactive = target.closest<HTMLElement>(INTERACTIVE_SELECTOR)
    if (!interactive || interactive.matches(':disabled,[aria-disabled="true"]')) return
    const now = performance.now()
    if (now - lastPlayedAt < 44) return
    playUiSound('focus')
  }

  const onChange = (event: Event) => {
    if (!isEnabled()) return
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    if (!target.matches('input, select, textarea')) return
    const now = performance.now()
    if (now - lastActionAt < 90) return
    lastActionAt = now
    playUiSound(resolveActionSound(target))
  }

  const onSubmit = (event: SubmitEvent) => {
    if (!isEnabled()) return
    const target = event.target
    if (!(target instanceof HTMLFormElement)) return
    // A pointer-initiated submit button already emitted the submit cue on click.
    // Keep keyboard/programmatic submissions audible without playing it twice.
    if (performance.now() - lastPlayedAt < 85) return
    playUiSound('submit')
  }

  const onClick = (event: MouseEvent) => {
    userGestureObserved = true
    const target = event.target
    if (!(target instanceof Element)) return
    const interactive = target.closest<HTMLElement>(INTERACTIVE_SELECTOR)
    if (!interactive || interactive.matches(':disabled,[aria-disabled="true"]')) return
    if (!isEnabled() && !interactive.classList.contains('sound-toggle')) return
    const now = performance.now()
    const isSoundToggle = interactive.classList.contains('sound-toggle')
    // A sound toggle is a state-change confirmation, not a duplicate hover cue.
    // Never debounce its final note: the handler may have just muted the system.
    if (!isSoundToggle && now - lastActionAt < 35) return
    lastActionAt = now
    playUiSound(resolveActionSound(interactive))
  }

  document.addEventListener('pointerdown', onPointerDown, { passive: true })
  document.addEventListener('keydown', onKeyDown, true)
  document.addEventListener('pointerover', onPointerOver, { passive: true })
  document.addEventListener('focusin', onFocusIn)
  document.addEventListener('change', onChange)
  document.addEventListener('submit', onSubmit)
  document.addEventListener('click', onClick, { passive: true })
  return () => {
    document.removeEventListener('pointerdown', onPointerDown)
    document.removeEventListener('keydown', onKeyDown, true)
    document.removeEventListener('pointerover', onPointerOver)
    document.removeEventListener('focusin', onFocusIn)
    document.removeEventListener('change', onChange)
    document.removeEventListener('submit', onSubmit)
    document.removeEventListener('click', onClick)
  }
}
