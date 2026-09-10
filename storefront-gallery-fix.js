/* STARGIRLS storefront gallery: render current product images without extra network requests. */
(function(){
  const safeUrl=value=>/^https:\/\//i.test(String(value||''))?String(value):'';
  const add=(out,u)=>{u=safeUrl(u);if(u&&!out.includes(u))out.push(u);};

  window.galleryFor=function(product){
    const out=[];
    add(out,product?.image);
    for(const v of product?.variants||[]){
      if(Array.isArray(v?.images))for(const u of v.images)add(out,u);
      add(out,v?.image);
    }
    if(!product?.printful_product_id)for(const u of product?.gallery||[])add(out,u);
    return out.slice(0,10);
  };
  try{galleryFor=window.galleryFor;}catch{}

  function productFor(id){
    try{return typeof products!=='undefined'?products.find(p=>String(p.id)===String(id)):null;}catch{return null;}
  }

  function applyImage(card){
    const product=productFor(card.dataset.productCard);
    if(!product)return;
    const image=safeUrl(product.image)||window.galleryFor(product)[0]||'';
    const target=card.querySelector('[data-main-image]');
    if(!target||!image)return;

    const clean=image.replace(/["\\]/g,'');
    target.style.backgroundImage=`url("${clean}")`;
    target.style.backgroundSize='cover';
    target.style.backgroundPosition='center';
    target.style.position='relative';

    let img=target.querySelector(':scope > img.sg-product-image');
    if(!img){
      img=document.createElement('img');
      img.className='sg-product-image';
      img.alt=product.name||'STARGIRLS product';
      img.loading='lazy';
      img.decoding='async';
      img.referrerPolicy='no-referrer';
      img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;z-index:0;';
      target.prepend(img);
    }
    if(img.dataset.src!==clean){img.dataset.src=clean;img.src=clean;}
  }

  let scheduled=false;
  function apply(){
    scheduled=false;
    document.querySelectorAll('[data-product-card]').forEach(applyImage);
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(apply);
  }

  const grid=document.querySelector('[data-product-grid]');
  if(grid)new MutationObserver(schedule).observe(grid,{childList:true,subtree:true});
  schedule();
})();
