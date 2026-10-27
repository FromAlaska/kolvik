/* Kolvik Workshop: the preview side.
   /workshop-frame is the game page itself with window.KOLVIK_WORKSHOP set, so every function in src/js is loaded
   (humanoid, walkAnim, buildGun, planeModel, sledModel, heliModel, MC, M, ITEMS...) but the game doesn't boot.
   This file then sets up a viewport and runs a scene: a short script from workshop/scenes/ that the workshop page
   sends over. The page (workshop/index.html) talks to this frame with postMessage; when a file in src/ changes the
   page reloads the frame, and when a scene changes it just sends the new code.

   A scene is plain code with these names available:
     add(obj, x, y, z)         put a THREE object in the scene (returns it)
     remove(obj)
     params({ speed:[8,1,20], coat:'#5a6a4a', armor:true, gun:['akr','makar'] })
                               sliders, colors, toggles and drop-downs in the workshop; read them as p.speed etc.
                               (a value read while the scene is being built rebuilds the scene when you change it;
                               a value read inside onUpdate just changes live)
     onUpdate((dt, t) => {})   runs every frame; dt in seconds, t = scene time
     keys                      keys held down while the preview has focus: keys.KeyW, keys.Space...
     log(...)                  prints to the workshop console
     frame(obj)                point the camera at obj (or everything)
     inRaid(fn)                call a game function that expects to be in a raid (reads R): inRaid(() => animDead(e, dt))
     ws                        extras: ws.camera, ws.scene (the scene's root), ws.THREE, ws.ground(on), ws.sky(hex),
                               ws.lockCamera(fov, near) for a fixed first-person camera (you place it each frame)
   and every function and constant from the game. */
(function(){
'use strict';
const parentWin=window.parent!==window?window.parent:null;
const post=(kw,data)=>{ if(parentWin) parentWin.postMessage(Object.assign({kw},data||{}),location.origin); };

/* ---------- viewport ---------- */
const css=document.createElement('style');
css.textContent='body.kw>*{display:none!important} body.kw{margin:0;background:#0b1215;overflow:hidden} body.kw>#kwView{display:block!important;position:fixed;inset:0;width:100vw;height:100vh;outline:none} body.kw>#kwView.pix{image-rendering:pixelated} body.kw>#kwMsg{display:block!important;position:fixed;left:8px;bottom:8px;right:8px;color:#ffb4a8;font:12px/1.4 ui-monospace,monospace;white-space:pre-wrap;pointer-events:none;text-shadow:0 1px 2px #000}';
document.head.appendChild(css); document.body.classList.add('kw');
const cv=document.createElement('canvas'); cv.id='kwView'; cv.tabIndex=0; document.body.appendChild(cv);
const msgEl=document.createElement('div'); msgEl.id='kwMsg'; document.body.appendChild(msgEl);
const r=new THREE.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true}); r.setPixelRatio(Math.min(2,devicePixelRatio||1));
renderer=r; makeTextures(); // the game's own textures and materials
scene=new THREE.Scene(); camera=new THREE.PerspectiveCamera(50,1,0.05,6000); camera.position.set(4,2.6,6);
const hemi=new THREE.HemisphereLight(0xcfe3ff,0x3a4248,0.95), sun=new THREE.DirectionalLight(0xfff1dd,0.7); sun.position.set(5,9,4); scene.add(hemi,sun);
const SKY={day:0x9fb3bb,night:0x0d1820,studio:0x262c30};
const world=new THREE.Group(); world.name='scene'; scene.add(world);
const overlay=new THREE.Scene(), helpers=new THREE.Group(); overlay.add(helpers); // pivots and the selection box, drawn after the scene and never in wireframe
// the snow and the grid live in their own scene, drawn first, so wireframe mode only changes what you're looking at
const stage=new THREE.Scene(); stage.add(new THREE.HemisphereLight(0xcfe3ff,0x3a4248,0.95)); { const d=new THREE.DirectionalLight(0xfff1dd,0.7); d.position.copy(sun.position); stage.add(d); }
const groundM=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshLambertMaterial({color:0xe2e9ee})); groundM.rotation.x=-Math.PI/2; groundM.position.y=-0.002; groundM.name='ground'; stage.add(groundM);
const grid=new THREE.GridHelper(40,40,0x4a5a62,0x33424a); grid.position.y=0.001; stage.add(grid);
const controls=new THREE.OrbitControls(camera,cv); controls.enableDamping=true; controls.dampingFactor=0.12; controls.target.set(0,1,0);
const wire=new THREE.MeshBasicMaterial({color:0x7fd4ff,wireframe:true});

