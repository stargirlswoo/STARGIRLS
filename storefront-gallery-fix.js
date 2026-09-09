/* STARGIRLS storefront gallery: garment mockups first, selected-color galleries only. */
(function(){
  const unique = items => [...new Set(items.filter(Boolean))];
  const meta = file => `${String(file?.type||'')} ${String(file?.preview_url||'')}`.toLowerCase();
  const isArtwork = file => /printfile|print[_ -]?file|embroidery|inside|label|template|pattern|logo|design|digitization/.test(meta(file));
  const isGarment = file => !isArtwork(file) && /mockup|preview|front|back|side|sleeve|product/.test(meta(file));
  const scoreFile = file => {
    const m=meta(file); let score=0;
    if(isArtwork(file)) score-=1000;
    if(/mockup/.test(m)) score+=500;
    if(/front/.test(m)) score+=220;
    if(/back/.test(m)) score+=170;
    if(/side/.test(m)) score+=140;
    if(/sleeve/.test(m)) score+=100;
    if(/preview/.test(m)) score+=80;
    if(/product/.test(m)) score+=50;
    return score;
  };
  const imagesFromVariant = v => {
    const files=(v?.files||[]).filter(f=>f?.preview_url);
    let candidates=files.filter(isGarment);
    if(!candidates.length) candidates=files.filter(f=>!isArtwork(f));
    return unique(candidates.slice().sort((a,b)=>scoreFile(b)-scoreFile(a)).map(f=>f.preview_url));
  };

  window.parsePrintfulVariant=function(v){
    const parts=String(v.name||'').split(' / '), price=Number(v.retail_price), images=imagesFromVariant(v);
    return {...v,color:parts.length>=3?parts.at(-2).trim():'',size:(parts.at(-1)||'').trim(),price:Number.isFinite(price)?price:null,printful_sync_variant_id:Number(v.sync_variant_id||0),images,image:images[0]||''};
  };
  try{parsePrintfulVariant=window.parsePrintfulVariant;}catch(e){}

  window.galleryFor=function(product){
    const selected=typeof selectionFor==='function'?selectionFor(product.id):{color:''};
    const variants=(product.variants||[]).filter(v=>!selected.color||v.color===selected.color);
    const out=[];
    for(const v of variants) for(const img of (v.images||[v.image])) { const safe=typeof safeImage==='function'?safeImage(img||''):img; if(safe&&!out.includes(safe)) out.push(safe); }
    /* Static gallery is only a fallback for non-Printful/coming-soon products. */
    if(!product.printful_product_id){
      for(const img of product.gallery||[]){const safe=typeof safeImage==='function'?safeImage(img||''):img;if(safe&&!out.includes(safe))out.push(safe);}
      const hero=typeof safeImage==='function'?safeImage(product.image||''):product.image;if(hero&&!out.includes(hero))out.unshift(hero);
    }
    return out.slice(0,12);
  };
  try{galleryFor=window.galleryFor;}catch(e){}

  window.sourceImage=function(source){
    /* Prefer a real garment mockup over Printful's product thumbnail, which can be raw artwork. */
    for(const v of source?.variants||[]){const imgs=imagesFromVariant(v);if(imgs[0])return imgs[0];}
    return source?.thumbnail_url||'';
  };
  try{sourceImage=window.sourceImage;}catch(e){}
})();
