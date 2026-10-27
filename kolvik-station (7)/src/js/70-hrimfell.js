/* 70-hrimfell: Hrimfell Run: mountain terrain, snowmobile dynamics, world config */
/* ================= HRIMFELL RUN: snowmobiles down a mountain ================= */
// The run descends toward +z from the summit (z −780, 160 m up) to the loot camp (z −30 to 130, flat).
const HR={W:16,start:-772,camp:-30};
const HR_PROF=[[-800,166],[-780,160],[-700,140],[-620,112],[-560,100],[-480,72],[-420,62],[-340,38],[-280,30],[-200,14],[-120,6],[-60,1],[-30,0]];
// the run's height profile: a monotone cubic (Fritsch–Carlson) through the profile points, so the slope changes
// smoothly. Kinks in the old piecewise profile were launching sleds into the air at speed.
const HR_SLOPE=(()=>{ const P_=HR_PROF, n=P_.length, d=[], m=[]; for(let i=0;i<n-1;i++) d.push((P_[i+1][1]-P_[i][1])/(P_[i+1][0]-P_[i][0]));
  m[0]=d[0]; m[n-1]=d[n-2]; for(let i=1;i<n-1;i++) m[i]=d[i-1]*d[i]<=0?0:(d[i-1]+d[i])/2;
  for(let i=0;i<n-1;i++){ if(d[i]===0){ m[i]=m[i+1]=0; continue; } const a=m[i]/d[i], b=m[i+1]/d[i], t=a*a+b*b; if(t>9){ const k=3/Math.sqrt(t); m[i]=k*a*d[i]; m[i+1]=k*b*d[i]; } } return m; })();
function hrBase(z){ if(z>=-30) return 0; if(z<=-800) return 166; const P_=HR_PROF; for(let i=1;i<P_.length;i++){ const [z1,h1]=P_[i]; if(z<=z1){ const [z0,h0]=P_[i-1]; const L=z1-z0, t=(z-z0)/L, t2=t*t, t3=t2*t;
  return (2*t3-3*t2+1)*h0+(t3-2*t2+t)*L*HR_SLOPE[i-1]+(-2*t3+3*t2)*h1+(t3-t2)*L*HR_SLOPE[i]; } } return 0; }
