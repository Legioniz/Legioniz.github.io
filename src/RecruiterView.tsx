import { useEffect, useRef } from 'react'
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

  useEffect(() => {
    const root = recruiterRootRef.current
    if (!root) return
    const targets = Array.from(root.querySelectorAll<HTMLElement>(
      '.recruiter-hero, .recruiter-section, .recruiter-contact, .recruiter-project-card, .recruiter-skill-card, .recruiter-experience-card, .recruiter-education-item, .recruiter-awards article, .recruiter-leadership-grid article',
    ))
    const projectArtwork = Array.from(root.querySelectorAll<HTMLElement>('.recruiter-project-art'))

    if (!motionEnabled || !('IntersectionObserver' in window)) {
      targets.forEach((element) => element.classList.add('is-in-view'))
      if (motionEnabled) {
        root.querySelectorAll<HTMLElement>('.recruiter-timeline').forEach((element) => element.classList.add('motion-active'))
        projectArtwork.forEach((element) => element.classList.add('motion-active'))
      } else {
        root.querySelectorAll<HTMLElement>('.motion-active').forEach((element) => element.classList.remove('motion-active'))
      }
      return
    }

    // Rebuild reveal state when the visitor resumes motion, but expose the
    // current viewport before the reveal gate is enabled to prevent hidden copy.
    targets.forEach((element) => element.classList.remove('is-in-view'))
    targets.filter((element) => {
      const rect = element.getBoundingClientRect()
      return rect.top < window.innerHeight && rect.bottom > 0
    }).forEach((element) => element.classList.add('is-in-view'))

    root.dataset.recruiterMotionReady = 'true'
    let fallbackTimer = 0
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const target = entry.target as HTMLElement
        if (entry.isIntersecting) {
          target.classList.add('is-in-view')
          observer.unobserve(target)
        }
      })
    }, { rootMargin: '0px 0px -7% 0px', threshold: 0.06 })
    targets.forEach((element) => observer.observe(element))

    const recruiterTimeline = root.querySelector<HTMLElement>('.recruiter-timeline')
    const timelineObserver = recruiterTimeline
      ? new IntersectionObserver((entries) => {
          entries.forEach((entry) => entry.target.classList.toggle('motion-active', entry.isIntersecting))
        }, { rootMargin: '80px 0px', threshold: 0 })
      : null
    if (recruiterTimeline) timelineObserver?.observe(recruiterTimeline)

    // Project artwork loops are viewport-scoped; entrance reveals remain visible.
    const artworkObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('motion-active', entry.isIntersecting))
    }, { rootMargin: '80px 0px', threshold: 0 })
    projectArtwork.forEach((element) => artworkObserver.observe(element))

    fallbackTimer = window.setTimeout(() => targets.forEach((element) => element.classList.add('is-in-view')), 1800)

    return () => {
      if (fallbackTimer) window.clearTimeout(fallbackTimer)
      observer.disconnect()
      timelineObserver?.disconnect()
      artworkObserver.disconnect()
      delete root.dataset.recruiterMotionReady
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

  return (
    <div className="recruiter-view" id="recruiter-view" ref={recruiterRootRef}>
      <a className="skip-link recruiter-skip" href="#recruiter-main">Skip to recruiter profile</a>
      <header className="recruiter-topbar">
        <a className="recruiter-brand" href="#recruiter-top" aria-label={`KA. RECRUITER BRIEF / 01 — ${siteConfig.fullName} recruiter profile home`}>
          <span>KA<span>.</span></span>
          <small>RECRUITER BRIEF / 01</small>
        </a>
        <nav className="recruiter-jumps" aria-label="Recruiter profile sections">
          <a href="#recruiter-projects" data-sfx="navigate">Projects</a>
          <a href="#recruiter-skills" data-sfx="navigate">Skills</a>
          <a href="#recruiter-experience" data-sfx="navigate">Experience</a>
          <a href="#recruiter-education" data-sfx="navigate">Education</a>
          <a href="#recruiter-contact" data-sfx="navigate">Contact</a>
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
        <section id="recruiter-top" className="recruiter-hero" aria-labelledby="recruiter-name">
          <div className="recruiter-hero-copy">
            <p className="recruiter-eyebrow">{siteConfig.location} <span/> {siteConfig.availabilityNote}</p>
            <h1 id="recruiter-name" ref={headingRef} tabIndex={-1}>{siteConfig.fullName}<span>.</span></h1>
            <p className="recruiter-role">BSIT STUDENT · ASPIRING IT PROFESSIONAL</p>
            <p className="recruiter-intro">I build and explore practical software, data-oriented applications, and embedded systems. My experience also includes computer support, programming instruction, technical operations, event coordination, and collaborative school activities.</p>
            <div className="recruiter-hero-links">
              <a className="recruiter-primary-link" href={siteConfig.resumePdfPath} download="King-Art-D-Pacumberto-CV.pdf">Download public CV (PDF) <span aria-hidden="true">↓</span></a>
              <a href={`mailto:${siteConfig.email}`}>Email <span aria-hidden="true">↗</span></a>
              <a href={siteConfig.github} target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a>
              {siteConfig.linkedin && <a href={siteConfig.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true">↗</span></a>}
            </div>
          </div>
          <aside className="recruiter-snapshot" aria-label="Profile snapshot">
            <picture className="recruiter-portrait">
              <source type="image/webp" srcSet="/profile/king-art-portrait-480.webp 480w, /profile/king-art-portrait-800.webp 800w, /profile/king-art-portrait-1023.webp 1023w" sizes="(max-width: 760px) 120px, 180px" />
              <img src="/profile/king-art-portrait-800.jpg" srcSet="/profile/king-art-portrait-480.jpg 480w, /profile/king-art-portrait-800.jpg 800w, /profile/king-art-portrait-1023.jpg 1023w" sizes="(max-width: 760px) 120px, 180px" width="800" height="1203" alt="Portrait of King Art D. Pacumberto wearing black academic graduation attire with a navy blue stole and white shirt." loading="eager" decoding="async" fetchPriority="high" />
            </picture>
            <div className="recruiter-snapshot-mark">KA<span>.</span></div>
            <div><small>CURRENT STUDY</small><strong>PUP Quezon City</strong><span>BS Information Technology · BSIT 1-2</span></div>
            <div><small>ACADEMIC YEAR</small><strong>2026–2027</strong><span>Undergraduate student</span></div>
            <div><small>FOCUS AREAS</small><strong>Software · Systems · Embedded</strong><span>With technical support and production experience</span></div>
          </aside>
        </section>

        <section id="recruiter-projects" className="recruiter-section" aria-labelledby="recruiter-projects-title">
          <div className="recruiter-section-heading"><div><p className="recruiter-eyebrow">SELECTED WORK / 01</p><h2 id="recruiter-projects-title">Projects that show how I build.</h2></div><p>Three technical projects with repositories and documented scope. Open a case study for more detail.</p></div>
          <div className="recruiter-project-grid">
            {featuredProjects.map((project) => (
              <article className="recruiter-project-card" key={project.id} data-project-id={project.id}>
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

        <section id="recruiter-skills" className="recruiter-section" aria-labelledby="recruiter-skills-title">
          <div className="recruiter-section-heading"><div><p className="recruiter-eyebrow">TOOLS & PRACTICE / 02</p><h2 id="recruiter-skills-title">Skills with context.</h2></div><p>Skills are grouped by practice area and linked to documented work where evidence exists, rather than assigned arbitrary proficiency scores.</p></div>
          <div className="recruiter-skill-grid">
            {skillGroups.map((group, index) => (
              <article className="recruiter-skill-card" key={group.name}>
                <span className="recruiter-index">0{index + 1}</span>
                <h3>{group.name}</h3>
                <p>{group.note}</p>
                <div className="recruiter-tags">{group.items.map((skill) => <span key={skill}>{skill}</span>)}</div>
              </article>
            ))}
          </div>
          <p className="recruiter-scope-note">OSINT and cybersecurity items describe foundational, self-directed practice in owned or explicitly authorized lab environments. They are not presented as professional penetration-testing experience or certification.</p>
        </section>

        <section id="recruiter-experience" className="recruiter-section" aria-labelledby="recruiter-experience-title">
          <div className="recruiter-section-heading"><div><p className="recruiter-eyebrow">PRACTICAL EXPERIENCE / 03</p><h2 id="recruiter-experience-title">Technical work and transferable experience.</h2></div><p>The most relevant responsibilities appear first; additional work history is listed below.</p></div>
          <div className="recruiter-experience-list recruiter-timeline" data-motion-zone>
            {relevantExperience.map((item) => (
              <article className="recruiter-experience-card" key={`${item.title}-${item.period}`}><span className="recruiter-timeline-marker" aria-hidden="true"/>
                <div><span>{item.period}</span><h3>{item.title}</h3><small>{item.organization}</small></div>
                <div><p>{item.description}</p><div className="recruiter-tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
              </article>
            ))}
          </div>
          <details className="recruiter-more-experience">
            <summary>Additional work history <span aria-hidden="true">＋</span></summary>
            <div className="recruiter-experience-list recruiter-experience-secondary">
              {otherExperience.map((item) => <article className="recruiter-experience-card" key={`${item.title}-${item.period}`}><div><span>{item.period}</span><h3>{item.title}</h3><small>{item.organization}</small></div><div><p>{item.description}</p><div className="recruiter-tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div></article>)}
            </div>
          </details>
        </section>

        <section id="recruiter-education" className="recruiter-section recruiter-two-column" aria-labelledby="recruiter-education-title">
          <div>
            <p className="recruiter-eyebrow">EDUCATION / 04</p><h2 id="recruiter-education-title">Academic foundation.</h2>
            <article className="recruiter-education-current"><span>CURRENT / 2026–2027</span><h3>Polytechnic University of the Philippines</h3><p>Bachelor of Science in Information Technology · Quezon City Campus</p><strong>BSIT 1-2</strong></article>
            {education.map((item) => <article className="recruiter-education-item" key={item.school}><span>{item.period}</span><div><h3>{item.school}</h3><p>{item.level}{item.note ? ` · ${item.note}` : ''}</p></div></article>)}
          </div>
          <div>
            <p className="recruiter-eyebrow">RECOGNITION / 05</p><h2>Selected recognition.</h2>
            <div className="recruiter-awards">
              {achievements.map((item) => <article key={item.title}><span>{item.mark}</span><div><h3>{item.title}</h3><p>{item.note}</p>{item.href && <a href={item.href} target="_blank" rel="noopener noreferrer">Published result ↗</a>}</div></article>)}
            </div>
            <p className="recruiter-scope-note">Published records are linked when available. Other achievements are included from the information supplied for this portfolio; missing event details have not been assumed.</p>
          </div>
        </section>

        <section className="recruiter-section" aria-labelledby="recruiter-leadership-title">
          <div className="recruiter-section-heading"><div><p className="recruiter-eyebrow">LEADERSHIP & COLLABORATION / 06</p><h2 id="recruiter-leadership-title">Work beyond the code.</h2></div><p>Student leadership, school technical production, event support, music, sports, and volunteer photography.</p></div>
          <div className="recruiter-leadership-grid">
            {extracurriculars.map((item) => <article key={item.title}><small>{item.organization}</small><h3>{item.title}</h3><p>{item.description}</p></article>)}
          </div>
        </section>

        <section id="recruiter-contact" className="recruiter-contact" aria-labelledby="recruiter-contact-title">
          <div><p className="recruiter-eyebrow">NEXT STEP / CONTACT</p><h2 id="recruiter-contact-title">Open to opportunities and practical collaboration.</h2><p>For internships, entry-level opportunities, project discussions, or questions about the work above.</p></div>
          <div className="recruiter-contact-actions">
            <a href={`mailto:${siteConfig.email}`}>{siteConfig.email} ↗</a>
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
