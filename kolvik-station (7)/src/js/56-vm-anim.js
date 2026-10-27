/* 56-vm-anim: first-person weapon animation.
   vmAnimate(gun, state, input, dt, scene) poses the viewmodel every frame from what the player is doing. The gun group
   comes from buildGun() (55-fx-viewmodel.js), which marks the moving parts: g.userData.pt.{mag, slide, pump, bolt, lh,
   rh, shell}. Everything is keyframed against 0..1 progress through the action, with smoothstep easing between keys,
   so the numbers below are the whole animation: change a time or an offset, save, and watch it in the workshop's
   "Viewmodel" scene.

   Gun space: x right, y up, z toward you (the muzzle points to -z). Offsets are metres, rotations radians.
   Gun pose keys are [time, x, y, z, rotX, rotY, rotZ] added to the hip/aim position:
     rotX + tips the muzzle up · rotY + swings the muzzle left · rotZ + rolls the top to the left. */
const VMA={
  // which reload each gun uses
  style:{makar:'pistol',vintik:'mag',akr:'mag',kestrel:'mag',nordlys:'mag',jarlmg:'mag',tundra:'tube',nord:'bolt'},
  inspect:3.8,          // seconds to turn the gun over and check it (I)
  draw:0.5,             // seconds to bring a weapon up after switching
  sway:{gain:0.024, max:0.07, k:70, d:13},   // how far the gun lags behind the mouse, and its spring
  hip:[0.17,-0.19,-0.56], aimZ:-0.42,
};
const _sm=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
// a keyframe track: [[time, a, b, c, ...], ...] → the values at time p, eased between keys
function vmKf(track,p,out){
  const n=track[0].length-1; out=out||new Array(n);
  if(p<=track[0][0]){ for(let i=0;i<n;i++) out[i]=track[0][i+1]; return out; }
  for(let j=1;j<track.length;j++){ const b=track[j]; if(p<=b[0]){ const a=track[j-1], k=_sm((p-a[0])/((b[0]-a[0])||1)); for(let i=0;i<n;i++) out[i]=a[i+1]+(b[i+1]-a[i+1])*k; return out; } }
  const l=track[track.length-1]; for(let i=0;i<n;i++) out[i]=l[i+1]; return out;
}
const vmAt=(a,dx=0,dy=0,dz=0)=>[a[0]+dx,a[1]+dy,a[2]+dz];
const _k=(t,v)=>[t,v[0],v[1],v[2]];
const Z6=[0,0,0,0,0,0];

