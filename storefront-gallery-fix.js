/* STARGIRLS storefront gallery: use product mockups, never raw artwork files. */
(function(){
  const unique=items=>[...new Set(items.filter(Boolean))];
  const meta=file=>`${String(file?.type||'')} ${String(file?.preview_url||'')}`.toLowerCase();
  const isArtwork=file=>/printfile|print[_ -]?file|artwork|design|template|pattern|logo|digitization|inside|label/.test(meta(file));
  const isMockup=file=>!!file?.preview_url&&!isArtwork(file)&&/mockup|preview/.test(meta(file));
  const imagesFromVariant=v=>unique((v?.files||[]).filter(isMockup).map(f=>f.preview_url));

  window.parsePrintfulVariant=function(v){
    const parts=String(v.name||'').split(' / ').map(x=>x.trim()).filter(Boolean);
    const price=Number(v.retail_price);
    const images=imagesFromVariant(v);
    const color=parts.length>=3?(parts.at(-2)||'Default'):'Default';
    const size=parts.length>=2?(parts.at(-1)||'One Size'):'One Size';
    return {...v,color,size,price:Number.isFinite(price)?price:null,printful_sync_variant_id:Number(v.sync_variant_id||0),images,image:images[0]||''};
  };
  try{parsePrintfulVariant=window.parsePrintfulVariant;}catch(e){}

  window.galleryFor=function(product){
    const out=[];
    const hero=typeof safeImage==='function'?safeImage(product.image||''):product.image;
    if(hero)out.push(hero);
    if(!product.printful_product_id){
      for(const img of product.gallery||[]){
        const safe=typeof safeImage==='function'?safeImage(img||''):img;
        if(safe&&!out.includes(safe))out.push(safe);
      }
    }else{
      const selected=typeof selectionFor==='function'?selectionFor(product.id):{color:''};
      const variants=(product.variants||[]).filter(v=>!selected.color||v.color===selected.color);
      for(const v of variants)for(const img of(v.images||[])){
        const safe=typeof safeImage==='function'?safeImage(img||''):img;
        if(safe&&!out.includes(safe))out.push(safe);
      }
    }
    return out.slice(0,12);
  };
  try{galleryFor=window.galleryFor;}catch(e){}

  window.sourceImage=function(source){
    if(source?.thumbnail_url)return source.thumbnail_url;
    for(const v of source?.variants||[]){const imgs=imagesFromVariant(v);if(imgs[0])return imgs[0];}
    return'';
  };
  try{sourceImage=window.sourceImage;}catch(e){}
})();
