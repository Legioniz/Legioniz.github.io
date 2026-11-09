import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { projects } from './data'
import type { Project } from './data'

type FeatureTab = 'exposure' | 'energy'
type Photo = { id: string; name: string; url: string; width: number; height: number; bytes: number }

export function PortfolioFeatures({ onOpenProject }: { onOpenProject: (project: Project) => void }) {
  const [labTab, setLabTab] = useState<FeatureTab>('exposure')
  const [iso, setIso] = useState(400)
  const [aperture, setAperture] = useState(5.6)
  const [shutterIndex, setShutterIndex] = useState(2)
  const shutters = [1 / 30, 1 / 60, 1 / 125, 1 / 250, 1 / 500]
  const shutterLabels = ['1/30', '1/60', '1/125', '1/250', '1/500']
  const shutter = shutters[shutterIndex] ?? shutters[2]!
  const exposureValue = Math.log2((aperture * aperture / shutter) * (100 / iso))
  const baselineEv = Math.log2((5.6 * 5.6 / (1 / 125)) * (100 / 100))
  const relativeExposure = Math.pow(2, baselineEv - exposureValue)
  function handleLabTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])
    const currentIndex = tabs.indexOf(event.currentTarget)
    let nextIndex = currentIndex
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = tabs.length - 1
    else return
    event.preventDefault()
    const nextTab = tabs[nextIndex]
    const nextValue = nextTab?.dataset.labTab
    if (nextTab && (nextValue === 'exposure' || nextValue === 'energy')) {
      setLabTab(nextValue)
      nextTab.focus()
    }
  }

  const [watts, setWatts] = useState(90)
  const [hours, setHours] = useState(6)
  const [rate, setRate] = useState(12)
  const monthlyKwh = Math.max(0, watts) * Math.max(0, hours) * 30 / 1000
  const monthlyCost = monthlyKwh * Math.max(0, rate)

  const skillOptions = [
    { name: 'Python', tags: 'Python · scripting · logic', projects: ['python-game-concepts', 'smart-meter'] },
    { name: 'C++', tags: 'C++ · embedded control', projects: ['fan-controller'] },
    { name: 'JavaScript', tags: 'JavaScript · HTML · CSS', projects: ['lens-lab'] },
    { name: 'SQL / MySQL', tags: 'SQL · MySQL · data modeling', projects: ['smart-meter'] },
    { name: 'Arduino', tags: 'Arduino · LM35 · PWM', projects: ['fan-controller'] },
    { name: 'Photography', tags: 'Camera operation · image editing', projects: ['toki-satsuei'] },
    { name: 'Linux / Nmap', tags: 'Linux fundamentals · authorized lab practice', projects: [] },
    { name: 'OSINT', tags: 'Public sources · verification · documentation', projects: [] },
    { name: 'Technical production', tags: 'Event systems · audio · livestream operations', projects: ['toki-satsuei'] },
  ]
  const [activeSkill, setActiveSkill] = useState('Python')
  const selectedSkill = skillOptions.find((skill) => skill.name === activeSkill) ?? skillOptions[0]!
  const associatedProjects = projects.filter((project) => selectedSkill.projects.includes(project.id))

  const [photos, setPhotos] = useState<Photo[]>([])
  const photoUrls = useRef<string[]>([])
  const [viewerId, setViewerId] = useState<string | null>(null)
  const touchStartX = useRef<number | null>(null)
  const [split, setSplit] = useState(52)
  const [photoFilter, setPhotoFilter] = useState<'all' | 'portrait' | 'landscape' | 'square'>('all')
  const [uploadMessage, setUploadMessage] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const viewerPhoto = photos.find((photo) => photo.id === viewerId)
  const filteredPhotos = useMemo(() => photos.filter((photo) => {
    const ratio = photo.width / Math.max(1, photo.height)
    if (photoFilter === 'portrait') return ratio < 0.92
    if (photoFilter === 'landscape') return ratio > 1.08
    if (photoFilter === 'square') return ratio >= 0.92 && ratio <= 1.08
    return true
  }), [photos, photoFilter])
  const viewerIdRef = useRef(viewerId)
  const filteredPhotosRef = useRef(filteredPhotos)
  viewerIdRef.current = viewerId
  filteredPhotosRef.current = filteredPhotos
  const viewerOpen = viewerId !== null

  useEffect(() => () => photoUrls.current.forEach((url) => URL.revokeObjectURL(url)), [])
  useEffect(() => {
    if (!viewerOpen) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusClose = () => document.querySelector<HTMLButtonElement>('.photo-lightbox .feature-close')?.focus()
    const onKey = (event: KeyboardEvent) => {
      const currentPhotos = filteredPhotosRef.current
      const currentId = viewerIdRef.current
      if (event.key === 'Escape') { event.preventDefault(); setViewerId(null); return }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const currentIndex = currentPhotos.findIndex((photo) => photo.id === currentId)
        if (currentPhotos.length > 1 && currentIndex >= 0) {
          event.preventDefault()
          const direction = event.key === 'ArrowRight' ? 1 : -1
          setViewerId(currentPhotos[(currentIndex + direction + currentPhotos.length) % currentPhotos.length]!.id)
        }
        return
      }
      if (event.key !== 'Tab') return
      const panel = document.querySelector<HTMLElement>('.photo-lightbox-panel')
      if (!panel) return
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>('button, input, a[href], [tabindex]:not([tabindex="-1"])')).filter((item) => item.getClientRects().length > 0)
      if (!focusable.length) { event.preventDefault(); panel.focus(); return }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    const frame = window.requestAnimationFrame(focusClose)
    window.addEventListener('keydown', onKey)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [viewerOpen])

  function moveViewer(direction: number) {
    if (filteredPhotos.length < 2) return
    const currentIndex = filteredPhotos.findIndex((photo) => photo.id === viewerId)
    if (currentIndex < 0) return
    setViewerId(filteredPhotos[(currentIndex + direction + filteredPhotos.length) % filteredPhotos.length]!.id)
    setSplit(52)
  }

  async function handlePhotoFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/bmp'])
    const imageFiles = selected.filter((file) => supportedTypes.has(file.type.toLowerCase()))
    const accepted: File[] = []
    let rejected = selected.length - imageFiles.length
    let remainingSlots = Math.max(0, 24 - photos.length)
    let remainingBytes = Math.max(0, 48 * 1024 * 1024 - photos.reduce((sum, photo) => sum + photo.bytes, 0))
    for (const file of imageFiles) {
      if (accepted.length >= remainingSlots || file.size > 12 * 1024 * 1024 || file.size > remainingBytes) {
        rejected += 1
        continue
      }
      accepted.push(file)
      remainingBytes -= file.size
    }
    if (!accepted.length) {
      setUploadMessage('Choose JPG, PNG, WebP, AVIF, GIF, or BMP images under 12 MB each. The browser workspace allows up to 24 images and 48 MB total.')
      event.target.value = ''
      return
    }
    const next: Photo[] = []
    for (const file of accepted) {
      const url = URL.createObjectURL(file)
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        const image = new Image()
        image.onload = () => resolve({ width: image.naturalWidth || 1, height: image.naturalHeight || 1 })
        image.onerror = () => resolve({ width: 0, height: 0 })
        image.src = url
      })
      if (!dimensions.width || !dimensions.height || dimensions.width * dimensions.height > 45_000_000) {
        URL.revokeObjectURL(url)
        rejected += 1
        continue
      }
      photoUrls.current.push(url)
      next.push({ id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`, name: file.name, url, width: dimensions.width, height: dimensions.height, bytes: file.size })
    }
    setPhotos((current) => [...current, ...next])
    setUploadMessage(`${next.length} image${next.length === 1 ? '' : 's'} added locally${rejected ? ` · ${rejected} rejected by format, size, or image-dimension limits` : ''}. Nothing has been uploaded.`)
    event.target.value = ''
  }

  const [firewallOn, setFirewallOn] = useState(true)
  const [targetNode, setTargetNode] = useState('app')
  const [networkEvents, setNetworkEvents] = useState<Array<{ id: number; time: string; message: string; allowed: boolean }>>([
    { id: 1, time: 'SIM / 001', message: 'Client initialized in isolated documentation network.', allowed: true },
  ])
  const nodes = [
    { id: 'client', label: 'CLIENT', ip: '192.0.2.10', type: 'User endpoint', ports: ['DHCP · 68/UDP', 'HTTPS · 443/TCP'] },
    { id: 'gateway', label: 'GATEWAY', ip: '192.0.2.1', type: 'Routing boundary', ports: ['HTTPS · 443/TCP', 'DNS · 53/UDP'] },
    { id: 'app', label: 'APP SERVER', ip: '198.51.100.20', type: 'Demo application', ports: ['HTTPS · 443/TCP', 'SSH · 22/TCP (closed)'] },
    { id: 'db', label: 'DATABASE', ip: '203.0.113.15', type: 'Private data service', ports: ['PostgreSQL · 5432/TCP', 'Admin · 8443/TCP (closed)'] },
  ]
  const selectedNode = nodes.find((node) => node.id === targetNode) ?? nodes[2]!
  const selectedNodeIndex = Math.max(0, nodes.findIndex((node) => node.id === targetNode))
  function simulatePacket() {
    const protectedTarget = targetNode === 'db'
    const allowed = !firewallOn || !protectedTarget
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setNetworkEvents((items) => [{ id: Date.now(), time: now, message: `Client → ${selectedNode.label} (${selectedNode.ip}) · TCP demo request`, allowed }, ...items].slice(0, 5))
  }

  const [checks, setChecks] = useState([false, false, false, false, false])
  const osintSteps = [
    'Define the question and scope before collecting anything.',
    'Start with the organization’s own official website and published documents.',
    'Cross-check legal or registration claims against the relevant official registry.',
    'Validate dates, authorship, and the context of each source.',
    'Record conflicts, uncertainty, and the limits of the conclusion.',
  ]
  const osintProgress = checks.filter(Boolean).length

  const [temperature, setTemperature] = useState(29)
  const fanSpeed = temperature < 24 ? 0 : Math.min(100, Math.round(28 + (temperature - 24) * 4.5))
  const [notebookFilter, setNotebookFilter] = useState('All')
  const notebookEntries = [
    { title: 'Designing a useful first-run guide', category: 'Interface', summary: 'A guide should explain a real task, highlight only the relevant controls, remember completion, and let people reopen it later.' },
    { title: 'Treat every data source as untrusted', category: 'Security', summary: 'Validate on the server, keep privileged keys out of client code, and make authorization decisions in the database—not in interface state.' },
    { title: 'Make a simulation honest', category: 'Systems', summary: 'Label assumptions, synthetic data, and missing integrations so a useful demonstration never masquerades as a production connection.' },
    { title: 'Reduce motion without removing meaning', category: 'Interface', summary: 'Keep information visible, use opacity and transform only when motion is enabled, and offer a site-level control.' },
    { title: 'Document the boundary of a lab', category: 'Security', summary: 'Use reserved example addresses and fictional services. Do not connect the educational visualization to public hosts.' },
  ]
  const notebookCategories = ['All', 'Interface', 'Security', 'Systems']
  const visibleNotes = notebookEntries.filter((entry) => notebookFilter === 'All' || entry.category === notebookFilter)

  return (
    <div className="portfolio-features">
      <section id="lab" className="feature-section section-pad page-width">
        <FeatureHeader index="03" label="PROJECT LABORATORY / INTERACTIVE DEMONSTRATIONS" title="Explore the thinking." accent="Change the inputs." copy="Small, honest simulations that let visitors inspect the ideas behind selected projects. These are educational models—not live camera hardware, utility data, or production infrastructure." />
        <div className="lab-shell" data-reveal>
          <div className="lab-shell-head"><span><i className="live-dot"/> INTERACTIVE WORKSPACE</span><span>LOCAL SIMULATION / NO EXTERNAL DATA</span></div>
          <div className="lab-tabs" role="tablist" aria-label="Project laboratory demonstrations">
            <button id="lab-tab-exposure" data-lab-tab="exposure" type="button" role="tab" aria-selected={labTab === 'exposure'} aria-controls="lab-panel-exposure" tabIndex={labTab === 'exposure' ? 0 : -1} className={labTab === 'exposure' ? 'is-selected' : ''} onClick={() => setLabTab('exposure')} onKeyDown={handleLabTabKeyDown}>01 / EXPOSURE MODEL</button>
            <button id="lab-tab-energy" data-lab-tab="energy" type="button" role="tab" aria-selected={labTab === 'energy'} aria-controls="lab-panel-energy" tabIndex={labTab === 'energy' ? 0 : -1} className={labTab === 'energy' ? 'is-selected' : ''} onClick={() => setLabTab('energy')} onKeyDown={handleLabTabKeyDown}>02 / ENERGY ESTIMATOR</button>
          </div>
          <>
            <div id="lab-panel-exposure" aria-labelledby="lab-tab-exposure" className="exposure-workspace" role="tabpanel" tabIndex={0} hidden={labTab !== 'exposure'}>
              <div className="lab-description"><span className="feature-code">LENS LAB / EXPOSURE TRIANGLE</span><h3>Three controls. <em>One exposure.</em></h3><p>Adjust ISO, aperture, and shutter speed to see how their light contribution changes relative to a fixed baseline of f/5.6, 1/125 s, ISO 100.</p><button className="feature-text-button" onClick={() => { setIso(400); setAperture(5.6); setShutterIndex(2) }}>Reset example ↺</button></div>
              <div className="exposure-controls">
                <RangeControl label="ISO" value={iso} min={100} max={6400} step={100} output={String(iso)} onChange={setIso}/>
                <div className="range-control"><label htmlFor="aperture-select">APERTURE</label><output>f/{aperture.toFixed(1)}</output><select id="aperture-select" value={aperture} onChange={(event) => setAperture(Number(event.target.value))}>{[1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22].map((value) => <option key={value} value={value}>f/{value}</option>)}</select></div>
                <div className="range-control"><label htmlFor="shutter-select">SHUTTER SPEED</label><output>{shutterLabels[shutterIndex]}</output><select id="shutter-select" value={shutterIndex} onChange={(event) => setShutterIndex(Number(event.target.value))}>{shutterLabels.map((value, index) => <option key={value} value={index}>{value} s</option>)}</select></div>
              </div>
              <div className="exposure-result"><span className="feature-code">CALCULATED RESULT / EV100</span><strong>{exposureValue.toFixed(2)}<small> EV</small></strong><div className="exposure-meter"><i style={{ width: `${Math.max(2, Math.min(100, relativeExposure / 4 * 100))}%` }}/></div><p><b>{relativeExposure.toFixed(2)}×</b> relative exposure compared with the baseline. This is a mathematical teaching aid, not a rendered camera preview.</p></div>
            </div>
            <div id="lab-panel-energy" aria-labelledby="lab-tab-energy" className="energy-workspace" role="tabpanel" tabIndex={0} hidden={labTab !== 'energy'}>
              <div className="lab-description"><span className="feature-code">SMART ELECTRICAL MONITORING / ESTIMATE</span><h3>Put usage into <em>monthly context.</em></h3><p>Change the sample appliance assumptions. The calculator estimates energy use from rated watts × daily hours × 30 days.</p><button className="feature-text-button" onClick={() => { setWatts(90); setHours(6); setRate(12) }}>Reset assumptions ↺</button></div>
              <div className="energy-controls">
                <RangeControl label="APPLIANCE POWER" value={watts} min={5} max={2000} step={5} output={`${watts} W`} onChange={setWatts}/>
                <RangeControl label="HOURS PER DAY" value={hours} min={0} max={24} step={0.5} output={`${hours} h`} onChange={setHours}/>
                <div className="range-control"><label htmlFor="electricity-rate">ASSUMED RATE / kWh</label><output>₱{rate.toFixed(2)}</output><input id="electricity-rate" type="number" min="0" max="1000" step="0.25" value={rate} onChange={(event) => setRate(Math.max(0, Number(event.target.value) || 0))}/></div>
              </div>
              <div className="energy-result"><span className="feature-code">ESTIMATED MONTHLY COST</span><strong>₱{monthlyCost.toLocaleString('en-PH', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</strong><div className="energy-result-stats"><span><small>MONTHLY ENERGY</small><b>{monthlyKwh.toFixed(2)} kWh</b></span><span><small>DAILY ENERGY</small><b>{(watts * hours / 1000).toFixed(2)} kWh</b></span></div><p>The ₱/kWh rate is an editable example assumption, not a current utility tariff or actual bill calculation.</p></div>
            </div>
          </>
          <div className="lab-shell-foot"><span>FORMULA-LED / CLIENT-SIDE ONLY</span><span>INPUTS RESET ON PAGE RELOAD</span></div>
        </div>
        <div className="feature-side-note"><span>RELATED BUILD</span><button onClick={() => onOpenProject(projects[0]!)}>LensLab <b>↗</b></button><button onClick={() => onOpenProject(projects[1]!)}>Smart Electrical Monitoring <b>↗</b></button></div>
      </section>

      <section id="skills-map" className="feature-section section-pad page-width">
        <FeatureHeader index="04" label="CAPABILITY MAP / EVIDENCE, NOT JUST KEYWORDS" title="Connect a skill" accent="to the work." copy="Select a tool or practice to see the portfolio evidence associated with it. The map avoids proficiency scores because no formal level assessment has been supplied." />
        <div className="skill-map-shell" data-reveal>
          <div className="skill-map-list" role="group" aria-label="Select a skill">
            {skillOptions.map((skill, index) => <button className={activeSkill === skill.name ? 'skill-map-chip active' : 'skill-map-chip'} key={skill.name} onClick={() => setActiveSkill(skill.name)} aria-pressed={activeSkill === skill.name}><span>{String(index + 1).padStart(2, '0')}</span>{skill.name}<i>↗</i></button>)}
          </div>
          <div className="skill-map-detail"><span className="feature-code">SELECTED CAPABILITY / {selectedSkill.name.toUpperCase()}</span><h3>{selectedSkill.name}</h3><p>{selectedSkill.tags}</p><div className="skill-map-evidence"><small>ASSOCIATED PORTFOLIO EVIDENCE</small>{associatedProjects.length ? associatedProjects.map((project) => <button key={project.id} onClick={() => onOpenProject(project)}><span><b>{project.name}</b><small>{project.label}</small></span><i>OPEN CASE STUDY ↗</i></button>) : <div className="skill-map-note">This is a foundational practice documented in the experience and lab sections. No separate project repository is currently linked.</div>}</div></div>
        </div>
      </section>

      <section id="photo-archive" className="feature-section section-pad page-width">
        <FeatureHeader index="05" label="PHOTOGRAPHY ARCHIVE / IMAGE PRACTICE" title="A frame is a" accent="decision." copy="A private, local image workspace for reviewing your own photographs. Add images from your device to test a simple before/after treatment and a full-screen viewer; files never leave this browser session." />
        <div className="photo-archive-shell" data-reveal>
          <div className="photo-archive-head"><div><span className="feature-code">LOCAL SESSION / NO SERVER UPLOADS</span><h3>Your <em>photo workspace</em></h3></div><button className="feature-button" onClick={() => fileInput.current?.click()}>＋ ADD PHOTOS</button><input ref={fileInput} className="visually-hidden" type="file" aria-label="Add photos" accept="image/*" multiple onChange={handlePhotoFiles}/></div>
          <div className="photo-archive-filters" role="group" aria-label="Filter photos by aspect ratio">{(['all', 'portrait', 'landscape', 'square'] as const).map((item) => <button key={item} className={photoFilter === item ? 'active' : ''} onClick={() => setPhotoFilter(item)} aria-pressed={photoFilter === item}>{item.toUpperCase()}</button>)}<span>{filteredPhotos.length} / {photos.length} FRAMES</span></div>
          {photos.length === 0 ? <div className="photo-empty"><div className="photo-empty-icon">⌗</div><strong>Your archive starts with a frame.</strong><p>No sample photography is included yet. Add JPG, PNG, WebP, AVIF, GIF, or BMP images from your device to create a temporary gallery preview.</p><button className="feature-text-button" onClick={() => fileInput.current?.click()}>Choose images from this device ↗</button></div> : filteredPhotos.length ? <div className="photo-grid">{filteredPhotos.map((photo) => <button className="photo-tile" key={photo.id} onClick={() => { setViewerId(photo.id); setSplit(52) }}><img src={photo.url} alt={photo.name} loading="lazy"/><span><b>{photo.name}</b><small>{photo.width} × {photo.height} · {(photo.bytes / 1024).toFixed(0)} KB</small></span><i>OPEN ↗</i></button>)}</div> : <div className="photo-empty compact">No images in this aspect-ratio category. Choose another filter.</div>}
          {uploadMessage && <p className="photo-local-note" role="status">{uploadMessage}</p>}
          {photos.length > 0 && <button className="feature-text-button remove-photos" onClick={() => { photos.forEach((photo) => URL.revokeObjectURL(photo.url)); photoUrls.current = []; setPhotos([]); setViewerId(null); setUploadMessage('Local image previews cleared.') }}>Clear local image previews ×</button>}
        </div>
      </section>

      <section id="network-lab" className="feature-section section-pad page-width">
        <FeatureHeader index="06" label="NETWORK LAB / ISOLATED EDUCATIONAL SIMULATION" title="Inspect the route." accent="Control the boundary." copy="Explore a fictional network topology and toggle a sample firewall rule. This visualization does not scan, connect to, or send traffic to any real host." />
        <div className="network-lab-shell" data-reveal>
          <div className="network-topology">
            <div className="network-topology-head"><span>TOPOLOGY / DOCUMENTATION ADDRESS SPACE</span><span className="network-safe-label">SIMULATED ENVIRONMENT</span></div>
            <div className="network-path" data-motion-zone data-selected-node={targetNode} aria-label="Simulated client to gateway to application and database path">
              {nodes.map((node, index) => <div className="network-node-wrap" key={node.id}><button className={`network-node ${targetNode === node.id ? 'active' : ''}`} onClick={() => setTargetNode(node.id)} aria-pressed={targetNode === node.id}><span className="network-node-icon">{['⌘', '⇄', '▣', '▤'][index]}</span><b>{node.label}</b><small>{node.ip}</small></button>{index < nodes.length - 1 && <span className={`network-link ${index < selectedNodeIndex ? 'is-traversed' : ''} ${index === selectedNodeIndex ? 'is-next' : ''}`} aria-hidden="true"><i/></span>}</div>)}
            </div>
            <div className="network-node-detail" aria-live="polite"><div><span className="feature-code">SELECTED NODE / {selectedNode.ip}</span><h3>{selectedNode.label}</h3><p>{selectedNode.type}</p></div><div className="network-port-list">{selectedNode.ports.map((port) => <span key={port}>{port}</span>)}</div></div>
          </div>
          <div className="network-controls"><div className="firewall-control"><div><span className="feature-code">RULESET / FW-001</span><strong>Protect database segment</strong><small>Block the client-to-database demo path when enabled.</small></div><button className={firewallOn ? 'firewall-switch on' : 'firewall-switch'} onClick={() => setFirewallOn((value) => !value)} role="switch" aria-label="Protect database segment" aria-checked={firewallOn}><i/></button></div><div className="packet-test"><div><strong>Simulate a connection attempt</strong><p>Choose a node and observe the fictional policy result.</p></div><button className="feature-button" onClick={simulatePacket}>RUN SIMULATION ↗</button></div><div className="network-log" aria-live="polite"><span>EVENT LOG / MOST RECENT FIRST</span>{networkEvents.map((event) => <div key={event.id} className={event.allowed ? 'network-event allowed' : 'network-event blocked'}><time>{event.time}</time><p>{event.message}</p><b>{event.allowed ? 'ALLOWED' : 'BLOCKED'}</b></div>)}</div></div>
          <div className="network-disclaimer">All addresses shown use documentation-only ranges reserved for examples. Ports and traffic events are fictional and generated locally in the browser.</div>
        </div>
      </section>

      <section id="osint-journal" className="feature-section section-pad page-width">
        <FeatureHeader index="07" label="OSINT RESEARCH JOURNAL / SOURCE VERIFICATION" title="Follow the evidence." accent="Record the limits." copy="A repeatable public-source verification workflow: define a question, prefer primary sources, cross-check, preserve context, and report uncertainty. The sample scenario is fictional." />
        <div className="osint-shell" data-reveal>
          <div className="osint-scenario"><span className="feature-code">CASE NOTE / EXAMPLE ONLY</span><h3>Northstar Tools <em>(fictional)</em></h3><p>Research question: “Can the public claims made by this fictional supplier be independently corroborated?”</p><div className="osint-source-types"><span>01 / OFFICIAL SITE</span><span>02 / PUBLIC REGISTRY</span><span>03 / PUBLISHED RECORDS</span><span>04 / INDEPENDENT REPORTING</span></div><div className="osint-caution"><b>BOUNDARY</b><p>No personal account discovery, private-data collection, credential testing, or unapproved access is part of this workflow.</p></div></div>
          <div className="osint-checklist"><div className="osint-check-head"><span>VERIFICATION CHECKLIST</span><strong>{osintProgress} / {osintSteps.length} COMPLETE</strong></div><div className="osint-progress"><i style={{ width: `${osintProgress / osintSteps.length * 100}%` }}/></div>{osintSteps.map((step, index) => <label className={checks[index] ? 'osint-step complete' : 'osint-step'} key={step}><input type="checkbox" checked={checks[index]} onChange={(event) => setChecks((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.checked : value))}/><span className="osint-step-index">0{index + 1}</span><span>{step}</span><i>{checks[index] ? '✓' : '＋'}</i></label>)}<button className="feature-text-button" onClick={() => setChecks([false, false, false, false, false])}>Reset checklist ↺</button></div>
        </div>
      </section>

      <section id="hardware-lab" className="feature-section section-pad page-width">
        <FeatureHeader index="08" label="HARDWARE LAB / EMBEDDED SYSTEMS" title="From sensor reading" accent="to controlled output." copy="A browser-side model inspired by the Arduino fan controller. Change the simulated temperature and inspect a simplified PWM response curve; no hardware is connected." />
        <div className="hardware-shell" data-reveal>
          <div className="hardware-visual"><div className="fan-graphic" style={{ '--fan-speed': `${Math.max(180, 1200 - fanSpeed * 10)}ms`, animationPlayState: fanSpeed === 0 ? 'paused' : 'running' } as CSSProperties}><i/><i/><i/><i/><b/></div><span className="feature-code">FAN OUTPUT / SIMULATED</span><strong>{fanSpeed}<small>% PWM</small></strong><p>{fanSpeed === 0 ? 'Below activation threshold' : fanSpeed < 65 ? 'Low to moderate airflow' : 'High airflow demand'}</p></div>
          <div className="hardware-controls"><span className="feature-code">LM35 TEMPERATURE INPUT / DEMO</span><h3>Ambient temperature</h3><div className="temperature-readout"><strong>{temperature}°C</strong><span>SIMULATED SENSOR VALUE</span></div><RangeControl label="TEMPERATURE" value={temperature} min={15} max={55} step={1} output={`${temperature}°C`} onChange={setTemperature}/><div className="fan-curve"><span>0% / 24°C</span><div><i style={{ width: `${fanSpeed}%` }}/></div><span>100% / 40°C+</span></div><div className="hardware-formula"><b>MODEL NOTE</b><p>Output stays off below 24°C, then increases in a simple ramp up to 100%. This is an explanatory curve, not a verified copy of the hardware firmware’s exact control function.</p></div><button className="feature-text-button" onClick={() => setTemperature(29)}>Reset sensor ↺</button></div>
        </div>
      </section>

      <section id="notebook" className="feature-section section-pad page-width">
        <FeatureHeader index="09" label="DEVELOPER NOTEBOOK / ENGINEERING PRACTICE" title="Notes from the" accent="building process." copy="Short working principles gathered from the portfolio’s actual development direction: communicate constraints, verify trust boundaries, and design for people before effects." />
        <div className="notebook-shell" data-reveal>
          <div className="notebook-toolbar"><span>FIELD NOTES / SELECT A TOPIC</span><div role="group" aria-label="Filter developer notes">{notebookCategories.map((category) => <button key={category} className={notebookFilter === category ? 'active' : ''} onClick={() => setNotebookFilter(category)} aria-pressed={notebookFilter === category}>{category}</button>)}</div></div>
          <div className="notebook-entries">{visibleNotes.map((entry, index) => <article className="notebook-entry" key={entry.title}><span>{String(index + 1).padStart(2, '0')} / {entry.category.toUpperCase()}</span><h3>{entry.title}</h3><p>{entry.summary}</p></article>)}</div>
        </div>
      </section>

      <section id="building" className="feature-section section-pad page-width">
        <FeatureHeader index="10" label="CURRENTLY BUILDING / PROJECT STATUS" title="Work in motion." accent="Progress, not hype." copy="A transparent snapshot of current development directions. Status labels describe the project state supplied for this portfolio, not a public release guarantee." />
        <div className="building-grid" data-reveal>
          <BuildingCard number="01" status="ACTIVE DEVELOPMENT" title="Portfolio experience" description="Project case studies, interactive learning labs, accessible motion, and a secure inquiry workflow." meta="THIS WEBSITE"/>
          <BuildingCard number="02" status="ITERATIVE PROJECT" title="LensLab" description="Photography education, exposure exploration, local presets, guides, and image workflows." meta="INDEPENDENT SOFTWARE"/>
          <BuildingCard number="03" status="LOCAL DEMONSTRATION" title="Smart Electrical Monitoring" description="Synthetic electricity data, consumption analysis, estimates, and privacy-focused local workflows." meta="DATA & SYSTEMS"/>
          <BuildingCard number="04" status="EDUCATIONAL MODEL" title="Network Lab" description="A safe visualization of fictional hosts, ports, route behavior, and firewall rules." meta="SECURITY FOUNDATIONS"/>
        </div>
      </section>

      {viewerPhoto && <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={`Viewing ${viewerPhoto.name}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setViewerId(null) }}><div className="photo-lightbox-panel" tabIndex={-1}><div className="photo-lightbox-head"><div><span>LOCAL PREVIEW / BEFORE & AFTER</span><strong>{viewerPhoto.name}</strong></div><div className="photo-lightbox-actions"><button type="button" className="photo-viewer-nav" onClick={() => moveViewer(-1)} disabled={filteredPhotos.length < 2} aria-label="Previous photo">←</button><span className="photo-viewer-count">{Math.max(1, filteredPhotos.findIndex((photo) => photo.id === viewerPhoto.id) + 1)} / {filteredPhotos.length}</span><button type="button" className="photo-viewer-nav" onClick={() => moveViewer(1)} disabled={filteredPhotos.length < 2} aria-label="Next photo">→</button><button className="feature-close" onClick={() => setViewerId(null)} aria-label="Close image viewer">×</button></div></div><div className="photo-comparison" onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null }} onTouchEnd={(event) => { const start = touchStartX.current; const end = event.changedTouches[0]?.clientX; touchStartX.current = null; if (start !== null && typeof end === 'number' && Math.abs(end - start) > 58) moveViewer(end < start ? 1 : -1) }}><img src={viewerPhoto.url} alt={`${viewerPhoto.name}, original`} className="photo-before"/><div className="photo-after-clip" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}><img src={viewerPhoto.url} alt={`${viewerPhoto.name}, styled preview`} className="photo-after"/></div><span className="photo-before-label">ORIGINAL</span><span className="photo-after-label">PREVIEW</span><div className="photo-split-line" style={{ left: `${split}%` }}/></div><label className="photo-split-control">PREVIEW REVEAL <input type="range" min="0" max="100" value={split} onChange={(event) => setSplit(Number(event.target.value))}/><output>{split}%</output></label><p className="photo-editor-note">The right side applies a restrained browser-only treatment (contrast, saturation, and warmth). Your source image remains unchanged.</p></div></div>}
    </div>
  )
}




function FeatureHeader({ index, label, title, accent, copy }: { index: string; label: string; title: string; accent: string; copy: string }) {
  return <div className="feature-header" data-reveal><div className="feature-eyebrow"><span>{index}</span><i/>{label}</div><h2>{title} <em>{accent}</em></h2><p>{copy}</p></div>
}

function RangeControl({ label, value, min, max, step, output, onChange }: { label: string; value: number; min: number; max: number; step: number; output: string; onChange: (value: number) => void }) {
  return <div className="range-control"><label htmlFor={`range-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{label}</label><output>{output}</output><input id={`range-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))}/></div>
}

function BuildingCard({ number, status, title, description, meta }: { number: string; status: string; title: string; description: string; meta: string }) {
  return <article className="building-card"><div className="building-card-top"><span>{number} / STATUS</span><i>{status}</i></div><h3>{title}</h3><p>{description}</p><small>{meta}</small></article>
}
