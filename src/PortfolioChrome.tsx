import { useEffect, useState } from 'react'
import { projects } from './data'

const featureSections = [
  { id: 'lab', label: 'Project Lab', hint: 'Interactive demos' },
  { id: 'skills-map', label: 'Skill Map', hint: 'Skills → proof' },
  { id: 'photo-archive', label: 'Photography', hint: 'Local image viewer' },
  { id: 'network-lab', label: 'Network Lab', hint: 'Safe simulation' },
  { id: 'osint-journal', label: 'OSINT Journal', hint: 'Verification workflow' },
  { id: 'hardware-lab', label: 'Hardware Lab', hint: 'Arduino control model' },
  { id: 'notebook', label: 'Developer Notes', hint: 'Learning log' },
  { id: 'building', label: 'Currently Building', hint: 'Active work' },
]

export function IntroSequence() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      if (sessionStorage.getItem('legion-intro-seen-v1') === 'yes') return false
      const savedMotion = localStorage.getItem('legion-portfolio-motion-v7')
      if (savedMotion === 'off') return false
      return true
    } catch { /* Storage may be unavailable; keep the default introduction enabled. */ }
    return true
  })

  useEffect(() => {
    if (!visible) return
    const timeout = window.setTimeout(finish, 1900)
    return () => window.clearTimeout(timeout)
    // `finish` is stable for the lifetime of this mounted intro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  function finish() {
    try { sessionStorage.setItem('legion-intro-seen-v1', 'yes') } catch { /* Continue without persistence. */ }
    setVisible(false)
  }

  if (!visible) return null
  return (
    <div className="portfolio-intro" role="status" aria-label="Portfolio introduction">
      <div className="intro-grid" aria-hidden="true"/>
      <div className="intro-center">
        <div className="intro-monogram">K<span>A</span><i>.</i></div>
        <div className="intro-rule"><i/></div>
        <p>FIELD NOTES / 001</p>
        <strong>KING ART D. PACUMBERTO</strong>
        <small>SOFTWARE · SYSTEMS · CREATIVE TECHNOLOGY</small>
      </div>
      <button className="intro-skip" onClick={finish}>SKIP INTRO <span aria-hidden="true">↗</span></button>
    </div>
  )
}

export function ProjectCompare() {
  const comparable = projects.filter((project) => project.featured)
  const [leftId, setLeftId] = useState(comparable[0]?.id ?? projects[0]?.id ?? '')
  const [rightId, setRightId] = useState(comparable[1]?.id ?? projects[1]?.id ?? '')
  const left = projects.find((project) => project.id === leftId) ?? projects[0]
  const right = projects.find((project) => project.id === rightId) ?? projects[1]
  if (!left || !right) return null
  const rows: Array<{ label: string; a: string; b: string }> = [
    { label: 'Discipline', a: left.category, b: right.category },
    { label: 'Purpose', a: left.label, b: right.label },
    { label: 'Contribution', a: left.role, b: right.role },
    { label: 'Status', a: left.status, b: right.status },
    { label: 'Technologies', a: left.stack.join(' · '), b: right.stack.join(' · ') },
    { label: 'Selected capabilities', a: left.highlights.join(' · '), b: right.highlights.join(' · ') },
  ]
  return (
    <div className="project-compare" data-reveal>
      <div className="feature-eyebrow"><span>COMPARISON TOOL</span><i/> COMPARE THE APPROACH</div>
      <div className="compare-heading"><div><h3>Two builds. <em>Different problems.</em></h3><p>Compare the purpose, contribution, technology, and documented status of selected projects.</p></div><span className="compare-stamp">01 / 02</span></div>
      <div className="compare-selectors">
        <label>PROJECT A<select value={leftId} onChange={(event) => setLeftId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.shortName}</option>)}</select></label>
        <span className="compare-versus">VS</span>
        <label>PROJECT B<select value={rightId} onChange={(event) => setRightId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.shortName}</option>)}</select></label>
      </div>
      <div className="compare-grid">
        <div className="compare-project-head"><span>PROJECT A</span><strong>{left.name}</strong><small>{left.headline}</small></div>
        <div className="compare-project-head"><span>PROJECT B</span><strong>{right.name}</strong><small>{right.headline}</small></div>
        {rows.map((row) => <div className="compare-row" key={row.label}>
          <span>{row.label}</span><p>{row.a}</p><p>{row.b}</p>
        </div>)}
      </div>
      <div className="compare-footnote">Descriptions reflect documented project scope. No unverified performance figures or completion claims are added.</div>
    </div>
  )
}

