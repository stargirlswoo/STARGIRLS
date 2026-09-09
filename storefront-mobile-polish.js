/* STARGIRLS mobile storefront polish */
(function(){
  const prettyColor = value => String(value||'').replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).replace(/Sport Grey/i,'Heather Grey');
  const copyFor = product => {
    const n=String(product?.name||'').toUpperCase();
    if(n.includes('PULLOVER')) return 'A heavyweight-feel STARGIRLS layer made for repeat wear. Printed to order in your selected color and size.';
    if(n.includes('TEE')) return 'An everyday STARGIRLS tee with the artwork built into the piece—not souvenir merch. Printed to order in your selected color and size.';
    if(n.includes('JUNO')) return 'JUNO is the first fragrance by STARGIRLS: sensual, memorable and a little dangerous. Eau de parfum · 50 mL · coming soon.';
    return 'A STARGIRLS piece made for the current era.';
  };
  function polish(){
    document.querySelectorAll('[data-product-card]').forEach(card=>{
      const id=card.dataset.productCard;
      const p=typeof productById==='function'?productById(id):null;
      card.querySelectorAll('.color-option').forEach(btn=>{const label=btn.querySelector('span:last-child');if(label)label.textContent=prettyColor(btn.dataset.color);});
      const details=card.querySelector('.product-details details:first-child p');if(details&&p)details.textContent=copyFor(p);
      const ship=card.querySelector('.product-details details:nth-child(2) p');if(ship)ship.textContent='Made to order. Shipping price and delivery estimate appear at secure checkout. Returns follow the STARGIRLS return policy.';
      const main=card.querySelector('[data-main-image]');if(main){main.setAttribute('tabindex','0');main.setAttribute('aria-label','Open product image');}
    });
  }
  const originalRender=window.renderProducts;
  if(typeof originalRender==='function') window.renderProducts=function(){const r=originalRender.apply(this,arguments);requestAnimationFrame(polish);return r;};
  try{renderProducts=window.renderProducts;}catch(e){}
  document.addEventListener('click',e=>{
    const image=e.target.closest('[data-main-image]');
    if(image&&typeof openImageModal==='function'){
      const id=image.dataset.mainImage,p=typeof productById==='function'?productById(id):null,s=typeof selectionFor==='function'?selectionFor(id):null,v=typeof variantFor==='function'?variantFor(p,s?.size,s?.color):null;
      openImageModal(s?.image||v?.image||p?.image||'');
    }
  },{passive:true});
  document.addEventListener('keydown',e=>{const image=e.target.closest?.('[data-main-image]');if(image&&(e.key==='Enter'||e.key===' ')){e.preventDefault();image.click();}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',polish);else polish();
})();
