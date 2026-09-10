(()=>{
  const nativeFetch=window.fetch.bind(window);
  const api=window.STARGIRLS_STORE_API||'';
  if(!api)return;

  const CACHE_KEY='stargirls-printful-catalog-v4';
  const CLIENT_TTL=60000;
  const state=window.__SG_PRINTFUL_STATE||(window.__SG_PRINTFUL_STATE={data:null,ts:0,promise:null});

  const inferCategory=name=>{
    const n=String(name||'').toLowerCase();
    if(/juno|perfume|parfum|fragrance|eau de/.test(n))return'perfume';
    if(/party\s*(?:till|til)\s*hell/.test(n))return'merch';
    if(/\b(?:hayati|anew)\b/.test(n))return'merch';
    if(/\bstargirls?\b.*\b(?:tee|t-?shirt|shirt|pullover|hoodie|sweatshirt|sweater)\b/.test(n))return'merch';
    return'fashion';
  };

  const safeUrl=value=>/^https:\/\//i.test(String(value||''))?String(value):'';
  const meta=f=>`${String(f?.type||'')} ${String(f?.preview_url||'')} ${String(f?.thumbnail_url||'')}`.toLowerCase();
  const isArtwork=f=>/printfile|print[_ -]?file|artwork|design|template|pattern|logo|digitization|inside|label|embroidery/.test(meta(f));
  const active=v=>{
    const status=String(v?.availability_status||'').toLowerCase();
    return !!v&&v.synced!==false&&v.is_ignored!==true&&status!=='inactive'&&status!=='discontinued'&&Number(v.sync_variant_id||0)>0;
  };
  const add=(out,u)=>{u=safeUrl(u);if(u&&!out.includes(u))out.push(u);};

  function variantParts(v,productName=''){
    const parts=String(v?.name||'').split(' / ').map(x=>x.trim()).filter(Boolean);
    let color=String(v?.color||'').trim();
    let size=String(v?.size||'').trim();
    if(!color){if(parts.length>=3)color=parts.at(-2)||'';else if(parts.length===2)color=parts[0]||'';}
    if(!size&&parts.length>=2)size=parts.at(-1)||'';
    color=color||'Default';
    size=size||'One Size';
    return{color,size,name:`${productName||parts[0]||'STARGIRLS PIECE'} / ${color} / ${size}`};
  }

  function imageCandidates(source,v){
    const out=[];
    add(out,source?.thumbnail_url);
    add(out,source?.image_url);
    for(const f of v?.files||[]){if(!isArtwork(f)&&/mockup|preview/.test(meta(f))){add(out,f.preview_url);add(out,f.thumbnail_url);}}
    add(out,v?.catalog_image);
    add(out,v?.product?.image);
    for(const f of v?.files||[]){if(!isArtwork(f)){add(out,f.preview_url);add(out,f.thumbnail_url);}}
    return out;
  }

  function normalizeVariant(v,source){
    const {color,size,name}=variantParts(v,source?.name||'');
    const price=Number(v?.retail_price);
    const images=imageCandidates(source,v);
    const primary=images[0]||safeUrl(source?.thumbnail_url)||'';
    const cleanFiles=(v?.files||[]).filter(f=>f&&!isArtwork(f)&&(f.preview_url||f.thumbnail_url));
    const files=primary
      ? [{preview_url:primary,thumbnail_url:primary,type:'mockup'},...cleanFiles.filter(f=>f.preview_url!==primary&&f.thumbnail_url!==primary)].slice(0,4)
      : cleanFiles.slice(0,4);
    return{
      ...v,name,color,size,
      price:Number.isFinite(price)?price:null,
      sku:v?.sku||`PF-${Number(v?.sync_variant_id||0)}`,
      printful_sync_variant_id:Number(v?.sync_variant_id||0),
      images,
      image:primary,
      files
    };
  }

  function normalizeProduct(source){
    const variants=(source?.variants||[]).filter(active).map(v=>normalizeVariant(v,source));
    const image=safeUrl(source?.thumbnail_url||source?.image_url)||variants.map(v=>v.image).find(Boolean)||'';
    return{...source,thumbnail_url:image||null,image_url:image||null,variants};
  }
  const normalize=data=>({...data,products:Array.isArray(data?.products)?data.products.map(normalizeProduct).filter(p=>p&&p.id&&p.variants.length):[]});

  function readCache(){
    try{
      const cached=JSON.parse(sessionStorage.getItem(CACHE_KEY)||'null');
      if(cached?.data&&Array.isArray(cached.data.products))return cached;
    }catch{}
    return null;
  }
  function save(data){
    state.data=data;state.ts=Date.now();window.__SG_PRINTFUL_CATALOG=data;
    try{sessionStorage.setItem(CACHE_KEY,JSON.stringify({ts:state.ts,data}));}catch{}
  }
  const responseFor=data=>new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

  async function getCatalog(){
    const now=Date.now();
    if(state.data&&now-state.ts<CLIENT_TTL)return state.data;
    const cached=readCache();
    if(cached&&now-Number(cached.ts||0)<CLIENT_TTL){save(cached.data);return cached.data;}
    if(state.promise)return state.promise;
    state.promise=(async()=>{
      try{
        const bucket=Math.floor(Date.now()/60000);
        const r=await nativeFetch(`${api}/printful/catalog?v=${bucket}`,{cache:'no-store',mode:'cors'});
        if(!r.ok)throw new Error(`Catalog ${r.status}`);
        const data=normalize(await r.json());
        save(data);
        return data;
      }catch(error){
        const stale=state.data||cached?.data;
        if(stale)return stale;
        throw error;
      }finally{state.promise=null;}
    })();
    return state.promise;
  }

  function isProductsRequest(input){
    const u=typeof input==='string'?input:(input&&input.url)||'';
    return /(?:^|\/)content\/products\.json(?:\?|$)/.test(u);
  }
  function isCatalogRequest(input){
    const u=typeof input==='string'?input:(input&&input.url)||'';
    return u.startsWith(`${api}/printful/catalog`);
  }

  window.fetch=async(input,init)=>{
    if(isCatalogRequest(input))return responseFor(await getCatalog());
    if(!isProductsRequest(input))return nativeFetch(input,init);

    const baseResponse=await nativeFetch(input,init);
    if(!baseResponse.ok)return baseResponse;
    try{
      const [base,catalog]=await Promise.all([baseResponse.clone().json(),getCatalog()]);
      const staticProducts=Array.isArray(base.products)?base.products.filter(p=>!p.printful_product_id):[];
      const liveProducts=(catalog.products||[]).map(source=>({
        id:`printful-${source.id}`,
        name:source.name||'STARGIRLS PIECE',
        category:inferCategory(source.name),
        status:'AVAILABLE',available:true,fulfillment:'printful',
        printful_product_id:Number(source.id),price_mode:'printful',
        image:source.thumbnail_url||source.image_url||'',
        variants:source.variants||[]
      }));
      return new Response(JSON.stringify({products:[...liveProducts,...staticProducts]}),{
        status:baseResponse.status,statusText:baseResponse.statusText,
        headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
      });
    }catch(error){
      console.warn('STARGIRLS live product sync:',error);
      return baseResponse;
    }
  };

  window.STARGIRLS_GET_PRINTFUL_CATALOG=getCatalog;
})();