export function ServiceWorkerUpdateNotice() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [applying, setApplying] = useState(false)
  useEffect(() => {
    const onUpdate = (event: Event) => {
      const worker = (event as CustomEvent<{ worker?: ServiceWorker }>).detail?.worker
      if (worker) setWaitingWorker(worker)
    }
    window.addEventListener('portfolio-update-ready', onUpdate)
    return () => window.removeEventListener('portfolio-update-ready', onUpdate)
  }, [])
  if (!waitingWorker) return null
  return <aside className="service-update-notice" role="status"><div><strong>A portfolio update is ready.</strong><small>Your current page stays open until you choose to reload.</small></div><button disabled={applying} onClick={() => { setApplying(true); navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true }); waitingWorker.postMessage('PORTFOLIO_SKIP_WAITING') }}>{applying ? 'UPDATING…' : 'RELOAD TO UPDATE'}</button><button className="service-update-dismiss" onClick={() => setWaitingWorker(null)} aria-label="Dismiss update notice">×</button></aside>
}

export function QuickNavigator({ activeSection, onNavigate }: { activeSection: string; onNavigate: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pinned, setPinned] = useState(false)
  const expanded = hovered || focused || pinned
  const activeIndex = Math.max(0, featureSections.findIndex((section) => section.id === activeSection)) + 1
  useEffect(() => {
    let frame = 0
    const update = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        setVisible(window.scrollY > Math.max(560, window.innerHeight * 0.72))
      })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => { window.removeEventListener('scroll', update); if (frame) window.cancelAnimationFrame(frame) }
  }, [])
  if (!visible) return null
  return (
    <nav
      className={`quick-navigator${expanded ? ' is-expanded' : ''}${pinned ? ' is-pinned' : ''}`}
      aria-label="Section navigator"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => { if ((event.target as HTMLElement).matches(':focus-visible')) setFocused(true) }}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget as Node | null
        if (!nextTarget || !event.currentTarget.contains(nextTarget)) setFocused(false)
      }}
    >
      <div className="quick-navigator-topline">
        <span className="quick-navigator-heading">JUMP TO</span>
        <button
          className="quick-navigator-toggle"
          type="button"
          aria-expanded={expanded}
          aria-pressed={pinned}
          aria-controls="quick-navigator-links"
          aria-label={pinned ? 'Unpin section navigator' : expanded ? 'Keep section navigator open' : 'Expand section navigator'}
          title={pinned ? 'Unpin navigator' : expanded ? 'Keep navigator open' : 'Expand navigator'}
          onClick={() => setPinned((current) => { const next = !current; if (!next) setFocused(false); return next })}
        >
          <span className="quick-navigator-toggle-icon" aria-hidden="true">{expanded ? '›' : '‹'}</span>
          <span className="quick-navigator-toggle-copy">{pinned ? 'PINNED' : 'MENU'}</span>
        </button>
      </div>
      <div className="quick-navigator-rail" aria-hidden="true">
        <span className="quick-navigator-rail-label">SECTIONS</span>
        <span className="quick-navigator-rail-index">{String(activeIndex).padStart(2, '0')}</span>
        <span className="quick-navigator-rail-track"><i style={{ height: `${activeIndex / featureSections.length * 100}%` }}/></span>
      </div>
      <div id="quick-navigator-links" className="quick-navigator-links" aria-hidden={!expanded}>
        {featureSections.map((section, index) => (
          <button
            key={section.id}
            type="button"
            className={activeSection === section.id ? 'active' : ''}
            onClick={() => { onNavigate(section.id); if (window.matchMedia?.('(hover: none)').matches) setPinned(false) }}
            title={section.hint}
            aria-label={`Go to ${section.label}`}
            tabIndex={expanded ? 0 : -1}
          >
            <i aria-hidden="true"/><span className="quick-navigator-number">{String(index + 1).padStart(2, '0')}</span><span>{section.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
