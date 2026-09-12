const STORE_API_BASE=window.STARGIRLS_STORE_API||'';
const productGrid=document.querySelector('[data-product-grid]');
const filterLinks=document.querySelectorAll('[data-shop-filter]');
const cartButtons=document.querySelectorAll('[data-cart-open]');
const cartDrawer=document.querySelector('[data-cart-drawer]');
const cartClose=document.querySelector('[data-cart-close]');
const cartBackdrop=document.querySelector('[data-cart-backdrop]');
const cartItems=document.querySelector('[data-cart-items]');
const cartCount=document.querySelectorAll('[data-cart-count]');
const cartSubtotal=document.querySelector('[data-cart-subtotal]');
const checkoutButton=document.querySelector('[data-checkout]');
const checkoutNote=document.querySelector('[data-checkout-note]');
let products=[],cart=loadCart(),activeFilter='all';
const money=v=>Number.isFinite(Number(v))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v)):'';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeImage=v=>/^(?:images\/|https:\/\/)/i.test(String(v||''))?String(v).replace(/["'()\\]/g,''):'';
const brandMeta=p=>window.STARGIRLS_BRAND?.productMeta?.(p?.name||'')||{title:String(p?.name||'STARGIRLS PIECE').toUpperCase(),side:'joint',label:'☀☾ JOINT CUSTODY'};
function loadCart(){try{const v=JSON.parse(localStorage.getItem('stargirls-cart')||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
function saveCart(){localStorage.setItem('stargirls-cart',JSON.stringify(cart));renderCart()}
const productById=id=>products.find(p=>String(p.id)===String(id));
function variantFor(p,item){return (p?.variants||[]).find(v=>Number(v.printful_sync_variant_id||v.sync_variant_id||0)===Number(item.printful_sync_variant_id||0)||(String(v.color||'')===String(item.color||'')&&String(v.size||'')===String(item.size||'')))||null}
function productPrice(p){const prices=(p?.variants||[]).map(v=>Number(v.price??v.retail_price)).filter(Number.isFinite);if(prices.length)return Math.min(...prices);const x=Number(p?.price);return Number.isFinite(x)?x:null}
function matchesFilter(p){
  if(activeFilter==='all')return true;
  if(activeFilter==='perfume')return String(p?.category||'').toLowerCase()==='perfume';
  const meta=brandMeta(p);
  if(activeFilter==='core')return meta.side==='joint'&&String(p?.category||'').toLowerCase()!=='perfume';
  if(activeFilter==='moon'||activeFilter==='sun')return meta.side===activeFilter;
  return String(p?.category||'').toLowerCase()===activeFilter;
}
function renderProducts(){
  if(!productGrid)return;
  const visible=products.filter(matchesFilter);
  if(!visible.length){
    const copy=activeFilter==='moon'?'Moon Side is still being built. New beauty, fitted pieces and jewelry will land here as they are ready.':activeFilter==='sun'?'Sun Side is still being built. New fashion, jewelry and beauty will land here as they are ready.':'Try another section.';
    productGrid.innerHTML=`<div class="catalog-empty"><strong>NOTHING ON THIS SIDE YET.</strong><p>${esc(copy)}</p></div>`;return;
  }
  productGrid.innerHTML=visible.map(p=>{
    const image=safeImage(p.image||'');
    const price=productPrice(p);
    const status=p.available===false?(p.status||'COMING SOON'):(price!==null?money(price):(p.status||'AVAILABLE'));
    const meta=brandMeta(p);
    const sub=String(p?.category||'').toLowerCase()==='perfume'?'JUNO':meta.label.replace(/^☀☾\s|^☾\s|^☀\s/,'');
    return `<article class="catalog-card" data-product-card="${esc(p.id)}" data-brand-side="${esc(meta.side)}"><div class="catalog-card-image-wrap"><div class="catalog-card-image" data-main-image="${esc(p.id)}" style="${image?`background-image:url(&quot;${image}&quot;)`:''}" role="img" aria-label="${esc(meta.title)}"></div></div><div class="catalog-body"><div class="catalog-meta"><div><strong>${esc(meta.title)}</strong><span>${esc(sub)}</span></div><div class="catalog-price">${esc(status)}</div></div></div></article>`;
  }).join('');
}
function renderCart(){
  const count=cart.reduce((n,i)=>n+Math.max(0,Number(i.quantity||0)),0);cartCount.forEach(el=>el.textContent=String(count));
  if(!cartItems||!cartSubtotal||!checkoutButton)return;
  if(!cart.length){cartItems.innerHTML='<div class="cart-empty"><strong>NOTHING IN YOUR BAG YET.</strong><p>Pick something and it will show up here.</p></div>';cartSubtotal.textContent=money(0);checkoutButton.disabled=true;if(checkoutNote)checkoutNote.textContent='Add an item to continue to secure checkout.';return;}
  let total=0;
  cartItems.innerHTML=cart.map((item,i)=>{
    const p=productById(item.id),v=variantFor(p,item),price=Number(v?.price??v?.retail_price??0),qty=Math.max(1,Number(item.quantity||1));if(Number.isFinite(price))total+=price*qty;const img=safeImage(v?.image||p?.image||'');const meta=brandMeta(p);
    return `<div class="cart-line"><div class="cart-thumb" style="${img?`background-image:url(&quot;${img}&quot;)`:''}"></div><div class="cart-line-copy"><strong>${esc(meta.title)}</strong><span>${esc(item.color||'')} ${item.size?`· SIZE ${esc(item.size)}`:''}</span>${price?`<span>${money(price)}</span>`:''}<div class="qty-controls"><button type="button" data-cart-dec="${i}">−</button><span>${qty}</span><button type="button" data-cart-inc="${i}">+</button></div><button class="cart-remove" type="button" data-cart-remove="${i}">REMOVE</button></div></div>`;
  }).join('');
  cartSubtotal.textContent=money(total);checkoutButton.disabled=!STORE_API_BASE;
  if(checkoutNote)checkoutNote.textContent='Taxes and shipping are calculated at checkout.';
  document.querySelectorAll('[data-cart-dec]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.cartDec);cart[i].quantity=Math.max(0,Number(cart[i].quantity||1)-1);if(cart[i].quantity<=0)cart.splice(i,1);saveCart();});
  document.querySelectorAll('[data-cart-inc]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.cartInc);cart[i].quantity=Math.min(10,Number(cart[i].quantity||1)+1);saveCart();});
  document.querySelectorAll('[data-cart-remove]').forEach(b=>b.onclick=()=>{cart.splice(Number(b.dataset.cartRemove),1);saveCart();});
}
function openCart(){cartDrawer?.classList.add('active');cartBackdrop?.classList.add('active');cartDrawer?.setAttribute('aria-hidden','false')}
function closeCart(){cartDrawer?.classList.remove('active');cartBackdrop?.classList.remove('active');cartDrawer?.setAttribute('aria-hidden','true')}
async function checkout(){
  if(!STORE_API_BASE||!cart.length)return;checkoutButton.disabled=true;checkoutButton.textContent='OPENING SECURE CHECKOUT…';
  try{const r=await fetch(`${STORE_API_BASE}/checkout`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:cart})});const d=await r.json();if(!r.ok||!d.url)throw new Error(d.error||'Checkout failed');location.assign(d.url)}catch(e){checkoutButton.disabled=false;checkoutButton.textContent='TRY CHECKOUT AGAIN →';if(checkoutNote)checkoutNote.textContent=e.message||'Checkout could not open.'}
}
async function initStore(){
  try{const r=await fetch('content/products.json',{cache:'force-cache'});if(!r.ok)throw new Error('Could not load products');const d=await r.json();products=Array.isArray(d.products)?d.products:[]}catch(e){console.error('STARGIRLS products:',e);products=[]}
  renderProducts();renderCart();
}
filterLinks.forEach(link=>link.addEventListener('click',e=>{e.preventDefault();activeFilter=link.dataset.shopFilter||'all';filterLinks.forEach(x=>x.classList.toggle('active',x===link));renderProducts();document.querySelector('#catalog')?.scrollIntoView({behavior:'smooth',block:'start'})}));
cartButtons.forEach(b=>b.addEventListener('click',openCart));cartClose?.addEventListener('click',closeCart);cartBackdrop?.addEventListener('click',closeCart);checkoutButton?.addEventListener('click',checkout);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCart()});
initStore();
