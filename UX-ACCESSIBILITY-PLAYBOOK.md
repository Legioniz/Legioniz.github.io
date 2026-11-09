# UX, Accessibility & Web Quality Playbook

**Scope:** Full portfolio, Recruiter View, interactive project tools, comment/inquiry flows, owner console, and the production delivery path.

**Review baseline:** WCAG 2.2 Level AA as the primary accessibility target; WAI-ARIA Authoring Practices for custom widgets; Nielsen Norman Group usability heuristics; Google Search Central technical guidance; Core Web Vitals; and OWASP client-side security guidance.

This is an implementation standard, not a claim of certified WCAG conformance. Automated checks catch regressions, but cannot replace keyboard, screen-reader, zoom, touch, and human usability testing.

## 1. Product and usability rules

Apply the ten usability heuristics to every page and feature:

1. Keep system status visible: loading, saved, sent, copied, approved, failed, and unavailable states must be distinguishable.
2. Use language that matches the visitor's mental model. Explain technical terms where they first matter.
3. Preserve user control: provide close, back, cancel, reset, retry, pause, and clear recovery paths.
4. Keep the same control, typography, spacing, and color semantics consistent across Full and Recruiter views.
5. Prevent foreseeable mistakes with clear limits, disabled states, confirmation for destructive actions, and safe defaults.
6. Prefer recognition over recall: keep labels, context, and current selection visible.
7. Support efficient keyboard, touch, and pointer use without making one input method mandatory.
8. Remove decoration that competes with the task. Motion, sound, texture, and effects remain subordinate to content.
9. Make errors specific and recoverable. Do not erase user input on validation or network failure.
10. Provide concise help at the point of need; explain demos, assumptions, privacy, and data boundaries.

**Portfolio application:** the editorial field-notes visual identity stays intact, but readability, clear task completion, and predictable interaction take priority over ornamental effects. Avoid surprise audio, forced motion, hidden hover-only actions, misleading live-status indicators, and simulated functionality presented as a production integration.

## 2. Accessibility baseline — WCAG 2.2 AA

Use the four POUR principles:

- **Perceivable:** text alternatives, semantic structure, captions/labels, sufficient contrast, and no information conveyed by color alone.
- **Operable:** keyboard access, visible and unobscured focus, meaningful focus order, adequate target size, and no keyboard traps outside an active modal.
- **Understandable:** consistent navigation, predictable control behavior, explicit labels and instructions, and actionable error messages.
- **Robust:** valid HTML semantics, correct accessible names/roles/states, and compatibility with assistive technologies.

### Required implementation checks

| Area | Rule | Site implementation / verification |
|---|---|---|
| Document structure | One primary `main`, meaningful headings, named navigation landmarks, and a declared language | Full and Recruiter views have separate labelled structures and skip links |
| Keyboard | Every action is reachable and usable with keyboard; focus order follows reading order | Project cards, disclosures, controls, navigation, and modal actions are keyboard-operable |
| Focus | Visible, high-contrast focus; do not hide the focused control behind sticky UI | Shared focus treatment, scroll offsets, and forced-colors outline |
| Target size | WCAG 2.2 AA SC 2.5.8 is 24×24 CSS px or a qualifying spacing exception; prefer 44×44 for primary touch controls | Coarse-pointer controls use 44px minimum activation areas |
| Contrast | Normal text 4.5:1; large text 3:1; essential UI graphics/boundaries 3:1 where applicable | Dark/light semantic tokens have source-level contrast checks; review images and mixed surfaces manually |
| Reflow | No loss of content or two-dimensional scrolling for ordinary text at narrow CSS widths and zoom | Test 320 CSS px, 200% and 400% browser zoom, landscape, and long content |
| Motion | Respect `prefers-reduced-motion` unless the user makes an explicit choice | Default follows OS; explicit Motion On/Off is persisted; essential content never depends on animation |
| Audio | Never make audio the only way to receive information; do not surprise visitors with sound | Sound defaults off and is opt-in; visual state remains complete without audio |
| Forms | Every control has a programmatic label; instructions and errors are associated with the control | Labels, input types, length bounds, status feedback, honeypot separation, and email fallback are retained |
| Dialogs | Move focus into the dialog, contain Tab/Shift+Tab, close on Escape when appropriate, and restore focus to the invoker | Project, command, photo, and admin dialogs are reviewed against the modal-dialog pattern |
| Custom tabs | Implement a tablist, selected state, labelled panels, roving tab stop, and expected arrow/Home/End movement | Project Laboratory tabs implement ArrowLeft/ArrowRight/Home/End and tab/panel IDs |

