/* 50-engine: 3D engine: renderer, textures, materials, collision, map building helpers */
/* ================= 3D ENGINE ================= */
let renderer, scene, camera, vmScene, vmCam, vmGun=null, vmUid=null, flash, snow, R=null, P=null;
const ray=new THREE.Raycaster(); const MATS={}, TEXS={}; const SNAP={value:new THREE.Vector2(200,150)};
const MAXHP={head:35,thorax:85,stomach:70,larm:60,rarm:60,lleg:65,rleg:65};
const PARTS=Object.keys(MAXHP);
const PART_NAME={head:'head',thorax:'thorax',stomach:'stomach',larm:'left arm',rarm:'right arm',lleg:'left leg',rleg:'right leg'};

// three r128 tests a mesh against the whole infinite ray before it looks at the ray's length, so a short sight
// line still did triangle tests on every terrain tile lined up far behind it. Skip any mesh whose bounding sphere the
// ray segment (origin to far) doesn't reach; on the big maps this makes line-of-sight checks many times cheaper.
const _segS=new THREE.Sphere(), _segV=new THREE.Vector3();
{ const base=THREE.Mesh.prototype.raycast; THREE.Mesh.prototype.raycast=function(rc,out){ const g=this.geometry; if(g&&rc.far<Infinity){ if(!g.boundingSphere) g.computeBoundingSphere(); _segS.copy(g.boundingSphere).applyMatrix4(this.matrixWorld);
    const o=rc.ray.origin, d=rc.ray.direction; _segV.subVectors(_segS.center,o); const t=clamp(_segV.dot(d),0,rc.far); _segV.set(o.x+d.x*t-_segS.center.x,o.y+d.y*t-_segS.center.y,o.z+d.z*t-_segS.center.z); if(_segV.lengthSq()>_segS.radius*_segS.radius) return; }
  return base.call(this,rc,out); }; }
