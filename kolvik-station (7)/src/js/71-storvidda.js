/* 71-storvidda: Storvidda: tundra terrain, relay, admin props */
/* ================= STORVIDDA: open tundra, snowmobile insertions, a fortified relay in the middle ================= */
// Flat pads (the relay, the outposts, the lake, every insert and extract) sit at height 0 so the ordinary building code
// works on them; everything in between is noise terrain blended smoothly up from the pad edges.
const TD={B:640,R:565,EX:592};
function tdPads(){ const C=TD_CFG; const L=[
  {kind:'zone',name:'Storvidda Relay',x:0,z:0,r:C.zoneR},
  {kind:'out',name:"Hunter's cabin",x:-235,z:165,r:22},
  {kind:'out',name:'Pump station',x:250,z:-195,r:24},
  {kind:'lake',name:'Isvann',x:-220,z:-260,r:110,ice:true}];
  const cs=Array.isArray(C.spawns)&&C.spawns.length?C.spawns:null;
  if(cs) for(const q of cs){ const x=clamp(+q.x||0,-TD.B+12,TD.B-12), z=clamp(+q.z||0,-TD.B+12,TD.B-12); L.push({kind:'spawn',x,z,r:11,h:Math.atan2(x,z)}); }
  else for(let k=0;k<8;k++){ const a=(k+0.5)*Math.PI/4; L.push({kind:'spawn',x:Math.round(Math.sin(a)*C.spawnR),z:Math.round(Math.cos(a)*C.spawnR),r:11,h:a+Math.PI}); }
  [['North road',0,-1],['East trail',1,0],['South pass',0,1],['West cabin',-1,0]].forEach(([n,dx,dz])=>L.push({kind:'ex',name:n,x:dx*C.exR,z:dz*C.exR,r:12}));
  for(const pr of C.props||[]) if(pr.t==='hut') L.push({kind:'pad',x:+pr.x||0,z:+pr.z||0,r:9});
  return L; }
