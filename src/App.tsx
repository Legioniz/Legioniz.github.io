import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { ReactNode, SyntheticEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { achievements, education, experience, extracurriculars, projects, skillGroups } from './data'
import type { Project, ProjectCategory } from './data'
import { siteConfig } from './config'
import { installInteractionSounds } from './sound'
import { readAdaptiveProfile, observeAdaptiveProfile } from './adaptive'
import { installScrollReveal } from './reveal'
import { installMastheadScrollBehavior } from './masthead'
import { IntroSequence, ProjectCompare, QuickNavigator, ServiceWorkerUpdateNotice } from './PortfolioChrome'
const PortfolioFeatures = lazy(() => import('./PortfolioFeatures').then((module) => ({ default: module.PortfolioFeatures })))
const AdminPortal = lazy(() => import('./BackendPanels').then((module) => ({ default: module.AdminPortal })))
const InquiryAndComments = lazy(() => import('./BackendPanels').then((module) => ({ default: module.InquiryAndComments })))
const PrivacyNotice = lazy(() => import('./BackendPanels').then((module) => ({ default: module.PrivacyNotice })))
const RecruiterView = lazy(() => import('./RecruiterView').then((module) => ({ default: module.RecruiterView })))

type Theme = 'dark' | 'light'
type MotionPreference = 'system' | 'on' | 'off'

const MOTION_STORAGE_KEY = 'legion-portfolio-motion-v8'
const LEGACY_MOTION_STORAGE_KEY = 'legion-portfolio-motion-v7'

function readMotionPreference(): MotionPreference {
  try {
    const saved = localStorage.getItem(MOTION_STORAGE_KEY)
    if (saved === 'on' || saved === 'off') return saved
    const legacy = localStorage.getItem(LEGACY_MOTION_STORAGE_KEY)
    if (legacy === 'on' || legacy === 'off') {
      localStorage.setItem(MOTION_STORAGE_KEY, legacy)
      return legacy
    }
  } catch { /* Use the operating-system preference when storage is unavailable. */ }
  return 'system'
}

function systemPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> }
}

function projectArtFor(projectId: string, preferredSelector = '.project-art, .recruiter-project-art'): HTMLElement | null {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-project-id]'))
  const card = cards.find((item) => item.dataset.projectId === projectId)
  return card?.querySelector<HTMLElement>(preferredSelector) ?? null
}

/** Use the native shared-element transition when supported; all other browsers
 * receive the existing CSS modal animation. State is flushed inside the update
 * callback so React commits the new visual before the browser captures it. */
function runProjectViewTransition(update: () => void, source: HTMLElement | null, prepareTarget?: () => void): void {
  const doc = document as ViewTransitionDocument
  const canAnimate = Boolean(doc.startViewTransition)
    && document.documentElement.dataset.motion !== 'off'

  if (!canAnimate || !doc.startViewTransition) {
    update()
    return
  }

  source?.style.setProperty('view-transition-name', 'project-visual')
  let updateCommitted = false
  try {
    const transition = doc.startViewTransition(() => {
      prepareTarget?.()
      flushSync(update)
      updateCommitted = true
      source?.style.removeProperty('view-transition-name')
    })
    void transition.finished.catch(() => undefined).finally(() => {
      document.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
        if (element.style.getPropertyValue('view-transition-name') === 'project-visual') {
          element.style.removeProperty('view-transition-name')
        }
      })
    })
  } catch {
    // A competing transition or browser-specific implementation failure must
    // never block the project dialog; fall back to the existing CSS motion.
    source?.style.removeProperty('view-transition-name')
    if (!updateCommitted) update()
  }
}

/** Animate the full/recruiter layout handoff when the browser supports View Transitions. */
function runLayoutViewTransition(update: () => void): void {
  const doc = document as ViewTransitionDocument
  const root = document.documentElement
  const canAnimate = Boolean(doc.startViewTransition) && root.dataset.motion !== 'off'

  if (!canAnimate || !doc.startViewTransition) {
    update()
    return
  }

  root.dataset.layoutTransition = 'recruiter'
  let updateCommitted = false
  try {
    const transition = doc.startViewTransition(() => {
      flushSync(update)
      updateCommitted = true
    })
    void transition.finished.catch(() => undefined).finally(() => {
      delete root.dataset.layoutTransition
    })
  } catch {
    delete root.dataset.layoutTransition
    if (!updateCommitted) update()
  }
}

