/* 59-drones: recon drones flown by a fly's brain
   The controller is a small rate-coded network laid out like the circuits mapped in the fruit fly connectome
   (FlyWire): what each part does is the fly's, the numbers are ours.
   - Eye: 16 columns of ommatidia around the drone, each reporting a small moving target in its 22.5° of azimuth
     (a person: stronger when they move, weaker crouched, nothing through walls or roofs, nothing past the fog).
   - Lobula (small-target motion detectors): lateral inhibition between columns sharpens that into one bearing.
   - Central complex compass (EPG ring attractor): 16 neurons with local excitation and global inhibition hold a bump
     of activity at the drone's heading; turning shifts the bump (angular velocity input) and a visual landmark
     input keeps it from drifting. The drone steers by this internal compass, not by the true heading.
   - Goal (fan-shaped body): a second bump at the heading it wants: toward the target, toward a report, along a
     casting zigzag, or a Lévy-flight search heading.
   - Steering (PFL3): two populations compare the goal with the compass bump shifted ±45°; their difference is the
     turn command, which is how flies turn toward a goal heading.
   - Looming (giant fibre): someone aiming at it from close, or shots going past, builds a looming signal; past a
     threshold it makes an escape saccade, darting sideways and up.
   - Mushroom body: it remembers where it has found people (a slowly fading value map) and how recently it has
     searched each patch, and leans its search flights toward likely, unvisited places.
   Behaviour, like a fly tracking an odour plume: explore (Lévy flight) → surge toward a cue or a radio report →
   track (hold off about 26 m and circle, reporting on the radio every second) → cast (zigzag wider and wider where
   it lost you) → back to exploring. On a low battery it flies home, lands and recharges.
   Drones never shoot. They see and they tell: a report goes to the ground groups nearby (57-ai.js), which send at
   most a couple of people. You can hear them (a buzz), see their lights, and shoot them down (they drop parts). A
   radio jammer in your gear cuts their link within 40 m: they lose you and drift. */
const DRONE={hp:45, alt:15, cruise:7, surge:11, sight:62, standoff:26, report:1.0, battery:[240,360], recharge:35, leash:240,
  count:{kolvik:2,whiteout:2,skarsvik:3,storvidda:3,ravnskar:1,kaldfjord:7}};
const FLY={n:16, tau:0.08, exc:2, inh:0.3, land:0.12, pflShift:2, turnGain:3.2, loomTh:1, levy:1.6};
const _th=i=>i/FLY.n*Math.PI*2;                            // preferred direction of column / ring neuron i
const _wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function flyBrain(yaw){ const b={eye:new Float32Array(FLY.n),stmd:new Float32Array(FLY.n),epg:new Float32Array(FLY.n),goal:new Float32Array(FLY.n),pflL:0,pflR:0,loom:0,
  mode:'explore',modeT:0,flightT:0,goalAng:yaw,castSide:1,castT:0,castN:0,last:null,lastT:-99,mb:new Map(),seen:new Map(),escT:0};
  for(let i=0;i<FLY.n;i++) b.epg[i]=Math.max(0,Math.cos(_th(i)-yaw)); return b; }
// population vector of a ring: the angle it encodes
function ringAngle(r){ let x=0,y=0; for(let i=0;i<FLY.n;i++){ x+=r[i]*Math.cos(_th(i)); y+=r[i]*Math.sin(_th(i)); } return Math.atan2(y,x); }

