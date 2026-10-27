/* 41-deploy: raid conditions rotation, the Deploy tab, map cards, online lobbies and teams */
/* ================= RAID CONDITIONS (rotate every 3 hours, same for every player) ================= */
const COND_SLOT_MS=3*3600*1000;
const condSlot=(t=Date.now())=>Math.floor(t/COND_SLOT_MS);
const WEATHER={
 overcast:{name:'Overcast',fog:1,cold:1,snow:1,sight:1,light:1},
 clear:{name:'Clear skies',fog:0.55,cold:0.8,snow:0.25,sight:1.15,light:1.15},
 blizzard:{name:'Blizzard',fog:1.8,cold:1.7,snow:3,sight:0.65,light:0.85},
 aurora:{name:'Aurora night',fog:0.85,cold:1.25,snow:0.4,sight:0.8,light:0.5,dark:true},
 indoor:{name:'Underground',fog:1,cold:1,snow:0,sight:1,light:1},
 sleet:{name:'Freezing sleet',fog:1.3,cold:1.45,snow:1.8,sight:0.8,light:0.85,slip:0.6,hear:0.8},
 icefog:{name:'Ice fog',fog:2.4,cold:1.2,snow:0.15,sight:0.5,light:0.95,hear:1.3},
 windstorm:{name:'Windstorm',fog:1.25,cold:1.6,snow:2.2,sight:0.85,light:0.9,hear:0.55,wind:1},
 calm:{name:'Still frost',fog:0.45,cold:1.35,snow:0,sight:1.25,light:1.1,hear:1.4},
};
const RMODS={
 none:{name:'',desc:()=>''},
 hotzone:{name:'Hot zone',desc:b=>`Hot zone: ${b} has double loot`},
 raiders:{name:'Raider patrol',desc:()=>'Raider patrol: extra raiders sweep the map'},
 outage:{name:'Power outage',desc:()=>'Power outage: no lights or heaters, loot up 30%'},
 drop:{name:'Supply drop',desc:()=>'Supply drop: a crate will be dropped during the raid'},
 quiet:{name:'Quiet day',desc:()=>'Quiet day: fewer scavs'},
 bounty:{name:'Bounty',desc:b=>`Bounty: $5,000 on ${b}`},
};
const MAP_COND={
 kolvik:{weather:[['overcast',4],['clear',2],['blizzard',2],['aurora',2],['sleet',1],['icefog',0.8],['windstorm',1],['calm',1]],mods:[['none',2],['hotzone',2],['raiders',1.5],['outage',1.5],['drop',1.5],['quiet',1],['bounty',1.2]],hot:['Comms','Barracks','Lab','Garage','Warehouse','Boathouse'],boss:'Station Chief Halvorsen'},
 whiteout:{weather:[['overcast',3],['blizzard',2],['sleet',1],['icefog',1.5],['windstorm',1.2]],mods:[['none',2],['raiders',2],['drop',2],['quiet',1]]},
 hrimfell:{weather:[['overcast',3],['clear',2],['blizzard',1],['aurora',1.5],['sleet',1],['icefog',0.8],['windstorm',1],['calm',1]],mods:[['none',3],['hotzone',1.5]],hot:['Lodge','Lift station','Garage','Ski shed','Fuel hut']},
 ravnskar:{weather:[['overcast',3],['blizzard',1.5],['aurora',2],['clear',1],['sleet',1],['icefog',0.8],['windstorm',1],['calm',1]],mods:[['none',4],['drop',1.5],['outage',1],['raiders',1]]},
 ironfjord:{weather:[['overcast',3],['clear',2],['blizzard',1.5],['aurora',2],['sleet',1],['icefog',0.8],['windstorm',1],['calm',1]],mods:[['none',3],['hotzone',2.5],['drop',2],['outage',1]],hot:['Warehouse','Signal box','Bunkhouse','Mess hall','Boathouse','Pump house']},
 storvidda:{weather:[['overcast',3],['clear',3],['blizzard',1.5],['aurora',2],['sleet',1],['icefog',0.8],['windstorm',1],['calm',1]],mods:[['none',2],['hotzone',2],['raiders',1.5],['drop',2],['outage',1],['bounty',1.2]],hot:['Relay hall','Barracks','Garage','Bunker','Pump station'],boss:'Relay Chief Dahl'},
 skerries:{weather:[['clear',4],['overcast',3],['aurora',1.5],['blizzard',0.5],['sleet',1],['icefog',0.8],['windstorm',1],['calm',1]],mods:[['none',3],['hotzone',1.5],['outage',1]],hot:['Trading post',"Keeper's house","Hunters' camp",'Vestholm hangar','Austholm hangar']},
 vault:{weather:[['indoor',1]],mods:[['none',3],['bounty',1.5],['quiet',1]],boss:'Vault Warden Brekke'},
 holdout:{weather:[['overcast',3],['clear',2],['aurora',2],['blizzard',1],['sleet',1],['icefog',0.6],['windstorm',1],['calm',1]],mods:[['none',1]]},
 kaldfjord:{weather:[['overcast',3],['clear',3],['blizzard',1.5],['aurora',2],['sleet',1],['icefog',0.8],['windstorm',1],['calm',1]],mods:[['none',2],['hotzone',2],['raiders',1.5],['drop',2.5],['outage',1],['bounty',1.2]],hot:['Town hall','Police station','Harbor warehouse','Processing plant','Radar ops','Hangar','Research lab'],boss:'Harbormaster Vinter'},
 skarsvik:{weather:[['overcast',3],['clear',2],['blizzard',2],['aurora',2],['sleet',1],['icefog',0.8],['windstorm',1],['calm',1]],mods:[['none',2],['hotzone',2],['raiders',1.5],['drop',2],['quiet',1],['bounty',1.2]],hot:['Church','Town hall','General store','Processing plant','Hangar','Harbor warehouse'],boss:'Mine Foreman Rask'},
};
function hashStr(str){ let h=2166136261; for(const c of str) h=Math.imul(h^c.charCodeAt(0),16777619); return h>>>0; }
function conditions(mapId,slot=condSlot()){
  const mc=MAP_COND[mapId]; const r=mulberry32(hashStr(mapId+':'+slot)); r();
  // the time of year (48-year.js) shifts the weather odds and its effects; worked out from the slot so everyone agrees
  const Y=yearAt(slot*COND_SLOT_MS); const weather=wpick(mc.weather.map(([k,w])=>[k,w*((Y.wx||{})[k]||1)]),r), mod=wpick(mc.mods,r);
  const hot=mod==='hotzone'?mc.hot[Math.floor(r()*mc.hot.length)]:null;
  const W=Object.assign({},WEATHER[weather]); if(weather!=='indoor'){ W.cold*=Y.cold; W.light*=Y.light; W.sight*=Y.sight; W.fog*=Y.fog; W.slip=(W.slip||1)*(Y.slip||1); W.hear=(W.hear||1)*(Y.hear||1); if(Y.dark) W.dark=true; }
  return {slot,weather,mod,hot,W,year:weather==='indoor'?null:Y,label:WEATHER[weather].name,modText:RMODS[mod].desc(mod==='hotzone'?hot:mc.boss)};
}
function rotateIn(){ const ms=(condSlot()+1)*COND_SLOT_MS-Date.now(); const h=Math.floor(ms/3600000), m=Math.floor(ms/60000)%60; return h?`${h} h ${m} min`:`${m} min`; }
function condHtml(c){ return `${c.year?`<span class="wx yr yr-${c.year.id}">${esc(c.year.name)}</span>`:''}<span class="wx wx-${c.weather}">${esc(c.label)}</span>${c.modText?`<span class="md">${esc(c.modText)}</span>`:''}`; }
const KV_POI=[['Comms',0,0,20,14],['Barracks',-55,-50,30,10],['Lab',55,-50,20,18],['Garage',-55,45,26,16],['Warehouse',-78,0,14,22],['Pump hut',50,55,7,6],['Boathouse',84,-8,9,10],['Hut',-20,72,7,6],['Hut',25,-78,7,6],['Hut',-82,75,8,7]];
const KV_EX=[['Helipad',-85,-85],['North gate',0,-94],['Ice road',-5,94],['Pier boat',95,22]];
const MAPS={
 kolvik:{name:'Kolvik Station',time:540,blurb:'Hand-built research station. Two of four extracts open each raid. The station chief and his guards hold the lab in the northeast.',threat:'Scavs + boss'},
 whiteout:{name:'Whiteout',time:420,blurb:'A different layout every raid, buried in fog. More raiders, better loot, colder air. Nobody knows where the exits are until you land.',threat:'Raiders'},
 skarsvik:{name:'Skarsvik Island',time:900,heli:true,blurb:'A whole island: mining town, a mine run by Foreman Rask, an airstrip, a crashed cargo plane and a frozen harbor. A helicopter flies you in, and an evac helicopter lands mid-raid for anyone who can reach it.',threat:'Scavs, raiders + boss'},
 hrimfell:{name:'Hrimfell Run',time:720,pvp:true,race:true,noDrop:true,blurb:'PvP snowmobile race. Everyone starts on a sled at the summit of Hrimfell; the loot camp is at the bottom of an 800-metre run full of trees, rocks, jumps and crevasses. Crash and you start again from the top. Squadmates can ride on the back and shoot.',threat:'Players only'},
 ravnskar:{name:'Fort Ravnskar',time:780,coop:true,blurb:'Co-op boss raid: everyone in the raid is on the same side. Jarl Hrafn and his huskarls hold an old coastal fort. Bring him down together and his hoard in the keep opens, and every survivor who extracts gets a bounty and two sealed caches.',threat:'Boss + huskarls'},
 ironfjord:{name:'Ironfjord Depot',time:600,pvp:true,blurb:'A rail freight depot on a frozen fjord. PvP only, no AI at all: everyone in here is a player. Rich loot in the warehouse, the signal box and the boxcars, eight spread-out insertion points, and two of four extracts open each raid.',threat:'Players only'},
 storvidda:{name:'Storvidda',time:900,sleds:true,blurb:'A 1.3 km plateau of open tundra. Everyone inserts at the edge on a snowmobile; the Storvidda Relay, a fortified weather and radio station, sits 500 m away in the middle, with a hunting cabin, a pump station and a frozen lake on the way. Ride in, fight for the relay, ride out to an extract on the far edge. Hills block sight and bullets.',threat:'Raiders, scavs + relay chief'},
 skerries:{name:'Skjærgård',time:1200,teams:true,air:true,noDrop:true,blurb:'Air combat over a 3 km stretch of sea and islands. Two teams, each with a home island, a runway and a hangar full of aircraft: Skylark light planes (pilot plus a passenger with their own gun), Hauk fighters with twin machine guns, and Storm heavy bombers with three gun turrets and a bomb bay. AI pilots can fly for either side. Loot on the village, the lighthouse and the skerries; extract at your own pier.',threat:'Enemy aircraft + scavs'},
 holdout:{name:'Last Light',time:2400,coop:true,td:true,noDrop:true,blurb:'Tower defense. Hold the relay mast against ten waves coming down four roads, solo or with friends. Build sentry guns and repair the mast with supply points from kills and waves. Your gear is safe: you play with a copy of it.',threat:'10 waves'},
 kaldfjord:{name:'Kaldfjord Reach',time:1800,sleds:true,blurb:'The big one: 2.2 km of hills, forest and a frozen fjord, about three times Storvidda. A town in the middle with a harbor on the ice (Harbormaster Vinter runs it), a mine in the north, a radar base in the east, a fishing village, an old airstrip, a research station across the fjord, and huts out in the hills. Insert on a snowmobile at the edge; three of six extracts open. Recon drones patrol it.',threat:'Scavs, raiders, guards, drones + boss'},
 vault:{name:'Black Ice Vault',time:360,fee:5000,blurb:'Nine rooms cut into the permafrost under the station. Pay $5,000 to go down. Vault safes hold bonds, diamonds and gold; the guards wear plates and the Warden waits in the middle. One lift out.',threat:'Vault guards + Warden'},
};
function renderDeploy(body){
  const w=S.eq.primary||S.eq.secondary;
  const touch = matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;
  const online=NET.avail;
  body.innerHTML=`${touch?'<p class="warnline">Raids need a keyboard and mouse. The hideout works on any screen.</p>':''}
   ${!w?'<p class="warnline">No weapon equipped. You will go in with your fists; the trader has a free scav kit if you are broke.</p>':''}
   ${online?`<div class="netbar">${ACC.name?`<span class="lbl">Playing as</span><b>${esc(ACC.name)}</b>`:`<label class="lbl" for="callsign">Callsign</label><input id="callsign" maxlength="14" value="${esc(S.name||'')}" placeholder="Nomad"><span class="lbl">Sign in to keep your progress and appear on the leaderboard</span>`}</div>
   <section class="online"><div class="col" id="lobbyArea"></div>
    <div class="chatbox col"><div class="colhead"><h2 class="h2">Radio</h2><span class="lbl" id="chatHint"></span></div><div class="chatlog" id="chatLog" aria-live="polite"></div>
     <form class="chatform" id="chatForm" autocomplete="off"><select id="chatCh" aria-label="Channel"><option value="squad">Squad</option><option value="lobby">Lobby</option><option value="global">Everyone</option></select><input id="chatIn" maxlength="200" aria-label="Message" placeholder="Message"><button class="btn sm" type="submit">Send</button></form></div></section>`:''}
   ${yearHtml()}
   <div class="colhead" style="margin-block:${online?'28px':'0'} 14px"><h2 class="h2">${online?'Maps':'Choose a raid'}</h2><span class="lbl">Conditions change in ${rotateIn()}</span><span class="lbl">Loadout worth ${fmt$(carriedValue())} · you lose it all if you die</span></div>
   <div class="diffbar"><span class="lbl">Difficulty</span><div class="seg" role="radiogroup">${Object.entries(DIFF).map(([k,d])=>`<button type="button" role="radio" data-diff="${k}" aria-checked="${(OPTS.diff||'normal')===k}">${d.name}</button>`).join('')}</div><div class="seg" role="radiogroup" style="margin-left:12px" title="AI planes on Skjærgård">${[['0','No AI planes'],['1','2 AI planes a side'],['2','4 AI planes a side']].map(([k,n])=>`<button type="button" role="radio" data-air="${k}" aria-checked="${String(OPTS.air??1)===k}">${n}</button>`).join('')}</div><small>${esc(DIFF[OPTS.diff||'normal'].desc)} ${online?'Used for your solo raids and lobbies you host; the lobby leader can change it.':''}</small></div>
   <div class="maps">${Object.entries(MAPS).map(([k,m])=>{ const fee=m.fee||0; return `<div class="mapc"><canvas data-map="${k}" width="640" height="400"></canvas><div class="bodyc"><h3>${m.name}</h3><p class="muted" style="margin:0">${m.blurb}</p><div class="kv"><span>Raid <b>${m.time/60} min</b></span><span>Threat <b>${m.threat}</b></span><span>Cold <b>${k==='whiteout'?'Severe':k==='vault'?'None':k==='skarsvik'?'Harsh, long':'Harsh'}</b></span>${fee?`<span>Entry <b class="cash">${fmt$(fee)}</b></span>`:''}</div><div class="condline">${condHtml(conditions(k))}</div><div class="acts">${m.coop?`<button class="btn" data-go="${k}">Solo raid</button>${online?`<button class="btn ghost" data-host="${k}">Host lobby</button>`:''}<span class="lbl coopnote">Co-op boss</span>`:m.pvp?(online?`<button class="btn" data-host="${k}">Host lobby</button><span class="lbl pvpnote">PvP only · needs 2+ sides</span>`:'<span class="lbl pvpnote">PvP only · play it on your server</span>'):`<button class="btn" data-go="${k}" ${S.cash<fee?'disabled':''}>Solo raid</button>${online?`<button class="btn ghost" data-host="${k}">Host lobby</button>`:''}`}</div></div></div>`; }).join('')}</div>
   <div class="controls">${[['WASD','Move'],['Shift','Sprint'],['Ctrl','Sneak (toggle)'],['C','Crouch'],['Space','Jump · onto crates and low walls'],['F (hold)','Revive a downed player (a stranger costs a med kit)'],['Mouse L','Fire / punch'],['Mouse R','Aim / scope'],['R','Reload'],['I','Inspect your weapon'],['1 · 2 · 3','Primary · sidearm · fists'],['B','Fire mode'],['E','Search / loot'],['Tab','Inventory'],['4','Bandage'],['5','Splint'],['6','Medkit'],['7','Cocoa'],['Enter','Chat · Tab switches · @name DMs a friend'],['Esc','Pause']].map(([k,v])=>`<div><kbd>${k}</kbd>${v}</div>`).join('')}</div>
   <p class="muted" style="max-width:70ch">Find an active extract and stand in it for 7 seconds to get out with everything you carry. Body heat drops outside; get indoors or near a heater. Sneaking keeps you quiet; sprinting is heard from 14 m. Bring cash bundles home and they go straight into your balance.</p>`;
  body.querySelectorAll('canvas[data-map]').forEach(c=>drawMapCard(c,c.dataset.map));
  body.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>startRaid(b.dataset.go,null));
  body.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>{ OPTS.diff=b.dataset.diff; saveOpts(); renderTab(); });
  body.querySelectorAll('[data-air]').forEach(b=>b.onclick=()=>{ OPTS.air=+b.dataset.air; saveOpts(); renderTab(); });
  body.querySelectorAll('[data-host]').forEach(b=>b.onclick=()=>{ if(!NET.connected){ toast('Not connected to the server yet.'); return; } wsend({t:'lcreate',map:b.dataset.host,diff:OPTS.diff||'normal'}); window.scrollTo({top:0,behavior:'smooth'}); });
  if(online){
    const cs=$('#callsign'); if(cs) cs.onchange=e=>{ S.name=cleanCall(e.target.value); e.target.value=S.name; saveGame(); netHello(); };
    $('#chatForm').onsubmit=e=>{ e.preventDefault(); const i=$('#chatIn'); const t=i.value.trim(); if(!t) return; if(!NET.connected){ toast('Not connected to the server.'); return; } wsend({t:'chat',ch:$('#chatCh').value,text:t}); i.value=''; };
    $('#chatCh').onchange=e=>{ NET.chatCh=e.target.value; };
    renderLobbyArea(); renderChat();
  }
}
const cleanCall = v => String(v||'').replace(/[^\w \-]/g,'').trim().slice(0,14);
const lobbyTL = l => Math.max(0, (l.timeLeft||0) - (performance.now()-(l._at||0))/1000);
const SIDE_NAMES={1:'Skjold',2:'Hauk'};
function renderLobbyArea(){
  const el=$('#lobbyArea'); if(!el) return;
  if(!NET.connected){ el.innerHTML=`<div class="colhead"><h2 class="h2">Online raids</h2></div><p class="muted" style="margin:0">Connecting to the server…</p>`; return; }
  const l=NET.lobby;
  if(l){
    const me=l.members.find(m=>m.id===NET.id)||{}; const owner=l.owner===NET.id; const nReady=l.members.filter(m=>m.ready).length; const allReady=nReady===l.members.length; const sides=new Set(l.members.map(m=>m.squad?'s'+m.squad:m.id)).size; const dm=!!DM_INFO[l.mode]; const teams=!!MAPS[l.map].teams||l.mode==='tdm'; const pvpShort=dm?l.members.length<2:(!!MAPS[l.map].pvp&&sides<2);
    const fee=MAPS[l.map].fee||0; const broke=S.cash<fee; const waiting=l.state==='waiting';
    if(waiting&&broke&&me.ready&&!NET.feeUnready){ NET.feeUnready=true; wsend({t:'lready',ready:false}); toast(`Un-readied: you can't pay the ${fmt$(fee)} entry for ${MAPS[l.map].name}.`); setTimeout(()=>NET.feeUnready=false,1500); }
    el.innerHTML=`<div class="colhead"><h2 class="h2">${esc(l.name)}</h2><span class="lbl">${waiting?(allReady?'Everyone is ready':`${nReady} of ${l.members.length} ready`):`In raid · ${fmtTime(lobbyTL(l))} left`}</span></div>
     <div class="lobbymap">${owner&&waiting?`<label class="lbl" for="lobbyMode">Mode</label><select id="lobbyMode">${[['raid','Extraction raid'],['tdm','Team deathmatch'],['ffa','Free for all']].map(([k,n])=>`<option value="${k}" ${k===(l.mode||'raid')?'selected':''}>${n}</option>`).join('')}</select>`:`<span class="lbl">Mode</span><b>${dm?esc(DM_INFO[l.mode].name):'Extraction raid'}</b>`}</div>
     ${dm?`<p class="muted" style="margin:0;font-size:13px">${esc(DM_INFO[l.mode].how)} No AI, 10 minutes, respawns, the same kit for everyone. Your own gear stays home. $${DM_PAY.kill} a kill, $${DM_PAY.win.toLocaleString()} for the win.</p>`:''}
     <div class="lobbymap">${owner&&waiting?`<label class="lbl" for="lobbyMap">Map</label><select id="lobbyMap">${Object.entries(MAPS).filter(([k])=>!dm||DM_MAPS.includes(k)).map(([k,m])=>`<option value="${k}" ${k===l.map?'selected':''}>${m.name}${m.fee?' · '+fmt$(m.fee)+' entry':''}</option>`).join('')}</select>`:`<span class="lbl">Map</span><b>${esc(MAPS[l.map].name)}</b>${fee?`<span class="cash">${fmt$(fee)} entry each</span>`:''}`}</div>
     ${dm?'':`<div class="lobbymap">${owner&&waiting?`<label class="lbl" for="lobbyDiff">Difficulty</label><select id="lobbyDiff">${Object.entries(DIFF).map(([k,d])=>`<option value="${k}" ${k===(l.diff||'normal')?'selected':''}>${d.name}</option>`).join('')}</select>`:`<span class="lbl">Difficulty</span><b>${esc((DIFF[l.diff]||DIFF.normal).name)}</b>`}</div>`}
     ${MAPS[l.map].coop?'<p class="muted" style="margin:0;font-size:13px">Co-op: everyone in this raid is on the same side.</p>':''}
     ${teams?`<div class="lobbymap"><span class="lbl">Teams</span><b>${SIDE_NAMES[1]} ${l.members.filter(m=>m.side===1).length} · ${SIDE_NAMES[2]} ${l.members.filter(m=>m.side===2).length}</b>${waiting?`<button class="btn sm ghost" id="lSide">Switch to ${SIDE_NAMES[me.side===1?2:1]}</button>`:''}</div>${!MAPS[l.map].teams?'':owner&&waiting?`<div class="lobbymap"><label class="lbl" for="lobbyAir">AI planes</label><select id="lobbyAir">${[['0','None'],['1','Two per side'],['2','Four per side']].map(([k,n])=>`<option value="${k}" ${String(l.air??1)===k?'selected':''}>${n}</option>`).join('')}</select></div>`:`<div class="lobbymap"><span class="lbl">AI planes</span><b>${['None','Two per side','Four per side'][l.air??1]}</b></div>`}`:''}
     <ul class="members">${l.members.map(m=>`<li class="${(waiting?m.ready:m.inRaid)?'rdy':''}"><span class="pip"></span><span class="mn">${esc(m.name)} ${m.id===l.owner?'<span class="tag">leader</span>':''}${m.guest?' <span class="tag">guest</span>':''}${m.id===NET.id?' <span class="tag">you</span>':''}${m.squad&&NET.squad&&m.squad===NET.squad.id&&m.id!==NET.id?' <span class="tag sq">squad</span>':''}${teams&&m.side?` <span class="tag ${m.side===1?'sq':''}">${SIDE_NAMES[m.side]}</span>`:''}</span><span class="st">${waiting?(m.ready?'Ready':'Not ready'):(m.inRaid?'In raid':'At hideout')}${owner&&m.id!==NET.id&&!m.inRaid?` <button class="btn ghost sm warnbtn" data-lkick="${m.id}">Kick</button>`:''}</span></li>`).join('')}</ul>
     ${waiting&&broke?`<p class="warnline" style="margin:0">You need ${fmt$(fee)} for the entry fee before you can ready up.</p>`:''}
     ${!waiting?'<p class="muted" style="margin:0;font-size:13px">The lobby reopens when the last player is out of the raid.</p>':''}
     <div class="acts">${waiting?`<button class="btn ${me.ready?'ghost':''}" id="lReady" ${broke&&!me.ready?'disabled':''}>${me.ready?'Not ready':'Ready up'}</button>${owner?`<button class="btn" id="lStart" ${allReady&&!pvpShort?'':'disabled'}>${dm?'Start match':'Start raid'}</button>`:''}`:''}<button class="btn ghost" id="lLeave">Leave lobby</button></div>
     ${waiting&&pvpShort?`<p class="warnline" style="margin:0">${dm?`${esc(DM_INFO[l.mode].name)} needs at least two players.`:`${esc(MAPS[l.map].name)} is PvP only: it needs at least two players who aren't in the same squad.`}</p>`:''}
     ${owner&&waiting&&!allReady?'<p class="muted" style="margin:0;font-size:13px">Start unlocks when every member is ready, you included.</p>':''}
     ${!owner&&waiting&&allReady?'<p class="muted" style="margin:0;font-size:13px">Waiting for the leader to start.</p>':''}`;
    const rd=$('#lReady'); if(rd) rd.onclick=()=>wsend({t:'lready',ready:!me.ready});
    const st=$('#lStart'); if(st) st.onclick=()=>{ st.disabled=true; wsend({t:'lstart'}); };
    $('#lLeave').onclick=()=>wsend({t:'lleave'});
    el.querySelectorAll('[data-lkick]').forEach(b=>b.onclick=()=>{ if(!b.dataset.sure){ b.dataset.sure='1'; b.textContent='Kick?'; return; } wsend({t:'lkick',id:b.dataset.lkick}); });
    const mp=$('#lobbyMap'); if(mp) mp.onchange=e=>wsend({t:'lmap',map:e.target.value});
    const md=$('#lobbyMode'); if(md) md.onchange=e=>wsend({t:'lmode',mode:e.target.value});
    const dfs=$('#lobbyDiff'); if(dfs) dfs.onchange=e=>wsend({t:'ldiff',diff:e.target.value});
    const sd=$('#lSide'); if(sd) sd.onclick=()=>wsend({t:'lside'});
    const ar=$('#lobbyAir'); if(ar) ar.onchange=e=>wsend({t:'lair',air:+e.target.value});
    return;
  }
  const list=NET.lobbies; const fol=isFollower();
  el.innerHTML=`<div class="colhead"><h2 class="h2">Online raids</h2><button class="btn sm" id="lCreate" ${fol?'disabled':''}>Host a lobby</button></div>
   ${fol?`<p class="warnline" style="margin:0">You're in ${esc(squadLeaderName())}'s squad. They pick the lobby and you follow.</p>`:NET.squad?'<p class="muted" style="margin:0;font-size:13px">You lead a squad. Hosting or joining brings everyone at the hideout with you.</p>':''}
   ${list.length?`<ul class="lobbies">${list.map(x=>{ const tl=lobbyTL(x); return `<li class="${x.state}"><div class="ln"><b>${esc(x.name)}</b><small>${DM_INFO[x.mode]?`<span class="tag d-hard">${DM_INFO[x.mode].short}</span> `:''}${esc(MAPS[x.map]?MAPS[x.map].name:x.map)} ${DM_INFO[x.mode]?'':diffTag(x.diff)} · ${x.players}/${x.max} players · ${x.state==='raid'?`in raid, ${fmtTime(tl)} left`:'waiting for players'}</small></div>${x.state==='waiting'?`<button class="btn sm" data-lj="${x.id}" ${x.players>=x.max||fol?'disabled':''}>Join</button>`:`<button class="btn ghost sm" data-ljr="${x.id}" ${tl<90||x.players>=x.max||fol?'disabled':''}>Join raid</button>`}</li>`; }).join('')}</ul>`:'<p class="muted" style="margin:0">No lobbies are open. Host one and it shows up here for everyone on the server.</p>'}
   <p class="muted" style="margin:0;font-size:13px">Everyone in an online raid is hostile, lobby mates included, except on the co-op boss map. Pick your friends carefully.</p>`;
  $('#lCreate').onclick=()=>wsend({t:'lcreate',map:'kolvik',diff:OPTS.diff||'normal'});
  el.querySelectorAll('[data-lj]').forEach(b=>b.onclick=()=>wsend({t:'ljoin',id:b.dataset.lj}));
  el.querySelectorAll('[data-ljr]').forEach(b=>b.onclick=()=>{ const x=NET.lobbies.find(l=>l.id===b.dataset.ljr); const fee=x&&MAPS[x.map].fee||0; if(S.cash<fee){ toast(`You need ${fmt$(fee)} for the entry fee.`); return; } wsend({t:'ljoinraid',id:b.dataset.ljr}); });
}
function chatLine(m){
  const d=new Date(m.ts||Date.now()); const tm=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  if(m.ch==='sys') return `<div class="cm sys"><time>${tm}</time> ${esc(m.text)}</div>`;
  return `<div class="cm ${m.ch}"><time>${tm}</time> <b>${m.ch==='lobby'?'<span class="tag">lobby</span> ':m.ch==='squad'?'<span class="tag sq">squad</span> ':''}${esc(m.from)}${m.guest?'<span class="muted">*</span>':''}</b> ${esc(m.text)}</div>`;
}
function renderChat(){
  const log=$('#chatLog'); if(!log) return;
  log.innerHTML=NET.chat.length?NET.chat.map(chatLine).join(''):'<div class="cm sys">No messages yet. Say hi.</div>'; log.scrollTop=log.scrollHeight;
  syncChatCh();
}
function syncChatCh(){
  const sel=$('#chatCh'); if(!sel) return; const lob=sel.querySelector('option[value="lobby"]'); lob.disabled=!NET.lobby;
  const sqo=sel.querySelector('option[value="squad"]'); sqo.disabled=!NET.squad; if(!NET.squad&&NET.chatCh==='squad') NET.chatCh=NET.lobby?'lobby':'global';
  if(!NET.lobby&&NET.chatCh==='lobby') NET.chatCh='global'; sel.value=NET.chatCh;
  const h=$('#chatHint'); if(h) h.textContent=NET.connected?`${NET.chatCh==='lobby'?'Lobby only':NET.chatCh==='squad'?'Squad only':'Everyone at the hideout'} · * guest`:'Offline';
}
function chatBadge(){ const b=$('#chatBadge'); if(!b) return; b.hidden=!NET.unread; b.textContent=NET.unread>9?'9+':String(NET.unread||''); }
function onChat(m){
  if(R&&(m.ch==='raid'||m.ch==='squad')){ { R.chat.push({kind:m.ch,from:m.from,text:m.text,t:R.t,me:m.fromId===NET.id}); if(R.chat.length>30) R.chat.shift(); if(m.fromId!==NET.id) sfxTone(1200,0.04,0.05,'sine'); R.hudT=0; } return; }
  NET.chat.push(m); if(NET.chat.length>80) NET.chat.shift();
  const log=$('#chatLog');
  if(log&&!R&&TAB==='deploy'){ if(NET.chat.length===1) log.innerHTML=''; log.insertAdjacentHTML('beforeend',chatLine(m)); log.scrollTop=log.scrollHeight; }
  else if(m.ch!=='sys'&&m.fromId!==NET.id){ NET.unread=(NET.unread||0)+1; chatBadge(); }
}
function refreshOnline(){ if(!R&&TAB==='deploy'&&$('#lobbyArea')){ const a=document.activeElement; if(a&&a.id==='lobbyMap') return; renderLobbyArea(); syncChatCh(); } }
setInterval(()=>{ if(!R&&TAB==='deploy'&&(NET.lobbies.some(l=>l.state==='raid')||(NET.lobby&&NET.lobby.state==='raid'))) refreshOnline(); },1000);
