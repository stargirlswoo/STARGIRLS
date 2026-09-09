/* STARGIRLS storefront gallery patch: preserve all Printful mockups per color and avoid raw artwork previews. */
(function(){
  const unique = items => [...new Set(items.filter(Boolean))];
  const scoreFile = file => {
    const type = String(file?.type || '').toLowerCase();
    const url = String(file?.preview_url || '').toLowerCase();
    let score = 0;
    if (/mockup|preview/.test(type)) score += 100;
    if (/front|back|side|sleeve/.test(type)) score += 40;
    if (/mockup|preview/.test(url)) score += 30;
    if (/default|printfile|embroidery|inside|label/.test(type)) score -= 80;
    return score;
  };
  const imagesFromVariant = v => unique((v?.files || [])
    .filter(f => f?.preview_url)
    .slice()
    .sort((a,b)=>scoreFile(b)-scoreFile(a))
    .map(f=>f.preview_url));

  if (typeof window.parsePrintfulVariant === 'function' || typeof parsePrintfulVariant === 'function') {
    window.parsePrintfulVariant = function(v){
      const parts=String(v.name||'').split(' / ');
      const price=Number(v.retail_price);
      const images=imagesFromVariant(v);
      return {...v,color:parts.length>=3?parts.at(-2):'',size:parts.at(-1)||'',price:Number.isFinite(price)?price:null,printful_sync_variant_id:Number(v.sync_variant_id||0),images,image:images[0]||''};
    };
    try{ parsePrintfulVariant = window.parsePrintfulVariant; }catch(e){}
  }

  window.galleryFor = function(product){
    const out=[];
    const selected = typeof selectionFor === 'function' ? selectionFor(product.id) : {color:''};
    const variants=(product.variants||[]).filter(v=>!selected.color || v.color===selected.color);
    for(const v of variants){
      const imgs = Array.isArray(v.images) && v.images.length ? v.images : [v.image];
      for(const img of imgs){
        const safe = typeof safeImage === 'function' ? safeImage(img||'') : img;
        if(safe && !out.includes(safe)) out.push(safe);
      }
    }
    for(const img of product.gallery||[]){
      const safe = typeof safeImage === 'function' ? safeImage(img||'') : img;
      if(safe && !out.includes(safe)) out.push(safe);
    }
    const hero = typeof safeImage === 'function' ? safeImage(product.image||'') : product.image;
    if(hero && !out.includes(hero)) out.unshift(hero);
    return out.slice(0,12);
  };
  try{ galleryFor = window.galleryFor; }catch(e){}

  window.sourceImage = function(source){
    if(source?.thumbnail_url) return source.thumbnail_url;
    for(const v of source?.variants||[]){const imgs=imagesFromVariant(v);if(imgs[0]) return imgs[0];}
    return '';
  };
  try{ sourceImage = window.sourceImage; }catch(e){}
})();
