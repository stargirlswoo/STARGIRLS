/* STARGIRLS purchase reward hint. Actual points are granted only after Stripe verification. */
(()=>{
'use strict';
const app=document.getElementById('app');if(!app)return;
const BALANCE_KEY='stargirls-stardust-balance-v1';
const LEGACY_KEYS=['stargirls-starfart-balance-v1','stargirls-starfall-balance-v1'];
const SIDE_KEY='stargirls-side-v1';
const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v??f}catch{return f}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
function migrate(){if(localStorage.getItem(BALANCE_KEY)!==null)return;for(const key of LEGACY_KEYS){const v=Math.max(0,Number(read(key,0))||0);if(v>0){write(BALANCE_KEY,v);break}}}
function dollars(){const text=app.querySelector('.price')?.textContent||'';const n=Number(text.replace(/[^0-9.]/g,''));return Number.isFinite(n)?n:0}
function sideLabel(v){return v==='moon'?'☾ MOON SIDE':v==='sun'?'☀ SUN SIDE':v==='joint'?'☀☾ JOINT CUSTODY':''}
function style(){if(document.getElementById('product-reward-style'))return;const s=document.createElement('style');s.id='product-reward-style';s.textContent='.product-reward-hint{margin:-4px 0 20px;padding:12px 13px;border:1px solid #ddd;background:#fafafa;display:flex;justify-content:space-between;gap:16px;align-items:center;font-size:9px;line-height:1.4}.product-reward-hint strong{font-size:10px;letter-spacing:.05em}.product-reward-hint span{color:#666;text-align:right}.product-side-checkin{font-size:9px;font-weight:900;letter-spacing:.07em;color:#5f35ff;margin:0 0 12px}.remembered-choice{margin:0 0 14px;padding:9px 11px;background:#f4f1ff;color:#4f31cf;font-size:9px;font-weight:900;letter-spacing:.05em}@media(max-width:520px){.product-reward-hint{align-items:flex-start;flex-direction:column}.product-reward-hint span{text-align:left}}';document.head.appendChild(s)}
function apply(){migrate();style();const info=app.querySelector('.product-info'),price=info?.querySelector('.price');if(!info||!price)return;const pts=Math.floor(dollars()),balance=Math.max(0,Number(read(BALANCE_KEY,0))||0);let hint=info.querySelector('.product-reward-hint');if(!hint){hint=document.createElement('div');hint.className='product-reward-hint';price.insertAdjacentElement('afterend',hint)}hint.innerHTML=`<strong>EARN ${pts} STARDUST ✨</strong><span>$1 spent = 1 Stardust after verified purchase · balance ${balance}</span>`;const side=sideLabel(String(localStorage.getItem(SIDE_KEY)||''));let check=info.querySelector('.product-side-checkin');if(side&&!check){check=document.createElement('div');check.className='product-side-checkin';check.textContent=`${side} CHECKED IN ★`;info.querySelector('.product-title')?.insertAdjacentElement('beforebegin',check)}else if(check&&!side)check.remove();}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
new MutationObserver(schedule).observe(app,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
})();