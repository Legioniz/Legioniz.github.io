# Production quality and release controls

The portfolio release pipeline now treats production quality as a repeatable gate rather than a one-time visual review.

## Implemented controls

### Performance

- Recruiter View is dynamically imported and rendered only when requested, with responsive WebP/JPEG portrait sources and high-priority loading for the initial-view image.
- Profile images use responsive WebP/JPEG source sets, dimensions, lazy loading, and asynchronous decoding.
- Existing Canvas effects are adaptive, frame-limited, and paused outside their useful viewport; reduced-motion and Save-Data profiles are respected.
- `scripts/production-audit.mjs` measures emitted JavaScript/CSS sizes, compressed transfer sizes, responsive profile image size, and total `dist/` footprint against explicit budgets.
- `.lighthouserc.json` runs three Lighthouse samples against the main portfolio and Recruiter View, with accessibility, SEO, best-practices, LCP, CLS, and blocking-time assertions. Reports remain local to the CI workspace and are attached privately to the workflow run for 14 days.
- The service-worker shell cache is versioned and excludes Supabase REST, Auth, Functions, and Storage APIs.

### Accessibility and responsive behavior

- Named navigation and main landmarks, skip links, focus indicators, labelled forms, semantic disclosures, and Escape/focus handling for interactive dialogs remain part of the site.
- Recruiter View adds a focused page heading, labelled section navigation, 44px minimum touch targets for primary touch controls, responsive breakpoints, and print-specific styling.
- `tests/recruiter-view-browser-qa.py` checks real-browser route behavior, controls, basic accessible names, image alternatives, opener isolation, print mode, keyboard interaction, and viewport overflow from 320px through desktop widths.
- Static checks are useful regression controls, not a substitute for a screen-reader review or full WCAG conformance audit.

### Security and privacy

- Frontend code uses only the public Supabase URL and anon key. Service-role credentials remain server-side.
- Database access is governed by Row Level Security; the submission Edge Function applies allowed-origin checks, validation, rate quotas, honeypot handling, and server-side Turnstile verification when configured.
- Analytics require explicit opt-in. The service worker bypasses backend API traffic.
- External links that open a new tab use `rel="noopener noreferrer"`.
- Dependabot checks npm and GitHub Actions dependencies weekly; CI audits production dependencies for high-severity advisories.
- GitHub Pages does not provide repository-controlled arbitrary HTTP response headers. If the site is moved behind a host that supports custom headers, configure CSP, HSTS, `X-Content-Type-Options`, `Permissions-Policy`, and a deliberate `Referrer-Policy` at that host. Do not assume a static `_headers` file is honored by GitHub Pages.

### SEO and discoverability

- Canonical URL, descriptive metadata, Open Graph, Twitter card metadata, and Person JSON-LD are included.
- `robots.txt`, `sitemap.xml`, a web app manifest, and favicons ship with the root deployment.
- The recruiter profile is a query-string view of the root page. The canonical URL intentionally remains the root portfolio; no duplicate URL is submitted to the sitemap.

### Reliability and deployment

- Runtime error fallback retains email, GitHub, and PDF access, including a link into Recruiter View.
- The no-JavaScript boot fallback remains available.
- CI runs source checks, adaptive tests, cross-file integrity, feature/security checks, production-source SEO/accessibility/privacy checks, stylesheet-browser tests, strict TypeScript, production build, bundle budgets, Lighthouse CI, Chromium interaction/motion tests, and recruiter route/mobile tests before deploying.
- Pull requests run verification but do not deploy. The deploy job receives Pages write and OIDC permissions only after verification succeeds.

## What is not claimed

- Bundle budgets are not Lighthouse scores. The CI Lighthouse run is a lab regression check, not field Core Web Vitals. Real-user measurements must still be collected on the deployed site.
- Static and browser automation do not certify WCAG conformance. Screen-reader testing and human contrast review are still required.
- GitHub Actions deployment must run successfully before a release can be called deployed.
- Supabase inquiry storage, owner console, moderation, and consent-gated analytics remain inactive until the owner configures the real project, secrets, SQL migration, and Edge Function.


## Design and motion regression gate

The `test:design-browser` job loads the production stylesheet into Chromium and checks hero mask state, full and recruiter timeline rails, selected Network Lab motion, keyboard focus visibility, motion-off content visibility, economy-profile timings, reduced-motion timing, and 320px overflow. It deliberately reports itself as a stylesheet/browser fixture; the compiled React application is still tested separately by recruiter and interaction browser suites after Vite build.


## GitHub Pages Jekyll packaging

The application is compiled by Vite into `dist/` first. The workflow intentionally omits setup-node npm caching until a package lockfile is committed, avoiding a cache setup failure on a repository that has no lockfile. The GitHub Actions workflow then copies `.github/jekyll/_config.yml` into that generated output and invokes `actions/jekyll-build-pages@v1` with `source: ./dist` and `destination: ./_site`. The Jekyll action packages the already-built static application; it does not compile React or TypeScript. The workflow validates `_site/index.html`, assets, and the public PDF resources before uploading `_site/` to GitHub Pages.
