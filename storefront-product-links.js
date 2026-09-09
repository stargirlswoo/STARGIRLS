/* STARGIRLS storefront: clean collection cards that open dedicated product pages. */
(function(){
  function destination(id){return id==='juno-edp'?'fragrance.html':`product.html?id=${encodeURIComponent(id)}`;}
  function simplify(card){
    const body=card.querySelector('.catalog-body');
    if(body){
      body.querySelectorAll('.variant-group,.catalog-selection,.catalog-buy,.catalog-status,.product-details').forEach(el=>el.remove());
    }
    card.querySelector('.catalog-thumbs')?.remove();
    card.querySelector('.catalog-image-tools')?.remove();
  }
  function apply(){
    document.querySelectorAll('[data-product-card]').forEach(card=>{
      simplify(card);
      const id=card.dataset.productCard;
      if(!id||card.dataset.productLinked==='1')return;
      card.dataset.productLinked='1';
      card.setAttribute('role','link');
      card.setAttribute('tabindex','0');
      card.style.cursor='pointer';
      const go=()=>location.href=destination(id);
      card.addEventListener('click',e=>{
        if(e.target.closest('button,a,input,select,summary,details'))return;
        go();
      });
      card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
      const image=card.querySelector('[data-main-image]');
      if(image){
        image.style.cursor='pointer';
        image.setAttribute('aria-label',`Open ${id.replaceAll('-',' ')} product page`);
        image.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();go();},{capture:true});
      }
      const title=card.querySelector('.catalog-meta strong');
      if(title)title.classList.add('product-card-title-link');
    });
  }
  const grid=document.querySelector('[data-product-grid]');
  if(grid)new MutationObserver(apply).observe(grid,{childList:true,subtree:true});
  apply();
})();
