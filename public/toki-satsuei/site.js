const menuButton=document.querySelector(".menu-toggle");
const nav=document.querySelector(".primary-nav");
if(menuButton&&nav){
  menuButton.addEventListener("click",()=>{
    const open=nav.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded",String(open));
    menuButton.setAttribute("aria-label",open?"Close navigation":"Open navigation");
  });
  nav.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>{
    nav.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded","false");
  }));
}
const progressBar=document.querySelector("#page-progress-bar");
const siteHeader=document.querySelector(".site-header");
const backToTop=document.querySelector("#back-to-top");
const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hoverHeaderEnabled=window.matchMedia("(hover: hover) and (pointer: fine)").matches;
let scrollTicking=false;
let lastScrollY=window.scrollY;
let lastScrollDirection="up";
let hoverRevealed=false;
function setHeaderHidden(hidden){
  if(!siteHeader)return;
  const shouldHide=Boolean(hidden)&&window.scrollY>64&&!nav?.classList.contains("is-open");
  siteHeader.classList.toggle("is-auto-hidden",shouldHide);
}
function updatePageChrome(){
  const root=document.documentElement;
  const currentY=window.scrollY;
  const delta=currentY-lastScrollY;
  if(currentY<=36){
    lastScrollDirection="up";hoverRevealed=false;setHeaderHidden(false);
  }else if(delta>1){
    lastScrollDirection="down";hoverRevealed=false;setHeaderHidden(true);
  }else if(delta< -1){
    lastScrollDirection="up";hoverRevealed=false;setHeaderHidden(false);
  }
  if(nav?.classList.contains("is-open"))setHeaderHidden(false);
  lastScrollY=currentY;
  const progress=Math.min(1,Math.max(0,currentY/Math.max(1,root.scrollHeight-window.innerHeight)));
  if(progressBar)progressBar.style.transform="scaleX("+progress+")";
  siteHeader?.classList.toggle("is-scrolled",currentY>28);
  backToTop?.classList.toggle("is-visible",currentY>520);
  scrollTicking=false;
}
window.addEventListener("scroll",()=>{if(!scrollTicking){requestAnimationFrame(updatePageChrome);scrollTicking=true;}},{passive:true});
window.addEventListener("resize",updatePageChrome,{passive:true});
if(siteHeader){
  window.addEventListener("pointermove",event=>{
    if(!hoverHeaderEnabled||event.pointerType==="touch")return;
    if(event.clientY<=40){
      hoverRevealed=true;setHeaderHidden(false);return;
    }
    if(hoverRevealed&&event.clientY>siteHeader.offsetHeight+14){
      hoverRevealed=false;
      if(lastScrollDirection==="down"&&window.scrollY>64)setHeaderHidden(true);
    }
  },{passive:true});
  siteHeader.addEventListener("focusin",()=>{hoverRevealed=false;setHeaderHidden(false);});
}
updatePageChrome();
backToTop?.addEventListener("click",()=>window.scrollTo({top:0,behavior:reducedMotion?"auto":"smooth"}));

const revealTargets=document.querySelectorAll("[data-reveal]");
if(revealTargets.length){
  document.documentElement.classList.add("motion-ready");
  if(reducedMotion||!("IntersectionObserver" in window))revealTargets.forEach(target=>target.classList.add("is-visible"));
  else{
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target);}
    }),{threshold:.12,rootMargin:"0px 0px -6% 0px"});
    revealTargets.forEach(target=>observer.observe(target));
  }
}
const navLinks=[...document.querySelectorAll('.primary-nav a[href^="#"]')];
const sections=navLinks.map(link=>document.querySelector(link.getAttribute("href"))).filter(Boolean);
if("IntersectionObserver" in window&&sections.length){
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting)navLinks.forEach(link=>{
      if(link.getAttribute("href")==="#"+entry.target.id)link.setAttribute("aria-current","location");
      else link.removeAttribute("aria-current");
    });
  }),{rootMargin:"-24% 0px -65% 0px"});
  sections.forEach(section=>observer.observe(section));
}
document.querySelectorAll(".filter-button").forEach(button=>button.addEventListener("click",()=>{
  const filter=button.dataset.filter;
  document.querySelectorAll(".filter-button").forEach(item=>{
    const active=item===button;item.classList.toggle("is-active",active);item.setAttribute("aria-pressed",String(active));
  });
  document.querySelectorAll(".gallery-card").forEach(card=>{
    const visible=filter==="all"||card.dataset.category===filter;
    if(card.hidden===!visible)return;
    if(!visible&&!reducedMotion&&card.animate)card.animate([{opacity:1},{opacity:0,transform:"translateY(7px)"}],{duration:130}).finished.catch(()=>{}).then(()=>{card.hidden=true;});
    else{card.hidden=!visible;if(visible&&!reducedMotion&&card.animate)card.animate([{opacity:0,transform:"translateY(7px)"},{opacity:1,transform:"translateY(0)"}],{duration:220});}
  });
}));
const lightbox=document.querySelector("#lightbox");
const lightboxImage=document.querySelector(".lightbox-image");
const lightboxTitle=document.querySelector(".lightbox-caption strong");
const lightboxCaption=document.querySelector(".lightbox-caption span");
document.querySelectorAll(".gallery-card").forEach(card=>card.addEventListener("click",()=>{
  lightboxImage.src=card.dataset.full;lightboxImage.alt=card.querySelector("img")?.alt||card.dataset.title;
  lightboxTitle.textContent=card.dataset.title||"";lightboxCaption.textContent=card.dataset.caption||"";
  lightbox.showModal();
}));
function closeLightbox(){if(lightbox.open)lightbox.close();lightboxImage.removeAttribute("src");}
document.querySelector(".lightbox-close")?.addEventListener("click",closeLightbox);
lightbox?.addEventListener("click",event=>{if(event.target===lightbox)closeLightbox();});
const form=document.querySelector("#inquiry-form");
const status=document.querySelector("#form-status");
form?.addEventListener("submit",async event=>{
  event.preventDefault();const data=new FormData(form);
  const name=(data.get("name")||"").toString().trim(),session=(data.get("session")||"").toString().trim();
  const date=(data.get("date")||"").toString().trim()||"Flexible",location=(data.get("location")||"").toString().trim()||"To be discussed";
  const message=(data.get("message")||"").toString().trim()||"No additional details yet.";
  const draft=["Hello, TOKI SATSUEI!","","I'd like to ask about a photoshoot.","Name: "+name,"Session: "+session,"Preferred date: "+date,"Location / event: "+location,"Details: "+message,"","Please let me know your availability and the next steps. Thank you!"].join("\n");
  try{await navigator.clipboard.writeText(draft);status.textContent="Inquiry copied. Open our Facebook page and paste it into a message.";}
  catch(error){const temp=document.createElement("textarea");temp.value=draft;temp.setAttribute("readonly","");temp.style.position="fixed";temp.style.opacity="0";document.body.appendChild(temp);temp.select();const copied=document.execCommand("copy");temp.remove();status.textContent=copied?"Inquiry copied. Open our Facebook page and paste it into a message.":"Copy wasn't available here. Please select and copy your details manually.";}
});
const year=document.querySelector("#year");if(year)year.textContent=String(new Date().getFullYear());
