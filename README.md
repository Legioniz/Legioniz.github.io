# LEGIONIZ - Personal Portfolio

Professional portfolio of **King Art D. Pacumberto**, a BSIT student at the Polytechnic University of the Philippines - Quezon City. The site presents software and embedded projects, IT and food-service experience, student-government participation, technical-team leadership, audiovisual production, esports livestream operations, music, badminton, volunteer photography, public-source OSINT, and foundational lab-based network-security practice.

## Stack

- React 19 + TypeScript
- Vite 8
- Custom CSS and Canvas effects (no animation framework dependency)
- A compact adaptive runtime profiler for viewport, orientation, pointer type, browser visual viewport, reduced-motion, Save-Data, device memory, and CPU hints
- Context-aware synthesized Web Audio cues with distinct sound signatures for navigation, project-card hover, controls, disclosures, keyboard focus, text fields, selects, submits, toggles, filters, project open/close, downloads, and copy actions; no audio files or additional runtime dependency
- GitHub Actions + GitHub Pages deployment
- Supabase Auth, PostgreSQL/RLS, server-side inquiry and public-comment intake, moderation, opt-in analytics, and owner console. The production build is connected to the dedicated Singapore project; pending comments stay private until the owner approves them.

## Design and engineering standards

The portfolio's working UI/UX, accessibility, responsive, performance, SEO, privacy, security, and release criteria are documented in [UI-UX-ENGINEERING-STANDARD.md](./UI-UX-ENGINEERING-STANDARD.md). The creative system and visual direction remain documented in [VISUAL-DESIGN-SYSTEM.md](./VISUAL-DESIGN-SYSTEM.md).

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev
```

This portfolio uses development port **5174** (instead of Vite’s default 5173) and preview port **4174**. Open `http://localhost:5174/` for the development site. Both ports are strict: if the selected port is already occupied, Vite will stop with an error instead of silently switching ports.

## Quality checks, backups, and production build

```bash
npm run check          # fast source/content/config preflight
npm run test:adaptive  # dependency-free adaptive-profile tests
npm run test:integrity  # imports, assets, CSS tokens, links, and unused-export checks
npm run test:features  # feature integration and backend security source checks
npm run test:production-source # recruiter, SEO, accessibility, mobile, privacy, and production-source checks
npm run test:design-browser # Chromium stylesheet, motion, and reduced-motion checks
npm run test:recruiter-browser # real Chromium recruiter-view routing, layout, print, and keyboard tests
npm run test:accessibility-browser # compiled full/recruiter views, keyboard semantics, and 320px reflow
# CI additionally runs Lighthouse CI against both the full site and recruiter view
npm run test:interactions # Chromium/Playwright project interaction and UI sound tests
npm run test:motion       # Chromium/Playwright section, masthead, disclosure, and reduced-motion tests
npm run backup         # checksum-verified local source snapshot
npm run backup:verify  # verify the newest snapshot
npm run verify         # preflight + all source/security/browser suites + TypeScript + Vite build + bundle audit
npm run preview        # preview production output
```

Install the test-only Python dependencies with `python -m pip install -r requirements-test.txt` and install the matching Chromium browser with `python -m playwright install chromium`. For a release-ready local run, use `npm run release`. It creates a verified backup first, then runs the preflight, adaptive, cross-file integrity, feature/security, production-source, design-browser, strict TypeScript project, Vite production build, bundle-budget checks, desktop/touch interactions, scroll/motion regressions, compiled Recruiter View browser tests, and full/recruiter accessibility checks across eight viewport widths and both themes. The production site is generated in `dist/`; the preview server uses `http://localhost:4174/`. The backup tool retains the five newest snapshots under `.portfolio-backups/` and records SHA-256 checksums. That local backup directory is ignored by Git and is never deployed.

## Deploy to GitHub Pages

The included workflow is configured for the root GitHub Pages user site `https://legioniz.github.io/`. Follow [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md): create the empty public repository `Legioniz.github.io`, then run `PUSH-TO-GITHUB.cmd` from the extracted folder. In **Settings -> Pages**, select **GitHub Actions** as the source. The workflow runs the full React/Vite verification, browser tests, and Lighthouse audits, then validates and uploads the compiled `dist/` directory directly with `actions/upload-pages-artifact (pinned to a full commit SHA)`. It deliberately skips Jekyll packaging so the production HTML and hashed JS/CSS bundles are deployed unchanged. The `actions/deploy-pages (pinned to a full commit SHA)` step runs only after verification and artifact validation pass. Do not add a second Pages workflow; use the existing one to avoid competing deployments.