/* ---- the animations, built once per gun from where its hands and parts sit ---- */
function vmTracks(g,kind,arg){
  const pt=g.userData.pt, R0=pt.rh?pt.rh.userData.rest.p.toArray():[0,-.08,.05], L0=pt.lh?pt.lh.userData.rest.p.toArray():[0,-.05,-.3];
  const M0=pt.mag?pt.mag.userData.rest.p.toArray():[0,-.1,-.1], T={};
  if(kind==='mag'||kind==='magEmpty'){
    const U=vmAt(M0,0,-.075,.01), Uin=vmAt(U,0,-.03,0), D=vmAt(U,-.02,-.4,.09), out=[-.02,-.4,.09], H=[.07,-.005,-.07], Hb=vmAt(H,0,0,.08); // H: the charging handle, reached from under the right side
    T.lh=[_k(0,L0),_k(.06,L0),_k(.16,U),_k(.20,U),_k(.32,D),_k(.38,D),_k(.52,Uin),_k(.56,U),_k(.60,U)];
    T.mag=[_k(0,M0),_k(.20,M0),_k(.32,vmAt(M0,...out)),_k(.38,vmAt(M0,...out)),_k(.52,vmAt(M0,0,-.03,0)),_k(.56,M0),_k(1,M0)];
    T.gun=[[0,...Z6],[.10,-.03,-.02,0,.12,.06,-.42],[.50,-.03,-.025,0,.12,.06,-.40],[.55,-.03,-.01,0,.17,.06,-.44],[.60,-.03,-.02,0,.12,.06,-.40]];
    if(kind==='magEmpty'){ // rack the charging handle on the right side
      T.lh.push(_k(.68,H),_k(.70,H),_k(.735,Hb),_k(.76,Hb),_k(.80,vmAt(H,.02,-.03,.02)),_k(.92,L0),_k(1,L0));
      T.gun.push([.68,-.02,-.01,0,.06,.16,.18],[.735,-.02,-.012,.01,.05,.16,.16],[.76,-.02,-.004,0,.1,.16,.2],[.80,-.02,-.01,0,.06,.16,.18],[.94,...Z6],[1,...Z6]); }
    else { T.lh.push(_k(.80,L0),_k(1,L0)); T.gun.push([.80,...Z6],[1,...Z6]); }
  }
  if(kind==='pistol'||kind==='pistolEmpty'){
    const S0=pt.slide?pt.slide.userData.rest.p.toArray():[0,0,-.06], low=vmAt(M0,0,-.34,.02), Tp=vmAt(S0,0,.045,.05);
    T.mag=[_k(0,M0),_k(.10,M0),_k(.22,low),_k(.30,low),_k(.48,vmAt(M0,0,-.06,0)),_k(.54,M0),_k(1,M0)];
    T.lh=[_k(0,L0),_k(.08,L0),_k(.24,vmAt(L0,-.04,-.3,.06)),_k(.30,vmAt(L0,-.04,-.3,.06)),_k(.48,vmAt(M0,0,-.095,0)),_k(.54,vmAt(M0,0,-.078,0)),_k(.60,vmAt(M0,0,-.08,0))];
    T.gun=[[0,...Z6],[.08,-.02,.01,0,.12,.08,-.22],[.50,-.02,0,0,.1,.08,-.2],[.54,-.02,.014,0,.16,.08,-.24],[.60,-.02,0,0,.1,.06,-.18]];
    if(kind==='pistolEmpty'){ // pull the slide back over the top
      T.lh.push(_k(.68,Tp),_k(.70,Tp),_k(.74,vmAt(Tp,0,0,.045)),_k(.76,vmAt(Tp,0,0,.045)),_k(.80,vmAt(Tp,-.03,.03,.03)),_k(.92,L0),_k(1,L0));
      T.slide=[[0,0],[.70,0],[.74,.045],[.76,.045],[.77,0]];
      T.gun.push([.70,0,0,0,.12,.12,-.1],[.76,0,.012,0,.16,.12,-.12],[.80,0,0,0,.12,.1,-.1],[.92,...Z6],[1,...Z6]); }
    else { T.lh.push(_k(.78,L0),_k(1,L0)); T.gun.push([.80,...Z6],[1,...Z6]); }
  }
  if(kind==='tube'){ // arg = {shells, empty}: feed shells one by one, then pump if it was empty
    const n=Math.max(1,Math.min(8,arg.shells|0)), E=arg.empty?.80:.90, sl=(E-.10)/n, belt=vmAt(L0,-.08,-.22,.16), port=[0,-.075,-.1], pin=vmAt(port,0,0,-.05);
    T.lh=[_k(0,L0),_k(.10,belt)]; T.shell=[[0,0]];
    for(let i=0;i<n;i++){ const s0=.10+i*sl; T.lh.push(_k(s0+sl*.15,belt),_k(s0+sl*.55,port),_k(s0+sl*.75,pin),_k(s0+sl*.95,belt)); T.shell.push([s0+sl*.1,0],[s0+sl*.12,1],[s0+sl*.74,1],[s0+sl*.76,0]); }
    T.lh.push(_k(E+.03,L0)); T.gun=[[0,...Z6],[.10,-.03,-.02,0,.16,.04,-.5],[E,-.03,-.02,0,.16,.04,-.5],[E+.04,0,-.01,0,.04,0,-.1]];
    if(arg.empty){ T.lh.push(_k(E+.05,L0),_k(E+.08,vmAt(L0,0,0,.08)),_k(E+.12,L0),_k(1,L0)); T.pump=[[0,0],[E+.05,0],[E+.08,.08],[E+.12,0]]; T.gun.push([E+.08,0,-.006,.01,0,0,.03],[E+.13,...Z6],[1,...Z6]); }
    else { T.lh.push(_k(1,L0)); T.gun.push([E+.06,...Z6],[1,...Z6]); }
  }
  // the Nord's bolt: the handle lifts (bolt rotZ) and comes back (bolt z); the right hand rides it
  const Hd=[.075,.02,0], Hu=[.075*Math.cos(1.2),.02+.075*Math.sin(1.2),0], Hub=vmAt(Hu,0,0,.09);
  if(kind==='bolt'){ const C=[0,.085,.04];
    T.rh=[_k(0,R0),_k(.05,R0),_k(.14,Hd),_k(.20,Hu),_k(.28,Hub),_k(.74,Hub),_k(.80,Hu),_k(.86,Hd),_k(.95,R0),_k(1,R0)];
    T.boltR=[[0,0],[.14,0],[.20,1.2],[.80,1.2],[.86,0]]; T.boltZ=[[0,0],[.20,0],[.28,.09],[.74,.09],[.80,0]];
    T.lh=[_k(0,L0),_k(.30,L0),_k(.40,C),_k(.47,vmAt(C,0,-.035,0)),_k(.52,C),_k(.59,vmAt(C,0,-.035,0)),_k(.64,C),_k(.72,L0),_k(1,L0)];
    T.gun=[[0,...Z6],[.10,-.02,0,0,.1,.05,.25],[.90,-.02,0,0,.1,.05,.25],[1,...Z6]];
  }
  if(kind==='boltCycle'){ // after every shot of the Nord
    T.rh=[_k(0,R0),_k(.08,R0),_k(.20,Hd),_k(.28,Hu),_k(.38,Hub),_k(.48,Hu),_k(.56,Hd),_k(.75,R0),_k(1,R0)];
    T.boltR=[[0,0],[.20,0],[.28,1.2],[.48,1.2],[.56,0]]; T.boltZ=[[0,0],[.28,0],[.38,.09],[.48,0]];
    T.gun=[[0,...Z6],[.15,-.01,-.012,0,.03,0,.14],[.60,-.01,-.012,0,.03,0,.14],[.80,...Z6]];
  }
  if(kind==='pump'){ // after every shot of the shotgun
    T.pump=[[0,0],[.12,0],[.28,.08],[.46,0]]; T.lh=[_k(0,L0),_k(.12,L0),_k(.28,vmAt(L0,0,0,.08)),_k(.46,L0)];
    T.gun=[[0,...Z6],[.12,0,0,0,-.03,0,0],[.28,0,-.006,.012,-.05,0,.03],[.5,...Z6]];
  }
  if(kind==='inspect'){ // turn it to look at one side, then the other, with a check of the mag/chamber in between
    T.gun=[[0,...Z6],[.12,-.1,.05,.1,.1,.9,.35],[.40,-.1,.06,.1,.14,1.0,.42],[.52,-.08,.03,.07,-.12,-.3,-.45],[.80,-.08,.04,.07,-.1,-.38,-.5],[.92,...Z6],[1,...Z6]];
    const st=arg;
    if(st==='mag'){ const U=vmAt(M0,0,-.075,.01); T.lh=[_k(0,L0),_k(.52,L0),_k(.58,U),_k(.64,vmAt(U,0,-.05,.01)),_k(.70,vmAt(U,0,-.05,.01)),_k(.76,U),_k(.84,L0),_k(1,L0)]; T.mag=[_k(0,M0),_k(.58,M0),_k(.64,vmAt(M0,0,-.05,.01)),_k(.70,vmAt(M0,0,-.05,.01)),_k(.76,M0),_k(1,M0)]; }
    if(st==='pistol'){ const S0=pt.slide?pt.slide.userData.rest.p.toArray():[0,0,-.06], Tp=vmAt(S0,0,.045,.05); T.lh=[_k(0,L0),_k(.52,L0),_k(.58,Tp),_k(.62,vmAt(Tp,0,0,.016)),_k(.70,vmAt(Tp,0,0,.016)),_k(.74,Tp),_k(.82,L0),_k(1,L0)]; T.slide=[[0,0],[.58,0],[.62,.016],[.70,.016],[.74,0]]; }
    if(st==='bolt'){ T.rh=[_k(0,R0),_k(.52,R0),_k(.58,Hd),_k(.62,Hu),_k(.66,vmAt(Hu,0,0,.03)),_k(.72,vmAt(Hu,0,0,.03)),_k(.75,Hu),_k(.78,Hd),_k(.86,R0),_k(1,R0)]; T.boltR=[[0,0],[.58,0],[.62,1.2],[.75,1.2],[.78,0]]; T.boltZ=[[0,0],[.62,0],[.66,.03],[.72,.03],[.75,0]]; }
    if(st==='tube'){ T.pump=[[0,0],[.58,0],[.63,.03],[.70,.03],[.74,0]]; T.lh=[_k(0,L0),_k(.58,L0),_k(.63,vmAt(L0,0,0,.03)),_k(.70,vmAt(L0,0,0,.03)),_k(.74,L0),_k(1,L0)]; }
  }
  return T;
}
function vmTrack(g,kind,arg){ const c=g.userData.tracks||(g.userData.tracks={}); const key=kind+(arg&&typeof arg==='object'?':'+arg.shells+':'+arg.empty:':'+(arg||'')); return c[key]||(c[key]=vmTracks(g,kind,arg)); }

