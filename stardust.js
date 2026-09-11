(()=>{
'use strict';
const BALANCE_KEY='stargirls-stardust-balance-v1';
const LEGACY_KEYS=['stargirls-starfart-balance-v1','stargirls-starfall-balance-v1'];
const DISCORD_INVITE='https://discord.gg/yKSeYDfZxN';
const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v??f}catch{return f}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
function migrate(){if(localStorage.getItem(BALANCE_KEY)!==null)return;for(const key of LEGACY_KEYS){const v=Math.max(0,Number(read(key,0))||0);if(v>0){write(BALANCE_KEY,v);break}}}
function balance(){migrate();return Math.max(0,Number(read(BALANCE_KEY,0))||0)}
function render(){const root=document.querySelector('[data-stardust-section]');if(!root)return;const amount=balance();root.querySelectorAll('[data-stardust-balance]').forEach(el=>el.textContent=String(amount));root.querySelectorAll('[data-stardust-reward]').forEach(card=>{const cost=Math.max(1,Number(card.dataset.cost)||1);const pct=Math.min(100,Math.round((amount/cost)*100));const bar=card.querySelector('[data-stardust-progress]');const status=card.querySelector('[data-stardust-status]');if(bar)bar.style.width=`${pct}%`;if(status)status.textContent=amount>=cost?`READY TO CLAIM · ${amount} STARDUST`:`${Math.max(0,cost-amount)} STARDUST TO GO`;});}
document.addEventListener('click',e=>{const link=e.target.closest('[data-stardust-discord]');if(!link)return;e.preventDefault();window.open(DISCORD_INVITE,'_blank','noopener,noreferrer');});
window.addEventListener('storage',render);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();