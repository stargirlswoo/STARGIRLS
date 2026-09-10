/* STARGIRLS product page cache bridge.
   Product clicks should never wait on a second live Printful request when the storefront
   already has the catalog. This bridges the storefront v5 localStorage cache into the
   legacy product-page loader before product-page.js boots. */
(()=>{
  const NEW_KEY='stargirls-printful-catalog-v5';
  const LEGACY_KEY='stargirls-printful-catalog-v4';
  const API=window.STARGIRLS_STORE_API||'';
  let cached=null;

  try{
    const raw=JSON.parse(localStorage.getItem(NEW_KEY)||'null');
    if(raw?.data&&Array.isArray(raw.data.products)&&raw.data.products.length){
      cached=raw.data;
      // product-page.js currently checks the old session key with a short TTL.
      // Stamp it now so navigation from the storefront renders immediately.
      sessionStorage.setItem(LEGACY_KEY,JSON.stringify({ts:Date.now(),data:cached}));
    }
  }catch(error){
    console.warn('STARGIRLS product cache bridge:',error);
  }

  if(!cached||!API)return;

  const nativeFetch=window.fetch.bind(window);
  const isCatalog=input=>{
    const url=typeof input==='string'?input:(input&&input.url)||'';
    return url.startsWith(`${API}/printful/catalog`);
  };
  const cachedResponse=()=>new Response(JSON.stringify(cached),{
    status:200,
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, max-age=300'}
  });

  window.fetch=(input,init)=>isCatalog(input)?Promise.resolve(cachedResponse()):nativeFetch(input,init);
})();
