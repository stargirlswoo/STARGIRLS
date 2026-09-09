/* Personality lives in commerce moments, not extra pages. */
(function(){
  const polish=()=>{
    document.querySelectorAll('.cart-empty').forEach(el=>{
      el.innerHTML='<strong>GIRL. YOU CAME ALL THE WAY HERE FOR WHAT?</strong><p>Your cart is painfully empty.</p><a href="#catalog" data-empty-shop>FIX THAT →</a>';
    });
    document.querySelectorAll('[data-empty-shop]').forEach(a=>a.addEventListener('click',()=>{if(typeof closeCart==='function')closeCart();}));
    document.querySelectorAll('.catalog-status').forEach(el=>{
      const text=el.textContent.trim().toUpperCase();
      if(text==='SOLD OUT')el.textContent='Y’ALL ACTUALLY BOUGHT ALL OF THEM 😭';
      if(text==='COMING SOON')el.textContent='COMING SOON ★';
    });
  };
  const oldToast=window.showToast;
  if(typeof oldToast==='function') window.showToast=function(message){return oldToast.call(this,message==='ADDED TO CART ★'?'GOOD CHOICE ★':message);};
  try{showToast=window.showToast;}catch(e){}
  const oldCart=window.renderCart;
  if(typeof oldCart==='function') window.renderCart=function(){const r=oldCart.apply(this,arguments);requestAnimationFrame(polish);return r;};
  try{renderCart=window.renderCart;}catch(e){}
  const oldProducts=window.renderProducts;
  if(typeof oldProducts==='function') window.renderProducts=function(){const r=oldProducts.apply(this,arguments);requestAnimationFrame(polish);return r;};
  try{renderProducts=window.renderProducts;}catch(e){}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',polish);else polish();
})();
