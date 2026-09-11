(()=>{
'use strict';
const API='https://stargirls.stargirlswoo.workers.dev';
const params=new URLSearchParams(location.search);
const pf=Number(params.get('pf')||(/^printful-(\d+)$/.exec(params.get('id')||'')?.[1]||0));
const app=document.getElementById('app');
if(!pf||!app)return;

let data=null;
let applying=false;
const activeByColor=new Map();

const safe=u=>/^https:\/\//i.test(String(u||''))?String(u):'';
const norm=s=>String(s||'').trim().toLowerCase();
const uniq=a=>[...new Set(a.filter(Boolean))];

function currentColor(){
  for(const option of app.querySelectorAll('.option')){
    const labels=option.querySelectorAll('.option-label span');
    if(norm(labels[0]?.textContent)==='color'){
      const value=String(labels[1]?.textContent||'').trim();
      if(value&&!/^select one$/i.test(value))return value;
    }
  }
  const keys=Object.keys(data?.colors||{});
  return keys.length===1?keys[0]:'';
}

function imagesForColor(color){
  const colors=data?.colors||{};
  const key=Object.keys(colors).find(k=>norm(k)===norm(color));
  let items=key?colors[key]:[];
  if(!items.length&&Object.keys(colors).length===1)items=colors[Object.keys(colors)[0]]||[];
  if(!items.length)items=data?.mockups||[];

  const rank=item=>{
    const p=norm(item?.placement);
    if(p.startsWith('front'))return 0;
    if(p.startsWith('back'))return 1;
    return 2;
  };
  return uniq(items.slice().sort((a,b)=>rank(a)-rank(b)).map(item=>safe(item?.url))).slice(0,5);
}

function sameGallery(images){
  const current=[...app.querySelectorAll('.thumbs img')].map(img=>img.currentSrc||img.src).filter(Boolean);
  if(images.length===1){
    const hero=app.querySelector('.hero-stage img');
    return current.length===0&&hero&&safe(hero.currentSrc||hero.src)===images[0]&&hero.dataset.sgGenerated==='1';
  }
  return current.length===images.length&&current.every((u,i)=>u===images[i])&&app.querySelector('.thumbs')?.dataset.sgGenerated==='1';
}

function apply(){
  if(applying||!data)return;
  const heroStage=app.querySelector('.hero-stage');
  if(!heroStage)return;

  const color=currentColor();
  const images=imagesForColor(color);
  if(!images.length)return;
  if(sameGallery(images))return;

  applying=true;
  try{
    const key=norm(color)||'__default__';
    let active=activeByColor.get(key);
    if(!images.includes(active))active=images[0];
    activeByColor.set(key,active);

    heroStage.innerHTML='';
    const hero=document.createElement('img');
    hero.id='hero';
    hero.src=active;
    hero.alt=(document.querySelector('.product-title')?.textContent||'STARGIRLS product').trim();
    hero.decoding='async';
    hero.dataset.sgGenerated='1';
    heroStage.appendChild(hero);

    const old=app.querySelector('.thumbs');
    if(old)old.remove();
    if(images.length>1){
      const thumbs=document.createElement('div');
      thumbs.className='thumbs';
      thumbs.dataset.sgGenerated='1';
      images.forEach((url,index)=>{
        const button=document.createElement('button');
        button.type='button';
        button.className=url===active?'active':'';
        button.setAttribute('aria-label',`View product image ${index+1}`);
        const img=document.createElement('img');
        img.src=url;
        img.alt='';
        img.loading='lazy';
        img.decoding='async';
        button.appendChild(img);
        button.addEventListener('click',()=>{
          activeByColor.set(key,url);
          hero.src=url;
          thumbs.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===button));
        });
        thumbs.appendChild(button);
      });
      heroStage.parentElement?.appendChild(thumbs);
    }
  }finally{
    applying=false;
  }
}

const observer=new MutationObserver(()=>queueMicrotask(apply));
observer.observe(app,{childList:true,subtree:true});

fetch(`${API}/printful/mockups?product_id=${encodeURIComponent(pf)}&v=20260911-front-back`,{cache:'no-store',mode:'cors'})
  .then(async response=>{
    if(!response.ok)throw new Error(`Mockups ${response.status}`);
    return response.json();
  })
  .then(payload=>{
    if(!payload||!Array.isArray(payload.mockups)||!payload.mockups.length)return;
    data=payload;
    apply();
  })
  .catch(error=>console.warn('STARGIRLS generated product mockups:',error));
})();