The deployment history, including the earlier Jekyll packaging failure and the current direct Vite artifact workflow, is consolidated in [CHANGELOG.md](./CHANGELOG.md). The current workflow and [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) are the operational source of truth. Third-party workflow actions are pinned to full commit SHAs and monitored by Dependabot.

The public URLs are `https://legioniz.github.io/` (full portfolio) and `https://legioniz.github.io/?view=recruiter` (Recruiter View). `START-PORTFOLIO-LAN.cmd` launches a same-Wi-Fi preview; it is not a public Internet tunnel. This source package intentionally omits `node_modules/` and `dist/`.

## Recruiter view and production checks

Open the concise, shareable recruiter profile with `/?view=recruiter`. It reuses the same project, skills, experience, education, achievements, and contact data as the full site, presents concise professional information and direct contact links, and can hand visitors into the full project case studies.

The production workflow includes source-level SEO, privacy, responsive, accessibility, and security checks; a compiled asset and bundle-size audit; Lighthouse CI against both the full portfolio and recruiter view; and Chromium browser checks for recruiter routes, keyboard behavior, print styling, narrow-screen overflow, and accessibility regressions on both compiled views. Lighthouse HTML/JSON reports are written to `.lighthouseci/reports` in CI rather than uploaded to public temporary storage. Passing these checks is a release gate, not a claim of live deployment or full WCAG certification.

## Site features

- Responsive technical-field-journal art direction with warm paper/ink surfaces, signal-coral accents, annotated geometry, and dark/light themes
- Annotated geometric practice map and lightweight Canvas particle visualization
- Project category filters, right-side quick-view pop-outs on desktop hover, and detailed project case-study dialogs opened by click/tap/Enter/Space; each project can be opened directly with `?project=project-id`, shared by copying its URL, and closed with browser back/forward navigation
- Keyboard command palette (`Ctrl+K` / `Cmd+K`) with shortcuts to the labs, photography workspace, network simulation, OSINT journal, activity record, and owner console
- Scroll progress and bidirectional section reveals driven by IntersectionObserver: content eases in when entering the reading area and eases out when leaving, then re-enters when scrolling back
- Direction-aware floating masthead: hides after deliberate downward scroll and reappears on upward scroll; stays available near the page top, while the mobile menu is open, and during keyboard focus
- Adaptive Canvas particle field (maximum 42 fine-pointer desktop / 18 coarse-pointer particles; downshifts to 12 on constrained devices and 0 for Save-Data or an explicit motion pause; 24 fps cap and adaptive pixel ratio)
- Collapsible skill categories, work-history entries, extracurricular details, and project-scope notes using native keyboard-accessible disclosures
- Progressive disclosure animation where supported; native open/close behavior remains available as a lightweight fallback
- Decorative orbit, project-art, and skills animations pause outside the viewport and resume near view; the capability strip stays static for readability
- Decorative motion follows the operating system's reduced-motion preference by default. Visitors can explicitly pause or opt in from the header; the preference is stored under the versioned `legion-portfolio-motion-v7` key.
- Asymmetric 12-column project case-study board with a dedicated horizontal treatment for the photography project
- Side-by-side project comparison for purpose, contribution, status, stack, and documented capabilities
- Project Laboratory with an exposure-triangle / EV100 calculator and a user-adjustable appliance-energy estimator; both are explicitly labelled local teaching models
- Interactive capability map connecting supplied skills to documented portfolio projects without invented proficiency scores
- Browser-local photography workspace with a responsive gallery, aspect-ratio filters, a before/after treatment slider, Escape-to-close viewer, and strict file / memory limits; selected images are never uploaded. It starts empty until actual portfolio images are added.
- Fictional Network Lab with RFC 5737 documentation-only addresses, example service ports, and a toggleable database firewall simulation; it makes no network connections or scans
- OSINT verification journal with a fictional case, source-quality checklist, and explicit personal-data / authorization boundaries
- Arduino hardware model showing a simplified LM35-to-PWM response curve, labelled as an explanatory model rather than exact firmware
- Developer Notebook and a clearly qualified “Currently Building” board
- Persistent section quick navigator, active-section tracking, existing scroll progress, and responsive, keyboard-accessible navigation
- Project cards behave as full keyboard-operable launch surfaces; desktop hover reveals a right-side quick-view panel, while click/tap/Enter/Space opens the full project introduction with role, overview, technology, project scope, and repository link where available
- Project dialogs animate into view, manage focus, support Escape-to-close, and restore focus to the project card
- Visible keyboard focus states in both themes, a skip-to-content link, and explicit light-theme contrast tuning
- One-line `KA` monogram lockup with nowrap layout rules and a responsive brand header
- Synthesized, target-specific interface sounds for navigation and link hover, project hover, controls, disclosures, keyboard focus, form fields, submits, project open/close, downloads, and copy; off by default and enabled only by an explicit visitor choice, persistent sound toggle in the header, no audio assets
- Responsive profile portrait with WebP/JPEG source sets, intrinsic dimensions, lazy loading, and initials fallback
- Versioned, opt-in service-worker updates and a same-origin static-asset cache; form, auth, database, and storage API traffic is excluded from caching
- Dedicated OSINT and defensive network-practice note with explicit authorized-lab scope
- Direct GitHub, LinkedIn, and email links across the full portfolio, recruiter profile, and progressive fallbacks

