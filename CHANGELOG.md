## 2026-11-09 — Deep UX and accessibility implementation

- Changed motion to inherit the operating-system reduced-motion preference before first paint, then follow OS changes until the visitor explicitly selects Motion On or Off. Existing explicit v7 choices migrate to v8.
- Changed synthesized interface audio to opt-in for new visitors.
- Added a focus-contained, focus-restoring command palette dialog and WAI-ARIA APG keyboard behavior for the Project Laboratory tablist.
- Added shared visible-focus, forced-colors, and coarse-pointer touch-target refinements across Full and Recruiter views.
- Added `UX-ACCESSIBILITY-PLAYBOOK.md` with sourced usability, WCAG 2.2 AA, WAI-ARIA, responsive, Core Web Vitals, SEO, and security standards.
- Extended automated release checks for the new interaction contracts and refreshed the service-worker shell cache to v17.

The changes are awaiting the full production verification and deployment workflow; no conformance claim is made from source checks alone.

## 2026-11-09 — Recruiter bundle, accessibility, and content-discovery upgrade

- Split the full portfolio's interactive laboratory, owner console, and backend contact panels into route-specific JavaScript chunks so the recruiter route does not download features it never renders.
- Moved the lightweight introduction, project comparison, quick navigator, and service-worker update notice into a small shared chrome module.
- Replaced the interactive project card's `article` host with a generic button-role container, preserving keyboard activation while keeping the accessibility tree semantically appropriate.
- Added an owner-maintained `llms.txt` discovery index and three concise Markdown references for the profile, projects, and experience. The HTML head advertises the index, the sitemap lists the references, and release checks validate their inclusion.
- Kept scope boundaries explicit: synthetic energy data, early-stage photography, foundational authorized-lab security practice, and the public-safe CV link.

The upgrade is covered by source checks, recruiter browser assertions for unloaded full-view chunks, Markdown/sitemap validation, and the existing production release gate.

## 2026-11-09 — Public comments wired through production

- Corrected the Pages release gate and completed the public-comment integration work so the production build receives its Supabase public configuration and verifies the actual intake endpoint.
- Reworked the pointer spotlight to paint on the visible project-content panel and strengthened its browser assertion to inspect the rendered radial background rather than an ineffective pseudo-element.
- Made Supabase REST reads explicitly uncached and made the client require an explicit `{ ok: true }` response before displaying submission success.
- Added a production-build browser suite for enabled comment fields, approved-only feed rendering, manual refresh, publishable-key-only anonymous requests, pending submission payload, and post-submit confirmation. The standard release verification now runs this suite.
- Extended the live deployment gate with an Edge Function CORS preflight and a honeypot-only POST that intentionally creates no production comment.
- Bumped the service-worker shell cache to v14 so the updated portfolio shell is adopted cleanly.
- Confirmed the production database has the comment table and moderation policies: anonymous visitors may read approved comments but cannot write directly; signed-in allowlisted administrators can review and update the queue. The public Edge Function is the visitor-write path and assigns new records to pending review.

# Portfolio changelog and release history

This file is the single record of portfolio updates, maintenance work, and release verification. The individual QA/update reports that previously existed at the repository root and in docs/releases/ have been consolidated here. Older test counts are historical snapshots from their original commits; they are not substitutes for the current commit's CI result.

## 2026-11-09 — System-wide responsive layout and spacing upgrade

- Replaced the previous final layout override layer with a single shared responsive contract for content width, page gutters, section rhythm, component gaps, and masthead geometry.
- Standardized shrink-safe grid/flex tracks and text wrapping across the hero, profile, project cards, toolkit, experience, contact, footer, recruiter presentation, and interactive labs.
- Reworked responsive composition at 1200, 1100, 900, 760, 520, and 360 CSS-pixel breakpoints; the mobile navigation now uses its actual expanded-state selector and stays bounded beneath the masthead.
- Improved practice-map sizing, project/recruiter card reflow, feature-panel stacking, dialog constraints, and separation of floating privacy/update notices.
- Repaired a malformed Python QA line and updated release assertions to match the current mobile layout and the existing v11 service-worker shell cache.
- Removed the duplicate standalone QA report; this changelog remains the single release-history record.

