from __future__ import annotations
import json
import shutil
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests/interaction-fixture.html"


def main() -> None:
    build = ROOT / ".qa-build"
    build.mkdir(exist_ok=True)
    compile_result = subprocess.run(
        ["tsc", "--ignoreConfig", "src/sound.ts", "--target", "ES2022", "--module", "ES2022", "--lib", "ES2022,DOM", "--strict", "--outDir", str(build)],
        cwd=ROOT, capture_output=True, text=True,
    )
    if compile_result.returncode:
        raise RuntimeError("sound.ts typecheck failed:\n" + compile_result.stdout + compile_result.stderr)

    css = (ROOT / "src/styles.css").read_text(encoding="utf-8")
    fixture = FIXTURE.read_text(encoding="utf-8")
    fixture = fixture.replace('<link rel="stylesheet" href="../src/styles.css" />', f'<style>{css}</style>')
    sound_module = (build / "sound.js").read_text(encoding="utf-8")
    fixture = fixture.replace(
        "    const { installInteractionSounds } = await import('../.qa-build/sound.js')\n", "",
    )
    fixture = fixture.replace('<script type="module">', '<script type="module">\n' + sound_module + '\n')

    results: dict[str, object] = {"checks": [], "failures": []}

    def check(condition: bool, message: str) -> None:
        results["checks"].append({"name": message, "passed": bool(condition)})
        if not condition:
            results["failures"].append(message)

    try:
        with sync_playwright() as p:
            browser_binary = (
                __import__("os").environ.get("CHROMIUM_PATH")
                or shutil.which("chromium")
                or shutil.which("chromium-browser")
                or shutil.which("chrome")
                or shutil.which("msedge")
            )
            launch_options = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage"]}
            if browser_binary:
                launch_options["executable_path"] = browser_binary
            browser = p.chromium.launch(**launch_options)
            desktop = browser.new_page(viewport={"width": 1440, "height": 1000})
            page_errors: list[str] = []
            desktop.on("pageerror", lambda error: page_errors.append(str(error)))
            desktop.set_content(fixture, wait_until="domcontentloaded")
            desktop.wait_for_timeout(150)
            check(await_audio_zero(desktop), "No sound starts before a visitor interaction")

            # Browser audio policies require a trusted first gesture before hover cues.
            desktop.locator("#sound-unlock").click()
            desktop.wait_for_timeout(40)
            check(await_audio_tones(desktop) >= 1, "A trusted initial interaction unlocks synthesized UI audio")

            card = desktop.locator(".project-card")
            before_hover = await_audio_tones(desktop)
            card.hover()
            desktop.wait_for_timeout(700)
            panel_state = desktop.locator(".project-peek").evaluate("el => ({opacity:getComputedStyle(el).opacity, visibility:getComputedStyle(el).visibility, transform:getComputedStyle(el).transform})")
            check(float(panel_state["opacity"]) > .95 and panel_state["visibility"] == "visible", "Project quick-view panel slides in on desktop hover")
            project_hover_tones = desktop.evaluate("() => window.__audioContext.tones.slice(-2)")
            check(await_audio_tones(desktop) >= before_hover + 2 and len(project_hover_tones) == 2, "Project hover has its own two-note sound")

            before_nav_hover = await_audio_tones(desktop)
            desktop.locator("#nav-hover").hover()
            desktop.wait_for_timeout(100)
            nav_hover_tones = desktop.evaluate("() => window.__audioContext.tones.slice(-2)")
            check(await_audio_tones(desktop) >= before_nav_hover + 2 and nav_hover_tones[0] != project_hover_tones[0], "Navigation hover uses a different sonic signature")

            before_link_hover = await_audio_tones(desktop)
            desktop.locator("#content-hover").hover()
            desktop.wait_for_timeout(100)
            link_hover_tones = desktop.evaluate("() => window.__audioContext.tones.slice(-2)")
            check(await_audio_tones(desktop) >= before_link_hover + 2 and link_hover_tones[0] != nav_hover_tones[0], "Content links use a distinct hover sound from navigation")

            input_field = desktop.locator("#qa-input")
            input_field.click()
            desktop.wait_for_timeout(130)
            focus_frequency_before = desktop.evaluate("() => window.__audioContext.tones.length")
            input_field.fill("portfolio test")
            input_field.press("Tab")
            desktop.wait_for_timeout(120)
            check(await_audio_tones(desktop) > focus_frequency_before, "Text field change produces its own interaction cue")

            select_field = desktop.locator("#qa-select")
            before_select = await_audio_tones(desktop)
            select_field.select_option("b")
            desktop.wait_for_timeout(80)
            select_tones = desktop.evaluate("() => window.__audioContext.tones.slice(-2)")
            check(await_audio_tones(desktop) >= before_select + 2 and select_tones[0] != nav_hover_tones[0], "Select control uses a distinct two-note cue")

            before_submit = await_audio_tones(desktop)
            desktop.locator("#qa-submit").click()
            desktop.wait_for_timeout(80)
            submit_delta = await_audio_tones(desktop) - before_submit
            check(3 <= submit_delta < 7, "Form submission plays one dedicated confirmation cue without double-playing")

            before_open = await_audio_tones(desktop)
            card.click()
            desktop.wait_for_timeout(80)
            check(not desktop.locator("#qa-modal").is_hidden(), "Clicking the whole project card opens the project introduction")
            check(await_audio_tones(desktop) >= before_open + 3, "Project open action produces its unique three-note sound")
            desktop.locator("#close-project").click()
            check(desktop.locator("#qa-modal").is_hidden(), "Project introduction can be closed")

            desktop.locator("#sound-unlock").focus()
            desktop.wait_for_timeout(100)
            before_focus = await_audio_tones(desktop)
            desktop.keyboard.press("Tab")
            desktop.wait_for_timeout(70)
            after_focus = await_audio_tones(desktop)
            focus_target = desktop.evaluate("() => ({tag:document.activeElement?.tagName,id:document.activeElement?.id,role:document.activeElement?.getAttribute('role'),keyboardModality:document.documentElement.dataset.keyboardModality || null})")
            check(after_focus > before_focus, f"Keyboard Tab focus receives a distinct focus marker sound (before={before_focus}, after={after_focus}, target={focus_target})")
            card.focus()
            desktop.keyboard.press("Enter")
            check(not desktop.locator("#qa-modal").is_hidden(), "Keyboard Enter also opens a project introduction")
            desktop.locator("#close-project").click()

            details = desktop.locator(".qa-details")
            before_toggle = await_audio_tones(desktop)
            details.locator("summary").click()
            check(details.get_attribute("open") is not None, "Disclosure summary toggles open")
            check(await_audio_tones(desktop) >= before_toggle + 2, "Disclosure toggle produces its distinct two-note sound")

            toggle = desktop.locator("#toggle-control")
            before_click = await_audio_tones(desktop)
            toggle.hover()
            toggle.click()
            check(toggle.get_attribute("data-toggled") == "yes", "Standard interactive button responds to click")
            check(await_audio_tones(desktop) > before_click, "Standard button produces hover/click sound feedback")

            before_mute = await_audio_tones(desktop)
            desktop.locator("#qa-sound-toggle").click()
            desktop.wait_for_timeout(50)
            check(await_audio_tones(desktop) >= before_mute + 2, "Sound toggle gives a final distinct cue while switching sound off")
            check(not desktop.evaluate("() => window.__soundEnabled"), "Sound preference can be disabled")
            muted_before = await_audio_tones(desktop)
            toggle.click()
            check(await_audio_tones(desktop) == muted_before, "Muted preference suppresses subsequent action sounds")
            desktop.locator("#qa-sound-toggle").click()
            check(desktop.evaluate("() => window.__soundEnabled") and await_audio_tones(desktop) >= muted_before + 2, "Sound can be re-enabled with an audible toggle cue")

            desktop.locator("html").evaluate("el => {el.dataset.motion = 'off'}")
            card.hover()
            desktop.wait_for_timeout(100)
            check(desktop.locator(".project-peek").evaluate("el => getComputedStyle(el).display") == "none", "Motion pause suppresses decorative project pop-out")
            card.click()
            check(not desktop.locator("#qa-modal").is_hidden(), "Project remains operable when decorative motion is paused")
            check(not page_errors, "Desktop fixture has no browser JavaScript errors")
            browser.close()

            mobile_browser = p.chromium.launch(**launch_options)
            context = mobile_browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
            phone = context.new_page()
            mobile_errors: list[str] = []
            phone.on("pageerror", lambda error: mobile_errors.append(str(error)))
            phone.set_content(fixture, wait_until="domcontentloaded")
            phone.wait_for_timeout(120)
            check(phone.locator(".project-peek").evaluate("el => getComputedStyle(el).display") == "none", "Touch layout does not expose hover-only project panel")
            phone.locator(".project-card").tap()
            check(not phone.locator("#qa-modal").is_hidden(), "Tapping a project card opens its details on touch devices")
            check(not phone.evaluate("document.documentElement.scrollWidth > window.innerWidth"), "390px mobile interaction layout has no horizontal overflow")
            check(not mobile_errors, "Mobile fixture has no browser JavaScript errors")
            mobile_browser.close()
    finally:
        subprocess.run(["rm", "-rf", str(build)], check=False)

    print(json.dumps(results, indent=2))
    if results["failures"]:
        raise SystemExit(1)
    print("\nInteraction browser QA passed.")


def await_audio_zero(page) -> bool:
    return page.evaluate("() => !window.__audioContext || window.__audioContext.tones.length === 0")


def await_audio_tones(page) -> int:
    return page.evaluate("() => window.__audioContext ? window.__audioContext.tones.length : 0")


if __name__ == "__main__":
    main()
