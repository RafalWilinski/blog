// @ts-nocheck
(function(){
'use strict';
const root = document.documentElement;
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r) => (r||document).querySelector(s);
const C = {};
const CN = ['bg','paper','mat','grid','ink','ink2','ink3','rule','track','link','cx','cc','pi','cxs','ccs','pis','sys','tools','mem','user','asst','call','res','sum','free','hit','miss','write'];
function readColors(){ const s = getComputedStyle(root); CN.forEach(n => C[n] = s.getPropertyValue('--td-'+n).trim() || '#888'); }
readColors();
const MONO = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
const SANS = "'Geist', 'Inter', system-ui, -apple-system, sans-serif";
function font(px, w){ return (w||400)+' '+px+'px '+MONO; }
function hex(c){ c = c.replace('#',''); if (c.length===3) c = c.split('').map(x=>x+x).join(''); const n = parseInt(c,16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function mix(a,b,t){ const A=hex(a),B=hex(b); return 'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')+')'; }
function alpha(a,t){ const A=hex(a); return 'rgba('+A.join(',')+','+t+')'; }
const fmt = n => Math.round(n).toLocaleString('en-US');
function fmtK(n){ n=Math.round(n); if (n>=1e9) return (n/1e9).toFixed(n>=1e10?0:1)+'B'; if (n>=1e6) return (n/1e6).toFixed(n>=1e7?0:1)+'M'; if (n>=1e3) return (n/1e3).toFixed(n>=1e4?0:1)+'k'; return String(n); }
function money(x){ return '$'+(x<10? x.toFixed(2) : x<100? x.toFixed(1) : Math.round(x).toLocaleString('en-US')); }
function clamp(x,a,b){ return Math.max(a,Math.min(b,x)); }
function lerp(a,b,t){ return a+(b-a)*t; }
function ease(t){ t=clamp(t,0,1); return t<.5? 2*t*t : 1-Math.pow(-2*t+2,2)/2; }
function rng(seed){ let a = seed>>>0; return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function rr(g,x,y,w,h,r){ r=Math.max(0,Math.min(r,w/2,h/2)); g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function esc(s){ return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

const figs = [];
const io = new IntersectionObserver(es => { es.forEach(e => { const f = e.target.__fig; if (f){ f.visible = e.isIntersecting; if (f.visible) f.draw(); } }); }, {rootMargin:'100px'});
function fig(id, setup){
  const el = document.getElementById(id); if (!el) return;
  const f = { el, visible:false, draw(){}, tick:null };
  el.__fig = f;
  try { setup(f, el); } catch(err){ console.error('figure '+id, err); }
  figs.push(f); io.observe(el);
  try { f.draw(); } catch(err){ console.error('draw '+id, err); }
}
function canvas(f, parent, hf){
  const c = document.createElement('canvas'); parent.appendChild(c); const fc = parent.closest('figure'); const cap = fc && fc.querySelector('figcaption'); c.setAttribute('role','img'); if (cap) c.setAttribute('aria-label', cap.textContent.trim().slice(0, 400));
  const g = c.getContext('2d'); const o = { c, g, w:0, h:0, d:1 };
  o.rs = function(){ const w = Math.max(10, Math.floor(parent.clientWidth)); const h = Math.round(hf(w)); const d = Math.min(window.devicePixelRatio||1, 2);
    if (o.w===w && o.h===h && o.d===d) return false; o.w=w; o.h=h; o.d=d; c.width=Math.round(w*d); c.height=Math.round(h*d); c.style.width=w+'px'; c.style.height=h+'px'; g.setTransform(d,0,0,d,0,0); return true; };
  o.rs();
  o.clear = function(){ g.setTransform(o.d,0,0,o.d,0,0); g.clearRect(0,0,o.w,o.h); };
  o.pt = function(ev){ const r = c.getBoundingClientRect(); const p = ev.touches? ev.touches[0] : ev; return { x: p.clientX - r.left, y: p.clientY - r.top }; };
  new ResizeObserver(() => { if (o.rs()) f.draw(); }).observe(parent);
  return o;
}
function redrawAll(){ readColors(); figs.forEach(f => { try { f.draw(); } catch(e){ console.error(e); } }); }
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redrawAll);
new MutationObserver(redrawAll).observe(root, { attributes:true, attributeFilter:['data-theme','class','style'] });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(redrawAll);
let last = 0;
function loop(t){ const dt = Math.min(0.05, last ? (t-last)/1000 : 0); last = t;
  for (const f of figs){ if (f.visible && f.tick){ try { if (f.tick(dt) !== false) f.draw(); } catch(e){ console.error(e); f.tick = null; } } }
  requestAnimationFrame(loop); }
requestAnimationFrame(loop);
function bindRange(id, fn){ const el = document.getElementById(id); const out = document.getElementById(id+'-out'); const h = () => { const r = fn(+el.value); if (out && r !== undefined) out.textContent = r; }; el.addEventListener('input', h); h(); return el; }
function playBtn(btn, get, set){ const upd = () => { const p = get(); btn.textContent = p ? 'Pause' : 'Play'; btn.setAttribute('aria-pressed', p ? 'true':'false'); }; btn.addEventListener('click', () => { set(!get()); upd(); }); upd(); return upd; }
// axis helper: draws light grid + labels. box={x,y,w,h}
function axes(g, box, o){
  g.save(); g.font = font(10); g.fillStyle = C.ink3; g.strokeStyle = C.rule; g.lineWidth = 1;
  (o.yt||[]).forEach(v => { const y = Math.round(o.ys(v))+.5; g.beginPath(); g.moveTo(box.x, y); g.lineTo(box.x+box.w, y); g.stroke(); g.textAlign='right'; g.textBaseline='middle'; g.fillText(o.yf? o.yf(v):String(v), box.x-6, y); });
  (o.xt||[]).forEach(v => { const x = o.xs(v); g.textAlign='center'; g.textBaseline='top'; g.fillText(o.xf? o.xf(v):String(v), x, box.y+box.h+6); });
  g.strokeStyle = C.ink3; g.beginPath(); g.moveTo(box.x, box.y+box.h+.5); g.lineTo(box.x+box.w, box.y+box.h+.5); g.stroke();
  if (o.xl){ g.textAlign='right'; g.textBaseline='top'; g.fillText(o.xl, box.x+box.w, box.y+box.h+20); }
  if (o.yl){ g.textAlign='left'; g.textBaseline='bottom'; g.fillText(o.yl, box.x-0, box.y-6); }
  g.restore();
}
function niceTicks(max, n){ const raw = max/n; const p = Math.pow(10, Math.floor(Math.log10(raw))); const m = raw/p; const step = (m<1.5?1:m<3?2:m<7?5:10)*p; const t=[]; for (let v=0; v<=max+1e-9; v+=step) t.push(v); return t; }
function sans(px, w){ return Math.min(w||500, 500)+' '+px+'px '+SANS; }
function seg(id, fn){ const el = document.getElementById(id); const bs = [...el.querySelectorAll('button')];
  const set = b => { bs.forEach(x => x.setAttribute('aria-pressed', x===b ? 'true':'false')); fn(b.dataset.v ?? b.dataset.m ?? b.dataset.e, b); };
  bs.forEach(b => b.addEventListener('click', () => set(b)));
  const cur = bs.find(b => b.getAttribute('aria-pressed')==='true'); return { set, cur, bs }; }
const HN = { cx:'Codex', cc:'Claude Code', pi:'pi' }; const HS = ['cx','cc','pi'];
function fmtT(n){ n=Math.round(n); if (Math.abs(n)>=1e6) return (n/1e6).toFixed(n%1e6===0?0:2).replace(/\.?0+$/,'')+'M'; if (Math.abs(n)>=1e3) return (n/1e3).toFixed(1).replace(/\.0$/,'')+'K'; return String(n); }
function lbl(g, text, x, y, o){ o=o||{}; g.font = o.font || font(10.5); g.fillStyle = o.color || C.ink2; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle'; g.fillText(text, x, y); }
function onColor(c){ if (!c || c[0] !== '#') return '#fff'; const [r,g2,b] = hex(c); const L = (0.299*r + 0.587*g2 + 0.114*b)/255; return L > 0.6 ? '#10151B' : '#FFFFFF'; }

const CATN = { sys:'system / instructions', tools:'tool definitions', mem:'memory / context file', user:'user message', asst:'assistant message', call:'tool call', res:'tool result', sum:'summary', think:'reasoning' };
function hover(f, cv){
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; cv.c.parentNode.appendChild(tip); f.hits = [];
  const mv = ev => { const p = cv.pt(ev); const h = (f.hits||[]).slice().reverse().find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    if (!h){ tip.hidden = true; cv.c.style.cursor = ''; return; } cv.c.style.cursor = 'crosshair';
    tip.innerHTML = h.html; tip.hidden = false; let left = p.x + 14; if (left + 230 > cv.w) left = Math.max(0, p.x - 244); tip.style.left = left + 'px'; tip.style.top = Math.max(0, p.y + 16) + 'px'; };
  cv.c.addEventListener('mousemove', mv); cv.c.addEventListener('mouseleave', () => tip.hidden = true); cv.c.addEventListener('touchstart', mv, { passive: true });
}

// ───────── shared rules (exact formulas from source / binary)
const RULE = {
  cx: W => Math.floor(W*9/10),
  cxHard: W => Math.floor(W*95/100),
  ccEff: (W, out) => W - Math.min(out||32000, 20000),
  cc: (W, out) => RULE.ccEff(W, out) - 13000,
  ccWarn: (W, out) => RULE.cc(W, out) - 20000,
  ccBlock: (W, out) => RULE.ccEff(W, out) - 3000,
  pi: W => W - 16384,
};
const HCOL = h => C[h];

// ───────── Specimen 0: the race
fig('f-race', (f) => {
  let W = 200000, playing = !REDUCE, acc = 0, step = 0;
  const cv = canvas(f, $('#race-canvas'), w => w < 560 ? 252 : 222);
  let R, S;
  const BASE = { cx: 14000, cc: 20000, pi: 3500 };
  function reset(){
    R = rng(7); step = 0; acc = 0;
    S = {}; HS.forEach(h => S[h] = { base: BASE[h], sum: 0, kept: 0, live: 0, comps: 0, flash: 0, userAll: 0, files: 0 });
  }
  function delta(){ // one agent step: assistant text + tool call + tool result, a user message every ~7 steps
    const res = Math.round(300 + Math.pow(R(), 2.2)*9000);
    const d = { a: Math.round(80 + R()*380), c: Math.round(60 + R()*160), r: res, u: 0, file: R() < 0.35 };
    if (step % 7 === 0) d.u = Math.round(120 + R()*620);
    return d;
  }
  const ctx = s => s.base + s.sum + s.kept + s.live;
  const trig = h => h==='cx' ? RULE.cx(W) : h==='cc' ? RULE.cc(W) : RULE.pi(W);
  function advance(){
    const d = delta(); step++;
    HS.forEach(h => { const s = S[h]; const add = d.a + d.c + d.r + d.u; s.live += add; s.userAll += d.u; if (d.file) s.files++;
      s.lastAdd = add;
      if (ctx(s) > trig(h)){
        s.drop = { from: ctx(s), t: 2.6 }; s.comps++; s.flash = 1;
        if (h === 'cx'){ s.sum = 2500; s.kept = Math.min(20000, s.userAll); s.live = 0; }
        if (h === 'cc'){ s.sum = 3200; s.kept = Math.min(5, s.files)*3500 + 2000; s.live = 0; }
        if (h === 'pi'){ const msgs = s.kept + s.live; s.sum = 2800; s.kept = Math.min(msgs, 20000 + Math.round(s.lastAdd*0.5)); s.live = 0; }
      }
    });
  }
  reset();
  if (REDUCE){ for (let i=0;i<120;i++) advance(); }
  const segW = seg('race-w', v => { W = +v; reset(); if (REDUCE) for (let i=0;i<Math.round(120*W/200000);i++) advance(); f.draw(); });
  const pb = $('#race-play'); if (REDUCE) pb.textContent = 'Play';
  pb.addEventListener('click', () => { playing = !playing; pb.textContent = playing ? 'Pause' : 'Play'; });
  $('#race-reset').addEventListener('click', () => { reset(); f.draw(); });
  f.tick = dt => { if (!playing) return false; acc += dt * 6 * (W/200000); let n = 0; while (acc >= 1 && n < 40){ acc -= 1; advance(); n++; } HS.forEach(h => { S[h].flash = Math.max(0, S[h].flash - dt*1.6); if (S[h].drop) S[h].drop.t -= dt; }); return true; };
  f.draw = function(){
    const { g, w, h } = cv; cv.clear(); const narrow = w < 560;
    const x0 = narrow ? 8 : 128, x1 = w - (narrow ? 58 : 70), bw = x1 - x0;
    const laneH = narrow ? 80 : 68, top = 14;
    const sx = v => x0 + v / W * bw;
    HS.forEach((hk, i) => {
      const s = S[hk], y = top + i*laneH, by = y + (narrow ? 30 : 16), bh = 24;
      g.font = sans(15, 700); g.fillStyle = HCOL(hk); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText(HN[hk], 8, narrow ? y + 14 : by + 11);
      lbl(g, s.comps + (s.comps===1?' compaction':' compactions'), narrow ? 8 + g.measureText(HN[hk]).width + 10 : 8, narrow ? y + 10 : by + 26, { color: C.ink3, font: font(10.5) });
      g.fillStyle = C.free; rr(g, x0, by, bw, bh, 3); g.fill();
      let x = x0; const segs = [['base', C.sys], ['sum', C.sum], ['kept', alpha(HCOL(hk), .45)], ['live', HCOL(hk)]];
      g.save(); rr(g, x0, by, bw, bh, 3); g.clip();
      segs.forEach(([k, col]) => { const ww = s[k]/W*bw; if (ww > 0){ g.fillStyle = col; g.fillRect(x, by, ww, bh); x += ww; } });
      g.restore();
      if (s.drop && s.drop.t > 0){ g.globalAlpha = Math.min(1, s.drop.t); lbl(g, 'compacted ' + fmtT(s.drop.from) + ' → ' + fmtT(ctx(s) - s.live), x + 8, by + bh/2, { color: C.ink, font: font(10.5, 600) }); g.globalAlpha = 1; }
      if (s.flash > 0){ g.strokeStyle = alpha(C.sum, s.flash); g.lineWidth = 3; rr(g, x0-2, by-2, bw+4, bh+4, 5); g.stroke(); }
      const tx = sx(trig(hk)); g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(tx, by-6); g.lineTo(tx, by+bh+6); g.stroke();
      lbl(g, 'compacts at '+fmtT(trig(hk)), tx - 4, by - 9, { align: 'right', color: C.ink2, font: font(10) });
      lbl(g, fmtT(ctx(s)), x1 + 8, by + bh/2, { color: C.ink, font: font(12, 600) });
    });
    $('#race-step').textContent = 'step ' + step + ' · window ' + fmtT(W);
  };
});

// ───────── Specimen 1: trigger arithmetic
fig('f-trig', (f) => {
  const WS = [128000, 200000, 272000, 400000, 1000000, 2000000];
  let W = 200000, OUT = 32000;
  const cv = canvas(f, $('#trig-canvas'), w => 3*86 + 18);
  f.draw = function(){
    const { g, w } = cv; cv.clear();
    const x0 = 14, x1 = w - 14, bw = x1 - x0; const sx = v => x0 + v/W*bw;
    const lanes = [
      { h:'cx', marks:[ { v:RULE.cx(W), t:'auto-compact 90%', main:true }, { v:RULE.cxHard(W), t:'hard cap 95%', col:C.miss } ] },
      { h:'cc', marks:[ { v:RULE.ccWarn(W,OUT), t:'warning', col:C.write }, { v:RULE.cc(W,OUT), t:'auto-compact', main:true }, { v:RULE.ccBlock(W,OUT), t:'blocks', col:C.miss }, { v:RULE.ccEff(W,OUT), t:'effective window', col:C.ink3, dash:true } ] },
      { h:'pi', marks:[ { v:RULE.pi(W), t:'auto-compact (−16,384)', main:true } ] },
    ];
    lanes.forEach((L, i) => {
      const y = 12 + i*86, by = y + 34, bh = 14;
      g.font = sans(14, 700); g.fillStyle = HCOL(L.h); g.textAlign='left'; g.textBaseline='alphabetic'; g.fillText(HN[L.h], x0, y + 10);
      g.fillStyle = C.free; g.fillRect(x0, by, bw, bh);
      const main = L.marks.find(m => m.main);
      g.fillStyle = alpha(HCOL(L.h), .8); g.fillRect(x0, by, sx(main.v)-x0, bh);
      // headroom hatch
      g.save(); g.beginPath(); g.rect(sx(main.v), by, x1 - sx(main.v), bh); g.clip(); g.strokeStyle = alpha(HCOL(L.h), .45); g.lineWidth = 1;
      for (let xx = sx(main.v) - bh; xx < x1; xx += 5){ g.beginPath(); g.moveTo(xx, by+bh); g.lineTo(xx+bh, by); g.stroke(); } g.restore();
      // main label above
      const mx = sx(main.v);
      lbl(g, main.t + ' · ' + fmt(main.v), Math.min(mx, x1), by - 8, { align: mx > w*0.55 ? 'right' : 'left', color: C.ink, font: font(11, 600) });
      // secondary labels below, staggered
      const sec = L.marks.filter(m => !m.main).sort((a,b) => a.v-b.v); let lastX = -1e9, row = 0;
      sec.forEach(m => { const xx = sx(m.v); g.strokeStyle = m.col; g.lineWidth = 1.5; if (m.dash) g.setLineDash([3,3]); g.beginPath(); g.moveTo(xx, by-3); g.lineTo(xx, by+bh+4+row*13); g.stroke(); g.setLineDash([]);
        row = (xx - lastX < 150) ? row + 1 : 0; lastX = xx;
        lbl(g, m.t + ' ' + fmtT(m.v), Math.max(x0, Math.min(xx, x1)), by + bh + 11 + row*13, { align: xx > w*0.6 ? 'right' : 'left', color: m.col === C.ink3 ? C.ink3 : m.col, font: font(10) });
      });
      g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(mx, by-3); g.lineTo(mx, by+bh+3); g.stroke();
    });
    const rd = HS.map(h => { const t = h==='cx' ? RULE.cx(W) : h==='cc' ? RULE.cc(W,OUT) : RULE.pi(W); const hr = W - t;
      return '<div class="'+h+'">'+HN[h]+' headroom<b>'+fmt(hr)+'</b><small>'+(hr/W*100).toFixed(1)+'% of the window unused at the trigger</small></div>'; });
    $('#trig-read').innerHTML = rd.join('');
  };
  bindRange('trig-w', i => { W = WS[i]; f.draw(); return fmtT(W) + ' tokens'; });
  bindRange('trig-o', v => { OUT = v*1000; f.draw(); return fmtT(OUT); });
});

// ───────── Specimen 2: request layout and cache line
fig('f-req', (f) => {
  let uid = 0; const B = (cat, tok, label) => ({ id: ++uid, cat, tok, label });
  function conv(){ return [B('user',800,'user'), B('asst',1500,'assistant'), B('call',400,'tool call'), B('res',12000,'tool result'), B('asst',1000,'assistant'), B('call',300,'tool call'), B('res',18000,'tool result'),
    B('user',600,'user'), B('asst',2000,'assistant'), B('call',300,'tool call'), B('res',9000,'tool result'), B('asst',1200,'assistant')]; }
  function init(){
    uid = 0;
    const c1 = conv(), c2 = c1.map(b => ({...b})), c3 = c1.map(b => ({...b}));
    return {
      cx: [B('tools',4000,'tools[]: built-ins + tool_search'), B('sys',6000,'developer: base instructions'), B('tools',2000,'developer: permissions, <tools>, skills'), B('mem',3000,'user: environment + AGENTS.md'), ...c1],
      cc: [B('tools',12000,'tools[]: built-ins + ToolSearch'), B('sys',4000,'system: static (global cache scope)'), B('sys',2000,'system: dynamic (org scope)'), B('mem',3000,'reminders: env, CLAUDE.md, skills'), ...c2],
      pi: [B('tools',1500,'tools[]: read, bash, edit, write'), B('sys',1200,'system: <tools> <rules> <docs> <cwd>'), B('mem',2000,'system: <project_context> AGENTS.md'), ...c3],
    };
  }
  let stacks = init(), status = null, notes = {}, anim = 1, evName = 'initial request';
  const cv = canvas(f, $('#req-canvas'), w => Math.max(380, 150 + 15*Math.max(...HS.map(k => stacks[k].length)))); hover(f, cv);
  function apply(e){
    const prev = {}; HS.forEach(h => prev[h] = stacks[h].map(b => ({...b})));
    notes = {};
    const nb = (h, ...a) => stacks[h].push(B(...a));
    if (e === 'mcp'){ nb('cx','tools',600,'developer delta: new <tools> namespace'); nb('cc','tools',600,'deferred_tools_delta attachment'); nb('pi','tools',600,'system patch: <mcp_servers>');
      HS.forEach(h => notes[h] = 'appended; prefix intact'); }
    if (e === 'load'){ nb('cx','tools',1100,'tool_search output: 3 definitions'); nb('cc','tools',1100,'ToolSearch → tool_reference'); nb('pi','tools',1100,'tool_addition block');
      notes.cx = 'definitions land in input, tools[] unchanged'; notes.cc = 'expanded by the API, prefix intact'; notes.pi = 'Anthropic tool_addition, list unchanged'; }
    if (e === 'compact'){
      stacks = init(); HS.forEach(h => prev[h] = stacks[h].map(b => ({...b})));
      const keepPrefix = { cx: 4, cc: 3, pi: 3 };
      HS.forEach(h => { const pre = stacks[h].slice(0, keepPrefix[h]); const rest = stacks[h].slice(keepPrefix[h]);
        const users = rest.filter(b => b.cat === 'user');
        if (h === 'cx'){ pre.push(prev.cx[3]); stacks.cx = [...prev.cx.slice(0,4), ...users.map(b => B('user', b.tok, 'kept user message')), B('sum',2500,'summary (handoff prefix)')]; }
        if (h === 'cc'){ stacks.cc = [...prev.cc.slice(0,3), B('mem',3000,'reminders re-injected'), B('sum',3200,'summary'), B('res',5000,'re-read: file 1'), B('res',3500,'re-read: file 2'), B('mem',1500,'plan + skills')]; }
        if (h === 'pi'){ let keep = [], t = 0; for (let k = rest.length-1; k >= 0 && t < 20000; k--){ keep.unshift(B(rest[k].cat, rest[k].tok, 'kept: '+rest[k].label)); t += rest[k].tok; }
          stacks.pi = [...prev.pi.slice(0,3), B('sum',2800,'summary as user message'), ...keep]; }
      });
      notes.cx = 'initial context, user msgs, summary'; notes.cc = 'prefix survives; messages rebuilt'; notes.pi = 'prefix survives; summary + tail';
    }
    if (e === 'clear'){
      const cc = stacks.cc; const resIdx = cc.map((b,i) => b.cat==='res' && b.tok > 200 ? i : -1).filter(i => i >= 0);
      resIdx.slice(0, -1).forEach(i => { cc[i] = B('res', 30, '[Old tool result content cleared]'); });
      notes.cc = resIdx.length > 1 ? 'old results replaced from the first one on' : 'nothing old enough to clear'; notes.cx = 'no such mechanism'; notes.pi = 'no such mechanism (extensions can)';
    }
    if (e === 'model'){ HS.forEach(h => stacks[h] = stacks[h].map(b => ({...b, id: ++uid}))); notes.cx = notes.cc = 'caches are per model: full rewrite'; notes.pi = 'full rewrite; foreign thinking blocks dropped'; }
    status = {}; HS.forEach(h => { const a = prev[h], b = stacks[h]; let k = 0; while (k < a.length && k < b.length && a[k].id === b[k].id) k++;
      status[h] = { div: k, hit: b.slice(0,k).reduce((s,x) => s+x.tok, 0), write: b.slice(k).reduce((s,x) => s+x.tok, 0) }; });
    anim = 0;
  }
  const sg = seg('req-btns', e => { apply(e); cv.rs(); evName = { mcp:'MCP server connects', load:'model loads a deferred tool', compact:'compaction (from a fresh session)', clear:'old tool results cleared', model:'switch model' }[e]; f.draw(); });
  sg.bs.forEach(b => b.setAttribute('aria-pressed','false'));
  $('#req-reset').addEventListener('click', () => { stacks = init(); cv.rs(); status = null; notes = {}; evName = 'initial request'; anim = 1; sg.bs.forEach(b => b.setAttribute('aria-pressed','false')); f.draw(); });
  f.tick = dt => { if (anim >= 1) return false; anim = Math.min(1, anim + dt * (REDUCE ? 99 : 1.1)); return true; };
  f.draw = function(){
    const { g, w, h } = cv; cv.clear(); f.hits = [];
    const gap = 12, colW = (w - gap*2 - 16) / 3, top = 30, H = h - top - 10;
    // heights: proportional, but every block at least MINH px so its label is readable
    const MINH = colW > 120 ? 14 : 5;
    const colH = p => Math.max(...HS.map(k => stacks[k].reduce((s,b) => s + Math.max(MINH, b.tok*p), 0)));
    let lo = 0, hi = H / 40000; for (let it = 0; it < 30; it++){ const mid = (lo+hi)/2; if (colH(mid) <= H) lo = mid; else hi = mid; }
    const py = Math.min(lo, H / 70000);
    const bhOf = b => Math.max(MINH, b.tok * py);
    HS.forEach((hk, i) => {
      const x = 8 + i*(colW + gap);
      g.font = sans(14, 700); g.fillStyle = HCOL(hk); g.textAlign='left'; g.textBaseline='alphabetic'; g.fillText(HN[hk], x, 16);
      if (notes[hk]){ g.save(); g.beginPath(); g.rect(x, 17, colW, 12); g.clip(); lbl(g, notes[hk], x, 25, { color: C.ink3, font: font(9.5) }); g.restore(); }
      let y = top; const st = status && status[hk];
      const sweepY = top + ease(anim) * H;
      stacks[hk].forEach((b, k) => {
        const bh = bhOf(b); f.hits.push({ x, y, w: colW, h: bh, html: '<b>' + esc(b.label) + '</b> · ' + fmt(b.tok) + ' tokens<br>' + (!st ? 'first request: written to cache' : k < st.div ? 'unchanged prefix: read from cache' : 'after the first change: written again') });
        g.fillStyle = C[b.cat]; g.globalAlpha = b.cat === 'res' && b.tok <= 30 ? 0.5 : 0.92; g.fillRect(x + 8, y, colW - 8, bh - 1); g.globalAlpha = 1;
        let sc = C.hit; if (st && k >= st.div) sc = C.write; if (!st) sc = C.write;
        if (y > sweepY && st) sc = C.track;
        g.fillStyle = sc; g.fillRect(x, y, 5, bh - 1);
        if (bh >= 13 && colW > 120){ g.save(); g.beginPath(); g.rect(x+8, y, colW-8, bh-1); g.clip(); lbl(g, b.label + ' · ' + fmtT(b.tok), x + 13, y + Math.min(bh/2, 9), { color: onColor(C[b.cat]), font: font(9.5, 500) }); g.restore(); }
        y += bh;
      });
      if (st){ let dy = top; for (let k = 0; k < st.div; k++) dy += bhOf(stacks[hk][k]);
        g.strokeStyle = C.ink; g.setLineDash([4,3]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 2, dy); g.lineTo(x + colW + 2, dy); g.stroke(); g.setLineDash([]); }
    });
    $('#req-ev').textContent = evName;
    $('#req-read').innerHTML = HS.map(hk => { const st = status && status[hk]; const tot = stacks[hk].reduce((s,b) => s+b.tok, 0);
      return '<div class="'+hk+'">'+HN[hk]+'<b>'+(st ? fmtT(st.write)+' written' : fmtT(tot)+' written')+'</b><small>'+(st ? fmtT(st.hit)+' read from cache' : 'first request: nothing cached yet')+'</small></div>'; }).join('');
  };
});

// ───────── Specimen 3: truncation lab
fig('f-trunc', (f) => {
  const SIZES = [8e3, 20e3, 35e3, 50e3, 80e3, 120e3, 200e3, 400e3, 1e6];
  let target = 120e3, pos = 0.5, lines = [], bytesAt = [], errAt = 0, total = 0;
  const MODS = ['auth','billing','cache','config','db','events','http','jobs','mailer','parser','queue','router','search','session','storage','users'];
  function build(){
    const R = rng(11); lines = []; let b = 0; let i = 0;
    const header = ['> vitest run --reporter=verbose', '', ' RUN  v3.2.4 /repo'];
    header.forEach(l => { lines.push(l); });
    while (b < target - 120){ const m = MODS[Math.floor(R()*MODS.length)]; const ms = 1 + Math.floor(R()*40);
      lines.push('  ✓ src/' + m + '/' + m + '.spec.ts > ' + m + ' case ' + (i++) + ' handles input ' + Math.floor(R()*9999) + ' (' + ms + ' ms)');
      b += lines[lines.length-1].length + 1; }
    const L = lines.length; errAt = Math.max(3, Math.min(L - 2, Math.floor(pos * L)));
    lines.splice(errAt, 0, '  ✗ src/auth/token.spec.ts > rejects expired token', '    AssertionError: expected 401 to equal 200   at token.spec.ts:88:17');
    lines.push('', ' Test Files  1 failed | ' + (MODS.length*12) + ' passed', '      Tests  1 failed | ' + (i-1) + ' passed');
    bytesAt = []; total = 0; lines.forEach(l => { bytesAt.push(total); total += l.length + 1; });
  }
  // returns { ranges:[[a,b)], head:[], marks, meta }
  function codex(){ const est = Math.ceil(total/4); if (est <= 10000) return { ranges: [[0, lines.length]], meta: 'about ' + fmt(est) + ' tokens: under the 10,000 limit, sent whole', pre: [], cut: null };
    let a = 0; while (a < lines.length && bytesAt[a] + lines[a].length < 20000) a++;
    let b = lines.length; while (b > 0 && total - bytesAt[b-1] < 20000) b--;
    const omitted = Math.round((bytesAt[b] - bytesAt[a]) / 4);
    return { ranges: [[0, a], [b, lines.length]], meta: 'about ' + fmt(est) + ' tokens: first and last 5,000 kept', pre: ['Warning: truncated output (original token count: ' + fmt(est) + ')', 'Total output lines: ' + fmt(lines.length)], cut: '…' + fmt(omitted) + ' tokens truncated…' };
  }
  function cc(){ if (total <= 30000) return { ranges: [[0, lines.length]], meta: fmt(total) + ' characters: under 30,000, sent whole', pre: [], cut: null };
    let a = 0; while (a < lines.length && bytesAt[a] + lines[a].length < 2048) a++;
    return { ranges: [[0, a]], meta: fmt(total) + ' characters: saved to a file, 2KB preview sent', pre: ['<persisted-output>', 'Output too large (' + Math.round(total/1024) + 'KB). Full output saved to:', '~/.claude/…/tool-results/toolu_01…txt', '', 'Preview (first 2KB):'], post: ['</persisted-output>'], cut: null };
  }
  function pi(){ if (lines.length <= 2000 && total <= 51200) return { ranges: [[0, lines.length]], meta: fmt(lines.length) + ' lines, ' + Math.round(total/1024) + 'KB: under both limits, sent whole', pre: [], cut: null };
    let b = lines.length, bytes = 0; while (b > 0 && lines.length - b < 2000 && bytes + lines[b-1].length + 1 <= 51200){ bytes += lines[b-1].length + 1; b--; }
    return { ranges: [[b, lines.length]], meta: fmt(lines.length) + ' lines: last ' + fmt(lines.length - b) + ' kept (' + (lines.length - b >= 2000 ? '2,000-line' : '50KB') + ' limit)', pre: [], post: ['', '[Showing lines ' + fmt(b+1) + '-' + fmt(lines.length) + ' of ' + fmt(lines.length) + '. Full output: /tmp/pi-bash-3f2a.log]'], cut: null };
  }
  const cv = canvas(f, $('#trunc-canvas'), w => 3*34 + 22);
  let res = {};
  function render(){
    build(); res = { cx: codex(), cc: cc(), pi: pi() };
    HS.forEach(h => { const r = res[h]; const seen = r.ranges.some(([a,b]) => errAt >= a && errAt + 1 < b);
      const bd = $('#tr-'+h+'-b'); bd.textContent = seen ? 'error visible' : 'error not visible'; bd.className = 'badge ' + (seen ? 'ok' : 'no');
      $('#tr-'+h+'-m').textContent = r.meta;
      const out = []; const E = s => esc(s);
      (r.pre||[]).forEach(s => out.push('<span class="mark">' + E(s) + '</span>'));
      r.ranges.forEach(([a,b], ri) => {
        if (ri > 0 && r.cut) out.push('<span class="mark">' + E(r.cut) + '</span>');
        const show = new Set(); for (let k = a; k < Math.min(b, a+4); k++) show.add(k); for (let k = Math.max(a, b-4); k < b; k++) show.add(k);
        if (errAt >= a && errAt < b){ show.add(errAt); if (errAt+1 < b) show.add(errAt+1); }
        let last = a - 1; [...show].sort((x,y) => x-y).forEach(k => { if (k > last + 1) out.push('<span class="dim">    ··· ' + fmt(k - last - 1) + ' more lines the model sees ···</span>'); last = k;
          const l = lines[k]; out.push(k === errAt || k === errAt+1 ? '<span class="err">' + E(l) + '</span>' : (l.includes('✓') ? E(l).replace('✓', '<span class="ok">✓</span>') : E(l))); });
        if (b - 1 > last) out.push('<span class="dim">    ··· ' + fmt(b - 1 - last) + ' more lines ···</span>');
      });
      (r.post||[]).forEach(s => out.push('<span class="mark">' + E(s) + '</span>'));
      $('#tr-'+h).innerHTML = out.join('\n');
    });
    $('#trunc-size').textContent = fmt(lines.length) + ' lines · ' + Math.round(total/1024) + ' KB';
    f.draw();
  }
  f.draw = function(){
    const { g, w } = cv; cv.clear(); if (!res.cx) return;
    const x0 = 100, x1 = w - 10, bw = x1 - x0; const sx = b => x0 + b/total*bw;
    HS.forEach((h, i) => { const y = 10 + i*34, bh = 18;
      g.font = sans(13, 700); g.fillStyle = HCOL(h); g.textAlign='left'; g.textBaseline='middle'; g.fillText(HN[h], 8, y + bh/2);
      g.fillStyle = C.free; g.fillRect(x0, y, bw, bh);
      res[h].ranges.forEach(([a,b]) => { const xa = sx(bytesAt[a] || 0), xb = b >= lines.length ? x1 : sx(bytesAt[b]); g.fillStyle = HCOL(h); g.fillRect(xa, y, Math.max(1.5, xb - xa), bh); });
      const ex = sx(bytesAt[errAt]); g.fillStyle = C.miss; g.fillRect(ex - 1.5, y - 3, 3, bh + 6);
    });
    lbl(g, 'start of output', x0, 3*34 + 14, { color: C.ink3, font: font(10) }); lbl(g, 'end', x1, 3*34 + 14, { color: C.ink3, font: font(10), align: 'right' });
    lbl(g, 'error', sx(bytesAt[errAt]), 3*34 + 14, { color: C.miss, font: font(10, 600), align: pos < 0.1 ? 'left' : pos > 0.9 ? 'right' : 'center' });
  };
  bindRange('trunc-n', i => { target = SIZES[i]; render(); return SIZES[i] >= 1e6 ? '1 MB' : Math.round(SIZES[i]/1000) + ' KB'; });
  seg('trunc-pos', v => { pos = +v; render(); });
});

// ───────── Specimen 4: compaction, frame by frame
fig('f-compact', (f) => {
  const PRE = {
    cx: [['sys',6000,'instructions'],['tools',2000,'bundle'],['mem',3000,'env+AGENTS.md']],
    cc: [['sys',6000,'system'],['mem',3000,'CLAUDE.md']],
    pi: [['sys',1500,'system'],['mem',2000,'AGENTS.md']],
  };
  const CONV = [['user',600],['asst',800],['call',300],['res',6000],['asst',500],['call',300],['res',9000],['user',400],['asst',1000],['call',300],['res',14000],['asst',600],['call',200],['res',4000],
    ['user',1200],['asst',900],['call',300],['res',11000],['asst',700],['call',300],['res',7000],['user',300],['asst',800],['call',300],['res',5000],['asst',1100]];
  let t = 0, going = false, remote = false;
  function layouts(){
    const out = {};
    HS.forEach(h => {
      const before = [...PRE[h].map((p,i) => ({ id: 'p'+i, cat: p[0], tok: p[1] })), ...CONV.map((c,i) => ({ id: 'c'+i, cat: c[0], tok: c[1] }))];
      let after = [];
      const pre = before.filter(b => b.id[0] === 'p');
      if (h === 'cx'){
        let users = before.filter(b => b.cat === 'user'); let keep = [], budget = remote ? 64000 : 20000;
        const pool = remote ? before.filter(b => b.id[0]==='c' && (b.cat==='user' || (b.cat==='asst' && b.id === 'c25'))) : users;
        for (let k = pool.length-1; k >= 0 && budget > 0; k--){ if (pool[k].tok <= budget){ keep.unshift(pool[k]); budget -= pool[k].tok; } }
        after = [...pre, ...keep, { id: 'sum', cat: 'sum', tok: remote ? 3000 : 2500, label: remote ? 'encrypted item' : 'summary', fresh: true }];
      }
      if (h === 'cc'){
        after = [...pre, { id: 'sum', cat: 'sum', tok: 3200, label: 'summary', fresh: true }, ...before.filter(b => b.id === 'c25'), { id: 'f1', cat: 'res', tok: 5000, fresh: true, re: true }, { id: 'f2', cat: 'res', tok: 3500, fresh: true, re: true }, { id: 'f3', cat: 'res', tok: 2200, fresh: true, re: true }, { id: 'pl', cat: 'mem', tok: 1500, fresh: true, label: 'plan+skills' }];
      }
      if (h === 'pi'){
        const conv = before.filter(b => b.id[0] === 'c'); let keep = [], tt = 0; for (let k = conv.length-1; k >= 0 && tt < 20000; k--){ keep.unshift(conv[k]); tt += conv[k].tok; }
        after = [...pre, { id: 'sum', cat: 'sum', tok: 2800, label: 'summary', fresh: true }, ...keep];
      }
      out[h] = { before, after };
    });
    return out;
  }
  let L = layouts();
  const cv = canvas(f, $('#cmp-canvas'), w => w < 560 ? 3*92 + 10 : 3*80 + 10); hover(f, cv);
  $('#cmp-go').addEventListener('click', () => { if (t >= 1){ return; } going = true; if (REDUCE) t = 1; f.draw(); });
  $('#cmp-back').addEventListener('click', () => { t = 0; going = false; f.draw(); });
  $('#cmp-remote').addEventListener('change', e => { remote = e.target.checked; L = layouts(); f.draw(); });
  f.tick = dt => { if (!going) return false; t = Math.min(1, t + dt/1.8); if (t >= 1) going = false; return true; };
  f.draw = function(){
    const { g, w } = cv; cv.clear(); f.hits = []; const narrow = w < 560;
    const x0 = narrow ? 8 : 112, x1 = w - 8, bw = x1 - x0; const laneH = narrow ? 92 : 80;
    const maxTok = Math.max(...HS.map(h => L[h].before.reduce((s,b) => s+b.tok, 0)));
    const sc = bw / maxTok; const p = ease(t);
    HS.forEach((h, i) => {
      const y = 10 + i*laneH + (narrow ? 18 : 0), bh = 30;
      g.font = sans(14, 700); g.fillStyle = HCOL(h); g.textAlign='left'; g.textBaseline='middle'; g.fillText(HN[h] + (h==='cx' && remote ? ' (remote)' : ''), 8, narrow ? y - 9 : y + bh/2 - 6);
      const { before, after } = L[h];
      const posB = {}; let x = x0; before.forEach(b => { posB[b.id] = x; x += b.tok*sc; });
      const posA = {}; x = x0; after.forEach(b => { posA[b.id] = x; x += b.tok*sc; });
      const sumX = posA['sum'];
      // folded blocks: move toward summary and shrink
      before.forEach(b => {
        const kept = b.id in posA; let bx, ww, a = 1;
        if (kept){ bx = lerp(posB[b.id], posA[b.id], p); ww = b.tok*sc; }
        else { bx = lerp(posB[b.id], sumX, p); ww = b.tok*sc*(1-p); a = 1 - p*0.6; }
        if (ww <= 0.2) return; f.hits.push({ x: bx, y, w: Math.max(3, ww), h: bh, html: '<b>' + CATN[b.cat] + '</b> · ' + fmt(b.tok) + ' tokens<br>' + HN[h] + ': ' + (kept ? (b.id[0]==='p' ? 'prefix, kept as is' : 'survives verbatim') : 'folded into the summary') }); g.globalAlpha = a; g.fillStyle = C[b.cat]; g.fillRect(bx, y, Math.max(0.8, ww - 0.8), bh); g.globalAlpha = 1;
      });
      after.filter(b => b.fresh).forEach(b => { const q = clamp((p - 0.45)/0.55, 0, 1); if (q <= 0) return; const ww = b.tok*sc*q;
        f.hits.push({ x: posA[b.id], y, w: Math.max(3, ww), h: bh, html: '<b>' + (b.re ? 'file re-read from disk' : b.label || CATN[b.cat]) + '</b> · ' + fmt(b.tok) + ' tokens<br>' + HN[h] + ': added by the compaction' });
        g.fillStyle = C[b.cat]; g.globalAlpha = q; g.fillRect(posA[b.id], y, Math.max(0.8, ww-0.8), bh);
        if (b.re){ g.strokeStyle = onColor(C.res); g.globalAlpha = q*0.5; g.lineWidth = 1; for (let xx = posA[b.id]; xx < posA[b.id]+ww; xx += 4){ g.beginPath(); g.moveTo(xx, y+bh); g.lineTo(xx+6, y); g.stroke(); } }
        if (b.cat === 'sum' && remote && h === 'cx'){ g.strokeStyle = onColor(C.sum); g.globalAlpha = q*0.6; for (let yy = y+4; yy < y+bh; yy += 5){ g.beginPath(); g.moveTo(posA[b.id], yy); g.lineTo(posA[b.id]+ww, yy); g.stroke(); } }
        g.globalAlpha = 1; });
      const bt = before.reduce((s,b) => s+b.tok, 0), at = after.reduce((s,b) => s+b.tok, 0);
      const tot = lerp(bt, at, p);
      const ex = x0 + tot*sc; lbl(g, fmtT(tot) + ' tokens', Math.min(ex + 6, x1 - 70), y + bh + 11, { color: C.ink2, font: font(10.5, 600) });
      if (p > 0.95){ const noteTxt = { cx: remote ? 'user msgs + final answer kept, encrypted item' : 'user messages kept, then the summary', cc: 'summary, a short recent tail, files re-read (hatched)', pi: 'summary, then the last 20K+ verbatim' }[h];
        lbl(g, noteTxt, x0, y + bh + 11, { color: C.ink3, font: font(10) }); }
    });
    $('#cmp-state').textContent = t <= 0 ? 'before' : t >= 1 ? 'after' : 'compacting…';
    $('#cmp-read').innerHTML = HS.map(h => { const { before, after } = L[h]; const bt = before.reduce((s,b) => s+b.tok, 0), at = after.reduce((s,b) => s+b.tok, 0);
      const ids = new Set(after.map(b => b.id)); const keptConv = before.filter(b => b.id[0]==='c' && ids.has(b.id)); const keptRes = keptConv.filter(b => b.cat==='res').length;
      return '<div class="'+h+'">'+HN[h]+'<b>'+fmtT(bt)+' → '+fmtT(at)+'</b><small>'+keptConv.length+' of '+CONV.length+' messages verbatim · '+keptRes+' tool results</small></div>'; }).join('');
  };
});

// ───────── Specimen 5: what the summarizer reads
fig('f-sumin', (f) => {
  const RS = [150, 300, 600, 1000, 1500, 2000, 2800, 3500]; let r = 1500;
  const cv = canvas(f, $('#sumin-canvas'), w => 4*44 + (w < 560 ? 22 : 8));
  f.draw = function(){
    const { g, w } = cv; cv.clear(); const n = 80;
    const parts = { user: 6000, asst: 14000, think: 18000, call: n*120, res: n*r };
    const rows = [
      { k: 'cx', name: 'Codex (local)', p: parts },
      { k: 'cx', name: 'Codex (remote)', p: parts, remote: true },
      { k: 'cc', name: 'Claude Code', p: parts },
      { k: 'pi', name: 'pi', p: { user: parts.user, asst: parts.asst, think: 0, call: parts.call, res: n*Math.min(r, 500) } },
    ];
    const tot = p => p.user + p.asst + p.think + p.call + p.res;
    const max = Math.max(...rows.map(x => tot(x.p)));
    const narrow = w < 560; const x0 = narrow ? 8 : 128, x1 = w - 60, bw = x1 - x0;
    rows.forEach((row, i) => { const y = 12 + i*44 + (narrow ? 12 : 0), bh = 20;
      lbl(g, row.name, 8, narrow ? y - 7 : y + bh/2, { color: HCOL(row.k), font: sans(13, 700) });
      let x = x0; [['user', C.user], ['asst', C.asst], ['think', alpha(C.asst, .45)], ['call', C.call], ['res', C.res]].forEach(([k, col]) => { const ww = row.p[k]/max*bw; if (ww <= 0) return; g.fillStyle = col; g.fillRect(x, y, ww - 0.6, bh); x += ww; });
      if (row.remote){ g.strokeStyle = alpha(C.paper, .55); g.lineWidth = 1; g.save(); g.beginPath(); g.rect(x0, y, x - x0, bh); g.clip(); for (let xx = x0 - bh; xx < x; xx += 6){ g.beginPath(); g.moveTo(xx, y+bh); g.lineTo(xx+bh, y); g.stroke(); } g.restore();
        lbl(g, 'server-side', x0 + 6, y + bh/2, { color: onColor(C.res), font: font(10, 600) }); }
      lbl(g, fmtT(tot(row.p)), x + 6, y + bh/2, { color: C.ink, font: font(11.5, 600) });
    });
  };
  bindRange('sumin-r', i => { r = RS[i]; f.draw(); return fmt(RS[i]) + ' tok'; });
});

// ───────── code exhibits: tiny highlighter (comments, strings, numbers, keywords)
(function(){
  const KW = 'pub|fn|let|mut|const|if|else|return|match|for|in|break|var|function|export|true|false|void|self|Some|None|Option|usize|i64|bool|number|string|typeof|new';
  const RE = new RegExp('(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|("(?:[^"\\\\\\n]|\\\\.)*"|`[^`]*`)|\\b(\\d[\\d_]*(?:\\.\\d+)?)\\b|\\b(' + KW + ')\\b', 'g');
  document.querySelectorAll('pre.code').forEach(pre => {
    const src = pre.textContent; let out = '', last = 0, m;
    RE.lastIndex = 0;
    while ((m = RE.exec(src))){
      out += esc(src.slice(last, m.index));
      const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'n' : 'k';
      out += '<span class="' + cls + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    pre.innerHTML = out + esc(src.slice(last));
  });
})();

// ───────── exhibits with several harnesses become tabs
document.querySelectorAll('.exhibits').forEach(box => {
  const exs = [...box.querySelectorAll(':scope > .ex')]; if (exs.length < 2) return;
  const bar = document.createElement('div'); bar.className = 'extabs'; bar.setAttribute('role', 'tablist');
  const show = i => exs.forEach((e, k) => { e.classList.toggle('on', k === i); bar.children[k].setAttribute('aria-selected', k === i ? 'true' : 'false'); });
  exs.forEach((e, i) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab');
    b.className = ['cx','cc','pi'].find(k => e.classList.contains(k)) || ''; b.textContent = e.querySelector('.exh span').textContent;
    b.addEventListener('click', () => show(i)); bar.appendChild(b); });
  const hint = document.createElement('span'); hint.className = 'hint'; hint.textContent = 'source excerpt'; bar.appendChild(hint);
  box.insertBefore(bar, exs[0]); box.classList.add('tabbed'); show(0);
});

// ───────── Specimen 4b: recall probes
fig('f-probe', (f) => {
  let age = 'tail', remote = false;
  const K = {
    verb: 'verbatim', disk: 're-read from disk', list: 'structured list', sum: 'summary only', opaque: 'encrypted item', gone: 'gone',
  };
  const P = [
    { q: "The user's first request, word for word", r: (a, R) => ({
      cx: ['verb', R ? 'kept with user messages, 64K budget' : 'kept if later user text fits in 20K'],
      cc: ['sum', "'All user messages' section"],
      pi: a === 'tail' ? ['verb', 'inside the kept tail'] : ['sum', a === 'old' ? "'Goal', carried forward by the update prompt" : "'Goal' section"] }) },
    { q: 'Exact text of an error a tool printed', r: (a, R) => ({
      cx: R ? ['opaque', 'server decides'] : ['sum', 'tool results are never kept'],
      cc: ['sum', "'Errors and fixes' section"],
      pi: a === 'tail' ? ['verb', 'tool results stay in the tail'] : ['sum', 'summarizer saw only the first 2,000 chars of that result'] }) },
    { q: 'Current contents of a file it edited', r: (a) => ({
      cx: ['gone', 'must read the file again'],
      cc: a === 'old' ? ['gone', 'not among the 5 re-attached files'] : ['disk', 're-attached if among the 5 most recent, up to 5K tokens'],
      pi: a === 'tail' ? ['verb', 'as of when it was read; may be stale'] : ['gone', 'must read the file again'] }) },
    { q: 'What the last command printed', r: (a, R) => ({
      cx: R ? ['opaque', 'server decides'] : ['sum', 'tool outputs are dropped'],
      cc: ['sum', 'unless it sits in the short kept tail, or was a file read that gets re-attached'],
      pi: ['verb', 'always inside the 20K tail'] }) },
    { q: 'Which files were read or changed', r: (a, R) => ({
      cx: R ? ['opaque', 'server decides'] : ['sum', 'if the summarizer listed them'],
      cc: ['disk', "'Files and Code Sections' plus re-attached files"],
      pi: ['list', 'cumulative <read-files> and <modified-files>'] }) },
    { q: 'Why an approach was abandoned', r: (a, R) => ({
      cx: R ? ['opaque', 'server decides'] : ['sum', "'key decisions made'"],
      cc: ['sum', "'Problem Solving' section"],
      pi: a === 'tail' ? ['verb', 'the discussion is in the tail'] : ['sum', a === 'old' ? "'Key Decisions', preserved by the update rules" : "'Key Decisions' section"] }) },
    { q: "The model's own reasoning at the time", r: (a, R) => ({
      cx: R ? ['opaque', 'server decides'] : ['gone', 'reasoning items are not kept'],
      cc: ['gone', 'thinking is not carried over; the <analysis> draft is discarded'],
      pi: a === 'tail' ? ['verb', 'thinking blocks in the tail stay, same model only'] : ['gone', 'thinking is dropped before summarizing'] }) },
  ];
  const grid = $('#probe-grid');
  $('#probe-legend').innerHTML = Object.keys(K).map(k => '<span class="chip ' + k + '">' + K[k] + '</span>').join(' ');
  let prev = {};
  function render(){
    let h = '<div class="ph corner">probe</div>' + HS.map(k => '<div class="ph ' + k + '">' + HN[k] + (k === 'cx' && remote ? ' (remote)' : '') + '</div>').join('');
    const score = { cx: 0, cc: 0, pi: 0 }; const now = {};
    P.forEach((p, i) => { const r = p.r(age, remote);
      h += '<div class="q">' + esc(p.q) + '</div>';
      HS.forEach(k => { const [kind, note] = r[k]; if (kind === 'verb' || kind === 'disk' || kind === 'list') score[k]++;
        const key = i + k; now[key] = kind; const changed = prev[key] && prev[key] !== kind;
        h += '<div class="cell' + (changed ? ' flash' : '') + '"><span class="chip ' + kind + '">' + K[kind] + '</span><span class="nt">' + esc(note) + '</span></div>'; });
    });
    h += '<div class="tot totl">exact answer available</div>' + HS.map(k => '<div class="tot">' + score[k] + ' of ' + P.length + '</div>').join('');
    grid.innerHTML = h; prev = now;
    setTimeout(() => grid.querySelectorAll('.flash').forEach(e => e.classList.remove('flash')), 600);
  }
  seg('probe-age', v => { age = v; render(); });
  $('#probe-remote').addEventListener('change', e => { remote = e.target.checked; render(); });
  render();
});

// ───────── Specimen 11: everything together
fig('f-all', (f) => {
  const W = 200000, PR = { read: 0.3e-6, write: 3.75e-6, out: 15e-6 };
  let preset = 'tools', N = 300, res;
  const BASE = { cx: 14000, cc: 20000, pi: 3500 };
  const trig = { cx: RULE.cx(W), cc: RULE.cc(W), pi: RULE.pi(W) };
  // what each harness puts in context for one command's raw output (bytes)
  const cap = {
    cx: b => Math.min(b/4, 10000) + (b/4 > 10000 ? 30 : 0),
    cc: b => b > 30000 ? 512 + 60 : b/4,
    pi: b => Math.min(b, 51200)/4 + (b > 51200 ? 30 : 0),
  };
  function session(){
    const R = rng(42), steps = [];
    for (let i = 0; i < N; i++){
      let raw;
      if (preset === 'tools') raw = R() < 0.25 ? 30000 + R()*170000 : 400 + R()*6000;
      else if (preset === 'talk') raw = 200 + R()*2500;
      else raw = 8000 + Math.pow(R(), 1.5)*60000;
      steps.push({ raw, a: 100 + R()*500, c: 60 + R()*160, u: i % (preset === 'talk' ? 2 : 7) === 0 ? 150 + R()*(preset === 'talk' ? 1400 : 600) : 0, file: R() < 0.35 });
    }
    return steps;
  }
  function run(){
    const S = session(); const out = {};
    HS.forEach(h => {
      let base = BASE[h], sum = 0, kept = 0, live = 0, userAll = 0, files = 0, cost = 0, comps = 0, prev = 0, rewritten = 0, peak = 0, last = 0;
      const pts = [];
      S.forEach((d, i) => {
        const add = d.a + d.c + d.u + cap[h](d.raw); userAll += d.u; if (d.file) files++;
        const ctxBefore = base + sum + kept + live + d.u;
        cost += prev*PR.read + (ctxBefore - prev)*PR.write + (d.a + d.c)*PR.out; rewritten += ctxBefore - prev;
        live += add; last = add; let ctx = base + sum + kept + live; prev = ctxBefore;
        if (ctx > trig[h]){
          comps++; cost += ctx*PR.read + 3000*PR.out; // the summarizer call
          if (h === 'cx'){ sum = 2500; kept = Math.min(20000, userAll); }
          if (h === 'cc'){ sum = 3200; kept = Math.min(5, files)*3500 + 2000; }
          if (h === 'pi'){ sum = 2800; kept = Math.min(kept + live, 20000 + last*0.5); }
          live = 0; ctx = base + sum + kept; prev = base;
        }
        peak = Math.max(peak, ctx); pts.push({ ctx, cost });
      });
      out[h] = { pts, cost, comps, rewritten, peak };
    });
    return out;
  }
  const cv = canvas(f, $('#all-canvas'), w => 330);
  f.draw = function(){
    if (!res) return; const { g, w } = cv; cv.clear();
    const b1 = { x: 46, y: 22, w: w - 58, h: 140 }, b2 = { x: 46, y: 206, w: w - 58, h: 96 };
    const xs = (b, i) => b.x + i/(N-1)*b.w;
    const ys1 = v => b1.y + b1.h - v/W*b1.h;
    lbl(g, 'context (tokens)', b1.x, b1.y - 10, { color: C.ink3, font: font(10) });
    axes(g, b1, { xs: i => xs(b1, i), ys: ys1, yt: [0, 50000, 100000, 150000, 200000], yf: fmtK, xt: niceTicks(N, 5), xf: v => String(v) });
    const maxC = Math.max(...HS.map(h => res[h].cost)) * 1.08; const ys2 = v => b2.y + b2.h - v/maxC*b2.h;
    lbl(g, 'cumulative cost', b2.x, b2.y - 10, { color: C.ink3, font: font(10) });
    axes(g, b2, { xs: i => xs(b2, i), ys: ys2, yt: niceTicks(maxC, 3), yf: v => '$' + (v < 10 ? v.toFixed(v < 1 ? 2 : 1) : Math.round(v)), xt: niceTicks(N, 5), xf: v => String(v), xl: 'steps' });
    HS.forEach(h => { g.setLineDash([3,3]); g.strokeStyle = alpha(HCOL(h), .55); g.lineWidth = 1; g.beginPath(); g.moveTo(b1.x, ys1(trig[h])); g.lineTo(b1.x + b1.w, ys1(trig[h])); g.stroke(); g.setLineDash([]); });
    HS.forEach(h => {
      [[b1, 'ctx', ys1, 1.6], [b2, 'cost', ys2, 2]].forEach(([b, key, ys, lw]) => { g.beginPath(); res[h].pts.forEach((p, i) => { const x = xs(b, i), y = ys(p[key]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.strokeStyle = HCOL(h); g.lineWidth = lw; g.stroke(); });
    });
    $('#all-read').innerHTML = HS.map(h => { const r = res[h]; return '<div class="' + h + '">' + HN[h] + '<b>' + money(r.cost) + '</b><small>' + r.comps + ' compactions · peak ' + fmtT(r.peak) + ' · ' + fmtT(r.rewritten) + ' tokens written to cache</small></div>'; }).join('');
  };
  function go(){ res = run(); f.draw(); }
  seg('all-preset', v => { preset = v; go(); });
  bindRange('all-n', v => { N = v; go(); return v + ' steps'; });
});

// ───────── reading progress
(function(){
  const bar = document.getElementById('progress'); if (!bar) return;
  const upd = () => { const h = document.documentElement; const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight); bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)) + ')'; };
  addEventListener('scroll', upd, { passive: true }); upd();
})();

// ───────── Specimen 6: idle time and the cache clock
fig('f-idle', (f) => {
  const CS = [50e3, 80e3, 100e3, 150e3, 200e3, 250e3, 300e3, 500e3, 750e3, 1e6];
  let T = 70, Cx = 250e3, TTL = 5, P = 3;
  const cv = canvas(f, $('#idle-canvas'), w => 3*58 + 34);
  function model(){
    const read = P*0.1/1e6, write = P*(TTL === 5 ? 1.25 : 2)/1e6, out = P*5/1e6;
    // pi: getCacheWarmingDelayMs = max(1, min(ttl*0.9, ttl-10s)); idle phase p = 0.15, max idle age 30 min
    const delay = Math.min(TTL*0.9, TTL - 10/60);
    const warmCost = Cx*read + out, missCost = Math.max(0, Cx*write - Cx*read);
    const exp = 0.15*missCost - warmCost; const warm = exp >= 0.05;
    const pings = []; if (warm){ for (let t = delay; t <= 30 && t < T; t += delay) pings.push(t); }
    const alive = (pings.length ? pings[pings.length-1] : 0) + TTL;
    const piNext = T <= alive ? Cx*read : Cx*write; const piPing = pings.length*warmCost;
    const cleared = Cx*0.45 >= 20000 ? Cx*0.45 : 0;
    const ccClear = T*60 >= 3900 && cleared > 0;
    const ccNext = T <= TTL ? Cx*read : (ccClear ? (Cx - cleared)*write : Cx*write);
    return { exp, warm, pings, alive, piNext, piPing, ccNext, ccClear, cleared, warmCost, delay };
  }
  f.draw = function(){
    const { g, w } = cv; cv.clear(); const M = model();
    const narrow = w < 560; const x0 = narrow ? 8 : 112, x1 = w - 10, bw = x1 - x0; const sx = t => x0 + t/120*bw;
    // axis
    const ay = 3*58 + 14; g.strokeStyle = C.ink3; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, ay); g.lineTo(x1, ay); g.stroke();
    [0, 15, 30, 45, 60, 75, 90, 105, 120].forEach(t => { if (narrow && t % 30) return; const x = sx(t); g.beginPath(); g.moveTo(x, ay); g.lineTo(x, ay+4); g.stroke(); lbl(g, t + 'm', x, ay + 12, { align: 'center', color: C.ink3, font: font(10) }); });
    const lane = (i, hk) => { const y = 8 + i*58 + (narrow ? 14 : 0); lbl(g, HN[hk], 8, narrow ? y - 6 : y + 9, { color: HCOL(hk), font: sans(13, 700) }); return y; };
    // pi
    let y = lane(0, 'pi'); const bh = 18;
    const aliveEnd = Math.min(120, M.alive); g.fillStyle = alpha(C.hit, .3); g.fillRect(sx(0), y, sx(aliveEnd) - sx(0), bh);
    M.pings.forEach(t => { g.fillStyle = C.pi; g.fillRect(sx(t) - 1.5, y - 3, 3, bh + 6); });
    lbl(g, M.warm ? M.pings.length + ' refreshes, cache alive to ' + Math.round(M.alive) + 'm' : 'no refresh: expected saving $' + M.exp.toFixed(3) + ' < $0.05', x0 + 4, y + bh + 10, { color: C.ink2, font: font(10) });
    // cc
    y = lane(1, 'cc'); g.fillStyle = alpha(C.hit, .3); g.fillRect(sx(0), y, sx(Math.min(120, TTL)) - sx(0), bh);
    const cx65 = sx(65); g.strokeStyle = C.cc; g.setLineDash([3,3]); g.beginPath(); g.moveTo(cx65, y - 4); g.lineTo(cx65, y + bh + 4); g.stroke(); g.setLineDash([]);
    lbl(g, 'clears old results after 65m', cx65 + 4, y + bh/2, { color: C.cc, font: font(10, 600) });
    lbl(g, M.ccClear ? 'next request: ' + fmtT(M.cleared) + ' cleared before the rewrite' : (T <= TTL ? 'next request reads the cache' : 'cache expired; nothing cleared yet'), x0 + 4, y + bh + 10, { color: C.ink2, font: font(10) });
    // codex
    y = lane(2, 'cx'); g.fillStyle = C.free; g.fillRect(sx(0), y, bw, bh);
    lbl(g, 'no idle behavior; caching is automatic, no write fee', x0 + 6, y + bh/2, { color: C.ink2, font: font(10) });
    // return marker
    const rx = sx(T); g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(rx, 4); g.lineTo(rx, ay); g.stroke();
    lbl(g, 'you return', rx + (T > 100 ? -4 : 4), ay - 8, { color: C.ink, font: font(10, 600), align: T > 100 ? 'right' : 'left' });
    const m$ = v => '$' + v.toFixed(v < 1 ? 3 : 2);
    $('#idle-read').innerHTML =
      '<div class="pi">pi: refreshes + next request<b>' + m$(M.piPing + M.piNext) + '</b><small>' + M.pings.length + ' × ' + m$(M.warmCost) + ' refresh, then ' + m$(M.piNext) + '</small></div>' +
      '<div class="cc">Claude Code: next request<b>' + m$(M.ccNext) + '</b><small>' + (M.ccClear ? 'cache cold, but ' + fmtT(M.cleared) + ' smaller' : T <= TTL ? 'cache still warm' : 'cache cold, full rewrite') + '</small></div>' +
      '<div>Refresh pays off above<b>' + fmtT(0.05 / (0.15*P*((TTL===5?1.25:2) - 0.1)/1e6 - P*0.1/1e6)) + '</b><small>tokens of context at these prices' + (TTL === 60 ? '; but the first refresh (54m) is past the 30m idle limit' : '') + '</small></div>';
  };
  bindRange('idle-t', v => { T = v; f.draw(); return v + ' min'; });
  bindRange('idle-c', i => { Cx = CS[i]; f.draw(); return fmtT(CS[i]); });
  seg('idle-ttl', v => { TTL = +v; f.draw(); });
  seg('idle-price', v => { P = +v; f.draw(); });
});

// ───────── Specimen 7: up-front tool and skill cost
fig('f-tools', (f) => {
  let S = 6, K = 40;
  const cv = canvas(f, $('#tools-canvas'), w => 4*42 + (w < 560 ? 26 : 10));
  f.draw = function(){
    const { g, w } = cv; cv.clear(); const T = S*15;
    const rows = [
      { name: 'Every definition sent', col: C.ink3, tools: T*350, skills: K*45 },
      { name: 'Codex', k: 'cx', tools: S ? 250 + 40*S : 0, skills: Math.min(K*45, 0.02*272000), cap: K*45 > 0.02*272000 },
      { name: 'Claude Code', k: 'cc', tools: S ? 300 + 12*T : 0, skills: Math.min(K*45, 8000/4), cap: K*45 > 2000 },
      { name: 'pi', k: 'pi', tools: S ? 400 + 60*S : 0, skills: K*60 },
    ];
    const max = Math.max(4000, ...rows.map(r => r.tools + r.skills)); const narrow = w < 560;
    const x0 = narrow ? 8 : 150, x1 = w - 120, bw = x1 - x0;
    rows.forEach((r, i) => { const y = 8 + i*42 + (narrow ? 14 : 0), bh = 20;
      lbl(g, r.name, 8, narrow ? y - 7 : y + bh/2, { color: r.k ? HCOL(r.k) : C.ink2, font: sans(13, 700) });
      const tw = r.tools/max*bw, kw = r.skills/max*bw;
      g.fillStyle = C.tools; g.fillRect(x0, y, tw, bh); g.fillStyle = C.mem; g.fillRect(x0 + tw, y, kw, bh);
      lbl(g, fmtT(r.tools + r.skills) + ' tokens' + (r.cap ? ' (skills capped)' : ''), x0 + tw + kw + 6, y + bh/2, { color: C.ink, font: font(11, 600) });
    });
    $('#tools-n').textContent = T + ' MCP tools · ' + K + ' skills';
  };
  bindRange('tools-s', v => { S = v; f.draw(); return v + (v===1?' server':' servers'); });
  bindRange('tools-k', v => { K = v; f.draw(); return String(v); });
});

// ───────── Specimen 8: what a child inherits
fig('f-sub', (f) => {
  const PAR = [['sys',6],['mem',3],['user',1],['think',2],['call',.5],['res',8],['asst',1.5],['user',.8],['think',3],['call',.5],['res',12],['call',.4],['res',6],['asst',2],['user',.6],['think',2],['call',.4],['res',9],['asst',1.2]];
  const MODES = {
    cxnew: { name: 'Codex spawn (fresh)', keep: () => false, own: [['sys',6],['user',.6]], ret: 'child messages via agent tools', h: 'cx' },
    cxfork: { name: 'Codex fork', keep: c => ['sys','mem','user','asst'].includes(c), own: [['user',.6]], ret: 'tool calls, results and reasoning stripped', h: 'cx' },
    cxpre: { name: 'Codex fork, preserve_fork_prefix', keep: () => true, own: [['user',.6]], ret: 'everything kept so the cache prefix matches', h: 'cx' },
    ccsub: { name: 'Claude Code subagent', keep: () => false, own: [['sys',3],['mem',3],['user',.6]], ret: 'only the final report returns', h: 'cc' },
    ccfork: { name: 'Claude Code fork', keep: () => true, own: [['user',.6]], ret: 'full history; first request is mostly a cache read', h: 'cc' },
    pi: { name: 'pi subagent extension', keep: () => false, own: [['sys',1.5],['mem',2],['user',.6]], ret: 'separate process, no session; JSON output returns', h: 'pi' },
  };
  let mode = 'cxfork', t = 1;
  const cv = canvas(f, $('#sub-canvas'), w => 150); hover(f, cv);
  seg('sub-btns', m => { mode = m; t = REDUCE ? 1 : 0; f.draw(); });
  f.tick = dt => { if (t >= 1) return false; t = Math.min(1, t + dt/1.4); return true; };
  const colOf = c => c === 'think' ? alpha(C.asst, .45) : C[c];
  f.draw = function(){
    const { g, w } = cv; cv.clear(); const M = MODES[mode];
    const x0 = 70, x1 = w - 10, bw = x1 - x0; const tot = PAR.reduce((s,b) => s+b[1], 0) + 1; const sc = bw / tot;
    lbl(g, 'parent', 8, 30, { color: C.ink2, font: sans(12, 700) }); lbl(g, 'child', 8, 108, { color: HCOL(M.h), font: sans(12, 700) });
    let x = x0; const yP = 20, yC = 98, bh = 20; let cx = x0;
    // child's own blocks first for fresh, after for forks
    const fresh = !PAR.some(b => M.keep(b[0]));
    if (fresh){ M.own.forEach(o => { g.fillStyle = colOf(o[0]); g.globalAlpha = clamp(t*2-0.4,0,1); g.fillRect(cx, yC, o[1]*sc - 0.8, bh); g.globalAlpha = 1; cx += o[1]*sc; }); }
    let reuse = 0, broke = false;
    f.hits = [];
    PAR.forEach((b, i) => { const ww = b[1]*sc; f.hits.push({ x, y: yP, w: ww, h: bh, html: '<b>' + CATN[b[0]] + '</b> · ' + b[1] + 'K tokens<br>' + (M.keep(b[0]) ? 'copied into the child' : 'not given to the child') }); g.fillStyle = colOf(b[0]); g.fillRect(x, yP, ww - 0.8, bh);
      const k = M.keep(b[0]); const local = clamp(t*1.6 - i*0.03, 0, 1);
      if (k){ const yy = lerp(yP, yC, ease(local)); const xx = lerp(x, cx, ease(local)); g.fillStyle = colOf(b[0]); g.fillRect(xx, yy, ww - 0.8, bh); cx += ww; if (!broke) reuse += b[1]; }
      else { broke = true; if (local > 0 && local < 1){ g.globalAlpha = 1 - local; g.fillStyle = colOf(b[0]); g.fillRect(x, lerp(yP, (yP+yC)/2, local), ww - 0.8, bh); g.globalAlpha = 1; } }
      x += ww; });
    if (fresh) reuse = 0;
    if (!fresh){ M.own.forEach(o => { g.fillStyle = colOf(o[0]); g.globalAlpha = clamp(t*2-1,0,1); g.fillRect(cx, yC, o[1]*sc - 0.8, bh); g.globalAlpha = 1; cx += o[1]*sc; }); }
    g.strokeStyle = C.rule; g.setLineDash([3,3]); g.beginPath(); g.moveTo(x0, 66); g.lineTo(x1, 66); g.stroke(); g.setLineDash([]);
    const childTok = (fresh ? M.own.reduce((s,o) => s+o[1], 0) : PAR.filter(b => M.keep(b[0])).reduce((s,b) => s+b[1], 0) + M.own.reduce((s,o) => s+o[1], 0));
    $('#sub-mode').textContent = M.name;
    $('#sub-read').innerHTML = '<div class="'+M.h+'">Child starts with<b>'+childTok.toFixed(1).replace(/\.0$/,'')+'K tokens</b><small>parent has '+(tot-1).toFixed(1)+'K</small></div>' +
      '<div class="'+M.h+'">Cache reuse from parent<b>'+(reuse ? reuse.toFixed(1).replace(/\.0$/,'')+'K' : 'none')+'</b><small>'+(mode==='cxfork' ? 'only up to the first stripped item' : reuse ? 'identical prefix' : 'different prefix')+'</small></div>' +
      '<div class="'+M.h+'">Notes<b style="font-size:1rem">'+M.ret+'</b></div>';
  };
});

// ───────── Specimen 9: estimation after the anchor
fig('f-est', (f) => {
  let KB = 80, R = 2.7, cjk = false;
  const cv = canvas(f, $('#est-canvas'), w => 3*50 + 34);
  f.draw = function(){
    const { g, w } = cv; cv.clear(); const ANCH = 150000, bytes = KB*1024;
    const actual = ANCH + bytes / R;
    const est = { cx: ANCH + bytes/4, cc: ANCH + bytes/4, pi: ANCH + (cjk ? bytes/3 : bytes)/4 };
    const trig = { cx: RULE.cx(200000), cc: RULE.cc(200000), pi: RULE.pi(200000) };
    const maxV = Math.max(230000, actual*1.3); const narrow = w < 560;
    const x0 = narrow ? 8 : 112, x1 = w - 10, bw = x1 - x0; const sx = v => x0 + v/maxV*bw;
    HS.forEach((h, i) => { const y = 10 + i*50 + (narrow ? 12 : 0), bh = 14;
      lbl(g, HN[h], 8, narrow ? y - 6 : y + bh, { color: HCOL(h), font: sans(13, 700) });
      g.fillStyle = C.sys; g.fillRect(x0, y, sx(ANCH) - x0, bh); g.fillStyle = HCOL(h); g.fillRect(sx(ANCH), y, sx(est[h]) - sx(ANCH), bh);
      g.fillStyle = C.sys; g.fillRect(x0, y + bh + 3, sx(ANCH) - x0, bh); g.fillStyle = C.miss; g.globalAlpha = .8; g.fillRect(sx(ANCH), y + bh + 3, sx(actual) - sx(ANCH), bh); g.globalAlpha = 1;
      lbl(g, 'estimate ' + fmtT(est[h]), x1, y + bh/2, { color: C.ink2, font: font(10), align: 'right' });
      lbl(g, 'actual ' + fmtT(actual), x1, y + bh*1.5 + 3, { color: C.miss, font: font(10, 600), align: 'right' });
      const tx = sx(trig[h]); g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(tx, y - 4); g.lineTo(tx, y + 2*bh + 7); g.stroke();
    });
    const ay = 3*50 + 18 + (narrow ? 8 : 0); lbl(g, 'black tick = that harness\'s compaction trigger at 200K · first 150K is the exact server-reported anchor', x0, ay, { color: C.ink3, font: font(10) });
    $('#est-read').innerHTML = HS.map(h => { const e = est[h], t = trig[h]; let v, s;
      if (e < t && actual >= t){ v = 'misses the trigger'; s = 'thinks ' + fmtT(e) + ', really ' + fmtT(actual); }
      else if (e >= t && actual < t){ v = 'compacts early'; s = 'overestimates by ' + fmtT(e - actual); }
      else if (e >= t){ v = 'compacts'; s = 'both past ' + fmtT(t); }
      else { v = 'agrees: no compaction'; s = 'error ' + (e < actual ? '−' : '+') + fmtT(Math.abs(e - actual)); }
      return '<div class="'+h+'">'+HN[h]+'<b style="font-size:1.05rem">'+v+'</b><small>'+s+'</small></div>'; }).join('');
  };
  bindRange('est-kb', v => { KB = v; f.draw(); return v + ' KB'; });
  seg('est-type', (v, b) => { R = +v; cjk = b.textContent.includes('CJK'); f.draw(); });
});

// ───────── Specimen 10: resuming a session
fig('f-disk', (f) => {
  const FILES = {
    cx: { title: 'rollout-….jsonl', rows: ['session_meta', 'turn_context', 'message · user', 'reasoning', 'function_call · shell', 'function_call_output', 'message · assistant', 'message · user', 'function_call · apply_patch', 'function_call_output', 'compacted · replacement_history[…]', 'turn_context', 'message · user', 'function_call · shell', 'function_call_output', 'message · assistant'], comp: 10 },
    cc: { title: '<session>.jsonl', rows: ['user', 'assistant · tool_use Read', 'user · tool_result', 'assistant · tool_use Bash', 'user · tool_result', 'assistant', 'user', 'assistant · tool_use Edit', 'user · tool_result', 'system · compact_boundary (parentUuid: null)', 'user · isCompactSummary', 'assistant · tool_use Read', 'user · tool_result', 'assistant', 'user', 'assistant'], comp: 9 },
    pi: { title: '<ts>_<id>.jsonl (tree)', rows: [['session', 0], ['message · user', 0], ['message · assistant', 0], ['tool_result', 0], ['message · user', 0], ['  branch A · assistant', 1, 'off'], ['  branch A · tool_result', 1, 'off'], ['  branch B · assistant', 1], ['  branch B · tool_result', 1], ['  compaction (firstKeptEntryId)', 1], ['  message · user', 1], ['  message · assistant', 1], ['  tool_result', 1], ['  branch C · assistant', 1, 'off'], ['  message · user', 1], ['  message · assistant ← leaf', 1]], comp: 9 },
  };
  let t = 0, going = false;
  const cv = canvas(f, $('#disk-canvas'), w => w < 640 ? 3*(16*17 + 34) : 16*17 + 40);
  $('#disk-go').addEventListener('click', () => { t = REDUCE ? 1 : 0; going = !REDUCE; f.draw(); });
  $('#disk-reset').addEventListener('click', () => { t = 0; going = false; f.draw(); $('#disk-state').textContent = 'press Resume'; });
  f.tick = dt => { if (!going) return false; t = Math.min(1, t + dt/3); if (t >= 1) going = false; return true; };
  f.draw = function(){
    const { g, w } = cv; cv.clear(); const narrow = w < 640; const rowH = 16;
    HS.forEach((h, i) => {
      const F = FILES[h]; const colW = narrow ? w - 16 : (w - 32)/3; const x = narrow ? 8 : 8 + i*(colW + 8); const y0 = narrow ? i*(16*17 + 34) + 8 : 8;
      lbl(g, HN[h], x, y0 + 8, { color: HCOL(h), font: sans(13, 700) }); lbl(g, F.title, x + colW, y0 + 8, { color: C.ink3, font: font(9.5), align: 'right' });
      const n = F.rows.length; const scanEnd = F.comp; // scanning from bottom up to comp, then rebuild down
      const scanP = clamp(t/0.5, 0, 1), buildP = clamp((t - 0.5)/0.5, 0, 1);
      const scanRow = n - 1 - Math.round(scanP * (n - 1 - scanEnd));
      F.rows.forEach((r, k) => {
        const text = Array.isArray(r) ? r[0] : r; const off = Array.isArray(r) && r[2] === 'off';
        const y = y0 + 20 + k*rowH; let bg = null, col = C.ink2;
        if (t > 0){
          if (k >= scanRow && scanP > 0) bg = alpha(C.ink3, .14);
          if (k === F.comp && scanP >= 1) { bg = alpha(C.sum, .3); col = C.ink; }
          if (buildP > 0 && k >= F.comp && k <= F.comp + Math.round(buildP*(n - 1 - F.comp)) && !(h === 'pi' && off)){ bg = k === F.comp ? alpha(C.sum, .35) : alpha(HCOL(h), .22); col = C.ink; }
          if (h === 'pi' && off && scanP > 0) col = alpha(C.ink3, .55);
          if (buildP >= 1 && k < F.comp) col = alpha(C.ink3, .6);
        }
        if (bg){ g.fillStyle = bg; g.fillRect(x, y - rowH/2 + 1, colW, rowH - 2); }
        if (k === F.comp){ g.fillStyle = C.sum; g.fillRect(x, y - rowH/2 + 1, 3, rowH - 2); }
        g.save(); g.beginPath(); g.rect(x, y - rowH/2, colW, rowH); g.clip();
        lbl(g, String(k+1).padStart(2,' ') + '  ' + text, x + 6, y, { color: col, font: font(10) }); g.restore();
      });
      if (t > 0 && scanP < 1){ const y = y0 + 20 + scanRow*rowH; g.strokeStyle = C.ink; g.lineWidth = 1.5; g.strokeRect(x + 0.5, y - rowH/2 + 1, colW - 1, rowH - 2); }
    });
    if (t > 0) $('#disk-state').textContent = t < 0.5 ? 'scanning back for the last compaction…' : t < 1 ? 'rebuilding from the compaction record…' : 'resumed: only lines from the compaction on are replayed';
  };
});

})();
