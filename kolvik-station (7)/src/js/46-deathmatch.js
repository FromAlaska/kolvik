/* 46-deathmatch: Team deathmatch and Free for all
   Lobby modes next to the normal extraction raid. No AI, no extraction: everyone spawns with the same kit (your own
   gear stays safe at the hideout and nothing you pick up comes home), dies, and respawns 4 seconds later at the spawn
   point furthest from the enemy. First team to 40 kills (TDM) or first player to 20 (FFA) wins, or whoever leads when
   the 10 minutes run out. The server keeps the score (dmscore / dmend in server.js). You're paid $250 a kill, $500
   for playing a full match and $2,000 for winning. Only on the compact maps. */
const DM_INFO={tdm:{name:'Team deathmatch',short:'TDM',limit:40,how:'Two teams. First team to 40 kills wins.'},ffa:{name:'Free for all',short:'FFA',limit:20,how:'Everyone against everyone, squads included. First to 20 kills wins.'}};
const DM_MAPS=['ironfjord','kolvik','whiteout'];
const DM_PAY={kill:250, played:500, win:2000, respawn:4};
// the kit everyone gets: rifle with a red dot, pistol, class-4 helmet and plates, ammo and meds
function dmKit(){ const w=mk('akr'); w.att.optic=mk('reddot'); w.mag=wstats(w).magSize; const p=mk('makar'); p.mag=wstats(p).magSize;
  const rig=mk('chestrig'); for(const it of [mk('a545',{n:60}),mk('a545',{n:60}),mk('a918',{n:50}),mk('ifak'),mk('bandage'),mk('bandage'),mk('splint')]) place(contOf(rig),it);
  const pk=mk('pockets'); place(contOf(pk),mk('bandage'));
  return {primary:w,secondary:p,helmet:mk('bastion'),armor:mk('plate'),rig,pack:null,pockets:pk,pouch:mk('pouch')}; }
// spawn points: the map's own insertion points plus open ground around the map; in TDM each team gets one half
function dmFree(x,z){ for(const b of R.bld) if(x>b.x0-1.5&&x<b.x1+1.5&&z>b.z0-1.5&&z<b.z1+1.5) return false; for(const b of colsNear(x,z)) if(!b.terrain&&x>b.x0-1&&x<b.x1+1&&z>b.z0-1&&z<b.z1+1) return false; return true; }
function dmSpawnPool(sps){ const L=sps.map(s=>({x:s.x,z:s.z,h:s.h})); const B=R.bound*0.85; let n=0;
  for(let i=0;i<400&&n<24;i++){ const x=(Math.random()*2-1)*B, z=(Math.random()*2-1)*B; if(!dmFree(x,z)) continue; L.push({x,z,h:Math.atan2(x,z)}); n++; } return L; }
function dmSide(pool,side){ if(!side) return pool; const s=pool.slice().sort((a,b)=>a.x-b.x); const half=Math.ceil(s.length/2); return side===1?s.slice(0,half):s.slice(s.length-half); }
function dmEnemies(){ const out=[]; for(const id in NET.players){ const q=NET.players[id]; if(!q.st||q.st.dead||isMate(id)) continue; out.push(q.g?q.g.position:q.st); } return out; }
function dmPickSpawn(){ const L=dmSide(R.dmPool,R.mode==='tdm'?(R.side||1):0); const foes=dmEnemies(); let best=L[0], bd=-1;
  for(const s of L){ const d=foes.length?Math.min(...foes.map(f=>Math.hypot(f.x-s.x,f.z-s.z))):Math.random()*100; const sc=d+Math.random()*8; if(sc>bd){ bd=sc; best=s; } } return best; }

// set up a raid as a deathmatch: called from startRaid once the map is built
function dmSetup(mode,sps){ R.mode=mode; R.dm=true; document.body.classList.add('dmmode'); R.sides=mode==='tdm'; R.drain=0;
  for(const e of R.enemies) scene.remove(e.g); R.enemies=[]; R.boss=null; for(const e of R.extracts) e.active=false;
  R.dmPool=dmSpawnPool(sps); R.dmb=R.dmb||{mode,limit:DM_INFO[mode].limit,team:{1:0,2:0},rows:[]}; R.dmKills=0; }
