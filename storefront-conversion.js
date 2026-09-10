/* STARGIRLS storefront conversion enhancements. */
(()=>{
'use strict';
function injectTrust(){
  if(document.querySelector('.store-conversion-trust'))return;
  const tabs=document.querySelector('.shop-tabs');
  if(!tabs)return;
  tabs.insertAdjacentHTML('afterend','<section class="store-conversion-trust" aria-label="Store reassurance"><div><b>★</b>OFFICIAL STARGIRLS <span>Direct from the store</span></div><div><b>✓</b>SECURE CHECKOUT <span>Stripe protected payment</span></div><div><b>↗</b>SHIPPING SHOWN FIRST <span>See shipping before payment</span></div></section>');
}
function enhanceCards(){
  document.querySelectorAll('[data-product-card]').forEach(card=>{
    const body=card.querySelector('.catalog-body');
    if(!body||body.querySelector('.card-shop-cta'))return;
    body.insertAdjacentHTML('beforeend','<div class="card-shop-cta">VIEW ITEM →</div>');
    card.setAttribute('aria-label',`${card.querySelector('.catalog-meta strong')?.textContent?.trim()||'STARGIRLS item'} — view product`);
  });
}
function injectFooterNote(){
  if(document.querySelector('.store-conversion-footer-note'))return;
  const footer=document.querySelector('footer');
  if(!footer)return;
  footer.insertAdjacentHTML('beforebegin','<section class="store-conversion-footer-note"><strong>OFFICIAL STARGIRLS STORE</strong>Secure checkout · Shipping shown before payment · Made-to-order items use current product options</section>');
}
let queued=false;
function apply(){queued=false;injectTrust();enhanceCards();injectFooterNote();}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(apply);}
const grid=document.querySelector('[data-product-grid]');
if(grid)new MutationObserver(schedule).observe(grid,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
