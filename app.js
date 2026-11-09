(function(){
"use strict";
var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var finePointer = window.matchMedia("(pointer: fine)").matches;

/* ---- scroll progress + nav state ---- */
var nav = document.getElementById("nav"), prog = document.getElementById("progress");
var toTop = document.getElementById("toTop");
function onScroll(){
  var h = document.documentElement;
  var max = h.scrollHeight - h.clientHeight;
  prog.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
  nav.classList.toggle("scrolled", h.scrollTop > 24);
  if(toTop) toTop.classList.toggle("show", h.scrollTop > h.clientHeight * 1.6);
}
if(toTop) toTop.addEventListener("click", function(){
  window.scrollTo({top: 0, behavior: reduced ? "auto" : "smooth"});
});
document.addEventListener("scroll", onScroll, {passive:true});
onScroll();
var secObs = new IntersectionObserver(function(es){
  es.forEach(function(e){ e.target.classList.toggle("sec-live", e.isIntersecting); });
}, {rootMargin: "-38% 0px -38% 0px"});
document.querySelectorAll("section[id]").forEach(function(s){ secObs.observe(s); });

/* ---- reveal on scroll ---- */
var io = new IntersectionObserver(function(es){
  es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add("on"); io.unobserve(e.target); } });
},{threshold:0, rootMargin:"0px 0px -4% 0px"});
document.querySelectorAll(".rv").forEach(function(el){
  if(reduced){ el.classList.add("on"); } else { io.observe(el); }
});
/* readability guarantee: any revealed-element still hidden inside the viewport after
   a settle window is force-shown - content never stays dim at a settled scroll position */
function rvSweep(){
  var vh = window.innerHeight;
  document.querySelectorAll(".rv:not(.on)").forEach(function(el){
    var r = el.getBoundingClientRect();
    if(r.top < vh*0.96 && r.bottom > 0){ el.classList.add("on"); io.unobserve(el); }
  });
}
setTimeout(rvSweep, 900);
window.addEventListener("load", function(){ setTimeout(rvSweep, 400); setTimeout(rvSweep, 1600); });
var rvScrollT = null;
window.addEventListener("scroll", function(){ if(rvScrollT) return; rvScrollT = setTimeout(function(){ rvScrollT = null; rvSweep(); }, 500); }, {passive:true});

/* ---- ticker: duplicate content for seamless loop ---- */
var tick = document.getElementById("tickerTrack");
tick.innerHTML += tick.innerHTML;

/* ---- scramble / decode hero subtitle ---- */
var scrEl = document.getElementById("scramble");
if(!reduced && scrEl){
  var glyphs = "!<>-_\/[]{}=+*^?#";
  var finalText = scrEl.getAttribute("data-text");
  var frame = 0, queue = finalText.split("").map(function(ch, i){
    return {ch:ch, start: i * .5, end: i * .5 + 4 + Math.random()*7};
  });
  function scrambleTick(){
    var out = "", done = 0;
    for(var i=0;i<queue.length;i++){
      var q = queue[i];
      if(frame >= q.end || q.ch === " "){ out += q.ch; done++; }
      else if(frame >= q.start){ out += "<span style='color:rgba(53,224,255,.55)'>" + glyphs[Math.floor(Math.random()*glyphs.length)] + "</span>"; }
      else { out += q.ch; }
    }
    scrEl.innerHTML = out;
    if(done < queue.length){ frame++; requestAnimationFrame(scrambleTick); }
    else { scrEl.textContent = finalText; }
  }
  setTimeout(function(){ requestAnimationFrame(scrambleTick); }, 250);
}

/* ---- card spotlight + tilt ---- */
if(finePointer && !reduced){
  document.querySelectorAll(".card").forEach(function(card){
    card.addEventListener("pointermove", function(ev){
      var r = card.getBoundingClientRect();
      var x = ev.clientX - r.left, y = ev.clientY - r.top;
      card.style.setProperty("--mx", x + "px");
      card.style.setProperty("--my", y + "px");
      var rx = ((y / r.height) - .5) * -6, ry = ((x / r.width) - .5) * 6;
      card.style.transform = "perspective(800px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) translateY(-3px)";
    });
    card.addEventListener("pointerleave", function(){ card.style.transform = ""; });
  });
} else {
  document.querySelectorAll(".card").forEach(function(card){
    card.addEventListener("pointermove", function(ev){
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (ev.clientX - r.left) + "px");
      card.style.setProperty("--my", (ev.clientY - r.top) + "px");
    });
  });
}

var diskTilt = .19;

/* ---- cursor glow ---- */
var cursor = document.getElementById("cursor");
if(finePointer && !reduced){
  var cx = -400, cy = -400, tx = cx, ty = cy;
  document.addEventListener("pointermove", function(e){ tx = e.clientX; ty = e.clientY; }, {passive:true});
  (function moveCursor(){
    if(!document.hidden){
      cx += (tx - cx) * .12; cy += (ty - cy) * .12;
      cursor.style.left = cx + "px"; cursor.style.top = cy + "px";
    }
    requestAnimationFrame(moveCursor);
  })();
} else { cursor.style.display = "none"; }

