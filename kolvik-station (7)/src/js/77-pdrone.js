/* 77-pdrone: your own recon drone
   Buy one from the trader and carry it. In a raid, press 0 to launch it and fly it yourself: WASD to move, mouse to
   look, Space to climb, C or Ctrl to drop, Shift for speed. Anything the camera sees within 80 m (enemies, and
   players who aren't on your side) gets a red marker for 20 seconds that you keep seeing after you're back in your
   body, and so does your squad. Click to mark whatever is under the crosshair. Press 0 again to bring it home: it
   flies back to you and goes back in your pack. Your body stands where you left it, and can be shot.
   Battery: 150 s of flight, recharged between raids. Range: it starts to lose signal past 200 m and comes home on its
   own past 240. Other players see it and can shoot it down (about two hits); a destroyed or flat drone is lost. */
const PD={batt:150, hp:90, speed:9, boost:15, climb:4.5, range:200, maxRange:240, spot:80, spotT:20, alt:45};
function pdItem(){ for(const c of playerConts()) for(const it of c.items) if(it.id==='pdrone') return it; return null; }
function pdRecharge(){ const all=[]; const w=it=>{ if(!it) return; if(it.id==='pdrone'){ it.batt=ITEMS.pdrone.batt; delete it.out; } (it.items||[]).forEach(w); }; for(const k in S.eq) w(S.eq[k]); S.stash.items.forEach(w); }
function pdMesh(){ const g=new THREE.Group(), dark=MC(0x2a2e33), grey=MC(0x6a7076);
  const b=(w,h,d,x,y,z,m)=>{ const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); o.position.set(x,y,z); g.add(o); return o; };
  b(0.26,0.08,0.26,0,0,0,dark); b(0.1,0.06,0.12,0,0.06,0,grey); const rot=[];
  for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]){ const arm=b(0.04,0.03,0.3,sx*0.12,0,sz*0.12,dark); arm.rotation.y=sx*sz>0?-Math.PI/4:Math.PI/4; const r=b(0.28,0.006,0.03,sx*0.22,0.05,sz*0.22,MC(0x111316)); rot.push(r); }
  const led=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.03,0.05),MB(0x3cf07a)); led.position.set(0,0,-0.15); g.add(led);
  g.rotation.order='YXZ'; g.userData.rot=rot; scene.add(g); g.traverse(o=>o.layers.enable(1)); return g; }
function pdLaunch(){ if(R.pd){ pdRecall(); return; } if(P.dead||P.down||R.fly||R.ride) return; const it=pdItem(); if(!it){ msg('No drone. The trader sells them.'); return; }
  if((it.batt??PD.batt)<3){ msg('Its battery is flat. It charges between raids.'); return; }
  P.keys={}; P.trigger=false; P.adsHeld=false; P.lean=0;
  R.pd={it,x:P.pos.x,y:P.y+P.eye+0.6,z:P.pos.z,vx:0,vy:2,vz:0,yaw:P.yaw,pitch:-0.25,ctl:true,keys:{},hp:PD.hp,spotT:0,home:false};
  R.pd.g=pdMesh(); R.pd.snd=rotorSound?rotorSound(2200,70,0.035):null; it.out=true; $('#pdhud').hidden=false; msg('Drone up. 0 brings it home.'); }
function pdRecall(){ const d=R.pd; if(!d) return; d.ctl=false; d.home=true; d.keys={}; $('#pdhud').hidden=true; msg('Drone coming home.'); }
function pdEnd(lost,why){ const d=R.pd; if(!d) return; scene.remove(d.g); if(d.snd&&typeof rotorStop==='function') rotorStop(d.snd); $('#pdhud').hidden=true; delete d.it.out;
  if(lost){ for(const c of playerConts()){ const i=c.items.indexOf(d.it); if(i>=0){ c.items.splice(i,1); break; } } msg(why||'Drone lost.'); puff(new THREE.Vector3(d.x,d.y,d.z),0x333333,10,3); sfxNoise(0.4,500,0.3); }
  else msg('Drone back in your pack.'); R.pd=null; if(R.invOpen) R.dirty=true; }
function pdKey(code,down){ const d=R.pd; if(!d||!d.ctl) return false;
  if(down&&code==='Digit0'){ pdRecall(); return true; } if(code==='Escape'||code==='Tab'||code==='KeyM'||code==='Enter'||code==='KeyT') return false; d.keys[code]=down; return true; }
function pdLook(mx,my){ const d=R.pd; if(!d||!d.ctl) return false; const s=0.0022*(OPTS.sens||1); d.yaw-=mx*s; d.pitch=clamp(d.pitch-my*s,-1.45,0.9); return true; }
function pdClick(){ const d=R.pd; if(!d||!d.ctl) return false; camera.updateMatrixWorld(); _dir.set(0,0,-1).applyQuaternion(camera.quaternion); ray.set(camera.position,_dir); ray.far=PD.spot*1.5;
  const h=ray.intersectObjects(R.targets,false).find(h=>h.object.userData.enemy||h.object.userData.player); if(h){ pdSpot(h.object.userData.enemy,h.object.userData.player,true); sfxTone(1500,0.05,0.06,'square'); } else sfxTone(400,0.05,0.04,'square'); return true; }
