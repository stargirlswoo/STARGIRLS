/* Sveltia CMS image bridge for the current STARGIRLS cinematic layout. */
(()=>{
  'use strict';

  const clean=value=>{
    const v=String(value||'').trim();
    if(!v)return'';
    if(/^https?:\/\//i.test(v))return v;
    return v.startsWith('/')?v:`/${v.replace(/^\.\/?/,'')}`;
  };

  async function read(file){
    try{
      const response=await fetch(`content/${file}.json?cms=${Date.now()}`,{cache:'no-store'});
      return response.ok?await response.json():{};
    }catch{return{};}
  }

  function bg(selector,value){
    const url=clean(value);if(!url)return;
    document.querySelectorAll(selector).forEach(el=>{el.style.backgroundImage=`url("${url.replace(/["\\]/g,'')}")`;});
  }

  function img(selector,value){
    const url=clean(value);if(!url)return;
    document.querySelectorAll(selector).forEach(el=>{el.src=url;});
  }

  async function home(){
    const [data,cast]=await Promise.all([read('home'),read('about')]);
    bg('[data-cms-home-hero]',data.hero);
    bg('[data-cms-home-hayati]',data.hayati);
    bg('[data-cms-home-moon]',cast.moon);
    bg('[data-cms-home-sun]',cast.sun);
    bg('[data-cms-home-juno]',data.juno);
  }

  async function shop(){
    const data=await read('shop');
    bg('[data-cms-shop-hero]',data.hero);
  }

  async function about(){
    const data=await read('about');
    bg('[data-cms-about-moon]',data.moon);
    bg('[data-cms-about-sun]',data.sun);
  }

  async function music(){
    const data=await read('music');
    bg('[data-cms-music-hero]',data.hero);
    bg('[data-cms-music-merch]',data.merch_scene);
  }

  async function juno(){
    const data=await read('juno');
    bg('[data-cms-juno-hero]',data.hero);
    img('img[data-cms-juno-product]',data.product);
    img('img[data-cms-juno-detail]',data.detail);
    bg('[data-cms-juno-mood]',data.mood);
  }

  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(page==='index.html'||page==='')home();
  else if(page==='shop.html')shop();
  else if(page==='about.html')about();
  else if(page==='music.html')music();
  else if(page==='fragrance.html')juno();
})();
