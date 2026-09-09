/* Hard guard: never show shared HAYATI artwork as merch imagery. */
(function(){
  const API=window.STARGIRLS_STORE_API||'';
  const HAYATI={
    'hayati-tee':468830207,
    'hayati-pullover':468828029
  };
  if(!API)return;

  const norm=u=>{try{return new URL(String(u),location.href).href}catch{return String(u||'')}};
  const artMeta=f=>/printfile|print[_ -]?file|embroidery|inside|label|template|pattern|logo|design|digitization|artwork/.test(`${f?.type||''} ${f?.preview_url||''}`.toLowerCase());
  const urlsFor=raw=>{
    const out=[];
    if(raw?.thumbnail_url)out.push(raw.thumbnail_url);
    for(const v of raw?.variants||[])for(const f of v?.files||[])if(f?.preview_url)out.push(f.preview_url);
    return [...new Set(out.map(norm).filter(Boolean))];
  };
  const safeFor=raw=>{
    const out=[];
    for(const v of raw?.variants||[])for(const f of v?.files||[])if(f?.preview_url&&!artMeta(f))out.push(norm(f.preview_url));
    return [...new Set(out.filter(Boolean))];
  };

  let blocked=new Set(),safeById={};

  function removeBlockedProductImages(){
    const id=new URLSearchParams(location.search).get('id');
    if(!HAYATI[id]||!blocked.size)return;
    document.querySelectorAll('[data-product-gallery] img').forEach(img=>{
      if(blocked.has(norm(img.src)))img.remove();
    });
  }

  function fixHomeCards(){
    if(!blocked.size)return;
    for(const id of Object.keys(HAYATI)){
      const card=document.querySelector(`[data-product-card="${id}"]`);
      if(!card)continue;
      const hero=card.querySelector('[data-main-image]');
      if(!hero)continue;
      const m=hero.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/i);
      const current=m?norm(m[1]):'';
      if(current&&blocked.has(current)){
        const replacement=(safeById[id]||[]).find(u=>!blocked.has(u));
        if(replacement)hero.style.backgroundImage=`url("${replacement}")`;
        else hero.style.backgroundImage='none';
      }
    }
  }

  function scrub(){removeBlockedProductImages();fixHomeCards();}

  async function init(){
    try{
      const r=await fetch(`${API}/printful/catalog`,{cache:'no-store'});
      if(!r.ok)return;
      const data=await r.json();
      const tee=(data.products||[]).find(p=>Number(p.id)===HAYATI['hayati-tee']);
      const pullover=(data.products||[]).find(p=>Number(p.id)===HAYATI['hayati-pullover']);
      if(!tee||!pullover)return;
      const teeUrls=new Set(urlsFor(tee));
      const pullUrls=new Set(urlsFor(pullover));
      blocked=new Set([...teeUrls].filter(u=>pullUrls.has(u)));
      safeById['hayati-tee']=safeFor(tee);
      safeById['hayati-pullover']=safeFor(pullover);
      scrub();
      new MutationObserver(scrub).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','src']});
    }catch(e){console.warn('HAYATI image guard:',e)}
  }
  init();
})();