/* ---- the drones themselves ---- */
function droneMesh(d){
  const g=new THREE.Group(), dark=MC(0x24282c), grey=MC(0x50565c); const ud={drone:d,part:'drone'};
  const box=(w,h,dd,x,y,z,m)=>{ const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,dd),m); o.position.set(x,y,z); o.userData=ud; g.add(o); return o; };
  box(0.42,0.14,0.42,0,0,0,dark); box(0.18,0.1,0.22,0,0.11,0.02,grey);
  const rot=[]; for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]){ const arm=box(0.06,0.05,0.5,sx*0.2,0,sz*0.2,dark); arm.rotation.y=sx*sz>0?-Math.PI/4:Math.PI/4;
    const r=new THREE.Mesh(new THREE.BoxGeometry(0.46,0.01,0.05),MC(0x111316)); r.position.set(sx*0.36,0.08,sz*0.36); g.add(r); rot.push(r); }
  const cam=new THREE.Mesh(new THREE.SphereGeometry(0.08,6,4),MC(0x101214)); cam.position.set(0,-0.1,-0.14); g.add(cam);
  const lr=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.06,0.1),MB(0xff3a2a)); lr.position.set(-0.36,0.0,-0.36); g.add(lr);
  const lg=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.06,0.1),MB(0x3cf07a)); lg.position.set(0.36,0.0,-0.36); g.add(lg);
  const lw=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.07,0.09),MB(0xffffff)); lw.position.set(0,0.0,0.24); g.add(lw);
  g.scale.setScalar(1.8); // a big recon quad, about 1.4 m across the rotors
  g.rotation.order='YXZ'; scene.add(g); g.traverse(o=>o.layers.enable(1)); d.parts=g.children.filter(o=>o.userData===ud); R.targets.push(...d.parts); d.rot=rot; d.blink=lw; return g;
}
function spawnDrones(mapId){
  R.drones=[]; let n=DRONE.count[mapId]||0; if(!n||!R.enemies.length) return; n=Math.max(1,Math.round(n*({easy:0.6,normal:1,hard:1.25,brutal:1.5}[R.diff]||1)));
  // bases: where the groups with radios are
  const A=aiState(); const bases=A.groups.filter(g=>R.enemies.some(e=>e.grp===g.id&&HAS_RADIO.has(e.kind)));
  const pool=bases.length?bases:A.groups; if(!pool.length) return;
  for(let i=0;i<n;i++){ const g=pool[(i*7+3)%pool.length]; const x=g.x+rr(-6,6), z=g.z+rr(-6,6); const yaw=rr(0,6.28);
    const d={i,x,z,y:(R.terrain?R.terrain(x,z):0)+0.4,vx:0,vz:0,vy:0,yaw,yawRate:0,hp:DRONE.hp,dead:false,home:{x,z},bat:rr(...DRONE.battery)*(0.5+Math.random()*0.5),gainErr:(Math.random()-0.5)*0.12,landed:i>0?rr(5,40):0,brain:flyBrain(yaw),repT:0,losT:0,seeing:null};
    d.g=droneMesh(d); d.g.position.set(d.x,d.y,d.z); R.drones.push(d); }
}
// a lookup of the mushroom-body maps, on a 20 m grid
const mbKey=(x,z)=>Math.floor(x/20)*100000+Math.floor(z/20);
function mbValue(b,x,z){ return b.mb.get(mbKey(x,z))||0; }
function mbNovel(b,x,z){ const t=b.seen.get(mbKey(x,z)); return t==null?1:1-Math.exp(-(R.t-t)/90); }

