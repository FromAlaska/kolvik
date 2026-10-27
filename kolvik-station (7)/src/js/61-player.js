/* 61-player: player movement, shooting, warmth, camera */
/* ---- player ---- */
function playerHit(dmg,pen,src,part,from){
  if(from) hitDir(from.x,from.z,false);
  // inside an aircraft the bullet hits the airframe first (the Skylark passenger sits in the open and is fair game)
  if(R&&R.fly&&!R.fly.hand){ const pl=R.planes[R.fly.i]; if(pl&&!pl.dead){ planeDamage(pl,dmg*0.6,R.lastHitBy&&R.t-R.lastHitT<0.2?R.lastHitBy:null); P.hurt=Math.min(1,P.hurt+0.1); return; } }
  if(P.dead||DBG.god||(R&&R.dm&&(P.grace>0||R.dmOver))) return;
  if(P.down){ recordHit(src,part||'thorax',dmg*(part==='head'?2:1),from,true); P.down.hp-=dmg*(part==='head'?2:1); P.hurt=Math.min(1,P.hurt+0.4); sfxGrunt(0.45,90); if(P.down.hp<=0) reallyDie(`Finished off by ${src}`); return; }
  part=part||wpick([['head',0.08],['thorax',0.27],['stomach',0.2],['larm',0.11],['rarm',0.11],['lleg',0.115],['rleg',0.115]]);
  const gear=part==='head'?S.eq.helmet:(part==='thorax'||part==='stomach')?S.eq.armor:null;
  let d=dmg, through=true;
  if(gear&&gear.dur>0){ const r=armorRes(gear,dmg,pen); d=r.d; through=r.pen; }
  recordHit(src,part,d,from,through);
  dmgPart(part,d,`Shot in the ${PART_NAME[part]} by ${src}`);
  if(through && part!=='head' && rand()<0.28) P.bleed[part]=true;
  if(through && (part==='lleg'||part==='rleg') && rand()<0.18 && !P.frac[part]){ P.frac[part]=true; P.newFrac=true; }
  P.hurt=Math.min(1,P.hurt+(OPTS.fx==='full'?0.5:0.2)); P.shake=OPTS.fx==='full'?0.25:0; if(through) sfxGrunt(0.5,100+rand()*40); else sfxPlink(); if(P.newFrac){ P.newFrac=false; sfxCrack(); }
  if(P.using){ P.using=null; }
}
function dmgPart(part,amt,cause){
  if(P.dead||P.down||DBG.god) return;
  if(P.hp[part]>0){ P.hp[part]-=amt; if(P.hp[part]<=0){ const over=-P.hp[part]; P.hp[part]=0; if(part==='head'||part==='thorax') return die(cause); if(over>0) spread(over*0.7,cause); } }
  else spread(amt*0.7,cause);
}
function spread(amt,cause){ const alive=PARTS.filter(p=>P.hp[p]>0); if(!alive.length) return die(cause); const each=amt/alive.length; for(const p of alive){ P.hp[p]-=each; if(P.hp[p]<=0){ P.hp[p]=0; if(p==='head'||p==='thorax') return die(cause); } } }
function die(cause){ if(P.dead) return; if(!P.down&&!R.dm&&othersUp()) return goDown(cause); reallyDie(cause); }
function reallyDie(cause){ if(P.dead) return; if(P.down){ P.down=null; nsend({t:'dboxgone',cid:'d'+NET.id}); } P.dead=true; R.cause=cause; sfxDeath(); windSet(0); if(R.dm){ nsend({t:'pdied',by:R.lastHitBy&&R.t-R.lastHitT<15?R.lastHitBy:null}); nsend({t:'msg',text:`${S.name||'Nomad'} ${cause.toLowerCase()}`}); } else { { const by=R.lastHitBy&&R.t-R.lastHitT<15?R.lastHitBy:(R.downBy||null); if(NET.on&&by) nsend({t:'pdied',by}); } if(NET.on){ nsend({t:'body',cid:'b'+NET.id+'-'+(R.bodyN++),x:P.pos.x,z:P.pos.z,name:(S.name||'Nomad')+' (player)',items:JSON.parse(JSON.stringify(myBodyItems()))}); nsend({t:'msg',text:`${S.name||'Nomad'} ${cause.toLowerCase()}`}); } } R.deadT=R.dm?0.8:1.6; P.trigger=false; $('#deathfade').style.opacity=0.85; if(R.invOpen) closeInv(true); }
function myBodyItems(){ const out=[]; for(const sl of SLOTS){ const it=S.eq[sl]; if(!it) continue; if(it.items){ for(const x of it.items){ delete x.hid; out.push(x); } it.items=[]; } delete it.hid; out.push(it); } for(const x of S.eq.pockets.items){ delete x.hid; out.push(x); } return out.map(x=>reUid(JSON.parse(JSON.stringify(x)))); }
function totalHP(){ return PARTS.reduce((s,p)=>s+P.hp[p],0); }
function fire(w){
  const d=ITEMS[w.id], ws=wstats(w);
  if(w.mag<=0){ sfxDry(); P.semiLock=true; if(!d.auto) startReload(); return; }
  if(!DBG.ammo) w.mag--; R.fired=true; const am=ITEMS[w.ammo];
  const moving=Math.hypot(P.vx,P.vz)>0.6;
  let spread=ws.spread*(P.adsT>0.6?0.3*ws.ads:1)+(moving?0.012:0)-(P.crouch?0.002:0)+(P.vy!==0?0.03:0);
  if(P.temp<30) spread+=(30-P.temp)/30*0.014; if(P.hp.larm<=0||P.hp.rarm<=0) spread+=0.016;
  spread=Math.max(0.0006,spread);
  camera.updateMatrixWorld();
  for(let i=0;i<(d.pellets||1);i++){
    _dir.set((rand()-0.5)*2*spread,(rand()-0.5)*2*spread,-1).normalize().applyQuaternion(camera.quaternion);
    ray.set(camera.position,_dir); ray.far=260; const hits=ray.intersectObjects(R.targets,false);
    if(i===0) dronesShotAt(camera.position,_dir);
    for(const h of hits){ const ud=h.object.userData; if(ud.drone){ if(ud.drone.dead) continue; droneHit(ud.drone,am,h.point); break; } const e=ud.enemy; if(e&&e.dead) continue; if(ud.player&&NET.players[ud.player]&&NET.players[ud.player].st&&NET.players[ud.player].st.dead) continue;
      if(e) hitEnemy(e,ud.part,am,h.point);
      else if(ud.player){ if(isMate(ud.player)) friendlyFire(ud.player,h.point); else { puff(h.point,0x8a1010,6,1.5); hitmark(ud.part==='head'); nsend({t:'phit',pid:ud.player,part:ud.part,ammo:am.id}); } }
      else puff(h.point,R.map==='whiteout'?0x6b7378:R.map==='vault'?0x3a3f44:0xc9d2d6,3,1.4);
      break; }
  }
  const rec=ws.recoil*(P.adsT>0.6?0.72:1)*(0.85+rand()*0.3); P.pitch=Math.min(1.45,P.pitch+rec); P.yaw+=(rand()-0.5)*ws.recoil*0.6; P.kick=1;
  if(vmGun&&vmGun.userData.flash){ vmGun.userData.flash.visible=ws.noise>=1&&OPTS.flash!=='off'; setTimeout(()=>{ if(vmGun&&vmGun.userData.flash) vmGun.userData.flash.visible=false; },OPTS.flash==='full'?45:25); }
  if(ws.noise>=1) flashAt(camera.position.x,camera.position.y,camera.position.z,true);
  sfxShot(w.id,0,ws.noise); const nr=(w.id==='makar'?40:65)*ws.noise; hearShot(P.pos.x,P.pos.z,nr); if(NET.on&&!NET.host) nsend({t:'shot',x:P.pos.x,z:P.pos.z,r:nr});
}
// fists, or the shiv or spear you carry (47-melee.js): returns how long until the next swing
function punch(){
  const mi=meleeItem(), md=mi?ITEMS[mi.id]:null;
  P.kick=1; P.punchT=1; camera.updateMatrixWorld();
  _dir.set(0,0,-1).applyQuaternion(camera.quaternion); ray.set(camera.position,_dir); ray.far=md?md.reach:2.1;
  const h=ray.intersectObjects(R.targets,false)[0]; if(!h) { sfxNoise(0.08,md?1300:900,0.12); return md?md.rate:0.5; }
  const ud=h.object.userData; const am=md?{dmg:md.dmg,pen:md.pen,id:mi.id}:{dmg:34,pen:6}; sfxNoise(0.1,md?800:500,0.3); let hit=false;
  if(ud.enemy&&!ud.enemy.dead){ hitEnemy(ud.enemy,ud.part,am,h.point); hit=true; }
  else if(ud.player){ if(isMate(ud.player)) friendlyFire(ud.player,h.point); else { puff(h.point,0x8a1010,5,1.2); hitmark(ud.part==='head'); nsend({t:'phit',pid:ud.player,part:ud.part,ammo:md?mi.id:'fist'}); hit=true; } }
  if(hit&&mi) meleeWear(mi);
  hearShot(P.pos.x,P.pos.z,4); return md?md.rate:0.5;
}
function ammoCount(id){ let n=0; for(const c of playerConts()) for(const it of c.items) if(it.id===id) n+=it.n; return n; }
function takeAmmoFrom(conts,w){
  const d=ITEMS[w.id]; let type=w.ammo; const avail=id=>{ let n=0; for(const c of conts) for(const it of c.items) if(it.id===id&&!it.hid) n+=it.n; return n; };
  if(!avail(type)){ const alt=CALS[d.cal].find(a=>avail(a)>0); if(!alt) return 0; if(w.mag>0){ const back=mk(w.ammo,{n:w.mag}); if(!conts.some(c=>place(c,back))){} w.mag=0; } type=alt; w.ammo=type; }
  let need=wstats(w).magSize-w.mag, took=0;
  for(const c of conts){ for(const it of c.items.slice()){ if(need<=0) break; if(it.id!==type||it.hid) continue; const t=Math.min(need,it.n); it.n-=t; need-=t; took+=t; if(it.n<=0) c.items.splice(c.items.indexOf(it),1); } }
  w.mag+=took; return took;
}
function startReload(){
  const w=curW(); if(!w||P.reloadT>0||P.using||P.dead||P.down) return; const d=ITEMS[w.id];
  const any=CALS[d.cal].some(a=>ammoCount(a)>0); if(!any){ msg(`No ${d.cal} rounds on you.`); return; }
  if(w.mag>=wstats(w).magSize) return;
  P.reloadT=d.reload; P.reloadTot=d.reload; P.reloadEmpty=w.mag===0; P.reloadShells=wstats(w).magSize-w.mag; sfxReload();
}
function startUse(it){
  if(!R||P.using||P.dead||P.down) return; const d=ITEMS[it.id];
  const bleeding=PARTS.some(p=>P.bleed[p]), frac=PARTS.some(p=>P.frac[p]), hurt=totalHP()<PARTS.reduce((s,p)=>s+MAXHP[p],0)-1;
  const need = d.med==='bandage'?bleeding : d.med==='splint'?frac : d.med==='heal'?(hurt||bleeding) : d.type==='warm'?P.temp<99:false;
  if(!need){ msg(`${d.name}: not needed right now.`); return; }
  P.using={it,t:d.use,total:d.use}; P.reloadT=0; msg(`Using ${d.name}…`); sfxRustle(Math.round(d.use*4));
}
function finishUse(){
  const it=P.using.it; P.using=null; const d=ITEMS[it.id]; if(!inPlayer(it)) return;
  const rm=()=>{ for(const c of playerConts()){ const i=c.items.indexOf(it); if(i>=0){ c.items.splice(i,1); return; } } };
  const order=['thorax','stomach','head','lleg','rleg','larm','rarm'];
  if(d.med==='bandage'){ const p=order.find(p=>P.bleed[p]); if(p) delete P.bleed[p]; rm(); msg('Bleeding stopped.'); }
  else if(d.med==='splint'){ const p=['lleg','rleg','larm','rarm'].find(p=>P.frac[p]); if(p) delete P.frac[p]; rm(); msg('Fracture splinted.'); }
  else if(d.med==='heal'){
    let pool=it.hp;
    if(it.id==='fieldkit'){ P.bleed={}; for(const p of PARTS) if(P.hp[p]<=0&&pool>=40){ P.hp[p]=10; pool-=40; } }
    else { const p=order.find(p=>P.bleed[p]); if(p) delete P.bleed[p]; }
    for(const p of order){ if(P.hp[p]<=0) continue; const m=Math.min(pool,MAXHP[p]-P.hp[p]); P.hp[p]+=m; pool-=m; }
    it.hp=pool; if(pool<=1) rm(); msg(`Treated · ${Math.round(totalHP())} HP`);
  }
  else if(d.type==='warm'){ P.temp=Math.min(100,P.temp+d.warm); rm(); msg('That hit the spot.'); }
  sfxHealDone();
  if(R.invOpen) renderRaidInv();
}
function hotUse(pred){ for(const c of playerConts()) for(const it of c.items) if(!it.hid && pred(ITEMS[it.id],it)) return startUse(it); msg('You have none on you.'); }
const inIndoor = p => R.indoor.some(b=>p.x>b.x0&&p.x<b.x1&&p.z>b.z0&&p.z<b.z1);

