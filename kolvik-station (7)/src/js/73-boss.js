/* 73-boss: Jarl Hrafn boss fight */
/* ================= BOSS FIGHT: Jarl Hrafn at Fort Ravnskar ================= */
// the host (or a solo player) runs the fight and sends events; everyone applies them the same way
const coopRaid=()=>!!(R&&MAPS[R.map]&&MAPS[R.map].coop);
function bossEv(m){ if(NET.on) nsend(Object.assign({t:'boss'},m)); applyBossEv(m,false); }
function nearestTgt(e){ let best=null,bd=1e9; for(const t of R.tgts){ const d=Math.hypot(t.x-e.pos.x,t.z-e.pos.z); if(d<bd){ bd=d; best=t; } } return best; }
function applyBossEv(m,replay){
  if(!R) return; const B=R.boss;
  if(m.k==='wake'&&B){ B.awake=true; if(m.p) B.maxHp=m.p; if(!replay){ msg('Jarl Hrafn has woken. Bring him down together.'); stinger('down'); } }
  else if(m.k==='phase'&&B){ B.phase=m.p; B.e.enraged=m.p>=3; if(!replay) msg(m.p===2?'The Jarl calls his huskarls to the fort':'The Jarl is enraged: faster fire, more mortars'); }
  else if(m.k==='wave'){ for(const it of (m.list||[])){ const [x,z,kind]=it; if(!EK[kind]) continue; const n0=R.enemies.length; spawnEnemy(+x||0,+z||0,kind); const ne=R.enemies[n0]; if(!ne) continue; R.targets.push(...ne.parts); if(!NET.on||NET.host){ ne.state='combat'; const t=nearestTgt(ne); if(t){ ne.lastSeen={x:t.x,z:t.z}; ne.lastSeen0=true; } } } }
  else if(m.k==='mortar'){ if(!replay) addMortar(m.x,m.z,m.d||2.4); }
  else if(m.k==='dead') bossDown(replay);
}
function updBoss(dt){
  const B=R.boss; if(!B||B.e.dead) return; const e=B.e;
  if(!B.awake){ if(e.sees||e.hp<B.maxHp||R.tgts.some(t=>Math.hypot(t.x-e.pos.x,t.z-e.pos.z)<34)||R.t>MAPS[R.map].time*0.45){ const n=1+(NET.on?Object.keys(NET.players).length:0); const mx=Math.round(e.k.hp*(1+0.55*(n-1))*R.D.hp), lost=B.maxHp-e.hp; B.maxHp=mx; e.hp=mx-lost; e.state='combat'; bossEv({k:'wake',p:mx}); } return; }
  const frac=e.hp/B.maxHp;
  if(B.phase===1&&frac<0.66) bossPhase(2); else if(B.phase===2&&frac<0.33) bossPhase(3);
  B.mortT-=dt; if(B.mortT<=0){ B.mortT=(B.phase===3?5:B.phase===2?7:10)*rr(0.85,1.15)/Math.sqrt(R.D.acc);
    const ts=R.tgts.filter(t=>!t.grace&&Math.hypot(t.x-e.pos.x,t.z-e.pos.z)<85); for(let i=0;i<Math.min(ts.length,B.phase>=2?2:1);i++){ const t=ts.splice(Math.floor(rand()*ts.length),1)[0]; bossEv({k:'mortar',x:+(t.x+rr(-2,2)).toFixed(1),z:+(t.z+rr(-2,2)).toFixed(1),d:2.4}); } }
}
function bossPhase(ph){ bossEv({k:'phase',p:ph}); const n=1+(NET.on?Object.keys(NET.players).length:0); const gates=[[0,9],[-35,-25],[35,-25],[0,-28]]; const list=[]; const cnt=Math.round((2+n)*R.D.count); for(let i=0;i<cnt;i++){ const g=gates[i%gates.length]; list.push([+(g[0]+rr(-3,3)).toFixed(1),+(g[1]+rr(-3,3)).toFixed(1),'huskarl']); } bossEv({k:'wave',list}); }
function addMortar(x,z,d){
  const ring=new THREE.Mesh(new THREE.RingGeometry(3.7,4.6,28),new THREE.MeshBasicMaterial({color:0xff3b30,transparent:true,opacity:0.6,side:THREE.DoubleSide,depthWrite:false,fog:false})); ring.rotation.x=-Math.PI/2; ring.position.set(x,0.08,z); scene.add(ring);
  (R.mortars=R.mortars||[]).push({x,z,t:d,ring}); const dd=Math.hypot(P.pos.x-x,P.pos.z-z); if(dd<40) sfxTone(1500,d,0.05*Math.max(0.2,1-dd/40),'sine',380);
}
function updMortars(dt){
  if(!R.mortars) return;
  for(let i=R.mortars.length-1;i>=0;i--){ const m=R.mortars[i]; m.t-=dt; m.ring.material.opacity=0.3+0.35*Math.abs(Math.sin(m.t*9)); if(m.t>0) continue;
    scene.remove(m.ring); m.ring.geometry.dispose(); m.ring.material.dispose(); R.mortars.splice(i,1);
    const pt=new THREE.Vector3(m.x,0.4,m.z); puff(pt,0xffa040,14,4.5); puff(pt,0x4a4a4a,10,3); flashAt(m.x,1.2,m.z); const dd=Math.hypot(P.pos.x-m.x,P.pos.z-m.z);
    sfxNoise(0.9,280,0.7*Math.max(0.08,1-dd/90)); sfxTone(55,0.7,0.35*Math.max(0.08,1-dd/90),'sine',28);
    if(!P.dead&&P.grace<=0&&!(R.heli&&R.heli.phase==='in')&&dd<4.6){ const dmg=15+130*(1-dd/4.6); playerHit(dmg*0.55,32,"the Jarl's mortar",'thorax'); if(!P.dead) playerHit(dmg*0.45,20,"the Jarl's mortar",rand()<0.5?'lleg':'rleg'); P.hurt=1; }
    else if(dd<14) P.hurt=Math.max(P.hurt,0.35); }
}
function bossDown(replay){
  if(R.bossDown) return; R.bossDown=true;
  if(R.bossEx&&!R.bossEx.active){ R.bossEx.active=true; beacon(R.bossEx); }
  if(replay) return;
  R.bossReward={caches:2,cash:Math.round(20000*R.D.cash/100)*100};
  qBump(o=>o.type==='kill'&&o.kind==='jarl'?1:0);
  msg('Jarl Hrafn is dead. His hoard in the keep is open, and a flare in the courtyard marks a way out.');
  msg(`Extract alive for your share: ${fmt$(R.bossReward.cash)} and 2 sealed caches`); sfxExtracted(); stinger('extract');
}
function bossHud(){
  const el=$('#bossbar'); const B=R.boss; if(!B||!B.awake||B.e.dead){ if(!el.hidden) el.hidden=true; return; }
  if(el.hidden){ el.hidden=false; el.innerHTML=`<b>Jarl Hrafn</b><div class="bb"><i></i><s style="left:33%"></s><s style="left:66%"></s></div><small></small>`; }
  const f=Math.max(0,B.e.hp/B.maxHp); const bar=el.querySelector('i'); bar.style.width=(f*100).toFixed(1)+'%'; bar.classList.toggle('p3',B.phase>=3);
  const t=B.phase===1?'Phase 1 · keep moving: red circles are mortar strikes':B.phase===2?'Phase 2 · huskarls at the gates':'Phase 3 · enraged'; const sm=el.querySelector('small'); if(sm.textContent!==t) sm.textContent=t;
}
const RV_POI=[['Keep',0,-42,20,14],['Watch hut',-45,40,10,8],['Supply shed',45,40,10,8],['Powder store',-50,-25,8,10],['Stable',50,-25,8,10]];
const RV_EX=[['Cliff road',-62,-62],['Sea stairs',62,-62]];
function buildRavnskar(){
  scene.background=new THREE.Color(0x2b2a38); scene.fog=new THREE.FogExp2(0x2b2a38,0.02);
  scene.add(new THREE.HemisphereLight(0xb8b0d0,0x46404c,0.9)); const sun=new THREE.DirectionalLight(0xffb890,0.4); sun.position.set(-40,20,60); scene.add(sun);
  ground(340); perimeter(72); aurora(); R.drain=0.32; R.decor=[];
  const C=M('concrete'), wood=M('wood'), grey=M('metalGrey'), red=M('metalRed');
  // the fort: four walls with a wide south gate and small side gates, towers on the corners
  wallLine(-30,-55,30,-55,6,C,[]); wallLine(-30,5,30,5,6,C,[[30,8]]); wallLine(-30,-55,-30,5,6,C,[[30,3]]); wallLine(30,-55,30,5,6,C,[[30,3]]);
  for(const [x,z] of [[-30,-55],[30,-55],[-30,5],[30,5]]) solid(x,4.5,z,4,9,4,C);
  floorPlane(0,-25,59,59,0.012,'concrete',2,4); R.decor.push([-30,-55,60,60]);
  building(0,-42,20,14,7,{mat:C,doors:{s:[[10,5]]},name:'Keep',nowin:true});
  // the fort counts as one big building for the AI's door routing (after the keep, so the keep is found first)
  R.bld.push({x0:-30,x1:30,z0:-55,z1:5,name:'Fort',doors:[[0,5,0,1],[-30,-25,-1,0],[30,-25,1,0]],outline:true});
  container('hoard',-6,-47.8); container('hoard',0,-47.8); container('hoard',6,-47.8); heater(-8.5,-36.2); heater(8.5,-36.2);
  for(const [x,z] of [[-15,-20],[15,-20],[-8,-10],[8,-10],[0,-24],[-21,-6],[21,-6],[-21,-31],[21,-31],[-10,-2],[10,-2]]) solid(x,0.6,z,3,1.2,0.7,C);
  shipc(-22,-44,'z',grey); shipc(22,-44,'z',red); solid(14,1,-2,2.2,2,4.5,MC(0x4a5236)); solid(14,2.3,-3,2,0.8,2,MC(0x4a5236));
  container('vlocker',-28.9,-50); container('crate',-26,-30); container('crate',26,-30); container('cargo',-26,-12); container('med',28.9,-14); container('crate',25,-50);
  // outside: huts on the approach and stores against the walls
  building(-45,40,10,8,3.5,{mat:wood,doors:{n:[[5,1.6]]},name:'Watch hut'}); container('locker',-49.3,42.5); container('desk',-43,43.4); container('med',-41,42.6);
  building(45,40,10,8,3.5,{mat:grey,doors:{n:[[5,1.6]]},name:'Supply shed'}); container('crate',42,43.2); container('tool',47,43.4); container('crate',48.6,37.6);
  building(-50,-25,8,10,3.5,{mat:grey,doors:{e:[[5,1.6]]},name:'Powder store'}); container('crate',-52.6,-28.5); container('tool',-52.8,-21); container('drum',-48,-29);
  building(50,-25,8,10,3,{mat:wood,doors:{w:[[5,1.6]]},name:'Stable'}); container('locker',52.6,-28); container('crate',52.4,-21.5);
  for(let i=0;i<36;i++){ const x=rr(-68,68), z=rr(-68,68); if(Math.abs(x)<34&&z>-59&&z<9) continue; if(R.bld.some(b=>x>b.x0-4&&x<b.x1+4&&z>b.z0-4&&z<b.z1+4)) continue; drift(x,z,rr(1.5,3.5)); }
  for(let i=0;i<16;i++){ const x=rr(-66,66), z=rr(-66,66); if(Math.abs(x)<34&&z>-59&&z<9) continue; if(R.bld.some(b=>x>b.x0-4&&x<b.x1+4&&z>b.z0-4&&z<b.z1+4)) continue; rock(x,z,rr(0.8,2)); }
  R.extracts=RV_EX.map(([name,x,z])=>({name,x,z,r:4,active:true}));
  R.bossEx={name:'Keep flare',x:0,z:-28,r:5,active:false,time:5}; R.extracts.push(R.bossEx);
  spawnEnemy(0,-41,'jarl'); spawnEnemy(-6,-39,'huskarl'); spawnEnemy(6,-39,'huskarl'); spawnEnemy(-15,-15,'huskarl'); spawnEnemy(15,-15,'huskarl');
  for(const [x,z] of [[-40,15],[40,15],[-50,-8],[50,-8]]) spawnEnemy(x,z,'raider');
  for(const [x,z] of [[-44,30],[44,30],[-55,-40],[55,-40]]) spawnEnemy(x,z,'scav');
  return [{x:-40,z:63},{x:-14,z:65},{x:14,z:65},{x:40,z:63}];
}
