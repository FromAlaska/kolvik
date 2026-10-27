/* 53-enemies: enemy kinds, spawning, AI behaviour, shooting, damage, loot */
/* ---- enemies ---- */
const EK={
 scav:{name:'Scav',hp:100,head:28,acc:0.58,react:[0.45,0.8],guns:[['makar',3],['vintik',3],['tundra',2],['akr',1.6],['nord',0.5]],armor:[[null,4],['vest',4],['aramid',2]],helm:[[null,5],['hardhat',4],['bastion',0.6]],coat:0x5d5a3c,loot:[1,3],cash:[80,400],call:22,bonus:0.05},
 raider:{name:'Raider',hp:120,head:28,acc:0.7,react:[0.32,0.58],guns:[['akr',4],['vintik',1.5],['nord',1],['tundra',1],['kestrel',0.4]],bp:0.4,mods:0.35,armor:[['aramid',3],['plate',3],['vest',1]],helm:[[null,1],['hardhat',1],['bastion',3],['glacier',0.4]],coat:0xc7cdd0,loot:[2,4],cash:[250,900],call:32,bonus:0.15},
 guard:{name:"Chief's guard",hp:120,head:28,acc:0.68,react:[0.35,0.6],guns:[['akr',1]],bp:0.5,mods:0.3,armor:[['aramid',1],['plate',1]],helm:[['hardhat',1],['bastion',1]],coat:0x2f3b45,loot:[1,3],cash:[300,800],home:4,call:32,bonus:0.2},
 chief:{name:'Station Chief Halvorsen',hp:200,head:40,acc:0.76,react:[0.28,0.48],guns:[['akr',1]],ammo:'a545bp',mods:1,armor:[['plate',1]],helm:[['bastion',1]],coat:0x8a221b,call:40,loot:[2,3],cash:[1500,3000],special:['satphone','goldbar'],trophy:'tr_chief',home:3},
 vguard:{name:'Vault guard',hp:130,head:28,acc:0.72,react:[0.3,0.55],mods:0.4,call:30,bonus:0.25,guns:[['akr',3],['tundra',1],['kestrel',1]],ammo:'a545bp',armor:[['plate',3],['warden',1]],helm:[['bastion',3],['glacier',1]],coat:0x1f2a33,loot:[1,3],cash:[400,1200],home:7},
 warden:{name:'Vault Warden Brekke',hp:260,head:45,acc:0.8,react:[0.25,0.42],mods:1,call:40,guns:[['kestrel',1]],armor:[['warden',1]],helm:[['glacier',1]],coat:0x5a1a6b,loot:[2,3],cash:[3000,6000],special:['blackbox','bearer'],trophy:'tr_warden',home:5},
 foreman:{name:'Mine Foreman Rask',hp:230,head:42,acc:0.74,react:[0.28,0.48],call:40,guns:[['tundra',1]],armor:[['plate',1]],helm:[['bastion',1]],coat:0x8a6a1a,loot:[2,3],cash:[2000,4000],special:['goldbar','sensor'],trophy:'tr_foreman',home:6},
 jarl:{name:'Jarl Hrafn',hp:2600,head:99999,acc:0.3,react:[0.25,0.4],guns:[['jarlmg',1]],ammo:'a762',armor:[['warden',1]],helm:[['glacier',1]],coat:0x3a1414,loot:[3,4],cash:[8000,15000],special:['goldbar','diamond','cryocell','cryocell'],boss:true,home:20,call:60,dr:0.6},
 relay:{name:'Relay Chief Dahl',hp:220,head:42,acc:0.74,react:[0.28,0.48],guns:[['akr',1]],ammo:'a545bp',mods:1,armor:[['plate',1]],helm:[['bastion',1]],coat:0x1f4a5a,call:40,loot:[2,3],cash:[1800,3600],special:['satphone','goldbar','sensor'],home:4},
 huskarl:{name:'Huskarl',hp:140,head:28,acc:0.7,react:[0.3,0.55],guns:[['akr',3],['kestrel',1],['tundra',1]],bp:0.6,mods:0.5,armor:[['plate',2],['warden',0.6]],helm:[['bastion',2],['glacier',1]],coat:0x4a2420,loot:[1,3],cash:[300,900],call:40,bonus:0.3},
 harbor:{name:'Harbormaster Vinter',hp:240,head:42,acc:0.74,react:[0.28,0.48],guns:[['kestrel',1]],mods:1,armor:[['plate',1]],helm:[['bastion',1]],coat:0x2a3f5a,call:40,loot:[2,3],cash:[2500,5000],special:['satphone','meteorite'],home:6},
 warlord:{name:'Warlord Skarde',hp:650,head:70,acc:0.74,react:[0.3,0.5],guns:[['jarlmg',1]],bp:0.8,armor:[['warden',1]],helm:[['glacier',1]],coat:0x2a1a1a,loot:[3,5],cash:[2000,4000],call:50,bonus:0.5},
 mguard:{name:'Mine guard',hp:125,head:28,acc:0.66,react:[0.35,0.6],bp:0.3,mods:0.3,call:32,bonus:0.2,guns:[['akr',2],['vintik',1]],armor:[['aramid',1],['plate',0.5]],helm:[['hardhat',1]],coat:0x4a4030,loot:[1,2],cash:[200,600],home:8},
};
const ELOOT=[['smokes',2],['handwarm',1.2],['tourniquet',0.8],['medal',0.4],['compass',0.3],['caviar',0.5],['lockpick',0.12],['bolts',2.5],['tape',2.5],['battery',2],['wire',2],['aquavit',1.5],['bandage',2.5],['thermos',2],['ifak',1.4],['watch',0.9],['notebook',0.8],['powder',1.2],['radio',0.5],['medsup',0.8],['fuel',0.4],['satphone',0.25],['fieldkit',0.35],['goldbar',0.12]];
// a lucky extra: rolled on top of normal loot (rare find in containers, bonus on tougher bodies)
const JACKPOT=[['meteorite',0.8],['drive',2],['laptop',2],['ivory',2],['camera',2],['goldbar',3],['thermal',2],['sensor',3],['satphone',3],['watch',4],['diamond',1],['icecore',1.5],['kestrel',1],['glacier',1],['plate',1.5],['scope4',2],['prism',2],['suppr',2],['fieldkit',3],['a545bp',3]];
const PREF={jarlmg:26,makar:9,vintik:13,tundra:6,akr:22,nord:40,kestrel:35};
function humanoid(o){
  const g=new THREE.Group(); g.rotation.order='YXZ'; const coat=o.coatM||MC(o.coat), pants=o.pantsM||MC(0x2b2f33), mask=o.maskM||MC(o.face||0x1f2225), glove=o.gloveM||MC(0x222426); const parts=[];
  // B places a box by its position on the standing body (feet at 0) and hangs it on a joint: par is the joint, at
  // (0,base,0) on the standing body, so every box keeps the measurements it always had
  const B=(w,h,d,x,y,z,m,part,par=g,base=0)=>{ const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); b.position.set(x,y-base,z); b.userData=Object.assign({part},o.ud); par.add(b); if(part) parts.push(b); return b; };
  // joints (58-body.js moves them): the pelvis carries the legs; the spine carries the chest, head and the arms with
  // the gun. Both sit at the hips (0.9) so the chest can lean, twist and crouch over the legs.
  const pelvis=new THREE.Group(); pelvis.position.set(0,0.9,0); g.add(pelvis);
  const spine=new THREE.Group(); spine.rotation.order='YXZ'; spine.position.set(0,0.9,0); g.add(spine);
  const Bs=(w,h,d,x,y,z,m,part)=>B(w,h,d,x,y,z,m,part,spine,0.9);
  // legs: hip joint, thigh, knee joint, shin; together 0.86 m, the same as the old one-piece leg
  const leg=sx=>{ const hip=new THREE.Group(); hip.rotation.order='ZXY'; hip.position.set(sx*0.12,-0.04,0); pelvis.add(hip);
    B(0.2,0.45,0.24,0,-0.215,0,pants,'legs',hip); const knee=new THREE.Group(); knee.position.set(0,-0.44,0); hip.add(knee);
    B(0.19,0.43,0.23,0,-0.205,0,pants,'legs',knee); B(0.2,0.09,0.29,0,-0.375,-0.035,MC(0x1d1f21),null,knee); return {hip,knee}; };
  const ll=leg(-1), rl=leg(1);
  Bs(0.56,0.68,0.36,0,1.2,0,coat,'thorax');
  // arms: a joint at each shoulder, flush with the side of the torso, and the hand fixed to the end of the arm so it
  // goes wherever the arm goes. The arm hangs from the joint, so ARM_PITCH tips it forward; Math.PI-1.6 is Jim's
  // -1.6 rad setting (held out level, a touch below the shoulder). ARM_IN turns both arms in so the hands meet on the
  // gun. The arms and gun hang on the 'aim' joint at shoulder height, which tilts them all together to aim.
  const aim=new THREE.Group(); aim.position.set(0,1.42-0.9,0); spine.add(aim);
  const arm=sx=>{ const pv=new THREE.Group(); pv.rotation.order='YXZ'; pv.position.set(sx*0.36,0,0.06); pv.rotation.set(ARM_PITCH,sx*ARM_IN,0); aim.add(pv);
    B(0.16,0.56,0.18,0,-0.28,0,coat,'arm',pv); B(0.11,0.11,0.13,0,-0.6,0,glove,null,pv); return pv; };
  const la=arm(-1), ra=arm(1);
  const head=new THREE.Group(); head.position.set(0,1.52-0.9,0); spine.add(head);
  const Bh=(w,h,d,x,y,z,m,part)=>B(w,h,d,x,y,z,m,part,head,1.52);
  Bh(0.28,0.3,0.29,0,1.7,0,mask,'head');
  // a forgiving head hitbox: an invisible box a little bigger than the head and helmet, so headshots land when they look like they should
  { const hb=Bh(0.46,0.46,0.46,0,1.74,0,HITBOX,'head'); hb.visible=false; } if(o.hat) Bh(0.3,0.08,0.3,0,1.66,-0.01,MC(0x7a5a3a),null);
  if(o.helm!=null){ Bh(0.33,0.15,0.34,0,1.87,0,MC(o.helm),'head'); if(o.hv>=6) Bh(0.3,0.09,0.03,0,1.73,-0.16,MC(0x1a3a46),null); } else if(o.hg) addHeadgear(Bh,o.hg); else Bh(0.3,0.12,0.3,0,1.88,0,coat,'head');
  // the gun, held between the two hands: the real model of whatever they carry (setHeldGun in 55-fx-viewmodel.js)
  const gun=new THREE.Group(); gun.position.set(0,-0.02,-0.36); aim.add(gun); gun.userData.z0=gun.position.z;
  if(o.armor!=null) Bs(0.6,0.5,0.4,0,1.22,0,MC(o.armor),'thorax');
  const rig={g,pelvis,spine,aim,head,gun,la,ra,ll,rl,s:bodyNew()};
  return {g,lp:ll.hip,rp:rl.hip,la,ra,head,parts,rig};
}
const ARM_PITCH=Math.PI-1.6, ARM_IN=0.5;
const HITBOX=new THREE.MeshBasicMaterial({visible:false});
function spawnEnemy(x,z,kind){
  if(kind==='scav'&&R.cond&&R.cond.mod==='quiet'&&rand()<0.4) return;
  const k=EK[kind]; const gunId=wpick(k.guns); const gd=ITEMS[gunId];
  let e; e={k,kind,home:{x,z},yaw:rand()*6.28,hp:k.hp,headHp:k.head,state:'patrol',think:rand()*0.3,react:0,cool:0,burst:3,reloadT:0,sees:false,tgtId:null,lastSeen:null,lostT:0,wp:null,wait:rand()*3,strafeT:0,strafeS:1,detourT:0,detourS:1,prog:0,progT:0,walk:0,dead:false,first:true,moving:false,idx:R.enemies.length,
    gun:mk(gunId,{mag:gd.magSize,ammo:k.ammo&&ITEMS[k.ammo].cal===gd.cal?k.ammo:(k.bp&&rand()<k.bp?CALS[gd.cal][CALS[gd.cal].length-1]:CALS[gd.cal][0])}),
    role:(k.home||rand()<0.5)?'hold':'rush',alertT:0};
  { const D=R.D||DIFF.normal; e.hp=Math.round(k.hp*D.hp); e.headHp=Math.round(k.head*(1+(D.hp-1)*0.5)); e.maxHp=e.hp; if(D.bp&&!k.ammo&&rand()<D.bp) e.gun.ammo=CALS[gd.cal][CALS[gd.cal].length-1]; }
  if(k.mods&&rand()<k.mods){ const opts=Object.values(ITEMS).filter(a=>a.type==='att'&&a.fits.includes(gunId)&&!e.gun.att[a.aslot]); if(opts.length){ const a=opts[Math.floor(rand()*opts.length)]; e.gun.att[a.aslot]=mk(a.id); } }
  const ar=wpick(k.armor), he=wpick(k.helm); e.armor=ar?mk(ar,{dur:ITEMS[ar].dur*rr(0.7,1)}):null; e.helm=he?mk(he,{dur:ITEMS[he].dur*rr(0.7,1)}):null;
  e.pref=PREF[gunId]||15;
  { const gn=gaPick(kind); if(gn){ e.gen=gn; e.genes=gn.g; } aiApplyGenes(e); }

  const h=humanoid({coat:k.coat,face:(kind==='chief'||kind==='warden')?0xc9a487:0x1f2225,hat:kind==='chief',helm:e.helm?(ITEMS[e.helm.id].cls>=4?0x3e4a3a:0xd8b13a):null,armor:e.armor?(ITEMS[e.armor.id].cls>=4?0x3b4636:0x5b5f50):null,ud:{enemy:e}});
  setHeldGun(h.rig,gunId); e.g=h.g; e.rig=h.rig; e.lp=h.lp; e.rp=h.rp; e.parts=h.parts; e.g.rotation.y=e.yaw; e.g.position.set(x,R.terrain?R.terrain(x,z):0,z); e.pos=e.g.position; e.grp=aiGroupOf(e); e.nx=x; e.nz=z; e.nyaw=e.yaw;
  if(k.boss){ e.g.scale.setScalar(1.45); const horn=MC(0xd8cfb8); for(const sx of [-1,1]){ const hn=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.2,0.05),horn); hn.position.set(sx*0.17,2.0-1.52,0); hn.rotation.z=-sx*0.5; hn.userData={part:null,enemy:e}; h.head.add(hn); } R.boss={e,awake:false,phase:1,mortT:6,maxHp:e.hp}; }
  scene.add(e.g); e.g.traverse(o=>o.layers.enable(1)); R.enemies.push(e);
}
const lerpA=(a,b,t)=>{ let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI; return a+d*t; };
const _a=new THREE.Vector3(), _b=new THREE.Vector3(), _dir=new THREE.Vector3();
function los(ax,ay,az,bx,by,bz){ _a.set(ax,ay,az); _b.set(bx-ax,by-ay,bz-az); const d=_b.length(); if(d<0.01) return true; _b.divideScalar(d); ray.set(_a,_b); ray.far=d-0.3; return ray.intersectObjects(R.ray,false).length===0; }
// anyone the AI could go after: the local player plus online players
function targets(){
  const list=[];
  // someone in an aircraft is a target only while it's low and slow enough for a rifleman: the airframe takes the hits (see playerHit)
  const airAlt=(x,z,y)=>y-Math.max(R.terrain?R.terrain(x,z):0,0);
  if(P&&!P.dead&&!P.down&&!(R.fly&&airAlt(P.pos.x,P.pos.z,P.y)>35)) list.push({jam:myJammer(),ride:!!R.ride,fresh:freshness(),id:'me',grace:P.grace>0,x:P.pos.x+(P.leanX||0)*Math.cos(P.yaw),z:P.pos.z-(P.leanX||0)*Math.sin(P.yaw),eye:P.y+P.eye,crouch:P.crouch,sneak:P.sneak,sprint:P.sprint,moving:Math.hypot(P.vx,P.vz)>0.6,vel:Math.hypot(P.vx,P.vz)});
  if(NET.on) for(const id in NET.players){ const st=NET.players[id].st; if(st&&!st.dead&&!st.down&&!((st.pl||st.gs)&&airAlt(st.x,st.z,st.y||0)>35)) list.push({id,ride:!!st.rd,jam:!!st.jam,fresh:st.gf??1,grace:!!st.grace,x:st.x,z:st.z,eye:(st.y||0)+(st.crouch?1.08:1.62),crouch:st.crouch,sneak:st.sneak,sprint:st.sprint,moving:st.moving,vel:st.sprint?5:(st.moving?3:0)}); }
  { const tt=typeof tdTarget==='function'?tdTarget():null; if(tt) list.push(tt); } // the mast on Last Light (78-holdout.js)
  return list;
}
// how far out an enemy will shoot: no further than you could see it through the fog, and never past 55 m
// (75 m with a scope), so you aren't hit by someone you have no way to see
function eEngage(e){ const fog=scene.fog&&scene.fog.density?Math.max(20,0.85/scene.fog.density):120; const g=ITEMS[e.gun.id], sc=g.zoom||(e.gun.att&&e.gun.att.optic&&ITEMS[e.gun.att.optic.id].zoom>2); return Math.min(fog,sc?75:55)*(e.k.boss?1.15:1); }
function canSeeT(e,t,dist){
  if(t.grace) return false;
  let range=(R.map==='whiteout'?40:R.map==='vault'?34:R.map==='skarsvik'?80:70)*(R.sight||1); if(t.crouch) range*=0.72; if(t.sneak) range*=0.8;
  // fair sight: nobody spots you deeper into the fog than you could spot them (fog factor about 0.3)
  if(scene.fog&&scene.fog.density) range=Math.min(range,1.1/scene.fog.density);
  if(e.aware>R.t) range*=1.15;
  if(t.fresh<1) range*=0.5+0.5*t.fresh;  // just out of insertion cover: they're slow to pick you out  // warned on the radio or spooked: looking harder
  if(dist>range) return false;
  if(Math.abs(t.eye-e.pos.y)>30) return false; // nobody on foot picks out someone that far above them
  if(e.state!=='combat' && dist>5){ const fx=-Math.sin(e.yaw), fz=-Math.cos(e.yaw); const dx=(t.x-e.pos.x)/dist, dz=(t.z-e.pos.z)/dist; if(fx*dx+fz*dz<(e.aware>R.t?-0.25:0.15)) return false; }
  return los(e.pos.x,e.pos.y+eEye(e),e.pos.z,t.x,t.eye,t.z);
}
function noiseR(t){ if(t.grace) return 0; const h=(R&&R.hear)||1; if(t.sprint) return 14*h; if(!t.moving) return 0; if(t.sneak) return 1.2*h; if(t.crouch) return 2.5*h; return 6*h; }
function bldAt(x,z){ for(const b of R.bld) if(x>b.x0-0.2&&x<b.x1+0.2&&z>b.z0-0.2&&z<b.z1+0.2) return b; return null; }
// route through a doorway when the enemy and its goal are on different sides of a wall
function routeVia(e,tx,tz){
  const be=bldAt(e.pos.x,e.pos.z), bt=bldAt(tx,tz); if(be===bt) return [tx,tz];
  const b=be||bt; if(!b.doors||!b.doors.length) return [tx,tz];
  const rx=be?tx:e.pos.x, rz=be?tz:e.pos.z; let best=null,bd=1e9;
  for(const d of b.doors){ const v=Math.hypot(d[0]-rx,d[1]-rz)+Math.hypot(d[0]-e.pos.x,d[1]-e.pos.z); if(v<bd){ bd=v; best=d; } }
  const inner=[best[0]-best[2]*0.9,best[1]-best[3]*0.9], outer=[best[0]+best[2]*0.9,best[1]+best[3]*0.9];
  const first=be?inner:outer, second=be?outer:inner;
  return Math.hypot(first[0]-e.pos.x,first[1]-e.pos.z)>0.6 ? first : second;
}
// feet on the ground: speed builds up and drops off instead of switching instantly, and the way they're heading
// swings round quickly but not instantly, slowing for sharp corners
const ESTEP={acc:8, dec:12, turn:13};
function eWalk(e,dx,dz,speed,dt){
  let v=Math.hypot(e.vx||0,e.vz||0), hx=v>0.05?e.vx/v:dx, hz=v>0.05?e.vz/v:dz;
  const want=Math.atan2(dx,dz), have=Math.atan2(hx,hz), dA=Math.atan2(Math.sin(want-have),Math.cos(want-have));
  const turn=v<0.6?dA:clamp(dA,-ESTEP.turn*dt,ESTEP.turn*dt), h=have+turn; hx=Math.sin(h); hz=Math.cos(h);
  const target=speed*Math.max(0.35,Math.cos(Math.min(Math.PI/2,Math.abs(dA))));
  v=v<target?Math.min(target,v+ESTEP.acc*dt):Math.max(target,v-ESTEP.dec*dt);
  e.vx=hx*v; e.vz=hz*v; e.stepped=true;
  const ox=e.pos.x, oz=e.pos.z; moveCol(e.pos,e.vx*dt,e.vz*dt,0.35);
  // blocked: lose the speed that went into the wall
  if(dt>0){ const rx=(e.pos.x-ox)/dt, rz=(e.pos.z-oz)/dt; e.vx+=(rx-e.vx)*0.5; e.vz+=(rz-e.vz)*0.5; } }
