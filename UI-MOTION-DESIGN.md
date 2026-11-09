# UI motion and interaction notes

## Design intent

The interface uses motion to communicate hierarchy, state, and context—not as decoration on every element. The portfolio follows a technical field-journal art direction: editorial typography, warm paper/ink surfaces, signal-coral highlights, an annotated systems diagram, and an asymmetric project case-study board. Ambient motion pauses when its zone leaves the viewport, while buttons, navigation, project cards, disclosures, and dialogs use shorter, tactile interaction transitions. The visitor can pause decorative movement globally.

## Expandable information

Skills, work history, extracurricular activities, and project notes use native HTML `<details>` and `<summary>`. Each entry can be opened independently, so readers can compare multiple entries without an accordion unexpectedly closing their previous selection. The first entry in the skill, experience, and activities lists is initially open to signal that the rows are interactive.

Native disclosure elements provide built-in keyboard operation and state semantics. The disclosure panel uses a grid track transition from `minmax(0, 0fr)` to `minmax(0, 1fr)` plus opacity. The zero minimum is important: a plain `0fr` track can retain an automatic min-content size and appear partially expanded after closing. The native `<details>` state remains the source of truth, so the panels stay keyboard-operable and still open/close instantly if transitions are disabled.

## Motion system

- Project cards lift, brighten their artwork, and slide a glass-like quick-view panel in from the right on fine-pointer desktop hover or keyboard focus. The panel previews the project headline, contribution, and stack. A click anywhere on the card, Enter, or Space opens the full project introduction. Touch layouts omit the hover panel and open the same introduction on tap.
- Reveals use opacity and transform rather than animating layout dimensions.
- Hero orbit, project artwork loops, and the skills graphic use `data-motion-zone`. The capability strip is intentionally static rather than a perpetual marquee. An `IntersectionObserver` toggles the `motion-active` class so their loops pause outside the viewport.
- The hero particle field is limited to 42 particles on fine-pointer desktop and 18 on coarse-pointer devices; constrained environments downshift to 12, while Save-Data or an explicitly paused motion state renders no moving particles. It is capped at 24 frames per second and uses an adaptive device-pixel-ratio ceiling. At tablet and phone widths the hero switches to normal block flow so the editorial grid does not shrink to its intrinsic flex width. It stops when hidden or outside the viewport, and draws a static frame when ambient motion is paused.
- Decorative motion is enabled by default for every visitor. The persistent header control can pause or resume it, and the v7 preference is stored locally. It affects CSS, section reveals, masthead scrolling, adaptive quality, and the Canvas particle loop.
- The preference starts in `on` mode. An explicit pause writes `legion-portfolio-motion-v7=off`; an explicit resume writes `on`. Older v1-v6 preference keys are ignored so a stale saved pause cannot disable the new default. Content remains visible when motion is paused, and the project cards retain a fail-open visibility fallback.
- A single delegated Web Audio manager assigns distinct synthesized cues to navigation hover, project-card hover, standard controls, disclosure hover, keyboard focus, text-field changes, select changes, form submission, toggles, project open/close, filters, downloads, copy, and success actions. It covers dynamic controls and modal content without per-component audio handlers. There are no downloaded audio files. Sound is enabled for new visitors in the current release, but the AudioContext is created/resumed only after a real visitor gesture; browser policy means the very first hover may be silent until the visitor clicks, taps, or uses the keyboard. The speaker control can mute it persistently; turning sound off emits one final toggle cue, while subsequent actions stay silent until re-enabled.

## Interaction sound map

| User action | Sound identity |
|---|---|
| Header/footer navigation hover | Bright two-note ping |
| Content link hover | Soft descending pair |
| Project card hover | Warm two-note rising interval |
| Standard control hover | Short triangular tick |
| Disclosure row hover | Soft paired note |
| Keyboard focus | Single focus marker |
| Text field change | Quiet low tick |
| Select change | Two-note selection cue |
| Form submit | Three-note confirmation |
| Standard button press | Short double click |
| Internal navigation | Two-note ascending cue |
| Disclosure / theme / motion toggle | Triangle-wave two-note cue |
| Project card open | Three-note rising chord |
| Dialog close | Three-note descending chord |
| Project category filter | Two short ascending notes |
| Resume / CV download | Three-note ascending sequence |
| Copy profile link | Brief high double chirp |
| Success state | Short ascending chord |

Audio is a progressive enhancement only. Browsers that do not support Web Audio or reject `AudioContext.resume()` silently fall back to a silent but fully functional interface. Hover cues are skipped for touch pointers and throttled to avoid repeated sounds while traversing nested markup.

