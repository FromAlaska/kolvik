/* 62-squad: squad markers, downed state, revives, spectating */
/* ================= SQUAD: markers, downed state, revives, looting downed mates, spectating ================= */
const _v=new THREE.Vector3();
const mateIds=()=>NET.on?Object.keys(NET.players).filter(id=>isMate(id)&&NET.players[id].st):[];
// squadmates in this raid who are up (not dead, not down) and could pick you up
const matesUp=()=>mateIds().some(id=>{ const st=NET.players[id].st; return !st.dead&&!st.down; });
const DOWN_TIME=60, REVIVE_TIME=4;
function goDown(cause){
  P.down={t:DOWN_TIME,hp:150,cause,by:null}; P.trigger=false; P.adsHeld=false; P.reloadT=0; P.using=null; P.crouch=false; P.sprint=false; P.bleed={}; P.vy=Math.min(P.vy,0);
  if(P.hp.head<=0) P.hp.head=1; if(P.hp.thorax<=0) P.hp.thorax=1;
  if(R.invOpen) closeInv(true); sfxGrunt(0.6,80); P.hurt=1;
  nsend({t:'dbox',cid:'d'+NET.id,x:P.pos.x,z:P.pos.z,name:S.name||'Nomad',items:JSON.parse(JSON.stringify(downItems()))});
  nsend({t:'msg',text:`${S.name||'Nomad'} is down`}); msg(`You are down. A squadmate has ${DOWN_TIME} s to revive you.`);
}
// what a squadmate can take from you while you are down: your guns, helmet, armor and whatever is in your pockets, rig and pack
function downItems(){ const out=[]; for(const sl of ['primary','secondary','helmet','armor']) if(S.eq[sl]) out.push(S.eq[sl]); for(const sl of ['pockets','rig','pack']){ const c=S.eq[sl]; if(c) for(const x of c.items) out.push(x); } return out.map(x=>{ const c=JSON.parse(JSON.stringify(x)); delete c.hid; return c; }); }
function takeMine(uid,from){
  let name=null;
  for(const sl of ['primary','secondary','helmet','armor']) if(S.eq[sl]&&S.eq[sl].uid===uid){ name=ITEMS[S.eq[sl].id].name; S.eq[sl]=null; if(P.slot===sl){ P.slot='fists'; P.reloadT=0; } }
  if(!name) for(const sl of ['pockets','rig','pack']){ const c=S.eq[sl]; if(!c) continue; const i=c.items.findIndex(x=>x.uid===uid); if(i>=0){ name=ITEMS[c.items[i].id].name; c.items.splice(i,1); break; } }
  if(name) msg(`${from&&NET.players[from]?NET.players[from].name:'A squadmate'} took your ${name}`);
}
function revived(from){
  if(!P.down) return; P.down=null; nsend({t:'dboxgone',cid:'d'+NET.id});
  for(const p of PARTS) P.hp[p]=Math.max(P.hp[p],Math.round(MAXHP[p]*0.3)); P.bleed={}; P.hurt=0.3;
  const who=NET.players[from]?NET.players[from].name:'A squadmate'; msg(`${who} got you back up`); nsend({t:'msg',text:`${S.name||'Nomad'} is back up`}); sfxExtracted();
}
function reviveTarget(){
  if(!NET.on||P.dead||P.down) return null; let best=null,bd=2.3;
  for(const id of mateIds()){ const q=NET.players[id], st=q.st; if(!st.down||st.dead) continue; const gp=q.g?q.g.position:st; const d=Math.hypot(gp.x-P.pos.x,gp.z-P.pos.z); if(d<bd){ bd=d; best=id; } }
  return best;
}
function updRevive(dt){
  const t=reviveTarget(); const holding=P.keys.KeyF&&!R.invOpen&&t;
  if(holding){ if(!R.rev||R.rev.id!==t){ if(R.rev) nsend({t:'reviving',pid:R.rev.id,on:false}); R.rev={id:t,t:0}; nsend({t:'reviving',pid:t,on:true}); }
    R.rev.t+=dt; if(R.rev.t>=REVIVE_TIME){ nsend({t:'revive',pid:t}); msg(`You got ${NET.players[t].name} back up`); R.rev=null; P.keys.KeyF=false; } }
  else if(R.rev){ nsend({t:'reviving',pid:R.rev.id,on:false}); R.rev=null; }
}
function addDbox(m,from){
  removeDbox(m.cid); const cont={w:8,h:9,items:[]}; for(const it of (m.items||[])){ delete it.hid; place(cont,it); }
  R.conts.push({cid:m.cid,type:'body',name:`${m.name} (down)`,x:m.x,z:m.z,mesh:null,cont,opened:true,body:true,mate:from});
}
function removeDbox(cid){ const i=R.conts.findIndex(c=>c.cid===cid); if(i<0) return; if(R.lootTarget===R.conts[i]&&R.invOpen) closeInv(true); R.conts.splice(i,1); }
// red wedges around the crosshair point at whoever is shooting at you (pale ones for near misses)
function hitDir(x,z,miss){ if(!R) return; R.hitDirs=R.hitDirs||[]; const ex=R.hitDirs.find(h=>Math.hypot(h.x-x,h.z-z)<3); if(ex){ ex.t=1.6; ex.miss=ex.miss&&miss; ex.x=x; ex.z=z; return; } if(R.hitDirs.length>=6) R.hitDirs.shift().el.remove(); const el=document.createElement('div'); el.className='hdir'+(miss?' miss':''); $('#hitdirs').appendChild(el); R.hitDirs.push({x,z,t:1.6,miss,el}); }
function updHitDirs(dt){ if(!R||!R.hitDirs) return; for(let i=R.hitDirs.length-1;i>=0;i--){ const h=R.hitDirs[i]; h.t-=dt; if(h.t<=0||!P){ h.el.remove(); R.hitDirs.splice(i,1); continue; }
  const a=Math.atan2(-(h.x-P.pos.x),-(h.z-P.pos.z)), rel=((a-P.yaw+Math.PI*3)%(Math.PI*2))-Math.PI; h.el.classList.toggle('miss',h.miss);
  h.el.style.transform=`rotate(${-rel}rad)`; h.el.style.opacity=Math.min(1,h.t/0.6); } }
