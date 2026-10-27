/* 63-locks: locked rooms, keys and lockpicks
   Every map (except the Vault and the race) has one to three small locked rooms near a landmark, each behind a steel
   door with a red lock light. Its key (an item, 10-items.js) turns up in desks, lockers, safes, crates and on bodies,
   most often for the map you're on. A key opens the door in a second and wears out after a few uses; a lockpick set
   takes about six noisy seconds and can snap a pick. Inside: strongboxes, weapon racks and supply shelves
   (50-engine.js) with better loot than anywhere else on the map. Doors stay open for everyone in the raid, and the
   AI walks through open ones. */
const LOCKS={
 kv_lab:{map:'kolvik',key:'k_lab',name:'Lab cold store',near:'Lab',theme:'lab'},
 kv_comms:{map:'kolvik',key:'k_comms',name:'Comms server room',near:'Comms',theme:'tech'},
 wo_depot:{map:'whiteout',key:'k_wxdepot',name:'Weather depot',near:null,theme:'stores'},
 wo_cage:{map:'whiteout',key:'k_fuelcage',name:'Fuel cage',near:null,theme:'stores'},
 if_cage:{map:'ironfjord',key:'k_rail',name:'Warehouse cage',near:'Warehouse',theme:'armory'},
 if_pantry:{map:'ironfjord',key:'k_pantry',name:'Mess hall pantry',near:'Mess hall',theme:'stores'},
 sk_crypt:{map:'skarsvik',key:'k_crypt',name:'Church crypt',near:'Church',theme:'treasure'},
 sk_archive:{map:'skarsvik',key:'k_archive',name:'Town hall archive',near:'Town hall',theme:'office'},
 sk_tower:{map:'skarsvik',key:'k_tower',name:'Tower strongroom',near:'Control tower',theme:'armory'},
 rv_powder:{map:'ravnskar',key:'k_powder',name:'Powder magazine',near:'Powder store',theme:'armory'},
 td_relay:{map:'storvidda',key:'k_relay',name:'Relay vault',near:'Relay hall',theme:'treasure'},
 td_bunker:{map:'storvidda',key:'k_bunker',name:'Bunker armory',near:'Bunker',theme:'armory'},
 sj_trade:{map:'skerries',key:'k_trade',name:'Trading post safe room',near:'Trading post',theme:'treasure'},
 sj_vestry:{map:'skerries',key:'k_vestry',name:'Chapel vestry',near:'Chapel',theme:'office'},
 kf_police:{map:'kaldfjord',key:'k_kf_police',name:'Evidence room',near:'Police station',theme:'armory'},
 kf_payroll:{map:'kaldfjord',key:'k_kf_payroll',name:'Payroll office',near:'Mine office',theme:'treasure'},
 kf_radar:{map:'kaldfjord',key:'k_kf_radar',name:'Radar armory',near:'Radar ops',theme:'armory'},
 hr_lodge:{map:'hrimfell',key:'k_lodge',name:'Lodge cellar',near:'Lodge',theme:'stores'},
};
// what each kind of room holds (container types from 50-engine.js), and how much more of it
const LOCK_THEMES={lab:['strongbox','safe','shelf'],tech:['strongbox','shelf','desk'],stores:['shelf','shelf','strongbox'],armory:['rack','crate','strongbox'],treasure:['strongbox','strongbox','vsafe'],office:['strongbox','desk','safe']};
const LOCK={w:6,d:5,h:3.1,door:1.4,keyTime:1.2,pickTime:6,pickOdds:0.6,lootMult:1.35};
const KEYPOOL=()=>Object.keys(ITEMS).filter(k=>ITEMS[k].type==='key').map(k=>[k,1]);
// a key rolled from a loot table: two times in three it becomes one for the map you're on (if it has any)
function localKey(id){ if(!R||!ITEMS[id]||ITEMS[id].type!=='key') return id; const here=Object.values(LOCKS).filter(L=>L.map===R.map).map(L=>L.key); return here.length&&rand()<0.66?here[Math.floor(rand()*here.length)]:id; }

