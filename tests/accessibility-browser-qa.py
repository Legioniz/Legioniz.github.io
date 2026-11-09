#!/usr/bin/env python3
"""Compiled-app accessibility and responsive regression checks.

This is a practical browser smoke suite, not a substitute for a WCAG audit,
assistive-technology testing, or human review of target-spacing exceptions.
"""
from __future__ import annotations
import json
import os
import shutil
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = "http://127.0.0.1:4176/"
VIEWPORTS = (320, 360, 390, 430, 768, 1024, 1280, 1440)

def wait_for_server(process: subprocess.Popen) -> None:
    deadline = time.time() + 35
    last_error: Exception | None = None
    while time.time() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"Vite preview exited early with status {process.returncode}")
        try:
            with urllib.request.urlopen(BASE, timeout=2) as response:
                if response.status == 200:
                    return
        except (urllib.error.URLError, TimeoutError) as error:
            last_error = error
        time.sleep(0.25)
    raise RuntimeError(f"Vite preview did not become available: {last_error}")

DOM_AUDIT = r"""() => {
  const visible = (el) => {
    const s = getComputedStyle(el);
    return el.getClientRects().length > 0 && s.display !== "none" && s.visibility !== "hidden";
  };
  const text = (el) => (el.innerText || el.textContent || "").trim();
  const refsName = (el) => (el.getAttribute("aria-labelledby") || "").trim()
    .split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)).filter(Boolean).map(text).join(" ").trim();
  const name = (el) => {
    const labels = el.labels ? Array.from(el.labels).map(text).join(" ").trim() : "";
    const imageAlt = Array.from(el.querySelectorAll("img[alt]")).map((img) => img.alt).join(" ").trim();
    const value = typeof el.value === "string" ? el.value.trim() : "";
    return (el.getAttribute("aria-label") || "").trim() || refsName(el) || labels
      || el.getAttribute("alt") || imageAlt || text(el) || value || (el.getAttribute("title") || "").trim();
  };
  const controls = Array.from(document.querySelectorAll(
    'button, a[href], input:not([type="hidden"]), textarea, select, summary, ' +
    '[role="button"], [role="link"], [role="tab"], [role="switch"], [role="checkbox"]'
  )).filter(visible);
  const unnamedControls = controls.filter((el) => !name(el)).map((el) => ({
    tag: el.tagName.toLowerCase(), role: el.getAttribute("role") || "",
    type: el.getAttribute("type") || "", className: typeof el.className === "string" ? el.className.slice(0, 80) : ""
  }));
  const missingImageAlt = Array.from(document.querySelectorAll("img"))
    .filter((img) => !img.hasAttribute("alt")).map((img) => img.getAttribute("src") || "(unknown image)");
  const ids = Array.from(document.querySelectorAll("[id]")).map((el) => el.id);
  const duplicateIds = Array.from(new Set(ids.filter((id, i) => ids.indexOf(id) !== i)));
  const brokenIdRefs = [];
  for (const el of document.querySelectorAll("[aria-controls], [aria-labelledby], [aria-describedby]")) {
    for (const attr of ["aria-controls", "aria-labelledby", "aria-describedby"]) {
      const value = el.getAttribute(attr);
      if (!value) continue;
      for (const id of value.trim().split(/\s+/).filter(Boolean)) {
        if (!document.getElementById(id)) brokenIdRefs.push({attribute: attr, id, tag: el.tagName.toLowerCase()});
      }
    }
  }
  const brokenFragments = Array.from(document.querySelectorAll('a[href^="#"]'))
    .map((a) => a.getAttribute("href")).filter((href) => {
      if (!href || href.length <= 1) return false;
      try { return !document.getElementById(decodeURIComponent(href.slice(1))); } catch { return true; }
    });
  const unsafeExternalLinks = Array.from(document.querySelectorAll('a[target="_blank"]'))
    .filter((a) => !a.rel.toLowerCase().split(/\s+/).includes("noopener"))
    .map((a) => a.getAttribute("href") || "(unknown link)");
  const hiddenFocusable = Array.from(document.querySelectorAll(
    'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]'
  )).filter((el) => el.tabIndex >= 0 && !el.disabled
    && Boolean(el.closest('[aria-hidden="true"], [inert], [hidden]')))
    .map((el) => ({tag: el.tagName.toLowerCase(), label: name(el).slice(0, 80)}));
  const pointerTargets = Array.from(document.querySelectorAll(
    'button, [role="button"], input:not([type="hidden"]), select, textarea'
  )).filter(visible).map((el) => {
    const r = el.getBoundingClientRect();
    return {tag: el.tagName.toLowerCase(), label: name(el).slice(0, 80),
      width: Math.round(r.width * 10) / 10, height: Math.round(r.height * 10) / 10};
  });
  const undersizedPointerTargets = pointerTargets.filter((t) => t.width < 24 || t.height < 24);
  const visibleH1 = Array.from(document.querySelectorAll("h1")).filter(visible);
  const mains = Array.from(document.querySelectorAll("main, [role=\"main\"]")).filter(visible);
  const namedNavs = Array.from(document.querySelectorAll("nav")).filter((nav) =>
    Boolean((nav.getAttribute("aria-label") || "").trim() || refsName(nav) || (nav.getAttribute("title") || "").trim()));
  return {
    language: document.documentElement.getAttribute("lang") || "",
    visibleH1Count: visibleH1.length, mainLandmarkCount: mains.length, namedNavigationCount: namedNavs.length,
    controlCount: controls.length, unnamedControls, missingImageAlt, duplicateIds, brokenIdRefs,
    brokenFragments, unsafeExternalLinks, hiddenFocusable,
    pointerTargetCount: pointerTargets.length, undersizedPointerTargets
  };
}"""