function pdSpot(e,pid,manual){ if(e&&!e.dead){ const was=e.spotT>R.t; e.spotT=R.t+PD.spotT; if(!was||manual) nsend({t:'spot',i:e.idx}); }
  if(pid&&!isMate(pid)){ const q=NET.players[pid]; if(q){ const was=q.spotT>R.t; q.spotT=R.t+PD.spotT; if(!was||manual) nsend({t:'spot',pid}); } } }
function spotNet(m){ if(!R) return; if(m.i!=null&&R.enemies[m.i]&&!R.enemies[m.i].dead) R.enemies[m.i].spotT=R.t+PD.spotT; if(m.pid&&NET.players[m.pid]&&m.pid!==NET.id) NET.players[m.pid].spotT=R.t+PD.spotT; }
function pdHit(dmg){ const d=R.pd; if(!d) return; d.hp-=dmg; sfxNoise(0.1,1800,0.2,'bandpass'); if(d.hp<=0) pdEnd(true,'Your drone was shot down.'); }
function pdTick(dt){ const d=R.pd; if(!d) return; const it=d.it;
  if(P.dead||P.down){ if(d.ctl) pdRecall(); }
  it.batt=(it.batt??PD.batt)-dt; if(it.batt<=0){ pdEnd(true,'The drone\'s battery died and it fell out of the sky.'); return; }
  const dist=Math.hypot(d.x-P.pos.x,d.z-P.pos.z);
  if(dist>PD.maxRange&&d.ctl){ pdRecall(); msg('Out of range: the drone is coming home.'); }
  let tx=0,ty=0,tz=0; const k=d.keys;
  if(d.ctl){ const sp=(k.ShiftLeft||k.ShiftRight)?PD.boost:PD.speed, fx=-Math.sin(d.yaw), fz=-Math.cos(d.yaw), rx=Math.cos(d.yaw), rz=-Math.sin(d.yaw);
    const f=(k.KeyW?1:0)-(k.KeyS?1:0), s=(k.KeyD?1:0)-(k.KeyA?1:0); tx=(fx*f+rx*s)*sp; tz=(fz*f+rz*s)*sp; ty=((k.Space?1:0)-(k.KeyC||k.ControlLeft||k.ControlRight?1:0))*PD.climb; }
  else if(d.home){ const hx=P.pos.x-d.x, hz=P.pos.z-d.z, hy=P.y+P.eye+0.8-d.y, L=Math.hypot(hx,hz,hy)||1; const sp=Math.min(PD.boost,L*1.5+2); tx=hx/L*sp; tz=hz/L*sp; ty=hy/L*sp; d.yaw=Math.atan2(-hx,-hz); if(L<1.8){ pdEnd(false); return; } }
  const a=Math.min(1,dt*3); d.vx+=(tx-d.vx)*a; d.vy+=(ty-d.vy)*a; d.vz+=(tz-d.vz)*a;
  const ox=d.x, oy=d.y, oz=d.z; d.x+=d.vx*dt; d.y+=d.vy*dt; d.z+=d.vz*dt;
  const gnd=groundAt(d.x,d.z,d.y+0.3); if(d.y<gnd+0.4){ d.y=gnd+0.4; d.vy=Math.max(0,d.vy); } const top=(R.terrain?R.terrain(d.x,d.z):0)+PD.alt; if(d.y>top){ d.y=top; d.vy=Math.min(0,d.vy); }
  for(const b of colsNear(d.x,d.z)){ if(b.terrain) continue; if(d.x>b.x0-0.25&&d.x<b.x1+0.25&&d.z>b.z0-0.25&&d.z<b.z1+0.25&&d.y>b.y0-0.2&&d.y<b.y1+0.2){ d.x=ox; d.z=oz; d.y=Math.max(d.y,oy); d.vx*=-0.3; d.vz*=-0.3; break; } }
  d.x=clamp(d.x,-R.bound,R.bound); d.z=clamp(d.z,-R.bound,R.bound);
  const fwd=(-Math.sin(d.yaw)*d.vx-Math.cos(d.yaw)*d.vz), side=(Math.cos(d.yaw)*d.vx-Math.sin(d.yaw)*d.vz);
  d.g.visible=!d.ctl; d.g.position.set(d.x,d.y,d.z); d.g.rotation.set(-fwd*0.03,d.yaw,-side*0.03); for(const r of d.g.userData.rot) r.rotation.y+=dt*60;
  if(d.snd&&d.snd.g&&MUS.ctx){ const cam=d.ctl?0:Math.hypot(d.x-P.pos.x,d.y-P.y-1.6,d.z-P.pos.z); d.snd.g.gain.setTargetAtTime(0.035*Math.max(0.05,1-cam/60),MUS.ctx.currentTime,0.2); }
  // what the camera sees gets marked
  d.spotT-=dt; if(d.spotT<=0){ d.spotT=0.3; const fx=-Math.sin(d.yaw)*Math.cos(d.pitch), fy=Math.sin(d.pitch), fz=-Math.cos(d.yaw)*Math.cos(d.pitch);
    const sees=(x,y,z)=>{ const dx=x-d.x, dy=y-d.y, dz=z-d.z, L=Math.hypot(dx,dy,dz); if(L>PD.spot||L<0.5) return false; if((dx*fx+dy*fy+dz*fz)/L<0.72) return false; return !smokeBlocks(d.x,d.y,d.z,x,y,z)&&los(d.x,d.y,d.z,x,y,z); };
    if(d.ctl||d.home){ for(const e of R.enemies) if(!e.dead&&!(e.spotT>R.t+PD.spotT-2)&&sees(e.pos.x,e.pos.y+1.3,e.pos.z)) pdSpot(e);
      for(const id in NET.players){ const q=NET.players[id], st=q.st; if(!st||st.dead||isMate(id)) continue; if(!(q.spotT>R.t+PD.spotT-2)&&sees(st.x,(st.y||0)+1.3,st.z)) pdSpot(null,id); } } }
  // HUD
  if(d.ctl){ const el=$('#pdhud'); const weak=dist>PD.range; el.classList.toggle('weak',weak); const txt=`<b>DRONE</b> · battery ${Math.ceil(it.batt)} s · ${Math.round(dist)} m${weak?' · weak signal':''} · alt ${Math.round(d.y-(R.terrain?R.terrain(d.x,d.z):0))} m<small>WASD fly · Space/C up and down · Shift fast · click marks · 0 home</small>`; if(el._t!==txt){ el._t=txt; el.innerHTML=txt; } }
}
// put the camera in the drone while you're flying it
function pdCamera(){ const d=R.pd; if(!d||!d.ctl) return; camera.position.set(d.x,d.y-0.12,d.z); const side=(Math.cos(d.yaw)*d.vx-Math.sin(d.yaw)*d.vz); camera.rotation.set(d.pitch,d.yaw,-side*0.015); if(vmGun) vmGun.visible=false; setReticle(null); d.g.visible=false; }
function pdCameraAfter(){ if(R.pd&&R.pd.g) R.pd.g.visible=!R.pd.ctl; }
// spotted enemies and players: red markers through walls
function spotsTick(){ let box=$('#spots'); if(!box){ const hud=$('#hud'); if(!hud) return; box=document.createElement('div'); box.id='spots'; hud.appendChild(box); }
  camera.updateMatrixWorld(); const W=innerWidth, H=innerHeight, seen=new Set(); const L=[];
  for(const e of R.enemies) if(!e.dead&&e.spotT>R.t) L.push(['e'+e.idx,e.pos.x,e.pos.y+2.1,e.pos.z]);
  for(const id in NET.players){ const q=NET.players[id]; if(q.spotT>R.t&&q.st&&!q.st.dead) L.push(['p'+id,q.st.x,(q.st.y||0)+2.1,q.st.z]); }
  for(const [k,x,y,z] of L){ _v.set(x,y,z).project(camera); if(_v.z>1||Math.abs(_v.x)>1.05||Math.abs(_v.y)>1.05) continue; seen.add(k); let el=box.querySelector(`[data-sp="${k}"]`); if(!el){ el=document.createElement('div'); el.className='spotmk'; el.dataset.sp=k; box.appendChild(el); }
    el.style.transform=`translate(${Math.round((_v.x+1)/2*W)}px,${Math.round((1-_v.y)/2*H)}px)`; const dd=Math.round(Math.hypot(x-camera.position.x,z-camera.position.z)); if(el._d!==dd){ el._d=dd; el.innerHTML=`<i></i><span>${dd} m</span>`; } }
  for(const el of [...box.children]) if(!seen.has(el.dataset.sp)) el.remove(); }
// other players' drones: a model where they fly it, and something you can shoot
function pdRemoteTick(){ for(const id in NET.players){ const q=NET.players[id], st=q.st; const pd=st&&st.pd;
  if(pd&&!st.dead){ if(!q.pdG){ q.pdG=pdMesh(); q.pdG.traverse(o=>{ if(o.isMesh){ o.userData={pdrone:id,part:'drone'}; R.targets.push(o); } }); } const g=q.pdG; g.position.x+=(pd[0]-g.position.x)*0.3; g.position.y+=(pd[1]-g.position.y)*0.3; g.position.z+=(pd[2]-g.position.z)*0.3; g.rotation.y=pd[3]; for(const r of g.userData.rot) r.rotation.y+=0.9; }
  else if(q.pdG){ const gone=q.pdG; R.targets=R.targets.filter(m=>m.userData.pdrone!==id); scene.remove(gone); q.pdG=null; } } }