// nobody asked it to move this frame: it slows to a stop over a step or two
function eCoast(e,dt){ const v=Math.hypot(e.vx||0,e.vz||0); if(v<0.02){ e.vx=e.vz=0; return; } const n=Math.max(0,v-ESTEP.dec*dt)/v; e.vx*=n; e.vz*=n; if(e.vx||e.vz) moveCol(e.pos,e.vx*dt,e.vz*dt,0.35); }
// a leg hit slows them for a few seconds
const eLimp=e=>e.rig&&e.rig.s.limp>0?0.8:1;
function eMove(e,tx,tz,speed,dt){
  if(Math.hypot(tx-e.pos.x,tz-e.pos.z)<0.5) return true;
  const [gx,gz]=navStep(e,tx,tz);
  let dx=gx-e.pos.x, dz=gz-e.pos.z; const d=Math.hypot(dx,dz)||0.001; dx/=d; dz/=d;
  if(e.detourT>0){ e.detourT-=dt; const px=-dz*e.detourS, pz=dx*e.detourS; dx=dx*0.25+px; dz=dz*0.25+pz; const l=Math.hypot(dx,dz); dx/=l; dz/=l; }
  const ox=e.pos.x, oz=e.pos.z; eWalk(e,dx,dz,speed*eLimp(e),dt);
  e.prog+=Math.hypot(e.pos.x-ox,e.pos.z-oz); e.progT+=dt; if(e.progT>0.7){ if(e.prog<speed*0.7*0.3){ e.stuck=(e.stuck||0)+1; e.pathT=0; e.clearT=0; if(e.stuck>1){ e.detourT=0.6+rand()*0.6; e.detourS=rand()<0.5?-1:1; } if(e.stuck>6&&e.wp){ e.wp=null; e.stuck=0; } } else e.stuck=0; e.prog=0; e.progT=0; }
  if(!e.sees) e.yaw=lerpA(e.yaw,Math.atan2(-dx,-dz),Math.min(1,dt*6)); e.moving=true; return false;
}

