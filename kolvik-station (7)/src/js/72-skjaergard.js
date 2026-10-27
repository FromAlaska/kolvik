/* 72-skjaergard: Skjærgård: islands, aircraft, flight model, guns, gunship sensor, autopilot, AI pilots */
/* ================= SKJÆRGÅRD: islands, airstrips and planes ================= */
// A 3 km square of sea with islands. Each team has a home island with a runway, hangar and parked planes; a village
// island, a lighthouse island and a few skerries hold loot and a handful of scavs. Planes are simulated on the
// pilot's machine (AI planes on the host's) and everyone else renders them from the network state.
const SJ={B:1500,SEA:-14};
const SJ_ISL=[
 {name:'Vestholm',x:-950,z:0,r:300,h:6,base:1},
 {name:'Austholm',x:950,z:0,r:300,h:6,base:2},
 {name:'Midtskjær',x:0,z:40,r:270,h:40,flat:24,fr:0.3,village:true},
 {name:'Fyrholmen',x:-140,z:-830,r:140,h:26,flat:16,fr:0.32,light:true},
 {name:'Selskjær',x:320,z:810,r:130,h:22,flat:12,fr:0.3,camp:true},
 {name:'Nordskjær',x:720,z:-720,r:95,h:16},
 {name:'Sørskjær',x:-660,z:680,r:105,h:18},
];
function skIsland(x,z){ for(const I of SJ_ISL){ const d=Math.hypot(x-I.x,z-I.z)/I.r; if(d<1.2) return [I,d]; } return null; }
function skRaw(x,z){
  const hit=skIsland(x,z); if(!hit) return SJ.SEA;
  const [I,d]=hit; let h;
  if(I.base) h=I.h;
  else { const cone=I.h*Math.pow(Math.max(0,1-d*d),2); const n=I.h*0.5*ridged((x+I.x)/80,(z-I.z)/80,3)*Math.max(0,1-d)*Math.max(0,1-d)+2*fbm(x/25,z/25,2)*Math.max(0,1-d);
    h=cone+n; if(I.flat) h=Math.max(h*smooth(I.fr,I.fr+0.08,d),I.flat*smooth(I.fr+0.06,I.fr,d)); }
  const w=smooth(1.15,0.95,d); return SJ.SEA+(h-SJ.SEA)*w;
}
function skTerrain(x,z){ return Math.max(skRaw(x,z),-0.6); } // wading depth: you can walk into the sea a little way
// is this a surface a plane can land on? (the base plateaus and the flat island tops)
function skPad(x,z){ const hit=skIsland(x,z); if(!hit) return false; const [I,d]=hit; return I.base?d<0.9:(!!I.flat&&d<I.fr); }
function skTile(x0,z0,size,cell,mat){
  const n=Math.round(size/cell), W=n+1; let any=false; const pos=new Float32Array(W*W*3), uv=new Float32Array(W*W*2), col=new Float32Array(W*W*3);
  for(let j=0;j<=n;j++) for(let i=0;i<=n;i++){ const x=x0+i*cell, z=z0+j*cell, k=j*W+i; const y=skRaw(x,z); if(y>-2) any=true; pos[k*3]=x; pos[k*3+1]=y; pos[k*3+2]=z; uv[k*2]=x/4; uv[k*2+1]=z/4; }
  if(!any) return null;
  const idx=[]; for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const a=j*W+i, b=a+1, c=a+W, d=c+1; idx.push(a,c,b,b,c,d); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('uv',new THREE.BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals();
  const nrm=g.attributes.normal.array; const snow=[0.93,0.95,0.97], shade=[0.7,0.78,0.88], rock=[0.38,0.4,0.43], sand=[0.55,0.52,0.46], bed=[0.12,0.2,0.26];
  for(let k=0;k<W*W;k++){ const x=pos[k*3], y=pos[k*3+1], z=pos[k*3+2], ny=nrm[k*3+1]; const r=smooth(0.55,0.75,1-ny+0.1*vnoise(x/6,z/6)), sh=smooth(0.08,0.45,1-ny)*0.6, beach=smooth(2.5,0.3,y), deep=smooth(0.2,-3,y);
    for(let q=0;q<3;q++){ let c=snow[q]+(shade[q]-snow[q])*sh; c=c+(rock[q]-c)*r; c=c+(sand[q]-c)*beach; c=c+(bed[q]-c)*deep; col[k*3+q]=c; } }
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  const m=new THREE.Mesh(g,mat); scene.add(m); return m;
}
// ---- planes ----
// Turret yaw is relative to the plane's nose (0 = straight ahead), limited to a span either side of a centre.
const PT={
 cessna:{name:'Skylark',kind:'light plane',seats:2,m:1000,S:17,T:5200,CL:5.2,CD0:0.035,hp:380,vs:22,vmax:62,gear:1.3,rad:4.5,agil:0.85,guns:{rpm:650,dmg:14,ammo:400,spread:0.014,pts:[[-1.7,2.2,-0.9],[1.7,2.2,-0.9]]},turrets:[null],bombs:0,seat:[[0,1.3,-0.9],[0,1.3,0.6]],col:0xe8e4d8},
 fighter:{name:'Hauk',kind:'fighter',seats:1,m:3000,S:28,T:30000,CL:6.2,CD0:0.028,hp:900,vs:30,vmax:135,gear:1.7,rad:5.5,agil:1.0,guns:{rpm:1100,dmg:22,ammo:700,spread:0.012,pts:[[-2.4,0.8,-1.5],[2.4,0.8,-1.5]]},turrets:[],bombs:0,seat:[[0,1.5,-0.3]],col:0x5a6b4a},
 bomber:{name:'Storm',kind:'heavy bomber',m:24000,S:200,T:150000,CL:6.0,CD0:0.03,hp:6500,vs:40,vmax:112,gear:2.8,rad:14,agil:0.42,guns:{rpm:900,dmg:22,ammo:900,spread:0.016,pts:[[-0.9,1.4,-15.3],[0.9,1.4,-15.3]]},bombs:10,seats:5,seat:[[0,4.0,-12.8],[0,2.6,-15.4],[0,4.5,-1],[0,3.0,15.6],[0,0.6,-4]],
   turrets:[{name:'nose',pos:[0,2.6,-15.4],cy:0,span:1.2,pmin:-0.6,pmax:0.6,dmg:24,rpm:900},{name:'dorsal',pos:[0,4.5,-1],cy:0,span:3.14,pmin:-0.05,pmax:1.35,dmg:24,rpm:900},{name:'tail',pos:[0,3.0,15.6],cy:Math.PI,span:1.1,pmin:-0.5,pmax:0.6,dmg:24,rpm:900},{name:'gunship sensor',pos:[0,0.6,-4],cy:0,span:3.14,pmin:-1.57,pmax:-0.1,tv:true}],col:0x8a8f93},
};
function planeModel(t,col){
  const T=PT[t], g=new THREE.Group(); const body=MC(col), dark=MC(0x24282c), glass=MB(0x9fd0ea,{transparent:true,opacity:0.28,depthWrite:false}), prop=MC(0x3a3a3a);
  const B=(w,h,d,x,y,z,m,rx=0,ry=0)=>{ const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); b.position.set(x,y,z); b.rotation.set(rx,ry,0); g.add(b); return b; };
  if(t==='cessna'){ B(1.1,1.1,6.5,0,0.9,0,body); B(11,0.18,1.5,0,2.4,-0.4,body); for(const sx of [-1,1]){ const st=B(0.08,0.9,0.08,sx*0.9,1.85,-0.2,dark); st.rotation.z=sx*0.9; } B(0.9,0.8,1.6,0,1.75,-0.6,glass); B(3.4,0.14,1.1,0,1.0,3.0,body); B(0.14,1.4,1.1,0,1.6,3.0,body); const p=B(2.0,0.14,0.08,0,0.9,-3.3,prop); g.userData.prop=p; for(const sx of [-1,1]) B(0.12,1.0,0.12,sx*0.9,0.35,-0.5,dark); B(0.12,1.0,0.12,0,0.35,2.4,dark); }
  else if(t==='fighter'){ B(1.4,1.3,9.5,0,1.1,0,body); B(11.5,0.22,2.2,0,0.8,-0.4,body); B(1.0,0.6,1.6,0,1.95,-0.6,glass); B(4.2,0.16,1.4,0,1.0,4.0,body); B(0.16,1.8,1.4,0,1.9,4.0,body); const p=B(3.0,0.18,0.1,0,1.1,-4.95,prop); g.userData.prop=p; B(1.1,1.1,1.2,0,1.0,-4.3,dark); for(const sx of [-1,1]) B(0.12,0.9,0.12,sx*1.6,0.45,-0.8,dark); }
  else { B(3.0,3.0,30,0,2.6,0,body); B(43,0.4,5.0,0,2.9,-1.5,body); B(1.6,1.0,2.6,0,4.3,-13.6,glass); B(13,0.3,3.6,0,2.8,13.5,body); B(0.3,5.5,3.4,0,5.0,13.5,body);
    for(const sx of [-1,1]) for(const k of [1,2]){ const ex=sx*(5+k*5.5); B(1.5,1.5,4.5,ex,2.6,-2.0,dark); const p=B(3.6,0.2,0.1,ex,2.6,-4.4,prop); (g.userData.props=g.userData.props||[]).push(p); }
    for(const [sx,z] of [[-1,-2],[1,-2],[0,-12]]) B(0.3,2.2,0.3,sx*5.2,0.5,z,dark);
    g.userData.turrets=[]; for(const tr of T.turrets){ const tg=new THREE.Group(); tg.position.set(...tr.pos); if(tr.tv){ const ball=new THREE.Mesh(new THREE.SphereGeometry(0.55,8,6),MC(0x2a2d30)); const lens=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.2),MB(0x1a3a46)); lens.position.set(0,0,-0.5); tg.add(ball); tg.add(lens); g.add(tg); g.userData.turrets.push(tg); continue; } const bar=B(0.12,0.12,1.6,0,0,-0.9,dark); bar.position.set(0,0,0); tg.add(bar); bar.position.set(0,0,-0.9); const ring=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.5,1.0),glass); tg.add(ring); g.add(tg); g.userData.turrets.push(tg); } }
  g.rotation.order='YXZ'; return g;
}
function addPlane(t,side,x,z,yaw,ai){
  const T=PT[t]; const pl={i:R.planes.length,t,T,side,pos:new THREE.Vector3(x,0,z),vel:new THREE.Vector3(),q:new THREE.Quaternion(),thr:0,hp:T.hp,dead:false,onG:true,ammo:T.guns?T.guns.ammo:0,bombs:T.bombs,crew:new Array(T.seats).fill(null),aim:[],home:{x,z,yaw},ai:ai||null,respT:0,gunT:0,lastHit:null,tur:T.turrets.map(()=>[0,0])};
  pl.g=planeModel(t,side===1?0x4a6b8a:side===2?0x8a4a3a:T.col); scene.add(pl.g); R.planes.push(pl); resetPlane(pl); return pl;
}
function resetPlane(pl){
  const T=pl.T; pl.dead=false; pl.ap=null; pl.hp=T.hp; pl.ammo=T.guns?T.guns.ammo:0; pl.bombs=T.bombs; pl.thr=0; pl.crew.fill(null); pl.respT=0; pl.gunT=0;
  if(pl.ai){ pl.pos.set(pl.home.x,220,pl.home.z); pl.q.setFromEuler(new THREE.Euler(0,pl.home.yaw,0,'YXZ')); pl.vel.set(-Math.sin(pl.home.yaw)*70,0,-Math.cos(pl.home.yaw)*70); pl.onG=false; pl.thr=0.85; pl.ai.tgt=null; pl.ai.evT=0; }
  else { pl.pos.set(pl.home.x,R.terrain(pl.home.x,pl.home.z)+T.gear,pl.home.z); pl.q.setFromEuler(new THREE.Euler(0,pl.home.yaw,0,'YXZ')); pl.vel.set(0,0,0); pl.onG=true; }
  pl.g.visible=true; planePose(pl);
}
// the simulated point is the gear contact height above the model origin; the model hangs below it along the aircraft's own up axis
const _pg=new THREE.Vector3();
function planePose(pl){ _pg.set(0,1,0).applyQuaternion(pl.q); pl.g.position.copy(pl.pos).addScaledVector(_pg,-pl.T.gear); pl.g.quaternion.copy(pl.q); }
const _pf=new THREE.Vector3(), _pu=new THREE.Vector3(), _pr=new THREE.Vector3(), _pt=new THREE.Vector3(), _pq=new THREE.Quaternion(), _pe=new THREE.Euler(), _lv=new THREE.Vector3(), _ld=new THREE.Vector3();
function planeAxes(pl){ _pf.set(0,0,-1).applyQuaternion(pl.q); _pu.set(0,1,0).applyQuaternion(pl.q); _pr.set(1,0,0).applyQuaternion(pl.q); }
function planeDie(pl,cause,by){
  if(pl.dead) return; pl.dead=true; pl.hp=0; pl.respT=pl.ai?90:60; pl.thr=0;
  const pt=pl.pos.clone(); puff(pt,0xffa040,18,6); puff(pt,0x3a3a3a,14,4); const dd=pl.pos.distanceTo(camera.position); sfxNoise(1.0,240,0.8*Math.max(0.06,1-dd/400)); sfxTone(50,0.8,0.4*Math.max(0.06,1-dd/400),'sine',24);
  pl.g.visible=false;
  if(R.fly&&R.fly.i===pl.i){ R.fly=null; P.pos.x=pl.pos.x; P.pos.z=pl.pos.z; P.y=pl.pos.y; const who=by&&NET.players[by]?NET.players[by].name:null; die(who?`Shot down by ${who} in a ${pl.T.name}`:cause||`Went down in a ${pl.T.name}`); }
  pl.crew.fill(null);
}
function planeDamage(pl,dmg,by){
  if(pl.dead) return;
  if(pl.ai){ if(!NET.on||NET.host){ pl.hp-=dmg; pl.ai.hurtT=R.t; if(pl.hp<=0) planeDie(pl,'Shot down',by); } else nsend({t:'adm',i:pl.i,dmg:Math.round(dmg)}); return; }
  const pilot=pl.crew[0];
  if(flownByMe(pl)){ pl.hp-=dmg; pl.lastHit=by||null; if(by&&by!=='me'){ R.lastHitBy=by; R.lastHitT=R.t; } hitDir(P.pos.x+20,P.pos.z,false); if(pl.hp<=0){ nsend({t:'pev',k:'dead',i:pl.i,by:by||null}); planeDie(pl,'Shot down',by); } return; }
  if(pilot){ nsend({t:'pdmg',pid:pilot,i:pl.i,dmg:Math.round(dmg),ai:by?0:1}); return; }
  pl.hp-=dmg; nsend({t:'pev',k:'dmg',i:pl.i,dmg:Math.round(dmg)}); if(pl.hp<=0) planeDie(pl,'Destroyed',by);
}
// ---- flight model: lift, drag, thrust and gravity on the velocity; the stick commands body rates that need airspeed ----
function planeStep(pl,ctl,dt){
  const T=pl.T; planeAxes(pl); const f=_pf, u=_pu, r=_pr; const V=pl.vel.length();
  const vf=pl.vel.dot(f), vu=pl.vel.dot(u), vr=pl.vel.dot(r);
  const alpha=Math.atan2(-vu,Math.max(vf,1)), beta=Math.atan2(vr,Math.max(vf,1)), qd=0.6*V*V;
  let CL=T.CL*clamp(alpha,-0.42,0.42); if(Math.abs(alpha)>0.3) CL*=Math.max(0.4,1-(Math.abs(alpha)-0.3)*1.6);
  const L=qd*T.S*CL, CD=T.CD0+CL*CL/(Math.PI*7*0.8)+(pl.onG?0.06:0)+(ctl.brake&&!pl.onG?0.08:0), D=qd*T.S*CD;
  const thrust=T.T*pl.thr*Math.max(0.2,1-0.6*V/T.vmax);
  // lift is perpendicular to the airflow, not to the fuselage: the component of 'up' at right angles to the velocity
  if(V>1){ _lv.copy(pl.vel).multiplyScalar(1/V); _ld.copy(u).addScaledVector(_lv,-u.dot(_lv)); const ll=_ld.length(); if(ll>1e-3) _ld.multiplyScalar(1/ll); else _ld.copy(u); } else _ld.copy(u);
  _pt.set(0,0,0); _pt.addScaledVector(_ld,L); _pt.addScaledVector(f,thrust); _pt.addScaledVector(r,-qd*T.S*0.9*beta); if(V>0.01) _pt.addScaledVector(pl.vel,-D/V);
  _pt.multiplyScalar(1/T.m); _pt.y-=9.81;
  // body rates
  const auth=clamp(V/(T.vs*1.3),0,1.25)*T.agil; let p=ctl.roll*2.4*auth, qr=ctl.pitch*1.5*auth-alpha*2.2*auth, rr=ctl.yaw*0.7*auth-beta*1.6*auth;
  const gy=Math.max(R.terrain(pl.pos.x,pl.pos.z),0)+T.gear;
  if(pl.onG){
    const bank=-Math.asin(clamp(r.y,-1,1)), pitch=Math.asin(clamp(f.y,-1,1));
    p=-bank*6; rr=ctl.yaw*1.6*clamp(V/3,0,1)-beta*2; qr=V>T.vs*0.7?ctl.pitch*1.3*Math.max(auth,0.5):-pitch*5;
    // tyres: no sideways travel, rolling and braking friction, and the ground holds you up
    const side=pl.vel.dot(r); pl.vel.addScaledVector(r,-side*Math.min(1,dt*14));
    const brake=ctl.brake?6:0.6; if(V>0.05) pl.vel.addScaledVector(pl.vel,-Math.min(1,brake*dt/Math.max(V,1)));
    if(_pt.y<0) _pt.y=0;
    pl.vel.addScaledVector(_pt,dt); pl.pos.addScaledVector(pl.vel,dt);
    if(pl.pos.y<=gy){ pl.pos.y=gy; if(pl.vel.y<0) pl.vel.y=0; } else if(pl.pos.y>gy+0.3) pl.onG=false;
  } else {
    pl.vel.addScaledVector(_pt,dt); pl.pos.addScaledVector(pl.vel,dt);
    if(pl.pos.y<=gy){ // touching down, or hitting the ground or the sea
      const bank=Math.abs(Math.asin(clamp(r.y,-1,1))), pitch=Math.asin(clamp(f.y,-1,1)); const water=R.terrain(pl.pos.x,pl.pos.z)<0.3;
      R.crashWhy=[water,skPad(pl.pos.x,pl.pos.z),+pl.vel.y.toFixed(1),+bank.toFixed(2),+pitch.toFixed(2),Math.round(V)];
      if(!water&&skPad(pl.pos.x,pl.pos.z)&&pl.vel.y>-8&&bank<0.4&&pitch>-0.2&&pitch<0.35&&V<T.vs*1.9){ pl.onG=true; pl.pos.y=gy; pl.vel.y=0; const yaw=Math.atan2(-f.x,-f.z); pl.q.setFromEuler(_pe.set(0,yaw,0,'YXZ')); }
      else { pl.pos.y=gy; planeDie(pl,water?`Went into the sea in a ${T.name}`:`Flew a ${T.name} into the ground`,null); if(NET.on&&pl.crew[0]==='me') nsend({t:'pev',k:'dead',i:pl.i,by:null}); return; }
    }
  }
  if(!pl.onG||V>0.5){ _pq.setFromAxisAngle(_pr.set(1,0,0),qr*dt); pl.q.multiply(_pq); _pq.setFromAxisAngle(_pr.set(0,1,0),rr*dt); pl.q.multiply(_pq); _pq.setFromAxisAngle(_pr.set(0,0,1),-p*dt); pl.q.multiply(_pq); pl.q.normalize(); }
  // the edge of the chart
  const B=SJ.B-20; if(Math.abs(pl.pos.x)>B||Math.abs(pl.pos.z)>B){ pl.pos.x=clamp(pl.pos.x,-B,B); pl.pos.z=clamp(pl.pos.z,-B,B); if(pl.crew[0]==='me'&&(!R.edgeT||R.t-R.edgeT>4)){ R.edgeT=R.t; msg('Edge of the chart: turn back.'); } }
  planePose(pl); if(pl.g.userData.prop) pl.g.userData.prop.rotation.z+=dt*(8+pl.thr*40); if(pl.g.userData.props) for(const pr of pl.g.userData.props) pr.rotation.z+=dt*(8+pl.thr*40);
}
// turn the nose toward a wanted direction: bank into the turn, pull, and use rudder on the ground
function steerTo(pl,d,keys){
  planeAxes(pl); const eu=d.dot(_pu), er=d.dot(_pr); const bankR=-Math.asin(clamp(_pr.y,-1,1));
  const wantBank=clamp(er*2.4,-1.15,1.15); let roll=clamp((wantBank-bankR)*2.2,-1,1); if(keys){ if(keys.KeyA) roll-=1; if(keys.KeyD) roll+=1; roll=clamp(roll,-1,1); }
  const pitch=clamp(eu*3.2+0.5*Math.abs(Math.sin(bankR))*(d.dot(_pf)>0?1:0),-1,1);
  const yaw=clamp(-er*1.4,-1,1);
  return {roll,pitch,yaw};
}
function lookDir(out,yaw,pitch){ return out.set(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)); }
// ---- guns and bombs ----
const _go=new THREE.Vector3(), _gd=new THREE.Vector3(), _gs=new THREE.Vector3();
function gunShot(pl,origin,dir,dmg,by,spread){
  _gd.copy(dir); if(spread){ _gd.x+=(rand()-0.5)*2*spread; _gd.y+=(rand()-0.5)*2*spread; _gd.z+=(rand()-0.5)*2*spread; _gd.normalize(); }
  let best=700, hitPl=null, hitObj=null;
  for(const o of R.planes){ if(o===pl||o.dead) continue; _gs.copy(o.pos).sub(origin); const tca=_gs.dot(_gd); if(tca<0||tca>best) continue; const d2=_gs.lengthSq()-tca*tca; const rr=o.T.rad*(o.onG?1:1.15); if(d2<rr*rr){ best=tca; hitPl=o; } }
  ray.set(origin,_gd); ray.far=best; const hs=ray.intersectObjects(R.targets,false); for(const h of hs){ const ud=h.object.userData; if(ud.enemy&&ud.enemy.dead) continue; if(ud.player&&NET.players[ud.player]&&NET.players[ud.player].st&&NET.players[ud.player].st.dead) continue; best=h.distance; hitObj=h; hitPl=null; break; }
  ray.far=best; const w=ray.intersectObjects(R.ray,false)[0]; if(w){ best=w.distance; hitObj=w; hitPl=null; }
  const ex=origin.x+_gd.x*best, ey=origin.y+_gd.y*best, ez=origin.z+_gd.z*best; tracer(origin.x,origin.y,origin.z,ex,ey,ez,0xffe39a);
  if(hitPl){ puff(new THREE.Vector3(ex,ey,ez),0xffc070,4,2); if(by==='me') hitmark(false); planeDamage(hitPl,dmg,by); }
  else if(hitObj&&hitObj.object.userData.enemy){ if(!NET.on||NET.host) hitEnemy(hitObj.object.userData.enemy,hitObj.object.userData.part,{dmg,pen:38,id:'a762'},hitObj.point,by==='me'?undefined:by); else if(by==='me') hitEnemy(hitObj.object.userData.enemy,hitObj.object.userData.part,ITEMS.a762,hitObj.point); }
  else if(hitObj&&hitObj.object.userData.player){ const id=hitObj.object.userData.player; if(by==='me'){ if(isMate(id)) friendlyFire(id,hitObj.point); else { puff(hitObj.point,0x8a1010,6,1.5); hitmark(false); nsend({t:'phit',pid:id,part:hitObj.object.userData.part,ammo:'a762'}); } } else if(hitObj.object.userData.player&&pl.ai&&(!NET.on||NET.host)) nsend({t:'eshot',pid:id,hits:1,dmg:dmg,pen:38,name:`a ${pl.T.name}`}); }
  else if(hitObj) puff(hitObj.point,0xc9d2d6,3,1.4);
}
function fireFixed(pl,by,dt){
  const G=pl.T.guns; if(!G||pl.ammo<=0) return; pl.gunT-=dt; if(pl.gunT>0) return; pl.gunT=60/G.rpm; pl.ammo--;
  planeAxes(pl); for(const gp of (G.pts||[[-1.6,0,-1.5],[1.6,0,-1.5]])){ modelPt(pl,gp,_go); gunShot(pl,_go,_pf,G.dmg,by,pl.ai?G.spread*1.8:G.spread); }
  const dd=pl.pos.distanceTo(camera.position); sfxShot('akr',dd,1); if(by==='me'){ flashAt(_go.x,_go.y,_go.z,true); P.kick=0.4; }
}
function turretDir(pl,s,yawL,pitchL,out){ const tr=pl.T.turrets[s-1]; const dy=((yawL-tr.cy+Math.PI*3)%(Math.PI*2))-Math.PI; const y=tr.cy+clamp(dy,-tr.span,tr.span), p=clamp(pitchL,tr.pmin,tr.pmax); out.set(-Math.sin(y)*Math.cos(p),Math.sin(p),-Math.cos(y)*Math.cos(p)).applyQuaternion(pl.q); return out; }
function modelPt(pl,p,out){ _pg.set(0,1,0).applyQuaternion(pl.q); return out.set(p[0],p[1],p[2]).applyQuaternion(pl.q).add(pl.pos).addScaledVector(_pg,-pl.T.gear); }
function turretPos(pl,s,out){ const tr=pl.T.turrets[s-1]; _pg.set(0,1,0).applyQuaternion(pl.q); return out.set(...tr.pos).applyQuaternion(pl.q).add(pl.pos).addScaledVector(_pg,-pl.T.gear); }
function fireTurret(pl,s,yawL,pitchL,by,dt){
  const tr=pl.T.turrets[s-1]; pl.tgT=pl.tgT||[]; pl.tgT[s]=(pl.tgT[s]||0)-dt; if(pl.tgT[s]>0) return; pl.tgT[s]=60/tr.rpm;
  turretDir(pl,s,yawL,pitchL,_gd); turretPos(pl,s,_go); _go.addScaledVector(_gd,1.2); gunShot(pl,_go,_gd,tr.dmg,by,0.014);
  const dd=pl.pos.distanceTo(camera.position); sfxShot('akr',dd,1); if(by==='me') P.kick=0.3;
}
function dropBomb(pl){
  if(pl.bombs<=0||pl.onG) return; pl.bombs--; planeAxes(pl); const m=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,1.6),MC(0x2a2d30)); m.position.copy(pl.pos).addScaledVector(_pu,-2.5); scene.add(m);
  (R.bombs=R.bombs||[]).push({pos:m.position,vel:pl.vel.clone(),m,mine:pl.crew[0]==='me'});
}
function boomAt(x,y,z,mine,sc=1){
  const pt=new THREE.Vector3(x,y+0.5,z); puff(pt,0xffa040,Math.round(22*Math.sqrt(sc))+2,7*Math.sqrt(sc)); puff(pt,0x4a4a4a,Math.round(16*Math.sqrt(sc))+2,4.5*Math.sqrt(sc)); flashAt(x,y+1,z); const dd=Math.hypot(P.pos.x-x,P.y-y,P.pos.z-z);
  sfxNoise(0.5+0.6*Math.min(1,sc),sc<0.5?600:220,0.9*Math.min(1,sc+0.3)*Math.max(0.06,1-dd/220)); if(sc>=0.5) sfxTone(48,0.9,0.45*Math.max(0.06,1-dd/220),'sine',30); P.shake=Math.max(P.shake||0,Math.max(0,1-dd/(60*sc)));
  const rP=18*sc, rE=16*Math.max(0.35,sc), rA=22*sc;
  if(dd<rP&&!P.dead&&!(R.fly&&R.planes[R.fly.i]&&!R.planes[R.fly.i].onG)){ const d=120*sc*(1-dd/rP); playerHit(d,60,sc<1?'gunship fire':'a bomb'); }
  if(mine||!NET.on||NET.host){ for(const e of R.enemies){ if(e.dead) continue; const d=Math.hypot(e.pos.x-x,e.pos.z-z); if(d<rE) hitEnemy(e,'thorax',{dmg:(140*(1-d/rE)+20)*Math.min(1,sc*1.6),pen:60,id:'a762'},e.pos.clone()); } }
  for(const o of R.planes){ if(o.dead) continue; const d=o.pos.distanceTo(pt); if(d<rA&&(mine||(o.crew[0]!=='me'&&!o.ai))) planeDamage(o,500*sc*(1-d/rA),mine?'me':null); }
}
function updBombs(dt){
  if(!R.bombs) return;
  for(let i=R.bombs.length-1;i>=0;i--){ const b=R.bombs[i]; b.vel.y-=9.81*dt; b.vel.multiplyScalar(1-0.02*dt); b.pos.addScaledVector(b.vel,dt); b.m.lookAt(b.pos.x+b.vel.x,b.pos.y+b.vel.y,b.pos.z+b.vel.z);
    const gy=Math.max(R.terrain(b.pos.x,b.pos.z),0); if(b.pos.y<=gy+0.3){ scene.remove(b.m); R.bombs.splice(i,1); boomAt(b.pos.x,gy,b.pos.z,b.mine); if(b.mine&&NET.on) nsend({t:'pev',k:'boom',x:+b.pos.x.toFixed(1),y:+gy.toFixed(1),z:+b.pos.z.toFixed(1)}); } }
}
// ---- boarding, the pilot's seat, gunner seats, bailing out ----
function nearPlane(){ let best=null,bd=7; for(const pl of R.planes){ if(pl.dead) continue; const d=Math.hypot(pl.pos.x-P.pos.x,pl.pos.z-P.pos.z)-pl.T.rad*0.5; if(d<bd&&Math.abs(pl.pos.y-P.y)<4){ bd=d; best=pl; } } return best; }
function airKey(){
  if(R.fly){ const pl=R.planes[R.fly.i]; if(!pl||pl.dead){ R.fly=null; return true; } const V=pl.vel.length(); if(!pl.onG||V>3){ msg('Land first, or X to bail out.'); return true; }
    pl.crew[R.fly.seat]=null; planeAxes(pl); if(R.fly.seat>0) P.yaw=Math.atan2(-_pf.x,-_pf.z)+P.yaw; R.fly=null; P.pos.x=pl.pos.x+_pr.x*(pl.T.rad*0.7+1.5); P.pos.z=pl.pos.z+_pr.z*(pl.T.rad*0.7+1.5); P.y=groundAt(P.pos.x,P.pos.z,P.y+2); P.vy=0; P.pitch=clamp(P.pitch,-1.4,1.4); return true; }
  const pl=nearPlane(); if(!pl) return false;
  if(!pl.onG&&pl.pos.y>R.terrain(pl.pos.x,pl.pos.z)+6) return false;
  let seat=-1; for(let s=0;s<pl.T.seats;s++) if(!pl.crew[s]){ seat=s; break; }
  if(seat<0){ msg(`The ${pl.T.name} is full.`); return true; }
  if(seat===0&&pl.side&&R.side&&pl.side!==R.side){ msg(`That's the other side's ${pl.T.name}.`); return true; }
  pl.crew[seat]='me'; R.fly={i:pl.i,seat,hand:seat>0&&!pl.T.turrets[seat-1],tv:seat>0&&!!pl.T.turrets[seat-1]&&!!pl.T.turrets[seat-1].tv}; P.sprint=false; P.crouch=false; P.keys={}; P.trigger=false;
  R.stick={x:0,y:0}; if(seat===0){ planeAxes(pl); P.yaw=Math.atan2(-_pf.x,-_pf.z); P.pitch=0.02; if(P.slot==='primary') P.slot=S.eq.secondary?'secondary':'fists'; msg(`${pl.T.name}: W/S throttle, A/D steer on the ground. ${OPTS.chase?'Chase view: the plane flies toward where you point':'Cockpit: the mouse is your stick (up is nose up), A/D rudder'}; V switches views. Click fires${pl.T.bombs?', G drops a bomb':''}. E gets out once you've landed, X bails out.`); }
  else { P.yaw=seat>0&&pl.T.turrets[seat-1]?pl.T.turrets[seat-1].cy:0; P.pitch=0; }
  if(seat>0) msg(R.fly.hand?`Riding in the ${pl.T.name}. Your own gun works from the seat.`:`${pl.T.turrets[seat-1].name} turret: mouse aims, click fires. E gets out on the ground, X bails out.`);
  return true;
}
function bailOut(){
  if(!R.fly) return; const pl=R.planes[R.fly.i]; pl.crew[R.fly.seat]=null; planeAxes(pl); if(R.fly.seat>0) P.yaw=Math.atan2(-_pf.x,-_pf.z)+P.yaw; R.fly=null;
  P.pos.x=pl.pos.x; P.pos.z=pl.pos.z; P.y=pl.pos.y; P.vx=pl.vel.x*0.6; P.vz=pl.vel.z*0.6; P.vy=Math.min(0,pl.vel.y); P.para={t:0}; P.pitch=clamp(P.pitch,-1.4,1.4); msg('Bailed out. Steer with WASD, the chute does the rest.'); sfxNoise(0.4,900,0.3);
}
function flyPrompt(){
  if(R.fly){ const pl=R.planes[R.fly.i]; if(!pl) return ''; return pl.onG&&pl.vel.length()<3?'<kbd>E</kbd>Get out':'<kbd>X</kbd>Bail out'; }
  const pl=nearPlane(); if(!pl) return ''; const free=pl.crew.findIndex(c=>!c); if(free<0) return `${pl.T.name}: full`;
  if(free===0&&pl.side&&R.side&&pl.side!==R.side) return `<kbd>E</kbd>${pl.T.name} (enemy aircraft)`;
  return `<kbd>E</kbd>${free===0?'Fly the':'Board the'} ${pl.T.name}${free>0?(pl.T.turrets[free-1]?' · '+pl.T.turrets[free-1].name+(pl.T.turrets[free-1].tv?'':' gun'):' · passenger'):''}`;
}
const _fd=new THREE.Vector3();
/* ---- gunship sensor: a stabilised thermal camera under the Storm's belly with a 25 mm cannon and a 105 mm gun ---- */
const TVW=[{name:'25 mm',rpm:420,reload:0,scale:0.28,direct:70,spread:0.0025},{name:'105 mm',rpm:0,reload:4.5,scale:1.1,direct:400,spread:0.0008}];
const TVZ=[38,18,8];
const _tvR=new THREE.Raycaster();
const THERM={hot:new THREE.MeshBasicMaterial({color:0x000000,fog:false}),sky:new THREE.Color(0xd8d8d8)};
function tvStep(pl,dt,can){
  const tv=R.tv||(R.tv={w:0,z:1,cool:0,load:[0,0],shells:[0,0]});
  tv.cool-=dt; for(let k=0;k<2;k++) tv.load[k]=Math.max(0,tv.load[k]-dt);
  P.pitch=clamp(P.pitch,-1.56,-0.12);
  if(can&&P.trigger&&tv.cool<=0&&tv.load[tv.w]<=0){ const W=TVW[tv.w]; if(W.rpm){ tv.cool=60/W.rpm; } else { tv.load[tv.w]=W.reload; P.trigger=false; } tvFire(pl,W); }
}
function tvFire(pl,W){
  const o=turretPos(pl,4,_go); lookDir(_gd,P.yaw,P.pitch); _gd.x+=(rand()-0.5)*2*W.spread; _gd.z+=(rand()-0.5)*2*W.spread; _gd.normalize();
  _tvR.set(o,_gd); _tvR.far=3000; let best=null;
  const hs=_tvR.intersectObjects(R.targets,false); for(const h of hs){ const ud=h.object.userData; if(ud.enemy&&ud.enemy.dead) continue; best=h; break; }
  const w=_tvR.intersectObjects(R.ray,false)[0]; if(w&&(!best||w.distance<best.distance)) best=w;
  if(!best){ const t=(o.y-0)/Math.max(0.01,-_gd.y); best={point:o.clone().addScaledVector(_gd,t),object:null}; }
  const pt=best.point; tracer(o.x,o.y,o.z,pt.x,pt.y,pt.z,W.scale>1?0xfff0c0:0xffe39a);
  const ud=best.object&&best.object.userData;
  if(ud&&ud.enemy) hitEnemy(ud.enemy,ud.part,{dmg:W.direct,pen:80,id:'a762'},pt);
  else if(ud&&ud.player&&!isMate(ud.player)) nsend({t:'phit',pid:ud.player,part:ud.part,ammo:W.scale>1?'a762':'a545'});
  // the shell lands a moment later (time of flight from the orbit)
  const delay=Math.min(1.6,best.point.distanceTo(o)/900), sc=W.scale, x=pt.x, y=pt.y, z=pt.z;
  setTimeout(()=>{ if(!R) return; boomAt(x,y,z,true,sc); if(NET.on) nsend({t:'pev',k:'boom',x:+x.toFixed(1),y:+y.toFixed(1),z:+z.toFixed(1),dmg:Math.round(sc*100)}); },delay*1000);
  const dd=pl.pos.distanceTo(camera.position); sfxShot(W.scale>1?'nord':'akr',dd*0.3,1); P.kick=W.scale>1?1:0.25; P.shake=W.scale>1?0.35:0.06;
}
function tvHud(){
  const el=$('#tvhud'); const on=!!(R&&R.fly&&R.fly.tv&&!P.dead); document.getElementById('cv').classList.toggle('thermal',on); document.body.classList.toggle('tvmode',on); if(!on){ if(!el.hidden) el.hidden=true; return; } el.hidden=false;
  const pl=R.planes[R.fly.i], tv=R.tv||{w:0,z:1,load:[0,0]}; const W=TVW[tv.w]; lookDir(_gd,P.yaw,P.pitch);
  const o=turretPos(pl,4,_go); const t=(o.y-0)/Math.max(0.01,-_gd.y); const rng=Math.round(Math.min(9999,t)); const alt=Math.round(pl.pos.y);
  const ld=tv.load[tv.w]; const html=`<div class="tvx"><i></i><i></i><i></i><i></i></div><div class="tvl">FLIR · WHT<br>${TVZ[tv.z]}° FOV<br>ALT ${alt} m<br>RNG ${rng} m</div><div class="tvr"><b class="${tv.w===0?'on':''}">25 mm</b><b class="${tv.w===1?'on':''}">105 mm ${tv.load[1]>0?tv.load[1].toFixed(1)+'s':'READY'}</b><small>Q weapon · scroll zoom · ${pl.ap?(pl.ap.orbit?'orbiting':'autopilot'):(pl.crew[0]?'pilot flying':'NOBODY FLYING')}</small></div>${ld>0?'<div class="tvload">RELOADING</div>':''}`;
  if(el._h!==html){ el._h=html; el.innerHTML=html; }
}
// autopilot: hold the heading and height it was engaged at (or a gentle orbit), keep the wings level, stay off the water
function apCtl(pl){
  const A=pl.ap; planeAxes(pl); const alt=pl.pos.y-Math.max(R.terrain(pl.pos.x,pl.pos.z),0);
  let hdg=A.hdg; if(A.orbit){ A.hdg+=0.12*(1/60); hdg=A.hdg; }
  const want=Math.max(A.alt,Math.max(R.terrain(pl.pos.x+pl.vel.x*4,pl.pos.z+pl.vel.z*4),0)+60);
  const climb=clamp((want-pl.pos.y)*0.012-pl.vel.y*0.02,-0.25,0.3);
  _fd.set(-Math.sin(hdg),0,-Math.cos(hdg)); _fd.y=climb; _fd.normalize();
  const c=steerTo(pl,_fd,null); c.brake=false;
  // the edge of the chart: turn back toward the middle
  if(Math.abs(pl.pos.x)>SJ.B-250||Math.abs(pl.pos.z)>SJ.B-250){ A.hdg=Math.atan2(pl.pos.x,pl.pos.z); }
  pl.thr=pl.vel.length()<pl.T.vs*1.5?Math.min(1,pl.thr+0.02):Math.max(A.thr,pl.thr-0.01);
  return c;
}
function apToggle(pl,on,orbit){
  if(on){ planeAxes(pl); pl.ap={hdg:Math.atan2(-_pf.x,-_pf.z),alt:Math.max(pl.pos.y,Math.max(R.terrain(pl.pos.x,pl.pos.z),0)+80),thr:Math.max(0.55,pl.thr),orbit:!!orbit}; msg(`Autopilot on: ${orbit?'circling':'holding heading'} at ${Math.round(pl.ap.alt)} m. Z to take control${orbit?'':', Shift+Z to circle instead'}.`); sfxBeep(); }
  else if(pl.ap){ pl.ap=null; msg('Autopilot off: you have control.'); sfxBeep(); }
}
const flownByMe=pl=>pl.crew[0]==='me'||(!!pl.ap&&!!R.fly&&R.fly.i===pl.i&&!pl.crew[0]);
// move to another seat in the same aircraft (1 pilot, 2-4 the gun positions); leaving the controls in the air engages the autopilot
function seatSwap(n){
  const pl=R.planes[R.fly.i]; if(!pl||n<0||n>=pl.T.seats||n===R.fly.seat) return; if(pl.crew[n]&&pl.crew[n]!=='me'){ msg('That seat is taken.'); return; }
  if(R.fly.seat===0&&!pl.onG&&!pl.ap) apToggle(pl,true,!!(pl.T.turrets[n-1]&&pl.T.turrets[n-1].tv));
  pl.crew[R.fly.seat]=null; pl.crew[n]='me'; R.fly.seat=n; R.fly.hand=n>0&&!pl.T.turrets[n-1]; R.fly.tv=n>0&&!!pl.T.turrets[n-1]&&!!pl.T.turrets[n-1].tv; R.stick={x:0,y:0};
  if(R.fly.tv&&!pl.onG&&pl.ap&&!pl.ap.orbit&&!pl.crew[0]){ pl.ap.orbit=true; msg('Autopilot circling for the gunship.'); }
  if(n===0){ R.fly.tv=false; planeAxes(pl); P.yaw=Math.atan2(-_pf.x,-_pf.z); P.pitch=0; msg(pl.ap?'Back at the controls. The autopilot is still flying: Z to take over.':'At the controls.'); }
  else if(R.fly.tv){ planeAxes(pl); P.yaw=Math.atan2(-_pf.x,-_pf.z)+Math.PI/2; P.pitch=-0.9; msg('Gunship sensor: mouse aims, click fires, Q switches 25 mm / 105 mm, scroll zooms. Hot bodies show white.'); }
  else { P.yaw=pl.T.turrets[n-1]?pl.T.turrets[n-1].cy:0; P.pitch=0; msg(R.fly.hand?'Passenger seat: your own gun.':`${pl.T.turrets[n-1].name} gun. ${pl.ap?'The autopilot is flying.':'Nobody is flying!'} 1 goes back to the controls.`); }
}
function flyStep(dt,can){
  const pl=R.planes[R.fly.i]; if(!pl||pl.dead){ R.fly=null; return; } const k=P.keys, T=pl.T;
  if(R.fly.seat===0){
    if(can){ pl.thr=clamp(pl.thr+((k.KeyW?1:0)-(k.KeyS?1:0))*dt*0.6,0,1); if(pl.ap&&(k.KeyW||k.KeyS)) pl.ap.thr=pl.thr; }
    if(pl.ap&&R.stick&&(Math.abs(R.stick.x)>0.12||Math.abs(R.stick.y)>0.12)) apToggle(pl,false);
    if(pl.ap&&pl.onG) pl.ap=null;
    let ctl; planeAxes(pl); const heading=Math.atan2(-_pf.x,-_pf.z), bankNow=-Math.asin(clamp(_pr.y,-1,1));
    if(!OPTS.chase){ // cockpit: the mouse is the stick (up = nose up, sideways = roll) and springs back to centre; A/D is the rudder
      const st=R.stick||(R.stick={x:0,y:0}); ctl={pitch:clamp(st.y*3.5,-1,1),roll:clamp(st.x*3.5,-1,1),yaw:can?((k.KeyA?1:0)-(k.KeyD?1:0))*0.6:0};
      if(Math.abs(st.x)<0.03) ctl.roll+=clamp(-bankNow*1.0,-0.6,0.6); // hands off: the wings ease back toward level
      const dec=Math.exp(-dt*7); st.x*=dec; st.y*=dec; P.yaw=heading; P.pitch=Math.asin(clamp(_pf.y,-1,1));
    } else { lookDir(_fd,P.yaw,P.pitch); ctl=steerTo(pl,_fd,can?k:null); }
    if(pl.ap){ ctl=apCtl(pl); if(OPTS.chase){ planeAxes(pl); } }
    ctl.brake=can&&k.KeyS&&pl.thr<=0.01;
    if(pl.onG&&can){ ctl.yaw=clamp((OPTS.chase?ctl.yaw*0.5:0)+((k.KeyA?1:0)-(k.KeyD?1:0)),-1,1); ctl.roll=0; } // on the ground A/D steer the nose wheel
    else { // flight envelope protection: the nose only rises as far as the wing can carry at this speed, and the sea pushes it back up
      planeAxes(pl); const V=pl.vel.length(), aoa=Math.atan2(-pl.vel.dot(_pu),Math.max(pl.vel.dot(_pf),1)), alt=pl.pos.y-Math.max(R.terrain(pl.pos.x,pl.pos.z),0);
      if(ctl.pitch>0&&OPTS.aoa!=='off'){ const lim=clamp((0.26-aoa)*6,0,1)*clamp((V-T.vs*0.95)/(T.vs*0.35),0.12,1); ctl.pitch=Math.min(ctl.pitch,lim); }
      // terrain ahead: where will we be in 1 to 4 seconds, and how high is the ground there?
      let tti=pl.vel.y<-0.5?alt/-pl.vel.y:99; for(const tt of [1,2,3,4]){ const gx=pl.pos.x+pl.vel.x*tt, gz=pl.pos.z+pl.vel.z*tt; const gh=Math.max(R.terrain(gx,gz),0), need=gh>0.3?28:12; const margin=pl.pos.y+pl.vel.y*tt-gh; if(margin<need&&!skPad(gx,gz)) tti=Math.min(tti,tt*Math.max(0.2,margin/need)); }
      if(tti<4&&!skPad(pl.pos.x,pl.pos.z)&&V>T.vs*1.05){ if(OPTS.pullup!=='off') R.assistT=R.t+0.8; if(tti<2.5&&(!R.pullT||R.t-R.pullT>3)){ R.pullT=R.t; msg(OPTS.pullup==='off'?'Terrain!':'Pull up: terrain.'); sfxBeep(); } }
      if(R.assistT>R.t){ ctl.pitch=Math.max(ctl.pitch,0.7); ctl.roll=clamp(Math.asin(clamp(_pr.y,-1,1))*2,-1,1); }
    }
    const n=Math.max(1,Math.min(6,Math.round(dt*120))); for(let i=0;i<n;i++){ planeStep(pl,ctl,dt/n); if(pl.dead) return; }
    if(can&&P.trigger) fireFixed(pl,'me',dt); else pl.gunT=Math.min(pl.gunT,0.02);
    if(can&&k.KeyG&&!R.bombK){ R.bombK=true; dropBomb(pl); if(!T.bombs) msg('No bombs on this aircraft.'); } if(!k.KeyG) R.bombK=false;
    if(!pl.onG&&pl.vel.length()<T.vs*1.0&&(!R.stallT||R.t-R.stallT>2)){ R.stallT=R.t; msg('Stall: nose down, throttle up.'); sfxBeep(); }
  } else {
    // a gunner: aim is relative to the plane and limited by the mount
    if(R.fly.tv){ tvStep(pl,dt,can); R.fly.aim=[0,0]; }
    else if(!R.fly.hand){ const yawL=P.yaw, pitchL=P.pitch; R.fly.aim=[yawL,pitchL]; pl.aim[R.fly.seat]=R.fly.aim;
      if(can&&P.trigger) fireTurret(pl,R.fly.seat,yawL,pitchL,'me',dt); }
    if(!pl.crew[0]&&!pl.onG){ const n=Math.max(1,Math.min(6,Math.round(dt*120))); for(let i=0;i<n;i++){ planeStep(pl,pl.ap?apCtl(pl):{roll:0,pitch:-0.3,yaw:0},dt/n); if(pl.dead) return; } } // the autopilot flies; with nobody at all, it falls
  }
  P.pos.x=pl.pos.x; P.pos.z=pl.pos.z; P.y=pl.pos.y-T.gear; P.vx=pl.vel.x; P.vz=pl.vel.z; P.vy=0; P.sprint=false; P.crouch=false;
  if(R.engine2){ const v=0.05+pl.thr*0.2*(R.fly.seat===0?1:0.6); soundVol(R.engine2,v); if(MUS.ctx) R.engine2.lfo.frequency.setTargetAtTime(10+pl.thr*50+pl.vel.length()*0.2,MUS.ctx.currentTime,0.15); }
}
const _cc=new THREE.Vector3(), _cl=new THREE.Vector3();
function flyCam(){
  const pl=R.planes[R.fly.i]; if(!pl) return; planeAxes(pl); const s=R.fly.seat; let sp;
  if(OPTS.chase&&(s===0||R.fly.hand)){ // chase camera: behind and above, easing after the aircraft, looking where the nose points
    const d=pl.T.rad*2.6+4, h=pl.T.rad*1.1+2.5; _cc.copy(pl.pos).addScaledVector(_pf,-d).addScaledVector(_pu,h);
    if(!R.chaseP){ R.chaseP=_cc.clone(); } else R.chaseP.lerp(_cc,0.6);
    camera.position.copy(R.chaseP); _cl.copy(pl.pos).addScaledVector(_pf,pl.T.rad*2.5); camera.up.copy(_pu); camera.lookAt(_cl); camera.up.set(0,1,0); return; }
  R.chaseP=null;
  if(R.fly.tv){ const tv=R.tv||{z:1}; turretPos(pl,s,_go); camera.position.copy(_go).addScaledVector(_pu,-0.6); _pe.set(P.pitch,P.yaw,0,'YXZ'); camera.quaternion.setFromEuler(_pe); const fv=TVZ[tv.z]; P.fov=fv; if(camera.fov!==fv){ camera.fov=fv; camera.updateProjectionMatrix(); } return; }
  if(s>0&&pl.T.turrets[s-1]) sp=turretPos(pl,s,_go).addScaledVector(_pu,0.9); else sp=_go.set(...pl.T.seat[s]).applyQuaternion(pl.q).add(pl.pos).addScaledVector(_pu,-pl.T.gear+0.9);
  camera.position.copy(sp);
  if(s===0){ camera.quaternion.copy(pl.q); }
  else if(R.fly.hand){ _pe.set(P.pitch,P.yaw,0,'YXZ'); _pq.setFromEuler(_pe); camera.quaternion.copy(pl.q).multiply(_pq); }
  else { turretDir(pl,s,R.fly.aim?R.fly.aim[0]:0,R.fly.aim?R.fly.aim[1]:0,_gd); _pt.copy(sp).add(_gd); camera.lookAt(_pt); camera.rotation.z=0; }
}
// ---- AI pilots (host or solo) ----
function aiStep(pl,dt){
  const A=pl.ai; if(pl.dead){ return; }
  if(!A.tgt||A.tgt.dead||R.t>(A.tgtT||0)){ A.tgtT=R.t+1.5; let best=null,bd=1900; for(const o of R.planes){ if(o===pl||o.dead||o.side===pl.side||(!o.ai&&!o.crew[0])) continue; const d=o.pos.distanceTo(pl.pos); if(d<bd){ bd=d; best=o; } } A.tgt=best; }
  const alt=pl.pos.y-Math.max(R.terrain(pl.pos.x,pl.pos.z),0); let want;
  if(A.tgt){ const o=A.tgt; const d=o.pos.distanceTo(pl.pos); _fd.copy(o.pos).addScaledVector(o.vel,Math.min(1.2,d/320)).sub(pl.pos); if(d<90&&_fd.dot(_pf)>0&&A.evT<R.t&&alt>150){ A.evT=R.t+2.5; A.evS=rand()<0.5?-1:1; } want=_fd.normalize(); pl.thr=d<160&&pl.vel.length()>o.vel.length()+10?0.6:1;
    if(A.evT>R.t){ planeAxes(pl); want=_fd.copy(_pf).addScaledVector(_pr,A.evS*0.9).addScaledVector(_pu,0.4).normalize(); } }
  else { const home=SJ_ISL.find(I=>I.base===(pl.side===1?2:1)); const wp=A.wp||(A.wp={x:home.x+rr(-250,250),z:home.z+rr(-250,250)}); if(Math.hypot(wp.x-pl.pos.x,wp.z-pl.pos.z)<120) A.wp=null; want=_fd.set(wp.x-pl.pos.x,(240-pl.pos.y)*0.6,wp.z-pl.pos.z).normalize(); pl.thr=0.75; }
  const low=alt<60||(pl.vel.y<0&&alt<140&&-pl.vel.y>alt/4); const V=pl.vel.length(); planeAxes(pl); const al=Math.atan2(-pl.vel.dot(_pu),Math.max(pl.vel.dot(_pf),1));
  if(pl.pos.y>450){ want.y=Math.min(want.y,-0.45); want.normalize(); pl.thr=0.6; } // a ceiling keeps the fight where people are
  const stalled=al>0.24||V<pl.T.vs*1.15;
  if(stalled){ want=_fd.copy(pl.vel).normalize(); want.y+=low?0.25:-0.05; want.normalize(); pl.thr=1; } // stalled or slow: fly the velocity vector, build speed
  else if(low){ want.y=Math.max(want.y,alt<40?0.95:0.6); want.normalize(); pl.thr=1; if(A.evT>R.t) A.evT=0; }
  const ctl=steerTo(pl,want,null); ctl.brake=false; if(A.hurtT&&R.t-A.hurtT<0.8&&!low){ ctl.roll=A.evS||1; }
  if(pl.pos.y>450&&!low){ ctl.pitch=Math.min(ctl.pitch,-0.5); ctl.roll=clamp(-(-Math.asin(clamp(_pr.y,-1,1)))*2,-1,1); } else if(pl.vel.y>22&&!low&&!stalled) ctl.pitch=Math.min(ctl.pitch,-0.2);
  const n=Math.max(1,Math.min(6,Math.round(dt*120))); for(let i=0;i<n;i++){ planeStep(pl,ctl,dt/n); if(pl.dead) return; }
  if(A.tgt){ planeAxes(pl); _gs.copy(A.tgt.pos).addScaledVector(A.tgt.vel,0.25).sub(pl.pos); const d=_gs.length(); _gs.normalize(); A.bT=(A.bT||0)-dt; if(d<420&&_gs.dot(_pf)>0.998&&A.bT<=0){ A.bF=(A.bF||0)+dt; fireFixed(pl,null,dt); if(A.bF>0.8){ A.bF=0; A.bT=1.6; } } else pl.gunT=Math.min(pl.gunT,0.02); }
}
function updAir(dt){
  if(!R.airMap) return;
  for(const pl of R.planes){
    if(pl.dead){ if(!pl.ai||!NET.on||NET.host){ pl.respT-=dt; if(pl.respT<=0){ resetPlane(pl); if(pl.crew[0]!=='me'&&!pl.ai&&NET.on) {} } } continue; }
    if(pl.ai){ if(!NET.on||NET.host) aiStep(pl,dt); else { const k=Math.min(1,dt*8); if(pl.np){ pl.pos.lerp(pl.np,k); pl.q.slerp(pl.nq,k); planePose(pl); if(pl.g.userData.prop) pl.g.userData.prop.rotation.z+=dt*40; if(pl.g.userData.props) for(const pr of pl.g.userData.props) pr.rotation.z+=dt*40; } } continue; }
    if(pl.crew[0]==='me'||(R.fly&&R.fly.i===pl.i&&!pl.crew[0])) continue; // flown by me (or my autopilot): flyStep did it
    if(pl.crew[0]){ const k=Math.min(1,dt*10); if(pl.np){ pl.pos.lerp(pl.np,k); pl.q.slerp(pl.nq,k); pl.vel.copy(pl.nv||pl.vel); planePose(pl); if(pl.g.userData.prop) pl.g.userData.prop.rotation.z+=dt*(8+pl.thr*40); if(pl.g.userData.props) for(const pr of pl.g.userData.props) pr.rotation.z+=dt*(8+pl.thr*40); } }
    else if(!pl.onG){ planeStep(pl,{roll:0,pitch:-0.2,yaw:0},dt); } // nobody at the controls
    // turret models follow their gunners
    if(pl.g.userData.turrets) pl.g.userData.turrets.forEach((tg,i)=>{ const a=pl.aim[i+1]; if(a){ const tr=pl.T.turrets[i]; const dy=((a[0]-tr.cy+Math.PI*3)%(Math.PI*2))-Math.PI; tg.rotation.set(clamp(a[1],tr.pmin,tr.pmax),tr.cy+clamp(dy,-tr.span,tr.span),0,'YXZ'); } });
  }
  if(R.fly){ const pl=R.planes[R.fly.i]; if(pl&&pl.g.userData.turrets) pl.g.userData.turrets.forEach((tg,i)=>{ const a=pl.aim[i+1]; if(a){ const tr=pl.T.turrets[i]; const dy=((a[0]-tr.cy+Math.PI*3)%(Math.PI*2))-Math.PI; tg.rotation.set(clamp(a[1],tr.pmin,tr.pmax),tr.cy+clamp(dy,-tr.span,tr.span),0,'YXZ'); } }); }
  updBombs(dt);
}
// network: the pilot's state carries the plane; gunners carry their seat and aim; the host carries AI planes
function airState(st){
  if(!R.fly) return; const pl=R.planes[R.fly.i]; if(!pl) return;
  if(R.fly.seat===0||flownByMe(pl)) st.pl=[pl.i,+pl.pos.x.toFixed(1),+pl.pos.y.toFixed(1),+pl.pos.z.toFixed(1),+pl.q.x.toFixed(3),+pl.q.y.toFixed(3),+pl.q.z.toFixed(3),+pl.q.w.toFixed(3),Math.round(pl.hp),+pl.thr.toFixed(2),+pl.vel.x.toFixed(1),+pl.vel.y.toFixed(1),+pl.vel.z.toFixed(1),pl.onG?1:0];
  if(R.fly.seat>0) st.gs=[pl.i,R.fly.seat,R.fly.aim?+R.fly.aim[0].toFixed(2):0,R.fly.aim?+R.fly.aim[1].toFixed(2):0];
}
function airRemoteBegin(){ for(const pl of R.planes) for(let s=0;s<pl.crew.length;s++) if(pl.crew[s]!=='me') pl.crew[s]=null; }
function airRemote(id,p){
  const st=p.st; if(!st) return;
  if(st.pl&&!st.dead){ const pl=R.planes[st.pl[0]]; if(pl&&!pl.ai){ pl.crew[0]=id; pl.np=pl.np||new THREE.Vector3(); pl.nq=pl.nq||new THREE.Quaternion(); pl.nv=pl.nv||new THREE.Vector3(); pl.np.set(st.pl[1],st.pl[2],st.pl[3]); pl.nq.set(st.pl[4],st.pl[5],st.pl[6],st.pl[7]); pl.hp=st.pl[8]; pl.thr=st.pl[9]; pl.nv.set(st.pl[10],st.pl[11],st.pl[12]); pl.onG=!!st.pl[13]; if(pl.dead&&pl.hp>0){ pl.dead=false; pl.g.visible=true; } if(p.g) p.g.visible=false; } }
  if(st.gs&&!st.dead){ const pl=R.planes[st.gs[0]]; if(pl){ pl.crew[st.gs[1]]=id; pl.aim[st.gs[1]]=[st.gs[2],st.gs[3]]; if(p.g) p.g.visible=false; } }
}
function airEstate(){ return R.planes.filter(pl=>pl.ai).map(pl=>[pl.i,+pl.pos.x.toFixed(1),+pl.pos.y.toFixed(1),+pl.pos.z.toFixed(1),+pl.q.x.toFixed(3),+pl.q.y.toFixed(3),+pl.q.z.toFixed(3),+pl.q.w.toFixed(3),Math.round(pl.hp),pl.dead?1:0]); }
function airApplyEstate(ap,snap){
  for(const a of ap){ const pl=R.planes[a[0]]; if(!pl||!pl.ai) continue; pl.np=pl.np||new THREE.Vector3(); pl.nq=pl.nq||new THREE.Quaternion(); pl.np.set(a[1],a[2],a[3]); pl.nq.set(a[4],a[5],a[6],a[7]); pl.hp=a[8];
    if(a[9]&&!pl.dead){ pl.dead=true; pl.g.visible=false; if(!snap){ const pt=pl.pos.clone(); puff(pt,0xffa040,18,6); puff(pt,0x3a3a3a,14,4); } } else if(!a[9]&&pl.dead){ pl.dead=false; pl.g.visible=true; }
    if(snap){ pl.pos.copy(pl.np); pl.q.copy(pl.nq); planePose(pl); } }
}
function airMsg(m){
  if(!R||!R.airMap) return false;
  if(m.t==='pdmg'){ const pl=R.planes[m.i]; if(pl&&flownByMe(pl)&&!pl.dead){ pl.hp-=m.dmg; if(m.from){ R.lastHitBy=m.from; R.lastHitT=R.t; hitDir(P.pos.x+20,P.pos.z,false); } P.hurt=Math.min(1,P.hurt+0.2); if(pl.hp<=0){ nsend({t:'pev',k:'dead',i:pl.i,by:m.from||null}); planeDie(pl,'Shot down',m.from); } } return true; }
  if(m.t==='adm'){ const pl=R.planes[m.i]; if(pl&&pl.ai&&NET.host) planeDamage(pl,m.dmg,m.from); return true; }
  if(m.t==='pev'){ const pl=R.planes[m.i];
    if(m.k==='dead'&&pl){ const mine=R.fly&&R.fly.i===pl.i; planeDie(pl,mine?`Shot down in a ${pl.T.name}`:'',m.by); }
    else if(m.k==='dmg'&&pl&&!pl.crew[0]){ pl.hp-=m.dmg; if(pl.hp<=0) planeDie(pl,'Destroyed',null); }
    else if(m.k==='boom'){ boomAt(m.x,m.y,m.z,false,m.dmg?m.dmg/100:1); }
    return true; }
  return false;
}
function airHud(){
  const el=$('#airhud'); if(!R.airMap||!R.fly||P.dead){ if(!el.hidden) el.hidden=true; return; } const pl=R.planes[R.fly.i]; if(!pl){ el.hidden=true; return; } el.hidden=false;
  const T=pl.T, V=pl.vel.length(), alt=Math.max(0,pl.pos.y-Math.max(R.terrain(pl.pos.x,pl.pos.z),0));
  planeAxes(pl); const pitch=Math.asin(clamp(_pf.y,-1,1)), bank=-Math.asin(clamp(_pr.y,-1,1)), hdg=(Math.atan2(-_pf.x,-_pf.z)*180/Math.PI+360)%360;
  const aoa=Math.atan2(-pl.vel.dot(_pu),Math.max(pl.vel.dot(_pf),1)), stallM=clamp(1-aoa/0.3,0,1), slow=V<T.vs*1.25, stall=!pl.onG&&V<T.vs*1.0;
  if(!el._cv){ el.innerHTML='<canvas id="airCv" width="560" height="190"></canvas>'; el._cv=$('#airCv'); el._g=el._cv.getContext('2d'); }
  const g=el._g, W=560, H=190; g.clearRect(0,0,W,H); g.font='600 12px "JetBrains Mono", monospace'; g.textBaseline='middle';
  const box=(x,y,w,h)=>{ g.fillStyle='rgba(6,14,18,.62)'; g.fillRect(x,y,w,h); g.strokeStyle='rgba(180,200,210,.35)'; g.strokeRect(x+.5,y+.5,w-1,h-1); };
  const lab=(t,x,y,c='#9fb3bb',al='left')=>{ g.fillStyle=c; g.textAlign=al; g.fillText(t,x,y); };
  const big=(t,x,y,c='#fff',al='center',sz=22)=>{ g.font=`800 ${sz}px "Bebas Neue","Oswald",sans-serif`; g.fillStyle=c; g.textAlign=al; g.fillText(t,x,y); g.font='600 12px "JetBrains Mono", monospace'; };
  // artificial horizon
  { const cx=280, cy=95, r=78; g.save(); g.beginPath(); g.arc(cx,cy,r,0,7); g.clip(); g.translate(cx,cy); g.rotate(-bank); const off=pitch*180/Math.PI*2.2;
    g.fillStyle='#4a86b8'; g.fillRect(-200,-200+off,400,200+200); g.fillStyle='#7a5a3a'; g.fillRect(-200,off,400,400); g.strokeStyle='#fff'; g.lineWidth=1.5; g.beginPath(); g.moveTo(-200,off); g.lineTo(200,off); g.stroke();
    g.fillStyle='#fff'; g.textAlign='center'; for(let d=-60;d<=60;d+=10){ if(!d) continue; const y=off-d*2.2; const w=d%30?14:26; g.fillRect(-w,y-.5,2*w,1); g.fillText(String(Math.abs(d)),w+12,y); g.fillText(String(Math.abs(d)),-w-12,y); }
    g.restore();
    g.strokeStyle='rgba(180,200,210,.5)'; g.lineWidth=1; g.beginPath(); g.arc(cx,cy,r,0,7); g.stroke();
    // bank ticks and pointer
    g.strokeStyle='#e8c55a'; for(const d of [-60,-45,-30,-20,-10,0,10,20,30,45,60]){ const a=-Math.PI/2+d*Math.PI/180; const l=d%30?5:9; g.beginPath(); g.moveTo(cx+Math.cos(a)*(r-1),cy+Math.sin(a)*(r-1)); g.lineTo(cx+Math.cos(a)*(r-1-l),cy+Math.sin(a)*(r-1-l)); g.stroke(); }
    const ba=-Math.PI/2-bank; g.fillStyle='#e8c55a'; g.beginPath(); g.moveTo(cx+Math.cos(ba)*(r-12),cy+Math.sin(ba)*(r-12)); g.lineTo(cx+Math.cos(ba+0.06)*(r-2),cy+Math.sin(ba+0.06)*(r-2)); g.lineTo(cx+Math.cos(ba-0.06)*(r-2),cy+Math.sin(ba-0.06)*(r-2)); g.fill();
    // the aircraft symbol
    g.strokeStyle='#ffd27a'; g.lineWidth=3; g.beginPath(); g.moveTo(cx-34,cy); g.lineTo(cx-12,cy); g.lineTo(cx-6,cy+7); g.lineTo(cx,cy); g.lineTo(cx+6,cy+7); g.lineTo(cx+12,cy); g.lineTo(cx+34,cy); g.stroke(); g.lineWidth=1;
    // heading strip under the ball
    box(cx-80,H-26,160,22); g.save(); g.beginPath(); g.rect(cx-78,H-25,156,20); g.clip(); g.fillStyle='#fff'; g.textAlign='center'; for(let d=-60;d<=60;d+=10){ const h=((hdg+d)%360+360)%360; const x=cx+d*2.4; if(Math.round(h)%30===0){ const n=Math.round(h/30)%12; g.fillText(['N','3','6','E','12','15','S','21','24','W','30','33'][n],x-(hdg%10)*2.4,H-15); } else g.fillRect(x-(hdg%10)*2.4,H-24,1,5); } g.restore(); g.fillStyle='#e8c55a'; g.fillRect(cx-1,H-26,2,22); }
  // airspeed and altitude tapes
  { box(118,20,88,150); lab('KM/H',162,30,'#9fb3bb','center'); g.save(); g.beginPath(); g.rect(119,40,86,112); g.clip(); const v=V*3.6; g.fillStyle='#dfe8ee'; g.textAlign='right'; for(let k=Math.floor((v-60)/20)*20;k<=v+60;k+=20){ if(k<0) continue; const y=96+(v-k)*1.1; g.fillRect(190,y-.5,12,1); if(k%40===0) g.fillText(String(k),186,y); }
    const vs=T.vs*3.6; g.fillStyle='rgba(226,87,74,.35)'; g.fillRect(119,96+(v-vs)*1.1,86,200); g.fillStyle='rgba(232,197,90,.25)'; g.fillRect(119,96+(v-vs*1.25)*1.1,86,(vs*0.25)*1.1); g.restore();
    box(120,84,84,24); big(String(Math.round(v)),162,96,stall?'#ff8a7a':slow?'#ffd27a':'#fff','center',24); }
  { box(354,20,88,150); lab('ALT m',398,30,'#9fb3bb','center'); g.save(); g.beginPath(); g.rect(355,40,86,112); g.clip(); g.fillStyle='#dfe8ee'; g.textAlign='left'; for(let k=Math.floor((alt-100)/20)*20;k<=alt+100;k+=20){ const y=96+(alt-k)*0.55; g.fillRect(356,y-.5,12,1); if(k%100===0) g.fillText(String(k),372,y); } g.restore();
    box(356,84,84,24); big(String(Math.round(alt)),398,96,alt<30&&!pl.onG?'#ffd27a':'#fff','center',24);
    // vertical speed bar
    box(446,20,22,150); const vy=clamp(pl.vel.y/30,-1,1); g.fillStyle=vy>=0?'#7cc9a4':(vy<-0.4?'#ff8a7a':'#ffd27a'); g.fillRect(449,95,16,-vy*70); g.fillStyle='#fff'; g.fillRect(446,94.5,22,1); lab((pl.vel.y>=0?'+':'')+pl.vel.y.toFixed(0),457,H-12,'#dfe8ee','center'); }
  // left column: throttle, angle of attack / stall margin, state
  { box(10,20,100,150); lab('THR',20,32); g.fillStyle='rgba(255,255,255,.15)'; g.fillRect(20,42,80,8); g.fillStyle='#7cc9a4'; g.fillRect(20,42,80*pl.thr,8);
    lab('AoA',20,64); g.fillStyle='rgba(255,255,255,.15)'; g.fillRect(20,74,80,8); g.fillStyle=stallM<0.25?'#ff8a7a':stallM<0.5?'#ffd27a':'#7cc9a4'; g.fillRect(20,74,80*(1-stallM),8); lab((aoa*180/Math.PI).toFixed(0)+'°',100,64,'#dfe8ee','right');
    lab('AIRFRAME',20,96); g.fillStyle='rgba(255,255,255,.15)'; g.fillRect(20,106,80,8); const hf=pl.hp/T.hp; g.fillStyle=hf<0.3?'#ff8a7a':hf<0.6?'#ffd27a':'#7cc9a4'; g.fillRect(20,106,80*hf,8);
    lab(pl.onG?'ON GROUND':'AIRBORNE',20,130,'#dfe8ee'); lab(T.name.toUpperCase()+(R.fly.seat?' · '+(R.fly.hand?'PASSENGER':T.turrets[R.fly.seat-1].tv?'SENSOR':T.turrets[R.fly.seat-1].name.toUpperCase()+' GUN'):''),20,150,'#9fb3bb'); }
  // right column: weapons and warnings
  { box(478,20,72,150); lab('GUNS',488,32); big(String(T.guns?pl.ammo:0),488,52,'#fff','left',22); lab('BOMBS',488,80); big(String(pl.bombs),488,100,'#fff','left',22);
    if(pl.ap){ g.fillStyle='#7cc9a4'; g.fillRect(482,146,64,18); big(pl.ap.orbit?'AP ORBIT':'AUTOPILOT',514,155,'#08140e','center',13); }
    const warn=stall?'STALL':(R.assistT>R.t)?'PULL UP':slow&&!pl.onG?'SLOW':''; if(warn){ g.fillStyle=warn==='SLOW'?'#ffd27a':'#ff8a7a'; g.fillRect(482,122,64,22); big(warn,514,133,'#120a08','center',16); }
    if(OPTS.chase&&!pl.ap) lab('CHASE',514,160,'#9fb3bb','center'); }
  // gunsight, and in the chase view a marker for the aim point the plane is turning toward
  const cs=$('#cross'); cs.classList.toggle('sight',R.fly.seat===0||(R.fly.seat>0&&!R.fly.hand));
  const am=$('#aimdot'); if(OPTS.chase&&R.fly.seat===0){ lookDir(_fd,P.yaw,P.pitch); _cl.copy(camera.position).addScaledVector(_fd,300).project(camera); const on=_cl.z<1&&Math.abs(_cl.x)<1.2&&Math.abs(_cl.y)<1.2; am.hidden=!on; if(on){ am.style.left=((_cl.x+1)/2*100)+'%'; am.style.top=((1-_cl.y)/2*100)+'%'; } } else am.hidden=true;
}
// ---- the map ----
const SJ_EX=[['Vestholm pier',-950,222,1],['Austholm pier',950,222,2],['Midtskjær light',0,-30,0]];
function buildSkerries(){
  scene.background=new THREE.Color(0x5c7389); scene.fog=new THREE.FogExp2(0x5c7389,0.00085);
  scene.add(new THREE.HemisphereLight(0xdde8f4,0x3a4a5a,0.85)); const sun=new THREE.DirectionalLight(0xfff0dd,0.8); sun.position.set(60,80,-30); scene.add(sun);
  camera.far=4200; camera.updateProjectionMatrix();
  aurora(); for(const a of R.aur){ a.position.y+=160; }
  R.airMap=true; R.sea=true; R.bound=SJ.B; R.drain=0.42; R.terrain=skTerrain; R.terrainBase=()=>-1e9; R.planes=[]; R.navB=330; R.sides=true;
  const snowMat=new THREE.MeshLambertMaterial({map:TEXS.snow,vertexColors:true});
  for(let z=-SJ.B;z<SJ.B;z+=100) for(let x=-SJ.B;x<SJ.B;x+=100){ const m=skTile(x,z,100,5,snowMat); if(m) R.ray.push(m); }
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(SJ.B*2+1200,SJ.B*2+1200,1,1),new THREE.MeshLambertMaterial({color:0x1b3d58,transparent:true,opacity:0.92})); sea.rotation.x=-Math.PI/2; sea.position.y=0; scene.add(sea); R.ray.push(sea); R.seaMesh=sea;
  // trees on the hilly islands
  const trees=[]; { const fr=mulberry32(77); for(let k=0;k<30000&&trees.length<2200;k++){ const x=(fr()*2-1)*SJ.B, z=(fr()*2-1)*SJ.B; const hit=skIsland(x,z); if(!hit) continue; const [I,d]=hit; if(I.base&&(d<0.78||Math.abs(x-I.x)<60)) continue; const y=skRaw(x,z); if(y<2) continue; const sl=Math.abs(skRaw(x+2,z)-y)+Math.abs(skRaw(x,z+2)-y); if(sl>2.2) continue; if(fr()>0.5+fbm(x/120,z/120,2)) continue; if(I.flat&&d<I.fr+0.05) continue; trees.push([x,y-0.2,z,0.8+fr()*0.7]); R.cols.push({x0:x-0.35,x1:x+0.35,z0:z-0.35,z1:z+0.35,y0:y,y1:y+6,terrain:true}); } }
  { const trunkG=new THREE.CylinderGeometry(0.22,0.3,2.2,6), coneG=new THREE.ConeGeometry(1.5,3.2,7), cone2=new THREE.ConeGeometry(1.1,2.4,7);
    const tM=new THREE.InstancedMesh(trunkG,MC(0x4a3424),trees.length), cM=new THREE.InstancedMesh(coneG,MC(0x2a4a34),trees.length), c2M=new THREE.InstancedMesh(cone2,MC(0x36583e),trees.length); const m4=new THREE.Matrix4(), q=new THREE.Quaternion(), sc=new THREE.Vector3(), ps=new THREE.Vector3();
    trees.forEach(([x,y,z,s0],i)=>{ sc.set(s0,s0,s0); ps.set(x,y+1.1*s0,z); m4.compose(ps,q,sc); tM.setMatrixAt(i,m4); ps.set(x,y+3.2*s0,z); m4.compose(ps,q,sc); cM.setMatrixAt(i,m4); ps.set(x,y+4.8*s0,z); m4.compose(ps,q,sc); c2M.setMatrixAt(i,m4); });
    for(const im of [tM,cM,c2M]){ im.frustumCulled=false; scene.add(im); } R.ray.push(tM); }
  // the two air bases: runway along z, apron and buildings on the seaward side
  const conc=M('concrete'), grey=M('metalGrey'), red=M('metalRed'), wood=M('wood'), L2=1.6, L3=2.1; const sps=[];
  for(const I of SJ_ISL.filter(I=>I.base)){ const cx=I.x, cz=I.z, m=I.base===1?1:-1, H=I.h;
    floorPlane(cx,cz,34,440,H+0.03,'road',3,8); for(let z=-200;z<=200;z+=40){ const stripe=new THREE.Mesh(new THREE.BoxGeometry(1,0.05,14),MB(0xf2efe6)); stripe.position.set(cx,H+0.06,cz+z); scene.add(stripe); }
    for(let z=-220;z<=220;z+=20) for(const sx of [-1,1]){ const lamp=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.4,0.4),MB(sx<0?0xff6a3a:0x6af0ff)); lamp.position.set(cx+sx*18,H+0.5,cz+z); scene.add(lamp); }
    floorPlane(cx+m*48,cz,60,300,H+0.03,'concrete',3,8);
    R.yOff=H; // everything built from here sits on the plateau
    building(cx+m*100,cz-70,34,26,9,{mat:grey,doors:{[m>0?'w':'e']:[[13,12]]},name:I.base===1?'Vestholm hangar':'Austholm hangar',nowin:true});
    container('cargo',cx+m*108,cz-78,L2); container('cargo',cx+m*108,cz-62,L2); container('tool',cx+m*92,cz-80,L2); container('crate',cx+m*112,cz-70,L2); container('drum',cx+m*96,cz-60); heater(cx+m*104,cz-70);
    building(cx+m*100,cz+30,8,8,12,{mat:conc,doors:{[m>0?'w':'e']:[[4,1.8]]},name:'Tower'}); container('desk',cx+m*102,cz+28,L2); container('locker',cx+m*97.5,cz+33,L2);
    building(cx+m*100,cz+90,18,10,4,{mat:wood,doors:{[m>0?'w':'e']:[[5,1.8]],n:[[9,1.6]]},name:I.base===1?'Vestholm barracks':'Austholm barracks'}); container('locker',cx+m*106,cz+86,L2); container('locker',cx+m*106,cz+94,L2); container('med',cx+m*94,cz+86,L2); container('crate',cx+m*94,cz+94,L2); heater(cx+m*100,cz+90);
    tank(cx+m*112,cz+130); tank(cx+m*104,cz+136); container('drum',cx+m*98,cz+126); container('drum',cx+m*108,cz+142);
    R.yOff=0;
    // parked aircraft on the apron, nose to the runway end
    R.yOff=0; const yaw=0; for(const [t,dz] of [['bomber',-170],['bomber',-110],['fighter',-55],['fighter',-25],['fighter',5],['fighter',35],['cessna',65],['cessna',90]]) addPlane(t,I.base,cx+m*(t==='bomber'?58:46),cz+dz,yaw,null);
    sps.push({x:cx+m*80,z:cz+105,side:I.base,h:0});
  }
  // the village, the lighthouse and the seal hunters' camp
  { const I=SJ_ISL[2], y=I.flat; R.yOff=y;
    building(I.x,I.z-10,12,9,4,{mat:wood,doors:{s:[[6,1.8]]},name:'Trading post'}); container('vsafe',I.x-4,I.z-13,L3); container('safe',I.x+4,I.z-13,L2); container('desk',I.x,I.z-7.5,L2); container('med',I.x+4.5,I.z-7,L2); heater(I.x-4,I.z-7);
    building(I.x-28,I.z+12,8,7,3.5,{mat:wood,doors:{e:[[3.5,1.6]]},name:'Cabin'}); container('locker',I.x-31,I.z+9.5,L2); container('crate',I.x-25.5,I.z+14.5,L2);
    building(I.x+28,I.z+14,9,7,3.5,{mat:grey,doors:{w:[[3.5,1.6]]},name:'Boat shed'}); container('cargo',I.x+31,I.z+11.5,L2); container('tool',I.x+25.5,I.z+16.5,L2); container('drum',I.x+31,I.z+17);
    building(I.x+2,I.z+34,10,8,3.5,{mat:wood,doors:{n:[[5,1.6]]},name:'Chapel'}); container('crate',I.x-1,I.z+37,L2); container('safe',I.x+5,I.z+37,L2);
    for(const [x,z] of [[I.x-20,I.z-30],[I.x+22,I.z-32]]) shipc(x,z,'x',grey);
    R.yOff=0;
    const lamp=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.6,0.6),MB(0x67f0a4)); lamp.position.set(I.x,y+6,I.z-30); scene.add(lamp);
    for(const [x,z] of [[I.x-12,I.z],[I.x+12,I.z+2],[I.x-30,I.z+24],[I.x+34,I.z-6],[I.x,I.z+48],[I.x+18,I.z+30]]) spawnEnemy(x,z,'scav'); spawnEnemy(I.x-6,I.z-26,'raider'); spawnEnemy(I.x+8,I.z-28,'raider'); }
  { const I=SJ_ISL[3], y=I.flat; R.yOff=y;
    solid(I.x,9,I.z,4,18,4,M('concrete'),{ts:4}); const lt=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.4,1.4),MB(0xfff2b0)); lt.position.set(I.x,y+18.6,I.z); scene.add(lt);
    building(I.x+10,I.z+8,8,6,3.5,{mat:wood,doors:{w:[[3,1.6]]},name:"Keeper's house"}); container('safe',I.x+13,I.z+5.5,L2); container('locker',I.x+7,I.z+10.5,L2); container('med',I.x+13,I.z+10.5,L2); heater(I.x+10,I.z+8);
    container('cargo',I.x-8,I.z+6,L2); container('crate',I.x-10,I.z-6,L2);
    R.yOff=0;
    spawnEnemy(I.x-6,I.z+12,'scav'); spawnEnemy(I.x+16,I.z-8,'scav'); spawnEnemy(I.x+2,I.z-14,'raider'); }
  { const I=SJ_ISL[4], y=I.flat; R.yOff=y;
    building(I.x,I.z,9,7,3.5,{mat:wood,doors:{s:[[4.5,1.6]]},name:"Hunters' camp"}); container('crate',I.x-3,I.z-2.5,L2); container('locker',I.x+3.5,I.z-2.5,L2); container('tool',I.x+3.5,I.z+2,L2); heater(I.x-2,I.z+2);
    container('cargo',I.x+12,I.z+4,L2); container('drum',I.x+14,I.z-3); container('med',I.x-11,I.z+2,L2);
    R.yOff=0;
    spawnEnemy(I.x+8,I.z-10,'scav'); spawnEnemy(I.x-10,I.z+10,'scav'); spawnEnemy(I.x+14,I.z+12,'raider'); }
  // AI pilots: so many per side, starting in the air over their own base
  for(const I of SJ_ISL.filter(I=>I.base)){ const n=R.aiAir===2?4:R.aiAir===1?2:0; for(let k=0;k<n;k++){ const yaw=I.base===1?-Math.PI/2:Math.PI/2; addPlane('fighter',I.base,I.x+(I.base===1?-120:120),I.z-200+k*130,yaw,{tgt:null,evT:0}); } }
  R.extracts=SJ_EX.map(([name,x,z,side])=>({name,x,z,r:4,active:true,side})); for(const e of R.extracts) e.y=R.terrain(e.x,e.z);
  if(!R.engine2) R.engine2=rotorSound(240,30,0);
  return sps;
}