const motionIsPaused = () => document.documentElement.dataset.motion === 'off'
type IconName = 'arrow' | 'external' | 'github' | 'sun' | 'moon' | 'menu' | 'close' | 'command' | 'mail' | 'pin' | 'spark' | 'chevron' | 'download' | 'copy' | 'check' | 'code' | 'layers' | 'terminal' | 'camera' | 'cpu' | 'database' | 'award' | 'arrowUp' | 'volume' | 'volumeOff' | 'play' | 'pause'

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }
  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    external: <><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></>,
    github: <><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.1-1.5 6.1-6.8A5.3 5.3 0 0 0 18.8 4a4.9 4.9 0 0 0-.1-3S17.5.7 15 2.4a13.4 13.4 0 0 0-7 0C5.5.7 4.3 1 4.3 1A4.9 4.9 0 0 0 4.2 4 5.3 5.3 0 0 0 2.8 7.7c0 5.3 3.1 6.5 6.1 6.8a3.4 3.4 0 0 0-.9 2.6V22"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
    moon: <path d="M20.9 13A8.5 8.5 0 0 1 11 3.1 8.5 8.5 0 1 0 20.9 13Z"/>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
    command: <><path d="M9 7V5a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v14a2 2 0 1 0 2-2H7a2 2 0 1 0 2 2V7Z"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    spark: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/></>,
    chevron: <path d="m6 9 6 6 6-6"/>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 19h14"/></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    code: <><path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-11-2 14"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    terminal: <><path d="m4 17 6-5-6-5m8 10h8"/></>,
    camera: <><path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="3.5"/></>,
    cpu: <><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 9h6v6H9zM9 1v5m6-5v5M9 18v5m6-5v5M1 9h5m-5 6h5m12-6h5m-5 6h5"/></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></>,
    award: <><circle cx="12" cy="8" r="5"/><path d="m8.5 12-1 9 4.5-2 4.5 2-1-9"/></>,
    arrowUp: <><path d="M12 19V5m-6 6 6-6 6 6"/></>,
    volume: <><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13"/></>,
    volumeOff: <><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/></>,
    play: <path d="m8 5 11 7-11 7V5Z"/>,
    pause: <><path d="M8 5v14M16 5v14"/></>,
  }
  return <svg {...common}>{paths[name]}</svg>
}

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { alpha: true })
    const parent = canvas?.parentElement
    if (!canvas || !parent) return
    if (!ctx) {
      canvas.dataset.fallback = 'true'
      return
    }

    let profile = readAdaptiveProfile()
    let userMotionEnabled = document.documentElement.dataset.motion !== 'off'
    let width = 0
    let height = 0
    let dpr = 1
    let frameId = 0
    let lastFrame = 0
    let resizeFrame = 0
    let isVisible = true
    let particleTheme = ''
    let particleColor = ''
    let pointer = { x: -1000, y: -1000 }
    let particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = []

    const makeParticle = () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * (profile.quality === 'full' ? 0.22 : 0.13),
      vy: (Math.random() - 0.5) * (profile.quality === 'full' ? 0.22 : 0.13),
      r: Math.random() * 1.1 + 0.35,
      a: Math.random() * 0.31 + 0.1,
    })

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      if (particles.length === 0) return

      const activeTheme = document.documentElement.dataset.theme || 'dark'
      if (activeTheme !== particleTheme) {
        particleTheme = activeTheme
        particleColor = getComputedStyle(document.documentElement).getPropertyValue('--muted-2').trim()
      }
      const linkDistance = profile.quality === 'full' ? 94 : 78
      const linkDistanceSquared = linkDistance * linkDistance
      const linkStrength = profile.quality === 'full' ? 0.105 : 0.075

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i]
        if (userMotionEnabled && !profile.reducedMotion && profile.frameRate > 0) {
          particle.x += particle.vx
          particle.y += particle.vy
          if (particle.x < -8) particle.x = width + 8
          if (particle.x > width + 8) particle.x = -8
          if (particle.y < -8) particle.y = height + 8
          if (particle.y > height + 8) particle.y = -8

          if (profile.pointer === 'fine') {
            const dx = particle.x - pointer.x
            const dy = particle.y - pointer.y
            const distance = Math.hypot(dx, dy)
            if (distance < 105 && distance > 0) {
              const force = ((105 - distance) / 105) * 0.24
              particle.x += (dx / distance) * force
              particle.y += (dy / distance) * force
            }
          }
        }

        ctx.beginPath()
        ctx.fillStyle = particleColor
        ctx.globalAlpha = particle.a
        ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1

        // A strict particle ceiling keeps this bounded to at most 861 pair tests per frame.
        for (let j = i + 1; j < particles.length; j += 1) {
          const next = particles[j]
          const dx = particle.x - next.x
          const dy = particle.y - next.y
          const distanceSquared = dx * dx + dy * dy
          if (distanceSquared < linkDistanceSquared) {
            const opacity = (1 - Math.sqrt(distanceSquared) / linkDistance) * linkStrength
            ctx.beginPath()
            ctx.strokeStyle = particleColor
            ctx.globalAlpha = opacity
            ctx.lineWidth = 0.65
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(next.x, next.y)
            ctx.stroke()
            ctx.globalAlpha = 1
          }
        }
      }
    }

    const stop = () => {
      if (frameId) window.cancelAnimationFrame(frameId)
      frameId = 0
    }

    const tick = (timestamp: number) => {
      if (!isVisible || document.hidden || !userMotionEnabled || profile.reducedMotion || profile.frameRate <= 0) {
        stop()
        draw()
        return
      }
      const frameInterval = 1000 / profile.frameRate
      if (timestamp - lastFrame >= frameInterval) {
        draw()
        lastFrame = timestamp
      }
      frameId = window.requestAnimationFrame(tick)
    }

    const start = () => {
      if (!userMotionEnabled || profile.reducedMotion || profile.frameRate <= 0 || particles.length === 0) {
        stop()
        draw()
        return
      }
      if (!frameId && isVisible && !document.hidden) frameId = window.requestAnimationFrame(tick)
    }

    const resize = () => {
      const rect = parent.getBoundingClientRect()
      const previousWidth = width || rect.width || 1
      const previousHeight = height || rect.height || 1
      const previousParticles = particles
      profile = readAdaptiveProfile()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, profile.pixelRatioCap)
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const desired = profile.particleLimit === 0
        ? 0
        : Math.min(profile.particleLimit, Math.max(8, Math.floor((width * height) / (profile.quality === 'full' ? 34000 : 47000))))
      particles = previousParticles.slice(0, desired).map((particle) => ({
        ...particle,
        x: (particle.x / previousWidth) * width,
        y: (particle.y / previousHeight) * height,
      }))
      while (particles.length < desired) particles.push(makeParticle())
      draw()
      stop()
      start()
    }

    const scheduleResize = () => {
      if (resizeFrame) return
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = 0
        resize()
      })
    }
    const onPointer = (event: PointerEvent) => {
      if (profile.pointer !== 'fine') return
      const rect = canvas.getBoundingClientRect()
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }
    const onPointerLeave = () => { pointer = { x: -1000, y: -1000 } }
    const onVisibilityChange = () => document.hidden ? stop() : start()

    const visibilityObserver = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          isVisible = Boolean(entries[0]?.isIntersecting)
          if (isVisible) start()
          else stop()
        }, { threshold: 0.01 })
      : null
    const parentResizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(scheduleResize)
      : null
    const themeObserver = typeof MutationObserver !== 'undefined'
      ? new MutationObserver(draw)
      : null
    const motionObserver = typeof MutationObserver !== 'undefined'
      ? new MutationObserver(() => {
          userMotionEnabled = document.documentElement.dataset.motion !== 'off'
          profile = readAdaptiveProfile()
          scheduleResize()
          if (userMotionEnabled) start()
          else { stop(); draw() }
        })
      : null

    resize()
    visibilityObserver?.observe(parent)
    parentResizeObserver?.observe(parent)
    themeObserver?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    motionObserver?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion', 'data-motion-override'] })
    const stopAdaptiveSubscription = observeAdaptiveProfile((next) => {
      profile = next
      scheduleResize()
    })
    window.addEventListener('resize', scheduleResize, { passive: true })
    window.visualViewport?.addEventListener('resize', scheduleResize, { passive: true })
    document.addEventListener('visibilitychange', onVisibilityChange)
    canvas.addEventListener('pointermove', onPointer, { passive: true })
    canvas.addEventListener('pointerleave', onPointerLeave, { passive: true })

    return () => {
      stop()
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame)
      stopAdaptiveSubscription()
      visibilityObserver?.disconnect()
      parentResizeObserver?.disconnect()
      themeObserver?.disconnect()
      motionObserver?.disconnect()
      window.removeEventListener('resize', scheduleResize)
      window.visualViewport?.removeEventListener('resize', scheduleResize)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      canvas.removeEventListener('pointermove', onPointer)
      canvas.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className="particle-field" aria-hidden="true" />
}
function ProjectArt({ visual }: { visual: Project['visual'] }) {
  if (visual === 'lens') {
    return (
      <div className="project-art art-lens" aria-hidden="true">
        <div className="lens-grid" />
        <div className="lens-mark mark-one">50mm</div>
        <div className="lens-mark mark-two">ƒ / 1.8</div>
        <div className="lens-orbit orbit-a" />
        <div className="lens-orbit orbit-b" />
        <div className="lens-glass"><span /><i /><b /></div>
        <div className="art-index">OPTICS / 001</div>
        <div className="art-caption">EXPOSURE<br/>EXPLORER</div>
      </div>
    )
  }
  if (visual === 'meter') {
    return (
      <div className="project-art art-meter" aria-hidden="true">
        <div className="meter-topline"><span>ENERGY / PULSE</span><span className="meter-live"><i /> LOCAL DEMO</span></div>
        <div className="meter-readout"><span>DAILY CONSUMPTION</span><strong>8.42 <small>kWh</small></strong><em>synthetic data stream</em></div>
        <svg className="meter-chart" viewBox="0 0 520 170" preserveAspectRatio="none">
          <defs><linearGradient id="meterFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".34"/><stop offset="1" stopColor="var(--accent)" stopOpacity="0"/></linearGradient></defs>
          {[28, 68, 108, 148].map(y => <line key={y} x1="0" x2="520" y1={y} y2={y} stroke="currentColor" strokeOpacity=".12" strokeDasharray="3 7"/>)}
          <path d="M0 128 C28 123 38 88 65 94 S105 127 132 92 S170 56 198 73 S238 113 263 82 S306 35 333 57 S365 111 394 78 S431 94 454 44 S491 34 520 18 L520 170 L0 170Z" fill="url(#meterFill)"/>
          <path d="M0 128 C28 123 38 88 65 94 S105 127 132 92 S170 56 198 73 S238 113 263 82 S306 35 333 57 S365 111 394 78 S431 94 454 44 S491 34 520 18" fill="none" stroke="var(--accent)" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/>
          <circle cx="454" cy="44" r="5" fill="var(--accent)" stroke="var(--bg-2)" strokeWidth="3"/>
        </svg>
        <div className="meter-bottom"><span>00:00</span><span>12:00</span><span>24:00</span></div>
        <div className="meter-pill">ANALYTICS / 002</div>
      </div>
    )
  }
  if (visual === 'fan') {
    return (
      <div className="project-art art-fan" aria-hidden="true">
        <div className="fan-readout"><span>THERMAL CONTROL / 003</span><span>SYS ONLINE</span></div>
        <div className="fan-rings"><div className="fan-blades"><i /><i /><i /><i /></div><div className="fan-hub" /></div>
        <div className="fan-temp"><small>LM35 INPUT</small><strong>28.4°<span>C</span></strong><b>STABLE</b></div>
        <div className="fan-line" />
        <div className="fan-footer"><span>PWM OUTPUT</span><strong>064%</strong></div>
      </div>
    )
  }
  if (visual === 'game') {
    return (
      <div className="project-art art-game" aria-hidden="true">
        <div className="game-grid"/>
        <div className="game-topline"><span>PYTHON / CAPSTONE</span><span>BUILD 003</span></div>
        <div className="game-window">
          <div className="game-window-bar"><i/><i/><i/><span>GAME CONCEPT / 01</span></div>
          <div className="game-scene"><div className="game-sun"/><div className="game-platform platform-one"/><div className="game-platform platform-two"/><div className="game-player"><i/><b/></div><div className="game-orb"/></div>
        </div>
        <div className="game-side-label">LOGIC · INPUT · LOOP</div>
        <div className="game-bottom"><span>THREE GAME CONCEPTS</span><strong>PY / 004</strong></div>
      </div>
    )
  }
  return (
    <div className="project-art art-toki" aria-hidden="true">
      <div className="toki-circle"><span>時</span><i /></div>
      <div className="toki-copy"><small>時の記憶 / TOKI SATSUEI</small><strong>CAPTURING<br/>MOMENTS.</strong><em>PRESERVING MEMORIES.</em></div>
      <div className="toki-coordinate">QC · PH<br/>VISUAL JOURNAL / 004</div>
    </div>
  )
}

