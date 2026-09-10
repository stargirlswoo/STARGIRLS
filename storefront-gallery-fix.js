/* STARGIRLS storefront gallery: force a visible product image from the live Printful catalog. */
(function(){
  const safeUrl=value=>/^https:\/\//i.test(String(value||''))?String(value):'';
  const meta=file=>`${String(file?.type||'')} ${String(file?.preview_url||'')} ${String(file?.thumbnail_url||'')}`.toLowerCase();
  const isArtwork=file=>/printfile|print[_ -]?file|artwork|design|template|pattern|logo|digitization|inside|label/.test(meta(file));
  const addUnique=(out,u)=>{u=safeUrl(u);if(u&&!out.includes(u))out.push(u);};
  const imagesFromVariant=v=>{
    const out=[];
    addUnique(out,v?.catalog_image||v?.product?.image);
    for(const f of v?.files||[]){if(!isArtwork(f)&&/mockup|preview/.test(meta(f))){addUnique(out,f.preview_url);addUnique(out,f.thumbnail_url);}}
    for(const f of v?.files||[]){if(!isArtwork(f)){addUnique(out,f.preview_url);addUnique(out,f.thumbnail_url);}}
    return out;
  };

  window.parsePrintfulVariant=function(v){
    const parts=String(v?.name||'').split(' / ').map(x=>x.trim()).filter(Boolean);
    const price=Number(v?.retail_price);
    const color=String(v?.color||'').trim()||(parts.length>=3?parts.at(-2):(parts.length===2?parts[0]:''))||'Default';
    const size=String(v?.size||'').trim()||(parts.length>=2?parts.at(-1):'')||'One Size';
    const images=imagesFromVariant(v);
    return {...v,color,size,price:Number.isFinite(price)?price:null,printful_sync_variant_id:Number(v?.sync_variant_id||0),images,image:images[0]||''};
  };
  try{parsePrintfulVariant=window.parsePrintfulVariant;}catch(e){}

  window.sourceImage=function(source){
    const direct=safeUrl(source?.thumbnail_url||source?.image_url||'');
    if(direct)return direct;
    for(const v of source?.variants||[]){const imgs=imagesFromVariant(v);if(imgs[0])return imgs[0];}
    return'';
  };
  try{sourceImage=window.sourceImage;}catch(e){}

  window.galleryFor=function(product){
    const out=[];
    addUnique(out,product?.image);
    for(const v of product?.variants||[]){
      const imgs=Array.isArray(v?.images)&&v.images.length?v.images:imagesFromVariant(v);
      for(const img of imgs)addUnique(out,img);
    }
    if(!product?.printful_product_id)for(const img of product?.gallery||[])addUnique(out,img);
    return out.slice(0,12);
  };
  try{galleryFor=window.galleryFor;}catch(e){}

  function forceImage(target,url,alt='STARGIRLS product'){
    if(!target||!url)return;
    const clean=url.replace(/["\\]/g,'');
    target.style.backgroundImage=`url("${clean}")`;
    target.style.backgroundSize='cover';
    target.style.backgroundPosition='center';
    target.style.position='relative';
    let img=target.querySelector(':scope > img.sg-product-image');
    if(!img){
      img=document.createElement('img');
      img.className='sg-product-image';
      img.alt=alt;
      img.loading='lazy';
      img.referrerPolicy='no-referrer';
      img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;z-index:0;';
      target.prepend(img);
    }
    if(img.src!==clean)img.src=clean;
  }

  async function repairCards(){
    const api=window.STARGIRLS_STORE_API||'';
    if(!api)return;
    let catalog=null;
    try{
      const r=await fetch(`${api}/printful/catalog?v=${Date.now()}`,{cache:'no-store',mode:'cors'});
      if(r.ok)catalog=await r.json();
    }catch{}
    if(!catalog){try{catalog=JSON.parse(sessionStorage.getItem('stargirls-printful-catalog-v2')||'null');}catch{}}
    if(!catalog)return;
    const sourceById=new Map((catalog.products||[]).map(p=>[Number(p.id),p]));
    document.querySelectorAll('[data-product-card]').forEach(card=>{
      const id=String(card.dataset.productCard||'');
      const dynamic=/^printful-(\d+)$/.exec(id);
      let pfid=dynamic?Number(dynamic[1]):0;
      if(!pfid){
        try{const p=typeof products!=='undefined'?products.find(x=>x.id===id):null;pfid=Number(p?.printful_product_id||0);}catch{}
      }
      const source=sourceById.get(pfid);
      if(!source)return;
      const image=window.sourceImage(source);
      const target=card.querySelector('[data-main-image]');
      forceImage(target,image,source.name||'STARGIRLS product');
    });
  }

  const grid=document.querySelector('[data-product-grid]');
  if(grid)new MutationObserver(()=>repairCards()).observe(grid,{childList:true,subtree:true});
  repairCards();
})();
