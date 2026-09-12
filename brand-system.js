(()=>{
'use strict';

const norm=value=>String(value||'').trim();
const sideLabel=side=>side==='moon'?'☾ moon':side==='sun'?'☀ sun':'moon + sun';

const rules=[
  {test:/^STARGIRLS\s+Tee$/i,title:'STARGIRLS TEE',side:'joint',tagline:'the one with our name on it.'},
  {test:/^STARGIRLS\s+Hoodie$/i,title:'STARGIRLS HOODIE',side:'joint',tagline:'the hoodie that keeps ending up on the chair and back on us.'},
  {test:/^STARGIRLS\s+Hat$/i,title:'STARGIRLS CAP',side:'joint',tagline:'stargirls on your head. that is basically it.'},
  {test:/^ANEW\s+Tee$/i,title:'ANEW TEE',side:'joint',tagline:'from ANEW.'},
  {test:/^ANEW\s+Hoodie$/i,title:'ANEW HOODIE',side:'joint',tagline:'from ANEW. warmer.'},
  {test:/^PARTY\s+TILL\s+HELL\s+Tee$/i,title:'PTH TEE',side:'joint',tagline:'PARTY TILL HELL on a tee.'},
  {test:/^PARTY\s+TILL\s+HELL\s+Hoodie$/i,title:'PTH HOODIE',side:'joint',tagline:'PARTY TILL HELL. for when it gets cold way too late.'},
  {test:/^HAYATI\s+Tee$/i,title:'HAYATI TEE',side:'joint',tagline:'HAYATI, but wearable.'},
  {test:/^HAYATI\s+Hoodie$/i,title:'HAYATI HOODIE',side:'joint',tagline:'HAYATI, but warmer.'},
  {test:/STARGIRLS\s+UNIFORM.*CROPPED\s+TEE/i,title:'THE CROP',side:'moon',tagline:'moon. fitted, simple, goes with almost everything.'},
  {test:/^IVY\s+Bikini\s+Top$/i,title:'IVY BIKINI TOP',side:'moon',tagline:'moon. clean lines, tiny details.'},
  {test:/^HUNT\s+Women(?:’|'|’)s\s+slides$/i,title:"HUNT SLIDES — WOMEN'S",side:'sun',tagline:'sun. put them on and go.'},
  {test:/^HUNT\s+Men(?:’|'|’)s\s+slides$/i,title:"HUNT SLIDES — MEN'S",side:'sun',tagline:'sun. put them on and go.'},
  {test:/^HUNT\s+Flip-Flops$/i,title:'HUNT FLIP-FLOPS',side:'sun',tagline:'sun. easy enough for the outfit that was not supposed to work.'},
  {test:/^HUNT\s+Bandeau\s+Top$/i,title:'HUNT BANDEAU',side:'sun',tagline:'sun. tiny top, big pants.'},
  {test:/^HUNT\s+Bikini\s+Bottom$/i,title:'HUNT BIKINI BOTTOM',side:'sun',tagline:'sun. the piece that finishes it.'},
  {test:/^VENOM\s+KISS\s+Bandeau\s+Top$/i,title:'VENOM KISS BANDEAU',side:'sun',tagline:'sun. not really a blending-in top.'},
  {test:/^VENOM\s+KISS\s+Swimsuit$/i,title:'VENOM KISS ONE-PIECE',side:'sun',tagline:'sun. the whole look is basically handled.'}
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
  return{raw,title:cleanTitle(raw||'STARGIRLS PIECE'),side,label:sideLabel(side),tagline:side==='moon'?'moon. pretty, specific, easy to wear.':side==='sun'?'sun. the look does the explaining.':'ours.'};
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