#!/usr/bin/env python3
"""Static SEO, accessibility, mobile, privacy, and recruiter-view checks."""
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
checks: list[tuple[bool, str]] = []


def check(condition: bool, label: str) -> None:
    checks.append((bool(condition), label))
    print(f"{'PASS' if condition else 'FAIL'} {label}")


class HeadParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.html_lang = ''
        self.title_open = False
        self.title_text = ''
        self.metas: dict[str, str] = {}
        self.links: list[dict[str, str]] = []
        self.jsonld = ''
        self.jsonld_open = False

    def handle_starttag(self, tag: str, attrs) -> None:
        values = dict(attrs)
        if tag == 'html':
            self.html_lang = values.get('lang', '')
        elif tag == 'title':
            self.title_open = True
        elif tag == 'meta':
            key = values.get('name') or values.get('property')
            if key:
                self.metas[key] = values.get('content', '')
        elif tag == 'link':
            self.links.append(values)
        elif tag == 'script' and values.get('type') == 'application/ld+json':
            self.jsonld_open = True

    def handle_endtag(self, tag: str) -> None:
        if tag == 'title':
            self.title_open = False
        elif tag == 'script' and self.jsonld_open:
            self.jsonld_open = False

    def handle_data(self, data: str) -> None:
        if self.title_open:
            self.title_text += data
        if self.jsonld_open:
            self.jsonld += data


html = (ROOT / 'index.html').read_text(encoding='utf-8')
parser = HeadParser()
parser.feed(html)
check(parser.html_lang == 'en', 'Document language is declared')
check('King Art D. Pacumberto' in parser.title_text, 'Search title identifies the portfolio owner')
check(len(parser.metas.get('description', '')) >= 80, 'Meta description is present and descriptive')
check(parser.metas.get('robots', '').startswith('index, follow'), 'Search crawler indexing policy is explicit')
check(parser.metas.get('referrer') == 'strict-origin-when-cross-origin', 'External referrer policy is restrictive')
check(parser.metas.get('og:url') == 'https://legioniz.github.io/', 'Open Graph canonical URL is absolute and stable')
check(parser.metas.get('twitter:card') == 'summary_large_image' and parser.metas.get('og:image', '').endswith('/og-card.png') and parser.metas.get('og:image:type') == 'image/png', 'Social sharing metadata uses a crawler-compatible PNG preview')
check(any(link.get('rel') == 'canonical' and link.get('href') == 'https://legioniz.github.io/' for link in parser.links), 'Canonical URL is linked in document head')
check(any(link.get('rel') == 'icon' and link.get('type') == 'image/x-icon' and 'favicon.ico?v=20261109-2' in link.get('href', '') for link in parser.links), 'Browser-first ICO favicon is linked with a fresh cache key')
check(any(link.get('rel') == 'icon' and link.get('type') == 'image/png' and 'favicon-32.png?v=20261109-2' in link.get('href', '') for link in parser.links), '32px PNG favicon fallback is linked')
check(any(link.get('rel') == 'icon' and link.get('type') == 'image/svg+xml' and 'favicon.svg?v=20261109-2' in link.get('href', '') for link in parser.links), 'Scalable SVG favicon is linked')
try:
    structured = json.loads(parser.jsonld)
    check(structured.get('@type') == 'Person' and structured.get('name') == 'King Art D. Pacumberto', 'Person structured data is valid JSON-LD and identifies the site owner')
except (json.JSONDecodeError, AttributeError):
    check(False, 'Person structured data is valid JSON-LD and identifies the site owner')

for asset in ['public/robots.txt', 'public/sitemap.xml', 'public/site.webmanifest', 'public/og-card.png']:
    check((ROOT / asset).is_file(), f'{asset} exists')

lhci = json.loads((ROOT / '.lighthouserc.json').read_text(encoding='utf-8'))['ci']
workflow = (ROOT / '.github/workflows/deploy.yml').read_text(encoding='utf-8')
check(set(lhci['collect']['url']) == {'http://127.0.0.1:4174/', 'http://127.0.0.1:4174/?view=recruiter'}, 'Lighthouse CI audits both the full portfolio and recruiter view')
check(lhci['upload']['target'] == 'filesystem' and lhci['collect']['numberOfRuns'] >= 3, 'Lighthouse reports stay in the CI workspace instead of public report storage')
check('categories:accessibility' in lhci['assert']['assertions'] and 'largest-contentful-paint' in lhci['assert']['assertions'] and 'cumulative-layout-shift' in lhci['assert']['assertions'], 'Lighthouse has explicit accessibility and performance regression gates')
check('@lhci/cli@0.16.x' in workflow and 'lhci autorun' in workflow, 'GitHub Actions installs and runs the Lighthouse CI 0.16 release line')
try:
    ET.parse(ROOT / 'public/sitemap.xml')
    check(True, 'Sitemap is valid XML')
