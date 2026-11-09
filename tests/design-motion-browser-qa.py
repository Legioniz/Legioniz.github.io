#!/usr/bin/env python3
"""Browser smoke tests for shared design tokens, motion fallbacks, and responsive layouts.

This fixture loads the production stylesheet directly. It validates CSS behavior in Chromium,
not the compiled React bundle (which is covered by CI after dependency installation).
"""
from __future__ import annotations
from pathlib import Path
import os
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / 'src/styles.css').read_text(encoding='utf-8')
HTML = r'''<!doctype html><html lang="en" data-theme="dark" data-motion="on" data-motion-override="on" data-quality="full" data-pointer="fine"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
<div class="site-shell"><main class="page-width">
  <section class="hero-section"><div class="hero-content"><p class="hero-pretitle" data-hero-sequence="eyebrow">FIELD NOTES / 001</p><h1 class="hero-title" aria-label="From a question to working systems."><span class="title-line" data-hero-line aria-hidden="true">From a question</span><span class="title-line" data-hero-line aria-hidden="true">to working</span><span class="title-line" data-hero-line aria-hidden="true">systems.</span></h1><p data-hero-sequence="description">Hero description</p><div data-hero-sequence="actions"><button>Explore</button></div></div><div class="hero-visual motion-active" data-motion-zone><div class="visual-plate"></div></div></section>
  <div class="timeline motion-active"><article class="timeline-item"><span class="timeline-marker"></span></article></div>
  <section class="recruiter-view" data-recruiter-motion-ready="true"><div class="recruiter-timeline motion-active"><article class="recruiter-experience-card is-in-view"><span class="recruiter-timeline-marker"></span><div><span>2026</span><h3>Experience</h3></div><div><p>Technical support and project work.</p></div></article></div><article class="recruiter-education-item is-in-view"><span>2026</span><div><h3>Education</h3></div></article><div class="recruiter-project-card"><div class="recruiter-project-art"><i></i></div></div></section>
  <div class="network-path motion-active"><div class="network-link is-traversed"><i></i></div><button class="network-node active">Selected</button><div class="network-node-detail" aria-live="polite">Selected node details</div></div>
  <div class="photo-lightbox"><div class="photo-lightbox-panel"><button class="photo-viewer-nav">Next</button></div></div>
  <button id="focus-test">Focus test</button>
  <div class="project-meta">PROJECT / 01</div><div class="feature-code">LENS LAB / EXPOSURE</div><footer class="footer-copy"><small>© 2026 PORTFOLIO</small></footer>
</main></div></body></html>'''


