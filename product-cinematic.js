/* STARGIRLS product-page polish: simple hierarchy, Moon + Sun voice, no fake urgency. */
(()=>{
'use strict';
const app=document.getElementById('app');
if(!app)return;
const $=(s,r=document)=>r.querySelector(s);
let queued=false;
function eraCopy(name=''){
  const n=String(name).toLowerCase();
  if(/party\s*(?:till|til)\s*hell|\bpth\b/.test(n))return{label:'party till hell',world:'from PARTY TILL HELL.'};
  if(/hayati/.test(n))return{label:'hayati',world:'from HAYATI.'};
  if(/anew/.test(n))return{label:'anew',world:'from ANEW.'};
  if(/hoodie|pullover|sweatshirt|sweater/.test(n))return{label:'moon + sun',world:'the easy layer.'};
  if(/hat|cap/.test(n))return{label:'moon + sun',world:'put it on and go.'};
  return{label:'we made this',world:'ours.'};
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
  if(summaries[0]&&summaries[0].textContent.trim()!=='fit + details')summaries[0].textContent='fit + details';
  if(summaries[1]&&summaries[1].textContent.trim()!=='shipping + returns')summaries[1].textContent='shipping + returns';
}
function decorateRelated(){
  const related=$('.related-products',app);
  if(!related)return;
  const eyebrow=$('.related-eyebrow',related),heading=$('.related-head h2',related);
  if(eyebrow&&eyebrow.textContent!=='more stuff')eyebrow.textContent='more stuff';
  if(heading&&heading.textContent!=='also here.')heading.textContent='also here.';
  if(!$('.cinematic-world-invite',app)){
    related.insertAdjacentHTML('afterend','<section class="cinematic-world-invite"><small>moon + sun</small><h2>we\'re usually live.</h2><p>youtube / twitch / kick / discord</p><a href="links/">everything else →</a></section>');
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
    add.textContent='IN THE BAG';
    setTimeout(()=>{if(document.body.contains(add)){add.textContent=original;add.classList.remove('cinematic-confirmed')}},850);
  });
}
function apply(){decorateInfo();decorateRelated();wireAdd()}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
new MutationObserver(schedule).observe(app,{childList:true,subtree:true,characterData:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
})();