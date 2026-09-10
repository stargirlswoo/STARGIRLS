// Live STARGIRLS store backend.
window.STARGIRLS_STORE_API = "https://stargirls.stargirlswoo.workers.dev";

// Keep one normalized live Printful catalog available across the storefront and product pages.
(()=>{
  const api=window.STARGIRLS_STORE_API||'';
  if(!api||window.__sgPrintfulNormalizer)return;
  window.__sgPrintfulNormalizer=true;
  const nativeFetch=window.fetch.bind(window);
  const CACHE_KEY='stargirls-printful-catalog-v2';
  const isCatalog=input=>{
    const url=typeof input==='string'?input:(input&&input.url)||'';
    return url.startsWith(`${api}/printful/catalog`);
  };
  const active=v=>{
    const status=String(v?.availability_status||'').toLowerCase();
    return !!v&&v.synced!==false&&v.is_ignored!==true&&status!=='inactive'&&status!=='discontinued'&&Number(v.sync_variant_id||0)>0;
  };
  const safeHttps=v=>/^https:\/\//i.test(String(v||''))?String(v):'';
  const readCache=()=>{try{const d=JSON.parse(sessionStorage.getItem(CACHE_KEY)||'null');return d&&Array.isArray(d.products)?d:null;}catch{return null;}};
  const writeCache=data=>{try{sessionStorage.setItem(CACHE_KEY,JSON.stringify(data));}catch{}};
  const normalizeProduct=source=>{
    const variants=(source?.variants||[]).filter(active).map(v=>{
      const parts=String(v?.name||'').split(' / ').map(x=>x.trim()).filter(Boolean);
      const color=String(v?.color||'').trim()||(parts.length>=3?parts.at(-2):(parts.length===2?parts[0]:''))||'Default';
      const size=String(v?.size||'').trim()||(parts.length>=2?parts.at(-1):'')||'One Size';
      const fileImage=(v?.files||[]).map(f=>safeHttps(f?.preview_url||f?.thumbnail_url||'')).find(Boolean)||'';
      const catalogImage=safeHttps(v?.catalog_image||v?.product?.image||'')||fileImage;
      return {...v,name:`${source?.name||parts[0]||'STARGIRLS PIECE'} / ${color} / ${size}`,color,size,catalog_image:catalogImage||null};
    });
    const thumbnail=safeHttps(source?.thumbnail_url||source?.image_url||'')||variants.map(v=>safeHttps(v?.catalog_image||v?.product?.image||'')).find(Boolean)||'';
    return {...source,thumbnail_url:thumbnail||null,image_url:thumbnail||null,variants};
  };
  const normalize=data=>({...data,products:Array.isArray(data?.products)?data.products.map(normalizeProduct).filter(p=>p&&p.id&&p.variants.length):[]});
  const cachedResponse=data=>new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

  window.fetch=async(input,init)=>{
    if(!isCatalog(input))return nativeFetch(input,init);
    try{
      const response=await nativeFetch(input,init);
      if(!response.ok){const cached=readCache();return cached?cachedResponse(cached):response;}
      const data=normalize(await response.clone().json());
      writeCache(data);
      return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
    }catch(error){
      const cached=readCache();
      if(cached)return cachedResponse(cached);
      throw error;
    }
  };
})();
