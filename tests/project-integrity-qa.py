#!/usr/bin/env python3
"""Cross-file integrity audit for source imports, assets, CSS, docs, and CI wiring."""
from __future__ import annotations

import ast
import json
import re
from pathlib import Path

import tinycss2

ROOT = Path(__file__).resolve().parents[1]
checks: list[tuple[bool, str]] = []
warnings: list[str] = []


def check(condition: bool, label: str) -> None:
    checks.append((bool(condition), label))
    print(f"{'PASS' if condition else 'FAIL'} {label}")


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def find_unused_imports(source_path: Path) -> list[str]:
    """Return imported bindings never read in a Python source file."""
    tree = ast.parse(source_path.read_text(encoding="utf-8"), filename=str(source_path))
    imported: list[tuple[str, int]] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported.extend((alias.asname or alias.name.split(".")[0], node.lineno) for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            imported.extend((alias.asname or alias.name, node.lineno) for alias in node.names if alias.name != "annotations")
    loaded = {node.id for node in ast.walk(tree) if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load)}
    return [f"{name} (line {line})" for name, line in imported if name not in loaded]


def resolve_local_module(importer: Path, specifier: str) -> bool:
    base = (importer.parent / specifier).resolve()
    candidates = [base, *(Path(f"{base}{ext}") for ext in ('.ts', '.tsx', '.js', '.mjs', '.css', '.json'))]
    candidates.extend(base / f"index{ext}" for ext in ('.ts', '.tsx', '.js', '.mjs'))
    return any(candidate.is_file() for candidate in candidates)


# 0. Check every Python test utility for dead imports.
python_test_files = sorted((ROOT / "tests").glob("*.py"))
unused_imports = {
    str(file.relative_to(ROOT)): find_unused_imports(file)
    for file in python_test_files
}
unused_imports = {name: items for name, items in unused_imports.items() if items}
check(not unused_imports, f"Python QA utilities have no unused imports ({len(python_test_files)} files scanned)")
for file, items in unused_imports.items():
    print(f"  UNUSED IMPORTS {file}: {', '.join(items)}")

# 1. Local module exports must be consumed by another source module or a test.
module_files = sorted([*ROOT.glob("src/**/*.ts"), *ROOT.glob("src/**/*.tsx"), *ROOT.glob("tests/**/*.ts")])
module_text = {file: file.read_text(encoding="utf-8") for file in module_files}
unused_exports: list[str] = []
export_pattern = re.compile(r"^\s*export\s+(?:type|interface|function|class|const|let|var)\s+(\w+)", re.MULTILINE)
for file, source in module_text.items():
    if file.parent == ROOT / "tests":
        continue
    for name in export_pattern.findall(source):
        used_elsewhere = any(
            other != file and re.search(rf"\b{re.escape(name)}\b", other_source)
            for other, other_source in module_text.items()
        )
        if not used_elsewhere:
            unused_exports.append(f"{file.relative_to(ROOT)} → {name}")
check(not unused_exports, "Named source exports are consumed by another module or test suite")
for item in unused_exports:
    print(f"  UNUSED EXPORT {item}")

# 1. Verify every relative TypeScript/CSS import is connected to a real module.
source_files = sorted([*ROOT.glob("src/**/*.ts"), *ROOT.glob("src/**/*.tsx"), ROOT / "vite.config.ts"])
missing_imports: list[str] = []
for source_file in source_files:
    text = source_file.read_text(encoding="utf-8")
    for match in re.finditer(r"(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(['\"])(\.[^'\"]+)\1", text):
        specifier = match.group(2)
        if not resolve_local_module(source_file, specifier):
            missing_imports.append(f"{source_file.relative_to(ROOT)} → {specifier}")
check(not missing_imports, f"Relative imports resolve ({len(source_files)} TypeScript/config files scanned)")
for item in missing_imports:
    print(f"  MISSING {item}")

# 2. Package scripts and workflow commands must reference declared scripts and real test files.
package = json.loads(read("package.json"))
scripts = package.get("scripts", {})
missing_script_files: list[str] = []
for name, command in scripts.items():
    for match in re.finditer(r"(?:python|node)\s+((?:tests|scripts)/[^\s]+)", command):
        target = match.group(1).strip("'\"`)")
        if not (ROOT / target).is_file():
            missing_script_files.append(f"{name} → {target}")
