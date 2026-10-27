/* Kolvik Station debug tools.
   The server only sends this file to accounts listed in the ADMINS environment variable, so ordinary players never
   receive any of it. It runs inside the game page and uses the game's own functions and state. F9 opens the panel,
   F10 toggles the AI overlay. */
(function(){
'use strict';
const css=`
#dbg{position:fixed; top:0; right:0; bottom:0; width:min(420px,100vw); z-index:300; background:var(--ice); border-left:1px solid var(--line); color:var(--frost); font:13px/1.35 var(--body); display:flex; flex-direction:column}
#dbg header{display:flex; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px solid var(--line)}
#dbg header b{font:800 22px var(--display); letter-spacing:.06em; text-transform:uppercase; color:var(--signal); flex:1}
#dbg nav{display:flex; flex-wrap:wrap; gap:2px; padding:6px 8px; border-bottom:1px solid var(--line)}
#dbg nav button{background:none; border:1px solid transparent; color:var(--dim); font:600 12px var(--mono); padding:4px 8px; cursor:pointer; text-transform:uppercase; letter-spacing:.08em}
#dbg nav button[aria-selected="true"]{color:var(--frost); border-color:var(--signal)}
#dbg .body{flex:1; overflow:auto; padding:10px 12px 40px; display:flex; flex-direction:column; gap:10px}
#dbg h4{margin:6px 0 0; font:600 11px var(--mono); letter-spacing:.14em; text-transform:uppercase; color:var(--dim)}
#dbg .row{display:flex; flex-wrap:wrap; gap:6px; align-items:center}
#dbg button.b{background:var(--panel2); color:var(--frost); border:1px solid var(--line); font:600 12px var(--body); padding:5px 9px; cursor:pointer}
#dbg button.b:hover{border-color:var(--signal)} #dbg button.b.on{background:var(--signal); color:var(--signal-ink); border-color:var(--signal)}
#dbg button.b.warn{border-color:#7a2a20; color:#ff9a8a}
#dbg input,#dbg select{background:#0e181d; color:var(--frost); border:1px solid var(--line); padding:4px 6px; font:12px var(--mono); min-width:0}
#dbg table{border-collapse:collapse; width:100%; font:12px var(--mono)} #dbg td{padding:2px 4px; border-bottom:1px solid #18252b; vertical-align:top} #dbg td:first-child{color:var(--dim); white-space:nowrap}
#dbg .list{display:flex; flex-direction:column; gap:3px; max-height:320px; overflow:auto; flex-shrink:0}
#dbg .it{display:flex; flex-shrink:0; gap:6px; align-items:center; padding:3px 4px; background:#0e181d} #dbg .it span{flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
#dbg .it img{width:22px; height:22px; image-rendering:pixelated}
#dbg canvas{width:100%; background:#0e181d; cursor:crosshair; image-rendering:pixelated}
#dbg .err{font:11.5px var(--mono); background:#1a0f0e; border-left:3px solid var(--bad); padding:4px 6px; white-space:pre-wrap; word-break:break-word}
#dbg .muted{color:var(--dim)}
#dbgHud{position:fixed; right:8px; bottom:150px; z-index:70; background:rgba(0,0,0,.6); color:#cfe; font:11px/1.35 var(--mono); padding:6px 8px; white-space:pre; pointer-events:none}
#dbgLabels{position:absolute; inset:0; pointer-events:none; overflow:hidden; z-index:5}
#dbgLabels div{position:absolute; left:0; top:0; transform-origin:0 0; font:10.5px/1.2 var(--mono); color:#fff; background:rgba(0,0,0,.62); padding:1px 4px; white-space:pre; margin-left:-40px}
#dbgLabels div.combat{color:#ffb0a0} #dbgLabels div.loot{color:#e8d48a; background:rgba(20,16,0,.6)}
`;
const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
const $=s=>document.querySelector(s);
const esc2=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const F={overlay:false,belief:false,nav:false,hud:false,loot:false}; let TABD='raid', open=false, panel=null;
const api=async(url,method='GET',body)=>{ const r=await fetch(url,{method,headers:Object.assign({'content-type':'application/json'},ACC.token?{authorization:'Bearer '+ACC.token}:{}),body:body?JSON.stringify(body):undefined,cache:'no-store'}); const j=await r.json().catch(()=>({})); if(!r.ok) throw new Error(j.error||('HTTP '+r.status)); return j; };
const host=()=>!NET.on||NET.host;
const say=t=>toast('Debug: '+t);

/* ---------- panel ---------- */
function openPanel(){
  if(open){ closePanel(); return; }
  open=true; panel=document.createElement('aside'); panel.id='dbg'; document.body.appendChild(panel);
  if(R&&!R.over){ R.paused=true; if(document.pointerLockElement) document.exitPointerLock(); }
  render();
}
function closePanel(resume){ open=false; if(panel) panel.remove(); panel=null; if(resume&&R&&!R.over&&!P.dead){ $('#pause').hidden=true; R.paused=false; lockPointer(); } }
const TABS=[['raid','Raid'],['ai','AI'],['player','Player'],['items','Items'],['world','World'],['map','Map & sled'],['server','Server'],['tests','Tests'],['log','Log']];
function render(){
  if(!panel) return;
  panel.innerHTML=`<header><b>Debug</b>${R&&!R.over?'<button class="b" data-a="resume">Close & play</button>':''}<button class="b" data-a="close">Close</button></header>
   <nav>${TABS.map(([k,l])=>`<button data-tab="${k}" aria-selected="${TABD===k}">${l}</button>`).join('')}</nav><div class="body" id="dbgBody"></div>`;
  panel.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ TABD=b.dataset.tab; render(); });
  panel.querySelector('[data-a=close]').onclick=()=>closePanel(false);
  const rs=panel.querySelector('[data-a=resume]'); if(rs) rs.onclick=()=>closePanel(true);
  const body=$('#dbgBody'); ({raid:tabRaid,ai:tabAI,player:tabPlayer,items:tabItems,world:tabWorld,map:tabMap,server:tabServer,tests:tabTests,log:tabLog})[TABD](body);
}
const tog=(k,obj,label)=>`<button class="b ${obj[k]?'on':''}" data-tog="${k}" data-obj="${obj===DBG?'DBG':'F'}">${label}</button>`;
function bindToggles(el){ el.querySelectorAll('[data-tog]').forEach(b=>b.onclick=()=>{ const o=b.dataset.obj==='DBG'?DBG:F; o[b.dataset.tog]=!o[b.dataset.tog]; if(!F.overlay) clearOverlay(); if(!F.nav) clearNav(); if(!F.loot) clearLabels('loot'); render(); }); }
function btns(el,map){ for(const [k,fn] of Object.entries(map)){ const b=el.querySelector(`[data-a="${k}"]`); if(b) b.onclick=async()=>{ try{ await fn(b); }catch(e){ say(e.message); } if(panel) render(); }; } }
const table=rows=>`<table>${rows.map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>`;

