/* 79-wayout: The Way Out, the goal everyone is working toward
   Kolvik Station is cut off. Every season each player works through six stages to get a seat on the last flight
   out: fix the station radio, prove you can kill a boss, learn the ground (extract from four different maps), hold
   the relay mast in Last Light, pay the pilot, then survive Kaldfjord Reach long enough to board the evac flight at
   the old airstrip. Getting out pays well, gives the "Escapee" title and the Evac parka, counts in your career, and
   puts your name in the server's Hall of Escapees for the season. Progress lives in S.wo, so a season wipe starts
   everyone's race again; your escape count (S.career.escapes) carries over. You can go back in for another run.
   The stage you're on is worked out from what you've done (woStage), so stages 2 to 4 count from the start of the
   season even if you do them out of order; the radio and the fare are things you hand over on the Way Out tab. */
const WO={radio:[['radio',1],['battery',2],['wire',3]], maps:4, hold:5, fare:150000, evacAt:300, evacDur:480, evac:{x:-420,z:-300,name:'Old airstrip'}};
const WO_STAGES=[
 {id:'radio',name:'Call for help',text:'The station radio is dead. Bring the parts home and the operator can raise the mainland.',rw:{cash:5000}},
 {id:'boss',name:'Prove yourself',text:'The pilot won\'t risk a flight for a nobody. Kill one of the bosses: the station chief, the Warden, Foreman Rask, Jarl Hrafn, Relay Chief Dahl or Harbormaster Vinter.',rw:{caches:1}},
 {id:'maps',name:'Learn the ground',text:`Scout the region for a landing site. Extract from ${WO.maps} different maps this season.`,rw:{cash:10000}},
 {id:'hold',name:'Hold the mast',text:`The flight needs the relay mast up to find you. Hold Last Light through wave ${WO.hold}, solo or with friends.`,rw:{caches:2}},
 {id:'fare',name:'Buy a seat',text:'Seats on the last flight are not free. Pay the pilot.',rw:{}},
 {id:'evac',name:'The last flight',text:`Go into Kaldfjord Reach. About five minutes in, your evac flight lands at the ${WO.evac.name} and waits eight minutes. Get on it alive.`,rw:{}},
];
const WO_REWARD={cash:50000,caches:5,cos:'c_evac',title:'Escapee'};
COS.push({id:'c_evac',slot:'coat',name:'Evac parka',rar:4,p:'redline',c:['#e8641a','#1a1d20','#f2e3c8'],glow:1,ex:'wayout'}); COSM.c_evac=COS[COS.length-1];
TITLES.push('Escapee','Frequent flyer');

function ensureWo(){ if(!S.wo) S.wo={run:1,radio:0,paid:0,boss:0,maps:{},hold:0,out:0,seen:0,st:0}; const w=S.wo; w.maps=w.maps||{}; return w; }
const woFare=()=>WO.fare*Math.pow(1.5,(ensureWo().run||1)-1);
// what the radio still needs, from your stash
const woRadioHave=()=>WO.radio.map(([id,n])=>[id,n,stashQty(id)]);
function woStage(){ const w=ensureWo(); if(w.out) return 6;
  if(!w.radio) return 0; if(!w.boss) return 1; if(Object.keys(w.maps).length<WO.maps) return 2; if((w.hold||0)<WO.hold) return 3; if(!w.paid) return 4; return 5; }
function woProgress(i){ const w=ensureWo();
  switch(WO_STAGES[i].id){
    case 'radio': if(w.radio) return 'Parts handed over. The mainland knows you are here.'; return woRadioHave().map(([id,n,h])=>`${ITEMS[id].name} ${Math.min(h,n)}/${n}`).join(' · ');
    case 'boss': return w.boss?`Killed: ${esc(EK_NAMES[w.boss]||w.boss)}`:'No boss killed yet this season';
    case 'maps': return `${Math.min(WO.maps,Object.keys(w.maps).length)}/${WO.maps} maps: ${Object.keys(w.maps).map(m=>MAPS[m]?MAPS[m].name:m).join(', ')||'none yet'}`;
    case 'hold': return `Best this season: wave ${w.hold||0} (need ${WO.hold})`;
    case 'fare': if(w.paid) return `Paid ${fmt$(w.paid)}`; return `${fmt$(woFare())} · you have ${fmt$(S.cash)}`;
    case 'evac': return 'Kaldfjord Reach · Old airstrip';
  } return ''; }