## 2026-11-09 — Systems orbit repair and repository cleanup

### Systems orbit

The hero practice map was inspected from its React markup through the final responsive CSS and the Chromium fixture.

- The center tile was sized to only 26% of the orbit while the visible caption was held to a readable minimum size. On phone-sized diagrams, the caption could extend beyond the tile and visually collide with the orbital geometry.
- The center tile now uses a responsive bounded size, with a 108px minimum, and its caption uses a compact, explicit 10px mono style with controlled tracking.
- Top and bottom nodes were moved outward to protect the center tile. Mobile icon surfaces now measure 44px by 44px rather than 39px.
- Orbit controls are explicit type=button controls, expose their selected project category as data, and retain their accessible names. Decorative geometry and the icon artwork are hidden from the accessibility tree.
- The ring animation keyframes already preserved translate(-50%, -50%) while rotating; that behavior was verified and retained.

Browser verification added for:
- the four category actions and their category mapping;
- concentric alignment of all three rotating rings;
- center-caption containment and fit inside the inner ring;
- absence of node-to-center overlap and clipping at desktop and 320px phone width;
- minimum 44px mobile icon hit areas.

### Repository cleanup

- Consolidated 15 distinct historical QA/update records and their duplicate root/archive copies into this changelog.
- Removed the duplicate report copies from the root and docs/releases/, including the superseded Jekyll experiment report and the older system audit.
- Updated README, the release preflight inventory, and cross-file integrity checks to use CHANGELOG.md as the sole release-history record.
- Kept the actual test suite, design documentation, deployment guide, backend setup guide, source files, configuration, assets, PDFs, and release workflow. No working application feature or verification script was removed.

The orbit repair was verified and deployed on November 9, 2026.

Final release verification on commit `4808dff329a276debf90146c9b849be629638c26`:

- Cross-file integrity: **40/40 passed**.
- Feature/security checks: **59/59 passed**.
- Production-source checks: **76/76 passed**.
- CSS/design browser suite: **41/41 passed**, with no browser runtime errors.
- Orbit-specific browser checks: all four category buttons receive their own pointer hit point and activate the intended category; all three rings stay concentric; desktop and 320px mobile keep the center tile and caption within the inner ring; no center/node overlap; mobile icon hit areas are at least 44px.
- Recruiter browser suite: **41/41 passed**.
- Strict TypeScript check and production Vite build: **passed**.
- Lighthouse CI audits for the full portfolio and recruiter view: **passed**.
- Production Pages artifact checks: **passed**, including compiled JS/CSS references, all favicon formats, PDFs, and the `.nojekyll` marker.
- GitHub Pages deployment: **reported success** at https://legioniz.github.io/.

