# Design source assets

`og-card.svg` is the editable vector master for the social-sharing image. The production crawler/social export is `public/og-card.png`; the SVG master is intentionally kept outside `public/` so Vite does not publish a redundant runtime asset.

When updating the social card, edit the SVG master, export a 1200 × 630 PNG to `public/og-card.png`, and run `npm run verify` to check the public export budget and HTML metadata.
