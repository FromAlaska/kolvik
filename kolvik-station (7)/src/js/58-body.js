/* 58-body: how people move. One procedural rig drives every humanoid() body: scavs, bosses, other players and the
   workshop previews.
   - Legs are two bones (thigh, shin) solved with IK, so a foot on the ground stays put while the body passes over it
     instead of sliding. The gait blends from a walk (long ground contact, small lift) to a run (short contact, high
     knee) with speed, and the stride lengthens with speed the way people's does.
   - The hips turn toward where the body is going while the chest keeps facing where it looks, so strafing and
     backpedalling read properly; the chest counter-twists against the hips on every step.
   - The pelvis rises over the planted leg when walking and bounces when running, sways over the standing foot, and
     the body leans forward with speed, into turns, and against sudden stops.
   - Crouching, aiming up and down, recoil, a reload (the left hand goes to the pouch), flinching from hits, a limp
     after a leg hit, idle breathing, weight shifts and looking around, shuffling the feet when turning on the spot,
     and a fall when killed (knees go, then the body drops away from the shot).
   The arms keep Jim's rest angle (ARM_PITCH in 53-enemies.js); aiming tilts the whole shoulder line, and only a
   reload moves an arm on its own.
   bodyAnim(rig, inp, dt) poses one body. humanoid() builds the rig. */
const BODY={
  thigh:0.44, shin:0.42, pelvis:0.9,      // bone lengths, pelvis height standing (m); the hip joints sit 4 cm below it
  stride:[1.3,2.2], strideK:0.42,          // a full stride (two steps) = clamp(0.75 + 0.42 × speed)
  duty:[0.6,0.38],                         // how much of a stride each foot is on the ground: walking, running
  lift:[0.09,0.2],                         // how high the swinging foot comes up: walking, running
  runAt:[2.0,3.2],                         // speeds (m/s) where the walk turns into a run
  lean:[0.05,0.2],                         // forward lean walking, running (radians)
  crouchDrop:0.4, crouchLean:0.26,         // crouched: how far the pelvis drops, how far the chest leans in
  hipTurn:0.7,                             // most the hips turn away from the chest toward the way they're going
  flinch:{k:140,d:13},                     // the spring a hit knocks the chest on
};
const _bsm=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
const _bwrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function bodyNew(){ return {ph:Math.random(),t:Math.random()*20,vx:0,vz:0,v:0,px:null,pz:null,lastYaw:null,yawRate:0,fwdV:0,acc:0,gw:0,run:0,crouch:0,hipY:0,aimP:0,headY:0,headP:0,
  recoil:0,fp:0,fvp:0,fr:0,fvr:0,dip:0,limp:0,limpLeg:0,lookT:0,lookY:0,shuffle:0,shPh:0,dying:-1,fallDir:1,fallRoll:0,fallY:0,skip:0}; }
// two-bone leg IK: put the foot at (tx,ty,tz) in the pelvis frame, measured from the hip joint
function bodyLeg(L,tx,ty,tz){
  const a=BODY.thigh, b=BODY.shin, r=Math.max(0.05,Math.hypot(tx,ty));
  L.hip.rotation.z=Math.atan2(tx,-ty);                       // swing the leg out to the side first (order ZXY)...
  let d=Math.hypot(r,tz); d=clamp(d,Math.abs(a-b)+0.08,a+b-0.002);
  const at=Math.atan2(-tz,r), a1=Math.acos(clamp((a*a+d*d-b*b)/(2*a*d),-1,1)), kn=Math.acos(clamp((a*a+b*b-d*d)/(2*a*b),-1,1));
  L.hip.rotation.x=at+a1; L.knee.rotation.x=-(Math.PI-kn);  // ...then forward, with the knee bending back
}
const _bspring=(x,v,dt,k,d)=>{ const h=Math.min(dt,0.03); let n=Math.ceil(dt/h); while(n--){ v+=(-k*x-d*v)*h; x+=v*h; } return [x,v]; };
/* inp: {yaw            facing (radians, the game's convention)
         vx,vz          optional world velocity; left out, it's measured from how far the body moved
         crouch         bool
         aim            pitch of the gun toward what they're aiming at (+ up), or null to hold level
         alert          in a fight: knees soft, no idle looking around
         look           optional head turn (radians, + left) relative to the chest
         reload         0..1 through a reload, or -1
         sit, down      on a seat; downed (legs only) } */