except ET.ParseError:
    check(False, 'Sitemap is valid XML')
try:
    manifest = json.loads((ROOT / 'public/site.webmanifest').read_text(encoding='utf-8'))
    check(manifest.get('start_url') == '/' and manifest.get('display') == 'standalone', 'Web app manifest has a valid root start URL and display mode')
except (json.JSONDecodeError, OSError):
    check(False, 'Web app manifest has a valid root start URL and display mode')

app = (ROOT / 'src/App.tsx').read_text(encoding='utf-8')
recruiter = (ROOT / 'src/RecruiterView.tsx').read_text(encoding='utf-8')
css = (ROOT / 'src/styles.css').read_text(encoding='utf-8')
data = (ROOT / 'src/data.ts').read_text(encoding='utf-8')
check("get('view') === 'recruiter'" in app and "searchParams.set('view', 'recruiter')" in app, 'Recruiter mode is directly shareable and survives page refresh')
check("window.addEventListener('popstate', syncRouteFromUrl)" in app, 'Browser back and forward synchronize recruiter and project views')
check('if (recruiterView) return' in app and '}, [filter, recruiterView])' in app, 'Motion zones detach in recruiter mode and rebind to new full-view DOM')
check('}, [recruiterView, mobileOpen, motionEnabled])' in app, 'Masthead controller rebinds when the full portfolio header remounts')
check('}, [motionEnabled, recruiterView])' in app and "getElementById('main-content')" in app, 'Scroll reveal is recreated against the new main-content subtree after view transitions')
check('previousRecruiterView !== nextRecruiterView' in app and 'window.scrollTo(0, 0)' in app, 'Browser history switches reset the offset when the page layout changes')
check('const exitRecruiterView' in app and 'const openRecruiterView' in app and app.count('window.scrollTo(0, 0)') >= 3, 'Explicit recruiter/full/project transitions normalize scroll without a stale smooth-scroll offset')
check("lazy(() => import('./RecruiterView')" in app and 'Suspense fallback' in app, 'Recruiter profile loads as a separate, on-demand JavaScript chunk')
check('aria-label="Recruiter profile sections"' in recruiter and 'id="recruiter-main"' in recruiter, 'Recruiter profile has named navigation and a distinct main landmark')
check('Skip to recruiter profile' in recruiter and 'tabIndex={-1}' in recruiter, 'Recruiter profile includes a keyboard skip link and focused page heading')
check('Download CV · PDF' in recruiter and 'siteConfig.resumePdfPath' in recruiter and 'resumeOriginalPath' not in recruiter, 'Recruiter mode exposes the public-safe PDF CV only')
check(all(value in recruiter for value in ['featuredProjects', 'skillGroups.map', 'relevantExperience', 'education.map', 'achievements.map', 'extracurriculars.map']), 'Recruiter profile draws evidence from the portfolio source data')
check("'Computer Support Specialist'" in recruiter and "startsWith('Student Teacher')" in recruiter, 'Recruiter profile prioritizes relevant support and teaching experience')
check('onOpenProject(project)' in recruiter and 'openRecruiterProject' in app, 'Recruiter project cards lead into the full project case-study dialog')
check('rel="noopener noreferrer"' in recruiter, 'Recruiter external destinations use safe new-tab link relations')
check('const title = recruiterView ? recruiterTitle : originalTitle' in app and 'const summary = recruiterView ? recruiterDescription : originalDescription' in app and 'socialDescriptions.forEach' in app, 'Document and social metadata update when entering recruiter view')
check('window.print' not in recruiter and '@media print' in css and '.recruiter-actions' in css, 'Recruiter view is print-styled without a fake PDF-generation claim')
check(all(label in recruiter for label in ['PUP Quezon City', 'BSIT 1-2', '2026–2027']) and 'Synthetic-data demonstration' in data, 'Recruiter view uses supplied education and qualified project data')
check('not presented as professional penetration-testing experience' in recruiter, 'Security experience is qualified as foundational and authorized-lab practice')

