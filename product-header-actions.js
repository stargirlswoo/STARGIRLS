/* Functional product-page header controls. */
(()=>{
  'use strict';
  const API='https://stargirls.stargirlswoo.workers.dev';
  const backdrop=document.getElementById('productHeaderBackdrop');
  const panels=[...document.querySelectorAll('.product-header-panel')];
  const menuBtn=document.getElementById('productMenuOpen');
  const searchBtn=document.getElementById('productSearchOpen');
  const worldBtn=document.getElementById('productWorldOpen');
  const searchInput=document.getElementById('productSearchInput');
  const searchResults=document.getElementById('productSearchResults');
  const cartBtn=document.getElementById('cartOpen');
  let catalog=[];
  let catalogPromise=null;

  const closeAll=()=>{panels.forEach(p=>p.classList.remove('open'));backdrop?.classList.remove('open');document.body.classList.remove('product-overlay-open');};
  const openPanel=id=>{closeAll();const panel=document.getElementById(id);if(!panel)return;panel.classList.add('open');backdrop?.classList.add('open');document.body.classList.add('product-overlay-open');};

  menuBtn?.addEventListener('click',()=>openPanel('productNavPanel'));
  searchBtn?.addEventListener('click',async()=>{openPanel('productSearchPanel');setTimeout(()=>searchInput?.focus(),80);if(!catalog.length)await loadCatalog();renderSearch(searchInput?.value||'');});
  worldBtn?.addEventListener('click',()=>openPanel('productWorldPanel'));
  backdrop?.addEventListener('click',closeAll);
  document.querySelectorAll('[data-product-panel-close]').forEach(btn=>btn.addEventListener('click',closeAll));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll();});

  cartBtn?.addEventListener('click',()=>{document.getElementById('cart')?.classList.add('open');document.getElementById('cartBackdrop')?.classList.add('open');});

  const safe=u=>/^https:\/\//i.test(String(u||''))?String(u):'';
  const money=n=>Number.isFinite(Number(n))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)):'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const brandMeta=p=>window.STARGIRLS_BRAND?.productMeta?.(p?.name||'')||{title:String(p?.name||'STARGIRLS PIECE').toUpperCase(),label:'☀☾ JOINT CUSTODY'};
  const productHref=p=>{if(p?.href)return p.href;const id=Number(p?.id||0);return id?`product.html?id=printful-${id}&pf=${id}`:'shop.html';};
  const productImage=p=>safe(p?.thumbnail_url)||safe(p?.image_url)||safe(p?.image)||'';
  const productPrice=p=>{const prices=(p?.variants||[]).map(v=>Number(v?.price??v?.retail_price)).filter(Number.isFinite);if(prices.length)return Math.min(...prices);return Number.isFinite(Number(p?.price))?Number(p.price):null;};

  async function loadCatalog(){
    if(catalogPromise)return catalogPromise;
    catalogPromise=(async()=>{
      const merged=[];
      try{
        const ctrl=new AbortController();
        const timer=setTimeout(()=>ctrl.abort(),4000);
        const r=await fetch(`${API}/printful/catalog?v=header-search-${Date.now()}`,{cache:'no-store',signal:ctrl.signal});
        clearTimeout(timer);
        if(r.ok){const d=await r.json();if(Array.isArray(d?.products))merged.push(...d.products);}
      }catch{}
      try{
        const r=await fetch('content/products.json?header-search=1',{cache:'no-store'});
        if(r.ok){const d=await r.json();if(Array.isArray(d?.products))merged.push(...d.products);}
      }catch{}
      const seen=new Set();
      catalog=merged.filter(p=>{const key=String(p?.id||p?.name||'').toLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true;});
      return catalog;
    })();
    return catalogPromise;
  }

  function renderSearch(term){
    if(!searchResults)return;
    const q=String(term||'').trim().toLowerCase();
    if(!catalog.length){searchResults.innerHTML='<div class="product-search-loading">No products loaded yet.</div>';return;}
    const matches=catalog.filter(p=>{const meta=brandMeta(p);return !q||String(p?.name||'').toLowerCase().includes(q)||meta.title.toLowerCase().includes(q)||meta.label.toLowerCase().includes(q)||String(p?.category||'').toLowerCase().includes(q);}).slice(0,12);
    if(!matches.length){searchResults.innerHTML='<div class="product-search-empty">No matching pieces. Try “hoodie”, “tee”, “swim”, “Moon”, “Sun”, or “JUNO”.</div>';return;}
    searchResults.innerHTML=matches.map(p=>{
      const img=productImage(p),price=productPrice(p),meta=brandMeta(p);
      return `<a class="product-search-result" href="${productHref(p)}">${img?`<img src="${esc(img)}" alt="" loading="lazy">`:'<div class="product-search-thumb"></div>'}<span><strong>${esc(meta.title)}</strong><small>${price!=null?money(price):esc(meta.label)}</small></span></a>`;
    }).join('');
  }
  searchInput?.addEventListener('input',()=>renderSearch(searchInput.value));
})();
