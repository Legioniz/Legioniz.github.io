#!/usr/bin/env python3
"""Full-site responsive layout integrity test using the real production CSS."""
from __future__ import annotations
from pathlib import Path
import os
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / 'src/styles.css').read_text(encoding='utf-8') + '\n' + (ROOT / 'src/layout-integrity.css').read_text(encoding='utf-8')

HTML = r'''<!doctype html><html lang="en" data-theme="dark" data-motion="on" data-motion-override="on" data-quality="full" data-pointer="fine"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
<div class="site-shell">
<header class="site-header"><a class="brand"><span class="brand-mark"><span class="brand-monogram">KA</span></span><span class="brand-copy"><strong>KING ART</strong><small>DEVELOPER PORTFOLIO</small></span></a>
<nav class="main-nav" aria-label="Main navigation"><a>About</a><a>Projects</a><a>Labs</a><a>Toolkit</a><a>Journey</a><a>Recruiter view</a><a class="nav-contact">Let's talk</a></nav>
<div class="header-tools"><button class="command-trigger"><span>Search</span><kbd>⌘ K</kbd></button><button class="icon-button">S</button><button class="icon-button">M</button><button class="icon-button">T</button><button class="icon-button mobile-menu-button">☰</button></div></header>
<main id="main-content">
<section class="hero-section"><div class="hero-content page-width"><div class="hero-copy"><div class="availability-line"><span class="status-dot"></span><span>QUEZON CITY</span><i></i><span>BSIT STUDENT / SOFTWARE &amp; SYSTEMS</span></div><p class="hero-pretitle">FIELD NOTES / 001</p><h1 class="hero-title"><span class="title-line">From a question</span><span class="title-line">to working</span><span class="title-line">systems.</span></h1><p class="hero-description">Building useful software, exploring data, and turning ideas into working systems through deliberate practice.</p><div class="hero-actions"><a class="button button-primary">Explore projects</a></div></div><div class="hero-visual"><div class="visual-plate"><div class="systems-orbit"><div class="orbit-center"><span class="orbit-monogram">KA</span></div></div></div></div></div></section>
<section class="about-section section-pad page-width"><div class="about-layout"><div class="about-main"><p class="about-lead">A practical learner building a foundation in information technology.</p><p>Long-form profile copy to check intrinsic sizing and prevent cards and columns from pushing into one another when the viewport narrows.</p><p>More detail about technical support, event operations, creative work, and learning.</p></div><div class="about-aside"><article class="aside-card aside-quote"><p>Curiosity becomes useful when it is applied with care.</p></article><div class="aside-metrics"><article class="metric-card"><strong>03</strong><span>PROJECT AREAS</span></article><article class="metric-card"><strong>06</strong><span>TOOLS &amp; METHODS</span></article></div></div></div></section>
<section class="projects-section section-pad"><div class="page-width"><header class="section-heading"><p class="section-kicker">SELECTED WORK</p><h2>Projects and <em>experiments.</em></h2><p>Working systems, prototypes, and focused explorations.</p></header><div class="project-toolbar"><div class="project-count">05 BUILDS</div><div class="project-filters"><button>All</button><button>Software</button><button>Embedded</button></div></div><div class="project-grid">
<article class="project-card"><div class="project-art"></div><div class="project-card-content"><div class="project-meta">01 / SOFTWARE</div><div class="project-title-row"><h3>Smart Electrical Monitoring and Budget Intelligence</h3><button class="round-arrow">↗</button></div><p>Long description for the featured project card. This description must wrap without expanding its grid track or colliding with the action controls.</p><div class="project-stack"><span>Python</span><span>SQL / MySQL</span><span>Data visualization</span></div><a class="project-detail-link">Explore details</a></div></article>
<article class="project-card"><div class="project-art"></div><div class="project-card-content"><div class="project-meta">02 / APPLICATION</div><div class="project-title-row"><h3>LensLab</h3><button class="round-arrow">↗</button></div><p>A local-first photography learning application.</p><div class="project-stack"><span>React</span><span>TypeScript</span></div><a class="project-detail-link">Explore details</a></div></article>
<article class="project-card"><div class="project-art"></div><div class="project-card-content"><div class="project-meta">03 / EMBEDDED</div><div class="project-title-row"><h3>Automated Fan Controller</h3><button class="round-arrow">↗</button></div><p>Temperature-aware fan control with PWM.</p><div class="project-stack"><span>Arduino</span><span>C++</span></div><a class="project-detail-link">Explore details</a></div></article>
<article class="project-card"><div class="project-art"></div><div class="project-card-content"><div class="project-meta">04 / CREATIVE</div><div class="project-title-row"><h3>TOKI SATSUEI</h3><button class="round-arrow">↗</button></div><p>Photography practice and visual storytelling.</p><div class="project-stack"><span>Photography</span><span>Editing</span></div><a class="project-detail-link">Explore details</a></div></article>
<article class="project-card project-toki"><div class="project-art"></div><div class="project-card-content"><div class="project-meta">05 / LEARNING</div><div class="project-title-row"><h3>Python Game Development Capstone</h3></div><p>Three game concepts exploring programming fundamentals.</p><div class="project-stack"><span>Python</span><span>Game logic</span></div></div></article>
</div></div></section>
<section class="skills-section section-pad page-width"><div class="skills-layout"><div class="skills-intro"><p class="section-kicker">TOOLKIT</p><h2>Skills and <em>methods.</em></h2><p>Tools and competencies arranged into readable groups.</p></div><div class="skill-groups"><section class="skill-group"><header class="skill-group-head"><h3>Programming</h3><span>01 / FOUNDATIONS</span></header><div class="skill-pills"><span>Python</span><span>C++</span><span>JavaScript</span><span>HTML / CSS</span><span>SQL</span></div></section><section class="skill-group"><header class="skill-group-head"><h3>Systems</h3><span>02 / PRACTICE</span></header><div class="skill-pills"><span>Computer support</span><span>Networking</span><span>Documentation</span></div></section></div></div></section>
<section class="experience-section section-pad"><div class="page-width"><div class="journey-layout"><div class="journey-column"><p class="section-kicker">JOURNEY</p><h2>Learning through <em>practice.</em></h2><div class="timeline"><article class="timeline-item"><div class="timeline-summary"><span class="timeline-period">2026 — PRESENT</span><strong class="timeline-title">Information Technology Student</strong></div><div class="timeline-content"><p>Coursework, projects, and collaborative learning.</p></div></article><article class="timeline-item"><div class="timeline-summary"><span class="timeline-period">2025 — 2026</span><strong class="timeline-title">Student Teacher / OJT</strong></div><div class="timeline-content"><p>Computer programming and practical research support.</p></div></article></div></div><aside class="journey-side"><article class="education-card"><h3>Education</h3><p>Polytechnic University of the Philippines — Quezon City</p></article><article class="achievement-card"><h3>Achievements</h3><p>PUP Quezon City Hackathon winner.</p></article></aside></div></div></section>
<section class="contact-section section-pad page-width"><div class="contact-frame"><div class="contact-content"><p class="section-kicker">CONTACT</p><h2>Let's build something <em>useful.</em></h2><p>For collaboration, project conversations, and opportunities.</p></div><aside class="contact-aside"><div class="contact-aside-top">AVAILABLE FOR CONVERSATION</div><a class="contact-github">GitHub profile</a></aside></div></section>
</main><footer class="site-footer page-width"><a class="footer-brand">KA</a><div class="footer-copy"><span>DESIGNED &amp; BUILT WITH CURIOSITY.</span><small>© KING ART D. PACUMBERTO. ALL RIGHTS RESERVED.</small></div><nav class="footer-links"><a>GITHUB</a><a>LINKEDIN</a><button>COMMAND MENU</button><button>RECRUITER VIEW</button><button>ADMIN</button></nav></footer>
<aside class="privacy-notice"><div><span>PRIVACY SETTINGS</span><p>This site uses limited local preferences to remember your interface settings.</p></div><div class="privacy-actions"><button>Manage</button><button>Accept</button></div></aside>
<aside class="service-update-notice"><div><strong>New portfolio version available</strong><small>Reload to use the latest interface.</small></div><button>Update</button><button class="service-update-dismiss">×</button></aside>
</div>
<section class="recruiter-view"><header class="recruiter-topbar"><a class="recruiter-brand"><strong>KA</strong><small>RECRUITER PROFILE</small></a><nav class="recruiter-jumps"><a>Projects</a><a>Skills</a><a>Experience</a><a>Education</a><a>Leadership</a><a>Contact</a></nav><div class="recruiter-actions"><button>Motion</button><button>Sound</button></div></header>
<main class="recruiter-main"><section class="recruiter-hero"><div class="recruiter-hero-copy"><p class="recruiter-role">ASPIRING IT PROFESSIONAL</p><h1>King Art D. Pacumberto</h1><p class="recruiter-intro">Information Technology student focused on software, systems, and practical problem-solving.</p><div class="recruiter-hero-links"><a>GitHub</a><a>LinkedIn</a></div></div><aside class="recruiter-snapshot"><div class="recruiter-snapshot-mark"><span class="recruiter-snapshot-lockup">KA</span></div><strong>BSIT Student</strong><span>Polytechnic University of the Philippines</span></aside></section>
<section class="recruiter-section"><header class="recruiter-section-heading"><div><h2>Selected projects</h2></div><p>Software, embedded systems, and creative experiments.</p></header><div class="recruiter-project-grid"><article class="recruiter-project-card"><div class="recruiter-project-art"></div><div class="recruiter-project-body"><p class="recruiter-project-type">SOFTWARE</p><h3>Smart Electrical Monitoring</h3><p>Energy analytics and budgeting.</p><div class="recruiter-tags"><span>Python</span><span>SQL</span></div></div></article><article class="recruiter-project-card"><div class="recruiter-project-art"></div><div class="recruiter-project-body"><p class="recruiter-project-type">APPLICATION</p><h3>LensLab</h3><p>Photography practice.</p></div></article><article class="recruiter-project-card"><div class="recruiter-project-art"></div><div class="recruiter-project-body"><p class="recruiter-project-type">EMBEDDED</p><h3>Automated Fan Controller</h3><p>Temperature-based control.</p></div></article></div></section>
<section class="recruiter-section"><div class="recruiter-skill-grid"><article class="recruiter-skill-card"><h3>Programming</h3><p>Core language practice.</p><div class="recruiter-tags"><span>Python</span><span>C++</span><span>SQL</span></div></article><article class="recruiter-skill-card"><h3>Systems</h3><p>Practical support.</p><div class="recruiter-tags"><span>Troubleshooting</span><span>Networking</span></div></article></div></section>
<section class="recruiter-section"><div class="recruiter-experience-list"><article class="recruiter-experience-card"><div><span>2026 — PRESENT</span><h3>IT Student</h3></div><div><p>Coursework and project development.</p></div></article></div></section>
<section class="recruiter-contact"><div><h2>Let's connect</h2><p>Open to conversations about projects and opportunities.</p></div><nav class="recruiter-contact-actions"><a>GitHub <span>↗</span></a><a>LinkedIn <span>↗</span></a></nav></section></main><footer class="recruiter-footer"><span>© KING ART D. PACUMBERTO</span><button>Return to full portfolio</button></footer></section>
</body></html>'''

