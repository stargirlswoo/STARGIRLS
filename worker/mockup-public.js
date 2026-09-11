function authHeaders(env){
  if(!env.PRINTFUL_API_TOKEN)throw new Error('PRINTFUL_API_TOKEN is not configured');
  const headers={Authorization:`Bearer ${env.PRINTFUL_API_TOKEN}`,Accept:'application/json','Content-Type':'application/json'};
  if(env.PRINTFUL_STORE_ID)headers['X-PF-Store-Id']=String(env.PRINTFUL_STORE_ID);
  return headers;
}

async function pf(path,env,init={}){
  const response=await fetch(`https://api.printful.com${path}`,{
    ...init,
    headers:{...authHeaders(env),...(init.headers||{})}
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||Number(data?.code||response.status)>=400){
    const message=data?.error?.message||data?.result||`Printful mockup request failed (${response.status})`;
    const error=new Error(String(message));
    error.status=response.status;
    throw error;
  }
  return data;
}

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const active=v=>{
  const status=String(v?.availability_status||'').toLowerCase();
  return !!v&&v.synced!==false&&v.is_ignored!==true&&status!=='inactive'&&status!=='discontinued'&&Number(v.variant_id||0)>0;
};
const colorOf=v=>String(v?.color||'').trim()||'Default';
const placementOf=file=>{
  const type=String(file?.type||'default').trim().toLowerCase();
  if(type==='default')return'front';
  if(/^front(?:_|$)/.test(type))return type;
  if(/^back(?:_|$)/.test(type))return type;
  return'';
};
const sourceUrl=file=>{
  const value=String(file?.url||file?.preview_url||'').trim();
  return /^https:\/\//i.test(value)?value:'';
};

function printFilesFor(variant){
  const out=[];
  const seen=new Set();
  for(const file of variant?.files||[]){
    const placement=placementOf(file);
    const image_url=sourceUrl(file);
    if(!placement||!image_url)continue;
    const key=`${placement}|${image_url}`;
    if(seen.has(key))continue;
    seen.add(key);
    out.push({placement,image_url});
  }
  return out;
}

function groupRepresentatives(variants){
  const byColor=new Map();
  for(const variant of variants){
    const color=colorOf(variant);
    if(!byColor.has(color))byColor.set(color,variant);
  }
  const groups=new Map();
  for(const [color,variant] of byColor){
    const files=printFilesFor(variant);
    if(!files.length)continue;
    const signature=JSON.stringify(files);
    if(!groups.has(signature))groups.set(signature,{files,items:[]});
    groups.get(signature).items.push({color,variant});
  }
  return [...groups.values()];
}

async function startTask(catalogProductId,variantIds,files,env){
  const base={variant_ids:variantIds,format:'jpg',width:1200,files};
  try{
    return await pf(`/mockup-generator/create-task/${encodeURIComponent(catalogProductId)}`,env,{
      method:'POST',
      body:JSON.stringify({...base,option_groups:['Flat']})
    });
  }catch(error){
    if(Number(error?.status)!==400)throw error;
    return pf(`/mockup-generator/create-task/${encodeURIComponent(catalogProductId)}`,env,{
      method:'POST',
      body:JSON.stringify(base)
    });
  }
}

async function awaitTask(task,env){
  let result=task?.result||{};
  if(result.status==='completed')return result;
  const key=String(result.task_key||'');
  if(!key)throw new Error('Printful did not return a mockup task key');
  for(let i=0;i<10;i++){
    await sleep(i<3?450:700);
    const response=await pf(`/mockup-generator/task?task_key=${encodeURIComponent(key)}`,env);
    result=response?.result||{};
    if(result.status==='completed')return result;
    if(result.status==='failed')throw new Error(result.error||'Printful mockup generation failed');
  }
  throw new Error('Printful mockup generation timed out');
}

function preferredUrl(mockup){
  const extras=Array.isArray(mockup?.extra)?mockup.extra:[];
  const flat=extras.find(item=>/flat/i.test(String(item?.option_group||''))&&/^https:\/\//i.test(String(item?.url||'')));
  if(flat)return String(flat.url);
  const direct=String(mockup?.mockup_url||'');
  if(/^https:\/\//i.test(direct))return direct;
  const any=extras.find(item=>/^https:\/\//i.test(String(item?.url||'')));
  return any?String(any.url):'';
}

function placementRank(value){
  const p=String(value||'').toLowerCase();
  if(/^front/.test(p))return 0;
  if(/^back/.test(p))return 1;
  return 2;
}

async function generate(syncProductId,env){
  const details=await pf(`/store/products/${encodeURIComponent(syncProductId)}`,env);
  const syncProduct=details?.result?.sync_product||{};
  const variants=(details?.result?.sync_variants||[]).filter(active);
  if(!variants.length)throw new Error('No active Printful variants found');

  const catalogProductId=Number(variants.find(v=>Number(v?.product?.product_id||0)>0)?.product?.product_id||0);
  if(!catalogProductId)throw new Error('Could not determine Printful catalog product');

  const groups=groupRepresentatives(variants);
  const rows=[];
  for(const group of groups){
    const variantIds=group.items.map(item=>Number(item.variant.variant_id)).filter(Boolean);
    if(!variantIds.length)continue;
    const task=await startTask(catalogProductId,variantIds,group.files,env);
    const result=await awaitTask(task,env);
    const colorByVariant=new Map(group.items.map(item=>[Number(item.variant.variant_id),item.color]));
    for(const mockup of result?.mockups||[]){
      const url=preferredUrl(mockup);
      if(!url)continue;
      const colors=new Set();
      for(const id of mockup?.variant_ids||[]){
        const color=colorByVariant.get(Number(id));
        if(color)colors.add(color);
      }
      if(!colors.size)for(const item of group.items)colors.add(item.color);
      for(const color of colors){
        rows.push({color,placement:String(mockup?.placement||'').toLowerCase()||'extra',url});
      }
    }
  }

  const unique=[];
  const seen=new Set();
  for(const row of rows.sort((a,b)=>placementRank(a.placement)-placementRank(b.placement))){
    const key=`${row.color}|${row.placement}|${row.url}`;
    if(seen.has(key))continue;
    seen.add(key);
    unique.push(row);
  }
  const colors={};
  for(const row of unique){
    (colors[row.color]||(colors[row.color]=[])).push({placement:row.placement,url:row.url});
  }
  return {
    product_id:Number(syncProductId),
    name:String(syncProduct?.name||''),
    generated_at:new Date().toISOString(),
    colors,
    mockups:unique
  };
}

const CACHE_HOURS=6;
const keyFor=id=>`printful:product-mockups:v1:${id}`;

export async function getPublicPrintfulMockups(syncProductId,env){
  const id=Number(syncProductId||0);
  if(!Number.isInteger(id)||id<=0)throw new Error('Invalid Printful product id');
  const kv=env.STARGIRLS_PRODUCTS||null;
  if(kv){
    try{
      const cached=await kv.get(keyFor(id),'json');
      if(cached&&Array.isArray(cached.mockups)&&cached.mockups.length)return cached;
    }catch(error){console.warn('STARGIRLS mockup KV read',error);}
  }
  const payload=await generate(id,env);
  if(kv&&payload.mockups.length){
    try{await kv.put(keyFor(id),JSON.stringify(payload),{expirationTtl:CACHE_HOURS*60*60});}
    catch(error){console.warn('STARGIRLS mockup KV write',error);}
  }
  return payload;
}