/* ---- sound (opt-in, WebAudio, no assets) ---- */
var sndBtn = document.getElementById("sndBtn"), actx = null, sndOn = false;
function blip(freq, dur, gain){
  if(!sndOn || !actx) return;
  var o = actx.createOscillator(), g = actx.createGain();
  o.type = "sine"; o.frequency.value = freq;
  g.gain.setValueAtTime(0, actx.currentTime);
  g.gain.linearRampToValueAtTime(gain, actx.currentTime + .012);
  g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + dur);
  o.connect(g).connect(actx.destination);
  o.start(); o.stop(actx.currentTime + dur + .02);
}
function paintSnd(){
  sndBtn.classList.toggle("on", sndOn);
  sndBtn.setAttribute("aria-pressed", sndOn ? "true" : "false");
  sndBtn.querySelectorAll(".off").forEach(function(l){ l.style.display = sndOn ? "none" : ""; });
  sndBtn.querySelectorAll(".w1,.w2").forEach(function(w){ w.style.display = sndOn ? "" : "none"; });
}
sndBtn.addEventListener("click", function(){
  sndOn = !sndOn;
  if(sndOn && !actx){ try{ actx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){} }
  if(actx && actx.state === "suspended"){ actx.resume(); }
  paintSnd(); blip(660, .09, .05);
});
paintSnd();
document.querySelectorAll(".btn, summary").forEach(function(el){
  el.addEventListener("mouseenter", function(){ blip(880, .05, .02); });
  el.addEventListener("click", function(){ blip(520, .08, .04); });
});

/* ---- magnetic buttons ---- */
if(finePointer && !reduced){
  document.querySelectorAll(".btn").forEach(function(b){
    b.addEventListener("pointermove", function(ev){
      var r = b.getBoundingClientRect();
      var dx = ev.clientX - (r.left + r.width / 2), dy = ev.clientY - (r.top + r.height / 2);
      b.style.transform = "translate(" + (dx * .12) + "px," + (dy * .18) + "px)";
    });
    b.addEventListener("pointerleave", function(){ b.style.transform = ""; });
  });
}

/* ---- devlog: collapse older entries behind a toggle ---- */
(function(){
  var logToggle = document.getElementById('logToggle');
  var logEl = document.querySelector('.log');
  if(!logToggle || !logEl) return;
  var lis = logEl.querySelectorAll('ul li');
  var keep = 5, hidden = 0;
  lis.forEach(function(li, i){ if(i < lis.length - 1 - keep){ li.classList.add('old'); hidden++; } });
  if(hidden === 0){ logToggle.style.display = 'none'; return; }
  function label(open){ return open ? 'Show latest only' : ('Show full history - ' + hidden + ' earlier entries'); }
  logToggle.textContent = label(false);
  logToggle.addEventListener('click', function(){
    var open = logEl.classList.toggle('show-all');
    logToggle.textContent = label(open);
  });
})();

/* ---- FAQ smooth expand/collapse ---- */
document.querySelectorAll('.faq details').forEach(function(d){
  var s = d.querySelector('summary');
  if(!s) return;
  s.addEventListener('click', function(ev){
    ev.preventDefault();
    if(d.dataset.anim) return;
    d.dataset.anim = '1';
    var body = d.querySelector('.fa-body');
    if(!body){ d.open = !d.open; delete d.dataset.anim; return; }
    if(!d.open){
      d.open = true;
      var h = body.offsetHeight;
      body.style.overflow = 'hidden';
      var a = body.animate([{height:'0px',opacity:0,paddingBottom:'0px'},{height:h+'px',opacity:1,paddingBottom:'18px'}],{duration:340,easing:'cubic-bezier(.22,1,.36,1)'});
      a.onfinish = function(){ body.style.overflow = ''; delete d.dataset.anim; };
    } else {
      var h2 = body.offsetHeight;
      body.style.overflow = 'hidden';
      var a2 = body.animate([{height:h2+'px',opacity:1},{height:'0px',opacity:0,paddingBottom:'0px'}],{duration:270,easing:'cubic-bezier(.5,0,.75,0)'});
      a2.onfinish = function(){ d.open = false; body.style.overflow = ''; delete d.dataset.anim; };
    }
  });
});

/* ---- copy-to-clipboard buttons with feedback ---- */
document.querySelectorAll("[data-copy]").forEach(function(btn){
  btn.addEventListener("click", function(){
    var txt = btn.getAttribute("data-copy");
    function done(){
      btn.classList.add("copied");
      var l = btn.querySelector("span");
      if(l){ var o = l.textContent; l.textContent = "Copied"; setTimeout(function(){ l.textContent = o; btn.classList.remove("copied"); }, 1600); }
    }
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(done, done); }
    else { var ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); try{ document.execCommand("copy"); }catch(e){} ta.remove(); done(); }
    blip(980, .07, .04);
  });
});