// hooks the rest of the game calls
function woBoss(e){ if(!S||!e||!BOSSES.includes(e.kind)) return; const w=ensureWo(); if(w.out||w.boss) return; w.boss=e.kind; if(R&&woStage()>=1) msg('The way out · boss down. The pilot will hear about this.'); }
function woMap(map){ if(!S) return; const w=ensureWo(); if(w.out||w.maps[map]) return; w.maps[map]=1; if(R) msg(`The way out · ${Object.keys(w.maps).length}/${WO.maps} maps extracted from`); }
function woHold(waves){ if(!S) return; const w=ensureWo(); if(w.out) return; w.hold=Math.max(w.hold||0,waves); }
// in the hideout: grant stage rewards for anything finished since you last looked
function woCheck(){ if(!S) return; const w=ensureWo(), st=woStage(); w.st=st; if(st<=(w.seen||0)||st>=6){ w.seen=Math.max(w.seen||0,st); return; }
  const done=[]; for(let i=w.seen||0;i<st&&i<5;i++){ const rw=WO_STAGES[i].rw; S.cash+=rw.cash||0; if(rw.caches){ ensureCos(); S.cos.caches+=rw.caches; } done.push(i); }
  w.seen=st; saveGame(); if(!done.length) return;
  const next=WO_STAGES[st]; sfxExtracted();
  notice('The way out',`<p>${done.map(i=>`<b>Stage ${i+1} · ${esc(WO_STAGES[i].name)}</b> done${WO_STAGES[i].rw.cash?`: +${fmt$(WO_STAGES[i].rw.cash)}`:WO_STAGES[i].rw.caches?`: +${WO_STAGES[i].rw.caches} sealed cache${WO_STAGES[i].rw.caches>1?'s':''}`:''}`).join('<br>')}</p>${next?`<p>Next: <b>${esc(next.name)}</b>. ${esc(next.text)}</p>`:''}`); }
function woHandRadio(){ const w=ensureWo(); if(w.radio) return; if(woRadioHave().some(([id,n,h])=>h<n)){ toast('You need all the radio parts in your stash.'); return; }
  for(const [id,n] of WO.radio) takeFromStash(id,n); w.radio=1; saveGame(); woCheck(); renderTab(); }
function woPay(){ const w=ensureWo(); if(woStage()!==4) return; const f=woFare(); if(S.cash<f){ toast(`The pilot wants ${fmt$(f)}.`); return; } S.cash-=f; w.paid=f; saveGame(); woCheck(); renderTab(); }
function woAgain(){ const w=ensureWo(); if(!w.out) return; const run=(w.run||1)+1; S.wo={run,radio:0,paid:0,boss:0,maps:{},hold:0,out:0,seen:0,st:0,prev:w.out}; saveGame(); renderTab(); }

/* ---- in the raid: the evac flight on Kaldfjord ---- */
function woRaidSetup(){ if(!S||R.map!=='kaldfjord'||R.dm||R.td||woStage()!==5) return; const v=WO.evac;
  // no rand() here: the rest of the raid's seeded rolls must stay in step with everyone else's game
  R.evac={t:WO.evacAt,x:v.x,z:v.z,name:v.name,dur:WO.evacDur,state:'pending',wo:true}; R.evacEx={name:'Evac flight',x:v.x,z:v.z,r:9,active:false,time:8,evac:true,wo:true}; R.extracts.push(R.evacEx); R.woEvac=true; }