function initGL(){
  if(renderer) return true;
  try{ renderer=new THREE.WebGLRenderer({canvas:$('#cv'),antialias:false,powerPreference:'high-performance'}); }catch(e){ return false; }
  renderer.setPixelRatio(1); renderer.autoClear=false;
  camera=new THREE.PerspectiveCamera(72,1,0.1,420); camera.rotation.order='YXZ';
  vmScene=new THREE.Scene(); vmCam=new THREE.PerspectiveCamera(58,1,0.01,10);
  vmScene.add(new THREE.HemisphereLight(0xcfe3ff,0x3a4248,0.95)); const dl=new THREE.DirectionalLight(0xffe6cc,0.55); dl.position.set(1,2,1); vmScene.add(dl);
  makeTextures(); addEventListener('resize',resize); resize(); return true;
}
function resize(){ if(!renderer) return; const w=innerWidth, h=innerHeight, rh=300, rw=Math.round(w*rh/h); renderer.setSize(rw,rh,false); SNAP.value.set(rw/2.4,rh/2.4); camera.aspect=w/h; camera.updateProjectionMatrix(); vmCam.aspect=w/h; vmCam.updateProjectionMatrix(); }
function ctex(size,draw){ const c=document.createElement('canvas'); c.width=c.height=size; const g=c.getContext('2d'); draw(g,size); const t=new THREE.CanvasTexture(c); t.magFilter=THREE.NearestFilter; t.minFilter=THREE.NearestFilter; t.generateMipmaps=false; t.wrapS=t.wrapT=THREE.RepeatWrapping; return t; }
function noise(g,s,vary){ const id=g.getImageData(0,0,s,s); for(let i=0;i<id.data.length;i+=4){ const n=(rand()-0.5)*vary; id.data[i]+=n; id.data[i+1]+=n; id.data[i+2]+=n; } g.putImageData(id,0,0); }
function corr(col){ return (g,s)=>{ g.fillStyle=col; g.fillRect(0,0,s,s); for(let x=0;x<s;x+=4){ g.fillStyle='rgba(0,0,0,.22)'; g.fillRect(x,0,1,s); g.fillStyle='rgba(255,255,255,.08)'; g.fillRect(x+2,0,1,s); } noise(g,s,26); g.fillStyle='rgba(80,40,20,.25)'; for(let i=0;i<6;i++) g.fillRect(rand()*s,rand()*s,2,3+rand()*6); }; }
function makeTextures(){
  TEXS.snow=ctex(32,(g,s)=>{ g.fillStyle='#d9e3ea'; g.fillRect(0,0,s,s); noise(g,s,24); g.fillStyle='rgba(120,150,175,.35)'; for(let i=0;i<10;i++) g.fillRect(rand()*s|0,rand()*s|0,2,1); });
  TEXS.drift=ctex(32,(g,s)=>{ g.fillStyle='#e6edf2'; g.fillRect(0,0,s,s); noise(g,s,14); });
  TEXS.ice=ctex(32,(g,s)=>{ g.fillStyle='#8fb6c9'; g.fillRect(0,0,s,s); noise(g,s,16); g.strokeStyle='rgba(235,248,255,.6)'; g.beginPath(); g.moveTo(0,rand()*s); g.lineTo(s,rand()*s); g.moveTo(rand()*s,0); g.lineTo(rand()*s,s); g.stroke(); });
  TEXS.concrete=ctex(32,(g,s)=>{ g.fillStyle='#8a8f92'; g.fillRect(0,0,s,s); noise(g,s,30); g.fillStyle='rgba(0,0,0,.25)'; g.fillRect(0,15,s,1); g.fillRect(0,31,s,1); g.fillRect(15,0,1,s); });
  TEXS.metalRed=ctex(32,corr('#8e3b2e')); TEXS.metalTeal=ctex(32,corr('#3d6d73')); TEXS.metalOchre=ctex(32,corr('#a88637')); TEXS.metalGrey=ctex(32,corr('#6d757a')); TEXS.metalWhite=ctex(32,corr('#c3cacd'));
  TEXS.wood=ctex(32,(g,s)=>{ g.fillStyle='#6f4f31'; g.fillRect(0,0,s,s); noise(g,s,26); g.fillStyle='rgba(0,0,0,.35)'; for(let y=0;y<s;y+=8) g.fillRect(0,y,s,1); for(let y=0;y<s;y+=8) g.fillRect((y*7)%s,y,1,8); });
  TEXS.floor=ctex(32,(g,s)=>{ for(let y=0;y<4;y++) for(let x=0;x<4;x++){ g.fillStyle=(x+y)%2?'#4a574f':'#56645b'; g.fillRect(x*8,y*8,8,8); } noise(g,s,14); });
  TEXS.roof=ctex(32,(g,s)=>{ g.fillStyle='#3a4045'; g.fillRect(0,0,s,s); noise(g,s,18); g.fillStyle='rgba(255,255,255,.6)'; g.fillRect(0,0,s,3); });
  TEXS.crate=ctex(32,(g,s)=>{ g.fillStyle='#5c6b3a'; g.fillRect(0,0,s,s); noise(g,s,22); g.strokeStyle='#38431f'; g.lineWidth=3; g.strokeRect(1.5,1.5,s-3,s-3); g.fillStyle='#d8d2a8'; g.fillRect(10,14,12,3); });
  TEXS.tool=ctex(32,(g,s)=>{ g.fillStyle='#a32f23'; g.fillRect(0,0,s,s); noise(g,s,20); g.fillStyle='#222'; g.fillRect(0,12,s,2); g.fillStyle='#ccc'; g.fillRect(12,5,8,3); });
  TEXS.med=ctex(32,(g,s)=>{ g.fillStyle='#d9dcdc'; g.fillRect(0,0,s,s); noise(g,s,12); g.fillStyle='#b8231c'; g.fillRect(13,7,6,18); g.fillRect(7,13,18,6); });
  TEXS.locker=ctex(32,(g,s)=>{ g.fillStyle='#55697a'; g.fillRect(0,0,s,s); noise(g,s,16); g.fillStyle='rgba(0,0,0,.4)'; g.fillRect(15,0,2,s); for(let y=4;y<12;y+=2){ g.fillRect(4,y,8,1); g.fillRect(20,y,8,1);} });
  TEXS.desk=ctex(32,(g,s)=>{ g.fillStyle='#7b5a3a'; g.fillRect(0,0,s,s); noise(g,s,18); g.fillStyle='rgba(0,0,0,.4)'; g.fillRect(2,10,28,1); g.fillRect(2,20,28,1); g.fillStyle='#cfc4a0'; g.fillRect(14,14,4,2); });
  TEXS.safe=ctex(32,(g,s)=>{ g.fillStyle='#2f3437'; g.fillRect(0,0,s,s); noise(g,s,12); g.fillStyle='#888'; g.beginPath(); g.arc(16,16,5,0,7); g.fill(); });
  TEXS.drum=ctex(32,(g,s)=>{ g.fillStyle='#2b5c96'; g.fillRect(0,0,s,s); noise(g,s,18); g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(0,9,s,2); g.fillRect(0,22,s,2); });
  TEXS.tank=ctex(32,(g,s)=>{ g.fillStyle='#cfd3cf'; g.fillRect(0,0,s,s); noise(g,s,14); g.fillStyle='#b8402d'; g.fillRect(0,12,s,4); });
  TEXS.road=ctex(32,(g,s)=>{ g.fillStyle='#9aa3a6'; g.fillRect(0,0,s,s); noise(g,s,22); g.fillStyle='rgba(60,60,60,.35)'; g.fillRect(7,0,3,s); g.fillRect(22,0,3,s); });
  TEXS.paint=ctex(8,(g,s)=>{ g.fillStyle='#e9ece6'; g.fillRect(0,0,s,s); });
  TEXS.rock=ctex(32,(g,s)=>{ g.fillStyle='#565c60'; g.fillRect(0,0,s,s); noise(g,s,44); });
}
function ps1(m){ m.onBeforeCompile=sh=>{ sh.uniforms.uSnap=SNAP; sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform vec2 uSnap;').replace('#include <project_vertex>','#include <project_vertex>\nif(gl_Position.w>0.6){ vec4 snp=gl_Position; snp.xyz/=snp.w; snp.xy=floor(snp.xy*uSnap+0.5)/uSnap; snp.xyz*=snp.w; gl_Position=snp; }'); }; return m; }
function M(key,opts={}){ if(MATS[key]) return MATS[key]; const m=new THREE.MeshLambertMaterial(Object.assign({map:TEXS[key]||null,side:THREE.DoubleSide},opts)); ps1(m); return MATS[key]=m; }
const MC = hex => M('c'+hex.toString(16),{color:hex});
function MB(hex,opts={}){ const k='b'+hex.toString(16)+(opts.transparent?'t':''); if(MATS[k]) return MATS[k]; return MATS[k]=new THREE.MeshBasicMaterial(Object.assign({color:hex},opts)); }
function tiledBox(w,h,d,ts=2){ const g=new THREE.BoxGeometry(w,h,d); const uv=g.attributes.uv; const sz=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]]; for(let f=0;f<6;f++) for(let i=0;i<4;i++){ const k=f*4+i; uv.setXY(k, uv.getX(k)*sz[f][0]/ts, uv.getY(k)*sz[f][1]/ts); } return g; }
function solid(x,y,z,w,h,d,m,o={}){
  y+=R.yOff||0;
  const mesh=new THREE.Mesh(tiledBox(w,h,d,o.ts||2.5),m); mesh.position.set(x,y,z); scene.add(mesh);
  if(o.col!==false){ const b={x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,y0:y-h/2,y1:y+h/2}; const g=R.terrain?R.terrain(x,z):0; if(b.y1>g+0.3&&b.y0<g+1.6) R.cols.push(b); }
  if(o.los!==false) R.ray.push(mesh);
  return mesh;
}
// collision boxes bucketed on an 8 m grid, so moving only tests the boxes nearby (the big maps have thousands of
// trees and rocks); rebuilt whenever boxes are added or removed
function colIndex(){
  const n=R.cols.length, X=R.colIx; if(X&&X.n===n&&!R.colsDirty) return X;
  const C=8, m=new Map(), big=[];
  for(const b of R.cols){ const x0=Math.floor((b.x0-0.6)/C), x1=Math.floor((b.x1+0.6)/C), z0=Math.floor((b.z0-0.6)/C), z1=Math.floor((b.z1+0.6)/C);
    if((x1-x0+1)*(z1-z0+1)>600){ big.push(b); continue; }
    for(let z=z0;z<=z1;z++) for(let x=x0;x<=x1;x++){ const k=(x+20000)*40000+(z+20000); let l=m.get(k); if(!l) m.set(k,l=[]); l.push(b); } }
  R.colsDirty=false; return R.colIx={n,C,m,big};
}
function colsNear(x,z){ const X=colIndex(); const l=X.m.get((Math.floor(x/X.C)+20000)*40000+(Math.floor(z/X.C)+20000)); return l?(X.big.length?l.concat(X.big):l):X.big; }
function resolve(p,rad,feet=0){
  for(const b of colsNear(p.x,p.z)){
    if(p.x+rad<b.x0||p.x-rad>b.x1||p.z+rad<b.z0||p.z-rad>b.z1) continue;
    if(b.y1<=feet+0.06) continue;
    const cx=clamp(p.x,b.x0,b.x1), cz=clamp(p.z,b.z0,b.z1); const dx=p.x-cx, dz=p.z-cz, d2=dx*dx+dz*dz;
    if(d2<rad*rad){ if(d2>1e-8){ const d=Math.sqrt(d2); p.x=cx+dx/d*rad; p.z=cz+dz/d*rad; }
      else { const l=p.x-b.x0, r=b.x1-p.x, t=p.z-b.z0, bt=b.z1-p.z, m=Math.min(l,r,t,bt); if(m===l) p.x=b.x0-rad; else if(m===r) p.x=b.x1+rad; else if(m===t) p.z=b.z0-rad; else p.z=b.z1+rad; } }
  }
}
// highest box top under you that you are standing on or above
function groundAt(x,z,feet){ let g=R.terrain?R.terrain(x,z):0; for(const b of colsNear(x,z)){ if(b.y1>feet+0.06||b.y1<=g) continue; if(x>b.x0-0.15&&x<b.x1+0.15&&z>b.z0-0.15&&z<b.z1+0.15) g=b.y1; } return g; }
function moveCol(p,dx,dz,rad,feet=0){ p.x+=dx; resolve(p,rad,feet); p.z+=dz; resolve(p,rad,feet); const L=R.bound; p.x=clamp(p.x,-L,L); p.z=clamp(p.z,-L,L); }