/* ---- one brain step ---- */
function flyThink(d,dt){
  const b=d.brain, N=FLY.n, sight=Math.min(DRONE.sight,scene.fog&&scene.fog.density?1.25/scene.fog.density:DRONE.sight)*(R.sight||1);
  const jam=jammed(d.x,d.z);
  // 1. eye: one small-target signal per column
  b.eye.fill(0); let best=null, bs=0;
  for(const t of R.tgts){ if(t.grace) continue; const dx=t.x-d.x, dz=t.z-d.z, dist=Math.hypot(dx,dz,t.eye-d.y); if(dist>sight) continue;
    d.vis=d.vis||{}; const vc=d.vis[t.id]; if(!vc||R.t>vc.t){ d.vis[t.id]={t:R.t+0.2,v:los(d.x,d.y-0.2,d.z,t.x,t.eye-0.4,t.z)}; }
    if(!d.vis[t.id].v) continue;
    const sal=(1.25-dist/sight)*(t.moving?1:0.45)*(t.crouch?0.75:1)*(t.sprint?1.2:1); if(sal<=0.05) continue;
    const rel=_wrap(Math.atan2(-dx,-dz)-d.yaw); for(let i=0;i<N;i++){ const dd=_wrap(rel-(_th(i)-Math.PI)); b.eye[i]+=sal*Math.exp(-dd*dd/0.08); }
    if(sal>bs){ bs=sal; best={t,dist}; } }
  // 2. lobula: lateral inhibition, then threshold
  let mean=0; for(let i=0;i<N;i++) mean+=b.eye[i]; mean/=N; let peak=0; for(let i=0;i<N;i++){ b.stmd[i]=Math.max(0,b.eye[i]-1.5*mean); peak=Math.max(peak,b.stmd[i]); }
  const target=peak>0.12&&best?best:null;
  // 3. compass: P-EN neurons push the bump round by how far the drone turned (each drone's sense of its own turning
  //    is a few percent off, so it drifts), the E-PG ring's local excitation and global inhibition hold it together,
  //    and the sky (weaker in a blizzard) pulls it back toward the true heading
  { const sh=d.yawRate*(1+d.gainErr)*dt/(2*Math.PI/N), sp=b.sp||(b.sp=new Float32Array(N)), ne=b.ne||(b.ne=new Float32Array(N));
    for(let i=0;i<N;i++){ const src=i-sh, i0=Math.floor(src), f=src-i0; sp[i]=b.epg[((i0%N)+N)%N]*(1-f)+b.epg[(((i0+1)%N)+N)%N]*f; }
    const land=FLY.land*(R.cond&&R.cond.weather==='blizzard'?0.3:1); let tot=0;
    for(let i=0;i<N;i++){ let s=0; for(let j=0;j<N;j++) s+=(FLY.exc*Math.cos(_th(i)-_th(j))-FLY.inh)*sp[j]; s+=land*Math.max(0,Math.cos(_th(i)-d.yaw)); ne[i]=Math.max(0,sp[i]+dt/FLY.tau*(-sp[i]+Math.max(0,s))); tot+=ne[i]; }
    for(let i=0;i<N;i++) b.epg[i]=tot>0?ne[i]/tot:1/N; }
  const compass=ringAngle(b.epg);
  // 4. behaviour: what the goal heading should be
  const setMode=m=>{ if(b.mode!==m){ b.mode=m; b.modeT=R.t; } };
  if(target&&!jam){ const t=target.t; b.last={x:t.x,z:t.z,tid:t.id}; b.lastT=R.t; b.mb.set(mbKey(t.x,t.z),mbValue(b,t.x,t.z)+dt*2); d.seeing=t.id; if(b.mode!=='escape'&&b.mode!=='return') setMode('track'); }
  else { d.seeing=null; if(b.mode==='track') { setMode('cast'); b.castN=0; b.castT=0; } }
  if(jam&&b.mode!=='return'){ d.seeing=null; if(b.mode!=='explore') setMode('explore'); }
  // hearing: a snowmobile engine carries a long way
  if(!target&&!jam&&(b.mode==='explore'||b.mode==='cast')&&R.t>(b.hearT||0)){ b.hearT=R.t+3; for(const t of R.tgts){ if(!t.ride) continue; const dd=Math.hypot(t.x-d.x,t.z-d.z); if(dd<250){ b.last={x:t.x+_gauss()*12,z:t.z+_gauss()*12,tid:t.id}; b.lastT=R.t; setMode('surge'); break; } } }
  // heard about someone on the radio: the freshest picture any ground group has
  if(!jam&&(b.mode==='explore'||b.mode==='cast')){ let fr=null; for(const k in aiState().bel){ const B=aiState().bel[k]; if(B.init&&B.est&&R.t-B.lastClue<6&&(!fr||B.lastClue>fr.lastClue)) fr=B; }
    // at most two drones go after one person; the rest keep searching elsewhere
    const busy=fr?R.drones.filter(o=>o!==d&&!o.dead&&(o.brain.mode==='track'||o.brain.mode==='surge')&&o.brain.last&&o.brain.last.tid===fr.tid).length:0;
    if(fr&&busy<2&&R.t-b.lastT>4){ b.last={x:fr.est.x,z:fr.est.z,tid:fr.tid}; b.lastT=fr.lastClue; setMode('surge'); } }
  d.bat-=dt; if(d.bat<=0&&b.mode!=='return'){ setMode('return'); }
  // looming: being aimed at closely, or shot at
  b.loom*=Math.exp(-dt*1.5); for(const t of R.tgts){ if(t.id!=='me'||!P) continue; const dx=d.x-P.pos.x, dy=d.y-(P.y+P.eye), dz=d.z-P.pos.z, L=Math.hypot(dx,dy,dz); if(L>45) continue; const fx=-Math.sin(P.yaw)*Math.cos(P.pitch), fy=Math.sin(P.pitch), fz=-Math.cos(P.yaw)*Math.cos(P.pitch); if((fx*dx+fy*dy+fz*dz)/L>0.997&&P.adsT>0.5) b.loom+=dt*1.4*(45/Math.max(8,L)); }
  if(b.loom>FLY.loomTh&&b.mode!=='escape'&&b.mode!=='return'){ b.escT=R.t+1.3; b.escSide=Math.random()<0.5?-1:1; b.prev=b.mode; setMode('escape'); b.loom=0; }
  let goal=b.goalAng, speed=DRONE.cruise, alt=DRONE.alt;
  switch(b.mode){
    case 'track': { const t=target.t; const dx=d.x-t.x, dz=d.z-t.z, L=Math.hypot(dx,dz)||1; const orbit=0.25; const ox=t.x+(dx/L*Math.cos(orbit)-dz/L*Math.sin(orbit))*DRONE.standoff, oz=t.z+(dz/L*Math.cos(orbit)+dx/L*Math.sin(orbit))*DRONE.standoff;
      const gd=Math.hypot(ox-d.x,oz-d.z); goal=gd>2?Math.atan2(-(ox-d.x),-(oz-d.z)):Math.atan2(-(t.x-d.x),-(t.z-d.z)); speed=clamp(gd*0.6,0,DRONE.surge); alt=13;
      // report what it sees
      if(R.t>d.repT){ d.repT=R.t+DRONE.report; aiRadio(null,t.id,t.x,t.z,{drone:true,fx:d.x,fz:d.z,key:'drone'+d.i,sig:3,delay:0.4,every:DRONE.report,send:2,kind:'drone'}); } break; }
    case 'surge': { const L=b.last; const gd=Math.hypot(L.x-d.x,L.z-d.z); goal=Math.atan2(-(L.x-d.x),-(L.z-d.z)); speed=DRONE.surge; if(gd<10){ setMode('cast'); b.castN=0; b.castT=0; } break; }
    case 'cast': { // zigzag across the last known spot, a bit wider each pass
      const L=b.last||{x:d.x,z:d.z}; b.castT-=dt; if(b.castT<=0){ b.castN++; b.castSide*=-1; b.castT=2+b.castN*0.8; }
      const base=Math.atan2(-(L.x-d.x),-(L.z-d.z)), far=Math.hypot(L.x-d.x,L.z-d.z); goal=base+b.castSide*(far<15+b.castN*6?1.25:0.55); speed=DRONE.cruise;
      if(R.t-b.modeT>28) setMode('explore'); break; }
    case 'escape': { goal=d.yaw+b.escSide*1.7; speed=DRONE.surge*1.2; alt=DRONE.alt+8; if(R.t>b.escT) setMode(b.prev==='track'?'cast':b.prev||'explore'); break; }
    case 'return': { const gd=Math.hypot(d.home.x-d.x,d.home.z-d.z); goal=Math.atan2(-(d.home.x-d.x),-(d.home.z-d.z)); speed=clamp(gd*0.5,1,DRONE.cruise); if(gd<3){ alt=0.4; if(d.y-(R.terrain?R.terrain(d.x,d.z):0)<0.8){ d.landed=DRONE.recharge; d.bat=rr(...DRONE.battery); setMode('explore'); } } break; }
    default: { // Lévy flight: short hops mostly, now and then a long one; each heading picked by the mushroom body
      b.flightT-=dt; const out=Math.max(Math.abs(d.x),Math.abs(d.z))>R.bound-30||Math.hypot(d.x-d.home.x,d.z-d.home.z)>DRONE.leash*(R.bound>500?1.8:1);
      if(b.flightT<=0||out){ b.flightT=Math.min(30,3*Math.pow(1-Math.random(),-1/FLY.levy));
        let bestA=0, bv=-1e9; for(let k=0;k<8;k++){ const a=out?Math.atan2(-(d.home.x-d.x),-(d.home.z-d.z))+(Math.random()-0.5):Math.random()*6.2832; let v=0;
          for(const r of [40,80,130]){ const px=d.x-Math.sin(a)*r, pz=d.z-Math.cos(a)*r; if(Math.abs(px)>R.bound-20||Math.abs(pz)>R.bound-20){ v-=3; continue; } v+=mbValue(b,px,pz)*0.6+mbNovel(b,px,pz); }
          v+=Math.random()*0.6; if(v>bv){ bv=v; bestA=a; } } b.goalAng=bestA; }
      goal=b.goalAng; speed=DRONE.cruise; }
  }
  b.seen.set(mbKey(d.x,d.z),R.t); for(const [k,v] of b.mb) if(v>0.01) b.mb.set(k,v*Math.exp(-dt*0.004));
  // 5. goal bump and PFL3 steering: compare the goal with the compass shifted left and right
  for(let i=0;i<N;i++) b.goal[i]=Math.max(0,Math.cos(_th(i)-goal));
  let L=0,Rr=0; for(let i=0;i<N;i++){ L+=b.goal[i]*b.epg[(i-FLY.pflShift+N)%N]; Rr+=b.goal[i]*b.epg[(i+FLY.pflShift)%N]; } b.pflL=L; b.pflR=Rr;
  // (the compass bump sits at the heading; the population shifted +45° overlaps the goal more when the goal is to the left)
  const turn=clamp(FLY.turnGain*(L-Rr)/Math.max(0.2,L+Rr),-2.6,2.6);
  return {turn,speed,alt,compass};
}