const K={code:'',name:'',title:'',params:{},order:[],setupRead:new Set(),inSetup:false,updates:[],t:0,speed:1,paused:false,broken:false,
  view:{grid:true,ground:true,pivots:false,wire:false,pix:false,sky:'day'},keys:{},sel:null,selBox:null,framed:false,statT:0,fps:0,frames:0};

function resize(){
  const w=cv.clientWidth||innerWidth, h=cv.clientHeight||innerHeight;
  if(K.view.pix){ const rh=300, rw=Math.round(w*rh/h); r.setPixelRatio(1); r.setSize(rw,rh,false); SNAP.value.set(rw/2.4,rh/2.4); }  // the game's own render size and vertex snap
  else { r.setPixelRatio(Math.min(2,devicePixelRatio||1)); r.setSize(w,h,false); SNAP.value.set(4000,4000); }
  cv.classList.toggle('pix',K.view.pix); camera.aspect=w/h; camera.updateProjectionMatrix();
}
addEventListener('resize',resize);
function applyView(){ grid.visible=K.view.grid; groundM.visible=K.view.ground; stage.background=new THREE.Color(SKY[K.view.sky]||SKY.day); scene.background=null; scene.overrideMaterial=K.view.wire?wire:null; resize(); pivots(); }

/* ---------- errors: game code (mapped to src files by the workshop page) and scene code ---------- */
function report(e,where){
  const info={where,message:String(e&&e.message||e),stack:String(e&&e.stack||'')};
  msgEl.textContent=`${where}: ${info.message}`; post('error',info); console.error(e);
}
for(const e of (window.__kwErrs||[])) post('error',Object.assign({where:'game code'},e));
addEventListener('error',ev=>{ if(ev.error&&ev.error.__kwSeen) return; post('error',{where:'game code',message:ev.message,line:ev.lineno,col:ev.colno,file:ev.filename,stack:String(ev.error&&ev.error.stack||'')}); });

