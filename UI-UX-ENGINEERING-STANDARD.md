# UI/UX and Web Engineering Standard

**Portfolio:** [King Art D. Pacumberto](https://legioniz.github.io/)  
**Repository:** [Legioniz/Legioniz.github.io](https://github.com/Legioniz/Legioniz.github.io)  
**Reviewed:** 9 November 2026  
**Status:** Living engineering standard; a release gate, not a claim of formal WCAG certification.

This document converts current usability, accessibility, performance, search, privacy, and application-security guidance into requirements for this portfolio. It is intended to guide implementation, code review, content changes, and regression testing.

## 1. Product and usability principles

Use Nielsen Norman Group's ten usability heuristics as the interaction baseline:

1. Keep users informed when something is loading, saving, copied, submitted, or unavailable.
2. Use language and patterns that match the visitor's expectations.
3. Provide clear exits, undo/cancel where appropriate, and predictable browser history.
4. Make visual and interaction patterns consistent across the full and recruiter views.
5. Prevent avoidable errors through constraints, validation, confirmation for destructive actions, and safe defaults.
6. Prefer visible choices and contextual instructions over requiring users to remember prior steps.
7. Make frequent actions efficient without hiding essential navigation.
8. Remove decoration that competes with the content or primary task.
9. Explain errors in plain language and provide a recovery path.
10. Add help where a task is complex; do not force visitors to learn the interface before using it.

**Portfolio application:** first-screen content should quickly explain who the owner is, what is being built, what evidence exists, and how to contact or download the public-safe CV. Long-form experiments remain secondary to the profile, work evidence, and contact path. Simulation labels, project status, assumptions, and boundaries must remain explicit.

Reference: [Nielsen Norman Group — 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/).

## 2. Accessibility baseline — WCAG 2.2 AA

The implementation target is WCAG 2.2 Level AA. A successful automated audit is useful evidence but does not prove conformance; manual keyboard and assistive-technology checks remain necessary.

### Perceivable
- Give meaningful images useful alternative text. Decorative imagery must be hidden from assistive technology.
- Keep body text at or above a 4.5:1 contrast ratio; large text may use 3:1. Non-text controls and meaningful graphics need sufficient contrast as well.
- Never use color as the sole signal for status, selection, or errors.
- Preserve document language, heading hierarchy, labels, form instructions, and status announcements.
- Reflow ordinary content at a 320 CSS-pixel viewport without two-dimensional scrolling. Test zoom and text enlargement, not just preset phone widths.

### Operable
- Every primary action must work with keyboard, touch, mouse, and assistive technology.
- Provide a visible focus indicator; focused controls must not be hidden beneath sticky headers, notices, or dialogs.
- Use native links, buttons, inputs, selects, and disclosures whenever they fit the task.
- For custom widgets, implement the complete keyboard pattern rather than adding ARIA roles alone. Tabs use one active tab stop, arrow-key movement, Home/End, associated panels, and correct selected state.
- Dialogs move focus inside on open, contain Tab navigation, close on Escape where appropriate, and return focus to the invoking control.
- Meet WCAG 2.2 target-size minimums (24 × 24 CSS px or a valid spacing/equivalent exception). Aim for 44 × 44 CSS px on important touch controls where layout permits.

### Understandable and robust
- Use consistent labels and navigation, explicit field labels, plain-language errors, and actionable recovery guidance.
- Announce asynchronous status changes without unexpectedly moving focus.
- Keep ARIA names aligned with visible text; avoid duplicate or conflicting roles.
- Test with keyboard-only navigation, zoom/reflow, a screen reader, and both pointer and touch interaction.

References: [WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/), [WAI — What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/), [WAI-ARIA APG Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), [WAI-ARIA Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/).

## 3. Layout, visual design, and responsive behavior

- Keep the existing technical field-journal identity: charcoal, warm ivory, slate blue, and restrained coral; preserve semantic tokens and do not introduce isolated one-off palettes.
- Use hierarchy, alignment, consistent spacing, readable line lengths, and typography before decorative effects.
- Use fluid sizing and content-driven breakpoints. Do not design only for named device models.
- Check at minimum: 320, 360, 390, 430, 768, 1024, 1280, and 1440 CSS px; verify both portrait and landscape layouts.
- Check long names, long project titles, empty states, errors, loaded data, dialogs, sticky navigation, and browser zoom. No control may overlap or become unreachable.
- Images need intrinsic dimensions or stable aspect-ratio boxes; reserve space before load to avoid layout shifts.
- Avoid horizontal scrolling for ordinary reading content. Intentional comparison or diagram regions must have a usable alternative on narrow screens.
- Keep motion decorative, non-essential, bounded, and pausable. Respect `prefers-reduced-motion` by default; an explicit visitor override may opt in. Essential information must never depend on animation.

Reference: [MDN — Responsive Design](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design).

## 4. Interaction and content states

Every component must define its states before styling:

| Component | Required states and behavior |
|---|---|
| Navigation | default, hover, focus-visible, active section, expanded/collapsed, mobile |
| Buttons | default, hover, focus, pressed/selected, disabled, pending |
| Forms | untouched, focused, invalid, submitting, success, error, retry |
| Dialogs | open/closed, initial focus, focus containment, Escape, backdrop, focus restoration |
| Tabs | selected tab, inactive tabs, arrow keys, Home/End, linked panel |
| Filters/search | active selection, no results, clear/reset, keyboard operation |
| Data feed | loading, loaded, empty, failure, retry, stale/offline where relevant |
| Privacy/auth | undecided, accepted/declined, signed out, authenticated, expired, recovery |

Feedback must be timely and located near the control or content that changed. Avoid silent failures, fake destinations, fake service integrations, misleading progress, or labels that promise a keyboard action that is not implemented.

## 5. Performance and resilience

Measure the production build on both the full profile and recruiter view. Use field data from Search Console where enough real traffic exists, and use Lighthouse/Playwright for repeatable release checks.

| Metric | Good target at the 75th percentile |
|---|---:|
| Largest Contentful Paint (LCP) | ≤ 2.5 seconds |
| Interaction to Next Paint (INP) | ≤ 200 milliseconds |
| Cumulative Layout Shift (CLS) | ≤ 0.1 |

- Prioritize the actual LCP resource and avoid late-loading above-the-fold content.
- Use responsive image formats/sizes, intrinsic dimensions, lazy loading below the fold, and eager/high-priority loading only for genuine LCP candidates.
- Split non-critical features, keep dependency/runtime weight proportionate, stop animation outside view, and avoid expensive work during scroll or input.
- Preserve no-JavaScript/contact fallbacks, font fallbacks, error boundaries, browser API fallbacks, and service-worker bypass for API/auth traffic.
- Never interpret a Lighthouse lab score as equivalent to real-user field performance.

Reference: [Google Search Central — Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals).

## 6. Search, sharing, and semantic metadata

- Give the document a descriptive title, useful meta description, canonical URL, correct language, and meaningful social preview.
- Keep important profile content as visible text with semantic headings and real crawlable links.
- Keep sitemap and robots directives accurate; do not block assets needed to render the site.
- Use structured data only when it truthfully describes visible page content. This personal portfolio uses a `ProfilePage` whose `mainEntity` is the owner as a `Person`.
- Keep full and recruiter view metadata synchronized with their visible content; avoid inventing separate canonical pages for query-string views unless they become independently indexable routes.
- Search visibility is not guaranteed by markup alone. Maintain accurate public profiles and links, original content, crawlable pages, and consistent identity details.

References: [Google Search Central — SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [Google Search Central — ProfilePage structured data](https://developers.google.com/search/docs/appearance/structured-data/profile-page).

## 7. Security, privacy, and trust boundaries

Use OWASP Top 10:2025 as the application-security awareness baseline.

- Enforce authorization on the server/database; UI state is never an access-control boundary.
- Apply deny-by-default access, PostgreSQL RLS, owner allowlists, and audit trails to private records.
- Validate request size, JSON shape, field types, length, format, origin, and rate quotas on the server. Client checks improve usability but are bypassable.
- Bind anti-abuse tokens to the intended hostname and action. Fail closed when verification is configured but invalid or unavailable.
- Keep service-role credentials, HMAC secrets, CAPTCHA secrets, and other privileged material out of browser code and GitHub Pages build variables.
- Do not store raw IP addresses or collect analytics before consent. Keep collected data minimal, documented, and deletable through the appropriate owner/backend process.
- Review dependencies and CI actions. Pin third-party GitHub Actions to full-length commit SHAs, audit action permissions, and keep automated dependency updates enabled.
- Do not claim CSP, HSTS, or other response-header protections that the static host does not actually configure. Add them at a supporting edge/proxy layer if the hosting platform later permits it.

References: [OWASP Top 10:2025](https://owasp.org/Top10/), [OWASP Top 10:2025 — Risk Categories](https://top10.owasp.org/2025/), [GitHub — Secure Use Reference](https://docs.github.com/en/actions/reference/security/secure-use).

## 8. Definition of done and maintenance

A change is not complete until:
- The full and recruiter views retain consistent design tokens, navigation, and responsive behavior.
- Imports, references, assets, semantics, and state transitions remain connected.
- TypeScript, source/security checks, browser suites, build, bundle audit, Lighthouse, and deployment artifact validation pass.
- Keyboard behavior is tested for each custom interaction and the visible state is announced correctly.
- No secret, private document, or unverified personal claim enters the public artifact.
- The release is committed to `main`, and the GitHub Actions deployment is confirmed successful.

Review this standard during feature work and after major dependency, browser, hosting, content, and security changes. Run a focused keyboard/zoom/mobile review monthly and a full dependency/security/performance review at least quarterly.

**Important:** these requirements define an engineering target. They do not constitute a third-party accessibility audit, penetration test, legal privacy review, or a guarantee of Google ranking.
