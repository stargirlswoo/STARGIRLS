(()=>{
'use strict';

const norm=value=>String(value||'').trim();
const sideLabel=side=>side==='moon'?'☾ MOON SIDE':side==='sun'?'☀ SUN SIDE':'☀☾ JOINT CUSTODY';

const rules=[
  {test:/^STARGIRLS\s+Tee$/i,title:'STARGIRLS CORE TEE',side:'joint',tagline:'No side required. This one belongs to everybody.'},
  {test:/^STARGIRLS\s+Hoodie$/i,title:'STARGIRLS CORE HOODIE',side:'joint',tagline:'The easy layer. Wear it however you want.'},
  {test:/^STARGIRLS\s+Hat$/i,title:'STARGIRLS CAP',side:'joint',tagline:'Put it on and keep moving.'},
  {test:/^ANEW\s+Tee$/i,title:'ANEW TEE',side:'joint',tagline:'From ANEW. Still in rotation.'},
  {test:/^ANEW\s+Hoodie$/i,title:'ANEW HOODIE',side:'joint',tagline:'ANEW, but built for nights that run late.'},
  {test:/^PARTY\s+TILL\s+HELL\s+Tee$/i,title:'PARTY TILL HELL TEE',side:'joint',tagline:'Wear the night out.'},
  {test:/^PARTY\s+TILL\s+HELL\s+Hoodie$/i,title:'PARTY TILL HELL HOODIE',side:'joint',tagline:'For when the night gets cold and nobody is going home.'},
  {test:/^HAYATI\s+Tee$/i,title:'HAYATI TEE',side:'joint',tagline:'The song, on a shirt.'},
  {test:/^HAYATI\s+Hoodie$/i,title:'HAYATI HOODIE',side:'joint',tagline:'Play HAYATI. Put this on. Leave late.'},
  {test:/STARGIRLS\s+UNIFORM.*CROPPED\s+TEE/i,title:'THE UNIFORM CROP',side:'moon',tagline:'Moon Side. Fitted, simple, meant to be worn on repeat.'},
  {test:/^IVY\s+Bikini\s+Top$/i,title:'IVY BIKINI TOP',side:'moon',tagline:'Moon Side. Soft shape, clean lines, easy to style.'},
  {test:/^HUNT\s+Women(?:’|'|’)s\s+slides$/i,title:"HUNT SLIDES — WOMEN'S",side:'sun',tagline:'Sun Side. Put them on and keep moving.'},
  {test:/^HUNT\s+Men(?:’|'|’)s\s+slides$/i,title:"HUNT SLIDES — MEN'S",side:'sun',tagline:'Sun Side. Put them on and keep moving.'},
  {test:/^HUNT\s+Flip-Flops$/i,title:'HUNT FLIP-FLOPS',side:'sun',tagline:'Sun Side. Easy, loud enough, no explanation needed.'},
  {test:/^HUNT\s+Bandeau\s+Top$/i,title:'HUNT BANDEAU',side:'sun',tagline:'Sun Side. Small top. Strong attitude.'},
  {test:/^HUNT\s+Bikini\s+Bottom$/i,title:'HUNT BIKINI BOTTOM',side:'sun',tagline:'Sun Side. Built to finish the look.'},
  {test:/^VENOM\s+KISS\s+Bandeau\s+Top$/i,title:'VENOM KISS BANDEAU',side:'sun',tagline:'Sun Side. The point is not to blend in.'},
  {test:/^VENOM\s+KISS\s+Swimsuit$/i,title:'VENOM KISS ONE-PIECE',side:'sun',tagline:'Sun Side. One piece. Whole look.'}
];

function cleanTitle(name){
  return norm(name).replace(/\bUnisex\b/gi,'').replace(/\s{2,}/g,' ').trim().toUpperCase();
}

function productMeta(name){
  const raw=norm(name);
  const hit=rules.find(rule=>rule.test.test(raw));
  if(hit)return{raw,title:hit.title,side:hit.side,label:sideLabel(hit.side),tagline:hit.tagline};
  let side='joint';
  if(/\b(?:HUNT|VENOM KISS)\b/i.test(raw))side='sun';
  else if(/\b(?:IVY|CROP|CROPPED)\b/i.test(raw))side='moon';
  return{raw,title:cleanTitle(raw||'STARGIRLS PIECE'),side,label:sideLabel(side),tagline:side==='moon'?'Moon Side. Pretty on purpose.':side==='sun'?'Sun Side. Built to get noticed.':'No side required.'};
}

window.STARGIRLS_BRAND={productMeta,sideLabel};

const app=document.getElementById('app');
if(!app)return;
const cartRoot=document.getElementById('cartItems');
let scheduled=false;
let waitTimer=null;

function retitle(el){
  if(!el)return;
  const source=el.dataset.sgRawTitle||el.textContent.trim();
  if(!el.dataset.sgRawTitle)el.dataset.sgRawTitle=source;
  const next=productMeta(source).title;
  if(el.textContent.trim()!==next)el.textContent=next;
}

function applyProductPage(){
  const title=app.querySelector('.product-title');
  if(!title)return;
  if(!window.STARGIRLS_PRODUCT_MEDIA){
    clearTimeout(waitTimer);
    waitTimer=setTimeout(schedule,80);
    return;
  }
  const raw=title.dataset.sgRawTitle||title.textContent.trim();
  if(!title.dataset.sgRawTitle)title.dataset.sgRawTitle=raw;
  const meta=productMeta(raw);
  if(title.textContent.trim()!==meta.title)title.textContent=meta.title;
  document.title=`${meta.title} — STARGIRLS`;

  let pill=app.querySelector('.brand-side-pill');
  if(!pill){
    pill=document.createElement('div');
    pill.className='brand-side-pill';
    const row=app.querySelector('.cinematic-title-row');
    (row||title).insertAdjacentElement('beforebegin',pill);
  }
  pill.dataset.side=meta.side;
  if(pill.textContent!==meta.label)pill.textContent=meta.label;

  const desire=app.querySelector('.product-desire-line');
  if(desire&&desire.textContent.trim()!==meta.tagline)desire.textContent=meta.tagline;

  app.querySelectorAll('.related-copy strong').forEach(retitle);
  cartRoot?.querySelectorAll('.cart-line-copy strong').forEach(retitle);
}

function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;applyProductPage();});
}

new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
if(cartRoot)new MutationObserver(schedule).observe(cartRoot,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
})();