function ProjectCard({ project, onOpen }: { project: Project; onOpen: (project: Project) => void }) {
  const openProject = () => onOpen(project)
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openProject()
    }
  }

  return (
    <div
      className={`project-card project-${project.visual} ${project.featured ? 'project-featured' : 'project-independent'}`}
      data-project-id={project.id}
      data-reveal
      data-motion-zone
      data-sfx="open"
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-label={`Open ${project.name} project introduction`}
      onClick={openProject}
      onKeyDown={handleKeyDown}
    >
      <ProjectArt visual={project.visual} />
      <div className="project-card-content">
        <div className="project-meta"><span>{project.number} / {project.category.toUpperCase()}</span><span>{project.status}</span></div>
        <div className="project-title-row"><h3>{project.name}</h3><span className="round-arrow" aria-hidden="true"><Icon name="arrow" /></span></div>
        <p>{project.summary}</p>
        <div className="project-stack">{project.stack.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div>
        <span className="text-link project-detail-link" aria-hidden="true">Explore project <Icon name="arrow" size={15}/></span>
      </div>
      <aside className="project-peek" aria-hidden="true">
        <span className="project-peek-kicker">QUICK VIEW / {project.number}</span>
        <strong>{project.headline}</strong>
        <p>{project.role}</p>
        <div className="project-peek-tags">{project.stack.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
        <span className="project-peek-action">CLICK OR PRESS ENTER TO OPEN <Icon name="arrow" size={14}/></span>
      </aside>
    </div>
  )
}
function ProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  async function copyProjectLink() {
    const url = new URL(window.location.href)
    url.searchParams.set('project', project.id)
    try {
      await navigator.clipboard.writeText(url.toString())
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 1800)
    } catch {
      window.prompt('Copy this project link:', url.toString())
    }
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.getClientRects().length > 0)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    closeButtonRef.current?.focus()
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKey)
      previousFocus?.focus()
    }
  }, [onClose])

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className="project-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-description" tabIndex={-1}>
        <div className="modal-topbar"><span>PROJECT FILE / {project.number}</span><button ref={closeButtonRef} className="icon-button" data-sfx="close" onClick={onClose} aria-label="Close project details"><Icon name="close"/></button></div>
        <div className="modal-art"><ProjectArt visual={project.visual}/></div>
        <div className="modal-body">
          <div className="eyebrow"><span className="eyebrow-line"/>{project.category} / {project.label}</div>
          <h2 id="modal-title">{project.name}</h2>
          <h3>{project.headline}</h3>
          <p id="modal-description" className="modal-overview">{project.overview}</p>
          <div className="modal-grid">
            <div><span className="detail-label">ROLE / CONTRIBUTION</span><p>{project.role}</p></div>
            <div><span className="detail-label">PROJECT STATUS</span><p>{project.status}</p></div>
          </div>
          <div className="modal-section"><span className="detail-label">SELECTED CAPABILITIES</span><div className="capability-list">{project.highlights.map((item) => <div key={item}><Icon name="check" size={15}/>{item}</div>)}</div></div>
          <div className="modal-section"><span className="detail-label">TECHNOLOGY & TOOLS</span><div className="project-stack modal-stack">{project.stack.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
          <details className="modal-section modal-disclosure">
            <summary className="modal-disclosure-trigger" data-sfx="toggle"><span className="detail-label">NOTES & PROJECT SCOPE</span><span className="disclosure-control" aria-hidden="true"><Icon name="chevron" size={16}/></span></summary>
            <div className="disclosure-panel"><div className="disclosure-panel-inner"><div className="modal-note-list">{project.details.map((detail) => <p className="modal-detail" key={detail}>{detail}</p>)}</div></div></div>
          </details>
          <div className="modal-actions">
            {project.repo && <a className="button button-primary" href={project.repo} target="_blank" rel="noopener noreferrer">View repository <Icon name="external" size={16}/></a>}
            <button className="button button-quiet" data-sfx="copy" onClick={copyProjectLink}><Icon name={linkCopied ? 'check' : 'copy'} size={15}/>{linkCopied ? 'Project link copied' : 'Copy project link'}</button>
            <button className="button button-quiet" data-sfx="close" onClick={onClose}>Back to portfolio</button>
          </div>
        </div>
      </section>
    </div>
  )
}

