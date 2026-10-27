/* 78-holdout: Last Light, a tower defense map
   Defend the relay mast in the middle of the map against ten waves of attackers, solo or with friends (co-op: everyone
   on the same side). The mast has 4,000 HP; attackers shoot it when they can see it (bullets do little to a steel
   mast, so it takes a crowd) and fight you when they see you. Between waves there's a break (45 s before the first,
   30 s after each) to build and resupply:
   - Supply points: you start with 300 and earn 40 a kill and 150 for every wave the mast survives (each player has
     their own). Spend them at the four sentry pads around the mast (a sentry gun for 300 that shoots attackers within
     45 m) and at the mast's base (repairs: 400 HP for 150).
   - The ammo crate at the mast refills your guns and gives you two spare magazines (once every 30 s).
   - Your gear is safe: you play with a copy of your loadout (or a basic rifle kit if you bring no gun), and you're back
     at the mast 10 s after dying, as long as it stands.
   Waves grow with the wave number, the number of players and the difficulty: scavs first, then raiders, then Huskarls,
   and the Warlord on the last wave. Clear wave 10 to win; lose the mast and it's over. Pay: $500 per wave survived
   (more on harder difficulties), $60 a kill, and $5,000 for holding to the end.
   Online, the host runs the attackers, the sentries and the mast; spawns, builds, repairs and the result are sent to
   everyone (tdspawn, tdbuild, tdrepair, tdend, and the mast's state in estate). It can't be joined once it starts. */
const LL={waves:10, hp:4000, mul:0.12, first:45, brk:30, respawn:10, pts0:300, ptsKill:40, ptsWave:150,
  sentry:{cost:300,range:45,rate:0.3,dmg:36,acc:0.5}, repair:{cost:150,hp:400}, ammoCD:30,
  pads:[[-11,-11],[11,-11],[11,11],[-11,11]], crate:[3.2,3.2], lanes:[[0,-62],[62,0],[0,62],[-62,0],[-48,-48],[48,48]]};