def main() -> None:
    results: list[tuple[bool, str]] = []
    errors: list[str] = []

    def check(condition: bool, label: str) -> None:
        results.append((bool(condition), label))
        print(f"{'PASS' if condition else 'FAIL'} {label}")

    with sync_playwright() as p:
        launch = {'headless': True, 'args': ['--no-sandbox', '--disable-dev-shm-usage']}
        chromium_path = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('chromium-browser')
        if chromium_path:
            launch['executable_path'] = chromium_path
        browser = p.chromium.launch(**launch)
        page = browser.new_page(viewport={'width': 1440, 'height': 950}, reduced_motion='no-preference')
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.set_content(HTML.replace('</head>', f'<style>{CSS}</style></head>'), wait_until='domcontentloaded')
        check(page.locator('.hero-title .title-line').count() == 3, 'Hero headline lines render in the production typography system')
        body_type = page.locator('body').evaluate('(e)=>Number.parseFloat(getComputedStyle(e).fontSize)')
        recruiter_copy_type = page.locator('.recruiter-experience-card p').evaluate('(e)=>Number.parseFloat(getComputedStyle(e).fontSize)')
        check(body_type >= 15.5 and recruiter_copy_type >= 14, 'Body and recruiter copy use the updated readable editorial type scale')
        metadata_sizes = page.locator('.project-meta, .feature-code, .footer-copy small').evaluate_all('(items)=>items.map(e=>Number.parseFloat(getComputedStyle(e).fontSize))')
        check(all(size >= 10 for size in metadata_sizes), 'Project metadata, feature labels, and footer microcopy stay at or above 10px')
        recruiter_meta = page.locator('.recruiter-experience-card > div > span').first.evaluate('(e)=>Number.parseFloat(getComputedStyle(e).fontSize)')
        check(recruiter_meta >= 10, 'Recruiter timeline metadata follows the same legible minimum')
        contrast = page.evaluate("""() => {
          const root = getComputedStyle(document.documentElement)
          const rgb = (value) => {
            const hex = value.trim().replace('#', '')
            return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
              .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
          }
          const luminance = (value) => {
            const [r, g, b] = rgb(value)
            return .2126 * r + .7152 * g + .0722 * b
          }
          const ratio = (a, b) => {
            const x = luminance(a), y = luminance(b)
            return (Math.max(x, y) + .05) / (Math.min(x, y) + .05)
          }
          return { body: ratio(root.getPropertyValue('--text'), root.getPropertyValue('--bg')),
            muted: ratio(root.getPropertyValue('--muted'), root.getPropertyValue('--bg')),
            accent: ratio(root.getPropertyValue('--accent'), root.getPropertyValue('--bg')) }
        }""")
        check(all(value >= 4.5 for value in contrast.values()), 'Dark-theme body, muted, and accent colors meet WCAG AA contrast')
        page.evaluate("document.documentElement.dataset.theme='light'")
        light_contrast = page.evaluate("""() => {
          const root = getComputedStyle(document.documentElement)
          const rgb = (value) => {
            const hex = value.trim().replace('#', '')
            return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
              .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
          }
          const luminance = (value) => { const [r,g,b] = rgb(value); return .2126*r + .7152*g + .0722*b }
          const ratio = (a,b) => { const x=luminance(a), y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05) }
          return { body: ratio(root.getPropertyValue('--text'), root.getPropertyValue('--bg')),
            muted: ratio(root.getPropertyValue('--muted'), root.getPropertyValue('--bg')),
            accent: ratio(root.getPropertyValue('--accent'), root.getPropertyValue('--bg')) }
        }""")
        check(all(value >= 4.5 for value in light_contrast.values()), 'Light-theme body, muted, and accent colors meet WCAG AA contrast')
        page.evaluate("document.documentElement.dataset.theme='dark'")
        check(page.locator('.hero-title .title-line[data-reveal]').count() == 0 and page.locator('.hero-title[aria-label="From a question to working systems."]').count() == 1, 'Critical headline is independent of the scroll observer and has a complete accessible sentence')
        check(page.locator('.hero-section [data-hero-sequence][data-reveal]').count() == 0, 'Hero support copy uses the dedicated fail-open sequence instead of global reveal hiding')
        hero_animation = page.locator('.hero-title .title-line').first.evaluate('(e)=>getComputedStyle(e).animationName')
        check(hero_animation == 'hero-line-enter', 'Hero headline uses its dedicated entrance animation')
        hero_during_entry = page.locator('.hero-title .title-line').evaluate_all('(items)=>items.map(e=>({opacity:Number(getComputedStyle(e).opacity),visibility:getComputedStyle(e).visibility,clip:getComputedStyle(e).clipPath}))')
        check(all(item['opacity'] >= .87 and item['visibility'] == 'visible' and item['clip'] == 'none' for item in hero_during_entry), 'Headline remains readable even during the entrance animation frame')
        page.evaluate("document.documentElement.dataset.revealReady='true'")
        page.wait_for_timeout(900)
        hero_visible = page.locator('.hero-title .title-line').first.evaluate('(e)=>({opacity:getComputedStyle(e).opacity,visibility:getComputedStyle(e).visibility,clip:getComputedStyle(e).clipPath,transform:getComputedStyle(e).transform})')
        check(hero_visible['opacity'] == '1' and hero_visible['visibility'] == 'visible' and hero_visible['clip'] == 'none', 'Hero headline remains fully visible after its animation, even when the global reveal gate is active')
        hero_copy_visible = page.locator('[data-hero-sequence="description"]').evaluate('(e)=>getComputedStyle(e).opacity')
        check(hero_copy_visible == '1', 'Hero description stays readable after the entrance sequence')
        main_rail = page.locator('.timeline.motion-active').evaluate('(e)=>getComputedStyle(e,"::after").transform')
        check(main_rail != 'matrix(0, 0, 0, 1, 0, 0)', 'Main timeline progress rail draws while active')
        recruiter_rail = page.locator('.recruiter-timeline').evaluate('(e)=>getComputedStyle(e,"::after").transform')
        check(recruiter_rail != 'matrix(0, 0, 0, 1, 0, 0)', 'Recruiter timeline progress rail draws while active')
        check(page.locator('.recruiter-experience-card.is-in-view').evaluate('(e)=>getComputedStyle(e).opacity') == '1', 'In-view recruiter evidence remains fully visible')
        network_motion = page.locator('.network-link.is-traversed i').evaluate('(e)=>getComputedStyle(e).animationName')
        check(network_motion == 'network-packet', 'Selected Network Lab route uses its viewport-scoped packet animation')
        check(page.locator('.network-node.active').evaluate('(e)=>getComputedStyle(e).borderColor') != 'rgba(0, 0, 0, 0)', 'Network selection has a visible non-motion state')
        page.locator('#focus-test').focus()
        outline = page.locator('#focus-test').evaluate('(e)=>getComputedStyle(e).outlineStyle')
        check(outline != 'none', 'Keyboard focus receives a visible outline')

        page.evaluate("document.documentElement.dataset.motion='off'")
        off_opacity = page.locator('.recruiter-view .recruiter-experience-card').evaluate('(e)=>getComputedStyle(e).opacity')
        off_timeline = page.locator('.recruiter-timeline').evaluate('(e)=>getComputedStyle(e,"::after").transform')
        check(off_opacity == '1', 'Motion-off mode exposes recruiter evidence instead of hiding it')
        check(off_timeline == 'matrix(1, 0, 0, 1, 0, 0)', 'Motion-off mode displays the full static timeline rail')

        page.evaluate("document.documentElement.dataset.motion='on'; document.documentElement.dataset.quality='economy'; document.documentElement.dataset.pointer='coarse'")
        economy_duration = page.locator('.hero-title .title-line').first.evaluate('(e)=>getComputedStyle(e).animationDuration')
        check('0.36s' in economy_duration or '360ms' in economy_duration, 'Economy profile shortens the hero reveal animation duration')
        page.evaluate("document.documentElement.dataset.motion='off'")
        static_hero = page.locator('.hero-title .title-line').first.evaluate('(e)=>({opacity:getComputedStyle(e).opacity,visibility:getComputedStyle(e).visibility,animation:getComputedStyle(e).animationName,clip:getComputedStyle(e).clipPath})')
        check(static_hero['opacity'] == '1' and static_hero['visibility'] == 'visible' and static_hero['animation'] == 'none' and static_hero['clip'] == 'none', 'Pausing motion leaves every hero headline line plainly visible')
        page.evaluate("document.documentElement.dataset.motion='on'")
        page.set_viewport_size({'width': 390, 'height': 844})
        recruiter_grid = page.locator('.recruiter-timeline .recruiter-experience-card').evaluate('(e)=>getComputedStyle(e).gridTemplateColumns')
        check(len(recruiter_grid.split()) == 2, 'Recruiter timeline collapses to a two-column mobile layout')
        page.set_viewport_size({'width': 320, 'height': 780})
        page.wait_for_timeout(60)
        overflow = page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')
        check(not overflow, 'Design fixture has no horizontal overflow at 320px')

        page.emulate_media(reduced_motion='reduce')
        page.evaluate("document.documentElement.dataset.motionOverride='on'; document.documentElement.dataset.motion='on'")
        system_animation = page.locator('.hero-title .title-line').first.evaluate('(e)=>getComputedStyle(e).animationName')
        check(system_animation == 'hero-line-enter', 'Default motion remains enabled even when the OS requests reduced motion')
        page.evaluate("document.documentElement.dataset.motionOverride='off'; document.documentElement.dataset.motion='off'")
        paused_by_visitor = page.locator('.hero-title .title-line').first.evaluate('(e)=>getComputedStyle(e).animationName')
        check(paused_by_visitor == 'none', 'Visitor can explicitly pause motion regardless of the OS preference')
        page.evaluate("document.documentElement.dataset.motionOverride='on'; document.documentElement.dataset.motion='on'")
        reduced_duration = page.locator('.hero-title .title-line').first.evaluate('(e)=>getComputedStyle(e).animationDuration')
        reduced_animation = page.locator('.hero-title .title-line').first.evaluate('(e)=>getComputedStyle(e).animationName')
        check(reduced_animation != 'none' and any(float(item.removesuffix('s')) > 0.001 for item in reduced_duration.split(',')), 'An explicit visitor motion-on setting can resume the text animation')
        # Let the short entrance animation finish before measuring the final visible state.
        page.wait_for_timeout(800)
        reduced_visibility = page.locator('.hero-title .title-line').first.evaluate('(e)=>({opacity:getComputedStyle(e).opacity,clip:getComputedStyle(e).clipPath})')
        check(reduced_visibility['opacity'] == '1' and reduced_visibility['clip'] == 'none', 'The motion preference never leaves the hero headline hidden after its entrance animation')
        page.evaluate("document.documentElement.dataset.motionOverride='off'; document.documentElement.dataset.motion='off'")
        paused_animation = page.locator('.hero-title .title-line').first.evaluate('(e)=>getComputedStyle(e).animationName')
        check(paused_animation == 'none', 'Explicit visitor pause disables the hero text animation')
        check(not errors, 'No browser runtime errors in the design fixture')
        browser.close()

    failures = [label for ok, label in results if not ok]
    print(f"\n{len(results) - len(failures)}/{len(results)} CSS/browser checks passed.")
    if failures:
        print('Failures:')
        for label in failures:
            print(f' - {label}')
        raise SystemExit(1)


if __name__ == '__main__':
    main()