/* ---------- params ---------- */
function defParam(name,spec){
  // spec: [def,min,max,step] → slider · '#rrggbb' or 0xNNNNNN with color:true → color · boolean → toggle · ['a','b'] → choice
  let p;
  if(Array.isArray(spec)&&typeof spec[0]==='number') p={kind:'range',def:spec[0],min:spec[1]!=null?spec[1]:0,max:spec[2]!=null?spec[2]:Math.max(1,spec[0]*2),step:spec[3]||((spec[2]-spec[1])>20?1:0.01)};
  else if(Array.isArray(spec)) p={kind:'choice',def:spec[0],options:spec.map(String)};
  else if(typeof spec==='boolean') p={kind:'toggle',def:spec};
  else if(typeof spec==='string'&&/^#[0-9a-f]{6}$/i.test(spec)) p={kind:'color',def:spec};
  else if(typeof spec==='number') p={kind:'range',def:spec,min:0,max:Math.max(1,Math.abs(spec)*2),step:0.01};
  else p={kind:'text',def:String(spec)};
  // keep the value you set (also across a reload of the preview) as long as it still fits the parameter
  const old=K.params[name], v=old&&old.value, fits=v!==undefined&&(p.kind==='range'?typeof v==='number':p.kind==='toggle'?typeof v==='boolean':p.kind==='choice'?p.options.includes(v):typeof v==='string');
  p.name=name; p.value=old&&(old.kind===p.kind||old.kind==='?')&&fits?v:p.def;
  K.params[name]=p; if(!K.order.includes(name)) K.order.push(name); return p;
}
const readP=name=>{ if(K.inSetup) K.setupRead.add(name); return K.params[name].value; };
function params(spec){ const out={}; for(const [n,s] of Object.entries(spec)){ defParam(n,s); Object.defineProperty(out,n,{get:()=>readP(n),enumerable:true}); } return out; }
function param(name,def,min,max,step){ defParam(name,typeof def==='number'?[def,min,max,step]:def); return ()=>readP(name); }
// colors come back as '#rrggbb'; most game builders want a number
window.hex=c=>typeof c==='number'?c:parseInt(String(c).replace('#',''),16);

/* ---------- the scene ---------- */
function clearWorld(){ for(const o of [...world.children]) world.remove(o); world.position.set(0,0,0); world.rotation.set(0,0,0); world.scale.set(1,1,1); select(null); }
function frameObj(obj){
  const box=new THREE.Box3().setFromObject(obj||world); if(box.isEmpty()) return;
  const c=box.getCenter(new THREE.Vector3()), size=box.getSize(new THREE.Vector3()).length()||2;
  const dir=camera.position.clone().sub(controls.target).normalize(); if(!isFinite(dir.x)||dir.lengthSq()<0.5) dir.set(0.55,0.35,0.75).normalize();
  // back off until the bounding sphere fits the vertical field of view (the narrower one), with a little margin
  const dist=(size/2)/Math.sin(camera.fov*Math.PI/360)*1.08+0.2;
  controls.target.copy(c); camera.position.copy(c).addScaledVector(dir,dist); camera.near=Math.max(0.02,size/200); camera.far=Math.max(2000,size*50); camera.updateProjectionMatrix();
}
function run(){
  clearWorld(); K.updates=[]; K.order=[]; K.setupRead=new Set(); K.t=0; K.broken=false; msgEl.textContent='';
  // a scene may change the camera (the viewmodel scene locks it at eye height): put it back for the next one
  if(K.camLocked){ camera.fov=50; camera.near=0.05; camera.updateProjectionMatrix(); controls.enabled=true; K.camLocked=false; K.framed=false; }
  const ctx={
    add:(o,x,y,z)=>{ if(!o||!o.isObject3D) throw new Error('add() needs a THREE object (did you pass the {g, lp, rp} from humanoid() instead of .g?)'); if(Array.isArray(x)) [x,y,z]=x; else if(x&&typeof x==='object') ({x,y,z}=x); if(x!=null) o.position.set(+x||0,+y||0,+z||0); world.add(o); return o; },
    remove:o=>{ if(o&&o.parent) o.parent.remove(o); },
    params, param, onUpdate:fn=>K.updates.push(fn), keys:K.keys,
    log:(...a)=>post('log',{text:a.map(v=>typeof v==='string'?v:(()=>{ try{ return JSON.stringify(v); }catch(e){ return String(v); } })()).join(' ')}),
    frame:o=>frameObj(o),
    // some game functions expect to be inside a raid (they read R.terrain and the like): this gives them a stand-in for one call
    inRaid:fn=>{ const was=R; if(!was) R={terrain:null,enemies:[],targets:[],ray:[],planes:[],t:K.t,D:DIFF.normal,cond:{}}; try{ return fn(); } finally{ R=was; } },
    ws:{camera,scene:world,THREE,renderer:r,controls,time:()=>K.t,lockCamera:(fov,near)=>{ K.camLocked=true; K.framed=true; controls.enabled=false; camera.fov=fov||58; camera.near=near||0.01; camera.updateProjectionMatrix(); },ground:on=>{ K.view.ground=!!on; applyView(); },sky:h=>{ stage.background=new THREE.Color(h); }},
  };
  K.inSetup=true;
  try{
    const fn=(0,eval)('(function(add,remove,params,param,onUpdate,keys,log,frame,inRaid,ws){'+K.code+'\n})\n//# sourceURL=scenes/'+K.name);
    fn(ctx.add,ctx.remove,ctx.params,ctx.param,ctx.onUpdate,ctx.keys,ctx.log,ctx.frame,ctx.inRaid,ctx.ws);
  }catch(e){ e.__kwSeen=true; report(e,'scene'); K.broken=true; }
  K.inSetup=false;
  post('params',{list:K.order.map(n=>K.params[n])});
  const sz=new THREE.Box3().setFromObject(world).getSize(new THREE.Vector3()).length();
  if(!K.camLocked&&(!K.framed||(K.lastSize&&sz&&(sz/K.lastSize>2.2||sz/K.lastSize<0.45)))){ K.framed=true; frameObj(); } if(sz) K.lastSize=sz;
  pivots(); sendTree();
}
function step(dt){ K.t+=dt; for(const f of K.updates){ try{ f(dt,K.t); }catch(e){ e.__kwSeen=true; report(e,'onUpdate'); K.broken=true; post('state',{paused:true,broken:true}); break; } } }
// jump to time T: rebuild and run the updates in 1/60 s steps (scenes that use Math.random() won't land on exactly the same frame)
function seek(T){ run(); const n=Math.min(Math.round(T*60),3600); for(let i=0;i<n&&!K.broken;i++) step(1/60); }

/* ---------- inspector: scene tree, selection, live transforms ---------- */
function nodeName(o){ const base=o.isMesh?(o.geometry&&o.geometry.type||'Mesh').replace('Geometry','').replace('Buffer',''):o.type; return o.name||(o.userData&&typeof o.userData.part==='string'?`${base} (${o.userData.part})`:base); }
function sendTree(){ const out=[]; const walk=(o,d)=>{ if(out.length>600) return; out.push({id:o.id,name:nodeName(o),type:o.type,d,kids:o.children.length,ud:Object.keys(o.userData||{}).filter(k=>k!=='part').slice(0,4)}); if(d<6) for(const c of o.children) walk(c,d+1); }; for(const c of world.children) walk(c,0); post('tree',{nodes:out,sel:K.sel&&K.sel.id}); }
function select(o){ K.sel=o||null; if(K.selBox){ helpers.remove(K.selBox); K.selBox=null; } if(o){ K.selBox=new THREE.BoxHelper(o,0xffb000); helpers.add(K.selBox); } sendSel(); }
const r3=v=>Math.round(v*1000)/1000;
function sendSel(){ const o=K.sel; post('sel',o?{id:o.id,name:nodeName(o),type:o.type,pos:o.position.toArray().map(r3),rot:[o.rotation.x,o.rotation.y,o.rotation.z].map(r3),scale:o.scale.toArray().map(r3),visible:o.visible,ud:Object.keys(o.userData||{})}:{id:null}); }
function pivots(){ for(const h of [...helpers.children]) if(h.userData.pivot) helpers.remove(h); if(!K.view.pivots) return;
  // a small axis cross on every Group: those are the joints the game rotates to animate (legs, rotors, turrets)
  world.traverse(o=>{ if(o.isGroup&&o!==world){ const a=new THREE.AxesHelper(0.35); a.userData.pivot=o; a.material.depthTest=false; a.renderOrder=9; helpers.add(a); } }); }
const ray=new THREE.Raycaster(), ndc=new THREE.Vector2(); let down=null;
cv.addEventListener('pointerdown',e=>{ down=[e.clientX,e.clientY]; cv.focus(); });
cv.addEventListener('pointerup',e=>{ if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>4) return; const b=cv.getBoundingClientRect(); ndc.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1); ray.setFromCamera(ndc,camera);
  const hit=ray.intersectObjects(world.children,true).find(h=>h.object.visible); select(hit?hit.object:null); post('picked',{id:hit?hit.object.id:null}); });