/* ---- building the rooms ---- */
// called once the map is built (60-raid.js), with the raid's seeded rand, so every player gets the same rooms
function addLockedRooms(mapId){
  R.doors=[]; const list=Object.entries(LOCKS).filter(([,L])=>L.map===mapId); if(!list.length) return;
  const used=[];
  list.forEach(([id,L],k)=>{ const spot=lockSpot(L,k,used); if(!spot) return; used.push(spot); buildLockedRoom(id,L,spot); });
}
// a flat, empty patch near the landmark, with the door facing it
function lockSpot(L,k,used){
  const W=LOCK.w, D=LOCK.d; let anchors=[];
  if(L.near) anchors=R.bld.filter(b=>b.name===L.near&&!b.locked);
  if(!anchors.length){ const bs=R.bld.filter(b=>!b.locked&&!b.outline&&(b.x1-b.x0)>4).slice().sort((a,b)=>Math.hypot((a.x0+a.x1)/2,(a.z0+a.z1)/2)-Math.hypot((b.x0+b.x1)/2,(b.z0+b.z1)/2)); if(bs.length) anchors=[bs[Math.min(bs.length-1,k*2)]]; }
  const A=anchors[0]||{x0:-4,x1:4,z0:-4,z1:4}; const ax=(A.x0+A.x1)/2, az=(A.z0+A.z1)/2;
  const base0=R.terrain?R.terrain(ax,az):0;
  for(let gap=2.5;gap<=22;gap+=1.5) for(let s=0;s<16;s++){
    const ang=s/16*Math.PI*2+k*0.7, ex=(A.x1-A.x0)/2+gap+W/2, ez=(A.z1-A.z0)/2+gap+D/2;
    const cx=ax+Math.cos(ang)*ex, cz=az+Math.sin(ang)*ez; if(lockFree(cx,cz,W,D,used)){
      const base=R.terrain?R.terrain(cx,cz):0; if(R.sea&&base<1) continue; if(R.terrain&&Math.abs(base-base0)>4) continue;
      // the door goes on the side facing the landmark
      const dx=ax-cx, dz=az-cz; const face=Math.abs(dx)/W>Math.abs(dz)/D?(dx>0?'e':'w'):(dz>0?'s':'n');
      return {x:cx,z:cz,face,base}; } }
  return null;
}
function lockFree(cx,cz,W,D,used){
  const m=1.4, x0=cx-W/2-m, x1=cx+W/2+m, z0=cz-D/2-m, z1=cz+D/2+m, B=R.bound-4;
  if(x0<-B||x1>B||z0<-B||z1>B) return false;
  if(R.free&&R.free(cx,cz)>-6) return false;
  const base=R.terrain?R.terrain(cx,cz):0;
  if(R.terrain){ for(const [px,pz] of [[x0,z0],[x1,z0],[x0,z1],[x1,z1],[cx,z0],[cx,z1],[x0,cz],[x1,cz]]) if(Math.abs(R.terrain(px,pz)-base)>0.35) return false; }
  for(const b of R.cols){ if(b.y1<base+0.3) continue; if(b.x1>x0&&b.x0<x1&&b.z1>z0&&b.z0<z1) return false; }
  for(const b of R.bld) if(b.x1+1>x0&&b.x0-1<x1&&b.z1+1>z0&&b.z0-1<z1) return false;
  for(const c of R.conts) if(c.x>x0-0.5&&c.x<x1+0.5&&c.z>z0-0.5&&c.z<z1+0.5) return false;
  for(const e of R.extracts) if(Math.hypot(e.x-cx,e.z-cz)<(e.r||6)+6) return false;
  for(const u of used) if(Math.abs(u.x-cx)<W+3&&Math.abs(u.z-cz)<D+3) return false;
  return true;
}
let _doorTex=null;
function doorMat(){ if(MATS.lockdoor) return MATS.lockdoor; if(!_doorTex) _doorTex=ctex(32,(g,s)=>{ g.fillStyle='#4a5258'; g.fillRect(0,0,s,s); g.fillStyle='#3a4146'; g.fillRect(2,2,s-4,s-4); g.fillStyle='#565f66'; g.fillRect(4,4,s-8,10); g.fillRect(4,18,s-8,10);
    for(let i=0;i<s;i+=6){ g.fillStyle='#d6b24a'; g.beginPath(); g.moveTo(i,s-6); g.lineTo(i+3,s-6); g.lineTo(i+6,s); g.lineTo(i+3,s); g.fill(); } g.fillStyle='#22272b'; g.fillRect(0,s-7,s,1); });
  const m=new THREE.MeshLambertMaterial({map:_doorTex}); ps1(m); return MATS.lockdoor=m; }
