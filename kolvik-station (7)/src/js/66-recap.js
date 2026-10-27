/* 66-recap: what happened when you died
   Dying no longer drops you straight onto the results screen. The camera turns to whoever killed you (marked with a
   red ring), and a card says who it was, with what, from how far and where it hit, lists the last hits you took, and
   shows what your secure pouch kept. You leave when you're ready: Continue (the results), or watch a squadmate if one
   is still up. The secure pouch is also saved as you go, so what's in it survives even if the page closes mid-raid. */
function recordHit(src,part,dmg,from,through){ if(!R) return; const L=R.hits||(R.hits=[]); L.push({t:R.t,src,part,dmg:Math.round(dmg),from:from?{x:from.x,z:from.z}:null,blocked:!through,gun:R.hitGun||(R.lastShooter&&R.lastShooter.gun?R.lastShooter.gun.id:null)}); if(L.length>12) L.shift(); }
function killerInfo(){
  const last=(R.hits||[]).slice().reverse().find(h=>!h.blocked)||(R.hits||[])[R.hits?R.hits.length-1:0];
  const e=R.lastShooter&&!R.lastShooter.dead&&last&&R.t-last.t<3&&last.src===R.lastShooter.k.name?R.lastShooter:null;
  const pl=R.lastHitBy&&R.t-R.lastHitT<15&&NET.players[R.lastHitBy]?NET.players[R.lastHitBy]:null;
  const from=e?{x:e.pos.x,z:e.pos.z}:pl&&pl.g?{x:pl.g.position.x,z:pl.g.position.z}:last&&last.from;
  return {name:pl?pl.name:last?last.src:null, gun:e?ITEMS[e.gun.id].name:last&&last.gun&&!pl?ITEMS[last.gun].name:null, ammo:e?ITEMS[e.gun.ammo].short:null, part:last?last.part:null, from, dist:from?Math.round(Math.hypot(from.x-P.pos.x,from.z-P.pos.z)):null, enemy:e};
}
const BEARING=['north','north-west','west','south-west','south','south-east','east','north-east'];
function bearingWord(dx,dz){ const a=Math.atan2(-dx,-dz); return BEARING[((Math.round(a/(Math.PI/4))%8)+8)%8]; }
function showRecap(){
  if(R.recap) return; const K=killerInfo(); R.recap={K,t:R.t};
  if(document.pointerLockElement) document.exitPointerLock(); $('#deathfade').style.opacity=0.35;
  // a ring where they were
  if(K.from){ const m=new THREE.Mesh(new THREE.RingGeometry(0.9,1.25,24),new THREE.MeshBasicMaterial({color:0xff3a2a,transparent:true,opacity:0.9,depthTest:false,side:THREE.DoubleSide,fog:false})); m.rotation.x=-Math.PI/2; m.renderOrder=20; m.position.set(K.from.x,(R.terrain?R.terrain(K.from.x,K.from.z):0)+0.1,K.from.z); scene.add(m); R.recap.ring=m; }
  const pouch=(S.eq.pouch&&S.eq.pouch.items||[]).map(it=>ITEMS[it.id].name);
  const hits=(R.hits||[]).slice(-5).reverse();
  const mates=NET.on?specList().length:0;
  const el=$('#deathcard'); el.hidden=false;
  el.innerHTML=`<div class="card"><span class="lbl">${esc(MAPS[R.map].name)} · ${fmtTime(R.t)} in raid</span><h2 class="bad">Killed in action</h2>
    <p class="killed">${K.name?`<b>${esc(K.name)}</b>`:'Unknown'}${K.gun?` · ${esc(K.gun)}${K.ammo?' ('+esc(K.ammo)+')':''}`:''}${K.dist!=null?` · ${K.dist} m ${bearingWord(K.from.x-P.pos.x,K.from.z-P.pos.z)} of you`:''}${K.part?` · hit in the ${esc(PART_NAME[K.part]||K.part)}`:''}</p>
    <p class="muted" style="margin:0">${esc(R.cause||'')}.${K.from?' The red ring is where they were.':''}</p>
    ${hits.length?`<dl class="stats hitlog">${hits.map(h=>`<dt>${(R.t-h.t)<1?'just now':Math.round(R.t-h.t)+' s ago'}</dt><dd>${esc(h.src)} · ${esc(PART_NAME[h.part]||h.part)} · ${h.blocked?`stopped by armor (${h.dmg})`:`${h.dmg} damage`}</dd>`).join('')}</dl>`:''}
    <p class="pouchkept"><span class="lbl">Secure pouch kept</span> ${pouch.length?pouch.map(esc).join(' · '):'nothing (it was empty)'}</p>
    <div class="acts">${mates?`<button class="btn ghost" id="rcSpec">Watch a squadmate</button>`:''}<button class="btn" id="rcGo">Exit to main menu</button></div></div>`;
  recapButtons();
}
function recapButtons(){
  $('#rcGo').onclick=recapExit;
  if($('#rcSpec')) $('#rcSpec').onclick=()=>{ recapClose(); let ok=false; try{ ok=startSpectate(); }catch(e){ console.warn(e); } if(!ok) recapExit(); };
}
function recapExit(){ const cause=R?R.cause:''; recapClose(); endRaid('kia',cause); }
// if building the full card fails for any reason, still give a way out
function recapFallback(err){ console.error('death recap',err); try{ logErr('death recap: '+err.message,err.stack); }catch(e){} if(!R.recap) R.recap={K:{},t:R.t};
  const el=$('#deathcard'); el.hidden=false; el.innerHTML=`<div class="card"><h2 class="bad">Killed in action</h2><p class="muted" style="margin:0">${esc(R.cause||'')}.</p><div class="acts"><button class="btn" id="rcGo">Exit to main menu</button></div></div>`; $('#rcGo').onclick=recapExit; }