function hrCx(z){ if(z>=-30) return 0; const w=Math.min(1,(-30-z)/70); return (22*Math.sin(z/110)+9*Math.sin(z/47+1))*w; }
function hrW(z){ return z<-80?HR.W:Math.min(62,HR.W+(z+80)*0.95); }
// ---- terrain: the groomed run is a corridor carved into a noise-built massif ----
// value noise -> fractal (fBm) and ridged fractal, with domain warping so ridges bend instead of lining up
function hash2(i,j){ let h=Math.imul(i,374761393)+Math.imul(j,668265263)|0; h=Math.imul(h^(h>>>13),1274126177); return ((h^(h>>>16))>>>0)/4294967296; }
function vnoise(x,z){ const i=Math.floor(x), j=Math.floor(z), fx=x-i, fz=z-j; const u=fx*fx*(3-2*fx), v=fz*fz*(3-2*fz); const a=hash2(i,j), b=hash2(i+1,j), c=hash2(i,j+1), d=hash2(i+1,j+1); return (a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v)*2-1; }
function fbm(x,z,o){ let s=0,a=1,f=1,n=0; for(let k=0;k<o;k++){ s+=a*vnoise(x*f+k*17.3,z*f-k*9.1); n+=a; a*=0.5; f*=2.03; } return s/n; }
function ridged(x,z,o){ let s=0,a=1,f=1,w=1,n=0; for(let k=0;k<o;k++){ let r=1-Math.abs(vnoise(x*f+k*31.7,z*f+k*11.9)); r*=r*w; w=clamp(r*1.6,0,1); s+=r*a; n+=a; a*=0.5; f*=2.1; } return s/n; }
const smooth=(a,b,x)=>{ const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
// signed distance (metres) from the playable area: <=0 on the run or in the camp, >0 out on the mountain
function hrFree(x,z){
  let d=1e9;
  if(z<=-20){ const zz=Math.max(z,-800); d=Math.abs(x-hrCx(zz))-hrW(zz); if(z<-800) d=Math.max(d,-800-z); }
  if(z>=-70) d=Math.min(d,Math.max(Math.abs(x)-62,z-138,-46-z));
  return d;
}
function hrTerrain(x,z){
  const zc=clamp(z,-800,140), base=hrBase(zc), c=hrCx(zc), dx=Math.abs(x-c), W=hrW(zc), d=hrFree(x,z);
  const inRun=z<-60, bowl=inRun?0.004*Math.min(dx,W)*Math.min(dx,W):0;
  let h=base+bowl;
  if(inRun) h+=0.07*vnoise(x/9,z/26)*(1-smooth(0,4,d));
  if(d>0){
    const wx=x+28*vnoise(x/95,z/95), wz=z+28*vnoise(x/95+5.2,z/95+1.3);
    h+=5*(1-Math.exp(-d/5))+d*0.7+d*d*0.0035;
    h+=ridged(wx/150,wz/150,4)*95*smooth(0,45,d)+fbm(wx/26,wz/26,3)*6*smooth(0,10,d);
    return h;
  }
  const T=R.hrT; if(T){ for(const r of T.ramps){ if(z>r.z-10&&z<=r.z&&Math.abs(x-(c+r.x))<r.w) h+=r.h*Math.pow((z-(r.z-10))/10,1.6); }
    for(const v of T.crev){ if(z>v.z&&z<v.z+v.len&&x-c>v.x0&&x-c<v.x1) return base-9; } }
  return h;
}
// a heightfield grid as an indexed mesh, with vertex colours: snow on gentle ground, rock on steep faces
function hrGrid(x0,x1,z0,z1,cx,cz,skip,uvs){
  const nx=Math.round((x1-x0)/cx), nz=Math.round((z1-z0)/cz), W=nx+1; const pos=new Float32Array(W*(nz+1)*3), uv=new Float32Array(W*(nz+1)*2);
  for(let j=0;j<=nz;j++) for(let i=0;i<=nx;i++){ const x=x0+i*cx, z=z0+j*cz, k=j*W+i; pos[k*3]=x; pos[k*3+1]=hrTerrain(x,z); pos[k*3+2]=z; uv[k*2]=x/uvs; uv[k*2+1]=z/uvs; }
  const idx=[]; for(let j=0;j<nz;j++) for(let i=0;i<nx;i++){ const xa=x0+i*cx, za=z0+j*cz; if(skip&&skip(xa,za,xa+cx,za+cz)) continue; const a=j*W+i, b=a+1, c=a+W, d=c+1; idx.push(a,c,b,b,c,d); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('uv',new THREE.BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals();
  const nrm=g.attributes.normal.array, col=new Float32Array(pos.length);
  const snow=[0.93,0.96,0.98], shade=[0.74,0.81,0.88], rock=[0.36,0.39,0.43], rock2=[0.46,0.44,0.42];
  for(let k=0;k<pos.length/3;k++){ const x=pos[k*3], y=pos[k*3+1], z=pos[k*3+2], ny=nrm[k*3+1]; const d=hrFree(x,z);
    let r=d<=0?0:smooth(0.62,0.8,1-ny+0.12*vnoise(x/5,z/5)); if(d<=0&&ny<0.6) r=1; // crevasse walls show as dark ice/rock
    const sh=smooth(0.1,0.5,1-ny)*0.6; const rc=vnoise(x/11,z/11)>0?rock:rock2;
    for(let q=0;q<3;q++){ const sn=snow[q]+(shade[q]-snow[q])*sh; col[k*3+q]=sn+(rc[q]-sn)*r; } }
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  return g;
}
// the height the rendered mesh actually has at (x,z): bilinear over the same grid it was built from, so props sit on it
function hrMeshY(x,z){ const inner=x>-72&&x<72&&z>-832&&z<152; const cx=inner?2:8, cz=inner?1.5:8, x0=inner?-74:-424, z0=inner?-834:-1104;
  const i=Math.floor((x-x0)/cx), j=Math.floor((z-z0)/cz), fx=(x-x0)/cx-i, fz=(z-z0)/cz-j; const X=x0+i*cx, Z=z0+j*cz;
  const a=hrTerrain(X,Z), b=hrTerrain(X+cx,Z), c=hrTerrain(X,Z+cz), d=hrTerrain(X+cx,Z+cz); return a+(b-a)*fx+(c-a)*fz+(a-b-c+d)*fx*fz; }
// far peaks all round: a skyline that is never reached, coloured to fade into the haze
function hrRange(cz0=-340,rad0=900){
  const r=mulberry32(4242); const mats=[]; const sky=new THREE.Color(0x3a4a5c);
  for(let k=0;k<26;k++){ const ang=k/26*Math.PI*2+r()*0.2, rad=rad0+r()*600, cx=Math.sin(ang)*rad, cz=cz0+Math.cos(ang)*rad*0.9; const R0=260+r()*240, Hh=280+r()*420;
    const g=new THREE.ConeGeometry(R0,Hh,11,5); const pa=g.attributes.position; const col=new Float32Array(pa.count*3);
    for(let i=0;i<pa.count;i++){ const x=pa.getX(i), y=pa.getY(i), z=pa.getZ(i); const t=(y+Hh/2)/Hh; if(t<0.98){ const n=vnoise(x/60+k*7,z/60+y/80); pa.setX(i,x*(1+0.25*n)); pa.setZ(i,z*(1+0.25*vnoise(z/60+k,x/60))); pa.setY(i,y+n*Hh*0.06); }
      const capA=smooth(0.5,0.62,t+0.08*vnoise(x/40,z/40)); const base=new THREE.Color(0x56606a).lerp(new THREE.Color(0xeef3f6),capA).lerp(sky,0.45); col[i*3]=base.r; col[i*3+1]=base.g; col[i*3+2]=base.b; }
    g.setAttribute('color',new THREE.BufferAttribute(col,3)); g.computeVertexNormals();
    const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true,fog:false,flatShading:true})); m.position.set(cx,Hh/2-60,cz); m.rotation.y=r()*3; scene.add(m); }
}
function sledModel(col){
  const g=new THREE.Group(); const body=MC(col), blk=MC(0x1b1d20), stl=MC(0x8d949a), seat=MC(0x2a2d30);
  const B=(w,h,d,x,y,z,m,rx=0)=>{ const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); b.position.set(x,y,z); b.rotation.x=rx; g.add(b); return b; };
  B(0.9,0.35,1.6,0,0.42,0.15,body); B(0.8,0.3,0.9,0,0.62,-0.75,body,-0.35); B(0.6,0.22,0.9,0,0.72,0.45,seat); B(0.7,0.25,0.45,0,0.62,-0.15,blk);
  B(0.5,0.04,0.04,0,1.0,-0.45,blk); B(0.04,0.3,0.04,-0.2,0.85,-0.45,blk); B(0.04,0.3,0.04,0.2,0.85,-0.45,blk); B(0.5,0.25,0.04,0,1.05,-0.62,MB(0x7fc8e6,{transparent:true,opacity:0.5}),0.3);
  B(0.12,0.05,1.3,-0.42,0.06,-0.85,stl); B(0.12,0.05,1.3,0.42,0.06,-0.85,stl); B(0.04,0.3,0.04,-0.42,0.2,-0.6,blk); B(0.04,0.3,0.04,0.42,0.2,-0.6,blk);
  B(0.55,0.28,1.4,0,0.17,0.35,blk); const lamp=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.1,0.05),MB(0xfff2c0)); lamp.position.set(0,0.62,-1.22); g.add(lamp);
  return g;
}
function hrSpawn(slot){ const x=hrCx(HR.start)+((slot%4)-1.5)*3.2; return {x,z:HR.start+Math.floor(slot/4)*5}; }
function sledStart(sp,first){
  if(!R.sledM){ R.sledM=sledModel(playerColor(NET.id||'me')); scene.add(R.sledM); }
  const h=sp.h!=null?sp.h:Math.PI; R.sled={x:sp.x,z:sp.z,y:R.terrain(sp.x,sp.z),h,speed:0,vy:0,air:false,u:0,w:0,r:0,delta:0,thr:0,contact:true,pitch:0,roll:0,tipT:0,spawn:{x:sp.x,z:sp.z}};
  R.ride={mode:'drive'}; P.pos.x=sp.x; P.pos.z=sp.z; P.y=R.sled.y; P.vy=0; P.vx=P.vz=0; P.yaw=h; P.pitch=-0.08;
  if(P.slot==='primary') P.slot=S.eq.secondary?'secondary':'fists';
  if(!R.engine) R.engine=rotorSound(520,22,0);
  if(first) R.crashes=0;
}
function sledCrash(why){
  if(R.crashT&&R.t-R.crashT<1.2){ if(R.sled){ R.sled.speed=0; R.sled.u=R.sled.w=R.sled.r=0; } return; } R.crashT=R.t; R.crashes=(R.crashes||0)+1;
  const spd=R.sled?Math.hypot(R.sled.u,R.sled.w):0;
  sfxNoise(0.6,500,0.6); sfxGrunt(0.5,90); P.hurt=1; P.shake=0.6; puff(new THREE.Vector3(P.pos.x,P.y+0.6,P.pos.z),0xffffff,16,4);
  if(!R.race){ // open country: you're thrown off, the sled stays where it stopped, and the fall hurts
    const sl=R.sled; sl.u=sl.w=sl.r=0; sl.thr=0; sl.vy=0; sl.speed=0; sl.wreckT=R.t+3;
    if(R.ride&&R.ride.mode==='drive'){ R.ride=null; const fx=-Math.sin(sl.h), fz=-Math.cos(sl.h); P.pos.x=sl.x+fx*2.2; P.pos.z=sl.z+fz*2.2; resolve(P.pos,0.35); P.y=groundAt(P.pos.x,P.pos.z,P.y+1); P.vy=1.5; }
    msg(`${why}. Thrown off the sled.`); if(NET.on) nsend({t:'msg',text:`${S.name||'Nomad'} crashed a snowmobile`});
    const d=clamp((spd-5)*2.4,6,70); dmgPart(wpick([['lleg',2],['rleg',2],['larm',1.5],['rarm',1.5],['thorax',1],['stomach',1]]),d,'Crashed a snowmobile'); if(spd>14&&rand()<0.25){ const l=rand()<0.5?'lleg':'rleg'; if(!P.frac[l]){ P.frac[l]=true; P.newFrac=true; } }
    return; }
  msg(`${why}. Back to the summit.`); if(NET.on) nsend({t:'msg',text:`${S.name||'Nomad'} crashed on the run`});
  const sp=R.sled?R.sled.spawn:hrSpawn(0); sledStart(sp,false); P.grace=Math.max(P.grace,2);
}
/* ---- snowmobile dynamics: a set of ordinary differential equations, integrated with RK4 at 240 Hz ----
   State s = [x, z, y, ẏ, ψ, u, w, r]: position, height and vertical speed, heading, forward and leftward body speeds,
   and yaw rate. Body axes: f = (−sin ψ, −cos ψ) forward, l = (−cos ψ, sin ψ) left; ψ grows when turning left.
   Planar motion is a bicycle model. The skis sit a metres ahead of the centre of mass and the track b behind; each
   makes a lateral force from its slip angle (F = C·α, scaled by load and capped by friction μ·N):
       α_f = δ − atan2(w + a r, |u|),   α_r = −atan2(w − b r, |u|)
       m (u̇ − w r) = F_drive − F_brake − F_roll − ½ρC_dA u|u| + F_gx
       m (ẇ + u r) = F_f cos δ + F_r + F_gy
       I_z ṙ      = a F_f cos δ − b F_r − K_r r     (the track dragging sideways through snow damps yaw)
       ψ̇ = r,   ẋ = u f_x + w l_x,   ż = u f_z + w l_z
   Drive is power-limited (P / u) and traction-limited (μ_t N). Gravity along the snow comes from the terrain
   gradient ∇h: F_g = −m g ∇h / (1 + |∇h|²), split into the body axes.
   Vertically the sled rides a spring-damper on the snow; when the ground falls away faster than it can follow
   (the lip of a jump, the edge of a crevasse) N goes to zero and it flies:
       m ÿ = N − m g,   N = max(0, k c − c_d (ẏ − ẏ_ground)),   c = h(x,z) + c₀ − y  */
