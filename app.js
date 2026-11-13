'use strict';
(() => {
 const $ = (s) => document.querySelector(s);
 const $$ = (s) => [...document.querySelectorAll(s)];
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 let paused = reduced.matches;
 const motion = $('.motion-toggle');
 function setMotion() {
  document.body.classList.toggle('motion-paused', paused);
  document.documentElement.classList.toggle('js-motion', !paused);
  if (motion) { motion.setAttribute('aria-pressed', String(paused)); motion.innerHTML = paused ? 'Resume motion <span aria-hidden="true">▷</span>' : 'Pause motion <span aria-hidden="true">Ⅱ</span>'; }
  $$('.map-lines').forEach(svg => { if (paused) svg.pauseAnimations(); else svg.unpauseAnimations(); });
 }
 setMotion();
 motion?.addEventListener('click', () => { paused = !paused; setMotion(); if (paused) drawOnce(); else requestFrame(); });
 reduced.addEventListener('change', () => { paused = reduced.matches; setMotion(); if (paused) drawOnce(); else requestFrame(); });
 let scheduled = false;
 const onScroll = () => {
  if (scheduled) return; scheduled = true;
  requestAnimationFrame(() => { scheduled = false; const max = document.documentElement.scrollHeight - innerHeight; document.documentElement.style.setProperty('--scroll', max > 0 ? scrollY / max : 0); document.documentElement.style.setProperty('--hero-scroll', Math.min(scrollY / innerHeight,1)); });
 };
 addEventListener('scroll', onScroll, {passive:true}); onScroll();
 const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
   if(entry.isIntersecting) entry.target.classList.add('in-view');
   if(entry.isIntersecting && entry.target.dataset.scene) activateNode(entry.target.dataset.scene);
  }
 }, {threshold: .2});
 $$('.reveal').forEach(e => observer.observe(e));
 function activateNode(name) { $$('.node').forEach(e => e.classList.toggle('active', e.dataset.node === name)); $$('.story').forEach(e => e.classList.toggle('is-active', e.dataset.scene === name)); }
 $$('.node').forEach(e => {
  e.addEventListener('pointerenter', () => activateNode(e.dataset.node));
  e.addEventListener('focus', () => activateNode(e.dataset.node));
  e.addEventListener('click', () => { activateNode(e.dataset.node); const target = e.dataset.node === 'core' ? $('.feature-row') : $(`[data-scene="${e.dataset.node}"]`); target?.scrollIntoView({behavior:paused?'instant':'smooth',block:'center'}); });
 });
 const menu = $('.menu');
 menu?.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded',String(open)); $('#mobile-nav').hidden = !open; menu.textContent = open ? 'Close' : 'Menu'; });
 $$('#mobile-nav a').forEach(a => a.addEventListener('click', () => { $('#mobile-nav').hidden = true; menu.setAttribute('aria-expanded','false'); menu.textContent='Menu'; }));
 addEventListener('keydown', e => { if(e.key === 'Escape' && menu && menu.getAttribute('aria-expanded')==='true'){menu.click();menu.focus();} });
 const screens = {
  connected:['Connected','v0.1.15','Session counters after a real CI handshake.'],
  disconnected:['Connect','v0.1.10','At rest, with the demo profile selected.'],
  profiles:['Profiles','v0.1.41','Profile actions, split exclusions and config import.'],
  features:['Preferences','v0.1.15','Startup, adapter-loss recovery and reduced motion.'],
  warp:['WARP','v0.1.15','Registration is opt-in; live compatibility unverified.'],
  about:['Diagnostics','v0.1.15','Build information and local report generation.']
 };
 let selected = 'connected';
 function selectScreen(key) {
  if (!screens[key]) return;
  selected = key; const [name,version,caption] = screens[key];
  $$('.gallery-tabs button').forEach(b => { const active = b.dataset.screen === key; b.setAttribute('aria-selected', String(active));b.tabIndex = active?0:-1; });
  $('#screen-panel').setAttribute('aria-labelledby','tab-'+key);
  const image = $('#screen-image'); image.src = `images/${key}.webp`; image.alt = `${name} screen, ${version}, original Windows verification capture`;
  $('#screen-caption').textContent=caption; $('#screen-version').textContent=version;
  if(!paused) image.animate([{opacity:.3},{opacity:1}],{duration:300,easing:'ease-out'});
 }
 $$('.gallery-tabs button').forEach((b,i,all) => {
  b.addEventListener('click', () => selectScreen(b.dataset.screen));
  b.addEventListener('keydown', e => {
   let n = i;
   if(e.key==='ArrowRight') n=(i+1)%all.length;
   else if(e.key==='ArrowLeft') n=(i-1+all.length)%all.length;
   else if(e.key==='Home') n=0; else if(e.key==='End') n=all.length-1; else return;
   e.preventDefault(); selectScreen(all[n].dataset.screen); all[n].focus();
  });
 });
 const dialog = $('#lightbox');
 $('.shot-open')?.addEventListener('click', () => { const [name,version] = screens[selected]; $('#lightbox-image').src = `images/${selected}.webp`; $('#lightbox-image').alt = `${name}, ${version}`; $('#lightbox-label').textContent = `${name} / ${version}`; dialog.showModal(); });
 $('#close-lightbox')?.addEventListener('click', () => dialog.close());
 dialog?.addEventListener('click', e => { if(e.target === dialog){ const r = dialog.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) dialog.close(); } });
 $('#copy-hash')?.addEventListener('click', async () => {
  const hash = $('#sha'); const status=$('#copy-status');
  try { await navigator.clipboard.writeText(hash.value); status.textContent='Copied the full checksum.'; }
  catch { hash.focus();hash.select(); status.textContent='Select and copy the checksum above.'; }
 });
 // Abstract geometry only. No counters or points represent measured network data.
 const canvas = $('#tunnel');
 if(!canvas) return;
 const ctx = canvas.getContext('2d');
 if(!ctx) return;
 let w=1,h=1,dpr=1,frame=0,visible=true,t=0,last=0;
 let pointerX=0,pointerY=0;
 const accent = '#5cc8ff';
 const resize = () => { const r=canvas.getBoundingClientRect();w=r.width;h=r.height;dpr=Math.min(devicePixelRatio,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);if(paused)drawOnce(); };
 const project = (x,y,z) => {
  const ry=.42+pointerX*.4+Math.sin(t*.3)*.25, rx=.65+pointerY*.3+Math.sin(t*.22)*.18;
  const a=x*Math.cos(ry)+z*Math.sin(ry), b=-x*Math.sin(ry)+z*Math.cos(ry);
  const c=y*Math.cos(rx)-b*Math.sin(rx), depth=y*Math.sin(rx)+b*Math.cos(rx);
  const scale=w*.27/(1+depth*.21);
  return [w*.52+a*scale,h*.33+c*scale,depth];
 };
 function torus(u,v){const radius=1+.22*Math.cos(v);return project(radius*Math.cos(u),radius*Math.sin(u),.22*Math.sin(v));}
 function line(points,alpha,width=1){ctx.globalAlpha=alpha;ctx.strokeStyle=accent;ctx.lineWidth=width;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();}
 function paint(){
  ctx.clearRect(0,0,w,h);
  const lite=w<500;for(let ring=0;ring<(lite?12:20);ring++){
   const v=ring/20*Math.PI*2 + t*.09; const points=[];
   for(let i=0;i<=150;i++) points.push(torus(i/150*Math.PI*2,v));
   line(points,.25+(.5+.5*Math.sin(v))*.45,ring%5===0?1.5:.7);
  }
  for(let ring=0;ring<(lite?30:56);ring++){
   const u=ring/56*Math.PI*2+t*.025;const points=[];
   for(let i=0;i<=26;i++)points.push(torus(u,i/26*Math.PI*2));
   line(points,.32,.8);
  }
  for(let i=0;i<18;i++){
   const u=t*.12+i*2.399,v=i*.9+t*.2;const p=torus(u,v);
   ctx.globalAlpha=.7+(Math.sin(t+i)+1)*.15;ctx.fillStyle='#e9f6ff';ctx.beginPath();ctx.arc(p[0],p[1],i%3===0?2.3:1.3,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
 }
 function drawOnce(){paint();}
 function loop(now){frame=0;if(paused||!visible||document.hidden)return;const dt=Math.min((now-last)/1000,.05);last=now;t+=dt;paint();requestFrame();}
 function requestFrame(){if(!frame&&!paused&&visible&&!document.hidden)frame=requestAnimationFrame(loop);}
 new ResizeObserver(resize).observe(canvas);
 new IntersectionObserver(es=>{visible=es[0].isIntersecting;requestFrame();},{threshold:0}).observe(canvas);
 canvas.parentElement.addEventListener('pointermove',e=>{const r=canvas.parentElement.getBoundingClientRect();pointerX=(e.clientX-r.left)/r.width-.5;pointerY=(e.clientY-r.top)/r.height-.5;});
 canvas.parentElement.addEventListener('pointerleave',()=>{pointerX=0;pointerY=0;});
 document.addEventListener('visibilitychange',requestFrame);
 resize();drawOnce();requestFrame();
})();
;(function(){try{var links=[].slice.call(document.querySelectorAll('.nav nav a[href^="/#"]'));if(!links.length||!('IntersectionObserver' in window))return;var map={};links.forEach(function(a){var k=a.getAttribute('href').slice(2);(map[k]=map[k]||[]).push(a)});var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){links.forEach(function(a){a.removeAttribute('aria-current')});(map[e.target.id]||[]).forEach(function(a){a.setAttribute('aria-current','true')})}})},{rootMargin:'-45% 0px -50% 0px'});Object.keys(map).forEach(function(id){var el=document.getElementById(id);if(el)io.observe(el)})}catch(e){}})();
;(function(){try{if(/^\/history/.test(location.pathname)){[].forEach.call(document.querySelectorAll('.nav nav a[href="/history"]'),function(a){a.setAttribute('aria-current','true')})}}catch(e){}})();
;(function(){try{var art=document.querySelector('.hero-shot');if(!art||matchMedia('(prefers-reduced-motion:reduce)').matches||innerWidth<761)return;var t=false;function f(){t=false;var y=Math.min(scrollY,700);art.style.setProperty('--py',(y*-0.08).toFixed(1)+'px')}addEventListener('scroll',function(){if(!t){t=true;requestAnimationFrame(f)}},{passive:true})}catch(e){}})();
;(function(){try{var ul=document.querySelector('.history-main>ul');if(!ul)return;var wrap=document.createElement('div');wrap.className='log-filter';wrap.innerHTML='<label for="log-q">Filter the log</label><input id="log-q" type="search" placeholder="Try: handshake, DNS, tray" autocomplete="off"><span id="log-n" role="status" aria-live="polite"></span>';ul.parentNode.insertBefore(wrap,ul);var items=[].slice.call(ul.children),q=wrap.querySelector('input'),n=wrap.querySelector('#log-n');q.addEventListener('input',function(){var v=q.value.trim().toLowerCase(),c=0;items.forEach(function(li){var ok=!v||li.textContent.toLowerCase().indexOf(v)>-1;li.hidden=!ok;if(ok)c++});n.textContent=v?(c?c+' of '+items.length+' entries':'No entry mentions "'+q.value.trim()+'". Try a shorter word.'):''})}catch(e){}})();
;(function(){try{if(!document.getElementById('screen-image'))return;var names=['disconnected','profiles','features','warp','about'];var go=function(){names.forEach(function(n){var i=new Image();i.src='images/'+n+'.webp'})};if('requestIdleCallback' in window)requestIdleCallback(go,{timeout:4000});else setTimeout(go,2500)}catch(e){}})();