check(not missing_script_files, "Every package script points to existing test/tool files")
for item in missing_script_files:
    print(f"  MISSING {item}")

workflow = read(".github/workflows/deploy.yml")
workflow_scripts = re.findall(r"npm run ([A-Za-z0-9:_-]+)", workflow)
unknown_workflow_scripts = sorted(set(name for name in workflow_scripts if name not in scripts))
check(not unknown_workflow_scripts, "GitHub Actions invokes only declared npm scripts")
for name in unknown_workflow_scripts:
    print(f"  UNKNOWN npm run {name}")
check("npm run verify" in workflow and "lhci autorun" in workflow and "npm run test:interactions" not in workflow,
      "Deployment workflow delegates the complete test matrix to one release command and runs Lighthouse afterward")
check("path: ./dist" in workflow and "test -s dist/index.html" in workflow and "test -s dist/favicon.svg" in workflow and "test -s dist/favicon-32.png" in workflow and "test -s dist/favicon.ico" in workflow and "test -d dist/assets" in workflow and "test -f dist/.nojekyll" in workflow,
      "The Pages artifact is validated directly from the compiled Vite dist folder, including every favicon format")
check("uses: actions/jekyll-build-pages@v1" not in workflow and "destination: ./_site" not in workflow and "path: ./_site" not in workflow,
      "The deployment bypasses Jekyll packaging and publishes the Vite build without rewriting its files")
check(workflow.index("npm run verify") < workflow.index("Validate the production Pages artifact") < workflow.index("actions/upload-pages-artifact@7b1f4a764d45c48632c6b24a0339c27f5614fb0b"),
      "Build/verification, direct dist validation, and Pages artifact upload occur in the required order")
check(all(f"uses: actions/{action}@{sha}" in workflow for action, sha in [
    ("checkout", "11bd71901bbe5b1630ceea73d27597364c9af683"),
    ("configure-pages", "983d7736d9b0ae728b81ab479565c72886d7745b"),
    ("setup-node", "49933ea5288caeca8642d1e84afbd3f7d6820020"),
    ("setup-python", "a26af69be951a213d495a4c3e4e4022e16d87065"),
    ("upload-artifact", "ea165f8d65b6e75b540449e92b4886f43607fa02"),
    ("upload-pages-artifact", "7b1f4a764d45c48632c6b24a0339c27f5614fb0b"),
    ("deploy-pages", "d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e"),
]), "GitHub Actions dependencies are pinned to verified immutable full-length commit SHAs")
html_shell = read("index.html")
favicon_svg = read("public/favicon.svg")
favicon_png = (ROOT / "public/favicon-32.png").read_bytes()
favicon_ico = (ROOT / "public/favicon.ico").read_bytes()
manifest = read("public/site.webmanifest")
service_worker = read("public/sw.js")
check(all(f'/favicon{suffix}?v=20261109-4' in html_shell for suffix in ('.svg', '-32.png', '.ico')) and '<link rel="mask-icon"' in html_shell and 'rel="icon" type="image/x-icon"' in html_shell,
      "HTML provides refreshed SVG, PNG, ICO, and mask-icon favicon references")
check(favicon_svg.lstrip().startswith("<svg") and favicon_png.startswith(bytes([137, 80, 78, 71, 13, 10, 26, 10])) and favicon_ico[:4] == bytes([0, 0, 1, 0]),
      "All deployed favicon source formats have valid file signatures")
check('favicon.svg?v=20261109-4' in manifest and 'favicon-32.png?v=20261109-4' in manifest,
      "Web app manifest includes refreshed vector and raster icons")
check("legion-portfolio-shell-v17" in service_worker and "favicon.ico?v=20261109-4" in service_worker and "|ico)$/i" in service_worker,
      "Service-worker cache version refreshes and caches every favicon format")
check("legion-portfolio-motion-v7" in html_shell and "prefers-reduced-motion: reduce" in html_shell and "const motionOverride = savedMotion === 'on' || savedMotion === 'off' ? savedMotion : 'system'" in html_shell and "const motionEnabled = savedMotion === 'on' || (savedMotion !== 'off' && !systemReducedMotion)" in html_shell,
      "Early boot follows the OS reduced-motion preference unless a visitor explicitly overrides it")