/* ---------- Raid ---------- */
function tabRaid(el){
  if(!R){ el.innerHTML=`<p class="muted">Not in a raid. Toggles here carry into your next raid.</p><div class="row">${tog('god',DBG,'God mode')}${tog('ammo',DBG,'Infinite ammo')}${tog('aiOff',DBG,'Freeze AI')}${tog('hud',F,'Debug HUD')}</div>`; bindToggles(el); return; }
  const alive=R.enemies.filter(e=>!e.dead), cmb=alive.filter(e=>e.state==='combat').length;
  el.innerHTML=`${table([['Map',`${esc2(MAPS[R.map].name)} · ${R.D.name} · seed ${R.seed??'?'}`],['Conditions',`${esc2(R.cond.label)} · ${R.cond.mod}${R.cond.hot?' ('+esc2(R.cond.hot)+')':''}`],['Time left',fmtTime(R.timeLeft)],['Online',NET.on?`${Object.keys(NET.players).length+1} players · ${NET.host?'you run the AI':'someone else runs the AI'}`:'solo'],
    ['Enemies',`${alive.length} alive of ${R.enemies.length} · ${cmb} in combat`],['Containers',`${R.conts.filter(c=>!c.body).length} · ${R.conts.filter(c=>c.opened).length} opened`],['You',`x ${P.pos.x.toFixed(1)} z ${P.pos.z.toFixed(1)} y ${P.y.toFixed(2)} · ${R.nav?(navFree(navCell(P.pos.x,P.pos.z))?'walkable cell':'blocked cell'):'no nav'}`]])}
   <h4>Cheats</h4><div class="row">${tog('god',DBG,'God mode')}${tog('ammo',DBG,'Infinite ammo')}${tog('aiOff',DBG,'Freeze AI')}${tog('hud',F,'Debug HUD')}${tog('loot',F,'Loot labels')}</div>
   <h4>Time</h4><div class="row">${[0.25,0.5,1,2].map(v=>`<button class="b ${DBG.scale===v?'on':''}" data-scale="${v}">${v}×</button>`).join('')}<button class="b" data-a="t60">+60 s</button><button class="b" data-a="t20">20 s left</button></div>
   <h4>Player</h4><div class="row"><button class="b" data-a="heal">Heal & warm</button><button class="b" data-a="refill">Refill magazine</button><button class="b" data-a="down">Go down</button><button class="b warn" data-a="die">Die</button></div>
   <h4>Raid</h4><div class="row"><button class="b" data-a="extract">Extract now</button><button class="b" data-a="exopen">Open all extracts</button>${R.doors&&R.doors.length?'<button class="b" data-a="doorsopen">Open locked rooms</button><button class="b" data-a="keys">Keys for this map</button>':''}${R.drop?'<button class="b" data-a="drop">Supply drop now</button>':''}${R.evac?'<button class="b" data-a="evac">Evac now</button>':''}<button class="b warn" data-a="killall">Kill all AI</button></div>
   ${R.boss?`<h4>Boss</h4><div class="row"><button class="b" data-a="bwake">Wake</button><button class="b" data-a="bphase">Next phase</button><button class="b" data-a="bmortar">Mortar on me</button><button class="b warn" data-a="bkill">Kill boss</button></div>`:''}
   <h4>Teleport · click the map</h4><canvas id="dbgMap" width="400" height="400"></canvas>
   <div class="row">${R.extracts.map((e,i)=>`<button class="b" data-tp="${i}">${esc2(e.name)}${e.active?'':' (closed)'}</button>`).join('')}${R.boss?'<button class="b" data-tpb="1">Boss</button>':''}</div>`;
  bindToggles(el);
  el.querySelectorAll('[data-scale]').forEach(b=>b.onclick=()=>{ DBG.scale=+b.dataset.scale; render(); });
  btns(el,{
    t60:()=>{ R.timeLeft+=60; if(R.endAt) R.endAt+=60000; }, t20:()=>{ R.timeLeft=20; if(R.endAt) R.endAt=performance.now()+20000; },
    heal:()=>{ for(const p of PARTS) P.hp[p]=MAXHP[p]; P.bleed={}; P.frac={}; P.temp=100; P.stam=100; if(P.down) revived(NET.id); },
    refill:()=>{ const w=curW(); if(w){ w.mag=wstats(w).magSize; } },
    down:()=>{ if(!P.down) goDown('Debug'); }, die:()=>{ DBG.god=false; reallyDie('Debug'); },
    extract:()=>{ closePanel(); endRaid('extract','Debug'); },
    drone:()=>{ if(NET.on&&!NET.host){ toast('Only the AI host can launch drones.'); return; } R.drones=R.drones||[]; const i=R.drones.length; const x=P.pos.x-Math.sin(P.yaw)*12, z=P.pos.z-Math.cos(P.yaw)*12; const d={i,x,z,y:P.y+3,vx:0,vz:0,vy:0,yaw:P.yaw,yawRate:0,hp:DRONE.hp,dead:false,home:{x,z},bat:300,landed:0,gainErr:0,brain:flyBrain(P.yaw),repT:0}; d.g=droneMesh(d); R.drones.push(d); render(); },
    dronekill:()=>{ for(const d of (R.drones||[])) if(!d.dead) droneHit(d,{dmg:999},{x:d.x,y:d.y,z:d.z},true); render(); },
    doorsopen:()=>{ for(const d of R.doors) openDoor(d,true); toast(`Opened ${R.doors.length} locked room${R.doors.length===1?'':'s'}`); },
    keys:()=>{ let n=0; for(const d of R.doors) if(addToPlayer(mk(d.L.key))) n++; toast(`${n} key${n===1?'':'s'} added to your gear`); },
    exopen:()=>{ for(const e of R.extracts) if(!e.active){ e.active=true; beacon(e); } },
    drop:()=>{ if(R.drop&&R.drop.state==='pending') R.drop.t=R.t+1; },
    evac:()=>{ if(R.evac&&R.evac.state==='pending') R.evac.t=R.t+1; },
    killall:()=>{ if(!host()) throw new Error('Only the player running the AI can do this.'); for(const e of R.enemies) if(!e.dead) killEnemy(e,false,null); },
    bwake:()=>{ if(!host()) throw new Error('Only the AI host can.'); if(!R.boss.awake){ R.boss.e.hp-=1; } },
    bphase:()=>{ if(!host()) throw new Error('Only the AI host can.'); const B=R.boss; if(!B.awake){ B.e.hp-=1; return; } B.e.hp=B.maxHp*(B.phase===1?0.6:0.3); },
    bmortar:()=>{ if(host()) bossEv({k:'mortar',x:P.pos.x,z:P.pos.z,d:2.4}); else addMortar(P.pos.x,P.pos.z,2.4); },
    bkill:()=>{ if(!host()) throw new Error('Only the AI host can.'); const e=R.boss.e; if(!e.dead) killEnemy(e,false,null); },
  });
  el.querySelectorAll('[data-tp]').forEach(b=>b.onclick=()=>{ const e=R.extracts[+b.dataset.tp]; tp(e.x+2,e.z+2); });
  el.querySelectorAll('[data-tpb]').forEach(b=>b.onclick=()=>{ const e=R.boss.e; tp(e.pos.x,e.pos.z+12); });
  const cv=$('#dbgMap'); drawMap(cv); cv.onclick=ev=>{ const r=cv.getBoundingClientRect(); const sc=cv.width/(2*(R.bound+8)); const x=((ev.clientX-r.left)/r.width*cv.width-cv.width/2)/sc, z=((ev.clientY-r.top)/r.height*cv.height-cv.height/2)/sc; tp(x,z); };
}
function tp(x,z){ if(R.heli&&R.heli.phase==='in'){ R.heli.t=R.heli.T; } const v=new THREE.Vector3(clamp(x,-R.bound,R.bound),0,clamp(z,-R.bound,R.bound)); if(R.nav&&!navFree(navCell(v.x,v.z))){ const j=navNearestFree(navCell(v.x,v.z)); if(j>=0){ const [a,b]=navXZ(j); v.x=a; v.z=b; } } P.pos.x=v.x; P.pos.z=v.z; P.y=0; P.vy=0; render(); say(`teleported to ${v.x.toFixed(0)}, ${v.z.toFixed(0)}`); }
function drawMap(cv){
  const g=cv.getContext('2d'), W=cv.width, H=cv.height, sc=W/(2*(R.bound+8)); const p=(x,z)=>[W/2+x*sc,H/2+z*sc];
  g.fillStyle='#0e181d'; g.fillRect(0,0,W,H);
  if(R.nav){ const N=R.nav; const img=g.createImageData(W,H); for(let py=0;py<H;py+=2) for(let px=0;px<W;px+=2){ const i=navCell((px-W/2)/sc,(py-H/2)/sc); if(i>=0&&N.grid[i]){ for(const [ox,oy] of [[0,0],[1,0],[0,1],[1,1]]){ const k=((py+oy)*W+px+ox)*4; img.data[k]=58; img.data[k+1]=74; img.data[k+2]=82; img.data[k+3]=255; } } } g.putImageData(img,0,0); }
  for(const b of R.bld){ const [x,y]=p(b.x0,b.z0); g.strokeStyle='#5b7581'; g.strokeRect(x,y,(b.x1-b.x0)*sc,(b.z1-b.z0)*sc); }
  for(const c of R.conts){ if(c.body) continue; const [x,y]=p(c.x,c.z); g.fillStyle=c.opened?'#555':'#e8c55a'; g.fillRect(x-1,y-1,2,2); }
  for(const e of R.enemies){ const [x,y]=p(e.pos.x,e.pos.z); g.fillStyle=e.dead?'#444':e.state==='combat'?'#ff5a4a':'#e2a04a'; g.beginPath(); g.arc(x,y,e.k.boss?5:2.5,0,7); g.fill(); }
  for(const e of R.extracts){ const [x,y]=p(e.x,e.z); g.fillStyle=e.active?'#7cc9a4':'#3a5a4a'; g.beginPath(); g.arc(x,y,4,0,7); g.fill(); }
  for(const id in NET.players){ const q=NET.players[id]; if(!q.st) continue; const [x,y]=p(q.st.x,q.st.z); g.fillStyle='#6cf'; g.fillRect(x-2,y-2,4,4); }
  const [mx,my]=p(P.pos.x,P.pos.z); g.fillStyle='#ff6b1a'; g.beginPath(); g.arc(mx,my,4,0,7); g.fill(); g.strokeStyle='#ff6b1a'; g.beginPath(); g.moveTo(mx,my); g.lineTo(mx-Math.sin(P.yaw)*12,my-Math.cos(P.yaw)*12); g.stroke();
}

