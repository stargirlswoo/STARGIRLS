(()=>{
'use strict';
const params=new URLSearchParams(location.search);
const pf=Number(params.get('pf')||(/^printful-(\d+)$/.exec(params.get('id')||'')?.[1]||0));
const requestedId=params.get('id')||'';
const app=document.getElementById('app');
const searchResults=document.getElementById('productSearchResults');
if(!app)return;

let media={products:[]};
let applying=false;
const activeByColor=new Map();

const norm=s=>String(s||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const cleanPath=v=>{
  const raw=typeof v==='string'?v:(v&&typeof v==='object'?v.image||v.src||'':'');
  const s=String(raw||'').trim();
  return /^(?:https:\/\/|\/images\/|images\/)/i.test(s)?s:'';
};
const uniq=a=>[...new Set(a.filter(Boolean))];
const imageList=value=>Array.isArray(value)?value.map(cleanPath).filter(Boolean):[];

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
  const exact=colorEntry(entry,color);
  const exactImages=imageList(exact?.images);
  if(exactImages.length)return uniq(exactImages).slice(0,8);
  const gallery=imageList(entry?.gallery);
  if(gallery.length)return uniq(gallery).slice(0,8);
  const first=imageList(fallbackColor(entry)?.images);
  if(first.length)return uniq(first).slice(0,8);
  const card=cleanPath(entry?.card_image);
  return card?[card]:[];
}
function primaryFor(entry,color=''){
  const list=imagesFor(entry,color);
  return cleanPath(entry?.card_image)||list[0]||'';
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

function sameGallery(images){
  const hero=app.querySelector('.hero-stage img');
  if(!hero)return false;
  const heroSrc=hero.getAttribute('src')||'';
  const thumbs=[...app.querySelectorAll('.thumbs img')].map(img=>img.getAttribute('src')||'');
  if(images.length===1)return hero.dataset.sgManual==='1'&&heroSrc===images[0]&&thumbs.length===0;
  return hero.dataset.sgManual==='1'&&heroSrc&&images.includes(heroSrc)&&thumbs.length===images.length&&thumbs.every((u,i)=>u===images[i]);
}

function applyProductGallery(){
  if(applying)return;
  const entry=currentEntry();
  if(!entry)return;
  const heroStage=app.querySelector('.hero-stage');
  if(!heroStage)return;
  const color=currentColor();
  const images=imagesFor(entry,color);
  if(!images.length)return;
  if(sameGallery(images))return;

  applying=true;
  try{
    const key=norm(color)||'__default__';
    let active=activeByColor.get(key);
    if(!images.includes(active))active=images[0];
    activeByColor.set(key,active);

    heroStage.innerHTML='';
    const hero=document.createElement('img');
    hero.id='hero';
    hero.src=active;
    hero.alt=(app.querySelector('.product-title')?.textContent||'STARGIRLS product').trim();
    hero.decoding='async';
    hero.dataset.sgManual='1';
    heroStage.appendChild(hero);

    app.querySelector('.thumbs')?.remove();
    if(images.length>1){
      const thumbs=document.createElement('div');
      thumbs.className='thumbs';
      thumbs.dataset.sgManual='1';
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
    const entry=entryFromHref(link.getAttribute('href')||'');
    const image=primaryFor(entry);
    if(!image)return;
    let img=link.querySelector('img');
    if(!img){
      const placeholder=link.querySelector('.product-search-thumb');
      img=document.createElement('img');
      img.alt='';
      img.loading='lazy';
      placeholder?.replaceWith(img);
      if(!img.isConnected)link.prepend(img);
    }
    if(img.getAttribute('src')!==image)img.src=image;
    img.dataset.sgManual='1';
  });
}

function productFromCartItem(item){
  const id=String(item?.id||'');
  const printfulId=numericProductId(id);
  return entryFor({id,printfulId});
}
function applyCartImages(){
  const cartRoot=document.getElementById('cartItems');
  if(!cartRoot)return;
  let items=[];
  try{const parsed=JSON.parse(localStorage.getItem('stargirls-cart')||'[]');items=Array.isArray(parsed)?parsed:[];}catch{}
  [...cartRoot.querySelectorAll('.cart-line')].forEach((line,index)=>{
    const item=items[index];
    const entry=productFromCartItem(item);
    const image=primaryFor(entry,item?.color||'');
    const thumb=line.querySelector('.cart-thumb');
    if(thumb&&image){thumb.style.backgroundImage=`url("${image.replace(/["\\]/g,'')}")`;thumb.dataset.sgManual='1';}
  });
}

let scheduled=false;
function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{
    scheduled=false;
    applyProductGallery();
    applySearchImages();
    applyCartImages();
  });
}

new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
if(searchResults)new MutationObserver(schedule).observe(searchResults,{childList:true,subtree:true});
const cartItems=document.getElementById('cartItems');
if(cartItems)new MutationObserver(schedule).observe(cartItems,{childList:true,subtree:true});

fetch(`content/product-media.json?media=${Math.floor(Date.now()/60000)}`,{cache:'no-store'})
  .then(r=>r.ok?r.json():Promise.reject(new Error(`Product media ${r.status}`)))
  .then(data=>{media=data&&Array.isArray(data.products)?data:{products:[]};window.STARGIRLS_PRODUCT_MEDIA=media;schedule();})
  .catch(error=>console.warn('STARGIRLS manual product media:',error));
})();
