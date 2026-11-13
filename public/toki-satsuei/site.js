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

document.querySelectorAll(".filter-button").forEach(button=>{
  button.addEventListener("click",()=>{
    const filter=button.dataset.filter;
    document.querySelectorAll(".filter-button").forEach(item=>{
      const active=item===button;
      item.classList.toggle("is-active",active);
      item.setAttribute("aria-pressed",String(active));
    });
    document.querySelectorAll(".gallery-card").forEach(card=>{
      card.hidden=filter!=="all"&&card.dataset.category!==filter;
    });
  });
});

const lightbox=document.querySelector("#lightbox");
const lightboxImage=document.querySelector(".lightbox-image");
const lightboxTitle=document.querySelector(".lightbox-caption strong");
const lightboxCaption=document.querySelector(".lightbox-caption span");
document.querySelectorAll(".gallery-card").forEach(card=>{
  card.addEventListener("click",()=>{
    lightboxImage.src=card.dataset.full;
    lightboxImage.alt=card.querySelector("img")?.alt||card.dataset.title;
    lightboxTitle.textContent=card.dataset.title||"";
    lightboxCaption.textContent=card.dataset.caption||"";
    lightbox.showModal();
  });
});
function closeLightbox(){if(lightbox.open)lightbox.close();lightboxImage.removeAttribute("src");}
document.querySelector(".lightbox-close")?.addEventListener("click",closeLightbox);
lightbox?.addEventListener("click",event=>{if(event.target===lightbox)closeLightbox();});
lightbox?.addEventListener("close",()=>document.body.classList.remove("no-scroll"));

const form=document.querySelector("#inquiry-form");
const status=document.querySelector("#form-status");
form?.addEventListener("submit",async event=>{
  event.preventDefault();
  const data=new FormData(form);
  const name=(data.get("name")||"").toString().trim();
  const session=(data.get("session")||"").toString().trim();
  const date=(data.get("date")||"").toString().trim()||"Flexible";
  const location=(data.get("location")||"").toString().trim()||"To be discussed";
  const message=(data.get("message")||"").toString().trim()||"No additional details yet.";
  const draft=[
    "Hello, TOKI SATSUEI!",
    "",
    "I'd like to ask about a photoshoot.",
    "Name: "+name,
    "Session: "+session,
    "Preferred date: "+date,
    "Location / event: "+location,
    "Details: "+message,
    "",
    "Please let me know your availability and the next steps. Thank you!"
  ].join("\n");
  try{
    await navigator.clipboard.writeText(draft);
    status.textContent="Inquiry copied. Open our Facebook page and paste it into a message.";
  }catch(error){
    const temporary=document.createElement("textarea");
    temporary.value=draft;
    temporary.setAttribute("readonly","");
    temporary.style.position="fixed";temporary.style.opacity="0";
    document.body.appendChild(temporary);temporary.select();
    const copied=document.execCommand("copy");temporary.remove();
    status.textContent=copied?"Inquiry copied. Open our Facebook page and paste it into a message.":"Copy wasn't available here. Please select and copy your details manually.";
  }
});

const year=document.querySelector("#year");
if(year)year.textContent=String(new Date().getFullYear());
