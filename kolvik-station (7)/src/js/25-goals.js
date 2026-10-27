/* 25-goals: long-term goals, the collection log and titles (the Goals tab)
   Goals count up across every raid and survive season wipes. Each has tiers; reaching one makes its reward claimable
   on the Goals tab: cash, sealed caches, scrip, a lockpick, cosmetics you can't get from caches, and titles that
   other players see under your name. The collection log fills in as you extract with things you haven't brought home
   before. */
const GOALS=[
 {id:'extract',name:'Survivor',stat:'extracts',unit:'extracts',tiers:[[1,{cash:1500}],[10,{caches:1}],[50,{caches:2,title:'Survivor'}],[150,{cos:'c_veteran',title:'Old hand'}]]},
 {id:'kills',name:'Exterminator',stat:'kills',unit:'kills',tiers:[[10,{cash:2000}],[100,{caches:1,scrip:50}],[500,{caches:2,title:'Exterminator'}],[2000,{cos:'g_hunter',title:'Reaper'}]]},
 {id:'heads',name:'Marksman',stat:'heads',unit:'headshot kills',tiers:[[5,{cash:2000}],[50,{caches:1}],[250,{cos:'w_brass',title:'Marksman'}]]},
 {id:'bosses',name:'Boss hunter',stat:'bosses',unit:'different bosses killed',tiers:[[1,{caches:1}],[3,{caches:2}],[5,{cos:'m_frost',title:'Kingslayer'}]],of:()=>BOSSES.length},
 {id:'rooms',name:'Locksmith',stat:'rooms',unit:'locked rooms opened',tiers:[[1,{cash:3000,items:[['lockpick']]}],[5,{caches:1}],[25,{cos:'h_locksmith',title:'Locksmith'}]]},
 {id:'keys',name:'Key ring',stat:'keys',unit:'different keys brought home',tiers:[[3,{cash:2000}],[8,{caches:1}],[15,{caches:2,title:'Keymaster'}]],of:()=>Object.keys(ITEMS).filter(k=>ITEMS[k].type==='key').length},
 {id:'maps',name:'Cartographer',stat:'maps',unit:'maps extracted from',tiers:[[3,{cash:3000}],[6,{caches:1}],[9,{cos:'c_carto',title:'Cartographer'}]],of:()=>Object.keys(MAPS).length},
 {id:'dist',name:'Pathfinder',stat:'km',unit:'km on foot',tiers:[[5,{cash:1000}],[25,{caches:1}],[100,{cos:'p_trail',title:'Pathfinder'}]]},
 {id:'collector',name:'Collector',stat:'valuables',unit:'different valuables brought home',tiers:[[10,{cash:3000}],[25,{caches:2}],[0,{cos:'w_starfall',title:'Curator'}]],of:()=>COLLECT.loot().length},
 {id:'haul',name:'Big haul',stat:'haul',unit:'best single haul',money:true,tiers:[[25000,{cash:2500}],[75000,{caches:1}],[200000,{caches:3,title:'Tycoon'}]]},
 {id:'drones',name:'Drone hunter',stat:'drones',unit:'drones shot down',tiers:[[1,{cash:2000}],[10,{caches:1,items:[['jammer']]}],[40,{caches:2,title:'Swatter'}]]},
 {id:'roadkill',name:'Road warrior',stat:'roadkill',unit:'enemies run down',tiers:[[1,{cash:1500}],[10,{caches:1}],[40,{caches:2,title:'Road warrior'}]]},
 {id:'searched',name:'Rummager',stat:'searched',unit:'containers and bodies searched',tiers:[[50,{cash:1000}],[300,{caches:1}],[1500,{scrip:150,title:'Scrounger'}]]},
 {id:'ghost',name:'Ghost',stat:'ghost',unit:'extracts without firing a shot',tiers:[[1,{cash:1500}],[10,{caches:1}],[30,{cos:'m_ghost',title:'Ghost'}]]},
 {id:'storm',name:'Storm walker',stat:'storm',unit:'extracts in a blizzard',tiers:[[1,{cash:2000}],[5,{caches:1}],[15,{title:'Stormborn',caches:1}]]},
];
const GMAP=Object.fromEntries(GOALS.map(g=>[g.id,g]));
const BOSSES=['chief','warden','foreman','jarl','relay','harbor'];
const TITLES=GOALS.flatMap(g=>g.tiers.map(t=>t[1].title).filter(Boolean));
// what the collection log tracks
const COLLECT={
 loot:()=>Object.keys(ITEMS).filter(k=>ITEMS[k].type==='loot'),
 groups:()=>[['Valuables',k=>ITEMS[k].type==='loot'],['Keys',k=>ITEMS[k].type==='key'],['Weapons',k=>ITEMS[k].type==='weapon'],['Armor and helmets',k=>ITEMS[k].type==='armor'||ITEMS[k].type==='helmet'],['Attachments',k=>ITEMS[k].type==='att'],['Supplies',k=>['med','warm','pick'].includes(ITEMS[k].type)],['Relics',k=>ITEMS[k].type==='relic']].map(([n,f])=>[n,Object.keys(ITEMS).filter(f)]),
};
// goal-only cosmetics (rollCache skips anything with ex)
COS.push(
 {id:'c_veteran',slot:'coat',name:'Veteran parka',rar:3,p:'tiger',c:['#7d8388','#3a3f43','#c9d3d8'],ex:'goal:extract'},
 {id:'c_carto',slot:'coat',name:'Cartographer parka',rar:4,p:'digital',c:['#2a3d46','#5b7581','#7cc9a4','#16242b'],glow:1,ex:'goal:maps'},
 {id:'p_trail',slot:'pants',name:'Trailbreaker trousers',rar:3,p:'camo',c:['#5a6a72','#2a3238','#8a9aa2'],ex:'goal:dist'},
 {id:'h_locksmith',slot:'head',name:"Locksmith's cap",rar:3,style:'cap',p:'redline',c:['#2a2d30','#d6b24a'],ex:'goal:rooms'},
 {id:'m_frost',slot:'mask',name:'Frost skull',rar:4,face:'skull',c:['#0f1a24','#bfe6f5'],glow:1,ex:'goal:bosses'},
 {id:'m_ghost',slot:'mask',name:'Ghost balaclava',rar:3,face:'slit',c:['#e8ecee'],ex:'goal:ghost'},
 {id:'g_hunter',slot:'gloves',name:'Hunter gloves',rar:3,p:'carbon',c:['#5a1a14','#2a0e0a'],ex:'goal:kills'},
 {id:'w_brass',slot:'gun',name:'Brass',rar:3,p:'damascus',c:['#b8862a','#e0c070','#6a4a14'],dk:'#3a2a0a',ex:'goal:heads'},
 {id:'w_starfall',slot:'gun',name:'Starfall',rar:4,p:'stars',c:['#0a0f1e','#2a1a48','#e8b04a'],glow:1,dk:'#07090f',ex:'goal:collector'},
);
for(const c of COS.slice(-9)) COSM[c.id]=c;