/* ---- FAQ accordion: opening one closes the others ---- */
var faqItems = document.querySelectorAll(".faq details");
faqItems.forEach(function(d){
  d.addEventListener("toggle", function(){
    if(d.open){ faqItems.forEach(function(o){ if(o !== d && o.open) o.open = false; }); }
  });
});

/* ---- hero: Gargantua-inspired black hole, fully procedural ---- */
var cv = document.getElementById("tunnel"), ctx2 = cv.getContext("2d");
var W = 0, H = 0, DPR = 1, running = false, rafId = null, isNarrow = false;
var stars = [], disk = [], sparks = [], diskScale = 1, tNow = 0;
var px = .5, py = .42, tpx = .5, tpy = .42;
function sizeCanvas(){
  DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  W = cv.width = Math.floor(innerWidth * DPR);
  H = cv.height = Math.floor(innerHeight * DPR);
  isNarrow = innerWidth < 760;
  if(typeof diskCache !== "undefined"){ for(var k in diskCache) delete diskCache[k]; }
}
function initScene(){
  stars = []; disk = [];
  var ns = Math.min(300, Math.floor(innerWidth * innerHeight / 5500));
  for(var i = 0; i < ns; i++) stars.push({x: Math.random(), y: Math.random(), z: .3 + Math.random()*.7, r: .35 + Math.random()*1.2, tw: Math.random()*6.28});
  var nd = Math.floor(Math.min(1500, innerWidth * 1.15) * diskScale);
  for(var j = 0; j < nd; j++) disk.push({a: Math.random()*6.283, r: Math.pow(Math.random(), 1.6), w: .5 + Math.random()*1.3, o: .35 + Math.random()*.65});
  sparks = [];
  var ns2 = Math.floor(96 * diskScale);
  for(var k2 = 0; k2 < ns2; k2++) sparks.push({a: Math.random()*6.283, r: Math.random(), sp: .8 + Math.random()*1.6, f: .5 + Math.random()*2.2, ph: Math.random()*6.283, o: .4 + Math.random()*.6});
}
function col(r, g, b, a){ return "rgba(" + (r|0) + "," + (g|0) + "," + (b|0) + "," + a + ")"; }
var diskCache = {};
function annulusSprite(rIn, rOut, dim, back){
  var key = (back ? "b" : "f") + Math.round(rIn) + "_" + Math.round(rOut) + "_" + dim;
  if(diskCache[key]) return diskCache[key];
  var pad = 4, wpx = Math.ceil(rOut * 2 + pad * 2), hpx = Math.ceil(rOut * .19 * 2 + pad * 2);
  var c = document.createElement("canvas"); c.width = wpx; c.height = hpx;
  var g = c.getContext("2d");
  g.translate(wpx / 2, hpx / 2); g.scale(1, .19);
  g.beginPath();
  if(back){ g.arc(0, 0, rOut, Math.PI, 2 * Math.PI); g.arc(0, 0, rIn, 2 * Math.PI, Math.PI, true); }
  else { g.arc(0, 0, rOut, 0, Math.PI); g.arc(0, 0, rIn, Math.PI, 0, true); }
  g.closePath();
  var rg = g.createRadialGradient(0, 0, rIn * .9, 0, 0, rOut);
  rg.addColorStop(0, col(255, 244, 226, .62 * dim));
  rg.addColorStop(.18, col(255, 208, 140, .40 * dim));
  rg.addColorStop(.45, col(255, 158, 74, .22 * dim));
  rg.addColorStop(.75, col(224, 106, 40, .10 * dim));
  rg.addColorStop(1, col(160, 60, 24, 0));
  g.fillStyle = rg; g.fill();
  if(g.createConicGradient){
    var cg = g.createConicGradient(0, 0, 0);
    cg.addColorStop(0, col(255, 240, 214, .34 * dim));
    cg.addColorStop(.25, col(255, 190, 110, .12 * dim));
    cg.addColorStop(.5, col(200, 90, 40, .02 * dim));
    cg.addColorStop(.75, col(255, 190, 110, .12 * dim));
    cg.addColorStop(1, col(255, 240, 214, .34 * dim));
    g.fillStyle = cg; g.fill();
  }
  g.globalCompositeOperation = "source-atop";
  var bg2 = g.createRadialGradient(0, 0, rIn, 0, 0, rOut);
  for(var s2 = 0; s2 <= 24; s2++){
    var f2 = s2 / 24;
    var wob = Math.sin(f2 * 21.3) * .5 + Math.sin(f2 * 47.7 + 1.3) * .3 + Math.sin(f2 * 9.1 + 2.2) * .2;
    bg2.addColorStop(f2, "rgba(34,12,4," + (Math.max(0, wob) * .12 * dim).toFixed(3) + ")");
  }
  g.fillStyle = bg2; g.fill();
  var hi = g.createRadialGradient(0, 0, rIn * .98, 0, 0, rIn * 1.34);
  hi.addColorStop(0, col(255, 248, 232, .5 * dim));
  hi.addColorStop(1, "rgba(255,240,220,0)");
  g.fillStyle = hi; g.fill();
  g.globalCompositeOperation = "destination-in";
  var mk = g.createLinearGradient(-rOut, 0, rOut, 0);
  mk.addColorStop(0, "rgba(0,0,0,.28)");
  mk.addColorStop(.38, "rgba(0,0,0,.72)");
  mk.addColorStop(.58, "rgba(0,0,0,1)");
  mk.addColorStop(1, "rgba(0,0,0,1)");
  g.fillStyle = mk;
  g.fillRect(-rOut - 8, -rOut - 8, rOut * 2 + 16, rOut * 2 + 16);
  g.globalCompositeOperation = "source-over";
  diskCache[key] = c;
  return c;
}
function drawHalf(cx, cy, R, back, dim){
  var tilt = diskTilt, rIn = R * 1.24, rOut = R * 4.4;
  var spr = annulusSprite(rIn, rOut, dim, back);
  ctx2.drawImage(spr, cx - spr.width / 2, cy - spr.height / 2);
  for(var i = 0; i < disk.length; i++){
    var p = disk[i];
    p.a += .0055 * Math.pow(1.26 / (1.26 + p.r * 1.9), 1.5);
    var sa = Math.sin(p.a);
    if(back ? sa >= 0 : sa < 0) continue;
    var r = R * (1.26 + p.r * 3.14);
    var x = cx + Math.cos(p.a) * r, y = cy + sa * r * tilt;
    var k = p.r;
    var dop = -Math.cos(p.a);
    var bright = p.o * (1 + .62 * dop) * (1 - .25 * k) * dim;
    if(bright <= .03) continue;
    var gg = 236 - 120 * k - 44 * Math.max(0, -dop);
    var bb = 208 - 156 * k - 100 * Math.max(0, -dop);
    var da = .009 * (1 - .3 * k);
    var x2 = cx + Math.cos(p.a - da) * r, y2 = cy + Math.sin(p.a - da) * r * tilt;
    ctx2.strokeStyle = col(255, gg, bb, Math.min(bright, 1) * .8);
    ctx2.lineWidth = p.w * DPR * (1.5 - .6 * k);
    ctx2.beginPath(); ctx2.moveTo(x2, y2); ctx2.lineTo(x, y); ctx2.stroke();
  }
  for(var si = 0; si < sparks.length; si++){
    var s = sparks[si];
    s.a += .03 * s.sp * Math.pow(1.26 / (1.26 + s.r * .5), 1.5);
    var sa2 = Math.sin(s.a);
    if(back ? sa2 >= 0 : sa2 < 0) continue;
    var rr = R * (1.27 + s.r * .55);
    var sx2 = cx + Math.cos(s.a) * rr, sy2 = cy + sa2 * rr * tilt;
    var fl = .5 + .5 * Math.sin(tNow * s.f * 3 + s.ph);
    var br = s.o * fl * (1 + .5 * -Math.cos(s.a)) * dim;
    if(br <= .04) continue;
    var dl = .02;
    var qx = cx + Math.cos(s.a - dl) * rr, qy = cy + Math.sin(s.a - dl) * rr * tilt;
    ctx2.strokeStyle = col(255, 240 - 60 * s.r, 214 - 100 * s.r, Math.min(br, 1) * .9);
    ctx2.lineWidth = 1.1 * DPR;
    ctx2.beginPath(); ctx2.moveTo(qx, qy); ctx2.lineTo(sx2, sy2); ctx2.stroke();
  }
  var rim = R * 1.26;
  var gr = ctx2.createLinearGradient(cx - rim, cy, cx + rim, cy);
  gr.addColorStop(0, col(255, 246, 228, .9 * dim));
  gr.addColorStop(.5, col(255, 214, 150, .55 * dim));
  gr.addColorStop(1, col(255, 150, 80, .28 * dim));
  ctx2.strokeStyle = gr; ctx2.lineWidth = 1.5 * DPR;
  ctx2.beginPath();
  if(back) ctx2.ellipse(cx, cy, rim, rim * tilt, 0, Math.PI, 2 * Math.PI);
  else ctx2.ellipse(cx, cy, rim, rim * tilt, 0, 0, Math.PI);
  ctx2.stroke();
}
function drawScene(now){
  if(!running) return;
  var t = now * .001;
  tNow = t;
  ctx2.setTransform(1, 0, 0, 1, 0, 0);
  ctx2.clearRect(0, 0, W, H);
  px += (tpx - px) * .03; py += (tpy - py) * .03;
  var base = Math.min(W, H);
  var doc = document.documentElement;
  var maxSc = Math.max(1, doc.scrollHeight - innerHeight);
  var sp = Math.max(0, Math.min(1, (window.scrollY || 0) / maxSc));
  var jp = (!reduced && secKeys.length) ? journeyAt(sp) : secKeys[0];
  if(!jp) jp = {x: .645, y: .53, s: 1, dim: 1, op: 1, tilt: .19};
  var isMid = !isNarrow && innerWidth < 1080;
  var hx = W * jp.x, hy = H * jp.y;
  var R = base * (isNarrow ? .24 : .235) * jp.s;
  var dim = jp.dim * (isMid ? .85 : 1);
  diskTilt = jp.tilt;
  var z = 1 + .028 * Math.sin(t * .045) + .016 * Math.sin(t * .017 + 2.1);
  ctx2.save();
  ctx2.translate(hx + (px - .5) * base * .05 + 6 * DPR * Math.sin(t * .011), hy + (py - .5) * base * .04);
  ctx2.scale(z, z);
  ctx2.translate(-hx, -hy);
  var cx = hx + (px - .5) * base * .05, cy = hy + (py - .5) * base * .04;
  cv.style.opacity = jp.op.toFixed(3);
  ctx2.globalCompositeOperation = "source-over";
  var lr = R * 3.4;
  for(var i = 0; i < stars.length; i++){
    var st = stars[i];
    var sx = (st.x * W + (px - .5) * 42 * st.z * DPR) % W; if(sx < 0) sx += W;
    var sy = (st.y * H + (py - .5) * 26 * st.z * DPR) % H; if(sy < 0) sy += H;
    var a = .2 + .55 * st.z * (.6 + .4 * Math.sin(t * 1.2 + st.tw));
    var dx = sx - cx, dy = sy - cy, d2 = dx * dx + dy * dy;
    if(d2 < lr * lr && d2 > 1){
      var d = Math.sqrt(d2);
      var bend = Math.min(R * R * .9 / d, R);
      var nx = sx + dx / d * bend, ny = sy + dy / d * bend;
      if(d < R * 1.6){
        var tx = -dy / d, ty2 = dx / d;
        var sl = (1.6 - d / (R * 1.6)) * 7 * st.z * DPR + 2 * DPR;
        ctx2.strokeStyle = col(216, 228, 255, Math.min(1, a * 1.35));
        ctx2.lineWidth = st.r * DPR;
        ctx2.beginPath(); ctx2.moveTo(nx - tx * sl, ny - ty2 * sl); ctx2.lineTo(nx + tx * sl, ny + ty2 * sl); ctx2.stroke();
        continue;
      }
      sx = nx; sy = ny;
    }
    ctx2.fillStyle = col(206, 222, 255, a);
    ctx2.beginPath(); ctx2.arc(sx, sy, st.r * DPR, 0, 7); ctx2.fill();
  }
  var amb = ctx2.createRadialGradient(cx, cy, R * .3, cx, cy, R * 4.6);
  amb.addColorStop(0, "rgba(255,196,120,.10)"); amb.addColorStop(.55, "rgba(255,140,60,.04)"); amb.addColorStop(1, "rgba(0,0,0,0)");
  ctx2.fillStyle = amb; ctx2.fillRect(0, 0, W, H);
  ctx2.globalCompositeOperation = "lighter";
  drawHalf(cx, cy, Math.round(R / 3) * 3, true, Math.round(dim * 11) / 20);
  ctx2.globalCompositeOperation = "source-over";
  var eh = ctx2.createRadialGradient(cx - R * .18, cy - R * .18, R * .08, cx, cy, R * 1.02);
  eh.addColorStop(0, "#000"); eh.addColorStop(.85, "#010204"); eh.addColorStop(1, "rgba(2,5,10,.97)");
  ctx2.fillStyle = eh; ctx2.beginPath(); ctx2.arc(cx, cy, R * 1.005, 0, 6.283); ctx2.fill();
  ctx2.save();
  if(!isNarrow){
  ctx2.beginPath(); ctx2.arc(cx, cy, R * .985, 0, 6.283); ctx2.clip();
  var limb = ctx2.createLinearGradient(cx - R, cy, cx + R, cy);
  limb.addColorStop(0, "rgba(255,196,120," + .34 * dim + ")");
  limb.addColorStop(.45, "rgba(255,170,90," + .07 * dim + ")");
  limb.addColorStop(1, "rgba(0,0,0,0)");
  ctx2.strokeStyle = limb; ctx2.lineWidth = R * .1;
  ctx2.beginPath(); ctx2.arc(cx, cy, R * .94, Math.PI * .45, Math.PI * 1.55); ctx2.stroke();
  }
  ctx2.restore();
  var pulse = .8 + .18 * Math.sin(t * .9);
  ctx2.strokeStyle = "rgba(255,242,224," + .9 * pulse * dim + ")";
  ctx2.lineWidth = 1.3 * DPR;
  ctx2.shadowColor = "rgba(255,206,138,.95)"; ctx2.shadowBlur = 12 * DPR;
  ctx2.beginPath(); ctx2.arc(cx, cy, R * 1.045, 0, 6.283); ctx2.stroke();
  ctx2.shadowBlur = 0;
  ctx2.globalCompositeOperation = "lighter";
  var lg = ctx2.createLinearGradient(cx, cy - R * 1.5, cx, cy + R * 1.5);
  lg.addColorStop(0, col(255, 236, 200, .62 * dim));
  lg.addColorStop(.5, col(255, 172, 92, .30 * dim));
  lg.addColorStop(1, col(255, 236, 200, .56 * dim));
  if(!isNarrow){
  ctx2.strokeStyle = lg; ctx2.lineWidth = 1.7 * DPR;
  ctx2.shadowColor = "rgba(255,190,110,.85)"; ctx2.shadowBlur = 7 * DPR;
  ctx2.beginPath(); ctx2.ellipse(cx, cy, R * .78, R * 1.42, 0, 0, 6.283); ctx2.stroke();
  ctx2.strokeStyle = col(255, 244, 222, .8 * dim); ctx2.lineWidth = 2.2 * DPR;
  ctx2.beginPath(); ctx2.ellipse(cx, cy, R * .78, R * 1.42, 0, Math.PI * 1.18, Math.PI * 1.82); ctx2.stroke();
  ctx2.beginPath(); ctx2.ellipse(cx, cy, R * .78, R * 1.42, 0, Math.PI * .18, Math.PI * .82); ctx2.stroke();
  ctx2.shadowBlur = 0;
  ctx2.strokeStyle = col(255, 196, 128, .10 * dim); ctx2.lineWidth = R * .05;
  ctx2.beginPath(); ctx2.ellipse(cx, cy, R * .83, R * 1.5, 0, 0, 6.283); ctx2.stroke();
  }
  drawHalf(cx, cy, Math.round(R / 3) * 3, false, Math.round(dim * 20) / 20);
  ctx2.restore();
  rafId = requestAnimationFrame(drawScene);
}
function startScene(){ if(running) return; running = true; rafId = requestAnimationFrame(drawScene); }
function stopScene(){ running = false; if(rafId) cancelAnimationFrame(rafId); }
var secKeys = [];
function buildJourney(){
  var ids = ["hero", "about", "arch", "features", "perf", "status", "faq", "cta"];
  var states = isNarrow ? [
    {x: .5, y: .60, s: 1,   dim: .48, op: 1,   tilt: .19},
    {x: .5, y: .80, s: .58, dim: .26, op: .3,  tilt: .23},
    {x: .5, y: .20, s: .4,  dim: .22, op: .26, tilt: .14},
    {x: .5, y: .72, s: .52, dim: .26, op: .28, tilt: .26},
    {x: .5, y: .28, s: .34, dim: .18, op: .22, tilt: .16},
    {x: .5, y: .5,  s: .28, dim: .15, op: .18, tilt: .2},
    {x: .5, y: .44, s: .24, dim: .13, op: .16, tilt: .2},
    {x: .5, y: .48, s: .3,  dim: .26, op: .28, tilt: .2}
  ] : [
    {x: .645, y: .53, s: 1,   dim: 1,   op: 1,   tilt: .19},
    {x: .84,  y: .34, s: .46, dim: .4,  op: .34, tilt: .2},
    {x: .8,   y: .3,  s: .44, dim: .38, op: .34, tilt: .14},
    {x: .77,  y: .56, s: .56, dim: .42, op: .36, tilt: .24},
    {x: .16,  y: .7,  s: .4,  dim: .3,  op: .3,  tilt: .16},
    {x: .5,   y: .38, s: .32, dim: .24, op: .24, tilt: .2},
    {x: .5,   y: .5,  s: .27, dim: .2,  op: .2,  tilt: .2},
    {x: .5,   y: .52, s: .44, dim: .5,  op: .44, tilt: .19}
  ];
  var doc = document.documentElement;
  var max = Math.max(1, doc.scrollHeight - innerHeight);
  secKeys = ids.map(function(id, i){
    var el = document.getElementById(id);
    var center = el ? el.offsetTop + el.offsetHeight / 2 - innerHeight / 2 : 0;
    var st = states[i];
    st.at = i === 0 ? 0 : Math.max(0, Math.min(1, center / max));
    return st;
  });
}
function journeyAt(sp){
  if(sp <= 0 || secKeys.length < 2) return secKeys[0];
  for(var i = 1; i < secKeys.length; i++){
    var b = secKeys[i];
    if(sp <= b.at){
      var a = secKeys[i - 1];
      var t = b.at > a.at ? (sp - a.at) / (b.at - a.at) : 1;
      t = t * t * (3 - 2 * t);
      return {
        x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
        s: a.s + (b.s - a.s) * t, dim: a.dim + (b.dim - a.dim) * t,
        op: a.op + (b.op - a.op) * t, tilt: a.tilt + (b.tilt - a.tilt) * t
      };
    }
  }
  return secKeys[secKeys.length - 1];
}
sizeCanvas(); initScene(); buildJourney();

