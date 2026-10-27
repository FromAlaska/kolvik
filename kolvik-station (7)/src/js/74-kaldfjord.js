/* 74-kaldfjord: Kaldfjord Reach, the big one
   2.2 km by 2.2 km (about three times Storvidda): a frozen fjord across the south, a town in the middle with a harbor
   on the ice, a mine in the north, a radar base in the east, a fishing village in the west, an old airstrip, a
   research station across the fjord and outposts out in the hills. You insert on a snowmobile at the edge.
   Built the same way as Storvidda: settlements and the fjord sit on flat pads at height 0 and noise terrain rises
   between them. The AI's walking grid covers the middle 1.2 km where all the settlements are; out past it enemies
   walk straight and the GPS points straight. Trees and rocks are instanced in chunks that bullets and sight lines can
   skip when they're nowhere near. */
const KF={B:1100, nav:620, time:1800};
function kfPads(){ const L=[
  {kind:'zone',name:'Kaldfjord',x:0,z:-10,r:125},{kind:'zone',name:'Harbor',x:40,z:150,r:55},
  {kind:'zone',name:'Mine',x:-120,z:-545,r:92},{kind:'zone',name:'Radar base',x:560,z:-120,r:85},
  {kind:'zone',name:'Fishing village',x:-560,z:85,r:70},{kind:'zone',name:'Research station',x:330,z:640,r:66},
  {kind:'zone',name:'Old airstrip',x:-420,z:-300,r:95}];
  for(let k=0;k<7;k++) L.push({kind:'lake',name:'Kaldfjord ice',x:-780+k*260,z:320+Math.sin(k*1.3)*25,r:150,ice:true});
  for(const [n,x,z] of [["Hunter's lodge",-880,520],['Ranger hut',820,700],['Pump station',100,-830],['Weather mast',-780,-640],['Crash site',760,-640],['Ferry landing',-200,820]]) L.push({kind:'out',name:n,x,z,r:24});
  for(let k=0;k<10;k++){ const a=(k+0.5)*Math.PI/5; L.push({kind:'spawn',x:Math.round(Math.sin(a)*985),z:Math.round(Math.cos(a)*985),r:12,h:a+Math.PI}); }
  for(const [n,x,z] of [['North pass',0,-1045],['Ice road east',1045,300],['Fjord mouth',-1045,330],['Ridge trail',-770,-770],['South ferry',-200,1045],['Rail tunnel',790,-790]]) L.push({kind:'ex',name:n,x,z,r:13});
  return L; }
let KF_PADS=null;
function kfMask(x,z){ let m=1; for(const p of KF_PADS){ const d=Math.hypot(x-p.x,z-p.z)-p.r; if(d<=0) return 0; const f=p.kind==='zone'||p.kind==='lake'?75:40; const v=smooth(0,f,d); if(v<m) m=v; } return m; }
function kfRelief(x,z){
  const wx=x+50*vnoise(x/260+1.7,z/260), wz=z+50*vnoise(x/260,z/260+4.3);
  let h=30*fbm(wx/360,wz/360,4)+14*ridged(wx/170,wz/170,3)*smooth(-0.1,0.45,fbm(x/500+5,z/500,2))+6+1.6*fbm(x/34,z/34,2)+0.25*vnoise(x/7,z/7);
  const dd=Math.max(Math.abs(x),Math.abs(z)); h+=smooth(1060,1400,dd)*120; return h; }