## Personal documents

The portfolio intentionally does not publish downloadable resumes, CVs, or other personal application documents. Visitors can review the information presented directly in the Full Portfolio and Recruiter View, then use the contact links to get in touch.

## Inquiries, moderated comments, analytics, and owner administration

The production site is connected to the dedicated Supabase project in Singapore. Its PostgreSQL schema, row-level security policies, owner allowlist, and public `portfolio-submit` Edge Function are deployed. The GitHub Pages workflow builds the frontend with the project's public URL and publishable API key; the browser never receives a server-side secret.

- Visitors can submit a public note using only a display name and comment. The Edge Function validates it and inserts it as `pending`; no Auth account or email address is required.
- The public feed reads only `approved` comments. A successful submission is acknowledged immediately but does not appear in the public feed until the owner approves it in the Admin console.
- The feed supports manual refresh and uses uncached API reads. An empty feed means there are no approved notes yet; it does not mean the composer is unavailable.
- The owner console provides searchable moderation queues for pending, approved, hidden, and archived comments, with edit, approve/publish, hide, archive, export, and permanent delete actions.
- Owner access uses Supabase Auth plus the confirmed-email database allowlist. Row Level Security enforces the boundary for inquiries, comments, the allowlist, page views, and admin activity.
- Analytics are off by default and require visitor consent. The minimal record contains a random session UUID, page path, and timestamp. The submission function derives a short-lived HMAC rate-limit bucket; it does not store raw IP addresses.
- Cloudflare Turnstile is optional. Its site key is public; its secret belongs only in Supabase Function secrets. The current project does not require a Turnstile token unless the matching server secret is configured.

For local development, add the public values from `.env.example` to `.env.local`; without them, the composer remains disabled and the inquiry form uses its honest email fallback. Follow `BACKEND-SETUP.md` (also served as `/BACKEND-SETUP.md`) before moving or reconfiguring the project. Never put a Supabase service-role/secret key, Turnstile secret, rate-limit HMAC secret, or other server secret in `src/`, `public/`, GitHub Pages build variables, or browser-side JavaScript. See `VISUAL-DESIGN-SYSTEM.md` for the creative direction, layout rules, and interaction principles.

## Responsive and progressive enhancement

CSS owns the layout through fluid sizing, breakpoints, orientation rules, dynamic viewport units, and component container queries. Browser zoom is not overridden: the page reflows at the browser's effective CSS viewport size. A lightweight TypeScript profiler observes `ResizeObserver`, `VisualViewport`, `matchMedia`, orientation/resize, and optional device/network hints, then adjusts only decorative Canvas quality. When those APIs or hints are absent, safe defaults and ordinary `resize` events keep the site usable. Canvas context failure falls back to the static CSS art; remote fonts fall back to system fonts; a React error boundary retains direct contact and public CV links; the initial HTML contains boot and no-JavaScript fallbacks.