function buildLockedRoom(id,L,sp){
  const W=LOCK.w, D=LOCK.d, H=LOCK.h, DW=LOCK.door, keepY=R.yOff||0; R.yOff=sp.base;
  const pos=(sp.face==='n'||sp.face==='s')?W/2:D/2;
  building(sp.x,sp.z,W,D,H,{mat:M('concrete'),doors:{[sp.face]:[[pos,DW]]},name:L.name,nowin:true});
  const bl=R.bld[R.bld.length-1]; bl.locked=id;
  // the door: a steel slab on a hinge filling the gap, with a lock light outside
  const x0=sp.x-W/2, x1=sp.x+W/2, z0=sp.z-D/2, z1=sp.z+D/2; let hx,hz,ox,oz,alongX;
  if(sp.face==='n'){ hx=sp.x-DW/2; hz=z0; ox=0; oz=-1; alongX=true; } else if(sp.face==='s'){ hx=sp.x-DW/2; hz=z1; ox=0; oz=1; alongX=true; }
  else if(sp.face==='w'){ hx=x0; hz=sp.z-DW/2; ox=-1; oz=0; alongX=false; } else { hx=x1; hz=sp.z-DW/2; ox=1; oz=0; alongX=false; }
  const y=sp.base, hinge=new THREE.Group(); hinge.position.set(hx,y,hz); scene.add(hinge);
  const slab=new THREE.Mesh(new THREE.BoxGeometry(alongX?DW-0.04:0.1,2.26,alongX?0.1:DW-0.04),doorMat());
  slab.position.set(alongX?DW/2:0,1.13,alongX?0:DW/2); hinge.add(slab);
  const light=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.08,0.08),MB(0xff3a2a)); light.position.set((alongX?DW-0.22:0)+ox*0.07,1.25,(alongX?0:DW-0.22)+oz*0.07); hinge.add(light);
  const handle=new THREE.Mesh(new THREE.BoxGeometry(alongX?0.18:0.05,0.05,alongX?0.05:0.18),MC(0x22272b)); handle.position.set((alongX?DW-0.2:0)+ox*0.07,1.05,(alongX?0:DW-0.2)+oz*0.07); hinge.add(handle);
  const col=alongX?{x0:hx,x1:hx+DW,z0:hz-0.15,z1:hz+0.15,y0:y,y1:y+2.3}:{x0:hx-0.15,x1:hx+0.15,z0:hz,z1:hz+DW,y0:y,y1:y+2.3};
  R.cols.push(col); R.ray.push(slab);
  const door={id,L,x:alongX?hx+DW/2:hx,z:alongX?hz:hz+DW/2,ox,oz,hinge,slab,light,col,open:false,swing:0,dir:(sp.face==='s'||sp.face==='w')?1:-1,base:y};
  R.doors.push(door);
  // what's inside: three containers along the back wall
  const kinds=LOCK_THEMES[L.theme]||LOCK_THEMES.stores; const bx=-ox, bz=-oz;
  const inner=(t,u)=>{ const across=(u-1)*1.9; return (sp.face==='n'||sp.face==='s')?[sp.x+across,sp.z+bz*(D/2-0.75)]:[sp.x+bx*(W/2-1.0),sp.z+across*0.85]; };  // the door swings in, so they stand along the back wall
  kinds.forEach((t,u)=>{ const [cx,cz]=inner(t,u); container(t,cx,cz,LOCK.lootMult); const c=R.conts[R.conts.length-1]; c.room=id; });
  R.yOff=keepY;
}