/* ---- map building helpers ---- */
function wallLine(x1,z1,x2,z2,h,mat,doors=[]){
  const horiz=Math.abs(z2-z1)<0.01; const L=horiz?Math.abs(x2-x1):Math.abs(z2-z1); const t=0.3; const sx=Math.min(x1,x2), sz=Math.min(z1,z2);
  const gaps=doors.map(([p,w])=>[p-w/2,p+w/2]).sort((a,b)=>a[0]-b[0]);
  let cur=0; const segs=[]; for(const [a,b] of gaps){ if(a>cur) segs.push([cur,a]); cur=Math.max(cur,b); } if(cur<L) segs.push([cur,L]);
  for(const [a,b] of segs){ const len=b-a, mid=(a+b)/2; if(len<0.05) continue; if(horiz) solid(sx+mid,h/2,z1,len,h,t,mat); else solid(x1,h/2,sz+mid,t,h,len,mat); }
  for(const [a,b] of gaps){ const len=b-a, mid=(a+b)/2, lh=h-2.3; if(lh>0.05){ if(horiz) solid(sx+mid,2.3+lh/2,z1,len,lh,t,mat,{col:false}); else solid(x1,2.3+lh/2,sz+mid,t,lh,len,mat,{col:false}); } }
}
function building(cx,cz,w,d,h,o={}){
  const mat=o.mat||M('concrete'), x0=cx-w/2, x1=cx+w/2, z0=cz-d/2, z1=cz+d/2, dr=o.doors||{};
  wallLine(x0,z0,x1,z0,h,mat,dr.n||[]); wallLine(x0,z1,x1,z1,h,mat,dr.s||[]); wallLine(x0,z0,x0,z1,h,mat,dr.w||[]); wallLine(x1,z0,x1,z1,h,mat,dr.e||[]);
  solid(cx,h+0.15,cz,w+0.5,0.3,d+0.5,M('roof'),{col:false});
  floorPlane(cx,cz,w-0.3,d-0.3,0.02,'floor',2);
  const doorPts=[]; for(const [p] of (dr.n||[])) doorPts.push([x0+p,z0,0,-1]); for(const [p] of (dr.s||[])) doorPts.push([x0+p,z1,0,1]); for(const [p] of (dr.w||[])) doorPts.push([x0,z0+p,-1,0]); for(const [p] of (dr.e||[])) doorPts.push([x1,z0+p,1,0]);
  R.indoor.push({x0,x1,z0,z1}); R.bld.push({x0,x1,z0,z1,name:o.name||'',doors:doorPts});
  if(R.cond&&R.cond.hot&&o.name===R.cond.hot) R.hotB={x0,x1,z0,z1};
  if(o.nowin) return {x0,x1,z0,z1,doorPts};
  // lit windows on the long walls
  const lit=MB(0xffc874), dark=MB(0x1c2a33);
  const win=(x,z,rotY)=>{ if(doorPts.some(([a,b])=>Math.hypot(a-x,b-z)<1.6)) return; const on=rand()<0.55&&!R.outage; const m=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.7,0.06), on?lit:dark); m.position.set(x,1.75+(R.yOff||0),z); m.rotation.y=rotY; scene.add(m); };
  const nw=Math.max(1,Math.floor(w/7)); for(let i=0;i<nw;i++){ const x=x0+(i+0.5)*w/nw; win(x,z0-0.18,0); win(x,z1+0.18,0); }
  const nd=Math.max(1,Math.floor(d/7)); for(let i=0;i<nd;i++){ const z=z0+(i+0.5)*d/nd; win(x0-0.18,z,Math.PI/2); win(x1+0.18,z,Math.PI/2); }
  return {x0,x1,z0,z1,doorPts};
}
function heater(x,z){ const m=solid(x,0.45,z,0.8,0.9,0.4,MC(0x3b3f42)); if(R.outage) return; const glow=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.3,0.05),MB(0xff7a2a)); glow.position.set(x,0.5+(R.yOff||0),z+0.21); scene.add(glow); const glow2=glow.clone(); glow2.position.z=z-0.21; scene.add(glow2); R.heaters.push({x,z,g:[glow,glow2]}); }
const CTYPES={
 hoard:{name:"Jarl's hoard",grid:[6,5],size:[1.4,1.2,1.0],tex:'safe',rolls:[4,6],table:[['goldbar',3],['diamond',2],['bearer',1.5],['thermal',1.5],['sensor',2],['satphone',2],['watch',3],['glacier',1],['warden',0.6],['kestrel',1],['scope4',1.5],['suppr',1.5],['a545bp',2],['cryocell',1],['cache',0.8],['cash',3]]},
 crate:{name:'Weapon crate',grid:[5,4],size:[1.3,0.7,0.8],tex:'crate',rolls:[2,4],table:[['a918',6],['a545',4],['a12',4],['a762',2],['makar',2],['vintik',1.2],['tundra',1],['akr',0.4],['nord',0.5],['vest',1],['hardhat',1],['chestrig',0.6],['powder',2],['cash',1.5],['reddot',0.3],['holo',0.2]]},
 tool:{name:'Toolbox',grid:[4,3],size:[0.9,0.45,0.5],tex:'tool',rolls:[1,3],table:[['bolts',5],['tape',4],['scrap',4],['wire',3],['battery',3],['powder',1.2],['fuel',0.5]]},
 med:{name:'Medical cabinet',grid:[4,3],size:[0.9,1.4,0.45],tex:'med',rolls:[1,3],table:[['bandage',6],['splint',3],['ifak',2],['medsup',2],['fieldkit',0.35],['thermos',1]]},
 desk:{name:'Desk',grid:[4,2],size:[1.4,0.8,0.8],tex:'desk',rolls:[1,3],table:[['cash',4],['notebook',1.2],['battery',2],['aquavit',2],['tape',2],['radio',0.7],['watch',0.6],['satphone',0.2]]},
 locker:{name:'Locker',grid:[3,5],size:[0.9,1.9,0.55],tex:'locker',rolls:[1,3],table:[['thermos',3],['aquavit',2],['cash',3],['vest',1],['hardhat',1],['sack',1],['belt',1],['a918',3],['bandage',2],['watch',0.4]]},
 safe:{name:'Lab safe',grid:[3,3],size:[0.8,0.9,0.7],tex:'safe',rolls:[1,3],table:[['cash',4],['satphone',2],['icecore',2],['thermal',0.8],['notebook',3],['sensor',1.5],['goldbar',1],['watch',2]]},
 drum:{name:'Fuel drum',grid:[2,2],size:[0.7,1.0,0.7],tex:'drum',rolls:[0,1],table:[['fuel',1]]},
 vsafe:{name:'Vault safe',grid:[4,3],size:[1.1,1.3,0.8],tex:'safe',rolls:[2,3],table:[['cash',6],['goldbar',3],['bearer',1.4],['diamond',1.4],['thermal',1],['satphone',1.5],['icecore',1],['watch',2],['blackbox',0.35]]},
 vlocker:{name:'Guard locker',grid:[3,5],size:[0.9,1.9,0.55],tex:'locker',rolls:[1,3],table:[['a545bp',3],['a762',3],['bastion',1],['plate',0.8],['ifak',2],['fieldkit',0.6],['cash',3],['suppr',0.5],['scope4',0.5],['extmag',0.7],['prism',0.5],['holo',0.5]]},
 cargo:{name:'Cargo crate',grid:[5,4],size:[1.4,1.1,1.0],tex:'crate',rolls:[2,4],table:[['akr',1],['kestrel',0.3],['plate',0.6],['bastion',0.5],['ruck',0.6],['scope4',0.4],['prism',0.5],['suppr',0.4],['a545',3],['a762',2],['fieldkit',0.6],['fuel',1],['radio',1],['sensor',0.5],['cash',2]]},
 cockpit:{name:'Cockpit',grid:[4,3],size:[1.2,0.9,0.8],tex:'desk',rolls:[1,2],table:[['notebook',2],['satphone',1],['watch',1],['cash',2]],always:['blackbox']},
 airdrop:{name:'Supply drop',grid:[6,5],size:[1.4,1.4,1.4],tex:'crate',rolls:[4,6],table:[['akr',2],['kestrel',1],['nord',1],['plate',1.5],['glacier',0.5],['bastion',1.2],['warden',0.25],['scope4',1],['prism',1.2],['holo',1],['suppr',1],['extmag',1],['a545bp',2],['a762',2],['fieldkit',1.2],['ifak',2],['cash',2]]},
};
{ const W=(t,id,w)=>{ const tb=CTYPES[t].table; const e=tb.find(x=>x[0]===id); if(e) e[1]=w; else tb.push([id,w]); };
  W('crate','akr',0.9); W('crate','nord',0.8); W('crate','reddot',0.6); W('crate','holo',0.45); W('crate','kestrel',0.12); W('crate','extmag',0.3); W('crate','a545bp',1); W('crate','bastion',0.3);
  W('desk','watch',1); W('desk','radio',1); W('desk','satphone',0.4); W('desk','goldbar',0.15);
  W('locker','plate',0.3); W('locker','bastion',0.3); W('locker','chestrig',0.5); W('locker','ifak',1);
  W('med','fieldkit',0.6); W('med','ifak',2.5); W('tool','fuel',0.8); W('tool','radio',0.3);
  W('safe','thermal',1.2); W('safe','goldbar',1.5); W('safe','diamond',0.4);
  W('vlocker','glacier',0.3); W('vlocker','kestrel',0.3); W('cargo','kestrel',0.5); W('cargo','glacier',0.25); }
