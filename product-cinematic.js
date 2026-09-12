/* STARGIRLS product-page polish: simple hierarchy, Moon + Sun voice, no fake urgency. */
(()=>{
'use strict';
const app=document.getElementById('app');
if(!app)return;
const $=(s,r=document)=>r.querySelector(s);
let queued=false;
function eraCopy(name=''){
  const n=String(name).toLowerCase();
  if(/party\s*(?:till|til)\s*hell/.test(n))return{label:'MOON + SUN // PARTY TILL HELL',world:'We made it. Wear it however you want.'};
  if(/hayati/.test(n))return{label:'MOON + SUN // HAYATI',world:'Yes, we put the song on something you can wear.'};
  if(/anew/.test(n))return{label:'MOON + SUN // ANEW',world:'From ANEW. Still part of us.'};
  if(/hoodie|pullover|sweatshirt|sweater/.test(n))return{label:'STARGIRLS // CORE',world:'The kind of thing you throw on and keep.'};
  if(/hat|cap/.test(n))return{label:'STARGIRLS // CORE',world:'Put it on and go.'};
  return{label:'MOON + SUN MADE THIS',world:'If it feels like you, take it.'};
}
function decorateInfo(){
  const info=$('.product-info',app),title=$('.product-title',info||document),price=$('.price',info||document),desire=$('.product-desire-line',info||document);
  if(!info||!title)return;
  const copy=eraCopy(title.dataset.sgRawTitle||title.textContent);
  let kicker=$('.cinematic-kicker',info);
  if(!kicker){kicker=document.createElement('div');kicker.className='cinematic-kicker';title.insertAdjacentElement('beforebegin',kicker)}
  if(kicker.textContent!==copy.label)kicker.textContent=copy.label;
  let row=$('.cinematic-title-row',info);
  if(!row){row=document.createElement('div');row.className='cinematic-title-row';title.parentNode.insertBefore(row,title);row.appendChild(title)}
  const save=$('.product-save',info);
  if(save){
    if(save.parentElement!==row)row.appendChild(save);
    const saved=save.classList.contains('saved');
    const symbol=saved?'♥':'♡';
    if(save.textContent.trim()!==symbol)save.textContent=symbol;
    save.setAttribute('aria-label',saved?'Remove from saved':'Save for later');
    save.setAttribute('title',saved?'Saved':'Save for later');
  }
  if(price&&price.parentElement===info&&row.nextElementSibling!==price)row.insertAdjacentElement('afterend',price);
  if(price&&desire&&price.nextElementSibling!==desire)price.insertAdjacentElement('afterend',desire);
  const security=$('.purchase-security-line',info);
  if(security&&security.textContent!=='Secure checkout · Shipping shown before you pay')security.textContent='Secure checkout · Shipping shown before you pay';
  let world=$('.cinematic-era-line',info);
  if(!world&&security){world=document.createElement('div');world.className='cinematic-era-line';security.insertAdjacentElement('afterend',world)}
  if(world&&world.textContent!==copy.world)world.textContent=copy.world;
  const summaries=info.querySelectorAll('.product-details summary');
  if(summaries[0]&&summaries[0].textContent.trim()!=='FIT + DETAILS')summaries[0].textContent='FIT + DETAILS';
}
function decorateRelated(){
  const related=$('.related-products',app);
  if(!related)return;
  const eyebrow=$('.related-eyebrow',related),heading=$('.related-head h2',related);
  if(eyebrow&&eyebrow.textContent!=='IF YOU WANT ANOTHER ONE')eyebrow.textContent='IF YOU WANT ANOTHER ONE';
  if(heading&&heading.textContent!=='You might like these too.')heading.textContent='You might like these too.';
  if(!$('.cinematic-world-invite',app)){
    related.insertAdjacentHTML('afterend','<section class="cinematic-world-invite"><small>YOU DO NOT HAVE TO KEEP SHOPPING ★</small><h2>COME HANG OUT INSTEAD.</h2><p>The store is one part of STARGIRLS. The lives, music, jokes and group chat are the rest.</p><a href="https://discord.gg/yKSeYDfZxN" target="_blank" rel="noopener">GET IN THE GROUP CHAT ★</a></section>');
  }
}
function wireAdd(){
  const add=$('#add',app);
  if(!add||add.dataset.cinematicWired==='1')return;
  add.dataset.cinematicWired='1';
  add.addEventListener('click',()=>{
    if(add.disabled)return;
    add.classList.add('cinematic-confirmed');
    const original='ADD TO CART';
    add.textContent='IN THE BAG ★';
    setTimeout(()=>{if(document.body.contains(add)){add.textContent=original;add.classList.remove('cinematic-confirmed')}},850);
  });
}
function apply(){decorateInfo();decorateRelated();wireAdd()}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
new MutationObserver(schedule).observe(app,{childList:true,subtree:true,characterData:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
})();