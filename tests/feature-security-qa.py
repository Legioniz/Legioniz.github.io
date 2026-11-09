#!/usr/bin/env python3
"""Static release checks for the portfolio expansion and backend trust boundaries."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def check(condition: bool, label: str) -> None:
    checks.append((bool(condition), label))
    print(f"{'PASS' if condition else 'FAIL'} {label}")

app = (ROOT / 'src/App.tsx').read_text(encoding='utf-8')
features = (ROOT / 'src/PortfolioFeatures.tsx').read_text(encoding='utf-8')
backend_ui = (ROOT / 'src/BackendPanels.tsx').read_text(encoding='utf-8')
backend = (ROOT / 'src/backend.ts').read_text(encoding='utf-8')
sql = (ROOT / 'supabase/migrations/202611090001_portfolio_backend.sql').read_text(encoding='utf-8')
edge = (ROOT / 'supabase/functions/portfolio-submit/index.ts').read_text(encoding='utf-8')
sw = (ROOT / 'public/sw.js').read_text(encoding='utf-8')
sound = (ROOT / 'src/sound.ts').read_text(encoding='utf-8')

# Core user-facing experience.
for section_id, label in [
    ('lab', 'Project Laboratory'), ('skills-map', 'interactive skill map'),
    ('photo-archive', 'local photography workspace'), ('network-lab', 'fictional Network Lab'),
    ('osint-journal', 'OSINT verification journal'), ('hardware-lab', 'Arduino hardware model'),
    ('notebook', 'developer notebook'), ('building', 'currently building board'),
]:
    check(f'id="{section_id}"' in features, f'{label} section is present')

check('project-compare' in features and 'Technologies' in features and 'Selected capabilities' in features, 'Project comparison uses documented project details')
check('new URLSearchParams(window.location.search).get(\'project\')' in app and "url.searchParams.set('project', project.id)" in app, 'Project case studies support direct, shareable query-string links')
check("window.addEventListener('popstate', syncRouteFromUrl)" in app and 'Copy project link' in app and 'openProject' in app and 'closeProject' in app, 'Project links synchronize with browser history and expose a copy action')
check("localStorage.getItem('legion-portfolio-motion-v7')" in features, 'Intro sequence defaults to motion on and respects an explicit saved pause')
check("file.size > 12 * 1024 * 1024" in features and '48 * 1024 * 1024' in features and '45_000_000' in features, 'Local photo viewer caps file count, total bytes, per-file size, and decoded dimensions')
check('URL.createObjectURL(file)' in features and 'URL.revokeObjectURL(url)' in features and 'Nothing has been uploaded' in features, 'Photography preview remains browser-local and releases object URLs')
check(all(ip in features for ip in ['192.0.2.', '198.51.100.', '203.0.113.']), 'Network Lab uses documentation-only RFC 5737 addresses')
check('fetch(' not in features and 'WebSocket(' not in features and 'nmap ' not in features.lower(), 'Interactive Network Lab makes no network connection or scan')
check('Northstar Tools' in features and 'fictional' in features.lower() and 'private-data collection' in features, 'OSINT example is fictional and documents scope boundaries')
check('Math.log2' in features and 'monthlyKwh' in features and 'monthlyCost' in features, 'Exposure and energy demonstrations calculate from explicit input formulas')
check('animationPlayState: fanSpeed === 0 ? \'paused\' : \'running\'' in features, 'Zero-output fan model remains stationary')
check('QuickNavigator' in app and 'activeSection' in app and 'scroll-progress' in app, 'Section navigator and reading progress are integrated')
check("const [hovered, setHovered] = useState(false)" in features and "onMouseEnter={() => setHovered(true)}" in features and "onMouseLeave={() => setHovered(false)}" in features, 'Section sidebar expands on pointer hover and collapses on pointer leave')
check("const [pinned, setPinned] = useState(false)" in features and "aria-pressed={pinned}" in features and "aria-expanded={expanded}" in features, 'Section sidebar can be pinned open and exposes its expanded state accessibly')
check("matches(':focus-visible')" in features and "onBlurCapture" in features and "tabIndex={expanded ? 0 : -1}" in features, 'Section sidebar expands for keyboard focus and removes hidden links from tab order')
check('quick-navigator-rail-label' in features and 'quick-navigator-rail-index' in features and 'activeIndex / featureSections.length' in features, 'Collapsed sidebar preserves a compact active-section indicator')
check("'(hover: none)'" in features and 'setPinned(false)' in features, 'Touch navigation uses a tap toggle rather than requiring hover')
check('.quick-navigator.is-expanded .quick-navigator-links' in (ROOT / 'src/styles.css').read_text(encoding='utf-8') and 'visibility: hidden' in (ROOT / 'src/styles.css').read_text(encoding='utf-8'), 'Collapsed links are visually hidden and reflow into the expanded sidebar')

# Backend frontend contract.
check("VITE_SUPABASE_URL" in backend and "VITE_SUPABASE_ANON_KEY" in backend, 'Frontend backend configuration uses only public Supabase URL and anon key')
check('SUPABASE_SERVICE_ROLE_KEY' not in backend and 'service_role' not in backend, 'No Supabase service-role key or privileged credential is included in frontend backend client')
check('sessionStorage' in backend and 'legion-portfolio-admin-session-v1' in backend, 'Admin session persistence is tab-scoped')
check('mailto:' in backend_ui and 'No message is stored by the website' in backend_ui, 'Unconfigured inquiry form has an honest email fallback')
check('analytics are off by default' in backend_ui.lower() and 'choice !== \'accepted\'' in backend_ui, 'Analytics are opt-in and consent-gated')
check('if (!backendConfig.configured) return null' in backend_ui, 'Privacy consent banner is hidden when analytics are not available')
check('resetTurnstile()' in backend_ui and backend_ui.count('resetTurnstile(); setCaptcha') >= 2, 'One-use verification tokens are reset after inquiry and comment attempts')
check('useCallback((token: string) => setCaptcha(token), [])' in backend_ui, 'Turnstile callback remains stable across inquiry form state changes')
check('.photo-lightbox-panel' in features and "event.key === 'Escape'" in features and "event.key !== 'Tab'" in features, 'Photo viewer traps keyboard focus and closes on Escape')
check('allowlist' in backend_ui.lower() and 'verifyAdmin' in backend and 'Row Level Security' in backend_ui, 'Admin UI checks a database allowlist and leaves authorization to RLS')
check('dialogRef' in backend_ui and 'onCloseRef.current()' in backend_ui and "event.key !== 'Tab'" in backend_ui, 'Admin dialog traps keyboard focus and closes on Escape')

# PostgreSQL security model.
for table in ['admin_users', 'inquiries', 'comments', 'page_views', 'submission_rate_limits', 'admin_activity']:
    check(f'alter table public.{table} enable row level security;' in sql, f'RLS enabled on {table}')
check('for all to authenticated using ((select public.is_portfolio_admin()))' in sql, 'Inquiry management is administrator-only')
check("status = 'approved' or (select public.is_portfolio_admin())" in sql, 'Public comment read policy returns approved comments only')
check('grant execute on function public.consume_portfolio_quota(text,text,integer) to service_role;' in sql, 'Atomic quota function is restricted to service role')
check('revoke all on function public.consume_portfolio_quota(text,text,integer) from public, anon, authenticated;' in sql, 'Public roles cannot invoke the quota function')
check('create trigger inquiries_admin_audit after update or delete' in sql and 'create trigger comments_admin_audit after update or delete' in sql, 'Admin inquiry and comment updates/deletes produce audit entries')
check('grant select on public.comments to anon;' in sql and 'grant all on public.admin_users' in sql and 'grant select on public.page_views, public.admin_activity to authenticated;' in sql, 'Table grants separate public comment reads from private admin data')

# Server-side Edge Function defenses.
check("origin !== ALLOWED_ORIGIN" in edge and 'PORTFOLIO_ALLOWED_ORIGIN' in edge, 'Edge Function enforces an exact allowlisted Origin')
check("payload.website.trim()" in edge, 'Submission endpoint includes a honeypot')
check('consume_portfolio_quota' in edge and "inquiry: 4, comment: 6, page_view: 60" in edge, 'Submission endpoint has server-side rate quotas')
check('verifyTurnstile' in edge and 'TURNSTILE_SECRET_KEY' in edge and 'service_role' not in backend, 'Turnstile verification is server-side; service secrets are not in the browser bundle')
check("message.length < 10 || message.length > 5000" in edge and "body.length < 3 || body.length > 1000" in edge, 'Inquiry and comment payloads are length-validated server-side')
check('crypto.subtle.importKey' in edge and 'HMAC' in edge and 'raw address is neither stored nor logged' in edge, 'Rate-limit network identifier is HMAC-derived rather than stored raw')
check('readLimitedBody' in edge and 'Array.isArray(parsed)' in edge and 'JSON.parse(rawBody)' in edge, 'Edge Function bounds streamed request bodies and rejects non-object JSON')
check("'/rest/v1/'" in sw and "'/auth/v1/'" in sw and "'/functions/v1/'" in sw and "'/storage/v1/'" in sw, 'Service worker explicitly bypasses database, auth, function, and storage APIs')
check("request.method !== 'GET'" in sw and 'legion-portfolio-shell-v10' in sw and "'/og-card.png'" in sw and "'/favicon.ico?v=20261109-3'" in sw, 'Service worker caches only GET static resources and precaches the share image and refreshed favicon set')
check("const isSoundToggle = interactive.classList.contains('sound-toggle')" in sound and '!isSoundToggle && now - lastActionAt < 35' in sound, 'Sound mute confirmation bypasses rapid-action debounce so the final cue is not lost')

failures = [label for ok, label in checks if not ok]
print(f"\n{len(checks) - len(failures)}/{len(checks)} checks passed.")
if failures:
    print('Failures:')
    for label in failures:
        print(f' - {label}')
    sys.exit(1)
