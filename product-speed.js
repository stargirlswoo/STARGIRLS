(()=>{
'use strict';
const API='https://stargirls.stargirlswoo.workers.dev';
const SNAPSHOT_KEY='stargirls-clicked-product-v1';
const CACHE_KEYS=['stargirls-printful-catalog-v6','stargirls-printful-catalog-v5'];
const q=new URLSearchParams(location.search);
const requestedId=q.get('id')||'';
const requestedPf=Number(q.get('pf')||(/^printful-(\d+)$/.exec(requestedId)?.[1]||0));
const app=document.getElementById('app');
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=u=>/^https:\/\//i.test(String(u||''))?String(u):'';
const uniq=a=>[...new Set(a.filter(Boolean))];
let source=null,variants=[],selection={color:'',size:'',qty:1},activeImage=0;

function variantParts(v){
  const parts=String(v?.name||'').split(' / ').map(x=>x.trim()).filter(Boolean);
  const color=String(v?.color||'').trim()||(parts.length>=3?parts.at(-2):(parts.length===2?parts[0]:'Default'))||'Default';
  const size=String(v?.size||'').trim()||(parts.length>=2?parts.at(-1):'One Size')||'One Size';
  const price=Number(v?.price??v?.retail_price);
  const sync=Number(v?.printful_sync_variant_id||v?.sync_variant_id||0);
  const images=[];
  for(const u of v?.images||[])if(safe(u))images.push(u);
  for(const u of [v?.image,v?.catalog_image,v?.product?.image])if(safe(u))images.push(u);
  for(const f of v?.files||[])for(const u of [f?.preview_url,f?.thumbnail_url])if(safe(u))images.push(u);
  return {...v,color,size,price:Number.isFinite(price)?price:null,printful_sync_variant_id:sync,images:uniq(images)};
}
function productImages(){
  const out=[];
  for(const u of [source?.thumbnail_url,source?.image_url])if(safe(u))out.push(u);
  const relevant=selection.color?variants.filter(v=>v.color===selection.color):variants;
  for(const v of relevant)for(const u of v.images||[])out.push(u);
  return uniq(out).slice(0,8);
}
function currentVariant(){return variants.find(v=>v.color===selection.color&&v.size===selection.size)||null;}
function categoryName(){
  const n=String(source?.name||'').toLowerCase();
  if(/party\s*(?:till|til)\s*hell|hayati|anew|tee|shirt|hoodie|pullover|sweatshirt|sweater/.test(n))return'MERCH';
  if(/hat|cap|jacket|short|pant|skirt|bikini|swim/.test(n))return'FASHION';
  return'STARGIRLS';
}
function loadSnapshot(){
  try{
    const snap=JSON.parse(sessionStorage.getItem(SNAPSHOT_KEY)||'null');
    if(snap?.source&&Array.isArray(snap.source.variants)&&snap.source.variants.length){
      const pfOk=!requestedPf||Number(snap.pfid)===requestedPf;
      const idOk=!requestedId||String(snap.id)===requestedId;
      if(pfOk&&idOk)return snap.source;
    }
  }catch{}
  for(const key of CACHE_KEYS){
    try{
      const raw=JSON.parse(localStorage.getItem(key)||'null');
      const data=raw?.data||raw;
      const found=(data?.products||[]).find(p=>Number(p.id)===requestedPf);
      if(found)return found;
    }catch{}
  }
  return null;
}
function prepare(raw){
  source=raw;
  variants=(raw?.variants||[]).map(variantParts).filter(v=>Number.isFinite(v.price)&&v.printful_sync_variant_id>0);
  const colors=uniq(variants.map(v=>v.color));
  const sizes=uniq(variants.map(v=>v.size));
  if(colors.length===1)selection.color=colors[0];
  const possible=selection.color?uniq(variants.filter(v=>v.color===selection.color).map(v=>v.size)):sizes;
  if(possible.length===1)selection.size=possible[0];
  activeImage=0;
  render();
}
function showColorOptions(colors){return !(colors.length===1&&/^(default|one color)$/i.test(colors[0]));}
function showSizeOptions(sizes){return !(sizes.length===1&&/^(one size|os|osfa|default)$/i.test(sizes[0]));}
function render(){
  const colors=uniq(variants.map(v=>v.color));
  const sizes=uniq(variants.map(v=>v.size));
  const availableSizes=new Set(variants.filter(v=>!selection.color||v.color===selection.color).map(v=>v.size));
  const selected=currentVariant();
  const prices=variants.map(v=>v.price).filter(Number.isFinite);
  const price=selected?.price??(prices.length?Math.min(...prices):null);
  const imgs=productImages();
  if(activeImage>=imgs.length)activeImage=0;
  const cat=categoryName();
  document.title=`${source?.name||'STARGIRLS Product'} — STARGIRLS`;
  app.innerHTML=`
    <section class="product-shell">
      <div class="product-layout">
        <div class="product-media">
          <div class="hero-stage">${imgs.length?`<img id="hero" src="${esc(imgs[activeImage])}" alt="${esc(source?.name||'STARGIRLS product')}" decoding="async">`:'<div class="error-state"><p>PRODUCT IMAGE COMING SOON</p></div>'}</div>
          ${imgs.length?`<div class="thumbs">${imgs.map((u,i)=>`<button type="button" data-img="${i}" class="${i===activeImage?'active':''}" aria-label="View product image ${i+1}"><img src="${esc(u)}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>`:''}
        </div>
        <div class="product-info">
          <div class="crumb-rule"></div>
          <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html#catalog">Home</a><span class="dot"></span><a href="index.html#catalog">${esc(cat.charAt(0)+cat.slice(1).toLowerCase())}</a><span class="dot"></span><span>${esc(source?.name||'Product')}</span></nav>
          <h1 class="product-title">${esc(source?.name||'STARGIRLS PIECE')}</h1>
          <div class="price">${Number.isFinite(price)?money(price):'AVAILABLE'}</div>
          <p class="payment-note">Secure checkout with <strong>Stripe</strong>. Shipping and taxes are calculated at checkout.</p>
          ${showColorOptions(colors)?`<div class="option"><div class="option-label"><span>Color</span><span>${selection.color?esc(selection.color):'Select one'}</span></div><div class="choices">${colors.map(c=>`<button class="choice ${selection.color===c?'active':''}" type="button" data-color="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>`:''}
          ${showSizeOptions(sizes)?`<div class="option"><div class="option-label"><span>Size</span><span>${selection.size?esc(selection.size):'Select one'}</span></div><div class="choices">${sizes.map(s=>`<button class="choice ${selection.size===s?'active':''}" type="button" data-size="${esc(s)}" ${selection.color&&!availableSizes.has(s)?'disabled':''}>${esc(s)}</button>`).join('')}</div></div>`:''}
          <div class="buy-row"><select class="qty-select" id="qty" aria-label="Quantity">${Array.from({length:10},(_,i)=>`<option value="${i+1}" ${selection.qty===i+1?'selected':''}>${i+1}</option>`).join('')}</select><button class="add" type="button" id="add" ${selected?'':'disabled'}>${selected?'ADD TO CART':'SELECT OPTIONS'}</button></div>
          <button class="stripe-buy" type="button" id="buyNow" ${selected?'':'disabled'}>BUY NOW</button>
          <div class="more-payment">Secure payment options at checkout</div>
          <div class="product-details"><details open><summary>PRODUCT DETAILS</summary><p>Official STARGIRLS item produced to order through our fulfillment partner. Choose your exact color and size above where applicable.</p></details><details><summary>SHIPPING + RETURNS</summary><p>Shipping price and delivery estimate are shown at checkout. Made-to-order items follow the STARGIRLS returns policy.</p></details></div>
          <p class="product-note">Please double-check your selection and shipping information before placing your order.</p>
        </div>
      </div>
    </section>`;
  app.querySelectorAll('[data-img]').forEach(b=>b.onclick=()=>{activeImage=Number(b.dataset.img)||0;render();});
  app.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{selection.color=b.dataset.color;selection.size='';const ps=uniq(variants.filter(v=>v.color===selection.color).map(v=>v.size));if(ps.length===1)selection.size=ps[0];activeImage=0;render();});
  app.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{selection.size=b.dataset.size;render();});
  const qty=document.getElementById('qty');if(qty)qty.onchange=()=>{selection.qty=Math.max(1,Math.min(10,Number(qty.value)||1));};
  const add=document.getElementById('add');if(add)add.onclick=addToCart;
  const buyNow=document.getElementById('buyNow');if(buyNow)buyNow.onclick=()=>{addToCart();checkout();};
}
function fail(){app.innerHTML=`<div class="error-state"><div><h1>COULDN'T OPEN THIS ITEM</h1><p>This product didn't load correctly.</p><p><a href="index.html#catalog">← BACK TO SHOP</a></p></div></div>`;}
async function fetchDirect(){
  if(!requestedPf)return null;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),3000);
  try{const r=await fetch(`${API}/printful/catalog`,{cache:'default',mode:'cors',signal:controller.signal});if(!r.ok)return null;const data=await r.json();return(data?.products||[]).find(p=>Number(p.id)===requestedPf)||null;}catch{return null;}finally{clearTimeout(timer);}
}
function cart(){try{const c=JSON.parse(localStorage.getItem('stargirls-cart')||'[]');return Array.isArray(c)?c:[]}catch{return[];}}
function saveCart(c){localStorage.setItem('stargirls-cart',JSON.stringify(c));renderCart();}
function addToCart(){
  const v=currentVariant();if(!v)return;
  const c=cart();const id=requestedId||`printful-${requestedPf}`;
  const ex=c.find(x=>x.id===id&&x.color===selection.color&&x.size===selection.size);
  if(ex)ex.quantity=Math.min(10,Number(ex.quantity||0)+selection.qty);
  else c.push({id,color:selection.color,size:selection.size,sku:v.sku||'',printful_sync_variant_id:Number(v.printful_sync_variant_id||0),quantity:selection.qty});
  saveCart(c);openCart();
}
function renderCart(){
  const c=cart();document.getElementById('cartCount').textContent=String(c.reduce((n,x)=>n+Number(x.quantity||0),0));
  let total=0;const box=document.getElementById('cartItems');
  if(!c.length){box.innerHTML='<div class="empty">YOUR CART IS EMPTY.</div>';document.getElementById('cartSubtotal').textContent=money(0);document.getElementById('checkout').disabled=true;return;}
  box.innerHTML=c.map((x,i)=>{const local=(x.id===(requestedId||`printful-${requestedPf}`))?variants.find(v=>v.color===x.color&&v.size===x.size):null;const price=Number(local?.price||0);if(price)total+=price*Number(x.quantity||0);const img=local?.images?.[0]||source?.thumbnail_url||'';return`<div class="cart-line">${safe(img)?`<img class="cart-thumb" src="${esc(img)}" alt="">`:'<div class="cart-thumb"></div>'}<div class="cart-copy"><strong>${esc(x.id===(requestedId||`printful-${requestedPf}`)?source?.name||'STARGIRLS ITEM':'STARGIRLS ITEM')}</strong><div>${esc(x.color)}${x.size?` · ${esc(x.size)}`:''} · QTY ${Number(x.quantity||0)}</div><button type="button" data-remove="${i}">REMOVE</button></div></div>`;}).join('');
  box.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const next=cart();next.splice(Number(b.dataset.remove),1);saveCart(next);});
  document.getElementById('cartSubtotal').textContent=total?money(total):'Calculated at checkout';document.getElementById('checkout').disabled=false;
}
function openCart(){document.getElementById('cart').classList.add('open');document.getElementById('cartBackdrop').classList.add('open');}
function closeCart(){document.getElementById('cart').classList.remove('open');document.getElementById('cartBackdrop').classList.remove('open');}
async function checkout(){
  const c=cart();if(!c.length)return;
  const btn=document.getElementById('checkout'),status=document.getElementById('checkoutStatus');btn.disabled=true;btn.textContent='OPENING CHECKOUT…';
  try{const r=await fetch(`${API}/checkout`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:c})});const d=await r.json();if(!r.ok||!d.url)throw new Error(d.error||'Checkout failed');location.assign(d.url);}catch(e){btn.disabled=false;btn.textContent='TRY CHECKOUT AGAIN →';status.textContent=e.message||'Checkout could not open.';}
}
document.getElementById('cartOpen').onclick=openCart;
document.getElementById('cartClose').onclick=closeCart;
document.getElementById('cartBackdrop').onclick=closeCart;
document.getElementById('checkout').onclick=checkout;
renderCart();
const immediate=loadSnapshot();
if(immediate)prepare(immediate);else fetchDirect().then(raw=>raw?prepare(raw):fail());
})();