/* ---- opening ---- */
function lockNear(){
  if(!R.doors||!R.doors.length||!P) return null; let best=null, bd=2.3; const fx=-Math.sin(P.yaw), fz=-Math.cos(P.yaw);
  for(const d of R.doors){ if(d.open) continue; const dx=d.x-P.pos.x, dz=d.z-P.pos.z, dist=Math.hypot(dx,dz); if(dist>bd) continue; if(dist>0.5&&(fx*dx+fz*dz)/dist<0.35) continue; bd=dist; best=d; }
  return best;
}
// where in your gear the key (or a lockpick set) is
function findCarried(pred){ for(const c of playerConts()) for(const it of c.items) if(pred(it)) return {c,it}; return null; }
function doorPrompt(d){ const k=findCarried(it=>it.id===d.L.key), pk=k?null:findCarried(it=>it.id==='lockpick');
  return `<kbd>E</kbd>${k?'Unlock':pk?'Pick the lock':'Locked'} · ${esc(d.L.name)}${k||pk?'':` · needs the ${esc(ITEMS[d.L.key].name)}`}`; }
function doorUse(d){
  if(R.unlock) return true;
  const k=findCarried(it=>it.id===d.L.key);
  if(k){ R.unlock={d,t:0,T:LOCK.keyTime,mode:'key'}; sfxKey(); return true; }
  const pk=findCarried(it=>it.id==='lockpick');
  if(pk){ R.unlock={d,t:0,T:LOCK.pickTime,mode:'pick',noiseT:0}; msg('Picking the lock. It is not quiet.'); return true; }
  sfxRattle(); msg(`Locked. The ${ITEMS[d.L.key].name} opens it${ITEMS.lockpick?', or a lockpick set':''}.`); return true;
}
// spend one use of a key or pick; at zero it's gone
function wearItem(found,what){ const {c,it}=found; it.uses=(it.uses??ITEMS[it.id].uses)-1; if(it.uses<=0){ c.items.splice(c.items.indexOf(it),1); msg(`${what}`); } }
function unlockTick(dt){
  const u=R.unlock; if(!u) return; const d=u.d;
  if(d.open||P.dead||P.down||Math.hypot(d.x-P.pos.x,d.z-P.pos.z)>2.8||R.invOpen){ R.unlock=null; return; }
  u.t+=dt;
  if(u.mode==='pick'){ u.noiseT-=dt; if(u.noiseT<=0){ u.noiseT=1.6; sfxPick(); if(!NET.on||NET.host) hearShot(P.pos.x,P.pos.z,8); else nsend({t:'shot',x:P.pos.x,z:P.pos.z,r:8}); } }
  if(u.t<u.T) return;
  R.unlock=null;
  if(u.mode==='key'){ const k=findCarried(it=>it.id===d.L.key); if(!k) return; wearItem(k,`The ${ITEMS[d.L.key].name} wore out in the lock.`); openDoor(d,true); }
  else { const pk=findCarried(it=>it.id==='lockpick'); if(!pk) return;
    if(rand()<LOCK.pickOdds){ wearItem(pk,'That was the last pick in the set.'); openDoor(d,true); }
    else { wearItem(pk,'The last pick snapped. The set is used up.'); sfxSnap(); msg('A pick snapped. Try again.'); } }
}
function openDoor(d,mine){
  if(d.open) return; d.open=true; d.light.material=MB(0x3cf07a);
  const i=R.cols.indexOf(d.col); if(i>=0) R.cols.splice(i,1); R.colsDirty=true;
  for(const list of [R.ray,R.targets]){ const j=list.indexOf(d.slab); if(j>=0) list.splice(j,1); }
  if(R.nav) buildNav(); // the AI can walk through it now
  sfxDoor(Math.hypot(d.x-P.pos.x,d.z-P.pos.z));
  if(mine){ msg(`${d.L.name} unlocked.`); if(NET.on) nsend({t:'door',id:d.id}); goalBump('rooms',1); }
}
function applyDoorMsg(id){ const d=(R&&R.doors||[]).find(x=>x.id===id); if(d) openDoor(d,false); }
// swing open doors on their hinges
function doorsTick(dt){ if(!R.doors) return; for(const d of R.doors) if(d.open&&d.swing<1){ d.swing=Math.min(1,d.swing+dt*1.6); const e=1-Math.pow(1-d.swing,3); d.hinge.rotation.y=d.dir*1.75*e; } unlockTick(dt); }
