/* 42-leaderboard-maps: leaderboard, and the overview map drawn on each map card */
/* ---------- leaderboard ---------- */
const BOARD={rows:null,sort:'worth',at:0,err:null,loading:false};
const BCOLS=[['worth','Net worth',v=>fmt$(v)],['extracts','Extracts'],['surv','Survival',v=>v+'%'],['kills','AI kills'],['pkills','Player kills'],['best','Best haul',v=>fmt$(v)],['raids','Raids']];
async function loadBoard(){
  if(BOARD.loading) return; BOARD.loading=true;
  try{ const r=await fetch('api/leaderboard',{cache:'no-store'}); const j=await r.json(); BOARD.season=j.season; BOARD.hall=j.hall||[]; BOARD.rows=j.rows.map(x=>Object.assign(x,{surv:x.raids?Math.round(100*x.extracts/x.raids):0})); BOARD.err=null; }
  catch(e){ BOARD.err='Could not load the leaderboard. Is the server running?'; }
  BOARD.at=Date.now(); BOARD.loading=false; if(TAB==='board'&&!R) renderTab();
}
function renderBoard(body){
  if(!BOARD.rows&&!BOARD.err){ body.innerHTML='<h2 class="h2">Leaderboard</h2><p class="muted">Loading…</p>'; loadBoard(); return; }
  if(Date.now()-BOARD.at>15000) loadBoard();
  const rows=(BOARD.rows||[]).slice().sort((a,b)=>b[BOARD.sort]-a[BOARD.sort]||b.worth-a.worth);
  const ago=Math.round((Date.now()-BOARD.at)/1000);
  body.innerHTML=`<div class="colhead" style="margin-bottom:14px"><h2 class="h2">Leaderboard</h2><span class="lbl">${BOARD.season?`Season ${BOARD.season.n} · ends in ${Math.max(0,Math.ceil((BOARD.season.end-Date.now())/864e5))} days · `:''}${rows.length} operator${rows.length===1?'':'s'} · ${ACC.name?'your row is highlighted':'sign in to appear here'}</span></div>
   ${BOARD.err?`<p class="warnline">${BOARD.err}</p>`:''}
   <div class="boardwrap"><table class="board"><thead><tr><th class="rk">#</th><th class="nm">Operator</th>${BCOLS.map(([k,l])=>`<th><button data-sort="${k}" aria-pressed="${BOARD.sort===k}">${l}${BOARD.sort===k?' ▾':''}</button></th>`).join('')}</tr></thead>
   <tbody>${rows.map((r,i)=>`<tr class="${r.name===ACC.name?'me':''}"><td class="rk">${i+1}</td><td class="nm">${esc(r.name)}</td>${BCOLS.map(([k,,f])=>`<td class="${BOARD.sort===k?'on':''}">${f?f(r[k]):r[k]}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${BCOLS.length+2}" class="nm muted" style="font-weight:400">Nobody with an account has finished a raid yet.</td></tr>`}</tbody></table></div>
   <div class="acts" style="margin-top:12px"><button class="btn ghost sm" id="boardRefresh">Refresh</button><span class="lbl" style="align-self:center">Updated ${ago<5?'just now':ago+' s ago'}</span></div>
   <p class="muted" style="max-width:70ch;font-size:13px">Net worth is cash plus everything in your stash and loadout. Survival is extracts divided by raids. Player kills are counted by the server; everything else comes from each player's save. Every season the server wipes stashes, cash, hideouts and tasks, and the final standings go into the Hall of Fame below.</p>${hofHtml()}`;
  body.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{ BOARD.sort=b.dataset.sort; renderTab(); });
  $('#boardRefresh').onclick=()=>{ BOARD.at=0; loadBoard(); };
}
function drawMapCard(cv,map){
  const g=cv.getContext('2d'), W=cv.width, H=cv.height; g.fillStyle='#0e181d'; g.fillRect(0,0,W,H);
  g.strokeStyle='#1c2a31'; for(let x=0;x<W;x+=32){g.beginPath();g.moveTo(x,0);g.lineTo(x,H);g.stroke();} for(let y=0;y<H;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}
  if(map==='kolvik'){ const S2=H/220, ox=W/2, oy=H/2; const p=(x,z)=>[ox+x*S2, oy+z*S2];
    g.fillStyle='#183340'; let [a,b]=p(76,-35); g.fillRect(a,b,24*S2,70*S2);
    g.font='600 13px "JetBrains Mono", monospace';
    for(const [n,x,z,w,d] of KV_POI){ const [px,pz]=p(x-w/2,z-d/2); g.fillStyle='#2a3d46'; g.fillRect(px,pz,w*S2,d*S2); g.strokeStyle='#5b7581'; g.strokeRect(px+.5,pz+.5,w*S2,d*S2); if(n!=='Hut'){ g.fillStyle='#9fb3bb'; g.fillText(n.toUpperCase(),px,pz-4); } }
    g.fillStyle='#d6d9d6'; for(const x of [45,55,65]){ const [c1,c2]=p(x,35); g.beginPath(); g.arc(c1,c2,2.6*S2,0,7); g.fill(); }
    for(const [n,x,z] of KV_EX){ const [px,pz]=p(x,z); g.fillStyle='#7cc9a4'; g.beginPath(); g.arc(px,pz,5,0,7); g.fill(); g.fillText(n,px+8,pz+4); }
    const [bx,bz]=p(55,-55); g.fillStyle='#e2574a'; g.fillText('✕ BOSS',bx-20,bz+4);
  } else if(map==='skarsvik'){ const sc=H/600, ox=W/2, oy=H/2; const p=(x,z)=>[ox+x*sc,oy+z*sc];
    g.fillStyle='#183340'; let [a,b]=p(-285,240); g.fillRect(a,b,520*sc,45*sc);
    g.fillStyle='#22313a'; [a,b]=p(184,-195); g.fillRect(a,b,24*sc,390*sc);
    g.font='600 12px "JetBrains Mono", monospace';
    for(const [n,x,z,w,d] of SK_AREAS){ const [px,pz]=p(x-w/2,z-d/2); g.fillStyle='rgba(42,61,70,.7)'; g.fillRect(px,pz,w*sc,d*sc); g.strokeStyle='#5b7581'; g.strokeRect(px+.5,pz+.5,w*sc,d*sc); g.fillStyle='#9fb3bb'; g.fillText(n.toUpperCase(),px,pz-4); }
    for(const l of SK_LZ){ const [px,pz]=p(l.x,l.z); g.fillStyle='#e8c55a'; g.fillText('H',px-4,pz+4); }
    for(const [n,x,z] of SK_EX){ const [px,pz]=p(x,z); g.fillStyle='#7cc9a4'; g.beginPath(); g.arc(px,pz,4,0,7); g.fill(); }
    const [bx,bz]=p(-46,-218); g.fillStyle='#e2574a'; g.fillText('✕ BOSS',bx-20,bz+16);
  } else if(map==='hrimfell'){ const sc=H/960, ox=W/2; const p=(x,z)=>[ox+x*sc*3.2, 20+(z+800)*sc];
    g.fillStyle='#22313a'; g.beginPath(); for(let z=-790;z<=-30;z+=10){ const [a,b]=p(hrCx(z)-HR.W,z); z===-790?g.moveTo(a,b):g.lineTo(a,b); } for(let z=-30;z>=-790;z-=10){ const [a,b]=p(hrCx(z)+HR.W,z); g.lineTo(a,b); } g.closePath(); g.fill();
    g.strokeStyle='#5b7581'; g.stroke();
    let [a,b]=p(-60,-30); g.fillStyle='#2a3d46'; g.fillRect(a,b,120*sc*3.2,160*sc);
    g.font='600 13px "JetBrains Mono", monospace'; g.fillStyle='#e8c55a'; g.fillText('SUMMIT · START',ox+70,30); g.fillStyle='#9fb3bb'; g.fillText('LOOT CAMP',ox+70,b+20);
    for(const z of [-640,-470,-300,-170]){ const [x,y]=p(hrCx(z),z); g.fillStyle='#2a8aff'; g.fillRect(x-8,y-1,16,3); }
    for(const z of [-482,-312,-560]){ const [x,y]=p(hrCx(z),z+12); g.fillStyle='#e2574a'; g.fillRect(x-14,y-1,28,2); }
    g.fillStyle='#e2574a'; g.textAlign='right'; g.fillText('PvP · SNOWMOBILES',W-12,22); g.textAlign='left';
  } else if(map==='kaldfjord'){ const sc=H/2280, ox=W/2, oy=H/2; const p=(x,z)=>[ox+x*sc,oy+z*sc]; const pads=kfPads();
    g.font='600 11px "JetBrains Mono", monospace';
    for(const pd of pads.filter(q=>q.ice)){ const [px,pz]=p(pd.x,pd.z); g.fillStyle='#1f4050'; g.beginPath(); g.arc(px,pz,pd.r*sc,0,7); g.fill(); }
    for(const pd of pads){ if(pd.ice) continue; const [px,pz]=p(pd.x,pd.z); if(pd.kind==='zone'||pd.kind==='out'){ g.fillStyle=pd.kind==='zone'?'#2a3d46':'#22313a'; g.beginPath(); g.arc(px,pz,Math.max(3,pd.r*sc),0,7); g.fill(); g.strokeStyle='#5b7581'; g.stroke(); g.fillStyle='#9fb3bb'; g.textAlign='center'; if(pd.kind==='zone') g.fillText(pd.name.toUpperCase(),px,pz-pd.r*sc-4); }
      if(pd.kind==='ex'){ g.fillStyle='#7cc9a4'; g.beginPath(); g.arc(px,pz,4,0,7); g.fill(); } if(pd.kind==='spawn'){ g.fillStyle='#e8c55a'; g.fillRect(px-3,pz-2,6,4); } }
    g.textAlign='center'; g.fillStyle='#7fb3c8'; { const [a,b]=p(0,330); g.fillText('KALDFJORD ICE',a,b); } const [bx,bz]=p(40,150); g.fillStyle='#e2574a'; g.fillText('✕ BOSS',bx+30,bz+4);
    g.fillStyle='#e8c55a'; g.textAlign='right'; g.fillText('2.2 KM · SNOWMOBILES · DRONES',W-12,22); g.textAlign='left';
  } else if(map==='storvidda'){ const sc=H/1320, ox=W/2, oy=H/2; const p=(x,z)=>[ox+x*sc,oy+z*sc];
    g.font='600 12px "JetBrains Mono", monospace';
    for(const pd of TD_PADS){ const [px,pz]=p(pd.x,pd.z); g.fillStyle=pd.ice?'#1f4050':pd.kind==='zone'?'#2a3d46':pd.kind==='out'?'#22313a':pd.kind==='spawn'?'#3a3a2a':'#1c3a2c'; g.beginPath(); g.arc(px,pz,Math.max(3,pd.r*sc),0,7); g.fill(); if(pd.kind==='zone'||pd.kind==='out'||pd.ice){ g.strokeStyle='#5b7581'; g.stroke(); } }
    for(const pd of TD_PADS){ const [px,pz]=p(pd.x,pd.z); if(pd.name){ g.fillStyle=pd.kind==='ex'?'#7cc9a4':'#9fb3bb'; g.textAlign='center'; g.fillText(pd.name.toUpperCase(),px,pz-(pd.r*sc)-4); } if(pd.kind==='spawn'){ g.fillStyle='#e8c55a'; g.fillRect(px-3,pz-2,6,4); } if(pd.kind==='ex'){ g.fillStyle='#7cc9a4'; g.beginPath(); g.arc(px,pz,4,0,7); g.fill(); } }
    g.textAlign='left'; const [bx,bz]=p(0,0); g.fillStyle='#e2574a'; g.fillText('✕ BOSS',bx-20,bz+4); g.fillStyle='#e8c55a'; g.textAlign='right'; g.fillText('SNOWMOBILE INSERTS',W-12,22); g.textAlign='left';
  } else if(map==='holdout'){ const S2=H/150, ox=W/2, oy=H/2; const p=(x,z)=>[ox+x*S2, oy+z*S2];
    g.fillStyle='#22313a'; for(const [x,z,w,d] of [[0,-38,5,52],[0,38,5,52],[-38,0,52,5],[38,0,52,5]]){ const [a,b]=p(x-w/2,z-d/2); g.fillRect(a,b,w*S2,d*S2); }
    g.strokeStyle='#7a6a4a'; g.lineWidth=3; const [cx,cz]=p(0,0); g.beginPath(); g.arc(cx,cz,7.2*S2,0,7); g.stroke(); g.lineWidth=1;
    g.fillStyle='#e2574a'; g.fillRect(cx-5,cz-5,10,10); for(const [x,z] of LL.pads){ const [a,b]=p(x,z); g.fillStyle='#e8c55a'; g.fillRect(a-4,b-4,8,8); }
    g.font='600 12px "JetBrains Mono", monospace'; for(const [n,x,z] of [['Radio hut',-36,-36],['Fuel hut',36,36],['Generator',36,-36],['Bunker',-36,36]]){ const [a,b]=p(x-5,z-4); g.fillStyle='#2a3d46'; g.fillRect(a,b,10*S2,8*S2); g.fillStyle='#9fb3bb'; g.fillText(n.toUpperCase(),a,b-4); }
    g.fillStyle='#e2574a'; for(const [x,z] of LL.lanes.slice(0,4)){ const [a,b]=p(x,z); g.beginPath(); g.moveTo(a,b-6); g.lineTo(a+6,b+5); g.lineTo(a-6,b+5); g.fill(); }
    g.textAlign='right'; g.fillStyle='#e8c55a'; g.fillText('TOWER DEFENSE · CO-OP',W-12,22); g.textAlign='left';
  } else if(map==='skerries'){ const sc=H/3100, ox=W/2, oy=H/2; const p=(x,z)=>[ox+x*sc,oy+z*sc];
    g.fillStyle='#102a3d'; g.fillRect(0,0,W,H); g.font='600 12px "JetBrains Mono", monospace';
    for(const I of SJ_ISL){ const [px,pz]=p(I.x,I.z); g.fillStyle=I.base?'#2a3d46':'#22313a'; g.beginPath(); g.arc(px,pz,I.r*sc,0,7); g.fill(); g.strokeStyle='#5b7581'; g.stroke(); if(I.base){ g.fillStyle='#3a3a3a'; g.fillRect(px-2,pz-220*sc,4,440*sc); } g.fillStyle=I.base?'#e8c55a':'#9fb3bb'; g.textAlign='center'; g.fillText(I.name.toUpperCase(),px,pz-I.r*sc-4); }
    for(const [n,x,z] of SJ_EX){ const [px,pz]=p(x,z); g.fillStyle='#7cc9a4'; g.beginPath(); g.arc(px,pz,4,0,7); g.fill(); }
    g.textAlign='right'; g.fillStyle='#e2574a'; g.fillText('TEAMS · AIRCRAFT',W-12,22); g.textAlign='left';
  } else if(map==='ravnskar'){ const S2=H/150, ox=W/2, oy=H/2+6; const p=(x,z)=>[ox+x*S2, oy+z*S2];
    let [a,b]=p(-30,-55); g.fillStyle='#22313a'; g.fillRect(a,b,60*S2,60*S2); g.strokeStyle='#8a9aa2'; g.lineWidth=3; g.strokeRect(a,b,60*S2,60*S2); g.lineWidth=1;
    [a,b]=p(-4,4); g.fillStyle='#0e181d'; g.fillRect(a,b,8*S2,3*S2);
    g.font='600 13px "JetBrains Mono", monospace';
    for(const [n,x,z,w,d] of RV_POI){ const [px,pz]=p(x-w/2,z-d/2); g.fillStyle=n==='Keep'?'#4a2a2a':'#2a3d46'; g.fillRect(px,pz,w*S2,d*S2); g.strokeStyle='#5b7581'; g.strokeRect(px+.5,pz+.5,w*S2,d*S2); g.fillStyle='#9fb3bb'; g.fillText(n.toUpperCase(),px,pz-4); }
    for(const [n,x,z] of RV_EX){ const [px,pz]=p(x,z); g.fillStyle='#7cc9a4'; g.beginPath(); g.arc(px,pz,5,0,7); g.fill(); g.fillText(n,clamp(px+8,4,W-110),pz+4); }
    const [bx,bz]=p(0,-42); g.fillStyle='#e2574a'; g.font='800 22px "Big Shoulders Stencil Display", Impact, sans-serif'; g.textAlign='center'; g.fillText('✕ JARL HRAFN',bx,bz+6);
    g.font='600 13px "JetBrains Mono", monospace'; g.fillStyle='#7cc9a4'; g.textAlign='right'; g.fillText('CO-OP · BOSS',W-12,22); g.textAlign='left';
  } else if(map==='ironfjord'){ const S2=H/176, ox=W/2, oy=H/2; const p=(x,z)=>[ox+x*S2, oy+z*S2];
    g.fillStyle='#183340'; let [a,b]=p(57,-80); g.fillRect(a,b,22*S2,160*S2);
    g.fillStyle='#22313a'; for(const x of [-20,-14]){ [a,b]=p(x-1.5,-79); g.fillRect(a,b,3*S2,158*S2); }
    g.font='600 13px "JetBrains Mono", monospace';
    for(const [n,x,z,w,d] of IF_POI){ const [px,pz]=p(x-w/2,z-d/2); g.fillStyle='#2a3d46'; g.fillRect(px,pz,w*S2,d*S2); g.strokeStyle='#5b7581'; g.strokeRect(px+.5,pz+.5,w*S2,d*S2); if(n!=='Hut'){ g.fillStyle='#9fb3bb'; g.fillText(n.toUpperCase(),px,pz-4); } }
    g.fillStyle='#4a5560'; for(const [x,z] of [[24,-24],[31,-24],[24,-14],[36,4],[24,14],[31,14],[24,30]]){ [a,b]=p(x-3,z-1.2); g.fillRect(a,b,6*S2,2.4*S2); }
    for(const [n,x,z] of IF_EX){ const [px,pz]=p(x,z); g.fillStyle='#7cc9a4'; g.beginPath(); g.arc(px,pz,5,0,7); g.fill(); g.fillText(n,clamp(px+8,4,W-130),pz+4); }
    g.fillStyle='#e2574a'; g.textAlign='right'; g.fillText('PvP · NO AI',W-12,22); g.textAlign='left';
  } else if(map==='vault'){ const sc=H/60, ox=W/2, oy=H/2; g.fillStyle='#1a1d22'; g.fillRect(ox-24*sc,oy-24*sc,48*sc,48*sc);
    for(let r=0;r<3;r++) for(let c=0;c<3;c++){ const x=ox+(c-1)*14*sc-7*sc, y=oy+(r-1)*14*sc-7*sc; g.fillStyle=(r===1&&c===1)?'#4a3b1a':'#2a3d46'; g.fillRect(x+1,y+1,14*sc-2,14*sc-2); g.strokeStyle='#5b7581'; g.strokeRect(x+1.5,y+1.5,14*sc-3,14*sc-3); }
    g.fillStyle='#e8c55a'; g.font='800 40px "Big Shoulders Stencil Display", Impact, sans-serif'; g.textAlign='center'; g.fillText('ENTRY $5,000',W/2,H/2+14); g.font='600 13px "JetBrains Mono", monospace'; g.fillStyle='#9fb3bb'; g.fillText('one lift out · the Warden holds the middle',W/2,H/2+36); g.textAlign='left';
  } else { const r=mulberry32(7); g.fillStyle='rgba(223,233,236,.06)'; for(let i=0;i<14;i++){ g.fillRect(r()*W,r()*H,30+r()*90,20+r()*70); }
    const grd=g.createRadialGradient(W/2,H/2,20,W/2,H/2,W/1.2); grd.addColorStop(0,'rgba(200,214,220,.05)'); grd.addColorStop(1,'rgba(200,214,220,.35)'); g.fillStyle=grd; g.fillRect(0,0,W,H);
    g.fillStyle='#dfe9ec'; g.font='800 46px "Big Shoulders Stencil Display", Impact, sans-serif'; g.textAlign='center'; g.fillText('LAYOUT UNKNOWN',W/2,H/2+8); g.font='600 13px "JetBrains Mono", monospace'; g.fillStyle='#7f949b'; g.fillText('generated when you deploy',W/2,H/2+34); g.textAlign='left'; }
}