app_source = read("src/App.tsx")
intro_source = read("src/PortfolioChrome.tsx")
check("return saved === 'on' || saved === 'off' ? saved : 'system'" in app_source and "motionPreference === 'system' && !systemMotionReduced" in app_source and "query.addEventListener('change', update)" in app_source,
      "React motion controls follow live system preference changes while preserving explicit visitor overrides")
check("if (savedMotion === 'off') return false" in intro_source and "window.matchMedia?.('(prefers-reduced-motion: reduce)')" in intro_source and "savedMotion === 'on' || !systemReducedMotion" in intro_source,
      "The intro sequence follows the OS motion preference unless explicitly enabled")
adaptive_source = read("src/adaptive.ts")
check("document.documentElement.dataset.motion === 'off'" in adaptive_source and "prefers-reduced-motion" not in adaptive_source,
      "Adaptive motion load follows the explicit site pause state")
check("cache: npm" in workflow and "npm ci --no-audit --no-fund" in workflow and (ROOT / "package-lock.json").is_file(), "Node setup uses npm caching with the committed lockfile and reproducible npm ci installation")
check("needs: verify-and-package" in workflow and "id-token: write" in workflow and "pages: write" in workflow,
      "Pages deployment waits for verification and has the documented Pages/id-token permissions")
release_runner = read("scripts/portfolio.mjs")
check(all(f"['run', '{name}']" in release_runner for name in ["test:adaptive", "test:integrity", "test:features", "test:production-source", "test:design-browser", "typecheck", "build:app", "audit:bundle", "test:interactions", "test:motion", "test:recruiter-browser"]),
      "Release verification runs source, security, build, bundle, desktop/touch, motion, and compiled recruiter browser suites")

# 3. Ensure static URLs used by HTML, TSX, CSS, and the service worker resolve.
asset_sources = [ROOT / "index.html", *ROOT.glob("src/**/*.ts"), *ROOT.glob("src/**/*.tsx"), ROOT / "src/styles.css", ROOT / "src/layout-integrity.css", ROOT / "public/sw.js", ROOT / "tests/interaction-fixture.html"]
asset_refs: set[str] = set()
for file in asset_sources:
    text = file.read_text(encoding="utf-8")
    for attr, value in re.findall(r"(href|src|content|srcset)\s*=\s*[\"']([^\"']+)[\"']", text):
        if attr == "srcset":
            candidates = [entry.strip().split()[0] for entry in value.split(",") if entry.strip()]
        else:
            candidates = [value]
        for candidate in candidates:
            if candidate.startswith("/") and candidate not in {"/", "/?view=recruiter"} and not candidate.startswith(("//", "/assets/", "/?")):
                asset_refs.add(candidate.split("?", 1)[0].split("#", 1)[0])
    for value in re.findall(r"[\"'`](/(?:profile/[^\"'`,\s]+|King-Art-[^\"'`,\s]+|BACKEND-SETUP\.md|favicon\.svg|og-card\.png))[\"'`]", text):
        asset_refs.add(value.split("?", 1)[0].split("#", 1)[0])
missing_assets: list[str] = []
for url_path in sorted(asset_refs):
    local = url_path.lstrip("/")
    primary = ROOT / local if local.startswith("src/") else ROOT / "public" / local
    fallback = ROOT / local
    if not primary.is_file() and not fallback.is_file():
        missing_assets.append(url_path)
check(not missing_assets, f"Static local asset references resolve ({len(asset_refs)} unique paths)")
for item in missing_assets:
    print(f"  MISSING {item}")

# 4. CSS syntax, classes, custom properties, and keyframes.
css = read("src/styles.css") + "\n" + read("src/layout-integrity.css")
parsed_sheet = tinycss2.parse_stylesheet(css, skip_whitespace=True, skip_comments=True)
orbit_source = read("src/App.tsx")
orbit_categories = ["Software", "Data & Systems", "Embedded", "Creative"]
check(
    all(f'data-category="{category}"' in orbit_source and f"onSelectCategory('{category}')" in orbit_source for category in orbit_categories)
    and orbit_source.count('type="button" className="orbit-node') == 4
    and 'aria-label="Interactive areas of interest:' in orbit_source
    and 'aria-hidden="true"' in orbit_source,
    "Systems orbit exposes four correctly wired, labeled buttons and hides decorative artwork from assistive technology"
)
check(
    "width: clamp(108px, 34%, 156px)" in css
    and ".systems-orbit .orbit-node > span { width: 44px; height: 44px; }" in css
    and "@keyframes orbit-spin { to { transform: translate(-50%,-50%) rotate(360deg); } }" in css
    and "@keyframes orbit-spin-reverse { to { transform: translate(-50%,-50%) rotate(-360deg); } }" in css,
    "Systems orbit keeps its caption contained, its mobile icon targets at 44px, and its animated rings centered"
)
css_errors = [token for token in parsed_sheet if token.type == "error"]