const woEscaping=(kind,detail)=>kind==='extract'&&R&&R.woEvac&&R.evacEx&&detail===R.evacEx.name;
function woEscape(){ const w=ensureWo(); if(w.out) return null; w.out=Date.now(); w.raids=S.stats.raids; w.st=6; w.seen=6;
  S.career.escapes=(S.career.escapes||0)+1; S.cash+=WO_REWARD.cash; ensureCos(); S.cos.caches+=WO_REWARD.caches; grantCos(WO_REWARD.cos);
  const g=ensureGoals(); const ti=S.career.escapes>=3?'Frequent flyer':WO_REWARD.title; for(const t of [WO_REWARD.title,ti]) if(!g.titles.includes(t)) g.titles.push(t); g.title=ti;
  try{ if(NET.ws&&NET.ws.readyState===1) wsend({t:'escaped',n:S.career.escapes}); }catch(e){}
  return {n:S.career.escapes,raids:w.raids}; }
function woResultHtml(r){ return `<div class="woout"><span class="lbl">The way out</span><h3>You got out of Kolvik</h3><p>The flight climbs out over the fjord with you on it. ${r.n>1?`That's escape number ${r.n} for your career.`:'Your first escape.'} It took ${r.raids} raid${r.raids===1?'':'s'} this season.</p><p class="cash">+${fmt$(WO_REWARD.cash)} · ${WO_REWARD.caches} sealed caches · ${esc(COSM[WO_REWARD.cos].name)} · title “${esc(ensureGoals().title)}”</p></div>`; }
// the line on the raid HUD
function woHudLine(){ if(!S||!R||R.dm) return ''; const st=woStage(), w=ensureWo(); let t='';
  if(st===1&&!R.td) t='Kill a boss'; else if(st===2&&!w.maps[R.map]&&!R.td) t=`Extract here: a new map (${Object.keys(w.maps).length}/${WO.maps})`; else if(st===3&&R.td) t=`Hold through wave ${WO.hold}`;
  else if(st===5&&R.woEvac) t=R.evac&&R.evac.state==='landed'?'Board the evac flight at the Old airstrip':R.evac&&R.evac.state==='gone'?'The flight left without you':'Evac flight lands at the Old airstrip';
  else if(st===5) t='Go to Kaldfjord Reach for the last flight';
  return t?`<div class="wohud"><span class="lbl">The way out · ${st+1}/6</span>${esc(t)}</div>`:''; }

/* ---- the hideout: the banner on every tab and the Way Out tab ---- */
function woBar(){ const b=$('#woBar'); if(!b) return; if(!S||TAB==='wayout'){ b.hidden=true; return; } const st=woStage(); b.hidden=false;
  b.innerHTML=st>=6?`<span class="lbl">The way out</span><b>You got out this season.</b><span class="muted">Go back in for another run any time.</span><button class="btn ghost sm" id="woGo">Open</button>`
    :`<span class="lbl">The way out · stage ${st+1} of 6</span><b>${esc(WO_STAGES[st].name)}</b><span class="muted">${woProgress(st)}</span><span class="wosteps">${WO_STAGES.map((s,i)=>`<i class="${i<st?'on':i===st?'cur':''}"></i>`).join('')}</span><button class="btn ghost sm" id="woGo">Open</button>`;
  $('#woGo').onclick=()=>setTab('wayout'); }
function renderWayout(body){ const w=ensureWo(), st=woStage();
  const esc_=(BOARD.rows||[]).filter(r=>r.out).sort((a,b)=>a.out-b.out);
  if(NET.avail&&!BOARD.rows&&!BOARD.loading) loadBoard();
  const card=(s,i)=>{ const state=i<st?'done':i===st?'cur':'lock';
    let act=''; if(i===st&&s.id==='radio'){ const ok=woRadioHave().every(([id,n,h])=>h>=n); act=`<button class="btn sm" id="woRadio" ${ok?'':'disabled'}>Hand over the parts</button>`; }
    if(i===st&&s.id==='fare') act=`<button class="btn sm" id="woPay" ${S.cash>=woFare()?'':'disabled'}>Pay ${fmt$(woFare())}</button>`;
    if(i===st&&s.id==='evac') act=`<button class="btn sm" id="woDeploy">Go to Deploy</button>`;
    const rw=s.rw.cash?fmt$(s.rw.cash):s.rw.caches?`${s.rw.caches} sealed cache${s.rw.caches>1?'s':''}`:'';
    return `<li class="wostage ${state}"><span class="wonum">${i<st?'✓':i+1}</span><div><h3>${esc(s.name)}</h3><p class="muted">${esc(s.text)}</p>${state!=='lock'||s.id==='boss'||s.id==='maps'||s.id==='hold'?`<p class="wopg">${woProgress(i)}</p>`:''}${rw&&i>=st?`<p class="lbl">Reward ${rw}</p>`:''}${act?`<div class="acts">${act}</div>`:''}</div></li>`; };
  body.innerHTML=`<div class="colhead" style="margin-bottom:6px"><h2 class="h2">The way out</h2><span class="lbl">Run ${w.run||1}${S.career.escapes?` · ${S.career.escapes} escape${S.career.escapes===1?'':'s'} in your career`:''}</span></div>
   <p class="muted" style="margin:0 0 16px;max-width:72ch">Kolvik Station is cut off, and everyone here wants the same thing: a seat on the last flight out. Work through the six stages, then get to the evac flight on Kaldfjord Reach alive. Stages two to four count from the start of the season in any order. A new season wipes everyone's progress, and the race starts again.</p>
   ${st>=6?`<div class="woout"><span class="lbl">Season ${S.season||1}</span><h3>You got out</h3><p>${new Date(w.out).toLocaleDateString()} after ${w.raids||'?'} raid${w.raids===1?'':'s'}. Your name is in the Hall of Escapees for this season.</p><div class="acts"><button class="btn sm" id="woAgain">Go back in (run ${(w.run||1)+1}: the fare goes up)</button></div></div>`:''}
   <ol class="wopath">${WO_STAGES.map(card).join('')}</ol>
   <p class="lbl" style="margin-top:18px">Getting out pays ${fmt$(WO_REWARD.cash)}, ${WO_REWARD.caches} sealed caches, the ${esc(COSM[WO_REWARD.cos].name)} and the title “${WO_REWARD.title}”.</p>
   ${NET.avail?`<h3 class="tsec">Hall of Escapees · this season</h3>${esc_.length?`<ol class="woesc">${esc_.map((r,i)=>`<li class="${r.name===ACC.name?'me':''}"><b>${esc(r.name)}</b><span class="muted">${new Date(r.out).toLocaleDateString()} · ${r.woRaids||'?'} raid${r.woRaids===1?'':'s'}${r.esc>1?` · ${r.esc} career escapes`:''}</span></li>`).join('')}</ol>`:'<p class="muted">Nobody has got out yet this season. Be the first.</p>'}`:''}`;
  const on=(id,f)=>{ const b=$('#'+id); if(b) b.onclick=f; };
  on('woRadio',woHandRadio); on('woPay',woPay); on('woAgain',woAgain); on('woDeploy',()=>setTab('deploy')); }
function woHallHtml(){ const e=(BOARD.rows||[]).filter(r=>r.out).sort((a,b)=>a.out-b.out); return `<h3 class="tsec">Hall of Escapees · this season</h3>${e.length?`<ol class="woesc">${e.map(r=>`<li class="${r.name===ACC.name?'me':''}"><b>${esc(r.name)}</b><span class="muted">${new Date(r.out).toLocaleDateString()} · ${r.woRaids||'?'} raid${r.woRaids===1?'':'s'}</span></li>`).join('')}</ol>`:'<p class="muted">Nobody has got out yet this season. See the Way Out tab.</p>'}`; }
function woNet(m){ BOARD.rows=null; const t=`${m.name} got out of Kolvik on the last flight${m.n>1?` (escape #${m.n})`:''}.`; if(R) raidNote(t); else toast(t); }