function bodyAnim(rig,inp,dt){
  const s=rig.s, g=rig.g; if(!(dt>0)) return; dt=Math.min(dt,0.1); s.t+=dt;
  if(s.dying>=0) return bodyFall(rig,dt);
  // how it's actually moving
  let vx=0, vz=0; const x=g.position.x, z=g.position.z;
  if(inp.vx!=null){ vx=inp.vx; vz=inp.vz; } else if(s.px!=null){ vx=(x-s.px)/dt; vz=(z-s.pz)/dt; }
  s.px=x; s.pz=z; if(vx*vx+vz*vz>120){ vx=0; vz=0; }            // teleported, not running
  const kv=Math.min(1,dt*9); s.vx+=(vx-s.vx)*kv; s.vz+=(vz-s.vz)*kv; const v=Math.hypot(s.vx,s.vz); s.v=v;
  const yaw=inp.yaw||0, dy=s.lastYaw==null?0:_bwrap(yaw-s.lastYaw); s.lastYaw=yaw; s.yawRate+=(clamp(dy/dt,-12,12)-s.yawRate)*Math.min(1,dt*8);
  const sy=Math.sin(yaw), cy=Math.cos(yaw), fwd=-(s.vx*sy+s.vz*cy), right=s.vx*cy-s.vz*sy;
  s.acc+=(clamp((fwd-s.fwdV)/dt,-12,12)-s.acc)*Math.min(1,dt*6); s.fwdV=fwd;
  const sitting=!!inp.sit, walking=v>0.3&&!sitting&&!inp.down;
  s.gw+=((walking?1:0)-s.gw)*Math.min(1,dt*(walking?7:5));
  s.run+=(_bsm((v-BODY.runAt[0])/(BODY.runAt[1]-BODY.runAt[0]))-s.run)*Math.min(1,dt*5);
  s.crouch+=((inp.crouch?1:0)-s.crouch)*Math.min(1,dt*6);
  const gw=s.gw, run=s.run, c=s.crouch*(1-run);
  // phase: one cycle per stride, so planted feet don't slide
  const stride=clamp(0.75+BODY.strideK*v,BODY.stride[0],BODY.stride[1])*(1-0.35*c);
  // each time a foot comes down, count a step (34-voices.js plays it)
  if(walking){ const p0=s.ph; s.ph=(s.ph+v*dt/stride)%1; if((p0<0.5&&s.ph>=0.5)||s.ph<p0) s.steps=(s.steps||0)+1; }
  // turning on the spot: the hips lag behind the chest and catch up in a couple of shuffled steps
  const md=Math.atan2(right,fwd), back=Math.abs(md)>1.75;
  let hipT=walking?-clamp(back?_bwrap(md-Math.PI):md,-BODY.hipTurn,BODY.hipTurn):0;
  if(!walking&&(Math.abs(s.yawRate)>0.9||Math.abs(s.hipY)>0.6)) s.shuffle=0.45; s.shuffle=Math.max(0,s.shuffle-dt);
  if(!walking&&!sitting){ s.hipY=clamp(s.hipY-dy,-0.9,0.9); s.hipY*=s.shuffle>0?Math.max(0,1-dt*6):Math.max(0,1-dt*0.4); if(s.shuffle>0) s.shPh=(s.shPh+dt*2.2)%1; }
  else s.hipY+=(hipT-s.hipY)*Math.min(1,dt*6);
  const tw=Math.sin(s.ph*Math.PI*2)*gw;                        // the hips swing with each step, the chest counters
  rig.pelvis.rotation.y=s.hipY+tw*0.09*(1-run*0.4);
  const mp=md+s.hipY;                                          // way of travel in the hips' frame (+ = to their right)
  const ux=Math.sin(mp), uz=-Math.cos(mp);
  // feet
  const D=BODY.duty[0]+(BODY.duty[1]-BODY.duty[0])*run, H=(BODY.lift[0]+(BODY.lift[1]-BODY.lift[0])*run)*(1-0.4*c), reach=BODY.thigh+BODY.shin-0.012;
  const limp=s.limp>0; let hipH=BODY.pelvis-0.04, low=hipH; const off=[0,0], up=[0,0];
  for(let i=0;i<2;i++){ let o=0, l=0;
    if(walking||gw>0.01){ const u=(s.ph+i*0.5)%1;
      if(u<D) o=stride*D*(0.5-u/D);
      else { const t=(u-D)/(1-D); o=stride*D*(-0.5+_bsm(t)); l=H*Math.sin(Math.PI*t)*(limp&&i===s.limpLeg?0.6:1); }
      o*=gw; l*=gw;
      if(u<D) low=Math.min(low,Math.sqrt(Math.max(0.3,reach*reach-o*o))-(limp&&i===s.limpLeg?0.045:0)); }
    if(s.shuffle>0&&!walking){ const u=(s.shPh+i*0.5)%1; if(u>0.5) l+=0.055*Math.sin((u-0.5)*2*Math.PI)*Math.min(1,s.shuffle*4); }
    off[i]=o; up[i]=l; }
  const walkH=Math.max(hipH-0.07,low), runH=hipH-0.045+0.035*Math.cos(s.ph*Math.PI*4);
  hipH=hipH+((walkH-hipH)*(1-run)+(runH-hipH)*run)*gw;
  hipH-=BODY.crouchDrop*s.crouch*(1-0.25*gw)+(inp.alert?0.03:0)+s.dip;
  hipH+=Math.sin(s.t*1.6)*0.004*(1-gw);                        // breathing
  if(sitting) hipH=0.5;
  const sway=Math.sin(s.ph*Math.PI*2)*0.028*gw*(1-run*0.5)+Math.sin(s.t*0.47)*0.018*(1-gw)*(inp.alert?0.4:1);
  rig.pelvis.position.set(sway,hipH+0.04,0); rig.spine.position.set(sway,hipH+0.04,0);
  for(let i=0;i<2;i++){ const L=i?rig.rl:rig.ll;
    if(sitting){ L.hip.rotation.set(1.45,0,i?-0.12:0.12); L.knee.rotation.x=-1.45; continue; }
    // feet sit under the hips (a touch wider when crouched) and ride along the stride
    const fx=off[i]*ux-sway*0.8+(i?1:-1)*0.04*s.crouch, fz=off[i]*uz-0.05*s.crouch, fy=-hipH+up[i];
    bodyLeg(L,fx,fy,fz); if(inp.down){ L.hip.rotation.x=0.15+i*0.25; L.knee.rotation.x=-0.3-i*0.4; } }
  // chest: lean with speed and crouch, against acceleration, into turns and sideways steps, and from hits
  const lean=(BODY.lean[0]+(BODY.lean[1]-BODY.lean[0])*run)*clamp(fwd/Math.max(v,0.5),-0.5,1)*gw;
  [s.fp,s.fvp]=_bspring(s.fp,s.fvp,dt,BODY.flinch.k,BODY.flinch.d); [s.fr,s.fvr]=_bspring(s.fr,s.fvr,dt,BODY.flinch.k,BODY.flinch.d);
  s.dip=Math.max(0,s.dip-dt*0.5); s.limp=Math.max(0,s.limp-dt); s.recoil=Math.max(0,s.recoil-dt*12);
  const tgtAim=inp.aim==null?0:clamp(inp.aim,-0.75,0.75); s.aimP+=(tgtAim-s.aimP)*Math.min(1,dt*8);
  const rl=inp.reload>=0?inp.reload:-1, rw=rl<0?0:rl<0.1?_bsm(rl/0.1):rl>0.85?_bsm((1-rl)/0.15):1;  // gun tilted in for the reload
  const pouch=rl<0?0:rl<0.12?0:rl<0.35?_bsm((rl-0.12)/0.23):rl<0.52?1:rl<0.75?_bsm((0.75-rl)/0.23):0;  // left hand down to the pouch and back
  const breath=Math.sin(s.t*1.6)*0.012*(1-gw);
  rig.spine.rotation.set(-lean-BODY.crouchLean*s.crouch-clamp(s.acc,-6,6)*0.012*(1-c)+s.fp+s.recoil*0.035+s.aimP*0.22+breath*0.5-(sitting?-0.05:0),
    -tw*0.07, clamp(s.yawRate*v*0.03,-0.22,0.22)-clamp(right,-4,4)*0.012*gw+s.fr+(limp?0.05*Math.sin(s.ph*Math.PI*2)*gw:0));
  // the gun and the shoulder line: aim, a little bounce on each step, recoil, and the reload tilt
  rig.aim.rotation.set(s.aimP*0.78+s.recoil*0.1+0.02*Math.sin(s.ph*Math.PI*4)*gw*(1-run*0.3)-0.22*rw-(inp.down?0.5:0),0.06*rw,0.02*Math.sin(s.ph*Math.PI*2)*gw+0.35*rw);
  rig.la.rotation.x=ARM_PITCH-1.05*pouch; rig.la.rotation.z=-0.35*pouch;
  rig.gun.position.z=rig.gun.userData.z0+s.recoil*0.05;
  // head: looks where they aim; when calm it glances around now and then
  if(!inp.alert&&inp.look==null){ s.lookT-=dt; if(s.lookT<=0){ s.lookT=1.5+Math.random()*4; s.lookY=Math.random()<0.45?0:(Math.random()-0.5)*(gw>0.5?0.9:1.5); } }
  else if(inp.look!=null) s.lookY=clamp(inp.look,-1,1); else s.lookY=0;
  s.headY+=(s.lookY-s.headY)*Math.min(1,dt*(inp.alert?8:3));
  rig.head.rotation.set(s.aimP*0.5-rig.spine.rotation.x*0.4+s.fp*0.6+breath,s.headY+tw*0.07,-rig.spine.rotation.z*0.5);
}
// a shot fired: the gun kicks
function bodyKick(rig){ if(rig) rig.s.recoil=1; }
// hit from (fx,fz): the chest is knocked away from the shot; a leg hit buckles the knee and leaves a limp
function bodyHit(rig,fx,fz,part){ if(!rig) return; const s=rig.s, g=rig.g;
  const dx=g.position.x-fx, dz=g.position.z-fz, d=Math.hypot(dx,dz)||1, y=g.rotation.y, sy=Math.sin(y), cy=Math.cos(y);
  const along=-(dx*sy+dz*cy)/d, side=(dx*cy-dz*sy)/d, k=part==='head'?5.5:part==='legs'?2:4;  // the bullet's way of travel, in the body's frame
  s.fvp-=along*k; s.fvr-=side*k*0.8;                      // shot from the front: the chest goes back; from the left: it goes right
  if(part==='legs'){ s.dip=0.09; s.limp=4; s.limpLeg=Math.random()<0.5?0:1; } }