function buildHoldout(){
  scene.background=new THREE.Color(0x2a2f3e); scene.fog=new THREE.FogExp2(0x2a2f3e,0.016);
  scene.add(new THREE.HemisphereLight(0xb8c4dc,0x3a4048,0.9)); const sun=new THREE.DirectionalLight(0xffb888,0.4); sun.position.set(-40,20,30); scene.add(sun);
  ground(300); perimeter(70); aurora(); R.bound=68; R.drain=0.22; R.decor=[]; R.noCover=true;
  const steel=MC(0x6a737a), dark=MC(0x2c3034), red=M('metalRed'), conc=M('concrete'), wood=M('wood'), grey=M('metalGrey');
  // the mast: a plinth you can stand on, a lattice to 20 m and a light on top. Bullets pass through the lattice (los:false)
  solid(0,0.5,0,4.4,1,4.4,conc,{ts:2});
  for(const [sx,sz] of [[-1,-1],[1,-1],[1,1],[-1,1]]) solid(sx*1.4,10.5,sz*1.4,0.32,19,0.32,steel,{los:false});
  for(let y=3;y<=18;y+=3){ solid(0,y+1,-1.4,2.8,0.12,0.12,steel,{col:false,los:false}); solid(0,y+1,1.4,2.8,0.12,0.12,steel,{col:false,los:false}); solid(-1.4,y+1,0,0.12,0.12,2.8,steel,{col:false,los:false}); solid(1.4,y+1,0,0.12,0.12,2.8,steel,{col:false,los:false}); }
  solid(0,13,0,3.6,0.3,3.6,dark,{col:false,los:false}); solid(0,21.5,0,0.18,5,0.18,steel,{col:false,los:false});
  const lamp=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.5),MB(0xff3a2a)); lamp.position.set(0,24.2,0); scene.add(lamp); R.tdLamp=lamp;
  for(const [x,z,w,d] of [[-1.6,2.2,0.5,0.6],[1.6,2.2,0.5,0.6]]) solid(x,1.4,z,w,0.8,d,grey,{col:false});
  // the sandbag ring, with four gaps for the roads
  const bag=MC(0x7a6a4a); for(let i=0;i<24;i++){ const a=i/24*Math.PI*2; if(Math.abs(Math.sin(a*2))<0.32) continue; const x=Math.cos(a)*7.2, z=Math.sin(a)*7.2; const m=solid(x,0.5,z,2,1,0.8,bag,{ts:1}); m.rotation.y=-a+Math.PI/2; }
  // ammo crate and sentry pads
  solid(LL.crate[0],0.45,LL.crate[1],1.2,0.9,0.8,MC(0x3e4a34),{ts:1}); const tag=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.12,0.02),MB(0xffc070)); tag.position.set(LL.crate[0],0.75,LL.crate[1]+0.41); scene.add(tag);
  R.tdPadM=[]; for(const [x,z] of LL.pads){ floorPlane(x,z,2.6,2.6,0.03,'road',2,2); const ring=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.06,2.6),MB(0x2a3d46)); ring.position.set(x,0.03,z); scene.add(ring); R.tdPadM.push(ring); }
  // four roads in from the edges, with cover along them
  floorPlane(0,-38,5,52,0.01,'road',2,3); floorPlane(0,38,5,52,0.01,'road',2,3); floorPlane(-38,0,52,5,0.01,'road',2,3); floorPlane(38,0,52,5,0.01,'road',2,3);
  for(const [x,z,ax,m] of [[-7,-28,'z',red],[7,-40,'z',grey],[28,-7,'x',grey],[42,8,'x',red],[-6,30,'z',grey],[8,44,'z',red],[-30,7,'x',red],[-44,-6,'x',grey]]) shipc(x,z,ax,m);
  building(-36,-36,10,8,3.2,{mat:wood,doors:{s:[[5,1.6]],e:[[4,1.6]]},name:'Radio hut'}); container('desk',-38,-38.5,1); container('med',-33.6,-38.6,1); container('locker',-40.4,-34,1);
  building(36,36,10,8,3.2,{mat:wood,doors:{n:[[5,1.6]],w:[[4,1.6]]},name:'Fuel hut'}); container('tool',38,38.5,1); container('crate',34,38.6,1); container('drum',39,33.6);
  building(36,-36,8,8,3.2,{mat:grey,doors:{w:[[4,1.6]],s:[[4,1.6]]},name:'Generator'}); container('tool',37.6,-38.4,1); container('crate',38.2,-34,1);
  building(-36,36,8,8,3.2,{mat:grey,doors:{e:[[4,1.6]],n:[[4,1.6]]},name:'Bunker'}); container('vlocker',-38.4,37.6,1); container('med',-38.4,34,1);
  for(const [x,z,s] of [[-16,-22,1.4],[18,-24,1.2],[22,16,1.6],[-20,20,1.1],[-52,14,1.8],[52,-14,1.5],[12,54,1.3],[-14,-54,1.4],[30,0,0.9],[-30,-2,1.0]]) rock(x,z,s);
  for(let i=0;i<26;i++){ const a=Math.random()*6.28, d=16+Math.random()*48, x=Math.cos(a)*d, z=Math.sin(a)*d; if(Math.abs(x)<4||Math.abs(z)<4||R.bld.some(b=>x>b.x0-3&&x<b.x1+3&&z>b.z0-3&&z<b.z1+3)) continue; drift(x,z,1+Math.random()*2); }
  R.extracts=[]; R.tdTower={x:0,z:0};
  return [{x:-3.6,z:-4.6,h:Math.PI*0.75},{x:3.6,z:-4.6,h:-Math.PI*0.75},{x:3.6,z:4.6,h:-Math.PI*0.25},{x:-3.6,z:4.6,h:Math.PI*0.25}];
}
// a match: called from startRaid once the map is built
function tdSetup(){ R.td={wave:0,state:'break',t:LL.first,hp:LL.hp,max:LL.hp,queue:[],alive:0,pads:[],over:false,spent:0,waveDone:0};
  R.realEq=S.eq; R.tdKit=JSON.parse(JSON.stringify(S.eq)); if(!R.tdKit.primary&&!R.tdKit.secondary){ const k=dmKit(); R.tdKit.primary=k.primary; R.tdKit.secondary=k.secondary; R.tdKit.rig=R.tdKit.rig||k.rig; }
  tdFillAmmo(R.tdKit); S.eq=JSON.parse(JSON.stringify(R.tdKit)); R.ammoT=-99; buildNav(); document.body.classList.add('tdmode'); $('#tdhud').hidden=false; }