function dmStartSpawn(){ const s=dmPickSpawn(); return {x:s.x,z:s.z,h:s.h}; }
function dmBrief(b){ const I=DM_INFO[R.mode]; const h=b.querySelector('h2'); if(h) h.textContent=I.name; const p=b.querySelector('p.muted'); if(p) p.textContent=`${I.how}${R.mode==='tdm'?` You're on ${SIDE_NAMES[R.side||1]}.`:''} Everyone gets the same kit: a rifle with a red dot, a pistol, plates and meds. Your own gear stays at the hideout and nothing you pick up comes home. You respawn ${DM_PAY.respawn} seconds after dying. $${DM_PAY.kill} a kill, $${DM_PAY.win.toLocaleString()} for the win.`; }

/* ---------------- dying and coming back ---------------- */
function dmDeathTick(dt){
  if(R.deadT>0){ R.deadT-=dt; if(R.deadT<=0){ R.respawnT=DM_PAY.respawn; dmDeathCard(); } return; }
  if(R.paused||R.menu){ R.paused=false; R.menu=false; $('#pause').hidden=true; }
  if(R.dmOver) return; R.respawnT-=dt; const c=$('#dmCount'); if(c) c.textContent=Math.max(1,Math.ceil(R.respawnT));
  try{ recapTick(dt); }catch(e){}
  if(R.respawnT<=0) dmRespawn();
}
function dmDeathCard(){ let K={}; try{ K=killerInfo(); R.recap={K,t:R.t}; }catch(e){ R.recap={K:{},t:R.t}; } if(document.pointerLockElement) document.exitPointerLock();
  const el=$('#deathcard'); el.hidden=false; $('#deathfade').style.opacity=0.3;
  el.innerHTML=`<div class="card"><span class="lbl">${esc(DM_INFO[R.mode].name)}</span><h2 class="bad">Killed</h2><p class="killed">${K.name?`<b>${esc(K.name)}</b>${K.dist!=null?` · ${K.dist} m away`:''}${K.part?` · ${esc(PART_NAME[K.part]||K.part)}`:''}`:esc(R.cause||'')}</p>
    <p class="dmresp">Back in <b id="dmCount">${DM_PAY.respawn}</b></p>${dmBoardHtml(true)}<div class="acts"><button class="btn ghost" id="dmLeave">Leave match</button></div></div>`;
  $('#dmLeave').onclick=()=>{ recapClose(); endRaid('dm'); }; }
function dmRespawn(){ recapClose(); $('#deathfade').style.opacity=0; const s=dmPickSpawn();
  Object.assign(P,{dead:false,down:null,hp:{...MAXHP},bleed:{},frac:{},temp:100,stam:100,hurt:0,vx:0,vz:0,vy:0,reloadT:0,using:null,trigger:false,adsHeld:false,adsT:0,grace:3,sprint:false,crouch:false,sneak:false});
  P.pos.set(s.x,0,s.z); resolve(P.pos,0.4); P.y=groundAt?groundAt(P.pos.x,P.pos.z,30):0; P.yaw=s.h!=null?s.h:Math.atan2(s.x,s.z); P.pitch=0;
  S.eq=dmKit(); P.slot='primary'; vmUid=null; syncVM(); R.hits=[]; R.lastHitBy=null; R.recap=null; R.cause=null; R.deadT=0;
  if(!R.noLock) lockPointer(); msg('Back in. 3 seconds before anyone can hurt you.'); }

/* ---------------- score ---------------- */
function dmBoardRows(){ const b=R&&R.dmb; if(!b) return []; return b.rows.slice().sort((x,y)=>y.kills-x.kills||x.deaths-y.deaths); }
function dmBoardHtml(compact){ const b=R.dmb; if(!b) return ''; const rows=dmBoardRows(); const me=NET.id;
  const tr=r=>`<tr class="${r.id===me?'me':''}${r.here?'':' gone'}"><td>${esc(r.name)}</td><td>${r.kills}</td><td>${r.deaths}</td></tr>`;
  if(b.mode==='tdm') return `<div class="dmboard tdm">${[1,2].map(sd=>`<table><caption><b class="side${sd}">${SIDE_NAMES[sd]}</b> ${b.team[sd]}</caption><tr><th>Player</th><th>K</th><th>D</th></tr>${rows.filter(r=>r.side===sd).map(tr).join('')}</table>`).join('')}</div>`;
  return `<div class="dmboard"><table><tr><th>Player</th><th>K</th><th>D</th></tr>${rows.slice(0,compact?6:99).map(tr).join('')}</table></div>`; }
function dmHud(){ const el=$('#dmhud'); if(!el) return; if(!R||!R.dm){ el.hidden=true; return; } el.hidden=false; const b=R.dmb; const I=DM_INFO[R.mode];
  if(R.mode==='tdm'){ const my=R.side||1, ot=my===1?2:1; el.innerHTML=`<span class="side${my}">${SIDE_NAMES[my]} ${b.team[my]||0}</span><i>:</i><span class="side${ot}">${b.team[ot]||0} ${SIDE_NAMES[ot]}</span><small>first to ${b.limit}</small>`; return; }
  const rows=dmBoardRows(); const i=rows.findIndex(r=>r.id===NET.id); const mine=i>=0?rows[i]:{kills:0}; const lead=rows[0];
  el.innerHTML=`<span>You ${mine.kills}${i>=0?` · ${ordinal(i+1)}`:''}</span>${lead&&lead.id!==NET.id?`<i>·</i><span>${esc(lead.name)} ${lead.kills}</span>`:''}<small>first to ${b.limit}</small>`; }
const ordinal=n=>n+(n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th');
function dmNet(m){ if(!R||!R.dm) return;
  if(m.t==='dmscore'){ R.dmb=m.board; const f=m.feed; if(f){ if(f.kid===NET.id&&f.vid!==NET.id){ R.dmKills++; msg(f.tk?`Team kill: ${f.v} (no point)`:`You killed ${f.v}`); sfxTone(1046,0.06,0.07,'square'); } } dmHud(); if(!$('#deathcard').hidden){ const bd=$('#deathcard .dmboard'); if(bd) bd.outerHTML=dmBoardHtml(true); } return; }
  if(m.t==='dmend'){ R.dmb=m.board; R.dmOver=true; R.dmWinner=m.winner; dmHud(); P.trigger=false; const won=dmWon(); const I=DM_INFO[R.mode];
    if(document.pointerLockElement) document.exitPointerLock(); const el=$('#deathcard'); el.hidden=false;
    el.innerHTML=`<div class="card"><span class="lbl">${esc(I.name)} · match over</span><h2 class="${won?'ok':'bad'}">${dmWinText()}</h2>${dmBoardHtml(false)}<p class="muted" style="margin:0">Back to the hideout in a few seconds.</p><div class="acts"><button class="btn" id="dmLeave">Leave now</button></div></div>`;
    $('#dmLeave').onclick=()=>{ recapClose(); endRaid('dm'); }; won?sfxExtracted():stinger('down'); }
}
function dmWon(){ if(R.dmWinner==null) return false; return R.mode==='tdm'?R.dmWinner===(R.side||1):R.dmWinner===NET.id; }
function dmWinText(){ const w=R.dmWinner; if(R.mode==='tdm') return w?`${SIDE_NAMES[w]} win${w===(R.side||1)?' · your team':''}`:'A draw';
  if(w==null) return 'A draw'; if(w===NET.id) return 'You win'; const r=(R.dmb.rows||[]).find(x=>x.id===w); return `${r?r.name:'Someone'} wins`; }

/* ---------------- the end ---------------- */
// called by endRaid for a deathmatch: your own gear comes back untouched, you're paid for kills and the result
function dmFinish(kind){
  R.over=true; if(document.pointerLockElement) document.exitPointerLock(); if(NET.on) netLeave();
  if(R.realEq) S.eq=R.realEq; S.inRaid=false;
  const b=R.dmb||{rows:[],team:{}}, mode=R.mode, I=DM_INFO[mode], mine=(b.rows||[]).find(r=>r.id===NET.id)||{kills:R.dmKills||0,deaths:0};
  const full=R.dmOver||R.timeLeft<=2, won=R.dmOver&&dmWon(), winTxt=R.dmOver?dmWinText():'You left before the end';
  const pay=mine.kills*DM_PAY.kill+(full?DM_PAY.played:0)+(won?DM_PAY.win:0); S.cash+=pay; S.stats.pvpMatches=(S.stats.pvpMatches||0)+1; if(won) S.stats.pvpWins=(S.stats.pvpWins||0)+1;
  const board=dmBoardHtml(false), time=R.t, mapName=MAPS[R.map].name;
  saveGame(); accFlush(); raidTeardown();
  const r=$('#result'); r.hidden=false;
  r.innerHTML=`<div class="card"><span class="lbl">${esc(I.name)} · ${esc(mapName)} · ${fmtTime(time)}</span><h2 class="${won?'ok':'mia'}">${esc(winTxt)}</h2>
    <p class="muted" style="margin:0">Your own gear was never at risk and is back in your loadout.</p>${board}
    <dl class="stats"><dt>Your kills</dt><dd>${mine.kills}</dd><dt>Deaths</dt><dd>${mine.deaths}</dd><dt>Paid</dt><dd class="cash">+${fmt$(pay)} <span class="muted" style="font-size:12px">${[mine.kills?`${mine.kills} × ${fmt$(DM_PAY.kill)}`:'',full?`${fmt$(DM_PAY.played)} for the full match`:'',won?`${fmt$(DM_PAY.win)} win`:''].filter(Boolean).join(' · ')}</span></dd><dt>Balance</dt><dd class="cash">${fmt$(S.cash)}</dd></dl>
    <div class="acts"><button class="btn" id="backBtn">Back to the hideout</button></div></div>`;
  $('#backBtn').onclick=goHub;
}