addEventListener('keydown',e=>{ K.keys[e.code]=true; if(e.code==='Space'||e.code.startsWith('Arrow')) e.preventDefault(); });
addEventListener('keyup',e=>{ K.keys[e.code]=false; });
addEventListener('blur',()=>{ for(const k in K.keys) K.keys[k]=false; });

/* ---------- messages from the workshop page ---------- */
addEventListener('message',ev=>{
  if(ev.origin!==location.origin||!ev.data||!ev.data.kw) return; const m=ev.data;
  switch(m.kw){
    case 'init':
      Object.assign(K.view,m.view||{}); K.speed=m.speed||1; K.paused=!!m.paused;
      if(m.cam){ camera.position.fromArray(m.cam.pos); controls.target.fromArray(m.cam.target); K.framed=true; }
      for(const [n,v] of Object.entries(m.paramValues||{})) K.params[n]={kind:'?',value:v};
      applyView(); if(m.code!=null){ K.code=m.code; K.name=m.name; if(m.t) seek(m.t); else run(); } break;
    case 'scene': K.code=m.code; K.name=m.name; if(m.reframe) K.framed=false; run(); break;
    case 'play': K.paused=false; if(K.broken){ run(); } break;
    case 'pause': K.paused=true; break;
    case 'speed': K.speed=m.value; break;
    case 'step': K.paused=true; if(!K.broken) step(1/60); break;
    case 'restart': run(); break;
    case 'seek': seek(m.t); break;
    case 'param': { const p=K.params[m.name]; if(!p) break; p.value=m.value; if(K.setupRead.has(m.name)){ const t=K.t; seek(Math.min(t,30)); } break; }
    case 'view': Object.assign(K.view,m.view); applyView(); break;
    case 'frame': frameObj(K.sel||null); break;
    case 'select': { let o=null; world.traverse(x=>{ if(x.id===m.id) o=x; }); select(o); break; }
    case 'parent': if(K.sel&&K.sel.parent&&K.sel.parent!==world) select(K.sel.parent); post('picked',{id:K.sel&&K.sel.id}); break;
    case 'xform': { const o=K.sel; if(!o) break; if(m.pos) o.position.fromArray(m.pos); if(m.rot) o.rotation.set(...m.rot); if(m.scale) o.scale.fromArray(m.scale); if(m.visible!=null) o.visible=m.visible; break; }
    case 'tree': sendTree(); break;
    case 'shot': post('shot',{png:cv.toDataURL('image/png')}); break;
  }
});