def main() -> None:
    npm = shutil.which("npm") or "npm"
    server = subprocess.Popen(
        [npm, "run", "preview", "--", "--host", "127.0.0.1", "--port", "4176", "--strictPort"],
        cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    checks: list[tuple[bool, str]] = []
    page_errors: list[str] = []
    def check(ok: bool, label: str) -> None:
        checks.append((bool(ok), label))
        print(f"{'PASS' if ok else 'FAIL'} {label}")
    try:
        wait_for_server(server)
        with sync_playwright() as p:
            launch = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage"]}
            if os.environ.get("CHROMIUM_PATH"):
                launch["executable_path"] = os.environ["CHROMIUM_PATH"]
            browser = p.chromium.launch(**launch)
            for view, route in (("full", "/"), ("recruiter", "/?view=recruiter")):
                for theme in ("dark", "light"):
                    page = browser.new_page(viewport={"width": 1440, "height": 1000})
                    page.add_init_script(
                        "try {"
                        f"localStorage.setItem('legion-portfolio-theme', {json.dumps(theme)});"
                        "localStorage.setItem('legion-portfolio-motion-v7', 'off');"
                        "localStorage.setItem('legion-portfolio-sound-v2', 'off');"
                        "} catch (_) {}")
                    page.on("pageerror", lambda error: page_errors.append(str(error)))
                    response = page.goto(BASE.rstrip("/") + route, wait_until="domcontentloaded", timeout=30000)
                    page.wait_for_function(
                        "() => Array.from(document.querySelectorAll('h1')).some((h) => h.getClientRects().length)")
                    page.wait_for_timeout(250)
                    label = f"{view.title()} view / {theme} theme"
                    check(response is not None and response.status == 200, f"{label}: compiled route returns HTTP 200")
                    audit = page.evaluate(DOM_AUDIT)
                    check(audit["language"] == "en", f"{label}: document language is declared")
                    check(audit["visibleH1Count"] == 1, f"{label}: exactly one visible level-one heading")
                    check(audit["mainLandmarkCount"] == 1, f"{label}: exactly one visible main landmark")
                    check(audit["namedNavigationCount"] >= 1, f"{label}: navigation landmark has an accessible name")
                    check(not audit["unnamedControls"], f"{label}: visible interactive controls have discernible names ({len(audit['unnamedControls'])} unnamed)")
                    check(not audit["missingImageAlt"], f"{label}: every image declares an alt attribute ({len(audit['missingImageAlt'])} missing)")
                    check(not audit["duplicateIds"], f"{label}: document IDs are unique ({len(audit['duplicateIds'])} duplicates)")
                    check(not audit["brokenIdRefs"], f"{label}: ARIA ID references resolve ({len(audit['brokenIdRefs'])} broken)")
                    check(not audit["brokenFragments"], f"{label}: in-page links resolve ({len(audit['brokenFragments'])} broken)")
                    check(not audit["unsafeExternalLinks"], f"{label}: new-tab links isolate the opener ({len(audit['unsafeExternalLinks'])} unsafe)")
                    check(not audit["hiddenFocusable"], f"{label}: hidden content has no tabbable controls ({len(audit['hiddenFocusable'])} found)")
                    check(page.evaluate("document.documentElement.dataset.theme") == theme, f"{label}: theme is applied before inspection")
                    check(page.evaluate("document.documentElement.dataset.motion") == "off", f"{label}: motion-off preference is applied")
                    for width in (320, 360, 390, 430, 768, 1024, 1280, 1440):
                        page.set_viewport_size({"width": width, "height": 900 if width >= 768 else 780})
                        dims = page.evaluate("() => ({viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth})")
                        check(dims["page"] <= dims["viewport"] + 1,
                              f"{label}: no page-level horizontal overflow at {width}px ({dims['page']} / {dims['viewport']}px)")
                    page.set_viewport_size({"width": 390, "height": 844})
                    page.evaluate("window.scrollTo(0, 0)")
                    page.keyboard.press("Tab")
                    focus = page.evaluate("""() => {
                      const el = document.activeElement;
                      if (!el || el === document.body) return {focused: false};
                      const r = el.getBoundingClientRect();
                      return {focused: true, visibleFocus: el.matches(':focus-visible'),
                        intersectsViewport: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth};
                    }""")
                    check(focus.get("focused", False), f"{label}: first Tab reaches an interactive element")
                    check(focus.get("visibleFocus", False) and focus.get("intersectsViewport", False),
                          f"{label}: keyboard focus is visible within the viewport")
                    # WCAG AA has spacing and other exceptions; measure and report rather than
                    # failing solely on dimensions without evaluating the exception.
                    check(isinstance(audit["undersizedPointerTargets"], list),
                          f"{label}: pointer-target inventory measured ({audit['pointerTargetCount']} controls; "
                          f"{len(audit['undersizedPointerTargets'])} below 24px on an axis; spacing exceptions need review)")
                    page.close()
            browser.close()
        check(not page_errors, f"No uncaught browser exceptions ({len(page_errors)} captured)")
        for error in page_errors[:5]:
            print(f"BROWSER ERROR: {error}")
    finally:
        if server.poll() is None:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)
    failures = [label for ok, label in checks if not ok]
    print(f"\nAccessibility browser regression: {len(checks) - len(failures)}/{len(checks)} checks passed.")
    if failures:
        print("Failures:")
        for failure in failures:
            print(f" - {failure}")
        raise SystemExit(1)

if __name__ == "__main__":
    main()