// called from the main loop every frame while you're dead, even with the game paused, so the card always shows up
function deathTick(dt){
  if(R.td) return tdDeathTick(dt);
  if(R.dm) return dmDeathTick(dt);
  if(R.spec) return;
  if(R.deadT>0){ R.deadT-=dt; return; }
  if(R.paused||R.menu){ R.paused=false; R.menu=false; $('#pause').hidden=true; } // died with the pause menu open (online the world doesn't stop)
  if(R.invOpen) try{ closeInv(true); }catch(e){}
  if(!R.recap||$('#deathcard').hidden){ try{ R.recap=null; showRecap(); }catch(e){ recapFallback(e); } return; }
  try{ recapTick(dt); }catch(e){}
}
// one line about who got you, for the results screen
function killerLine(K){ if(!K||!K.name) return ''; return [K.name,K.gun?K.gun+(K.ammo?` (${K.ammo})`:''):null,K.dist!=null?K.dist+' m away':null,K.part?'hit in the '+(PART_NAME[K.part]||K.part):null].filter(Boolean).join(' · '); }
function recapClose(){ const el=$('#deathcard'); el.hidden=true; el.innerHTML=''; if(R&&R.recap&&R.recap.ring&&scene){ scene.remove(R.recap.ring); R.recap.ring=null; } }
// while the card is up: turn the camera toward the killer, slowly
function recapTick(dt){ const rc=R.recap; if(!rc||!rc.K.from) return; const K=rc.K; const e=K.enemy; if(e&&!e.dead){ K.from={x:e.pos.x,z:e.pos.z}; if(rc.ring) rc.ring.position.set(e.pos.x,(R.terrain?R.terrain(e.pos.x,e.pos.z):0)+0.1,e.pos.z); }
  const want=Math.atan2(-(K.from.x-P.pos.x),-(K.from.z-P.pos.z)); P.yaw=lerpA(P.yaw,want,Math.min(1,dt*1.5)); P.pitch+=(-0.05-P.pitch)*Math.min(1,dt*1.5); if(rc.ring) rc.ring.rotation.z+=dt*1.5; }
// keep the secure pouch in the save while you play (the raid-start save has your gear stripped out)
function pouchSaveTick(){ if(!S||!S.eq.pouch||R.over||R.realEq) return; if(R.t<(R.pouchT||0)) return; R.pouchT=R.t+3; const now=JSON.stringify(S.eq.pouch.items); if(now===R.pouchLast) return; R.pouchLast=now;
  raidSave(); }
// the save as it stands mid-raid: everything at risk is left out, so closing the tab counts as losing it
function raidSave(){ if(R&&R.realEq) return saveGame(); try{ const strip=JSON.parse(JSON.stringify(S)); SLOTS.forEach(k=>strip.eq[k]=null); strip.eq.pockets.items=[]; strip.inRaid=true; if(strip.eq.pouch) for(const it of strip.eq.pouch.items) delete it.hid; saveGame(strip); }catch(e){} }
addEventListener('keydown',e=>{ if(R&&R.recap&&!$('#deathcard').hidden&&(e.key==='Enter'||e.key==='Escape')){ e.preventDefault(); e.stopImmediatePropagation(); const b=$('#rcGo'); if(b) b.click(); } },true);