function ensureGoals(){ if(!S.goals) S.goals={}; const g=S.goals; g.c=g.c||{}; g.maps=g.maps||{}; g.bosses=g.bosses||{}; g.keys=g.keys||{}; g.found=g.found||{}; g.claimed=g.claimed||{}; g.titles=g.titles||[]; if(g.title&&!g.titles.includes(g.title)) g.title=null; return g; }
// a goal's current number
function goalVal(G){ const g=ensureGoals(), c=g.c;
  switch(G.stat){ case 'maps': return Object.keys(g.maps).length; case 'bosses': return Object.keys(g.bosses).length; case 'keys': return Object.keys(g.keys).length;
    case 'valuables': return COLLECT.loot().filter(k=>g.found[k]).length; case 'km': return Math.floor((c.dist||0)/100)/10; default: return c[G.stat]||0; } }
const tierNeed=(G,i)=>G.tiers[i][0]||(G.of?G.of():0);
function goalReady(G){ const g=ensureGoals(), done=g.claimed[G.id]||0; return done<G.tiers.length&&goalVal(G)>=tierNeed(G,done); }
function goalBump(stat,n=1){ if(!S) return; const g=ensureGoals(); const before=GOALS.filter(goalReady).length; g.c[stat]=(g.c[stat]||0)+n; goalNotice(before); }
function goalNotice(before){ const now=GOALS.filter(goalReady); if(now.length>before&&R){ const G=now[now.length-1]; msg(`Goal reached · ${G.name} ${roman((ensureGoals().claimed[G.id]||0)+1)} · claim it on the Goals tab`); sfxBeep(); } goalBadge(); }
const roman=n=>['','I','II','III','IV','V'][n]||String(n);
function goalBadge(){ const b=$('#goalBadge'); if(!b||!S) return; const n=GOALS.filter(goalReady).length; b.hidden=!n; b.textContent=String(n); }
// hooks the rest of the game calls
function goalKill(e,head){ const before=GOALS.filter(goalReady).length; const g=ensureGoals(); g.c.kills=(g.c.kills||0)+1; if(head) g.c.heads=(g.c.heads||0)+1; if(e&&BOSSES.includes(e.kind)) g.bosses[e.kind]=1; goalNotice(before); }
function goalsTick(dt){ if(!P||P.dead||R.ride||R.fly||(R.heli&&R.heli.phase==='in')||P.vy!==0) return; const v=Math.hypot(P.vx,P.vz); if(v>0.3&&v<8){ const g=ensureGoals(); g.c.dist=(g.c.dist||0)+v*dt; } }
// on extraction: count it, and log everything you brought out
function goalExtract(haul){
  const g=ensureGoals(); const before=GOALS.filter(goalReady).length;
  g.c.extracts=(g.c.extracts||0)+1; g.maps[R.map]=1; if(!R.fired) g.c.ghost=(g.c.ghost||0)+1; if(R.cond&&R.cond.weather==='blizzard') g.c.storm=(g.c.storm||0)+1; g.c.haul=Math.max(g.c.haul||0,haul);
  const fresh=[]; const walk=it=>{ if(!it) return; const d=ITEMS[it.id]; const mine=R.startUids&&R.startUids.has(it.uid); if(mine){ if(it.items) it.items.forEach(walk); return; } if(d&&!d.fixed&&it.id!=='cash'&&!g.found[it.id]){ g.found[it.id]=1; fresh.push(it.id); } if(d&&d.type==='key') g.keys[it.id]=1; if(it.items) it.items.forEach(walk); if(it.att) Object.values(it.att).forEach(walk); };
  for(const k in S.eq) walk(S.eq[k]);
  goalNotice(before); return fresh;
}

