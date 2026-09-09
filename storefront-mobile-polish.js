/* STARGIRLS storefront customer-facing polish. Raw Printful color values stay untouched for fulfillment. */
(function(){
  const DISPLAY_NAMES={
    'sport grey':'Heather Grey','sport gray':'Heather Grey','dark heather':'Charcoal Heather','dark heather grey':'Charcoal Heather','dark heather gray':'Charcoal Heather',
    'light blue':'Sky Blue','light pink':'Soft Pink','forest green':'Forest','military green':'Military Green','irish green':'Kelly Green','royal':'Royal Blue','navy':'Navy','maroon':'Maroon','sand':'Sand','ash':'Ash','white':'White','black':'Black'
  };
  const SWATCHES={
    'black':'#0b0b0b','white':'#f7f6f1','navy':'#18233a','navy blue':'#18233a','royal':'#315ca8','royal blue':'#315ca8','blue':'#4c78a8','light blue':'#a8c9df','sky blue':'#a8c9df',
    'red':'#a51f2d','cardinal':'#8f2432','burgundy':'#641f2c','maroon':'#642431','pink':'#e8a8bd','light pink':'#efc3d1','soft pink':'#efc3d1','purple':'#6b4f86',
    'green':'#4e6a55','forest green':'#254331','forest':'#254331','military green':'#5e6245','olive':'#67684b','irish green':'#2e8b57','kelly green':'#2e8b57',
    'brown':'#694a3d','beige':'#d6c5aa','sand':'#cbbb9a','natural':'#ddd2b9','cream':'#eee5d2','ash':'#c5c5be','grey':'#8a8a8a','gray':'#8a8a8a',
    'sport grey':'#aaa9a5','sport gray':'#aaa9a5','heather grey':'#aaa9a5','heather gray':'#aaa9a5','dark heather':'#484848','dark heather grey':'#484848','dark heather gray':'#484848','charcoal':'#424242','charcoal heather':'#4b4b4b'
  };
  const key=v=>String(v||'').trim().toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
  const title=v=>String(v||'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim().replace(/\b\w/g,c=>c.toUpperCase());
  window.prettyStoreColor=v=>DISPLAY_NAMES[key(v)]||title(v);
  window.storeColorHex=v=>{
    const k=key(v); if(SWATCHES[k]) return SWATCHES[k];
    if(/^#[0-9a-f]{6}$/i.test(String(v))) return String(v);
    for(const [name,hex] of Object.entries(SWATCHES)) if(k.includes(name)) return hex;
    return '#777777';
  };
  const copyFor=product=>{
    const n=String(product?.name||'').toUpperCase();
    if(n.includes('PULLOVER')) return 'A STARGIRLS pullover printed to order in the color and size you choose.';
    if(n.includes('TEE')) return 'An everyday STARGIRLS tee printed to order in the color and size you choose.';
    if(n.includes('JUNO')) return 'JUNO is the first fragrance by STARGIRLS: sensual, memorable and a little dangerous. Coming soon.';
    return 'A piece from the STARGIRLS world.';
  };
  function polish(){
    document.querySelectorAll('[data-product-card]').forEach(card=>{
      const id=card.dataset.productCard,p=typeof productById==='function'?productById(id):null;
      card.querySelectorAll('.color-option').forEach(btn=>{const label=btn.querySelector('span:last-child'),swatch=btn.querySelector('.color-swatch');if(label)label.textContent=prettyStoreColor(btn.dataset.color);if(swatch)swatch.style.background=storeColorHex(btn.dataset.color);btn.title=prettyStoreColor(btn.dataset.color);});
      const selected=card.querySelector('.variant-head span:last-child');if(selected&&selected.textContent!=='SELECT ONE')selected.textContent=prettyStoreColor(selected.textContent);
      const summary=card.querySelector('.catalog-selection');if(summary){const s=typeof selectionFor==='function'?selectionFor(id):null;if(s&&(s.color||s.size))summary.textContent=`SELECTED: ${s.color?prettyStoreColor(s.color):'—'} / ${s.size||'—'}`;}
      const details=card.querySelector('.product-details details:first-child p');if(details&&p)details.textContent=copyFor(p);
      const ship=card.querySelector('.product-details details:nth-child(2) p');if(ship)ship.textContent='Made to order. Shipping price and delivery estimate appear at secure checkout. Returns follow the STARGIRLS return policy.';
      const main=card.querySelector('[data-main-image]');if(main){main.setAttribute('tabindex','0');main.setAttribute('aria-label','Open product image');}
    });
    document.querySelectorAll('.cart-line-copy > span:first-of-type').forEach(el=>{const m=el.textContent.match(/^(.*?) · SIZE (.*)$/);if(m)el.textContent=`${prettyStoreColor(m[1])} · SIZE ${m[2]}`;});
  }
  const originalRender=window.renderProducts;if(typeof originalRender==='function')window.renderProducts=function(){const r=originalRender.apply(this,arguments);requestAnimationFrame(polish);return r;};
  try{renderProducts=window.renderProducts;}catch(e){}
  const originalCart=window.renderCart;if(typeof originalCart==='function')window.renderCart=function(){const r=originalCart.apply(this,arguments);requestAnimationFrame(polish);return r;};
  try{renderCart=window.renderCart;}catch(e){}
  document.addEventListener('keydown',e=>{const image=e.target.closest?.('[data-main-image]');if(image&&(e.key==='Enter'||e.key===' ')){e.preventDefault();image.click();}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',polish);else polish();
})();
