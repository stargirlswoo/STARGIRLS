/* Opens STARGIRLS Club only when a shopper explicitly came back from a product-page Club invite. */
(()=>{
'use strict';
const KEY='stargirls-open-club-on-arrival-v1';
let wanted=false;
try{wanted=localStorage.getItem(KEY)==='1'}catch{}
if(!wanted)return;
let attempts=0;
function tryOpen(){
  const button=document.querySelector('[data-open-club]');
  if(button){try{localStorage.removeItem(KEY)}catch{}button.click();return;}
  if(attempts++<18)setTimeout(tryOpen,180);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tryOpen);else tryOpen();
})();