/* ---------- AI ---------- */
let inspect=null;
function tabAI(el){
  const kinds=Object.keys(EK);
  const ns=R&&R.nav?R.nav.stats:null;
  el.innerHTML=`<div class="row">${tog('overlay',F,'AI overlay (F10)')}${tog('belief',F,'What they think (belief)')}${tog('nav',F,'Nav grid near me')}${tog('aiOff',DBG,'Freeze AI')}${tog('aiClassic',DBG,'Old AI (compare)')}</div>
   <p class="muted" style="margin:0">The overlay labels every enemy with kind, state, plan and health, and draws the path it is following. <b>What they think</b> draws the squad's belief about where you are: orange dots are the particle filter's guesses (brighter = more likely), the red ring is its best estimate and the purple square is where the tracker predicts you. Nav grid shades cells the AI treats as blocked within 12 m of you. <b>Old AI</b> switches the new brain off to compare.</p>
   ${aiLearnHtml()}
   ${R&&R.drones?droneHtml():''}
   ${R?`<h4>Spawn</h4><div class="row"><select id="dbgKind">${kinds.map(k=>`<option value="${k}">${esc2(EK[k].name)}</option>`).join('')}</select><input id="dbgN" type="number" min="1" max="12" value="1" style="width:50px"><button class="b" data-a="spawn">8 m ahead</button></div>
   <p class="muted" style="margin:0">${NET.on?'Online, spawns go through the AI host so every player gets them.':''}</p>
   <h4>Nearest enemy to your crosshair</h4><div class="row"><button class="b" data-a="pick">Pick</button>${inspect&&!inspect.dead?'<button class="b" data-a="itp">Teleport to it</button><button class="b" data-a="ifreeze">'+(inspect.frozen?'Unfreeze':'Freeze')+'</button><button class="b warn" data-a="ikill">Kill</button>':''}</div>
   ${inspect?table(inspectRows(inspect)):''}
   ${ns?`<h4>Pathfinding</h4>${table([['Grid',`${R.nav.n}×${R.nav.n} cells of ${R.nav.c} m`],['Paths found',ns.paths],['Searches that gave up',ns.fails],['Cells searched',ns.exp.toLocaleString()]])}`:''}`:'<p class="muted">Start a raid to spawn or inspect enemies.</p>'}`;
  bindToggles(el);
  btns(el,{
    spawn:()=>{ const kind=$('#dbgKind').value, n=Math.max(1,Math.min(12,+$('#dbgN').value||1)); if(!host()) throw new Error('Only the player running the AI can spawn online.'); const list=[]; for(let i=0;i<n;i++){ const a=P.yaw+(i-(n-1)/2)*0.25; list.push([+(P.pos.x-Math.sin(a)*8).toFixed(1),+(P.pos.z-Math.cos(a)*8).toFixed(1),kind]); } bossEv({k:'wave',list}); for(const e of R.enemies.slice(-n)){ e.state='patrol'; e.lastSeen=null; } },
    gareset:(b)=>{ if(!b.dataset.sure){ b.dataset.sure=1; b.textContent='Click again: forget everything they learned'; throw new Error('click again to confirm'); } gaReset(); say('the enemies forgot what they learned'); },
    gaevolve:()=>{ for(const name in gaLoad().pops) gaEvolve(gaPop(name)); gaSave(); say('bred a new generation'); },
    pick:()=>{ let best=null,bd=1e9; const fx=-Math.sin(P.yaw), fz=-Math.cos(P.yaw); for(const e of R.enemies){ if(e.dead) continue; const dx=e.pos.x-P.pos.x, dz=e.pos.z-P.pos.z, d=Math.hypot(dx,dz); const dot=(dx*fx+dz*fz)/(d||1); const s=d*(2-dot); if(dot>0.5&&s<bd){ bd=s; best=e; } } inspect=best; if(!best) say('no enemy in front of you'); },
    itp:()=>{ tp(inspect.pos.x+2,inspect.pos.z+2); }, ifreeze:()=>{ inspect.frozen=!inspect.frozen; }, ikill:()=>{ if(!host()) throw new Error('Only the AI host can.'); killEnemy(inspect,false,null); },
  });
}
function droneHtml(){ const rows=R.drones.map(d=>{ const b=d.brain; const err=b&&b.epg?Math.round(Math.abs(Math.atan2(Math.sin(ringAngle(b.epg)-d.yaw),Math.cos(ringAngle(b.epg)-d.yaw)))*57.3):0; return `<tr><td>${d.i+1}</td><td>${d.dead?'down':d.landed>0?'charging':b.mode}</td><td>${Math.max(0,Math.round(d.hp))}</td><td>${Math.round(d.bat||0)} s</td><td>${err}°</td><td>${Math.round(Math.hypot(d.x-P.pos.x,d.z-P.pos.z))} m</td><td>${d.seeing?'yes':''}</td></tr>`; }).join('');
  return `<h4>Drones (fly brain)</h4><table class="tbl"><tr><th>#</th><th>doing</th><th>hp</th><th>battery</th><th>compass off</th><th>from you</th><th>sees you</th></tr>${rows||'<tr><td colspan="7">none on this map</td></tr>'}</table><div class="row"><button class="b" data-a="drone">Launch a drone near me</button><button class="b warn" data-a="dronekill">Down all drones</button></div>`; }
function aiLearnHtml(){ const d=gaLoad(); const pops=Object.entries(d.pops); const bar=v=>`<span style="display:inline-block;width:60px;height:7px;background:#18252b;vertical-align:middle"><span style="display:block;height:100%;width:${Math.round(v*100)}%;background:var(--signal)"></span></span> ${v.toFixed(2)}`;
  return `<h4>Adaptive AI ${OPTS.aiLearn==='off'?'(off in Settings)':''}</h4>${pops.length?pops.map(([name,p])=>{ const mean=k=>p.ind.reduce((s,x)=>s+x.g[k],0)/p.ind.length; const tried=p.ind.filter(x=>x.n>0).length; const h=p.history.slice(-6);
    return `<p class="muted" style="margin:4px 0"><b>${name==='scav'?'Scavs':'Raiders, guards and other trained enemies'}</b> · generation ${p.gen} · ${tried}/${p.ind.length} genomes tried this generation${p.best?` · best last time ${p.best.fit}`:''}</p>${table(GENES.map(k=>[k,bar(mean(k))]))}${h.length?`<p class="muted" style="margin:4px 0">fitness by generation (best / average): ${h.map(x=>`${x.gen}: ${x.best}/${x.avg}`).join(' · ')}</p>`:''}`; }).join(''):'<p class="muted">Nothing learned yet: the population is made the first time enemies spawn in a raid.</p>'}
   <div class="row"><button class="b" data-a="gaevolve">Breed a generation now</button><button class="b warn" data-a="gareset">Forget what they learned</button></div>`; }
function inspectRows(e){ return [['Kind',`${esc2(e.k.name)} (#${e.idx})`],['Health',`${Math.round(e.hp)} body · ${e.headHp>9999?'—':Math.round(e.headHp)+' head'}`],['State',`${e.state}${e.sees?' · sees '+e.tgtId:''}${e.role?' · '+e.role:''}${e.mode?' · plan: '+e.mode:''}`],['Genes',e.genes?GENES.map(k=>k+' '+e.genes[k].toFixed(2)).join(' · ')+(e.gen?` (gen ${e.gen.gen} #${e.gen.i})`:''):'—'],['Scored on',`${Math.round(e.dmgDone||0)} damage dealt · ${Math.round(e.engT||0)} s fighting · ${Math.round(e.seeT||0)} s seeing you`],['Gun',`${ITEMS[e.gun.id].short} ${e.gun.mag}/${ITEMS[e.gun.id].magSize} · ${ITEMS[e.gun.ammo].short}`],['Armor',`${e.armor?ITEMS[e.armor.id].short+' '+Math.round(e.armor.dur):'none'} / ${e.helm?ITEMS[e.helm.id].short+' '+Math.round(e.helm.dur):'none'}`],
  ['Going to',e.lastSeen?`last seen ${e.lastSeen.x.toFixed(0)},${e.lastSeen.z.toFixed(0)}`:e.wp?`waypoint ${e.wp.x.toFixed(0)},${e.wp.z.toFixed(0)}`:'—'],['Path',e.path?`${e.path.length} points, at ${e.pi}`:(e.direct?'walking straight':'none')],['Stuck count',e.stuck||0],['Position',`${e.pos.x.toFixed(1)}, ${e.pos.z.toFixed(1)}`]]; }