/* ---- flight ---- */
function updDrones(dt){
  if(!R.drones||!R.drones.length) return; const host=!NET.on||NET.host;
  for(const d of R.drones){
    if(d.dead){ droneFall(d,dt); continue; }
    if(host){
      if(d.landed>0){ d.landed-=dt; d.vx*=0.8; d.vz*=0.8; d.y=(R.terrain?R.terrain(d.x,d.z):0)+0.25; d.yawRate=0; }
      else { const c=flyThink(d,dt);
        d.yawRate+=(c.turn-d.yawRate)*Math.min(1,dt*5); d.yaw+=d.yawRate*dt;
        const fx=-Math.sin(d.yaw), fz=-Math.cos(d.yaw), k=Math.min(1,dt*1.6); d.vx+=(fx*c.speed-d.vx)*k; d.vz+=(fz*c.speed-d.vz)*k;
        // terrain following, and up over anything tall nearby
        let ground=R.terrain?R.terrain(d.x+d.vx,d.z+d.vz):0; for(const bx of colsNear(d.x+d.vx*0.8,d.z+d.vz*0.8)) if(bx.y1>ground) ground=Math.max(ground,bx.y1);
        const ty=ground+(c.alt<1?c.alt:Math.max(4,c.alt)); d.vy+=((ty-d.y)*1.2-d.vy)*Math.min(1,dt*2); }
      d.x=clamp(d.x+d.vx*dt,-R.bound+2,R.bound-2); d.z=clamp(d.z+d.vz*dt,-R.bound+2,R.bound-2); d.y+=d.vy*dt;
    } else if(d.n){ const k=Math.min(1,dt*8); d.x+=(d.n[0]-d.x)*k; d.y+=(d.n[1]-d.y)*k; d.z+=(d.n[2]-d.z)*k; d.yaw=lerpA(d.yaw,d.n[3],k); if(d.n[4]<=0&&!d.dead){ d.dead=true; d.fallV=0; } }
    // the body: tilt into the direction of travel, rotors spinning, a white strobe
    const sp=Math.hypot(d.vx,d.vz), fx=-Math.sin(d.yaw), fz=-Math.cos(d.yaw), fw=d.vx*fx+d.vz*fz, side=d.vx*Math.cos(d.yaw)-d.vz*Math.sin(d.yaw);
    d.g.position.set(d.x,d.y,d.z); d.g.rotation.set(-clamp(fw*0.03,-0.35,0.35),d.yaw,-clamp(side*0.03,-0.3,0.3)+clamp(d.yawRate*0.05,-0.2,0.2));
    for(const r of d.rot) r.rotation.y+=dt*(d.landed>0?2:60); d.blink.visible=(R.t*1.3%1)<0.12;
    droneSound(d,sp);
  }
}
function droneFall(d,dt){ if(d.crashed) return; d.fallV=(d.fallV||0)+dt*14; d.y-=d.fallV*dt; d.yaw+=dt*9; d.x+=d.vx*dt*0.5; d.z+=d.vz*dt*0.5; d.g.position.set(d.x,d.y,d.z); d.g.rotation.y=d.yaw; d.g.rotation.x+=dt*3;
  const gy=(R.terrain?R.terrain(d.x,d.z):0)+0.12; if(d.y<=gy){ d.y=gy; d.crashed=true; d.g.position.y=gy; d.g.rotation.set(0.3,d.yaw,0.4); puff(d.g.position,0x55595e,10,2); sfxDroneCrash(Math.hypot(d.x-P.pos.x,d.z-P.pos.z)); if(d.snd) droneSoundStop(d);
    if(!NET.on||NET.host){ const items=[mkLoot('dronecam'),mkLoot('dronebatt')]; if(rand()<0.25) items.push(mkLoot('jammer')); if(rand()<0.3) items.push(mkLoot('blade')); const cid='w'+(NET.id||'s')+'-'+d.i+'-'+(R.bodyN++);
      if(NET.on) nsend({t:'body',cid,x:d.x,z:d.z,name:'Drone wreck',items:JSON.parse(JSON.stringify(items))}); addBody(cid,d.x,d.z,'Drone wreck',items); } } }
