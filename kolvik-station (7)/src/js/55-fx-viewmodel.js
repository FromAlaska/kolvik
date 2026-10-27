/* 55-fx-viewmodel: particles, tracers, snow, weapon viewmodel */
/* ---- fx ---- */
const FXGEO=new THREE.BoxGeometry(0.07,0.07,0.07);
function puff(pt,col,n=6,spd=2){ for(let i=0;i<n;i++){ const m=new THREE.Mesh(FXGEO,MB(col)); m.position.copy(pt); scene.add(m); R.fx.push({m,vx:rr(-1,1)*spd,vy:rr(0.2,1.4)*spd,vz:rr(-1,1)*spd,life:0.45}); } }
function tracer(ax,ay,az,bx,by,bz,col){ const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ax,ay,az),new THREE.Vector3(bx,by,bz)]); const l=new THREE.Line(g,new THREE.LineBasicMaterial({color:col,transparent:true,opacity:0.9})); scene.add(l); R.tr.push({l,life:0.09}); }
function flashAt(x,y,z,own){ if(OPTS.flash==='off') return; flash.position.set(x,y,z); flash.intensity=OPTS.flash==='full'?2.2:(own?0.3:0.6); }
function updFx(dt){
  for(let i=R.fx.length-1;i>=0;i--){ const f=R.fx[i]; f.life-=dt; f.vy-=9*dt; f.m.position.x+=f.vx*dt; f.m.position.y+=f.vy*dt; f.m.position.z+=f.vz*dt; f.m.scale.setScalar(Math.max(0.01,f.life/0.45)); if(f.life<=0){ scene.remove(f.m); R.fx.splice(i,1); } }
  for(let i=R.tr.length-1;i>=0;i--){ const t=R.tr[i]; t.life-=dt; t.l.material.opacity=Math.max(0,t.life/0.09); if(t.life<=0){ scene.remove(t.l); t.l.geometry.dispose(); t.l.material.dispose(); R.tr.splice(i,1); } }
  flash.intensity=Math.max(0,flash.intensity-dt*28);
  for(const h of R.heaters) h.g.forEach(g=>g.scale.y=0.85+Math.sin(R.t*9+h.x)*0.15);
  for(const ex of R.extracts) if(ex.lamp) ex.lamp.visible=(R.t%1.2)<0.75;
  for(let i=0;i<R.aur.length;i++) R.aur[i].material.opacity=(0.1+Math.sin(R.t*0.4+i*2)*0.05)*(R.aurMul||1);
}
function makeSnow(n,spd){ const g=new THREE.BufferGeometry(); const p=new Float32Array(n*3); for(let i=0;i<n;i++){ p[i*3]=rr(-25,25); p[i*3+1]=rr(0,22); p[i*3+2]=rr(-25,25); } g.setAttribute('position',new THREE.BufferAttribute(p,3)); const pts=new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:0.09,transparent:true,opacity:0.9})); pts.userData.spd=spd; pts.frustumCulled=false; scene.add(pts); return pts; }
function updSnow(dt){ const a=snow.geometry.attributes.position, p=a.array, spd=snow.userData.spd; for(let i=0;i<p.length;i+=3){ p[i+1]-=spd*dt; p[i]+=Math.sin(R.t+i)*0.3*dt+spd*0.25*dt; if(p[i+1]<0){ p[i+1]=22; p[i]=rr(-25,25); p[i+2]=rr(-25,25); } if(p[i]>25) p[i]-=50; } a.needsUpdate=true; snow.position.set(P.pos.x,(P.y||0)-4,P.pos.z); }