def nested_rules(rules):
    for rule in tinycss2.parse_rule_list(rules, skip_whitespace=True, skip_comments=True):
        if rule.type == "qualified-rule":
            yield rule
        elif rule.type == "at-rule" and rule.content:
            yield from nested_rules(rule.content)


qualified = list(nested_rules(css))
for rule in qualified:
    declarations = tinycss2.parse_declaration_list(rule.content, skip_whitespace=True, skip_comments=True)
    css_errors.extend(token for token in declarations if token.type == "error")
check(not css_errors, f"Stylesheet parses without syntax errors ({len(qualified)} qualified rules)")

style_sources = "\n".join(file.read_text(encoding="utf-8") for file in [*ROOT.glob("src/**/*.ts"), *ROOT.glob("src/**/*.tsx"), ROOT / "index.html"])
css_classes: set[str] = set()
css_ids: set[str] = set()
for rule in qualified:
    selector = tinycss2.serialize(rule.prelude)
    css_classes.update(re.findall(r"\.([_a-zA-Z][\w-]*)", selector))
    css_ids.update(re.findall(r"#([_a-zA-Z][\w-]*)", selector))

visuals = set(re.findall(r"visual:\s*'([^']+)'", read("src/data.ts")))
dynamic_classes = {f"project-{visual}" for visual in visuals} | {f"recruiter-art-{visual}" for visual in visuals}
unused_classes = sorted(name for name in css_classes - dynamic_classes if not re.search(r"(?<![\w-])" + re.escape(name) + r"(?![\w-])", style_sources))
check(not unused_classes, f"CSS class selectors are referenced or data-generated ({len(css_classes)} unique selectors)")
for name in unused_classes:
    print(f"  UNUSED SELECTOR .{name}")

custom_props = set(re.findall(r"(--[\w-]+)\s*:", css))
used_props = set(re.findall(r"var\(\s*(--[\w-]+)", css))
code_custom_props = set(re.findall(r"['\"](--[\w-]+)['\"]", style_sources))
unused_props = sorted(custom_props - used_props - code_custom_props)
undefined_props = sorted(used_props - custom_props - code_custom_props)
check(not unused_props, f"Design tokens are consumed ({len(custom_props)} CSS custom properties)")
check(not undefined_props, "Every CSS variable reference has a definition or explicit code-side value")
for name in unused_props:
    print(f"  UNUSED TOKEN {name}")
for name in undefined_props:
    print(f"  UNDEFINED TOKEN {name}")

keyframes = set(re.findall(r"@(?:-webkit-)?keyframes\s+([\w-]+)", css))
animated_names: set[str] = set()
for rule in qualified:
    declarations = tinycss2.parse_declaration_list(rule.content, skip_whitespace=True, skip_comments=True)
    for declaration in declarations:
        if declaration.type == "declaration" and declaration.name.lower() in {"animation", "animation-name"}:
            value = tinycss2.serialize(declaration.value)
            animated_names.update(name for name in keyframes if re.search(r"(?<![\w-])" + re.escape(name) + r"(?![\w-])", value))
unused_keyframes = sorted(keyframes - animated_names)
check(not unused_keyframes, f"Keyframe animations have live references ({len(keyframes)} defined)")
for name in unused_keyframes:
    print(f"  UNUSED KEYFRAME {name}")

# 5. Documentation links, duplicated deploy guide, PDF-only policy, and design source ownership.
active_docs = ["README.md", "CHANGELOG.md", "SOURCES.md", "BACKEND-SETUP.md", "CONTENT-CHECKLIST.md", "PRODUCTION-QUALITY.md", "RECRUITER-VIEW.md", "UI-MOTION-DESIGN.md", "VISUAL-DESIGN-SYSTEM.md", "VIEW-TRANSITION-LIFECYCLE.md", "design-assets/README.md", "public/llms.txt", "public/profile.md", "public/projects.md", "public/experience.md"]
missing_doc_links: list[str] = []
for doc_name in active_docs:
    content = read(doc_name)
    for target in re.findall(r"(?<!!)\[[^\]]+\]\(([^)]+)\)", content):
        target = target.strip().split("#", 1)[0]
        if not target or re.match(r"(?:https?:|mailto:|tel:)", target):
            continue
        target = target.split("?", 1)[0]
        candidate = (ROOT / doc_name).parent / target
        if not candidate.exists():
            missing_doc_links.append(f"{doc_name} → {target}")