/* ================= DEBUG HOOKS =================
   The debug panel lives in debug.js, which the server only hands to accounts listed in ADMINS. These flags are all the
   game itself knows about it. */
const DBG={god:false,ammo:false,aiOff:false,scale:1,cond:null,seed:null,tick:null,open:null};
// every player's uncaught errors are kept here and reported to the server so an admin can read them
const ERRLOG=[]; let errSent=0;
function logErr(msg,stack){ const e={t:Date.now(),msg:String(msg).slice(0,300),stack:String(stack||'').slice(0,800),where:R?`raid ${R.map}`:`hub ${TAB}`}; ERRLOG.push(e); if(ERRLOG.length>60) ERRLOG.shift();
  if(NET.avail&&errSent<20){ errSent++; fetch('api/clienterror',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.assign({name:ACC.name||S&&S.name||'',ua:navigator.userAgent.slice(0,120)},e))}).catch(()=>{}); } }
addEventListener('error',ev=>logErr(ev.message||'error',ev.error&&ev.error.stack||`${ev.filename||''}:${ev.lineno||''}`));
addEventListener('unhandledrejection',ev=>logErr('Unhandled promise: '+(ev.reason&&ev.reason.message||ev.reason),ev.reason&&ev.reason.stack));
// an admin on the server can send you cash, caches, scrip or items; they land in your save right away
function applyGrant(m,quiet){ ensureCos(); const got=[], lost=[]; const cash=m.cash|0;
  if(cash>0){ S.cash+=cash; got.push(fmt$(cash)); } else if(cash<0){ const take=Math.min(S.cash,-cash); S.cash-=take; lost.push(fmt$(take)); }
  if(m.caches){ S.cos.caches+=m.caches|0; got.push(`${m.caches} sealed caches`); } if(m.scrip){ S.cos.scrip+=m.scrip|0; got.push(`${m.scrip} scrip`); }
  for(const [id,n] of (Array.isArray(m.items)?m.items.slice(0,20):[])){ if(!ITEMS[id]) continue; const d=ITEMS[id]; const it=mk(id,d.stack?{n:Math.max(1,Math.min(d.stack,n|0||d.stack))}:{}); if(place(S.stash,it)) got.push(d.name); else lost.push(`${d.name} (no room in your stash)`); }
  if(quiet) return {got,lost};
  // mid-raid, save the way the raid does (your gear stays at risk); in the hideout, a normal save
  if(R) raidSave(); else { saveGame(); renderTab(); }
  const say=[got.length?`An admin sent you ${got.join(', ')}.`:'', lost.length?(cash<0?`An admin took ${lost.join(', ')}.`:`Not delivered: ${lost.join(', ')}.`):''].filter(Boolean).join(' ')||'An admin sent you nothing.'; if(R) msg(say); else toast(say); }