// guns full and two spare magazines for each
function tdFillAmmo(eq){ for(const sl of ['primary','secondary']){ const w=eq[sl]; if(!w) continue; const d=ITEMS[w.id]; const am=w.ammo&&ITEMS[w.ammo]&&ITEMS[w.ammo].cal===d.cal?w.ammo:CALS[d.cal][0]; w.ammo=am; w.mag=wstats(w).magSize;
    let need=wstats(w).magSize*2; for(const c of ['rig','pockets','pack'].map(k=>eq[k]).filter(Boolean)) for(const it of c.items||[]) if(it.id===am) need-=it.n;
    while(need>0){ const n=Math.min(need,ITEMS[am].stack); const it=mk(am,{n}); let ok=false; for(const k of ['rig','pockets','pack']){ const c=eq[k]; if(c&&place(contOf(c),it)){ ok=true; break; } } if(!ok) break; need-=n; } } }
const tdPts=()=>R.td?LL.pts0+R.kills*LL.ptsKill+R.td.waveDone*LL.ptsWave-R.td.spent:0;
const tdAuth=()=>!NET.on||NET.host;
// the mast as something attackers can see and shoot at
function tdTarget(){ return R.td&&!R.td.over?{id:'tower',x:0,z:0,eye:3.5,crouch:false,sneak:false,sprint:false,moving:false,vel:0,fresh:1,grace:false,jam:false,ride:false}:null; }
function towerHit(dmg){ if(!R.td||R.td.over) return; R.td.hp-=dmg*LL.mul; R.td.hitT=R.t; if(R.td.hp<=0&&tdAuth()) tdEnd(false); }
function tdRepair(){ if(!R.td||R.td.over) return; if(tdPts()<LL.repair.cost){ msg(`Repairs cost ${LL.repair.cost} supply points.`); return; } if(R.td.hp>=R.td.max-20){ msg('The mast is in one piece.'); return; }
  R.td.spent+=LL.repair.cost; if(tdAuth()) R.td.hp=Math.min(R.td.max,R.td.hp+LL.repair.hp); nsend({t:'tdrepair'}); sfxNoise(0.4,600,0.2); msg(`Mast patched up (+${LL.repair.hp}).`); }
function tdBuild(i){ if(!R.td||R.td.pads[i]) return; if(tdPts()<LL.sentry.cost){ msg(`A sentry costs ${LL.sentry.cost} supply points.`); return; } R.td.spent+=LL.sentry.cost; tdPlaceSentry(i); nsend({t:'tdbuild',i}); msg('Sentry gun up.'); }
function tdPlaceSentry(i){ if(R.td.pads[i]) return; const [x,z]=LL.pads[i]; const g=new THREE.Group(); const legs=MC(0x2c3034), body=MC(0x4a5236);
  for(const a of [0,2.1,4.2]){ const l=new THREE.Mesh(new THREE.BoxGeometry(0.06,1.1,0.06),legs); l.position.set(Math.cos(a)*0.3,0.5,Math.sin(a)*0.3); l.rotation.set(Math.sin(a)*0.25,0,-Math.cos(a)*0.25); g.add(l); }
  const head=new THREE.Group(); head.position.y=1.15; g.add(head); const box=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.3,0.6),body); head.add(box); const brl=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.07,0.6),legs); brl.position.set(0,0.02,-0.55); head.add(brl);
  const eye=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.06,0.02),MB(0xff3a2a)); eye.position.set(0,0.1,-0.31); head.add(eye);
  g.position.set(x,0,z); scene.add(g); R.td.pads[i]={x,z,g,head,cool:0,tgt:null}; sfxNoise(0.3,900,0.15); }
