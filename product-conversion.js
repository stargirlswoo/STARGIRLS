/* STARGIRLS product conversion enhancements. No fake scarcity, fake reviews, or fake discounts. */
(()=>{
'use strict';
const SNAPSHOT_KEY='stargirls-clicked-product-v1';
const CACHE_KEYS=['stargirls-printful-catalog-v6','stargirls-printful-catalog-v5'];
const app=document.getElementById('app');
if(!app)return;
const q=new URLSearchParams(location.search);
const requestedId=q.get('id')||'';
const requestedPf=Number(q.get('pf')||(/^printful-(\d+)$/.exec(requestedId)?.[1]||0));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=u=>/^https:\/\//i.test(String(u||''))?String(u):'';
const uniq=a=>[...new Set(a.filter(Boolean))];
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0));

function readCatalog(){
  for(const key of CACHE_KEYS){
    try{
      const raw=JSON.parse(localStorage.getItem(key)||'null');
      const data=raw?.data||raw;
      if(data&&Array.isArray(data.products)&&data.products.length)return data;
    }catch{}
  }
  return null;
}
function currentSource(){
  try{
    const snap=JSON.parse(sessionStorage.getItem(SNAPSHOT_KEY)||'null');
    if(snap?.source&&(!requestedPf||Number(snap.pfid)===requestedPf))return snap.source;
  }catch{}
  const cat=readCatalog();
  return (cat?.products||[]).find(p=>Number(p.id)===requestedPf)||null;
}
function inferCategory(name=''){
  const n=String(name).toLowerCase();
  if(/party\s*(?:till|til)\s*hell|hayati|anew|tee|shirt|hoodie|pullover|sweatshirt|sweater/.test(n))return'merch';
  if(/hat|cap|jacket|short|pant|skirt|bikini|swim/.test(n))return'fashion';
  return'other';
}
function variantPrice(v){const p=Number(v?.price??v?.retail_price);return Number.isFinite(p)?p:null;}
function productPrice(p){const prices=(p?.variants||[]).map(variantPrice).filter(Number.isFinite);return prices.length?Math.min(...prices):null;}
function productImage(p){
  const candidates=[p?.thumbnail_url,p?.image_url];
  for(const v of p?.variants||[]){candidates.push(v?.image,v?.catalog_image,v?.product?.image);for(const f of v?.files||[])candidates.push(f?.preview_url,f?.thumbnail_url);}
  return candidates.map(safe).find(Boolean)||'';
}
function saveRelatedSnapshot(p){
  try{sessionStorage.setItem(SNAPSHOT_KEY,JSON.stringify({ts:Date.now(),id:`printful-${p.id}`,pfid:Number(p.id),source:p}));}catch{}
}
function injectTrust(){
  const info=app.querySelector('.product-info');
  const price=info?.querySelector('.price');
  if(!info||!price||info.querySelector('.conversion-trust'))return;
  price.insertAdjacentHTML('afterend',`
    <div class="conversion-availability">AVAILABLE NOW</div>
    <div class="conversion-trust" aria-label="Purchase reassurance">
      <div class="conversion-trust-item"><span class="conversion-trust-icon">★</span><div><strong>OFFICIAL STARGIRLS</strong><span>Direct from the STARGIRLS store</span></div></div>
      <div class="conversion-trust-item"><span class="conversion-trust-icon">✓</span><div><strong>SECURE CHECKOUT</strong><span>Protected payment through Stripe</span></div></div>
      <div class="conversion-trust-item"><span class="conversion-trust-icon">↗</span><div><strong>SHIPPING SHOWN FIRST</strong><span>See shipping before you pay</span></div></div>
    </div>`);

  const note=info.querySelector('.product-note');
  if(note&&!info.querySelector('.purchase-nudge'))note.insertAdjacentHTML('beforebegin','<div class="purchase-nudge"><strong>MADE TO ORDER.</strong> Choose the exact color and size you want, then we send the order to fulfillment.</div><div class="conversion-reassurance"><span>No account required</span><span>Order confirmation by email</span><span>Secure payment</span></div>');
}
function enhanceButtons(){
  const add=app.querySelector('#add');
  const buy=app.querySelector('#buyNow');
  if(add){add.classList.add('primary-conversion');if(!add.disabled)add.textContent='ADD TO CART';}
  if(buy){buy.classList.add('secondary-conversion');if(!buy.disabled)buy.textContent='BUY NOW — SECURE CHECKOUT';}
}
function injectCartTrust(){
  const foot=document.querySelector('.cart-foot');
  if(!foot||foot.querySelector('.cart-conversion-trust'))return;
  foot.insertAdjacentHTML('beforeend','<div class="cart-conversion-trust"><span>Secure Stripe checkout</span><span>Shipping shown before payment</span><span>No account required</span></div>');
}
function relatedProducts(){
  const cat=readCatalog();
  if(!cat)return[];
  const current=currentSource();
  const currentCat=inferCategory(current?.name||'');
  const all=(cat.products||[]).filter(p=>Number(p.id)!==requestedPf&&Array.isArray(p.variants)&&p.variants.length&&productImage(p));
  const same=all.filter(p=>inferCategory(p.name)===currentCat);
  return uniq([...same,...all]).slice(0,3);
}
function injectRelated(){
  if(app.querySelector('.related-products'))return;
  const items=relatedProducts();
  if(!items.length)return;
  const cards=items.map(p=>{
    const img=productImage(p),price=productPrice(p),id=Number(p.id);
    return `<a class="related-card" href="product.html?v=20260910j&id=printful-${id}&pf=${id}" data-related-pf="${id}"><div class="related-image"><img src="${esc(img)}" alt="${esc(p.name||'STARGIRLS product')}" loading="lazy" decoding="async"></div><div class="related-copy"><strong>${esc(p.name||'STARGIRLS PIECE')}</strong><span>${Number.isFinite(price)?money(price):'VIEW ITEM'} →</span></div></a>`;
  }).join('');
  app.insertAdjacentHTML('beforeend',`<section class="related-products"><div class="related-head"><div><p class="related-eyebrow">KEEP GOING</p><h2>COMPLETE THE DROP</h2></div><p>More from the same STARGIRLS world. Tap an item to see its options.</p></div><div class="related-grid">${cards}</div></section>`);
  const cat=readCatalog();
  app.querySelectorAll('[data-related-pf]').forEach(a=>a.addEventListener('click',()=>{const p=(cat?.products||[]).find(x=>Number(x.id)===Number(a.dataset.relatedPf));if(p)saveRelatedSnapshot(p);}));
}
function scrollToMissingOption(){
  const options=[...app.querySelectorAll('.option')];
  const missing=options.find(opt=>opt.querySelector('.choices')&&!opt.querySelector('.choice.active'))||app.querySelector('.buy-row');
  missing?.scrollIntoView({behavior:'smooth',block:'center'});
}
function injectSticky(){
  let bar=document.querySelector('.mobile-sticky-buy');
  if(!bar){
    document.body.insertAdjacentHTML('beforeend','<div class="mobile-sticky-buy"><div class="sticky-product-copy"><strong data-sticky-name>STARGIRLS</strong><span data-sticky-price></span></div><button class="sticky-buy-button" type="button" data-sticky-buy>SELECT OPTIONS</button></div>');
    bar=document.querySelector('.mobile-sticky-buy');
    bar.querySelector('[data-sticky-buy]').onclick=()=>{const add=app.querySelector('#add');if(add&&!add.disabled)add.click();else scrollToMissingOption();};
  }
  const title=app.querySelector('.product-title')?.textContent?.trim()||'STARGIRLS';
  const price=app.querySelector('.price')?.textContent?.trim()||'';
  const add=app.querySelector('#add');
  bar.querySelector('[data-sticky-name]').textContent=title;
  bar.querySelector('[data-sticky-price]').textContent=price;
  const btn=bar.querySelector('[data-sticky-buy]');
  btn.disabled=false;
  btn.textContent=add&&!add.disabled?'ADD TO CART':'SELECT OPTIONS';
}
function apply(){
  if(!app.querySelector('.product-info'))return;
  injectTrust();enhanceButtons();injectCartTrust();injectRelated();injectSticky();
}
let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;apply();});}
new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
schedule();
})();
