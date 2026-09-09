/* Dedicated STARGIRLS product-page navigation + curated storefront color choices. */
(function(){
  const priority=[/black/i,/white/i,/heather|grey|gray|ash/i,/pink|blue|green|navy|burgundy|red/i];
  function curate(card){
    const buttons=[...card.querySelectorAll('[data-color-option]')];
    if(buttons.length<=4)return;
    const chosen=[];
    for(const rule of priority){const hit=buttons.find(b=>rule.test(b.dataset.color||b.textContent||'')&&!chosen.includes(b));if(hit)chosen.push(hit);}
    for(const b of buttons)if(chosen.length<4&&!chosen.includes(b))chosen.push(b);
    buttons.forEach(b=>b.hidden=!chosen.includes(b));
  }
  function apply(){
    document.querySelectorAll('[data-product-card]').forEach(card=>{
      curate(card);
      const id=card.dataset.productCard;
      if(!id||card.dataset.productLinked==='1')return;
      card.dataset.productLinked='1';
      const go=()=>location.href=`product.html?id=${encodeURIComponent(id)}`;
      const image=card.querySelector('[data-main-image]');
      if(image){image.style.cursor='pointer';image.setAttribute('aria-label',`Open ${id.replaceAll('-',' ')} product page`);image.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();go();},{capture:true});}
      const title=card.querySelector('.catalog-meta strong');
      if(title){title.style.cursor='pointer';title.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();go();});}
    });
  }
  const obs=new MutationObserver(apply);const grid=document.querySelector('[data-product-grid]');if(grid)obs.observe(grid,{childList:true,subtree:true});apply();
})();