/* ---- state and the per-frame pose ---- */
function vmNew(){ return {sx:0,sy:0,vx:0,vy:0,lastYaw:null,lastPitch:null,spr:0,drawT:9,uid:null,inspect:-1,inspW:0,use:0,flick:9,breath:0,prop:null,propId:null,roll:0}; }
const _g6=new Array(6), _p3=new Array(3), _p1=new Array(1);
/* input: {ads 0..1, sightY, sprint, moving, bob, kick, yaw, pitch, uid, id,
           reload:{t,total,empty,shells}|null, using:{t,total,id}|null, cool, coolTot, time} */
function vmAnimate(g,s,inp,dt,scene){
  const pt=g.userData.pt||{}, id=inp.id||g.userData.gunId, style=VMA.style[id]||'mag';
  // reset the moving parts to rest, then pose them
  for(const k in pt){ const o=pt[k]; if(o&&o.userData.rest){ o.position.copy(o.userData.rest.p); o.rotation.copy(o.userData.rest.r); } }
  if(pt.shell) pt.shell.visible=false;
  if(inp.uid!==s.uid){ s.uid=inp.uid; s.drawT=0; s.inspect=-1; }
  s.drawT+=dt; s.flick+=dt; s.breath+=dt;
  // look sway: the gun lags behind the mouse on a spring
  const Y=inp.yaw||0, Pi=inp.pitch||0; let dy=0, dp=0; if(s.lastYaw!=null&&dt>0){ dy=Math.atan2(Math.sin(Y-s.lastYaw),Math.cos(Y-s.lastYaw)); dp=Pi-s.lastPitch; } s.lastYaw=Y; s.lastPitch=Pi;
  const W=VMA.sway, tx=clamp(dt>0?dy/dt*W.gain:0,-W.max,W.max), ty=clamp(dt>0?-dp/dt*W.gain:0,-W.max,W.max), h=Math.min(dt,0.05);
  s.vx+=((tx-s.sx)*W.k-s.vx*W.d)*h; s.sx+=s.vx*h; s.vy+=((ty-s.sy)*W.k-s.vy*W.d)*h; s.sy+=s.vy*h;
  s.spr+=((inp.sprint?1:0)-s.spr)*Math.min(1,dt*9); s.use+=((inp.using?1:0)-s.use)*Math.min(1,dt*7);
  // inspect runs until done, or until you aim, fire, reload, sprint or heal
  if(s.inspect>=0){ s.inspect+=dt; if(s.inspect>=VMA.inspect||inp.ads>0.05||inp.reload||inp.using||inp.sprint||inp.kick>0.6) s.inspect=-1; }
  s.inspW+=((s.inspect>=0?1:0)-s.inspW)*Math.min(1,dt*(s.inspect>=0?14:9));
  const ads=_sm(inp.ads||0), na=1-ads, sightY=inp.sightY||0.066;
  // base: hip to aim
  let px=VMA.hip[0]*na, py=VMA.hip[1]*na-sightY*ads, pz=VMA.hip[2]*na+VMA.aimZ*ads, rx=0, ry=0, rz=0;
  // walking bob (a figure eight), breathing, sway
  const mv=inp.moving?1:0, b=inp.bob||0;
  px+=Math.sin(b)*0.012*na*mv; py+=Math.abs(Math.cos(b))*0.012*na*mv; rz+=Math.sin(b)*0.012*na*mv;
  py+=Math.sin(s.breath*1.7)*0.0028*(1-ads*0.75); rx+=Math.sin(s.breath*1.7+0.6)*0.004*(1-ads*0.75);
  // strafing tilts the gun toward the way you're going; a landing or a sudden stop drops it a little behind the camera
  rz-=(inp.strafe||0)*0.06*na; px+=(inp.strafe||0)*0.008*na; py+=(inp.dip||0)*0.5*(1-ads*0.6);
  const sw=1-ads*0.7; px+=s.sx*0.5*sw; ry+=s.sx*1.5*sw; rz+=s.sx*0.9*sw; py+=s.sy*0.4*sw; rx+=s.sy*1.2*sw;
  // sprint: gun across the chest
  px-=0.04*s.spr; py-=0.09*s.spr; pz+=0.05*s.spr; rx-=0.42*s.spr; ry+=0.55*s.spr; rz+=0.2*s.spr+Math.sin(b)*0.05*s.spr*mv;
  // recoil: back and up, with a little roll that differs shot to shot
  const k=inp.kick||0; if(k>0.9&&!s.kicked){ s.roll=(Math.random()-0.5)*0.12; s.kicked=true; } if(k<0.5) s.kicked=false;
  pz+=k*0.05; rx+=k*0.08; rz+=k*s.roll;
  if(pt.slide&&style==='pistol') pt.slide.position.z+=k*0.035;
  // the action this frame: a reload, a shot being cycled, or an inspect
  let T=null, p=0;
  if(inp.reload&&inp.reload.total>0){ p=clamp(inp.reload.t/inp.reload.total,0,1);
    T=style==='tube'?vmTrack(g,'tube',{shells:inp.reload.shells||3,empty:!!inp.reload.empty}):vmTrack(g,(style==='pistol'?'pistol':style==='bolt'?'bolt':'mag')+(inp.reload.empty&&style!=='bolt'?'Empty':'')); }
  else if(inp.cool>0&&inp.coolTot>0&&(style==='bolt'||style==='tube')){ p=clamp(1-inp.cool/inp.coolTot,0,1); T=vmTrack(g,style==='bolt'?'boltCycle':'pump'); }
  const gp=T&&T.gun?vmKf(T.gun,p,_g6):null;
  if(gp){ px+=gp[0]; py+=gp[1]; pz+=gp[2]; rx+=gp[3]; ry+=gp[4]; rz+=gp[5]; }
  const parts=(T,p,wt)=>{ if(!T) return;
    if(T.lh&&pt.lh){ vmKf(T.lh,p,_p3); const r=pt.lh.userData.rest.p; pt.lh.position.set(r.x+(_p3[0]-r.x)*wt,r.y+(_p3[1]-r.y)*wt,r.z+(_p3[2]-r.z)*wt); }
    if(T.rh&&pt.rh){ vmKf(T.rh,p,_p3); const r=pt.rh.userData.rest.p; pt.rh.position.set(r.x+(_p3[0]-r.x)*wt,r.y+(_p3[1]-r.y)*wt,r.z+(_p3[2]-r.z)*wt); }
    if(T.mag&&pt.mag){ vmKf(T.mag,p,_p3); const r=pt.mag.userData.rest.p; pt.mag.position.set(r.x+(_p3[0]-r.x)*wt,r.y+(_p3[1]-r.y)*wt,r.z+(_p3[2]-r.z)*wt); }
    if(T.slide&&pt.slide) pt.slide.position.z+=vmKf(T.slide,p,_p1)[0]*wt;
    if(T.pump&&pt.pump) pt.pump.position.z+=vmKf(T.pump,p,_p1)[0]*wt;
    if(T.boltR&&pt.bolt) pt.bolt.rotation.z+=vmKf(T.boltR,p,_p1)[0]*wt;
    if(T.boltZ&&pt.bolt) pt.bolt.position.z+=vmKf(T.boltZ,p,_p1)[0]*wt;
    if(T.shell&&pt.shell) pt.shell.visible=vmKf(T.shell,p,_p1)[0]>0.5&&wt>0.5;
  };
  parts(T,p,1);
  if(s.inspW>0.001&&!T){ const ip=s.inspect>=0?s.inspect/VMA.inspect:0.96; const IT=vmTrack(g,'inspect',style); const q=vmKf(IT.gun,ip,_g6), w=s.inspW;
    px+=q[0]*w; py+=q[1]*w; pz+=q[2]*w; rx+=q[3]*w; ry+=q[4]*w; rz+=q[5]*w; if(s.inspect>=0) parts(IT,ip,w); }
  // fire-mode switch: a quick tilt to look at the selector
  if(s.flick<0.45){ const f=Math.sin(s.flick/0.45*Math.PI); rz+=f*0.18; ry+=f*0.08; px-=f*0.01; }
  // weapon coming up after a switch
  const d=1-_sm(s.drawT/VMA.draw); py-=d*0.28; rx-=d*0.9; rz+=d*0.35; px+=d*0.04;
  // healing: the gun goes down while the other hand works
  py-=s.use*0.32; rx-=s.use*0.55; ry-=s.use*0.15;
  g.position.set(px,py,pz); g.rotation.set(rx,ry,rz);
  vmProp(s,inp,dt,scene);
}
// the med or thermos in your free hand while you use it
const VM_PROP_COL={bandage:0xe6e9ea,splint:0x7a4b26,ifak:0x4f8a4a,fieldkit:0xc0392b,thermos:0x3d6fb3};
function vmProp(s,inp,dt,scene){
  const id=inp.using&&inp.using.id;
  if(id&&s.propId!==id){ if(s.prop&&s.prop.parent) s.prop.parent.remove(s.prop); s.prop=null; s.propId=id; }
  if(!s.prop&&id&&scene){ const gr=new THREE.Group(); const glove=(S&&S.cos)?cosMat(S.cos.fit.gloves):MC(0x3a3a2c), coat=(S&&S.cos)?cosMat(S.cos.fit.coat):MC(0x4d5a48);
    const it=new THREE.Mesh(new THREE.BoxGeometry(id==='thermos'?.05:.08,id==='thermos'?.14:.06,id==='splint'?.16:.08),MC(VM_PROP_COL[id]||0xcccccc)); it.position.set(0,.05,-.02); gr.add(it);
    const hd=new THREE.Mesh(new THREE.BoxGeometry(.07,.072,.11),glove); gr.add(hd);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(.084,.084,.5),coat); const dir=new THREE.Vector3(-.4,-.6,1).normalize(); arm.position.copy(dir).multiplyScalar(.34); arm.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir); gr.add(arm);
    gr.userData.vmProp=true; scene.add(gr); s.prop=gr; }
  if(s.prop){ const u=_sm(s.use), t=s.breath; s.prop.visible=u>0.02;
    s.prop.position.set(-0.04+Math.sin(t*8)*0.012*u,-0.5+0.34*u+Math.sin(t*6.5)*0.008*u,-0.42); s.prop.rotation.set(0.35+Math.sin(t*9)*0.08*u,0.2,Math.sin(t*7)*0.12*u);
    if(u<0.02&&!inp.using){ if(s.prop.parent) s.prop.parent.remove(s.prop); s.prop=null; s.propId=null; } }
}
