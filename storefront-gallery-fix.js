/* STARGIRLS storefront gallery: prefer Printful mockup thumbnail, then safe catalog-product images. */
(function(){
  const unique=items=>[...new Set(items.filter(Boolean))];
  const safeUrl=value=>/^https:\/\//i.test(String(value||''))?String(value):'';
  const meta=file=>`${String(file?.type||'')} ${String(file?.preview_url||'')} ${String(file?.thumbnail_url||'')}`.toLowerCase();
  const isArtwork=file=>/printfile|print[_ -]?file|artwork|design|template|pattern|logo|digitization|inside|label/.test(meta(file));
  const explicitMockup=file=>!!file?.preview_url&&!isArtwork(file)&&/mockup/.test(meta(file));
  const imagesFromVariant=v=>{
    const out=[];
    const catalog=safeUrl(v?.catalog_image||v?.product?.image||'');
    if(catalog)out.push(catalog);
    for(const f of v?.files||[]){if(explicitMockup(f)){const u=safeUrl(f.preview_url);if(u&&!out.includes(u))out.push(u);}}
    return out;
  };

  window.parsePrintfulVariant=function(v){
    const parts=String(v?.name||'').split(' / ').map(x=>x.trim()).filter(Boolean);
    const price=Number(v?.retail_price);
    const images=imagesFromVariant(v);
    const color=parts.length>=3?(parts.at(-2)||'Default'):'Default';
    const size=parts.length>=2?(parts.at(-1)||'One Size'):'One Size';
    return {...v,color,size,price:Number.isFinite(price)?price:null,printful_sync_variant_id:Number(v?.sync_variant_id||0),images,image:images[0]||''};
  };
  try{parsePrintfulVariant=window.parsePrintfulVariant;}catch(e){}

  window.galleryFor=function(product){
    const out=[];
    const hero=typeof safeImage==='function'?safeImage(product?.image||''):safeUrl(product?.image||'');
    if(hero)out.push(hero);
    if(!product?.printful_product_id){
      for(const img of product?.gallery||[]){
        const safe=typeof safeImage==='function'?safeImage(img||''):safeUrl(img||'');
        if(safe&&!out.includes(safe))out.push(safe);
      }
    }else{
      const selected=typeof selectionFor==='function'?selectionFor(product.id):{color:''};
      const variants=(product.variants||[]).filter(v=>!selected.color||v.color===selected.color);
      for(const v of variants)for(const img of(v.images||[])){
        const safe=typeof safeImage==='function'?safeImage(img||''):safeUrl(img||'');
        if(safe&&!out.includes(safe))out.push(safe);
      }
    }
    return out.slice(0,12);
  };
  try{galleryFor=window.galleryFor;}catch(e){}

  window.sourceImage=function(source){
    const thumb=safeUrl(source?.thumbnail_url||'');
    if(thumb)return thumb;
    for(const v of source?.variants||[]){const imgs=imagesFromVariant(v);if(imgs[0])return imgs[0];}
    return'';
  };
  try{sourceImage=window.sourceImage;}catch(e){}

  async function repairCards(){
    const api=window.STARGIRLS_STORE_API||'';
    if(!api)return;
    try{
      const [cfgRes,catRes]=await Promise.all([
        fetch(`content/products.json?v=${Date.now()}`,{cache:'no-store'}),
        fetch(`${api}/printful/catalog?v=${Date.now()}`,{cache:'no-store',mode:'cors'})
      ]);
      if(!cfgRes.ok||!catRes.ok)return;
      const cfg=await cfgRes.json(),cat=await catRes.json();
      const baseById=new Map((cfg.products||[]).map(p=>[String(p.id),p]));
      const sourceById=new Map((cat.products||[]).map(p=>[Number(p.id),p]));
      document.querySelectorAll('[data-product-card]').forEach(card=>{
        const id=String(card.dataset.productCard||'');
        const base=baseById.get(id);
        const match=/^printful-(\d+)$/.exec(id);
        const pfid=base?.printful_product_id?Number(base.printful_product_id):(match?Number(match[1]):0);
        if(!pfid)return;
        const source=sourceById.get(pfid);
        if(!source)return;
        const img=window.sourceImage(source);
        const target=card.querySelector('[data-main-image]');
        if(img&&target){target.style.backgroundImage=`url("${img.replace(/["\\]/g,'')}")`;target.dataset.imageRepaired='1';}
      });
    }catch(error){console.warn('STARGIRLS image repair:',error);}
  }

  const grid=document.querySelector('[data-product-grid]');
  if(grid)new MutationObserver(()=>repairCards()).observe(grid,{childList:true,subtree:true});
  repairCards();
})();
