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
const filters=document.querySelector("#library-filters");
const groups=document.querySelector("#library-groups");
const countLabel=document.querySelector("#library-count");
const dialog=document.querySelector("#album-dialog");
const dialogTitle=document.querySelector("#album-dialog-title");
const dialogCategory=document.querySelector("#album-dialog-category");
const dialogDescription=document.querySelector("#album-dialog-description");
const dialogCount=document.querySelector("#album-dialog-count");
const mediaRail=document.querySelector("#album-media-rail");
const closeDialog=document.querySelector(".album-dialog-close");
let archiveCategories=[];
let activeCategory="all";
const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function element(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
}
function countWords(count,singular,plural){return count+" "+(count===1?singular:plural);}
function scrollTrack(track,direction){
  if(!track)return;
  track.scrollBy({left:Math.max(220,Math.round(track.clientWidth*.78))*direction,behavior:reducedMotion?"auto":"smooth"});
}
function setCount(){
  const populated=archiveCategories.filter(category=>category.albums.length);
  const albums=populated.reduce((sum,category)=>sum+category.albums.length,0);
  const frames=populated.reduce((sum,category)=>sum+category.image_count,0);
  countLabel.textContent=countWords(albums,"ALBUM","ALBUMS")+"  /  "+countWords(frames,"FRAME","FRAMES");
}
function buildFilters(){
  filters.replaceChildren();
  [{id:"all",title:"All collections"}].concat(archiveCategories.map(category=>({id:category.id,title:category.title}))).forEach(item=>{
    const button=element("button","library-filter",item.title);
    button.type="button";
    button.dataset.category=item.id;
    button.setAttribute("aria-pressed",String(item.id===activeCategory));
    button.addEventListener("click",()=>{
      activeCategory=item.id;
      filters.querySelectorAll("button").forEach(filter=>filter.setAttribute("aria-pressed",String(filter===button)));
      renderGroups();
    });
    filters.append(button);
  });
}
function arrowButton(label,direction){
  const button=element("button","rail-button",direction<0?"←":"→");
  button.type="button";
  button.setAttribute("aria-label",label);
  return button;
}
function makeAlbumCard(category,album){
  const button=element("button","album-card");
  button.type="button";
  button.setAttribute("aria-label","Open album "+album.title+" in "+category.title);
  const cover=element("span","album-cover");
  const visual=album.media.find(item=>item.type==="image")||album.media[0];
  if(visual&&visual.type==="image"){
    const image=element("img");
    image.src=visual.src;image.alt="";image.loading="lazy";image.decoding="async";
    cover.append(image);
  }else if(visual&&visual.type==="video"){
    const video=element("video");
    video.src=visual.src;video.muted=true;video.playsInline=true;video.preload="metadata";
    cover.append(video,element("span","album-cover-type","VIDEO"));
  }else{
    cover.append(element("span","album-cover-mark","時"));
  }
  const meta=element("span","album-card-meta");
  const text=element("span");
  text.append(element("strong","album-card-title",album.title));
  text.append(element("small","album-card-count",countWords(album.media.length,"frame","frames")));
  meta.append(text,element("span","album-card-arrow","↗"));
  button.append(cover,meta);
  button.addEventListener("click",()=>openAlbum(category,album));
  return button;
}
function makeCategoryGroup(category){
  const section=element("section","archive-group");
  const head=element("div","archive-group-head");
  const copy=element("div","archive-group-copy");
  copy.append(
    element("span","archive-group-kicker",category.code||"COLLECTION"),
    element("h2","archive-group-title",category.title),
    element("p","archive-group-description",category.description||"A collection of moments worth keeping.")
  );
  head.append(copy,element("span","archive-group-meta",countWords(category.albums.length,"ALBUM","ALBUMS")+"  ·  "+category.image_count+" FRAMES"));
  const rail=element("div","album-rail");
  rail.tabIndex=0;rail.setAttribute("role","region");rail.setAttribute("aria-label",category.title+" albums");
  category.albums.forEach(album=>rail.append(makeAlbumCard(category,album)));
  const controls=element("div","rail-controls");
  const left=arrowButton("Scroll "+category.title+" albums left",-1);
  const right=arrowButton("Scroll "+category.title+" albums right",1);
  left.addEventListener("click",()=>scrollTrack(rail,-1));
  right.addEventListener("click",()=>scrollTrack(rail,1));
  controls.append(left,right);
  head.append(controls);
  const wrap=element("div","album-rail-wrap");
  wrap.append(rail);
  section.append(head,wrap);
  return section;
}
function showEmpty(message){
  const empty=element("div","archive-empty");
  empty.append(element("div","archive-empty-mark","時の記憶"));
  empty.append(element("h2","",message));
  empty.append(element("p","","Create a folder for each shoot inside a category, then upload your web-ready photos or videos. The album index rebuilds automatically during deployment."));
  const link=element("a","","OPEN MEDIA FOLDERS ↗");
  link.href="https://github.com/Legioniz/Legioniz.github.io/tree/main/public/toki-satsuei/media-library";
  link.target="_blank";link.rel="noopener noreferrer";
  empty.append(link);
  groups.replaceChildren(empty);
}
function renderGroups(){
  const selected=activeCategory==="all"?archiveCategories:archiveCategories.filter(category=>category.id===activeCategory);
  const populated=selected.filter(category=>category.albums.length);
  groups.replaceChildren();
  if(!populated.length){
    const chosen=archiveCategories.find(category=>category.id===activeCategory);
    showEmpty(chosen?"No "+chosen.title.toLowerCase()+" albums yet.":"The archive is ready for its first frame.");
    return;
  }
  populated.forEach(category=>groups.append(makeCategoryGroup(category)));
}
function openAlbum(category,album){
  dialogTitle.textContent=album.title;
  dialogCategory.textContent=category.title.toUpperCase();
  dialogDescription.textContent=album.description||"A collection from the TOKI SATSUEI archive.";
  dialogCount.textContent=countWords(album.media.length,"FRAME","FRAMES");
  mediaRail.replaceChildren();
  album.media.forEach((item,index)=>{
    const figure=element("figure","album-frame");
    const stage=element("div","album-frame-media");
    if(item.type==="video"){
      const video=element("video");
      video.src=item.src;video.controls=true;video.preload="metadata";video.playsInline=true;
      video.setAttribute("aria-label",item.title||"Video "+(index+1));
      stage.append(video);
    }else{
      const image=element("img");
      image.src=item.src;image.alt=item.alt||item.title||"TOKI SATSUEI photograph";
      image.loading=index<2?"eager":"lazy";image.decoding="async";
      stage.append(image);
    }
    figure.append(stage,element("figcaption","",item.title||("FRAME "+String(index+1).padStart(2,"0"))));
    mediaRail.append(figure);
  });
  mediaRail.scrollLeft=0;
  dialog.showModal();
  updateDialogControls();
}
function updateDialogControls(){
  const left=document.querySelector('[data-dialog-scroll="-1"]');
  const right=document.querySelector('[data-dialog-scroll="1"]');
  if(!left||!right)return;
  left.disabled=mediaRail.scrollLeft<=4;
  right.disabled=mediaRail.scrollLeft+mediaRail.clientWidth>=mediaRail.scrollWidth-4;
}
document.querySelectorAll("[data-dialog-scroll]").forEach(button=>{
  button.addEventListener("click",()=>scrollTrack(mediaRail,Number(button.dataset.dialogScroll)));
});
mediaRail.addEventListener("scroll",updateDialogControls,{passive:true});
closeDialog.addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
dialog.addEventListener("close",()=>mediaRail.querySelectorAll("video").forEach(video=>video.pause()));
document.addEventListener("keydown",event=>{
  if(!dialog.open)return;
  if(event.key==="ArrowRight"){event.preventDefault();scrollTrack(mediaRail,1);}
  if(event.key==="ArrowLeft"){event.preventDefault();scrollTrack(mediaRail,-1);}
});
const year=document.querySelector("#year");
if(year)year.textContent=String(new Date().getFullYear());
async function loadArchive(){
  try{
    const response=await fetch("./media-library.json",{cache:"no-cache"});
    if(!response.ok)throw new Error("Archive index is not available yet.");
    const manifest=await response.json();
    archiveCategories=Array.isArray(manifest.categories)?manifest.categories:[];
    if(!archiveCategories.length)throw new Error("No archive categories were found.");
    archiveCategories.forEach(category=>{
      category.albums=Array.isArray(category.albums)?category.albums:[];
      category.image_count=Number(category.image_count||category.albums.reduce((total,album)=>total+(album.media||[]).length,0));
    });
    setCount();buildFilters();renderGroups();
  }catch(error){
    countLabel.textContent="ARCHIVE INDEX UNAVAILABLE";
    showEmpty("The archive is being prepared.");
  }
}
loadArchive();