/* ---- how you move ----
   Weight without lag: speed builds and drops at set rates (a sprint takes a moment to wind up, stopping is quicker
   than starting), you can't steer much in the air, and a hard landing dips the camera and slows you for a moment.
   The head bob follows your actual footsteps: a dip as each foot lands (that's when the step sounds), a sway toward
   the standing foot, a slight roll, all bigger when sprinting and smaller crouched or aiming. Strafing leans the
   camera a touch, sudden stops nod it, and when you're out of breath your aim rises and falls with your breathing. */
const PMOVE={
  acc:13, sprintAcc:6.5, stop:18, turn:22, air:2.5, para:4,   // m/s² starting, sprinting up from a walk, stopping, reversing, in the air, under a parachute
  step:{walk:1.25, sprint:1.7, crouch:0.8, sneak:0.75},       // metres per step
  bob:{walk:0.032, sprint:0.05, crouch:0.018, sneak:0.012},   // camera dip per step (m)
  sway:{walk:0.016, sprint:0.028}, roll:{walk:0.005, sprint:0.009},
  lean:0.02, nod:0.0016, land:{dip:0.03, slowAt:7.5},        // strafe lean (rad), nod per m/s², landing dip per m/s of fall, slowed above this fall speed
  sprintFov:4, breath:{at:45, amp:0.006},                     // FOV widening at a full sprint; breathing sway below this stamina
};
function pmCam(){ return {y:0,vy:0,p:0,vp:0,roll:0,lat:0,fw:0,acc:0,br:0,brT:0}; }
function pmAccel(tx,tz,onG,dt){
  const M=PMOVE, cur=Math.hypot(P.vx,P.vz), want=Math.hypot(tx,tz); let a;
  if(P.para) a=M.para; else if(!onG) a=M.air;
  else if(want<cur-0.05) a=(tx*P.vx+tz*P.vz)<0?M.turn:M.stop;
  else if((tx*P.vx+tz*P.vz)<0) a=M.turn;
  else a=cur>3.6?M.sprintAcc:M.acc;
  if(onG&&!P.para) a*=R.slip||1; // sleet and slush: slower to get going and to stop
  let dx=tx-P.vx, dz=tz-P.vz; const m=Math.hypot(dx,dz), lim=a*dt; if(m>lim){ dx*=lim/m; dz*=lim/m; }
  P.vx+=dx; P.vz+=dz; }
