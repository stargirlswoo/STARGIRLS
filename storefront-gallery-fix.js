/* STARGIRLS storefront gallery: prefer real garment previews; reject known artwork files. */
(function(){
  const unique=items=>[...new Set(items.filter(Boolean))];
  const meta=file=>`${String(file?.type||'')} ${String(file?.preview_url||'')}`.toLowerCase();
  const isArtwork=file=>/printfile|print[_ -]?file|embroidery|inside|label|template|pattern|logo|design|digitization|artwork/.test(meta(file));
  const score=file=>{const m=meta(file);if(isArtwork(file))return-9999;let s=10;if(/mockup/.test(m))s+=500;if(/front/.test(m))s+=220;if(/back/.test(m))s+=170;if(/side/.test(m))s+=140;if(/sleeve/.test(m))s+=100;if(/product|preview/.test(m))s+=50;return s;};
  const imagesFromVariant=v=>unique((v?.files||[]).filter(f=>f?.preview_url&&!isArtwork(f)).slice().sort((a,b)=>score(b)-score(a)).map(f=>f.preview_url));
  window.parsePrintfulVariant=function(v){const parts=String(v.name||'').split(' / '),price=Number(v.retail_price),images=imagesFromVariant(v);return{...v,color:parts.length>=3?parts.at(-2).trim():'',size:(parts.at(-1)||'').trim(),price:Number.isFinite(price)?price:null,printful_sync_variant_id:Number(v.sync_variant_id||0),images,image:images[0]||''};};
  try{parsePrintfulVariant=window.parsePrintfulVariant;}catch(e){}
  window.galleryFor=function(product){const selected=typeof selectionFor==='function'?selectionFor(product.id):{color:''},variants=(product.variants||[]).filter(v=>!selected.color||v.color===selected.color),out=[];for(const v of variants)for(const img of(v.images||[])){const safe=typeof safeImage==='function'?safeImage(img||''):img;if(safe&&!out.includes(safe))out.push(safe);}if(!product.printful_product_id){for(const img of product.gallery||[]){const safe=typeof safeImage==='function'?safeImage(img||''):img;if(safe&&!out.includes(safe))out.push(safe);}const hero=typeof safeImage==='function'?safeImage(product.image||''):product.image;if(hero&&!out.includes(hero))out.unshift(hero);}return out.slice(0,12);};
  try{galleryFor=window.galleryFor;}catch(e){}
  window.sourceImage=function(source){for(const v of source?.variants||[]){const imgs=imagesFromVariant(v);if(imgs[0])return imgs[0];}return'';};
  try{sourceImage=window.sourceImage;}catch(e){}
})();
