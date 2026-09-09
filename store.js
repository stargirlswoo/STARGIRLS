const STORE_API_BASE = window.STARGIRLS_STORE_API || "";
const productGrid = document.querySelector("[data-product-grid]");
const filterLinks = document.querySelectorAll("[data-shop-filter]");
const cartButtons = document.querySelectorAll("[data-cart-open]");
const cartDrawer = document.querySelector("[data-cart-drawer]");
const cartClose = document.querySelector("[data-cart-close]");
const cartBackdrop = document.querySelector("[data-cart-backdrop]");
const cartItems = document.querySelector("[data-cart-items]");
const cartCount = document.querySelectorAll("[data-cart-count]");
const cartSubtotal = document.querySelector("[data-cart-subtotal]");
const checkoutButton = document.querySelector("[data-checkout]");
const checkoutNote = document.querySelector("[data-checkout-note]");
let products = [], cart = loadCart(), activeFilter = "all";

const money = value => typeof value === "number" ? new Intl.NumberFormat("en-US", {style:"currency",currency:"USD"}).format(value) : "";
function esc(value=""){return String(value).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function safeImage(value=""){return /^(?:images\/|https:\/\/)/.test(String(value)) ? String(value).replace(/["'()\\]/g,"") : "";}
function loadCart(){try{const value=JSON.parse(localStorage.getItem("stargirls-cart"));return Array.isArray(value)?value.filter(x=>x&&typeof x.id==="string"&&Number.isFinite(x.quantity)&&x.quantity>0).map(x=>({id:x.id,size:typeof x.size==="string"?x.size:"",color:typeof x.color==="string"?x.color:"",sku:typeof x.sku==="string"?x.sku:"",printful_sync_variant_id:Number(x.printful_sync_variant_id||0),quantity:Math.min(10,Math.floor(x.quantity))})):[];}catch{return [];}}
function saveCart(){localStorage.setItem("stargirls-cart",JSON.stringify(cart));renderCart();}
const productById=id=>products.find(product=>product.id===id);
const variantFor=(product,size,color)=>Array.isArray(product?.variants)?product.variants.find(v=>v.size===size&&v.color===color):null;
function variantPrice(product,variant){const value=Number(variant?.price ?? product?.price);return Number.isFinite(value)?value:null;}

function addToCart(id,size="",color=""){const product=productById(id);if(!product||!product.available)return;const variant=variantFor(product,size,color);if(Array.isArray(product.variants)&&!variant)return;const existing=cart.find(item=>item.id===id&&item.size===size&&item.color===color);if(existing)existing.quantity=Math.min(10,existing.quantity+1);else cart.push({id,size,color,sku:variant?.sku||"",printful_sync_variant_id:Number(variant?.printful_sync_variant_id||0),quantity:1});saveCart();openCart();}
function changeQuantity(id,size,color,amount){const item=cart.find(entry=>entry.id===id&&entry.size===size&&entry.color===color);if(!item)return;item.quantity=Math.min(10,item.quantity+amount);if(item.quantity<=0)cart=cart.filter(entry=>!(entry.id===id&&entry.size===size&&entry.color===color));saveCart();}

function renderProducts(){
  if(!productGrid)return;
  const visible=activeFilter==="all"?products:products.filter(product=>product.category===activeFilter);
  if(!visible.length){productGrid.innerHTML='<div class="catalog-empty"><strong>NOTHING HERE YET.</strong><p>Try another category.</p></div>';return;}
  productGrid.innerHTML=visible.map(product=>{
    const id=esc(product.id),name=esc(product.name),category=esc(product.category||"drop"),status=esc(product.status||"COMING SOON"),image=safeImage(product.image);
    const variants=Array.isArray(product.variants)?product.variants:[];
    const colors=[...new Set(variants.map(v=>v.color).filter(Boolean))];
    const prices=variants.map(v=>Number(v.price)).filter(Number.isFinite);
    const low=prices.length?Math.min(...prices):Number(product.price);
    const high=prices.length?Math.max(...prices):Number(product.price);
    const priceText=Number.isFinite(low)?(Number.isFinite(high)&&high!==low?`FROM ${money(low)}`:money(low)):status;
    const selectors=variants.length?`<label class="catalog-size-label" for="color-${id}">COLOR</label><select class="catalog-size" id="color-${id}" data-color-for="${id}" ${product.available?'':'disabled'}><option value="">SELECT COLOR</option>${colors.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("")}</select><label class="catalog-size-label" for="size-${id}">SIZE</label><select class="catalog-size" id="size-${id}" data-size-for="${id}" disabled><option value="">SELECT SIZE</option></select>`:"";
    const action=product.available&&variants.length?`<button class="catalog-buy" type="button" data-add-to-cart="${id}">ADD TO CART</button>`:`<span class="catalog-status">${status}</span>`;
    return `<article class="catalog-card" data-category="${category}"><div class="catalog-card-image" style="background-image:url(&quot;${image}&quot;)" role="img" aria-label="${name}"></div><div class="catalog-meta"><div><strong>${name}</strong><span>${category.toUpperCase()}</span></div><div class="catalog-price" data-price-for="${id}">${priceText}</div></div>${selectors}${action}</article>`;
  }).join("");

  document.querySelectorAll("[data-color-for]").forEach(select=>select.addEventListener("change",()=>{
    const id=select.dataset.colorFor, product=productById(id), sizeSelect=document.querySelector(`[data-size-for="${CSS.escape(id)}"]`), priceEl=document.querySelector(`[data-price-for="${CSS.escape(id)}"]`);
    const variants=(product?.variants||[]).filter(v=>v.color===select.value);
    sizeSelect.innerHTML='<option value="">SELECT SIZE</option>'+variants.map(v=>`<option value="${esc(v.size)}">${esc(v.size)}</option>`).join("");
    sizeSelect.disabled=!select.value;
    sizeSelect.value="";
    if(priceEl&&variants.length){const vals=variants.map(v=>Number(v.price)).filter(Number.isFinite);if(vals.length){const lo=Math.min(...vals),hi=Math.max(...vals);priceEl.textContent=lo===hi?money(lo):`FROM ${money(lo)}`;}}
  }));

  document.querySelectorAll("[data-size-for]").forEach(select=>select.addEventListener("change",()=>{
    const id=select.dataset.sizeFor, product=productById(id), color=document.querySelector(`[data-color-for="${CSS.escape(id)}"]`)?.value||"", variant=variantFor(product,select.value,color), priceEl=document.querySelector(`[data-price-for="${CSS.escape(id)}"]`), price=variantPrice(product,variant);if(priceEl&&price!==null)priceEl.textContent=money(price);
  }));

  document.querySelectorAll("[data-add-to-cart]").forEach(button=>button.addEventListener("click",()=>{
    const id=button.dataset.addToCart, color=document.querySelector(`[data-color-for="${CSS.escape(id)}"]`), size=document.querySelector(`[data-size-for="${CSS.escape(id)}"]`);
    if(!color?.value){color?.focus();return;} if(!size?.value){size?.focus();return;} addToCart(id,size.value,color.value);
  }));
}

function renderCart(){
  const hydrated=cart.map(item=>{const product=productById(item.id);const variant=variantFor(product,item.size,item.color);return {...item,product,variant};}).filter(item=>item.product&&item.product.available&&item.variant);
  const validKeys=new Set(hydrated.map(item=>`${item.id}::${item.color}::${item.size}`));
  if(cart.some(item=>!validKeys.has(`${item.id}::${item.color}::${item.size}`))){cart=cart.filter(item=>validKeys.has(`${item.id}::${item.color}::${item.size}`));localStorage.setItem("stargirls-cart",JSON.stringify(cart));}
  const count=hydrated.reduce((sum,item)=>sum+item.quantity,0);cartCount.forEach(element=>element.textContent=String(count));
  if(!cartItems||!cartSubtotal||!checkoutButton)return;
  if(!hydrated.length){cartItems.innerHTML='<div class="cart-empty"><strong>YOUR CART IS EMPTY.</strong><p>The real stuff will show up here as soon as the first products go live.</p></div>';cartSubtotal.textContent=money(0);checkoutButton.disabled=true;if(checkoutNote)checkoutNote.textContent="Checkout activates when purchasable products and the payment backend are connected.";return;}
  cartItems.innerHTML=hydrated.map(item=>{const price=variantPrice(item.product,item.variant)||0;return `<div class="cart-line"><div class="cart-thumb" style="background-image:url(&quot;${safeImage(item.product.image)}&quot;)"></div><div class="cart-line-copy"><strong>${esc(item.product.name)}</strong><span>${esc(item.color)} · SIZE ${esc(item.size)}</span><span>${money(price)}</span><div class="qty-controls"><button type="button" data-qty="-1" data-id="${esc(item.id)}" data-color="${esc(item.color)}" data-size="${esc(item.size)}">−</button><span>${item.quantity}</span><button type="button" data-qty="1" data-id="${esc(item.id)}" data-color="${esc(item.color)}" data-size="${esc(item.size)}">+</button></div></div></div>`;}).join("");
  document.querySelectorAll("[data-qty]").forEach(button=>button.addEventListener("click",()=>changeQuantity(button.dataset.id,button.dataset.size||"",button.dataset.color||"",Number(button.dataset.qty))));
  cartSubtotal.textContent=money(hydrated.reduce((sum,item)=>sum+(variantPrice(item.product,item.variant)||0)*item.quantity,0));
  checkoutButton.disabled=!STORE_API_BASE;if(checkoutNote)checkoutNote.textContent=STORE_API_BASE?"Taxes and shipping are calculated at checkout.":"Cart is ready. Payment checkout will activate when the store backend is connected.";
}

function openCart(){if(!cartDrawer||!cartBackdrop)return;cartDrawer.classList.add("active");cartBackdrop.classList.add("active");cartDrawer.setAttribute("aria-hidden","false");document.body.classList.add("menu-open");cartClose?.focus();}
function closeCart(){if(!cartDrawer||!cartBackdrop)return;cartDrawer.classList.remove("active");cartBackdrop.classList.remove("active");cartDrawer.setAttribute("aria-hidden","true");document.body.classList.remove("menu-open");}
async function checkout(){if(!STORE_API_BASE||!cart.length)return;checkoutButton.disabled=true;checkoutButton.textContent="OPENING CHECKOUT…";try{const response=await fetch(`${STORE_API_BASE}/checkout`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:cart})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Checkout request failed");if(!data.url||!/^https:\/\//.test(data.url))throw new Error("Checkout URL missing");window.location.assign(data.url);}catch(error){console.error("STARGIRLS checkout:",error);checkoutButton.disabled=false;checkoutButton.textContent="CHECKOUT";if(checkoutNote)checkoutNote.textContent=error.message||"Checkout could not open. Please try again.";}}

function parsePrintfulVariant(v){const parts=String(v.name||"").split(" / ");const price=Number(v.retail_price);return {...v,color:parts.length>=3?parts.at(-2):"",size:parts.at(-1)||"",price:Number.isFinite(price)?price:null,printful_sync_variant_id:Number(v.sync_variant_id||0)};}
async function initStore(){
  try{
    const [catalogResponse,printfulResponse]=await Promise.all([fetch("content/products.json",{cache:"no-store"}),STORE_API_BASE?fetch(`${STORE_API_BASE}/printful/catalog`,{cache:"no-store"}):Promise.resolve(null)]);
    if(!catalogResponse.ok)throw new Error("Could not load products");
    const data=await catalogResponse.json();products=Array.isArray(data.products)?data.products:[];
    if(printfulResponse?.ok){const pf=await printfulResponse.json();products=products.map(product=>{if(!product.printful_product_id)return product;const source=(pf.products||[]).find(p=>Number(p.id)===Number(product.printful_product_id));if(!source)return {...product,available:false,status:"UNAVAILABLE"};const variants=(source.variants||[]).filter(v=>v.synced!==false&&v.availability_status!=="inactive").map(parsePrintfulVariant).filter(v=>v.color&&v.size&&v.sku&&v.printful_sync_variant_id>0);return {...product,variants};});}
  }catch(error){console.error("STARGIRLS products:",error);products=[];}
  renderProducts();renderCart();
}

filterLinks.forEach(link=>link.addEventListener("click",event=>{event.preventDefault();activeFilter=link.dataset.shopFilter||"all";filterLinks.forEach(item=>item.classList.toggle("active",item.dataset.shopFilter===activeFilter));renderProducts();document.querySelector("#catalog")?.scrollIntoView({behavior:"smooth",block:"start"});}));
cartButtons.forEach(button=>button.addEventListener("click",openCart));cartClose?.addEventListener("click",closeCart);cartBackdrop?.addEventListener("click",closeCart);checkoutButton?.addEventListener("click",checkout);document.addEventListener("keydown",event=>{if(event.key==="Escape")closeCart();});initStore();