function pmLand(v){ const C=P.cam; C.vy-=v*PMOVE.land.dip*8; if(v>PMOVE.land.slowAt) P.landT=0.35; }
function pmSteps(sp,dt){
  const M=PMOVE, onG=P.vy===0&&!P.dead&&!(R.ride||R.fly), going=onG&&sp>0.3;
  P.bobW+=((going?1:0)-P.bobW)*Math.min(1,dt*8);
  if(!going) return;
  const len=P.sprint?M.step.sprint:P.crouch?M.step.crouch:P.sneak?M.step.sneak:M.step.walk;
  const before=Math.floor(P.bob/Math.PI); P.bob+=sp*dt/len*Math.PI;
  if(Math.floor(P.bob/Math.PI)!==before&&sp>0.5){ P.foot^=1; sfxStep(sp,P.indoor,P.sneak,P.foot); } }
function pmCamera(sp,dt){
  const M=PMOVE, C=P.cam, h=Math.min(dt,0.05), ads=P.adsT, w=P.bobW;
  const kind=P.sprint?'sprint':P.crouch?'crouch':P.sneak?'sneak':'walk';
  const A=(M.bob[kind]||M.bob.walk)*(1-ads*0.75)*w, S=(M.sway[kind]||M.sway.walk*0.6)*(1-ads*0.8)*w, Rr=(M.roll[kind]||M.roll.walk*0.6)*(1-ads*0.8)*w;
  const st=Math.sin(P.bob), y=A*(Math.pow(Math.abs(st),0.75)-0.62);
  // landing dip (a spring), nod from speeding up or stopping (a spring), lean into strafes
  C.vy+=(-90*C.y-12*C.vy)*h; C.y+=C.vy*h;
  const sy=Math.sin(P.yaw), cy=Math.cos(P.yaw), fw=-(P.vx*sy+P.vz*cy), lat=P.vx*cy-P.vz*sy;
  C.acc+=((dt>0?(fw-C.fw)/dt:0)-C.acc)*Math.min(1,dt*10); C.fw=fw;
  const nodT=clamp(C.acc*M.nod,-0.02,0.02)*(1-ads*0.7)*(P.vy===0?1:0);
  C.vp+=((nodT-C.p)*120-14*C.vp)*h; C.p+=C.vp*h;
  C.lat+=(clamp(lat/5.9,-1,1)-C.lat)*Math.min(1,dt*6);
  C.roll=-C.lat*M.lean*(1-ads*0.6)+st*Rr;
  // out of breath: slow deep breaths that move your aim, faster and bigger the more tired you are
  const tired=clamp((M.breath.at-P.stam)/M.breath.at,0,1); P.fat+=(tired-P.fat)*Math.min(1,dt*(tired>P.fat?2:0.5));
  const rate=1.5+2.4*P.fat; C.br+=dt*rate; let bp=Math.sin(C.br)*(0.0008+M.breath.amp*P.fat), by=Math.cos(C.br*0.5)*0.0025*P.fat;
  if(P.fat>0.35&&!P.dead){ C.brT-=dt; if(C.brT<=0){ C.brT=Math.PI*2/rate; sfxNoise(0.3,650,0.022*P.fat); } }
  return {y:y+C.y, x:st*S, pitch:C.p+bp, yaw:by, roll:C.roll}; }