function updMates(){
  const box=$('#mates'); if(!box) return; if(!NET.on||(!mySquad()&&!coopRaid())){ if(box.firstChild) box.innerHTML=''; return; }
  camera.updateMatrixWorld(); const W=innerWidth, H=innerHeight; const seen=new Set();
  for(const id of mateIds()){ const q=NET.players[id], st=q.st; if(st.dead||(R.spec&&R.spec.id===id)) continue; seen.add(id);
    let el=box.querySelector(`[data-m="${id}"]`); if(!el){ el=document.createElement('div'); el.className='matemk'; el.dataset.m=id; box.appendChild(el); }
    const gp=q.g?q.g.position:st; _v.set(gp.x,(st.y||0)+(st.down?0.9:2.15),gp.z).project(camera);
    let x=_v.x, y=_v.y; const behind=_v.z>1; if(behind){ x=-x; y=-1.4; }
    const off=behind||Math.abs(x)>0.94||Math.abs(y)>0.88; if(off){ const m=Math.max(Math.abs(x)/0.94,Math.abs(y)/0.88); x/=m; y/=m; }
    el.style.transform=`translate(${Math.round(clamp((x+1)/2*W,64,W-64))}px,${Math.round(clamp((1-y)/2*H,24,H-24))}px)`;
    const d=Math.round(Math.hypot(gp.x-camera.position.x,gp.z-camera.position.z));
    const txt=st.down?`${esc(q.name)} · DOWN ${st.dt||''}s · ${d} m`:`${esc(q.name)} · ${d} m`; if(el._t!==txt){ el._t=txt; el.innerHTML=`<i></i><span>${txt}</span>`; }
    el.classList.toggle('down',!!st.down); el.classList.toggle('edge',off); }
  for(const el of [...box.children]) if(!seen.has(el.dataset.m)) el.remove();
}
// spectating: after you die, watch through a living squadmate's eyes
function specList(){ return mateIds().filter(id=>!NET.players[id].st.dead); }
function startSpectate(){
  if(!NET.on) return false; const l=specList(); if(!l.length) return false;
  R.spec={id:l[0],yaw:null,pitch:0}; $('#deathfade').style.opacity=0; document.body.classList.add('spectating'); if(document.pointerLockElement) document.exitPointerLock(); specUI(); return true;
}
function specNext(){ const l=specList(); if(!l.length||!R.spec) return; R.spec.id=l[(l.indexOf(R.spec.id)+1)%l.length]; R.spec.yaw=null; specUI(); }
function specUI(){
  const q=NET.players[R.spec.id]; const el=$('#spec'); el.hidden=false; const n=specList().length;
  el.innerHTML=`<span class="lbl">You died · ${esc(R.cause||'')}</span><span class="lbl">Watching</span><b id="specName">${esc(q?q.name:'')}</b><span class="muted" id="specInfo"></span><div class="acts">${n>1?'<button class="btn ghost sm" id="specNext">Next squadmate · Space</button>':''}<button class="btn sm" id="specLeave">Leave raid</button></div>`;
  if($('#specNext')) $('#specNext').onclick=specNext; $('#specLeave').onclick=()=>endRaid('kia',R.cause);
}
function specCam(dt){
  let q=NET.players[R.spec.id];
  if(!q||!q.st||q.st.dead){ const l=specList(); if(!l.length){ endRaid('kia',R.cause); return; } R.spec.id=l[0]; R.spec.yaw=null; specUI(); q=NET.players[R.spec.id]; }
  const st=q.st, gp=q.g?q.g.position:st; const k=Math.min(1,dt*12);
  if(R.spec.yaw==null){ R.spec.yaw=st.yaw; R.spec.pitch=st.p||0; }
  R.spec.yaw=lerpA(R.spec.yaw,st.yaw,k); R.spec.pitch+=((st.p||0)-R.spec.pitch)*k;
  P.pos.x=gp.x; P.pos.z=gp.z; // sounds, snow and culling follow the camera
  camera.position.set(gp.x,(st.y||0)+(st.down?0.42:st.crouch?1.08:1.62),gp.z); camera.rotation.set(R.spec.pitch,R.spec.yaw,st.down?0.35:0);
  if(camera.fov!==72){ camera.fov=72; camera.updateProjectionMatrix(); }
  const info=$('#specInfo'); if(info){ const t=st.heli?'In the helicopter':st.down?`Down · ${st.dt||0} s to be revived`:`Health ${st.hp!=null?st.hp:'?'} / 440`; if(info.textContent!==t) info.textContent=t; }
}