/* ---------- Player / save ---------- */
function tabPlayer(el){
  ensureCos();
  el.innerHTML=`${table([['Cash',fmt$(S.cash)],['Caches / scrip',`${S.cos.caches} / ${S.cos.scrip}`],['Cosmetics',`${COS.filter(c=>cosOwned(c.id)).length}/${COS.length}`],['Tasks',`${S.q.done.length} done · ${Object.keys(S.q.active).length} active`],['Season',S.season??'—'],['Hideout',Object.entries(S.hide).map(([k,v])=>k+' '+v).join(' · ')]])}
   <h4>Money</h4><div class="row"><input id="dbgCash" type="number" value="100000" style="width:110px"><button class="b" data-a="cash">Add cash</button><button class="b" data-a="caches">+10 caches</button><button class="b" data-a="scrip">+1000 scrip</button></div>
   <h4>Unlocks</h4><div class="row"><button class="b" data-a="cos">Unlock all cosmetics</button><button class="b" data-a="hide">Max hideout</button><button class="b" data-a="loyal">Max trader loyalty</button><button class="b" data-a="pity">Reset cache pity</button></div>
   <h4>Tasks</h4><div class="row"><button class="b" data-a="qdone">Complete active tasks</button><button class="b" data-a="qall">Finish every task</button><button class="b" data-a="qreset">Reset tasks</button><button class="b" data-a="daily">New dailies</button></div>
   <h4>Save</h4><div class="row"><button class="b" data-a="copy">Copy save JSON</button><button class="b" data-a="paste">Load save from clipboard</button><button class="b warn" data-a="wipe">Wipe save</button></div>`;
  const done=()=>{ saveGame(); if(!R) renderTab(); else renderHeader(); };
  btns(el,{
    cash:()=>{ S.cash+=+$('#dbgCash').value||0; done(); }, caches:()=>{ S.cos.caches+=10; done(); }, scrip:()=>{ S.cos.scrip+=1000; done(); },
    cos:()=>{ for(const c of COS) grantCos(c.id); done(); }, hide:()=>{ for(const [k,m] of Object.entries(MODS)) S.hide[k]=m.max; S.stash.h=STASH_ROWS[S.hide.stash]; done(); },
    loyal:()=>{ S.spent=Math.max(S.spent,LOYAL[LOYAL.length-1]); done(); }, pity:()=>{ S.cos.pity={vr:0,leg:0}; done(); },
    qdone:()=>{ for(const id in S.q.active){ const q=QMAP[id]; if(q) S.q.active[id].p=q.obj.map(o=>o.n); } for(const d of S.q.daily.list) d.p=d.obj.map(o=>o.n); done(); },
    qall:()=>{ S.q.done=QUESTS.map(q=>q.id); S.q.active={}; done(); }, qreset:()=>{ S.q={active:{},done:[],daily:null}; normSave(); done(); },
    daily:()=>{ S.q.daily=null; ensureDailies(); done(); },
    copy:async()=>{ await navigator.clipboard.writeText(JSON.stringify(S)); say('save copied'); },
    paste:async()=>{ if(R) throw new Error('Leave the raid first.'); const o=JSON.parse(await navigator.clipboard.readText()); if(!o||o.v!==2) throw new Error('That is not a save.'); S=o; normSave(); done(); say('save loaded'); },
    wipe:(b)=>{ if(R) throw new Error('Leave the raid first.'); if(!b.dataset.sure){ b.dataset.sure=1; b.textContent='Click again to wipe'; throw new Error('click again to confirm'); } const n=S.name, c=S.career, cos=S.cos, se=S.season; S=newSave(); S.name=n; S.career=c; S.cos=cos; S.season=se; normSave(); done(); say('save wiped (career and cosmetics kept)'); },
  });
}

/* ---------- Items ---------- */
let itemQ='';
function tabItems(el){
  const list=Object.values(ITEMS).filter(d=>!d.fixed&&d.type!=='pockets'&&(!itemQ||(d.name+' '+d.id+' '+d.type).toLowerCase().includes(itemQ)));
  el.innerHTML=`<div class="row"><input id="dbgQ" placeholder="search items" value="${esc2(itemQ)}" style="flex:1"><span class="muted">${R?'goes into your pack/rig/pockets':'goes to your stash'}</span></div>
   <div class="list">${list.map(d=>`<div class="it"><img src="${iconFor(d.id)}" alt=""><span title="${esc2(d.id)}">${esc2(d.name)} <span class="muted">${d.type}</span></span>${d.stack?`<input type="number" min="1" max="${d.stack}" value="${d.stack}" style="width:58px" data-qty="${d.id}">`:''}<button class="b" data-give="${d.id}">Give</button></div>`).join('')}</div>
   <h4>Kits</h4><div class="row"><button class="b" data-kit="end">End-game kit</button><button class="b" data-kit="relic">All relic materials</button></div>`;
  const q=$('#dbgQ'); q.oninput=()=>{ itemQ=q.value.toLowerCase().trim(); const pos=q.selectionStart; render(); const q2=$('#dbgQ'); q2.focus(); q2.setSelectionRange(pos,pos); };
  const give=(id,n)=>{ const d=ITEMS[id]; const it=mk(id,d.stack?{n:Math.max(1,Math.min(d.stack,n||d.stack))}:d.type==='weapon'?{mag:d.magSize}:{}); const ok=R?addToPlayer(it):place(S.stash,it); if(!ok) throw new Error('no room for '+d.name); if(!R){ saveGame(); renderTab(); } else if(R.invOpen) R.dirty=true; };
  el.querySelectorAll('[data-give]').forEach(b=>b.onclick=()=>{ try{ const id=b.dataset.give; const qi=el.querySelector(`[data-qty="${id}"]`); give(id,qi?+qi.value:0); say('gave '+ITEMS[id].name); }catch(e){ say(e.message); } });
  el.querySelectorAll('[data-kit]').forEach(b=>b.onclick=()=>{ try{ const kit=b.dataset.kit==='end'?['nordlys','jarlmg','wraith','isbjorn','a762','a762','a762','fieldkit','fieldkit','scope4','suppr']:['tr_chief','tr_warden','tr_foreman','cryocell','cryocell','cryocell','cryocell','cryocell','cryocell','glacier','warden','kestrel']; for(const id of kit) give(id,0); say('kit given'); }catch(e){ say(e.message); } });
}

/* ---------- World ---------- */
function tabWorld(el){
  const c=DBG.cond||{};
  el.innerHTML=`<p class="muted" style="margin:0">These apply to your next <b>solo</b> raid. Online raids always use the server's seed and the shared rotation.</p>
   <h4>Next solo raid</h4><div class="row"><label class="muted">Seed</label><input id="dbgSeed" type="number" value="${DBG.seed??''}" placeholder="random" style="width:120px"></div>
   <div class="row"><label class="muted">Weather</label><select id="dbgW"><option value="">rotation</option>${Object.entries(WEATHER).map(([k,w])=>`<option value="${k}" ${c.weather===k?'selected':''}>${esc2(w.name)}</option>`).join('')}</select>
   <label class="muted">Modifier</label><select id="dbgM"><option value="">rotation</option>${Object.entries(RMODS).map(([k,m])=>`<option value="${k}" ${c.mod===k?'selected':''}>${esc2(m.name||'none')}</option>`).join('')}</select></div>
   <div class="row"><button class="b" data-a="apply">Apply</button><button class="b" data-a="clear">Clear</button><span class="muted">${DBG.cond||DBG.seed!=null?'Forced: '+[DBG.seed!=null?'seed '+DBG.seed:'',c.weather||'',c.mod||''].filter(Boolean).join(' · '):'nothing forced'}</span></div>
   <h4>Rotation right now</h4>${table(Object.keys(MAPS).map(k=>{ const cc=conditions(k); return [esc2(MAPS[k].name),`${esc2(cc.label)}${cc.modText?' · '+esc2(cc.modText):''}`]; }))}`;
  btns(el,{
    apply:()=>{ const sd=$('#dbgSeed').value.trim(); DBG.seed=sd===''?null:(+sd|0); const w=$('#dbgW').value, m=$('#dbgM').value; DBG.cond=(w||m)?{weather:w||null,mod:m||null}:null; say('applied'); },
    clear:()=>{ DBG.seed=null; DBG.cond=null; },
  });
}