function updatePlayer(dt){
  if(R.heli&&R.heli.phase==='in'){ heliSeat(); return; }
  const k=P.keys, can=!R.invOpen&&!P.dead; const down=!!P.down;
  let sp2=0; if(R.ride&&(down||P.dead)) R.ride=null; if(R.fly&&(down||P.dead)){ const pl=R.planes[R.fly.i]; if(pl&&pl.crew[R.fly.seat]==='me') pl.crew[R.fly.seat]=null; R.fly=null; }
  if(R.fly&&!P.dead&&!down){ flyStep(dt,can); sp2=0; } else if(R.ride&&!P.dead&&!down){ rideStep(dt,can); sp2=0; } else {
  let fx=0,fz=0; if(can){ if(k.KeyW) fz-=1; if(k.KeyS) fz+=1; if(k.KeyA) fx-=1; if(k.KeyD) fx+=1; }
  const len=Math.hypot(fx,fz);
  const legs=P.frac.lleg||P.frac.rleg||P.hp.lleg<=0||P.hp.rleg<=0;
  P.sprint=can&&!down&&(k.ShiftLeft||k.ShiftRight)&&fz<0&&!P.crouch&&P.adsT<0.3&&!legs&&P.stam>4&&!P.using&&P.reloadT<=0;
  const onG=P.vy===0;
  let sp=3.5; if(P.sprint) sp=5.9; if(P.crouch) sp=1.9; if(P.sneak&&!P.sprint) sp=Math.min(sp,2.0); if(P.adsT>0.5) sp*=0.6; if(legs) sp*=0.6; if(P.using) sp*=0.5; if(down) sp=0.8; if(P.swim) sp*=0.35; if(P.para) sp=4; if(P.landT>0){ P.landT-=dt; sp*=0.55; }
  P.stam=clamp(P.stam+(P.sprint?-17*(R.windy?1.35:1):11)*dt,0,100);
  let tx=0,tz=0; if(len){ fx/=len; fz/=len; const s=Math.sin(P.yaw), c=Math.cos(P.yaw); tx=(fx*c+fz*s)*sp; tz=(-fx*s+fz*c)*sp; }
  pmAccel(tx,tz,onG,dt);
  { const ox=P.pos.x, oz=P.pos.z; moveCol(P.pos,P.vx*dt,P.vz*dt,0.35,P.y); if(R.free&&R.free(P.pos.x,P.pos.z)>2.5){ P.pos.x=ox; P.pos.z=oz; } }
  { const gnd=groundAt(P.pos.x,P.pos.z,P.y);
    if(P.jumpReq){ P.jumpReq=false; if(P.y<=gnd+0.02&&can&&!down&&P.stam>=10&&!legs&&!P.using){ P.vy=5.4; P.stam-=12; sfxNoise(0.07,800,0.1); } }
    P.vy-=15*dt; if(P.para) P.vy=Math.max(P.vy,-6.5); P.y+=P.vy*dt; if(P.y<=gnd){ if(P.vy<-3.5&&!P.dead&&!P.para) sfxStep(4.5,P.indoor,false); if(P.vy<-1.5&&!P.para) pmLand(-P.vy); if(P.para){ P.para=null; msg('Down safely.'); } P.y=gnd; P.vy=0; } }
  if(R.sea){ const sw=skRaw(P.pos.x,P.pos.z)<-0.5; if(sw&&!P.swim) msg('In the water: it is freezing and you are slow. Get to land.'); P.swim=sw; if(sw&&!P.dead){ P.temp=Math.max(0,P.temp-dt*4); if(P.temp<=0&&(!R.swimT||R.t-R.swimT>1)){ R.swimT=R.t; dmgPart('thorax',6,'Froze in the sea'); } } }
  sp2=Math.hypot(P.vx,P.vz); pmSteps(sp2,dt);
  if(R.race&&!P.dead&&P.y<R.terrainBase(P.pos.z)-2.5) sledCrash('Fell into a crevasse');
  }
  if(P.temp<30&&!P.dead){ P.shiverT-=dt; if(P.shiverT<=0){ P.shiverT=2+rand()*2; sfxShiver(); } }
  windSet(R.map==='vault'?0.02:P.indoor?0.08:(R.map==='whiteout'?0.45:0.28)*(R.windy?1.8:R.cond&&R.cond.weather==='calm'?0.35:1));
  P.eye+=((P.dead?0.3:down?0.42:R.ride?1.32:P.crouch?1.08:1.62)-P.eye)*Math.min(1,dt*10);
  // warmth
  const indoor=inIndoor(P.pos), near=R.heaters.some(h=>Math.hypot(h.x-P.pos.x,h.z-P.pos.z)<3.5);
  const armorW=S.eq.armor?(ITEMS[S.eq.armor.id].warmth||0):0;
  const drain=R.drain*(1-0.25*S.hide.heater)*(1-armorW);
  const cabin=!!(R.fly&&R.planes[R.fly.i]&&(R.fly.seat===0||!R.fly.hand)); // an enclosed cockpit or turret is out of the wind; a Skylark passenger with the door open is not
  if(near) P.temp+=7*dt; else if(indoor||cabin) P.temp+=1.3*dt; else P.temp-=drain*dt*(P.sprint?0.6:1);
  P.temp=clamp(P.temp,0,100); P.indoor=indoor; P.nearHeat=near;
  if(P.temp<=0&&!down) spread(2.4*dt,'Froze to death');
  if(!down) for(const p of PARTS) if(P.bleed[p]&&!P.dead) dmgPart(p,1.05*dt,'Bled out');
  if(down&&!P.dead){ P.down.t-=dt; if(P.down.t<=0) reallyDie('Bled out while down'); else if(!othersUp()) reallyDie(P.down.cause); }
  updRevive(dt);
  // weapon
  P.cool-=dt;
  if(P.reloadT>0){ P.reloadT-=dt; if(P.reloadT<=0){ const w=curW(); if(w){ const n=takeAmmoFrom(playerConts(),w); if(R.invOpen) renderRaidInv(); if(!n) msg('Out of ammo.'); } } }
  if(P.using){ P.using.t-=dt; if(P.using.t<=0) finishUse(); }
  const w=curW();
  if(P.trigger&&can&&!P.down&&P.cool<=0&&P.reloadT<=0&&!P.using&&!P.sprint&&!(R.fly&&!R.fly.hand)){ if(w){ const d=ITEMS[w.id]; if((d.auto&&P.auto)||!P.semiLock){ fire(w); P.semiLock=true; P.cool=60/d.rpm; } } else if(!P.semiLock&&!R.cutting){ P.cool=punch()||0.5; P.semiLock=true; } }
  const wantAds=P.adsHeld&&can&&!P.down&&!P.sprint&&!!w&&P.reloadT<=0;
  const ws2=w?wstats(w):null; const ret=ws2?ws2.reticle:null; const adsSp=ws2?ws2.adsSpeed:6;
  P.adsT=clamp(P.adsT+(wantAds?dt*adsSp:-dt*7),0,1);
  const zoom=ws2&&ws2.zoom>1.2?ws2.zoom:0; P.sprB+=((P.sprint&&Math.hypot(P.vx,P.vz)>4?1:0)-P.sprB)*Math.min(1,dt*4); const fovT=72+((zoom?72/zoom:54)-72)*P.adsT+PMOVE.sprintFov*P.sprB*(1-P.adsT); if(Math.abs(fovT-P.fov)>0.05){ P.fov=fovT; camera.fov=fovT; camera.updateProjectionMatrix(); }
  if(P.grace>0){ P.grace-=dt; if(P.trigger&&!P.semiLock&&P.grace>0.5) P.grace=0.5; if(P.grace<=0){ P.graceEnd=R.t; if(!R.dm) msg('Your cover is gone. Keep your head down for a bit: they are slow to notice you at first.'); } }
  P.kick=Math.max(0,P.kick-dt*9); P.punchT=Math.max(0,(P.punchT||0)-dt*5); P.hurt=Math.max(0,P.hurt-dt*0.9); P.shake=Math.max(0,(P.shake||0)-dt);
  // camera
  let sway=0, swy=0; if(P.temp<30){ const s=(30-P.temp)/30; sway=Math.sin(R.t*11)*0.006*s; swy=Math.cos(R.t*7)*0.005*s; }
  if(R.windy&&!P.dead){ const gust=Math.max(0,Math.sin(R.t*0.6)*Math.sin(R.t*1.7+1)); sway+=Math.sin(R.t*2.3)*0.006*gust*(P.adsT>0.5?1.4:1); swy+=Math.cos(R.t*1.9)*0.003*gust; } // windstorm gusts push your aim
  if(P.hp.larm<=0||P.hp.rarm<=0){ sway+=Math.sin(R.t*1.7)*0.01; swy+=Math.sin(R.t*1.3)*0.008; }
  const C=pmCamera(sp2,dt); sway+=C.yaw; swy+=C.pitch;
  const sh=(P.shake||0)*0.06;
  camera.position.set(P.pos.x+C.x*Math.cos(P.yaw),P.y+P.eye+C.y,P.pos.z-C.x*Math.sin(P.yaw));
  camera.rotation.set(P.pitch+swy+P.kick*0.012+(rand()-0.5)*sh+(R.ride&&R.ride.mode==='drive'?R.sled.pitch*0.3:0),P.yaw+sway+(rand()-0.5)*sh,P.dead?(R.recap?0.15:0.6):P.down?0.35:(R.ride&&R.ride.mode==='drive'?R.sled.roll*0.25:C.roll));
  if(R.fly&&!P.dead) flyCam();
  // viewmodel pose
  syncVM();
  if(vmGun){ const scoped=(ret==='scope'||ret==='prism')&&P.adsT>0.85; setReticle(!P.dead&&P.adsT>0.8&&(ret==='dot'||ret==='holo'||(ret==='prism'&&scoped))?ret:null); vmGun.visible=!scoped&&!P.dead&&!P.down&&!(R.fly&&!R.fly.hand); $('#scope').hidden=!(scoped&&ret==='scope');
    if(vmGun.userData.fists){ const pt=P.punchT||0; const us=P.using?1:0; vmGun.position.set(0.02,-0.22-us*0.2-(R.cutting?0.08:0),-0.42+Math.sin((R.cutting?(R.cutting.t*2)%1:pt)*Math.PI)*-(vmGun.userData.spear?0.42:0.22)); vmGun.rotation.set(Math.sin(P.bob)*0.04,0,0); }
    else { const d=ITEMS[w.id]; if(!P.vm){ P.vm=vmNew(); for(const o of [...vmScene.children]) if(o.userData.vmProp) vmScene.remove(o); }
      // everything the hands do lives in 56-vm-anim.js; this hands it what the player is doing
      vmAnimate(vmGun,P.vm,{ads:P.adsT,sightY:vmGun.userData.sightY,sprint:P.sprint,moving:sp2>0.3,bob:P.bob,kick:P.kick,strafe:P.cam.lat,dip:P.cam.y,yaw:P.yaw,pitch:P.pitch,uid:w.uid,id:w.id,
        reload:P.reloadT>0?{t:(P.reloadTot||d.reload)-P.reloadT,total:P.reloadTot||d.reload,empty:!!P.reloadEmpty,shells:P.reloadShells}:null,
        using:P.using?{t:P.using.total-P.using.t,total:P.using.total,id:P.using.it.id}:null,cool:P.cool,coolTot:60/d.rpm},dt,vmScene); } }
  if(R&&R.spec) specCam(dt);
  if(R&&!P.dead) pouchSaveTick();
}
function updExtract(dt){
  if(P.dead||R.fly) return; let inside=null;
  for(const e of R.extracts) if(e.active&&Math.hypot(e.x-P.pos.x,e.z-P.pos.z)<e.r) inside=e;
  if(inside){ const before=Math.floor(R.exT); R.exT+=dt; if(Math.floor(R.exT)!==before) sfxBeep(); R.exNeed=inside.time||7; if(R.exT>=R.exNeed){ sfxExtracted(); endRaid('extract',inside.name); } } else R.exT=0;
}
function nearestCont(){
  let best=null, bd=1e9; const fx=-Math.sin(P.yaw), fz=-Math.cos(P.yaw);
  for(const c of R.conts){ const dx=c.x-P.pos.x, dz=c.z-P.pos.z, d=Math.hypot(dx,dz); const lim=c.body?2.2:2.4; if(d>lim) continue; if(d>0.4 && (fx*dx+fz*dz)/d<0.45) continue; if(d<bd){ bd=d; best=c; } }
  if(best && best.mesh){ _a.set(P.pos.x,P.y+P.eye,P.pos.z); _b.set(best.x-P.pos.x,0.5-P.y-P.eye,best.z-P.pos.z); const d=_b.length(); _b.normalize(); ray.set(_a,_b); ray.far=d+0.5; const h=ray.intersectObjects(R.ray,false)[0]; if(h&&h.object!==best.mesh&&h.distance<d-0.5) return null; }
  return best;
}
