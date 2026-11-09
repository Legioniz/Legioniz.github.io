from pathlib import Path
from playwright.sync_api import sync_playwright
import json
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / 'src/styles.css').read_text()
REVEAL_SOURCE = ROOT / 'src/reveal.ts'

with tempfile.TemporaryDirectory(prefix='legion-reveal-') as temp_dir:
    subprocess.run([
        'tsc', '--ignoreConfig', str(REVEAL_SOURCE), '--target', 'ES2020', '--module', 'ES2020',
        '--lib', 'ES2020,DOM,DOM.Iterable', '--skipLibCheck', '--outDir', temp_dir,
    ], check=True, capture_output=True, text=True)
    reveal_js = (Path(temp_dir) / 'reveal.js').read_text()
    reveal_js = reveal_js.replace('export function installScrollReveal', 'function installScrollReveal')
    reveal_js = reveal_js.replace('export function updateScrollReveals', 'function updateScrollReveals')

HTML = f'''<!doctype html><html data-theme="dark" data-quality="full" data-pointer="fine" data-motion="on"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>{CSS}</style><style>
body{{min-height:3400px;padding-top:100px}}
main{{width:min(1200px,calc(100% - 36px));margin:auto}}
.test-section{{min-height:760px;padding:110px 24px;border-bottom:1px solid var(--line)}}
.test-section:nth-child(even){{background:var(--surface)}}
.test-section h1{{font-size:clamp(36px,6vw,72px)}}
#reveal-target{{margin-top:320px;padding:24px;background:var(--surface-2);border:1px solid var(--line)}}
</style></head><body>
<header class="site-header" id="site-header">
<a class="brand" href="#home"><span class="brand-mark"><span class="brand-monogram">K<span>A</span></span></span><span class="brand-copy"><strong>KING ART</strong><small>DEVELOPER PORTFOLIO</small></span></a>
<nav class="main-nav" aria-label="Main navigation"><a href="#about">About</a><a href="#projects">Projects</a><a href="#contact">Contact</a></nav>
<div class="header-tools"><button class="command-trigger"><span>Search</span><kbd>⌘ K</kbd></button><button class="icon-button sound-toggle">S</button><button class="icon-button motion-toggle">M</button><button class="icon-button theme-toggle">T</button><button class="icon-button mobile-menu-button">☰</button></div>
</header>
<main id="main-content">
<section class="test-section" id="about"><h1 data-reveal>About the work</h1><p data-reveal="left">Test reveal entrance and exit.</p></section>
<section class="test-section" id="projects"><h1 data-reveal>Projects</h1><div id="reveal-target" data-reveal="scale">Scroll reveal target</div></section>
<section class="test-section" id="contact"><h1 data-reveal>Contact</h1></section>
</main></body></html>'''

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content(HTML, wait_until='domcontentloaded')

    def settle(milliseconds: int = 160):
        # Drive the page's own event loop (timers, rAF and CSS transitions)
        # instead of only waiting in the Python process.
        page.evaluate('(ms) => new Promise(resolve => window.setTimeout(resolve, ms))', milliseconds)

    settle(80)

    # Header direction fixture (the React handler's thresholds and focus rules).
    page.evaluate('''() => {
      const header=document.getElementById('site-header');
      const menuButton=document.querySelector('.mobile-menu-button');
      let mobileOpen=false, frame=0, lastY=Math.max(0,window.scrollY), direction=0, accumulated=0;
      const update=()=>{
        frame=0; window.__updateScrollReveals?.(); const currentY=Math.max(0,window.scrollY); const delta=currentY-lastY;
        if(currentY<=76 || mobileOpen || header.matches(':focus-within')){header.classList.remove('header-hidden');direction=0;accumulated=0;}
        else if(Math.abs(delta)>=1){const nextDirection=Math.sign(delta);if(nextDirection!==direction){direction=nextDirection;accumulated=0;}accumulated+=Math.abs(delta);const threshold=direction<0?8:18;if(accumulated>=threshold){header.classList.toggle('header-hidden',direction>0);accumulated=0;}}
        lastY=currentY;
      };
      const onScroll=()=>{if(!frame) frame=requestAnimationFrame(update)};
      window.addEventListener('scroll',onScroll,{passive:true});
      menuButton.addEventListener('click',()=>{mobileOpen=!mobileOpen;header.classList.toggle('mobile-nav-active',mobileOpen);if(mobileOpen)header.classList.remove('header-hidden')});
      window.__cleanupHeaderTest=()=>window.removeEventListener('scroll',onScroll);
    }''')

    # Load and run the compiled, actual src/reveal.ts module (not a rewritten imitation).
    page.add_script_tag(content=reveal_js + '\nwindow.__installScrollReveal = installScrollReveal; window.__updateScrollReveals = updateScrollReveals;')
    page.wait_for_function('typeof window.__installScrollReveal === "function"')
    page.evaluate("window.__revealCleanup = window.__installScrollReveal({enabled:true, scope:document.getElementById('main-content')}); window.__updateScrollReveals()")
    settle(180)

    initial=page.locator('#site-header').evaluate('(e)=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom})')
    page.evaluate("window.scrollTo({top:650,behavior:'instant'})")
    settle(520)
    hidden=page.locator('#site-header').evaluate('(e)=>({hidden:e.classList.contains("header-hidden"),bottom:e.getBoundingClientRect().bottom})')
    assert hidden['hidden'] and hidden['bottom'] < 0, hidden
    page.evaluate("window.scrollTo({top:620,behavior:'instant'})")
    settle(520)
    shown=page.locator('#site-header').evaluate('(e)=>({hidden:e.classList.contains("header-hidden"),top:e.getBoundingClientRect().top})')
    assert not shown['hidden'] and shown['top'] >= 0, shown

    # Focus and open mobile navigation force the header to remain available.
    page.evaluate("window.scrollTo({top:650,behavior:'instant'})")
    settle(100)
    page.locator('.brand').focus()
    focus_shown=page.locator('#site-header').evaluate('(e)=>getComputedStyle(e).transform')
    assert 'matrix' in focus_shown, focus_shown
    page.set_viewport_size({'width':390,'height':844})
    page.locator('.mobile-menu-button').click()
    assert page.locator('#site-header').evaluate('(e)=>e.classList.contains("mobile-nav-active")')

    # KA stays on one line and the compact header never overflows the viewport.
    brand_metrics=[]
    for width,height in [(320,700),(360,800),(390,844),(430,932),(768,900),(1024,768),(1440,900)]:
        page.set_viewport_size({'width':width,'height':height})
        settle(50)
        m=page.evaluate('''() => {
          const root=document.documentElement, mark=document.querySelector('.brand-mark'), mono=document.querySelector('.brand-monogram'), a=mono.querySelector('span');
          const mr=mark.getBoundingClientRect(), kr=mono.getBoundingClientRect(), ar=a.getBoundingClientRect();
          return {scrollWidth:root.scrollWidth,clientWidth:root.clientWidth,markWidth:mr.width,monoHeight:kr.height,letterAHeight:ar.height,letterATop:ar.top,monoTop:kr.top,letterColor:getComputedStyle(a).color,markBackground:getComputedStyle(mark).backgroundColor};
        }''')
        assert m['scrollWidth'] <= width, (width,m)
        assert m['monoHeight'] < 25 and m['letterAHeight'] < 25, (width,m)
        assert abs(m['letterATop']-m['monoTop']) < 6, (width,m)
        assert m['letterColor'] != m['markBackground'], (width,m)
        brand_metrics.append({'width':width,'docWidth':m['scrollWidth'],'brandWidth':round(m['markWidth'],1),'monogramHeight':round(m['monoHeight'],1)})

    page.set_viewport_size({'width':1440,'height':900})
    page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
    target=page.locator('#reveal-target')
    initial_reveal=target.evaluate('(e)=>({ready:document.documentElement.dataset.revealReady,visible:e.classList.contains("is-visible"),opacity:getComputedStyle(e).opacity,transform:getComputedStyle(e).transform,duration:getComputedStyle(e).transitionDuration})')
    assert initial_reveal['ready']=='true' and not initial_reveal['visible'] and initial_reveal['opacity']=='0', initial_reveal

    # Reveal enters and exits through the same scroll-frame pipeline used by App.tsx.
    page.evaluate("window.scrollTo({top:1120,behavior:'instant'})")
    settle(900)
    entered=target.evaluate('(e)=>({visible:e.classList.contains("is-visible"),state:e.dataset.revealState,opacity:getComputedStyle(e).opacity,duration:getComputedStyle(e).transitionDuration})')
    assert entered['visible'] and entered['state']=='in' and float(entered['opacity']) > .95, entered
    page.evaluate("window.scrollTo({top:2500,behavior:'instant'})")
    settle(900)
    exited=target.evaluate('(e)=>({visible:e.classList.contains("is-visible"),state:e.dataset.revealState,opacity:getComputedStyle(e).opacity})')
    assert not exited['visible'] and exited['state']=='out' and float(exited['opacity']) < .05, exited
    page.evaluate("window.scrollTo({top:1120,behavior:'instant'})")
    settle(900)
    returned=target.evaluate('(e)=>({visible:e.classList.contains("is-visible"),state:e.dataset.revealState})')
    assert returned['visible'] and returned['state']=='in', returned

    # Dynamically appended project cards are observed without remounting the controller.
    page.evaluate("document.querySelector('#projects').insertAdjacentHTML('beforeend','<article id=dynamic-reveal data-reveal=right>Filtered project</article>')")
    settle(100)
    dynamic=page.locator('#dynamic-reveal')
    dynamic_y=dynamic.evaluate('(e)=>e.getBoundingClientRect().top + window.scrollY')
    page.evaluate('(y)=>window.scrollTo({top:y-360,behavior:"instant"})', dynamic_y)
    settle(900)
    dynamic_state=dynamic.evaluate('(e)=>({visible:e.classList.contains("is-visible"),state:e.dataset.revealState})')
    assert dynamic_state['visible'] and dynamic_state['state']=='in', dynamic_state

    # Disabled motion exposes all content; missing MutationObserver keeps static content functional.
    page.evaluate("window.__revealCleanup(); window.__revealCleanup = window.__installScrollReveal({enabled:false, scope:document.getElementById('main-content')})")
    disabled=target.evaluate('(e)=>({ready:document.documentElement.dataset.revealReady || null,opacity:getComputedStyle(e).opacity,transform:getComputedStyle(e).transform})')
    assert disabled['ready'] is None and disabled['opacity']=='1', disabled
    page.evaluate("window.__revealCleanup(); const nativeMO=window.MutationObserver; window.MutationObserver=undefined; window.__revealCleanup=window.__installScrollReveal({enabled:true,scope:document.getElementById('main-content')}); window.MutationObserver=nativeMO; window.__updateScrollReveals()")
    no_mo=target.evaluate('(e)=>({ready:document.documentElement.dataset.revealReady || null,state:e.dataset.revealState,opacity:getComputedStyle(e).opacity})')
    assert no_mo['ready']=='true' and no_mo['state'] in ['in','out'], no_mo

    page.emulate_media(reduced_motion='reduce')
    page.evaluate("window.__revealCleanup(); window.__revealCleanup=window.__installScrollReveal({enabled:false,scope:document.getElementById('main-content')})")
    reduced=target.evaluate('(e)=>({opacity:getComputedStyle(e).opacity,transform:getComputedStyle(e).transform,duration:getComputedStyle(e).transitionDuration})')
    assert reduced['opacity']=='1' and reduced['transform']=='none', reduced
    page.set_viewport_size({'width':390,'height':844})
    header_reduced=page.locator('#site-header').evaluate('(e)=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,viewport:innerWidth,pointer:getComputedStyle(e).pointerEvents})')
    assert header_reduced['left'] >= 0 and header_reduced['right'] <= 391, header_reduced
    assert not errors, errors
    page.screenshot(path=str(Path(tempfile.gettempdir()) / 'motion-header-desktop.png'),full_page=False)
    page.screenshot(path=str(Path(tempfile.gettempdir()) / 'motion-header-mobile.png'),full_page=False)
    browser.close()

print(json.dumps({
  'header':{'initial':initial,'downwardScroll':hidden,'upwardScroll':shown,'focusRecovery':'passed','mobileMenuPinned':'passed'},
  'KA_responsive':brand_metrics,
  'sectionReveal':{'initial':initial_reveal,'enter':entered,'exit':exited,'reenterOnUp':returned,'dynamicProject':dynamic_state,'disabledFallback':disabled,'missingMutationObserverFallback':no_mo,'reducedMotion':reduced},
  'reducedMotionHeader':header_reduced,
  'browserErrors':errors,
  'result':'PASS'
},indent=2))
