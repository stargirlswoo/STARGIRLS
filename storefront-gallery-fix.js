/* STARGIRLS storefront product media: CMS photos win; Printful remains fulfillment only. */
(function(){
  'use strict';
  let media={products:[]};
  let scheduled=false;

  const norm=s=>String(s||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const cleanPath=v=>{
    const raw=typeof v==='string'?v:(v&&typeof v==='object'?v.image||v.src||'':'');
    const s=String(raw||'').trim();
    return /^(?:https:\/\/|\/images\/|images\/)/i.test(s)?s:'';
  };
  const imageList=value=>Array.isArray(value)?value.map(cleanPath).filter(Boolean):[];
  const uniq=a=>[...new Set(a.filter(Boolean))];

  function numericId(value){
    const n=Number(value||0);
    if(n>0)return n;
    const m=/^printful-(\d+)$/i.exec(String(value||''));
    return m?Number(m[1]):0;
  }
  function productFor(id){
    try{return typeof products!=='undefined'?products.find(p=>String(p.id)===String(id)):null;}catch{return null;}
  }
  function entryForProduct(product,id=''){
    const wantedPf=Number(product?.printful_product_id||0)||numericId(id||product?.id);
    const wantedName=norm(product?.name||'');
    return (media.products||[]).find(entry=>{
      const entryPf=Number(entry?.printful_product_id||entry?.product_id||0)||numericId(entry?.id);
      if(wantedPf&&entryPf&&wantedPf===entryPf)return true;
      const entryName=norm(entry?.match_name||entry?.name||'');
      return !!wantedName&&!!entryName&&wantedName===entryName;
    })||null;
  }
  function colorEntry(entry,color=''){
    const wanted=norm(color);
    return (Array.isArray(entry?.colors)?entry.colors:[]).find(c=>norm(c?.name||c?.color)===wanted)||null;
  }
  function imagesFor(entry,color=''){
    if(!entry)return[];
    const exact=imageList(colorEntry(entry,color)?.images);
    if(exact.length)return uniq(exact).slice(0,8);
    const gallery=imageList(entry?.gallery);
    if(gallery.length)return uniq(gallery).slice(0,8);
    for(const c of Array.isArray(entry?.colors)?entry.colors:[]){
      const imgs=imageList(c?.images);
      if(imgs.length)return uniq(imgs).slice(0,8);
    }
    const card=cleanPath(entry?.card_image);
    return card?[card]:[];
  }
  function primaryFor(entry,color=''){
    return cleanPath(entry?.card_image)||imagesFor(entry,color)[0]||'';
  }

  window.galleryFor=function(product){
    const entry=entryForProduct(product,product?.id);
    const manual=imagesFor(entry);
    if(manual.length)return manual.slice(0,4);
    const out=[];
    const add=u=>{u=cleanPath(u);if(u&&!out.includes(u))out.push(u);};
    add(product?.image);
    for(const v of product?.variants||[]){
      if(Array.isArray(v?.images))for(const u of v.images)add(u);
      add(v?.image);
      if(out.length>=4)break;
    }
    return out.slice(0,4);
  };
  try{galleryFor=window.galleryFor;}catch{}

  function setCardImage(card){
    const product=productFor(card.dataset.productCard);
    if(!product)return;
    const entry=entryForProduct(product,card.dataset.productCard);
    const manual=primaryFor(entry);
    const fallback=cleanPath(product?.image)||window.galleryFor(product)[0]||'';
    const image=manual||fallback;
    const target=card.querySelector('[data-main-image]');
    if(!target||!image)return;

    target.style.backgroundImage='none';
    target.style.backgroundColor='#f3f0ea';
    target.style.position='relative';
    let img=target.querySelector(':scope > img.sg-product-image');
    if(!img){
      img=document.createElement('img');
      img.className='sg-product-image';
      img.alt=product.name||'STARGIRLS product';
      img.loading='lazy';
      img.decoding='async';
      img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center;display:block;pointer-events:none;z-index:0;padding:3%;';
      target.prepend(img);
    }
    if(img.getAttribute('src')!==image)img.src=image;
    img.dataset.sgManual=manual?'1':'0';
  }

  function setCartImages(){
    const root=document.querySelector('[data-cart-items]');
    if(!root)return;
    let items=[];
    try{const raw=JSON.parse(localStorage.getItem('stargirls-cart')||'[]');items=Array.isArray(raw)?raw:[];}catch{}
    [...root.querySelectorAll('.cart-line')].forEach((line,index)=>{
      const item=items[index];
      if(!item)return;
      const product=productFor(item.id);
      const entry=entryForProduct(product,item.id);
      const image=primaryFor(entry,item.color||'');
      const thumb=line.querySelector('.cart-thumb');
      if(thumb&&image){thumb.style.backgroundImage=`url("${image.replace(/["\\]/g,'')}")`;thumb.dataset.sgManual='1';}
    });
  }

  function apply(){
    scheduled=false;
    document.querySelectorAll('[data-product-card]').forEach(setCardImage);
    setCartImages();
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(apply);}

  const grid=document.querySelector('[data-product-grid]');
  if(grid)new MutationObserver(schedule).observe(grid,{childList:true,subtree:true});
  const cartRoot=document.querySelector('[data-cart-items]');
  if(cartRoot)new MutationObserver(schedule).observe(cartRoot,{childList:true,subtree:true});

  fetch(`content/product-media.json?media=${Math.floor(Date.now()/60000)}`,{cache:'no-store'})
    .then(r=>r.ok?r.json():Promise.reject(new Error(`Product media ${r.status}`)))
    .then(data=>{media=data&&Array.isArray(data.products)?data:{products:[]};window.STARGIRLS_PRODUCT_MEDIA=media;schedule();})
    .catch(error=>{console.warn('STARGIRLS manual product media:',error);schedule();});

  schedule();
})();
