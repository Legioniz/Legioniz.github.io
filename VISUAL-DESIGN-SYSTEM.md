# Visual Design System — Technical Field Journal

## Concept

The portfolio should feel like a personal technical field journal: part engineering notebook, part photography contact sheet, part editorial publication. It reflects the actual range of the work—software, data, embedded systems, audiovisual production, student leadership, music, and event photography—without relying on generic terminal/cyberpunk styling.

## Visual identity

- **Primary structure:** warm paper/ink surfaces, fine rules, chapter labels, folio numbers, and grid annotations.
- **Primary accent:** signal coral, used for focus, actions, active states, and selected labels. Dark mode uses bright coral (`#e87961`); light mode uses a deeper coral (`#a94837`) to maintain text contrast against warm paper.
- **Secondary accent:** muted slate blue, used for technical diagrams and secondary emphasis.
- **Typography:** Space Grotesk for display, Manrope for readable body copy, and DM Mono for annotations and metadata.
- **Geometry:** rectangular cards with small corner radii, crosshair marks, dashed separators, circular system maps, and an asymmetric 12-column project layout. Each portfolio area uses a different composition: cover page, editorial profile, case-study board, parts-tray toolkit, timeline/index cards, and studio contact panel.
- **Tone:** confident, curious, direct, and practical. Avoid invented performance claims or exaggerated professional titles. Project artwork is CSS/SVG-led and specific to each project rather than relying on generic stock photography or a uniform card template.

## Page composition

1. **Cover / Hero:** one editorial headline, concise profile statement, clear action row, and a framed interactive practice map. The map nodes filter the project collection.
2. **Profile:** biography text is paired with a visual note card and compact fact metrics. Use the biography to connect software, hardware, people, and visual work.
3. **Selected builds:** case studies are intentionally varied in scale. The Toki Satsuei card receives a horizontal contact-sheet treatment to signal the visual/photography side of the portfolio.
4. **Toolkit:** capabilities are grouped as labeled parts rather than displayed as arbitrary proficiency bars. Skill level is not implied.
5. **The record:** experience, education, achievements, and extracurricular leadership are presented as a timeline and index cards.
6. **Contact:** a studio-invitation panel with direct contact and profile actions.

## Interaction principles

- Project filters and hero-map nodes should always produce the same category result.
- Native `details`/`summary` disclosures remain independently openable and keyboard operable.
- Ambient motion is optional. The header control pauses CSS animation and the Canvas particle loop; the state persists locally. The motion control remains independent from the opt-in sound control.
- Sound is opt-in and remains separate from visual feedback.
- Use short transitions for button response and longer, low-amplitude motion only for decorative geometry.
- Avoid cursor-following card tilt, automatic carousels, flashing states, and perpetual scrolling text. The capability strip is static and uses spacing, separators, and small markers to communicate breadth without competing with the content.

## Accessibility and performance

- Keep visible focus, skip-to-content, labels on controls, and contrast in both themes.
- Decorative motion starts enabled. Keep the site-level pause/resume control available at all times, and ensure that disabling motion never hides information or blocks an interaction.
- Prefer transform/opacity for transitions. Keep Canvas particle count and frame rate capped, pause off-screen, and avoid unnecessary runtime packages.
- Do not convey state through color alone; use text and shape/state changes as well.
- Keep layout responsive without horizontal scrolling at 320px and above. On tablet and phone widths, the hero changes from vertically centered desktop flex composition to normal block flow; its display headline and orbit scale down on very narrow screens.

## Source guidance

The implementation follows WCAG 2.2 principles for contrast, use of color, audio control, moving content, and focus visibility, and uses progressive enhancement for scroll-linked decorative details. Relevant references:

- https://www.w3.org/TR/WCAG22/
- https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility
- https://web.dev/articles/animations-guide
- https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/scroll-entry-exit-effects


## Editorial system 2.0 — November 9, 2026

The current palette is standardized around charcoal `#151719`, warm ivory `#F3F0E9`, muted slate navy, and signal coral. Dark mode uses `#E87961` for the coral action color; light mode uses the deeper `#A94837` so text and control labels remain legible. Surfaces, borders, focus outlines, radii, spacing, type scale, and easing curves are expressed as CSS custom properties instead of being independently redefined in each view.

The display / body / annotation roles remain Space Grotesk, Manrope, and DM Mono with system fallbacks. The display scale favors shorter editorial headlines; body copy uses a readable measure; technical metadata uses tabular numerals and mono labels. Full Portfolio and Recruiter View use the same tokens, but Recruiter View compresses the information architecture for scanning.

### Current visual treatments

- The hero title enters through a restrained clipping-mask reveal tied to the existing section observer. The adjacent visual plate reveals its corner detail once it enters view.
- Project artwork uses the browser View Transitions API for a shared visual name when supported. The existing modal animation remains the fallback, and transition failure never blocks opening the case study.
- Experience timelines use an in-view progress rail with markers. Recruiter experience, education, recognition, and leadership evidence use shorter staggered reveals.
- The photo workspace includes keyboard previous/next controls, touch swipe navigation, and a browser-only before/after treatment. It does not upload source photos.
- Network Lab route state is reinforced through selected/traversed states and an announced detail region; animated packets pause when the lab is outside the viewport.

### Motion tiers