/* ---- viewmodel ---- */
// receiver top height, optic mount position, iron sight posts (front/rear z), built-in optics
const GUNGEO={
 makar:{top:.028,oz:-.05,front:-.135,rear:.005},
 vintik:{top:.035,oz:-.1,front:-.2,rear:.05},
 tundra:{top:.028,oz:-.04,front:-.62,rear:null},
 akr:{top:.035,oz:-.12,front:-.42,rear:-.01},
 nord:{top:.02,oz:-.12,builtin:{kind:'scope',y:.07}},
 kestrel:{top:.04,oz:-.1,builtin:{kind:'prism',y:.085}},
 nordlys:{top:.054,oz:-.12,front:-.5,rear:-.02},
 jarlmg:{top:.057,oz:-.1,front:-.5,rear:-.02},
};
function buildGun(id,w,o={}){
  const g=new THREE.Group(); if(w===undefined) w=curW();
  let dark=MC(0x2a2d30), wood=MC(0x6b4426), steel=MC(0x5a5e62), olive=MC(0x4a5236), snowM=MC(0xc9d1d4);
  const glove=(S&&S.cos)?cosMat(o.gloves||S.cos.fit.gloves):MC(0x3a3a2c);
  const skin=o.skin||(S&&S.cos&&id?gunSkin(id):'w_factory'); if(skin!=='w_factory'&&COSM[skin]){ const A=cosMat(skin); wood=olive=steel=snowM=A; dark=cosMat(skin,'dk'); }
  const B=(w,h,d,x,y,z,m,rx=0)=>{ const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); b.position.set(x,y,z); b.rotation.x=rx; g.add(b); return b; };
  if(!id){ B(.09,.08,.1,.1,0,0,glove); B(.09,.08,.1,-.14,-.02,.06,glove); g.userData.fists=true; return g; }
  let muz=-0.3;
  const att=(w&&w.att)||{}; const geo=GUNGEO[id]; const pt={}; // moving parts: mag, slide, pump, bolt, and the two hands
  if(id==='makar'){ pt.slide=B(.035,.055,.17,0,0,-.06,dark); B(.03,.09,.04,0,-.06,.01,dark,.2); pt.mag=B(.024,.07,.03,0,-.072,.013,steel,.2); muz=-.15; }
  if(id==='vintik'){ B(.05,.07,.28,0,0,-.08,dark); B(.022,.022,.12,0,.012,-.28,steel); pt.mag=B(.03,.15,.04,0,-.1,-.08,dark); B(.02,.03,.18,0,-.01,.14,steel); B(.035,.08,.04,0,-.07,.02,dark,.2); muz=-.34; }
  if(id==='akr'){ B(.05,.07,.36,0,0,-.1,steel); B(.056,.06,.16,0,-.004,-.33,wood); B(.022,.022,.16,0,.012,-.47,dark); pt.mag=B(.035,.17,.06,0,-.12,-.13,dark,.3); B(.045,.07,.22,0,-.02,.17,wood); B(.035,.08,.04,0,-.07,.03,dark,.2); muz=-.55; }
  if(id==='nord'){ B(.05,.06,.82,0,-.01,-.15,wood); B(.022,.022,.34,0,.02,-.63,dark); const bp=new THREE.Group(); bp.position.set(0,.02,0); g.add(bp); const bh=new THREE.Mesh(new THREE.BoxGeometry(.06,.03,.03),steel); bh.position.set(.04,0,0); bp.add(bh); const bk=new THREE.Mesh(new THREE.BoxGeometry(.018,.018,.018),dark); bk.position.set(.075,0,0); bp.add(bk); pt.bolt=bp; muz=-.8; }
  if(id==='kestrel'){ B(.055,.08,.5,0,0,-.12,olive); B(.024,.024,.3,0,.015,-.5,dark); pt.mag=B(.04,.12,.07,0,-.1,-.12,dark); B(.05,.08,.24,0,-.01,.22,olive); B(.035,.08,.04,0,-.07,.03,dark,.2); muz=-.66; }
  if(id==='jarlmg'){ B(.07,.09,.46,0,0,-.08,dark); B(.03,.03,.42,0,.015,-.5,steel); B(.05,.05,.26,0,.015,-.42,dark); pt.mag=B(.09,.09,.1,.06,-.06,-.12,olive); B(.05,.09,.22,0,-.02,.24,dark); B(.035,.08,.04,0,-.07,.03,dark,.2); B(.06,.012,.34,0,.051,-.1,dark); B(.012,.12,.012,-.03,-.09,-.62,steel,.6); B(.012,.12,.012,.03,-.09,-.62,steel,.6); muz=-.72; }
  if(id==='nordlys'){ B(.058,.085,.54,0,0,-.12,snowM); B(.026,.026,.34,0,.015,-.55,dark); B(.032,.032,.1,0,.015,-.74,steel); pt.mag=B(.045,.14,.07,0,-.11,-.12,dark,.15); B(.055,.085,.26,0,-.01,.24,snowM); B(.035,.08,.04,0,-.07,.03,dark,.2); B(.06,.012,.3,0,.048,-.12,dark); muz=-.8; }
  if(id==='tundra'){ B(.05,.06,.3,0,0,-.05,dark); B(.03,.03,.46,0,.012,-.42,steel); pt.pump=B(.05,.045,.16,0,-.04,-.38,wood); B(.045,.07,.22,0,-.02,.2,wood); B(.035,.08,.04,0,-.07,.03,dark,.2); muz=-.66; }
  if(!o.noHands) vmHands(g,pt,id,glove,o);
  if(att.muzzle){ B(.034,.034,.16,0,.012,muz-.06,dark); muz-=.14; }
  if(att.mag){ const ext=B(.035,.08,.06,0,-.19,-.13,dark,.3); if(pt.mag&&id!=='tundra'){ g.updateMatrixWorld(true); pt.mag.attach(ext); } } // an extended mag moves with the mag
  // sights: whatever is mounted, its sight line sits at userData.sightY so aiming puts it on screen center
  const opt=att.optic?ITEMS[att.optic.id]:null;
  if(opt){ const y=geo.top+.04; addOptic(g,B,opt.reticle,y,geo.oz); g.userData.sightY=y; }
  else if(geo.builtin){ addOptic(g,B,geo.builtin.kind,geo.builtin.y,geo.oz); g.userData.sightY=geo.builtin.y; }
  else {
    const y=geo.top+.02, ph=.02;
    B(.005,ph,.008,0,y-ph/2,geo.front,dark);
    if(geo.rear!=null){ B(.008,ph,.012,-.011,y-ph/2,geo.rear,dark); B(.008,ph,.012,.011,y-ph/2,geo.rear,dark); B(.03,.006,.012,0,y-ph+.003,geo.rear,dark); }
    else { const bead=new THREE.Mesh(new THREE.BoxGeometry(.008,.008,.008),MB(0xe8e4d0)); bead.position.set(0,y-.004,geo.front); g.add(bead); }
    g.userData.sightY=y;
  }
  const fl=OPTS.flash==='full'?new THREE.Mesh(new THREE.BoxGeometry(.08,.08,.08),MB(0xffd27a)):new THREE.Mesh(new THREE.BoxGeometry(.045,.045,.045),MB(0xff9a50,{transparent:true,opacity:.35})); fl.position.set(0,.012,muz); fl.visible=false; g.add(fl); g.userData.flash=fl;
  // remember where every moving part rests, so the animation (56-vm-anim.js) can move it and put it back
  for(const k in pt) if(pt[k]) pt[k].userData.rest={p:pt[k].position.clone(),r:pt[k].rotation.clone()};
  g.userData.pt=pt; g.userData.gunId=id;
  return g;
}
// grip and support hand spots on each gun (gun space: x right, y up, z toward you), and the forearms in your coat sleeve
const VM_HANDS={ makar:{r:[0,-.075,.025],l:[-.04,-.092,.045]}, vintik:{r:[0,-.08,.035],l:[-.01,-.04,-.19]}, akr:{r:[0,-.085,.045],l:[-.005,-.045,-.33]}, kestrel:{r:[0,-.085,.045],l:[0,-.05,-.31]},
  nordlys:{r:[0,-.085,.045],l:[0,-.05,-.34]}, jarlmg:{r:[0,-.09,.05],l:[-.01,-.065,-.36]}, tundra:{r:[0,-.07,.08],l:[0,-.075,-.38]}, nord:{r:[0,-.07,.1],l:[0,-.05,-.36]} };