Do not put an ARIA role on native elements unless it adds a needed semantic relationship. Prefer native buttons, links, inputs, labels, details/summary, and form controls. A visual card that behaves as a button must expose the same keyboard behavior and accessible name.

### Manual assistive-technology review

Before a major release, review both page views with:
- Keyboard only: Tab, Shift+Tab, Enter, Space, Escape, arrows, Home/End, and browser back/forward.
- Screen reader: at minimum one desktop screen reader/browser combination (NVDA with Firefox or Chrome) and one mobile combination (TalkBack with Chrome or VoiceOver with Safari).
- Browser zoom and text enlargement: check 200% and 400%, focus visibility, sticky header offsets, and horizontal overflow.
- Touch: real device taps, rotation, scrollable regions, and controls near screen edges.
- Forced colors/high contrast: ensure focus and boundaries remain perceivable.

Automated accessibility scores are a useful regression signal, not proof that all WCAG criteria pass.

## 3. Responsive and visual system

- Start with narrow viewports and scale up; test 320, 360, 390/430, 768, 1024, 1280, and 1440+ CSS px.
- Use fluid sizing, minmax(0, …), `min-width: 0`, content-aware wrapping, and component container queries; never solve overflow by hiding meaningful content.
- Keep body copy at a comfortable reading size and line length. Use small type only for nonessential metadata, never for core instructions or form errors.
- Maintain a consistent spacing scale and deliberate hierarchy across all route states.
- Use semantic tokens for surface, text, border, accent, and focus colors. Do not introduce local one-off hex values for ordinary UI.
- Preserve visible hover, focus, active, disabled, loading, success, and error states. Hover cannot be the only way to discover an action.
- Keep sticky/fixed elements from obscuring anchors, headings, focused controls, notices, or mobile navigation.
- Maintain a useful print style for the recruiter brief and avoid printing navigation or floating utilities.

## 4. Interaction contracts

| Component | Expected behavior |
|---|---|
| Primary navigation | Real anchors, current-section indication, mobile menu state exposed, menu closes after navigation |
| Command palette | Labelled modal, focuses search on open, Escape/backdrop closes, Tab stays inside, focus returns to launcher, no-results state announced |
| Project card/dialog | Enter/Space opens; dialog is named/described; Escape and close actions work; focus returns to source card; URL is shareable |
| Laboratory tabs | Roving tab stop; Left/Right Arrow, Home/End; tabpanel relationship is explicit |
| Forms | Required state is programmatic, validation is understandable, submit state prevents duplicates, success/failure announced, user input is retained on failure |
| Comments | Public feed only displays approved notes; pending moderation is explained; refresh/loading/empty/error states differ |
| Privacy | Analytics default off, explicit consent, revocable settings, plain-language explanation |
| Audio and motion | Both independently controllable; sound opt-in; motion inherits OS setting until explicit visitor preference |
| Responsive menus | No hover dependency, adequate touch targets, dismissal and focus return are predictable |

## 5. Performance and resilience

Use Google's Core Web Vitals field thresholds as release goals:

- **LCP:** 2.5 seconds or less.
- **INP:** 200 milliseconds or less.
- **CLS:** 0.1 or less.

Measure real-user field data where available and keep repeatable Lighthouse CI checks for both Full and Recruiter views. Lab scores are diagnostics, not a substitute for field measurements. Total Blocking Time is a useful lab proxy for responsiveness, but it is not INP.