function kfTerrain(x,z){ const m=kfMask(x,z); return m<=0?0:kfRelief(x,z)*m; }
function kfIce(x,z){ let v=0; for(const p of KF_PADS) if(p.ice) v=Math.max(v,1-smooth(p.r-5,p.r+1,Math.hypot(x-p.x,z-p.z))); return v; }
function kfTile(x0,z0,size,cell,mat){
  const n=Math.round(size/cell), W=n+1; const pos=new Float32Array(W*W*3), uv=new Float32Array(W*W*2), col=new Float32Array(W*W*3);
  for(let j=0;j<=n;j++) for(let i=0;i<=n;i++){ const x=x0+i*cell, z=z0+j*cell, k=j*W+i; pos[k*3]=x; pos[k*3+1]=kfTerrain(x,z); pos[k*3+2]=z; uv[k*2]=x/4; uv[k*2+1]=z/4; }
  const idx=[]; for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const a=j*W+i, b=a+1, c=a+W, d=c+1; idx.push(a,c,b,b,c,d); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('uv',new THREE.BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals();
  const nrm=g.attributes.normal.array; const snow=[0.94,0.96,0.98], shade=[0.72,0.80,0.9], rock=[0.4,0.42,0.45], ice=[0.62,0.8,0.92], ice2=[0.52,0.72,0.88];
  for(let k=0;k<W*W;k++){ const x=pos[k*3], z=pos[k*3+2], ny=nrm[k*3+1]; const r=smooth(0.6,0.78,1-ny+0.1*vnoise(x/6,z/6)), sh=smooth(0.08,0.45,1-ny)*0.6, lk=kfIce(x,z), ic=vnoise(x/11,z/11)>0.3?ice2:ice;
    for(let q=0;q<3;q++){ let c=snow[q]+(shade[q]-snow[q])*sh; c=c+(rock[q]-c)*r; c=c+(ic[q]-c)*lk; col[k*3+q]=c; } }
  g.setAttribute('color',new THREE.BufferAttribute(col,3)); const m=new THREE.Mesh(g,mat); scene.add(m); return m;
}
// instanced props in square chunks; a chunk is only tested by a ray that passes near it
function kfChunked(list,chunk,make){
  const groups=new Map(); for(const p of list){ const k=Math.floor(p[0]/chunk)+','+Math.floor(p[2]/chunk); if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(p); }
  const meshes=[]; for(const ps of groups.values()) for(const im of make(ps)){ im.frustumCulled=true; im.geometry.computeBoundingSphere();
    let cx=0,cz=0,cy=0; for(const p of ps){ cx+=p[0]; cy+=p[1]; cz+=p[2]; } cx/=ps.length; cy/=ps.length; cz/=ps.length; let r=0; for(const p of ps) r=Math.max(r,Math.hypot(p[0]-cx,p[2]-cz)); const sph=new THREE.Sphere(new THREE.Vector3(cx,cy+4,cz),r+12);
    im.boundingSphere=sph; const base=THREE.InstancedMesh.prototype.raycast; im.raycast=function(rc,out){ if(!rc.ray.intersectsSphere(sph)) return; base.call(this,rc,out); };
    // three r128 culls instanced meshes by the geometry's sphere: give it the chunk's
    im.geometry=im.geometry.clone(); im.geometry.boundingSphere=sph.clone(); scene.add(im); meshes.push(im); }
  return meshes;
}
function kfHouse(x,z,face,name,mats){ const w=8,d=7; const dr={}; dr[face]=[[(face==='n'||face==='s')?w/2:d/2,1.5]]; building(x,z,w,d,3.2,{mat:mats[Math.floor(rand()*mats.length)],doors:dr,name:name||''});
  const L2=1.3; const t=[['locker','desk'],['desk','med'],['locker','crate'],['desk','locker']][Math.floor(rand()*4)]; container(t[0],x-2.6,z+(face==='n'?2.4:-2.4),L2); container(t[1],x+2.6,z+(face==='n'?2.4:-2.4),L2); heater(x,z+(face==='n'?2.9:-2.9)); }
function buildKaldfjord(){
  KF_PADS=kfPads();
  scene.background=new THREE.Color(0x4a5b6c); scene.fog=new THREE.FogExp2(0x4a5b6c,0.0052);
  scene.add(new THREE.HemisphereLight(0xd3e2f2,0x4a5460,0.8)); const sun=new THREE.DirectionalLight(0xfff0dd,0.7); sun.position.set(-60,70,-50); scene.add(sun);
  camera.far=2800; camera.updateProjectionMatrix(); aurora(); for(const a of R.aur){ a.position.y+=110; }
  R.sleds=true; R.bound=KF.B; R.drain=0.4; R.terrain=kfTerrain; R.iceAt=kfIce; R.terrainBase=()=>-1e9; R.free=(x,z)=>Math.max(Math.abs(x),Math.abs(z))-KF.B; R.navB=KF.nav;
  const T={ramps:[],crev:[],obs:[]}; R.hrT=T;
  const snowMat=new THREE.MeshLambertMaterial({map:TEXS.snow,vertexColors:true});
  for(let z=-KF.B;z<KF.B;z+=100) for(let x=-KF.B;x<KF.B;x+=100) R.ray.push(kfTile(x,z,100,5,snowMat));
  for(let z=-1900;z<1900;z+=300) for(let x=-1900;x<1900;x+=300){ if(x>=-KF.B-100&&x<KF.B&&z>=-KF.B-100&&z<KF.B) continue; kfTile(x,z,300,25,snowMat); }
  hrRange(0,1700);
  const padOk=(x,z,m)=>{ for(const p of KF_PADS){ if(Math.hypot(x-p.x,z-p.z)-p.r<(p.kind==='zone'?m*2:p.kind==='lake'?2:m)) return false; } return true; };
  // forest
  const trees=[]; { const fr=mulberry32(77); for(let k=0;k<70000&&trees.length<9500;k++){ const x=(fr()*2-1)*(KF.B-8), z=(fr()*2-1)*(KF.B-8); const dens=fbm(x/200+4,z/200,3); if(fr()>(dens+0.3)) continue; if(!padOk(x,z,7)) continue;
      const y=kfTerrain(x,z), sl=Math.abs(kfTerrain(x+2,z)-y)+Math.abs(kfTerrain(x,z+2)-y); if(sl>1.6) continue; const s0=0.8+fr()*0.7; trees.push([x,y-0.2,z,s0]); T.obs.push({x,z,r:0.45,y,h:6,name:'a tree'}); R.cols.push({x0:x-0.35,x1:x+0.35,z0:z-0.35,z1:z+0.35,y0:y,y1:y+6,terrain:true}); } }
  { const trunkG=new THREE.CylinderGeometry(0.22,0.3,2.2,6), coneG=new THREE.ConeGeometry(1.5,3.2,7), cone2=new THREE.ConeGeometry(1.1,2.4,7); const m4=new THREE.Matrix4(), q=new THREE.Quaternion(), sc=new THREE.Vector3(), ps=new THREE.Vector3();
    const made=kfChunked(trees,240,pts=>{ const tM=new THREE.InstancedMesh(trunkG,MC(0x4a3424),pts.length), cM=new THREE.InstancedMesh(coneG,MC(0x2a4a34),pts.length), c2M=new THREE.InstancedMesh(cone2,MC(0x36583e),pts.length);
      pts.forEach(([x,y,z,s0],i)=>{ sc.set(s0,s0,s0); ps.set(x,y+1.1*s0,z); m4.compose(ps,q,sc); tM.setMatrixAt(i,m4); ps.set(x,y+3.2*s0,z); m4.compose(ps,q,sc); cM.setMatrixAt(i,m4); ps.set(x,y+4.8*s0,z); m4.compose(ps,q,sc); c2M.setMatrixAt(i,m4); }); tM.userData.trunk=true; return [tM,cM,c2M]; });
    for(const m of made) if(m.userData.trunk) R.ray.push(m); }
  // boulders
  { const fr=mulberry32(19); const rk=[]; for(let k=0;k<12000&&rk.length<1100;k++){ const x=(fr()*2-1)*(KF.B-8), z=(fr()*2-1)*(KF.B-8); if(!padOk(x,z,4)) continue;
      const y=kfTerrain(x,z), sl=Math.abs(kfTerrain(x+2,z)-y)+Math.abs(kfTerrain(x,z+2)-y); if(sl<0.5||sl>2.4) continue; const s0=0.9+fr()*1.6; rk.push([x,y,z,s0,fr()*3,fr()*3,fr()*3]); T.obs.push({x,z,r:s0*1.1,y:y-1,h:s0*1.4,name:'a rock'}); R.cols.push({x0:x-s0,x1:x+s0,z0:z-s0,z1:z+s0,y0:y-1,y1:y+s0*0.6,terrain:true}); }
    const geo=new THREE.DodecahedronGeometry(1,0); const m4=new THREE.Matrix4(), q=new THREE.Quaternion(), e=new THREE.Euler(), sc=new THREE.Vector3(), ps=new THREE.Vector3();
    for(const im of kfChunked(rk,240,pts=>{ const im=new THREE.InstancedMesh(geo,MC(0x5b636b),pts.length); pts.forEach(([x,y,z,s0,a,b,c],i)=>{ e.set(a,b,c); q.setFromEuler(e); sc.set(s0*1.3,s0*0.8,s0); ps.set(x,y-s0*0.3,z); m4.compose(ps,q,sc); im.setMatrixAt(i,m4); }); return [im]; })) R.ray.push(im); }
  // the edge
  { const fm=MB(0xff5a1a); for(let t=-KF.B;t<=KF.B;t+=50) for(const [x,z] of [[t,-KF.B],[t,KF.B],[-KF.B,t],[KF.B,t]]){ const pole=new THREE.Mesh(new THREE.BoxGeometry(0.12,2.2,0.12),fm); pole.position.set(x,kfTerrain(x,z)+1.1,z); scene.add(pole); } }
  const conc=M('concrete'), wood=M('wood'), grey=M('metalGrey'), red=M('metalRed'), teal=M('metalTeal'), ochre=M('metalOchre'), white=M('metalWhite'), L2=1.5, L3=2;
  const homes=[wood,wood,red,teal,grey];
  // ---- the town ----
  building(0,-50,22,14,5,{mat:conc,doors:{s:[[11,2.2]],n:[[11,1.6]]},name:'Town hall'}); container('desk',-6,-54,L2); container('desk',6,-54,L2); container('safe',9.5,-55.6,L2); container('locker',-9.6,-46,L2); heater(0,-52);
  building(-62,-55,12,20,7,{mat:wood,doors:{s:[[6,2.2]]},name:'Church'}); container('desk',-62,-62,L2); container('locker',-66.5,-49,L2); container('safe',-57.6,-62.5,L2);
  building(52,-48,16,12,4,{mat:red,doors:{s:[[8,2.2]],e:[[6,1.6]]},name:'General store'}); container('locker',46,-52,L2); container('crate',58,-52,L2); container('desk',52,-44.5,L2); container('med',45,-44.6,L2); heater(52,-50);
  building(-56,40,18,14,6,{mat:teal,doors:{n:[[9,2]],e:[[7,1.6]]},name:'Hotel'}); container('locker',-63,44.5,L2); container('locker',-49,44.5,L2); container('desk',-56,36,L2); container('med',-63,36,L2); heater(-56,40);
  building(56,40,16,12,4,{mat:white,doors:{n:[[8,2]]},name:'Police station'}); container('vlocker',50,44.4,L2); container('vlocker',62,44.4,L2); container('desk',56,37,L2); container('safe',62.6,36,L2); heater(56,42);
  building(98,-6,12,8,4,{mat:ochre,doors:{w:[[4,2.4]]},name:'Fuel station'}); container('tool',101,-8.5,L2); container('drum',104,-3,L2); tank(112,-14); tank(112,4);
  building(-98,0,14,10,4,{mat:white,doors:{e:[[5,1.8]]},name:'Clinic'}); container('med',-103,-3.5,L2); container('med',-103,3.5,L2); container('desk',-95,-3.4,L2); heater(-100,0);
  for(const [x,z,f] of [[-26,-88,'s'],[26,-88,'s'],[-30,88,'n'],[30,88,'n'],[-92,-62,'e'],[96,62,'w'],[-100,62,'e'],[88,-78,'w'],[-26,-118,'s'],[28,-118,'s']]) kfHouse(x,z,f,'House',homes);
  for(const [x,z,w,d] of [[-14,-14,4,1],[14,-14,4,1],[-14,14,4,1],[14,14,4,1],[0,-24,5,1],[0,24,5,1],[-34,0,1,4],[34,0,1,4]]) solid(x,0.55,z,w,1.1,d,conc,{ts:1.5});
  for(const [x,z,ax] of [[-30,-20,'x'],[38,18,'z'],[70,-20,'x'],[-80,25,'z']]) shipc(x,z,ax,rand()<0.5?grey:teal);
  // ---- the harbor, on the ice ----
  building(20,165,26,14,6,{mat:teal,doors:{n:[[13,4]],e:[[7,1.8]]},name:'Harbor warehouse'}); container('cargo',12,170,L2); container('cargo',28,170,L2); container('crate',12,160.6,L2); container('crate',28,160.6,L2); container('tool',33,167,L2);
  building(66,158,10,8,3.6,{mat:wood,doors:{w:[[4,1.8]]},name:'Harbormaster office'}); container('desk',69,156,L3); container('safe',69.5,161,L3); container('locker',63,161.5,L2); heater(66,158);
  for(const [x,z,ax] of [[50,185,'x'],[58,192,'z'],[-6,190,'x'],[-14,182,'z']]) shipc(x,z,ax,rand()<0.5?red:grey);
  solid(30,0.4,205,40,0.8,6,wood,{ts:2}); // the pier out onto the ice
  // ---- the mine ----
  building(-120,-570,40,24,8,{mat:grey,doors:{s:[[12,5],[30,2]],e:[[10,2]]},name:'Processing plant'}); container('cargo',-132,-576,L2); container('cargo',-108,-576,L2); container('tool',-138,-562,L2); container('tool',-102,-562,L2); container('crate',-120,-578,L2); container('drum',-136,-578);
  building(-58,-525,14,10,3.6,{mat:wood,doors:{w:[[5,1.8]]},name:'Mine office'}); container('desk',-55,-528.6,L3); container('safe',-52,-521.5,L3); container('locker',-62,-528.6,L2); heater(-58,-523);
  solid(-178,11,-525,6,22,6,grey,{ts:4}); solid(-178,23,-525,8,1,8,M('metalRed'),{ts:2}); // headframe
  building(-160,-478,16,10,5,{mat:ochre,doors:{s:[[8,3]]},name:'Crusher shed'}); container('tool',-165,-481,L2); container('crate',-155,-481,L2);
  building(-80,-612,24,10,3.6,{mat:wood,doors:{n:[[6,1.6],[18,1.6]]},name:'Workers barracks'}); container('locker',-90,-615,L2); container('locker',-84,-615,L2); container('locker',-76,-615,L2); container('med',-70,-615,L2); heater(-80,-612);
  for(const [x,z,ax] of [[-96,-500,'x'],[-140,-505,'z'],[-60,-560,'z']]) shipc(x,z,ax,grey);
  // ---- the radar base ----
  building(560,-140,18,12,4.5,{mat:conc,doors:{n:[[9,2]],w:[[6,1.8]]},name:'Radar ops'}); container('desk',555,-143,L3); container('desk',565,-143,L3); container('vsafe',567,-136,L3); container('vlocker',552,-136,L3); heater(560,-142);
  solid(605,5,-95,6,10,6,conc,{ts:3}); { const dome=new THREE.Mesh(new THREE.SphereGeometry(4.2,12,8),MC(0xe6ecef)); dome.position.set(605,13,-95); scene.add(dome); R.ray.push(dome); }
  building(515,-78,22,10,4,{mat:wood,doors:{s:[[6,1.6],[16,1.6]]},name:'Base barracks'}); container('locker',506,-81,L2); container('locker',512,-81,L2); container('locker',518,-81,L2); container('med',525,-81,L2); heater(515,-78);
  building(518,-168,10,8,3,{mat:conc,nowin:true,doors:{e:[[4,1.8]]},name:'Base bunker'}); container('vlocker',514.5,-170.5,L3); container('rack',514.5,-165,L3); container('safe',521,-171,L2);
  building(605,-168,20,14,6,{mat:grey,doors:{w:[[7,6]]},name:'Motor pool'}); container('cargo',611,-172,L2); container('tool',611,-162,L2); container('drum',600,-174);
  for(const [x,z,w,d] of [[540,-110,4,1],[580,-110,4,1],[545,-190,1,4],[585,-60,4,1],[500,-130,1,4],[620,-130,1,4]]) solid(x,0.55,z,w,1.1,d,conc,{ts:1.5});
  // ---- the fishing village ----
  building(-560,58,12,8,4,{mat:wood,doors:{n:[[6,1.8]]},name:'Smokehouse'}); container('crate',-564,61,L2); container('locker',-556,61,L2);
  building(-602,98,10,8,3.5,{mat:red,doors:{e:[[4,1.8]]},name:'Net shed'}); container('tool',-605,95,L2); container('crate',-605,101,L2);
  building(-520,128,12,10,4,{mat:grey,doors:{s:[[6,4]]},name:'Boathouse'}); container('cargo',-524,124,L2); container('tool',-516,124,L2);
  for(const [x,z,f] of [[-590,40,'s'],[-530,40,'s'],[-610,140,'e'],[-500,90,'w']]) kfHouse(x,z,f,'Cottage',homes);
  // ---- the old airstrip ----
  { const rw=new THREE.Mesh(new THREE.PlaneGeometry(170,18),MC(0x6a7276)); rw.rotation.x=-Math.PI/2; rw.position.set(-420,0.03,-262); scene.add(rw); (R.decor=R.decor||[]).push([-505,-271,170,18]); }
  building(-420,-330,30,20,8,{mat:grey,doors:{n:[[15,12]]},name:'Hangar'}); container('cargo',-430,-336,L2); container('cargo',-410,-336,L2); container('crate',-428,-324,L2); container('tool',-412,-324,L2);
  building(-478,-300,8,8,6,{mat:conc,doors:{e:[[4,1.6]]},name:'Air tower'}); container('desk',-480,-302,L3); container('safe',-480,-297,L2);
  building(-365,-300,10,8,3.5,{mat:ochre,doors:{w:[[4,1.8]]},name:'Fuel shed'}); container('drum',-362,-302); container('tool',-362,-297,L2);
  // ---- the research station across the fjord ----
  building(330,628,22,14,4.5,{mat:white,doors:{n:[[11,2]],e:[[7,1.8]]},name:'Research lab'}); container('safe',322,632,L3); container('safe',338,632,L3); container('desk',326,624,L2); container('desk',334,624,L2); container('med',340,624,L2); heater(330,628);
  building(292,662,12,12,4,{mat:conc,doors:{n:[[6,1.8]]},name:'Observatory'}); container('desk',292,666,L2); { const dome=new THREE.Mesh(new THREE.SphereGeometry(6,12,6,0,Math.PI*2,0,Math.PI/2),MC(0xd7dde0)); dome.position.set(292,4,662); scene.add(dome); }
  building(372,664,8,7,3,{mat:grey,doors:{w:[[3.5,1.6]]},name:'Generator hut'}); container('tool',374,666,L2); container('drum',375,661);
  // ---- outposts ----
  const huts=[["Hunter's lodge",-880,520,wood],['Ranger hut',820,700,red],['Pump station',100,-830,grey],['Weather mast',-780,-640,white],['Crash site',760,-640,grey],['Ferry landing',-200,820,wood]];
  for(const [n,x,z,mt] of huts){ building(x,z,9,7,3.5,{mat:mt,doors:{s:[[4.5,1.6]]},name:n}); container(['crate','locker','tool','desk'][Math.floor(rand()*4)],x-2.6,z-2,L2); container(['med','crate','locker'][Math.floor(rand()*3)],x+2.6,z-2,L2); heater(x,z+0.5); }
  solid(-772,9,-640,1.2,18,1.2,grey,{ts:4}); // the weather mast
  { const fus=solid(752,1.4,-626,4,2.8,16,M('metalWhite'),{ts:3}); fus.rotation.y=0.6; solid(764,0.5,-616,14,0.6,3,M('metalWhite'),{ts:3}); container('desk',748,-620,L3); container('cargo',756,-630,L2); }
  // ---- extracts (three of six open) and the insertion pads ----
  R.extracts=KF_PADS.filter(p=>p.kind==='ex').map(p=>({name:p.name,x:p.x,z:p.z,r:4})); shuffle(R.extracts); R.extracts.forEach((e,i)=>e.active=i<3);
  for(const p of KF_PADS.filter(p=>p.kind==='ex')){ const post=new THREE.Mesh(new THREE.BoxGeometry(0.3,3.5,0.3),MC(0x8a6a3a)); post.position.set(p.x+3,1.75,p.z+3); scene.add(post); }
  R.labels=KF_PADS.filter(p=>p.kind==='zone'||p.kind==='out').map(p=>[p.name,p.x,p.z-p.r-6]); R.labels.push(['Kaldfjord ice',0,300]);
  const sps=KF_PADS.filter(p=>p.kind==='spawn').map(p=>({x:p.x,z:p.z,h:p.h}));
  // ---- who's here ----
  const S_=(list,kind)=>{ for(const [x,z] of list) spawnEnemy(x,z,kind); };
  S_([[-10,-30],[20,-60],[-40,-20],[30,20],[-20,60],[10,95],[-70,-10],[75,10],[-95,-40],[90,-50],[-30,110],[40,-100],[-60,90],[65,85]],'scav'); S_([[0,-48],[52,42],[-56,42],[95,-4]],'raider');
  spawnEnemy(66,158,'harbor'); S_([[20,155],[40,175],[0,175],[60,180]],'raider');
  S_([[-120,-560],[-110,-540],[-150,-520],[-90,-590],[-60,-525],[-170,-490],[-130,-600],[-100,-500]],'mguard'); S_([[-140,-575],[-85,-612],[-58,-540]],'raider');
  S_([[560,-142],[520,-80],[518,-165],[605,-160],[580,-100]],'guard'); S_([[540,-120],[590,-130],[510,-110],[560,-180],[620,-90],[530,-60]],'raider');
  S_([[-560,60],[-600,100],[-520,128],[-585,40],[-530,45],[-505,95]],'scav');
  S_([[330,628],[300,660],[372,664],[350,600]],'raider'); S_([[310,610],[360,650]],'scav');
  S_([[-420,-330],[-478,-300],[-365,-300],[-400,-270]],'raider');
  for(const [,x,z] of huts){ spawnEnemy(x+4,z+5,'scav'); if(rand()<0.5) spawnEnemy(x-5,z+6,rand()<0.4?'raider':'scav'); }
  return sps;
}