/* ---------- Map & sled: the server-held world config ---------- */
let WDRAFT=null;
function wd(){ if(!WDRAFT) WDRAFT=JSON.parse(JSON.stringify(WORLD||{})); WDRAFT.sled=WDRAFT.sled||{}; WDRAFT.storvidda=WDRAFT.storvidda||{}; if(!Array.isArray(WDRAFT.storvidda.props)) WDRAFT.storvidda.props=[]; return WDRAFT; }
const SLED_FIELDS=[['P','Engine power (W)'],['Fb','Brake force (N)'],['Cf','Ski grip'],['Cr','Track grip'],['muF','Ski friction'],['muR','Track friction'],['Kr','Yaw damping'],['CdA','Air drag'],['m','Mass (kg)'],['lock','Steering lock (rad)'],['turn','Turn rate'],['rMax','Max yaw rate (rad/s)'],['straight','Self-straightening']];
const TD_FIELDS=[['spawnR','Insert radius (m)'],['exR','Extract radius (m)'],['zoneR','Relay pad radius (m)'],['hill','Hill height ×'],['hillScale','Hill size ×'],['trees','Tree density ×'],['rocks','Rock count ×']];
const PROP_TYPES=[['tree','Tree'],['rock','Boulder'],['drift','Snow drift'],['cover','Concrete cover (faces your way)'],['shipc','Shipping container (faces your way)'],['crate','Weapon crate'],['cargo','Cargo crate'],['locker','Locker'],['tool','Toolbox'],['med','Medical cabinet'],['hut','Wooden hut (gets its own flat pad)']];
function tabMap(el){
  const W=wd(); const sv=k=>W.sled[k]??SLED_DEF[k]; const tv=k=>W.storvidda[k]??TD_DEF[k]; const sp=W.storvidda.spawns||[], pr=W.storvidda.props;
  const inRaid=!!(R&&!R.over&&P); const here=inRaid?`${Math.round(P.pos.x)}, ${Math.round(P.pos.z)}`:'not in a raid';
  el.innerHTML=`<p class="muted" style="margin:0">Saved values live on the server and are used by every raid that starts afterwards, solo and online, for everyone. Layout changes need a new raid; <b>Try now</b> changes the sled under you immediately.</p>
   <h4>Snowmobile handling</h4><table>${SLED_FIELDS.map(([k,l])=>`<tr><td>${l}</td><td><input data-sf="${k}" type="number" step="any" value="${sv(k)}" style="width:100px"> <span class="muted">default ${SLED_DEF[k]}</span></td></tr>`).join('')}</table>
   <p class="muted" style="margin:0">Turning: a tighter sled is a higher <b>turn rate</b> and <b>max yaw rate</b>, plus more <b>ski grip</b> and <b>ski friction</b> so the nose bites. Lower <b>self-straightening</b> makes it stay in a slide longer.</p>
   <div class="row"><button class="b" data-a="trySled">Try now</button><button class="b" data-a="defSled">Defaults</button></div>
   <h4>Storvidda layout</h4><table>${TD_FIELDS.map(([k,l])=>`<tr><td>${l}</td><td><input data-tf="${k}" type="number" step="any" value="${tv(k)}" style="width:100px"> <span class="muted">default ${TD_DEF[k]}</span></td></tr>`).join('')}</table>
   <h4>Insert points</h4><p class="muted" style="margin:0">You are at ${here}. An empty list means the standard eight at the insert radius. Each insert faces the relay.</p>
   <div class="list">${sp.map((q,i)=>`<div class="it"><span>#${i+1}: ${Math.round(q.x)}, ${Math.round(q.z)}</span><button class="b" data-spset="${i}" ${inRaid?'':'disabled'}>Set to here</button><button class="b" data-sptp="${i}" ${inRaid?'':'disabled'}>Go</button><button class="b warn" data-spdel="${i}">×</button></div>`).join('')||'<span class="muted">standard eight</span>'}</div>
   <div class="row"><button class="b" data-a="spAdd" ${inRaid?'':'disabled'}>Add an insert here</button><button class="b" data-a="spStd" ${inRaid?'':'disabled'}>Start from the standard eight</button><button class="b" data-a="spClear">Clear list</button></div>
   <h4>Placed objects</h4><div class="row"><select id="dbgPt">${PROP_TYPES.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select><button class="b" data-a="prAdd" ${inRaid?'':'disabled'}>Place at my position</button></div>
   <div class="list">${pr.map((q,i)=>`<div class="it"><span>${esc2(q.t)} at ${Math.round(q.x)}, ${Math.round(q.z)}</span><button class="b" data-prtp="${i}" ${inRaid?'':'disabled'}>Go</button><button class="b warn" data-prdel="${i}">×</button></div>`).join('')||'<span class="muted">none</span>'}</div>
   <h4>Save</h4><div class="row"><button class="b" data-a="save">Save to server</button><button class="b" data-a="reload">Discard edits</button><button class="b warn" data-a="reset">Reset everything to defaults</button></div>
   <p class="muted" style="margin:0">Players already in a raid keep that raid's version; the next raid anyone starts uses what you saved.</p>`;
  const collect=()=>{ el.querySelectorAll('[data-sf]').forEach(i=>{ const v=parseFloat(i.value); if(isFinite(v)) W.sled[i.dataset.sf]=v; }); el.querySelectorAll('[data-tf]').forEach(i=>{ const v=parseFloat(i.value); if(isFinite(v)) W.storvidda[i.dataset.tf]=v; }); };
  const goto=(x,z)=>{ if(!inRaid) return; P.pos.x=x; P.pos.z=z; if(R.ride&&R.ride.mode==='drive'){ R.sled.x=x; R.sled.z=z; R.sled.y=R.terrain?R.terrain(x,z):0; R.sled.u=R.sled.w=R.sled.r=0; R.sled.vy=0; } P.y=groundAt(x,z,(R.terrain?R.terrain(x,z):0)+2); P.vy=0; };
  btns(el,{
    trySled:()=>{ collect(); Object.assign(SLED,SLED_DEF,W.sled); SLED.k=SLED.m*9.81/SLED.c0; SLED.cd=2*0.6*Math.sqrt(SLED.k*SLED.m); say('sled updated for this raid'); },
    defSled:()=>{ W.sled={}; Object.assign(SLED,SLED_DEF); SLED.k=SLED.m*9.81/SLED.c0; SLED.cd=2*0.6*Math.sqrt(SLED.k*SLED.m); },
    spAdd:()=>{ collect(); (W.storvidda.spawns=W.storvidda.spawns||[]).push({x:Math.round(P.pos.x),z:Math.round(P.pos.z)}); },
    spStd:()=>{ collect(); W.storvidda.spawns=TD_PADS.filter(p=>p.kind==='spawn').map(p=>({x:p.x,z:p.z})); },
    spClear:()=>{ collect(); W.storvidda.spawns=[]; },
    prAdd:()=>{ collect(); W.storvidda.props.push({t:$('#dbgPt').value,x:Math.round(P.pos.x*10)/10,z:Math.round(P.pos.z*10)/10,r:+P.yaw.toFixed(2)}); },
    save:async()=>{ collect(); const r=await api('api/admin/world','POST',{world:W}); WORLD=r.world; WDRAFT=null; if(!R) applyWorld(WORLD); say('saved: next raids use it'); },
    reload:()=>{ WDRAFT=null; },
    reset:async(b)=>{ if(!b.dataset.sure){ b.dataset.sure=1; b.textContent='Click again to reset'; throw new Error('click again to confirm'); } const r=await api('api/admin/world','POST',{world:{}}); WORLD=r.world; WDRAFT=null; Object.assign(SLED,SLED_DEF); say('reset'); },
  });
  el.querySelectorAll('[data-spset]').forEach(b=>b.onclick=()=>{ collect(); W.storvidda.spawns[+b.dataset.spset]={x:Math.round(P.pos.x),z:Math.round(P.pos.z)}; render(); });
  el.querySelectorAll('[data-sptp]').forEach(b=>b.onclick=()=>{ const q=W.storvidda.spawns[+b.dataset.sptp]; goto(q.x,q.z); closePanel(true); });
  el.querySelectorAll('[data-spdel]').forEach(b=>b.onclick=()=>{ collect(); W.storvidda.spawns.splice(+b.dataset.spdel,1); render(); });
  el.querySelectorAll('[data-prtp]').forEach(b=>b.onclick=()=>{ const q=W.storvidda.props[+b.dataset.prtp]; goto(q.x+2,q.z+2); closePanel(true); });
  el.querySelectorAll('[data-prdel]').forEach(b=>b.onclick=()=>{ collect(); W.storvidda.props.splice(+b.dataset.prdel,1); render(); });
}

/* ---------- Server ---------- */
let srv=null, srvErr='';
let GIVE_LAST='', GIVE_TO='';
async function loadSrv(){ try{ srv=await api('api/admin/state'); srvErr=''; }catch(e){ srvErr=e.message; } if(panel&&TABD==='server') render(); }
function tabServer(el){
  if(!NET.avail){ el.innerHTML='<p class="muted">Not running on the server.</p>'; return; }
  if(!srv&&!srvErr){ el.innerHTML='<p class="muted">Loading…</p>'; loadSrv(); return; }
  if(srvErr){ el.innerHTML=`<p class="err">${esc2(srvErr)}</p><button class="b" data-a="r">Retry</button>`; btns(el,{r:()=>{ srvErr=''; loadSrv(); }}); return; }
  el.innerHTML=`${table([['Up',fmtTime(srv.uptime)+' · '+srv.mem+' MB'],['Season',`${srv.season.n} · ends ${new Date(srv.season.end).toLocaleDateString()}`],['Accounts',srv.accounts],['Admins',srv.admins.join(', ')]])}<div class="row"><button class="b" data-a="refresh">Refresh</button></div>
   <h4>Online (${srv.players.length})</h4><div class="list">${srv.players.map(q=>`<div class="it"><span>${esc2(q.name)}${q.account?(q.account!==String(q.name||'').toLowerCase()?` <span class="muted">(account ${esc2(q.account)})</span>`:''):' <span class="muted">guest</span>'} <span class="muted">${q.room?'in '+q.room:q.lobby?'lobby '+q.lobby:'hideout'}${q.squad?' · squad':''}</span></span>${q.account?`<button class="b" data-giveto="${esc2(q.account)}">Give…</button>`:''}${q.id!==NET.id?`<button class="b warn" data-kick="${q.id}">Kick</button>`:''}</div>`).join('')}</div>
   <h4>Raids (${srv.rooms.length})</h4><div class="list">${srv.rooms.map(r=>`<div class="it"><span>${r.id} · ${esc2(MAPS[r.map]?MAPS[r.map].name:r.map)} · ${r.diff} · ${fmtTime(r.timeLeft)} · ${r.players.map(esc2).join(', ')} <span class="muted">AI: ${esc2(r.host||'—')}</span></span><button class="b warn" data-end="${r.id}">End</button></div>`).join('')||'<span class="muted">none</span>'}</div>
   <h4>Lobbies (${srv.lobbies.length})</h4><div class="list">${srv.lobbies.map(l=>`<div class="it"><span>${esc2(l.name)} · ${esc2(l.map)} · ${l.state} · ${l.members.map(esc2).join(', ')}</span></div>`).join('')||'<span class="muted">none</span>'}</div>
   <h4>Message everyone</h4><div class="row"><input id="dbgBc" placeholder="Server restarting in 5 minutes" style="flex:1"><button class="b" data-a="bc">Send</button></div>
   <h4 id="dbgGiveH">Give money or items to a player</h4>
   <p class="muted">Account name, as it appears in the Online list above (start typing for suggestions). Online players get it straight away, mid-raid too; offline players find it when they next sign in. A negative cash amount takes money away (never below $0).</p>
   <datalist id="dbgNames">${(srv.names||[]).map(n=>`<option value="${esc2(n)}">`).join('')}</datalist>
   <div class="row"><input id="dbgTo" list="dbgNames" placeholder="account name" style="width:140px" autocomplete="off"><input id="dbgGc" type="number" placeholder="cash" style="width:96px"><button class="b" data-amt="10000">+10k</button><button class="b" data-amt="100000">+100k</button><button class="b" data-amt="1000000">+1M</button></div>
   <div class="row"><input id="dbgGk" type="number" min="0" placeholder="caches" style="width:72px"><input id="dbgGs" type="number" min="0" placeholder="scrip" style="width:72px"><input id="dbgGi" placeholder="item id (optional)" style="width:140px"><input id="dbgGn" type="number" placeholder="qty" style="width:56px"><button class="b" data-a="give">Send</button></div>
   <p class="muted" id="dbgGiveOut"></p>
   <h4>Season</h4><div class="row"><button class="b warn" data-a="season">End season now</button></div>
   <h4>Backups</h4><p class="muted">${srv.db?`kolvik.sqlite · ${(srv.db.size/1024).toFixed(0)} KB · ${srv.db.users} accounts, ${srv.db.saves} saves, ${srv.db.dms} threads · daily snapshots: ${srv.db.snapshots.length?esc2(srv.db.snapshots[0]):'none yet'}`:''}</p>
   <div class="row"><button class="b" data-a="bakjson">Download backup (.json)</button><button class="b" data-a="bakdb">Download database (.sqlite)</button><button class="b" data-a="snap">Snapshot now</button></div>
   <div class="row"><input type="file" id="dbgRestore" accept=".json,application/json" style="flex:1"><button class="b warn" data-a="restore">Restore from .json</button></div>
   <p class="muted">Restore puts every account, save and message thread in the file back into the database (overwriting ones with the same name); accounts created since the backup are kept.</p>`;
  const dl=async(q,fname)=>{ const r=await fetch('api/admin/backup'+q,{headers:{authorization:'Bearer '+ACC.token},cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status); const m=/filename="([^"]+)"/.exec(r.headers.get('content-disposition')||''); const u=URL.createObjectURL(await r.blob()); const a=document.createElement('a'); a.href=u; a.download=m?m[1]:fname; a.click(); setTimeout(()=>URL.revokeObjectURL(u),5000); };
  btns(el,{
    refresh:loadSrv,
    bakjson:()=>dl('','kolvik-backup.json'),
    bakdb:()=>dl('?format=sqlite','kolvik.sqlite'),
    snap:async()=>{ const r=await api('api/admin/snapshot','POST'); say('saved '+r.file); loadSrv(); },
    restore:async(b)=>{ const f=$('#dbgRestore').files[0]; if(!f) throw new Error('choose a backup .json first'); if(!b.dataset.sure){ b.dataset.sure=1; b.textContent='Click again to restore'; throw new Error('click again to confirm'); } const doc=JSON.parse(await f.text()); const r=await api('api/admin/restore','POST',{backup:doc}); say(`restored ${r.users} accounts, ${r.saves} saves`); loadSrv(); },
    bc:async()=>{ const t=$('#dbgBc').value.trim(); if(t){ await api('api/admin/broadcast','POST',{text:t}); say('sent'); } },
    give:async()=>{ const it=$('#dbgGi').value.trim(); if(it&&!ITEMS[it]) throw new Error('unknown item id'); const to=$('#dbgTo').value.trim(); if(!to) throw new Error('type an account name'); GIVE_TO=to; const r=await api('api/admin/give','POST',{name:to,cash:Math.round(+$('#dbgGc').value||0),caches:+$('#dbgGk').value||0,scrip:+$('#dbgGs').value||0,items:it?[[it,+$('#dbgGn').value||1]]:[]}); GIVE_LAST=`Sent to ${r.account}: ${r.delivered}`; say(GIVE_LAST); },
    season:async(b)=>{ if(!b.dataset.sure){ b.dataset.sure=1; b.textContent='Click again: wipes everyone'; throw new Error('click again to confirm'); } await api('api/admin/season/next','POST'); say('season ended'); loadSrv(); },
  });
  { const out=el.querySelector('#dbgGiveOut'); if(out) out.textContent=GIVE_LAST; const t=el.querySelector('#dbgTo'); if(t&&GIVE_TO) t.value=GIVE_TO; }
  el.querySelectorAll('[data-giveto]').forEach(b=>b.onclick=()=>{ const t=el.querySelector('#dbgTo'); t.value=b.dataset.giveto; el.querySelector('#dbgGiveH').scrollIntoView({block:'start'}); el.querySelector('#dbgGc').focus(); });
  el.querySelectorAll('[data-amt]').forEach(b=>b.onclick=()=>{ const c=el.querySelector('#dbgGc'); c.value=(Math.round(+c.value||0))+(+b.dataset.amt); });
  el.querySelectorAll('[data-kick]').forEach(b=>b.onclick=async()=>{ try{ await api('api/admin/kick','POST',{id:b.dataset.kick}); loadSrv(); }catch(e){ say(e.message); } });
  el.querySelectorAll('[data-end]').forEach(b=>b.onclick=async()=>{ try{ await api('api/admin/endroom','POST',{id:b.dataset.end}); loadSrv(); }catch(e){ say(e.message); } });
}

/* ---------- Tests ---------- */
// item-tests.js is fetched the same way as this file (admins only) and runs every item through the game's own code
let TREP=null, TBUSY='', TERR='', TSHOW='fail';
async function loadTests(){ if(window.KolvikItemTests) return; const r=await fetch('item-tests.js',{headers:{authorization:'Bearer '+ACC.token},cache:'no-store'}); if(!r.ok) throw new Error('could not load item-tests.js (HTTP '+r.status+')'); const sc=document.createElement('script'); sc.textContent=await r.text(); document.body.appendChild(sc); }
function tabTests(el){
  const sm=TREP&&TREP.summary;
  const rows=TREP?[...TREP.global,...TREP.items].filter(r=>TSHOW==='all'||(TSHOW==='fail'?r.fails.length:r.fails.length||r.warns.length)):[];
  const col=r=>r.fails.length?'var(--bad)':r.warns.length?'var(--signal)':'#4caf50';
  el.innerHTML=`<p class="muted">Runs every item through the game's own code: definition, icon, stash, save/load, equip, sell, buy, attachments, containers. <b>Full</b> also starts a solo test raid and picks up, fires, reloads, uses and gets shot with each one. Your save is swapped out while it runs and put back afterwards.</p>
   <div class="row"><button class="b" data-a="quick" ${TBUSY||R?'disabled':''}>Run quick (hideout)</button><button class="b" data-a="full" ${TBUSY||R?'disabled':''}>Run full (+ raid)</button>${TREP?'<button class="b" data-a="copy">Copy report</button>':''}</div>
   ${R&&!TBUSY?'<p class="muted">Leave the raid first.</p>':''}<p id="dbgTBusy">${TBUSY?'Running… '+esc2(TBUSY):''}</p>${TERR?`<p class="err">${esc2(TERR)}</p>`:''}
   ${sm?`${table([['Items',sm.items],['Checks',sm.checks],['Failing',sm.failed],['Warnings only',sm.warned],['Passed',sm.passed],['Mode',sm.raid?'hideout + raid':'hideout only'],['Took',(sm.ms/1000).toFixed(1)+' s']])}
   <div class="row">${[['fail','Failing'],['warn','Failing + warnings'],['all','Everything']].map(([k,l])=>`<button class="b ${TSHOW===k?'on':''}" data-show="${k}">${l}</button>`).join('')}</div>
   <div class="list" style="max-height:none">${rows.map(r=>`<div class="err" style="border-left-color:${col(r)}"><b>${esc2(r.name)}</b> <span class="muted">${esc2(r.id)} · ${esc2(r.type)} · ${r.checks} checks</span>${r.fails.map(m=>'\n✗ '+esc2(m)).join('')}${r.warns.map(m=>'\n! '+esc2(m)).join('')}${TSHOW==='all'?r.notes.map(m=>'\n· '+esc2(m)).join(''):''}</div>`).join('')||'<span class="muted">nothing to show</span>'}</div>`:''}`;
  const go=async raid=>{ TERR=''; TBUSY='loading'; render();
    try{ await loadTests(); TREP=await KolvikItemTests.run({raid,progress:t=>{ TBUSY=t; const p=document.getElementById('dbgTBusy'); if(p) p.textContent='Running… '+t; }}); console.log(KolvikItemTests.text(TREP)); }catch(e){ TERR=e.message; }
    TBUSY=''; TABD='tests'; if(!open) openPanel(); else render(); };
  btns(el,{ quick:()=>go(false), full:()=>go(true), copy:async()=>{ await navigator.clipboard.writeText(KolvikItemTests.text(TREP)+'\n\n'+JSON.stringify(TREP,null,1)); say('copied'); } });
  el.querySelectorAll('[data-show]').forEach(b=>b.onclick=()=>{ TSHOW=b.dataset.show; render(); });
}

/* ---------- Log ---------- */
let srvErrs=null;
function tabLog(el){
  const rate=netRate();
  el.innerHTML=`<h4>Network</h4>${table([['Messages in / out',`${rate.in}/s · ${rate.out}/s`],['Bytes in / out',`${(rate.bin/1024).toFixed(1)} KB/s · ${(rate.bout/1024).toFixed(1)} KB/s`],['Most common',Object.entries(NETSTAT.types).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>`${k} ${v}`).join(' · ')||'—']])}
   <h4>Errors in this browser (${ERRLOG.length})</h4><div class="list">${ERRLOG.slice().reverse().map(e=>`<div class="err">${new Date(e.t).toLocaleTimeString()} · ${esc2(e.where)}\n${esc2(e.msg)}\n${esc2(e.stack.split('\n').slice(0,3).join('\n'))}</div>`).join('')||'<span class="muted">none</span>'}</div>
   <h4>Errors reported by every player</h4><div class="row"><button class="b" data-a="load">${srvErrs?'Refresh':'Load'}</button>${srvErrs?'<button class="b" data-a="clear">Clear</button>':''}<button class="b" data-a="copy">Copy all</button></div>
   ${srvErrs?`<div class="list">${srvErrs.map(e=>`<div class="err">${new Date(e.t).toLocaleString()} · ${esc2(e.account||e.name)} · ${esc2(e.where)}\n${esc2(e.msg)}\n${esc2(String(e.stack).split('\n').slice(0,3).join('\n'))}\n<span class="muted">${esc2(e.ua)}</span></div>`).join('')||'<span class="muted">none reported</span>'}</div>`:''}`;
  btns(el,{
    load:async()=>{ srvErrs=(await api('api/admin/errors')).errors; },
    clear:async()=>{ await api('api/admin/errors/clear','POST'); srvErrs=[]; },
    copy:async()=>{ await navigator.clipboard.writeText(JSON.stringify({local:ERRLOG,server:srvErrs||[]},null,1)); say('copied'); },
  });
}
let lastNet={t:performance.now(),in:0,out:0,bin:0,bout:0}, netR={in:0,out:0,bin:0,bout:0};
function netRate(){ const now=performance.now(), dt=(now-lastNet.t)/1000; if(dt>1){ for(const k of ['in','out','bin','bout']){ netR[k]=Math.round((NETSTAT[k]-lastNet[k])/dt); lastNet[k]=NETSTAT[k]; } lastNet.t=now; } return netR; }

/* ---------- in-world overlay ---------- */
const v3=new THREE.Vector3(); let labelBox=null; const lines=new Map(); let navMesh=null, navT=0, fps={n:0,t:performance.now(),v:0,ms:0};
function labels(){ if(!labelBox||!labelBox.isConnected){ labelBox=document.createElement('div'); labelBox.id='dbgLabels'; $('#hud').appendChild(labelBox); } return labelBox; }
function clearLabels(kind){ if(!labelBox) return; for(const el of [...labelBox.children]) if(!kind||el.dataset.k===kind) el.remove(); }
function label(key,kind,x,y,z,text,cls){ const box=labels(); let el=box.querySelector(`[data-id="${key}"]`); if(!el){ el=document.createElement('div'); el.dataset.id=key; el.dataset.k=kind; box.appendChild(el); }
  v3.set(x,y,z).project(camera); if(v3.z>1||Math.abs(v3.x)>1.1||Math.abs(v3.y)>1.1){ el.style.display='none'; return; } el.style.display=''; el.style.transform=`translate(${Math.round((v3.x+1)/2*innerWidth)}px,${Math.round((1-v3.y)/2*innerHeight)}px)`; if(el._t!==text){ el._t=text; el.textContent=text; } el.className=cls||''; el._seen=true; }
function clearOverlay(){ clearLabels('ai'); for(const l of lines.values()){ scene&&scene.remove(l.line); l.line.geometry.dispose(); } lines.clear(); }
function clearNav(){ if(navMesh){ scene&&scene.remove(navMesh); navMesh.geometry.dispose(); navMesh=null; } }
function overlay(){
  if(!labelBox) labels(); for(const el of labelBox.children) el._seen=false;
  for(const e of R.enemies){ const d=Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z); if(d>90||e.dead&&d>25){ continue; }
    const txt=`${e.k.name}${e.dead?' (dead)':''} · g${e.grp}\n${e.state}${e.mode?' · '+e.mode.toUpperCase():''}${e.susp?' · BODY':''}${e.sent?' · SENT':''}${e.aware>R.t?' · wary':''}${e.role?' · '+e.role:''}${e.sees?' · SEES':''}\nhp ${Math.round(e.hp)}${e.stuck?' · stuck '+e.stuck:''}${e.frozen?' · frozen':''}`;
    label('e'+e.idx,'ai',e.pos.x,2.3*(e.k.boss?1.45:1),e.pos.z,txt,e.state==='combat'?'combat':'');
    let L=lines.get(e); if(e.path&&!e.dead){ if(!L||L.path!==e.path){ if(L){ scene.remove(L.line); L.line.geometry.dispose(); } const pts=[new THREE.Vector3(e.pos.x,0.15,e.pos.z),...e.path.map(([x,z])=>new THREE.Vector3(x,0.15,z))]; const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:e.state==='combat'?0xff5a4a:0x6cf0ff,depthTest:false})); line.renderOrder=999; scene.add(line); L={line,path:e.path}; lines.set(e,L); } else { const a=L.line.geometry.attributes.position; a.setXYZ(0,e.pos.x,0.15,e.pos.z); a.needsUpdate=true; } }
    else if(L){ scene.remove(L.line); L.line.geometry.dispose(); lines.delete(e); } }
  for(const d of (R.drones||[])){ const dd=Math.hypot(d.x-P.pos.x,d.z-P.pos.z); if(dd>220) continue; const b=d.brain; const err=b&&b.epg?Math.round(Math.abs(Math.atan2(Math.sin(ringAngle(b.epg)-d.yaw),Math.cos(ringAngle(b.epg)-d.yaw)))*57.3):0;
    label('d'+d.i,'ai',d.x,d.y+0.8-(d.y-(R.terrain?R.terrain(d.x,d.z):0)),d.z,`Drone ${d.i+1}${d.dead?' (down)':''}\n${b?b.mode.toUpperCase():''}${d.seeing?' · SEES':''} · hp ${Math.max(0,Math.round(d.hp))}\nbattery ${Math.round(d.bat||0)} s · compass off ${err}° · loom ${b?b.loom.toFixed(1):0}`,d.seeing?'combat':''); }
  for(const el of [...labelBox.children]) if(el.dataset.k==='ai'&&!el._seen) el.remove();
}
function lootLabels(){ if(!labelBox) labels(); for(const c of R.conts){ const d=Math.hypot(c.x-P.pos.x,c.z-P.pos.z); const key='c'+c.cid; if(d>40){ const el=labelBox.querySelector(`[data-id="${key}"]`); if(el) el.remove(); continue; } const v=Math.round(c.cont.items.reduce((t,it)=>t+deepValue(it),0)); label(key,'loot',c.x,1.4,c.z,`${c.name}${c.locked&&!R.bossDown?' (sealed)':''}\n${c.cont.items.length} items · ${fmt$(v)}`,'loot'); } }
function navViz(){ if(!R.nav) return; if(performance.now()<navT) return; navT=performance.now()+400; clearNav(); const N=R.nav, rad=12; const cells=[]; const c0=navCell(P.pos.x,P.pos.z); if(c0<0) return; const cx=c0%N.n, cz=(c0/N.n)|0, r=Math.ceil(rad/N.c);
  for(let z=cz-r;z<=cz+r;z++) for(let x=cx-r;x<=cx+r;x++){ if(x<0||z<0||x>=N.n||z>=N.n) continue; if(N.grid[z*N.n+x]) cells.push(z*N.n+x); }
  const geo=new THREE.PlaneGeometry(N.c*0.92,N.c*0.92); geo.rotateX(-Math.PI/2); navMesh=new THREE.InstancedMesh(geo,new THREE.MeshBasicMaterial({color:0xff3050,transparent:true,opacity:0.35,depthWrite:false}),Math.max(1,cells.length)); const m=new THREE.Matrix4();
  cells.forEach((i,k)=>{ const [x,z]=navXZ(i); m.makeTranslation(x,0.06,z); navMesh.setMatrixAt(k,m); }); navMesh.count=cells.length; navMesh.frustumCulled=false; scene.add(navMesh); }
