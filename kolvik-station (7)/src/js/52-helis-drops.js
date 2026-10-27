/* 52-helis-drops: helicopters, supply drops, raid modifiers */
/* ---------- helicopters, planes, supply drops ---------- */
function rotorSound(lp=260,hz=17,vol=0){ const a=MUS.ctx; if(!a||!MUS.noise) return null; const src=a.createBufferSource(); src.buffer=MUS.noise; src.loop=true; const f=a.createBiquadFilter(); f.type='lowpass'; f.frequency.value=lp; const am=a.createGain(); am.gain.value=0.55; const lfo=a.createOscillator(); lfo.frequency.value=hz; const lg=a.createGain(); lg.gain.value=0.45; lfo.connect(lg); lg.connect(am.gain); const g=a.createGain(); g.gain.value=vol; src.connect(f); f.connect(am); am.connect(g); g.connect(MUS.sfx); src.start(); lfo.start(); const s={src,lfo,g}; if(R) (R.sounds=R.sounds||[]).push(s); return s; }
function soundVol(s,v){ if(s&&MUS.ctx) s.g.gain.setTargetAtTime(v,MUS.ctx.currentTime,0.15); }
function rotorStop(s){ if(!s||!MUS.ctx) return; s.g.gain.setTargetAtTime(0,MUS.ctx.currentTime,0.3); setTimeout(()=>{ try{ s.src.stop(); s.lfo.stop(); }catch(e){} },1500); }
function heliModel(){
  const g=new THREE.Group(); const body=MC(0x3d4a3a), dark=MC(0x1e2224), glass=MB(0x8fb6c9,{transparent:true,opacity:.35});
  const B=(w,h,d,x,y,z,m)=>{ const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); b.position.set(x,y,z); g.add(b); return b; };
  // open cabin: floor, roof, back wall and nose, side doors open so you can look out on the way in
  B(2.6,0.15,5,0,0.45,0,body); B(2.6,0.15,5.4,0,2.85,0,body); B(2.6,2.4,0.15,0,1.65,2.5,body); B(2.6,1.0,1.6,0,0.95,-3.25,body); B(2.4,1.4,0.08,0,2.15,-3.3,glass);
  for(const [x,z] of [[-1.25,-2.4],[1.25,-2.4],[-1.25,2.4],[1.25,2.4]]) B(0.14,2.4,0.14,x,1.65,z,body);
  B(0.5,0.5,1.2,-0.6,0.95,1.6,dark); B(0.5,0.5,1.2,0.6,0.95,1.6,dark);
  B(1.6,0.7,2.4,0,3.25,0.7,body); B(0.7,0.7,7,0,2.3,6,body); B(0.18,2.1,1.3,0,3.2,9.3,body);
  for(const x of [-1.3,1.3]){ B(0.15,0.15,4.6,x,0,0,dark); B(0.12,0.5,0.12,x,0.25,-1.3,dark); B(0.12,0.5,0.12,x,0.25,1.3,dark); }
  const rotor=new THREE.Group(); rotor.position.set(0,3.75,0.4); const blur=new THREE.MeshBasicMaterial({color:0x1e2224,transparent:true,opacity:0.16,depthWrite:false,side:THREE.DoubleSide}); const disc=new THREE.Mesh(new THREE.CircleGeometry(7,20),blur); disc.rotation.x=-Math.PI/2; rotor.add(disc); const bl=new THREE.MeshBasicMaterial({color:0x1e2224,transparent:true,opacity:0.45,depthWrite:false}); rotor.add(new THREE.Mesh(new THREE.BoxGeometry(14,0.05,0.22),bl)); rotor.add(new THREE.Mesh(new THREE.BoxGeometry(0.22,0.05,14),bl)); g.add(rotor);
  const tail=new THREE.Group(); tail.position.set(0.25,3.2,9.4); tail.add(new THREE.Mesh(new THREE.BoxGeometry(0.06,2.4,0.3),dark)); g.add(tail);
  g.userData.rotor=rotor; g.userData.tail=tail; return g;
}
function makeHeliObj(lx,lz,T,alt){
  const l=Math.hypot(lx,lz)||1, dx=lx/l, dz=lz/l; const sx=lx+dx*380, sz=lz+dz*380; const g=heliModel(); scene.add(g);
  const yaw=Math.atan2(-(lx-sx),-(lz-sz)); g.rotation.y=yaw; g.position.set(sx,alt,sz);
  return {g,sx,sz,lx,lz,dx,dz,T,alt,yaw,t:0,phase:'in',wait:null,snd:rotorSound()};
}
function heliStep(h,dt){
  h.t+=dt; const g=h.g; g.userData.rotor.rotation.y+=dt*(h.phase==='gone'?0:26); g.userData.tail.rotation.x+=dt*40;
  if(h.phase==='in'){ const k=Math.min(1,h.t/h.T); const e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2; const dsc=k<0.62?0:(k-0.62)/0.38;
    g.position.set(h.sx+(h.lx-h.sx)*e,h.alt*(1-dsc*dsc*(3-2*dsc)),h.sz+(h.lz-h.sz)*e); g.rotation.set(-0.09*(1-dsc),h.yaw,Math.sin(R.t*0.7)*0.025,'YXZ');
    if(k>=1){ h.phase='wait'; h.t=0; g.position.set(h.lx,0,h.lz); g.rotation.set(0,h.yaw,0,'YXZ'); } }
  else if(h.phase==='wait'){ if(h.wait!=null&&h.t>=h.wait){ h.phase='out'; h.t=0; } }
  else if(h.phase==='out'){ const k=h.t/14; const d=k*k*420; g.position.set(h.lx+h.dx*d,Math.min(70,k*110),h.lz+h.dz*d); g.rotation.set(-0.12,h.yaw+Math.PI,0,'YXZ'); if(k>=1){ h.phase='gone'; scene.remove(g); rotorStop(h.snd); } }
  if(h.phase!=='gone'){ const d=camera.position.distanceTo(g.position); soundVol(h.snd,h.own&&h.phase==='in'?0.9:0.9*Math.pow(clamp(1-d/280,0,1),2)); }
}
function heliSeat(){ const h=R.heli; h.g.updateMatrixWorld(true); _a.set(0.75,1.5,0.3).applyMatrix4(h.g.matrixWorld); camera.position.copy(_a); camera.rotation.set(P.pitch,P.yaw,0); if(vmGun) vmGun.visible=false; P.vx=P.vz=0; P.adsT=0; }
function updHelis(dt){
  const h=R.heli;
  if(h&&h.phase!=='gone'){ heliStep(h,dt);
    if(h.phase!=='in'&&!h.landed){ h.landed=true; if(R.fogBase){ scene.fog.density=R.fogBase; R.viewDist=Math.min(320,2.5/R.fogBase); } const side=h.yaw+Math.PI/2; P.pos.set(h.lx-Math.sin(side)*4,0,h.lz-Math.cos(side)*4); resolve(P.pos,0.35); P.grace=SPAWN.grace; P.yaw=h.yaw; P.pitch=0; msg(`Boots on the ground. ${SPAWN.grace} seconds of cover.`); sfxBeep(); } }
}
function dropPlaneModel(){ const g=new THREE.Group(); const m=MC(0x6a7276); const B=(w,h,d,x,y,z)=>{ const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); b.position.set(x,y,z); g.add(b); }; B(16,2.6,2.6,0,0,0); B(4,0.4,24,1,0.2,0); B(2.4,3,0.3,-7.4,2,0); B(3,0.3,7,-7.2,0.6,0); return g; }
function updEvents(dt){
  const el=MAPS[R.map].time-R.timeLeft;
  const d=R.drop;
  if(d){
    if(d.state==='pending'&&el>=d.t-25){ d.state='plane'; if(el<d.t+12){ msg('Supply plane inbound. Watch for the red flare.'); sfxBeep(); d.plane=dropPlaneModel(); scene.add(d.plane); d.psnd=rotorSound(420,5); } }
    if(d.plane){ const px=d.x+(el-d.t)*45; d.plane.position.set(px,95,d.z); const dist=camera.position.distanceTo(d.plane.position); soundVol(d.psnd,0.7*Math.pow(clamp(1-dist/700,0,1),2)); if(el>d.t+14){ scene.remove(d.plane); d.plane=null; rotorStop(d.psnd); } }
    if((d.state==='plane'||d.state==='pending')&&el>=d.t){ d.state='falling';
      d.crate=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.4,1.4),M('crate')); scene.add(d.crate);
      d.chute=new THREE.Mesh(new THREE.ConeGeometry(3,1.6,8,1,true),MC(0xe8e2d0)); scene.add(d.chute);
      d.flare=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.3),MB(0xff2a2a)); d.flare.position.set(d.x+2,0.2,d.z+1); scene.add(d.flare);
      d.beam=new THREE.Mesh(new THREE.BoxGeometry(0.5,70,0.5),new THREE.MeshBasicMaterial({color:0xff3030,transparent:true,opacity:0.28,blending:THREE.AdditiveBlending,depthWrite:false,fog:false})); d.beam.position.set(d.x+2,35,d.z+1); scene.add(d.beam); }
    if(d.state==='falling'){ const k=(el-d.t)/16;
      if(k>=1){ d.state='landed'; scene.remove(d.chute); scene.remove(d.crate); const mesh=solid(d.x,0.7,d.z,1.4,1.4,1.4,M('crate'),{ts:1.4}); R.targets.push(mesh); R.conts.push({cid:'air0',type:'airdrop',name:'Supply drop',x:d.x,z:d.z,mesh,cont:d.cont,opened:false}); msg('The supply crate is down.'); sfxNoise(0.4,200,0.4); }
      else { const y=70*(1-k)+0.7; d.crate.position.set(d.x,y,d.z); d.chute.position.set(d.x,y+4,d.z); } }
    if(d.flare){ d.flare.visible=(R.t%0.6)<0.4; d.beam.material.opacity=0.2+Math.sin(R.t*4)*0.08; }
  }
  const v=R.evac;
  if(v){
    if(v.state==='pending'&&el>=v.t+v.dur) v.state='gone';
    if(v.state==='pending'&&el>=v.t-40){ v.state='called'; msg(`Evac helicopter inbound to ${v.name}. It waits ${v.dur} s after landing.`); sfxBeep(); }
    if(v.state==='called'&&el>=v.t-18){ v.state='inbound'; v.h=makeHeliObj(v.x,v.z,18,60); v.h.t=Math.max(0,el-(v.t-18)); }
    if(v.h){ heliStep(v.h,dt);
      if(v.state==='inbound'&&v.h.phase==='wait'){ v.state='landed'; R.evacEx.active=true; msg(`Evac helicopter is down at ${v.name}.`); sfxBeep(); }
      if(v.state==='landed'&&el>=v.t+v.dur){ v.state='gone'; R.evacEx.active=false; v.h.phase='out'; v.h.t=0; msg('The evac helicopter has left.'); } }
  }
}
function eventHud(hd){
  let html=''; const row=(cls,name,x,z,extra='')=>{ const dx=x-P.pos.x, dz=z-P.pos.z; const rel=Math.atan2(dx,-dz)*180/Math.PI-hd; html+=`<div class="${cls}"><span>${name}${extra}</span><span>${Math.round(Math.hypot(dx,dz))} m</span><span class="arr" style="transform:rotate(${rel}deg)">▲</span></div>`; };
  const el=MAPS[R.map].time-R.timeLeft;
  if(R.drop&&R.drop.state!=='pending') row('evt','Supply drop',R.drop.x,R.drop.z,R.drop.state==='landed'?'':' (falling)');
  if(R.evac&&(R.evac.state==='called'||R.evac.state==='inbound')) row('evt','Evac heli',R.evac.x,R.evac.z,` in ${fmtTime(R.evac.t-el)}`);
  if(R.evac&&R.evac.state==='landed') row('evt ok','Evac heli',R.evac.x,R.evac.z,` · leaves ${fmtTime(R.evac.t+R.evac.dur-el)}`);
  if(html) $('#exlist').insertAdjacentHTML('beforeend',html);
}
function remoteHeli(p,dt){
  const st=p.st;
  if(st.heli){ if(!p.heli){ p.heli={g:heliModel(),snd:rotorSound()}; scene.add(p.heli.g); } const [x,y,z,yaw]=st.heli; const g=p.heli.g; g.position.x+=(x-g.position.x)*Math.min(1,dt*8); g.position.y+=(y-g.position.y)*Math.min(1,dt*8); g.position.z+=(z-g.position.z)*Math.min(1,dt*8); g.rotation.y=yaw; g.userData.rotor.rotation.y+=dt*26; p.heli.yaw=yaw; }
  else if(p.heli&&!p.heli.out){ p.heli.out={t:0,x:p.heli.g.position.x,z:p.heli.g.position.z}; const l=Math.hypot(p.heli.out.x,p.heli.out.z)||1; p.heli.out.dx=p.heli.out.x/l; p.heli.out.dz=p.heli.out.z/l; }
  if(p.heli&&p.heli.out){ const o=p.heli.out; o.t+=dt; const k=o.t/14; const g=p.heli.g; g.userData.rotor.rotation.y+=dt*26; g.position.set(o.x+o.dx*k*k*420,Math.min(70,k*110),o.z+o.dz*k*k*420); g.rotation.y=(p.heli.yaw||0)+Math.PI; if(k>=1){ scene.remove(g); rotorStop(p.heli.snd); p.heli=null; return; } }
  if(p.heli){ const d=camera.position.distanceTo(p.heli.g.position); soundVol(p.heli.snd,0.8*Math.pow(clamp(1-d/280,0,1),2)); }
}
function allConts(){ const a=R.conts.slice(); if(R.drop&&R.drop.state!=='landed') a.push({cid:'air0',cont:R.drop.cont}); return a; }

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(rand()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
