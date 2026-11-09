import { useEffect, useLayoutEffect, useRef } from 'react'
import { installScrollReveal } from './reveal'
import { achievements, education, experience, extracurriculars, projects, skillGroups } from './data'
import type { Project } from './data'
import { siteConfig } from './config'

type RecruiterViewProps = {
  onExit: () => void
  onOpenProject: (project: Project) => void
  motionEnabled: boolean
  soundEnabled: boolean
  onToggleMotion: () => void
  onToggleSound: () => void
}

const relevantExperience = [
  experience.find((item) => item.title === 'Computer Support Specialist'),
  experience.find((item) => item.title.startsWith('Student Teacher')),
  experience.find((item) => item.title === 'Event Organizer'),
].filter((item): item is (typeof experience)[number] => Boolean(item))

const otherExperience = experience.filter((item) => !relevantExperience.includes(item))
const featuredProjects = projects.filter((project) => project.featured && project.category !== 'Creative')

export function RecruiterView({ onExit, onOpenProject, motionEnabled, soundEnabled, onToggleMotion, onToggleSound }: RecruiterViewProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const recruiterRootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  useLayoutEffect(() => {
    const root = recruiterRootRef.current
    if (!root) return

    const canReveal = motionEnabled
      && 'IntersectionObserver' in window
      && 'MutationObserver' in window

    if (canReveal) root.dataset.recruiterMotionReady = 'true'
    else delete root.dataset.recruiterMotionReady

    // Reuse the shared site reveal lifecycle, with the recruiter view's
    // existing .is-in-view state so its staggered CSS transitions stay aligned.
    const disposeReveal = installScrollReveal({
      enabled: motionEnabled,
      scope: root,
      visibleClass: 'is-in-view',
    })

    return () => {
      disposeReveal()
      delete root.dataset.recruiterMotionReady
    }
  }, [motionEnabled])

  useEffect(() => {
    const root = recruiterRootRef.current
    if (!root) return

    const motionTargets = [
      ...Array.from(root.querySelectorAll<HTMLElement>('.recruiter-timeline')),
      ...Array.from(root.querySelectorAll<HTMLElement>('.recruiter-project-art')),
    ]

    if (!motionEnabled || !('IntersectionObserver' in window)) {
      motionTargets.forEach((element) => element.classList.remove('motion-active'))
      return
    }

    // Infinite artwork and timeline progress only animate while they are near
    // the viewport; entrance reveals are handled by the shared controller.
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('motion-active', entry.isIntersecting)
      })
    }, { rootMargin: '100px 0px', threshold: 0 })

    motionTargets.forEach((element) => observer.observe(element))
    return () => {
      observer.disconnect()
      motionTargets.forEach((element) => element.classList.remove('motion-active'))
    }
  }, [motionEnabled])

  useEffect(() => {
    const root = recruiterRootRef.current
    if (!root || !('IntersectionObserver' in window)) return
    const sections = Array.from(root.querySelectorAll<HTMLElement>('.recruiter-main > section[id]'))
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('.recruiter-jumps a[href^="#"]'))
    if (sections.length === 0 || links.length === 0) return

    let activeSection = ''
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (!visible || visible.target.id === activeSection) return
      activeSection = visible.target.id
      links.forEach((link) => {
        if (link.hash === `#${activeSection}`) link.setAttribute('aria-current', 'location')
        else link.removeAttribute('aria-current')
      })
    }, { rootMargin: '-18% 0px -66% 0px', threshold: [0, 0.15, 0.3, 0.5] })

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  // A real scroll-progress signal drives the recruiter reading rail. Updates are
  // frame-coalesced so long profiles do not create a scroll-handler bottleneck.
  useEffect(() => {
    const root = recruiterRootRef.current
    if (!root) return

    let frame = 0
    const updateProgress = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
        const progress = Math.min(1, Math.max(0, window.scrollY / range))
        root.style.setProperty('--recruiter-scroll-progress', String(progress))
        root.dataset.scrollDepth = progress >= .985 ? 'end' : 'reading'
      })
    }

    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
      if (frame) window.cancelAnimationFrame(frame)
      root.style.removeProperty('--recruiter-scroll-progress')
      delete root.dataset.scrollDepth
    }
  }, [])

  // Pointer spotlight is deliberately limited to fine pointers and project
  // cards; touch devices keep a static, lightweight presentation.
  useEffect(() => {
    const root = recruiterRootRef.current
    if (!root || !motionEnabled || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const cards = Array.from(root.querySelectorAll<HTMLElement>('.recruiter-project-card'))
    // Delegate at the stable view root. Cards can be remounted during
    // recruiter/full-view transitions, but the root listener remains reliable.
    const onMove = (event: PointerEvent) => {
      const target = event.target
      const card = target instanceof Element
        ? target.closest<HTMLElement>('.recruiter-project-card')
        : null
      cards.forEach((item) => {
        if (item !== card) delete item.dataset.spotlight
      })
      if (!card || !root.contains(card)) return
      const focusArea = card.querySelector<HTMLElement>('.recruiter-project-body') ?? card
      const bounds = focusArea.getBoundingClientRect()
      const x = Math.min(100, Math.max(0, ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 100))
      const y = Math.min(100, Math.max(0, ((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 100))
      card.style.setProperty('--recruiter-spot-x', `${x.toFixed(1)}%`)
      card.style.setProperty('--recruiter-spot-y', `${y.toFixed(1)}%`)
      card.dataset.spotlight = 'active'
    }

    root.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      root.removeEventListener('pointermove', onMove)
      cards.forEach((card) => {
        delete card.dataset.spotlight
        card.style.removeProperty('--recruiter-spot-x')
        card.style.removeProperty('--recruiter-spot-y')
      })
    }
  }, [motionEnabled])

  const activateSectionLink = (sectionId: string) => {
    const root = recruiterRootRef.current
    if (!root) return
    root.querySelectorAll<HTMLAnchorElement>('.recruiter-jumps a[href^="#"]').forEach((link) => {
      if (link.hash === `#${sectionId}`) link.setAttribute('aria-current', 'location')
      else link.removeAttribute('aria-current')
    })
  }

  return (
    <div className="recruiter-view" id="recruiter-view" ref={recruiterRootRef}>
      <div className="recruiter-scroll-progress" aria-hidden="true"><span/></div>
      <a className="skip-link recruiter-skip" href="#recruiter-main" data-sfx="navigate">Skip to recruiter profile</a>
      <header className="recruiter-topbar">
        <a className="recruiter-brand" href="#recruiter-top" data-sfx="navigate">
          <span className="recruiter-brand-lockup">KA</span>
          <small>RECRUITER BRIEF / 01</small>
        </a>
        <nav className="recruiter-jumps" aria-label="Recruiter profile sections">
          <a href="#recruiter-projects" data-sfx="navigate" onClick={() => activateSectionLink('recruiter-projects')}>Projects</a>
          <a href="#recruiter-skills" data-sfx="navigate" onClick={() => activateSectionLink('recruiter-skills')}>Skills</a>
          <a href="#recruiter-experience" data-sfx="navigate" onClick={() => activateSectionLink('recruiter-experience')}>Experience</a>
          <a href="#recruiter-education" data-sfx="navigate" onClick={() => activateSectionLink('recruiter-education')}>Education</a>
          <a href="#recruiter-contact" data-sfx="navigate" onClick={() => activateSectionLink('recruiter-contact')}>Contact</a>
        </nav>
        <div className="recruiter-actions">
          <a className="recruiter-download" data-sfx="download" href={siteConfig.resumePdfPath} download="King-Art-D-Pacumberto-CV.pdf">Download CV · PDF <span aria-hidden="true">↗</span></a>
          <button type="button" className="recruiter-exit" data-sfx="navigate" onClick={onExit}>Full portfolio <span aria-hidden="true">↗</span></button>
          <div className="recruiter-preferences" role="group" aria-label="Display and sound preferences">
            <button type="button" className="recruiter-preference-toggle motion-toggle" data-sfx="toggle"
              onClick={onToggleMotion} aria-pressed={motionEnabled}
              aria-label={motionEnabled ? 'Motion On — pause decorative motion' : 'Motion Off — resume decorative motion'}
              title={motionEnabled ? 'Pause decorative motion' : 'Resume decorative motion'}>
              <span aria-hidden="true">◈</span><span>Motion {motionEnabled ? 'On' : 'Off'}</span>
            </button>
            <button type="button" className="recruiter-preference-toggle sound-toggle" data-sfx="toggle"
              onClick={onToggleSound} aria-pressed={soundEnabled}
              aria-label={soundEnabled ? 'Sound On — turn interface sounds off' : 'Sound Off — turn interface sounds on'}
              title={soundEnabled ? 'Turn interface sounds off' : 'Turn interface sounds on'}>
              <span aria-hidden="true">♪</span><span>Sound {soundEnabled ? 'On' : 'Off'}</span>
            </button>
          </div>
        </div>
      </header>

      <main id="recruiter-main" className="recruiter-main">
        <section id="recruiter-top" className="recruiter-hero" data-reveal aria-labelledby="recruiter-name">
          <div className="recruiter-hero-copy">
            <p className="recruiter-eyebrow">{siteConfig.location} <span/> {siteConfig.availabilityNote}</p>
            <h1 id="recruiter-name" ref={headingRef} tabIndex={-1}>{siteConfig.fullName}<span>.</span></h1>
            <p className="recruiter-role">BSIT STUDENT · ASPIRING IT PROFESSIONAL</p>
            <p className="recruiter-intro">I build and explore practical software, data-oriented applications, and embedded systems. My experience also includes computer support, programming instruction, technical operations, event coordination, and collaborative school activities.</p>
            <div className="recruiter-hero-links">
              <a className="recruiter-primary-link" data-sfx="download" href={siteConfig.resumePdfPath} download="King-Art-D-Pacumberto-CV.pdf">Download public CV (PDF) <span aria-hidden="true">↓</span></a>
              <a data-sfx="open" href={`mailto:${siteConfig.email}`}>Email <span aria-hidden="true">↗</span></a>
              <a data-sfx="open" href={siteConfig.github} target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a>
              {siteConfig.linkedin && <a data-sfx="open" href={siteConfig.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true">↗</span></a>}
            </div>
          </div>
          <aside className="recruiter-snapshot" aria-label="Profile snapshot">
            <picture className="recruiter-portrait">
              <source type="image/webp" srcSet="/profile/king-art-portrait-480.webp 480w, /profile/king-art-portrait-800.webp 800w, /profile/king-art-portrait-1023.webp 1023w" sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1024px) 240px, 320px" />
              <img src="/profile/king-art-portrait-800.jpg" srcSet="/profile/king-art-portrait-480.jpg 480w, /profile/king-art-portrait-800.jpg 800w, /profile/king-art-portrait-1023.jpg 1023w" sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1024px) 240px, 320px" width="800" height="1203" alt="Portrait of King Art D. Pacumberto wearing black academic graduation attire with a navy blue stole and white shirt." loading="eager" decoding="async" fetchPriority="high" />
            </picture>
            <div><small>CURRENT STUDY</small><strong>PUP Quezon City</strong><span>BS Information Technology · BSIT 1-2</span></div>
            <div><small>ACADEMIC YEAR</small><strong>2026–2027</strong><span>Undergraduate student</span></div>
            <div><small>FOCUS AREAS</small><strong>Software · Systems · Embedded</strong><span>With technical support and production experience</span></div>
          </aside>
        </section>

        <section id="recruiter-projects" className="recruiter-section" data-reveal aria-labelledby="recruiter-projects-title">
          <div className="recruiter-section-heading"><div><p className="recruiter-eyebrow">SELECTED WORK / 01</p><h2 id="recruiter-projects-title">Projects that show how I build.</h2></div><p>Three technical projects with repositories and documented scope. Open a case study for more detail.</p></div>
          <div className="recruiter-project-grid">
            {featuredProjects.map((project) => (
              <article className="recruiter-project-card" data-reveal key={project.id} data-project-id={project.id}>
                <div className={`recruiter-project-art recruiter-art-${project.visual}`} aria-hidden="true"><span>{project.number}</span><i/></div>
                <div className="recruiter-project-body">
                  <p className="recruiter-project-type">{project.category} / {project.status}</p>
                  <h3>{project.shortName}</h3>
                  <p>{project.summary}</p>
                  <div className="recruiter-tags">{project.stack.slice(0, 5).map((item) => <span key={item}>{item}</span>)}</div>
                  <div className="recruiter-project-actions">
                    <button type="button" data-sfx="open" onClick={() => onOpenProject(project)}>Read case study <span aria-hidden="true">↗</span></button>
                    {project.repo && <a data-sfx="open" href={project.repo} target="_blank" rel="noopener noreferrer">Repository <span aria-hidden="true">↗</span></a>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="recruiter-skills" className="recruiter-section" data-reveal aria-labelledby="recruiter-skills-title">
          <div className="recruiter-section-heading"><div><p className="recruiter-eyebrow">TOOLS & PRACTICE / 02</p><h2 id="recruiter-skills-title">Skills with context.</h2></div><p>Skills are grouped by practice area and linked to documented work where evidence exists, rather than assigned arbitrary proficiency scores.</p></div>
          <div className="recruiter-skill-grid">
            {skillGroups.map((group, index) => (
              <article className="recruiter-skill-card" data-reveal key={group.name}>
                <span className="recruiter-index">0{index + 1}</span>
                <h3>{group.name}</h3>
                <p>{group.note}</p>
                <div className="recruiter-tags">{group.items.map((skill) => <span key={skill}>{skill}</span>)}</div>
              </article>
            ))}
          </div>
          <p className="recruiter-scope-note">OSINT and cybersecurity items describe foundational, self-directed practice in owned or explicitly authorized lab environments. They are not presented as professional penetration-testing experience or certification.</p>
        </section>

        <section id="recruiter-experience" className="recruiter-section" data-reveal aria-labelledby="recruiter-experience-title">
          <div className="recruiter-section-heading"><div><p className="recruiter-eyebrow">PRACTICAL EXPERIENCE / 03</p><h2 id="recruiter-experience-title">Technical work and transferable experience.</h2></div><p>The most relevant responsibilities appear first; additional work history is listed below.</p></div>
          <div className="recruiter-experience-list recruiter-timeline" data-motion-zone>
            {relevantExperience.map((item) => (
              <article className="recruiter-experience-card" data-reveal key={`${item.title}-${item.period}`}><span className="recruiter-timeline-marker" aria-hidden="true"/>
                <div><span>{item.period}</span><h3>{item.title}</h3><small>{item.organization}</small></div>
                <div><p>{item.description}</p><div className="recruiter-tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
              </article>
            ))}
          </div>
          <details className="recruiter-more-experience">
            <summary data-sfx="toggle">Additional work history <span aria-hidden="true">＋</span></summary>
            <div className="recruiter-experience-list recruiter-experience-secondary">
              {otherExperience.map((item) => <article className="recruiter-experience-card" key={`${item.title}-${item.period}`}><div><span>{item.period}</span><h3>{item.title}</h3><small>{item.organization}</small></div><div><p>{item.description}</p><div className="recruiter-tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div></article>)}
            </div>
          </details>
        </section>

        <section id="recruiter-education" className="recruiter-section recruiter-two-column" data-reveal aria-labelledby="recruiter-education-title">
          <div>
            <p className="recruiter-eyebrow">EDUCATION / 04</p><h2 id="recruiter-education-title">Academic foundation.</h2>
            <article className="recruiter-education-current" data-reveal><span>CURRENT / 2026–2027</span><h3>Polytechnic University of the Philippines</h3><p>Bachelor of Science in Information Technology · Quezon City Campus</p><strong>BSIT 1-2</strong></article>
            {education.map((item) => <article className="recruiter-education-item" data-reveal key={item.school}><span>{item.period}</span><div><h3>{item.school}</h3><p>{item.level}{item.note ? ` · ${item.note}` : ''}</p></div></article>)}
          </div>
          <div>
            <p className="recruiter-eyebrow">RECOGNITION / 05</p><h2>Selected recognition.</h2>
            <div className="recruiter-awards">
              {achievements.map((item) => <article data-reveal key={item.title}><span>{item.mark}</span><div><h3>{item.title}</h3><p>{item.note}</p>{item.href && <a data-sfx="open" href={item.href} target="_blank" rel="noopener noreferrer">Published result ↗</a>}</div></article>)}
            </div>
            <p className="recruiter-scope-note">Published records are linked when available. Other achievements are included from the information supplied for this portfolio; missing event details have not been assumed.</p>
          </div>
        </section>

        <section className="recruiter-section" data-reveal aria-labelledby="recruiter-leadership-title">
          <div className="recruiter-section-heading"><div><p className="recruiter-eyebrow">LEADERSHIP & COLLABORATION / 06</p><h2 id="recruiter-leadership-title">Work beyond the code.</h2></div><p>Student leadership, school technical production, event support, music, sports, and volunteer photography.</p></div>
          <div className="recruiter-leadership-grid">
            {extracurriculars.map((item) => <article data-reveal key={item.title}><small>{item.organization}</small><h3>{item.title}</h3><p>{item.description}</p></article>)}
          </div>
        </section>

        <section id="recruiter-contact" className="recruiter-contact" data-reveal aria-labelledby="recruiter-contact-title">
          <div><p className="recruiter-eyebrow">NEXT STEP / CONTACT</p><h2 id="recruiter-contact-title">Open to opportunities and practical collaboration.</h2><p>For internships, entry-level opportunities, project discussions, or questions about the work above.</p></div>
          <div className="recruiter-contact-actions">
            <a data-sfx="open" href={`mailto:${siteConfig.email}`}>{siteConfig.email} ↗</a>
            <a data-sfx="open" href={siteConfig.github} target="_blank" rel="noopener noreferrer">GitHub ↗</a>
            {siteConfig.linkedin && <a data-sfx="open" href={siteConfig.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>}
            <a className="recruiter-download" data-sfx="download" href={siteConfig.resumePdfPath} download="King-Art-D-Pacumberto-CV.pdf">Download CV · PDF ↓</a>
          </div>
        </section>
      </main>

      <footer className="recruiter-footer"><span>© {new Date().getFullYear()} {siteConfig.fullName}</span><span>RECRUITER VIEW / SOURCE-LED PROFILE</span><button type="button" data-sfx="navigate" onClick={onExit}>Return to full portfolio ↑</button></footer>
    </div>
  )
}