// attackers arrive in groups down the roads, spread over the first part of the wave
function tdStartWave(){ const T=R.td; T.wave++; T.state='wave'; const n=T.wave, pl=1+(NET.on?Object.keys(NET.players).length:0);
  const count=Math.round((4+n*2.3)*(1+0.5*(pl-1))*(R.D.count||1)); const kinds=[]; for(let i=0;i<count;i++){ const r=Math.random(); kinds.push(n<=2?'scav':n<=4?(r<0.6?'scav':'raider'):n<=7?(r<0.25?'scav':r<0.8?'raider':'huskarl'):(r<0.5?'raider':'huskarl')); }
  if(n===LL.waves) kinds.push('warlord');
  const lanes=LL.lanes.slice(0,n<3?4:6); T.queue=kinds.map((k,i)=>{ const L=lanes[i%lanes.length]; return {t:R.t+Math.floor(i/lanes.length)*(n<5?4:3)+Math.random()*1.5,k,x:L[0]+rr(-5,5),z:L[1]+rr(-5,5)}; });
  T.waveIdx0=R.enemies.length; msg(`Wave ${n} of ${LL.waves}: ${count+(n===LL.waves?1:0)} attackers.`); sfxBeep(); setTimeout(sfxBeep,200); }
function tdSpawn(k,x,z,gun){ const n0=R.enemies.length; spawnEnemy(x,z,k); const e=R.enemies[n0]; if(!e) return null; if(gun&&ITEMS[gun]&&ITEMS[gun].type==='weapon'){ e.gun=mk(gun,{mag:ITEMS[gun].magSize,ammo:CALS[ITEMS[gun].cal][0]}); setHeldGun(e.rig,gun); }
  e.home={x:rr(-8,8),z:rr(-8,8)}; e.state='patrol'; e.td=true; return e; }
function tdNet(m){ if(!R||!R.td) return;
  if(m.t==='tdspawn'){ tdSpawn(m.k,+m.x,+m.z,m.g); }
  else if(m.t==='tdbuild'){ tdPlaceSentry(m.i|0); }
  else if(m.t==='tdrepair'){ if(tdAuth()) R.td.hp=Math.min(R.td.max,R.td.hp+LL.repair.hp); }
  else if(m.t==='tdend'){ tdShowEnd(!!m.win,m.wave|0); } }
function tdState(){ const T=R.td; return [Math.round(T.hp),T.wave,T.state==='wave'?1:0,Math.max(0,Math.round(T.t)),T.waveDone]; }
function tdApply(a){ if(!R.td||!a) return; const T=R.td; T.hp=a[0]; if(a[1]>T.wave){ T.wave=a[1]; msg(`Wave ${T.wave} of ${LL.waves}.`); } const was=T.state; T.state=a[2]?'wave':'break'; T.t=a[3]; if(a[4]>T.waveDone){ T.waveDone=a[4]; } if(was==='wave'&&T.state==='break') msg(`Wave cleared. +${LL.ptsWave} supply points.`); }
function tdTick(dt){ const T=R.td; if(!T||T.over) return;
  if(R.tdLamp) R.tdLamp.visible=(R.t%1.2)<0.6;
  if(tdAuth()){
    if(T.state==='break'){ T.t-=dt; if(T.t<=0) tdStartWave(); }
    else { for(const q of T.queue) if(!q.done&&R.t>=q.t){ q.done=true; const e=tdSpawn(q.k,q.x,q.z); if(e&&NET.on) nsend({t:'tdspawn',k:q.k,x:+q.x.toFixed(1),z:+q.z.toFixed(1),g:e.gun.id}); }
      const left=T.queue.some(q=>!q.done)||R.enemies.slice(T.waveIdx0||0).some(e=>!e.dead);
      if(!left){ T.waveDone=T.wave; if(T.wave>=LL.waves) return tdEnd(true); T.state='break'; T.t=LL.brk; msg(`Wave ${T.wave} cleared. +${LL.ptsWave} supply points. Next wave in ${LL.brk} s.`); sfxExtracted(); } }
    // sentries
    for(const s of T.pads){ if(!s) continue; s.cool-=dt; if(s.cool>0) continue; s.cool=LL.sentry.rate; let best=null, bd=LL.sentry.range;
      for(const e of R.enemies){ if(e.dead) continue; const d=Math.hypot(e.pos.x-s.x,e.pos.z-s.z); if(d<bd&&!smokeBlocks(s.x,1.3,s.z,e.pos.x,e.pos.y+1.2,e.pos.z)&&los(s.x,1.3,s.z,e.pos.x,e.pos.y+1.2,e.pos.z)){ bd=d; best=e; } }
      s.tgt=best; if(!best) continue; const hit=Math.random()<LL.sentry.acc*(1-bd/LL.sentry.range*0.5); const ex=best.pos.x+(hit?0:rr(-1,1)), ey=best.pos.y+1.2, ez=best.pos.z+(hit?0:rr(-1,1));
      tracer(s.x,1.3,s.z,ex,ey,ez,0xffcf7a); R.shots.push([s.x,s.z,ex,ey,ez]); sfxShotAt('vintik',Math.hypot(s.x-P.pos.x,s.z-P.pos.z));
      if(hit) hitEnemy(best,'thorax',{dmg:LL.sentry.dmg,pen:30,id:'sentry'},new THREE.Vector3(ex,ey,ez),'sentry'); }
  } else if(T.state==='break') T.t-=dt;
  // sentry heads turn toward their target (everyone works this out for themselves: it's only for looks)
  for(const s of T.pads){ if(!s) continue; let t=s.tgt; if(!tdAuth()){ let bd=LL.sentry.range; t=null; for(const e of R.enemies){ if(e.dead) continue; const d=Math.hypot(e.pos.x-s.x,e.pos.z-s.z); if(d<bd){ bd=d; t=e; } } }
    if(t) s.head.rotation.y=lerpA(s.head.rotation.y,Math.atan2(-(t.pos.x-s.x),-(t.pos.z-s.z)),Math.min(1,dt*8)); }
  tdHud(); }
