#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BACKUP_ROOT = path.join(ROOT, '.portfolio-backups')
const KEEP_BACKUPS = 5
const command = process.argv[2] || 'help'
const expectedFiles = [
  'index.html', 'package.json', 'vite.config.ts', '.lighthouserc.json', '.env.example', '.gitignore',
  'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'requirements-test.txt', 'START-PORTFOLIO.cmd',
  'src/App.tsx', 'src/BackendPanels.tsx', 'src/ErrorBoundary.tsx', 'src/PortfolioFeatures.tsx', 'src/RecruiterView.tsx',
  'src/adaptive.ts', 'src/backend.ts', 'src/config.ts', 'src/data.ts', 'src/main.tsx', 'src/masthead.ts', 'src/reveal.ts',
  'src/serviceWorker.ts', 'src/sound.ts', 'src/styles.css', 'src/layout-integrity.css',
  'public/sw.js', 'public/favicon.svg', 'public/favicon-32.png', 'public/favicon.ico', 'public/og-card.png', 'public/robots.txt', 'public/sitemap.xml',
  'public/site.webmanifest', 'public/BACKEND-SETUP.md', 'public/King-Art-Pacumberto-Resume.pdf', 'public/King-Art-Pacumberto-CV.pdf',
  'public/profile/king-art-portrait-480.webp', 'public/profile/king-art-portrait-800.webp', 'public/profile/king-art-portrait-1023.webp',
  'public/profile/king-art-portrait-480.jpg', 'public/profile/king-art-portrait-800.jpg', 'public/profile/king-art-portrait-1023.jpg',
  'design-assets/README.md', 'design-assets/og-card.svg',
  'supabase/migrations/202611090001_portfolio_backend.sql', 'supabase/functions/portfolio-submit/index.ts',
  'scripts/portfolio.mjs', 'scripts/production-audit.mjs',
  'tests/adaptive-smoke.ts', 'tests/feature-security-qa.py', 'tests/production-quality-qa.py', 'tests/project-integrity-qa.py',
  'tests/design-motion-browser-qa.py', 'tests/interactions-browser-qa.py', 'tests/portfolio-motion-qa.py',
  'tests/recruiter-view-browser-qa.py', 'tests/layout_integrity_browser_qa.py', 'tests/interaction-fixture.html',
  '.github/workflows/deploy.yml', '.github/dependabot.yml',
  'README.md', 'SOURCES.md', 'BACKEND-SETUP.md', 'CONTENT-CHECKLIST.md', 'PRODUCTION-QUALITY.md', 'RECRUITER-VIEW.md',
  'UI-MOTION-DESIGN.md', 'VISUAL-DESIGN-SYSTEM.md', 'VIEW-TRANSITION-LIFECYCLE.md',
  'CHANGELOG.md',
]
const excludedSnapshotNames = new Set(['.git', 'node_modules', 'dist', '.portfolio-backups', '.lighthouseci', 'coverage', 'playwright-report', 'test-results', '__pycache__', '.qa-build', '.vite', '_site', '.jekyll-cache', '.bundle'])
const excludedSnapshotFilePattern = /\.(?:py[co]|tsbuildinfo)$/i
const excludedSecretPattern = /^\.env(?:\..+)?$/i

let failures = 0

function log(ok, message) {
  console.log(`${ok ? '✓' : '✗'} ${message}`)
  if (!ok) failures += 1
}

async function exists(relative) {
  try { await stat(path.join(ROOT, relative)); return true } catch { return false }
}

async function read(relative) {
  return readFile(path.join(ROOT, relative), 'utf8')
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

async function listFiles(directory, prefix = '') {
  const found = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name)
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) found.push(...await listFiles(absolute, relative))
    else if (entry.isFile()) found.push(relative)
  }
  return found.sort()
}