WIDTHS = [320, 360, 390, 430, 520, 600, 700, 760, 820, 900, 960, 1024, 1100, 1101, 1200, 1280, 1440, 1600, 1920]


def main() -> None:
    results: list[tuple[bool, str]] = []
    def check(condition: bool, label: str) -> None:
        results.append((bool(condition), label))
        print(f"{'PASS' if condition else 'FAIL'} {label}")
    errors: list[str] = []
    with sync_playwright() as p:
        launch = {'headless': True, 'args': ['--no-sandbox', '--disable-dev-shm-usage']}
        chromium_path = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('chromium-browser')
        if chromium_path:
            launch['executable_path'] = chromium_path
        browser = p.chromium.launch(**launch)
        page = browser.new_page(viewport={'width': 1440, 'height': 900}, reduced_motion='no-preference')
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.set_content(HTML.replace('</head>', f'<style>{CSS}</style></head>'), wait_until='domcontentloaded')

        # Full breakpoint sweep: document width, menu geometry, cards, and layout tracks.
        for width in WIDTHS:
            page.set_viewport_size({'width': width, 'height': 860 if width > 760 else 780})
            page.wait_for_timeout(25)
            metrics = page.evaluate('''() => {
              const rect = (selector) => { const e=document.querySelector(selector); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}; };
              const overlaps = (a,b) => Boolean(a && b && a.width>0 && b.width>0 && a.height>0 && b.height>0 && a.x < b.right - 1 && a.right > b.x + 1 && a.y < b.bottom - 1 && a.bottom > b.y + 1);
              const boxes = (selector) => [...document.querySelectorAll(selector)].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};});
              const noPairOverlap = (items) => items.every((a,i)=>items.slice(i+1).every(b=>!overlaps(a,b)));
              const nav=document.querySelector('.main-nav'), header=document.querySelector('.site-header');
              const headerTools=rect('.header-tools'), navRect=rect('.main-nav'), headerRect=rect('.site-header');
              const mobile=innerWidth<=1100;
              const navDisplay=getComputedStyle(nav).display;
              const navFit=mobile ? (navDisplay==='none' || (navRect.x >= -1 && navRect.right <= innerWidth+1 && navRect.y >= headerRect.bottom-1)) : !overlaps(navRect,headerTools);
              const grids=['.hero-content','.about-layout','.skills-layout','.journey-layout','.contact-frame','.recruiter-hero','.recruiter-contact'];
              const gridChecks=grids.map(s=>{const e=document.querySelector(s);if(!e)return true;const cs=getComputedStyle(e);if(!cs.display.includes('grid'))return true;return noPairOverlap([...e.children].map(x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};}));});
              const cards=[...boxes('.project-card'),...boxes('.recruiter-project-card')];
              const textSelectors=['.hero-title','.hero-description','.contact-content h2','.recruiter-hero h1','.recruiter-intro'];
              const textFits=textSelectors.every(s=>{const e=document.querySelector(s);return !e || e.scrollWidth<=e.clientWidth+2;});
              return {
                viewport:innerWidth,docWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
                navFit,headerWidth:headerRect.width,headerToolsWidth:headerTools.width,
                gridNoOverlap:gridChecks.every(Boolean),cardsNoOverlap:noPairOverlap(cards),textFits,
                about:rect('.about-layout'),projectGrid:rect('.project-grid'),contact:rect('.contact-frame'),recruiter:rect('.recruiter-hero'),
                privacy:rect('.privacy-notice'),service:rect('.service-update-notice')
              };
            }''')
            check(metrics['docWidth'] <= width + 1 and metrics['bodyWidth'] <= width + 1, f'{width}px: no document/body horizontal overflow')
            check(metrics['navFit'], f'{width}px: header navigation fits without colliding with utility controls')
            check(metrics['gridNoOverlap'], f'{width}px: primary layout grids keep independent columns apart')
            check(metrics['cardsNoOverlap'], f'{width}px: project cards do not overlap one another')
            check(metrics['textFits'], f'{width}px: hero, contact, and recruiter headings remain inside their text boxes')
            # Utility notices must occupy different regions; desktop uses opposite corners,
            # compact layouts move the update notice under the header.
            pbox, sbox = metrics['privacy'], metrics['service']
            no_notice_collision = not (pbox and sbox and pbox['x'] < sbox['right']-1 and pbox['right'] > sbox['x']+1 and pbox['y'] < sbox['bottom']-1 and pbox['bottom'] > sbox['y']+1)
            check(no_notice_collision, f'{width}px: fixed privacy and update notices never overlap')

            if width <= 1100:
                # Explicitly open the menu to validate the dropdown's position and bounds.
                page.locator('.main-nav').evaluate("e=>e.classList.add('nav-open')")
                menu = page.locator('.main-nav').bounding_box()
                header = page.locator('.site-header').bounding_box()
                check(bool(menu and header and menu['x'] >= -1 and menu['x']+menu['width'] <= width+1 and menu['y'] >= header['y']+header['height']-1), f'{width}px: expanded mobile menu stays within the viewport and below the masthead')
                page.locator('.main-nav').evaluate("e=>e.classList.remove('nav-open')")

        # Component-specific geometry checks at a common desktop width.
        page.set_viewport_size({'width': 1440, 'height': 900})
        check(page.locator('.site-header').evaluate("e=>getComputedStyle(e).height") == '68px', 'Desktop masthead uses the shared header-height token')
        check(page.locator('.section-pad').first.evaluate("e=>getComputedStyle(e).paddingTop") != '132px', 'Section spacing no longer inherits the oversized legacy fixed padding')
        check(page.locator('.recruiter-snapshot-mark').evaluate("e=>e.innerText.trim()") == 'KA', 'Recruiter monogram remains a single KA lockup without punctuation')
        check(page.locator('.recruiter-main').evaluate("e=>getComputedStyle(e).width") != '1140px', 'Recruiter content width follows the same responsive container token as the full portfolio')
        check(not errors, 'No browser runtime errors across the full responsive layout sweep')
        browser.close()
    failures = [label for ok,label in results if not ok]
    print(f"\n{len(results)-len(failures)}/{len(results)} layout-integrity browser checks passed.")
    if failures:
        print('Failures:')
        for item in failures: print(f' - {item}')
        raise SystemExit(1)

if __name__ == '__main__':
    main()