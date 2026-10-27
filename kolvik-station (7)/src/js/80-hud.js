/* 80-hud: HUD, raid inventory, end of raid */
/* ---- HUD ---- */
const FIG={head:[23,0,16,16],thorax:[17,18,28,24],stomach:[17,43,28,16],larm:[4,18,11,38],rarm:[47,18,11,38],lleg:[18,61,12,48],rleg:[32,61,12,48]};
function hpCol(r){ if(r<=0) return '#0b0b0b'; if(r>0.66) return '#5fae86'; if(r>0.33) return '#d6b44c'; return '#c94a3d'; }
function buildHUD(){ const f=$('#fig'); f.innerHTML=''; for(const [p,[x,y,w,h]] of Object.entries(FIG)){ const d=document.createElement('div'); d.dataset.p=p; d.style.cssText=`left:${x}px;top:${y}px;width:${w}px;height:${h}px`; f.appendChild(d); } }
function hitmark(head){ sfxHit(head); const h=$('#hitm'); h.className=head?'head':''; h.style.opacity=1; clearTimeout(hitmark.t); hitmark.t=setTimeout(()=>h.style.opacity=0,110); }
function updHUD(dt){
  updMates(); bossHud(); raceHud(); updHitDirs(dt); if(R.airMap){ airHud(); tvHud(); }
  $('#vign').style.opacity=P.hurt*(OPTS.fx==='full'?0.9:0.4); $('#cold').style.opacity=P.temp<35?(35-P.temp)/35*0.8:0;
  $('#cross').style.display=(P.adsT>0.5||R.invOpen||(R.fly&&R.fly.tv))?'none':'block';
  R.hudT-=dt; if(R.hudT>0) return; R.hudT=0.1;
  if(NET.on||R.chat.length||R.chatOpen){ const show=R.chat.filter(c=>R.chatOpen||R.t-c.t<12).slice(-7); $('#rchat').innerHTML=show.map(chatHudLine).join(''); } else $('#rchat').innerHTML='';
  const hd=((-P.yaw*180/Math.PI)%360+360)%360; const card=['N','NE','E','SE','S','SW','W','NW'][Math.round(hd/45)%8];
  $('#compass').textContent=`${card} ${String(Math.round(hd)).padStart(3,'0')}°`;
  const tm=$('#timer'); tm.textContent=fmtTime(R.timeLeft); tm.classList.toggle('low',R.timeLeft<60);
  $('#exlist').innerHTML=R.extracts.filter(e=>e.active&&!e.evac).map(e=>{ const dx=e.x-P.pos.x, dz=e.z-P.pos.z; const brg=Math.atan2(dx,-dz)*180/Math.PI; const rel=brg-hd; return `<div><span>${esc(e.name)}</span><span>${Math.round(Math.hypot(dx,dz))} m</span><span class="arr" style="transform:rotate(${rel}deg)">▲</span></div>`; }).join('');
  squadHud(hd); eventHud(hd); qVisit(); taskHud();
  $('#log').innerHTML=R.msgs.filter(m=>R.t-m.t<6).map(m=>`<div>${esc(m.text)}</div>`).join('');
  for(const d of $('#fig').children){ const p=d.dataset.p; d.style.background=hpCol(P.hp[p]/MAXHP[p]); d.classList.toggle('bl',!!P.bleed[p]); d.classList.toggle('fr',!!P.frac[p]); }
  const tcol=P.temp>50?'var(--frost)':P.temp>25?'var(--warn)':'var(--bad)';
  $('#vit').innerHTML=`<div class="t"><span>Health</span><span>${Math.ceil(totalHP())}/440</span></div>
    <div><div class="t"><span>Body heat${P.nearHeat?' · heater':P.indoor?' · indoors':''}</span><span>${Math.round(P.temp)}</span></div><div class="bar"><i style="width:${P.temp}%;background:${tcol}"></i></div></div>
    <div><div class="t"><span>Stamina</span><span>${P.sneak?'sneaking':P.crouch?'crouched':''}</span></div><div class="bar"><i style="width:${P.stam}%;background:var(--dim)"></i></div></div>`;
  const w=curW();
  if(w){ const d=ITEMS[w.id], ws=wstats(w); $('#weph').innerHTML=`<div class="wn">${esc(d.name)} · ${esc(ITEMS[w.ammo].short)}${d.auto?(P.auto?' · auto':' · semi'):''}</div><div class="am">${w.mag}<small> / ${ws.magSize}</small></div><div class="wn">Reserve ${CALS[d.cal].reduce((s,a)=>s+ammoCount(a),0)}</div>`; }
  else $('#weph').innerHTML='<div class="wn">Fists · click to punch</div><div class="am">—</div>';
  const c=(!R.invOpen&&!P.dead)?nearestCont():null; R.near=c; const dr=(!R.invOpen&&!P.dead&&!c)?lockNear():null; R.nearDoor=dr;
  const rt=(!R.invOpen&&!R.rev)?reviveTarget():null; const rp=R.airMap?flyPrompt():R.sleds?ridePrompt():'';
  $('#prompt').innerHTML=rp?rp:(rt?`<kbd>F</kbd>Hold to revive ${esc(NET.players[rt].name)}${c?' · ':''}`:'')+(c?`<kbd>E</kbd>${c.mate?'Take their gear':c.drop?'Pick up':c.body?'Search body':c.opened?'Open':'Search'} · ${esc(c.name)}`:dr?doorPrompt(dr):'');
  let center='';
  if(R.exT>0) center=`<div class="big">Extracting ${((R.exNeed||7)-R.exT).toFixed(1)}</div>`;
  else if(R.heli&&R.heli.phase==='in') center=`<div style="color:var(--ok)">Inbound to ${esc((SK_LZ.find(l=>l.x===R.heli.lx)||{}).name||'the landing zone')} · ${Math.max(0,Math.ceil(R.heli.T-R.heli.t))} s · Space jumps out</div>`;
  else if(P.grace>0) center=`<div style="color:var(--ok)">Insertion cover ${P.grace.toFixed(0)}s · nobody has noticed you yet</div>`;
  else if(R.unlock) center=`<div>${R.unlock.mode==='key'?'Unlocking':'Picking the lock'} · ${esc(R.unlock.d.L.name)}</div><div class="bar"><i style="width:${R.unlock.t/R.unlock.T*100}%"></i></div>`;
  else if(P.using) center=`<div>${esc(ITEMS[P.using.it.id].name)}</div><div class="bar"><i style="width:${(1-P.using.t/P.using.total)*100}%"></i></div>`;
  else if(P.reloadT>0&&w) center=`<div>Reloading</div><div class="bar"><i style="width:${(1-P.reloadT/ITEMS[w.id].reload)*100}%"></i></div>`;
  else if(P.temp<20) center=`<div style="color:var(--bad)">Freezing. Get indoors or near a heater.</div>`;
  else if(P.dead&&!R.spec&&!R.recap) center=`<div class="big" style="color:var(--bad)">Dead</div>`;
  if(P.down) center=`<div class="big" style="color:var(--bad)">Down · ${Math.ceil(P.down.t)}</div><div>${P.down.by?`${esc(P.down.by)} is reviving you…`:'Crawl to cover. A squadmate can hold F to revive you.'}</div>`;
  if(R.rev&&NET.players[R.rev.id]) center=`<div>Reviving ${esc(NET.players[R.rev.id].name)}</div><div class="bar"><i style="width:${R.rev.t/REVIVE_TIME*100}%"></i></div>`;
  $('#center').innerHTML=center;
}

