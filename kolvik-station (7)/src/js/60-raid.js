/* 60-raid: startRaid, pause, death */
/* ---- raid flow ---- */
function startRaid(mapId,launch){
  const bail=()=>{ if(launch){ wsend({t:'leaveRaid'}); NET.on=false; } };
  if(R){ bail(); return; }
  if(MG.on) mgAbort(true); // a lobby launching pulls you out of a rec-room game
  if(TRADE.on){ wsend({t:'trcancel'}); TRADE.on=false; tradeRestore(); saveGame(); tradeUI(); }
  if(!initGL()){ toast('WebGL is not available in this browser.'); bail(); return; }
  const map=MAPS[mapId]; if(map.pvp&&!launch){ toast(`${map.name} is PvP only. Host a lobby to play it.`); return; }
  if(map.fee&&S.cash<map.fee){ toast(`You need ${fmt$(map.fee)} to go down.`); bail(); return; }
  if(!launch&&NET.lobby) wsend({t:'lleave'});
  ensureAudio(); musicStop(1.2);
  $('#result').hidden=true; $('#accModal').hidden=true; $('#optModal').hidden=true; cancelDrag(); $('#invites').innerHTML='';
  const welcome=launch||null;
  if(welcome){ NET.on=true; NET.id=welcome.id; NET.host=welcome.hostId===NET.id; NET.players={}; for(const q of welcome.players) if(q.id!==NET.id) NET.players[q.id]={name:q.name,st:null,g:null,squad:q.squad||null,side:q.side||0}; }
  if(map.fee){ S.cash-=map.fee; }
  S.lastKit=[]; for(const sl of SLOTS){ const it=S.eq[sl]; if(!it) continue; S.lastKit.push([it.id,1]); if(it.att) for(const k in it.att) if(it.att[k]) S.lastKit.push([it.att[k].id,1]); if(it.items) for(const x of it.items) S.lastKit.push([x.id,x.n||1]); }
  for(const x of S.eq.pockets.items) S.lastKit.push([x.id,x.n||1]);
  const dmMode=welcome&&DM_INFO[welcome.mode]?welcome.mode:null; // deathmatch: your gear stays home, so nothing is stripped (46-deathmatch.js)
  if(dmMode){ saveGame(); accFlush(); } else { const strip=JSON.parse(JSON.stringify(S)); SLOTS.forEach(k=>strip.eq[k]=null); strip.eq.pockets.items=[]; strip.inRaid=true; saveGame(strip); accFlush(); }
  for(const s of [...SLOTS,'pockets','pouch']){ const it=S.eq[s]; if(it&&it.items) for(const x of it.items) delete x.hid; }
  scene=new THREE.Scene(); if(camera.far!==420){ camera.far=420; camera.updateProjectionMatrix(); }
  R={map:mapId,cols:[],ray:[],targets:[],indoor:[],bld:[],heaters:[],conts:[],enemies:[],extracts:[],fx:[],tr:[],aur:[],t:0,timeLeft:map.time,kills:0,invOpen:false,over:false,paused:true,lootTarget:null,msgs:[],startValue:carriedValue(),exT:0,bound:98,drain:0.32,lootMult:1,hudT:0,revealT:0,noLock:false,locked:false,dirty:false,shots:[],bodyN:0,tgts:[],chat:[],chatOpen:false,chatClosedAt:0,lastHitBy:null,lastHitT:0,ret:undefined};
  R.diff=welcome?(DIFF[welcome.diff]?welcome.diff:'normal'):(DIFF[OPTS.diff]?OPTS.diff:'normal'); R.D=DIFF[R.diff];
  if(dmMode){ R.realEq=S.eq; S.eq=dmKit(); R.dmb=welcome.dmb||null; }
  // what you brought in, so the collection log only counts what you find (25-goals.js)
  R.startUids=new Set(); { const w=it=>{ if(!it) return; R.startUids.add(it.uid); (it.items||[]).forEach(w); if(it.att) Object.values(it.att).forEach(w); }; for(const k in S.eq) w(S.eq[k]); }
  R.side=welcome?(welcome.side||0):(map.teams?1:0); R.aiAir=map.air?(welcome?(welcome.air??1):(OPTS.air??1)):0;
  R.cond=(!welcome&&DBG.cond)?forceCond(mapId,DBG.cond):conditions(mapId,welcome&&welcome.cslot!=null?welcome.cslot:condSlot()); R.outage=R.cond.mod==='outage';
  const seed=welcome?welcome.seed:(DBG.seed!=null?DBG.seed:(Math.random()*1e9)|0); R.seed=seed; const slot=welcome?welcome.slot:Math.floor(Math.random()*4);
  R.world=welcome&&welcome.world?welcome.world:WORLD; applyWorld(R.world);
  BUILD={n:0}; rand=mulberry32(seed);
  const sps = mapId==='kolvik'?buildKolvik():mapId==='whiteout'?buildWhiteout():mapId==='skarsvik'?buildSkarsvik():mapId==='ironfjord'?buildIronfjord():mapId==='ravnskar'?buildRavnskar():mapId==='hrimfell'?buildHrimfell():mapId==='storvidda'?buildStorvidda():mapId==='kaldfjord'?buildKaldfjord():mapId==='skerries'?buildSkerries():buildVault();
  addLockedRooms(mapId); applyMods(sps); diffExtras();
  rand=Math.random; BUILD=null;
  if(dmMode) dmSetup(dmMode,sps);
  let sps2=sps; if(map.teams){ const mine=sps.filter(q=>q.side===(R.side||1)); if(mine.length) sps2=mine; }
  const sp0=dmMode?dmStartSpawn():sps2[slot%sps2.length]; const mi=welcome&&welcome.mate||0; const sp={x:sp0.x+(mi?((mi%2)?1:-1)*Math.ceil(mi/2)*(map.heli?11:map.sleds?3.4:1.8):0),z:sp0.z,h:sp0.h}; { const v=new THREE.Vector3(sp.x,0,sp.z); resolve(v,0.4); sp.x=v.x; sp.z=v.z; }
  R.extracts.filter(e=>e.active).forEach(beacon);
  flash=new THREE.PointLight(0xffc070,0,14); scene.add(flash);
  snow=makeSnow(Math.round((mapId==='whiteout'?1800:mapId==='vault'?0:1100)*R.cond.W.snow),(mapId==='whiteout'?3.2:1.6)*(R.cond.weather==='blizzard'||R.cond.weather==='windstorm'?1.8:R.cond.weather==='sleet'?2.4:1));
  R.targets=R.ray.concat(...R.enemies.map(e=>e.parts));
  spawnCover(sps); applyWeather(); setupCulling(); if(R.enemies.length) buildNav(); if((!welcome||welcome.hostId===welcome.id)&&!dmMode) spawnDrones(mapId);
  P={pos:new THREE.Vector3(sp.x,0,sp.z),yaw:Math.atan2(sp.x,sp.z),pitch:0,vx:0,vz:0,eye:1.62,crouch:false,sprint:false,stam:100,hp:{...MAXHP},bleed:{},frac:{},temp:100,adsHeld:false,adsT:0,trigger:false,semiLock:false,cool:0,reloadT:0,reloadType:null,using:null,auto:true,keys:{},bob:0,kick:0,hurt:0,dead:false,slot:S.eq.primary?'primary':S.eq.secondary?'secondary':'fists',fov:72,sneak:false,punchT:0,grace:SPAWN.grace,stepT:0,shiverT:0,y:0,vy:0,down:null,cam:pmCam(),foot:0,bobW:0,landT:0,fat:0,sprB:0};
  if(dmMode) P.grace=3;
  // nobody patrols near where you come in (67-spawn.js)
  if((!welcome||NET.host)&&mapId!=='vault') clearSpawns([sp]);
  if(MAPS[mapId].heli){ R.heli=makeHeliObj(sp.x,sp.z,14,45); R.heli.wait=2.5; R.heli.own=true; P.grace=999; P.yaw=R.heli.yaw; R.fogBase=scene.fog.density; scene.fog.density*=0.4; R.viewDist=320; }
  if(R.sleds) sledStart(sp,true);
  if(welcome){ R.timeLeft=welcome.timeLeft; R.endAt=performance.now()+welcome.timeLeft*1000; netApplyWelcome(welcome); }
  vmUid=null; syncVM();
  camera.position.set(P.pos.x,P.eye,P.pos.z); camera.rotation.set(0,P.yaw,0); camera.fov=72; camera.updateProjectionMatrix(); if(R.heli) heliSeat(); R.hudT=0; updHUD(0.1);
  document.body.classList.add('inraid'); $('#hub').hidden=true; $('#raid').hidden=false; resize();
  const act=R.extracts.filter(e=>e.active).map(e=>e.name).join(' and ');
  const others=welcome?Object.keys(NET.players).length:0;
  const b=$('#brief'); b.hidden=false;
  b.innerHTML=`<div class="card"><span class="lbl">${map.name} · ${R.D.name} · ${fmtTime(R.timeLeft)} left${welcome?` · online · ${others} other${others===1?'':'s'} in this raid`:' · solo'}</span><h2>Extract at ${esc(act)}</h2><div class="condline">${condHtml(R.cond)}</div><p class="muted" style="margin:0">${mapId==='vault'?'The lift is in a corner room. Guards patrol every room but yours.':mapId==='hrimfell'?'You start on a snowmobile at the summit. W throttle, S brake, A and D steer, mouse looks around. Hit a tree, rock or log fast, or fall into a crevasse, and you start again from the top; take the jumps fast enough to clear the crevasses. At the bottom, E gets off. Drivers can only use a sidearm; a squadmate can press E by your sled to ride on the back and shoot.':mapId==='skerries'?`You're on ${R.side===2?'Austholm':'Vestholm'}, the ${R.side===2?'eastern':'western'} island. The aircraft are lined up on the apron: walk up to one and press E. Pilot: W/S throttle, A/D steer on the ground and roll in the air, mouse steers in the air, click fires, G drops bombs, E gets out on the ground, X bails out with a parachute. Extra seats on the Skylark and the Storm are for a passenger or gunners. Loot on the islands in between; extract at your own pier.`:mapId==='kaldfjord'?'You start on a snowmobile at the edge of a 2.2 km map. W throttle, S brake, A and D steer, E gets off and back on. M opens the map and G plans a route to the nearest open extract. Watch the sky: recon drones call in what they see. Three of six extracts are open, all out at the edges.':mapId==='storvidda'?'You start on a snowmobile at the edge of the plateau, facing the relay 500 m away. W throttle, S brake, A and D steer. E gets off and back on; the sled stays where you leave it. Crashing into a tree, a rock or a steep bank throws you off and hurts. Drivers can only use a sidearm; a squadmate can ride on the back with a rifle. Extracts are back out on the edge, so keep your sled close.':mapId==='ravnskar'?'Co-op: everyone in this raid is on your side. Jarl Hrafn sleeps in the keep at the north end of the fort; his hoard opens when he dies. Watch the ground for red circles. Cliff road and Sea stairs are open the whole raid.':mapId==='ironfjord'?'No AI here. Every footstep and every shot is another player. Open extracts show a green beacon.':mapId==='skarsvik'?'A helicopter flies you in to a landing zone on the coast (Space jumps out early). Halfway through, an evac helicopter lands somewhere on the island and waits 100 seconds.':'Open extracts show a green beacon and appear top right with a distance and direction.'} Stand inside one for 7 seconds. ${welcome?'Other players are hostile and their bodies can be looted. Press Enter to chat.':'Stay warm, stay quiet, and don\'t get greedy.'}</p><div class="acts"><button class="btn" id="goBtn">Start raid</button></div></div>`;
  if(dmMode){ dmBrief(b); dmHud(); }
  $('#goBtn').onclick=()=>{ b.hidden=true; R.paused=false; lockPointer(); if(R.heli) msg('Inbound by helicopter. Space jumps out early.'); else if(R.dm) msg('Go. Three seconds before anyone can hurt you.'); else msg(`Deployed. ${SPAWN.grace} seconds of cover: move.`); if(R.cond.modText) msg(R.cond.modText); windStart(); };
}
function lockPointer(){ const cv=$('#cv'); try{ const p=cv.requestPointerLock(); if(p&&p.catch) p.catch(()=>{ R&&(R.noLock=true); }); }catch(e){ if(R) R.noLock=true; } }
document.addEventListener('pointerlockchange',()=>{
  if(!R) return; const locked=document.pointerLockElement===$('#cv');
  if(locked){ R.locked=true; return; }
  if(R.chatOpen||performance.now()-R.chatClosedAt<400){ if(R.chatOpen) closeRaidChat(); return; }
  if(R.locked && !R.invOpen && !(R.gps&&R.gps.open) && !R.over && !R.paused && !R.menu && !P.dead) showPause();
});
document.addEventListener('pointerlockerror',()=>{ if(R){ R.noLock=true; msg('Mouse lock is blocked here. Open the page in its own tab for full mouse look.'); } });
// online the world can't stop for one player: the menu opens but the raid keeps running around you (R.menu, not R.paused)
function showPause(){ if(NET.on) R.menu=true; else R.paused=true; P.trigger=false; P.adsHeld=false; P.keys={}; const p=$('#pause'); p.hidden=false;
  p.innerHTML=`<div class="card"><span class="lbl">${NET.on?'Menu · online, the raid keeps going':'Paused'} · ${fmtTime(R.timeLeft)} left</span><h2>${NET.on?'Stay sharp':'Holding position'}</h2>${NET.on?'<p class="warnline" style="margin:0">Nothing is paused: you are standing still and can still be shot.</p>':''}<canvas id="pmap" width="640" height="400"></canvas><div class="acts"><button class="btn" id="resBtn">Resume</button><button class="btn ghost" id="optBtn2">Settings</button><button class="btn ghost" id="abBtn">Leave raid</button></div><p class="muted" style="margin:0;font-size:13px" id="abNote">${R.dm?'Leaving ends the match for you. Your own gear is safe at home.':'Leaving counts as missing in action. You lose everything you brought except the secure pouch.'}</p></div>`;
  drawRaidMap($('#pmap'));
  $('#optBtn2').onclick=openOpts;
  $('#resBtn').onclick=()=>{ p.hidden=true; R.paused=false; R.menu=false; lockPointer(); };
  $('#abBtn').onclick=e=>{ if(e.target.dataset.sure){ p.hidden=true; endRaid('mia','Left the raid'); } else { e.target.dataset.sure='1'; e.target.textContent='Confirm: leave and lose gear'; } };
}
function drawRaidMap(cv){
  const g=cv.getContext('2d'), W=cv.width, H=cv.height, sc=H/(2*(R.bound+8)), ox=W/2, oy=H/2; const p=(x,z)=>[ox+x*sc,oy+z*sc];
  g.fillStyle='#0e181d'; g.fillRect(0,0,W,H);
  g.fillStyle='#1b2a31'; for(const [x,z,w,d] of (R.decor||[])){ const [a,b]=p(x,z); g.fillRect(a,b,Math.max(1,w*sc),Math.max(1,d*sc)); }
  for(const b of R.bld){ const [x,y]=p(b.x0,b.z0); if(b.outline){ g.strokeStyle='#5b7581'; g.lineWidth=2; g.strokeRect(x,y,(b.x1-b.x0)*sc,(b.z1-b.z0)*sc); g.lineWidth=1; continue; } g.fillStyle=R.hotB&&b.x0===R.hotB.x0&&b.z0===R.hotB.z0?'#6a4a1a':'#2a3d46'; g.fillRect(x,y,Math.max(2,(b.x1-b.x0)*sc),Math.max(2,(b.z1-b.z0)*sc)); }
  g.font='600 12px "JetBrains Mono", monospace';
  if(R.labels){ g.fillStyle='#7f949b'; for(const [n,x,z] of R.labels){ const [a,b]=p(x,z); g.fillText(n.toUpperCase(),a-n.length*3.5,b); } }
  g.font='600 13px "JetBrains Mono", monospace';
  for(const e of R.extracts.filter(e=>e.active)){ const [x,y]=p(e.x,e.z); g.fillStyle='#7cc9a4'; g.beginPath(); g.arc(x,y,5,0,7); g.fill(); g.fillText(e.name,x+8,y+4); }
  if(R.drop&&R.drop.state!=='pending'){ const [x,y]=p(R.drop.x,R.drop.z); g.fillStyle='#e8c55a'; g.fillRect(x-4,y-4,8,8); g.fillText('Supply drop',x+8,y+4); }
  if(R.evac&&(R.evac.state==='called'||R.evac.state==='inbound')){ const [x,y]=p(R.evac.x,R.evac.z); g.fillStyle='#e8c55a'; g.fillText('H evac soon',x-6,y+4); }
  const [px,py]=p(P.pos.x,P.pos.z); g.fillStyle='#ff6b1a'; g.beginPath(); g.arc(px,py,5,0,7); g.fill(); g.strokeStyle='#ff6b1a'; g.beginPath(); g.moveTo(px,py); g.lineTo(px-Math.sin(P.yaw)*16,py-Math.cos(P.yaw)*16); g.stroke();
}
function fmtTime(s){ s=Math.max(0,Math.ceil(s)); return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
function msg(t){ if(!R) return; R.msgs.push({t:R.t,text:t}); if(R.msgs.length>6) R.msgs.shift(); }
function curW(){ return (P&&P.slot!=='fists')? (S.eq[P.slot]||null) : null; }