## Interaction sounds and project previews

The interface sound manager is delegated at the document level, so links, buttons, disclosures, project cards, filters, form controls, and dynamically rendered modal controls receive feedback without individual component handlers. Hover signatures vary by target: header/footer navigation, content links, project cards, controls, and disclosure rows have different note shapes. Focus, text-field changes, select changes, form submissions, toggles, filters, project open/close, and copy actions have distinct action cues. Sound is off by default and remains silent until a visitor explicitly enables it. Browsers still require a real user gesture before Web Audio can play; the sound-toggle action itself gives a short confirmation cue, and the first click, tap, or keyboard action unlocks the context for subsequent cues. The preference is stored as `legion-portfolio-sound-v2`.

On fine-pointer desktop layouts, hovering or keyboard-focusing a project card slides a quick-view panel in from the right. Clicking anywhere on the card, or pressing Enter/Space while focused, opens the complete project introduction. Touch layouts skip the hover-only panel and open the same introduction on tap. Projects without a live demo only expose the documented overview and repository link; no fake launch destinations are shown.

## Content maintenance

- `src/config.ts`: name, public contact links, location, and availability note.
- `src/data.ts`: projects, core skills (including OSINT/security foundations), experience, education, achievements, and activities. Project-specific technologies stay in each project's stack rather than being presented as self-rated proficiency.
- `src/App.tsx`: page structure, shareable project case studies, project launch cards, modal introductions, and adaptive UI hooks.
- `src/PortfolioFeatures.tsx`: learning labs, skill map, local photography workspace, fictional Network Lab, OSINT workflow, hardware model, developer notes, current work, quick navigator, and service-worker update notice.
- `src/BackendPanels.tsx` and `src/backend.ts`: inquiry/comment experiences, consent controls, owner dashboard, and a small Supabase REST/Auth client that only exposes the public anon key.
- `supabase/migrations/202611090001_portfolio_backend.sql` and `supabase/functions/portfolio-submit/index.ts`: RLS schema, allowlist, audit log, server-side submission validation, quota checks, and optional Turnstile verification.
- `public/sw.js` and `src/serviceWorker.ts`: versioned static cache and user-controlled service-worker update flow.
- `src/sound.ts`: delegated pointer, focus, change, submit, and click listeners for current and dynamically rendered controls; generates target-specific synthesized sound patterns with Web Audio and safely respects autoplay restrictions.
- `src/adaptive.ts`: environment profile and coalesced observer with API fallbacks.
- `src/reveal.ts`: progressive, bidirectional IntersectionObserver reveal controller; it observes dynamically filtered project cards without reinitializing the entire page observer, leaves content visible when motion is disabled or observer APIs are unavailable, and includes a timeout safety path for browsers that fail to dispatch the initial observer batch.
- `src/masthead.ts`: independently testable direction-aware masthead controller with batched scroll updates, top/menu/focus guards, and scroll-progress updates.
- `src/styles.css` and `src/layout-integrity.css`: shared design tokens plus a connected geometry layer for bounded containers, shrink-safe flex/grid children, coordinated breakpoints, and collision-aware notices. `src/main.tsx` imports the integrity layer immediately after the base stylesheet; it is exercised by the production-source and Chromium design suites.
- `scripts/portfolio.mjs`: preflight, release orchestration, and checksum-verified backups.
- `tests/adaptive-smoke.ts`: dependency-free device-profile tests.
- `tests/feature-security-qa.py`: source checks for interactive lab safety boundaries, project links, photo limits, RLS, submission validation, and no client-side service-role secret.
- `tests/interactions-browser-qa.py` and `tests/interaction-fixture.html`: optional browser tests against the exact compiled sound module and shipped stylesheet, covering hover pop-out, project click/keyboard opening, touch behavior, motion pause, target-specific hover sounds, keyboard focus, text/select/submit cues, and disclosure feedback; requires Python Playwright and a Chromium-family browser.
- `tests/portfolio-motion-qa.py`: Chromium/Playwright test that compiles and loads the exact production reveal and masthead controllers, verifies section enter/exit/re-entry, dynamic project insertion, skill/education/achievement disclosure open-close transitions, motion-on-by-default behavior, explicit visitor pause, header movement by scroll direction, fallback behavior, and the one-line `KA` lockup at seven viewport widths. Requires global TypeScript (`tsc`), Python Playwright, and Chromium outside the deployed runtime. Run it with `npm run test:motion`.
- `SOURCES.md`: evidence and editorial notes for public-facing claims.