function tdNear(){ if(!R.td||P.dead||P.down||R.invOpen) return null; const px=P.pos.x, pz=P.pos.z;
  for(let i=0;i<LL.pads.length;i++){ const [x,z]=LL.pads[i]; if(Math.hypot(px-x,pz-z)<2.2) return R.td.pads[i]?null:{k:'pad',i}; }
  if(Math.hypot(px-LL.crate[0],pz-LL.crate[1])<2) return {k:'ammo'}; if(Math.hypot(px,pz)<3.6) return {k:'repair'}; return null; }
function tdUse(n){ if(n.k==='pad') tdBuild(n.i); else if(n.k==='repair') tdRepair();
  else if(n.k==='ammo'){ if(R.t<R.ammoT+LL.ammoCD){ msg(`The crate is restocking: ${Math.ceil(R.ammoT+LL.ammoCD-R.t)} s.`); return; } R.ammoT=R.t; tdFillAmmo(S.eq); sfxPickup(); msg('Guns full, two spare magazines each.'); if(R.invOpen) R.dirty=true; } }
function tdPrompt(n){ return n.k==='pad'?`<kbd>E</kbd>Build a sentry gun · ${LL.sentry.cost} supply`:n.k==='repair'?`<kbd>E</kbd>Repair the mast +${LL.repair.hp} · ${LL.repair.cost} supply`:`<kbd>E</kbd>Ammo: fill your guns and two spare magazines`; }
function tdHud(){ const el=$('#tdhud'); if(!el||!R.td) return; const T=R.td; const alive=R.enemies.filter(e=>!e.dead&&e.td).length; const pct=Math.max(0,T.hp/T.max*100);
  const txt=`<div class="tdl"><b>${T.state==='wave'?`Wave ${T.wave}/${LL.waves}`:T.wave?`Break · wave ${T.wave+1} in ${Math.ceil(Math.max(0,T.t))} s`:`First wave in ${Math.ceil(Math.max(0,T.t))} s`}</b>${T.state==='wave'?`<span>${alive} attackers</span>`:''}<span class="pts">${tdPts()} supply</span></div><div class="tdbar${R.t-(T.hitT||-9)<0.4?' hit':''}"><i style="width:${pct.toFixed(1)}%"></i><span>Mast ${Math.max(0,Math.round(T.hp))} / ${T.max}</span></div>`;
  if(el._t!==txt){ el._t=txt; el.innerHTML=txt; } }
