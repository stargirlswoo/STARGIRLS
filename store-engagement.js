/* STARGIRLS engagement layer. Uses only real site state: no fake stock, reviews, viewers or discounts. */
(()=>{
'use strict';
const WISH_KEY='stargirls-wishlist-v1';
const RECENT_KEY='stargirls-recent-v1';
const VISIT_KEY='stargirls-last-visit-v1';
const isProduct=!!document.getElementById('app')&&/product\.html/i.test(location.pathname);
const isStore=!!document.querySelector('[data-product-grid]');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=u=>/^(?:images\/|https:\/\/)/i.test(String(u||''))?String(u):'';
function read(key,fallback){try{const x=JSON.parse(localStorage.getItem(key)||'null');return x??fallback}catch{return fallback}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function wishlist(){const x=read(WISH_KEY,[]);return Array.isArray(x)?x.map(String):[]}
function setWishlist(x){write(WISH_KEY,[...new Set(x.map(String))])}
function recent(){const x=read(RECENT_KEY,[]);return Array.isArray(x)?x:[]}
function setRecent(x){write(RECENT_KEY,x.slice(0,8))}
function toast(text){let t=document.querySelector('.sg-toast');if(!t){t=document.createElement('div');t.className='sg-toast';document.body.appendChild(t)}t.textContent=text;t.classList.add('show');clearTimeout(window.__sgToastTimer);window.__sgToastTimer=setTimeout(()=>t.classList.remove('show'),1500)}
function burst(el){if(!el)return;const r=el.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;const dirs=[[-44,-38],[-16,-52],[20,-50],[46,-28],[-48,8],[-25,34],[18,40],[45,16]];dirs.forEach(([dx,dy],i)=>{const s=document.createElement('span');s.className='sg-burst';s.textContent=i%2?'✦':'★';s.style.left=x+'px';s.style.top=y+'px';s.style.setProperty('--dx',dx+'px');s.style.setProperty('--dy',dy+'px');document.body.appendChild(s);setTimeout(()=>s.remove(),700)});try{navigator.vibrate?.(18)}catch{}}
function dynamicStatus(){
  const messages=['OFFICIAL STARGIRLS STORE ★','PARTY TILL HELL MERCH ★','JUNO — COMING SOON ★','SECURE CHECKOUT ★ SHIPPING SHOWN BEFORE PAYMENT'];
  let target=document.querySelector('.drop-bar');
  if(!target&&isProduct){target=document.createElement('div');target.className='sg-live-strip';document.querySelector('.product-header')?.insertAdjacentElement('afterend',target)}
  if(!target)return;
  if(target.classList.contains('drop-bar'))target.classList.add('sg-dynamic-status');
  let i=0;
  const previous=Number(localStorage.getItem(VISIT_KEY)||0);localStorage.setItem(VISIT_KEY,String(Date.now()));
  if(previous&&Date.now()-previous<14*24*60*60*1000)messages.unshift('YOU’RE BACK ★ STARGIRLS STORE');
  const set=()=>{target.classList.add('sg-changing');setTimeout(()=>{target.textContent=messages[i%messages.length];target.classList.remove('sg-changing');i++;},120)};
  set();
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)setInterval(set,5200);
}
function toggleWish(id,button){
  const list=wishlist();const key=String(id);const saved=list.includes(key);setWishlist(saved?list.filter(x=>x!==key):[key,...list]);syncWishButtons();renderSavedSection();burst(button);toast(saved?'REMOVED FROM SAVED':'SAVED ★');
}
function syncWishButtons(){
  const list=wishlist();
  document.querySelectorAll('[data-sg-wish]').forEach(b=>{const saved=list.includes(String(b.dataset.sgWish));b.classList.toggle('saved',saved);b.setAttribute('aria-pressed',String(saved));b.setAttribute('aria-label',saved?'Remove from saved':'Save item');b.textContent=saved?'♥':'♡'});
  document.querySelectorAll('[data-sg-product-wish]').forEach(b=>{const saved=list.includes(String(b.dataset.sgProductWish));b.classList.toggle('saved',saved);b.setAttribute('aria-pressed',String(saved));b.innerHTML=`<span class="heart">${saved?'♥':'♡'}</span>${saved?'SAVED':'SAVE ITEM'}`});
  document.querySelectorAll('[data-saved-count]').forEach(el=>el.textContent=String(list.length));
}
function enhanceStoreCards(){
  document.querySelectorAll('[data-product-card]').forEach(card=>{
    const id=card.dataset.productCard;if(!id)return;
    const wrap=card.querySelector('.catalog-card-image-wrap');if(wrap&&!wrap.querySelector('[data-sg-wish]')){const b=document.createElement('button');b.type='button';b.className='sg-heart';b.dataset.sgWish=id;b.setAttribute('aria-pressed','false');b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggleWish(id,b)});wrap.appendChild(b)}
  });
  syncWishButtons();
}
function imageFromCard(card){const img=card.querySelector('.catalog-card-image img')?.src;if(img)return img;const bg=card.querySelector('.catalog-card-image')?.style?.backgroundImage||'';const m=bg.match(/url\(["']?(.*?)["']?\)/);return m?.[1]||''}
function cardData(card){return{id:card.dataset.productCard||'',name:card.querySelector('.catalog-meta strong')?.textContent?.trim()||'STARGIRLS ITEM',price:card.querySelector('.catalog-price')?.textContent?.trim()||'VIEW ITEM',image:imageFromCard(card)}}
function openOriginal(id){const card=document.querySelector(`[data-product-card="${CSS.escape(String(id))}"]`);if(card){card.click();return true}return false}
function miniCard(x,label='FROM THE DROP',attr=''){return `<button class="sg-mini-card" type="button" ${attr}><div class="sg-mini-image">${safe(x.image)?`<img src="${esc(x.image)}" alt="${esc(x.name)}" loading="lazy" decoding="async">`:''}</div><div class="sg-mini-copy"><small>${esc(label)}</small><strong>${esc(x.name)}</strong><span>${esc(x.price||'VIEW ITEM')} →</span></div></button>`}
function injectFeatured(){
  if(!isStore||document.querySelector('.sg-featured'))return;
  const cards=[...document.querySelectorAll('[data-product-card]')].filter(c=>c.querySelector('.catalog-meta strong')).slice(0,3);if(!cards.length)return;
  const section=document.createElement('section');section.className='sg-featured';section.innerHTML=`<div class="sg-section-head"><div><p>START HERE</p><h2>FEATURED RIGHT NOW</h2></div><span>A quick way into the current STARGIRLS drop.</span></div><div class="sg-card-rail">${cards.map((c,i)=>{const x=cardData(c);return miniCard(x,i===0?'FEATURED':'FROM THE DROP',`data-feature-id="${esc(x.id)}"`)}).join('')}</div>`;
  document.querySelector('.catalog-section')?.insertAdjacentElement('beforebegin',section);
  section.querySelectorAll('[data-feature-id]').forEach(b=>b.addEventListener('click',()=>openOriginal(b.dataset.featureId)));
}
function injectSavedChip(){
  if(!isStore||document.querySelector('.sg-saved-chip'))return;const tabs=document.querySelector('.shop-tabs');if(!tabs)return;const chip=document.createElement('button');chip.type='button';chip.className='sg-saved-chip';chip.innerHTML='♡ SAVED <strong data-saved-count>0</strong>';chip.onclick=()=>{renderSavedSection(true);document.querySelector('.sg-saved')?.scrollIntoView({behavior:'smooth',block:'start'})};tabs.insertAdjacentElement('afterend',chip);syncWishButtons();
}
function renderSavedSection(forceOpen=false){
  if(!isStore)return;const old=document.querySelector('.sg-saved');const ids=wishlist();const map=new Map([...document.querySelectorAll('[data-product-card]')].map(c=>[String(c.dataset.productCard),cardData(c)]));const items=ids.map(id=>map.get(id)).filter(Boolean);
  if(!items.length){old?.remove();return}
  if(old&&!forceOpen){const rail=old.querySelector('.sg-card-rail');if(rail)rail.innerHTML=items.slice(0,4).map(x=>miniCard(x,'SAVED',`data-saved-open="${esc(x.id)}"`)).join('');wireSaved(old);return}
  old?.remove();const section=document.createElement('section');section.className='sg-saved';section.innerHTML=`<div class="sg-section-head"><div><p>YOUR PICKS</p><h2>SAVED ITEMS</h2></div><span>Saved on this device so you can come back without hunting for them.</span></div><div class="sg-card-rail">${items.slice(0,4).map(x=>miniCard(x,'SAVED',`data-saved-open="${esc(x.id)}"`)).join('')}</div>`;const anchor=document.querySelector('.sg-featured')||document.querySelector('.catalog-section');anchor?.insertAdjacentElement('afterend',section);wireSaved(section);
}
function wireSaved(section){section.querySelectorAll('[data-saved-open]').forEach(b=>b.onclick=()=>openOriginal(b.dataset.savedOpen))}
function injectRecent(){
  if(!isStore||document.querySelector('.sg-recent'))return;const items=recent().filter(x=>x&&x.name).slice(0,4);if(!items.length)return;
  const section=document.createElement('section');section.className='sg-recent';section.innerHTML=`<div class="sg-section-head"><div><p>YOU WERE LOOKING AT</p><h2>RECENTLY VIEWED</h2></div><span>Your recent STARGIRLS pieces stay here on this device.</span></div><div class="sg-card-rail">${items.map(x=>miniCard(x,'RECENT',`data-recent-id="${esc(x.id)}"`)).join('')}</div>`;document.querySelector('.catalog-section')?.insertAdjacentElement('afterend',section);section.querySelectorAll('[data-recent-id]').forEach(b=>b.onclick=()=>openOriginal(b.dataset.recentId));
}
function currentProductId(){const q=new URLSearchParams(location.search);return q.get('id')||''}
function enhanceProduct(){
  if(!isProduct)return;const info=document.querySelector('.product-info');if(!info)return;const id=currentProductId();if(!id)return;
  if(!info.querySelector('[data-sg-product-wish]')){const title=info.querySelector('.product-title');const b=document.createElement('button');b.type='button';b.className='sg-product-save';b.dataset.sgProductWish=id;b.addEventListener('click',()=>toggleWish(id,b));title?.insertAdjacentElement('afterend',b)}
  syncWishButtons();recordCurrentProduct();
}
function recordCurrentProduct(){
  const id=currentProductId();const title=document.querySelector('.product-title')?.textContent?.trim();if(!id||!title)return;const price=document.querySelector('.price')?.textContent?.trim()||'';const image=document.querySelector('.hero-stage img')?.src||'';const item={id,name:title,price,image,href:location.pathname.split('/').pop()+location.search,ts:Date.now()};setRecent([item,...recent().filter(x=>x.id!==id)]);
}
function cartMomentum(){
  const foot=document.querySelector('.cart-foot,.cart-footer');if(!foot)return;let el=foot.querySelector('.sg-cart-momentum');if(!el){el=document.createElement('div');el.className='sg-cart-momentum';foot.insertBefore(el,foot.firstChild)}
  let count=0;try{const c=JSON.parse(localStorage.getItem('stargirls-cart')||'[]');if(Array.isArray(c))count=c.reduce((n,x)=>n+Math.max(0,Number(x.quantity||0)),0)}catch{}
  el.innerHTML=count?`<strong>${count} ${count===1?'PIECE':'PIECES'}</strong> IN YOUR BAG ★`:'YOUR BAG IS READY WHEN YOU ARE.';
}
function wireRewards(){
  document.addEventListener('click',e=>{
    const add=e.target.closest?.('#add,[data-add-to-cart]');if(add&&!add.disabled)setTimeout(()=>{burst(add);toast('ADDED TO YOUR BAG ★');cartMomentum()},20);
    if(e.target.closest?.('[data-cart-inc],[data-cart-dec],[data-cart-remove],[data-remove]'))setTimeout(cartMomentum,30);
  },true);
}
function apply(){if(isStore){enhanceStoreCards();injectFeatured();injectSavedChip();renderSavedSection();injectRecent()}if(isProduct)enhanceProduct();cartMomentum()}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
dynamicStatus();wireRewards();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
const grid=document.querySelector('[data-product-grid]');if(grid)new MutationObserver(schedule).observe(grid,{childList:true,subtree:true});
if(isProduct)new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true});
})();