function CommandPalette({ open, onClose, onNavigate, theme, onTheme }: { open: boolean; onClose: () => void; onNavigate: (id: string) => void; theme: Theme; onTheme: () => void }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const actions = [
    { label: 'Go to home', detail: 'Navigate to introduction', id: 'home', keys: 'home start' },
    { label: 'Explore projects', detail: 'Browse selected work', id: 'projects', keys: 'work builds portfolio' },
    { label: 'About me', detail: 'Background and approach', id: 'about', keys: 'bio profile' },
    { label: 'Skills & toolkit', detail: 'Languages and tools', id: 'skills', keys: 'stack technology' },
    { label: 'Experience', detail: 'Teaching and practical work', id: 'experience', keys: 'career timeline' },
    { label: 'Project laboratory', detail: 'Explore interactive project models', id: 'lab', keys: 'lens lab energy simulator exposure' },
    { label: 'Skill map', detail: 'Connect capabilities to project evidence', id: 'skills-map', keys: 'python c++ arduino sql skills' },
    { label: 'Photography archive', detail: 'Open the local image workspace', id: 'photo-archive', keys: 'camera gallery photo editing' },
    { label: 'Network lab', detail: 'Explore a safe fictional topology', id: 'network-lab', keys: 'network firewall ports nmap' },
    { label: 'OSINT research journal', detail: 'Review a source verification workflow', id: 'osint-journal', keys: 'osint research verification sources' },
    { label: 'Hardware lab', detail: 'Explore the Arduino fan model', id: 'hardware-lab', keys: 'hardware arduino pwm sensor fan' },
    { label: 'Developer notebook', detail: 'Read engineering field notes', id: 'notebook', keys: 'notes learning journal' },
    { label: 'Currently building', detail: 'See active project directions', id: 'building', keys: 'status roadmap now active' },
    { label: 'Contact', detail: 'Start a conversation', id: 'contact', keys: 'email connect inquiry message' },
    { label: 'Recruiter view', detail: 'Open a concise, shareable qualifications profile', id: 'recruiter-view', keys: 'cv resume hiring recruiter internship employer' },
    { label: 'Open admin console', detail: 'Private owner sign-in', id: 'admin-console', keys: 'admin dashboard owner login moderation' },
  ]
  const filtered = actions.filter((item) => `${item.label} ${item.detail} ${item.keys}`.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setQuery('')
    const focusFrame = window.requestAnimationFrame(() => inputRef.current?.focus())
    const getFocusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((element) => element.getClientRects().length > 0)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = getFocusable()
      if (!focusable.length) {
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="palette-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div ref={dialogRef} className="command-palette" role="dialog" aria-modal="true" aria-labelledby="palette-title" tabIndex={-1}>
        <div className="palette-search"><Icon name="command"/><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Where do you want to go?" aria-label="Search portfolio commands"/><kbd>ESC</kbd></div>
        <div className="palette-label" id="palette-title">NAVIGATION</div>
        <div className="palette-results">
          {filtered.map((item, index) => <button key={item.id} className="palette-item" data-sfx="navigate" onClick={() => onNavigate(item.id)}><span className="palette-index">0{index + 1}</span><span className="palette-item-copy"><strong>{item.label}</strong><small>{item.detail}</small></span><Icon name="arrow" size={16}/></button>)}
          {filtered.length === 0 && <p className="palette-empty" role="status" aria-live="polite">No matching destination. Try “projects” or “skills”.</p>}
        </div>
        <div className="palette-footer"><span><kbd>↵</kbd> select</span><button data-sfx="toggle" onClick={onTheme}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={14}/> Switch to {theme === 'dark' ? 'light' : 'dark'} theme</button></div>
      </div>
    </div>
  )
}

function SectionHeading({ index, kicker, title, accent, description }: { index: string; kicker: string; title: string; accent?: string; description?: string }) {
  return (
    <div className="section-heading" data-reveal>
      <div className="section-kicker"><span>{index}</span><i/>{kicker}</div>
      <h2>{title}{accent && <> <em>{accent}</em></>}</h2>
      {description && <p>{description}</p>}
    </div>
  )
}

function SystemsOrbit({ onSelectCategory }: { onSelectCategory: (category: ProjectCategory) => void }) {
  return (
    <div className="systems-orbit" role="group" aria-label="Interactive areas of interest: software, data, embedded systems, and creative technology">
      <div className="orbit-grid" aria-hidden="true"/>
      <div className="orbit-ring ring-outer" aria-hidden="true"/><div className="orbit-ring ring-middle" aria-hidden="true"/><div className="orbit-ring ring-inner" aria-hidden="true"/>
      <div className="orbit-center" aria-hidden="true"><span className="orbit-monogram">KA</span><small>IDEAS → SYSTEMS</small></div>
      <button type="button" className="orbit-node node-web" data-category="Software" data-sfx="filter" onClick={() => onSelectCategory('Software')} aria-label="Explore software projects"><span aria-hidden="true"><Icon name="code" size={17}/></span><small>SOFTWARE</small></button>
      <button type="button" className="orbit-node node-data" data-category="Data & Systems" data-sfx="filter" onClick={() => onSelectCategory('Data & Systems')} aria-label="Explore data and systems projects"><span aria-hidden="true"><Icon name="database" size={17}/></span><small>DATA</small></button>
      <button type="button" className="orbit-node node-embedded" data-category="Embedded" data-sfx="filter" onClick={() => onSelectCategory('Embedded')} aria-label="Explore embedded projects"><span aria-hidden="true"><Icon name="cpu" size={17}/></span><small>EMBEDDED</small></button>
      <button type="button" className="orbit-node node-creative" data-category="Creative" data-sfx="filter" onClick={() => onSelectCategory('Creative')} aria-label="Explore creative projects"><span aria-hidden="true"><Icon name="camera" size={17}/></span><small>CREATIVE</small></button>
      <div className="orbit-satellite satellite-one" aria-hidden="true"/><div className="orbit-satellite satellite-two" aria-hidden="true"/>
      <div className="orbit-coordinate coord-a" aria-hidden="true">14°40' N<br/>121°02' E</div><div className="orbit-coordinate coord-b" aria-hidden="true">FIELD NOTES / 2026</div>
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return localStorage.getItem('legion-portfolio-theme') === 'light' ? 'light' : 'dark' } catch { return 'dark' }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(() => {
    if (typeof window === 'undefined') return null
    const projectId = new URLSearchParams(window.location.search).get('project')
    return projects.find((project) => project.id === projectId) ?? null
  })
  const [filter, setFilter] = useState<'All' | ProjectCategory>('All')
  const [recruiterView, setRecruiterView] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'recruiter')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    return new URLSearchParams(window.location.search).get('auth') === 'recovery'
      || hash.get('type') === 'recovery'
      || Boolean(hash.get('error') || hash.get('error_code'))
  })
  const [activeSection, setActiveSection] = useState('home')
  const progressRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const [headerHidden, setHeaderHidden] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem('legion-portfolio-sound-v2') === 'on' } catch { return false }
  })
  const soundEnabledRef = useRef(soundEnabled)
  const [motionPreference, setMotionPreference] = useState<MotionPreference>(readMotionPreference)
  const [systemReducedMotion, setSystemReducedMotion] = useState(systemPrefersReducedMotion)
  const motionEnabled = motionPreference === 'on' || (motionPreference === 'system' && !systemReducedMotion)
  const [copied, setCopied] = useState(false)

  const categories: ('All' | ProjectCategory)[] = ['All', 'Software', 'Data & Systems', 'Embedded', 'Creative']
  const filteredProjects = useMemo(() => projects.filter((project) => filter === 'All' || project.category === filter), [filter])

  const openProject = useCallback((project: Project) => {
    const source = projectArtFor(project.id)
    runProjectViewTransition(() => {
      const url = new URL(window.location.href)
      if (url.searchParams.get('project') !== project.id) {
        url.searchParams.set('project', project.id)
        window.history.pushState({ ...(window.history.state ?? {}), portfolioProject: project.id }, '', url)
      }
      setSelectedProject(project)
    }, source)
  }, [])
  const closeProject = useCallback(() => {
    const source = selectedProject ? projectArtFor(selectedProject.id, '.project-art') : null
    runProjectViewTransition(() => {
      const url = new URL(window.location.href)
      if (url.searchParams.has('project')) {
        url.searchParams.delete('project')
        window.history.replaceState(window.history.state, '', url)
      }
      setSelectedProject(null)
    }, null, () => source?.style.setProperty('view-transition-name', 'project-visual'))
  }, [selectedProject])
  const openRecruiterView = useCallback(() => {
    runLayoutViewTransition(() => {
      const url = new URL(window.location.href)
      url.searchParams.set('view', 'recruiter')
      url.searchParams.delete('project')
      window.history.pushState({ ...(window.history.state ?? {}), portfolioView: 'recruiter' }, '', url)
      setSelectedProject(null)
      setRecruiterView(true)
      window.scrollTo(0, 0)
    })
  }, [])
  const exitRecruiterView = useCallback(() => {
    runLayoutViewTransition(() => {
      const url = new URL(window.location.href)
      url.searchParams.delete('view')
      window.history.pushState({ ...(window.history.state ?? {}), portfolioView: 'full' }, '', url)
      setRecruiterView(false)
      window.scrollTo(0, 0)
    })
  }, [])
  const openRecruiterProject = useCallback((project: Project) => {
    const source = projectArtFor(project.id, '.recruiter-project-art')
    runProjectViewTransition(() => {
      const url = new URL(window.location.href)
      url.searchParams.delete('view')
      url.searchParams.set('project', project.id)
      window.history.pushState({ ...(window.history.state ?? {}), portfolioProject: project.id }, '', url)
      setRecruiterView(false)
      setSelectedProject(project)
      window.scrollTo(0, 0)
    }, source)
  }, [])
  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark')
  const toggleSound = () => {
    const next = !soundEnabledRef.current
    soundEnabledRef.current = next
    setSoundEnabled(next)
    try { localStorage.setItem('legion-portfolio-sound-v2', next ? 'on' : 'off') } catch { /* Storage can be disabled. */ }
  }
  const toggleMotion = () => {
    const next = motionEnabled ? 'off' : 'on'
    setMotionPreference(next)
    try { localStorage.setItem(MOTION_STORAGE_KEY, next) } catch { /* Storage can be disabled. */ }
  }
  const navigate = (id: string) => {
    setMobileOpen(false)
    setPaletteOpen(false)
    if (id === 'admin-console') { setAdminOpen(true); return }
    if (id === 'recruiter-view') { openRecruiterView(); return }
    const motionPaused = motionIsPaused()
    document.getElementById(id)?.scrollIntoView({ behavior: motionPaused ? 'auto' : 'smooth', block: 'start' })
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (themeColor) themeColor.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || (theme === 'dark' ? '#151719' : '#f3f0e9')
    try { localStorage.setItem('legion-portfolio-theme', theme) } catch { /* Storage can be disabled. */ }
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.motion = motionEnabled ? 'on' : 'off'
    root.dataset.motionOverride = motionPreference
  }, [motionEnabled, motionPreference])

  useEffect(() => {
    if (motionPreference !== 'system' || !window.matchMedia) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setSystemReducedMotion(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [motionPreference])

  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  useEffect(() => installInteractionSounds(() => soundEnabledRef.current), [])

  useEffect(() => observeAdaptiveProfile((profile) => {
    const root = document.documentElement
    root.dataset.quality = profile.quality
    root.dataset.orientation = profile.orientation
    root.dataset.pointer = profile.pointer
  }), [])

  // These controllers bind to concrete DOM nodes. The full portfolio is
  // conditionally unmounted while Recruiter View is active, so every controller
  // must detach on entry and re-bind to the newly mounted nodes on return.
  useEffect(() => {
    if (recruiterView) {
      setHeaderHidden(false)
      setMobileOpen(false)
      return
    }

    const header = headerRef.current
    if (!header) return

    return installMastheadScrollBehavior({
      header,
      progress: progressRef.current,
      motionEnabled,
      menuOpen: mobileOpen,
      onHiddenChange: setHeaderHidden,
    })
  }, [recruiterView, mobileOpen, motionEnabled])

  useEffect(() => {
    if (recruiterView) {
      setActiveSection('')
      return
    }

    const sections = ['home', 'about', 'projects', 'lab', 'skills-map', 'photo-archive', 'network-lab', 'osint-journal', 'hardware-lab', 'notebook', 'building', 'skills', 'experience', 'contact']
    const elements = sections.map((id) => document.getElementById(id)).filter((element): element is HTMLElement => Boolean(element))
    if (!('IntersectionObserver' in window)) {
      setActiveSection('home')
      return
    }
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible) setActiveSection(visible.target.id)
    }, { rootMargin: '-28% 0px -58% 0px', threshold: [0, 0.15, 0.35, 0.6] })
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [recruiterView])

  useLayoutEffect(() => {
    // Do not attach a body-wide observer to the alternate recruiter DOM.
    // Recreate this observer against #main-content every time that tree mounts.
    if (recruiterView) return
    const scope = document.getElementById('main-content')
    if (!scope) return

    return installScrollReveal({
      enabled: motionEnabled,
      scope,
    })
  }, [motionEnabled, recruiterView])

  useEffect(() => {
    if (recruiterView) return
    const motionZones = Array.from(document.querySelectorAll<HTMLElement>('[data-motion-zone]'))
    if (motionZones.length === 0) return

    if (!('IntersectionObserver' in window)) {
      motionZones.forEach((zone) => zone.classList.add('motion-active'))
      return
    }

    const motionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('motion-active', entry.isIntersecting)
      })
    }, { rootMargin: '80px 0px', threshold: 0 })

    motionZones.forEach((zone) => motionObserver.observe(zone))
    return () => motionObserver.disconnect()
  }, [filter, recruiterView])

  useEffect(() => {
    const syncRouteFromUrl = () => {
      const params = new URLSearchParams(window.location.search)
      const nextRecruiterView = params.get('view') === 'recruiter'
      const previousRecruiterView = document.documentElement.dataset.recruiterView === 'true'
      const projectId = params.get('project')

      setRecruiterView(nextRecruiterView)
      setSelectedProject(projects.find((project) => project.id === projectId) ?? null)

      // A view has its own document flow. Never carry a stale scroll offset
      // from the other layout when browser back/forward changes view mode.
      if (previousRecruiterView !== nextRecruiterView) {
        window.requestAnimationFrame(() => window.scrollTo(0, 0))
      }
    }
    window.addEventListener('popstate', syncRouteFromUrl)
    return () => window.removeEventListener('popstate', syncRouteFromUrl)
  }, [])

  useEffect(() => {
    const originalTitle = 'King Art D. Pacumberto — Field Notes & Portfolio'
    const recruiterTitle = 'King Art D. Pacumberto — Recruiter Profile'
    const originalDescription = 'King Art D. Pacumberto — PUP Quezon City BSIT student building software and embedded projects, with experience in IT support, technical operations, student leadership, and event production.'
    const recruiterDescription = 'Recruiter profile for King Art D. Pacumberto: selected software and embedded projects, technical skills, IT support experience, education, and contact details.'
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const socialMeta = [
      document.querySelector<HTMLMetaElement>('meta[property="og:title"]'),
      document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]'),
    ]
    const socialDescriptions = [
      document.querySelector<HTMLMetaElement>('meta[property="og:description"]'),
      document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]'),
    ]
    const title = recruiterView ? recruiterTitle : originalTitle
    const summary = recruiterView ? recruiterDescription : originalDescription
    document.title = title
    if (description) description.content = summary
    socialMeta.forEach((meta) => { if (meta) meta.content = title })
    socialDescriptions.forEach((meta) => { if (meta) meta.content = summary })
    document.documentElement.dataset.recruiterView = recruiterView ? 'true' : 'false'
    return () => {
      document.title = originalTitle
      if (description) description.content = originalDescription
      socialMeta.forEach((meta) => { if (meta) meta.content = originalTitle })
      socialDescriptions.forEach((meta) => { if (meta) meta.content = originalDescription })
      delete document.documentElement.dataset.recruiterView
    }
  }, [recruiterView])

  useEffect(() => {
    const handleKeys = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !recruiterView) {
        event.preventDefault()
        setPaletteOpen((value) => !value)
      }
      if (event.key === 'Escape') { setPaletteOpen(false); setMobileOpen(false); closeProject() }
    }
    window.addEventListener('keydown', handleKeys)
    return () => window.removeEventListener('keydown', handleKeys)
  }, [closeProject, recruiterView])

  useEffect(() => {
    if (!mobileOpen) return
    const handleMobileEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setMobileOpen(false)
      window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus())
    }
    document.addEventListener('keydown', handleMobileEscape)
    return () => document.removeEventListener('keydown', handleMobileEscape)
  }, [mobileOpen])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(siteConfig.github)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.open(siteConfig.github, '_blank', 'noopener,noreferrer')
    }
  }

  const navItems = [{ id: 'about', label: 'About' }, { id: 'projects', label: 'Projects' }, { id: 'lab', label: 'Labs' }, { id: 'skills', label: 'Toolkit' }, { id: 'experience', label: 'Journey' }]

  if (recruiterView) return <Suspense fallback={<main className="recruiter-loading" role="status" aria-live="polite">Loading recruiter profile…</main>}><RecruiterView onExit={exitRecruiterView} onOpenProject={openRecruiterProject} motionEnabled={motionEnabled} soundEnabled={soundEnabled} onToggleMotion={toggleMotion} onToggleSound={toggleSound}/></Suspense>

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="scroll-progress" ref={progressRef} aria-hidden="true"/>
      <IntroSequence/>
      <header ref={headerRef} className={`site-header ${headerHidden && !mobileOpen ? 'header-hidden' : ''} ${mobileOpen ? 'mobile-nav-active' : ''}`}>
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); navigate('home') }}>
          <span className="brand-mark"><span className="brand-monogram">K<span>A</span></span></span><span className="brand-copy"><strong>KING ART</strong><small>DEVELOPER PORTFOLIO</small></span>
        </a>
        <nav id="primary-navigation" className={`main-nav ${mobileOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
          {navItems.map((item) => <a key={item.id} href={`#${item.id}`} className={activeSection === item.id ? 'active' : ''} aria-current={activeSection === item.id ? 'location' : undefined} onClick={(event) => { event.preventDefault(); navigate(item.id) }}>{item.label}</a>)}
          <a className="nav-recruiter" href="?view=recruiter" onClick={(event) => { event.preventDefault(); openRecruiterView() }}>Recruiter view <span aria-hidden="true">↗</span></a>
          <a className="nav-resume nav-original-resume" data-sfx="download" href={siteConfig.resumeOriginalPath} download="King_Art_Pacumberto_Resume.pdf" aria-label="Download the original resume as a PDF">RESUME PDF <Icon name="download" size={13}/></a>
          <a className="nav-resume" data-sfx="download" href={siteConfig.resumePdfPath} download="King_Art_D_Pacumberto_CV.pdf" aria-label="Download the public-safe CV as a PDF">CV PDF <Icon name="download" size={13}/></a>
          <a className="nav-contact" href="#contact" onClick={(event) => { event.preventDefault(); navigate('contact') }}>Let's talk <Icon name="arrow" size={14}/></a>
        </nav>
        <div className="header-tools">
          <button className="command-trigger" data-sfx="open" onClick={() => setPaletteOpen(true)} aria-label="Open command palette"><Icon name="command" size={15}/><span>Search</span><kbd>⌘ K</kbd></button>
          <button className="icon-button sound-toggle" data-sfx="toggle" onClick={toggleSound} aria-pressed={soundEnabled} title={soundEnabled ? 'Turn interface sounds off' : 'Turn interface sounds on'} aria-label={soundEnabled ? 'Turn interface sounds off' : 'Turn interface sounds on'}><Icon name={soundEnabled ? 'volume' : 'volumeOff'} size={17}/></button>
          <button
            className="icon-button motion-toggle"
            data-sfx="toggle"
            onClick={toggleMotion}
            aria-pressed={motionEnabled}
            title={motionEnabled ? 'Pause decorative motion' : 'Resume decorative motion'}
            aria-label={motionEnabled ? 'Pause decorative motion' : 'Resume decorative motion'}>
            <Icon name={motionEnabled ? 'pause' : 'play'} size={16}/>
          </button>
          <button className="icon-button theme-toggle" data-sfx="toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17}/></button>
          <button ref={mobileMenuButtonRef} className="icon-button mobile-menu-button" data-sfx="toggle" onClick={() => setMobileOpen((value) => !value)} aria-expanded={mobileOpen} aria-controls="primary-navigation" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}><Icon name={mobileOpen ? 'close' : 'menu'}/></button>
        </div>
      </header>

      <main id="main-content">
        <section className="hero-section" id="home">
          <ParticleField/>
          <div className="hero-scanline"/>
          <div className="hero-content page-width">
            <div className="hero-copy">
              <div className="availability-line" role="group" aria-label={`${siteConfig.location} — BSIT student / Software and Systems`}><span className="status-dot" aria-hidden="true"/><span aria-hidden="true">{siteConfig.location.toUpperCase()}</span><i aria-hidden="true"/><span aria-hidden="true">BSIT STUDENT / SOFTWARE &amp; SYSTEMS</span></div>
              <div className="hero-pretitle" data-hero-sequence="eyebrow"><span className="pretitle-rule"/>FIELD NOTES / 001 — {siteConfig.firstName.toUpperCase()}</div>
              <h1 className="hero-title" aria-label="From a question to working systems."><span className="title-line" data-hero-line aria-hidden="true">From a question</span><span className="title-line title-outline" data-hero-line aria-hidden="true">to working</span><span className="title-line title-accent" data-hero-line aria-hidden="true">systems<span className="title-period">.</span></span></h1>
              <p className="hero-description" data-hero-sequence="description">I explore how software, data, hardware, and visual communication connect — then turn that curiosity into practical projects. I’m a BSIT student at PUP Quezon City with hands-on experience in IT support, teaching, technical production, and event photography.</p>
              <div className="hero-actions" data-hero-sequence="actions">
                <button className="button button-primary" data-sfx="navigate" onClick={() => navigate('projects')}>Explore selected work <Icon name="arrow" size={17}/></button>
                <a className="button button-quiet" data-sfx="download" href={siteConfig.resumeOriginalPath} download="King_Art_Pacumberto_Resume.pdf"><Icon name="download" size={16}/> Original Resume · PDF</a>
                <a className="button button-ghost" data-sfx="download" href={siteConfig.resumePdfPath} download="King_Art_D_Pacumberto_CV.pdf"><Icon name="download" size={15}/> Public CV · PDF</a>
                <button className="button button-ghost recruiter-entry-button" onClick={openRecruiterView}>Recruiter view <Icon name="arrow" size={15}/></button>
                <a className="button button-ghost" href={siteConfig.github} target="_blank" rel="noopener noreferrer"><Icon name="github" size={17}/> GitHub <Icon name="external" size={14}/></a>
              </div>
              <div className="hero-footnote" data-hero-sequence="footnote"><span>SCROLL TO EXPLORE</span><div className="scroll-indicator"><i/></div><span className="hero-footnote-right">PORTFOLIO / 2026</span></div>
            </div>
            <div className="hero-visual" data-motion-zone>
              <div className="visual-plate">
                <div className="visual-plate-head"><span>FIG. 01 / PRACTICE MAP</span><span>SELECT A DISCIPLINE ↘</span></div>
                <SystemsOrbit onSelectCategory={(category) => { setFilter(category); navigate('projects') }}/>
                <div className="visual-plate-foot"><span>INPUT <b>CURIOSITY</b></span><i/><span>OUTPUT <b>USEFUL SYSTEMS</b></span></div>
                <span className="plate-corner plate-corner-a"/><span className="plate-corner plate-corner-b"/>
              </div>
            </div>
            <div className="hero-index"><span>01</span><i/> INTRODUCTION</div>
          </div>
          <div className="hero-bottomline"><span>INDEPENDENT THINKING</span><span>×</span><span>HANDS-ON BUILDING</span><span>×</span><span>CONTINUOUS LEARNING</span></div>
        </section>

        <div className="ticker" role="group" aria-label="Areas of practice"><div className="ticker-track"><div className="ticker-set"><span>SOFTWARE DEVELOPMENT</span><i>✳</i><span>DATA & SYSTEMS</span><i>✳</i><span>EMBEDDED TECHNOLOGY</span><i>✳</i><span>AUDIOVISUAL OPERATIONS</span><i>✳</i><span>EVENT DOCUMENTATION</span><i>✳</i><span>PROBLEM SOLVING</span></div></div></div>

        <section className="about-section section-pad page-width" id="about">
          <SectionHeading index="01" kicker="FIELD NOTE / PROFILE" title="A practical kind" accent="of curiosity." description="An IT student focused on practical software, dependable systems, and clear communication."/>
          <div className="about-layout">
            <div className="about-main" data-reveal="left">
              <p className="about-lead">I’m pursuing a <strong>Bachelor of Science in Information Technology</strong> at the Polytechnic University of the Philippines, Quezon City Campus. I completed the STEM strand at CASAP Quezon City with a grade of 96.</p>
              <p>My work spans software development, data-oriented applications, embedded systems, and hands-on IT support. I enjoy understanding a problem from several angles — the interface, underlying logic, data, hardware, and the people who use the system.</p>
              <p>Outside software, I have led student technical teams, supported school audiovisual production and esports livestreams, played bass guitar with a campus band, and documented school events through photography and editing.</p>
              <p>I also practice open-source intelligence (OSINT), gathering publicly available information and cross-checking it against official sources. I use this work for preliminary legitimacy checks and task-specific research, not to make legal or formal compliance determinations.</p>
              <div className="about-signature"><span className="signature-mark">KA.</span><span>LEARNING BY BUILDING<br/><small>QUEZON CITY, PHILIPPINES</small></span></div>
            </div>
            <div className="about-aside" data-reveal="right">
              <figure className="profile-portrait">
                <div className="profile-portrait-image">
                  <picture className="profile-picture">
                    <source type="image/webp" srcSet="/profile/king-art-portrait-480.webp 480w, /profile/king-art-portrait-800.webp 800w, /profile/king-art-portrait-1023.webp 1023w" sizes="(max-width: 600px) min(78vw, 310px), (max-width: 820px) 40vw, 24vw" />
                    <img src="/profile/king-art-portrait-800.jpg" srcSet="/profile/king-art-portrait-480.jpg 480w, /profile/king-art-portrait-800.jpg 800w, /profile/king-art-portrait-1023.jpg 1023w" sizes="(max-width: 600px) min(78vw, 310px), (max-width: 820px) 40vw, 24vw" width="800" height="1203" alt="Portrait of King Art D. Pacumberto wearing black academic graduation attire with a navy blue stole and white shirt." loading="lazy" decoding="async" onError={(event: SyntheticEvent<HTMLImageElement>) => { event.currentTarget.hidden = true; event.currentTarget.parentElement?.classList.add('is-unavailable') }} />
                  </picture>
                  <div className="profile-image-fallback" aria-hidden="true">KA<span>.</span></div>
                  <span className="portrait-index">PORTRAIT / 001</span>
                </div>
                <figcaption><strong>King Art D. Pacumberto</strong><span>BSIT STUDENT · QUEZON CITY</span></figcaption>
              </figure>
              <div className="aside-card aside-quote"><div className="quote-mark">“</div><p>Good technology should make a complicated thing feel more understandable.</p><span>PERSONAL BUILDING PRINCIPLE</span></div>
              <div className="aside-metrics">
                <div className="metric-card"><strong>04</strong><span>TECHNICAL<br/>PROJECTS</span></div>
                <div className="metric-card"><strong>05</strong><span>SELECTED<br/>WORKS</span></div>
                <div className="metric-card metric-wide"><strong>∞</strong><span>ROOM TO EXPERIMENT</span></div>
              </div>
            </div>
          </div>
          <div className="research-practice" data-reveal>
            <div className="research-practice-heading"><span>FIELD NOTE / OSINT & SECURITY</span><small>FOUNDATIONAL · SELF-DIRECTED PRACTICE</small></div>
            <h3>Research with verification. Security with boundaries.</h3>
            <div className="research-practice-grid">
              <article><span>01 / OPEN-SOURCE RESEARCH</span><p>Gather and cross-check publicly available information against official sources to support preliminary legitimacy checks, source verification, and task-specific research.</p><div className="research-tags"><b>PUBLIC SOURCES</b><b>OFFICIAL VERIFICATION</b><b>CROSS-CHECKING</b></div></article>
              <article><span>02 / DEFENSIVE NETWORK PRACTICE</span><p>Foundational Linux and Kali Linux practice, Nmap-based local host and port discovery, local firewall rules, port/traffic analysis, and rule-based blocking. Familiarity with Medusa for authentication-audit exercises, plus data/traffic-spoofing and IP-manipulation concepts explored with isolated dummy machines.</p><div className="research-tags"><b>LINUX / KALI</b><b>NMAP</b><b>AUTHORIZED LABS</b></div></article>
            </div>
            <p className="research-scope-note">Practice is self-directed and limited to systems owned by you or explicitly authorized for testing. This describes foundational experience, not a professional penetration-testing or investigative certification.</p>
          </div>
        </section>

        <section className="projects-section section-pad" id="projects">
          <div className="page-width">
            <SectionHeading index="02" kicker="THE WORK / SELECTED BUILDS" title="Things I’ve made" accent="and explored." description="A selection of software, data, embedded, and creative work. Open a project to review its purpose, contribution, technology, and current scope."/>
            <div className="project-toolbar" data-reveal>
              <div className="project-count"><span className="count-pulse"/>SHOWING <strong>{String(filteredProjects.length).padStart(2, '0')}</strong> PROJECTS</div>
              <div className="project-filters" role="group" aria-label="Filter projects">{categories.map((category) => <button key={category} className={filter === category ? 'filter-active' : ''} aria-pressed={filter === category} data-sfx="filter" onClick={() => setFilter(category)}>{category}</button>)}</div>
            </div>
            <div className="project-grid">{filteredProjects.map((project) => <ProjectCard key={project.id} project={project} onOpen={openProject}/>)}</div>
            <ProjectCompare/>
            <div className="projects-bottom" data-reveal><span>MORE EXPERIMENTS, ITERATIONS & CODE</span><a href={siteConfig.github} target="_blank" rel="noopener noreferrer" className="text-link">Explore all repositories <Icon name="arrow" size={16}/></a></div>
          </div>
        </section>

        <Suspense fallback={<div className="feature-module-loading" role="status">Loading interactive project tools…</div>}>
          <PortfolioFeatures onOpenProject={openProject}/>
        </Suspense>

        <section className="skills-section section-pad page-width" id="skills">
          <SectionHeading index="11" kicker="THE TOOLKIT / METHODS" title="A toolkit for" accent="making things work." description="Technologies and practical capabilities used in academic, freelance, and independent projects. Skill levels are not self-rated; the project examples show where selected tools have been applied."/>
          <div className="skills-layout">
            <div className="skills-intro" data-reveal><div className="skills-graphic" data-motion-zone><div className="skills-graphic-ring ring-a"/><div className="skills-graphic-ring ring-b"/><div className="skills-core"><Icon name="code" size={32}/><span>BUILD<br/>LOOP</span></div><span className="skills-orbit-label label-top">LEARN</span><span className="skills-orbit-label label-right">TEST</span><span className="skills-orbit-label label-bottom">REFINE</span><span className="skills-orbit-label label-left">SHIP</span></div><div className="skills-note"><span className="tiny-square"/>TOOLS ARE MEANS, NOT THE GOAL.</div></div>
            <div className="skill-groups">{skillGroups.map((group, index) => (
              <details className="skill-group" key={group.name} open={index === 0} data-reveal="right">
                <summary className="skill-group-head" data-sfx="toggle">
                  <span className="skill-group-index">0{index + 1}</span>
                  <span className="skill-group-copy"><strong>{group.name}</strong><small>{group.note}</small></span>
                  <span className="skill-group-meta">{String(group.items.length).padStart(2, '0')} ITEMS</span>
                  <span className="disclosure-control" aria-hidden="true"><Icon name="chevron" size={17}/></span>
                </summary>
                <div className="disclosure-panel skill-disclosure-panel"><div className="disclosure-panel-inner"><div className="skill-pills">{group.items.map((item) => <span key={item}>{item}</span>)}</div></div></div>
              </details>
            ))}</div>
          </div>
        </section>

        <section className="experience-section section-pad" id="experience">
          <div className="page-width">
            <SectionHeading index="12" kicker="THE RECORD / CAREER, ACTIVITIES & LEARNING" title="Built through" accent="doing the work." description="Technical support, teaching, food service, event coordination, student leadership, and creative production — presented with the dates and responsibilities supplied."/>
            <div className="journey-layout">
              <div className="journey-column" data-reveal>
                <div className="journey-label"><span>01</span> EXPERIENCE</div>
                <div className="timeline" data-motion-zone>{experience.map((item, index) => (
                  <details className="timeline-item" key={`${item.title}-${item.period}`} open={index === 0} data-reveal="left">
                    <summary className="timeline-summary" data-sfx="toggle">
                      <span className="timeline-marker" aria-hidden="true"><i/></span>
                      <span className="timeline-summary-copy">
                        <span className="timeline-period">{item.period}</span>
                        <strong className="timeline-title">{item.title}</strong>
                        <span className="timeline-organization">{item.organization}</span>
                      </span>
                      <span className="disclosure-control" aria-hidden="true"><Icon name="chevron" size={16}/></span>
                    </summary>
                    <div className="disclosure-panel timeline-disclosure-panel"><div className="disclosure-panel-inner"><div className="timeline-content">
                      <p>{item.description}</p>
                      <div className="timeline-tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                    </div></div></div>
                  </details>
                ))}</div>
              </div>
              <div className="journey-side">
                <div className="education-card" data-reveal>
                  <div className="journey-label"><span>02</span> EDUCATION</div>
                  <div className="education-symbol">P<span>UP</span></div>
                  <span className="education-type">CURRENT STUDIES</span>
                  <h3>Polytechnic University of the Philippines</h3>
                  <p>Bachelor of Science in Information Technology</p>
                  <div className="education-foot"><span>QUEZON CITY CAMPUS</span><strong>BSIT 1-2 · AY 2026–2027</strong></div>
                  <div className="education-divider"/>
                  <details className="education-history">
                    <summary className="education-history-summary" data-sfx="toggle">
                      <span className="education-history-copy"><strong>ACADEMIC FOUNDATION</strong><small>{education.length} PREVIOUS SCHOOLS</small></span>
                      <span className="disclosure-control" aria-hidden="true"><Icon name="chevron" size={16}/></span>
                    </summary>
                    <div className="disclosure-panel"><div className="disclosure-panel-inner"><div className="education-records">{education.map((item) => <article className="education-record" key={item.school}><span>{item.period}</span><h4>{item.school}</h4><p>{item.level}</p>{item.note && <strong>{item.note}</strong>}</article>)}</div></div></div>
                  </details>
                </div>
                <div className="achievement-card" data-reveal>
                  <div className="journey-label"><span>03</span> RECOGNITION & CERTIFICATION</div>
                  <div className="achievement-list">{achievements.map((item) => (
                    <details className="achievement-row" key={item.title}>
                      <summary className="achievement-summary" data-sfx="toggle">
                        <span className="achievement-mark">{item.mark}</span>
                        <strong>{item.title}</strong>
                        <Icon name="award" size={17}/>
                        <span className="disclosure-control" aria-hidden="true"><Icon name="chevron" size={14}/></span>
                      </summary>
                      <div className="disclosure-panel"><div className="disclosure-panel-inner"><div className="achievement-detail"><p>{item.note}</p>{item.source && <small className="achievement-source">{item.source}</small>}{item.href && <a className="achievement-title-link" href={item.href} target="_blank" rel="noopener noreferrer">View published result <Icon name="external" size={12}/></a>}</div></div></div>
                    </details>
                  ))}</div>
                </div>
                <div className="activities-card" data-reveal>
                  <div className="journey-label"><span>04</span> LEADERSHIP & EXTRACURRICULARS</div>
                  <div className="activity-list">{extracurriculars.map((item, index) => (
                    <details className="activity-row" key={item.title} open={index === 0} data-reveal="right">
                      <summary className="activity-summary" data-sfx="toggle">
                        <span className="activity-summary-copy"><strong>{item.title}</strong><span>{item.organization}</span></span>
                        <span className="disclosure-control" aria-hidden="true"><Icon name="chevron" size={15}/></span>
                      </summary>
                      <div className="disclosure-panel activity-disclosure-panel"><div className="disclosure-panel-inner"><div className="activity-content"><p>{item.description}</p></div></div></div>
                    </details>
                  ))}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="contact-section section-pad page-width" id="contact">
          <div className="contact-frame" data-reveal="scale">
            <div className="contact-grid-bg"/>
            <div className="contact-content"><div className="section-kicker"><span>13</span><i/> THE NEXT CHAPTER / CONTACT</div><h2>Have a question?<br/><em>Let’s make it work.</em></h2><p>I’m open to internships, entry-level opportunities, and project collaborations where I can contribute, learn from experienced teams, and keep developing my technical skills.</p><div className="contact-actions"><a className="button button-primary" href={siteConfig.github} target="_blank" rel="noopener noreferrer">Connect on GitHub <Icon name="arrow" size={17}/></a>{siteConfig.email && <a className="button button-ghost" href={`mailto:${siteConfig.email}`}><Icon name="mail" size={16}/> Send an email</a>}{siteConfig.linkedin && <a className="button button-ghost" href={siteConfig.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <Icon name="external" size={14}/></a>}{siteConfig.resumeOriginalPath && <a className="button button-quiet" data-sfx="download" href={siteConfig.resumeOriginalPath} download="King_Art_Pacumberto_Resume.pdf"><Icon name="download" size={15}/> Original Resume · PDF</a>}{siteConfig.resumePdfPath && <a className="button button-ghost" data-sfx="download" href={siteConfig.resumePdfPath} download="King_Art_D_Pacumberto_CV.pdf"><Icon name="download" size={15}/> Public CV · PDF</a>}</div><div className="contact-meta"><span><Icon name="pin" size={14}/> {siteConfig.location}</span><span><i className="status-dot"/> {siteConfig.availabilityNote}</span></div></div>
            <div className="contact-aside"><div className="contact-aside-top"><span>DIRECTORY / 001</span><span>PUBLIC PROFILE</span></div><div className="contact-monogram">KA<span>.</span></div><div className="contact-handle">@{siteConfig.handle}</div><button className="copy-profile" data-sfx="copy" onClick={handleCopy}><span>{copied ? 'PROFILE LINK COPIED' : 'COPY GITHUB PROFILE'}</span><Icon name={copied ? 'check' : 'copy'} size={15}/></button><a className="contact-github" href={siteConfig.github} target="_blank" rel="noopener noreferrer"><Icon name="github"/> OPEN GITHUB <Icon name="external" size={13}/></a></div>
            <div className="contact-corner">OPEN TO GOOD QUESTIONS & PRACTICAL BUILDS.</div>
          </div>
          <Suspense fallback={null}><InquiryAndComments/></Suspense>
        </section>
      </main>

      <footer className="site-footer page-width"><a className="footer-brand" href="#home" onClick={(event) => { event.preventDefault(); navigate('home') }}>KA<span>.</span></a><div className="footer-copy"><span>DESIGNED & BUILT WITH CURIOSITY.</span><small>© {new Date().getFullYear()} KING ART D. PACUMBERTO. ALL RIGHTS RESERVED.</small></div><div className="footer-links"><a href={siteConfig.github} target="_blank" rel="noopener noreferrer">GITHUB <Icon name="external" size={12}/></a>{siteConfig.linkedin && <a href={siteConfig.linkedin} target="_blank" rel="noopener noreferrer">LINKEDIN <Icon name="external" size={12}/></a>}<button data-sfx="open" onClick={() => setPaletteOpen(true)}><Icon name="command" size={13}/> COMMAND MENU</button><button data-sfx="open" onClick={openRecruiterView}>RECRUITER VIEW</button><button data-sfx="open" onClick={() => setAdminOpen(true)}>ADMIN <Icon name="external" size={12}/></button><button className="back-top" data-sfx="navigate" onClick={() => navigate('home')} aria-label="Back to top"><Icon name="arrowUp" size={16}/></button></div></footer>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={navigate} theme={theme} onTheme={toggleTheme}/>
      <QuickNavigator activeSection={activeSection} onNavigate={navigate}/>
      <Suspense fallback={null}>
        <AdminPortal open={adminOpen} onClose={() => setAdminOpen(false)}/>
        <PrivacyNotice/>
      </Suspense>
      <ServiceWorkerUpdateNotice/>
      {selectedProject && <ProjectModal project={selectedProject} onClose={closeProject}/> }
    </div>
  )
}
