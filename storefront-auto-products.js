(()=>{
  const nativeFetch=window.fetch.bind(window);
  const api=window.STARGIRLS_STORE_API||'';
  const inferCategory=name=>{
    const n=String(name||'').toLowerCase();
    if(/juno|perfume|parfum|fragrance|eau de/.test(n)) return 'perfume';
    return 'fashion';
  };
  const isProductsRequest=input=>{
    const u=typeof input==='string'?input:(input&&input.url)||'';
    return /(?:^|\/)content\/products\.json(?:\?|$)/.test(u);
  };
  window.fetch=async(input,init)=>{
    if(!isProductsRequest(input)||!api) return nativeFetch(input,init);
    const baseResponse=await nativeFetch(input,init);
    if(!baseResponse.ok) return baseResponse;
    try{
      const [base,printfulResponse]=await Promise.all([
        baseResponse.clone().json(),
        nativeFetch(`${api}/printful/catalog?v=${Date.now()}`,{cache:'no-store',mode:'cors'})
      ]);
      if(!printfulResponse.ok) return baseResponse;
      const printful=await printfulResponse.json();
      const sources=Array.isArray(printful.products)?printful.products:[];
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