## Accessibility and fallback

- Use Tab to move between disclosure summaries, project actions, links, and controls; Enter or Space toggles a focused native summary.
- Visible focus styles remain in both themes. Decorative icons are hidden from assistive technology. A skip-to-content link is available to keyboard users.
- Project dialogs contain focus, support Escape-to-close, and return focus to the opener.
- Without `IntersectionObserver`, motion zones are allowed to animate instead of becoming permanently paused. Without `ResizeObserver`/`VisualViewport`, the adaptive observer falls back to window resize/orientation events; CSS still manages layout independently. Without advanced disclosure-animation CSS support, native details controls still work.

## Performance guardrails

- No animation library or runtime dependency was added. The CSS/TS application source is approximately 230 KB before Vite minification; Canvas work has a hard particle ceiling of 42 (861 pair comparisons per frame).
- The animation pause observer only watches marked motion zones and is recreated when the project filter changes so newly rendered cards are observed.
- Sound and hover handlers are delegated once at the document level so dynamically inserted elements do not allocate per-card listeners.
- Avoid perpetual animation to static text, form controls, or every list item. Prefer transform/opacity and use viewport observation for continuous decorative loops.

## Scroll-direction masthead

The floating masthead follows scroll intent. It stays visible near the top of the document, slides upward after a deliberate downward gesture, and returns after a shorter upward gesture. The current thresholds are 18 CSS pixels downward and 8 CSS pixels upward, with accumulated direction travel so small trackpad noise does not flicker the header. The scroll listener is passive and updates at most once per animation frame.

The masthead remains visible while the mobile menu is open or when keyboard focus is inside it. The mobile menu exposes `aria-expanded` and `aria-controls`. The header is translated with CSS rather than removed from the document, preserving its semantics and allowing `:focus-within` to recover it when keyboard users tab to a masthead control.

## Bidirectional section reveals

Elements marked with `data-reveal` transition in when entering the central reading region and transition out after leaving it. The observer toggles the visibility class in both directions instead of unobserving elements after their first entrance. This means a visitor scrolling back upward sees the same eased entrance again. The default motion uses opacity and transform only, with a 660 ms `cubic-bezier(.22, 1, .36, 1)` curve. Directional variants (`left`, `right`, and `scale`) are reserved for major layout blocks so the page has rhythm without making every element move differently.

The adaptive profile scales travel distance and duration down for balanced/economy rendering profiles; coarse-pointer devices use less lateral movement. An explicit site pause exposes all content immediately, disables transforms/transitions, and stops the optional particle field. If `IntersectionObserver` is unavailable, content remains visible rather than becoming hidden.

## Header identity lockup

The `KA` monogram is a single inline-flex typographic unit inside a flex-centered tile. `white-space: nowrap`, `word-break: keep-all`, and `overflow-wrap: normal` prevent the letters from occupying separate rows at narrow widths. Both letters use a foreground color distinct from the tile background.


## Editorial motion upgrade — November 9, 2026

The hero headline now uses a clipped line-by-line reveal, with a corner detail on the adjacent visual plate. The animation is triggered by the same IntersectionObserver-driven reveal controller used by other page content; no separate timer is required. Permanent `will-change` promotion was removed so the full headline does not occupy an unnecessary compositor layer when idle.

Project artwork and project detail views share the `project-visual` transition name in browsers that support the View Transitions API. The transition state is flushed synchronously inside the browser update callback to align the source and destination snapshots. If the API is unavailable, a transition is already running, or it rejects the update, the standard modal animation still opens the project. Focus and route behavior remain owned by the existing project dialog and history handlers.

The full experience timeline and the Recruiter View experience timeline reveal their progress rails only while in or near the viewport. Recruiter timeline rows, education records, awards, and leadership cards reveal in short stages. The first recruiter viewport is exposed before reveal CSS is activated, and a timeout plus no-observer fallback keeps the page readable.

Photography navigation now supports Escape, arrow keys, previous/next buttons, and horizontal touch swipes. The focus trap and scroll lock are installed once while the viewer is open; changing to another photo no longer tears down and recreates those listeners. The network diagram shows the selected and traversed route through explicit state styling, and its detail text uses a polite live region.

The motion layer uses the existing `data-motion`, `data-quality`, and `data-pointer` attributes. Economy/balanced profiles reduce durations and remove nonessential hover movement; coarse pointers do not depend on hover. An explicit visitor pause keeps content visible, removes shared view transitions and timeline drawing, and stops decorative animation. The service-worker shell cache is version `v9` so the updated presentation assets, including the favicon set, replace stale cached files.
