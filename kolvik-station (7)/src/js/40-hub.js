/* 40-hub: hub UI: tabs, stash, drag and drop, trader, hideout, deploy */
/* ================= HUB UI ================= */
let TAB='gear', SEL=null, GRIDS={};
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('on'),2600); }
function loyalty(){ let l=1; for(let i=1;i<LOYAL.length;i++) if(S.spent>=LOYAL[i]) l=i; return l; }
function renderHeader(){
  $('#cashv').textContent=fmt$(S.cash);
  taskBadge(); goalBadge(); { const cb=$('#cacheBadge'); if(cb&&S.cos){ cb.hidden=!S.cos.caches; cb.textContent=String(S.cos.caches); } } $('#readout').textContent=`${NET.season?`Season ${NET.season.n} · `:''}71°04′N 24°18′E · Ambient −31 °C · Raids ${S.stats.raids} · Extracted ${S.stats.extracts} · Kills ${S.stats.kills}${S.goals&&S.goals.title?` · “${S.goals.title}”`:''}`;
}
function setTab(t){ TAB=t; SEL=null; if(t==='deploy'){ NET.unread=0; chatBadge(); } document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-selected', b.dataset.tab===t?'true':'false')); renderTab(); }
function renderTab(){
  let dep=0, cc=0; S.stash.items=S.stash.items.filter(i=>{ if(i.id==='cash'){ dep+=i.n; return false; } if(i.id==='cache'){ cc++; return false; } return true; }); if(cc){ ensureCos(); S.cos.caches+=cc; } if(dep||cc){ S.cash+=dep; saveGame(); if(dep) toast(`Deposited ${fmt$(dep)} cash.`); }
  renderHeader(); GRIDS={}; const body=$('#tabbody');
  if(TAB==='gear') renderGear(body);
  else if(TAB==='trader') renderTrader(body);
  else if(TAB==='hideout') renderHideout(body);
  else if(TAB==='board') renderBoard(body);
  else if(TAB==='tasks') renderTasks(body);
  else if(TAB==='goals') renderGoals(body);
  else if(TAB==='friends') renderFriends(body);
  else if(TAB==='operator') renderOperator(body);
  else if(TAB==='rec') renderRec(body);
  else if(TAB==='wayout') renderWayout(body);
  else renderDeploy(body);
  tabTip(body); guestBar(); woCheck(); woBar();
}
function getCont(key){
  if(key==='stash') return S.stash;
  if(key.startsWith('eq:')){ const it=S.eq[key.slice(3)]; return it?contOf(it):null; }
  if(key==='loot') return (R&&R.lootTarget)?R.lootTarget.cont:null;
  return null;
}
const gridOwner = key => key.startsWith('eq:') ? S.eq[key.slice(3)] : null;

function itemEl(it, inslot){
  const d=ITEMS[it.id]; const el=document.createElement('div');
  el.className='item r'+d.rar+(inslot?' inslot':'')+(d.type==='cash'?' cashi':''); el.dataset.uid=it.uid;
  if(!inslot){ const [w,h]=dims(it); el.style.cssText=`--x:${it.x};--y:${it.y};--w:${w};--h:${h}`; }
  if(it.hid){ el.classList.add('hid'); el.innerHTML='<span class="q">?</span>'; return el; }
  let bd='';
  if(d.type==='ammo') bd=it.n; else if(d.type==='cash') bd='$'+it.n; else if(d.type==='weapon') bd=`${it.mag}/${wstats(it).magSize}`;
  else if(d.dur) bd=Math.ceil(it.dur); else if(d.hp) bd=Math.ceil(it.hp); else if(d.uses) bd=`${it.uses??d.uses}/${d.uses}`; else if(it.items&&it.items.length) bd=`(${it.items.length})`;
  el.innerHTML=`<span class="ic" style="background-image:url(${iconFor(it.id)})"></span><span class="nm">${esc(d.short)}</span><span class="bd">${bd}</span>`;
  if(SEL&&SEL.it===it) el.classList.add('sel');
  el.title=d.name;
  return el;
}
function gridEl(key, cont){
  const g=document.createElement('div'); g.className='grid'; g.dataset.grid=key; g.style.setProperty('--gw',cont.w); g.style.setProperty('--gh',cont.h);
  for(const it of cont.items){ const el=itemEl(it,false); bindItem(el,it,{key}); g.appendChild(el); }
  GRIDS[key]={cont,el:g};
  return g;
}
function gblock(label, key, cont, extra=''){
  const b=document.createElement('div'); b.className='gblock';
  b.innerHTML=`<div class="lbl">${label}${extra}</div>`; const box=document.createElement('div'); box.className='gridbox'+(key==='stash'?' stashbox':''); box.appendChild(gridEl(key,cont)); b.appendChild(box); return b;
}
function renderLoadout(slotsEl, gridsEl){
  slotsEl.innerHTML='';
  for(const s of SLOTS){ const el=document.createElement('div'); el.className='slot'+(s==='primary'?' wide':''); el.dataset.slot=s; el.innerHTML=`<span class="slab">${SLOT_NAME[s]}</span>`; const it=S.eq[s]; if(it){ const ie=itemEl(it,true); bindItem(ie,it,{slot:s}); el.appendChild(ie); } slotsEl.appendChild(el); }
  gridsEl.innerHTML='';
  for(const s of ['pockets','rig','pack','pouch']){ const it=S.eq[s]; if(!it) continue; const c=contOf(it); gridsEl.appendChild(gblock(SLOT_NAME[s]+(s==='rig'||s==='pack'?' · '+ITEMS[it.id].name:''),'eq:'+s,c)); }
}
function carriedValue(){ let v=0; for(const s of [...SLOTS,'pockets','pouch']) if(S.eq[s]) v+=deepValue(S.eq[s]); return v; }

function renderGear(body){
  body.innerHTML=`<section class="gear">
    <div class="col"><div class="colhead"><h2 class="h2">Loadout</h2><span class="lbl">Worth ${fmt$(carriedValue())}</span></div><div class="haulbox" id="gearHaul" hidden></div><div class="slots" id="slots"></div><div class="col" id="pgrids"></div></div>
    <div class="col"><div class="colhead"><h2 class="h2">Stash</h2><div class="acts"><button class="btn ghost sm" id="sortBtn">Sort</button><button class="btn ghost sm" id="sellJunk">Sell all loot</button></div></div><div id="stashWrap"></div></div>
    <aside class="info" id="info"></aside></section>`;
  renderLoadout($('#slots'), $('#pgrids')); renderHaul($('#gearHaul'));
  $('#stashWrap').appendChild(gblock(`${S.stash.w}×${S.stash.h} · drag to move, R rotates while dragging, double-click to quick-move`,'stash',S.stash));
  $('#sortBtn').onclick=sortStash;
  $('#sellJunk').onclick=sellAllLoot;
  renderInfo($('#info'));
}
function sortStash(){
  const items=S.stash.items.slice(); const order=['weapon','armor','helmet','rig','pack','ammo','med','warm','relic','cash','loot'];
  items.sort((a,b)=> order.indexOf(ITEMS[a.id].type)-order.indexOf(ITEMS[b.id].type) || (ITEMS[b.id].w*ITEMS[b.id].h)-(ITEMS[a.id].w*ITEMS[a.id].h) || a.id.localeCompare(b.id));
  const saved=items.map(i=>[i.x,i.y,i.r]); const tmp={w:S.stash.w,h:S.stash.h,items:[]};
  for(const it of items){ it.r=0; if(!placeNoMerge(tmp,it)){ items.forEach((x,i)=>{[x.x,x.y,x.r]=saved[i]}); toast('Could not sort: stash too full.'); return; } }
  S.stash.items=tmp.items; saveGame(); renderTab();
}
function placeNoMerge(c,it){ const g=occ(c); for(const r of [0,1]) for(let y=0;y<c.h;y++) for(let x=0;x<c.w;x++) if(fitsG(c,g,it.id,x,y,r)){ it.x=x; it.y=y; it.r=r; c.items.push(it); return true; } return false; }
function sellAllLoot(){
  let total=0; S.stash.items=S.stash.items.filter(it=>{ const d=ITEMS[it.id]; if(d.type==='loot'||d.type==='cash'){ total+=sellPrice(it); return false; } return true; });
  if(!total){ toast('No loot items in your stash.'); return; }
  S.cash+=total; SEL=null; saveGame(); renderTab(); toast(`Sold loot for ${fmt$(total)}.`);
}

function renderInfo(el){
  if(!el) return;
  if(SEL && !locate(SEL.it)) SEL=null;
  if(!SEL){ el.innerHTML=`<span class="lbl">Item details</span><p class="desc">Select an item to see its stats. Everything you carry out can be sold for cash; better cash buys better gear at the trader.</p>`; return; }
  const it=SEL.it, d=ITEMS[it.id]; const loc=locate(it);
  const st=[];
  st.push(['Value', fmt$(valueOf(it))]);
  if(d.type==='weapon'){ const ws=wstats(it); st.push(['Caliber',d.cal],['Magazine',`${it.mag}/${ws.magSize} · ${ITEMS[it.ammo].short}`],['Fire rate',`${d.rpm} rpm${d.auto?' · auto':''}`]); st.push(['Sight',{iron:'Iron sights',dot:'Red dot',holo:'Holographic',prism:`Prism ${ws.zoom}x`,scope:`Scope ${ws.zoom}x`}[ws.reticle]||'Iron sights']); if(ws.noise<1) st.push(['Suppressed','yes']); }
  if(d.type==='att') st.push(['Slot',d.aslot],['Fits',d.fits.map(f=>ITEMS[f].short).join(', ')]);
  if(d.type==='ammo') st.push(['Rounds',it.n],['Damage',d.dmg+(ITEMS[it.id].cal==='12g'?' ×8':'')],['Penetration',d.pen]);
  if(d.dur) st.push(['Armor class',d.cls],['Durability',`${Math.ceil(it.dur)}/${d.dur}`]);
  if(d.warmth) st.push(['Heat loss',`−${Math.round(d.warmth*100)}%`]);
  if(d.grid) st.push(['Storage',`${d.grid[0]}×${d.grid[1]}`]);
  if(d.hp) st.push(['Charge',`${Math.ceil(it.hp)}/${d.hp} HP`]);
  if(d.type==='key'){ const L=LOCKS[d.room]; st.push(['Opens',L?`${L.name} · ${MAPS[L.map].name}`:'?'],['Uses left',`${it.uses??d.uses}/${d.uses}`]); }
  if(d.type==='pick') st.push(['Picks left',`${it.uses??d.uses}/${d.uses}`]);
  if(d.type==='melee') st.push(['Damage',d.dmg],['Reach',`${d.reach} m`],['Wear',`${it.wear??d.wear}/${d.wear} hits left`]);
  st.push(['Size',`${d.w}×${d.h}`]);
  el.innerHTML=`<span class="rtag r${d.rar}">${RAR[d.rar]}</span><h3>${esc(d.name)}</h3><p class="desc">${esc(d.desc)}</p><dl class="stats">${st.map(([a,b])=>`<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl><div class="acts" id="acts"></div>`;
  const acts=el.querySelector('#acts');
  const btn=(label,fn,cls='btn sm')=>{ const b=document.createElement('button'); b.className=cls; b.textContent=label; b.onclick=fn; acts.appendChild(b); };
  if(R){
    if((d.type==='med'||d.type==='warm') && inPlayer(it)) btn('Use',()=>{ startUse(it); });
    if(loc && loc.key==='loot') btn('Take',()=>{ quickAction(it,loc); });
    else if(R.lootTarget && loc && loc.key) btn('Put in container',()=>{ quickAction(it,loc); },'btn ghost sm');
    if(loc && !d.fixed && loc.key!=='loot') btn('Drop on the ground',()=>{ if(it.items&&it.items.length){ toast('Empty it first.'); return; } removeAt(loc,it); dropToGround(it); SEL=null; refreshInv(); },'btn ghost sm');
  } else {
    if(loc && loc.key && !d.fixed){ const blocked=it.items&&it.items.length; btn(blocked?'Empty it to sell':`Sell for ${fmt$(sellPrice(it))}`,()=>sellItem(it,loc)); if(blocked) acts.lastChild.disabled=true; }
    if(d.slot && !d.fixed && loc && loc.key && !S.eq[d.slot]) btn('Equip',()=>{ removeAt(loc,it); S.eq[d.slot]=it; it.r=0; afterChange(); });
    if(loc && loc.slot) btn('Move to stash',()=>quickAction(it,loc),'btn ghost sm');
    if(loc && loc.key && loc.key!=='stash') btn('Move to stash',()=>quickAction(it,loc),'btn ghost sm');
    if(d.type==='weapon'){
      btn('Load from stash',()=>{ const n=takeAmmoFrom([S.stash], it); toast(n?`Loaded ${n} rounds.`:`No ${d.cal} rounds in stash.`); afterChange(); },'btn ghost sm');
      if(it.mag>0) btn('Unload',()=>{ const a=mk(it.ammo,{n:it.mag}); it.mag=0; if(!place(S.stash,a)) toast('Stash is full.'); afterChange(); },'btn ghost sm');
    }
    if(it.items && it.items.length && loc && loc.key==='stash') btn('Empty into stash',()=>{ const left=[]; for(const s of it.items.slice()){ if(!place(S.stash,s)) left.push(s); } it.items.length=0; it.items.push(...left); if(left.length) toast('Some items did not fit.'); afterChange(); },'btn ghost sm');
  }
  if(d.type==='weapon' && loc && !(R&&loc.key==='loot'&&R.lootTarget&&R.lootTarget.mate)) el.appendChild(attBox(it));
  if(it.id==='branch' && loc && loc.key!=='loot') el.appendChild(craftBox(it));
}
/* attachments: fit, swap or take off optics, muzzles and magazines, in the hideout (from your stash) and in a raid
   (from anything you carry or the container you have open). Dragging an attachment onto a gun does the same. */
function attachSources(){ if(!R) return [{key:'stash'}]; const L=['eq:pockets','eq:rig','eq:pack','eq:pouch'].filter(k=>getCont(k)).map(key=>({key})); if(R.lootTarget) L.push({key:'loot'}); return L; }
const stowAtt=a=>R?addToPlayer(a):place(S.stash,a);
function attachTo(w,a,src){ const ad=ITEMS[a.id], wd=ITEMS[w.id];
  if(ad.type!=='att') return null; if(!ad.fits.includes(w.id)) return {msg:`${ad.name} doesn't fit the ${wd.name}.`};
  const sl=ad.aslot, old=w.att&&w.att[sl]; const sc=getCont(src.key); const i=sc?sc.items.indexOf(a):-1; if(i<0) return null;
  sc.items.splice(i,1); if(R&&src.key==='loot') netTake(a);
  if(old&&!(place(sc,old)||stowAtt(old))){ sc.items.push(a); return {msg:`No room for the ${ITEMS[old.id].short} that's on it now.`}; }
  if(!w.att) w.att={optic:null,muzzle:null,mag:null}; w.att[sl]=a; fixMag(w); sfxTone(1400,0.03,0.05,'square'); return {ok:true,msg:`${ad.short} fitted to the ${wd.short}${old?`, ${ITEMS[old.id].short} put away`:''}.`}; }
function detachFrom(w,sl){ const cur=w.att&&w.att[sl]; if(!cur) return; if(!stowAtt(cur)){ toast(R?'No room in your pockets, rig or pack.':'Stash is full.'); return; } w.att[sl]=null; fixMag(w); sfxTone(900,0.03,0.05,'square'); afterChange(); }
function attBox(it){ const box=document.createElement('div'); box.className='atts'; const srcs=attachSources();
  for(const sl of ['optic','muzzle','mag']){ const row=document.createElement('div'); row.className='attrow'; const cur=it.att&&it.att[sl];
    const opts=[], seen=new Set(); for(const s of srcs){ const c=getCont(s.key); if(!c) continue; for(const a of c.items){ const ad=ITEMS[a.id]; if(a.hid||ad.type!=='att'||ad.aslot!==sl||!ad.fits.includes(it.id)||seen.has(a.id)) continue; seen.add(a.id); opts.push([a,s]); } }
    row.innerHTML=`<span class="lbl">${sl}</span><span class="attname">${cur?esc(ITEMS[cur.id].name):'<span class="muted">none</span>'}</span>`;
    if(cur){ const b=document.createElement('button'); b.className='btn ghost sm'; b.textContent='Take off'; b.onclick=()=>detachFrom(it,sl); row.appendChild(b); }
    for(const [a,s] of opts.slice(0,3)){ const b=document.createElement('button'); b.className='btn ghost sm'; b.textContent=`${cur?'Swap to':'Fit'} ${ITEMS[a.id].short}`; b.onclick=()=>{ const r=attachTo(it,a,s); if(r&&r.msg) toast(r.msg); afterChange(); }; row.appendChild(b); }
    if(!cur&&!opts.length){ const n=document.createElement('span'); n.className='muted attnone'; n.textContent=R?'none carried':'none in stash'; row.appendChild(n); }
    box.appendChild(row); }
  return box; }
function afterChange(){ if(!R) saveGame(); refreshInv(); }
function refreshInv(){ if(R){ if(R.invOpen) renderRaidInv(); } else renderTab(); }

// locate an item: returns {key} for grid or {slot}
function locate(it){
  for(const s of [...SLOTS,'pockets','pouch']) if(S.eq[s]===it) return {slot:s};
  const keys=['stash','eq:pockets','eq:rig','eq:pack','eq:pouch']; if(R&&R.lootTarget) keys.push('loot');
  for(const k of keys){ if(k==='stash'&&R) continue; const c=getCont(k); if(c&&c.items.includes(it)) return {key:k}; }
  return null;
}
function removeAt(loc,it){ if(loc.slot){ S.eq[loc.slot]=null; } else { const c=getCont(loc.key); const i=c.items.indexOf(it); if(i>=0) c.items.splice(i,1); } }
function playerConts(){ return ['rig','pockets','pack','pouch'].map(s=>S.eq[s]).filter(Boolean).map(contOf); }
function inPlayer(it){ return playerConts().some(c=>c.items.includes(it)); }
function addToPlayer(it){ for(const c of playerConts()){ if(c===undefined) continue; if(place(c,it)) return true; } return false; }

function quickAction(it, loc){
  const d=ITEMS[it.id];
  if(R){
    if(loc.key==='loot'){ if(it.items&&it.items.length){ toast('Empty it first.'); return; } removeAt(loc,it); if(!addToPlayer(it)){ R.lootTarget.cont.items.push(it); toast('No room in your rig, pockets or pack.'); } else { netTake(it); sfxPickup(); } }
    else if(R.lootTarget && loc.key){ if(R.lootTarget.mate){ toast('You can only take from a downed squadmate.'); return; } removeAt(loc,it); if(!place(R.lootTarget.cont,it)){ getCont(loc.key).items.push(it); toast('No room in the container.'); } else netPut(it); }
    else if((d.type==='med'||d.type==='warm') && loc.key) { startUse(it); return; }
    refreshInv(); return;
  }
  if(loc.key==='stash'){
    if(d.slot && !d.fixed && !S.eq[d.slot]){ removeAt(loc,it); S.eq[d.slot]=it; it.r=0; }
    else { removeAt(loc,it); if(!addToPlayer(it)){ S.stash.items.push(it); toast('No room in your loadout.'); } }
  } else {
    if(it.items&&it.items.length===0 || !it.items){ removeAt(loc,it); if(!place(S.stash,it)){ if(loc.slot) S.eq[loc.slot]=it; else getCont(loc.key).items.push(it); toast('Stash is full.'); } }
    else { removeAt(loc,it); if(!placeNoMerge(S.stash,it)){ S.eq[loc.slot]=it; toast('Stash is full.'); } }
  }
  afterChange();
}

/* ---------- drag & drop ---------- */
let drag=null, lastTap={uid:null,t:0};
const cellPx = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell')) || 46;
function bindItem(el,it,src){
  el.addEventListener('pointerdown',ev=>{
    if(ev.button!==0||it.hid) return; ev.preventDefault();
    const r=el.getBoundingClientRect(), c=cellPx(); const [w,h]=dims(it);
    drag={it,src,el,sx:ev.clientX,sy:ev.clientY,started:false,r:it.r,gx:src.slot?0:clamp(Math.floor((ev.clientX-r.left)/c),0,w-1),gy:src.slot?0:clamp(Math.floor((ev.clientY-r.top)/c),0,h-1),ghost:null,prev:null};
  });
}
function ghostDims(){ const d=ITEMS[drag.it.id]; return drag.r?[d.h,d.w]:[d.w,d.h]; }
function startGhost(){
  drag.started=true; drag.el.classList.add('dragging');
  const g=itemEl(drag.it,false); g.classList.add('dragghost'); g.classList.remove('sel'); drag.ghost=g; sizeGhost(); document.body.appendChild(g);
}
function sizeGhost(){ const c=cellPx(); const [w,h]=ghostDims(); drag.ghost.style.width=(w*c-2)+'px'; drag.ghost.style.height=(h*c-2)+'px'; }
function moveGhost(x,y){
  const c=cellPx(); drag.ghost.style.transform=`translate(${x-(drag.gx+0.5)*c}px,${y-(drag.gy+0.5)*c}px)`;
  drag.lx=x; drag.ly=y;
  const t=document.elementFromPoint(x,y);
  document.querySelectorAll('.slot.dropok').forEach(s=>s.classList.remove('dropok'));
  if(drag.prev){ drag.prev.remove(); drag.prev=null; }
  if(!t) return;
  const gEl=t.closest('[data-grid]'), sEl=t.closest('[data-slot]');
  if(gEl){ const cont=getCont(gEl.dataset.grid); if(!cont) return; const rect=gEl.getBoundingClientRect(); const tx=Math.floor((x-rect.left-1)/c)-drag.gx, ty=Math.floor((y-rect.top-1)/c)-drag.gy;
    const [w,h]=ghostDims(); const ok=fitsAt(cont,drag.it,tx,ty,drag.r,drag.it) || stackTarget(cont,x,y,rect,c);
    const p=document.createElement('div'); p.className='preview'+(ok?'':' bad'); p.style.cssText=`left:${tx*c+1}px;top:${ty*c+1}px;width:${w*c-1}px;height:${h*c-1}px`; gEl.appendChild(p); drag.prev=p; }
  else if(sEl){ const d=ITEMS[drag.it.id]; if(d.slot===sEl.dataset.slot && !S.eq[d.slot]) sEl.classList.add('dropok'); }
}
function stackTarget(cont,x,y,rect,c){ const d=ITEMS[drag.it.id]; if(!d.stack) return null; const o=itemAt(cont,Math.floor((x-rect.left-1)/c),Math.floor((y-rect.top-1)/c)); return (o&&o!==drag.it&&o.id===drag.it.id&&o.n<d.stack&&!o.hid)?o:null; }
function rotateDrag(){ if(!drag||!drag.started) return; drag.r^=1; [drag.gx,drag.gy]=[drag.gy,drag.gx]; sizeGhost(); moveGhost(drag.lx,drag.ly); }
function cancelDrag(){ if(!drag) return; if(drag.ghost) drag.ghost.remove(); if(drag.prev) drag.prev.remove(); if(drag.el) drag.el.classList.remove('dragging'); drag=null; }
document.addEventListener('pointermove',ev=>{ if(!drag) return; if(!drag.started){ if(Math.hypot(ev.clientX-drag.sx,ev.clientY-drag.sy)<5) return; startGhost(); } moveGhost(ev.clientX,ev.clientY); });
document.addEventListener('pointerup',ev=>{
  if(!drag) return; const d=drag;
  if(!d.started){ drag=null; const now=performance.now(); if(lastTap.uid===d.it.uid && now-lastTap.t<380){ lastTap.uid=null; quickAction(d.it,d.src); } else { lastTap={uid:d.it.uid,t:now}; SEL={it:d.it}; document.querySelectorAll('.item.sel').forEach(e=>e.classList.remove('sel')); d.el.classList.add('sel'); renderInfo(document.querySelector(R?'#rinfo':'#info')); } return; }
  const res=tryDrop(ev.clientX,ev.clientY); cancelDrag(); if(res&&res.msg) toast(res.msg); if(res&&res.ok){ SEL={it:d.it}; afterChange(); } else refreshInv();
});
document.addEventListener('pointercancel',()=>{ cancelDrag(); refreshInv(); });
function tryDrop(x,y){
  if(drag.prev){ drag.prev.remove(); drag.prev=null; }
  const t=document.elementFromPoint(x,y); if(!t) return null;
  const it=drag.it, d=ITEMS[it.id], src=drag.src;
  const gEl=t.closest('[data-grid]'), sEl=t.closest('[data-slot]'), sell=t.closest('[data-sell]'), disc=t.closest('[data-discard]');
  if(d.type==='att'&&src.key){ let w=null; if(sEl&&(sEl.dataset.slot==='primary'||sEl.dataset.slot==='secondary')) w=S.eq[sEl.dataset.slot];
    else if(gEl){ const cont=getCont(gEl.dataset.grid); if(cont){ const c=cellPx(), rect=gEl.getBoundingClientRect(); const o=itemAt(cont,Math.floor((x-rect.left-1)/c),Math.floor((y-rect.top-1)/c)); if(o&&o!==it&&ITEMS[o.id].type==='weapon') w=o; } }
    if(w) return attachTo(w,it,src); }
  if(gEl){
    const key=gEl.dataset.grid, cont=getCont(key); if(!cont) return null; const c=cellPx(); const rect=gEl.getBoundingClientRect();
    if(gridOwner(key)===it) return {msg:"A container can't go inside itself."};
    if(it.items&&it.items.length&&key!=='stash') return {msg:'Empty it first.'};
    if(R&&key==='loot'&&src.key!=='loot'&&R.lootTarget&&R.lootTarget.mate) return {msg:"You can only take from a downed squadmate."};
    const st=stackTarget(cont,x,y,rect,c);
    if(st){ const mv=Math.min(it.n,d.stack-st.n); st.n+=mv; it.n-=mv; if(it.n<=0){ removeAt(src,it); if(R&&src.key==='loot'&&key!=='loot') netTake(it); } return {ok:true}; }
    const tx=Math.floor((x-rect.left-1)/c)-drag.gx, ty=Math.floor((y-rect.top-1)/c)-drag.gy;
    if(!fitsAt(cont,it,tx,ty,drag.r,it)) return {msg:'No room there.'};
    removeAt(src,it); it.x=tx; it.y=ty; it.r=drag.r; cont.items.push(it);
    if(R&&NET.on){ if(src.key==='loot'&&key!=='loot') netTake(it); else if(key==='loot'&&src.key!=='loot') netPut(it); }
    return {ok:true};
  }
  if(sEl){ const slot=sEl.dataset.slot; if(src.slot===slot) return null; if(d.slot!==slot) return {msg:`${d.name} doesn't go in the ${SLOT_NAME[slot].toLowerCase()} slot.`}; if(S.eq[slot]) return {msg:'That slot is taken. Move the current item out first.'}; removeAt(src,it); S.eq[slot]=it; it.r=0; return {ok:true}; }
  if(sell && !R){ if(src.key!=='stash') return {msg:'Sell from your stash.'}; sellItem(it,src); return null; }
  if(disc && R){ if(it.items&&it.items.length) return {msg:'Empty it first.'}; removeAt(src,it); if(src.key==='loot') netTake(it); dropToGround(it); return {ok:true}; }
  return null;
}
// what you brought out: everything in pockets, rig, pack and pouch except your kit (meds, cocoa, ammo for your guns)
function haulItems(){
  const keep=new Set(); for(const sl of ['primary','secondary']){ const w=S.eq[sl]; if(w) for(const a of CALS[ITEMS[w.id].cal]) keep.add(a); }
  const out=[]; for(const sl of ['pockets','rig','pack','pouch']){ const c=S.eq[sl]; if(!c) continue; for(const it of c.items){ const d=ITEMS[it.id]; if(d.type==='med'||d.type==='warm'||(d.type==='ammo'&&keep.has(it.id))) continue; out.push([sl,it]); } }
  return out;
}
function haulToStash(){ let moved=0,left=0; for(const [sl,it] of haulItems()){ const c=contOf(S.eq[sl]); c.items.splice(c.items.indexOf(it),1); const ok=(it.items&&it.items.length)?placeNoMerge(S.stash,it):place(S.stash,it); if(ok) moved++; else { c.items.push(it); left++; } } return {moved,left}; }
function sellHaul(){ let n=0,cash=0,skipped=0; for(const [sl,it] of haulItems()){ const hd=ITEMS[it.id]; if(hd.type==='relic'||hd.relic||hd.type==='cache'){ const c=contOf(S.eq[sl]); c.items.splice(c.items.indexOf(it),1); if(!place(S.stash,it)) c.items.push(it); continue; } if(it.items&&it.items.length){ skipped++; continue; } const c=contOf(S.eq[sl]); c.items.splice(c.items.indexOf(it),1); const p=sellPrice(it); cash+=p; n++; } S.cash+=cash; return {n,cash,skipped}; }
function renderHaul(el){
  if(!el) return; const h=haulItems();
  if(!h.length){ el.innerHTML=el.dataset.done?`<p class="muted" style="margin:0">${esc(el.dataset.done)}</p>`:''; el.hidden=!el.dataset.done; return; }
  el.hidden=false;
  const keep=it=>{ const d=ITEMS[it.id]; return d.type==='relic'||d.relic||d.type==='cache'; }; const val=h.reduce((t,[,it])=>t+valueOf(it),0), sell=h.reduce((t,[,it])=>t+((it.items&&it.items.length)||keep(it)?0:sellPrice(it)),0);
  el.innerHTML=`<div class="colhead"><span class="lbl">Haul · ${h.length} item${h.length===1?'':'s'} in your rig, pockets and pack</span><span class="cash">${fmt$(val)}</span></div>
   <div class="haul">${h.map(([,it])=>{ const d=ITEMS[it.id]; return `<span class="hchip r${d.rar}" title="${esc(d.name)}"><span class="hic" style="background-image:url(${iconFor(it.id)})"></span>${esc(d.short)}${d.stack&&it.n>1?' ×'+it.n:''}</span>`; }).join('')}</div>
   <div class="acts"><button class="btn sm" data-haul="stash">Move all to stash</button><button class="btn ghost sm" data-haul="sell">Sell all for ${fmt$(sell)}</button></div>
   <p class="muted" style="margin:0;font-size:12.5px">Medical kit, cocoa and ammo for the guns you carry stay with you. Selling pays 60% of value. Trophies, cryo cells and relic gear go to the stash instead of being sold.</p>`;
  el.querySelector('[data-haul=stash]').onclick=()=>{ const r=haulToStash(); el.dataset.done=r.left?`Moved ${r.moved} item${r.moved===1?'':'s'} to your stash. ${r.left} did not fit; sell them or upgrade your racks.`:`Moved ${r.moved} item${r.moved===1?'':'s'} to your stash.`; afterHaul(el); };
  el.querySelector('[data-haul=sell]').onclick=()=>{ const r=sellHaul(); el.dataset.done=`Sold ${r.n} item${r.n===1?'':'s'} for ${fmt$(r.cash)}.`+(r.skipped?` Kept ${r.skipped} container${r.skipped===1?'':'s'} that still have items inside.`:''); afterHaul(el); };
}
function afterHaul(el){ saveGame(); sfxPickup(); if(el.id==='haulBox'){ renderHaul(el); const b=$('#resBal'); if(b) b.textContent=fmt$(S.cash); } else { const msg=el.dataset.done; renderTab(); toast(msg); } }
function sellItem(it,loc){ if(it.items&&it.items.length){ toast('Empty it first.'); return; } const p=sellPrice(it); removeAt(loc,it); S.cash+=p; SEL=null; sfxPickup(); saveGame(); renderTab(); toast(`Sold ${ITEMS[it.id].name} for ${fmt$(p)}.`); }

/* ---------- trader ---------- */
const CATALOG=[['Weapons',['bow','cbow','makar','vintik','tundra','nord','akr','kestrel']],['Ammo',['arrow','a918','a12','a545','a762','a545bp']],['Grenades',['frag','flash','smokew','smoker','smokeg']],['Armor',['hardhat','vest','aramid','bastion','plate','glacier','warden']],['Rigs & packs',['belt','chestrig','sack','ruck','sled']],['Medical',['bandage','tourniquet','splint','handwarm','thermos','ration','ifak','combatkit','fieldkit']],['Tools',['lockpick','jammer','pdrone']],['Attachments',['reddot','holo','supp9','tube','extmag','prism','suppr','brake','scope4','dmrmag']]];
function renderTrader(body){
  const ll=loyalty(); const nxt=LOYAL[ll+1];
  body.innerHTML=`<section class="trader">
   <div class="col"><div class="colhead"><h2 class="h2">Quartermaster Ilse</h2></div>
    <div class="ll"><span class="lbl">Loyalty ${ll}</span>${[1,2,3].map(i=>`<span class="pip ${i<=ll?'on':''}"></span>`).join('')}<span class="muted" style="font-size:13px">${nxt?`Spend ${fmt$(nxt-S.spent)} more to unlock tier ${ll+1} gear`:'All gear unlocked'}</span></div>
    <div class="cat" id="cat"></div></div>
   <div class="col"><div class="colhead"><h2 class="h2">Your stash</h2></div><div id="stashWrap"></div><div class="sellzone" data-sell>Drop here to sell · trader pays 60% of value</div></div>
   <aside class="info" id="info"></aside></section>`;
  const cat=$('#cat');
  renderKits(cat, ll);
  for(const [name,ids] of CATALOG){
    const h=document.createElement('h4'); h.textContent=name; cat.appendChild(h);
    for(const id of ids){ const d=ITEMS[id]; const p=buyPrice(id); const locked=d.tier>ll;
      const row=document.createElement('div'); row.className=`row r${d.rar}${locked?' locked':''}`;
      const sub = locked ? `Unlocks at loyalty ${d.tier}` : (d.type==='weapon'?`${d.cal} · ${d.rpm} rpm`:d.type==='ammo'?`${d.stack} rds · dmg ${d.dmg} · pen ${d.pen}`:d.cls?`Class ${d.cls} · ${d.dur} dur`:d.grid?`${d.grid[0]}×${d.grid[1]} storage`:esc(d.desc));
      row.innerHTML=`<div class="nm">${esc(d.name)}<small>${sub}</small></div><span class="cash">${fmt$(p)}</span>`;
      const b=document.createElement('button'); b.className='btn sm'; b.textContent='Buy'; b.disabled=locked||S.cash<p; b.onclick=()=>buy(id); row.appendChild(b); cat.appendChild(row); }
  }
  $('#stashWrap').appendChild(gblock('Select an item or drag it to the sell box','stash',S.stash));
  renderInfo($('#info'));
}
const KITS=[
 {id:'scav',name:'Scav kit',free:true,items:[['makar',{mag:8}],['a918',{n:24}],['bandage']],desc:'Free when you are broke. Pistol, a few rounds, a bandage. Go earn it back.'},
 {id:'budget',name:'Budget runner',tier:1,items:[['vintik',{mag:30}],['a918',{n:50}],['a918',{n:50}],['vest'],['belt'],['sack'],['bandage'],['bandage'],['thermos']],desc:'SMG, soft vest, a sack for loot.'},
 {id:'standard',name:'Standard',tier:2,items:[['akr',{mag:30}],['a545',{n:60}],['a545',{n:60}],['aramid'],['hardhat'],['chestrig'],['ruck'],['ifak'],['bandage'],['splint'],['thermos']],desc:'Rifle, aramid parka, expedition pack.'},
 {id:'heavy',name:'Heavy',tier:3,items:[['kestrel',{mag:10}],['a762',{n:40}],['a762',{n:40}],['plate'],['bastion'],['chestrig'],['sled'],['fieldkit'],['ifak'],['bandage'],['splint'],['thermos'],['thermos']],desc:'DMR, plates, hauler pack. For the vault.'},
];
const stackPrice=(id,n)=>{ const d=ITEMS[id]; return d.stack?Math.round(buyPrice(id)*n/d.stack):buyPrice(id); };
function kitPrice(k){ if(k.free) return 0; return Math.round(k.items.reduce((s,[id,o])=>s+stackPrice(id,(o&&o.n)||1),0)*0.85/10)*10; }
function broke(){ let v=S.cash; for(const it of S.stash.items) v+=deepValue(it); v+=carriedValue(); return v<1500; }
function renderKits(cat, ll){
  const h=document.createElement('h4'); h.textContent='Build kits · 15% off buying the pieces'; cat.appendChild(h);
  for(const k of KITS){
    const price=kitPrice(k); const locked=!k.free&&k.tier>ll; const scavOk=k.free&&broke();
    const row=document.createElement('div'); row.className=`row r${k.free?0:k.tier}${locked?' locked':''}`;
    const list=k.items.map(([id,o])=>ITEMS[id].short+(o&&o.n?' ×'+o.n:'')).join(', ');
    row.innerHTML=`<div class="nm">${esc(k.name)}<small>${locked?`Unlocks at loyalty ${k.tier}`:k.free&&!scavOk?'Only offered when your cash, stash and loadout are worth under $1,500':esc(k.desc)}</small><small>${esc(list)}</small></div><span class="cash">${k.free?'Free':fmt$(price)}</span>`;
    const b=document.createElement('button'); b.className='btn sm'; b.textContent=k.free?'Take':'Buy'; b.disabled=locked||(k.free?!scavOk:S.cash<price); b.onclick=()=>buyKit(k); row.appendChild(b); cat.appendChild(row);
  }
  if(S.lastKit&&S.lastKit.length){
    const ok=S.lastKit.filter(([id])=>ITEMS[id]&&(ITEMS[id].tier||1)<=ll&&ITEMS[id].type!=='pockets'&&ITEMS[id].type!=='pouch');
    const price=ok.reduce((s,[id,n])=>s+stackPrice(id,n||1),0);
    const row=document.createElement('div'); row.className='row r1';
    row.innerHTML=`<div class="nm">Re-buy last loadout<small>${esc(ok.map(([id,n])=>ITEMS[id].short+(n>1?' ×'+n:'')).join(', '))}${ok.length<S.lastKit.length?' · some items are locked or not sold':''}</small></div><span class="cash">${fmt$(price)}</span>`;
    const b=document.createElement('button'); b.className='btn sm'; b.textContent='Buy'; b.disabled=S.cash<price||!ok.length; b.onclick=()=>buyKit({name:'Last loadout',items:ok.map(([id,n])=>[id,ITEMS[id].stack?{n}:(ITEMS[id].type==='weapon'?{mag:0}:{})]),price}); row.appendChild(b); cat.appendChild(row);
  }
}
function buyKit(k){
  const price=k.price!=null?k.price:kitPrice(k); if(S.cash<price) return;
  const items=k.items.map(([id,o])=>mk(id,o||{}));
  const tmp={w:S.stash.w,h:S.stash.h,items:S.stash.items.slice()};
  for(const it of items) if(!placeNoMerge(tmp,it)){ toast('Not enough stash space for the whole kit.'); return; }
  S.cash-=price; S.spent+=price; S.stash.items=tmp.items;
  const before=loyalty();
  for(const it of items){ const d=ITEMS[it.id]; if(d.slot&&!d.fixed&&!S.eq[d.slot]){ removeAt({key:'stash'},it); S.eq[d.slot]=it; it.r=0; } }
  for(const it of items){ const d=ITEMS[it.id]; if((d.type==='ammo'||d.type==='med'||d.type==='warm')&&S.stash.items.includes(it)){ removeAt({key:'stash'},it); if(!addToPlayer(it)) S.stash.items.push(it); } }
  for(const s of ['primary','secondary']){ const w=S.eq[s]; if(w&&w.mag===0) takeAmmoFrom([...playerConts(),S.stash],w); }
  saveGame(); renderTab(); toast(`${k.name} bought and equipped where slots were free.`+(loyalty()>before?` Loyalty ${loyalty()} reached.`:''));
}
function buy(id){ const p=buyPrice(id); if(S.cash<p) return; const it=mk(id); if(ITEMS[id].type==='weapon') it.mag=0; if(!place(S.stash,it)){ toast('Stash is full. Sell something or upgrade your racks.'); return; } const before=loyalty(); S.cash-=p; S.spent+=p; sfxClick(); saveGame(); renderTab(); toast(`Bought ${ITEMS[id].name}.`+(loyalty()>before?` Loyalty ${loyalty()} reached: new gear unlocked.`:'')); }

/* ---------- hideout ---------- */
const MODS={
 stash:{name:'Stash racks',max:3,costs:[0,0,6000,18000],eff:l=>`${STASH_ROWS[l]} rows of storage`},
 heater:{name:'Diesel heater',max:2,costs:[0,3500,11000],eff:l=>l?`Body heat drains ${l*25}% slower in raids`:'Not built'},
 workbench:{name:'Workbench',max:2,costs:[0,3000,9000],eff:l=>l?`Crafts ammunition (tier ${l})`:'Not built'},
 med:{name:'Med station',max:2,costs:[0,2500,8000],eff:l=>l?`Crafts medical gear (tier ${l})`:'Not built'},
 armory:{name:'Armory',max:1,costs:[0,40000],eff:l=>l?'Builds relic gear from boss trophies and cryo cells':'Not built. Relic gear needs boss trophies and cryo cells'},
};
const RECIPES=[
 {mod:'workbench',lvl:1,in:{powder:1},out:['a918',100]},
 {mod:'workbench',lvl:1,in:{powder:1,scrap:1},out:['a545',60]},
 {mod:'workbench',lvl:1,in:{powder:1,bolts:1},out:['a12',60]},
 {mod:'workbench',lvl:2,in:{powder:2,bolts:1},out:['a762',40]},
 {mod:'workbench',lvl:2,in:{powder:2,scrap:1,wire:1},out:['a545bp',60]},
 {mod:'med',lvl:1,in:{tape:1},out:['bandage',3]},
 {mod:'med',lvl:1,in:{scrap:1},out:['splint',2]},
 {mod:'med',lvl:1,in:{medsup:1},out:['ifak',1]},
 {mod:'med',lvl:2,in:{medsup:1,tape:1},out:['fieldkit',1]},
 {mod:'armory',lvl:1,in:{tr_chief:1,cryocell:1,glacier:1},cash:20000,out:['wraith',1]},
 {mod:'armory',lvl:1,in:{tr_warden:1,cryocell:1},cash:25000,out:['relpouch',1],upgrade:'pouch'},
 {mod:'armory',lvl:1,in:{tr_foreman:1,cryocell:2,warden:1},cash:30000,out:['isbjorn',1]},
 {mod:'armory',lvl:1,in:{tr_chief:1,tr_warden:1,tr_foreman:1,cryocell:2,kestrel:1},cash:50000,out:['nordlys',1]},
];
const stashCount = id => S.stash.items.filter(i=>i.id===id&&!(i.items&&i.items.length)).length;
function renderHideout(body){
  body.innerHTML=`<div class="colhead" style="margin-bottom:14px"><h2 class="h2">Relay hideout</h2><span class="lbl">Upgrades are paid in cash</span></div><div class="mods" id="mods"></div>`;
  const wrap=$('#mods');
  for(const [k,m] of Object.entries(MODS)){
    const l=S.hide[k]; const el=document.createElement('div'); el.className='mod';
    const next=l<m.max?m.costs[l+1]:null;
    el.innerHTML=`<div class="lvl">${Array.from({length:m.max},(_,i)=>`<i class="${i<l?'on':''}"></i>`).join('')}</div><h3>${m.name}</h3><div class="muted">${m.eff(l)}</div>${next!=null?`<div>Level ${l+1}: ${m.eff(l+1)} · <span class="cash">${fmt$(next)}</span></div>`:'<div class="lbl">Fully upgraded</div>'}`;
    if(next!=null){ const b=document.createElement('button'); b.className='btn sm'; b.textContent=`Upgrade · ${fmt$(next)}`; b.disabled=S.cash<next; b.style.alignSelf='flex-start'; b.onclick=()=>{ S.cash-=next; S.hide[k]++; if(k==='stash') S.stash.h=STASH_ROWS[S.hide.stash]; saveGame(); renderTab(); toast(`${m.name} upgraded.`); }; el.appendChild(b); }
    for(const rc of RECIPES.filter(r=>r.mod===k)){
      const row=document.createElement('div'); row.className='recipe';
      const ins=Object.entries(rc.in).map(([id,n])=>`<span class="${stashCount(id)>=n?'have':'need'}">${n}× ${ITEMS[id].name}</span>`).join(' + ')+(rc.cash?` + <span class="${S.cash>=rc.cash?'have':'need'}">${fmt$(rc.cash)}</span>`:'');
      const installed=rc.upgrade&&S.eq[rc.upgrade]&&S.eq[rc.upgrade].id===rc.out[0];
      const can=!installed && l>=rc.lvl && S.cash>=(rc.cash||0) && Object.entries(rc.in).every(([id,n])=>stashCount(id)>=n);
      const od=ITEMS[rc.out[0]];
      row.innerHTML=`<div>${ins}<br><span class="muted">→ ${od.stack?rc.out[1]+' ':rc.out[1]+'× '}${od.rar>=4&&k==='armory'?`<b style="color:#e8b04a">${od.name}</b>`:od.name}${od.cls?` · class ${od.cls}`:''}${rc.upgrade?' · replaces your secure pouch':''}${l<rc.lvl?` · needs level ${rc.lvl}`:''}</span></div>`;
      const b=document.createElement('button'); b.className='btn ghost sm'; b.textContent=installed?'Installed':'Craft'; b.disabled=!can; b.onclick=()=>craft(rc); row.appendChild(b); el.appendChild(row);
    }
    wrap.appendChild(el);
  }
}
function craft(rc){
  const tmp={w:S.stash.w,h:S.stash.h,items:S.stash.items.slice()};
  for(const [id,n] of Object.entries(rc.in)){ let k=n; tmp.items=tmp.items.filter(i=>{ if(k>0&&i.id===id&&!(i.items&&i.items.length)){k--;return false;} return true; }); }
  if(S.cash<(rc.cash||0)) return;
  const [oid,n]=rc.out; const outs=[];
  if(rc.upgrade){ S.stash.items=tmp.items; S.cash-=rc.cash||0; S.eq[rc.upgrade].id=oid; craftDone(oid); return; }
  if(ITEMS[oid].stack){ let left=n; while(left>0){ const c=Math.min(left,ITEMS[oid].stack); outs.push(mk(oid,{n:c})); left-=c; } } else for(let i=0;i<n;i++) outs.push(mk(oid));
  for(const o of outs) if(!placeNoMerge(tmp,o)){ toast('Not enough stash space for the result.'); return; }
  S.stash.items=tmp.items; S.cash-=rc.cash||0; craftDone(oid);
}
function craftDone(oid){ S.crafted[oid]=(S.crafted[oid]||0)+1; qBump(o=>o.type==='craft'&&o.item===oid?1:0); if(ITEMS[oid].rar>=4) sfxExtracted(); saveGame(); renderTab(); toast(`Crafted ${ITEMS[oid].name}.`); }

/* ---------- deploy ---------- */
