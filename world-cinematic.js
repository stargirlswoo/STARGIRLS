/* STARGIRLS cinematic behavior — subtle movement, memory and world handoff. */
(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function reveal(){const els=$$('.cine-section,.scene-split,.duo-card,.chapter,.chapter-card,.image-strip figure,.cine-afterparty,.store-signup,.catalog-card');if(reduced){els.forEach(x=>x.classList.add('cine-in'));return}const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('cine-in');io.unobserve(e.target)}}),{threshold:.05,rootMargin:'0px 0px -7% 0px'});els.forEach((el,i)=>{if(el.dataset.cineReveal==='1')return;el.dataset.cineReveal='1';el.classList.add('cine-reveal');el.style.transitionDelay=`${Math.min(i%3,2)*45}ms`;io.observe(el)})}
function marquee(){const rows=$$('.scene-marquee');rows.forEach(row=>{if(row.dataset.moving==='1'||reduced)return;row.dataset.moving='1';let x=0,last=performance.now();const step=now=>{const dt=Math.min(32,now-last);last=now;x-=dt*.025;const width=row.scrollWidth/2||0;if(width&&Math.abs(x)>width)x=0;row.style.transform=`translateX(${x}px)`;requestAnimationFrame(step)};requestAnimationFrame(step)})}
function returning(){const key='stargirls-cinematic-visited-v1';let seen=false;try{seen=localStorage.getItem(key)==='1';localStorage.setItem(key,'1')}catch{}if(!seen)return;const bar=$('.scene-bar');if(bar){const original=bar.textContent;bar.textContent='YOU FOUND YOUR WAY BACK ★';setTimeout(()=>{bar.textContent=original},2400)}}
function clubHandoff(){let should=false;try{should=localStorage.getItem('stargirls-open-club-on-arrival-v1')==='1';if(should)localStorage.removeItem('stargirls-open-club-on-arrival-v1')}catch{}if(!should)return;let tries=0;const open=()=>{const b=$('[data-open-club]');if(b){b.click();return}if(tries++<12)setTimeout(open,180)};open()}
function productMutation(){const grid=$('[data-product-grid]');if(!grid)return;new MutationObserver(()=>{reveal()}).observe(grid,{childList:true})}
function run(){reveal();marquee();returning();clubHandoff();productMutation();document.documentElement.classList.add('world-ready')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
