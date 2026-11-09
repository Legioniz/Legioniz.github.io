#!/usr/bin/env python3
"""Production-build browser checks for public comments and the Supabase client contract."""
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
BASE = "http://127.0.0.1:4175/"
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "https://pjuwrngnrrvdiwqspkic.supabase.co").rstrip("/")
PUBLIC_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY", "sb_publishable_PRGb0-smtTzCm9VHuM9NOQ_ZFh1wKRS")


def wait_for_server(process: subprocess.Popen) -> None:
    deadline = time.time() + 35
    last_error = None
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


def preflight(route) -> bool:
    if route.request.method != "OPTIONS":
        return False
    route.fulfill(
        status=204,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
            "Access-Control-Max-Age": "600",
        },
        body="",
    )
    return True


def main() -> None:
    npm = shutil.which("npm") or "npm"
    server = subprocess.Popen(
        [npm, "run", "preview", "--", "--host", "127.0.0.1", "--port", "4175", "--strictPort"],
        cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT,
    )
    checks: list[tuple[bool, str]] = []
    page_errors: list[str] = []
    comment_reads: list[dict] = []
    comment_posts: list[dict] = []

    def check(condition: bool, label: str) -> None:
        checks.append((bool(condition), label))
        print(f"{'PASS' if condition else 'FAIL'} {label}")

    try:
        wait_for_server(server)
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            context = browser.new_context(
                viewport={"width": 1440, "height": 1000},
                service_workers="block",
            )
            page = context.new_page()
            page.on("pageerror", lambda error: page_errors.append(str(error)))

            def approved_comments(route):
                if preflight(route):
                    return
                request = route.request
                comment_reads.append({"url": request.url, "headers": request.headers})
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    headers={"Access-Control-Allow-Origin": "*", "Cache-Control": "no-store"},
                    body=json.dumps([{
                        "id": "e2f514e7-2b74-4ae4-b260-93edca8258fc",
                        "display_name": "Integration Tester",
                        "body": "Approved feed fixture: the public comments reader is connected.",
                        "status": "approved",
                        "created_at": "2026-11-09T07:00:00Z",
                        "updated_at": "2026-11-09T07:00:00Z",
                    }]),
                )

            def submit_comment(route):
                if preflight(route):
                    return
                request = route.request
                try:
                    payload = json.loads(request.post_data or "{}")
                except json.JSONDecodeError:
                    payload = {}
                comment_posts.append({"payload": payload, "headers": request.headers})
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    headers={"Access-Control-Allow-Origin": "*", "Cache-Control": "no-store"},
                    body=json.dumps({"ok": True}),
                )

            page.route(f"{SUPABASE_URL}/rest/v1/comments**", approved_comments)
            page.route(f"{SUPABASE_URL}/functions/v1/portfolio-submit**", submit_comment)

            response = page.goto(BASE, wait_until="domcontentloaded", timeout=30000)
            check(response is not None and response.status == 200, "Production build serves the full portfolio")
            page.locator(".comments-panel").scroll_into_view_if_needed()
            page.locator("#comments-title").wait_for(timeout=10000)
            check(not page.locator("#public-note-name").is_disabled()
                  and not page.locator("#public-note-body").is_disabled(),
                  "Public comment name and body fields are enabled in the production build")
            page.wait_for_function(
                "document.querySelector('.approved-comment')?.textContent.includes('Approved feed fixture')",
                timeout=10000,
            )
            check(page.locator(".approved-comment").count() == 1
                  and page.get_by_text("Approved feed fixture: the public comments reader is connected.").count() == 1,
                  "Approved comments render from the Supabase REST read path")

            first_read = comment_reads[0] if comment_reads else {}
            check("status=eq.approved" in first_read.get("url", ""),
                  "Public feed explicitly queries approved records only")
            check(first_read.get("headers", {}).get("apikey") == PUBLIC_KEY
                  and not first_read.get("headers", {}).get("authorization"),
                  "Anonymous feed requests use the public API key without an Authorization token")

            page.get_by_role("button", name="Refresh public notes").click()
            deadline = time.time() + 5
            while len(comment_reads) < 2 and time.time() < deadline:
                page.wait_for_timeout(50)
            check(len(comment_reads) >= 2, "Manual refresh issues a fresh uncached approved-comment request")

            page.locator("#public-note-name").fill("QA Visitor")
            page.locator("#public-note-body").fill("The public comment form submits through the moderation endpoint.")
            submit = page.locator(".comment-submit")
            check(not submit.is_disabled(), "Comment submission activates after valid display name and text are entered")
            submit.click()
            page.get_by_text(
                "Your note is in the moderation queue. It will appear publicly after approval.",
                exact=True,
            ).wait_for(timeout=10000)
            check(len(comment_posts) == 1, "A single public comment submission reaches the Edge Function")
            submitted = comment_posts[0] if comment_posts else {}
            payload = submitted.get("payload", {})
            headers = submitted.get("headers", {})
            check(payload.get("kind") == "comment"
                  and payload.get("display_name") == "QA Visitor"
                  and payload.get("body") == "The public comment form submits through the moderation endpoint.",
                  "Comment payload matches the server-side Edge Function contract")
            check(payload.get("website") == "" and payload.get("turnstileToken") == "",
                  "Comment submission sends an empty honeypot and the optional CAPTCHA token field")
            check(headers.get("apikey") == PUBLIC_KEY and not headers.get("authorization"),
                  "Public submission uses the publishable key without leaking an admin session")
            check(page.locator("#public-note-name").input_value() == ""
                  and page.locator("#public-note-body").input_value() == "",
                  "Successful submission clears the composer after server confirmation")
            check(page.locator(".approved-comment").count() == 1,
                  "Pending submissions are not inserted into the public approved feed optimistically")
            check(not page_errors, f"No uncaught browser errors ({page_errors})")

            browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=5)

    failures = [label for ok, label in checks if not ok]
    print(f"\nComment browser QA: {len(checks) - len(failures)}/{len(checks)} checks passed.")
    if failures:
        print("Failures:")
        for label in failures:
            print(f" - {label}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
