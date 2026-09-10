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
      const response=await fetch(`/content/${file}.json?cms=${Date.now()}`,{
        cache:'no-store',
        headers:{'cache-control':'no-cache'}
      });
      return response.ok?await response.json():{};
    }catch{return{};}
  }

  function bg(selector,value){
    const url=clean(value);if(!url)return;
    const safe=url.replace(/["\\]/g,'');
    document.querySelectorAll(selector).forEach(el=>{
      el.style.setProperty('background-image',`url("${safe}")`,'important');
    });
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

  // Detect the actual CMS hooks on the rendered page instead of depending on
  // whether the host serves /music, /music.html, or another rewritten URL.
  if(document.querySelector('[data-cms-home-hero],[data-cms-home-hayati],[data-cms-home-moon],[data-cms-home-sun],[data-cms-home-juno]'))home();
  if(document.querySelector('[data-cms-shop-hero]'))shop();
  if(document.querySelector('[data-cms-about-moon],[data-cms-about-sun]'))about();
  if(document.querySelector('[data-cms-music-hero],[data-cms-music-merch]'))music();
  if(document.querySelector('[data-cms-juno-hero],img[data-cms-juno-product],img[data-cms-juno-detail],[data-cms-juno-mood]'))juno();
})();