GitHub Actions: [run #115 — successful verification and deployment](https://github.com/Legioniz/Legioniz.github.io/actions/runs/42553256251).

These are the verified results for this release commit.

## 2026-11-09 — Last deployed baseline

Commit: bd393abfd3a4ae729c8f5ff59b83a816b0825e46

GitHub Actions run: https://github.com/Legioniz/Legioniz.github.io/actions/runs/42551149916

This baseline successfully built and deployed the existing portfolio using the direct Vite Pages artifact workflow. The run completed its complete source/type/build/browser verification, both Lighthouse audits, production artifact checks, and Pages deployment.

Recorded results from that run:
- Cross-file integrity: 38/38.
- Feature and security checks: 59/59.
- Production-source checks: 76/76.
- CSS/design browser checks: 30/30, including dark/light text and accent contrast.
- Recruiter browser checks: 41/41.
- Portfolio motion and desktop/touch interaction regressions: passed without browser errors.
- Strict TypeScript check and Vite production build: passed.
- Lighthouse audits for the full portfolio and recruiter view: passed.
- Production Pages artifact: compiled hashed JavaScript/CSS, PDF assets, and SVG/PNG/ICO favicons validated.
- GitHub Pages deployment: reported success at https://legioniz.github.io/.

These counts describe commit bd393abf only. The current orbit repair has its own CI gate.

## 2026-11-09 — Full-system consistency and cleanup audit

A cross-repository audit aligned the React/TypeScript app, shared styles, static assets, PDF downloads, backend setup documentation, service worker, CI workflow, and backup tooling.

- Removed confirmed unused CSS selectors/declarations and an unused palette token; connected live design tokens to controls, cards, typography, section spacing, overlays, and motion timing.
- Checked CSS custom-property references and animation/keyframe usage; added cross-file checks for imports, asset URLs, selectors, tokens, keyframes, unused imports/exports, and local documentation links.
- Moved the editable Open Graph SVG master to design-assets/ while keeping the crawler-compatible PNG in public/.
- Kept the root and deployed BACKEND-SETUP.md copies identical.
- Reworked snapshot inventory to exclude Git internals, dependencies, build/browser caches, compiler artifacts, backups, and local secrets, while retaining .env.example.
- Consolidated feature, security, motion, interaction, and recruiter browser suites under one release verification command.
- Added tinycss2 to test requirements for CSS parsing and AST-based unused-import/export checks.

Historical audit snapshot: 24/24 cross-file integrity checks, 59/59 feature/security checks, and 65/65 production-source checks passed. Dependency-backed build and deployment were not certified in that audit environment; they were later completed by the successful GitHub Actions run listed above.

## 2026-11-09 — Hero visibility and design/motion refinements

- Removed critical first-screen hero copy from the global scroll-reveal hiding mechanism. The headline, description, actions, and eyebrow now use a dedicated fail-open entrance sequence so delayed observers or interrupted animation cannot leave the introduction invisible.
- Standardized the editorial charcoal/ivory/coral palette, shared surface/border/spacing/type/motion tokens, and typography across full and recruiter views.
- Added line-by-line hero text motion, project artwork View Transitions with modal fallback, active-view timeline rails, and short evidence reveals in recruiter view.
- Preserved visible content when motion is paused and kept the visitor-level motion control.
- Improved photography viewer keyboard/touch behavior and network diagram selection feedback.

Historical source snapshots included 58/58 feature/security and 65/65 production-source checks, 15/15 stylesheet-browser checks, followed by a hero visibility correction with 59/59 feature/security, 68/68 production-source, 22/22 design/motion, and 29/29 interaction checks. The later deployed baseline above supersedes those interim counts.

## 2026-11-09 — Recruiter profile, production quality, and view lifecycle

- Added a recruiter-focused route with concise selected projects, evidence-linked skills, relevant experience, education, recognition, leadership, contact, and public-safe CV access.
- Added source checks for SEO metadata, responsive layouts, safe external links, PDF-only delivery, privacy boundaries, and backend credential separation.
- Corrected view switching and project case-study lifecycle so URL state, browser history, scroll position, observers, and the newly mounted view remain synchronized.
- Preserved the full portfolio and recruiter view as separate presentations sharing the same project and experience data.

Historical recruiter source checks reported 58/58 feature/security and 50/50 recruiter/production-source checks; a separate lifecycle check recorded 58/58 feature/security and 55/55 production-source checks. Compiled route verification was later passed in the deployed baseline.

## 2026-11-09 — PDF-only personal documents

- Removed editable Word/DOCX downloads from the public site and release assets.
- Retained the original resume PDF and the public-safe CV PDF.
- Kept recruiter-facing links limited to the public-safe CV; the original resume remains available in the full portfolio as owner-provided.
- Verified both retained documents as valid PDF containers in the relevant source checks.

## 2026-11-09 — GitHub Pages deployment correction

The initial Jekyll packaging attempt failed when the hosted runner could not write _site/.nojekyll. The workflow was simplified to upload the Vite production dist/ artifact directly using the Pages upload action, with explicit checks for the compiled JavaScript/CSS bundles, icons, PDF files, and .nojekyll marker. Deployment remains gated by complete verification, Lighthouse, and artifact validation. The direct-artifact workflow was confirmed by the successful deployed baseline above.

## 2026-11-08 — Portfolio foundation, adaptive layout, and interactive experience

- Established the technical field-journal visual direction with dark/light themes, responsive type/spacing, contrast-aware accent colors, and a CSS-led layout.
- Added adaptive behavior for desktop, touch, data-saver, low-memory devices, zoomed visual viewports, and pixel-ratio limits, with fail-safe fallbacks.
- Added bidirectional section reveals, scroll-direction masthead behavior, keyboard-operable disclosures, and explicit visitor motion controls.
- Added interactive project cards with hover/keyboard preview and touch-friendly case-study opening, project category filtering, and a set of interactive project/skill demonstrations.
- Added a delegated Web Audio interaction manager with distinct synthesized cues for navigation, controls, project opening, disclosures, form actions, filters, downloads, and copy. Sound remains subject to browser user-gesture rules.
- Added recruiter-facing PDF access, responsive portrait assets, social preview assets, and source-level content/security checks.

Historical source, adaptive, and Chromium checks were run in multiple snapshots. Some early local runs could not install the package-pinned React/Vite dependencies because the npm registry was unreachable. Those were correctly recorded as unverified at the time; the later successful GitHub Actions baseline above completed the full project typecheck, production build, browser verification, Lighthouse, and deployment.

## 2026-11-08 — Resume integration and privacy handling

- Integrated the owner-supplied original resume PDF.
- Added a separate public-safe CV PDF for recruiter-facing use.
- Documented that the original resume contains owner-supplied contact information and should not be exposed through the recruiter-only presentation.
- A later November 9 update removed editable-document downloads and standardized public downloads on PDF files.

## Current maintained references

- README.md — project overview, commands, and setup.
- DEPLOYMENT-GUIDE.md — GitHub Pages deployment process.
- PRODUCTION-QUALITY.md — current release quality gates.
- UI-MOTION-DESIGN.md and VISUAL-DESIGN-SYSTEM.md — maintained interaction and design rules.
- VIEW-TRANSITION-LIFECYCLE.md — maintained project/recruiter route lifecycle guidance.
- BACKEND-SETUP.md — owner-controlled Supabase setup.
- tests/ and scripts/ — executable verification tools; these are not release logs and remain in the repository.


## 2026-11-09 — Recruiter View responsive, motion, and sound refinement

- Restored the intended compact two-column project-card layout at phone widths; a later desktop flex declaration had overridden the earlier mobile grid rule.
- Added recruiter-local sound and motion controls that share the portfolio's persistent preferences and delegated sound manager.
- Added current-section tracking to the sticky recruiter navigation.
- Extended viewport reveal handling to project and skill cards, plus subtle project artwork ring motion that runs only while its art is in view.
- Improved recruiter copy sizing, wrapping, grid min-width handling, tags, and contact text so long project descriptions and skill labels wrap without clipping.
- Expanded real-browser checks for preference persistence, visible-section state, responsive project-card geometry, text spill, and minimum typography sizes.

Final verification passed and the Recruiter View update deployed on November 9, 2026.

**Deployed commit:** `2b371496fc6a072113395d48d6ef6aa97467122b`  
**GitHub Actions:** [Run #122 — successful verification and deployment](https://github.com/Legioniz/Legioniz.github.io/actions/runs/42555142348)

Verification on that commit:
- Cross-file integrity: **40/40 passed**.
- Feature/security: **59/59 passed**.
- Production-source, SEO, responsive, accessibility and privacy checks: **77/77 passed**.
- CSS/design browser suite: **41/41 passed**.
- Production bundle audit: **19/19 passed**.
- Recruiter View browser suite: **74/74 passed**.
- Strict TypeScript check and Vite production build: passed.
- Lighthouse CI audits for the full portfolio and Recruiter View: passed.
- Production Pages artifact validation: passed.
- GitHub Pages deployment: reported success at https://legioniz.github.io/.

Recruiter-specific browser coverage includes the persistent motion/sound controls, current-section navigation state, viewport-scoped project art animation, reveal state, zero unnamed controls/links, no text spill or horizontal overflow at 320, 360, 390, 428, 768, 1024, and 1440 CSS pixels, and the intended two-column mobile project-card layout at 320–428px.