function tdEnd(win){ const T=R.td; if(!T||T.over) return; T.over=true; nsend({t:'tdend',win,wave:T.waveDone}); tdShowEnd(win,T.waveDone); }
function tdShowEnd(win,waves){ const T=R.td; if(!T) return; T.over=true; T.win=win; T.waveDone=Math.max(T.waveDone,waves); if(document.pointerLockElement) document.exitPointerLock();
  const el=$('#deathcard'); el.hidden=false; el.innerHTML=`<div class="card"><span class="lbl">Last Light</span><h2 class="${win?'ok':'bad'}">${win?'The mast holds':'The mast is down'}</h2><p class="muted" style="margin:0">${win?`All ${LL.waves} waves beaten.`:`You held ${T.waveDone} of ${LL.waves} waves.`} Back to the hideout in a few seconds.</p><div class="acts"><button class="btn" id="tdGo">Leave now</button></div></div>`;
  $('#tdGo').onclick=()=>endRaid('td'); win?sfxExtracted():stinger('down'); setTimeout(()=>{ if(R&&R.td&&R.td.over) endRaid('td'); },7000); }
// dying: back at the mast after 10 s while it stands
function tdDeathTick(dt){ if(R.deadT>0){ R.deadT-=dt; if(R.deadT<=0){ R.respawnT=LL.respawn; const el=$('#deathcard'); el.hidden=false; el.innerHTML=`<div class="card"><span class="lbl">Last Light</span><h2 class="bad">Down</h2><p class="muted" style="margin:0">${esc(R.cause||'')}.</p><p class="dmresp">Back at the mast in <b id="dmCount">${LL.respawn}</b></p><div class="acts"><button class="btn ghost" id="tdLeave">Leave the match</button></div></div>`; $('#tdLeave').onclick=()=>endRaid('td'); } return; }
  if(R.paused||R.menu){ R.paused=false; R.menu=false; $('#pause').hidden=true; } if(R.td.over) return; R.respawnT-=dt; const c=$('#dmCount'); if(c) c.textContent=Math.max(1,Math.ceil(R.respawnT));
  if(R.respawnT<=0){ $('#deathcard').hidden=true; $('#deathfade').style.opacity=0; const a=Math.random()*6.28;
    Object.assign(P,{dead:false,down:null,hp:{...MAXHP},bleed:{},frac:{},temp:100,stam:100,hurt:0,vx:0,vz:0,vy:0,reloadT:0,using:null,trigger:false,adsHeld:false,adsT:0,grace:4});
    P.pos.set(Math.cos(a)*4.5,0,Math.sin(a)*4.5); resolve(P.pos,0.4); P.y=groundAt(P.pos.x,P.pos.z,3); S.eq=JSON.parse(JSON.stringify(R.tdKit)); P.slot=S.eq.primary?'primary':S.eq.secondary?'secondary':'fists'; vmUid=null; syncVM(); R.deadT=0; R.cause=null; R.hits=[]; if(!R.noLock) lockPointer(); msg('Back at the mast.'); } }
// the end: your own gear back, paid by waves, kills and the result
function tdFinish(kind){ R.over=true; if(document.pointerLockElement) document.exitPointerLock(); if(NET.on) netLeave(); const T=R.td||{waveDone:0};
  if(R.realEq) S.eq=R.realEq; S.inRaid=false; const cm=(R.D&&R.D.cash)||1; const kills=R.kills; const pay=Math.round((T.waveDone*500*cm+kills*60+(T.win?5000*cm:0))/10)*10; S.cash+=pay; S.stats.holdBest=Math.max(S.stats.holdBest||0,T.waveDone); woHold(T.waveDone);
  const time=R.t, win=!!T.win; saveGame(); accFlush(); raidTeardown(); document.body.classList.remove('tdmode');
  const r=$('#result'); r.hidden=false; r.innerHTML=`<div class="card"><span class="lbl">Last Light · ${fmtTime(time)}</span><h2 class="${win?'ok':'bad'}">${win?'The mast holds':'The mast is down'}</h2><p class="muted" style="margin:0">Your own gear was never at risk and is back in your loadout.</p>
    <dl class="stats"><dt>Waves held</dt><dd>${T.waveDone} / ${LL.waves}</dd><dt>Your kills</dt><dd>${kills}</dd><dt>Paid</dt><dd class="cash">+${fmt$(pay)}</dd><dt>Best ever</dt><dd>${S.stats.holdBest} waves</dd><dt>Balance</dt><dd class="cash">${fmt$(S.cash)}</dd></dl>
    <div class="acts"><button class="btn" id="backBtn">Back to the hideout</button></div></div>`; $('#backBtn').onclick=goHub; }
