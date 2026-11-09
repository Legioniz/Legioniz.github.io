# Visual Design System — Technical Field Journal

## Concept

The portfolio should feel like a personal technical field journal: part engineering notebook, part photography contact sheet, part editorial publication. It reflects the actual range of the work—software, data, embedded systems, audiovisual production, student leadership, music, and event photography—without relying on generic terminal/cyberpunk styling.

## Visual identity

- **Primary structure:** warm paper/ink surfaces, fine rules, chapter labels, folio numbers, and grid annotations.
- **Primary accent:** signal coral, used for focus, actions, active states, and selected labels. Dark mode uses bright coral (`#e87961`); light mode uses a deeper coral (`#a94837`) to maintain text contrast against warm paper.
- **Secondary accent:** muted sea-glass blue/teal, used for technical diagrams and secondary emphasis.
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
- Respect `prefers-reduced-motion` by default. Visitors can explicitly resume decorative motion from the site control; a separate pause remains available at all times.
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
- The system reduced-motion preference and the site's motion-off setting expose all content immediately. Visitors can explicitly resume motion from the site control if they prefer the full animation experience.