Smart Electrical Monitoring is described as a local demonstration using synthetic data, not a live utility integration. The TIMO award links to its published ranking. The current education and experience details follow the latest owner-supplied information. The OSINT and security-practice descriptions are owner-reported, self-directed experience and are labeled foundational; the named Medusa tool is described only in an authorized authentication-audit lab context. The uploaded profile image is stored as responsive, optimized WebP/JPEG derivatives under `public/profile/`, not as a large original PNG. Leadership responsibilities and event-production details are included from the owner's direct confirmation; no missing dates or titles have been invented. The light-theme coral and secondary metadata tokens have been darkened to maintain contrast on the warm paper background. The adaptive effect key intentionally ignores one-pixel layout changes so CSS/ResizeObserver can handle geometry without repeatedly rebuilding optional effects.


### Collapsible section navigator

The section navigator appears after the visitor moves beyond the hero area. It stays as a slim right-edge tab until hovered or keyboard-focused; click the toggle to pin or unpin it. On touch devices, tap the edge tab to open it.


## View Transition Lifecycle Fix

See [VIEW-TRANSITION-LIFECYCLE.md](./VIEW-TRANSITION-LIFECYCLE.md) for the Recruiter View/full portfolio lifecycle repair, observer cleanup/rebinding, history-scroll behavior, and regression test coverage.


Historical release notes, audits, and update reports are consolidated in [CHANGELOG.md](./CHANGELOG.md).


## Editorial motion release

The current source refines the shared charcoal/ivory/coral design system, hero mask reveal, project shared-element transitions, full and recruiter experience timeline, photo viewer navigation, and network diagram state feedback. Motion scales down for balanced/economy devices, touch layouts, and reduced-motion preferences. Run `npm run test:design-browser` for the stylesheet-level Chromium checks; full app build and browser tests run in the GitHub Actions release workflow.


## Hero visibility safeguard

The first-screen hero heading, eyebrow, supporting copy, actions, and visual are deliberately excluded from the global scroll-reveal observer. They use a dedicated, fail-open entrance sequence: the baseline styles keep all hero content visible, while motion only adds a brief transform/blur refinement. Pausing motion with the persistent header control removes the animation without hiding content. The heading also exposes a complete accessible sentence (`From a question to working systems.`) rather than relying on adjacent visual line fragments.

The service-worker shell cache is versioned as `legion-portfolio-shell-v7` for this visibility fix.


## Global layout integrity upgrade

The shared `src/layout-integrity.css` layer is imported directly by `src/main.tsx` after the base design system. It normalizes box sizing, applies `min-width: 0` to grid/flex content, bounds site and recruiter containers, coordinates the responsive layout breakpoints, prevents reveal transforms from expanding the document, and separates fixed privacy/update notices from page content. It is not a disconnected override: the production-source and Chromium design checks load and inspect it as part of the release verification.

## Public Markdown references

The public site also serves [llms.txt](https://legioniz.github.io/llms.txt), a short discovery index for text-first clients, with separate [profile](https://legioniz.github.io/profile.md), [project](https://legioniz.github.io/projects.md), and [experience](https://legioniz.github.io/experience.md) summaries. These files are maintained alongside the React source and are included in the sitemap. They provide text-first profile information and direct contact links; no personal documents are distributed.

## Repository hygiene and deployment secrets

- The committed `.env.example` contains names for public browser configuration only. Put real local values in ignored `.env.local` files.
- Configure production values through the hosting platform's environment settings or repository secrets. Never commit service-role keys, database passwords, private keys, access tokens, or populated environment files.
- Do not place private credentials in variables prefixed with `VITE_`; values exposed to the browser must be treated as public.
- `node_modules/`, `dist/`, test output, local reports, and local backup snapshots are generated or machine-specific and remain ignored. Use the lockfile to reproduce dependencies.
- If a credential is accidentally committed, revoke or rotate it immediately. Removing it from the latest commit does not erase copies from Git history.

The project’s tests and deployment checks are intended to validate the current source. A passing static or browser check is not a substitute for verifying live backend configuration and production permissions.