/* ---- raid inventory ---- */
function openInv(target){
  if(P.dead||P.down) return;
  if(target&&target.locked&&!R.bossDown){ toast('Sealed. It opens when Jarl Hrafn is dead.'); return; }
  R.invOpen=true; R.lootTarget=target||null; SEL=null; P.trigger=false; P.adsHeld=false; P.keys={};
  if(target&&!target.opened){ target.opened=true; R.revealT=0.6; sfxOpen(); qBump(o=>o.type==='loot'&&(!o.cont||o.cont===target.type)?1:0); goalBump('searched'); }
  if(document.pointerLockElement) document.exitPointerLock();
  $('#rinv').hidden=false; renderRaidInv();
}
function closeInv(silent){ if(!R) return; R.invOpen=false; R.lootTarget=null; cancelDrag(); $('#rinv').hidden=true; SEL=null; if(!silent&&!R.noLock&&!R.over) lockPointer(); }
function renderRaidInv(){
  GRIDS={}; const el=$('#rinv'); const t=R.lootTarget; const hidden=t?t.cont.items.filter(i=>i.hid).length:0;
  el.innerHTML=`<div class="rinv-head"><h2>Inventory</h2><span class="lbl">The raid keeps running while this is open · ${fmtTime(R.timeLeft)} left</span><button class="btn ghost sm" id="invClose">Close · Tab</button></div>
   <div class="rinv-in"><div class="col"><div class="slots" id="rslots"></div><span class="lbl">Carrying ≈ ${fmt$(carriedValue())}</span><div class="discard" data-discard>Drop on the ground</div></div>
   <div class="col" id="rgrids"></div>
   <div class="col" id="rloot">${t?`<span class="lbl">${esc(t.name)}</span>${hidden?`<span class="searching">Searching… ${hidden} left</span>`:''}`:'<span class="lbl">Nothing open</span><p class="muted" style="max-width:30ch;margin:0">Look at a crate, cabinet or body and press E to search it.</p>'}</div>
   <aside class="info" id="rinfo"></aside></div>`;
  renderLoadout($('#rslots'),$('#rgrids'));
  if(t){ const box=document.createElement('div'); box.className='gridbox'; box.appendChild(gridEl('loot',t.cont)); $('#rloot').appendChild(box); }
  $('#invClose').onclick=()=>closeInv();
  renderInfo($('#rinfo'));
}
function revealTick(dt){ const t=R.lootTarget; if(!t) return; const next=t.cont.items.filter(i=>i.hid).sort((a,b)=>a.y-b.y||a.x-b.x)[0]; if(!next) return; R.revealT-=dt; if(R.revealT<=0){ delete next.hid; R.revealT=0.35+ITEMS[next.id].rar*0.18; if(drag) R.dirty=true; else renderRaidInv(); } }