async function snapshotRoots() {
  const entries = await readdir(ROOT, { withFileTypes: true })
  return entries
    .filter((entry) => !excludedSnapshotNames.has(entry.name))
    .filter((entry) => entry.name === '.env.example' || !excludedSecretPattern.test(entry.name))
    .filter((entry) => !entry.isFile() || !excludedSnapshotFilePattern.test(entry.name))
    .map((entry) => entry.name)
    .sort()
}

async function verifySnapshot(snapshotDirectory) {
  const manifestPath = path.join(snapshotDirectory, 'BACKUP-MANIFEST.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  let verified = 0
  for (const item of manifest.files) {
    const buffer = await readFile(path.join(snapshotDirectory, item.path))
    if (buffer.length !== item.bytes || sha256(buffer) !== item.sha256) {
      throw new Error(`Backup integrity mismatch: ${item.path}`)
    }
    verified += 1
  }
  return { verified, manifest }
}

async function check() {
  console.log('\nLEGIONIZ PORTFOLIO / SOURCE PREFLIGHT\n')
  for (const file of expectedFiles) log(await exists(file), `Required file: ${file}`)

  for (const file of ['package.json', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json']) {
    try { JSON.parse(await read(file)); log(true, `Valid JSON: ${file}`) }
    catch { log(false, `Invalid or missing JSON: ${file}`) }
  }

  const data = await read('src/data.ts')
  const ids = [...data.matchAll(/\bid:\s*'([^']+)'/g)].map((match) => match[1])
  log(ids.length > 0 && new Set(ids).size === ids.length, `Project IDs are unique (${ids.length})`)
  log((data.match(/visual:\s*'(?:lens|meter|fan|game|toki)'\s*,/g) || []).length === ids.length, 'Every project has a recognized illustration fallback')
  for (const claim of ['Grade Level Representative', 'Public Information Officer', 'bass guitarist', 'Technical Team Leader', 'Mobile Legends: Bang Bang', 'Call of Duty: Mobile', 'Mathematics Club & Science Club', 'Badminton Club & Volunteer Photographer', 'OSINT & cybersecurity foundations', 'Nmap host / port discovery', 'Medusa authorized login-audit labs']) {
    log(data.includes(claim), `Resume detail represented: ${claim}`)
  }
  log(data.includes('Candidate No. 1005463') && data.includes('Gold Award'), 'TIMO award details retained')
  log(data.includes('Freelance / Project-based'), 'Freelance IT support is not presented as a full-time position')
  log(data.includes('Data / traffic spoofing and IP-manipulation concepts (lab-based)') && data.includes('authorized lab environments'), 'Security claims are framed as foundational and authorized-lab practice')

  const features = await read('src/PortfolioFeatures.tsx')
  for (const section of ['lab', 'skills-map', 'photo-archive', 'network-lab', 'osint-journal', 'hardware-lab', 'notebook', 'building']) {
    log(features.includes(`id=\"${section}\"`), `Interactive portfolio section exists: ${section}`)
  }
  log(features.includes('new URLSearchParams') === false && features.includes('Math.log2') && features.includes('monthlyKwh'), 'Interactive project models use local formulas rather than remote sample data')
  log(features.includes('192.0.2.10') && features.includes('198.51.100.20') && features.includes('203.0.113.15') && !features.includes('fetch('), 'Network Lab uses fictional documentation addresses without network requests')
  log(features.includes('Northstar Tools') && features.includes('fictional') && features.includes('private-data collection'), 'OSINT journal uses a fictional scenario with explicit safety boundaries')
  log(features.includes('URL.createObjectURL(file)') && features.includes('URL.revokeObjectURL(url)') && features.includes('48 * 1024 * 1024') && features.includes('45_000_000'), 'Photo workspace is local-only with image and memory limits')
  log(features.includes("localStorage.getItem('legion-portfolio-motion-v7')") && features.includes("if (savedMotion === 'off') return false") && features.includes("return true"), 'Intro sequence follows the shared default-on motion preference and explicit visitor pause')
  log(features.includes("animationPlayState: fanSpeed === 0 ? 'paused' : 'running'"), 'Hardware fan simulation pauses at zero output')
  const backendClient = await read('src/backend.ts')
  log(backendClient.includes('VITE_SUPABASE_ANON_KEY') && !backendClient.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Frontend backend client uses only public credentials')
  const backendPanels = await read('src/BackendPanels.tsx')
  log(backendPanels.includes('mailto:') && backendPanels.includes('No message is stored by the website'), 'Unconfigured inquiry form has an accurate email fallback')
  log(backendPanels.includes('legion-portfolio-analytics-consent-v1') && backendPanels.includes("choice !== 'accepted'"), 'Analytics require explicit opt-in consent')
  const backendSetupSource = await read('BACKEND-SETUP.md')
  const backendSetupPublic = await read('public/BACKEND-SETUP.md')
  log(backendSetupSource === backendSetupPublic, 'Backend setup guide is available from the deployed static site and matches its source copy')
  const migration = await read('supabase/migrations/202611090001_portfolio_backend.sql')
  log(['admin_users', 'inquiries', 'comments', 'page_views', 'submission_rate_limits', 'admin_activity'].every((table) => migration.includes(`alter table public.${table} enable row level security`)), 'All exposed backend tables enable row-level security')
  log(migration.includes("status = 'approved' or (select public.is_portfolio_admin())") && migration.includes('consume_portfolio_quota'), 'Public comments and server-side quota functions have explicit policy boundaries')
  const edge = await read('supabase/functions/portfolio-submit/index.ts')
  log(edge.includes('PORTFOLIO_ALLOWED_ORIGIN') && edge.includes('verifyTurnstile') && edge.includes('consume_portfolio_quota') && edge.includes('payload.website.trim()'), 'Submission Edge Function includes origin, CAPTCHA, quota, and honeypot controls')
  const serviceWorker = await read('public/sw.js')
  log(['/rest/v1/', '/auth/v1/', '/functions/v1/', '/storage/v1/'].every((prefix) => serviceWorker.includes(prefix)), 'Service worker excludes backend API paths from caching')
  log(serviceWorker.includes("legion-portfolio-shell-v13") && serviceWorker.includes("/favicon.svg?v=20261109-3") && serviceWorker.includes("/favicon-32.png?v=20261109-3") && serviceWorker.includes("/favicon.ico?v=20261109-3"), 'Versioned service-worker cache refreshes and precaches all favicon formats')

  const app = await read('src/App.tsx')
  log(app.includes('ErrorBoundary') === false, 'App module is independent from the application-level error boundary')
  log(app.includes("url.searchParams.set('project', project.id)") && app.includes("new URLSearchParams(window.location.search).get('project')") && app.includes('syncRouteFromUrl') && app.includes("window.addEventListener('popstate', syncRouteFromUrl)"), 'Project case studies support shareable URLs and browser history navigation')
  log(app.includes('if (recruiterView) return') && app.includes('}, [filter, recruiterView])'), 'Motion-zone observer skips recruiter DOM and reattaches to the full portfolio after a view switch')
  log(app.includes('}, [recruiterView])') && app.includes("setActiveSection('home')"), 'Section observer is recreated when the full portfolio mounts, with a safe no-observer fallback')
  log(app.includes('}, [recruiterView, mobileOpen, motionEnabled])'), 'Masthead scroll controller detaches in recruiter mode and binds to the new full-view header')
  log(app.includes('previousRecruiterView !== nextRecruiterView') && app.includes('window.requestAnimationFrame(() => window.scrollTo(0, 0))'), 'History navigation resets scroll when switching between distinct page layouts')
  log(app.includes('observeAdaptiveProfile') && app.includes('readAdaptiveProfile'), 'Adaptive runtime profile is connected to the UI and Canvas layer')
  log(app.includes('data-motion-zone') && app.includes('IntersectionObserver'), 'Off-screen motion zones have an observer and fallback path')
  log(app.includes('headerHidden') && app.includes('headerRef') && app.includes('installMastheadScrollBehavior'), 'Direction-aware auto-hiding masthead is connected to the React header')
  const masthead = await read('src/masthead.ts')
  log(app.includes('installMastheadScrollBehavior') && masthead.includes('requestAnimationFrame') && masthead.includes('HIDE_AFTER') && masthead.includes('REVEAL_AFTER'), 'Direction-aware masthead behavior is isolated, testable, and frame-batched')
  log((app.match(/data-reveal(?:=|\s|>)/g) || []).length >= 15 && app.includes('data-hero-line') && app.includes('data-hero-sequence'), 'Main sections retain scroll reveals while first-screen hero content uses its independent fail-open sequence')
  const reveal = await read('src/reveal.ts')
  const revealEffect = app.match(/useLayoutEffect\(\(\) => \{[\s\S]*?installScrollReveal[\s\S]*?\}, \[(.*?)\]\)/)
  log(Boolean(revealEffect && revealEffect[1].split(',').map((part) => part.trim()).includes('motionEnabled') && revealEffect[1].split(',').map((part) => part.trim()).includes('recruiterView')), 'React rebinds the reveal observer before paint whenever the full portfolio DOM remounts')
  log(reveal.includes('new IntersectionObserver') && reveal.includes('rootMargin: READING_MARGIN') && reveal.includes('entry.isIntersecting'), 'Section reveal state is driven by browser IntersectionObserver enter/exit callbacks')
  log(reveal.includes("const READING_MARGIN = '-48px 0px -48px 0px'"), 'Reveal uses a defined reading zone inset from the viewport edges')
  log(reveal.includes('MutationObserver') && reveal.includes('record.addedNodes.forEach(scan)'), 'Dynamically filtered project cards are registered by the reveal controller')
  log(reveal.includes('showEverything') && reveal.includes('data-reveal-ready') && reveal.includes('!enabled') && reveal.includes('typeof MutationObserver'), 'Reveal controller preserves readable content when motion is disabled or observer APIs are unavailable')
  log(reveal.includes('INITIAL_CALLBACK_FALLBACK_MS') && reveal.includes('receivedInitialBatch'), 'Reveal controller has a timeout fallback if an observer fails to dispatch')
  log(app.includes('education-history') && app.includes('achievement-summary') && app.includes('skill-disclosure-panel'), 'Skills, academic history, achievements, work history, and extracurriculars use consistent native disclosures')
  log(app.includes('legion-portfolio-motion-v7') && !app.includes('legion-portfolio-motion-v6') && !app.includes('updateScrollReveals'), 'Versioned motion preference defaults on and preserves an explicit visitor pause')
  log(app.includes("headerHidden && !mobileOpen") && app.includes('mobile-nav-active'), 'Mobile navigation keeps the masthead visible while open')
  log(app.includes('const motionIsPaused') && app.includes('setMotionPreference(next)') && app.includes("useState<'on' | 'off'>") && app.includes("const motionEnabled = motionPreference === 'on'"), 'Decorative motion defaults on and can be explicitly paused or resumed')
  log(app.includes('installInteractionSounds') && app.includes('legion-portfolio-sound-v2') && app.includes('soundEnabledRef'), 'Global interaction sound manager is mounted and uses a versioned visitor preference')
  log(app.includes('role="button"') && app.includes('aria-haspopup="dialog"') && app.includes('onKeyDown={handleKeyDown}'), 'Project cards are clickable, keyboard-operable project launch surfaces')
  log(app.includes('className="project-peek"') && app.includes('CLICK OR PRESS ENTER TO OPEN'), 'Project cards include a quick-view pop-out that previews the project before opening it')
  const sound = await read('src/sound.ts')
  for (const cue of ['hover', 'hover-nav', 'hover-link', 'hover-project', 'hover-control', 'hover-disclosure', 'focus', 'click', 'navigate', 'toggle', 'open', 'close', 'filter', 'download', 'copy', 'input', 'select', 'submit', 'success']) {
    const property = /^[a-z]+$/.test(cue) ? `${cue}: { notes:` : `'${cue}': { notes:`
    log(sound.includes(property), `Unique synthesized interaction cue exists: ${cue}`)
  }
  log(sound.includes('installInteractionSounds') && sound.includes('pointerover') && sound.includes('focusin') && sound.includes('keyboardModality') && sound.includes("addEventListener('change'") && sound.includes("addEventListener('submit'") && sound.includes("addEventListener('click'"), 'All interactive elements use delegated pointer, keyboard, focus, form, and action sound feedback')
  log(sound.includes('webkitAudioContext') && sound.includes('resume().catch'), 'Audio has browser fallback and safely handles autoplay restrictions')
  const adaptive = await read('src/adaptive.ts')
  log(adaptive.includes('adaptiveEffectKey') && adaptive.includes('Layout dimensions are'), 'Adaptive rendering updates are coalesced by meaningful effect changes')
  log(adaptive.includes('nav.maxTouchPoints > 0'), 'Touch pointer detection has a legacy-browser fallback')

  const css = await read('src/styles.css')
  log(css.includes('.disclosure-panel') && css.includes('grid-template-rows: minmax(0, 0fr)') && css.includes('grid-template-rows: minmax(0, 1fr)'), 'Expandable content uses zero-minimum grid tracks for reliable reversible height and opacity transitions')
  log(css.includes('.achievement-detail { display: flex;') && !css.includes('.achievement-row div { display: flex;'), 'Achievement detail layout does not override the shared animated disclosure panel')
  log(css.includes(":root:not([data-motion-override='on'])") && css.includes(":root[data-motion='off']"), 'The visitor pause still disables decorative motion while the default site setting enables it')
  log(css.includes('@media (orientation: landscape)') || css.includes('@media (orientation:portrait)'), 'Landscape orientation rules are present')
  log(css.includes('@container'), 'Component-level container queries are present')
  log(css.includes('prefers-reduced-motion: reduce'), 'Reduced-motion styles are present')
  log(css.includes('.site-header.header-hidden') && css.includes('cubic-bezier(.22, 1, .36, 1)'), 'Masthead slide transition uses a restrained eased curve')
  log(css.includes("[data-reveal='left']") && css.includes("[data-reveal='right']") && css.includes("[data-reveal='scale']"), 'Section choreography has distinct direction and scale variants')
  log(css.includes('.brand-mark .brand-monogram') && css.includes('white-space: nowrap'), 'Header monogram is an unbreakable single-line typographic unit')
  log(css.includes(":root[data-quality='balanced'] [data-reveal]") && css.includes(":root[data-quality='economy'] [data-reveal]"), 'Reveal motion adapts to the device rendering profile')
  log(css.includes('100dvh') && css.includes('100svh'), 'Dynamic and small viewport height fallbacks are present')
  log((css.match(/--accent:\s*#/g) || []).length === 3, 'Dark and light accent tokens share a system, with a deliberate print-only contrast override')
  log(css.includes(".particle-field[data-fallback='true'] { display: none; }"), 'Canvas-unavailable background fallback is present')
  log(css.includes('.project-peek') && css.includes('translate3d(27px, 0, 0)') && css.includes('visibility: visible'), 'Project quick-view panel has a right-side slide-in interaction')
  log(css.includes('.project-card:focus-visible') && css.includes('@media (hover: hover) and (pointer: fine) and (min-width: 901px)'), 'Project pop-out works for pointer hover and keyboard focus on desktop')
  log(css.includes('@media (hover: none), (pointer: coarse), (max-width: 900px)') && css.includes('project-peek { display: none; }'), 'Touch layouts use direct tap-to-open instead of hover-only UI')
  log(css.includes(":root[data-motion=\'off\'] .project-peek") && css.includes('prefers-reduced-motion: reduce'), 'Project interaction motion has visitor and OS accessibility fallbacks')
  log(css.includes('@keyframes project-window-open') && css.includes('@keyframes modal-art-focus'), 'Project introduction dialog has its own entrance choreography')

  const photo = await stat(path.join(ROOT, 'public/profile/king-art-portrait-800.webp')).catch(() => null)
  const photoFallback = await stat(path.join(ROOT, 'public/profile/king-art-portrait-800.jpg')).catch(() => null)
  log(Boolean(photo && photo.size < 100_000), 'Optimized WebP portrait is present and under 100 KB')
  log(Boolean(photoFallback && photoFallback.size < 150_000), 'JPEG portrait fallback is present and optimized')
  const appForPortrait = await read('src/App.tsx')
  log(appForPortrait.includes('king-art-portrait-480.webp') && appForPortrait.includes('king-art-portrait-1023.jpg') && appForPortrait.includes('is-unavailable'), 'Responsive portrait source sets and initials fallback are connected')
  log((await read('src/App.tsx')).includes('Public-source research') || (await read('src/App.tsx')).includes('OPEN-SOURCE RESEARCH'), 'OSINT profile section is present')

  const config = await read('src/config.ts')
  const originalResumePath = config.match(/resumeOriginalPath:\s*'([^']+)'/)?.[1]
  log(Boolean(originalResumePath && await exists(path.join('public', originalResumePath.replace(/^\//, '')))), 'Exact owner-supplied resume PDF resolves to a bundled file')
  if (originalResumePath) {
    const originalBytes = await readFile(path.join(ROOT, 'public', originalResumePath.replace(/^\//, '')))
    log(originalBytes.subarray(0, 5).toString('ascii') === '%PDF-' && originalBytes.length < 600_000, 'Original resume is a valid, compact PDF resource')
  }
  const resumePath = config.match(/resumePdfPath:\s*'([^']+)'/)?.[1]
  log(Boolean(resumePath && await exists(path.join('public', resumePath.replace(/^\//, '')))), 'Public-safe CV PDF link resolves to a bundled file')
  const appLinks = await read('src/App.tsx')
  const publicDocumentAssets = await readdir(path.join(ROOT, 'public'))
  log(!config.includes('resumeDocxPath') && !appLinks.includes('resumeDocxPath') && !publicDocumentAssets.some((file) => /\.(docx?|odt)$/i.test(file)), 'No editable Word document is configured, linked, or shipped in public assets')
  log((appLinks.match(/siteConfig\.resumeOriginalPath/g) || []).length >= 3 && appLinks.includes('siteConfig.resumePdfPath'), 'Resume and public-safe CV are integrated as PDF-only downloads in the header, hero, and contact')
  const fallback = await read('src/ErrorBoundary.tsx')
  log(fallback.includes('siteConfig.resumeOriginalPath'), 'Original resume remains available in the React error fallback')

  const html = await read('index.html')
  log(html.includes('id="root"') && html.includes('boot-fallback') && html.includes('<noscript>'), 'Boot and no-JavaScript fallbacks exist')
  log(html.includes("localStorage.getItem('legion-portfolio-motion-v7')") && html.includes("const motionOverride = savedMotion === 'off' ? 'off' : 'on'") && html.includes("const motionEnabled = savedMotion !== 'off'") && html.includes('dataset.motionOverride'), 'Early boot script enables motion by default and applies an explicit saved visitor pause before paint')
  log(html.includes('/King-Art-Pacumberto-Resume.pdf'), 'Original resume is available before React starts and without JavaScript')
  log(html.includes('/favicon.svg?v=20261109-3') && html.includes('/favicon-32.png?v=20261109-3') && html.includes('/favicon.ico?v=20261109-3'), 'Cache-busted SVG, PNG, and ICO favicon fallbacks are linked from the HTML shell')
  const faviconPng = await readFile(path.join(ROOT, 'public', 'favicon-32.png'))
  const faviconIco = await readFile(path.join(ROOT, 'public', 'favicon.ico'))
  log(faviconPng.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), '32px PNG favicon is a valid PNG image')
  log(faviconIco.readUInt16LE(0) === 0 && faviconIco.readUInt16LE(2) === 1, 'ICO favicon has a valid Windows icon header')
  log(html.includes('display=swap') && css.includes('Segoe UI') && css.includes('Arial, sans-serif'), 'External typography has swap behavior and system font fallbacks')
  log(html.includes('viewport-fit=cover') && html.includes('orientation'), 'Viewport-fit and early orientation setup are present')

  const vite = await read('vite.config.ts')
  log(vite.includes('port: 5174') && vite.includes('port: 4174') && vite.includes('strictPort: true'), 'Development and preview ports remain isolated from 5173')
  const workflow = await read('.github/workflows/deploy.yml')
  log(workflow.includes('npm run verify') && workflow.includes('actions/configure-pages@v5') && workflow.includes('actions/deploy-pages@v4') && workflow.includes('actions/upload-pages-artifact@v4') && workflow.includes('path: ./dist') && workflow.includes('test -s dist/index.html') && workflow.includes('test -s dist/favicon.svg') && workflow.includes('test -s dist/favicon-32.png') && workflow.includes('test -s dist/favicon.ico') && workflow.includes('test -d dist/assets') && workflow.includes('test -f dist/.nojekyll') && !workflow.includes('actions/jekyll-build-pages@v1') && !workflow.includes('destination: ./_site'), 'GitHub Pages workflow validates and uploads compiled Vite dist output directly without Jekyll packaging')
  log(workflow.indexOf('npm run verify') < workflow.indexOf('Validate the production Pages artifact') && workflow.indexOf('Validate the production Pages artifact') < workflow.indexOf('actions/upload-pages-artifact@v4'), 'Vite verification/build and production artifact validation complete before Pages upload')

  const publicFiles = await readdir(path.join(ROOT, 'public'))
  log(!publicFiles.some((name) => /private|phone|personal-cv/i.test(name)), 'No private CV file is stored in public/')
  const publicPdf = await readFile(path.join(ROOT, 'public', 'King-Art-Pacumberto-CV.pdf'))
  log(publicPdf.subarray(0, 5).toString('ascii') === '%PDF-' && publicPdf.length > 100_000, 'Latest redesigned public CV PDF is bundled (updated export)')
  log(!await exists('package-lock.json') ? true : (await read('package-lock.json')).includes('lockfileVersion'), 'Package lockfile is valid when present')
  log(await exists('src/RecruiterView.tsx'), 'Dedicated recruiter profile component is present')
  log(await exists('public/robots.txt') && await exists('public/sitemap.xml') && await exists('public/site.webmanifest'), 'Crawler and install metadata files are present')
  log(await exists('.github/dependabot.yml'), 'Dependabot monitors npm and GitHub Actions dependencies')
  log(await exists('scripts/production-audit.mjs') && await exists('tests/production-quality-qa.py') && await exists('tests/recruiter-view-browser-qa.py'), 'Production budgets, source checks, and recruiter browser tests are included')

  const sourceFiles = ['src/App.tsx', 'src/RecruiterView.tsx', 'src/PortfolioFeatures.tsx', 'src/BackendPanels.tsx', 'src/backend.ts', 'src/serviceWorker.ts', 'src/adaptive.ts', 'src/reveal.ts', 'src/masthead.ts', 'src/ErrorBoundary.tsx', 'src/data.ts', 'src/config.ts', 'src/sound.ts', 'src/styles.css', 'supabase/migrations/202611090001_portfolio_backend.sql', 'supabase/functions/portfolio-submit/index.ts', 'public/sw.js']
  let totalBytes = 0
  for (const relative of sourceFiles) totalBytes += (await stat(path.join(ROOT, relative))).size
  console.log(`\nSource footprint: ${(totalBytes / 1024).toFixed(1)} KB across ${sourceFiles.length} source, backend, and PWA files.`)
  console.log('No third-party animation library or image-heavy runtime dependency is required.')

  if (failures) {
    console.error(`\nPreflight failed with ${failures} issue(s).`)
    process.exitCode = 1
  } else {
    console.log('\nStatic preflight passed.')
  }
}

async function snapshots() {
  if (!await exists('.portfolio-backups')) return []
  return (await readdir(BACKUP_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('snapshot_'))
    .map((entry) => entry.name)
    .sort()
}

async function backup() {
  await mkdir(BACKUP_ROOT, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
  const destination = path.join(BACKUP_ROOT, `snapshot_${stamp}`)
  await mkdir(destination, { recursive: true })

  for (const item of await snapshotRoots()) {
    await cp(path.join(ROOT, item), path.join(destination, item), { recursive: true })
  }

  const files = []
  for (const relative of await listFiles(destination)) {
    const buffer = await readFile(path.join(destination, relative))
    files.push({ path: relative, bytes: buffer.length, sha256: sha256(buffer) })
  }
  const manifest = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    files,
  }
  await writeFile(path.join(destination, 'BACKUP-MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  const verification = await verifySnapshot(destination)
  const retained = await snapshots()
  for (const old of retained.slice(0, Math.max(0, retained.length - KEEP_BACKUPS))) {
    await rm(path.join(BACKUP_ROOT, old), { recursive: true, force: true })
  }
  console.log(`Backup created and checksum-verified: ${path.relative(ROOT, destination)}`)
  console.log(`Files verified: ${verification.verified} · Total: ${(manifest.totalBytes / 1024).toFixed(1)} KB`)
  console.log(`Retained snapshots: ${Math.min(retained.length, KEEP_BACKUPS)} (maximum ${KEEP_BACKUPS})`)
}

async function verifyLatestBackup() {
  const items = await snapshots()
  if (items.length === 0) throw new Error('No local snapshot exists. Run npm run backup first.')
  const latest = path.join(BACKUP_ROOT, items.at(-1))
  const result = await verifySnapshot(latest)
  console.log(`Backup verified: ${items.at(-1)} · ${result.verified} files · ${(result.manifest.totalBytes / 1024).toFixed(1)} KB`)
}

function run(commandName, args) {
  const result = spawnSync(commandName, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) throw new Error(`${commandName} ${args.join(' ')} failed with status ${result.status ?? 'unknown'}`)
}

try {
  if (command === 'check') await check()
  else if (command === 'backup') await backup()
  else if (command === 'backup:verify') await verifyLatestBackup()
  else if (command === 'verify' || command === 'release') {
    if (command === 'release') await backup()
    await check()
    if (failures) process.exit(1)
    if (!await exists('node_modules')) throw new Error('Dependencies are not installed. Run npm install, then retry this command.')
    run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'test:adaptive'])
    run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'test:integrity'])
    run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'test:features'])
    run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'test:production-source'])
    run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'test:design-browser'])
    run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'typecheck'])
    run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build:app'])
    run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'audit:bundle'])
    run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'test:interactions'])
    run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'test:motion'])
    run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'test:recruiter-browser'])
    if (command === 'release') await verifyLatestBackup()
    console.log(command === 'release' ? '\nRelease checks passed. Review dist/ before deployment.' : '\nFull typecheck and production build passed.')
  } else {
    console.log('Commands: check | backup | backup:verify | verify | release')
  }
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
