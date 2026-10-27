/* Kolvik Station item tests.
   Runs inside the game page and checks every item in ITEMS. Like debug.js, the server only hands this file to admins;
   the debug panel's Tests tab loads it, and tests/run-item-tests.js injects it into a headless browser.

   KolvikItemTests.run({raid:true}) resolves to {summary, items:[...], global:[...]}. Every item gets:
   - definition: required fields for its type, sane numbers, cross-references (calibers, attachment fits, reticles)
   - icon: drawn, and not the gray placeholder
   - hideout: created, placed in the stash, saved and loaded back, shown in the details pane, equipped or packed with a
     double-click and taken off again, sold, bought from the trader (if it's sold there), weapons with every
     attachment that fits, containers holding things
   - raid (only with raid:true, starts a solo raid on Kolvik Station): picked up from a container, shown in the raid
     inventory, weapons loaded with every ammo type, fired, reloaded through the game loop and fired empty, every
     attachment mounted on the viewmodel, meds and the thermos used through the game loop, armor and helmets shot

   Your real save is never touched: the tests swap in a throwaway save, switch saving off while they run, and put
   everything back afterwards. */
(function(){
'use strict';
const ASLOTS=['optic','muzzle','mag'], MED_KINDS=['bandage','splint','heal'];
const CONT_TYPES=['rig','pack','pouch','pockets'];
const fin=v=>typeof v==='number'&&isFinite(v);
const int=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function newResult(d){ return {id:d.id,name:d.name,type:d.type,fails:[],warns:[],notes:[],checks:0}; }
function ck(r,cond,msg,warn){ r.checks++; if(!cond) (warn?r.warns:r.fails).push(msg); return !!cond; }
function tryk(r,label,fn){ r.checks++; try{ return fn(); }catch(e){ r.fails.push(`${label}: ${e&&e.message||e}`); return undefined; } }
// sights draw their reticle from RETICLES, except the 4x scope, which is the #scope overlay
const reticleOk=k=>!!RETICLES[k]||(k==='scope'&&!!document.querySelector('#scope')&&document.querySelector('#scope').innerHTML.length>0);
const fitsWeapons=id=>Object.values(ITEMS).filter(a=>a.type==='att'&&a.fits&&a.fits.includes(id));

/* ---------- sandbox: a throwaway save, saving switched off ---------- */
function enter(){
  const keep={S, SEL, TAB, saveGame:window.saveGame, accPush:window.accPush, accFlush:window.accFlush, toast:window.toast, god:DBG.god, ammo:DBG.ammo, musicOn:MUS.on, toasts:[]};
  window.saveGame=()=>{}; window.accPush=()=>{}; window.accFlush=async()=>{}; window.toast=m=>{ keep.toasts.push(m); };
  DBG.ammo=false; if(MUS.on) musicStop(0.2); if(MUS.sfx){ keep.sfx=MUS.sfx.gain.value; MUS.sfx.gain.value=0; }
  return keep;
}
function leave(keep){
  window.saveGame=keep.saveGame; window.accPush=keep.accPush; window.accFlush=keep.accFlush; window.toast=keep.toast;
  S=keep.S; SEL=null; DBG.god=keep.god; DBG.ammo=keep.ammo; if(MUS.sfx&&keep.sfx!=null) MUS.sfx.gain.value=keep.sfx;
  try{ $('#result').hidden=true; $('#hub').hidden=false; setTab(keep.TAB||'gear'); }catch(e){}
  if(keep.musicOn&&S.music) try{ musicStart(); }catch(e){}
}
function freshSave(){
  S=newSave(); normSave(); S.cash=1e7; S.spent=1e7; S.hide.stash=3; S.stash.h=STASH_ROWS[3]; S.stash.items=[];
  S.eq.rig.items=[]; S.eq.pockets.items=[]; S.eq.pouch.items=[];
}
const clearPlayer=()=>{ for(const s of ['rig','pack','pockets','pouch']) if(S.eq[s]) S.eq[s].items=[]; };

/* ---------- definition ---------- */
function testDefinition(r,d,key){
  ck(r,d.id===key,`id "${d.id}" doesn't match its key "${key}"`);
  ck(r,typeof d.name==='string'&&d.name.length>0,'missing name');
  ck(r,typeof d.short==='string'&&d.short.length>0,'missing short label');
  ck(r,!d.short||d.short.length<=8,`short label "${d.short}" is longer than 8 characters and may overflow the grid`,true);
  ck(r,!!GLYPH[d.type],`unknown type "${d.type}"`);
  ck(r,int(d.w,1,8)&&int(d.h,1,8),`bad size ${d.w}×${d.h}`);
  ck(r,fin(d.value)&&d.value>=0,`bad value ${d.value}`);
  ck(r,int(d.rar,0,RAR.length-1),`bad rarity ${d.rar}`);
  ck(r,typeof d.desc==='string'&&(d.desc.length>0||d.fixed),'missing description',true);
  if(d.tier!=null) ck(r,fin(d.tier)&&d.tier>=1,`bad trader tier ${d.tier}`);
  if(d.slot) ck(r,SLOTS.includes(d.slot)||d.slot==='pockets'||d.slot==='pouch',`unknown slot "${d.slot}"`);
  switch(d.type){
    case 'weapon':
      ck(r,d.slot==='primary'||d.slot==='secondary',`weapon slot is "${d.slot}"`);
      ck(r,!!CALS[d.cal]&&CALS[d.cal].length>0,`caliber "${d.cal}" has no ammo`);
      ck(r,int(d.magSize,1,500),`bad magSize ${d.magSize}`);
      ck(r,fin(d.rpm)&&d.rpm>0,`bad rpm ${d.rpm}`); ck(r,fin(d.spread)&&d.spread>0,`bad spread ${d.spread}`);
      ck(r,fin(d.recoil)&&d.recoil>=0,`bad recoil ${d.recoil}`); ck(r,fin(d.reload)&&d.reload>0,`bad reload ${d.reload}`);
      if(d.pellets!=null) ck(r,int(d.pellets,1,30),`bad pellets ${d.pellets}`);
      ck(r,!!GUNGEO[d.id],'no 3D model in GUNGEO, so it uses a generic gun',true);
      ck(r,fitsWeapons(d.id).length>0,'no attachment fits it',true);
      break;
    case 'ammo':
      ck(r,!!CALS[d.cal]&&CALS[d.cal].includes(d.id),`not listed under caliber "${d.cal}" in CALS, so no gun can load it`);
      ck(r,fin(d.dmg)&&d.dmg>0,`bad dmg ${d.dmg}`); ck(r,fin(d.pen)&&d.pen>=0,`bad pen ${d.pen}`); ck(r,int(d.stack,1,10000),`bad stack ${d.stack}`);
      ck(r,Object.values(ITEMS).some(w=>w.type==='weapon'&&w.cal===d.cal),`no weapon fires ${d.cal}`);
      break;
    case 'helmet': case 'armor':
      ck(r,d.slot===d.type,`slot "${d.slot}" should be "${d.type}"`);
      ck(r,int(d.cls,1,6),`bad armor class ${d.cls}`); ck(r,fin(d.dur)&&d.dur>0,`bad durability ${d.dur}`);
      if(d.warmth!=null) ck(r,fin(d.warmth)&&d.warmth>0&&d.warmth<1,`bad warmth ${d.warmth}`);
      break;
    case 'rig': case 'pack': case 'pouch': case 'pockets':
      ck(r,d.slot===d.type,`slot "${d.slot}" should be "${d.type}"`);
      ck(r,Array.isArray(d.grid)&&int(d.grid[0],1,12)&&int(d.grid[1],1,12),`bad grid ${JSON.stringify(d.grid)}`);
      break;
    case 'med':
      ck(r,MED_KINDS.includes(d.med),`unknown med kind "${d.med}"`); ck(r,fin(d.use)&&d.use>0,`bad use time ${d.use}`);
      if(d.med==='heal') ck(r,fin(d.hp)&&d.hp>0,`heal item without hp`);
      break;
    case 'warm': ck(r,fin(d.warm)&&d.warm>0,`bad warm ${d.warm}`); ck(r,fin(d.use)&&d.use>0,`bad use time ${d.use}`); break;
    case 'att':
      ck(r,ASLOTS.includes(d.aslot),`unknown attachment slot "${d.aslot}"`);
      ck(r,Array.isArray(d.fits)&&d.fits.length>0,'fits no weapon');
      for(const w of d.fits||[]) ck(r,ITEMS[w]&&ITEMS[w].type==='weapon',`fits "${w}", which is not a weapon`);
      if(d.aslot==='optic'){ ck(r,reticleOk(d.reticle),`reticle "${d.reticle}" doesn't exist`); ck(r,fin(d.zoom)&&d.zoom>=1,`bad zoom ${d.zoom}`); ck(r,fin(d.ads)&&d.ads>0,`bad ads ${d.ads}`); ck(r,fin(d.adsSpeed)&&d.adsSpeed>0,`bad adsSpeed ${d.adsSpeed}`); }
      if(d.aslot==='mag') ck(r,fin(d.magMul)&&d.magMul>1,`bad magMul ${d.magMul}`);
      if(d.aslot==='muzzle') ck(r,fin(d.noise)&&d.noise>0&&d.noise<=1,`bad noise ${d.noise}`);
      break;
    case 'cash': ck(r,int(d.stack,1,1e6),`bad stack ${d.stack}`); break;
    case 'key': ck(r,int(d.uses,1,50),`bad uses ${d.uses}`); ck(r,!!LOCKS[d.room],`opens room "${d.room}", which doesn't exist`); if(LOCKS[d.room]) ck(r,LOCKS[d.room].key===d.id,`room ${d.room} expects key ${LOCKS[d.room].key}`); break;
    case 'pick': ck(r,int(d.uses,1,50),`bad uses ${d.uses}`); break;
  }
}

/* ---------- icon ---------- */
function iconRefs(){
  const out={};
  for(const [k,def] of [['__t_loot',{type:'loot'}],['__t_none',{type:'__none'}]]){ ITEMS[k]=Object.assign({id:k,name:k,short:k,w:1,h:1,value:0,rar:0},def); try{ out[k]=iconFor(k); }catch(e){ out[k]=null; } delete ICONS[k]; delete ITEMS[k]; }
  return out;
}
function testIcon(r,d,refs){
  if(d.type==='pockets'){ r.notes.push('pockets are never drawn as an item: icon skipped'); return; }
  const src=tryk(r,'icon',()=>{ delete ICONS[d.id]; return iconFor(d.id); }); if(src===undefined) return;
  ck(r,typeof src==='string'&&src.startsWith('data:image/png'),'icon is not an image');
  ck(r,src!==refs.__t_none,'icon is blank (iconFor has no drawing for this type)');
  ck(r,src!==refs.__t_loot,'uses the gray placeholder icon (no drawing in iconFor)',true);
}

/* ---------- hideout ---------- */
function testHub(r,d){
  if(d.fixed){ r.notes.push('fixed slot item: hideout moves skipped'); }
  freshSave();
  const it=tryk(r,'mk()',()=>mk(d.id)); if(!it) return;
  if(d.stack) ck(r,it.n===d.stack,`new stack has n=${it.n}`);
  if(d.type==='weapon') ck(r,it.mag===0&&CALS[d.cal].includes(it.ammo)&&it.att,'new weapon is missing mag/ammo/att');
  if(d.dur) ck(r,it.dur===d.dur,'new armor durability is wrong');
  if(d.grid) ck(r,Array.isArray(it.items),'new container has no items list');
  if(d.hp) ck(r,it.hp===d.hp,'new med kit hp is wrong');
  const v=tryk(r,'value',()=>[valueOf(it),deepValue(it),sellPrice(it)]);
  if(v) ck(r,v.every(fin)&&v[0]>=0,`value is not a number (${v.join(', ')})`);
  if(d.fixed) return;
  ck(r,place(S.stash,it),`doesn't fit in an empty ${S.stash.w}×${S.stash.h} stash`);
  ck(r,!!locate(it)&&locate(it).key==='stash','not found in the stash after placing it');
  const el=tryk(r,'grid tile',()=>itemEl(it,false)); if(el!==undefined) ck(r,el instanceof Element,'grid tile is not an element');
  tryk(r,'details pane',()=>{ const box=document.createElement('div'); SEL={it}; renderInfo(box); if(!box.textContent.includes(d.name)) throw new Error('details pane does not show the name'); SEL=null; });
  // save and load back
  const back=tryk(r,'save/load',()=>{ const txt=JSON.stringify(S); S=JSON.parse(txt); normSave(); return S.stash.items.find(x=>x.uid===it.uid); });
  if(back!==undefined){ ck(r,!!back,'gone after a save/load round trip');
    if(back){ for(const f of ['id','n','mag','ammo','dur','hp']) if(it[f]!==undefined) ck(r,back[f]===it[f],`${f} changed after save/load (${it[f]} → ${back[f]})`);
      if(it.items) ck(r,Array.isArray(back.items),'container contents lost after save/load'); } }
  const cur=back||it;
  // cash and sealed caches never stay in the stash: the hideout banks the cash and opens the caches
  if(d.type==='cash'||d.type==='cache'){
    tryk(r,'bring home',()=>{ S.eq.pack=mk('sled'); quickAction(cur,{key:'stash'}); if(!inPlayer(cur)) throw new Error("double-click didn't move it into an empty hauler pack");
      ensureCos(); const c0=S.cash, k0=S.cos.caches, n=cur.n; quickAction(cur,locate(cur)); if(locate(cur)) throw new Error('still lying in the stash after the hideout refreshed');
      if(d.type==='cash'&&S.cash!==c0+n) throw new Error(`balance went ${c0} → ${S.cash}, expected +${n}`); if(d.type==='cache'&&S.cos.caches!==k0+1) throw new Error(`caches went ${k0} → ${S.cos.caches}`); });
    r.notes.push(d.type==='cash'?'banked when it reaches the stash: sell/buy skipped':'opened when it reaches the stash: sell/buy skipped'); return;
  }
  // double-click: equip or pack it, then double-click again to put it back
  tryk(r,'equip / pack',()=>{
    if(d.slot){ S.eq[d.slot]=null; quickAction(cur,{key:'stash'}); if(S.eq[d.slot]!==cur) throw new Error(`double-click didn't equip it to ${d.slot}`); quickAction(cur,{slot:d.slot}); }
    else { S.eq.pack=mk('sled'); quickAction(cur,{key:'stash'}); if(!inPlayer(cur)) throw new Error("double-click didn't move it into an empty hauler pack"); quickAction(cur,locate(cur)); }
    const l=locate(cur); if(!l||l.key!=='stash') throw new Error('double-click again did not put it back in the stash');
  });
  // sell
  tryk(r,'sell',()=>{ const l=locate(cur); if(!l) throw new Error('lost before selling'); const p=sellPrice(cur), c0=S.cash; sellItem(cur,l); if(locate(cur)) throw new Error('still in the stash after selling'); if(S.cash!==c0+p) throw new Error(`cash went ${c0} → ${S.cash}, expected +${p}`); });
  // buy
  const sold=CATALOG.some(([,ids])=>ids.includes(d.id));
  if(sold) tryk(r,'buy',()=>{ S.stash.items=[]; const p=buyPrice(d.id), c0=S.cash; if(!fin(p)||p<=0) throw new Error(`bad buy price ${p}`); buy(d.id); if(!S.stash.items.some(x=>x.id===d.id)) throw new Error('not in the stash after buying'); if(S.cash!==c0-p) throw new Error(`cash went ${c0} → ${S.cash}, expected −${p}`); });
  else if(d.tier&&d.tier<9) r.notes.push('has a trader tier but is not in the trader catalog');
  // weapons with every attachment that fits
  if(d.type==='weapon'){
    const w=mk(d.id);
    const ws=tryk(r,'wstats',()=>wstats(w)); if(ws) ck(r,['magSize','spread','recoil','zoom','noise','ads'].every(k=>fin(ws[k])),'wstats has a non-number');
    tryk(r,'3D model',()=>{ const g=buildGun(d.id,w); if(!g||!g.isObject3D) throw new Error('buildGun returned nothing'); });
    for(const a of fitsWeapons(d.id)){
      const ar=r; w.att[a.aslot]=mk(a.id);
      const s2=tryk(ar,`with ${a.id}`,()=>wstats(w));
      if(s2&&a.magMul) ck(ar,s2.magSize===Math.round(d.magSize*a.magMul),`${a.id}: magazine ${s2.magSize}, expected ${Math.round(d.magSize*a.magMul)}`);
      if(s2&&a.aslot==='optic') ck(ar,s2.reticle===a.reticle&&reticleOk(s2.reticle),`${a.id}: reticle ${s2.reticle}`);
      tryk(ar,`model with ${a.id}`,()=>{ const g=buildGun(d.id,w); if(!g) throw new Error('no model'); });
      tryk(ar,`fixMag with ${a.id}`,()=>{ w.mag=wstats(w).magSize; w.att[a.aslot]=null; fixMag(w); if(w.mag!==wstats(w).magSize) throw new Error('magazine not trimmed after removing it'); w.mag=0; });
      w.att[a.aslot]=null;
    }
  }
  // containers
  if(CONT_TYPES.includes(d.type)&&d.grid){
    const c=mk(d.id); const co=contOf(c);
    ck(r,co.w===d.grid[0]&&co.h===d.grid[1],'container size differs from its grid');
    ck(r,place(co,mk('bandage')),'a bandage does not fit inside');
    if(d.type==='pouch') ck(r,!place(contOf(mk(d.id)),mk('cache')),'a sealed cache fits in the secure pouch (it must not)');
  }
}

/* ---------- raid ---------- */
async function startTestRaid(opts){
  freshSave(); S.eq.rig=mk('chestrig'); S.eq.pack=mk('sled'); S.eq.primary=null; S.eq.secondary=null;
  startRaid('kolvik');
  for(let i=0;i<200&&!(R&&P);i++) await sleep(50);
  if(!R||!P) throw new Error('the test raid did not start');
  R.paused=true; $('#brief').hidden=true; DBG.god=true;
  if(opts.noRender&&typeof renderer==='object'&&renderer) renderer.render=()=>{}; // headless runs: software WebGL is slow and nobody is watching
}
// enough rounds in the pack for two full magazines
function giveAmmo(id,w){ const need=wstats(w).magSize*2+5, st=ITEMS[id].stack; for(let n=0;n<need;n+=st) place(contOf(S.eq.pack),mk(id)); }
function resetP(){ P.hp={...MAXHP}; P.bleed={}; P.frac={}; P.temp=100; P.using=null; P.reloadT=0; P.cool=0; P.semiLock=false; P.trigger=false; P.dead=false; P.down=null; }
function loop(sec){ const n=Math.ceil(sec/0.05); for(let i=0;i<n;i++) updatePlayer(0.05); }

function testRaid(r,d,res){
  resetP(); clearPlayer(); if(R.invOpen) closeInv(true);
  if(d.fixed){ r.notes.push('fixed slot item: raid pickup skipped'); }
  else {
    // pick it up from a container like loot, and show it in the raid inventory
    tryk(r,'loot pickup',()=>{ const it=mkLoot(d.id); const box={cont:{w:7,h:8,items:[it]},opened:true,type:'test'}; openInv(box); quickAction(it,{key:'loot'}); if(!inPlayer(it)) throw new Error('could not take it from a container into an empty hauler pack'); renderRaidInv(); closeInv(true); });
    clearPlayer();
  }
  if(d.type==='weapon') raidWeapon(r,d,res);
  if(d.type==='med'||d.type==='warm') raidMed(r,d);
  if(d.type==='helmet'||d.type==='armor') raidArmor(r,d);
  if((d.type==='rig'||d.type==='pack')){ tryk(r,'wear it',()=>{ const keep=S.eq[d.slot]; const c=mk(d.id); S.eq[d.slot]=c; if(!playerConts().some(x=>x.own===d.id)) throw new Error('not counted as a container you carry'); const b=mk('bandage'); if(!addToPlayer(b)) throw new Error('nothing fits in it'); S.eq[d.slot]=keep; }); }
  if(d.type==='key'&&LOCKS[d.room]&&LOCKS[d.room].map===R.map) tryk(r,'open its door',()=>{ const door=R.doors.find(x=>x.id===d.room); if(!door) throw new Error('its room was not built on '+R.map);
    door.open=false; if(!R.cols.includes(door.col)) R.cols.push(door.col); const k=mk(d.id); place(contOf(S.eq.pack),k); P.pos.x=door.x+door.ox*1.5; P.pos.z=door.z+door.oz*1.5; P.yaw=Math.atan2(door.ox,door.oz);
    if(lockNear()!==door) throw new Error('standing at the door, it is not the door you would open'); doorUse(door); for(let i=0;i<40&&!door.open;i++) doorsTick(0.05);
    if(!door.open) throw new Error('the key did not open it'); if(k.uses!==d.uses-1) throw new Error(`uses went ${d.uses} → ${k.uses}`); if(R.cols.includes(door.col)) throw new Error('the open door still blocks the way'); });
  if(d.type==='pick') tryk(r,'pick a lock',()=>{ const door=R.doors[0]; if(!door) throw new Error('no locked door on the test map'); door.open=false; const pk=mk(d.id); place(contOf(S.eq.pack),pk); P.pos.x=door.x+door.ox*1.5; P.pos.z=door.z+door.oz*1.5; P.yaw=Math.atan2(door.ox,door.oz);
    const keep=rand; rand=()=>0; try{ doorUse(door); for(let i=0;i<200&&!door.open;i++) doorsTick(0.05); } finally{ rand=keep; } if(!door.open) throw new Error('the lockpick did not open it'); if(pk.uses!==d.uses-1) throw new Error(`picks went ${d.uses} → ${pk.uses}`); });
  if(d.type==='pouch'){ tryk(r,'pouch',()=>{ const keep=S.eq.pouch; S.eq.pouch=mk(d.id); S.eq.rig.items=[]; S.eq.pack.items=[]; const keepRig=S.eq.rig, keepPack=S.eq.pack; S.eq.rig=null; S.eq.pack=null; S.eq.pockets.items=[];
    const ca=mk('cache'); const ok=addToPlayer(ca); S.eq.rig=keepRig; S.eq.pack=keepPack; S.eq.pouch=keep; if(ok&&S.eq.pockets.items.indexOf(ca)<0) throw new Error('a sealed cache went into the pouch'); }); }
  clearPlayer(); resetP();
}
function raidWeapon(r,d,res){
  const slot=d.slot, other=slot==='primary'?'secondary':'primary'; S.eq[other]=null;
  const w=mk(d.id,{mag:0}); S.eq[slot]=w; P.slot=slot;
  tryk(r,'viewmodel',()=>syncVM());
  for(const am of CALS[d.cal]||[]){
    clearPlayer(); giveAmmo(am,w); w.mag=0;
    tryk(r,`load ${am}`,()=>{ takeAmmoFrom(playerConts(),w); if(w.ammo!==am) throw new Error(`loaded ${w.ammo} instead`); if(w.mag!==wstats(w).magSize) throw new Error(`magazine has ${w.mag}/${wstats(w).magSize}`); });
    tryk(r,`fire ${am}`,()=>{ const m0=w.mag, n=Math.min(3,m0); for(let i=0;i<n;i++) fire(w); if(w.mag!==m0-n) throw new Error(`magazine went ${m0} → ${w.mag} after ${n} shots`); });
    tryk(r,`reload ${am}`,()=>{ w.mag=1; P.reloadT=0; P.using=null; startReload(); if(!(P.reloadT>0)) throw new Error('reload did not start'); loop(d.reload+0.2); if(P.reloadT>0) throw new Error('reload never finished'); if(w.mag!==wstats(w).magSize) throw new Error(`magazine has ${w.mag}/${wstats(w).magSize} after reloading`); });
  }
  tryk(r,'fire empty',()=>{ w.mag=0; fire(w); P.reloadT=0; P.semiLock=false; });
  for(const a of fitsWeapons(d.id)){
    const ar=res[a.id]; w.att[a.aslot]=mk(a.id); w.mag=Math.min(w.mag||0,wstats(w).magSize);
    for(const rr of [r,ar]) if(rr) tryk(rr,`${a.id} on ${d.id}: viewmodel`,()=>syncVM());
    if(a.aslot==='optic') for(const rr of [r,ar]) if(rr) tryk(rr,`${a.id} on ${d.id}: reticle`,()=>{ const k=wstats(w).reticle; if(!reticleOk(k)) throw new Error(`no reticle "${k}"`); if(RETICLES[k]){ R.ret=null; setReticle(k); if(!$('#reticle').innerHTML) throw new Error('reticle did not draw'); } });
    clearPlayer(); giveAmmo(CALS[d.cal][0],w); w.mag=0;
    for(const rr of [r,ar]) if(rr) tryk(rr,`${a.id} on ${d.id}: load and fire`,()=>{ if(w.mag===0){ takeAmmoFrom(playerConts(),w); if(w.mag!==wstats(w).magSize) throw new Error(`magazine ${w.mag}/${wstats(w).magSize}`); } fire(w); });
    w.att[a.aslot]=null; fixMag(w);
  }
  try{ setReticle(null); }catch(e){}
  S.eq[slot]=null; P.slot='fists'; try{ syncVM(); }catch(e){}
}
function raidMed(r,d){
  const it=mk(d.id); place(contOf(S.eq.pack),it);
  tryk(r,'not needed',()=>{ startUse(it); if(P.using) throw new Error('starts even when you are healthy and warm'); });
  if(d.med==='bandage') P.bleed.lleg=true;
  else if(d.med==='splint') P.frac.lleg=true;
  else if(d.med==='heal'){ P.hp.thorax=20; P.hp.lleg=10; P.bleed.thorax=true; P.bleed.larm=true; }
  else if(d.type==='warm') P.temp=40;
  const hp0=totalHP(), t0=P.temp;
  tryk(r,'use',()=>{ startUse(it); if(!P.using||P.using.it!==it) throw new Error('did not start using it'); loop(d.use+0.2); if(P.using) throw new Error('never finished using it'); });
  if(d.med==='bandage') ck(r,!P.bleed.lleg,'bleed not stopped');
  if(d.med==='splint') ck(r,!P.frac.lleg,'fracture not fixed');
  if(d.med==='heal'){ ck(r,totalHP()>hp0,`HP did not go up (${hp0} → ${totalHP()})`); ck(r,!P.bleed.thorax,'did not stop a bleed'); if(d.id==='fieldkit') ck(r,!Object.keys(P.bleed).length,'did not stop every bleed'); }
  if(d.type==='warm') ck(r,P.temp>=Math.min(100,t0+d.warm)-4,`body heat ${t0.toFixed(0)} → ${P.temp.toFixed(0)}, expected about +${d.warm}`);
  const left=inPlayer(it);
  if(d.med==='heal'&&left) ck(r,it.hp<d.hp,'kit still full after healing');
  else ck(r,!left,'still in your bag after using it');
}
function raidArmor(r,d){
  const keep=S.eq[d.slot]; const g=mk(d.id); S.eq[d.slot]=g; DBG.god=false;
  tryk(r,'shot',()=>{ const part=d.type==='helmet'?'head':'thorax'; const am=ITEMS.a545; const d0=g.dur, hp0=P.hp[part]; playerHit(am.dmg,am.pen,'item test',part); if(!(g.dur<d0)) throw new Error('took no durability damage'); if(!(P.hp[part]<=hp0)) throw new Error('hp went up');
    const took=MAXHP[part]-P.hp[part]; r.notes.push(`a 5.45 PS round did ${took.toFixed(0)} of ${am.dmg} damage, durability ${d0.toFixed(1)} → ${g.dur.toFixed(1)}`); });
  DBG.god=true; S.eq[d.slot]=keep; resetP();
}
function endTestRaid(){ try{ if(R){ R.paused=true; endRaid('mia','Item tests'); } }catch(e){ console.warn('ending the test raid',e); } }

/* ---------- global cross-references ---------- */
function testGlobal(){
  const g={id:'(catalogue)',name:'Loot tables, trader, kits, recipes',type:'global',fails:[],warns:[],notes:[],checks:0};
  const has=(id,where)=>ck(g,!!ITEMS[id],`${where} refers to "${id}", which is not an item`);
  for(const [cat,ids] of CATALOG) for(const id of ids) has(id,`trader "${cat}"`);
  for(const k of KITS) for(const [id] of k.items) has(id,`kit "${k.name}"`);
  for(const rc of RECIPES){ for(const id in rc.in) has(id,`recipe for ${rc.out[0]}`); has(rc.out[0],'recipe output'); }
  for(const [t,ct] of Object.entries(CTYPES)){ for(const [id] of ct.table||[]) has(id,`${t} loot table`); for(const id of ct.always||[]) has(id,`${t} always-loot`); }
  for(const [id] of ELOOT) has(id,'enemy loot'); for(const [id] of JACKPOT) has(id,'jackpot');
  for(const [cal,ids] of Object.entries(CALS)) for(const id of ids){ has(id,`caliber ${cal}`); if(ITEMS[id]) ck(g,ITEMS[id].type==='ammo'&&ITEMS[id].cal===cal,`CALS lists ${id} under ${cal} but it is not ${cal} ammo`); }
  for(const [id,L] of Object.entries(LOCKS)){ has(L.key,`locked room ${id}`); if(ITEMS[L.key]) ck(g,ITEMS[L.key].room===id,`locked room ${id}: its key ${L.key} opens ${ITEMS[L.key].room}`); ck(g,!!MAPS[L.map],`locked room ${id} is on unknown map ${L.map}`); ck(g,!!LOCK_THEMES[L.theme],`locked room ${id} has unknown theme ${L.theme}`); }
  for(const G of GOALS) for(const [,rw] of G.tiers){ for(const [id] of rw.items||[]) has(id,`goal ${G.id} reward`); if(rw.cos) ck(g,!!COSM[rw.cos],`goal ${G.id} rewards unknown cosmetic ${rw.cos}`); }
  for(const k of KITS) tryk(g,`kit price ${k.id}`,()=>{ const p=kitPrice(k); if(!fin(p)) throw new Error('not a number'); });
  return g;
}
function sources(){
  const src=new Set(); const add=id=>src.add(id);
  CATALOG.forEach(([,ids])=>ids.forEach(add)); KITS.forEach(k=>k.items.forEach(([id])=>add(id))); RECIPES.forEach(rc=>add(rc.out[0]));
  Object.values(CTYPES).forEach(ct=>{ (ct.table||[]).forEach(([id])=>add(id)); (ct.always||[]).forEach(add); }); ELOOT.forEach(([id])=>add(id)); JACKPOT.forEach(([id])=>add(id));
  // what enemies and bosses carry and drop
  Object.values(EK).forEach(k=>{ for(const f of ['guns','armor','helm']) (k[f]||[]).forEach(([id])=>add(id)); (k.special||[]).forEach(add); if(k.trophy) add(k.trophy); });
  return src;
}

/* ---------- run ---------- */
async function run(opts={}){
  if(R) throw new Error('Leave the raid first: the tests use the hideout and start their own raid.');
  const t0=performance.now(); const keep=enter(); const res={}; const ids=opts.only?opts.only.filter(id=>ITEMS[id]):Object.keys(ITEMS);
  const progress=opts.progress||(()=>{}); let global=null;
  try{
    const refs=iconRefs(); const src=sources(); const code=[...document.scripts].map(s=>s.textContent).join('\n');
    for(const id of ids){ const d=ITEMS[id], r=res[id]=newResult(d);
      tryk(r,'definition',()=>testDefinition(r,d,id)); testIcon(r,d,refs);
      if(!d.fixed&&!src.has(id)){ const n=(code.match(new RegExp(`['"]${id}['"]`,'g'))||[]).length; if(n>1) r.notes.push('only appears through scripted drops (bosses, events, the Armory)'); else r.warns.push('not in any loot table, the trader, a kit or a recipe: players can never get it'); }
    }
    global=testGlobal();
    let k=0; for(const id of ids){ progress(`hideout ${++k}/${ids.length}`); testHub(res[id],ITEMS[id]); if(k%10===0) await sleep(0); }
    if(opts.raid){
      progress('starting a test raid'); await startTestRaid(opts);
      try{ k=0; for(const id of ids){ progress(`raid ${++k}/${ids.length}`); const r=res[id]; try{ testRaid(r,ITEMS[id],res); }catch(e){ r.fails.push('raid: '+e.message); } await sleep(0); } }
      finally{ endTestRaid(); }
    }
  } finally { leave(keep); }
  const items=Object.values(res);
  const summary={items:items.length,checks:items.reduce((s,r)=>s+r.checks,0)+(global?global.checks:0),failed:items.filter(r=>r.fails.length).length+(global&&global.fails.length?1:0),
    warned:items.filter(r=>!r.fails.length&&r.warns.length).length,passed:items.filter(r=>!r.fails.length).length,raid:!!opts.raid,ms:Math.round(performance.now()-t0)};
  return {summary,items,global:global?[global]:[]};
}
function text(rep){
  const L=[`Item tests${rep.summary.raid?' (hideout + raid)':' (hideout only)'}: ${rep.summary.items} items, ${rep.summary.checks} checks, ${rep.summary.failed} failing, ${rep.summary.warned} with warnings · ${(rep.summary.ms/1000).toFixed(1)} s`];
  for(const r of [...rep.global,...rep.items]){ if(!r.fails.length&&!r.warns.length) continue; L.push(`\n${r.fails.length?'FAIL':'warn'}  ${r.id} (${r.name}, ${r.type})`); for(const m of r.fails) L.push('   ✗ '+m); for(const m of r.warns) L.push('   ! '+m); }
  return L.join('\n');
}
window.KolvikItemTests={run,text};
})();