Implementation rules:
- Prioritize the main content and LCP asset; use intrinsic image dimensions and responsive image sources.
- Lazy-load below-the-fold images and expensive feature modules; do not lazy-load the true LCP image.
- Split noncritical experiences when it reduces initial JavaScript without making core content depend on delayed code.
- Avoid long main-thread work; batch scroll/resize updates and pause decorative work outside view.
- Reserve layout space for media and dynamic banners to reduce layout shift.
- Stop background animation when hidden, paused, or reduced; adapt optional canvas effects to constrained devices and Save-Data.
- Keep network failure fallbacks honest. Direct contact and document links remain available if React or the backend fails.

## 6. Search, content and shareability

- Use a unique, descriptive document title and meta description for each indexable public view where server/static rendering permits it.
- Keep one canonical public URL for the main profile; do not create duplicate indexable parameter variants without a clear canonical strategy.
- Maintain valid `robots.txt`, XML sitemap, canonical URL, social preview metadata, and JSON-LD Person data.
- Keep public content useful without requiring hidden interaction. Project summaries should explain the problem, contribution, stack, status, and evidence.
- Use semantic headings, descriptive link text, meaningful image alternatives, and human-readable section identifiers.
- Ensure social cards are current and sized/compressed for platform previews.
- Keep profile, project, and experience Markdown summaries synchronized with the actual portfolio.
- Do not keyword-stuff titles, schema, alt text, or copy. Never invent skills, dates, outcomes, awards, or live integrations for SEO.

## 7. Security and privacy

- Treat all browser input and public submissions as untrusted. Enforce validation, rate limits, origin checks, spam controls, and authorization on the server.
- Keep service-role keys, Turnstile secret keys, HMAC secrets, and other privileged credentials out of source, public assets, and client build variables.
- Enforce authorization with Supabase Row Level Security and the server-side allowlist; UI state is never an authorization boundary.
- Render user-submitted comments as text. Avoid unsafe HTML sinks such as `dangerouslySetInnerHTML`; if rich HTML is ever introduced, sanitize it with an explicit allowlist.
- Validate external URL schemes and use `rel="noopener noreferrer"` for new-tab links.
- Analytics remain off until explicit consent and collect only the documented minimal data.
- Static GitHub Pages builds do not give Vite application code control over HTTP response headers. A meta tag is not a replacement for a server-delivered Content-Security-Policy, HSTS, or other response headers. Do not add a loose meta-CSP that breaks Supabase, Turnstile, fonts, or other integrations; plan response-header hardening at an edge/reverse-proxy/hosting layer if the deployment moves to one.

## 8. Release gates and ownership

Every substantial UI or backend change must:
1. Keep Full Portfolio and Recruiter View behavior consistent where they share a component or preference.
2. Update the source module, shared tokens/styles, tests, maintenance docs, and any affected static asset/cache manifest.
3. Run the source integrity, security, accessibility, responsive, and feature checks.
4. Run TypeScript and production build; inspect bundle and Lighthouse results for both views.
5. Run Chromium interaction, motion, recruiter, comments, and responsive suites where the environment supports them.
6. Check GitHub Actions and confirm the deployed artifact/commit before calling the change live.

Recheck manually after changes to navigation, dialogs, forms, focus, motion, color tokens, content, or backend integration. A passing build is necessary, not sufficient.

## Sources

- W3C, [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/) — normative success criteria and conformance levels.
- W3C WAI, [WCAG 2.2 target-size understanding](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) — 24×24 CSS-pixel minimum and spacing exceptions.
- W3C WAI-ARIA APG, [Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) — tablist, tab, panel, and keyboard interaction.
- W3C WAI-ARIA APG, [Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) — focus management and keyboard containment.
- W3C WAI, [Forms Tutorial](https://www.w3.org/WAI/tutorials/forms/) — labels, instructions, grouping, and feedback.
- W3C WAI, [Keyboard Interface Practices](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/) — predictable keyboard behavior and focus.
- Nielsen Norman Group, [10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) — general usability principles.
- Google Search Central, [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals) — LCP, INP, and CLS field metrics.
- Google Search Central, [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) — discoverability and content structure.
- OWASP, [XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) — safe rendering and output handling.
- OWASP, [Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html) — defense-in-depth response policy.
- OWASP, [HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) — browser security response headers.
