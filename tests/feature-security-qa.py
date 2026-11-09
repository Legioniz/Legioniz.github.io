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
chrome = (ROOT / 'src/PortfolioChrome.tsx').read_text(encoding='utf-8')
backend_ui = (ROOT / 'src/BackendPanels.tsx').read_text(encoding='utf-8')
backend = (ROOT / 'src/backend.ts').read_text(encoding='utf-8')
recruiter = (ROOT / 'src/RecruiterView.tsx').read_text(encoding='utf-8')
sql = (ROOT / 'supabase/migrations/202611090001_portfolio_backend.sql').read_text(encoding='utf-8')
edge = (ROOT / 'supabase/functions/portfolio-submit/index.ts').read_text(encoding='utf-8')
sw = (ROOT / 'public/sw.js').read_text(encoding='utf-8')
deploy = (ROOT / '.github/workflows/deploy.yml').read_text(encoding='utf-8')
sound = (ROOT / 'src/sound.ts').read_text(encoding='utf-8')

# Core user-facing experience.
for section_id, label in [
    ('lab', 'Project Laboratory'), ('skills-map', 'interactive skill map'),
    ('photo-archive', 'local photography workspace'), ('network-lab', 'fictional Network Lab'),
    ('osint-journal', 'OSINT verification journal'), ('hardware-lab', 'Arduino hardware model'),
    ('notebook', 'developer notebook'), ('building', 'currently building board'),
]:
    check(f'id="{section_id}"' in features, f'{label} section is present')

check('project-compare' in chrome and 'Technologies' in chrome and 'Selected capabilities' in chrome, 'Project comparison uses documented project details')
check('new URLSearchParams(window.location.search).get(\'project\')' in app and "url.searchParams.set('project', project.id)" in app, 'Project case studies support direct, shareable query-string links')
check("window.addEventListener('popstate', syncRouteFromUrl)" in app and 'Copy project link' in app and 'openProject' in app and 'closeProject' in app, 'Project links synchronize with browser history and expose a copy action')
check("localStorage.getItem('legion-portfolio-motion-v7')" in chrome and "prefers-reduced-motion: reduce" in chrome, 'Intro sequence respects the saved motion choice and system reduced-motion preference')
check("file.size > 12 * 1024 * 1024" in features and '48 * 1024 * 1024' in features and '45_000_000' in features, 'Local photo viewer caps file count, total bytes, per-file size, and decoded dimensions')
check('URL.createObjectURL(file)' in features and 'URL.revokeObjectURL(url)' in features and 'Nothing has been uploaded' in features, 'Photography preview remains browser-local and releases object URLs')
check(all(ip in features for ip in ['192.0.2.', '198.51.100.', '203.0.113.']), 'Network Lab uses documentation-only RFC 5737 addresses')
check('fetch(' not in features and 'WebSocket(' not in features and 'nmap ' not in features.lower(), 'Interactive Network Lab makes no network connection or scan')
check('Northstar Tools' in features and 'fictional' in features.lower() and 'private-data collection' in features, 'OSINT example is fictional and documents scope boundaries')
check('Math.log2' in features and 'monthlyKwh' in features and 'monthlyCost' in features, 'Exposure and energy demonstrations calculate from explicit input formulas')
check('animationPlayState: fanSpeed === 0 ? \'paused\' : \'running\'' in features, 'Zero-output fan model remains stationary')
check('QuickNavigator' in app and 'activeSection' in app and 'scroll-progress' in app, 'Section navigator and reading progress are integrated')
check("lazy(() => import('./PortfolioFeatures')" in app
      and "lazy(() => import('./BackendPanels')" in app
      and "from './PortfolioChrome'" in app,
      'Full-site experiments and backend panels are split from the recruiter entry module')
check("const [hovered, setHovered] = useState(false)" in chrome and "onMouseEnter={() => setHovered(true)}" in chrome and "onMouseLeave={() => setHovered(false)}" in chrome, 'Section sidebar expands on pointer hover and collapses on pointer leave')
check("const [pinned, setPinned] = useState(false)" in chrome and "aria-pressed={pinned}" in chrome and "aria-expanded={expanded}" in chrome, 'Section sidebar can be pinned open and exposes its expanded state accessibly')
check("matches(':focus-visible')" in chrome and "onBlurCapture" in chrome and "tabIndex={expanded ? 0 : -1}" in chrome, 'Section sidebar expands for keyboard focus and removes hidden links from tab order')
check('quick-navigator-rail-label' in chrome and 'quick-navigator-rail-index' in chrome and 'activeIndex / featureSections.length' in chrome, 'Collapsed sidebar preserves a compact active-section indicator')
check("'(hover: none)'" in chrome and 'setPinned(false)' in chrome, 'Touch navigation uses a tap toggle rather than requiring hover')
check('.quick-navigator.is-expanded .quick-navigator-links' in (ROOT / 'src/styles.css').read_text(encoding='utf-8') and 'visibility: hidden' in (ROOT / 'src/styles.css').read_text(encoding='utf-8'), 'Collapsed links are visually hidden and reflow into the expanded sidebar')

