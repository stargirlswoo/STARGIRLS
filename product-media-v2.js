(()=>{
'use strict';
const API='https://stargirls.stargirlswoo.workers.dev';
const params=new URLSearchParams(location.search);
const requestedId=params.get('id')||'';
const pf=Number(params.get('pf')||(/^printful-(\d+)$/.exec(requestedId)?.[1]||0));
const app=document.getElementById('app');
const searchResults=document.getElementById('productSearchResults');
const cartRoot=document.getElementById('cartItems');
if(!app)return;

let media={products:[]};
let liveCatalog={products:[]};
let applying=false;
let scheduled=false;
const activeByColor=new Map();

const norm=s=>String(s||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cleanPath=v=>{
  const raw=typeof v==='string'?v:(v&&typeof v==='object'?v.image||v.src||'':'');
  const s=String(raw||'').trim();
  return /^(?:https:\/\/|\/images\/|images\/)/i.test(s)?s:'';
};
const imageList=value=>Array.isArray(value)?value.map(cleanPath).filter(Boolean):[];
const uniq=a=>[...new Set(a.filter(Boolean))];
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0));

function numericProductId(value){
  const direct=Number(value||0);
  if(direct>0)return direct;
  const m=/^printful-(\d+)$/i.exec(String(value||''));
  return m?Number(m[1]):0;
}

function entryFor({id='',printfulId=0,name=''}){
  const wantedPf=Number(printfulId||0)||numericProductId(id);
  const wantedName=norm(name);
  return (media.products||[]).find(entry=>{
    const entryPf=Number(entry?.printful_product_id||entry?.product_id||0)||numericProductId(entry?.id);
    if(wantedPf&&entryPf&&wantedPf===entryPf)return true;
    const entryName=norm(entry?.match_name||entry?.name||'');
    return !!wantedName&&!!entryName&&wantedName===entryName;
  })||null;
}

function colors(entry){return Array.isArray(entry?.colors)?entry.colors:[];}
function colorEntry(entry,color){
  const wanted=norm(color);
  if(!wanted)return null;
  return colors(entry).find(c=>norm(c?.name||c?.color)===wanted)||null;
}
function fallbackColor(entry){return colors(entry).find(c=>imageList(c?.images).length)||null;}
function imagesFor(entry,color=''){
  if(!entry)return[];
  const card=cleanPath(entry?.card_image);
  const exact=imageList(colorEntry(entry,color)?.images);
  if(exact.length)return uniq([...exact,card]).slice(0,8);
  const gallery=imageList(entry?.gallery);
  if(gallery.length)return uniq([card,...gallery]).slice(0,8);
  const first=imageList(fallbackColor(entry)?.images);
  if(first.length)return uniq([card,...first]).slice(0,8);
  return card?[card]:[];
}
function primaryFor(entry,color=''){
  const exact=imageList(colorEntry(entry,color)?.images);
  if(exact.length)return exact[0];
  const card=cleanPath(entry?.card_image);
  return card||imagesFor(entry,color)[0]||'';
}

function currentColor(){
  for(const option of app.querySelectorAll('.option')){
    const labels=option.querySelectorAll('.option-label span');
    if(norm(labels[0]?.textContent)==='color'){
      const value=String(labels[1]?.textContent||'').trim();
      if(value&&!/^select one$/i.test(value))return value;
    }
  }
  return'';
}
function currentEntry(){
  const title=app.querySelector('.product-title')?.textContent||'';
  return entryFor({id:requestedId,printfulId:pf,name:title});
}

function sameGallery(images,key){
  const hero=app.querySelector('.hero-stage img');
  if(!hero)return false;
  const heroSrc=hero.getAttribute('src')||'';
  const thumbs=[...app.querySelectorAll('.thumbs img')].map(img=>img.getAttribute('src')||'');
  return hero.dataset.sgManualV2===key&&images.includes(heroSrc)&&((images.length===1&&thumbs.length===0)||(thumbs.length===images.length&&thumbs.every((u,i)=>u===images[i])));
}

function applyProductGallery(){
  if(applying)return;
  const entry=currentEntry();
  const heroStage=app.querySelector('.hero-stage');
  if(!entry||!heroStage)return;
  const color=currentColor();
  const key=norm(color)||'__default__';
  const images=imagesFor(entry,color);
  if(!images.length||sameGallery(images,key))return;

  applying=true;
  try{
    let active=activeByColor.get(key);
    if(!images.includes(active))active=images[0];
    activeByColor.set(key,active);

    heroStage.innerHTML='';
    const hero=document.createElement('img');
    hero.id='hero';
    hero.src=active;
    hero.alt=(app.querySelector('.product-title')?.textContent||'STARGIRLS product').trim();
    hero.decoding='async';
    hero.dataset.sgManualV2=key;
    heroStage.appendChild(hero);

    app.querySelector('.thumbs')?.remove();
    if(images.length>1){
      const thumbs=document.createElement('div');
      thumbs.className='thumbs';
      thumbs.dataset.sgManualV2=key;
      images.forEach((url,index)=>{
        const button=document.createElement('button');
        button.type='button';
        button.className=url===active?'active':'';
        button.setAttribute('aria-label',`View product image ${index+1}`);
        const img=document.createElement('img');
        img.src=url;
        img.alt='';
        img.loading='lazy';
        img.decoding='async';
        button.appendChild(img);
        button.addEventListener('click',()=>{
          activeByColor.set(key,url);
          hero.src=url;
          thumbs.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===button));
        });
        thumbs.appendChild(button);
      });
      heroStage.parentElement?.appendChild(thumbs);
    }
  }finally{applying=false;}
}