// the squad's belief about each player: particles (brighter = more likely), best estimate (red ring), tracker prediction (purple)
let belPts=null, belMarks=[];
function clearBelief(){ if(belPts){ scene&&scene.remove(belPts); belPts.geometry.dispose(); belPts=null; } for(const m of belMarks){ scene&&scene.remove(m); m.geometry.dispose(); } belMarks=[]; }
function beliefViz(){ clearBelief(); const A=R.ai; if(!A) return; const pos=[], col=[];
  for(const tid in A.bel){ const b=A.bel[tid]; if(!b.init) continue; let wm=1e-9; for(let i=0;i<AI.N;i++) wm=Math.max(wm,b.w[i]);
    for(let i=0;i<AI.N;i++){ const y=(R.terrain?R.terrain(b.x[i],b.z[i]):0)+0.25, k=0.25+0.75*b.w[i]/wm; pos.push(b.x[i],y,b.z[i]); col.push(1,0.45*k+0.1,0.1); }
    const ring=(x,z,r,c)=>{ const g=new THREE.RingGeometry(r*0.8,r,24); g.rotateX(-Math.PI/2); const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:0.8,depthTest:false,side:THREE.DoubleSide})); m.position.set(x,(R.terrain?R.terrain(x,z):0)+0.1,z); m.renderOrder=10; scene.add(m); belMarks.push(m); };
    if(b.est) ring(b.est.x,b.est.z,Math.max(0.8,Math.min(6,b.spread*0.5)),0xff2020); const tp=aiTrackAt(b); if(tp&&R.t-b.lastSeen<3) ring(tp.x,tp.z,0.6,0xc040ff); }
  if(!pos.length) return; const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  belPts=new THREE.Points(g,new THREE.PointsMaterial({size:0.35,vertexColors:true,depthTest:false,transparent:true})); belPts.renderOrder=11; scene.add(belPts); }