/* ---------- loop ---------- */
let last=performance.now();
function loop(now){
  requestAnimationFrame(loop); const dt=Math.min(0.1,(now-last)/1000); last=now;
  if(!K.paused&&!K.broken) step(dt*K.speed);
  controls.update(); if(K.selBox) K.selBox.update();
  for(const h of helpers.children) if(h.userData.pivot){ const o=h.userData.pivot; o.updateWorldMatrix(true,false); h.position.setFromMatrixPosition(o.matrixWorld); h.quaternion.setFromRotationMatrix(o.matrixWorld); }
  r.autoClear=true; r.render(stage,camera); r.autoClear=false; r.render(scene,camera); K.calls=r.info.render.calls; K.tris=K.view.wire?countTris():r.info.render.triangles; r.autoClear=false; r.render(overlay,camera);
  K.frames++; K.statT+=dt;
  if(K.statT>=0.25){ K.fps=Math.round(K.frames/K.statT); K.frames=0; K.statT=0;
    post('stats',{fps:K.fps,t:K.t,calls:K.calls,tris:K.tris,objects:countObjs(),paused:K.paused,broken:K.broken,cam:{pos:camera.position.toArray().map(r3),target:controls.target.toArray().map(r3)}});
    if(K.sel) sendSel(); }
}
function countTris(){ let n=0; world.traverse(o=>{ if(o.isMesh&&o.visible&&o.geometry){ const g=o.geometry; n+=(g.index?g.index.count:(g.attributes.position?g.attributes.position.count:0))/3; } }); return Math.round(n); }
function countObjs(){ let n=0; world.traverse(()=>n++); return n-1; }
resize(); applyView(); requestAnimationFrame(loop);
window.Workshop={run,seek,K,world,controls,camera};
post('ready',{});
})();
