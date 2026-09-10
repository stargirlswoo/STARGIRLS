const API=window.STARGIRLS_STORE_API||'';
const qs=s=>document.querySelector(s);
const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v||0));
const esc=v=>String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
const CATALOG_CACHE_KEY='stargirls-printful-catalog-v4';
const CATALOG_TTL=120000;
let product=null,selection={color:'',size:'',qty:1},cart=loadCart();

function loadCart(){try{const v=JSON.parse(localStorage.getItem('stargirls-cart'));return Array.isArray(v)?v:[]}catch{return[]}}
function saveCart(){localStorage.setItem('stargirls-cart',JSON.stringify(cart));renderCart()}
function safeUrl(value=''){return /^https:\/\//i.test(String(value||''))?String(value):''}
function inferCategory(name=''){
  const n=String(name).toLowerCase();
  if(/juno|perfume|parfum|fragrance|eau de/.test(n))return'perfume';
  if(/party\s*(?:till|til)\s*hell/.test(n))return'merch';
  if(/\b(?:hayati|anew)\b/.test(n))return'merch';
  if(/\bstargirls?\b.*\b(?:tee|t-?shirt|shirt|pullover|hoodie|sweatshirt|sweater)\b/.test(n))return'merch';
  return'fashion';
}
function activeVariant(v){const s=String(v?.availability_status||'').toLowerCase();return !!v&&v.synced!==false&&v.is_ignored!==true&&s!=='inactive'&&s!=='discontinued'&&Number(v.sync_variant_id||0)>0}
function partsFor(v){return String(v?.name||'').split(' / ').map(x=>x.trim()).filter(Boolean)}
function rawColor(v){const explicit=String(v?.color||'').trim();if(explicit)return explicit;const p=partsFor(v);if(p.length>=3)return p.at(-2)||'Default';if(p.length===2)return p[0]||'Default';return'Default'}
function rawSize(v){const explicit=String(v?.size||'').trim();if(explicit)return explicit;const p=partsFor(v);return p.length>=2?(p.at(-1)||'One Size'):'One Size'}
function fileMeta(f){return`${String(f?.type||'')} ${String(f?.preview_url||'')} ${String(f?.thumbnail_url||'')}`.toLowerCase()}
function isArtwork(f){return/printfile|print[_ -]?file|embroidery|inside|label|template|pattern|logo|design|digitization|artwork/.test(fileMeta(f))}
function addUnique(out,u){u=safeUrl(u);if(u&&!out.includes(u))out.push(u)}
function variantImages(raw,v){
  const out=[];
  addUnique(out,raw?.thumbnail_url||raw?.image_url);
  for(const f of v?.files||[]){if(!isArtwork(f)&&/mockup|preview/.test(fileMeta(f))){addUnique(out,f.preview_url);addUnique(out,f.thumbnail_url)}}
  addUnique(out,v?.catalog_image||v?.product?.image);
  for(const f of v?.files||[]){if(!isArtwork(f)){addUnique(out,f.preview_url);addUnique(out,f.thumbnail_url)}}
  return out;
}
function parseProduct(base,raw){
  const variants=(raw?.variants||[]).filter(activeVariant).map(v=>{
    const price=Number(v?.retail_price);
    const images=variantImages(raw,v);
    return{...v,color:rawColor(v),size:rawSize(v),price:Number.isFinite(price)?price:null,images,image:images[0]||safeUrl(raw?.thumbnail_url)||'',printful_sync_variant_id:Number(v?.sync_variant_id||0)};
  }).filter(v=>v.color&&v.size&&Number.isFinite(v.price)&&v.printful_sync_variant_id>0);
  const image=safeUrl(raw?.thumbnail_url||raw?.image_url)||variants.map(v=>v.image).find(Boolean)||'';
  return{...base,name:raw?.name||base.name,category:base.category||inferCategory(raw?.name),image,variants};
}
function selectedVariant(){return product?.variants?.find(v=>v.color===selection.color&&v.size===selection.size)}
function gallery(){if(!product)return[];const out=[];addUnique(out,product.image);const vs=selection.color?product.variants.filter(v=>v.color===selection.color):product.variants;for(const v of vs)for(const u of v.images||[])addUnique(out,u);return out.slice(0,10)}
function swatch(name=''){
  const n=name.toLowerCase();
  if(n.includes('black'))return'#111';if(n.includes('white'))return'#f7f7f2';if(/grey|gray|ash|heather/.test(n))return'#9c9b98';
  if(n.includes('pink'))return'#e7b5c7';if(n.includes('navy'))return'#1a2640';if(n.includes('blue'))return'#6e91b7';
  if(n.includes('green'))return'#526b55';if(/red|burgundy|maroon/.test(n))return'#8c2e3a';if(/brown|chocolate/.test(n))return'#6a493b';return'#777';
}
function render(){
  if(!product)return;
  document.title=`${product.name} — STARGIRLS`;
  const colors=[...new Set(product.variants.map(v=>v.color).filter(Boolean))];
  const allSizes=[...new Set(product.variants.map(v=>v.size).filter(Boolean))];
  const v=selectedVariant(),imgs=gallery(),prices=product.variants.map(v=>v.price).filter(Number.isFinite),price=v?.price??(prices.length?Math.min(...prices):null);
  const availableSizes=new Set(product.variants.filter(x=>!selection.color||x.color===selection.color).map(x=>x.size));
  const galleryEl=qs('[data-product-gallery]');
  galleryEl.innerHTML=imgs.length?imgs.map((u,i)=>`<img src="${esc(u)}" alt="${esc(product.name)}${i?` view ${i+1}`:''}" loading="${i?'lazy':'eager'}" decoding="async" referrerpolicy="no-referrer">`).join(''):'<div class="product-loading">PRODUCT IMAGE COMING SOON</div>';
  const badge=product.category==='merch'?'OFFICIAL STARGIRLS MERCH':product.category==='fashion'?'STARGIRLS FASHION':'STARGIRLS';
  qs('[data-product-info]').innerHTML=`<div class="product-info-inner"><span class="product-badge">${badge}</span><h1 class="product-title">${esc(product.name)}</h1><div class="product-price">${Number.isFinite(price)?money(price):esc(product.status||'')}</div>${product.variants.length?`<div class="option-block"><div class="option-head"><span>COLOR</span><span>${selection.color?esc(selection.color):'SELECT ONE'}</span></div><div class="color-list">${colors.map(c=>`<button class="color-btn ${selection.color===c?'active':''}" data-color="${esc(c)}"><span class="swatch" style="background:${swatch(c)}"></span>${esc(c)}</button>`).join('')}</div></div><div class="option-block"><div class="option-head"><span>SIZE</span><a href="help.html">SIZE GUIDE</a></div><div class="size-list">${allSizes.map(s=>`<button class="size-btn ${selection.size===s?'active':''}" data-size="${esc(s)}" ${selection.color&&!availableSizes.has(s)?'disabled':''}>${esc(s)}</button>`).join('')}</div></div><div class="quantity-row"><span>QUANTITY</span><div class="quantity-control"><button data-minus>−</button><span>${selection.qty}</span><button data-plus>+</button></div></div><button class="add-button" data-add ${v?'':'disabled'}>${v?'ADD TO CART':'SELECT COLOR + SIZE'}</button><p class="product-note">Made to order. Please double-check your size, color and shipping information before checkout.</p>`:`<button class="add-button" disabled>${esc(product.status||'COMING SOON')}</button>`}<div class="product-accordion"><details open><summary>PRODUCT DETAILS</summary><p>Official STARGIRLS item, produced to order through our fulfillment partner.</p></details><details><summary>SHIPPING + RETURNS</summary><p>Shipping cost and delivery estimates are shown at checkout. Made-to-order apparel is generally final sale except for qualifying defects or fulfillment errors. Read the full policies before ordering.</p></details></div></div>`;
  bind();
}
function bind(){
  document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{selection.color=b.dataset.color;selection.size='';render()});
  document.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{selection.size=b.dataset.size;render()});
  qs('[data-minus]')&&(qs('[data-minus]').onclick=()=>{selection.qty=Math.max(1,selection.qty-1);render()});
  qs('[data-plus]')&&(qs('[data-plus]').onclick=()=>{selection.qty=Math.min(10,selection.qty+1);render()});
  qs('[data-add]')&&(qs('[data-add]').onclick=add);
}
function add(){
  const v=selectedVariant();if(!v)return;
  const ex=cart.find(i=>i.id===product.id&&i.color===selection.color&&i.size===selection.size);
  if(ex)ex.quantity=Math.min(10,ex.quantity+selection.qty);
  else cart.push({id:product.id,color:selection.color,size:selection.size,sku:v.sku||'',printful_sync_variant_id:Number(v.printful_sync_variant_id||v.sync_variant_id||0),quantity:selection.qty});
  saveCart();toast('GOOD CHOICE ★');openCart();
}
function toast(t){const el=qs('[data-toast]');if(!el)return;el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1400)}
function openCart(){qs('[data-cart-drawer]')?.classList.add('active');qs('[data-cart-backdrop]')?.classList.add('active')}
function closeCart(){qs('[data-cart-drawer]')?.classList.remove('active');qs('[data-cart-backdrop]')?.classList.remove('active')}
function renderCart(){
  document.querySelectorAll('[data-cart-count]').forEach(x=>x.textContent=cart.reduce((s,i)=>s+Number(i.quantity||0),0));
  const box=qs('[data-cart-items]'),sub=qs('[data-cart-subtotal]');if(!box||!sub)return;let total=0;
  if(!cart.length){box.innerHTML='<div style="padding:24px;font-size:12px">YOUR CART IS PAINFULLY EMPTY.</div>';sub.textContent=money(0);return}
  box.innerHTML=cart.map((i,k)=>{const pv=(product&&i.id===product.id)?product.variants.find(v=>v.color===i.color&&v.size===i.size):null;const img=pv?.image||'';const price=pv?.price||0;total+=price*i.quantity;return`<div class="cart-line"><div class="cart-thumb" style="${img?`background-image:url('${img.replace(/[\"'\\]/g,'')}')`:''}"></div><div class="cart-line-copy"><strong>${esc((product&&i.id===product.id)?product.name:i.id.replaceAll('-',' ').toUpperCase())}</strong><span>${esc(i.color)} · SIZE ${esc(i.size)}</span>${price?`<span>${money(price)}</span>`:''}<div class="qty-controls"><button data-cart-dec="${k}">−</button><span>${i.quantity}</span><button data-cart-inc="${k}">+</button></div><button class="cart-remove" data-cart-remove="${k}">REMOVE</button></div></div>`}).join('');
  sub.textContent=money(total);
  document.querySelectorAll('[data-cart-dec]').forEach(b=>b.onclick=()=>{const i=cart[+b.dataset.cartDec];i.quantity--;if(i.quantity<=0)cart.splice(+b.dataset.cartDec,1);saveCart()});
  document.querySelectorAll('[data-cart-inc]').forEach(b=>b.onclick=()=>{cart[+b.dataset.cartInc].quantity=Math.min(10,cart[+b.dataset.cartInc].quantity+1);saveCart()});
  document.querySelectorAll('[data-cart-remove]').forEach(b=>b.onclick=()=>{cart.splice(+b.dataset.cartRemove,1);saveCart()});
}
async function checkout(){
  if(!API||!cart.length)return;const btn=qs('[data-checkout]'),note=qs('[data-checkout-note]');btn.disabled=true;btn.textContent='OPENING CHECKOUT…';
  try{const r=await fetch(`${API}/checkout`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:cart})}),d=await r.json();if(!r.ok||!d.url)throw new Error(d.error||'Checkout failed');location.assign(d.url)}
  catch(e){btn.disabled=false;btn.textContent='TRY CHECKOUT AGAIN →';if(note)note.textContent=e.message||'Checkout could not open.'}
}
function readCatalogCache(){
  try{
    const raw=JSON.parse(sessionStorage.getItem(CATALOG_CACHE_KEY)||'null');
    if(raw?.data&&Array.isArray(raw.data.products))return{ts:Number(raw.ts||0),data:raw.data};
    if(raw&&Array.isArray(raw.products))return{ts:0,data:raw};
  }catch{}
  return null;
}
async function liveCatalog(){
  const cached=readCatalogCache();
  if(cached&&Date.now()-cached.ts<CATALOG_TTL)return cached.data;
  try{
    const bucket=Math.floor(Date.now()/60000);
    const r=await fetch(`${API}/printful/catalog?v=${bucket}`,{cache:'no-store',mode:'cors'});
    if(r.ok){
      const d=await r.json();
      if(d&&Array.isArray(d.products)){try{sessionStorage.setItem(CATALOG_CACHE_KEY,JSON.stringify({ts:Date.now(),data:d}))}catch{}return d;}
    }
  }catch{}
  return cached?.data||null;
}
function normalizedName(v=''){return String(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
async function boot(){
  const q=new URLSearchParams(location.search),id=q.get('id')||'',pfParam=Number(q.get('pf')||0);
  if(!id&&!pfParam){location.replace('index.html#catalog');return}
  let cfg={products:[]};
  try{const r=await fetch('content/products.json',{cache:'force-cache'});if(r.ok)cfg=await r.json()}catch{}
  let base=(cfg.products||[]).find(p=>p.id===id)||null;
  if(base&&!base.printful_product_id){if(base.href)location.replace(base.href);else location.replace('index.html#catalog');return}
  const dynamic=/^printful-(\d+)$/.exec(id);
  const catalog=await liveCatalog();
  if(!catalog)throw new Error('Catalog unavailable');
  let targetId=pfParam>0?pfParam:Number(base?.printful_product_id||dynamic?.[1]||0);
  let raw=(catalog.products||[]).find(p=>Number(p.id)===targetId)||null;
  if(!raw&&base?.name){const wanted=normalizedName(base.name);raw=(catalog.products||[]).find(p=>normalizedName(p.name)===wanted)||null}
  if(!raw)throw new Error('Product unavailable');
  targetId=Number(raw.id);
  const baseIsCurrent=base&&Number(base.printful_product_id||0)===targetId;
  if(!base||!baseIsCurrent)base={id:`printful-${targetId}`,name:raw.name||'STARGIRLS PIECE',category:inferCategory(raw.name),status:'AVAILABLE',available:true,fulfillment:'printful',printful_product_id:targetId,price_mode:'printful'};
  product=parseProduct(base,raw);
  if(!product.variants.length)throw new Error('No active variants');
  render();renderCart();
}
qs('[data-cart-open]')&&(qs('[data-cart-open]').onclick=openCart);
qs('[data-cart-close]')&&(qs('[data-cart-close]').onclick=closeCart);
qs('[data-cart-backdrop]')&&(qs('[data-cart-backdrop]').onclick=closeCart);
qs('[data-checkout]')&&(qs('[data-checkout]').onclick=checkout);
renderCart();
boot().catch(e=>{console.error('STARGIRLS product page:',e);qs('[data-product-gallery]').innerHTML='<div class="product-loading">PRODUCT TEMPORARILY UNAVAILABLE</div>';qs('[data-product-info]').innerHTML='<div class="product-info-inner"><span class="product-badge">STARGIRLS</span><h1 class="product-title">TRY AGAIN SOON</h1><p class="product-note">We couldn’t load this product right now. Return to Shop and open it again.</p></div>'});
