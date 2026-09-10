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

function activeVariant(v){
  const status=String(v?.availability_status||'').toLowerCase();
  return !!v&&v.synced!==false&&v.is_ignored!==true&&status!=='inactive'&&status!=='discontinued'&&Number(v.id||0)>0;
}

function compact(product,details){
  const sync=details?.result?.sync_product||product||{};
  const variants=Array.isArray(details?.result?.sync_variants)?details.result.sync_variants:[];
  return {
    id:product.id,
    external_id:product.external_id||null,
    name:sync.name||product.name||'',
    thumbnail_url:sync.thumbnail_url||product.thumbnail_url||null,
    variants:variants.filter(activeVariant).map(v=>({
      sync_variant_id:v.id,
      external_id:v.external_id||null,
      name:v.name||'',
      sku:v.sku||'',
      catalog_variant_id:v.variant_id||null,
      retail_price:v.retail_price||null,
      size:v.size||null,
      color:v.color||null,
      synced:v.synced!==false,
      is_ignored:v.is_ignored===true,
      availability_status:v.availability_status||null,
      catalog_image:v?.product?.image||null,
      product:v.product||null,
      files:Array.isArray(v.files)?v.files.filter(f=>f&&f.preview_url).slice(0,6).map(f=>({preview_url:f.preview_url,thumbnail_url:f.thumbnail_url||null,type:f.type||null})):[]
    }))
  };
}

const CACHE_VERSION='v6';
const EDGE_TTL_SECONDS=300;
const FRESH_MS=5*60*1000;
const KV_KEY=`printful:public-catalog:${CACHE_VERSION}`;

function validSnapshot(value){
  return !!value&&Array.isArray(value.products)&&value.products.length>0&&value.refreshed_at;
}

function ageMs(value){
  const ts=Date.parse(value?.refreshed_at||'');
  return Number.isFinite(ts)?Math.max(0,Date.now()-ts):Infinity;
}

async function readKv(env){
  if(!env.STARGIRLS_PRODUCTS)return null;
  try{
    const value=await env.STARGIRLS_PRODUCTS.get(KV_KEY,'json');
    return validSnapshot(value)?value:null;
  }catch(error){
    console.warn('STARGIRLS Printful KV read',error);
    return null;
  }
}

async function seedEdge(cache,cacheKey,payload){
  const response=new Response(JSON.stringify(payload),{headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':`public, max-age=${EDGE_TTL_SECONDS}, stale-while-revalidate=86400`
  }});
  await cache.put(cacheKey,response);
}

async function fetchPrintfulCatalog(env){
  const products=[];
  let offset=0;
  const limit=100;
  while(true){
    const page=await pf(`/store/products?offset=${offset}&limit=${limit}`,env);
    const batch=Array.isArray(page?.result)?page.result:[];
    const details=await Promise.all(batch.map(p=>pf(`/store/products/${encodeURIComponent(p.id)}`,env)));
    batch.forEach((p,i)=>{const item=compact(p,details[i]);if(item.variants.length)products.push(item);});
    const total=Number(page?.paging?.total||batch.length);
    offset+=batch.length;
    if(!batch.length||offset>=total)break;
  }
  return {products,refreshed_at:new Date().toISOString()};
}

async function refresh(env,cache,cacheKey){
  const payload=await fetchPrintfulCatalog(env);
  if(env.STARGIRLS_PRODUCTS){
    await env.STARGIRLS_PRODUCTS.put(KV_KEY,JSON.stringify(payload),{expirationTtl:7*24*60*60});
  }
  await seedEdge(cache,cacheKey,payload);
  return payload;
}

export async function getPublicPrintfulCatalog(env,ctx){
  const cache=caches.default;
  const store=String(env.PRINTFUL_STORE_ID||'default');
  const cacheKey=new Request(`https://stargirls.maison/__cache/printful-catalog-${CACHE_VERSION}-${encodeURIComponent(store)}`);

  const edge=await cache.match(cacheKey);
  if(edge){
    const payload=await edge.json().catch(()=>null);
    if(validSnapshot(payload))return payload;
  }

  const shared=await readKv(env);
  if(shared){
    if(ageMs(shared)<FRESH_MS){
      const work=seedEdge(cache,cacheKey,shared).catch(error=>console.warn('STARGIRLS edge cache seed',error));
      if(ctx?.waitUntil)ctx.waitUntil(work);else await work;
      return shared;
    }

    const work=refresh(env,cache,cacheKey).catch(error=>console.warn('STARGIRLS Printful background refresh',error));
    if(ctx?.waitUntil)ctx.waitUntil(work);else await work;
    return shared;
  }

  return refresh(env,cache,cacheKey);
}
