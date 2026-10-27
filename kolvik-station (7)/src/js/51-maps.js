/* 51-maps: Kolvik, Whiteout, Vault, Skarsvik, Ironfjord, Ravnskar builders */
/* ---- maps ---- */
function buildKolvik(){
  scene.background=new THREE.Color(0x2a3947); scene.fog=new THREE.FogExp2(0x2a3947,0.021);
  scene.add(new THREE.HemisphereLight(0xa9c2d8,0x46525c,0.95)); const sun=new THREE.DirectionalLight(0xffd2a8,0.35); sun.position.set(-60,25,40); scene.add(sun);
  ground(440); perimeter(100); aurora(); R.drain=0.32;
  floorPlane(88,0,24,70,0.01,'ice',1,4);
  const W=M('metalWhite'), wood=M('wood');
  building(0,0,20,14,4,{mat:W,doors:{s:[[10,1.8]],e:[[4,1.6]],n:[[15,1.6]]},name:'Comms'});
  wallLine(-2,-7,-2,7,4,W,[[7,1.6]]);
  heater(-8,5.5); container('desk',5,-4.9); container('desk',8,-4.9); container('locker',-9,-5.6); container('tool',-5,5.6); container('crate',6,5.2);
  solid(14,9,-10,0.6,18,0.6,M('metalRed')); const dome=new THREE.Mesh(new THREE.SphereGeometry(1.6,8,6),M('metalWhite')); dome.position.set(14,18.8,-10); scene.add(dome);
  building(-55,-50,30,10,3.5,{mat:wood,doors:{s:[[7,1.6],[23,1.6]],e:[[5,1.6]]},name:'Barracks'});
  wallLine(-60,-55,-60,-45,3.5,wood,[[5,1.4]]); wallLine(-50,-55,-50,-45,3.5,wood,[[5,1.4]]);
  container('locker',-68,-54.4); container('locker',-65.5,-54.4); container('locker',-56,-54.4); container('locker',-43,-54.4); container('med',-41.4,-47); container('desk',-55,-47.2); heater(-58,-46.5);
  solid(-67,0.35,-47.6,2.2,0.7,0.9,MC(0x4b5a4a)); solid(-44,0.35,-47.6,2.2,0.7,0.9,MC(0x4b5a4a)); solid(-53,0.35,-53.8,2.2,0.7,0.9,MC(0x4b5a4a));
  building(55,-50,20,18,4.2,{mat:W,doors:{w:[[13,1.8]],s:[[5,1.6]]},name:'Lab'});
  wallLine(45,-50,65,-50,4.2,W,[[14,1.6]]);
  container('safe',63,-58.2); container('safe',47,-58.2); container('med',52,-58.4); container('desk',58,-42.2); container('desk',62,-42.2); container('med',46.2,-48.2); heater(56,-58.3);
  building(-55,45,26,16,5,{mat:M('metalOchre'),doors:{n:[[8,6]],e:[[8,1.8]]},name:'Garage'});
  solid(-58,1,47,3,2,5,M('metalRed')); solid(-58,2.45,45.5,2.6,0.9,2,M('metalRed'));
  container('tool',-66.5,52); container('tool',-45,52); container('crate',-66.5,39.2); container('crate',-62,52); container('drum',-45,39); heater(-50,52.4);
  building(-78,0,14,22,4.5,{mat:M('metalTeal'),doors:{e:[[11,4]],n:[[7,1.6]]},name:'Warehouse'});
  solid(-81,1.2,-5,5,2.4,1,MC(0x5a4f3d)); solid(-81,1.2,5,5,2.4,1,MC(0x5a4f3d));
  container('crate',-83.5,-9.8); container('crate',-74.5,-9.8); container('crate',-83.5,9.8); container('tool',-74,9.9);
  tank(45,35); tank(55,35); tank(65,35);
  building(50,55,7,6,3,{mat:M('metalGrey'),doors:{n:[[3.5,1.6]]},name:'Pump hut'}); container('tool',48,57.3); container('crate',52,57.2); container('drum',40,42); container('drum',70,42);
  building(84,-8,9,10,3.5,{mat:wood,doors:{w:[[5,1.8]],s:[[4.5,2.5]]},name:'Boathouse'}); container('crate',86.5,-12.2); container('tool',81.5,-12.4);
  building(-20,72,7,6,3,{mat:wood,doors:{n:[[3.5,1.5]]}}); container('locker',-22.6,74.3); container('med',-17.6,74.4); heater(-20,74.4);
  building(25,-78,7,6,3,{mat:M('metalRed'),doors:{s:[[3.5,1.5]]}}); container('desk',23,-80.2); container('crate',27,-80.2);
  building(-82,75,8,7,3,{mat:M('metalGrey'),doors:{e:[[3.5,1.5]]}}); container('tool',-84.6,72.6); container('locker',-84.8,77.7);
  shipc(20,28,'x',M('metalRed')); shipc(-22,-26,'z',M('metalTeal')); shipc(30,-28,'x',M('metalOchre')); shipc(-25,22,'z',M('metalGrey')); shipc(8,52,'x',M('metalTeal')); shipc(-8,-60,'x',M('metalRed')); shipc(70,12,'z',M('metalOchre')); shipc(-40,-15,'x',M('metalGrey'));
  container('crate',20,30.4); container('crate',-19.5,-26); container('drum',33.5,-26.5); container('tool',8,54.4);
  for(let i=0;i<40;i++){ const x=rr(-95,95), z=rr(-95,95); if(R.bld.some(b=>x>b.x0-4&&x<b.x1+4&&z>b.z0-4&&z<b.z1+4)) continue; drift(x,z,rr(1.5,4)); }
  for(let i=0;i<10;i++){ const x=rr(-90,70), z=rr(-90,90); if(R.bld.some(b=>x>b.x0-4&&x<b.x1+4&&z>b.z0-4&&z<b.z1+4)) continue; rock(x,z,rr(0.8,1.8)); }
  const hp=new THREE.Mesh(new THREE.CylinderGeometry(5,5,0.1,16),MC(0x2b3136)); hp.position.set(-85,0.05,-85); scene.add(hp);
  R.extracts=KV_EX.map(([name,x,z])=>({name,x,z,r:4})); shuffle(R.extracts); R.extracts.forEach((e,i)=>e.active=i<2);
  const sps=[{x:-88,z:40},{x:20,z:88},{x:88,z:85},{x:-40,z:-88}];
  const scavs=[[3,3],[-6,-3],[-65,-48],[-45,-48],[-52,41],[-76,0],[55,48],[20,36],[-25,-15],[82,-6],[-20,66],[25,-70],[-60,20],[40,0]];
  for(const [x,z] of scavs) if(sps.every(s=>Math.hypot(x-s.x,z-s.z)>26)) spawnEnemy(x,z,'scav');
  spawnEnemy(55,-55,'chief'); spawnEnemy(52,-46,'guard'); spawnEnemy(60,-46,'guard');
  return sps;
}

