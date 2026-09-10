/* STARGIRLS product memory: restores a shopper's last valid options for this exact product. */
(()=>{
'use strict';
const PREF_KEY='stargirls-product-preferences-v1';
const app=document.getElementById('app');
if(!app)return;
const id=new URLSearchParams(location.search).get('id')||'';
if(!id)return;
const read=()=>{try{const v=JSON.parse(localStorage.getItem(PREF_KEY)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}};
const write=v=>{try{localStorage.setItem(PREF_KEY,JSON.stringify(v))}catch{}};
let restoring=true,attempts=0,noticeShown=false,queued=false;
function activeValue(selector){return app.querySelector(`${selector}.active`)?.textContent?.trim()||''}
function saveCurrent(){const color=activeValue('[data-color]'),size=activeValue('[data-size]');if(!color&&!size)return;const all=read();all[id]={color,size,ts:Date.now()};write(all)}
function showNotice(){if(noticeShown||app.querySelector('.remembered-choice'))return;const info=app.querySelector('.product-info'),first=info?.querySelector('.option');if(!info||!first)return;first.insertAdjacentHTML('beforebegin','<div class="remembered-choice">★ WELCOME BACK — YOUR LAST PICK WAS RESTORED</div>');noticeShown=true}
function restore(){if(!restoring||attempts++>5)return;const pref=read()[id];if(!pref){restoring=false;return}const colorButtons=[...app.querySelectorAll('[data-color]')],sizeButtons=[...app.querySelectorAll('[data-size]')];if(pref.color&&colorButtons.length&&!colorButtons.some(b=>b.classList.contains('active'))){const b=colorButtons.find(x=>x.textContent.trim()===pref.color);if(b){b.click();return}}if(pref.size&&sizeButtons.length&&!sizeButtons.some(b=>b.classList.contains('active'))){const b=sizeButtons.find(x=>!x.disabled&&x.textContent.trim()===pref.size);if(b){b.click();return}}restoring=false;showNotice()}
function wire(){app.querySelectorAll('[data-color],[data-size]').forEach(b=>{if(b.dataset.prefWire==='1')return;b.dataset.prefWire='1';b.addEventListener('click',()=>setTimeout(saveCurrent,40));});restore()}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;wire()})}
new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
})();