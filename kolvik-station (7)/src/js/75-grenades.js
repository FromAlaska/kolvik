/* 75-grenades: frag, flashbang and smoke (white, red, green)
   Key 8 throws the selected grenade, key 9 picks the next type you carry. Grenades fly, bounce off walls and the
   ground, and go off on a fuse. Online, a throw is sent to everyone (nade) and every game flies the same grenade, so
   each player works out what it does to them, and the host what it does to the AI.
   - Frag: 3 s fuse. Up to 190 damage within 7 m of open line of sight, spread over the body; loud.
   - Flashbang: 2 s fuse. Anyone within 15 m with line of sight is blinded and deafened for up to 4 s (less if
     facing away); enemies can't shoot for 4 s.
   - Smoke: pops after 1.5 s, an 8 m cloud for 45 s that enemies (and their drones) can't see through.
     White hides you. Red marks "enemy here" and green "friendly / regroup" for your squad: a marker on their HUD for
     60 s. */
const NADE={throwV:15, up:3.2, cool:1.1, fuse:{frag:3,flash:2,smokew:1.5,smoker:1.5,smokeg:1.5}, frag:{r:7,dmg:190,pen:22}, flash:{r:15,t:4}, smoke:{r:8,life:45,grow:3}};
const NADE_IDS=['frag','flash','smokew','smoker','smokeg'];
const SMOKE_COL={smokew:0xd8dde0,smoker:0xc03a2a,smokeg:0x3fa34d};
function nadeCount(id){ let n=0; for(const c of playerConts()) for(const it of c.items) if(it.id===id) n++; return n; }
function nadeSel(){ const have=NADE_IDS.filter(id=>nadeCount(id)>0); if(!have.length) return null; if(!have.includes(R.nadeSel)) R.nadeSel=have[0]; return R.nadeSel; }
function nadeCycle(){ const have=NADE_IDS.filter(id=>nadeCount(id)>0); if(!have.length){ msg('No grenades.'); return; } const i=have.indexOf(R.nadeSel); R.nadeSel=have[(i+1)%have.length]; msg(`${ITEMS[R.nadeSel].name} selected · 8 throws`); }
function nadeThrow(){
  if(P.dead||P.down||R.invOpen||(R.nadeCool||0)>R.t||R.fly||(R.pd&&R.pd.ctl)) return; const id=nadeSel(); if(!id){ msg('No grenades. The trader sells them.'); return; }
  for(const c of playerConts()){ const i=c.items.findIndex(it=>it.id===id); if(i>=0){ c.items.splice(i,1); break; } }
  R.nadeCool=R.t+NADE.cool; P.kick=0.6; P.punchT=1; if(P.grace>0.5) P.grace=0.5; camera.updateMatrixWorld();
  _dir.set(0,0,-1).applyQuaternion(camera.quaternion); const pw=P.crouch?0.75:1;
  const n={k:id,x:camera.position.x+_dir.x*0.5,y:camera.position.y+_dir.y*0.5-0.1,z:camera.position.z+_dir.z*0.5,vx:_dir.x*NADE.throwV*pw+P.vx*0.5,vy:_dir.y*NADE.throwV*pw+NADE.up,vz:_dir.z*NADE.throwV*pw+P.vz*0.5};
  sfxNoise(0.12,900,0.12); nadeSpawn(n,'me'); nsend(Object.assign({t:'nade'},roundNade(n))); if(R.invOpen) R.dirty=true;
}
const roundNade=n=>{ const o={k:n.k}; for(const k of ['x','y','z','vx','vy','vz']) o[k]=+n[k].toFixed(3); return o; };
function nadeMesh(k){ const g=new THREE.Group(); const body=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.11,0.08),MC(k==='frag'?0x3e4a34:k==='flash'?0x55606a:0x5a6066)); g.add(body);
  const cap=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.03,0.05),MC(SMOKE_COL[k]||0x222222)); cap.position.y=0.07; g.add(cap); scene.add(g); return g; }
