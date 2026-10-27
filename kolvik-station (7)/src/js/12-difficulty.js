/* 12-difficulty: DIFF table and diffExtras */
/* ================= DIFFICULTY (per raid: solo from the Deploy tab, online from the lobby leader) ================= */
const DIFF={
 normal:{name:'Normal',acc:1,react:1,hp:1,count:1,loot:1,cash:1,bp:0,desc:'The usual fight and the usual loot.'},
 hard:{name:'Hardened',acc:1.12,react:0.8,hp:1.25,count:1.3,loot:1.45,cash:1.5,bp:0.2,desc:'About 30% more enemies with a quarter more health, quicker reactions and better aim. About 45% more loot and 50% more cash.'},
 brutal:{name:'Brutal',acc:1.25,react:0.62,hp:1.5,count:1.6,loot:2,cash:2.2,bp:0.4,desc:'60% more enemies with half again the health, near-instant reactions and armor-piercing rounds everywhere. Double the loot, more than double the cash.'},
};
const diffTag=k=>k&&k!=='normal'&&DIFF[k]?`<span class="tag d-${k}">${DIFF[k].name}</span>`:'';
// extra enemies for harder raids: a copy near some of the map's own spawns (inside the seeded build, so everyone gets the same)
function diffExtras(){ const D=R.D; if(D.count<=1) return; for(const e of R.enemies.slice()){ if(e.k.boss||['chief','warden','foreman','relay'].includes(e.kind)) continue; if(rand()>=D.count-1) continue; const a=rand()*6.28, n0=R.enemies.length; spawnEnemy(clamp(e.pos.x+Math.cos(a)*3,-R.bound,R.bound),clamp(e.pos.z+Math.sin(a)*3,-R.bound,R.bound),e.kind); const ne=R.enemies[n0]; if(ne){ resolve(ne.pos,0.4); ne.home={x:ne.pos.x,z:ne.pos.z}; ne.nx=ne.pos.x; ne.nz=ne.pos.z; } } }
