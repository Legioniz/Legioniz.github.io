# Production quality and release controls

The portfolio uses production verification as a repeatable release gate—not a one-time visual review. This document records the controls that are actually wired into the current React/Vite, GitHub Pages, and Supabase architecture.

## Implemented controls

### Performance and resilience
- Recruiter View is a separately loaded route view; optional portfolio experiments and backend panels are lazy-loaded.
- Profile images use responsive WebP/JPEG sources, intrinsic sizing, lazy loading where appropriate, asynchronous decoding, and a fallback.
- Canvas effects use bounded particle counts, a frame-rate cap, viewport pausing, and data-saver/device-quality profiles. CSS remains responsible for layout.
- OS reduced-motion preference is honored by default before first paint and in React. A visitor can explicitly choose motion on or off; the system preference remains the default when no saved override exists.
- `scripts/production-audit.mjs` measures JS/CSS sizes, compressed transfer sizes, responsive profile images, and total build footprint against explicit budgets.
- Lighthouse CI audits both the full portfolio and Recruiter View with multiple samples and explicit accessibility, SEO, best-practice, LCP, and CLS gates. Reports stay private to the CI run; Lighthouse is a lab regression tool, not field Core Web Vitals.
- The service worker caches the static shell only, uses a versioned cache, and bypasses Supabase REST, Auth, Functions, and Storage requests.

### Accessibility and responsive behavior
- The implementation target is WCAG 2.2 AA, as detailed in [UI-UX-ENGINEERING-STANDARD.md](./UI-UX-ENGINEERING-STANDARD.md). Automated checks do not certify conformance.
- Named navigation/main landmarks, skip links, semantic disclosures, labelled forms, visible keyboard focus, dialog focus management, and responsive Recruiter View/print styles are part of the product.
- Command palette supports combobox/listbox semantics, arrow/Home/End/Enter navigation, Escape dismissal, focus containment, and focus restoration.
- Project Laboratory uses the WAI-ARIA tabs pattern: associated tab panels, selected state, roving focus, arrow-key navigation, and Home/End.
- The gallery and project dialogs support keyboard navigation and Escape; touch layouts do not rely on hover.
- The compiled-app accessibility regression suite checks both full and recruiter views in dark/light themes at 320, 360, 390, 430, 768, 1024, 1280, and 1440 CSS pixels. It audits accessible-name smoke coverage, landmarks, image alternatives, duplicate IDs, ARIA references, in-page links, hidden focusables, keyboard-focus visibility, new-tab opener isolation, and page-level horizontal overflow.
- Existing browser tests also cover project routing, keyboard interactions, motion, print mode, comment workflows, and layout integrity. Manual screen-reader testing, zoom/reflow review beyond the viewport proxy, and target-spacing exception review remain separate requirements.

### Security and privacy
- Browser code uses only public Supabase configuration; the service-role key, Turnstile secret, and rate-limit HMAC secret remain server-side.
- PostgreSQL Row Level Security and the administrator allowlist define access to private inquiries, moderation, analytics, and audit records. UI state does not grant permission.
- The submission Edge Function enforces an exact origin allowlist, bounded request bodies, strict JSON field types, length and format validation, honeypot, atomic rate quotas, HMAC-derived rate-limit buckets, and server-side Turnstile verification when configured.
- Turnstile verification binds each challenge to the configured hostname and the expected inquiry/comment action. If Turnstile is configured, invalid verification fails closed.
- Analytics require explicit visitor opt-in and store only the documented minimal session/path/time data. Raw IP addresses are not persisted by the portfolio intake rate-limit process.
- External links that open a new tab use opener isolation. Dependabot checks npm and Actions dependencies; production dependencies are audited in CI.
- GitHub Pages does not provide repository-controlled arbitrary response headers. Do not claim that a static `_headers` file enables CSP/HSTS there. If moved to a suitable edge host, define and test CSP, HSTS, `X-Content-Type-Options`, `Permissions-Policy`, and a deliberate `Referrer-Policy`.

### SEO and discoverability
- The HTML shell carries a descriptive title/description, canonical URL, Open Graph/Twitter image metadata, language, crawler directives, sitemap, manifest, and favicons.
- Structured data uses a Schema.org `ProfilePage` with the owner represented as its `Person` main entity. Keep structured data aligned with visible page content.
- The recruiter view is a query-string view, not a separate canonical URL; the canonical URL remains the root portfolio.
- Search indexing and rich-result display are not guaranteed by markup. Maintain original visible content, crawlable links, a valid sitemap, and accurate external identity links.

### Reliability and deployment
- The static boot/no-JavaScript fallback provides direct contact and CV links; a React error boundary preserves key contact paths if rendering fails.
- Release verification includes preflight, adaptive tests, cross-file integrity, security/features, production-source SEO/accessibility/privacy checks, stylesheet-browser tests, TypeScript, Vite build, bundle budgets, Chromium interaction/motion suites, compiled Recruiter View checks, and the compiled full/recruiter accessibility regression.
- CI validates the compiled `dist/` artifact and uploads it directly to GitHub Pages; Jekyll repackaging is not used.
- Third-party GitHub Actions are pinned to full commit SHAs. Dependabot monitors npm and Actions dependencies.
- The deploy job receives Pages write and OIDC permissions only after verification passes. Pull requests do not deploy.

## What is measured—and what is not claimed
- Core Web Vitals targets are LCP ≤ 2.5 seconds, INP ≤ 200 milliseconds, and CLS ≤ 0.1 at the 75th percentile. Lighthouse does not replace Search Console field data.
- Static and browser automation are regression controls, not a formal WCAG certification, screen-reader audit, penetration test, or legal privacy assessment.
- A successful commit or CI build is not the same as a successful Pages deployment. A release is called deployed only after the deploy workflow reports success for that exact commit.
- Supabase features require the currently deployed database schema, Edge Function, and matching environment secrets to remain in sync. Never publish privileged credentials.

## Required maintenance
- Run focused keyboard, mobile, zoom/reflow, and OS reduced-motion checks after interface changes.
- Review npm/Actions dependency alerts weekly through Dependabot and audit high-severity production findings before release.
- Re-run both full and recruiter Lighthouse audits after major visual, route, asset, or dependency changes.
- Keep the visible project claims, CV, source data, sitemap, metadata, and structured data synchronized.
- Use [UI-UX-ENGINEERING-STANDARD.md](./UI-UX-ENGINEERING-STANDARD.md) as the feature acceptance checklist and [VISUAL-DESIGN-SYSTEM.md](./VISUAL-DESIGN-SYSTEM.md) for the visual language.