function entryFromHref(href=''){
  try{
    const u=new URL(href,location.href);
    const id=u.searchParams.get('id')||'';
    const printfulId=Number(u.searchParams.get('pf')||0)||numericProductId(id);
    return entryFor({id,printfulId});
  }catch{return null;}
}
function applySearchImages(){
  if(!searchResults)return;
  searchResults.querySelectorAll('a.product-search-result').forEach(link=>{
    const image=primaryFor(entryFromHref(link.getAttribute('href')||''));
    if(!image)return;
    let img=link.querySelector('img');
    if(!img){
      const placeholder=link.querySelector('.product-search-thumb');
      img=document.createElement('img');img.alt='';img.loading='lazy';
      placeholder?.replaceWith(img);if(!img.isConnected)link.prepend(img);
    }
    if(img.getAttribute('src')!==image)img.src=image;
    img.dataset.sgManualV2='1';
  });
}

function applyCartImages(){
  if(!cartRoot)return;
  let items=[];
  try{const parsed=JSON.parse(localStorage.getItem('stargirls-cart')||'[]');items=Array.isArray(parsed)?parsed:[];}catch{}
  [...cartRoot.querySelectorAll('.cart-line')].forEach((line,index)=>{
    const item=items[index];
    const id=String(item?.id||'');
    const entry=entryFor({id,printfulId:numericProductId(id)});
    const image=primaryFor(entry,item?.color||'');
    const thumb=line.querySelector('.cart-thumb');
    if(thumb&&image){thumb.style.backgroundImage=`url("${image.replace(/["\\]/g,'')}")`;thumb.dataset.sgManualV2='1';}
  });
}

function inferCategory(name=''){
  const n=String(name).toLowerCase();
  if(/party\s*(?:till|til)\s*hell|hayati|anew|tee|shirt|hoodie|pullover|sweatshirt|sweater/.test(n))return'merch';
  if(/hat|cap|jacket|short|pant|skirt|bikini|swim/.test(n))return'fashion';
  return'other';
}
function productPrice(p){
  const prices=(p?.variants||[]).map(v=>Number(v?.price??v?.retail_price)).filter(Number.isFinite);
  return prices.length?Math.min(...prices):null;
}
function liveImage(p){
  const manual=entryFor({printfulId:Number(p?.id||0),name:p?.name||''});
  return primaryFor(manual)||cleanPath(p?.thumbnail_url)||cleanPath(p?.image_url)||'';
}
function rebuildRelated(){
  const related=app.querySelector('.related-products');
  const grid=related?.querySelector('.related-grid');
  if(!related||!grid||related.dataset.sgLiveRelated==='1'||!Array.isArray(liveCatalog.products)||!liveCatalog.products.length)return;
  const current=liveCatalog.products.find(p=>Number(p?.id)===pf);
  const category=inferCategory(current?.name||app.querySelector('.product-title')?.textContent||'');
  const candidates=liveCatalog.products.filter(p=>Number(p?.id)!==pf&&Array.isArray(p?.variants)&&p.variants.length&&liveImage(p));
  const same=candidates.filter(p=>inferCategory(p?.name)===category);
  const picked=uniq([...same,...candidates]).slice(0,3);
  if(!picked.length){related.remove();return;}
  grid.innerHTML=picked.map(p=>{
    const id=Number(p.id),img=liveImage(p),price=productPrice(p);
    return `<a class="related-card" href="product.html?v=20260911media&id=printful-${id}&pf=${id}" data-related-pf="${id}"><div class="related-image"><img src="${esc(img)}" alt="${esc(p.name||'STARGIRLS product')}" loading="lazy" decoding="async"></div><div class="related-copy"><strong>${esc(p.name||'STARGIRLS PIECE')}</strong><span>${Number.isFinite(price)?money(price):'VIEW ITEM'} →</span></div></a>`;
  }).join('');
  related.dataset.sgLiveRelated='1';
}

function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{
    scheduled=false;
    applyProductGallery();
    applySearchImages();
    applyCartImages();
    rebuildRelated();
  });
}

new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
if(searchResults)new MutationObserver(schedule).observe(searchResults,{childList:true,subtree:true});
if(cartRoot)new MutationObserver(schedule).observe(cartRoot,{childList:true,subtree:true});

Promise.all([
  fetch(`content/product-media.json?media=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():{products:[]}).catch(()=>({products:[]})),
  fetch(`${API}/printful/catalog?v=20260911-live-related`,{cache:'no-store',mode:'cors'}).then(r=>r.ok?r.json():{products:[]}).catch(()=>({products:[]}))
]).then(([manual,catalog])=>{
  media=manual&&Array.isArray(manual.products)?manual:{products:[]};
  liveCatalog=catalog&&Array.isArray(catalog.products)?catalog:{products:[]};
  window.STARGIRLS_PRODUCT_MEDIA=media;
  schedule();
});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
})();