function hud(){ let el=$('#dbgHud'); if(!F.hud){ if(el) el.remove(); return; } if(!el){ el=document.createElement('div'); el.id='dbgHud'; document.body.appendChild(el); }
  const alive=R.enemies.filter(e=>!e.dead); const rate=netRate(); const inf={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}; renderer.info.reset(); const ns=R.nav?R.nav.stats:{paths:0,fails:0};
  el.textContent=`${fps.v} fps · ${fps.ms.toFixed(1)} ms\ndraws ${inf.calls} · tris ${(inf.triangles/1000).toFixed(1)}k\nAI ${alive.length} alive · ${alive.filter(e=>e.state==='combat').length} fighting${DBG.aiOff?' · FROZEN':''}\npaths ${ns.paths} · gave up ${ns.fails}\nnet ${rate.in}/${rate.out} msg/s\npos ${P.pos.x.toFixed(1)}, ${P.pos.z.toFixed(1)}${DBG.god?'\nGOD':''}${DBG.ammo?' · INF AMMO':''}${DBG.scale!==1?' · '+DBG.scale+'×':''}`; }

// per-enemy freeze: skip updEnemy for frozen ones without touching the game's code path
const _upd=updEnemy; updEnemy=function(e,dt){ if(e.frozen&&!e.dead){ e.moving=false; walkAnim(e,dt); return; } return _upd(e,dt); };