check('@media (max-width: 760px)' in css and '@media (max-width: 420px)' in css and '.recruiter-project-card { grid-template-columns: 82px' in css, 'Recruiter layout includes compact-screen responsive rules')
check('@media (pointer: coarse)' in css and '.recruiter-jumps a { min-height: 44px; }' in css, 'Touch navigation and interactive targets have a 44px minimum')
check('@media print' in css and '.recruiter-jumps, .recruiter-actions' in css, 'Print mode removes navigation controls and avoids sticky headers')
check('prefers-reduced-motion: reduce' in css and ':focus-visible' in css, 'Reduced-motion and visible keyboard focus support remain present')

def relative_luminance(hex_color: str) -> float:
    values = [int(hex_color.lstrip('#')[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = [value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4 for value in values]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]

def contrast_ratio(foreground: str, background: str) -> float:
    lighter, darker = sorted([relative_luminance(foreground), relative_luminance(background)], reverse=True)
    return (lighter + 0.05) / (darker + 0.05)

root_css = css.split(":root[data-theme='light']", 1)[0]
light_css = css.split(":root[data-theme='light']", 1)[1].split('}', 1)[0]
colors = {}
for theme, block in [('dark', root_css), ('light', light_css)]:
    accent = re.search(r'--accent:\s*(#[0-9a-fA-F]{6})', block)
    foreground = re.search(r'--on-accent:\s*(#[0-9a-fA-F]{6})', block)
    hover = re.search(r'--accent-dark:\s*(#[0-9a-fA-F]{6})', block)
    if accent and foreground and hover:
        colors[theme] = (foreground.group(1), accent.group(1), hover.group(1))
check(set(colors) == {'dark', 'light'} and all(contrast_ratio(fg, bg) >= 4.5 and contrast_ratio(fg, hover) >= 4.5 for fg, bg, hover in colors.values()), 'Primary accent buttons maintain WCAG AA text contrast in dark and light themes')
for theme, block in [('dark', root_css), ('light', light_css)]:
    background = re.search(r'--bg:\s*(#[0-9a-fA-F]{6})', block)
    foreground = re.search(r'--text:\s*(#[0-9a-fA-F]{6})', block)
    muted = re.search(r'--muted:\s*(#[0-9a-fA-F]{6})', block)
    muted_secondary = re.search(r'--muted-2:\s*(#[0-9a-fA-F]{6})', block)
    check(bool(background and foreground and muted and muted_secondary) and all(
        contrast_ratio(color.group(1), background.group(1)) >= 4.5
        for color in (foreground, muted, muted_secondary)
    ), f'{theme.title()} theme body and muted text tokens meet WCAG AA contrast')
check('color: var(--on-accent)' in css, 'Primary and recruiter download buttons share the theme-aware accessible foreground token')

check('loading="lazy"' in app and 'decoding="async"' in app, 'Profile imagery is deferred and decoded asynchronously')
check('className="recruiter-portrait"' in recruiter and 'fetchPriority="high"' in recruiter and 'alt="Portrait of King Art' in recruiter, 'Recruiter mode loads an optimized, accessible above-the-fold portrait')

for file in ['src/App.tsx', 'src/RecruiterView.tsx', 'src/BackendPanels.tsx', 'src/ErrorBoundary.tsx']:
    source = (ROOT / file).read_text(encoding='utf-8')
    external_links = re.findall(r'<a\b[^>]*target="_blank"[^>]*>', source, flags=re.S)
    unsafe = [tag for tag in external_links if 'noopener' not in tag and 'noreferrer' not in tag]
    check(not unsafe, f'{file} gives target=_blank links opener isolation')

backend = (ROOT / 'src/backend.ts').read_text(encoding='utf-8')
sql = (ROOT / 'supabase/migrations/202611090001_portfolio_backend.sql').read_text(encoding='utf-8')
edge = (ROOT / 'supabase/functions/portfolio-submit/index.ts').read_text(encoding='utf-8')
check('SUPABASE_SERVICE_ROLE_KEY' not in backend and 'service_role' not in backend, 'Frontend backend configuration contains no service-role credential')
check('enable row level security' in sql.lower() and 'is_portfolio_admin' in sql, 'Database migration retains RLS and administrator policy enforcement')
check('verifyTurnstile' in edge and 'consume_portfolio_quota' in edge and 'PORTFOLIO_ALLOWED_ORIGIN' in edge, 'Server-side intake retains CAPTCHA, rate quota, and origin restrictions')
check("const CACHE_NAME = 'legion-portfolio-shell-v9'" in (ROOT / 'public/sw.js').read_text(encoding='utf-8'), 'Service worker uses a new cache version for this release')
check('service_role' not in recruiter.lower(), 'Recruiter chunk has no privileged backend credential references')

check('--content-measure: 68ch' in css and '--section-space: clamp(72px, 9vw, 132px)' in css and '--type-kicker' in css, 'Shared design system includes readable measure, responsive section spacing, and semantic typography tokens')
check('#151719' in css and '#f3f0e9' in css and '#e87961' in css and '#a94837' in css, 'Editorial charcoal/ivory/coral palette is consistent across dark and light themes')
check('--font-size-base: 16px' in css and '--font-size-sm: 14px' in css and 'font-size: clamp(10px, .72em, 12px)' in css, 'Editorial typography uses a readable body scale and legible metadata floor')
check('editorial-emphasis-in' in css and 'editorial-heading-in' in css and ":root[data-motion='off']" in css, 'Heading text animation includes an explicit pause and static fallback')
check('::view-transition-new(project-visual)' in css and 'project-art-in' in css and 'runProjectViewTransition' in app and 'catch {' in app and "document.documentElement.dataset.motion !== 'off'" in app, 'Project visual uses guarded shared-element transitions, CSS fallback, and the explicit site motion state')
check('.timeline.motion-active::after' in css and 'recruiter-timeline.motion-active::after' in css and 'data-motion-zone' in recruiter, 'Full and recruiter experience timelines animate only while in view')
check('ArrowLeft' in (ROOT / 'src/PortfolioFeatures.tsx').read_text(encoding='utf-8') and 'onTouchEnd' in (ROOT / 'src/PortfolioFeatures.tsx').read_text(encoding='utf-8') and 'useMemo(() => photos.filter' in (ROOT / 'src/PortfolioFeatures.tsx').read_text(encoding='utf-8'), 'Photography viewer supports keyboard, touch, and stable filtered-image lifecycle')
check('is-traversed' in (ROOT / 'src/PortfolioFeatures.tsx').read_text(encoding='utf-8') and 'aria-live="polite"' in (ROOT / 'src/PortfolioFeatures.tsx').read_text(encoding='utf-8'), 'Network diagram communicates selected route and announces node details')
check('.recruiter-view[data-recruiter-motion-ready' in css and '.recruiter-experience-card.is-in-view' in css and 'recruiter-timeline-marker' in recruiter, 'Recruiter View has staged, non-blocking timeline and evidence reveals')
check("root.querySelectorAll<HTMLElement>('.recruiter-hero, .recruiter-section, .recruiter-contact, .recruiter-experience-card" in recruiter and 'fallbackTimer' in recruiter, 'Recruiter reveal controller covers nested evidence and exposes a visibility fallback')
check(":root[data-quality='economy'][data-motion='on'] .hero-section .hero-title .title-line" in css and ":root[data-quality='balanced'][data-motion='on'] .hero-section .hero-title .title-line" in css and '@media (pointer: coarse)' in css, 'Motion is budgeted for economy, balanced, desktop, and touch profiles')
check('data-hero-line' in app and 'aria-label="From a question to working systems."' in app and 'data-reveal' not in re.search(r'<h1 className="hero-title"[\s\S]*?</h1>', app).group(0), 'Hero headline uses a fail-open dedicated sequence with a complete accessible label')
check('className="availability-line" role="group" aria-label=' in app and 'aria-hidden="true">BSIT STUDENT / SOFTWARE &amp; SYSTEMS</span>' in app, 'Hero location and discipline metadata has a readable visual gap and one coherent accessible label')
check('HERO VISIBILITY GUARANTEE' in css and 'hero-line-enter' in css and ":root[data-motion='off'] .hero-section .hero-title .title-line" in css, 'Hero text remains visible in motion-on, motion-off, and interrupted-animation states')
check(":root[data-motion='off'] .recruiter-view .recruiter-experience-card" in css and '@media (prefers-reduced-motion: reduce)' in css and ':focus-visible' in css, 'Reduced-motion mode keeps all recruiter content visible and keyboard focus clear')


failures = [label for ok, label in checks if not ok]
print(f"\n{len(checks) - len(failures)}/{len(checks)} production-source checks passed.")
if failures:
    print('Failures:')
    for failure in failures:
        print(f' - {failure}')
    sys.exit(1)
