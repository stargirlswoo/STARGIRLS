(()=>{
'use strict';
const header=document.querySelector('.site-header');
if(!header)return;
const svg={
 search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/></svg>',
 club:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.2 5 5.3.5-4 3.6 1.2 5.2L12 15l-4.7 2.8 1.2-5.2-4-3.6 5.3-.5z"/></svg>',
 bag:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 8.5h11l-.7 11H7.2z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/></svg>'
};
const makeBtn=(cls,label,icon)=>{const b=document.createElement('button');b.type='button';b.className=`sg-shell-icon ${cls}`;b.setAttribute('aria-label',label);b.innerHTML=icon;return b};
const searchBtn=makeBtn('sg-search-trigger','Search STARGIRLS',svg.search);
const clubBtn=makeBtn('sg-club-trigger','Open STARGIRLS Club',svg.club);
const bagBtn=makeBtn('sg-bag-trigger','Open bag',svg.bag);
const badge=document.createElement('span');badge.className='sg-shell-badge';badge.textContent='0';bagBtn.appendChild(badge);
header.append(searchBtn,clubBtn,bagBtn);

const oldCartButtons=[...document.querySelectorAll('[data-cart-open]')];
const syncBag=()=>{const source=document.querySelector('[data-cart-count]');if(source)badge.textContent=source.textContent||'0'};
syncBag();
const observer=new MutationObserver(syncBag);document.querySelectorAll('[data-cart-count]').forEach(n=>observer.observe(n,{childList:true,subtree:true,characterData:true}));
bagBtn.addEventListener('click',()=>{const live=oldCartButtons.find(b=>b.offsetParent!==null)||oldCartButtons[0];if(live)live.click();else location.href='shop.html';});

const backdrop=document.createElement('div');backdrop.className='sg-shell-backdrop';document.body.appendChild(backdrop);
const searchPanel=document.createElement('aside');searchPanel.className='sg-shell-panel';searchPanel.setAttribute('aria-label','Search STARGIRLS');
searchPanel.innerHTML='<div class="sg-shell-panel-head"><strong>SEARCH STARGIRLS ★</strong><button class="sg-shell-close" type="button" aria-label="Close">×</button></div><p class="sg-shell-kicker">FIND YOUR WAY BACK IN</p><h2 class="sg-shell-title">WHAT ARE<br>YOU LOOKING FOR?</h2><div class="sg-search-box"><input type="search" autocomplete="off" placeholder="Try STARDUST, HAYATI, JUNO…" aria-label="Search STARGIRLS"></div><div class="sg-search-results"></div>';
document.body.appendChild(searchPanel);
const clubPanel=document.createElement('aside');clubPanel.className='sg-shell-panel';clubPanel.setAttribute('aria-label','STARGIRLS Club');
clubPanel.innerHTML='<div class="sg-shell-panel-head"><strong>STARGIRLS CLUB ★</strong><button class="sg-shell-close" type="button" aria-label="Close">×</button></div><p class="sg-shell-kicker">YOUR ACCESS TO THE WORLD</p><h2 class="sg-shell-title">THE WORLD<br>REMEMBERS YOU.</h2><p class="sg-shell-copy">One STARGIRLS ID is being built to carry your Stardust, status, drops, group chat identity and future game progress across the whole world.</p><div class="sg-shell-status">APP + STARGIRLS ID // IN DEVELOPMENT</div><div class="sg-shell-actions"><a class="primary" href="shop.html#stardust">SEE YOUR STARDUST <span>✨ REWARDS</span></a><a href="https://discord.gg/yKSeYDfZxN" target="_blank" rel="noopener">ENTER THE GROUP CHAT <span>DISCORD ↗</span></a><a href="shop.html">SHOP THE CURRENT ERA <span>TAKE SOMETHING</span></a></div>';
document.body.appendChild(clubPanel);

const searchItems=[
 ['STARDUST','Rewards, balance + the future STARGIRLS economy','shop.html#stardust','stardust rewards points keychain loyalty'],
 ['SHOP','Current-era merch, fashion + JUNO','shop.html','shop merch tee hoodie hat bikini clothes fashion'],
 ['HAYATI / MUSIC','The soundtrack to the world','music.html','music hayati song video soundtrack'],
 ['MOON + SUN','Meet the sisters at the center of it','about.html','moon sun sisters about'],
 ['JUNO','The first STARGIRLS fragrance','fragrance.html','juno perfume fragrance beauty'],
 ['WORLD','Back to the opening scene','index.html','world home stargirls']
];
const input=searchPanel.querySelector('input');const results=searchPanel.querySelector('.sg-search-results');
function render(q=''){const term=q.trim().toLowerCase();const matches=searchItems.filter(x=>!term||(`${x[0]} ${x[1]} ${x[3]}`).toLowerCase().includes(term));results.innerHTML=matches.length?matches.map(x=>`<a class="sg-search-result" href="${x[2]}"><span><strong>${x[0]}</strong><small>${x[1]}</small></span><span>→</span></a>`).join(''):'<div class="sg-search-empty">Nothing in this scene yet. Try STARDUST, SHOP, HAYATI, MOON, SUN or JUNO.</div>'}
render();input.addEventListener('input',()=>render(input.value));

function open(panel){[searchPanel,clubPanel].forEach(p=>p.classList.remove('open'));panel.classList.add('open');backdrop.classList.add('open');document.body.classList.add('sg-shell-open');if(panel===searchPanel)setTimeout(()=>input.focus(),80)}
function close(){[searchPanel,clubPanel].forEach(p=>p.classList.remove('open'));backdrop.classList.remove('open');document.body.classList.remove('sg-shell-open')}
searchBtn.addEventListener('click',()=>open(searchPanel));clubBtn.addEventListener('click',()=>open(clubPanel));backdrop.addEventListener('click',close);document.querySelectorAll('.sg-shell-close').forEach(b=>b.addEventListener('click',close));document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});document.querySelectorAll('[data-open-club]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();open(clubPanel)}));

const menu=document.querySelector('.mobile-menu');const nav=menu?.querySelector('.mobile-nav');
if(menu&&nav&&!menu.querySelector('.sg-menu-access')){const access=document.createElement('section');access.className='sg-menu-access';access.innerHTML='<p class="sg-menu-access-kicker">YOUR ACCESS // STARGIRLS CLUB</p><div class="sg-menu-access-grid"><a class="sg-menu-card purple" href="shop.html#stardust"><strong>✨ STARDUST</strong><small>EARN + REDEEM →</small></a><a class="sg-menu-card" href="https://discord.gg/yKSeYDfZxN" target="_blank" rel="noopener"><strong>★ GROUP CHAT</strong><small>ENTER NOW ↗</small></a><button class="sg-menu-card" type="button" data-menu-club><strong>STARGIRLS ID</strong><small>APP + GAME ACCESS →</small></button></div><p class="sg-menu-app-note">The future STARGIRLS app will bring chat, Stardust, status, drops and game progress under one identity.</p>';menu.appendChild(access);access.querySelector('[data-menu-club]')?.addEventListener('click',()=>{document.querySelector('.menu-close')?.click();setTimeout(()=>open(clubPanel),180)})}
})();
