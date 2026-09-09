(()=>{
  const nativeFetch=window.fetch.bind(window);
  const api=window.STARGIRLS_STORE_API||'';

  const inferCategory=name=>{
    const n=String(name||'').toLowerCase();
    if(/juno|perfume|parfum|fragrance|eau de/.test(n)) return 'perfume';
    return 'fashion';
  };

  const needsMockupOnly=name=>/hunt.*swim|hunt.*flip|anew.*pullover|stargirl?s?.*pullover/i.test(String(name||''));
  const badArtwork=file=>{
    const m=`${String(file?.type||'')} ${String(file?.preview_url||'')}`.toLowerCase();
    return /printfile|print[_ -]?file|artwork|design|template|pattern|logo|digitization|inside|label/.test(m);
  };
  const trustedMockup=file=>!!file?.preview_url&&!badArtwork(file)&&/mockup|preview/.test(`${String(file?.type||'')} ${String(file?.preview_url||'')}`.toLowerCase());

  const normalizeVariant=(v,productName='')=>{
    const parts=String(v?.name||'').split(' / ').map(x=>x.trim()).filter(Boolean);
    let name=String(v?.name||'').trim();
    if(parts.length===2) name=`${parts[0]} / Default / ${parts[1]}`;
    else if(parts.length<2) name=`${productName||parts[0]||'STARGIRLS PIECE'} / Default / One Size`;
    return {...v,name,sku:v?.sku||`PF-${Number(v?.sync_variant_id||0)}`,files:Array.isArray(v?.files)?v.files:[]};
  };

  const cleanSource=source=>{
    const baseVariants=(source?.variants||[]).map(v=>normalizeVariant(v,source?.name||''));
    if(!needsMockupOnly(source?.name)) return {...source,variants:baseVariants};
    const variants=baseVariants.map(v=>({...v,files:(v.files||[]).filter(trustedMockup)}));
    return {...source,variants,thumbnail_url:source?.thumbnail_url||null};
  };

  const cleanCatalog=data=>({...data,products:Array.isArray(data?.products)?data.products.map(cleanSource):[]});
  const isProductsRequest=input=>{
    const u=typeof input==='string'?input:(input&&input.url)||'';
    return /(?:^|\/)content\/products\.json(?:\?|$)/.test(u);
  };
  const isPrintfulCatalogRequest=input=>{
    const u=typeof input==='string'?input:(input&&input.url)||'';
    return !!api&&u.startsWith(`${api}/printful/catalog`);
  };

  window.fetch=async(input,init)=>{
    if(isPrintfulCatalogRequest(input)){
      const response=await nativeFetch(input,init);
      if(!response.ok) return response;
      try{
        const data=cleanCatalog(await response.clone().json());
        return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers:{'content-type':'application/json; charset=utf-8'}});
      }catch{return response;}
    }

    if(!isProductsRequest(input)||!api) return nativeFetch(input,init);
    const baseResponse=await nativeFetch(input,init);
    if(!baseResponse.ok) return baseResponse;
    try{
      const [base,printfulResponse]=await Promise.all([
        baseResponse.clone().json(),
        nativeFetch(`${api}/printful/catalog?v=${Date.now()}`,{cache:'no-store',mode:'cors'})
      ]);
      if(!printfulResponse.ok) return baseResponse;
      const sources=cleanCatalog(await printfulResponse.json()).products;
      const baseProducts=Array.isArray(base.products)?base.products:[];
      const mappedIds=new Set(baseProducts.map(p=>Number(p.printful_product_id||0)).filter(Boolean));
      const merged=baseProducts.map(product=>{
        if(!product.printful_product_id) return product;
        const source=sources.find(s=>Number(s.id)===Number(product.printful_product_id));
        if(!source) return product;
        return {...product,name:source.name||product.name};
      });
      for(const source of sources){
        if(mappedIds.has(Number(source.id))) continue;
        merged.push({
          id:`printful-${source.id}`,
          name:source.name||'STARGIRLS PIECE',
          category:inferCategory(source.name),
          status:'AVAILABLE',
          available:true,
          fulfillment:'printful',
          printful_product_id:Number(source.id),
          price_mode:'printful'
        });
      }
      return new Response(JSON.stringify({products:merged}),{
        status:baseResponse.status,
        statusText:baseResponse.statusText,
        headers:{'content-type':'application/json; charset=utf-8'}
      });
    }catch(error){
      console.warn('STARGIRLS auto product sync:',error);
      return baseResponse;
    }
  };
})();
