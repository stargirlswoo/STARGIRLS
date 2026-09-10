/* STARGIRLS product-page interaction polish: back link, mobile gallery arrows/dots, cleaner empty cart. */
(function(){
  let activeIndex=0;

  function enhanceInfo(){
    const inner=document.querySelector('.product-info-inner');
    if(!inner||inner.querySelector('.product-back-link'))return;
    inner.insertAdjacentHTML('afterbegin','<a class="product-back-link" href="index.html#catalog">← BACK TO SHOP</a>');
  }

  function galleryImages(){
    return [...document.querySelectorAll('[data-product-gallery] > img')];
  }

  function renderGalleryState(){
    const gallery=document.querySelector('[data-product-gallery]');
    if(!gallery)return;
    const imgs=galleryImages();
    if(!imgs.length)return;
    activeIndex=Math.max(0,Math.min(activeIndex,imgs.length-1));
    imgs.forEach((img,i)=>img.classList.toggle('sg-active-image',i===activeIndex));
    gallery.querySelectorAll('[data-gallery-dot]').forEach((dot,i)=>dot.classList.toggle('active',i===activeIndex));
  }

  function bindDotButtons(dots){
    dots.querySelectorAll('[data-gallery-dot]').forEach(b=>{
      b.onclick=()=>{
        activeIndex=Number(b.dataset.galleryDot)||0;
        renderGalleryState();
      };
    });
  }

  function enhanceGallery(){
    const gallery=document.querySelector('[data-product-gallery]');
    if(!gallery)return;
    const imgs=galleryImages();
    if(!imgs.length)return;

    let controls=gallery.querySelector('.product-gallery-controls');
    let dots=gallery.querySelector('.product-gallery-dots');
    if(!controls||!dots){
      gallery.insertAdjacentHTML('beforeend','<div class="product-gallery-controls"><button type="button" data-gallery-prev aria-label="Previous product image">‹</button><button type="button" data-gallery-next aria-label="Next product image">›</button></div><div class="product-gallery-dots" aria-label="Product image navigation"></div>');
      controls=gallery.querySelector('.product-gallery-controls');
      dots=gallery.querySelector('.product-gallery-dots');
      controls.querySelector('[data-gallery-prev]').onclick=()=>{
        const n=galleryImages().length;
        if(!n)return;
        activeIndex=(activeIndex-1+n)%n;
        renderGalleryState();
      };
      controls.querySelector('[data-gallery-next]').onclick=()=>{
        const n=galleryImages().length;
        if(!n)return;
        activeIndex=(activeIndex+1)%n;
        renderGalleryState();
      };
    }

    const existing=dots.querySelectorAll('[data-gallery-dot]').length;
    if(existing!==imgs.length){
      dots.innerHTML=imgs.map((_,i)=>`<button type="button" data-gallery-dot="${i}" aria-label="View product image ${i+1}"></button>`).join('');
      bindDotButtons(dots);
    }
    renderGalleryState();
  }

  function polishCart(){
    const box=document.querySelector('[data-cart-items]');
    if(!box||box.dataset.sgPolished==='1')return;
    if(/YOUR CART IS PAINFULLY EMPTY|YOUR CART IS EMPTY/i.test(box.textContent||'')){
      box.innerHTML='<div class="sg-empty-cart"><strong>Your cart is empty</strong><p>Time to fill it up.</p><a href="index.html#catalog">CONTINUE SHOPPING →</a></div>';
      box.dataset.sgPolished='1';
    }
  }

  function apply(){
    enhanceInfo();
    enhanceGallery();
    polishCart();
  }

  const info=document.querySelector('[data-product-info]');
  const gallery=document.querySelector('[data-product-gallery]');
  const cart=document.querySelector('[data-cart-items]');

  if(info)new MutationObserver(apply).observe(info,{childList:true});
  if(gallery)new MutationObserver(()=>{activeIndex=0;apply();}).observe(gallery,{childList:true});
  if(cart)new MutationObserver(polishCart).observe(cart,{childList:true});

  apply();
})();
