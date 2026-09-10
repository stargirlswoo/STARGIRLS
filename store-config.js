// Live STARGIRLS store backend.
window.STARGIRLS_STORE_API = "https://stargirls.stargirlswoo.workers.dev";

// Normalize live Printful responses so current sizes/colors and a reliable product image
// are available everywhere that loads the shared store config.
(()=>{
  const api=window.STARGIRLS_STORE_API||'';
  if(!api||window.__sgPrintfulNormalizer)return;
  window.__sgPrintfulNormalizer=true;
  const nativeFetch=window.fetch.bind(window);
  const isCatalog=input=>{
    const url=typeof input==='string'?input:(input&&input.url)||'';
    return url.startsWith(`${api}/printful/catalog`);
  };
  const active=v=>{
    const status=String(v?.availability_status||'').toLowerCase();
    return !!v&&v.synced!==false&&v.is_ignored!==true&&status!=='inactive'&&status!=='discontinued'&&Number(v.sync_variant_id||0)>0;
  };
  const safeHttps=v=>/^https:\/\//i.test(String(v||''))?String(v):'';
  const normalizeProduct=source=>{
    const variants=(source?.variants||[]).filter(active).map(v=>{
      const parts=String(v?.name||'').split(' / ').map(x=>x.trim()).filter(Boolean);
      const color=String(v?.color||'').trim()||(parts.length>=3?parts.at(-2):'')||'Default';
      const size=String(v?.size||'').trim()||(parts.length>=2?parts.at(-1):'')||'One Size';
      const catalogImage=safeHttps(v?.catalog_image||v?.product?.image||'');
      return {...v,name:`${source?.name||parts[0]||'STARGIRLS PIECE'} / ${color} / ${size}`,color,size,catalog_image:catalogImage||v?.catalog_image||null};
    });
    const thumbnail=safeHttps(source?.thumbnail_url||'')||variants.map(v=>safeHttps(v?.catalog_image||v?.product?.image||'')).find(Boolean)||'';
    return {...source,thumbnail_url:thumbnail||null,variants};
  };
  window.fetch=async(input,init)=>{
    const response=await nativeFetch(input,init);
    if(!isCatalog(input)||!response.ok)return response;
    try{
      const data=await response.clone().json();
      const products=(data?.products||[]).map(normalizeProduct).filter(p=>p&&p.id&&p.variants.length);
      return new Response(JSON.stringify({...data,products}),{
        status:response.status,
        statusText:response.statusText,
        headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
      });
    }catch{return response;}
  };
})();
