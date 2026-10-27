/* 22-tasks: quests */
/* ================= TASKS (quests) ================= */
const GIVERS={Ilse:'Quartermaster Ilse',Aune:'Dr. Aune',Daily:'Daily'};
const ZONES={
 kv_mast:{map:'kolvik',x:14,z:-10,r:7,name:'the comms mast'},
 sk_crash:{map:'skarsvik',x:22,z:152,r:10,name:'the crashed plane'},
 sk_lighthouse:{map:'skarsvik',x:262,z:-270,r:10,name:'the lighthouse'},
 sk_dome:{map:'skarsvik',x:12,z:-68,r:9,name:'the radar dome'},
 sk_headframe:{map:'skarsvik',x:-80,z:-232,r:9,name:'the mine headframe'},
};
const QUESTS=[
 {id:'q1',giver:'Ilse',title:'Cold start',text:'Prove you can get out of Kolvik with a pulse. Go in, grab anything, come back.',obj:[{type:'extract',map:'kolvik',n:1}],reward:{cash:1500,items:[['bandage'],['bandage']]}},
 {id:'q2',giver:'Ilse',title:'Pest control',req:['q1'],text:'Scavs are stripping the station bare. Thin them out, any map.',obj:[{type:'kill',kind:'scav',n:5}],reward:{cash:3000,items:[['vintik',{mag:30}]]}},
 {id:'q3',giver:'Aune',title:'Paper trail',req:['q1'],text:'My colleagues left field notebooks everywhere. Bring me two before someone burns them for heat.',obj:[{type:'hand',item:'notebook',n:2}],reward:{cash:4000,items:[['ifak'],['ifak']]}},
 {id:'q4',giver:'Aune',title:'Dome check',req:['q3'],text:'The comms mast at Kolvik went silent. Walk up to it, then get out alive.',obj:[{type:'visit',zone:'kv_mast',n:1},{type:'extract',map:'kolvik',n:1}],reward:{cash:3500,items:[['reddot']]}},
 {id:'q5',giver:'Ilse',title:'Quiet hands',req:['q2'],text:'Anyone can shoot. Get through Whiteout without firing a single round.',obj:[{type:'extract',map:'whiteout',noFire:true,n:1,label:'Extract from Whiteout without firing'}],reward:{cash:5000,items:[['holo']]}},
 {id:'q6',giver:'Aune',title:'Core samples',req:['q4'],text:'The lab safes held our ice cores. Bring one back intact.',obj:[{type:'hand',item:'icecore',n:1}],reward:{cash:9000}},
 {id:'q7',giver:'Ilse',title:"Chief's orders",req:['q5'],text:'Halvorsen sold the station out. End him. Keep his keycard: the Armory can use it.',obj:[{type:'kill',kind:'chief',n:1,label:'Kill Station Chief Halvorsen'}],reward:{cash:8000,caches:1,items:[['a545bp',{n:60}]],loyalty:3000}},
 {id:'q8',giver:'Ilse',title:'Sidearm only',req:['q2'],text:'Rifles make you lazy. Three kills with the Makar.',obj:[{type:'kill',weapon:'makar',n:3,label:'Kill 3 enemies with the Makar-9'}],reward:{cash:4000,items:[['supp9']]}},
 {id:'q9',giver:'Ilse',title:'Long shot',req:['q8'],text:'Three headshots from forty metres or more. Any gun.',obj:[{type:'kill',head:true,minDist:40,n:3,label:'Headshots from 40 m or farther'}],reward:{cash:6000,items:[['scope4']]}},
 {id:'q10',giver:'Aune',title:'Deep pockets',req:['q6'],text:'Funding is thin. Come back from one raid carrying $20,000 or more.',obj:[{type:'extract',minHaul:20000,n:1}],reward:{cash:10000,items:[['prism']]}},
 {id:'q11',giver:'Ilse',title:'Ferry to Skarsvik',req:['q2'],text:'There is an island north of here nobody has picked clean yet. The pilot owes me a favor. Go see it.',obj:[{type:'visit',zone:'sk_dome',n:1},{type:'extract',map:'skarsvik',n:1}],reward:{cash:8000,items:[['ruck']]}},
 {id:'q12',giver:'Aune',title:'Flight path',req:['q11'],text:'A cargo plane went down on Skarsvik. Its flight recorder is in the cockpit. Bring it to me.',obj:[{type:'hand',item:'blackbox',n:1}],reward:{cash:25000,caches:1,items:[['sled'],['cryocell']]}},
 {id:'q13',giver:'Ilse',title:'The foreman',req:['q11'],text:'Rask runs the mine like a fort. Take him down.',obj:[{type:'kill',kind:'foreman',n:1,label:'Kill Mine Foreman Rask'}],reward:{cash:12000,caches:1,items:[['bastion']],loyalty:4000}},
 {id:'q14',giver:'Aune',title:'Storm chaser',req:['q5'],text:'I need readings from inside a blizzard. Extract from any raid while one is blowing.',obj:[{type:'extract',weather:'blizzard',n:1,label:'Extract during a blizzard'}],reward:{cash:7000,items:[['thermos'],['thermos']]}},
 {id:'q15',giver:'Ilse',title:'Special delivery',req:['q2'],text:'Supply drops go to whoever reaches them first. Be first.',obj:[{type:'loot',cont:'airdrop',n:1,label:'Search a supply drop'}],reward:{cash:6000,items:[['chestrig']]}},
 {id:'q16',giver:'Aune',title:'Lighthouse keeper',req:['q11'],text:'Someone is signalling from the Skarsvik lighthouse. Go look, and climb the mine headframe on the way.',obj:[{type:'visit',zone:'sk_lighthouse',n:1},{type:'visit',zone:'sk_headframe',n:1}],reward:{cash:7000,items:[['radio']]}},
 {id:'q17',giver:'Ilse',title:"The Warden's keys",req:['q7','q13'],text:'Brekke guards the vault like it is his. Finish it.',obj:[{type:'kill',kind:'warden',n:1,label:'Kill Vault Warden Brekke'}],reward:{cash:20000,caches:2,items:[['glacier']],loyalty:5000}},
 {id:'q19',giver:'Ilse',title:'The Iron Jarl',req:['q13'],text:'A warlord calling himself Jarl Hrafn has taken Fort Ravnskar. Bring friends. Bring him down.',obj:[{type:'kill',kind:'jarl',n:1,label:'Bring down Jarl Hrafn (any share counts)'}],reward:{cash:30000,caches:3,items:[['cryocell']]}},
 {id:'q18',giver:'Aune',title:'Relic hunter',req:['q17'],text:'The old projects left plans for a rifle nobody finished. Build the Nordlys at the Armory with a trophy from each boss, then show me it works.',obj:[{type:'craft',item:'nordlys',n:1},{type:'kill',weapon:'nordlys',n:10,label:'Kill 10 enemies with the Nordlys'}],reward:{cash:50000,caches:5,cos:['c_nordlys','h_nordlys','w_nordlys']}},
];
const QMAP=Object.fromEntries(QUESTS.map(q=>[q.id,q]));
const DAILY_POOL=[
 r=>({type:'kill',kind:'scav',n:4+Math.floor(r()*5)}),
 r=>({type:'kill',kind:'raider',n:2+Math.floor(r()*3)}),
 r=>({type:'extract',map:['kolvik','whiteout','skarsvik'][Math.floor(r()*3)],n:1}),
 r=>({type:'hand',item:['bolts','tape','battery','wire','aquavit','powder','scrap'][Math.floor(r()*7)],n:2+Math.floor(r()*2)}),
 r=>({type:'kill',head:true,n:2+Math.floor(r()*3)}),
 r=>({type:'extract',minHaul:[6000,10000,15000][Math.floor(r()*3)],n:1}),
 r=>({type:'loot',n:6+Math.floor(r()*6)}),
 r=>({type:'visit',zone:['kv_mast','sk_crash','sk_lighthouse','sk_dome'][Math.floor(r()*4)],n:1}),
];
const DAILY_TITLES={kill:'Contract',extract:'Courier run',hand:'Supply request',loot:'Scavenging',visit:'Recon'};
const EK_NAMES={scav:'scav',raider:'raider',guard:"chief's guard",chief:'Station Chief Halvorsen',vguard:'vault guard',warden:'Vault Warden Brekke',foreman:'Mine Foreman Rask',mguard:'mine guard',jarl:'Jarl Hrafn',harbor:'Harbormaster Vinter',relay:'Relay Chief Dahl',huskarl:'huskarl'};
function normSave(){ ensureCos(); ensureGoals(); if(S.hide&&S.hide.armory==null) S.hide.armory=0; if(!S.crafted) S.crafted={}; if(!S.q) S.q={active:{},done:[],daily:null}; if(!S.career) S.career={raids:S.stats?S.stats.raids:0,extracts:S.stats?S.stats.extracts:0,kills:S.stats?S.stats.kills:0,seasons:[]}; ensureDailies(); if(S.q.daily) for(const d of S.q.daily.list) if(d.reward.caches==null) d.reward.caches=1; }
const dayKey=()=>Math.floor(Date.now()/864e5);
function ensureDailies(){
  const day=dayKey(); if(S.q.daily&&S.q.daily.day===day) return;
  const r=mulberry32(hashStr(String(day)+(ACC.name||'guest'))); const pool=DAILY_POOL.slice(); const list=[];
  for(let i=0;i<3;i++){ const f=pool.splice(Math.floor(r()*pool.length),1)[0]; const o=f(r); list.push({id:'d'+day+'-'+i,giver:'Daily',title:DAILY_TITLES[o.type],text:'',obj:[o],p:[0],reward:{cash:2000+Math.round(r()*30)*100,caches:1},done:false}); }
  S.q.daily={day,list};
}
function objLabel(o){
  if(o.label) return o.label; const mapN=o.map?MAPS[o.map].name:null;
  switch(o.type){
    case 'kill': return `Kill ${o.n} ${o.kind?EK_NAMES[o.kind]+(o.n>1?'s':''):(o.n>1?'enemies':'enemy')}${o.head?' with headshots':''}${mapN?' on '+mapN:''}`;
    case 'extract': return `Extract${mapN?' from '+mapN:' from any raid'}${o.minHaul?` carrying ${fmt$(o.minHaul)} or more`:''}`;
    case 'hand': return `Hand over ${o.n} × ${ITEMS[o.item].name}`;
    case 'loot': return `Search ${o.n} containers or bodies`;
    case 'visit': return `Reach ${ZONES[o.zone].name} on ${MAPS[ZONES[o.zone].map].name}`;
    case 'craft': return `Build the ${ITEMS[o.item].name} at the Armory`;
  }
  return '';
}
function qEachActive(fn){
  for(const id in S.q.active){ const q=QMAP[id]; if(!q) continue; q.obj.forEach((o,i)=>fn(o,S.q.active[id].p,i,q.title)); }
  if(S.q.daily) for(const d of S.q.daily.list) if(!d.done) d.obj.forEach((o,i)=>fn(o,d.p,i,d.title));
}
function qBump(match){
  qEachActive((o,p,i,title)=>{ if(p[i]>=o.n) return; const inc=match(o); if(!inc) return; p[i]=Math.min(o.n,p[i]+inc); const line=`${title}: ${objLabel(o)} ${p[i]}/${o.n}`; if(R){ (R.qlog=R.qlog||[]).push(line); if(!R.over) msg('Task · '+line+(p[i]>=o.n?' ✓':'')); } });
}
function qKill(e,head,w){ const dist=e.pos?Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z):0; const wid=w||e.lastW; qBump(o=>o.type==='kill'&&(!o.kind||o.kind===e.kind)&&(!o.map||o.map===R.map)&&(!o.weapon||o.weapon===wid)&&(!o.head||head)&&(!o.minDist||dist>=o.minDist)?1:0); }
function qVisit(){ qEachActive((o,p,i,title)=>{ if(o.type!=='visit'||p[i]>=1) return; const z=ZONES[o.zone]; if(z.map!==R.map) return; if(Math.hypot(z.x-P.pos.x,z.z-P.pos.z)<z.r){ p[i]=1; const line=`${title}: ${objLabel(o)} ✓`; (R.qlog=R.qlog||[]).push(line); msg('Task · '+line); sfxBeep(); } }); }
function taskHud(){
  const lines=[]; qEachActive((o,p,i)=>{ if(p[i]>=o.n||o.type==='hand'||o.type==='craft') return; if(o.map&&o.map!==R.map) return; if(o.type==='visit'&&ZONES[o.zone].map!==R.map) return; lines.push(`<div>${esc(objLabel(o))} <b>${p[i]}/${o.n}</b></div>`); });
  $('#taskHud').innerHTML=lines.length?'<span class="lbl">Tasks</span>'+lines.slice(0,4).join(''):'';
}
const qDone=q=>q.obj.every((o,i)=>(S.q.active[q.id]||{p:[]}).p[i]>=o.n);
const dDone=d=>d.obj.every((o,i)=>d.p[i]>=o.n);
const qAvail=q=>!S.q.done.includes(q.id)&&!S.q.active[q.id]&&(q.req||[]).every(r=>S.q.done.includes(r));
function taskBadge(){ const b=$('#taskBadge'); if(!b||!S.q) return; ensureDailies(); let n=0; for(const id in S.q.active) if(QMAP[id]&&qDone(QMAP[id])) n++; for(const d of S.q.daily.list) if(!d.done&&dDone(d)) n++; b.hidden=!n; b.textContent=String(n); }
function stashQty(id){ let n=0; for(const it of S.stash.items) if(it.id===id&&!(it.items&&it.items.length)) n+=ITEMS[id].stack?it.n:1; return n; }
function takeFromStash(id,n){ for(const it of S.stash.items.slice()){ if(n<=0) break; if(it.id!==id||(it.items&&it.items.length)) continue; if(ITEMS[id].stack){ const t=Math.min(n,it.n); it.n-=t; n-=t; if(it.n<=0) S.stash.items.splice(S.stash.items.indexOf(it),1); } else { S.stash.items.splice(S.stash.items.indexOf(it),1); n--; } } }
function giveReward(rw,title){
  const items=(rw.items||[]).map(([id,o])=>mk(id,Object.assign({},o||{}))); const tmp={w:S.stash.w,h:S.stash.h,items:S.stash.items.slice()};
  for(const it of items) if(!placeNoMerge(tmp,it)){ toast('Make room in your stash for the reward first.'); return false; }
  S.stash.items=tmp.items; S.cash+=rw.cash||0; const before=loyalty(); if(rw.loyalty) S.spent+=rw.loyalty;
  ensureCos(); if(rw.caches) S.cos.caches+=rw.caches; const cos=(rw.cos||[]).filter(grantCos);
  const extra=[...items.map(i=>ITEMS[i.id].name),...(rw.caches?[`${rw.caches} sealed cache${rw.caches===1?'':'s'}`]:[]),...cos.map(id=>COSM[id].name)];
  sfxExtracted(); toast(`${title} complete: ${fmt$(rw.cash||0)}${extra.length?` and ${extra.join(', ')}`:''}.`+(loyalty()>before?` Loyalty ${loyalty()} reached.`:'')); return true;
}
function rewardHtml(rw){ return `<div class="rw"><span class="lbl">Reward</span><span class="cash">${fmt$(rw.cash||0)}</span>${(rw.items||[]).map(([id,o])=>`<span class="hchip r${ITEMS[id].rar}"><span class="hic" style="background-image:url(${iconFor(id)})"></span>${esc(ITEMS[id].short)}${o&&o.n?' ×'+o.n:''}</span>`).join('')}${rw.caches?`<span class="hchip r3"><span class="hic" style="background-image:url(${iconFor('cache')})"></span>${rw.caches} sealed cache${rw.caches===1?'':'s'}</span>`:''}${(rw.cos||[]).map(id=>`<span class="hchip r${COSM[id].rar}"><span class="hic" style="background-image:url(${cosSwatch(id)})"></span>${esc(COSM[id].name)}</span>`).join('')}${rw.loyalty?`<span class="tag">+${fmt$(rw.loyalty)} loyalty</span>`:''}</div>`; }
function taskCard(t,p,state){
  const ready=state==='active'&&t.obj.every((o,i)=>p[i]>=o.n);
  return `<article class="task ${ready?'ready':''} ${state}"><div class="tg"><span class="tag giver">${GIVERS[t.giver]}</span>${ready?'<span class="tag ok">Ready to turn in</span>':''}</div>
   <h3>${esc(t.title)}</h3>${t.text?`<p class="muted">${esc(t.text)}</p>`:''}
   <ul class="objs">${t.obj.map((o,i)=>{ const d=(p[i]||0)>=o.n; const have=o.type==='hand'?stashQty(o.item):0; return `<li class="${d?'done':''}"><span class="ck">${d?'✓':''}</span><span class="ol">${esc(objLabel(o))}</span><span class="pg">${p[i]||0}/${o.n}</span>${state==='active'&&o.type==='hand'&&!d?`<button class="btn ghost sm" data-hand="${t.id}:${i}" ${have>=o.n?'':'disabled'}>${have>=o.n?'Hand over':`Have ${have}`}</button>`:''}</li>`; }).join('')}</ul>
   ${rewardHtml(t.reward)}
   <div class="acts">${state==='avail'?`<button class="btn sm" data-qacc="${t.id}">Accept</button>`:ready?`<button class="btn sm" data-qturn="${t.id}">Turn in</button>`:''}</div></article>`;
}
function renderTasks(body){
  ensureDailies();
  const act=Object.keys(S.q.active).filter(id=>QMAP[id]).map(id=>QMAP[id]); const avail=QUESTS.filter(qAvail); const locked=QUESTS.filter(q=>!S.q.done.includes(q.id)&&!S.q.active[q.id]&&!qAvail(q)).length;
  const ms=(dayKey()+1)*864e5-Date.now(); const hh=Math.floor(ms/36e5), mm=Math.floor(ms/6e4)%60;
  body.innerHTML=`<div class="colhead" style="margin-bottom:6px"><h2 class="h2">Tasks</h2><span class="lbl">Daily tasks refresh in ${hh} h ${mm} min</span></div>
   <p class="muted" style="margin:0 0 14px;max-width:70ch">Kills, extracts, searches and places you reach count while you are in a raid, even if you die later. Items for hand-over tasks come from your stash.</p>
   <h3 class="tsec">Daily</h3><div class="tasks">${S.q.daily.list.map(d=>d.done?`<article class="task donec"><div class="tg"><span class="tag giver">Daily</span><span class="tag ok">Done</span></div><h3>${esc(d.title)}</h3><p class="muted">${esc(objLabel(d.obj[0]))}</p></article>`:taskCard(d,d.p,'active')).join('')}</div>
   ${act.length?`<h3 class="tsec">Active</h3><div class="tasks">${act.map(q=>taskCard(q,S.q.active[q.id].p,'active')).join('')}</div>`:''}
   ${avail.length?`<h3 class="tsec">Available</h3><div class="tasks">${avail.map(q=>taskCard(q,[],'avail')).join('')}</div>`:''}
   ${locked?`<p class="muted">${locked} more task${locked===1?'':'s'} unlock as you finish these.</p>`:''}
   ${S.q.done.length?`<details class="qdone"><summary>Completed (${S.q.done.length})</summary><ul>${S.q.done.map(id=>QMAP[id]?`<li>${esc(QMAP[id].title)} <span class="muted">· ${GIVERS[QMAP[id].giver]}</span></li>`:'').join('')}</ul></details>`:''}`;
  body.querySelectorAll('[data-qacc]').forEach(b=>b.onclick=()=>{ const q=QMAP[b.dataset.qacc]; S.q.active[q.id]={p:q.obj.map(o=>o.type==='craft'&&S.crafted[o.item]?o.n:0)}; saveGame(); renderTab(); toast(`Accepted: ${q.title}`); });
  body.querySelectorAll('[data-hand]').forEach(b=>b.onclick=()=>{ const [id,i]=b.dataset.hand.split(':'); const daily=S.q.daily.list.find(d=>d.id===id); const t=daily||QMAP[id]; const p=daily?daily.p:S.q.active[id].p; const o=t.obj[+i]; if(stashQty(o.item)<o.n) return; takeFromStash(o.item,o.n); p[+i]=o.n; sfxPickup(); saveGame(); renderTab(); });
  body.querySelectorAll('[data-qturn]').forEach(b=>b.onclick=()=>{ const id=b.dataset.qturn; const daily=S.q.daily.list.find(d=>d.id===id);
    if(daily){ if(!dDone(daily)||!giveReward(daily.reward,daily.title)) return; daily.done=true; }
    else { const q=QMAP[id]; if(!qDone(q)||!giveReward(q.reward,q.title)) return; delete S.q.active[id]; S.q.done.push(id); }
    saveGame(); renderTab(); });
}
