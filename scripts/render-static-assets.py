#!/usr/bin/env python3
"""Render raster site icons and social preview from canonical SVG source files."""

from __future__ import annotations

import struct
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"


def render_svg(page, source: Path, destination: Path, width: int, height: int, transparent: bool) -> None:
    if not source.is_file():
        raise FileNotFoundError(f"Missing SVG source: {source}")
    svg = source.read_text(encoding="utf-8")
    background = "transparent" if transparent else "#f3f0e9"
    document = f"""<!doctype html>
<html><head><meta charset="utf-8"><style>
html, body {{ width: {width}px; height: {height}px; margin: 0; padding: 0; overflow: hidden; background: {background}; }}
svg {{ display: block; width: {width}px; height: {height}px; }}
</style></head><body>{svg}</body></html>"""
    page.set_viewport_size({"width": width, "height": height})
    page.set_content(document, wait_until="load")
    page.screenshot(path=str(destination), full_page=True, omit_background=transparent)


def optimize_social_preview(destination: Path) -> None:
    """Quantize the editorial vector preview and enforce its crawler transfer budget."""
    with Image.open(destination) as rendered:
        if rendered.size != (1200, 630):
            raise RuntimeError(f"Social preview must be 1200x630, got {rendered.size}")
        rgb = rendered.convert("RGB")
        for color_count in (256, 192, 128):
            indexed = rgb.quantize(
                colors=color_count,
                method=Image.Quantize.MEDIANCUT,
                dither=Image.Dither.NONE,
            )
            indexed.save(destination, format="PNG", optimize=True, compress_level=9)
            if destination.stat().st_size <= 250 * 1024:
                print(f"Optimized social preview to {color_count} colors")
                return
    raise RuntimeError("Optimized social preview still exceeds the 250 KiB crawler budget")


def build_ico(destination: Path, images: list[tuple[int, bytes]]) -> None:
    """Write a standards-compliant ICO with PNG-compressed 16px and 32px entries."""
    header = struct.pack("<HHH", 0, 1, len(images))
    directory = bytearray()
    payload = bytearray()
    offset = 6 + 16 * len(images)

    for size, png_data in images:
        directory.extend(struct.pack(
            "<BBBBHHII",
            size if size < 256 else 0,
            size if size < 256 else 0,
            0,
            0,
            1,
            32,
            len(png_data),
            offset,
        ))
        payload.extend(png_data)
        offset += len(png_data)

    destination.write_bytes(header + directory + payload)


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    icon_source = PUBLIC / "favicon.svg"
    social_source = PUBLIC / "og-card.svg"
    social_target = PUBLIC / "og-card.png"
    icon_target = PUBLIC / "favicon-32.png"
    ico_target = PUBLIC / "favicon.ico"

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(device_scale_factor=1)
        render_svg(page, social_source, social_target, 1200, 630, transparent=False)

        optimize_social_preview(social_target)

        favicon_16 = ROOT / ".favicon-16.png"
        render_svg(page, icon_source, favicon_16, 16, 16, transparent=True)
        render_svg(page, icon_source, icon_target, 32, 32, transparent=True)
        browser.close()

    build_ico(ico_target, [
        (16, favicon_16.read_bytes()),
        (32, icon_target.read_bytes()),
    ])
    favicon_16.unlink(missing_ok=True)

    for asset in (social_target, icon_target, ico_target):
        if not asset.is_file() or asset.stat().st_size < 100:
            raise RuntimeError(f"Generated asset is missing or unexpectedly small: {asset}")
        print(f"Rendered {asset.relative_to(ROOT)} ({asset.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