const SLED={lock:0.55,turn:6.5,rMax:1.4,straight:0.35,m:290,Iz:190,a:0.95,b:0.75,Cf:16000,Cr:40000,muF:0.75,muR:0.95,wF:0.45,Kr:260,mu:0.55,muT:0.62,P:42000,Fb:2400,Crr:0.035,CdA:0.85,rho:1.3,sink:140,c0:0.08,hz:240,cg:0.6,half:0.55};
SLED.k=SLED.m*9.81/SLED.c0; SLED.cd=2*0.6*Math.sqrt(SLED.k*SLED.m);
const SLED_DEF=Object.assign({},SLED);
// World tuning: admins edit it in the debug panel, the server stores it and hands every raid the same snapshot
let WORLD={};
const TD_DEF={spawnR:565,exR:592,zoneR:78,hill:1,hillScale:1,trees:1,rocks:1,spawns:null,props:[]};
let TD_CFG=Object.assign({},TD_DEF);
function applyWorld(w){ w=w||{}; Object.assign(SLED,SLED_DEF,w.sled||{}); SLED.k=SLED.m*9.81/SLED.c0; SLED.cd=2*0.6*Math.sqrt(SLED.k*SLED.m); TD_CFG=Object.assign({},TD_DEF,w.storvidda||{}); if(!Array.isArray(TD_CFG.props)) TD_CFG.props=[]; TD_PADS=tdPads(); }
const _sd=[[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0]], _st=[0,0,0,0,0,0,0,0], _sx=[0,0,0,0,0,0,0,0];
function terrGrad(x,z){ const e=0.35; return [(R.terrain(x+e,z)-R.terrain(x-e,z))/(2*e),(R.terrain(x,z+e)-R.terrain(x,z-e))/(2*e)]; }
function sledDeriv(s,inp,out,info){
  const x=s[0], z=s[1], y=s[2], vy=s[3], psi=s[4], u=s[5], w=s[6], r=s[7], C=SLED, g=9.81;
  const fx=-Math.sin(psi), fz=-Math.cos(psi), lx=-Math.cos(psi), lz=Math.sin(psi);
  const gh=R.terrain(x,z), [hx,hz]=terrGrad(x,z); const vx=u*fx+w*lx, vz=u*fz+w*lz, gvy=hx*vx+hz*vz;
  const comp=gh+C.c0-y; const N=comp>0?Math.max(0,C.k*comp-C.cd*(vy-gvy)):0;
  let Fx=0, Ff=0, Fr=0;
  if(N>0){
    const load=Math.min(1.6,N/(C.m*g)), sn2=1/(1+hx*hx+hz*hz);
    const Fgx=-C.m*g*(hx*fx+hz*fz)*sn2, Fgy=-C.m*g*(hx*lx+hz*lz)*sn2;
    const ue=Math.max(Math.abs(u),2.5);
    const af=inp.delta-Math.atan2(w+C.a*r,ue), ar=-Math.atan2(w-C.b*r,ue);
    const capF=C.muF*N*C.wF, capR=C.muR*N*(1-C.wF);   // skis carry ~45% of the weight and let go a little before the track: mild understeer at the limit
    Ff=clamp(C.Cf*load*af,-capF,capF); Fr=clamp(C.Cr*load*ar,-capR,capR)+Fgy;
    const trac=C.muT*N*0.55;
    let drive=inp.thr>0&&u>-0.5?Math.min(C.P/Math.max(Math.abs(u),1.5),trac)*inp.thr:0;
    if(inp.rev>0&&u<1) drive-=Math.min(700,trac)*inp.rev;
    const brake=inp.brk>0&&u>0.3?Math.min(C.Fb,C.mu*N)*inp.brk:0;
    const roll=C.Crr*N*Math.tanh(u/0.6)+C.sink*u*Math.max(0,1-Math.abs(u)/6);
    Fx=drive-brake-roll+Fgx;
    if(info){ info.N=N; info.lat=(Ff*Math.cos(inp.delta)+Fr-Fgy)/C.m; info.side=(hx*lx+hz*lz)*Math.sqrt(sn2); info.fwd=(hx*fx+hz*fz); info.gvy=gvy; info.gh=gh; }
  } else if(info){ info.N=0; info.lat=0; info.side=0; info.fwd=0; info.gvy=gvy; info.gh=gh; }
  Fx-=0.5*C.rho*C.CdA*u*Math.abs(u); const dragW=0.5*C.rho*1.6*w*Math.abs(w); const cdl=Math.cos(inp.delta);
  out[0]=vx; out[1]=vz; out[2]=vy; out[3]=N/C.m-g; out[4]=r;
  out[5]=Fx/C.m+w*r; out[6]=(Ff*cdl+Fr-dragW)/C.m-u*r; out[7]=(C.a*Ff*cdl-C.b*Fr-(N>0?C.Kr*r*Math.min(1.5,N/(C.m*g)):0))/C.Iz-(N>0?0:3*r);   // in the air the spinning track and the rider's weight resist yaw
}
function sledRK4(sl,inp,h,info){
  const s=_sx; s[0]=sl.x; s[1]=sl.z; s[2]=sl.y; s[3]=sl.vy; s[4]=sl.h; s[5]=sl.u; s[6]=sl.w; s[7]=sl.r;
  const [k1,k2,k3,k4]=_sd, t=_st;
  sledDeriv(s,inp,k1,info);
  for(let i=0;i<8;i++) t[i]=s[i]+h*0.5*k1[i]; sledDeriv(t,inp,k2,null);
  for(let i=0;i<8;i++) t[i]=s[i]+h*0.5*k2[i]; sledDeriv(t,inp,k3,null);
  for(let i=0;i<8;i++) t[i]=s[i]+h*k3[i]; sledDeriv(t,inp,k4,null);
  for(let i=0;i<8;i++) s[i]+=h/6*(k1[i]+2*k2[i]+2*k3[i]+k4[i]);
  sl.x=s[0]; sl.z=s[1]; sl.y=s[2]; sl.vy=s[3]; sl.h=s[4]; sl.u=s[5]; sl.w=s[6]; sl.r=s[7];
}
// physics for whoever is driving
function rideStep(dt,can){
  if(R.ride.mode==='pass') return passStep(dt);
  const sl=R.sled, k=P.keys, C=SLED;
  if(P.slot==='primary'){ P.slot=S.eq.secondary?'secondary':'fists'; if(!R.sidearmMsg){ R.sidearmMsg=1; msg('Drivers can only use a sidearm. Let a squadmate ride on the back with a rifle.'); } }
  // controls feed the equations through a steering angle and throttle/brake that move at realistic rates
  const steer=can?((k.KeyA?1:0)-(k.KeyD?1:0)):0; // A/D ask for a turn rate rather than full lock (what a rider does by feel, leaning and feathering the bars):
  // the target yaw rate keeps sideways grip demand near 0.65 g at speed, and letting go actively straightens the sled
  const us=Math.abs(sl.u), dir=sl.u<-0.3?-1:1, rMax=Math.min(C.rMax,C.turn/Math.max(us,4)), rT=steer*rMax*dir;
  const dCmd=clamp(((C.a+C.b)*rT/Math.max(us,3)+C.straight*(rT-sl.r))*dir,-C.lock,C.lock);
  sl.delta+=clamp((sl.contact?dCmd:steer*0.2)-sl.delta,-3*dt,3*dt);
  sl.thr+=clamp((can&&k.KeyW?1:0)-sl.thr,-4*dt,4*dt);
  const inp={delta:sl.delta,thr:sl.thr,brk:can&&k.KeyS&&sl.u>0.3?1:0,rev:can&&k.KeyS&&sl.u<=0.3?1:0};
  const h=1/C.hz, n=Math.max(1,Math.min(24,Math.round(dt*C.hz))), sub=dt/n; const info={}; const psi0=sl.h;
  for(let i=0;i<n;i++){
    const ox=sl.x, oz=sl.z, wasOn=sl.contact;
    sledRK4(sl,inp,sub,info); sl.contact=info.N>0;
    if(sl.y<R.terrainBase(sl.z)-2.5){ sledCrash('Fell into a crevasse'); return; }
    if(!wasOn&&sl.contact){ const imp=sl.vy-info.gvy; if(imp<-13){ const inCrev=R.race&&R.hrT.crev.some(v=>{ const o=sl.x-hrCx(sl.z); return sl.z>v.z-1&&sl.z<v.z+v.len+1&&o>v.x0-1&&o<v.x1+1; }); sledCrash(inCrev||sl.y<R.terrainBase(sl.z)-1?'Fell into a crevasse':'Landed too hard'); return; } if(imp<-7){ P.shake=Math.min(0.4,-imp*0.03); sfxNoise(0.25,300,Math.min(0.5,-imp*0.04)); } }
    // the run's edge: the valley walls are steep enough to roll you, and past them there's nowhere to go
    if(R.free&&R.free(sl.x,sl.z)>4){ sl.x=ox; sl.z=oz; sl.u*=0.5; sl.w*=-0.3; sl.r*=0.5; }
    if(sl.contact&&!R.race&&info.fwd<-0.9&&sl.u>14){ sledCrash('Drove into a bank'); return; }
    if(sl.contact&&Math.abs(info.side)>0.75){ sl.tipT=(sl.tipT||0)+sub; if(sl.tipT>0.5){ sledCrash('Rolled the sled on the sidehill'); return; } } else sl.tipT=Math.max(0,(sl.tipT||0)-sub*(sl.contact?2:0.5));
    if(sl.y<R.terrainBase(sl.z)-2.5){ sledCrash('Fell into a crevasse'); return; }
  }
  const spd=Math.hypot(sl.u,sl.w); sl.speed=sl.u; sl.air=!sl.contact; sledRunOver(sl,spd);
  { const L=R.bound-2; if(sl.z<-L){ sl.z=-L; sl.u=Math.max(0,sl.u); } if(sl.z>L){ sl.z=L; sl.u=Math.min(0,sl.u); } if(sl.x<-L){ sl.x=-L; sl.u*=0.3; } if(sl.x>L){ sl.x=L; sl.u*=0.3; } }
  // obstacles: fast means crash, slow means bump
  for(const o of R.hrT.obs){ if(Math.abs(o.z-sl.z)>4) continue; let hit=false;
    if(o.r){ hit=Math.hypot(o.x-sl.x,o.z-sl.z)<o.r+0.55&&sl.y<o.y+o.h; } else { hit=sl.x>o.x0-0.5&&sl.x<o.x1+0.5&&sl.z>o.z0-0.6&&sl.z<o.z1+0.6&&sl.y<o.y+o.h; }
    if(hit){ if(spd>6){ sledCrash(o.name?`Hit ${o.name}`:'Crashed'); return; } const a=Math.atan2(sl.x-(o.x??(o.x0+o.x1)/2),sl.z-o.z); sl.x+=Math.sin(a)*0.3; sl.z+=Math.cos(a)*0.3; sl.u=0; sl.w=0; sl.r=0; break; } }
  for(const b of colsNear(sl.x,sl.z)){ if(b.terrain) continue; if(sl.x>b.x0-0.5&&sl.x<b.x1+0.5&&sl.z>b.z0-0.6&&sl.z<b.z1+0.6&&b.y1>sl.y+0.3&&b.y0<sl.y+1.2){ if(spd>9){ sledCrash('Hit a wall'); return; } sl.u=-sl.u*0.2; sl.w=0; sl.r=0; const cx=(b.x0+b.x1)/2, cz=(b.z0+b.z1)/2; const ex=Math.abs(sl.x-cx)-(b.x1-b.x0)/2, ez=Math.abs(sl.z-cz)-(b.z1-b.z0)/2; if(ex>ez) sl.x=cx+Math.sign(sl.x-cx)*((b.x1-b.x0)/2+0.55); else sl.z=cz+Math.sign(sl.z-cz)*((b.z1-b.z0)/2+0.65); break; } }
  // body attitude for the model and the camera: follow the snow on the ground, nose drops with the velocity in the air
  const fx=-Math.sin(sl.h), fz=-Math.cos(sl.h);
  const pitT=sl.contact?Math.atan(info.fwd||0):Math.atan2(sl.vy,Math.max(4,spd))*0.8, rolT=sl.contact?(-Math.atan(info.side||0)-clamp((info.lat||0)/9.81,-0.6,0.6)*0.12):sl.roll*0.98;
  sl.pitch=(sl.pitch||0)+(pitT-(sl.pitch||0))*Math.min(1,dt*10); sl.roll=(sl.roll||0)+(rolT-(sl.roll||0))*Math.min(1,dt*8);
  P.yaw+=sl.h-psi0;
  P.pos.x=sl.x; P.pos.z=sl.z; P.y=Math.max(sl.y,info.gh??sl.y); P.vy=0; P.vx=fx*sl.u-Math.cos(sl.h)*sl.w; P.vz=fz*sl.u+Math.sin(sl.h)*sl.w; P.sprint=false;
  if(sl.contact&&(Math.abs(sl.w)>2.5||(inp.brk&&sl.u>8))&&rand()<dt*14) puff(new THREE.Vector3(sl.x+Math.sin(sl.h)*1.2,sl.y+0.2,sl.z+Math.cos(sl.h)*1.2),0xffffff,4,2.2);
  if(R.engine){ const rpm=0.25+Math.min(1,spd/45)*0.65+sl.thr*0.2+(sl.contact?0:0.15*sl.thr); soundVol(R.engine,0.06+rpm*0.18); if(MUS.ctx) R.engine.lfo.frequency.setTargetAtTime(14+rpm*70,MUS.ctx.currentTime,0.12); }
  R.sledM.position.set(sl.x,sl.y,sl.z); R.sledM.rotation.set(sl.pitch,sl.h,sl.roll,'YXZ');
}
// riding on the back of a squadmate's sled
function passStep(dt){
  const q=NET.players[R.ride.id]; if(!q||!q.st||q.st.rd!==1||!q.g){ R.ride=null; msg('Your driver is gone.'); return; }
  if(q.st.cr!==R.ride.cr){ R.ride=null; if(R.race){ msg(`${q.name} crashed. Back to the summit.`); const sp=R.sled?R.sled.spawn:hrSpawn(0); sledStart(sp,false); } else { msg(`${q.name} crashed. You're thrown off.`); P.y=groundAt(P.pos.x,P.pos.z,P.y+1); dmgPart(rand()<0.5?'lleg':'rleg',12,'Thrown off a snowmobile'); } return; }
  const h=q.st.sh||0; const gp=q.g.position; P.pos.x=gp.x+Math.sin(h)*0.75; P.pos.z=gp.z+Math.cos(h)*0.75; P.y=gp.y-0.3; P.vx=P.vz=0; P.vy=0;
  if(R.engine) soundVol(R.engine,0.05);
}
function rideKey(){
  if(R.ride){ if(R.ride.mode==='drive'&&Math.hypot(R.sled.u,R.sled.w)>4){ msg('Slow down to get off.'); return true; } const was=R.ride.mode; R.ride=null; if(was==='drive'){ R.sled.speed=0; R.sled.u=R.sled.w=R.sled.r=0; R.sled.thr=0; P.pos.x+=Math.cos(R.sled.h)*1.2; P.pos.z-=Math.sin(R.sled.h)*1.2; } else { P.pos.x+=1; } P.y=groundAt(P.pos.x,P.pos.z,P.y+0.5); if(R.engine) soundVol(R.engine,0); return true; }
  const near=R.near||nearestCont(); const cd=near?Math.hypot(near.x-P.pos.x,near.z-P.pos.z):99;
  const m=sledMate(), own=R.sled?Math.hypot(R.sled.x-P.pos.x,R.sled.z-P.pos.z):99, md=m?Math.hypot(NET.players[m].g.position.x-P.pos.x,NET.players[m].g.position.z-P.pos.z):99;
  if(own<2.6&&own<=md&&cd>1.4){ if(R.sled.wreckT>R.t){ msg('The sled is on its side. Give it a second.'); return true; } R.ride={mode:'drive'}; P.yaw=R.sled.h; return true; }
  if(m&&cd>1.4){ R.ride={mode:'pass',id:m,cr:NET.players[m].st.cr}; msg(`Riding with ${NET.players[m].name}. E hops off.`); return true; }
  return false;
}
function sledMate(){ for(const id in NET.players){ const q=NET.players[id]; if(!isMate(id)||!q.st||q.st.rd!==1||!q.g) continue; if(Math.hypot(q.g.position.x-P.pos.x,q.g.position.z-P.pos.z)<2.8) return id; } return null; }
function ridePrompt(){
  if(P.dead) return '';
  if(R.ride) return R.ride.mode==='drive'?(Math.hypot(R.sled.u,R.sled.w)<4?'<kbd>E</kbd>Get off':''):'<kbd>E</kbd>Hop off';
  const near=R.near||nearestCont(); const cd=near?Math.hypot(near.x-P.pos.x,near.z-P.pos.z):99; if(cd<=1.4) return '';
  const m=sledMate(), own=R.sled?Math.hypot(R.sled.x-P.pos.x,R.sled.z-P.pos.z):99, md=m?Math.hypot(NET.players[m].g.position.x-P.pos.x,NET.players[m].g.position.z-P.pos.z):99;
  if(own<2.6&&own<=md) return '<kbd>E</kbd>Ride your snowmobile';
  if(m) return `<kbd>E</kbd>Ride on the back with ${esc(NET.players[m].name)}`;
  return '';
}
function remoteSled(p,k){
  const st=p.st; let pos=null, h=0;
  if(st.rd===1){ pos=[p.g.position.x,p.g.position.y-0.42,p.g.position.z]; h=st.sh||0; } else if(Array.isArray(st.ps)){ pos=[st.ps[0],st.ps[1],st.ps[2]]; h=st.ps[3]; }
  if(!pos||st.dead){ if(p.sledM) p.sledM.visible=false; return; }
  if(!p.sledM){ p.sledM=sledModel(playerColor(p.id||p.name||'x')); scene.add(p.sledM); }
  p.sledM.visible=true; p.sledM.position.set(pos[0],pos[1],pos[2]); p.sledM.rotation.order='YXZ'; p.sledM.rotation.y=lerpA(p.sledM.rotation.y,h,k); if(Array.isArray(st.sa)&&st.rd===1){ p.sledM.rotation.x+=(st.sa[0]-p.sledM.rotation.x)*k; p.sledM.rotation.z+=(st.sa[1]-p.sledM.rotation.z)*k; }
}
function raceHud(){
  const el=$('#racehud'); if(!R.race){ const drv=R.sleds&&!P.dead&&R.ride&&R.ride.mode==='drive'; if(!drv){ if(!el.hidden) el.hidden=true; return; } el.hidden=false; const html=`<div class="spd">${Math.round(Math.hypot(R.sled.u,R.sled.w)*3.6)}<small>km/h</small></div>`; if(el._h!==html){ el._h=html; el.innerHTML=html; } return; }
  if(P.dead){ if(!el.hidden) el.hidden=true; return; } el.hidden=false;
  const spd=R.ride&&R.ride.mode==='drive'?Math.hypot(R.sled.u,R.sled.w)*3.6:0; const prog=clamp((P.pos.z-HR.start)/(HR.camp-HR.start),0,1);
  const rivals=[P.pos.z]; for(const id in NET.players){ const st=NET.players[id].st; if(st&&!st.dead) rivals.push(st.z); } rivals.sort((a,b)=>b-a); const place=rivals.indexOf(P.pos.z)+1;
  const html=`<div class="spd">${Math.round(spd)}<small>km/h</small></div><div class="rk"><span>${prog<1?'To the camp':'At the camp'}</span><div class="bar"><i style="width:${(prog*100).toFixed(1)}%"></i></div><span>${R.crashes||0} crash${R.crashes===1?'':'es'}</span></div>${rivals.length>1?`<div class="rk"><span>Position</span><b>${place}/${rivals.length}</b></div>`:''}`;
  if(el._h!==html){ el._h=html; el.innerHTML=html; }
}
const HR_POI=[['Lodge',0,60,26,16],['Lift station',-38,32,12,10],['Garage',38,32,14,10],['Ski shed',-34,96,10,8],['Fuel hut',34,96,8,7]];
const HR_EX=[['Valley road',0,126],['Ski lift',-52,118]];
function buildHrimfell(){
  scene.background=new THREE.Color(0x3a4a5c); scene.fog=new THREE.FogExp2(0x3a4a5c,0.0075);
  scene.add(new THREE.HemisphereLight(0xcfe0f0,0x4a5460,0.75)); const sun=new THREE.DirectionalLight(0xfff0dd,0.75); sun.position.set(-60,45,70); scene.add(sun);
  camera.far=2600; camera.updateProjectionMatrix();
  aurora(); for(const a of R.aur){ a.position.z-=500; a.position.y+=120; }
  R.race=true; R.sleds=true; R.bound=800; R.drain=0.36; R.terrain=hrTerrain; R.terrainBase=hrBase; R.free=hrFree; R.decor=[];
  // the course layout comes from the raid seed, so everyone gets the same mountain
  const T={ramps:[],crev:[],obs:[]}; R.hrT=T;
  for(const z of [-640,-470,-300,-170]) T.ramps.push({z,x:Math.round(rr(-5,5)),w:7,h:z===-640||z===-170?1.8:2.6});
  for(const z of [-470,-300]){ const side=rand()<0.5?-1:1; T.crev.push({z:z+8,len:14,x0:side<0?-HR.W*0.55:-HR.W-4,x1:side<0?HR.W+4:HR.W*0.55}); }
  T.crev.push({z:-560,len:5,x0:-HR.W-4,x1:-3}); T.crev.push({z:-555,len:5,x0:4,x1:HR.W+4});
  // terrain: a fine grid over the run and camp, a coarser one for the mountainsides around it
  const snowMat=()=>new THREE.MeshLambertMaterial({map:TEXS.snow,vertexColors:true});
  const inner=new THREE.Mesh(hrGrid(-74,74,-834,154,2,1.5,null,4),snowMat()); scene.add(inner); R.ray.push(inner);
  const om=snowMat(); om.polygonOffset=true; om.polygonOffsetFactor=2; om.polygonOffsetUnits=4;
  const outer=new THREE.Mesh(hrGrid(-424,424,-1104,424,8,8,(a,b,c,d)=>a>=-72&&c<=72&&b>=-832&&d<=152,8),om); scene.add(outer);
  hrRange();
  // crevasse floors and warning flags
  for(const v of T.crev){ const c=hrCx(v.z); const fl=new THREE.Mesh(new THREE.PlaneGeometry(v.x1-v.x0,v.len),MB(0x1b3a52)); fl.rotation.x=-Math.PI/2; fl.position.set(c+(v.x0+v.x1)/2,hrBase(v.z)-8.6,v.z+v.len/2); scene.add(fl);
    for(let x=v.x0;x<=v.x1;x+=4){ const px=c+x; if(Math.abs(px-c)>HR.W+1) continue; const pole=new THREE.Mesh(new THREE.BoxGeometry(0.08,1.4,0.08),MB(0xff5a1a)); pole.position.set(px,hrTerrain(px,v.z-3)+0.7,v.z-3); scene.add(pole); } }
  for(const r of T.ramps){ const c=hrCx(r.z); for(const sx of [-1,1]){ const pole=new THREE.Mesh(new THREE.BoxGeometry(0.1,1.8,0.1),MB(0x2a8aff)); const px=c+r.x+sx*r.w; pole.position.set(px,hrTerrain(px,r.z-0.5)+0.9,r.z-0.5); scene.add(pole); } }
  // obstacles down the run: trees thicken toward the edges, rocks and the odd fallen log in the middle
  const trunkG=new THREE.CylinderGeometry(0.22,0.3,2.2,6), coneG=new THREE.ConeGeometry(1.5,3.2,7), cone2=new THREE.ConeGeometry(1.1,2.4,7), rockG=new THREE.DodecahedronGeometry(1,0);
  const trees=[]; const freeOf=(z)=>T.ramps.some(r=>z>r.z-26&&z<r.z+4)||T.crev.some(v=>z>v.z-14&&z<v.z+v.len+3);
  for(let z=-735;z<-70;z+=rr(3.5,7)){ if(freeOf(z)) continue; const c=hrCx(z), n=rand()<0.55?1:2;
    for(let i=0;i<n;i++){ const edge=rand()<0.55; const off=edge?(rand()<0.5?-1:1)*rr(HR.W-5,HR.W+2):rr(-HR.W+3,HR.W-3); const x=c+off, y=hrTerrain(x,z); const kind=rand();
      if(kind<0.68){ trees.push([x,y,z,rr(0.8,1.25)]); T.obs.push({x,z,r:0.45,y,h:6,name:'a tree'}); R.cols.push({x0:x-0.35,x1:x+0.35,z0:z-0.35,z1:z+0.35,y0:y,y1:y+6,terrain:true}); }
      else if(kind<0.92){ const sz=rr(0.8,1.6); const m=new THREE.Mesh(rockG,M('rock')); m.scale.set(sz*1.3,sz*0.8,sz); m.position.set(x,y+sz*0.25,z); m.rotation.y=rand()*3; scene.add(m); R.ray.push(m); T.obs.push({x,z,r:sz*1.1,y,h:sz*1.05,name:'a rock'}); R.cols.push({x0:x-sz,x1:x+sz,z0:z-sz,z1:z+sz,y0:y,y1:y+sz,terrain:true}); }
      else if(!edge){ const len=rr(5,9); const m=new THREE.Mesh(new THREE.BoxGeometry(len,0.6,0.6),M('wood')); m.position.set(x,y+0.3,z); scene.add(m); R.ray.push(m); T.obs.push({x0:x-len/2,x1:x+len/2,z0:z-0.3,z1:z+0.3,z,y:y-0.2,h:0.85,name:'a fallen log'}); R.cols.push({x0:x-len/2,x1:x+len/2,z0:z-0.3,z1:z+0.3,y0:y,y1:y+0.6,terrain:true}); } } }
  // forests on the lower mountainsides, thinning out with height and on steep ground
  { const fr=mulberry32(99); for(let k=0;k<5200&&trees.length<3200;k++){ const x=(fr()*2-1)*190, z=-860+fr()*1000; const d=hrFree(x,z); if(d<1.5||d>120) continue;
      const y=hrMeshY(x,z), sl=Math.abs(hrMeshY(x+2,z)-y)+Math.abs(hrMeshY(x,z+2)-y); if(sl>2.4) continue; if(fr()>1-d/150) continue; trees.push([x,y-0.3,z,0.9+fr()*0.8]); } }
  // boulders scattered on the lower slopes beside the run (steep faces get rock colour in the terrain instead)
  { const fr=mulberry32(7); const rk=[]; for(let k=0;k<3000&&rk.length<420;k++){ const x=(fr()*2-1)*200, z=-880+fr()*1040; const d=hrFree(x,z); if(d<3||d>45) continue; const y=hrMeshY(x,z), sl=Math.abs(hrMeshY(x+2,z)-y)+Math.abs(hrMeshY(x,z+2)-y); if(sl<0.9||sl>2.2) continue; rk.push([x,y,z,0.9+fr()*1.6]); }
    const im=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),MC(0x5b636b),rk.length); const m4=new THREE.Matrix4(), q=new THREE.Quaternion(), e=new THREE.Euler(), sc=new THREE.Vector3(), ps=new THREE.Vector3();
    rk.forEach(([x,y,z,s0],i)=>{ e.set(fr()*3,fr()*3,fr()*3); q.setFromEuler(e); sc.set(s0*1.3,s0*0.8,s0); ps.set(x,y-s0*0.4,z); m4.compose(ps,q,sc); im.setMatrixAt(i,m4); }); im.frustumCulled=false; scene.add(im); }
  R.treePts=trees; const tM=new THREE.InstancedMesh(trunkG,MC(0x4a3424),trees.length), cM=new THREE.InstancedMesh(coneG,MC(0x2a4a34),trees.length), c2M=new THREE.InstancedMesh(cone2,MC(0x36583e),trees.length); const m4=new THREE.Matrix4(), q=new THREE.Quaternion(), sc=new THREE.Vector3(), ps=new THREE.Vector3();
  trees.forEach(([x,y,z,s0],i)=>{ sc.set(s0,s0,s0); ps.set(x,y+1.1*s0,z); m4.compose(ps,q,sc); tM.setMatrixAt(i,m4); ps.set(x,y+3.2*s0,z); m4.compose(ps,q,sc); cM.setMatrixAt(i,m4); ps.set(x,y+4.8*s0,z); m4.compose(ps,q,sc); c2M.setMatrixAt(i,m4); });
  for(const im of [tM,cM,c2M]){ im.frustumCulled=false; scene.add(im); } R.ray.push(tM);
  // start gate at the summit
  const sg=hrCx(HR.start); for(const sx of [-1,1]){ const post=new THREE.Mesh(new THREE.BoxGeometry(0.4,5,0.4),MC(0xb8402d)); post.position.set(sg+sx*15,hrTerrain(sg+sx*15,HR.start+6)+2.5,HR.start+6); scene.add(post); }
  const banner=new THREE.Mesh(new THREE.BoxGeometry(30,1,0.15),MC(0xb8402d)); banner.position.set(sg,hrTerrain(sg,HR.start+6)+5,HR.start+6); scene.add(banner);
  // the loot camp at the bottom
  const wood=M('wood'), grey=M('metalGrey'), red=M('metalRed'), L2=1.6;
  building(0,60,26,16,4.5,{mat:wood,doors:{n:[[13,3]],s:[[13,2]],e:[[8,1.8]],w:[[8,1.8]]},name:'Lodge'});
  wallLine(-13,60,-3,60,4.5,wood,[[5,1.6]]); wallLine(3,60,13,60,4.5,wood,[[5,1.6]]);
  container('vsafe',-10,53.2,L2); container('safe',10,53.4,L2); container('vlocker',-12.2,64,L2); container('vlocker',12.2,64,L2); container('crate',-6,66.8,L2); container('cargo',6,66.6,L2); container('desk',0,53.2,L2); container('med',-12.3,56.5,L2); heater(0,67.4);
  building(-38,32,12,10,4,{mat:grey,doors:{e:[[5,1.8]]},name:'Lift station'}); container('crate',-42.5,28.2,L2); container('tool',-34,28.3,L2); container('locker',-43.3,35,L2);
  building(38,32,14,10,4,{mat:red,doors:{w:[[5,3]]},name:'Garage'}); container('cargo',42.5,28.4,L2); container('tool',35,28.3,L2); container('crate',43.5,35.6,L2); container('drum',33,36);
  building(-34,96,10,8,3.5,{mat:wood,doors:{n:[[5,1.6]]},name:'Ski shed'}); container('locker',-38.2,98,L2); container('crate',-30.5,98.8,L2);
  building(34,96,8,7,3,{mat:grey,doors:{n:[[4,1.6]]},name:'Fuel hut'}); container('drum',31.5,98.4); container('tool',36,98.6,L2);
  for(const [x,z] of [[-20,10],[20,12],[0,30],[-24,80],[24,82],[-50,60],[50,62]]) shipc(x,z,'x',rand()<0.5?grey:M('metalTeal'));
  container('crate',-20,12.6,L2); container('crate',20,14.6,L2);
  for(const w of [solid(0,2,139,140,4,2,M('drift'),{ts:4,los:false}),solid(-63,2,55,2,4,170,M('drift'),{ts:4,los:false}),solid(63,2,55,2,4,170,M('drift'),{ts:4,los:false})]) w.visible=false;
  for(let i=0;i<14;i++){ const x=rr(-58,58), z=rr(-20,130); if(R.bld.some(b=>x>b.x0-4&&x<b.x1+4&&z>b.z0-4&&z<b.z1+4)) continue; drift(x,z,rr(1.2,2.5)); }
  R.extracts=HR_EX.map(([name,x,z])=>({name,x,z,r:4,active:true}));
  const sps=[]; for(let i=0;i<8;i++) sps.push(hrSpawn(i)); return sps;
}
