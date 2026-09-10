/* STARGIRLS product page cache bridge.
   Product clicks should never wait on a second live Printful request when the storefront
   already has the catalog. Reuse the storefront v5 cache immediately; direct product
   visits fall back to a bounded cached API request instead of hanging indefinitely. */
(()=>{
  const NEW_KEY='stargirls-printful-catalog-v5';
  const LEGACY_KEY='stargirls-printful-catalog-v4';
  const API=window.STARGIRLS_STORE_API||'';
  const nativeFetch=window.fetch.bind(window);
  let cached=null;

  try{
    const raw=JSON.parse(localStorage.getItem(NEW_KEY)||'null');
    if(raw?.data&&Array.isArray(raw.data.products)&&raw.data.products.length){
      cached=raw.data;
      // The current product loader still reads the legacy session key.
      // Seed it from the storefront cache and make it look fresh for this navigation.
      sessionStorage.setItem(LEGACY_KEY,JSON.stringify({ts:Date.now(),data:cached}));
    }
  }catch(error){
    console.warn('STARGIRLS product cache bridge:',error);
  }

  if(!API)return;

  const isCatalog=input=>{
    const url=typeof input==='string'?input:(input&&input.url)||'';
    return url.startsWith(`${API}/printful/catalog`);
  };
  const cachedResponse=data=>new Response(JSON.stringify(data),{
    status:200,
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, max-age=300'}
  });

  window.fetch=(input,init)=>{
    if(!isCatalog(input))return nativeFetch(input,init);
    if(cached)return Promise.resolve(cachedResponse(cached));

    // Direct product-page visit with no storefront cache: use Cloudflare's normal cache
    // and cap the request so the UI can fail cleanly instead of showing LOADING forever.
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),6000);
    return nativeFetch(`${API}/printful/catalog`,{
      cache:'default',
      mode:'cors',
      signal:controller.signal
    }).then(async response=>{
      if(response.ok){
        try{
          const clone=response.clone();
          const data=await clone.json();
          if(data&&Array.isArray(data.products)&&data.products.length){
            cached=data;
            const wrapped={ts:Date.now(),data};
            try{
              localStorage.setItem(NEW_KEY,JSON.stringify(wrapped));
              sessionStorage.setItem(LEGACY_KEY,JSON.stringify(wrapped));
            }catch{}
          }
        }catch{}
      }
      return response;
    }).finally(()=>clearTimeout(timer));
  };
})();