/* ---- the Goals tab ---- */
function rwText(rw){ const out=[]; if(rw.cash) out.push(fmt$(rw.cash)); if(rw.caches) out.push(`${rw.caches} sealed cache${rw.caches>1?'s':''}`); if(rw.scrip) out.push(`${rw.scrip} scrip`); for(const [id] of (rw.items||[])) out.push(ITEMS[id].name); if(rw.cos) out.push(`${COSM[rw.cos].name} (${COS_SLOTS.find(s=>s[0]===COSM[rw.cos].slot)[1].toLowerCase()})`); if(rw.title) out.push(`title “${rw.title}”`); return out.join(' · '); }
function claimGoal(G){
  const g=ensureGoals(), i=g.claimed[G.id]||0; if(!goalReady(G)) return; const rw=G.tiers[i][1];
  if(!giveReward({cash:rw.cash,caches:rw.caches,items:rw.items,cos:rw.cos?[rw.cos]:[]},`${G.name} ${roman(i+1)}`)) return;
  if(rw.scrip){ ensureCos(); S.cos.scrip+=rw.scrip; } if(rw.title&&!g.titles.includes(rw.title)){ g.titles.push(rw.title); if(!g.title) g.title=rw.title; }
  g.claimed[G.id]=i+1; saveGame(); renderTab();
}
const fmtGoal=(G,v)=>G.money?fmt$(v):String(v);
function renderGoals(body){
  const g=ensureGoals(); const ready=GOALS.filter(goalReady);
  const card=G=>{ const done=g.claimed[G.id]||0, all=done>=G.tiers.length, v=goalVal(G), need=all?tierNeed(G,G.tiers.length-1):tierNeed(G,done), pct=Math.min(100,need?v/need*100:100), rdy=goalReady(G);
    return `<article class="task goal ${rdy?'ready':''} ${all?'donec':''}"><div class="tg"><span class="tag giver">${G.tiers.map((t,i)=>`<span class="pip ${i<done?'on':''}" title="Tier ${roman(i+1)}"></span>`).join('')}</span>${rdy?'<span class="tag ok">Ready to claim</span>':all?'<span class="tag ok">Complete</span>':''}</div>
      <h3>${esc(G.name)}${done?` ${roman(done)}`:''}</h3><p class="muted">${all?`All tiers done · ${fmtGoal(G,v)} ${esc(G.unit)}`:`${fmtGoal(G,v)} / ${fmtGoal(G,need)} ${esc(G.unit)}`}</p>
      <div class="bar"><i style="width:${pct}%"></i></div>${all?'':`<div class="rw"><span class="lbl">Tier ${roman(done+1)} reward</span> ${esc(rwText(G.tiers[done][1]))}</div>`}
      <div class="acts">${rdy?`<button class="btn sm" data-gclaim="${G.id}">Claim</button>`:''}</div></article>`; };
  const groups=COLLECT.groups(); const total=groups.reduce((s,[,ids])=>s+ids.length,0), got=groups.reduce((s,[,ids])=>s+ids.filter(k=>g.found[k]).length,0);
  body.innerHTML=`<div class="colhead" style="margin-bottom:6px"><h2 class="h2">Goals</h2><span class="lbl">${ready.length?`${ready.length} ready to claim · `:''}kept through season wipes</span></div>
   <p class="muted" style="margin:0 0 14px;max-width:72ch">Long-term goals count up over every raid. Each tier pays out once: cash, sealed caches, scrip, cosmetics you can't get from caches, and titles other players see under your name.</p>
   <div class="titles"><span class="lbl">Your title</span>${g.titles.length?`<div class="seg" role="radiogroup"><button type="button" role="radio" aria-checked="${!g.title}" data-title="">None</button>${g.titles.map(t=>`<button type="button" role="radio" aria-checked="${g.title===t}" data-title="${esc(t)}">${esc(t)}</button>`).join('')}</div>`:'<span class="muted">Earn one from a goal below.</span>'}</div>
   <div class="tasks">${GOALS.map(card).join('')}</div>
   <h3 class="tsec">Collection log · ${got}/${total}</h3><p class="muted" style="margin:0 0 10px;max-width:72ch">Everything you've brought home from a raid at least once. The rest show as a shape until you find them.</p>
   ${groups.map(([n,ids])=>`<div class="coll"><span class="lbl">${esc(n)} · ${ids.filter(k=>g.found[k]).length}/${ids.length}</span><div class="collg">${ids.map(k=>{ const f=!!g.found[k]; return `<span class="ci r${ITEMS[k].rar} ${f?'':'unk'}" title="${f?esc(ITEMS[k].name):'Not found yet'}"><span class="hic" style="background-image:url(${iconFor(k)})"></span><small>${f?esc(ITEMS[k].short):'?'}</small></span>`; }).join('')}</div></div>`).join('')}`;
  body.querySelectorAll('[data-gclaim]').forEach(b=>b.onclick=()=>claimGoal(GMAP[b.dataset.gclaim]));
  body.querySelectorAll('[data-title]').forEach(b=>b.onclick=()=>{ g.title=b.dataset.title||null; saveGame(); renderTab(); toast(g.title?`Title: ${g.title}`:'No title shown'); });
}
