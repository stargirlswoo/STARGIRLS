function headers(env){
  if(!env.PRINTFUL_API_TOKEN) throw new Error('PRINTFUL_API_TOKEN is not configured');
  const h={Authorization:`Bearer ${env.PRINTFUL_API_TOKEN}`,Accept:'application/json'};
  if(env.PRINTFUL_STORE_ID) h['X-PF-Store-Id']=String(env.PRINTFUL_STORE_ID);
  return h;
}
async function pf(path,env){
  const r=await fetch(`https://api.printful.com${path}`,{headers:headers(env)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||Number(d?.code||r.status)>=400) throw new Error(`Printful catalog request failed (${r.status})`);
  return d;
}
function compact(product,details){
  const sync=details?.result?.sync_product||product||{};
  const variants=Array.isArray(details?.result?.sync_variants)?details.result.sync_variants:[];
  return {
    id:product.id,
    external_id:product.external_id||null,
    name:product.name||'',
    thumbnail_url:sync.thumbnail_url||product.thumbnail_url||null,
    variants:variants.map(v=>({
      sync_variant_id:v.id,
      external_id:v.external_id||null,
      name:v.name||'',
      sku:v.sku||'',
      catalog_variant_id:v.variant_id||null,
      retail_price:v.retail_price||null,
      synced:v.synced!==false,
      availability_status:v.availability_status||null,
      product:v.product||null,
      files:Array.isArray(v.files)?v.files.filter(f=>f&&f.preview_url).map(f=>({preview_url:f.preview_url,type:f.type||null})):[]
    }))
  };
}
export async function getPublicPrintfulCatalog(env){
  const cache=caches.default;
  const store=String(env.PRINTFUL_STORE_ID||'default');
  const cacheKey=new Request(`https://stargirls.maison/__cache/printful-catalog-${encodeURIComponent(store)}`);
  const cached=await cache.match(cacheKey);
  if(cached) return cached.json();

  const products=[];
  let offset=0;
  const limit=100;
  while(true){
    const page=await pf(`/store/products?offset=${offset}&limit=${limit}`,env);
    const batch=Array.isArray(page?.result)?page.result:[];
    const details=await Promise.all(batch.map(p=>pf(`/store/products/${encodeURIComponent(p.id)}`,env)));
    batch.forEach((p,i)=>products.push(compact(p,details[i])));
    const total=Number(page?.paging?.total||batch.length);
    offset+=batch.length;
    if(!batch.length||offset>=total) break;
  }

  const payload={products};
  const response=new Response(JSON.stringify(payload),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=300, stale-while-revalidate=3600'}});
  await cache.put(cacheKey,response.clone());
  return payload;
}