function nadeSpawn(n,by){ if(!R) return; R.nades=R.nades||[]; n.by=by; n.t=NADE.fuse[n.k]||3; n.g=nadeMesh(n.k); n.g.position.set(n.x,n.y,n.z); R.nades.push(n); }
function nadeNet(m){ if(!R||!NADE.fuse[m.k]) return; nadeSpawn({k:m.k,x:+m.x,y:+m.y,z:+m.z,vx:+m.vx,vy:+m.vy,vz:+m.vz},m.from||null); }
// flight: gravity, a bounce off the ground and off box walls, rolling to a stop
function nadeTick(dt){ if(!R.nades||!R.nades.length) return;
  for(const n of R.nades){ if(n.done) continue; const steps=2, h=dt/steps;
    for(let s=0;s<steps;s++){ n.vy-=9.8*h; const ox=n.x, oz=n.z; n.x+=n.vx*h; n.y+=n.vy*h; n.z+=n.vz*h;
      for(const b of colsNear(n.x,n.z)){ if(b.terrain) continue; if(n.x>b.x0&&n.x<b.x1&&n.z>b.z0&&n.z<b.z1&&n.y>b.y0&&n.y<b.y1){ const inX=ox>b.x0&&ox<b.x1, inZ=oz>b.z0&&oz<b.z1;
          if(inX&&!inZ){ n.z=oz; n.vz*=-0.45; } else if(inZ&&!inX){ n.x=ox; n.vx*=-0.45; } else if(n.vy<0&&n.y>b.y1-0.4){ n.y=b.y1+0.02; n.vy*=-0.3; n.vx*=0.7; n.vz*=0.7; } else { n.x=ox; n.z=oz; n.vx*=-0.45; n.vz*=-0.45; } break; } }
      const g=groundAt(n.x,n.z,n.y+0.05); if(n.y<g+0.05){ n.y=g+0.05; if(n.vy<0){ n.vy*=-0.32; n.vx*=0.6; n.vz*=0.6; if(Math.abs(n.vy)<0.6) n.vy=0; } } }
    n.g.position.set(n.x,n.y,n.z); n.g.rotation.x+=dt*(Math.hypot(n.vx,n.vz)*4); n.t-=dt; if(n.t<=0) nadeBoom(n); }
  R.nades=R.nades.filter(n=>!n.done); }