/* ---- end raid ---- */
// endRaid never leaves you stuck: if anything in the bookkeeping fails, the raid is torn down anyway and you get home
function endRaid(kind,detail){ if(!R||R.over) return; try{ endRaidInner(kind,detail); }catch(err){ console.error('endRaid',err); try{ logErr('endRaid: '+err.message,err.stack); }catch(e){} endRaidRescue(kind,detail); } }
function endRaidRescue(kind,detail){
  if(R&&R.dm&&R.realEq){ S.eq=R.realEq; R.gearGone=true; kind='extract'; }
  try{ if(kind!=='extract'&&R&&!R.gearGone){ SLOTS.forEach(k=>S.eq[k]=null); S.eq.pockets.items=[]; } S.inRaid=false; saveGame(); }catch(e){}
  try{ if(NET.on) netLeave(); }catch(e){} try{ raidMusicStop(0.5); dronesStop(); windStop(); }catch(e){} try{ disposeScene(); }catch(e){}
  R=null; P=null; try{ if(document.pointerLockElement) document.exitPointerLock(); }catch(e){}
  for(const id of ['raid','rinv','pause','brief','deathcard','spec','gpsmap','minimap','gpsline','scope','tvhud']){ const el=$('#'+id); if(el) el.hidden=true; }
  $('#deathfade').style.opacity=0; document.body.classList.remove('inraid','spectating','tvmode');
  const r=$('#result'); r.hidden=false; r.innerHTML=`<div class="card"><h2 class="${kind==='extract'?'ok':'bad'}">${kind==='extract'?'Extracted':kind==='kia'?'Killed in action':'Missing in action'}</h2><p class="muted" style="margin:0">${esc(detail||'')}</p><div class="acts"><button class="btn" id="backBtn">Back to the hideout</button></div></div>`;
  $('#backBtn').onclick=goHub;
}
// everything that closes a raid's scene and HUD (normal raids and deathmatches)
function raidTeardown(){
  raidMusicStop(0.5); dronesStop(); windStop(); $('#gpsmap').hidden=true; $('#minimap').hidden=true; $('#gpsline').hidden=true; for(const snd of (R.sounds||[])) rotorStop(snd); for(const id in NET.players) NET.players[id].sledM=null; disposeScene(); R=null; P=null;
  $('#cross').classList.remove('sight'); $('#aimdot').hidden=true; $('#tvhud').hidden=true; $('#cv').classList.remove('thermal'); document.body.classList.remove('tvmode'); camera.layers.set(0); $('#raid').hidden=true; $('#rinv').hidden=true; $('#pause').hidden=true; $('#brief').hidden=true; $('#deathfade').style.opacity=0; $('#spec').hidden=true; $('#deathcard').hidden=true; $('#deathcard').innerHTML=''; $('#mates').innerHTML=''; $('#hitdirs').innerHTML=''; document.body.classList.remove('spectating'); $('#scope').hidden=true; $('#reticle').hidden=true; $('#prismRing').hidden=true;
  document.body.classList.remove('inraid');
  const dh=$('#dmhud'); if(dh) dh.hidden=true; document.body.classList.remove('dmmode');
}
function endRaidInner(kind,detail){
  if(R.dm) return dmFinish(kind);
  R.over=true; if(document.pointerLockElement) document.exitPointerLock();
  try{ gaRaidEnd(kind); }catch(err){ console.warn('adaptive AI',err); } // score the enemies' behaviour genes (57-ai.js)
  if(NET.on){ if(kind==='extract') nsend({t:'msg',text:`${S.name||'Nomad'} extracted through ${detail}`}); netLeave(); }
  const kills=R.kills, time=R.t, mapName=MAPS[R.map].name, startV=R.startValue;
  let killedBy=''; if(kind==='kia') try{ killedBy=killerLine(R.recap&&R.recap.K&&R.recap.K.name?R.recap.K:killerInfo()); }catch(e){}
  for(const s of [...SLOTS,'pockets','pouch']){ const it=S.eq[s]; if(it&&it.items) for(const x of it.items) delete x.hid; }
  S.stats.raids++; S.stats.kills+=kills; S.career.raids++; S.career.kills+=kills; if(kind==='extract') S.career.extracts++;
  let deposited=0;
  const collectCash=()=>{ for(const s of ['pockets','rig','pack','pouch']){ const it=S.eq[s]; if(!it) continue; it.items=it.items.filter(x=>{ if(x.id==='cash'){ deposited+=x.n; return false; } return true; }); } };
  let value=0, cacheIn=0, cacheBonus=[]; ensureCos();
  if(kind==='extract'){ S.stats.extracts++; value=carriedValue(); collectCash();
    for(const s of ['pockets','rig','pack','pouch']){ const it=S.eq[s]; if(!it) continue; it.items=it.items.filter(x=>{ if(x.id==='cache'){ cacheIn++; return false; } return true; }); }
    if(S.cos.dayEx!==dayKey()){ S.cos.dayEx=dayKey(); cacheBonus.push('first extraction today'); }
    if(S.career.extracts%10===0) cacheBonus.push(`extraction #${S.career.extracts}`);
    S.cos.caches+=cacheIn+cacheBonus.length; }
  const bossRw=kind==='extract'?R.bossReward:null; if(bossRw){ S.cash+=bossRw.cash; S.cos.caches+=bossRw.caches; }
  if(kind!=='extract'){ if(kind==='kia') S.stats.deaths++; SLOTS.forEach(k=>S.eq[k]=null); S.eq.pockets.items=[]; collectCash(); R.gearGone=true; }
  S.cash+=deposited; const gained=kind==='extract'?carriedValue()+deposited-R.startValue:deposited-R.startValue;
  if(kind==='extract') S.stats.best=Math.max(S.stats.best||0,gained);
  if(kind==='extract'){ const haul=value+deposited; qBump(o=>o.type==='extract'&&(!o.map||o.map===R.map)&&(!o.noFire||!R.fired)&&(!o.weather||o.weather===R.cond.weather)&&(!o.minHaul||haul>=o.minHaul)?1:0); }
  const fresh=kind==='extract'?goalExtract(value+deposited):[];
  const qlog=R.qlog||[];
  S.inRaid=false; saveGame(); accFlush();
  raidTeardown();
  const title=kind==='extract'?['ok','Extracted']:kind==='kia'?['bad','Killed in action']:['mia','Missing in action'];
  const sub=kind==='extract'?`Out through ${detail}.`:kind==='kia'?`${detail}.`:(detail||'The raid timer ran out.')+'.';
  const r=$('#result'); r.hidden=false;
  r.innerHTML=`<div class="card"><span class="lbl">${mapName} · ${fmtTime(time)} in raid</span><h2 class="${title[0]}">${title[1]}</h2><p class="muted" style="margin:0">${esc(sub)} ${kind==='extract'?'Everything you carried is yours. Sell what you don\'t need.':'Your gear is gone. The secure pouch made it back.'}</p>
   ${killedBy?`<p class="killedby"><span class="lbl">Killed by</span> ${esc(killedBy)}</p>`:''}
   <dl class="stats"><dt>Kills</dt><dd>${kills}</dd><dt>Cash deposited</dt><dd class="cash">${fmt$(deposited)}</dd><dt>${kind==='extract'?'Gear brought home':'Gear lost'}</dt><dd>${fmt$(kind==='extract'?value:startV)}</dd><dt>Net change</dt><dd class="cash" style="color:${gained>=0?'var(--cash)':'var(--bad)'}">${gained>=0?'+':'−'}${fmt$(Math.abs(gained))}</dd><dt>Balance</dt><dd class="cash" id="resBal">${fmt$(S.cash)}</dd>${bossRw?`<dt>Jarl's bounty</dt><dd class="cash">+${fmt$(bossRw.cash)} <span class="muted" style="font-size:12px">and ${bossRw.caches} sealed caches</span></dd>`:''}${cacheIn+cacheBonus.length?`<dt>Sealed caches</dt><dd style="color:var(--warn)">+${cacheIn+cacheBonus.length} <span class="muted" style="font-size:12px">${[cacheIn?`${cacheIn} carried out`:'',...cacheBonus].filter(Boolean).join(' · ')}</span></dd>`:''}</dl>${qlog.length?`<div class="qlog"><span class="lbl">Task progress</span>${qlog.map(l=>`<div>${esc(l)}</div>`).join('')}</div>`:''}<div class="haulbox" id="haulBox" hidden></div>
   ${fresh.length?`<p class="muted newcoll"><span class="lbl">New in your collection</span> ${fresh.map(id=>esc(ITEMS[id].name)).join(' · ')}</p>`:''}
   <div class="acts"><button class="btn" id="backBtn">Back to the hideout</button></div></div>`;
  renderHaul($('#haulBox')); stinger(kind==='extract'?'extract':'down');
  $('#backBtn').onclick=goHub;
}
// back to the hideout from the results screen; if something in the hideout fails to draw, still show it
function goHub(){ $('#result').hidden=true; $('#raid').hidden=true; $('#hub').hidden=false; document.body.classList.remove('inraid','spectating','tvmode');
  try{ setTab(NET.lobby?'deploy':'gear'); }catch(e){ console.error(e); try{ logErr('goHub: '+e.message,e.stack); }catch(e2){} try{ setTab('gear'); }catch(e3){} }
  try{ renderInvites(); applySeason(); if(S.music) musicStart(); }catch(e){ console.error(e); } }
// never leave a blank screen: no raid running and nothing showing (or an empty results screen) for two seconds brings the hideout back
let blankN=0; setInterval(()=>{ if(window.KOLVIK_WORKSHOP||!S) return; const res=$('#result');
  const blank=!R&&$('#hub').hidden&&(res.hidden||!res.children.length)&&!document.querySelector('#mg:not([hidden]), #trade:not([hidden])');
  const stuck=R&&R.over; // a raid that was ended but never torn down (frozen or black)
  blankN=blank||stuck?blankN+1:0; if(blankN>=2){ blankN=0; try{ logErr(stuck?'raid stuck after ending: forced back to the hideout':'blank screen: brought the hideout back',''); }catch(e){}
    if(stuck){ try{ disposeScene(); }catch(e){} R=null; P=null; $('#raid').hidden=true; $('#deathcard').hidden=true; if(document.pointerLockElement) document.exitPointerLock(); } goHub(); } },1000);
function disposeScene(){ if(!scene) return; const keep=new Set(Object.values(MATS)); scene.traverse(o=>{ if(o.geometry&&o.geometry!==FXGEO) o.geometry.dispose(); if(o.material) for(const m of [].concat(o.material)) if(!keep.has(m)) m.dispose(); }); scene=null; }
