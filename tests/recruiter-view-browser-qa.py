#!/usr/bin/env python3
"""Real-browser checks for recruiter mode, routing, mobile fit, and accessibility basics."""
from __future__ import annotations
import os
import shutil
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:4174/'


def wait_for_server(process: subprocess.Popen) -> None:
    deadline = time.time() + 35
    last_error = None
    while time.time() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f'Vite preview exited early with status {process.returncode}')
        try:
            with urllib.request.urlopen(BASE, timeout=2) as response:
                if response.status == 200:
                    return
        except (urllib.error.URLError, TimeoutError) as error:
            last_error = error
        time.sleep(.25)
    raise RuntimeError(f'Vite preview did not become available: {last_error}')


def main() -> None:
    npm = shutil.which('npm') or 'npm'
    server = subprocess.Popen(
        [npm, 'run', 'preview', '--', '--host', '127.0.0.1', '--port', '4174', '--strictPort'],
        cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT,
    )
    results: list[tuple[bool, str]] = []
    errors: list[str] = []

    def check(condition: bool, label: str) -> None:
        results.append((bool(condition), label))
        print(f"{'PASS' if condition else 'FAIL'} {label}")

    try:
        wait_for_server(server)
        with sync_playwright() as p:
            launch = {'headless': True, 'args': ['--no-sandbox', '--disable-dev-shm-usage']}
            if os.environ.get('CHROMIUM_PATH'):
                launch['executable_path'] = os.environ['CHROMIUM_PATH']
            browser = p.chromium.launch(**launch)
            page = browser.new_page(viewport={'width': 1440, 'height': 1000})
            page.add_init_script("""
              (() => {
                let notes = 0;
                class PortfolioTestAudioContext {
                  constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
                  resume() { this.state = 'running'; return Promise.resolve(); }
                  createOscillator() {
                    return {
                      type: 'sine',
                      frequency: { setValueAtTime() {} },
                      connect() {},
                      start() { notes += 1; },
                      stop() {},
                      disconnect() {},
                      onended: null
                    };
                  }
                  createGain() {
                    return {
                      gain: {
                        setValueAtTime() {},
                        exponentialRampToValueAtTime() {}
                      },
                      connect() {},
                      disconnect() {}
                    };
                  }
                }
                Object.defineProperty(window, 'AudioContext', {
                  configurable: true,
                  value: PortfolioTestAudioContext
                });
                Object.defineProperty(window, '__portfolioAudioNotes', {
                  configurable: false,
                  get: () => notes
                });
              })();
            """)
            page.on('pageerror', lambda error: errors.append(str(error)))
            response = page.goto(BASE + '?view=recruiter', wait_until='domcontentloaded', timeout=30000)
            page.get_by_role('heading', name='King Art D. Pacumberto.', level=1).wait_for(timeout=15000)
            check(response is not None and response.status == 200, 'Recruiter view loads directly from a shareable query URL')
            check('Recruiter Profile' in page.title(), 'Recruiter view receives a focused browser title')
            check(page.get_by_role('navigation', name='Recruiter profile sections').count() == 1, 'Recruiter navigation has an accessible name')
            check(page.get_by_role('link', name='KA RECRUITER BRIEF / 01', exact=True).count() == 1,
                  'Recruiter brand accessible name is derived from its visible KA and brief text')
            recruiter_brand = page.locator('.recruiter-brand-lockup')
            snapshot_mark = page.locator('.recruiter-snapshot-mark')
            snapshot_lockup = page.locator('.recruiter-snapshot-lockup')
            check(recruiter_brand.inner_text().strip() == 'KA' and snapshot_mark.inner_text().strip() == 'KA',
                  'Both recruiter KA marks render without punctuation or an orphaned period')
            monogram_geometry = snapshot_lockup.evaluate("""el => ({
              whiteSpace: getComputedStyle(el).whiteSpace,
              width: el.getBoundingClientRect().width,
              height: el.getBoundingClientRect().height,
              parentWidth: el.parentElement.getBoundingClientRect().width,
              fits: el.scrollWidth <= el.clientWidth + 1
            })""")
            check(monogram_geometry['whiteSpace'] == 'nowrap' and monogram_geometry['fits']
                  and monogram_geometry['width'] <= monogram_geometry['parentWidth'] + 1,
                  f'Snapshot KA stays on one line and inside its 64px mark ({monogram_geometry})')
            preferences = page.get_by_role('group', name='Display and sound preferences')
            check(preferences.count() == 1, 'Recruiter view exposes one named preference group')
            page.wait_for_function("document.querySelector('.recruiter-view')?.dataset.recruiterMotionReady === 'true'")
            page.wait_for_function("document.querySelector('.recruiter-hero')?.classList.contains('is-in-view')")
            check(page.locator('.recruiter-section[data-reveal]').count() >= 5
                  and page.locator('.recruiter-project-card[data-reveal]').count() == 3,
                  'Shared reveal controller is connected to recruiter sections and project evidence')
            check(page.locator('.recruiter-scroll-progress > span').count() == 1,
                  'Recruiter view mounts its dedicated scroll-progress indicator')
            mark_animation = snapshot_mark.evaluate('(el) => getComputedStyle(el).animationName')
            check(mark_animation == 'recruiter-mark-breathe',
                  'The corrected KA monogram receives the motion-enabled accent animation')
            motion_toggle = preferences.get_by_role('button', name='Motion On — pause decorative motion')
            sound_toggle = preferences.get_by_role('button', name='Sound On — turn interface sounds off')
            check(motion_toggle.get_attribute('aria-pressed') == 'true',
                  'Recruiter view exposes the shared default-on motion control')
            check(sound_toggle.get_attribute('aria-pressed') == 'true' and sound_toggle.get_attribute('data-sfx') == 'toggle',
                  'Recruiter view exposes a sound control wired to the delegated interaction manager')

            motion_toggle.click()
            page.wait_for_function("document.documentElement.dataset.motion === 'off'")
            check(preferences.get_by_role('button', name='Motion Off — resume decorative motion').get_attribute('aria-pressed') == 'false',
                  'Recruiter motion control pauses decorative motion and updates its pressed state')
            check(page.evaluate("localStorage.getItem('legion-portfolio-motion-v7')") == 'off',
                  'Recruiter motion preference persists using the shared site setting')
            preferences.get_by_role('button', name='Resume decorative motion').click()
            page.wait_for_function("document.documentElement.dataset.motion === 'on'")
            check(preferences.get_by_role('button', name='Pause decorative motion').get_attribute('aria-pressed') == 'true',
                  'Recruiter motion control resumes the reveal and artwork system')
            page.evaluate("window.scrollTo({top:document.documentElement.scrollHeight / 2,behavior:'instant'})")
            page.wait_for_timeout(90)
            scroll_progress = page.locator('.recruiter-view').evaluate(
                "(el) => Number.parseFloat(getComputedStyle(el).getPropertyValue('--recruiter-scroll-progress'))")
            check(scroll_progress > 0 and scroll_progress < 1,
                  f'Recruiter scroll progress tracks the current document position ({scroll_progress:.3f})')
            page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
            page.wait_for_timeout(80)

            sound_toggle.click()
            check(preferences.get_by_role('button', name='Sound Off — turn interface sounds on').get_attribute('aria-pressed') == 'false',
                  'Recruiter sound control mutes the delegated interface sound system')
            check(page.evaluate("localStorage.getItem('legion-portfolio-sound-v2')") == 'off',
                  'Recruiter sound preference persists using the shared site setting')
            preferences.get_by_role('button', name='Turn interface sounds on').click()
            check(preferences.get_by_role('button', name='Turn interface sounds off').get_attribute('aria-pressed') == 'true',
                  'Recruiter sound control restores interface feedback')
            notes_before_disclosure = page.evaluate('window.__portfolioAudioNotes')
            page.locator('.recruiter-more-experience > summary').click()
            page.wait_for_timeout(80)
            notes_after_disclosure = page.evaluate('window.__portfolioAudioNotes')
            check(notes_after_disclosure > notes_before_disclosure,
                  f'Recruiter disclosure triggers real synthesized interface audio ({notes_before_disclosure} → {notes_after_disclosure} oscillator notes)')

            page.get_by_role('link', name='Experience').click()
            page.wait_for_function("document.querySelector('.recruiter-jumps a[href=\"#recruiter-experience\"]')?.getAttribute('aria-current') === 'location'")
            check(page.locator('.recruiter-jumps a[aria-current="location"]').get_attribute('href') == '#recruiter-experience',
                  'Recruiter section navigation tracks the current section')
            page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
            page.wait_for_timeout(120)
            check(page.get_by_role('heading', name='Projects that show how I build.').is_visible(), 'Selected project case studies are visible')
            check(page.locator('.recruiter-project-card').count() == 3, 'Exactly three featured technical projects are presented')
            check(page.locator('.recruiter-project-card a[href^="https://github.com/"]').count() >= 3, 'Each featured technical project has a repository link')
            check(page.get_by_role('link', name='Download CV · PDF').count() == 2, 'Public-safe PDF CV is accessible in profile header and contact area')
            check(page.locator('a[href*="Resume.pdf"]').count() == 0, 'Recruiter profile does not expose the original phone-bearing resume')
            check(page.locator('.recruiter-portrait img').evaluate('(img) => img.complete && img.naturalWidth > 0'), 'Recruiter profile portrait loads successfully from the optimized responsive asset set')

            access = page.evaluate("""() => {
              const named = (element) => Boolean((element.getAttribute('aria-label') || element.getAttribute('title') || element.innerText || '').trim());
              const unnamedButtons = [...document.querySelectorAll('button')].filter((el) => !named(el));
              const unnamedLinks = [...document.querySelectorAll('a')].filter((el) => !named(el));
              const missingImageAlt = [...document.querySelectorAll('img')].filter((el) => !el.hasAttribute('alt'));
              const badExternal = [...document.querySelectorAll('a[target="_blank"]')].filter((el) => !el.rel.includes('noopener'));
              const landmarks = {main: document.querySelectorAll('main').length, nav: document.querySelectorAll('nav[aria-label]').length};
              return {unnamedButtons: unnamedButtons.length, unnamedLinks: unnamedLinks.length, missingImageAlt: missingImageAlt.length, badExternal: badExternal.length, landmarks};
            }""")
            check(access['unnamedButtons'] == 0, f"Recruiter controls have accessible names ({access['unnamedButtons']} unnamed)")
            check(access['unnamedLinks'] == 0, f"Recruiter links have accessible names ({access['unnamedLinks']} unnamed)")
            check(access['missingImageAlt'] == 0, 'Recruiter view contains no images without alt attributes')
            check(access['badExternal'] == 0, 'All new-tab external links use opener isolation')
            check(access['landmarks']['main'] == 1 and access['landmarks']['nav'] >= 1, 'Recruiter page has a single main landmark and named navigation')

            first_art = page.locator('.recruiter-project-art').first
            first_art.scroll_into_view_if_needed()
            first_card = page.locator('.recruiter-project-card').first
            fine_pointer = page.evaluate("window.matchMedia('(hover: hover) and (pointer: fine)').matches")
            if fine_pointer:
                first_card.hover(position={'x': 24, 'y': 28})
                page.wait_for_timeout(40)
                spotlight = first_card.get_attribute('data-spotlight')
                spotlight_opacity = first_card.evaluate("(el) => getComputedStyle(el, '::before').opacity")
                check(spotlight == 'active' and float(spotlight_opacity) > 0,
                      'Fine-pointer movement activates the project-card spotlight without a separate stale script')
            else:
                check(first_card.get_attribute('data-spotlight') is None,
                      'Project-card spotlight remains disabled when the browser reports no fine-pointer hover input')
            page.wait_for_function("document.querySelector('.recruiter-project-art')?.classList.contains('motion-active')")
            art_animation = first_art.locator('i').evaluate("(el) => getComputedStyle(el, '::before').animationName")
            check(art_animation == 'recruiter-project-ring',
                  'Visible recruiter project artwork receives a viewport-scoped orbital animation')
            check(page.locator('.recruiter-project-card.is-in-view').count() >= 1,
                  'Project cards enter through the recruiter scroll-reveal sequence')
            page.evaluate("window.scrollTo({top:document.body.scrollHeight,behavior:'instant'})")
            page.wait_for_function("!document.querySelector('.recruiter-project-art')?.classList.contains('motion-active')")
            check(not first_art.evaluate("el => el.classList.contains('motion-active')"),
                  'Project artwork animation pauses after leaving the viewport')
            page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
            page.wait_for_timeout(120)

            page.get_by_role('button', name='Read case study').first.click()
            page.get_by_role('dialog').wait_for(timeout=5000)
            check('project=' in page.url and 'view=recruiter' not in page.url, 'Case study action switches into the full project dialog with a shareable URL')
            page.get_by_role('button', name='Back to portfolio').click()
            page.get_by_role('link', name='Recruiter view').click()
            page.get_by_role('heading', name='King Art D. Pacumberto.', level=1).wait_for(timeout=8000)
            page.get_by_role('button', name='Full portfolio', exact=True).click()
            page.get_by_role('heading', name='From a question').wait_for(timeout=10000)
            page.locator('#main-content').wait_for(state='visible', timeout=10000)
            page.locator('.site-header').wait_for(state='visible', timeout=10000)
            check('view=recruiter' not in page.url, 'Full-portfolio control exits recruiter view and clears its URL mode')
            check(page.evaluate('window.scrollY <= 2'), 'Explicit view switching starts the newly mounted layout at the top of the document')
            check(page.locator('#main-content').is_visible() and page.locator('#projects').is_visible(), 'Returning to full portfolio remounts the main content and project sections without a refresh')
            check(page.locator('#lab').count() == 1 and page.locator('#skills-map').count() == 1 and page.locator('#network-lab').count() == 1, 'All major interactive lab sections return after recruiter-to-full switching')
            lifecycle = page.evaluate("""() => ({
              revealReady: document.documentElement.dataset.revealReady === 'true',
              motionOff: document.documentElement.dataset.motion === 'off',
              revealTargets: document.querySelectorAll('#main-content [data-reveal]').length,
              headerConnected: Boolean(document.querySelector('.site-header')?.isConnected),
              mastheadProgress: Boolean(document.querySelector('.scroll-progress'))
            })""")
            check(lifecycle['revealReady'] or lifecycle['motionOff'], 'Full-view reveal runtime is reinitialized or deliberately disabled by reduced motion')
            check(lifecycle['revealTargets'] >= 20 and lifecycle['headerConnected'] and lifecycle['mastheadProgress'], 'Full-view reveal, header, and progress targets are connected to the newly mounted DOM')
            page.evaluate("""() => {
              const threshold = Math.max(560, window.innerHeight * .72);
              const labTop = document.querySelector('#lab')?.getBoundingClientRect().top + window.scrollY || 0;
              window.scrollTo({ top: Math.max(labTop + 1200, threshold + 600), behavior: 'instant' });
            }""")
            page.wait_for_function("document.querySelectorAll('.quick-navigator').length === 1", timeout=4000)
            navigator_state = page.evaluate("""() => ({
              scrollY: window.scrollY,
              threshold: Math.max(560, window.innerHeight * .72),
              navigatorCount: document.querySelectorAll('.quick-navigator').length,
              appScrollHeight: document.documentElement.scrollHeight,
              activeSection: document.querySelector('.main-nav a.active')?.getAttribute('href') || null
            })""")
            check(navigator_state['scrollY'] > navigator_state['threshold'] and navigator_state['navigatorCount'] == 1,
                  f"Quick navigator remounts and responds to scrolling after returning to full view ({navigator_state})")
            header_hidden = page.locator('.site-header').evaluate("el => el.classList.contains('header-hidden')")
            check(header_hidden, 'Rebound masthead controller hides the header on downward scroll')
            page.evaluate("window.scrollTo({ top: 0, behavior: 'instant' })")
            page.wait_for_timeout(120)
            header_visible = not page.locator('.site-header').evaluate("el => el.classList.contains('header-hidden')")
            check(header_visible, 'Rebound masthead controller reveals the header on upward scroll')
            page.go_back()
            page.get_by_role('heading', name='King Art D. Pacumberto.', level=1).wait_for(timeout=10000)
            check('view=recruiter' in page.url and page.locator('.recruiter-view').is_visible(), 'Browser history restores the shareable recruiter view without stale full-view nodes')
            page.go_forward()
            page.get_by_role('heading', name='From a question').wait_for(timeout=10000)
            check('view=recruiter' not in page.url and page.locator('#main-content').is_visible(), 'Browser forward restores the full portfolio and its content runtime')
            # Repeat both transitions to catch duplicate observers or one-way cleanup.
            for iteration in range(2):
                page.get_by_role('link', name='Recruiter view').click()
                page.get_by_role('heading', name='King Art D. Pacumberto.', level=1).wait_for(timeout=8000)
                page.get_by_role('button', name='Full portfolio', exact=True).click()
                page.get_by_role('heading', name='From a question').wait_for(timeout=10000)
                check(page.locator('#main-content').is_visible() and page.locator('.site-header').is_visible(), f'Repeated recruiter/full transition {iteration + 1} restores the complete portfolio')

            page.get_by_role('link', name='Recruiter view').click()
            page.get_by_role('heading', name='King Art D. Pacumberto.', level=1).wait_for(timeout=8000)
            page.locator('.recruiter-actions').wait_for(state='visible', timeout=5000)
            print_display = page.locator('.recruiter-actions').evaluate("el => getComputedStyle(el).display")
            page.emulate_media(media='print')
            print_hidden = page.locator('.recruiter-actions').evaluate("el => getComputedStyle(el).display") == 'none'
            page.emulate_media(media='screen')
            check(print_hidden and print_display != 'none', 'Print stylesheet removes on-screen navigation controls')

            for width in [320, 360, 390, 428, 768, 1024, 1440]:
                page.set_viewport_size({'width': width, 'height': 900})
                page.wait_for_timeout(100)
                metrics = page.evaluate("""() => {
                  const textSelectors = [
                    '.recruiter-hero h1', '.recruiter-intro', '.recruiter-section-heading h2',
                    '.recruiter-project-body h3', '.recruiter-project-body > p',
                    '.recruiter-skill-card > p', '.recruiter-experience-card p',
                    '.recruiter-education-item p', '.recruiter-education-current h3',
                    '.recruiter-awards p', '.recruiter-leadership-grid p',
                    '.recruiter-contact h2', '.recruiter-contact p',
                    '.recruiter-tags > span', '.recruiter-brand-lockup',
                    '.recruiter-snapshot-lockup', '.recruiter-hero-links a',
                    '.recruiter-contact-actions a'
                  ]
                  const textOverflow = textSelectors.flatMap((selector) =>
                    [...document.querySelectorAll(selector)].filter((element) =>
                      element.getClientRects().length && element.scrollWidth > element.clientWidth + 2
                    ).map((element) => ({selector, text:element.textContent?.trim().slice(0,48),
                      client:element.clientWidth, scroll:element.scrollWidth}))
                  )
                  const card = document.querySelector('.recruiter-project-card')
                  const art = card?.querySelector('.recruiter-project-art')
                  const body = card?.querySelector('.recruiter-project-body')
                  const cardLayout = card ? {
                    display:getComputedStyle(card).display,
                    columns:getComputedStyle(card).gridTemplateColumns.split(' ').length,
                    artLeft:art?.getBoundingClientRect().left ?? 0,
                    bodyLeft:body?.getBoundingClientRect().left ?? 0
                  } : null
                  const copySize = (selector) => {
                    const element = document.querySelector(selector)
                    return element ? parseFloat(getComputedStyle(element).fontSize) : 0
                  }
                  return {
                    pageOverflow:document.documentElement.scrollWidth > innerWidth + 1,
                    textOverflow, cardLayout,
                    bodyCopy:copySize('.recruiter-project-body > p:not(.recruiter-project-type)'),
                    skillCopy:copySize('.recruiter-skill-card > p'),
                    projectLabel:copySize('.recruiter-project-type')
                  }
                }""")
                check(not metrics['pageOverflow'], f'{width}px viewport has no horizontal page overflow')
                check(not metrics['textOverflow'], f'{width}px viewport has no overflowing recruiter text ({metrics["textOverflow"]})')
                check(metrics['bodyCopy'] >= 13 and metrics['skillCopy'] >= 13 and metrics['projectLabel'] >= 10,
                      f'{width}px viewport retains readable recruiter body and metadata sizes ({metrics})')
                if width <= 760:
                    check(metrics['cardLayout']['display'] == 'grid' and metrics['cardLayout']['columns'] == 2
                          and metrics['cardLayout']['bodyLeft'] > metrics['cardLayout']['artLeft'],
                          f'{width}px viewport uses the intended two-column project-card layout ({metrics["cardLayout"]})')

            page.keyboard.press('Tab')
            focused = page.evaluate("document.activeElement && (document.activeElement.tagName === 'A' || document.activeElement.tagName === 'BUTTON')")
            check(focused, 'Keyboard navigation reaches a visible interactive control')
            check(not errors, 'Desktop recruiter route has no uncaught browser exceptions')

            mobile = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
            mobile.on('pageerror', lambda error: errors.append(str(error)))
            mobile.goto(BASE + '?view=recruiter', wait_until='domcontentloaded', timeout=30000)
            mobile.get_by_role('heading', name='King Art D. Pacumberto.', level=1).wait_for(timeout=15000)
            check(mobile.get_by_role('link', name='Download CV · PDF').first.is_visible(), 'Touch layout keeps the PDF CV action visible')
            check(not mobile.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1'), '390px touch viewport has no horizontal overflow')
            mobile_card_layout = mobile.locator('.recruiter-project-card').first.evaluate(
                "el => ({display:getComputedStyle(el).display, columns:getComputedStyle(el).gridTemplateColumns.split(' ').length})")
            check(mobile_card_layout['display'] == 'grid' and mobile_card_layout['columns'] == 2,
                  f'Mobile project cards preserve their compact two-column layout ({mobile_card_layout})')
            mobile.get_by_role('link', name='Experience').tap()
            check(mobile.evaluate("location.hash === '#recruiter-experience'"), 'Touch section navigation reaches the experience record')
            check(not errors, 'Touch recruiter route has no uncaught browser exceptions')
            browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()

    passed = sum(1 for ok, _ in results if ok)
    failed = [label for ok, label in results if not ok]
    print(f'\nRecruiter browser QA: {passed}/{len(results)} checks passed.')
    if failed:
        print('Failures:')
        for label in failed:
            print(f' - {label}')
        raise SystemExit(1)


if __name__ == '__main__':
    main()