// rooms behind locked doors (63-locks.js) hold these
Object.assign(CTYPES,{
 strongbox:{name:'Strongbox',grid:[4,3],size:[0.9,0.7,0.6],tex:'safe',rolls:[2,3],table:[['cash',5],['goldbar',1.4],['diamond',0.6],['bearer',0.4],['watch',3],['satphone',1.4],['drive',1.4],['medal',2],['ivory',1.4],['compass',1.6],['meteorite',0.25],['cryocell',0.3],['cache',0.6],['lockpick',0.5]]},
 rack:{name:'Weapon rack',grid:[6,4],size:[1.6,1.6,0.4],tex:'locker',rolls:[2,3],table:[['akr',2],['kestrel',0.6],['nord',1],['tundra',1],['vintik',1],['plate',0.6],['bastion',0.6],['glacier',0.15],['scope4',0.6],['prism',0.6],['suppr',0.6],['brake',0.8],['extmag',0.6],['dmrmag',0.25],['a545bp',2],['a762',2]]},
 shelf:{name:'Supply shelf',grid:[5,4],size:[1.4,1.8,0.5],tex:'tool',rolls:[2,4],table:[['ifak',2],['combatkit',1],['fieldkit',0.6],['medsup',2],['tourniquet',1.5],['thermos',2],['ration',2],['handwarm',2],['battery',2],['fuel',1],['radio',1],['laptop',0.4],['binocs',0.8],['caviar',1],['smokes',2],['blade',0.6],['lockpick',0.4]]},
});
// the new valuables and supplies in the everyday containers
{ const W=(t,id,w)=>CTYPES[t].table.push([id,w]);
  W('desk','smokes',2); W('desk','caviar',1); W('desk','medal',0.8); W('desk','compass',0.6); W('desk','drive',0.25); W('desk','laptop',0.15); W('desk','camera',0.3);
  W('locker','smokes',2); W('locker','handwarm',2); W('locker','tourniquet',1); W('locker','binocs',0.4); W('locker','pelt',0.3); W('locker','lockpick',0.15);
  W('safe','drive',1.2); W('safe','laptop',0.6); W('safe','ivory',0.8); W('safe','meteorite',0.15); W('safe','camera',0.6);
  W('med','tourniquet',2); W('med','combatkit',1.2); W('med','handwarm',1.5); W('med','ration',1);
  W('tool','blade',0.4); W('tool','handwarm',1); W('tool','lockpick',0.25); W('crate','ration',1); W('crate','brake',0.25);
  W('cargo','blade',0.8); W('cargo','laptop',0.4); W('cargo','pelt',0.6); W('cargo','ration',1); W('cargo','brake',0.4);
  W('vlocker','combatkit',1); W('vlocker','brake',0.4); W('vsafe','meteorite',0.3); W('vsafe','drive',1);
  W('airdrop','combatkit',1.5); W('airdrop','brake',0.8); W('airdrop','laptop',0.5); W('airdrop','lockpick',0.6);
  W('hoard','meteorite',0.6); W('tool','dronebatt',0.2); W('cargo','dronecam',0.15); W('strongbox','jammer',0.25); W('vlocker','jammer',0.15); W('airdrop','jammer',0.4); W('cargo','jammer',0.08); W('rack','jammer',0.2); W('cockpit','camera',1); W('cockpit','binocs',1);
  // keys turn up in desks, lockers, safes and crates (63-locks.js swaps most for one that works on this map)
  for(const id of Object.keys(ITEMS).filter(k=>ITEMS[k].type==='key')){ W('desk',id,0.05); W('locker',id,0.04); W('safe',id,0.06); W('cargo',id,0.04); W('vlocker',id,0.05); W('airdrop',id,0.06); } }
