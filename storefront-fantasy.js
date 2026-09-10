/* STARGIRLS fantasy behavior: one hero CTA, delayed utility reveal and restrained product motion. */
(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
function style(){if($('#sg-fantasy-behavior-style'))return;const s=document.createElement('style');s.id='sg-fantasy-behavior-style';s.textContent=`
.fantasy-hero-cta{position:relative;z-index:2;align-self:flex-start;margin-top:22px;display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;border-radius:999px;background:#fff;color:#111;text-decoration:none;font-size:9px;font-weight:900;letter-spacing:.09em;box-shadow:0 8px 28px rgba(0,0,0,.14)}
.shop-utility-row{opacity:0;transform:translateY(8px);pointer-events:none;transition:opacity .2s ease,transform .2s ease}.sg-dock-visible .shop-utility-row{opacity:1;transform:none;pointer-events:auto}
.catalog-card.sg-reveal{opacity:0;transform:translateY(12px)}.catalog-card.sg-reveal.sg-in{opacity:1;transform:none;transition:opacity .38s ease,transform .38s ease}.catalog-card.sg-in:hover{transform:translateY(-2px)!important}
@media(max-width:900px){.fantasy-hero-cta{min-height:44px;padding:0 17px;font-size:8px;margin-top:18px}}
@media(prefers-reduced-motion:reduce){.shop-utility-row,.catalog-card.sg-reveal{transition:none;transform:none;opacity:1}}
`;document.head.appendChild(s)}
function heroCTA(){const hero=$('.home-store-intro');if(!hero||$('.fantasy-hero-cta',hero))return;const a=document.createElement('a');a.className='fantasy-hero-cta';a.href='#catalog';a.textContent='SHOP THE DROP ↓';a.addEventListener('click',e=>{e.preventDefault();$('#catalog')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})});hero.appendChild(a)}
function dock(){const toggle=()=>document.body.classList.toggle('sg-dock-visible',scrollY>180);toggle();addEventListener('scroll',toggle,{passive:true})}
function reveal(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const cards=$$('[data-product-card]');if(!cards.length)return;const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('sg-in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px',threshold:.04});cards.forEach((c,i)=>{if(c.dataset.sgReveal==='1')return;c.dataset.sgReveal='1';c.classList.add('sg-reveal');c.style.transitionDelay=`${Math.min(i%4,3)*35}ms`;io.observe(c)})}
function run(){style();heroCTA();dock();reveal()}
const grid=$('[data-product-grid]');if(grid)new MutationObserver(reveal).observe(grid,{childList:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();