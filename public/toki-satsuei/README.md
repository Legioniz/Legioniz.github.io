# TOKI SATSUEI — GitHub Pages site

Public website: https://legioniz.github.io/toki-satsuei/

## Site files
- `index.html` — homepage, services, session guide, and contact section
- `library.html` — browsable media archive
- `styles.css` — shared brand styling and responsive homepage layout
- `library.css` — archive-specific visual system
- `site.js` — homepage navigation, selected-frame filters, preview, and inquiry-message copier
- `library.js` — category filters, horizontal album rails, and album viewer
- `media/` — brand assets
- `media-library/` — upload-ready photo and video folders organised by type and album

## Add photographs or videos
1. Open `media-library/` in this repository.
2. Choose a category such as `cosplay/`, `portraits/`, or `events/`.
3. Create a folder for the shoot or album using a short, readable name. Example: `cosplay/november-convention-2026/`.
4. Upload JPG, JPEG, PNG, WEBP, AVIF, GIF, MP4, or WEBM files into that album folder.
5. Commit the upload to `main`. The GitHub Pages workflow scans the folders and builds the album index automatically.

Files uploaded directly into a category folder appear together in an album named **Latest uploads**. For a tidy archive, use one album folder per shoot. Folder names become category and album labels; no manual JSON editing is needed.

## Archive behaviour
- `media-library/` contains the upload folders and category instructions.
- `scripts/build-toki-media-library.py` scans the folders and writes `media-library.json` during the Pages build.
- `library.html` reads the generated index and creates horizontal, touch-scrollable album rails.
- The album viewer stays contained within the page and respects reduced-motion preferences.
- Empty folders remain available for uploads and do not create empty album cards.

## Site notes
- The site remains static and free; it does not require a paid gallery service or external media database.
- Use web-ready exports. Keep private client-only material and camera RAW files outside this public repository.
- The inquiry form prepares a message for the visitor to paste into Facebook; it does not send or store form submissions.

## Brand
Keep the visual direction minimal and editorial: charcoal, warm white, and restrained crimson. Preserve the TOKI SATSUEI brushstroke emblem, Japanese subtitle `時の記憶`, and tagline “CAPTURING MOMENTS, PRESERVING MEMORIES.”


## Interaction and motion
- The archive supports category filters and live album search (press `/` to focus search; press `Esc` to clear).
- Album rails support touch/trackpad scrolling, desktop click-and-drag, arrow keys, Home/End, and previous/next controls.
- Album viewers include frame progress, keyboard navigation, lazy image loading, and video playback controls.
- Page and album transitions are intentionally short and subtle. `prefers-reduced-motion` disables nonessential motion.


## Visual system and scroll design
- Homepage and archive share a slim reading-progress indicator and a compact sticky-header state.
- Homepage content reveals as it enters the viewport, with directional entrances and a restrained stagger.
- Navigation tracks the reader's current section; selected cards and buttons provide subtle interaction feedback.
- A compact back-to-top control appears after scrolling down the homepage.
- Same-origin navigation can use native View Transitions where supported.
- All nonessential motion respects the device's reduced-motion preference.