CTYPES.safe.table.push(['cache',0.3]); CTYPES.vsafe.table.push(['cache',0.7],['cryocell',0.6]); CTYPES.cargo.table.push(['cache',0.35],['cryocell',0.25]); CTYPES.airdrop.table.push(['cryocell',0.9]); CTYPES.airdrop.always=['cache'];
function mkLoot(id){
  const d=ITEMS[id];
  if(id==='cash') return mk('cash',{n:Math.round((R.map==='vault'?rr(600,3000):rr(100,700))*R.D.cash/10)*10});
  if(d.type==='weapon') return mk(id,{mag:Math.floor(rand()*(d.magSize+1))});
  if(d.type==='ammo') return mk(id,{n:Math.max(5,Math.floor(rr(0.15,0.7)*d.stack))});
  if(d.dur) return mk(id,{dur:d.dur*rr(0.5,1)});
  return mk(id);
}
function container(type,x,z,mult=1,y=0){
  const t=CTYPES[type]; const [w,h,d]=t.size; const mesh=solid(x,y+h/2,z,w,h,d,M(t.tex),{ts:Math.max(w,h,d)});
  const hot=R.hotB&&x>R.hotB.x0&&x<R.hotB.x1&&z>R.hotB.z0&&z<R.hotB.z1; mult*=(R.outage?1.3:1)*(hot?2:1)*R.D.loot;
  const cont={w:t.grid[0],h:t.grid[1],items:[]}; const n=Math.round(rr(t.rolls[0],t.rolls[1]+0.99)*mult*1.25-0.2)+(hot?1:0);
  if(t.always) for(const id of t.always){ const it=mk(id); it.hid=true; place(cont,it); }
  for(let i=0;i<n;i++){ const it=mkLoot(localKey(wpick(t.table))); it.hid=true; place(cont,it); }
  if(type!=='drum'&&rand()<0.07*R.D.loot){ const it=mkLoot(wpick(JACKPOT)); it.hid=true; place(cont,it); }
  R.conts.push({cid:'c'+R.conts.length,type,name:t.name,x,z,mesh,cont,opened:false,locked:type==='hoard'});
}
function shipc(x,z,axis,mat){ if(axis==='x') solid(x,1.3,z,6.1,2.6,2.45,mat,{ts:2.6}); else solid(x,1.3,z,2.45,2.6,6.1,mat,{ts:2.6}); }
function tank(x,z){ const yo=R.yOff||0; const m=new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.6,4.5,10),M('tank')); m.position.set(x,2.25+yo,z); scene.add(m); R.ray.push(m); R.cols.push({x0:x-2.4,x1:x+2.4,z0:z-2.4,z1:z+2.4,y0:yo,y1:4.5+yo}); }
function rock(x,z,s){ const m=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),M('rock')); m.position.set(x,s*0.35,z); m.scale.y=0.7; m.rotation.set(rand()*3,rand()*3,rand()*3); scene.add(m); R.ray.push(m); R.cols.push({x0:x-s*0.75,x1:x+s*0.75,z0:z-s*0.75,z1:z+s*0.75,y0:0,y1:s}); }
function drift(x,z,s){ const m=new THREE.Mesh(new THREE.IcosahedronGeometry(s,0),M('drift')); m.position.set(x,-s*0.55,z); m.scale.set(1.6,1,1); m.rotation.y=rand()*3; scene.add(m); }
// ground-level surfaces share heights within a few cm, so each gets its own depth layer and skips the PS1 vertex
// snapping (snapping tilts big flat triangles enough to make stacked floors flicker through each other)
function MF(key,layer){ const k='f'+key+layer; if(MATS[k]) return MATS[k]; return MATS[k]=new THREE.MeshLambertMaterial({map:TEXS[key],polygonOffset:true,polygonOffsetFactor:-layer,polygonOffsetUnits:-layer*4}); }
function floorPlane(x,z,w,d,y,key,layer,ts=2.5){ const sx=Math.max(1,Math.round(w/3)), sz=Math.max(1,Math.round(d/3)); const g=new THREE.PlaneGeometry(w,d,sx,sz); const uv=g.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)*w/ts,uv.getY(i)*d/ts); const m=new THREE.Mesh(g,MF(key,layer)); m.rotation.x=-Math.PI/2; m.position.set(x,y+(R.yOff||0),z); scene.add(m); return m; }
function ground(size){ const g=new THREE.PlaneGeometry(size,size,20,20); const uv=g.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)*size/3,uv.getY(i)*size/3); const m=new THREE.Mesh(g,MF('snow',0)); m.rotation.x=-Math.PI/2; scene.add(m); R.ray.push(m); }
function perimeter(L){ const m=M('drift'); solid(0,2,-L-1,2*L+4,4,2,m,{ts:4}); solid(0,2,L+1,2*L+4,4,2,m,{ts:4}); solid(-L-1,2,0,2,4,2*L+4,m,{ts:4}); solid(L+1,2,0,2,4,2*L+4,m,{ts:4}); R.bound=L-1.5; }
function beacon(ex){ const ey=R.terrain?R.terrain(ex.x,ex.z):0; const pole=new THREE.Mesh(new THREE.BoxGeometry(0.15,4,0.15),MC(0x30363a)); pole.position.set(ex.x,ey+2,ex.z); scene.add(pole); const lamp=new THREE.Mesh(new THREE.BoxGeometry(0.45,0.45,0.45),MB(0x67f0a4)); lamp.position.set(ex.x,ey+4.2,ex.z); scene.add(lamp); ex.lamp=lamp;
  const ring=new THREE.Mesh(new THREE.RingGeometry(ex.r-0.25,ex.r,24),MB(0x67f0a4,{transparent:true,opacity:0.5,side:THREE.DoubleSide})); ring.rotation.x=-Math.PI/2; ring.position.set(ex.x,ey+0.05,ex.z); scene.add(ring); }
function aurora(){ for(let i=0;i<3;i++){ const g=new THREE.PlaneGeometry(260,26,30,1); const p=g.attributes.position; for(let k=0;k<p.count;k++){ const x=p.getX(k); p.setZ(k,Math.sin(x*0.03+i)*22); } const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:i===1?0x8a6cff:0x4dffa6,transparent:true,opacity:0.14,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,fog:false,depthWrite:false})); m.position.set(-30+i*30,70+i*8,-160+i*12); m.rotation.x=0.35; scene.add(m); R.aur.push(m); } }