// killed: the knees go, then the body falls away from the shot
function bodyDie(rig,fx,fz){ if(!rig) return; const s=rig.s, g=rig.g; if(s.dying>=0) return;
  let dir=1; if(fx!=null){ const dx=g.position.x-fx, dz=g.position.z-fz, f=-(dx*Math.sin(g.rotation.y)+dz*Math.cos(g.rotation.y)); dir=f<0?1:-1; }  // shot from the front: falls backwards
  s.dying=0; s.fallDir=dir; s.fallRoll=(Math.random()-0.5)*0.5; s.fallY=0; s.c0=s.crouch; }
function bodyFall(rig,dt){
  const s=rig.s, g=rig.g; s.dying+=dt; const T=s.dying;
  const buckle=_bsm(T/0.3), f=T<0.22?0:Math.min(1,Math.pow((T-0.22)/0.55,1.7)), settle=T>0.77?Math.sin(Math.min(1,(T-0.77)/0.25)*Math.PI)*0.06:0;
  // knees buckle while the chest slumps and the gun drops, then the legs straighten out as it lands
  const kb=buckle*(1-f), hipH=BODY.pelvis-0.04-0.32*kb;
  rig.pelvis.position.set(0,hipH+0.04,0); rig.spine.position.set(0,hipH+0.04,0); rig.pelvis.rotation.y=0;
  bodyLeg(rig.ll,-0.02,-hipH,-0.08*kb); bodyLeg(rig.rl,0.03,-hipH,0.05*kb);
  rig.spine.rotation.set((s.fallDir>0?0.12:-0.35)*buckle,0,s.fallRoll*buckle);
  rig.aim.rotation.set(-0.7*buckle-0.8*f,0,0.3*buckle);   // the gun drops, and the arms end up along the body rig.head.rotation.set(-0.35*buckle,0,0.2*buckle);
  rig.la.rotation.z=0.3*buckle;
  g.rotation.x=s.fallDir*(Math.PI/2)*f-s.fallDir*settle; g.rotation.z=s.fallRoll*0.3*f;
  s.fallY=0.18*f;
}
function bodySnapDead(rig,dir){ if(!rig) return; rig.s.dying=0; rig.s.fallDir=dir||1; rig.s.fallRoll=0; rig.s.c0=0; bodyFall(rig,5); }