// gifts sent while you were offline wait in your save until you next sign in
function takeGrants(){ if(!S||!Array.isArray(S.grants)||!S.grants.length) return; const got=[]; for(const g of S.grants){ const r=applyGrant(g,true); got.push(...r.got); } delete S.grants; saveGame(); if(got.length) setTimeout(()=>toast(`While you were away an admin sent you ${got.join(', ')}.`),400); }
function forceCond(mapId,f){ const c=conditions(mapId), mc=MAP_COND[mapId]; const weather=WEATHER[f.weather]?f.weather:c.weather, mod=RMODS[f.mod]?f.mod:c.mod; const hot=mod==='hotzone'?((mc.hot||[])[0]||null):null; return {slot:c.slot,weather,mod,hot,W:WEATHER[weather],label:WEATHER[weather].name,modText:RMODS[mod].desc(mod==='hotzone'?hot:mc.boss)}; }
async function loadDebug(){ if(DBG.open) return true; if(!ACC.token) return false; try{ const r=await fetch('debug.js',{headers:{authorization:'Bearer '+ACC.token},cache:'no-store'}); if(!r.ok) return false; const sc=document.createElement('script'); sc.textContent=await r.text(); document.body.appendChild(sc); return !!DBG.open; }catch(e){ return false; } }
async function openDebug(){ if(!NET.admin) return; if(await loadDebug()) DBG.open(); else toast('Could not load the debug tools.'); }
addEventListener('keydown',e=>{ if(e.code==='F9'&&NET.admin){ e.preventDefault(); e.stopPropagation(); openDebug(); } },true);