function droneHit(d,am,pt,remote){
  if(d.dead) return; puff(pt,0xffd27a,5,1.5); sfxPlink(); if(!remote) hitmark(false);
  if(NET.on&&!NET.host&&!remote){ nsend({t:'dhit',i:d.i,dmg:am.dmg}); return; }
  d.hp-=am.dmg; d.brain.loom+=2; if(d.hp<=0){ d.dead=true; d.fallV=0; R.targets=R.targets.filter(m=>!d.parts.includes(m)); if(!remote) msg('Drone down.'); goalBump('drones'); }
}
// a gunshot: drones within a few hundred metres fly over to look
function dronesHearShot(x,z,radius){ for(const d of (R.drones||[])){ if(d.dead||d.landed>0||jammed(d.x,d.z)) continue; const b=d.brain; if(b.mode==='track'||b.mode==='return') continue; if(Math.hypot(d.x-x,d.z-z)<Math.max(180,radius*4)){ b.last={x:x+_gauss()*10,z:z+_gauss()*10}; b.lastT=R.t; b.mode='surge'; b.modeT=R.t; } } }
// a shot past it counts as looming
function dronesShotAt(o,dir){ for(const d of (R.drones||[])){ if(d.dead) continue; const px=d.x-o.x, py=d.y-o.y, pz=d.z-o.z, along=px*dir.x+py*dir.y+pz*dir.z; if(along<0||along>150) continue; const off=Math.hypot(px-dir.x*along,py-dir.y*along,pz-dir.z*along); if(off<4) d.brain.loom+=1.2*(4-off)/4+0.4; } }
// what the host sends: [x,y,z,yaw,hp]
function droneState(){ return (R.drones||[]).map(d=>[+d.x.toFixed(1),+d.y.toFixed(1),+d.z.toFixed(1),+d.yaw.toFixed(2),Math.max(0,Math.round(d.hp))]); }
function applyDroneState(list){ if(!Array.isArray(list)) return; R.drones=R.drones||[];
  list.forEach((a,i)=>{ let d=R.drones[i]; if(!d){ d={i,gainErr:0,x:a[0],y:a[1],z:a[2],vx:0,vz:0,vy:0,yaw:a[3],yawRate:0,hp:a[4],dead:false,brain:flyBrain(a[3]),home:{x:a[0],z:a[2]}}; d.g=droneMesh(d); R.drones[i]=d; if(a[4]<=0){ d.dead=true; d.crashed=true; R.targets=R.targets.filter(m=>!d.parts.includes(m)); } }
    if(d.n){ d.vx=(a[0]-d.n[0])/0.1; d.vz=(a[2]-d.n[2])/0.1; } d.n=a; d.hp=a[4]; }); }

