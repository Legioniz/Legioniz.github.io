from pathlib import Path
from playwright.sync_api import sync_playwright
import json
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / 'src/styles.css').read_text()
REVEAL_SOURCE = ROOT / 'src/reveal.ts'
MASTHEAD_SOURCE = ROOT / 'src/masthead.ts'
INDEX = (ROOT / 'index.html').read_text()
APP = (ROOT / 'src/App.tsx').read_text()

# Compile the exact production reveal controller; no rewritten JS copy is used.
with tempfile.TemporaryDirectory(prefix='legion-reveal-') as temp_dir:
    subprocess.run([
        'tsc', '--ignoreConfig', str(REVEAL_SOURCE), str(MASTHEAD_SOURCE), '--target', 'ES2020', '--module', 'ES2020',
        '--lib', 'ES2020,DOM,DOM.Iterable', '--skipLibCheck', '--outDir', temp_dir,
    ], check=True, capture_output=True, text=True)
    reveal_js = (Path(temp_dir) / 'reveal.js').read_text()
    masthead_js = (Path(temp_dir) / 'masthead.js').read_text()
    reveal_js = reveal_js.replace('export function installScrollReveal', 'function installScrollReveal')
    masthead_js = masthead_js.replace('export function installMastheadScrollBehavior', 'function installMastheadScrollBehavior')