let TD_PADS=tdPads();
function tdMask(x,z){ let m=1; for(const p of TD_PADS){ const d=Math.hypot(x-p.x,z-p.z)-p.r; if(d<=0) return 0; const f=p.kind==='zone'||p.kind==='lake'?70:40; const v=smooth(0,f,d); if(v<m) m=v; } return m; }
function tdRelief(x,z){
  const wx=x+40*vnoise(x/230+3.1,z/230), wz=z+40*vnoise(x/230,z/230+7.7);
  const S_=TD_CFG.hillScale||1; let h=(26*fbm(wx/(320*S_),wz/(320*S_),4)+8*ridged(wx/(150*S_),wz/(150*S_),3)*smooth(-0.1,0.4,fbm(x/420+9,z/420,2))+5)*TD_CFG.hill+1.6*fbm(x/34,z/34,2)+0.25*vnoise(x/7,z/7);
  const dd=Math.max(Math.abs(x),Math.abs(z)); h+=smooth(620,900,dd)*90; // the plateau's rim rises past the playable edge
  return h;
}
function tdTerrain(x,z){ const m=tdMask(x,z); return m<=0?0:tdRelief(x,z)*m; }
function tdLake(x,z){ const p=TD_PADS.find(p=>p.kind==='lake'); return 1-smooth(p.r-5,p.r+1,Math.hypot(x-p.x,z-p.z)); }
// one terrain tile as an indexed mesh with vertex colours (snow, blue shade on slopes, rock on steep faces, ice on the lake)
function tdTile(x0,z0,size,cell,mat){
  const n=Math.round(size/cell), W=n+1; const pos=new Float32Array(W*W*3), uv=new Float32Array(W*W*2), col=new Float32Array(W*W*3);
  for(let j=0;j<=n;j++) for(let i=0;i<=n;i++){ const x=x0+i*cell, z=z0+j*cell, k=j*W+i; pos[k*3]=x; pos[k*3+1]=tdTerrain(x,z); pos[k*3+2]=z; uv[k*2]=x/4; uv[k*2+1]=z/4; }
  const idx=[]; for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const a=j*W+i, b=a+1, c=a+W, d=c+1; idx.push(a,c,b,b,c,d); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('uv',new THREE.BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals();
  const nrm=g.attributes.normal.array; const snow=[0.94,0.96,0.98], shade=[0.72,0.80,0.9], rock=[0.4,0.42,0.45], ice=[0.7,0.86,0.96], ice2=[0.58,0.78,0.92];
  for(let k=0;k<W*W;k++){ const x=pos[k*3], z=pos[k*3+2], ny=nrm[k*3+1]; const r=smooth(0.6,0.78,1-ny+0.1*vnoise(x/6,z/6)), sh=smooth(0.08,0.45,1-ny)*0.6, lk=tdLake(x,z), ic=vnoise(x/9,z/9)>0.3?ice2:ice;
    for(let q=0;q<3;q++){ let c=snow[q]+(shade[q]-snow[q])*sh; c=c+(rock[q]-c)*r; c=c+(ic[q]-c)*lk; col[k*3+q]=c; } }
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  const m=new THREE.Mesh(g,mat); scene.add(m); return m;
}
// objects an admin placed from the debug panel (stored in the server's world config, so every player gets them)
function tdProps(T){
  for(const pr of TD_CFG.props){ const x=clamp(+pr.x||0,-TD.B+2,TD.B-2), z=clamp(+pr.z||0,-TD.B+2,TD.B-2), y=tdTerrain(x,z), t=pr.t;
    if(t==='rock'){ const s0=1.6; const m=new THREE.Mesh(new THREE.DodecahedronGeometry(1,0),MC(0x5b636b)); m.scale.set(s0*1.3,s0*0.8,s0); m.position.set(x,y-s0*0.3,z); m.rotation.y=(+pr.r||0); scene.add(m); R.ray.push(m); T.obs.push({x,z,r:s0*1.1,y:y-1,h:s0*1.4,name:'a rock'}); R.cols.push({x0:x-s0,x1:x+s0,z0:z-s0,z1:z+s0,y0:y-1,y1:y+s0*0.6,terrain:true}); }
    else if(t==='drift'){ const m=new THREE.Mesh(new THREE.IcosahedronGeometry(2,0),M('drift')); m.position.set(x,y-1.1,z); m.scale.set(1.6,1,1); m.rotation.y=+pr.r||0; scene.add(m); }
    else if(t==='shipc'){ const ax=Math.abs(Math.sin(+pr.r||0))>0.7?'x':'z'; const mat=M('metalGrey'); if(ax==='x') solid(x,y+1.3,z,6.1,2.6,2.45,mat,{ts:2.6}); else solid(x,y+1.3,z,2.45,2.6,6.1,mat,{ts:2.6}); T.obs.push(ax==='x'?{x0:x-3.05,x1:x+3.05,z0:z-1.2,z1:z+1.2,z,y,h:2.6,name:'a container'}:{x0:x-1.2,x1:x+1.2,z0:z-3.05,z1:z+3.05,z,y,h:2.6,name:'a container'}); }
    else if(t==='cover'){ const ax=Math.abs(Math.sin(+pr.r||0))>0.7; solid(x,y+0.55,z,ax?1:4,1.1,ax?4:1,M('concrete'),{ts:1.5}); T.obs.push(ax?{x0:x-0.5,x1:x+0.5,z0:z-2,z1:z+2,z,y,h:1.1,name:'a wall'}:{x0:x-2,x1:x+2,z0:z-0.5,z1:z+0.5,z,y,h:1.1,name:'a wall'}); }
    else if(CTYPES[t]){ container(t,x,z,1.6,y); const [w,h,d]=CTYPES[t].size; T.obs.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,z,y,h,name:'a '+CTYPES[t].name.toLowerCase()}); }
    else if(t==='hut'){ building(x,z,6,5,3,{mat:M('wood'),nowin:true,doors:{s:[[3,1.5]]},name:'Hut'}); } // huts need a flat pad: the panel adds one with the hut
  }
}
function buildStorvidda(){
  scene.background=new THREE.Color(0x47586a); scene.fog=new THREE.FogExp2(0x47586a,0.0066);
  scene.add(new THREE.HemisphereLight(0xd3e2f2,0x4a5460,0.8)); const sun=new THREE.DirectionalLight(0xfff0dd,0.7); sun.position.set(80,60,-40); scene.add(sun);
  camera.far=2600; camera.updateProjectionMatrix();
  aurora(); for(const a of R.aur){ a.position.y+=90; }
  R.sleds=true; R.bound=TD.B; R.drain=0.4; R.terrain=tdTerrain; R.iceAt=tdLake; R.terrainBase=()=>-1e9; R.free=(x,z)=>Math.max(Math.abs(x),Math.abs(z))-TD.B; R.navB=350;
  const T={ramps:[],crev:[],obs:[]}; R.hrT=T;
  // terrain: 4 m tiles over the plateau (each tile is its own mesh, so bullets and sight lines only test nearby ground), 16 m tiles out to the rim
  const snowMat=new THREE.MeshLambertMaterial({map:TEXS.snow,vertexColors:true});
  for(let z=-TD.B;z<TD.B;z+=80) for(let x=-TD.B;x<TD.B;x+=80) R.ray.push(tdTile(x,z,80,4,snowMat));
  for(let z=-1280;z<1280;z+=160) for(let x=-1280;x<1280;x+=160){ if(x>=-TD.B&&x<TD.B&&z>=-TD.B&&z<TD.B) continue; tdTile(x,z,160,16,snowMat); }
  hrRange(0,1250);
  // trees and boulders: forests follow a broad noise field, thin out on steep ground and stay off the pads
  const trees=[]; { const fr=mulberry32(31); for(let k=0;k<26000&&trees.length<Math.round(3400*TD_CFG.trees);k++){ const x=(fr()*2-1)*(TD.B-6), z=(fr()*2-1)*(TD.B-6); const dens=fbm(x/180+2,z/180,3); if(fr()>(dens+0.35)*TD_CFG.trees) continue;
      let ok=true; for(const p of TD_PADS){ const d=Math.hypot(x-p.x,z-p.z)-p.r; if(d<(p.kind==='zone'?12:p.kind==='lake'?2:7)){ ok=false; break; } } if(!ok) continue;
      const y=tdTerrain(x,z), sl=Math.abs(tdTerrain(x+2,z)-y)+Math.abs(tdTerrain(x,z+2)-y); if(sl>1.6) continue;
      const s0=0.8+fr()*0.7; trees.push([x,y-0.2,z,s0]); T.obs.push({x,z,r:0.45,y,h:6,name:'a tree'}); R.cols.push({x0:x-0.35,x1:x+0.35,z0:z-0.35,z1:z+0.35,y0:y,y1:y+6,terrain:true}); } }
  for(const pr of TD_CFG.props){ if(pr.t==='tree'){ const x=+pr.x||0, z=+pr.z||0, y=tdTerrain(x,z); trees.push([x,y-0.2,z,1.1]); T.obs.push({x,z,r:0.45,y,h:6,name:'a tree'}); R.cols.push({x0:x-0.35,x1:x+0.35,z0:z-0.35,z1:z+0.35,y0:y,y1:y+6,terrain:true}); } }
  { const trunkG=new THREE.CylinderGeometry(0.22,0.3,2.2,6), coneG=new THREE.ConeGeometry(1.5,3.2,7), cone2=new THREE.ConeGeometry(1.1,2.4,7);
    R.treePts=trees; const tM=new THREE.InstancedMesh(trunkG,MC(0x4a3424),trees.length), cM=new THREE.InstancedMesh(coneG,MC(0x2a4a34),trees.length), c2M=new THREE.InstancedMesh(cone2,MC(0x36583e),trees.length); const m4=new THREE.Matrix4(), q=new THREE.Quaternion(), sc=new THREE.Vector3(), ps=new THREE.Vector3();
    trees.forEach(([x,y,z,s0],i)=>{ sc.set(s0,s0,s0); ps.set(x,y+1.1*s0,z); m4.compose(ps,q,sc); tM.setMatrixAt(i,m4); ps.set(x,y+3.2*s0,z); m4.compose(ps,q,sc); cM.setMatrixAt(i,m4); ps.set(x,y+4.8*s0,z); m4.compose(ps,q,sc); c2M.setMatrixAt(i,m4); });
    for(const im of [tM,cM,c2M]){ im.frustumCulled=false; scene.add(im); } R.ray.push(tM); }
  { const fr=mulberry32(7); const rk=[]; for(let k=0;k<6000&&rk.length<Math.round(380*TD_CFG.rocks);k++){ const x=(fr()*2-1)*(TD.B-6), z=(fr()*2-1)*(TD.B-6); let ok=true; for(const p of TD_PADS){ if(Math.hypot(x-p.x,z-p.z)-p.r<(p.kind==='zone'?6:4)){ ok=false; break; } } if(!ok) continue;
      const y=tdTerrain(x,z), sl=Math.abs(tdTerrain(x+2,z)-y)+Math.abs(tdTerrain(x,z+2)-y); if(sl<0.5||sl>2.4) continue; const s0=0.9+fr()*1.5; rk.push([x,y,z,s0]); T.obs.push({x,z,r:s0*1.1,y:y-1,h:s0*1.4,name:'a rock'}); R.cols.push({x0:x-s0,x1:x+s0,z0:z-s0,z1:z+s0,y0:y-1,y1:y+s0*0.6,terrain:true}); }
    const im=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),MC(0x5b636b),rk.length); const m4=new THREE.Matrix4(), q=new THREE.Quaternion(), e=new THREE.Euler(), sc=new THREE.Vector3(), ps=new THREE.Vector3();
    rk.forEach(([x,y,z,s0],i)=>{ e.set(fr()*3,fr()*3,fr()*3); q.setFromEuler(e); sc.set(s0*1.3,s0*0.8,s0); ps.set(x,y-s0*0.3,z); m4.compose(ps,q,sc); im.setMatrixAt(i,m4); }); im.frustumCulled=false; scene.add(im); R.ray.push(im); }
  tdProps(T);
  // boundary flags along the playable edge
  { const fm=MB(0xff5a1a); for(let t=-TD.B;t<=TD.B;t+=40) for(const [x,z] of [[t,-TD.B],[t,TD.B],[-TD.B,t],[TD.B,t]]){ const pole=new THREE.Mesh(new THREE.BoxGeometry(0.12,2.2,0.12),fm); pole.position.set(x,tdTerrain(x,z)+1.1,z); scene.add(pole); } }
  // ---- the relay: a fortified weather and radio station on the central pad ----
  const conc=M('concrete'), wood=M('wood'), grey=M('metalGrey'), red=M('metalRed'), L2=1.6, L3=2.1;
  building(0,-10,24,14,5,{mat:conc,doors:{n:[[12,2.2]],s:[[6,2],[18,2]],e:[[7,1.8]]},name:'Relay hall'});
  container('vsafe',-9,-14.4,L3); container('vsafe',9,-14.4,L3); container('safe',0,-14.6,L2); container('desk',-3,-6.4,L2); container('desk',3,-6.4,L2); container('med',-10.6,-5.6,L2); container('locker',10.6,-6,L2); container('locker',10.6,-12.4,L2); heater(0,-11);
  solid(0,20,-30,2,40,2,grey,{ts:4}); for(const [x,z] of [[-7,-24],[7,-24],[-7,-36],[7,-36]]) solid(x,0.6,z,1,1.2,1,conc,{ts:1.2}); // the mast and its anchors
  building(-40,18,20,10,4,{mat:wood,doors:{e:[[5,1.8]],w:[[5,1.8]],n:[[10,1.6]]},name:'Barracks'});
  container('locker',-48.5,14,L2); container('locker',-45,14,L2); container('locker',-41.5,14,L2); container('crate',-33,21.4,L2); container('med',-48.6,21.6,L2); heater(-40,18);
  building(40,16,16,12,4.5,{mat:red,doors:{w:[[6,3]],n:[[4,1.8]]},name:'Garage'});
  container('cargo',44,11.6,L2); container('cargo',36,20.6,L2); container('tool',46.5,20,L2); container('tool',33.5,12,L2); container('drum',47,16); container('drum',33,16.5);
  building(-30,-40,9,8,3,{mat:conc,nowin:true,doors:{e:[[4,1.8]]},name:'Bunker'});
  container('vlocker',-33.6,-42.5,L3); container('vlocker',-33.6,-37.6,L3); container('safe',-27,-43.2,L2); container('crate',-27.5,-37,L2);
  tank(46,-32); tank(54,-26); container('drum',40,-36); container('drum',52,-34); container('drum',58,-30); container('cargo',46,-24,L2);
  for(const [x,z,ax] of [[-20,-55,'x'],[-13,-55,'x'],[20,45,'z'],[24,45,'z'],[60,2,'z'],[-62,-10,'x']]) shipc(x,z,ax,rand()<0.5?grey:M('metalTeal'));
  container('crate',-16.5,-51,L2); container('crate',22,40.5,L2); container('cargo',57,2,L2); container('crate',-62,-6.5,L2);
  // low concrete cover around the hall, and drifts
  for(const [x,z,w,d] of [[-16,-22,4,1],[16,-22,4,1],[-16,2,4,1],[16,2,4,1],[-24,-10,1,4],[24,-10,1,4],[0,14,5,1],[-20,36,4,1],[18,-44,4,1]]) solid(x,0.55,z,w,1.1,d,conc,{ts:1.5});
  for(let i=0;i<18;i++){ const a=rand()*6.28, r=rr(55,74), x=Math.cos(a)*r, z=Math.sin(a)*r; if(R.bld.some(b=>x>b.x0-4&&x<b.x1+4&&z>b.z0-4&&z<b.z1+4)) continue; drift(x,z,rr(1.3,2.6)); }
  // ---- outposts on the way in ----
  building(-235,165,9,7,3.5,{mat:wood,doors:{s:[[4.5,1.6]]},name:"Hunter's cabin"}); container('crate',-238,162.4,L2); container('locker',-231.3,164,L2); container('med',-238.6,167.5,L2); heater(-234,168); drift(-246,160,1.8); drift(-226,174,1.6);
  building(250,-195,10,8,3.5,{mat:grey,doors:{n:[[5,1.8]],e:[[4,1.6]]},name:'Pump station'}); container('tool',246.5,-192,L2); container('cargo',253.5,-198,L2); container('drum',246,-198.5); container('drum',258,-191); tank(262,-204);
  building(-220,-260,5,4,2.8,{mat:wood,doors:{s:[[2.5,1.4]]},name:'Fishing hut'}); container('desk',-221.5,-261.4,L2); container('crate',-218.2,-259,L2);
  // ---- extracts (two of four open) and the eight insertion pads ----
  R.extracts=TD_PADS.filter(p=>p.kind==='ex').map(p=>({name:p.name,x:p.x,z:p.z,r:4})); shuffle(R.extracts); R.extracts.forEach((e,i)=>e.active=i<2);
  for(const p of TD_PADS.filter(p=>p.kind==='ex')){ const post=new THREE.Mesh(new THREE.BoxGeometry(0.3,3.5,0.3),MC(0x8a6a3a)); post.position.set(p.x+3,1.75,p.z+3); scene.add(post); }
  const sps=TD_PADS.filter(p=>p.kind==='spawn').map(p=>({x:p.x,z:p.z,h:p.h}));
  // ---- who holds it ----
  spawnEnemy(0,-12,'relay'); spawnEnemy(-5,-16,'guard'); spawnEnemy(6,-6,'guard'); spawnEnemy(0,-26,'guard');
  for(const [x,z] of [[-40,18],[-32,30],[40,16],[48,4],[-30,-40],[46,-30],[-18,-50],[22,42],[60,-6],[-58,-12]]) spawnEnemy(x,z,'raider');
  for(const [x,z] of [[-60,40],[55,45],[-50,-60],[30,-62],[0,66],[68,20]]) spawnEnemy(x,z,'scav');
  spawnEnemy(-240,172,'scav'); spawnEnemy(-228,158,'scav'); spawnEnemy(255,-188,'raider'); spawnEnemy(243,-202,'scav'); spawnEnemy(258,-200,'scav'); spawnEnemy(-214,-254,'scav');
  return sps;
}
