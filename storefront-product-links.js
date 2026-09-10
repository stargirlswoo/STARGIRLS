/* STARGIRLS storefront: cards open the exact current Printful product. */
(function(){
  const SNAPSHOT_KEY='stargirls-clicked-product-v1';
  function productFor(id){try{return typeof products!=='undefined'?products.find(p=>p.id===id):null;}catch{return null;}}
  function destination(id){
    if(id==='juno-edp')return'fragrance.html';
    const p=productFor(id);
    const dynamic=/^printful-(\d+)$/.exec(String(id||''));
    const pfid=Number(p?.printful_product_id||dynamic?.[1]||0);
    const q=new URLSearchParams({v:'20260910j',id:String(id)});
    if(pfid>0)q.set('pf',String(pfid));
    return`product.html?${q.toString()}`;
  }
  function saveSnapshot(id){
    const p=productFor(id);
    const dynamic=/^printful-(\d+)$/.exec(String(id||''));
    const pfid=Number(p?.printful_product_id||dynamic?.[1]||0);
    if(!pfid)return;
    let source=null;
    try{source=(window.__SG_PRINTFUL_CATALOG?.products||[]).find(x=>Number(x.id)===pfid)||null;}catch{}
    if(!source&&p){source={id:pfid,name:p.name||'STARGIRLS PIECE',thumbnail_url:p.image||null,image_url:p.image||null,variants:Array.isArray(p.variants)?p.variants:[]};}
    if(!source)return;
    try{sessionStorage.setItem(SNAPSHOT_KEY,JSON.stringify({ts:Date.now(),id:String(id),pfid,source}));}catch{}
  }
  function apply(){
    document.querySelectorAll('[data-product-card]').forEach(card=>{
      const id=card.dataset.productCard;
      if(!id||card.dataset.productLinked==='1')return;
      card.dataset.productLinked='1';
      card.setAttribute('role','link');
      card.setAttribute('tabindex','0');
      card.style.cursor='pointer';
      const go=()=>{saveSnapshot(id);location.href=destination(id);};
      card.addEventListener('click',e=>{if(e.target.closest('button,a,input,select,summary,details'))return;go();});
      card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
      const image=card.querySelector('[data-main-image]');
      if(image){image.style.cursor='pointer';image.setAttribute('aria-label',`Open ${id.replaceAll('-',' ')} product page`);}
    });
  }
  const grid=document.querySelector('[data-product-grid]');
  if(grid)new MutationObserver(apply).observe(grid,{childList:true});
  apply();
})();