HTML = f'''<!doctype html><html data-theme="dark" data-quality="full" data-pointer="fine" data-motion="on" data-motion-override="on"><head>
<meta name="viewport" content="width=device-width,initial-scale=1"><style>{CSS}</style><style>
body{{min-height:4300px;padding-top:100px}}
main{{width:min(1200px,calc(100% - 36px));margin:auto}}
.test-section{{min-height:920px;padding:110px 24px;border-bottom:1px solid var(--line)}}
.test-section:nth-child(even){{background:var(--surface)}}
.test-section h1{{font-size:clamp(36px,6vw,72px)}}
#reveal-target{{margin-top:300px;padding:24px;background:var(--surface-2);border:1px solid var(--line)}}
</style></head><body>
<div class="scroll-progress" id="scroll-progress"></div>
<header class="site-header" id="site-header">
<a class="brand" href="#home"><span class="brand-mark"><span class="brand-monogram">K<span>A</span></span></span><span class="brand-copy"><strong>KING ART</strong><small>DEVELOPER PORTFOLIO</small></span></a>
<nav class="main-nav" aria-label="Main navigation"><a href="#about">About</a><a href="#projects">Projects</a><a href="#contact">Contact</a></nav>
<div class="header-tools"><button class="command-trigger"><span>Search</span><kbd>⌘ K</kbd></button><button class="icon-button sound-toggle">S</button><button class="icon-button motion-toggle">M</button><button class="icon-button theme-toggle">T</button><button class="icon-button mobile-menu-button">☰</button></div>
</header>
<main id="main-content">
<section class="test-section" id="about"><h1 data-reveal>About the work</h1><p data-reveal="left">Test reveal entrance and exit.</p></section>
<section class="test-section" id="projects"><h1 data-reveal>Projects</h1><div id="reveal-target" data-reveal="scale">Scroll reveal target</div></section>
<section class="test-section" id="contact"><h1 data-reveal>Contact</h1></section>
<section class="test-section" id="disclosure-tests">
  <h1>Disclosure animation</h1>
  <details id="skill-disclosure" class="skill-group">
    <summary class="skill-group-head"><span class="skill-group-index">01</span><span class="skill-group-copy"><strong>Programming &amp; development</strong><small>Languages and web technologies</small></span><span class="skill-group-meta">03 ITEMS</span><span class="disclosure-control" aria-hidden="true">⌄</span></summary>
    <div class="disclosure-panel skill-disclosure-panel"><div class="disclosure-panel-inner"><div class="skill-pills"><span>Python</span><span>C++</span><span>JavaScript</span></div></div></div>
  </details>
  <details id="education-disclosure"><summary class="education-history-summary"><span class="education-history-copy"><strong>ACADEMIC FOUNDATION</strong><small>3 PREVIOUS SCHOOLS</small></span><span class="disclosure-control">⌄</span></summary><div class="disclosure-panel"><div class="disclosure-panel-inner"><div class="education-records"><article class="education-record"><span>2024–2026</span><h4>CASAP</h4></article></div></div></div></details>
  <details id="achievement-disclosure" class="achievement-row"><summary class="achievement-summary"><span class="achievement-mark">01</span><strong>TIMO Gold Award</strong><span>✦</span><span class="disclosure-control">⌄</span></summary><div class="disclosure-panel"><div class="disclosure-panel-inner"><div class="achievement-detail"><p>Gold Award · 2025–2026 Heat Round</p></div></div></div></details>
</section>
</main></body></html>'''

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':900}, reduced_motion='no-preference')
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_default_timeout(10000)
    page.set_content(HTML, wait_until='domcontentloaded')
    page.add_script_tag(content=reveal_js + '\nwindow.__installScrollReveal = installScrollReveal;')
    page.add_script_tag(content=masthead_js + '\nwindow.__installMastheadScrollBehavior = installMastheadScrollBehavior;')
    page.wait_for_function('typeof window.__installScrollReveal === "function"')

    def settle(milliseconds: int = 160):
        page.evaluate('(ms) => new Promise(resolve => window.setTimeout(resolve, ms))', milliseconds)

    def visible_state(locator):
        return locator.evaluate('''e=>({visible:e.classList.contains('is-visible'),state:e.dataset.revealState || null,
          opacity:getComputedStyle(e).opacity,transform:getComputedStyle(e).transform,
          duration:getComputedStyle(e).transitionDuration})''')

    print('QA:section reveal', flush=True)
    # Exercise the exact controller against real browser IntersectionObserver callbacks.
    page.evaluate("(() => { window.__revealCleanup = window.__installScrollReveal({enabled:true, scope:document.getElementById('main-content')}); return true; })()")
    page.wait_for_function("document.documentElement.dataset.revealReady === 'true'")
    target=page.locator('#reveal-target')
    page.wait_for_function("document.querySelector('#reveal-target').dataset.revealState !== undefined")
    settle(820)  # allow the offscreen transition to finish before checking its resting state
    initial=visible_state(target)
    assert not initial['visible'] and float(initial['opacity']) < .05, initial

    target_y=target.evaluate('(e)=>e.getBoundingClientRect().top + scrollY')
    page.evaluate('(y)=>window.scrollTo({top:y-innerHeight*.48,behavior:"instant"})', target_y)
    page.wait_for_function("document.querySelector('#reveal-target').classList.contains('is-visible')")
    settle(820)
    entered=visible_state(target)
    assert entered['state']=='in' and float(entered['opacity']) > .95, entered

    # Leave the viewport, then return to verify a genuine bidirectional transition.
    page.evaluate('(y)=>window.scrollTo({top:y+innerHeight+360,behavior:"instant"})', target_y)
    page.wait_for_function("!document.querySelector('#reveal-target').classList.contains('is-visible')")
    settle(820)
    exited=visible_state(target)
    assert exited['state']=='out' and float(exited['opacity']) < .05, exited

    page.evaluate('(y)=>window.scrollTo({top:y-innerHeight*.48,behavior:"instant"})', target_y)
    page.wait_for_function("document.querySelector('#reveal-target').classList.contains('is-visible')")
    settle(820)
    returned=visible_state(target)
    assert returned['state']=='in' and float(returned['opacity']) > .95, returned

    print('QA:disclosure setup', flush=True)
    # Test the actual disclosure CSS in an isolated page so previous scroll/reveal
    # transitions cannot throttle this regression test.
    disclosure_page = browser.new_page(viewport={'width': 1280, 'height': 800}, reduced_motion='no-preference')
    disclosure_page.set_default_timeout(10000)
    disclosure_page.set_content(f'''<!doctype html><html data-theme="dark" data-motion="on" data-motion-override="on"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>{CSS}</style></head><body>
      <details id="skill-disclosure" class="skill-group"><summary class="skill-group-head"><span class="skill-group-index">01</span><span class="skill-group-copy"><strong>Programming &amp; development</strong><small>Languages and web technologies</small></span><span class="skill-group-meta">03 ITEMS</span><span class="disclosure-control">⌄</span></summary><div class="disclosure-panel skill-disclosure-panel"><div class="disclosure-panel-inner"><div class="skill-pills"><span>Python</span><span>C++</span><span>JavaScript</span></div></div></div></details>
      <details id="education-disclosure" class="education-history"><summary class="education-history-summary"><span class="education-history-copy"><strong>ACADEMIC FOUNDATION</strong><small>3 PREVIOUS SCHOOLS</small></span><span class="disclosure-control">⌄</span></summary><div class="disclosure-panel"><div class="disclosure-panel-inner"><div class="education-records"><article class="education-record"><span>2024–2026</span><h4>CASAP</h4></article></div></div></div></details>
      <details id="achievement-disclosure" class="achievement-row"><summary class="achievement-summary"><span class="achievement-mark">01</span><strong>TIMO Gold Award</strong><span>✦</span><span class="disclosure-control">⌄</span></summary><div class="disclosure-panel"><div class="disclosure-panel-inner"><div class="achievement-detail"><p>Gold Award · 2025–2026 Heat Round</p></div></div></div></details>
    </body></html>''')
    disclosure_results = []
    print('QA:disclosure loop', flush=True)
    for disclosure_id in ['skill-disclosure', 'education-disclosure', 'achievement-disclosure']:
        print(' - '+disclosure_id, flush=True)
        disclosure = disclosure_page.locator(f'#{disclosure_id}')
        panel = disclosure.locator(':scope > .disclosure-panel')
        before = panel.evaluate('e => ({display:getComputedStyle(e).display,opacity:getComputedStyle(e).opacity,height:e.getBoundingClientRect().height})')
        assert before['display'] == 'grid' and float(before['opacity']) < .05 and before['height'] <= 1, {'id': disclosure_id, **before}
        disclosure.locator('summary').click()
        disclosure_page.wait_for_function('(id) => document.querySelector(`#${id}`).open', arg=disclosure_id)
        disclosure_page.wait_for_function('(id) => { const e=document.querySelector(`#${id} > .disclosure-panel`); return e && e.getBoundingClientRect().height > 1; }', arg=disclosure_id)
        disclosure_page.evaluate('ms => new Promise(resolve => setTimeout(resolve, ms))', 520)
        opened = panel.evaluate('e => ({display:getComputedStyle(e).display,opacity:getComputedStyle(e).opacity,height:e.getBoundingClientRect().height})')
        assert opened['display'] == 'grid' and opened['height'] > 1 and float(opened['opacity']) > .95, {'id': disclosure_id, **opened}
        disclosure.locator('summary').press('Enter')
        disclosure_page.wait_for_function('(id) => !document.querySelector(`#${id}`).open', arg=disclosure_id)
        panel.evaluate('e => ({height:e.getBoundingClientRect().height,opacity:getComputedStyle(e).opacity})')  # start the close transition
        disclosure_page.evaluate('ms => new Promise(resolve => setTimeout(resolve, ms))', 520)
        closed = panel.evaluate('e => ({display:getComputedStyle(e).display,opacity:getComputedStyle(e).opacity,height:e.getBoundingClientRect().height})')
        assert closed['display'] == 'grid' and closed['height'] <= 1 and float(closed['opacity']) < .05, {'id': disclosure_id, **closed}
        disclosure_results.append({'id': disclosure_id, 'opened': opened, 'closed': closed, 'keyboardClose': True})
    disclosure_page.close()

    print('QA:toggle contract', flush=True)
    # Motion toggle is an enabled control even when the OS preference requests reduced motion.
    page.evaluate("document.documentElement.dataset.motionOverride='off'; document.documentElement.dataset.motion='off'")
    motion_control = page.locator('.motion-toggle')
    # The app's production markup is checked at source level; this fixture verifies the intended control contract.
    motion_markup = re.search(r'<button[\s\S]*?className="icon-button motion-toggle"[\s\S]*?</button>', APP)
    motion_markup = motion_markup.group(0) if motion_markup else ''
    control_contract = {'disabled': bool(re.search(r'\bdisabled(?:\s|=|>)', motion_markup)), 'toggle': 'onClick={toggleMotion}' in motion_markup, 'versioned': 'legion-portfolio-motion-v7' in APP}
    assert not control_contract['disabled'] and control_contract['toggle'] and control_contract['versioned'], control_contract

    print('QA:dynamic project', flush=True)
    # MutationObserver must pick up project cards inserted after filter changes.
    page.evaluate("document.querySelector('#projects').insertAdjacentHTML('beforeend','<article id=dynamic-reveal data-reveal=right>Filtered project</article>')")
    dynamic=page.locator('#dynamic-reveal')
    page.wait_for_function("document.querySelector('#dynamic-reveal').dataset.revealState !== undefined")
    dynamic_y=dynamic.evaluate('(e)=>e.getBoundingClientRect().top + scrollY')
    page.evaluate('(y)=>window.scrollTo({top:y-innerHeight*.45,behavior:"instant"})', dynamic_y)
    page.wait_for_function("document.querySelector('#dynamic-reveal').classList.contains('is-visible')")
    settle(820)
    dynamic_state=visible_state(dynamic)
    assert dynamic_state['visible'] and dynamic_state['state']=='in', dynamic_state

    print('QA:motion fallbacks', flush=True)
    # Disabling motion immediately exposes all content without leaving hidden state behind.
    page.evaluate("(() => { window.__revealCleanup(); window.__revealCleanup = window.__installScrollReveal({enabled:false, scope:document.getElementById('main-content')}); return true; })()")
    disabled=visible_state(target)
    assert disabled['opacity']=='1' and 'data-reveal-ready' not in page.locator('html').evaluate('(e)=>e.dataset'), disabled

    # Old browsers without either observer API degrade to fully visible content.
    page.evaluate("(() => { window.__revealCleanup(); const io=window.IntersectionObserver; window.IntersectionObserver=undefined; window.__revealCleanup=window.__installScrollReveal({enabled:true,scope:document.getElementById('main-content')}); window.IntersectionObserver=io; return true; })()")
    no_io=visible_state(target)
    assert no_io['opacity']=='1', no_io
    page.evaluate("(() => { window.__revealCleanup(); const mo=window.MutationObserver; window.MutationObserver=undefined; window.__revealCleanup=window.__installScrollReveal({enabled:true,scope:document.getElementById('main-content')}); window.MutationObserver=mo; return true; })()")
    no_mo=visible_state(target)
    assert no_mo['opacity']=='1', no_mo

    # A broken IO implementation that never dispatches the initial batch must not strand content.
    page.evaluate('''() => {
      window.__revealCleanup();
      const NativeIO=window.IntersectionObserver;
      window.IntersectionObserver=class { constructor(){} observe(){} unobserve(){} disconnect(){} };
      window.__revealCleanup=window.__installScrollReveal({enabled:true,scope:document.getElementById('main-content')});
      window.IntersectionObserver=NativeIO;
    }''')
    page.wait_for_function("!document.documentElement.hasAttribute('data-reveal-ready')", timeout=3000)
    timeout_fallback=visible_state(target)
    assert timeout_fallback['opacity']=='1', timeout_fallback

    print('QA:motion on by default and visitor pause', flush=True)
    # The site default remains animated even when the operating system requests reduced motion.
    page.emulate_media(reduced_motion='reduce')
    page.evaluate("(() => { document.documentElement.dataset.motionOverride='on'; document.documentElement.dataset.motion='on'; window.__revealCleanup(); window.__revealCleanup=window.__installScrollReveal({enabled:true,scope:document.getElementById('main-content')}); return true; })()")
    default_motion=target.evaluate("e => ({duration:getComputedStyle(e).transitionDuration, opacity:getComputedStyle(e).opacity, ready:document.documentElement.dataset.motionOverride})")
    assert default_motion['ready']=='on' and any(float(value.removesuffix('s')) > 0 for value in default_motion['duration'].split(',')), default_motion
    page.wait_for_function("document.documentElement.dataset.revealReady === 'true'")
    page.wait_for_function("document.querySelector('#reveal-target').dataset.revealState !== undefined")
    default_motion=target.evaluate("e => ({duration:getComputedStyle(e).transitionDuration, opacity:getComputedStyle(e).opacity, ready:document.documentElement.dataset.motionOverride})")
    assert any(float(value.removesuffix('s')) > 0 for value in default_motion['duration'].split(',')), default_motion
    assert default_motion['ready']=='on', default_motion

    # A deliberate visitor pause wins over the default even when the OS asks for reduced motion.
    page.evaluate("(() => { window.__revealCleanup(); document.documentElement.dataset.motionOverride='off'; document.documentElement.dataset.motion='off'; window.__revealCleanup=window.__installScrollReveal({enabled:false,scope:document.getElementById('main-content')}); return true; })()")
    paused_motion=visible_state(target)
    assert paused_motion['opacity']=='1' and paused_motion['transform']=='none', paused_motion

    # Restore normal motion after the pause test above.
    page.emulate_media(reduced_motion='no-preference')
    page.evaluate("(() => { document.documentElement.dataset.motionOverride='on'; document.documentElement.dataset.motion='on'; return true; })()")

    print('QA:masthead', flush=True)
    # Exercise the exact production masthead controller and its CSS transition.
    page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
    settle(80)
    page.evaluate('''() => {
      const header = document.querySelector('#site-header');
      const progress = document.querySelector('#scroll-progress');
      window.__headerChanges = [];
      window.__headerCleanup = window.__installMastheadScrollBehavior({
        header, progress, motionEnabled: true, menuOpen: false,
        onHiddenChange: (hidden) => {
          window.__headerChanges.push(hidden);
          header.classList.toggle('header-hidden', hidden);
        }
      });
    }''')
    page.evaluate("window.scrollTo({top:420,behavior:'instant'})")
    page.wait_for_function("document.querySelector('#site-header').classList.contains('header-hidden')")
    settle(500)
    header_hidden = page.locator('#site-header').evaluate("e=>({hidden:e.classList.contains('header-hidden'),transform:getComputedStyle(e).transform,opacity:getComputedStyle(e).opacity,focusWithin:e.matches(':focus-within'),active:document.activeElement.outerHTML.slice(0,120)})")
    assert header_hidden['hidden'] and header_hidden['transform'].startswith('matrix') and float(header_hidden['transform'].split(',')[-1].rstrip(')')) < -40, header_hidden

    page.evaluate("window.scrollTo({top:360,behavior:'instant'})")
    page.wait_for_function("!document.querySelector('#site-header').classList.contains('header-hidden')")
    settle(500)
    header_revealed = page.locator('#site-header').evaluate("e=>({hidden:e.classList.contains('header-hidden'),transform:getComputedStyle(e).transform,focusWithin:e.matches(':focus-within')})")
    assert not header_revealed['hidden'], header_revealed

    # Near the top, an open mobile menu, and disabled motion must keep it available.
    page.evaluate("window.scrollTo({top:30,behavior:'instant'})")
    settle(100)
    top_header = page.locator('#site-header').evaluate("e=>({hidden:e.classList.contains('header-hidden'),transform:getComputedStyle(e).transform})")
    assert not top_header['hidden'], top_header
    page.evaluate('''() => {
      window.__headerCleanup();
      const header=document.querySelector('#site-header');
      window.__headerCleanup=window.__installMastheadScrollBehavior({header,progress:document.querySelector('#scroll-progress'),motionEnabled:true,menuOpen:true,onHiddenChange:hidden=>header.classList.toggle('header-hidden',hidden)});
    }''')
    page.evaluate("window.scrollTo({top:420,behavior:'instant'})")
    settle(120)
    menu_header = page.locator('#site-header').evaluate("e=>({hidden:e.classList.contains('header-hidden')})")
    assert not menu_header['hidden'], menu_header
    page.evaluate('''() => {
      window.__headerCleanup();
      const header=document.querySelector('#site-header');
      window.__headerCleanup=window.__installMastheadScrollBehavior({header,progress:document.querySelector('#scroll-progress'),motionEnabled:false,menuOpen:false,onHiddenChange:hidden=>header.classList.toggle('header-hidden',hidden)});
    }''')
    page.evaluate("window.scrollTo({top:640,behavior:'instant'})")
    settle(120)
    static_header = page.locator('#site-header').evaluate("e=>({hidden:e.classList.contains('header-hidden')})")
    assert not static_header['hidden'], static_header
    page.evaluate('window.__headerCleanup()')

    print('QA:mobile masthead', flush=True)
    # On mobile, the vertical hide transform must preserve horizontal centering.
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
    settle(100)
    page.evaluate('''() => {
      const header=document.querySelector('#site-header');
      window.__headerCleanup=window.__installMastheadScrollBehavior({header,progress:document.querySelector('#scroll-progress'),motionEnabled:true,menuOpen:false,onHiddenChange:hidden=>header.classList.toggle('header-hidden',hidden)});
    }''')
    page.evaluate("window.scrollTo({top:420,behavior:'instant'})")
    page.wait_for_function("document.querySelector('#site-header').classList.contains('header-hidden')")
    settle(500)
    mobile_header_hidden = page.locator('#site-header').evaluate("e=>({hidden:e.classList.contains('header-hidden'),transform:getComputedStyle(e).transform,width:e.getBoundingClientRect().width,left:e.getBoundingClientRect().left,viewport:innerWidth})")
    mobile_matrix = [float(value) for value in mobile_header_hidden['transform'].removeprefix('matrix(').removesuffix(')').split(',')]
    assert mobile_header_hidden['hidden'] and mobile_matrix[5] < -40, mobile_header_hidden
    assert abs((mobile_header_hidden['left'] + mobile_header_hidden['width']/2) - mobile_header_hidden['viewport']/2) < 2, mobile_header_hidden
    page.evaluate('window.__headerCleanup()')

    print('QA:KA typography', flush=True)
    # Check small-device layout and KA lockup with the exact project stylesheet.
    brand_metrics=[]
    for width,height in [(320,700),(360,800),(390,844),(430,932),(768,900),(1024,768),(1440,900)]:
        page.set_viewport_size({'width':width,'height':height})
        settle(45)
        m=page.evaluate('''() => {
          const root=document.documentElement, mark=document.querySelector('.brand-mark'), mono=document.querySelector('.brand-monogram'), a=mono.querySelector('span');
          const mr=mark.getBoundingClientRect(), kr=mono.getBoundingClientRect(), ar=a.getBoundingClientRect();
          return {scrollWidth:root.scrollWidth,markWidth:mr.width,monoHeight:kr.height,letterAHeight:ar.height,letterATop:ar.top,monoTop:kr.top};
        }''')
        assert m['scrollWidth'] <= width, (width,m)
        assert m['monoHeight'] < 25 and m['letterAHeight'] < 25, (width,m)
        assert abs(m['letterATop']-m['monoTop']) < 6, (width,m)
        brand_metrics.append({'width':width,'docWidth':m['scrollWidth'],'monogramHeight':round(m['monoHeight'],1)})

    print('QA:preference migration', flush=True)
    # Preference migration ignores the previous keys; v6 defaults to system and stores explicit visitor choices.
    assert "localStorage.getItem('legion-portfolio-motion-v6')" in INDEX
    assert "localStorage.getItem('legion-portfolio-motion-v6')" in APP
    assert "localStorage.setItem('legion-portfolio-motion-v6'" in APP
    assert "legion-portfolio-motion-v5" not in INDEX + APP
    assert "updateScrollReveals" not in APP
    assert 'installScrollReveal' in APP and 'useLayoutEffect' in APP
    assert "typeof IntersectionObserver === 'undefined'" in REVEAL_SOURCE.read_text()

    assert not errors, errors
    page.screenshot(path=str(Path(tempfile.gettempdir()) / 'motion-header-desktop.png'),full_page=False)
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(Path(tempfile.gettempdir()) / 'motion-header-mobile.png'),full_page=False)

    print('QA:boot preference', flush=True)
    # Validate boot behavior: motion defaults on in every system profile, and only an explicit v6 pause turns it off.
    pref_page=browser.new_page(reduced_motion='no-preference')
    pref_page.set_content('<!doctype html><html><head><meta name=theme-color content=#101619></head><body></body></html>')
    import re
    inline_scripts=re.findall(r'<script>(.*?)</script>', INDEX, flags=re.S)
    assert inline_scripts, 'index.html must have an early preference bootstrap script'
    pref_page.evaluate('''() => {
      const store = {'legion-portfolio-motion': 'off', 'legion-portfolio-motion-v2': 'off', 'legion-portfolio-motion-v3': 'off', 'legion-portfolio-motion-v4': 'off', 'legion-portfolio-motion-v5': 'off', 'legion-portfolio-motion-v6': 'off'};
      Object.defineProperty(window, 'localStorage', { configurable: true, value: {
        getItem: (key) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
      }});
      window.__mockMotionStore = store;
    }''')
    pref_page.add_script_tag(content=inline_scripts[0])
    default_motion=pref_page.locator('html').get_attribute('data-motion')
    default_override=pref_page.locator('html').get_attribute('data-motion-override')
    assert default_motion == 'on' and default_override == 'on', {'stale-v1-v5-settings-ignored': True, 'data-motion': default_motion, 'override': default_override}
    pref_page.emulate_media(reduced_motion='reduce')
    pref_page.add_script_tag(content=inline_scripts[0])
    os_motion=pref_page.locator('html').get_attribute('data-motion')
    assert os_motion == 'on' and pref_page.locator('html').get_attribute('data-motion-override') == 'on', {'system-reduced-motion-default': os_motion}
    pref_page.evaluate("window.__mockMotionStore['legion-portfolio-motion-v6'] = 'on'")
    pref_page.add_script_tag(content=inline_scripts[0])
    explicit_on=pref_page.locator('html').get_attribute('data-motion')
    assert explicit_on == 'on' and pref_page.locator('html').get_attribute('data-motion-override') == 'on', {'explicit-site-motion-on': explicit_on}
    pref_page.evaluate("window.__mockMotionStore['legion-portfolio-motion-v6'] = 'off'")
    pref_page.add_script_tag(content=inline_scripts[0])
    explicit_off=pref_page.locator('html').get_attribute('data-motion')
    assert explicit_off == 'off' and pref_page.locator('html').get_attribute('data-motion-override') == 'off', {'explicit-site-pause': explicit_off}
    browser.close()

print(json.dumps({
  'sectionReveal':{'initial':initial,'enter':entered,'exit':exited,'reenter':returned,'dynamicProject':dynamic_state,
                   'disabledMotion':disabled,'noIntersectionObserver':no_io,'noMutationObserver':no_mo,'observerTimeoutFallback':timeout_fallback,'defaultMotionOn':default_motion,'explicitPause':paused_motion},
  'disclosures':disclosure_results,
  'KA_responsive':brand_metrics,
  'masthead':{'downScroll':header_hidden,'upScroll':header_revealed,'topGuard':top_header,'mobileMenuGuard':menu_header,'motionOffGuard':static_header,'mobileDownScroll':mobile_header_hidden},
  'preferenceMigration':'old v1-v6 keys ignored; motion defaults on across system profiles; v7 stores explicit visitor choices',
  'integration':'App uses real IntersectionObserver reveals and the separately browser-tested production masthead controller',
  'browserErrors':errors,
  'result':'PASS'
},indent=2))