# Backend frontend contract.
check("VITE_SUPABASE_URL" in backend and "VITE_SUPABASE_ANON_KEY" in backend, 'Frontend backend configuration uses only public Supabase URL and anon key')
check(all(name in deploy for name in ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_TURNSTILE_SITE_KEY']) and 'vars.VITE_SUPABASE_URL' in deploy and 'secrets.VITE_SUPABASE_URL' in deploy and 'pjuwrngnrrvdiwqspkic.supabase.co' in deploy, 'GitHub Pages build passes the public Supabase configuration into the production bundle')
check('headers.delete(\'Authorization\')' in backend and 'if (accessToken)' in backend, 'Anonymous requests use the publishable API key without misusing it as a JWT')
check("cache: options.cache ?? 'no-store'" in backend, 'Backend reads bypass stale browser and intermediary cache entries')
check("if (result?.ok !== true)" in backend, 'Public submissions require an explicit successful response before showing confirmation')
check("root.addEventListener('pointermove', onMove" in recruiter and "root.removeEventListener('pointermove', onMove" in recruiter and "matchMedia('(hover: hover) and (pointer: fine)')" in recruiter, 'Recruiter spotlight uses a cleaned-up delegated fine-pointer handler')
check('SUPABASE_SECRET_KEYS' in edge and 'USE_MODERN_SECRET' in edge and 'serviceKeyHeaders' in edge, 'Edge Function uses Supabase-injected modern server secret keys safely')
check('missing_server_credentials' in edge and "request.method === 'GET'" in edge, 'Edge Function exposes a non-sensitive readiness probe')
check('SUPABASE_SERVICE_ROLE_KEY' not in backend and 'service_role' not in backend, 'No Supabase service-role key or privileged credential is included in frontend backend client')
check('sessionStorage' in backend and 'legion-portfolio-admin-session-v1' in backend, 'Admin session persistence is tab-scoped')
check('mailto:' in backend_ui and 'No message is stored by the website' in backend_ui, 'Unconfigured inquiry form has an honest email fallback')
check('analytics are off by default' in backend_ui.lower() and 'choice !== \'accepted\'' in backend_ui, 'Analytics are opt-in and consent-gated')
check('if (!backendConfig.configured) return null' in backend_ui, 'Privacy consent banner is hidden when analytics are not available')
check('commentCaptcha' in backend_ui and 'turnstileToken: commentCaptcha' in backend_ui and 'turnstileToken: captcha' in backend_ui, 'Private inquiries and public notes submit independent single-use verification tokens')
check('useId().replace(/:/g, \'\')' in backend_ui and 'resetSignal' in backend_ui and 'window.turnstile?.remove?.' in backend_ui and backend_ui.count('<TurnstileChallenge ') == 2, 'Inquiry and public-note forms own separate Turnstile widgets with reset and cleanup lifecycle')
comments_panel = backend_ui.split('<aside className="comments-panel"', 1)[1].split('</aside>', 1)[0]
check('type="email"' not in comments_panel and 'autoComplete="email"' not in comments_panel and 'No email address or contact details are requested' in comments_panel, 'Public notes collect no email or contact-detail fields')
check("setComments(await fetchApprovedComments())" in backend_ui and 'commentsLoading' in backend_ui and 'commentsError' in backend_ui and 'TRY AGAIN' in backend_ui, 'Public comments show loading, failure, retry, and refreshed approved-feed states')
check("website: commentHoneypot" in backend_ui and 'maxLength={1000}' in backend_ui and 'commentBody.length.toLocaleString()' in backend_ui, 'Public note composer includes its own honeypot and bounded character counter')
check("'pending'" in backend_ui and 'APPROVE / PUBLISH' in backend_ui and 'HIDE' in backend_ui and 'ARCHIVE' in backend_ui and 'DELETE' in backend_ui, 'Admin comments support moderation status changes and permanent deletion')
check('admin-comment-filters' in backend_ui and 'commentSearch' in backend_ui and 'visibleComments' in backend_ui, 'Admin moderation queue supports status filters and search')
check('useCallback((token: string) => setCaptcha(token), [])' in backend_ui, 'Turnstile callback remains stable across inquiry form state changes')
check("aria-activedescendant" in app and 'role="combobox"' in app and 'role="listbox"' in app and 'role="option"' in app and "event.key === 'Enter'" in app and "event.key === 'ArrowDown'" in app and "previousFocus?.isConnected" in app, 'Command palette supports keyboard result selection, focus containment, and focus restoration')
check('id="lab-tab-exposure"' in features and 'aria-controls="lab-panel-exposure"' in features and 'tabIndex={labTab ===' in features and 'onKeyDown={handleLabTabKeyDown}' in features and 'role="tabpanel" tabIndex={0}' in features and "event.key === 'Home'" in features, 'Project Lab tabs use linked panels, roving focus, and arrow/Home/End keyboard operation')
check('aria-pressed={tab === item}' in backend_ui and 'role="group"' in backend_ui, 'Owner data-view controls expose their selected state to assistive technology')
check('action: string' in backend_ui and 'action,\n          theme:' in backend_ui and 'action="portfolio_inquiry"' in backend_ui and 'action="portfolio_comment"' in backend_ui, 'Inquiry and comment challenges carry distinct Turnstile actions')
check("payload.hostname === ALLOWED_HOSTNAME" in edge and "payload.action === expectedAction" in edge and "new URL(ALLOWED_ORIGIN).hostname" in edge, 'Turnstile verification binds tokens to the configured site hostname and expected form action')
check('function readText(value: unknown): string | null' in edge and 'name === null' in edge and 'display_name === null' in edge and 'session_id === null' in edge, 'Server-side intake rejects non-string JSON fields instead of coercing arbitrary objects')
check('.photo-lightbox-panel' in features and "event.key === 'Escape'" in features and "event.key !== 'Tab'" in features, 'Photo viewer traps keyboard focus and closes on Escape')
check('allowlist' in backend_ui.lower() and 'verifyAdmin' in backend and 'Row Level Security' in backend_ui, 'Admin UI checks a database allowlist and leaves authorization to RLS')
check('dialogRef' in backend_ui and 'onCloseRef.current()' in backend_ui and "event.key !== 'Tab'" in backend_ui, 'Admin dialog traps keyboard focus and closes on Escape')
check('requestAdminPasswordRecovery' in backend and 'auth/v1/recover?redirect_to=' in backend and 'https://legioniz.github.io/?auth=recovery' in backend, 'Password recovery requests target the production portfolio callback')
check("detail?.error_code === 'over_email_send_rate_limit'" in backend and 'detail.msg' in backend and 'detail.error_description' in backend and 'Please wait before requesting another link' in backend, 'Supabase Auth rate-limit responses explain the email quota instead of showing a generic HTTP status')
check('updateAdminPassword' in backend and "'/auth/v1/user'" in backend and "method: 'PUT'" in backend, 'Recovery session updates the password through Supabase Auth rather than local storage')
check('consumeAdminAuthRedirect' in backend_ui and "type === 'recovery'" in backend_ui and 'error_code' in backend_ui and 'history.replaceState' in backend_ui, 'Recovery callback consumes Supabase hash tokens and removes credentials from the address bar')
check('sessionStorage.setItem(ADMIN_RECOVERY_SESSION_KEY' in backend_ui and 'sessionStorage.removeItem(ADMIN_RECOVERY_SESSION_KEY)' in backend_ui, 'Recovery token is kept tab-scoped and cleared after use or link failure')
check('handleRecoveryRequest' in backend_ui and 'handlePasswordUpdate' in backend_ui and 'FORGOT PASSWORD?' in backend_ui and 'SET NEW PASSWORD' in backend_ui, 'Admin login offers password recovery and a working new-password form')
check("get('auth') === 'recovery'" in app and "hash.get('error_code')" in app, 'Recovery email return automatically opens the admin recovery screen')

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
check("request.method !== 'GET'" in sw and 'legion-portfolio-shell-v17' in sw and "'/og-card.png?v=20261109-4'" in sw and "'/favicon.ico?v=20261109-4'" in sw, 'Service worker caches only GET static resources and refreshes the shell cache for the palette asset release')
check("const isSoundToggle = interactive.classList.contains('sound-toggle')" in sound and '!isSoundToggle && now - lastActionAt < 35' in sound, 'Sound mute confirmation bypasses rapid-action debounce so the final cue is not lost')

failures = [label for ok, label in checks if not ok]
print(f"\n{len(checks) - len(failures)}/{len(checks)} checks passed.")
if failures:
    print('Failures:')
    for label in failures:
        print(f' - {label}')
    sys.exit(1)
