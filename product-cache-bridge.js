/* STARGIRLS product page cache bridge.
   A product clicked from the storefront is rendered from a tiny per-product snapshot,
   so navigation never waits for another full Printful catalog request. */
(()=>{
  const SNAPSHOT_KEY='stargirls-clicked-product-v1';
  const NEW_KEY='stargirls-printful-catalog-v5';
  const LEGACY_KEY='stargirls-printful-catalog-v4';
  const API=window.STARGIRLS_STORE_API||'';
  const nativeFetch=window.fetch.bind(window);
  let cached=null;

  // Fastest path: the storefront saves the exact product before navigating here.
  try{
    const snap=JSON.parse(sessionStorage.getItem(SNAPSHOT_KEY)||'null');
    if(snap?.source&&Array.isArray(snap.source.variants)&&snap.source.variants.length){
      const q=new URLSearchParams(location.search);
      const wantedPf=Number(q.get('pf')||0);
      const wantedId=String(q.get('id')||'');
      if((!wantedPf||Number(snap.pfid)===wantedPf)&&(!wantedId||String(snap.id)===wantedId)){
        cached={products:[snap.source],refreshed_at:new Date(Number(snap.ts)||Date.now()).toISOString()};
      }
    }
  }catch{}

  // Next fastest path: reuse the full storefront cache already on this device.
  if(!cached){
    try{
      const raw=JSON.parse(localStorage.getItem(NEW_KEY)||'null');
      if(raw?.data&&Array.isArray(raw.data.products)&&raw.data.products.length)cached=raw.data;
    }catch(error){console.warn('STARGIRLS product cache bridge:',error);}
  }

  if(cached){
    try{sessionStorage.setItem(LEGACY_KEY,JSON.stringify({ts:Date.now(),data:cached}));}catch{}
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

    // Direct URL visit with no storefront cache: cap the wait so it can never sit on
    // LOADING PRODUCT for an extended period.
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),3000);
    return nativeFetch(`${API}/printful/catalog`,{
      cache:'default',mode:'cors',signal:controller.signal
    }).then(async response=>{
      if(response.ok){
        try{
          const data=await response.clone().json();
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