function nadeBoom(n){ n.done=true; scene.remove(n.g); const p=new THREE.Vector3(n.x,n.y+0.1,n.z), byName=n.by==='me'?'your own grenade':n.by&&NET.players[n.by]?`${NET.players[n.by].name}'s grenade`:'a grenade';
  const dMe=P?Math.hypot(P.pos.x-n.x,P.pos.z-n.z,(P.y+1)-n.y):999; const seeMe=P&&!P.dead&&los(n.x,n.y+0.2,n.z,P.pos.x,P.y+P.eye,P.pos.z);
  if(n.k==='frag'){ const F=NADE.frag; flashAt(n.x,n.y+0.5,n.z); puff(p,0x333333,14,5); puff(p,0xffb040,8,6); sfxNoise(0.6,300,0.6*Math.max(0.15,1-dMe/120)); setTimeout(()=>sfxNoise(0.9,120,0.35*Math.max(0.1,1-dMe/150)),40);
    if(dMe<30&&P) P.shake=Math.max(P.shake||0,0.5*(1-dMe/30)); hearShot(n.x,n.z,70);
    if(dMe<F.r&&seeMe){ const dmg=F.dmg*Math.pow(1-dMe/F.r,1.3); if(n.by&&n.by!=='me'){ R.lastHitBy=n.by; R.lastHitT=R.t; }
      for(const [part,f] of [['thorax',0.35],['stomach',0.2],['lleg',0.15],['rleg',0.15],['larm',0.075],['rarm',0.075]]) playerHit(dmg*f,F.pen,byName,part,{x:n.x,z:n.z}); }
    if(!NET.on||NET.host){ for(const e of R.enemies){ if(e.dead) continue; const d=Math.hypot(e.pos.x-n.x,e.pos.z-n.z); if(d>F.r||!los(n.x,n.y+0.2,n.z,e.pos.x,e.pos.y+1.2,e.pos.z)) continue; const dmg=F.dmg*Math.pow(1-d/F.r,1.3); hitEnemy(e,'thorax',{dmg,pen:F.pen,id:'frag'},new THREE.Vector3(e.pos.x,e.pos.y+1,e.pos.z),n.by==='me'?undefined:n.by); }
      for(const d of (R.drones||[])) if(!d.dead&&Math.hypot(d.x-n.x,d.z-n.z,d.y-n.y)<F.r) droneHit(d,{dmg:F.dmg},{x:d.x,y:d.y,z:d.z},true); }
    return; }
  if(n.k==='flash'){ const F=NADE.flash; flashAt(n.x,n.y+0.5,n.z); puff(p,0xffffff,8,4); sfxNoise(0.35,2400,0.5*Math.max(0.1,1-dMe/80),'highpass'); hearShot(n.x,n.z,40);
    if(dMe<F.r&&seeMe){ camera.updateMatrixWorld(); _dir.set(0,0,-1).applyQuaternion(camera.quaternion); const tx=(n.x-camera.position.x)/Math.max(dMe,0.1), tz=(n.z-camera.position.z)/Math.max(dMe,0.1); const facing=Math.max(0,_dir.x*tx+_dir.z*tz);
      const k=(1-dMe/F.r)*(0.35+0.65*facing); blind(F.t*k+0.6,k); }
    if(!NET.on||NET.host) for(const e of R.enemies){ if(e.dead) continue; const d=Math.hypot(e.pos.x-n.x,e.pos.z-n.z); if(d>F.r*0.8||!los(n.x,n.y+0.2,n.z,e.pos.x,e.pos.y+1.5,e.pos.z)) continue; e.react=Math.max(e.react||0,F.t*(1-d/F.r)+0.8); e.cool=Math.max(e.cool||0,F.t*(1-d/F.r)); e.flashT=R.t+F.t; e.state='combat'; }
    return; }
  // smoke
  sfxNoise(1.2,700,0.18*Math.max(0.1,1-dMe/60)); smokeCloud(n.x,groundAt(n.x,n.z,n.y+0.2),n.z,n.k);
  if((n.k==='smoker'||n.k==='smokeg')&&(n.by==='me'||(n.by&&isMate(n.by)))){ R.sigs=R.sigs||[]; R.sigs.push({x:n.x,z:n.z,k:n.k,t:R.t+60,by:n.by==='me'?'You':NET.players[n.by]?NET.players[n.by].name:'Squad'}); if(n.by!=='me') msg(`${R.sigs[R.sigs.length-1].by} popped ${n.k==='smoker'?'red smoke: enemy there':'green smoke: friendly, regroup'}`); }
}
// flashbanged: white screen and ringing ears
function blind(t,k){ const el=$('#flashwhite'); if(!el) return; R.blindT=Math.max(R.blindT||0,t); R.blindK=Math.max(R.blindK||0,k); sfxTone(3600,Math.min(4,t),0.05*k,'sine'); }
function blindTick(dt){ const el=$('#flashwhite'); if(!el) return; if((R.blindT||0)>0){ R.blindT-=dt; el.style.opacity=Math.min(1,R.blindK*Math.min(1,R.blindT/1.2)+0.1).toFixed(2); el.hidden=false; } else if(!el.hidden){ el.hidden=true; R.blindK=0; } }

