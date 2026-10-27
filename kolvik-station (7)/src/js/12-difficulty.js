/* 12-difficulty: DIFF table and diffExtras */
/* ================= DIFFICULTY (per raid: solo from the Deploy tab, online from the lobby leader) ================= */
const DIFF={
 easy:{name:'Recruit',acc:0.55,react:1.6,hp:0.85,dmg:0.7,count:0.75,loot:0.85,cash:0.85,bp:0,desc:'A quarter fewer enemies, slower to react, worse shots, and they hit softer. A little less loot.'},
 normal:{name:'Normal',acc:0.75,react:1.25,hp:1,dmg:0.85,count:1,loot:1,cash:1,bp:0,desc:'The usual fight and the usual loot.'},
 hard:{name:'Hardened',acc:1,react:0.9,hp:1.2,dmg:1,count:1.3,loot:1.45,cash:1.5,bp:0.2,desc:'About 30% more enemies with a fifth more health, quicker reactions, better aim and full damage. About 45% more loot and 50% more cash.'},
 brutal:{name:'Brutal',acc:1.15,react:0.7,hp:1.45,dmg:1.1,count:1.6,loot:2,cash:2.2,bp:0.4,desc:'60% more enemies with nearly half again the health, fast reactions and armor-piercing rounds everywhere. Double the loot, more than double the cash.'},
};
const diffTag=k=>k&&k!=='normal'&&DIFF[k]?`<span class="tag d-${k}">${DIFF[k].name}</span>`:'';
// extra enemies for harder raids: a copy near some of the map's own spawns (inside the seeded build, so everyone gets the same)
function diffExtras(){ const D=R.D;
  // easier raids thin the ordinary enemies out (bosses and their guards stay)
  if(D.count<1){ const keep=[]; for(const e of R.enemies){ if(e.k.boss||e.k.home||rand()<D.count) keep.push(e); else scene.remove(e.g); } keep.forEach((e,i)=>e.idx=i); R.enemies=keep; return; }
  if(D.count<=1) return; for(const e of R.enemies.slice()){ if(e.k.boss||['chief','warden','foreman','relay'].includes(e.kind)) continue; if(rand()>=D.count-1) continue; const a=rand()*6.28, n0=R.enemies.length; spawnEnemy(clamp(e.pos.x+Math.cos(a)*3,-R.bound,R.bound),clamp(e.pos.z+Math.sin(a)*3,-R.bound,R.bound),e.kind); const ne=R.enemies[n0]; if(ne){ resolve(ne.pos,0.4); ne.home={x:ne.pos.x,z:ne.pos.z}; ne.nx=ne.pos.x; ne.nz=ne.pos.z; } } }