/* ---- journey rail: section-aware progress nav ---- */
var railLinks = [];
(function initJourneyRail(){
  var ids = ["hero", "about", "arch", "features", "perf", "status", "faq", "cta"];
  var labels = ["Intro", "Overview", "Architecture", "Features", "Performance", "Status", "FAQ", "Get started"];
  var rail = document.createElement("div");
  rail.className = "jrail";
  rail.setAttribute("role", "navigation");
  rail.setAttribute("aria-label", "Page journey");
  ids.forEach(function(id, i){
    var a = document.createElement("a");
    a.href = "#" + id;
    a.setAttribute("aria-label", labels[i]);
    var lbl = document.createElement("span"); lbl.className = "lbl"; lbl.textContent = labels[i];
    var dot = document.createElement("span"); dot.className = "dot";
    a.appendChild(lbl); a.appendChild(dot);
    a.addEventListener("click", function(e){
      e.preventDefault();
      var doc = document.documentElement;
      var max = Math.max(1, doc.scrollHeight - innerHeight);
      var el = document.getElementById(id);
      var target = secKeys[i] ? secKeys[i].at * max : (el ? el.offsetTop : 0);
      window.scrollTo({top: target, behavior: reduced ? "auto" : "smooth"});
      if(history.replaceState) history.replaceState(null, "", "#" + id);
    });
    rail.appendChild(a);
    railLinks.push(a);
  });
  document.body.appendChild(rail);
  function updateRail(){
    if(!secKeys.length) return;
    var doc = document.documentElement;
    var max = Math.max(1, doc.scrollHeight - innerHeight);
    var sp = Math.max(0, Math.min(1, (window.scrollY || 0) / max));
    var on = 0;
    for(var i = 1; i < secKeys.length; i++){
      var mid = (secKeys[i - 1].at + secKeys[i].at) / 2;
      if(sp >= mid) on = i;
    }
    railLinks.forEach(function(a, i){
      a.classList.toggle("on", i === on);
      a.classList.toggle("past", i < on);
    });
  }
  document.addEventListener("scroll", updateRail, {passive: true});
  window.addEventListener("resize", updateRail, {passive: true});
  updateRail();
})();
if(reduced){
  running = true; drawScene(4200); stopScene();
} else {
  startScene();
  setTimeout(function(){
    if(!running) return;
    var n = 0, t0 = performance.now();
    (function tick(){ n++; if(performance.now() - t0 < 2000) requestAnimationFrame(tick);
      else if(n / 2 < 40){ diskScale = .5; initScene(); } })();
  }, 1500);
  window.addEventListener("resize", function(){ sizeCanvas(); initScene(); buildJourney(); }, {passive: true});
  document.addEventListener("visibilitychange", function(){ if(document.hidden) stopScene(); else startScene(); });
  if(finePointer){
    document.addEventListener("pointermove", function(e){ tpx = e.clientX / innerWidth; tpy = e.clientY / innerHeight; }, {passive: true});
  }
  var mb = document.getElementById("menuBtn"), mpl = document.getElementById("menuPanel");
  if(mb && mpl){
    var closeMenu = function(){ mpl.classList.remove("open"); mb.setAttribute("aria-expanded", "false"); };
    mb.addEventListener("click", function(e){
      e.stopPropagation();
      var open = mpl.classList.toggle("open");
      mb.setAttribute("aria-expanded", open ? "true" : "false");
    });
    mpl.querySelectorAll("a").forEach(function(a){ a.addEventListener("click", closeMenu); });
    document.addEventListener("click", function(e){ if(mpl.classList.contains("open") && !mpl.contains(e.target)) closeMenu(); });
  }
  (function(){
    var fc = document.getElementById("archflow");
    if(!fc) return;
    var fx = fc.getContext("2d");
    var fw = 0, fh = 0, nodes = [], edges = [], packets = [], visible = false, frun = false, last = 0, spawnAt = 0;
    var layers = Array.prototype.slice.call(document.querySelectorAll("#arch .layer"));
    function size(){
      var r = fc.getBoundingClientRect();
      fw = Math.max(1, r.width); fh = Math.max(1, r.height);
      fc.width = fw * DPR; fc.height = fh * DPR;
      fx.setTransform(DPR, 0, 0, DPR, 0, 0);
      nodes = [
        {name: "wax-app",    x: fw * .13, y: fh * .50, f: 0},
        {name: "wax-core",   x: fw * .52, y: fh * .26, f: 0},
        {name: "wax-tunnel", x: fw * .52, y: fh * .74, f: 0},
        {name: "wax-warp",   x: fw * .88, y: fh * .26, f: 0}
      ];
      edges = [
        {a: 0, b: 1, bow: -.12, opt: false},
        {a: 0, b: 2, bow:  .12, opt: false},
        {a: 1, b: 2, bow:  .28, opt: false},
        {a: 3, b: 1, bow:  .10, opt: true}
      ];
    }
    function ctrl(e){
      var mx = (nodes[e.a].x + nodes[e.b].x) / 2, my = (nodes[e.a].y + nodes[e.b].y) / 2;
      var dx = nodes[e.b].x - nodes[e.a].x, dy = nodes[e.b].y - nodes[e.a].y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      return {x: mx - dy / len * e.bow * len, y: my + dx / len * e.bow * len};
    }
    function epos(e, t){
      var c = ctrl(e), u = 1 - t;
      return {
        x: u * u * nodes[e.a].x + 2 * u * t * c.x + t * t * nodes[e.b].x,
        y: u * u * nodes[e.a].y + 2 * u * t * c.y + t * t * nodes[e.b].y
      };
    }
    function pickEdge(){
      var r = Math.random();
      if(r < .18) return edges[3];
      return edges[Math.floor(Math.random() * 3)];
    }
    function drawFrame(dt){
      fx.clearRect(0, 0, fw, fh);
      var i, e, c;
      fx.lineWidth = 1.1;
      for(i = 0; i < edges.length; i++){
        e = edges[i]; c = ctrl(e);
        fx.strokeStyle = e.opt ? "rgba(139,124,255,.4)" : "rgba(53,224,255,.28)";
        fx.setLineDash(e.opt ? [4, 5] : []);
        fx.beginPath();
        fx.moveTo(nodes[e.a].x, nodes[e.a].y);
        fx.quadraticCurveTo(c.x, c.y, nodes[e.b].x, nodes[e.b].y);
        fx.stroke();
      }
      fx.setLineDash([]);
      var ow = nodes[3];
      fx.font = "9px 'JetBrains Mono', monospace";
      fx.textAlign = "center";
      fx.fillStyle = col(139, 124, 255, .75);
      fx.fillText("opt-in", (ow.x + nodes[1].x) / 2 + 4, (ow.y + nodes[1].y) / 2 - 8);
      for(i = packets.length - 1; i >= 0; i--){
        var p = packets[i];
        p.t += dt * p.v;
        if(p.t >= 1){ nodes[p.e.b].f = 1; pulse(p.e.b); packets.splice(i, 1); continue; }
        var pos = epos(p.e, p.t);
        var gl = fx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 7);
        gl.addColorStop(0, "rgba(190,245,255,.95)");
        gl.addColorStop(.4, p.e.opt ? "rgba(139,124,255,.55)" : "rgba(53,224,255,.55)");
        gl.addColorStop(1, "rgba(53,224,255,0)");
        fx.fillStyle = gl;
        fx.beginPath(); fx.arc(pos.x, pos.y, 7, 0, 7); fx.fill();
      }
      fx.font = "10px 'JetBrains Mono', monospace";
      fx.textAlign = "center";
      for(i = 0; i < nodes.length; i++){
        var nd = nodes[i];
        nd.f = Math.max(0, nd.f - dt * .0016);
        fx.fillStyle = col(53, 224, 255, .25 + nd.f * .7);
        fx.beginPath(); fx.arc(nd.x, nd.y, 3 + nd.f * 3, 0, 7); fx.fill();
        fx.strokeStyle = col(53, 224, 255, .35 + nd.f * .6);
        fx.lineWidth = 1;
        fx.beginPath(); fx.arc(nd.x, nd.y, 6.5 + nd.f * 5, 0, 7); fx.stroke();
        fx.fillStyle = col(139, 157, 194, .85);
        fx.fillText(nd.name, nd.x, nd.y + 22);
      }
    }
    var liveTimers = {};
    function pulse(j){
      var el = layers[j]; if(!el) return;
      el.classList.add("live");
      clearTimeout(liveTimers[j]);
      liveTimers[j] = setTimeout(function(){ el.classList.remove("live"); }, 380);
    }
    function loop(now){
      if(!visible || document.hidden){ frun = false; return; }
      var dt = Math.min(50, now - last); last = now;
      if(now >= spawnAt){ var e2 = pickEdge(); packets.push({e: e2, t: 0, v: .0016 + Math.random() * .0009}); nodes[e2.a].f = Math.max(nodes[e2.a].f, .55); spawnAt = now + 700 + Math.random() * 1100; }
      drawFrame(dt);
      requestAnimationFrame(loop);
    }
    function kick(){
      if(reduced){ drawFrame(16); return; }
      if(!frun && visible && !document.hidden){ frun = true; last = performance.now(); spawnAt = 0; requestAnimationFrame(loop); }
    }
    size();
    window.addEventListener("resize", function(){ size(); if(reduced) drawFrame(16); });
    if(reduced){ drawFrame(16); }
    else{
      new IntersectionObserver(function(es){ visible = es[0].isIntersecting; kick(); }, {threshold: .1}).observe(fc);
      document.addEventListener("visibilitychange", kick);
    }
    layers.forEach(function(el, j){
      el.addEventListener("pointerenter", function(){ if(nodes[j]) nodes[j].f = 1; if(reduced) drawFrame(16); });
    });
  })();
}
})();
