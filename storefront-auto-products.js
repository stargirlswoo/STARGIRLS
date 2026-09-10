(()=>{
  const nativeFetch=window.fetch.bind(window);
  const api=window.STARGIRLS_STORE_API||'';
  const CATALOG_CACHE_KEY='stargirls-printful-catalog-v2';

  const inferCategory=name=>{
    const n=String(name||'').toLowerCase();
    if(/juno|perfume|parfum|fragrance|eau de/.test(n)) return 'perfume';
    if(/party\s*(?:till|til)\s*hell/.test(n)) return 'merch';
    if(/\b(?:hayati|anew)\b/.test(n)) return 'merch';
    if(/\bstargirls?\b.*\b(?:tee|t-?shirt|shirt|pullover|hoodie|sweatshirt|sweater)\b/.test(n)) return 'merch';
    return 'fashion';
  };

  const safeUrl=value=>/^https:\/\//i.test(String(value||''))?String(value):'';
  const fileMeta=file=>`${String(file?.type||'')} ${String(file?.preview_url||'')} ${String(file?.thumbnail_url||'')}`.toLowerCase();
  const isArtwork=file=>/printfile|print[_ -]?file|artwork|design|template|pattern|logo|digitization|inside|label/.test(fileMeta(file));
  const likelyMockup=file=>!!(file?.preview_url||file?.thumbnail_url)&&!isArtwork(file)&&/mockup|preview/.test(fileMeta(file));
  const activeVariant=v=>{
    const status=String(v?.availability_status||'').toLowerCase();
    return !!v&&v.synced!==false&&v.is_ignored!==true&&status!=='inactive'&&status!=='discontinued'&&Number(v.sync_variant_id||0)>0;
  };

  const variantParts=(v,productName='')=>{
    const parts=String(v?.name||'').split(' / ').map(x=>x.trim()).filter(Boolean);
    const explicitColor=String(v?.color||'').trim();
    const explicitSize=String(v?.size||'').trim();
    let color=explicitColor;
    let size=explicitSize;
    if(!color){
      if(parts.length>=3) color=parts.at(-2)||'';
      else if(parts.length===2) color=parts[0]||'';
    }
    if(!size&&parts.length>=2) size=parts.at(-1)||'';
    color=color||'Default';
    size=size||'One Size';
    return {color,size,name:`${productName||parts[0]||'STARGIRLS PIECE'} / ${color} / ${size}`};
  };

  const imageCandidates=(source,v)=>{
    const out=[];
    const add=u=>{u=safeUrl(u);if(u&&!out.includes(u))out.push(u);};
    add(source?.thumbnail_url);
    add(source?.image_url);
    for(const f of v?.files||[]){if(likelyMockup(f)){add(f.preview_url);add(f.thumbnail_url);}}
    add(v?.catalog_image);
    add(v?.product?.image);
    for(const f of v?.files||[]){if(!isArtwork(f)){add(f.preview_url);add(f.thumbnail_url);}}
    return out;
  };

  const normalizeVariant=(v,source)=>{
    const {color,size,name}=variantParts(v,source?.name||'');
    const price=Number(v?.retail_price);
    const images=imageCandidates(source,v);
    return {
      ...v,
      name,
      color,
      size,
      price:Number.isFinite(price)?price:null,
      sku:v?.sku||`PF-${Number(v?.sync_variant_id||0)}`,
      printful_sync_variant_id:Number(v?.sync_variant_id||0),
      images,
      image:images[0]||safeUrl(source?.thumbnail_url)||''
    };
  };

  const cleanSource=source=>{
    const variants=(source?.variants||[]).filter(activeVariant).map(v=>normalizeVariant(v,source));
    const image=safeUrl(source?.thumbnail_url)||variants.map(v=>v.image).find(Boolean)||'';
    return {...source,thumbnail_url:image||null,image_url:image||null,variants};
  };

  const cleanCatalog=data=>({...data,products:Array.isArray(data?.products)?data.products.map(cleanSource).filter(p=>p&&p.id&&p.variants.length):[]});
  const isProductsRequest=input=>{
    const u=typeof input==='string'?input:(input&&input.url)||'';
    return /(?:^|\/)content\/products\.json(?:\?|$)/.test(u);
  };
  const isPrintfulCatalogRequest=input=>{
    const u=typeof input==='string'?input:(input&&input.url)||'';
    return !!api&&u.startsWith(`${api}/printful/catalog`);
  };

  const saveCatalog=data=>{try{sessionStorage.setItem(CATALOG_CACHE_KEY,JSON.stringify(data));}catch{}};
  const loadCachedCatalog=()=>{try{const d=JSON.parse(sessionStorage.getItem(CATALOG_CACHE_KEY)||'null');return d&&Array.isArray(d.products)?d:null;}catch{return null;}};

  window.fetch=async(input,init)=>{
    if(isPrintfulCatalogRequest(input)){
      try{
        const response=await nativeFetch(input,init);
        if(!response.ok){
          const cached=loadCachedCatalog();
          if(cached)return new Response(JSON.stringify(cached),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
          return response;
        }
        const data=cleanCatalog(await response.clone().json());
        saveCatalog(data);
        return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
      }catch(error){
        const cached=loadCachedCatalog();
        if(cached)return new Response(JSON.stringify(cached),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
        throw error;
      }
    }

    if(!isProductsRequest(input)||!api) return nativeFetch(input,init);
    const baseResponse=await nativeFetch(input,init);
    if(!baseResponse.ok) return baseResponse;
    try{
      const [base,printfulResponse]=await Promise.all([
        baseResponse.clone().json(),
        window.fetch(`${api}/printful/catalog?v=${Date.now()}`,{cache:'no-store',mode:'cors'})
      ]);
      if(!printfulResponse.ok) return baseResponse;
      const sources=cleanCatalog(await printfulResponse.json()).products;
      saveCatalog({products:sources});
      const baseProducts=Array.isArray(base.products)?base.products.filter(p=>!p.printful_product_id):[];
      const liveProducts=sources.map(source=>({
        id:`printful-${source.id}`,
        name:source.name||'STARGIRLS PIECE',
        category:inferCategory(source.name),
        status:'AVAILABLE',
        available:true,
        fulfillment:'printful',
        printful_product_id:Number(source.id),
        price_mode:'printful',
        image:source.thumbnail_url||source.image_url||'',
        variants:source.variants||[]
      }));
      return new Response(JSON.stringify({products:[...liveProducts,...baseProducts]}),{
        status:baseResponse.status,
        statusText:baseResponse.statusText,
        headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
      });
    }catch(error){
      console.warn('STARGIRLS live product sync:',error);
      return baseResponse;
    }
  };
})();
