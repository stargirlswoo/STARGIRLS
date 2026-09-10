/* STARGIRLS storefront: cards open the exact current Printful product. */
(function(){
  function productFor(id){try{return typeof products!=='undefined'?products.find(p=>p.id===id):null;}catch{return null;}}
  function destination(id){
    if(id==='juno-edp')return'fragrance.html';
    const p=productFor(id);
    const dynamic=/^printful-(\d+)$/.exec(String(id||''));
    const pfid=Number(p?.printful_product_id||dynamic?.[1]||0);
    const q=new URLSearchParams({v:'20260910f',id:String(id)});
    if(pfid>0)q.set('pf',String(pfid));
    return`product.html?${q.toString()}`;
  }
  function simplify(card){
    const body=card.querySelector('.catalog-body');
    if(body)body.querySelectorAll('.variant-group,.catalog-selection,.catalog-buy,.catalog-status,.product-details').forEach(el=>el.remove());
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
      card.addEventListener('click',e=>{if(e.target.closest('button,a,input,select,summary,details'))return;go();});
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