/* ---- enemies ---- */
// how high an enemy's eyes and gun are: lower when crouched, so what it can see and shoot matches what you can see of it
const eEye=e=>1.6-0.46*(e.crouchA||0), eGunY=e=>1.4-0.43*(e.crouchA||0);
// crouch behind cover while reloading, holding an angle out of sight, or waiting in cover; stand to move
function eWantsCrouch(e){ if(e.k.boss||e.state!=='combat') return false; if(e.susp&&e.susp.phase==='check') return true; if(e.rig&&e.rig.s.v>0.5) return false;
  return e.reloadT>0||e.mode==='cover'||(e.mode==='hold'&&!e.sees); }
function enemyPose(e,dt){
  const rig=e.rig; if(!rig) return; const s=rig.s;
  // far away (in the fog) the pose only needs updating ten times a second
  const cx=camera.position.x-e.pos.x, cz=camera.position.z-e.pos.z;
  if(cx*cx+cz*cz>110*110){ s.skip+=dt; if(s.skip<0.1) return; dt=s.skip; } s.skip=0;
  const host=!NET.on||NET.host, np=e.np;
  let aim=null, crouch, alert, rl=-1;
  if(host){
    const t=e.sees&&R.tgts?R.tgts.find(x=>x.id===e.tgtId):null; const sc=e.k.boss?1.45:1;
    if(t){ const d=Math.hypot(t.x-e.pos.x,t.z-e.pos.z)||1; aim=Math.atan2(t.eye-0.35-(e.pos.y+eGunY(e)*sc),d); }
    crouch=eWantsCrouch(e); alert=e.state==='combat';
    if(e.reloadT>0){ const tot=e.reloadTot||ITEMS[e.gun.id].reload+0.4; rl=clamp(1-e.reloadT/tot,0,1); }
  } else { // online, not the host: the host sends the pose bits
    const b=np?np.b:0; crouch=!!(b&1); alert=!!(b&4); aim=b&8?np.aim:null;
    if(b&2){ if(e.rlT0==null) e.rlT0=R.t; rl=clamp((R.t-e.rlT0)/(ITEMS[e.gun.id].reload+0.4),0,1); } else e.rlT0=null;
    if(b&16&&!e.k16) bodyKick(rig); e.k16=!!(b&16);
  }
  bodyAnim(rig,{yaw:e.yaw,crouch,aim,alert,reload:rl},dt);
  e.crouchA=s.crouch;
}
// what the host tells everyone else about an enemy's pose
function enemyPoseBits(e){ return (eWantsCrouch(e)?1:0)|(e.reloadT>0?2:0)|(e.state==='combat'?4:0)|(e.sees?8:0)|(e.shotT&&R.t-e.shotT<0.12?16:0); }
// kept for old callers (the debug panel's freeze, workshop scenes): pose an enemy standing where it is
function walkAnim(e,dt){ if(e.rig) enemyPose(e,dt); }
function animDead(e,dt){ if(!e.rig) return; if(e.rig.s.dying<0) bodyDie(e.rig,e.killFrom?e.killFrom.x:null,e.killFrom?e.killFrom.z:null); bodyAnim(e.rig,{},dt);
  e.g.position.y=(R&&R.terrain?R.terrain(e.pos.x,e.pos.z):0)+e.rig.s.fallY*(e.k&&e.k.boss?1.45:1); }

/* ---- other players ---- */
function remotePose(p,dt){ if(!p.rig) return; const st=p.st;
  bodyAnim(p.rig,{yaw:p.g.rotation.y,crouch:!!st.crouch,aim:clamp(st.p||0,-0.75,0.75),alert:true,sit:!!st.rd,down:!!st.down},dt); }