- Full quality keeps the complete desktop choreography.
- Balanced quality shortens hero and reveal motion.
- Economy quality removes nonessential card lifts and corner flourish animation.
- Coarse-pointer layouts suppress hover-only depth and use touch-appropriate interactions.
- The site's motion-off setting exposes all content immediately. Visitors can pause or resume decorative motion from the site control.

## Color governance — canonical rules

The CSS custom properties in `src/styles.css` are the single source of truth. Components must consume semantic tokens (for example `var(--bg)`, `var(--surface)`, `var(--text)`, `var(--muted)`, `var(--line)`, `var(--accent)`, and `var(--blue)`) rather than introducing isolated hex values. Do not change the palette in one view without updating both themes and this document.

### Canonical palette

| Semantic role | Dark theme | Light theme | Usage |
|---|---|---|---|
| Page background (`--bg`) | `#151719` | `#F3F0E9` | Main canvas |
| Secondary background (`--bg-2`) | `#1C2023` | `#EAE6DE` | Recessed regions and page transitions |
| Primary surface (`--surface`) | `#22272A` | `#FFFCF6` | Cards, panels, menus |
| Secondary surface (`--surface-2`) | `#2A3034` | `#F4EFE7` | Nested controls and secondary panels |
| Raised surface (`--surface-3`) | `#343C41` | `#E7E0D6` | Raised or selected neutral surfaces |
| Main text (`--text`) | `#E6E5DF` | `#42464A` | Paragraphs and standard content |
| Strong text (`--text-strong`) | `#F3F0E9` | `#1B2024` | Headings and high-priority content |
| Muted text (`--muted`) | `#B2B0A8` | `#5F6469` | Supporting copy |
| Quiet metadata (`--muted-2`) | `#92979A` | `#62696D` | Metadata; never use for essential small text unless contrast is verified |
| Signal coral (`--accent`) | `#E87961` | `#A94837` | Primary actions, focus, active states, key highlights |
| Deep coral (`--accent-dark`) | `#D6634D` | `#923B2E` | Pressed/hover action treatment |
| Slate blue (`--blue`) | `#8A9DB2` | `#4A6078` | Secondary technical emphasis, diagrams, informational states |
| Accent foreground (`--on-accent`) | `#17191B` | `#FFFFFF` | Text/icons placed directly on the accent fill |

Border and grid colors must use the existing translucent `--line`, `--line-strong`, and `--grid-line` tokens. Shadows should remain subtle and theme-appropriate.

### Application rules

1. **Coral is scarce and meaningful.** Reserve it for primary calls to action, keyboard focus, selected navigation/filter states, important status markers, and small editorial highlights. Do not turn every icon, heading, border, or card into an accent.
2. **Slate blue is secondary.** Use it for technical diagrams, supporting data visualization, neutral informational status, and secondary markers. It must not compete with coral for primary actions.
3. **Surfaces establish hierarchy.** Build depth through the existing background/surface levels, fine borders, and spacing—not through a different bright color for every card.
4. **Text hierarchy is semantic.** Use `--text-strong` for headings, `--text` for body copy, and muted tokens only for supporting information. Do not lower opacity to make essential text appear subtle.
5. **Status is never color-only.** Pair color with a readable label, icon, shape, or explicit state. Pending, selected, success, error, and disabled states must remain understandable without color perception. Do not assign an unapproved green/red/amber status palette ad hoc.
6. **Theme parity is mandatory.** Every new component must work in dark and light mode using semantic tokens. Check text, borders, controls, hover/focus states, charts, illustrations, and overlays in both themes.
7. **Contrast is a release requirement.** Meet WCAG 2.2 AA contrast: at least 4.5:1 for normal text and 3:1 for large text; meaningful UI boundaries and graphical indicators should reach 3:1 against adjacent colors. Verify actual rendered combinations rather than assuming a token pair passes. Do not use muted metadata colors for critical information without testing.
8. **Gradients are restrained.** Existing low-opacity ambient hero treatments and subtle progress treatments may remain. Do not introduce loud multicolor gradients, neon glows, or gradients as substitutes for clear hierarchy.
9. **No arbitrary hard-coded colors in components.** New CSS should use the shared semantic variables. If a genuinely new semantic color is required, define its dark and light values in `:root` and `:root[data-theme='light']`, document its role here, and verify contrast before use.
10. **Full Portfolio and Recruiter View share the same palette.** Recruiter View may adjust density and layout, but it must not create a separate brand color system.


### Static assets and fallback surfaces

CSS custom properties remain the screen UI source of truth. Files that cannot inherit the stylesheet—HTML theme metadata, the PWA manifest, no-JavaScript fallback, favicon, and social preview artwork—must mirror the corresponding canonical token values rather than introduce a parallel palette. The fixed social preview uses the canonical light-theme palette; the favicon and initial browser theme use the canonical dark-theme values. The verified build renders the PNG social preview and PNG/ICO favicons from their SVG sources so all deployed formats stay in sync. Keep duplicate public/source SVG assets identical. The monochrome rules inside `@media print` are an intentional print-only treatment, not a separate Recruiter View theme.

### Color review checklist

- [ ] All new component colors use shared semantic tokens.
- [ ] Dark and light themes both have complete, intentional states.
- [ ] Text and interactive contrast have been checked against their actual surfaces.
- [ ] Coral remains reserved for primary emphasis; blue remains secondary.
- [ ] Status is communicated with text/icon/shape as well as color.
- [ ] No new arbitrary hex values, neon effects, or decorative color overload.
- [ ] Full Portfolio and Recruiter View remain visually consistent.