/* ---- sound: a buzz you can place ---- */
function droneSound(d,sp){
  const a=MUS.ctx; if(!a||!P||d.dead) return; const dx=d.x-P.pos.x, dz=d.z-P.pos.z, dist=Math.hypot(dx,dz,d.y-P.y);
  if(dist>70||d.landed>0){ if(d.snd) droneSoundStop(d); return; }
  if(!d.snd){ const g=a.createGain(); g.gain.value=0; const lp=a.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2200; const pn=a.createStereoPanner?a.createStereoPanner():null;
    const oscs=[]; for(const [f,ty,v] of [[178,'sawtooth',0.4],[183,'sawtooth',0.4],[356,'triangle',0.25],[540,'sine',0.1]]){ const o=a.createOscillator(); o.type=ty; o.frequency.value=f*(0.96+d.i*0.03); const og=a.createGain(); og.gain.value=v; o.connect(og); og.connect(lp); o.start(); oscs.push(o); }
    const lfo=a.createOscillator(), lg=a.createGain(); lfo.frequency.value=7+d.i; lg.gain.value=0.25; lfo.connect(lg); lg.connect(g.gain); lfo.start(); oscs.push(lfo);
    lp.connect(g); if(pn){ g.connect(pn); pn.connect(MUS.sfx); } else g.connect(MUS.sfx); d.snd={g,lp,pn,oscs}; }
  const rel=Math.atan2(-dx,-dz)-P.yaw, v=0.09*Math.pow(1-dist/70,1.6)*(0.8+sp*0.04);
  d.snd.g.gain.setTargetAtTime(v,a.currentTime,0.1); d.snd.lp.frequency.setTargetAtTime(Math.cos(rel)<0?1200:2400,a.currentTime,0.2); if(d.snd.pn) d.snd.pn.pan.setTargetAtTime(clamp(-Math.sin(rel)*0.8,-1,1),a.currentTime,0.1);
  for(let k=0;k<3;k++) d.snd.oscs[k].frequency.setTargetAtTime([178,183,356][k]*(0.96+d.i*0.03)*(1+sp*0.012),a.currentTime,0.2);
}
function droneSoundStop(d){ const s=d.snd; d.snd=null; if(!s) return; try{ s.g.gain.setTargetAtTime(0,MUS.ctx.currentTime,0.05); setTimeout(()=>{ for(const o of s.oscs) try{ o.stop(); }catch(e){} },300); }catch(e){} }
function sfxDroneCrash(dist){ const a=MUS.ctx; if(!a) return; const v=Math.max(0.05,1-dist/80); sfxNoise(0.4,900,0.3*v); sfxTone(220,0.3,0.1*v,'square',60); }
function dronesStop(){ for(const d of (R&&R.drones)||[]) if(d.snd) droneSoundStop(d); }