check(not missing_doc_links, "Active documentation links resolve")
for item in missing_doc_links:
    print(f"  BROKEN LINK {item}")
check(read("BACKEND-SETUP.md") == read("public/BACKEND-SETUP.md"), "Deployed backend setup guide exactly matches its maintained source")
check((ROOT / "design-assets/og-card.svg").is_file() and (ROOT / "public/og-card.png").is_file() and "og-card.svg" not in read("index.html"),
      "Social-card vector master is retained outside public assets; PNG is the deployed crawler image")
public_files = [path for path in (ROOT / "public").rglob("*") if path.is_file()]
check(not any(path.suffix.lower() in {".doc", ".docx", ".odt"} for path in public_files), "Public assets contain no editable Word/OpenDocument files")
check((ROOT / "public/King-Art-Pacumberto-CV.pdf").read_bytes().startswith(b"%PDF") and (ROOT / "public/King-Art-Pacumberto-Resume.pdf").read_bytes().startswith(b"%PDF"),
      "Both document downloads are valid PDF containers")
check(not any("private" in path.name.lower() for path in public_files), "No private-CV filename is present in public assets")

# 6. No-unused compiler policy and exact direct dependency pins.
app_tsconfig = json.loads(read("tsconfig.app.json"))['compilerOptions']
check(app_tsconfig.get("strict") is True and app_tsconfig.get("noUnusedLocals") is True and app_tsconfig.get("noUnusedParameters") is True,
      "Application TypeScript compiler rejects unused locals/parameters")
all_deps = {**package.get("dependencies", {}), **package.get("devDependencies", {})}
unpinned = sorted(name for name, version in all_deps.items() if not re.fullmatch(r"\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?", version))
check(not unpinned, "Direct npm dependencies use exact versions rather than floating ranges")
for name in unpinned:
    print(f"  FLOATING DEPENDENCY {name}: {all_deps[name]}")
lock_path = ROOT / "package-lock.json"
if lock_path.is_file():
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    check(lock.get("name") == package.get("name") and lock.get("version") == package.get("version") and lock.get("lockfileVersion", 0) >= 3,
          "Package lock matches project identity and uses a modern npm lockfile format")
else:
    warnings.append("package-lock.json is not committed in this release; CI npm install resolves the exact direct pins and produces an ephemeral lock. Commit the generated lockfile once registry access is available to make transitive installs fully reproducible.")

# 7. Archive traceability and automatic backup coverage.
legacy_release_logs = [
    path for path in ROOT.glob("*.md")
    if re.search(r"(?:QA|AUDIT)(?:-|\.md$)", path.name, flags=re.IGNORECASE)
]
check((ROOT / "CHANGELOG.md").is_file() and not legacy_release_logs and not (ROOT / "docs/releases").exists(),
      "Historical QA/update reports are consolidated into one changelog with no duplicate archive folder")
backup_script = read("scripts/portfolio.mjs")
check("snapshotRoots()" in backup_script and "excludedSecretPattern" in backup_script and "excludedSnapshotFilePattern" in backup_script and "__pycache__" in backup_script and ".qa-build" in backup_script and "snapshotItems" not in backup_script,
      "Backup inventory is automatic and excludes local secrets/build/cache/compiler artifacts")
check("__pycache__/" in read(".gitignore") and "*.py[cod]" in read(".gitignore") and ".qa-build/" in read(".gitignore") and "*.tsbuildinfo" in read(".gitignore"),
      "Generated Python, TypeScript, browser-test, and build artifacts are ignored")

failures = [label for ok, label in checks if not ok]
print(f"\n{len(checks) - len(failures)}/{len(checks)} cross-file integrity checks passed.")
for warning in warnings:
    print(f"WARNING: {warning}")
if failures:
    print("Failures:")
    for label in failures:
        print(f" - {label}")
    raise SystemExit(1)