function vmHands(g,pt,id,glove,o){
  const coat=(S&&S.cos)?cosMat(o.coat||S.cos.fit.coat):MC(0x4d5a48), cuff=MC(0x1e2224), H=VM_HANDS[id]||VM_HANDS.akr, Z=new THREE.Vector3(0,0,1);
  const hand=(at,dir,len)=>{ const h=new THREE.Group(); h.position.set(...at); g.add(h);
    h.add(new THREE.Mesh(new THREE.BoxGeometry(.07,.072,.11),glove));
    const d=new THREE.Vector3(...dir).normalize(), q=new THREE.Quaternion().setFromUnitVectors(Z,d);
    const c=new THREE.Mesh(new THREE.BoxGeometry(.078,.078,.04),cuff); c.position.copy(d).multiplyScalar(.07); c.quaternion.copy(q); h.add(c);
    const a=new THREE.Mesh(new THREE.BoxGeometry(.084,.084,len),coat); a.position.copy(d).multiplyScalar(.09+len/2); a.quaternion.copy(q); h.add(a); return h; };
  pt.rh=hand(H.r,[.35,-.55,1],.42);
  pt.lh=hand(H.l,id==='makar'?[-.45,-.65,1]:[-.5,-.5,1],id==='makar'?.3:.5);
  // a shell for the shotgun's hand to feed, hidden until it reloads
  if(id==='tundra'){ const sh=new THREE.Mesh(new THREE.BoxGeometry(.022,.022,.06),MC(0xb8402d)); sh.position.set(0,.03,-.03); sh.visible=false; pt.lh.add(sh); pt.shell=sh; }
}
// optic bodies are open frames around a tinted pane, so you see the world (and the reticle) through them
function addOptic(g,B,kind,y,z){
  const blk=MC(0x1d2023), body=MC(0x2e3337);
  const pane=(w,h,zz,col)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide})); m.position.set(0,y,zz); g.add(m); };
  if(kind==='dot'){ const W=.048,H=.042,L=.042; B(.026,.016,.05,0,y-H/2-.014,z,blk); B(.006,H,L,-W/2-.003,y,z,body); B(.006,H,L,W/2+.003,y,z,body); B(W+.012,.007,L,0,y+H/2+.0035,z,body); B(W+.012,.007,L,0,y-H/2-.0035,z,body); pane(W,H,z-L/2,0x7fe0ff); }
  else if(kind==='holo'){ const W=.064,H=.046,L=.05; B(.07,.02,.1,0,y-H/2-.012,z+.015,blk); B(.012,.012,.02,.03,y-H/2-.012,z+.07,MC(0x6a6f72)); B(.006,H,L,-W/2-.003,y,z,body); B(.006,H,L,W/2+.003,y,z,body); B(W+.012,.008,L+.012,0,y+H/2+.004,z,body); pane(W,H,z-L/2,0xffb070); }
  else if(kind==='prism'){ const W=.036,H=.036,L=.09; B(.03,.014,.06,0,y-H/2-.018,z,blk); B(.01,H,L,-W/2-.005,y,z,body); B(.01,H,L,W/2+.005,y,z,body); B(W+.02,.012,L,0,y+H/2+.006,z,body); B(W+.02,.012,L,0,y-H/2-.006,z,body); pane(W,H,z-L/2,0x9fd0ff); }
  else { B(.04,.04,.24,0,y,z,blk); B(.05,.05,.04,0,y,z-.13,blk); B(.046,.046,.04,0,y,z+.1,blk); B(.012,.03,.012,0,y-.03,z-.05,blk); B(.012,.03,.012,0,y-.03,z+.04,blk); }
}
const RETICLES={
 dot:'<svg viewBox="-20 -20 40 40" width="40" height="40"><circle r="5" fill="#ff3b30" opacity=".16"/><circle r="2.3" fill="#ff3b30"/></svg>',
 holo:'<svg viewBox="-40 -40 80 80" width="80" height="80" fill="none" stroke="#ff4433" stroke-width="1.6"><circle r="26"/><path d="M0 -26v5M0 26v-5M-26 0h5M26 0h-5"/><circle r="1.8" fill="#ff4433" stroke="none"/></svg>',
 prism:'<svg viewBox="-120 -70 240 140" width="480" height="280" fill="none" stroke-linecap="square"><path d="M-120 0H-34M34 0H120" stroke="#0b0d0e" stroke-width="1.4"/><path d="M-8 8 L0 0 L8 8" stroke="#ff6a2a" stroke-width="2.4"/><path d="M0 8V20M-5 30H5M-4 42H4M-3 54H3" stroke="#0b0d0e" stroke-width="1.3"/></svg>',
};
function scopeSvg(){ let dots=''; for(const v of [-24,-16,-8,8,16,24]) dots+=`<circle cx="${v}" cy="0" r=".9"/><circle cx="0" cy="${v}" r=".9"/>`; return `<svg viewBox="-100 -100 200 200" class="scopesvg"><g fill="none" stroke="#000"><path d="M-100 0H100M0 -100V100" stroke-width=".35"/><path d="M-100 0H-32M32 0H100M0 32V100M0 -100V-32" stroke-width="2.4"/></g><g fill="#000">${dots}</g><circle r=".7" fill="#d4241c"/></svg>`; }
function setReticle(kind){ if(!R||R.ret===kind) return; R.ret=kind; const el=$('#reticle'); el.hidden=!kind; el.innerHTML=kind?RETICLES[kind]:''; $('#prismRing').hidden=kind!=='prism'; }
function syncVM(){ const w=curW(); const id=w?w.id:null; const key=(w?(w.uid+'|'+Object.values(w.att||{}).map(a=>a?a.id:'').join(',')+'|'+gunSkin(w.id)):'fists')+'|'+(S.cos?S.cos.fit.gloves:''); if(key===vmUid&&vmGun) return; if(vmGun){ vmScene.remove(vmGun); vmGun.traverse(o=>o.geometry&&o.geometry!==FXGEO&&o.geometry.dispose()); } vmGun=buildGun(id,w); vmScene.add(vmGun); vmUid=key; }

// an enemy's muzzle flash as a bright point that shows through fog, so you can see where shots come from
const SPARKS=[]; let _sparkMat=null;
function muzzleSpark(x,y,z,dist){ if(!scene) return; if(!_sparkMat) _sparkMat=new THREE.SpriteMaterial({color:0xffe0a0,fog:false,transparent:true,depthWrite:false});
  let s=SPARKS.find(q=>!q.parent); if(!s){ s=new THREE.Sprite(_sparkMat); SPARKS.push(s); } const k=Math.max(0.35,dist*0.012)*(OPTS.flash==='off'?0.6:1); s.scale.set(k,k,1); s.position.set(x,y,z); scene.add(s); setTimeout(()=>{ if(s.parent) s.parent.remove(s); },70); }