DBG.tick=function(dt){
  const now=performance.now(); fps.n++; if(now-fps.t>500){ fps.v=Math.round(fps.n*1000/(now-fps.t)); fps.ms=(now-fps.t)/fps.n; fps.n=0; fps.t=now; }
  if(!R||!scene) return;
  if(F.overlay) overlay(); if(F.loot) lootLabels(); if(F.nav) navViz(); else clearNav(); if(F.belief) beliefViz(); else clearBelief(); hud();
  if(open&&TABD==='raid'&&now>(DBG._mapT||0)){ DBG._mapT=now+500; const cv=$('#dbgMap'); if(cv) drawMap(cv); }
};
DBG.open=openPanel;
if(renderer) renderer.info.autoReset=false; else { const _ig=initGL; initGL=function(){ const r=_ig.apply(this,arguments); if(renderer) renderer.info.autoReset=false; return r; }; }
addEventListener('keydown',e=>{ if(e.code==='F10'&&NET.admin){ e.preventDefault(); F.overlay=!F.overlay; if(!F.overlay) clearOverlay(); say('AI overlay '+(F.overlay?'on':'off')); } },true);
// raids replace the scene, so overlay objects belong to the old one; drop them when a raid ends
const _end=endRaid; endRaid=function(){ clearOverlay(); clearNav(); clearLabels(); const el=$('#dbgHud'); if(el) el.remove(); if(open) closePanel(false); return _end.apply(this,arguments); };
})();