/* ---- smoke ---- */
let _smokeTex=null;
function smokeTex(){ if(_smokeTex) return _smokeTex; const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,2,32,32,31); gr.addColorStop(0,'rgba(255,255,255,0.95)'); gr.addColorStop(0.6,'rgba(255,255,255,0.45)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); return _smokeTex=new THREE.CanvasTexture(c); }
function smokeCloud(x,y,z,k){ R.smokes=R.smokes||[]; const S0={x,y,z,k,t0:R.t,end:R.t+NADE.smoke.life,r:0.5,parts:[]}; const col=SMOKE_COL[k]||0xd8dde0;
  for(let i=0;i<22;i++){ const m=new THREE.SpriteMaterial({map:smokeTex(),color:col,transparent:true,opacity:0,depthWrite:false}); const s=new THREE.Sprite(m); const a=Math.random()*6.28, d=Math.random();
    s.userData={a,d,h:0.4+Math.random()*2.6,sp:0.2+Math.random()*0.5,sz:2+Math.random()*2.5}; scene.add(s); S0.parts.push(s); }
  R.smokes.push(S0); }
function smokeTick(dt){ if(!R.smokes||!R.smokes.length) return;
  for(const s of R.smokes){ const age=R.t-s.t0, left=s.end-R.t; s.r=NADE.smoke.r*Math.min(1,age/NADE.smoke.grow); const fade=Math.min(1,left/6);
    for(const p of s.parts){ const u=p.userData; u.a+=dt*u.sp*0.2; const rr2=s.r*u.d; p.position.set(s.x+Math.cos(u.a)*rr2,s.y+u.h*Math.min(1,0.3+age/3),s.z+Math.sin(u.a)*rr2); const sc=u.sz*(0.4+0.6*Math.min(1,age/NADE.smoke.grow)); p.scale.set(sc,sc,1); p.material.opacity=0.55*fade*Math.min(1,age*2); } }
  for(const s of R.smokes) if(R.t>=s.end){ for(const p of s.parts){ scene.remove(p); p.material.dispose(); } s.gone=true; }
  R.smokes=R.smokes.filter(s=>!s.gone); }
// does a line pass through smoke? (enemy sight and drones)
function smokeBlocks(ax,ay,az,bx,by,bz){ if(!R||!R.smokes||!R.smokes.length) return false; const dx=bx-ax, dy=by-ay, dz=bz-az, L2=dx*dx+dy*dy+dz*dz||1;
  for(const s of R.smokes){ if(s.r<1.5) continue; const cy=s.y+1.5; const t=clamp(((s.x-ax)*dx+(cy-ay)*dy+(s.z-az)*dz)/L2,0,1); const px=ax+dx*t-s.x, py=ay+dy*t-cy, pz=az+dz*t-s.z; if(px*px+py*py*0.5+pz*pz<s.r*s.r*0.8) return true; } return false; }

/* ---- squad signals (red / green smoke) and the HUD markers for them ---- */
function sigTick(){ let box=$('#sigs'); if(!box){ const hud=$('#hud'); if(!hud) return; box=document.createElement('div'); box.id='sigs'; hud.appendChild(box); } R.sigs=(R.sigs||[]).filter(s=>s.t>R.t); const seen=new Set(); camera.updateMatrixWorld(); const W=innerWidth, H=innerHeight;
  R.sigs.forEach((s,i)=>{ const key='sig'+i+s.k+Math.round(s.x); seen.add(key); let el=box.querySelector(`[data-sg="${key}"]`); if(!el){ el=document.createElement('div'); el.className='matemk sigmk '+(s.k==='smoker'?'red':'green'); el.dataset.sg=key; box.appendChild(el); }
    _v.set(s.x,(R.terrain?R.terrain(s.x,s.z):0)+2.5,s.z).project(camera); let x=_v.x, y=_v.y; if(_v.z>1){ x=-x; y=-1.4; } const off=_v.z>1||Math.abs(x)>0.94||Math.abs(y)>0.88; if(off){ const m=Math.max(Math.abs(x)/0.94,Math.abs(y)/0.88); x/=m; y/=m; }
    el.style.transform=`translate(${Math.round(clamp((x+1)/2*W,64,W-64))}px,${Math.round(clamp((1-y)/2*H,24,H-24))}px)`; const d=Math.round(Math.hypot(s.x-P.pos.x,s.z-P.pos.z));
    const txt=`${s.k==='smoker'?'Enemy':'Regroup'} · ${esc(s.by)} · ${d} m`; if(el._t!==txt){ el._t=txt; el.innerHTML=`<i></i><span>${txt}</span>`; } });
  for(const el of [...box.querySelectorAll('[data-sg]')]) if(!seen.has(el.dataset.sg)) el.remove(); }
function grenadesTick(dt){ nadeTick(dt); smokeTick(dt); blindTick(dt); sigTick(); }
