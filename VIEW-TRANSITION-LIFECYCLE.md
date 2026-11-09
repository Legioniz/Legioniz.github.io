# View Transition Lifecycle Fix

## Symptom
Switching between `/?view=recruiter` and the full portfolio could leave sections, reveal effects, the floating header, and scroll navigation in a stale or partially initialized state until a manual refresh.

## Root cause
The application keeps the top-level React `App` component mounted, but its conditional return replaces the entire rendered DOM tree. Several effects were initialized only once (or only when a preference changed) and captured DOM elements from the previous view. After a transition, their observers and event handlers still referenced disconnected elements.

## Fix
- The masthead controller now detaches while Recruiter View is active and rebinds to the newly mounted full-view header when returning.
- The section `IntersectionObserver` is recreated for the current full-view sections; it resets active navigation state and has a safe fallback when the API is unavailable.
- The scroll-reveal `useLayoutEffect` is scoped only to `#main-content`, skipped in Recruiter View, and reinitialized whenever the full DOM subtree remounts.
- Motion-zone observers are detached in Recruiter View and rebound to the current full-view nodes on return.
- `popstate` navigation now resets scroll to the top only when switching between the two different layouts, avoiding a stale offset from the other page.
- The service-worker shell cache is bumped to `v4` so deployed clients fetch the corrected app shell.

## Regression coverage
The recruiter browser test now checks main content, sections, reveal runtime, header/progress nodes, Quick Navigator, back/forward navigation, and repeated round trips between both views without reloading.

## Verification boundary
Source/security tests and static preflight can run locally. The browser test requires the installed Vite/React dependencies and a Chromium executable; this environment currently has Chromium and Playwright but npm registry DNS is unavailable, so the compiled-app browser run must be performed in GitHub Actions or after dependencies are installed.