const IF_POI=[['Warehouse',0,-50,34,16],['Signal box',0,0,8,8],['Bunkhouse',-55,-12,12,22],['Mess hall',-55,25,16,12],['Pump house',20,52,8,7],['Boathouse',62,-20,10,10],['Hut',-68,58,7,6],['Hut',45,-66,7,6]];
const IF_EX=[['Rail tunnel',-18,-75],['Fjord pier',73,30],['Road checkpoint',30,75],['Ridge path',-75,-35]];
function buildIronfjord(){
  scene.background=new THREE.Color(0x283746); scene.fog=new THREE.FogExp2(0x283746,0.02);
  scene.add(new THREE.HemisphereLight(0xa9c2d8,0x46525c,0.95)); const sun=new THREE.DirectionalLight(0xffd2a8,0.35); sun.position.set(50,25,-40); scene.add(sun);
  ground(360); perimeter(80); aurora(); R.drain=0.3; R.decor=[];
  const L=1.3; // no bots, so containers are a bit richer
  const W=M('metalWhite'), wood=M('wood'), teal=M('metalTeal'), red=M('metalRed'), ochre=M('metalOchre'), grey=M('metalGrey');
  // the fjord: ice along the east edge
  floorPlane(68,0,22,160,0.01,'ice',1,4); R.decor.push([57,-80,22,160]);
  // two rail lines north to south
  for(const x of [-20,-14]){ floorPlane(x,0,3,158,0.012,'road',2,3); R.decor.push([x-1.5,-79,3,158]); for(let z=-76;z<=76;z+=3) solid(x,0.06,z,3.2,0.12,0.35,MC(0x4a3a2a),{col:false,los:false}); }
  // warehouse
  building(0,-50,34,16,5.5,{mat:teal,doors:{n:[[17,4]],s:[[8,2],[26,2]],e:[[8,1.8]],w:[[8,1.8]]},name:'Warehouse'});
  solid(-6,1.2,-50,8,2.4,1,MC(0x5a4f3d)); solid(6,1.2,-50,8,2.4,1,MC(0x5a4f3d));
  container('crate',-13,-56.8,L); container('crate',-9,-56.8,L); container('cargo',9,-56.6,L); container('cargo',13,-56.6,L); container('tool',-15.8,-44.2,L); container('vlocker',16.2,-44.5,L); container('crate',-3,-51.2,L); container('drum',3,-48.6); heater(0,-42.6);
  // signal box in the middle of the yard
  building(0,0,8,8,6,{mat:red,doors:{s:[[4,1.6]],n:[[4,1.6]]},name:'Signal box'});
  container('safe',2.9,-3.3,L); container('desk',-2.2,-3.2,L); container('vlocker',-3.3,2.6,L); container('med',3.3,2.9,L);
  // workers' side
  building(-55,-12,12,22,3.5,{mat:wood,doors:{e:[[6,1.6],[16,1.6]]},name:'Bunkhouse'});
  wallLine(-61,-12,-53,-12,3.5,wood,[[4,1.4]]);
  container('locker',-60.3,-21,L); container('locker',-60.3,-17,L); container('locker',-60.3,-5,L); container('med',-51,-22.4,L); container('desk',-56,-1.6,L); heater(-58,-22.6);
  building(-55,25,16,12,3.5,{mat:wood,doors:{e:[[6,1.8]],n:[[8,1.6]]},name:'Mess hall'});
  container('desk',-58,19.8,L); container('desk',-52,19.8,L); container('locker',-62.3,23.5,L); container('med',-62.4,29.2,L); container('tool',-49,30.5,L); heater(-55,30.6);
  // fuel farm
  tank(-22,58); tank(-10,58); tank(2,58);
  building(20,52,8,7,3,{mat:grey,doors:{n:[[4,1.6]]},name:'Pump house'}); container('tool',18,54.6,L); container('crate',22,54.6,L);
  container('drum',28,46); container('drum',-30,50); container('drum',10,46); container('drum',-4,49);
  // the waterfront
  building(62,-20,10,10,3.5,{mat:wood,doors:{w:[[5,1.8]],s:[[5,2.5]]},name:'Boathouse'}); container('crate',64.5,-24.2,L); container('tool',59.5,-24.3,L); container('cargo',65,-17,L);
  solid(60,7,14,0.8,14,0.8,ochre); solid(64,13.6,14,9,0.6,0.8,ochre,{col:false}); solid(68,9,14,0.12,9,0.12,MC(0x222222),{col:false,los:false});
  container('cargo',66,6,L); container('cargo',70,22,L); container('crate',62,30,L);
  // outlying huts
  building(-68,58,7,6,3,{mat:grey,doors:{e:[[3,1.5]]}}); container('locker',-70.8,56,L); container('crate',-68,60.2,L);
  building(45,-66,7,6,3,{mat:red,doors:{s:[[3.5,1.5]]}}); container('desk',43,-68.2,L); container('crate',47,-68.2,L);
  // a parked train on the west track, boxcars with gaps to cross through
  const cars=[[-20,-30,red],[-20,-23.6,teal],[-20,-10,ochre],[-20,-3.6,grey],[-20,12,red],[-20,18.4,teal],[-14,30,grey],[-14,36.4,ochre],[-20,-64,teal]];
  for(const [x,z,m] of cars) shipc(x,z,'z',m);
  container('cargo',-17,-26.8,L); container('crate',-17,-6.8,L); container('cargo',-17,15.2,L); container('crate',-11,33.2,L);
  // the container yard: lanes and a few double stacks
  const yard=[[24,-24,'x',ochre,1],[31,-24,'x',red,0],[24,-14,'x',grey,0],[40,-14,'z',teal,1],[26,0,'z',red,0],[36,4,'x',ochre,1],[24,14,'x',teal,0],[31,14,'x',grey,1],[44,24,'z',red,0],[24,30,'x',ochre,0],[-34,-40,'x',grey,0],[-34,44,'z',teal,1],[-36,0,'x',ochre,0],[10,24,'z',grey,0],[-6,-24,'x',teal,0]];
  for(const [x,z,ax,m,st] of yard){ shipc(x,z,ax,m); if(st){ if(ax==='x') solid(x,3.9,z,6.1,2.6,2.45,m,{ts:2.6,col:false}); else solid(x,3.9,z,2.45,2.6,6.1,m,{ts:2.6,col:false}); } }
  container('crate',28,-19,L); container('tool',33,9,L); container('crate',27.6,19,L); container('cargo',38,-8,L); container('crate',-36,3,L); container('tool',-29.5,-40,L);
  for(let i=0;i<34;i++){ const x=rr(-75,55), z=rr(-75,75); if(R.bld.some(b=>x>b.x0-4&&x<b.x1+4&&z>b.z0-4&&z<b.z1+4)||Math.abs(x+17)<6||Math.abs(x-30)<16&&Math.abs(z)<30) continue; drift(x,z,rr(1.5,3.5)); }
  for(let i=0;i<14;i++){ const x=rr(-75,50), z=rr(-75,75); if(R.bld.some(b=>x>b.x0-4&&x<b.x1+4&&z>b.z0-4&&z<b.z1+4)||Math.abs(x+17)<6) continue; rock(x,z,rr(0.8,1.8)); }
  R.extracts=IF_EX.map(([name,x,z])=>({name,x,z,r:4})); shuffle(R.extracts); R.extracts.forEach((e,i)=>e.active=i<2);
  const sps=[{x:-70,z:-70},{x:10,z:-74},{x:70,z:-72},{x:73,z:-2},{x:66,z:72},{x:0,z:73},{x:-72,z:72},{x:-73,z:0}];
  return shuffle(sps);
}
function buildWhiteout(){
  const rng=mulberry32((rand()*1e9)|0);
  scene.background=new THREE.Color(0xc4cfd5); scene.fog=new THREE.FogExp2(0xc4cfd5,0.042);
  scene.add(new THREE.HemisphereLight(0xe8f0f5,0x8a959c,1.05)); const sun=new THREE.DirectionalLight(0xffffff,0.25); sun.position.set(30,50,20); scene.add(sun);
  ground(440); perimeter(95); R.drain=0.45; R.lootMult=1.25;
  const mats=['metalRed','metalTeal','metalOchre','metalGrey','wood','concrete','metalWhite'];
  const placed=[];
  for(let tries=0; tries<120 && placed.length<14; tries++){
    const w=Math.round(8+rng()*14), d=Math.round(6+rng()*12), cx=Math.round(-78+rng()*156), cz=Math.round(-78+rng()*156);
    if(placed.some(b=>cx-w/2-7<b.x1&&cx+w/2+7>b.x0&&cz-d/2-7<b.z1&&cz+d/2+7>b.z0)) continue;
    const sides=['n','s','e','w']; const doors={}; const nd=1+(rng()<0.5?1:0);
    for(let i=0;i<nd;i++){ const s=sides.splice(Math.floor(rng()*sides.length),1)[0]; const L=(s==='n'||s==='s')?w:d; doors[s]=[[1.5+rng()*(L-3),1.7]]; }
    const b=building(cx,cz,w,d,3+rng()*1.5,{mat:M(mats[Math.floor(rng()*mats.length)]),doors});
    placed.push(b);
    if(w>=14){ wallLine(cx,cz-d/2,cx,cz+d/2,3,M('concrete'),[[d/2,1.6]]); }
    const n=2+(w*d>140?2:0)+(rng()<0.4?1:0);
    for(let i=0;i<n;i++){ for(let k=0;k<12;k++){ const along=rng()<0.5; const x= along? cx-w/2+1.2+rng()*(w-2.4) : (rng()<0.5?cx-w/2+0.8:cx+w/2-0.8); const z= along? (rng()<0.5?cz-d/2+0.8:cz+d/2-0.8) : cz-d/2+1.2+rng()*(d-2.4);
      if(b.doorPts.some(([a,c])=>Math.hypot(a-x,c-z)<2.4)) continue; if(R.conts.some(c=>Math.hypot(c.x-x,c.z-z)<1.6)) continue; if(w>=14&&Math.abs(x-cx)<1.2) continue;
      const type=wpick([['crate',3],['tool',3],['locker',2],['med',2],['desk',2],['safe',w*d>140?0.9:0.15]],rng); container(type,x,z,R.lootMult); break; } }
    if(rng()<0.5) heater(cx+(rng()-0.5)*(w-3), cz+(rng()<0.5?-1:1)*(d/2-0.5));
  }
  const smats=[M('metalRed'),M('metalTeal'),M('metalOchre'),M('metalGrey')];
  const clear=(x,z,m)=>!placed.some(b=>x>b.x0-m&&x<b.x1+m&&z>b.z0-m&&z<b.z1+m);
  for(let i=0;i<14;i++){ const x=rr(-85,85), z=rr(-85,85); if(!clear(x,z,6)) continue; shipc(x,z,rand()<0.5?'x':'z',smats[i%4]); if(rand()<0.5) container('crate',x+(rand()<0.5?2:-2),z+3.2); }
  for(let i=0;i<24;i++){ const x=rr(-90,90), z=rr(-90,90); if(!clear(x,z,4)) continue; rock(x,z,rr(0.8,2.2)); }
  for(let i=0;i<40;i++){ const x=rr(-90,90), z=rr(-90,90); if(!clear(x,z,4)) continue; drift(x,z,rr(1.5,4.5)); }
  const names=['Radio mast','Snowmobile cache','Weather balloon','Old pier']; shuffle(names);
  const edges=[[rr(-70,70),-88],[rr(-70,70),88],[88,rr(-70,70)],[-88,rr(-70,70)]];
  R.extracts=edges.map(([x,z],i)=>({name:names[i],x,z,r:4})); shuffle(R.extracts); R.extracts.forEach((e,i)=>e.active=i<2);
  const sps=[]; const a0=rand()*Math.PI*2;
  for(let i=0;i<4;i++){ let sp={x:0,z:0}; for(let k=0;k<30;k++){ const a=a0+i*Math.PI/2+rr(-0.3,0.3); sp={x:Math.cos(a)*84,z:Math.sin(a)*84}; if(clear(sp.x,sp.z,2)) break; } sps.push(sp); }
  const farFromSpawns=(x,z,m)=>sps.every(s=>Math.hypot(x-s.x,z-s.z)>m);
  for(const b of placed){ if(rand()<0.6){ const x=(b.x0+b.x1)/2+rr(-1,1), z=(b.z0+b.z1)/2+rr(-1,1); if(farFromSpawns(x,z,30)) spawnEnemy(x,z,rand()<0.55?'raider':'scav'); } }
  for(let i=0;i<5;i++){ const x=rr(-70,70), z=rr(-70,70); if(farFromSpawns(x,z,36)&&clear(x,z,2)) spawnEnemy(x,z,'raider'); }
  return sps;
}
function buildVault(){
  scene.background=new THREE.Color(0x05070a); scene.fog=new THREE.FogExp2(0x05070a,0.055);
  scene.add(new THREE.HemisphereLight(0x5a6a7a,0x14161a,0.5));
  R.drain=0; R.lootMult=2; R.bound=22.5;
  floorPlane(0,0,52,52,0.01,'concrete',1,3);
  const rk=M('rock'); solid(0,3,-24,52,6,4,rk,{ts:4}); solid(0,3,24,52,6,4,rk,{ts:4}); solid(-24,3,0,4,6,52,rk,{ts:4}); solid(24,3,0,4,6,52,rk,{ts:4});
  const RM=14, C=[-RM,0,RM];
  const hd=[0,1,2].map(r=>[0,1].map(c=>r===1||rand()<0.7)); const vd=[0,1].map(r=>[0,1,2].map(c=>c===1||rand()<0.7));
  const lamp=MB(0xffe2a8); const corners=[[0,0],[0,2],[2,0],[2,2]]; shuffle(corners);
  const exC=corners[0], spC=corners.slice(1);
  for(let r=0;r<3;r++) for(let c=0;c<3;c++){
    const cx=C[c], cz=C[r], doors={};
    if(c<2&&hd[r][c]) doors.e=[[RM/2,1.8]]; if(c>0&&hd[r][c-1]) doors.w=[[RM/2,1.8]]; if(r<2&&vd[r][c]) doors.s=[[RM/2,1.8]]; if(r>0&&vd[r-1][c]) doors.n=[[RM/2,1.8]];
    const mid=r===1&&c===1;
    building(cx,cz,RM,RM,3.2,{mat:M(mid?'metalGrey':'concrete'),doors,name:mid?'The vault':`Room ${r*3+c+1}`,nowin:true});
    const pl=new THREE.PointLight(mid?0xffc070:0xd8e4ff,mid?1.1:0.75,17); pl.position.set(cx,2.7,cz); scene.add(pl);
    const lm=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.1,0.3),lamp); lm.position.set(cx,3.0,cz); scene.add(lm);
    const isEx=r===exC[0]&&c===exC[1], isSp=spC.some(([a,b])=>a===r&&b===c);
    if(mid){ container('vsafe',cx-4.5,cz-5.5); container('vsafe',cx+4.5,cz-5.5); container('vsafe',cx-4.5,cz+5.5); container('vsafe',cx+4.5,cz+5.5); container('desk',cx,cz-5.6); solid(cx,0.5,cz,1.6,1,1.6,M('safe'),{ts:1}); container('vsafe',cx,cz+1.6); spawnEnemy(cx,cz-2,'warden'); }
    else {
      const n=isSp?1:isEx?2:3; const spots=[[cx-5.6,cz-5.6],[cx+5.6,cz-5.6],[cx-5.6,cz+5.6],[cx+5.6,cz+5.6]]; shuffle(spots);
      for(let i=0;i<n;i++){ const [x,z]=spots[i]; container(wpick([['vlocker',2],['safe',1.5],['crate',1.5],['med',1],['desk',1],['tool',1]]),x,z,R.lootMult); }
      if(rand()<0.5) solid(cx+rr(-3,3),1.6,cz+rr(-3,3),1,3.2,1,M('concrete'),{ts:1.6});
      if(!isSp) spawnEnemy(cx+rr(-2,2),cz+rr(-2,2),'vguard');
    }
    if(isEx) R.extracts=[{name:'Service lift',x:cx,z:cz,r:3,active:true}];
  }
  return spC.map(([r,c])=>({x:C[c],z:C[r]}));
}
/* ---------- Skarsvik Island ---------- */
const SK_LZ=[{x:-252,z:-168,name:'West cliffs'},{x:228,z:-242,name:'North cape'},{x:252,z:212,name:'East shore'},{x:-62,z:250,name:'South bay'}];
const SK_EVAC=[{x:0,z:-92,name:'Radar plateau'},{x:205,z:-150,name:'Runway north'},{x:-176,z:-10,name:'Town square'},{x:60,z:110,name:'Crash field'}];
const SK_EX=[['Harbor ferry',-215,262],['Mine tunnel',-60,-272],['Airstrip gate',262,150],['Lighthouse',255,-262]];
const SK_AREAS=[['Mining town',-180,-12,160,120],['Mine',-40,-212,120,80],['Radar',5,-62,44,40],['Airstrip',172,0,110,390],['Crash site',44,150,72,44],['Harbor',-170,218,140,64]];
function silo(x,z,r,h){ const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,10),M('tank')); m.position.set(x,h/2,z); scene.add(m); R.ray.push(m); R.cols.push({x0:x-r*0.92,x1:x+r*0.92,z0:z-r*0.92,z1:z+r*0.92,y0:0,y1:h}); return m; }
function campfire(x,z){ const g=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.8,1.2),MB(0xff6a1a)); g.position.set(x,0.4,z); scene.add(g); const g2=new THREE.Mesh(new THREE.BoxGeometry(0.7,1.3,0.7),MB(0xffb347)); g2.position.set(x,0.7,z); scene.add(g2); R.heaters.push({x,z,g:[g,g2]}); }
function house(x,z,face,o={}){
  const w=o.w||9, d=o.d||8, mats=['wood','metalRed','metalTeal','metalWhite','metalOchre','wood'];
  const mat=M(o.mat||mats[Math.floor(rand()*mats.length)]); const doors={}; doors[face]=[[(face==='n'||face==='s')?w/2:d/2,1.6]];
  const b=building(x,z,w,d,o.h||3.2,{mat,doors,name:o.name||''});
  const types=o.types||[['locker',2],['desk',2],['med',1.2],['tool',1.5],['crate',0.7]]; const n=o.n||2;
  for(let i=0;i<n;i++){ const t=wpick(types); const off=(n===1?0:(i/(n-1)-0.5))*(Math.min(w,d)-3.4);
    if(face==='s') container(t,x+off,z-d/2+0.75); else if(face==='n') container(t,x+off,z+d/2-0.75); else if(face==='e') container(t,x-w/2+0.75,z+off); else container(t,x+w/2-0.75,z+off); }
  if(rand()<0.6){ if(face==='s'||face==='n') heater(x-w/2+0.7,z); else heater(x,z-d/2+0.6); }
  return b;
}
function buildSkarsvik(){
  const L=285;
  scene.background=new THREE.Color(0x33424f); scene.fog=new THREE.FogExp2(0x33424f,0.0155);
  scene.add(new THREE.HemisphereLight(0xb4c8da,0x4a5560,0.95)); const sun=new THREE.DirectionalLight(0xffd8b0,0.4); sun.position.set(-80,40,60); scene.add(sun);
  ground(2*L+320); perimeter(L); aurora(); for(const a of R.aur){ a.scale.set(2.2,1.6,1); a.position.multiplyScalar(1.8); } R.drain=0.34; R.labels=SK_AREAS; R.decor=[];
  const strip=(x,z,w,d,key='road',layer=1)=>{ floorPlane(x,z,w,d,0.012,key,layer,4); R.decor.push([x-w/2,z-d/2,w,d]); };
  // frozen sea along the south coast, roads tying the island together
  floorPlane(-60,L-22,2*L-50,44,0.008,'ice',1,4);
  strip(-15,-10,330,8); strip(-40,-115,8,200); strip(-150,100,8,210); strip(40,70,6,150); strip(110,-150,8,270); strip(140,-150,60,8);
  // runway
  floorPlane(196,0,24,390,0.014,'concrete',2,4); R.decor.push([184,-195,24,390]); for(let z=-180;z<=180;z+=24) floorPlane(196,z,1.2,10,0.016,'paint',3,1);

  // ---- mining town (west) ----
  for(const x of [-240,-218,-196]) house(x,-32,'s');
  building(-165,-42,12,20,6.5,{mat:M('wood'),doors:{s:[[6,2.2]]},name:'Church'});
  solid(-165,10,-49,4,7,4,M('wood'),{col:false}); solid(-165,14.2,-49,0.4,2.6,0.4,MC(0xd8d2b4),{col:false}); solid(-165,14.6,-49,1.6,0.4,0.4,MC(0xd8d2b4),{col:false});
  container('desk',-165,-47.5); container('safe',-169.8,-50.5); container('locker',-160.2,-50.6); container('med',-170.2,-34);
  for(const x of [-138,-116]) house(x,-32,'s');
  building(-235,14,16,12,3.6,{mat:M('metalRed'),doors:{n:[[8,2.2]]},name:'General store'});
  solid(-238,0.8,14,8,1.6,1,MC(0x5a4f3d)); solid(-238,0.8,17.5,8,1.6,1,MC(0x5a4f3d));
  container('crate',-241,19.2); container('crate',-231,19.2); container('tool',-229,10); container('desk',-235,9.6); container('med',-242.6,9.2);
  for(const x of [-212,-190,-168]) house(x,14,'n');
  building(-140,16,18,14,4,{mat:M('concrete'),doors:{n:[[9,2.2]],e:[[7,1.6]]},name:'Town hall'});
  wallLine(-140,9,-140,23,4,M('concrete'),[[7,1.6]]);
  container('desk',-145,21.6); container('desk',-136,21.6); container('safe',-132,21.6); container('locker',-147.6,12); container('med',-133,12); container('desk',-144,12); heater(-148,16);
  house(-114,14,'n');
  for(const x of [-232,-206,-180]) house(x,-64,'s',{w:7,d:6,n:1});
  // ---- mine (north) ----
  building(-40,-215,44,26,7.5,{mat:M('metalGrey'),doors:{s:[[10,4],[34,1.8]],w:[[13,2]]},name:'Processing plant'});
  wallLine(-40,-228,-40,-202,7.5,M('metalGrey'),[[13,2.2]]);
  solid(-52,2,-218,6,4,6,MC(0x5a5048)); solid(-26,1.5,-220,8,3,4,MC(0x5a5048)); solid(-30,0.8,-208,3,1.6,3,MC(0x6a5a40));
  container('tool',-60,-226.8); container('tool',-22,-226.8); container('crate',-60,-204); container('crate',-46,-226.6); container('drum',-20,-204); container('locker',-44,-226.8); container('locker',-36,-226.8); container('tool',-34,-204.2);
  for(const [x,z] of [[-84,-236],[-76,-236],[-84,-228],[-76,-228]]) solid(x,8,z,0.6,16,0.6,MC(0x6a3a2a));
  solid(-80,16.2,-232,9.6,0.5,9.6,MC(0x6a3a2a),{col:false}); const wheel=new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.6,0.4,12),MC(0x3a2a20)); wheel.rotation.z=Math.PI/2; wheel.position.set(-80,18.6,-232); scene.add(wheel);
  silo(6,-226,3.4,12); silo(16,-226,3.4,12); silo(26,-226,3.4,12);
  solid(-8,7,-222,26,1.2,1.6,MC(0x55595c),{col:false});
  building(-5,-185,14,10,3.5,{mat:M('wood'),doors:{w:[[5,1.6]]},name:'Mine office'}); container('desk',-2,-188.8); container('desk',2.6,-186); container('locker',-8,-188.9); container('med',2.8,-181.6); heater(-4,-180.6);
  solid(-60,4,-278,16,8,4,M('rock'),{ts:4}); solid(-69,4,-273,3,8,8,M('rock'),{ts:4}); solid(-51,4,-273,3,8,8,M('rock'),{ts:4}); floorPlane(-60,-272,7,5,0.02,'floor',2);
  // ---- radar plateau (centre) ----
  building(0,-55,12,10,3.5,{mat:M('metalWhite'),doors:{s:[[6,1.8]]},name:'Radar hut'}); container('desk',-3,-58.8); container('safe',3.4,-58.8); container('tool',4.6,-51.6);
  solid(12,5,-68,3,10,3,M('metalWhite')); const dome=new THREE.Mesh(new THREE.SphereGeometry(3.6,10,8),M('metalWhite')); dome.position.set(12,12.2,-68); scene.add(dome);
  // ---- airstrip (east) ----
  building(150,-70,30,40,9,{mat:M('metalGrey'),doors:{e:[[20,14]],w:[[20,1.8]]},name:'Hangar'});
  solid(150,1.6,-70,3,2.6,14,M('metalWhite')); solid(150,1.9,-70,16,0.3,3,M('metalWhite'),{col:false}); solid(150,2.6,-63.5,0.3,2.4,2,M('metalWhite'),{col:false});
  container('crate',137,-88.8); container('crate',141,-88.8); container('cargo',161,-88.6); container('tool',137,-51.4); container('tool',145,-51.4); container('locker',161.6,-51.6); container('drum',138,-70); container('desk',162,-60);
  building(150,40,8,8,4,{mat:M('concrete'),doors:{w:[[4,1.6]]},name:'Control tower'}); solid(150,8.5,40,9,3,9,MC(0x2a3a44),{col:false}); container('desk',152.6,38); container('safe',152.8,43);
  tank(138,95); tank(138,108);
  building(120,-10,18,8,3.2,{mat:M('wood'),doors:{n:[[9,1.8]]},name:'Airfield barracks'}); container('locker',113,-7.2); container('locker',116,-7.2); container('locker',124,-7.2); container('med',127.6,-12); heater(112,-12);
  // ---- crash site (south) ----
  building(22,152,16,6,3.6,{mat:M('metalWhite'),doors:{e:[[3,3.4]]},name:'Cockpit',nowin:true}); container('cockpit',16,152);
  building(44,147,18,6,3.6,{mat:M('metalWhite'),doors:{w:[[3,3.4]],e:[[3,3.4]]},name:'Cargo hold',nowin:true}); container('cargo',40,145.2); container('cargo',47,148.8);
  building(66,152,12,5,3.2,{mat:M('metalWhite'),doors:{w:[[2.5,3]]},nowin:true}); solid(70,6.6,152,6,6,0.4,M('metalWhite'),{col:false}); container('cargo',68,152);
  solid(40,0.45,136,26,0.5,5,M('metalWhite')); solid(44,0.6,163,22,0.5,5,M('metalWhite'));
  for(const [x,z] of [[30,140],[56,166],[12,164],[78,140]]) campfire(x,z);
  for(let i=0;i<14;i++){ const x=44+rr(-38,38), z=150+rr(-26,26); if(R.bld.some(b=>x>b.x0-1.5&&x<b.x1+1.5&&z>b.z0-1.5&&z<b.z1+1.5)) continue; solid(x,0.35,z,rr(0.6,2.4),0.7,rr(0.6,2),MC(0xa9b0b4)); }
  container('cargo',28,170); container('cargo',62,128);
  // ---- harbor (south-west) ----
  building(-200,205,22,14,5,{mat:M('metalTeal'),doors:{s:[[11,4]],n:[[5,1.8]]},name:'Harbor warehouse'});
  container('crate',-209,199.8); container('crate',-205,199.8); container('cargo',-192,199.8); container('tool',-209,210.4); container('drum',-191,210.4);
  building(-140,205,18,12,4.5,{mat:M('metalRed'),doors:{s:[[9,3]]},name:'Fish plant'}); container('tool',-146,200.6); container('locker',-134,200.6); container('med',-130,206); container('desk',-148,206); heater(-148.2,203);
  floorPlane(-190,258,6,30,0.02,'wood',2,2); floorPlane(-150,256,6,24,0.02,'wood',2,2); R.decor.push([-193,243,6,30],[-153,244,6,24]);
  for(const [x,z] of [[-193,248],[-187,248],[-193,268],[-187,268],[-153,250],[-147,250],[-153,264],[-147,264]]) solid(x,0.6,z,0.4,1.2,0.4,M('wood'),{col:false});
  shipc(-170,228,'x',M('metalRed')); shipc(-170,231,'x',M('metalTeal')); shipc(-120,226,'z',M('metalOchre')); shipc(-232,228,'x',M('metalGrey')); container('crate',-170,234.6); container('cargo',-125,232);
  solid(-108,9,236,1.2,18,1.2,M('metalOchre')); solid(-108,18,244,1.2,1.2,18,M('metalOchre'),{col:false});
  house(-245,190,'e',{w:8,d:7,name:'Boathouse',types:[['crate',2],['tool',2]]});
  // ---- lighthouse (north-east) ----
  const lh=new THREE.Mesh(new THREE.CylinderGeometry(2,2.6,18,10),M('metalWhite')); lh.position.set(262,9,-270); scene.add(lh); R.ray.push(lh); R.cols.push({x0:259.6,x1:264.4,z0:-272.4,z1:-267.6,y0:0,y1:18});
  const lamp=new THREE.Mesh(new THREE.BoxGeometry(2.4,1.6,2.4),MB(0xffe08a)); lamp.position.set(262,18.8,-270); scene.add(lamp);
  // ---- hunting cabins ----
  for(const [x,z,f] of [[-80,92,'n'],[92,80,'w'],[110,-170,'s'],[-120,-132,'e'],[62,-120,'s'],[-252,92,'e'],[232,62,'w'],[-30,60,'n'],[180,230,'w']]) house(x,z,f,{w:7,d:6,n:1,mat:'wood'});
  // ---- terrain clutter ----
  const busy=(x,z,m)=>R.bld.some(b=>x>b.x0-m&&x<b.x1+m&&z>b.z0-m&&z<b.z1+m)||R.decor.some(([a,b,w,d])=>x>a-m&&x<a+w+m&&z>b-m&&z<b+d+m)||SK_LZ.some(l=>Math.hypot(l.x-x,l.z-z)<14)||SK_EVAC.some(l=>Math.hypot(l.x-x,l.z-z)<12);
  for(const [cx,cz,n] of [[30,-80,9],[-20,-40,7],[100,60,8],[-90,40,8],[230,-60,6],[-250,-240,8],[80,240,7],[-100,-160,8],[240,120,6]]) for(let i=0;i<n;i++){ const x=cx+rr(-16,16), z=cz+rr(-16,16); if(!busy(x,z,3)) rock(x,z,rr(1.2,3.6)); }
  for(let i=0;i<90;i++){ const x=rr(-L+10,L-10), z=rr(-L+10,L-10); if(!busy(x,z,4)) drift(x,z,rr(1.5,5)); }
  // ---- extracts, spawns, people ----
  R.extracts=SK_EX.map(([name,x,z])=>({name,x,z,r:5})); shuffle(R.extracts); R.extracts.forEach((e,i)=>e.active=i<2);
  const scavs=[[-230,-20],[-200,-12],[-160,-14],[-130,-8],[-205,14],[-150,-40],[-120,-60],[-200,200],[-150,212],[-170,240],[-120,240],[-235,205],[2,-48],[-6,-64],[18,-60],[-80,96],[92,74],[-30,-185],[-10,-200],[-58,-196],[110,-164],[-30,66]];
  for(const [x,z] of scavs) spawnEnemy(x,z,'scav');
  for(const [x,z] of [[150,-60],[160,-80],[132,-20],[150,30],[196,40],[196,-110],[44,140],[30,160],[60,158],[70,142],[22,132]]) spawnEnemy(x,z,'raider');
  spawnEnemy(-46,-218,'foreman'); spawnEnemy(-40,-206,'mguard'); spawnEnemy(-56,-206,'mguard');
  return SK_LZ;
}
function randomOpen(margin=6){ for(let k=0;k<80;k++){ const x=rr(-R.bound+15,R.bound-15), z=rr(-R.bound+15,R.bound-15); if(R.bld.some(b=>x>b.x0-margin&&x<b.x1+margin&&z>b.z0-margin&&z<b.z1+margin)) continue; if(R.cols.some(b=>x>b.x0-2&&x<b.x1+2&&z>b.z0-2&&z<b.z1+2)) continue; return {x,z}; } return {x:0,z:0}; }
// runs inside the seeded build so every player in a raid gets the same events
function applyMods(sps){
  const m=R.cond.mod;
  if(m==='raiders'&&R.map!=='vault'){ for(let i=0;i<(R.map==='skarsvik'?7:4);i++){ const q=randomOpen(3); if(sps.every(s=>Math.hypot(q.x-s.x,q.z-s.z)>45)) spawnEnemy(q.x,q.z,'raider'); } }
  if(m==='bounty'){ const b=R.enemies.find(e=>['chief','warden','foreman','relay'].includes(e.kind)); if(b) b.bounty=5000; }
  if(R.map!=='vault'&&!MAPS[R.map].noDrop&&(m==='drop'||rand()<0.3)){
    const t=CTYPES.airdrop; const cont={w:t.grid[0],h:t.grid[1],items:[]}; const n=Math.round(rr(t.rolls[0],t.rolls[1]+0.99));
    for(const id of (t.always||[])){ const it=mk(id); it.hid=true; place(cont,it); }
    for(let i=0;i<n;i++){ const it=mkLoot(wpick(t.table)); it.hid=true; place(cont,it); }
    { const it=mkLoot(wpick(JACKPOT)); it.hid=true; place(cont,it); }
    const q=randomOpen(8); R.drop={t:rr(70,MAPS[R.map].time*0.5),x:q.x,z:q.z,cont,state:'pending'};
  }
  if(R.map==='skarsvik'){ const z=SK_EVAC[Math.floor(rand()*SK_EVAC.length)]; R.evac={t:MAPS.skarsvik.time*rr(0.45,0.6),x:z.x,z:z.z,name:z.name,dur:100,state:'pending'}; R.evacEx={name:'Helicopter evac',x:z.x,z:z.z,r:7,active:false,time:5,evac:true}; R.extracts.push(R.evacEx); }
}
function applyWeather(){
  const W=R.cond.W; R.sight=W.sight;
  if(scene.fog) scene.fog.density=Math.min(0.075,scene.fog.density*W.fog);
  R.drain*=W.cold;
  scene.traverse(o=>{ if(o.isHemisphereLight||o.isDirectionalLight) o.intensity*=W.light; });
  if(W.dark){ scene.background.multiplyScalar(0.42); if(scene.fog) scene.fog.color.multiplyScalar(0.42); R.aurMul=3; }
}
// skip drawing small static things beyond the fog (big maps have a lot of them)
function setupCulling(){
  R.cull=[]; R.viewDist=scene.fog?Math.min(320,2.5/scene.fog.density):320; R.cullT=0;
  for(const o of scene.children){ if(!o.isMesh||o.isInstancedMesh) continue; const g=o.geometry; if(!g.boundingSphere) g.computeBoundingSphere(); const r=g.boundingSphere.radius*Math.max(o.scale.x,o.scale.y,o.scale.z); if(r>70) continue; o.updateMatrixWorld(); const c=g.boundingSphere.center.clone().applyMatrix4(o.matrixWorld); R.cull.push({o,x:c.x,z:c.z,r}); }
}
function updCulling(dt){ R.cullT-=dt; if(R.cullT>0) return; R.cullT=0.25; const px=camera.position.x, pz=camera.position.z, vd=R.fly?Math.max(R.viewDist,1600):R.viewDist; for(const c of R.cull) c.o.visible=Math.hypot(c.x-px,c.z-pz)-c.r<vd; }
