/* 90-net: networking: lobbies, state sync, friends */
/* ================= NET (PvPvE, needs the game server) ================= */
const NET={friends:[],fin:[],fout:[],squad:null,invites:[],dms:new Map(),dmWith:null,lastDM:null,avail:false,connected:false,on:false,ws:null,id:null,host:false,players:{},sendT:0,estT:0,lobbies:[],lobby:null,chat:[],chatCh:'global',unread:0,retry:0,rt:null};
const NETSTAT={out:0,bout:0,in:0,bin:0,types:{}};
const wsend=o=>{ if(NET.ws&&NET.ws.readyState===1){ const t=JSON.stringify(o); NETSTAT.out++; NETSTAT.bout+=t.length; NET.ws.send(t); } };
const nsend=o=>{ if(NET.on) wsend(o); };
async function netProbe(){
  try{ const r=await fetch('api/ping',{cache:'no-store'}); if(r.ok){ const j=await r.json(); NET.avail=!!j.ok; if(j.season&&!NET.season) NET.season=j.season; } }catch(e){ NET.avail=false; }
  $('#boardTab').hidden=!NET.avail; $('#friendsTab').hidden=!NET.avail; if(NET.avail) netConnect();
  if(!R&&TAB==='deploy') renderTab();
}
function netConnect(){
  if(!NET.avail||NET.ws) return;
  const proto=location.protocol==='https:'?'wss':'ws'; let ws;
  try{ ws=new WebSocket(`${proto}://${location.host}/ws`); }catch(e){ return netRetry(); }
  NET.ws=ws;
  ws.onopen=()=>{ NET.retry=0; netHello(); };
  ws.onmessage=ev=>{ let m; try{ m=JSON.parse(ev.data); }catch(e){ return; } NETSTAT.in++; NETSTAT.bin+=ev.data.length; NETSTAT.types[m.t]=(NETSTAT.types[m.t]||0)+1; netMsg(m); };
  ws.onclose=()=>{
    const wasRaid=NET.on; NET.ws=null; NET.connected=false; NET.lobby=null; NET.lobbies=[];
    if(wasRaid){ NET.on=false; if(R&&!R.over){ msg('Connection lost. Finishing this raid offline.'); NET.host=true; for(const id in NET.players) removeRemote(id); } }
    refreshOnline(); netRetry();
  };
}
function netRetry(){ clearTimeout(NET.rt); NET.retry=Math.min(NET.retry+1,6); NET.rt=setTimeout(netConnect,500+NET.retry*NET.retry*500); }
function netHello(){ wsend({t:'hello',name:S.name||'',token:ACC.token||''}); }
function netLeave(){ if(NET.on) wsend({t:'leaveRaid'}); NET.on=false; NET.players={}; NET.host=false; }
const stampL=list=>{ const t=performance.now(); for(const l of list) l._at=t; return list; };
function netHubMsg(m){
  if(m.t==='grant'){ applyGrant(m); return true; }
  if(m.t==='mgstart'||m.t==='mgscore'||m.t==='mgend') return mgNet(m);
  if(m.t==='trreq'||m.t==='trade'||m.t==='trdone'||m.t==='trend') return tradeNet(m);
  switch(m.t){
    case 'hello': NET.id=m.id; NET.connected=true; NET.admin=!!m.admin; if(m.world) WORLD=m.world; $('#dbgBtn').hidden=!NET.admin; if(m.season){ NET.season=m.season; NET.hall=m.hall; applySeason(); } NET.lobbies=stampL(m.list||[]); NET.chat=(m.chat||[]).slice(-80); refreshOnline(); renderChat(); return true;
    case 'lobbies': NET.lobbies=stampL(m.list||[]); refreshOnline(); return true;
    case 'lobby': { const had=!!NET.lobby; NET.lobby=m.lobby?stampL([m.lobby])[0]:null; if(!had&&NET.lobby) NET.chatCh='lobby'; if(had&&!NET.lobby) NET.chatCh='global'; refreshOnline(); return true; }
    case 'launch': startRaid(m.map,m); return true;
    case 'world': WORLD=m.world||{}; if(!R) applyWorld(WORLD); return true;
    case 'sys': toast(m.text); return true;
    case 'chat': onChat(m); return true;
    case 'season': NET.season=m.season; NET.hall=m.hall; BOARD.rows=null; if(!R&&$('#result').hidden) applySeason(); else if(R) raidNote(`Season ${m.season.n} has begun. Your progress resets when you get back.`); return true;
    case 'friends': NET.friends=m.friends||[]; NET.fin=m.incoming||[]; NET.fout=m.outgoing||[]; socialBadge(); if(!R&&TAB==='friends') renderFriendList(); return true;
    case 'dm': onDM(m); return true;
    case 'dmhist': NET.dms.set(m.with,m.msgs||[]); if(NET.dmWith===m.with) renderDM(); return true;
    case 'squad': { const had=NET.squad; NET.squad=m.squad; NET.squadAt=performance.now(); if(!had&&m.squad&&!R) NET.chatCh='squad'; if(R) retag(); if(!R){ if(TAB==='friends') renderFriendList(); refreshOnline(); } return true; }
    case 'sinvite': NET.invites=NET.invites.filter(i=>i.from!==m.from); NET.invites.push({from:m.from,at:Date.now()}); sfxTone(880,0.08,0.08,'sine'); setTimeout(()=>sfxTone(1175,0.12,0.08,'sine'),90); if(R) raidNote(`${m.from} invited you to their squad. Accept from the hideout after this raid.`); renderInvites(); socialBadge(); return true;
    case 'note': if(R) raidNote(m.text); else toast(m.text); return true;
    case 'psquad': { if(m.id!==NET.id&&NET.players[m.id]){ NET.players[m.id].squad=m.squad; retag(); } return true; }
  }
  return false;
}
function raidChans(){ const c=[]; if(NET.on) c.push('raid'); if(NET.squad) c.push('squad'); if(ACC.name) c.push('dm'); return c; }
function setRaidCh(ch){ R.chatCh=ch; const el=$('#rchatCh'); el.className=ch; el.textContent=ch==='raid'?'ALL':ch==='squad'?'SQUAD':(NET.lastDM?'DM '+NET.lastDM.toUpperCase():'DM'); }
function isFollower(){ return !!(NET.squad&&NET.squad.members.length>1&&NET.squad.leader!==NET.id); }
function squadLeaderName(){ const l=NET.squad&&NET.squad.members.find(m=>m.id===NET.squad.leader); return l?l.name:'?'; }
function socialBadge(){ const b=$('#socialBadge'); if(!b) return; const n=NET.friends.reduce((s,f)=>s+(f.unread||0),0)+NET.fin.length+NET.invites.length; b.hidden=!n; b.textContent=n>9?'9+':String(n); }
function onDM(m){
  const other=m.from===ACC.name?m.to:m.from; const mine=m.from===ACC.name;
  const arr=NET.dms.get(other); if(arr){ arr.push(m); if(arr.length>200) arr.shift(); }
  if(!mine) NET.lastDM=m.from;
  if(R){ R.chat.push({kind:'dm',from:m.from,to:m.to,text:m.text,t:R.t,me:mine}); if(R.chat.length>30) R.chat.shift(); R.hudT=0; if(!mine) sfxTone(1046,0.06,0.07,'sine'); return; }
  if(TAB==='friends'&&NET.dmWith===other){ const log=$('#dmLog'); if(log){ if(arr&&arr.length===1) log.innerHTML=''; log.insertAdjacentHTML('beforeend',dmLine(m)); log.scrollTop=log.scrollHeight; } if(!mine) wsend({t:'dmread',with:other}); }
  else if(!mine){ toast(`${m.from}: ${m.text.length>60?m.text.slice(0,60)+'…':m.text}`); sfxTone(1046,0.06,0.07,'sine'); }
}
function dmLine(m){ const d=new Date(m.ts||Date.now()); const tm=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; return `<div class="cm"><time>${tm}</time> <b class="${m.from===ACC.name?'me':''}">${esc(m.from)}</b> ${esc(m.text)}</div>`; }
function renderInvites(){
  const el=$('#invites'); if(!el) return; NET.invites=NET.invites.filter(i=>Date.now()-i.at<180000);
  const tq=NET.trq=(NET.trq||[]).filter(r=>Date.now()-r.at<120000);
  if(R||(!NET.invites.length&&(!tq.length||TRADE.on))){ el.innerHTML=''; return; }
  el.innerHTML=(TRADE.on?'':tq.map(r=>`<div class="invite"><span class="lbl">Trade</span><p><b>${esc(r.from)}</b> wants to trade with you.</p><div class="acts"><button class="btn sm" data-tracc="${esc(r.from)}">Open trade</button><button class="btn ghost sm" data-trdec="${esc(r.from)}">Decline</button></div></div>`).join(''))+NET.invites.map(i=>`<div class="invite"><span class="lbl">Squad invite</span><p><b>${esc(i.from)}</b> wants you in their squad.${NET.squad?' You will leave your current squad.':''}</p><div class="acts"><button class="btn sm" data-sacc="${esc(i.from)}">Join squad</button><button class="btn ghost sm" data-sdec="${esc(i.from)}">Decline</button></div></div>`).join('');
  el.querySelectorAll('[data-tracc]').forEach(b=>b.onclick=()=>{ wsend({t:'tracc',from:b.dataset.tracc}); NET.trq=NET.trq.filter(r=>r.from!==b.dataset.tracc); renderInvites(); });
  el.querySelectorAll('[data-trdec]').forEach(b=>b.onclick=()=>{ wsend({t:'trdecline',from:b.dataset.trdec}); NET.trq=NET.trq.filter(r=>r.from!==b.dataset.trdec); renderInvites(); });
  el.querySelectorAll('[data-sacc]').forEach(b=>b.onclick=()=>{ wsend({t:'saccept',from:b.dataset.sacc}); NET.invites=NET.invites.filter(i=>i.from!==b.dataset.sacc); renderInvites(); socialBadge(); if(TAB==='friends') renderFriendList(); });
  el.querySelectorAll('[data-sdec]').forEach(b=>b.onclick=()=>{ wsend({t:'sdecline',from:b.dataset.sdec}); NET.invites=NET.invites.filter(i=>i.from!==b.dataset.sdec); renderInvites(); socialBadge(); if(TAB==='friends') renderFriendList(); });
}
setInterval(()=>{ if(NET.invites.length) { renderInvites(); socialBadge(); } },15000);

/* ---------- friends tab ---------- */
function renderFriends(body){
  if(!ACC.name){ body.innerHTML=`<div class="colhead" style="margin-bottom:10px"><h2 class="h2">Friends</h2></div><p class="muted" style="max-width:60ch">Friends, messages and squads need an account so people can find you by name. Register or sign in to get started.</p><div class="acts"><button class="btn" id="fSign">Sign in or register</button></div>`; $('#fSign').onclick=accModal; return; }
  body.innerHTML=`<section class="friends">
   <div class="col" style="gap:18px"><div class="fsec" id="fSquad"></div>
    <div class="fsec"><div class="colhead"><h2 class="h2">Friends</h2><span class="lbl" id="fCount"></span></div>
     <form class="chatform" id="fAdd" autocomplete="off" style="grid-template-columns:minmax(0,1fr) auto"><input id="fAddIn" maxlength="16" aria-label="Username" placeholder="Add a friend by username"><button class="btn sm" type="submit">Send request</button></form>
     <div class="fsec" id="fLists"></div></div></div>
   <div class="dmbox col" id="dmPane"><div id="dmHead"></div><div class="chatlog dmlog" id="dmLog" aria-live="polite"></div><form class="chatform" id="dmForm" autocomplete="off" style="grid-template-columns:minmax(0,1fr) auto"><input id="dmIn" maxlength="200" aria-label="Message" placeholder="Message"><button class="btn sm" type="submit">Send</button></form></div>
  </section>`;
  $('#fAdd').onsubmit=e=>{ e.preventDefault(); const v=$('#fAddIn').value.trim(); if(!v) return; wsend({t:'fadd',name:v}); $('#fAddIn').value=''; };
  $('#dmForm').onsubmit=e=>{ e.preventDefault(); const i=$('#dmIn'); const t=i.value.trim(); if(!t||!NET.dmWith) return; wsend({t:'dm',to:NET.dmWith,text:t}); i.value=''; };
  renderFriendList(); renderDM();
}
function renderFriendList(){
  const sqEl=$('#fSquad'), lists=$('#fLists'); if(!sqEl) return;
  const sq=NET.squad; const lead=sq&&sq.leader===NET.id;
  const stLbl={raid:'In raid',lobby:'In lobby',hideout:'At hideout',gone:'Offline'};
  sqEl.innerHTML=`<div class="colhead"><h2 class="h2">Squad</h2><span class="lbl">${sq?`${sq.members.length} of 4`:'No squad'}</span></div>
   ${sq?`<ul class="members">${sq.members.map(m=>`<li class="${m.state!=='gone'?'rdy':''}"><span class="pip"></span><span class="mn">${esc(m.name)} ${m.id===sq.leader?'<span class="tag">leader</span>':''}${m.id===NET.id?' <span class="tag">you</span>':''}</span><span class="st">${m.state==='raid'&&m.map&&MAPS[m.map]?`In raid · ${esc(MAPS[m.map].name)}${m.left!=null?` · ${fmtTime(Math.max(0,m.left-(performance.now()-(NET.squadAt||0))/1000))} left`:''}`:stLbl[m.state]||''}${lead&&m.id!==NET.id?` <button class="btn ghost sm" data-spro="${m.id}">Make leader</button> <button class="btn ghost sm warnbtn" data-skick="${m.id}">Kick</button>`:''}</span></li>`).join('')}</ul>
     <div class="acts"><button class="btn ghost sm" id="sLeave">Leave squad</button>${lead?'<button class="btn ghost sm warnbtn" id="sDisband">Disband squad</button>':''}</div>
     <p class="muted" style="margin:0;font-size:13px">Squadmates can't hurt each other, show up green with a distance marker in raids, and follow the leader into lobbies. ${lead?'You pick the lobby on the Deploy tab.':`${esc(squadLeaderName())} picks the lobby.`} Every other player in the raid is still hostile.</p>`
   :'<p class="muted" style="margin:0">Invite an online friend to start a squad. Squads go into lobbies together and can\'t shoot each other.</p>'}
   ${NET.invites.length?`<h3>Invites</h3><ul class="frl">${NET.invites.map(i=>`<li><span class="dot on"></span><div class="fn"><b>${esc(i.from)}</b><small>wants you in their squad</small></div><div class="acts"><button class="btn sm" data-sacc="${esc(i.from)}">Join</button><button class="btn ghost sm" data-sdec="${esc(i.from)}">Decline</button></div></li>`).join('')}</ul>`:''}`;
  const fr=NET.friends; const on=fr.filter(f=>f.online).length;
  $('#fCount').textContent=fr.length?`${on} of ${fr.length} online`:'';
  const inSquad=n=>!!(sq&&sq.members.some(m=>m.account===n));
  lists.innerHTML=`${NET.fin.length?`<h3>Requests</h3><ul class="frl">${NET.fin.map(n=>`<li><span class="dot"></span><div class="fn"><b>${esc(n)}</b><small>wants to be friends</small></div><div class="acts"><button class="btn sm" data-facc="${esc(n)}">Accept</button><button class="btn ghost sm" data-fdec="${esc(n)}">Decline</button></div></li>`).join('')}</ul>`:''}
   ${NET.fout.length?`<h3>Sent</h3><ul class="frl">${NET.fout.map(n=>`<li><span class="dot"></span><div class="fn"><b>${esc(n)}</b><small>request pending</small></div><div class="acts"><button class="btn ghost sm" data-fcan="${esc(n)}">Cancel</button></div></li>`).join('')}</ul>`:''}
   ${fr.length?`<ul class="frl">${fr.map(f=>`<li class="${NET.dmWith===f.name?'sel':''}"><span class="dot ${f.online?'on '+f.state:''}"></span><button class="fn" data-dm="${esc(f.name)}"><b>${esc(f.name)}</b>${f.unread?` <span class="badge">${f.unread}</span>`:''}<small>${esc(f.status)}</small></button><div class="acts">${f.lobby&&!isFollower()&&!(NET.lobby&&NET.lobby.id===f.lobby)?`<button class="btn ghost sm" data-fjoin="${f.lobby}">Join lobby</button>`:''}${f.online&&f.state!=='raid'?`<button class="btn ghost sm" data-trade="${esc(f.name)}">Trade</button>`:''}<button class="btn ghost sm" data-inv="${esc(f.name)}" ${!f.online||inSquad(f.name)?'disabled':''}>${inSquad(f.name)?'In squad':'Invite'}</button><button class="btn ghost sm" data-frm="${esc(f.name)}" aria-label="Remove ${esc(f.name)}">✕</button></div></li>`).join('')}</ul>`:(NET.fin.length||NET.fout.length?'':'<p class="muted" style="margin:0">No friends yet. Add someone by the username they registered with.</p>')}`;
  const all=$('#tabbody');
  all.querySelectorAll('[data-sacc],[data-sdec]').forEach(b=>b.onclick=()=>{ const acc=!!b.dataset.sacc; const from=b.dataset.sacc||b.dataset.sdec; wsend({t:acc?'saccept':'sdecline',from}); NET.invites=NET.invites.filter(i=>i.from!==from); renderInvites(); socialBadge(); renderFriendList(); });
  all.querySelectorAll('[data-spro]').forEach(b=>b.onclick=()=>wsend({t:'spromote',id:b.dataset.spro}));
  all.querySelectorAll('[data-skick]').forEach(b=>b.onclick=()=>wsend({t:'skick',id:b.dataset.skick}));
  const sl=$('#sLeave'); if(sl) sl.onclick=()=>wsend({t:'sleave'});
  const sdb=$('#sDisband'); if(sdb) sdb.onclick=()=>{ if(!sdb.dataset.sure){ sdb.dataset.sure='1'; sdb.textContent='Disband: sure?'; return; } wsend({t:'sdisband'}); };
  lists.querySelectorAll('[data-facc]').forEach(b=>b.onclick=()=>wsend({t:'faccept',name:b.dataset.facc}));
  lists.querySelectorAll('[data-fdec]').forEach(b=>b.onclick=()=>wsend({t:'fdecline',name:b.dataset.fdec}));
  lists.querySelectorAll('[data-fcan]').forEach(b=>b.onclick=()=>wsend({t:'fcancel',name:b.dataset.fcan}));
  lists.querySelectorAll('[data-dm]').forEach(b=>b.onclick=()=>{ NET.dmWith=b.dataset.dm; renderFriendList(); renderDM(); $('#dmIn').focus(); });
  lists.querySelectorAll('[data-trade]').forEach(b=>b.onclick=()=>{ b.disabled=true; tradeAsk(b.dataset.trade); });
  lists.querySelectorAll('[data-inv]').forEach(b=>b.onclick=()=>{ b.disabled=true; wsend({t:'sinvite',name:b.dataset.inv}); });
  lists.querySelectorAll('[data-fjoin]').forEach(b=>b.onclick=()=>{ wsend({t:'ljoin',id:b.dataset.fjoin}); setTab('deploy'); });
  lists.querySelectorAll('[data-frm]').forEach(b=>b.onclick=()=>{ if(!b.dataset.sure){ b.dataset.sure='1'; b.textContent='Remove?'; return; } wsend({t:'fremove',name:b.dataset.frm}); if(NET.dmWith===b.dataset.frm){ NET.dmWith=null; renderDM(); } });
  socialBadge();
}
function renderDM(){
  const head=$('#dmHead'), log=$('#dmLog'), form=$('#dmForm'); if(!head) return;
  const w=NET.dmWith; const f=w&&NET.friends.find(x=>x.name===w);
  if(!f){ NET.dmWith=null; head.innerHTML='<div class="colhead"><h2 class="h2">Messages</h2></div>'; log.innerHTML='<div class="cm sys">Pick a friend to message them. In a raid, press Enter and type @name to message a friend, or /r to reply.</div>'; form.hidden=true; return; }
  form.hidden=false;
  head.innerHTML=`<div class="colhead"><h2 class="h2">${esc(w)}</h2><span class="lbl">${esc(f.status)}</span></div>`;
  const msgs=NET.dms.get(w); if(!msgs){ log.innerHTML='<div class="cm sys">Loading…</div>'; wsend({t:'dmhist',with:w}); return; }
  log.innerHTML=msgs.length?msgs.map(dmLine).join(''):`<div class="cm sys">No messages with ${esc(w)} yet.</div>`; log.scrollTop=log.scrollHeight;
  if(f.unread) wsend({t:'dmread',with:w});
}
function openRaidChat(){ const ch=raidChans(); if(!ch.length) return; R.chatOpen=true; P.keys={}; P.trigger=false; P.adsHeld=false; $('#rchatForm').hidden=false; setRaidCh(ch.includes(R.chatCh)?R.chatCh:(ch.includes('squad')?'squad':ch[0])); const i=$('#rchatIn'); i.value=''; i.focus(); R.hudT=0; }
function chatHudLine(c){ if(c.kind==='sys') return `<div class="sy">${esc(c.text)}</div>`; const tag=c.kind==='squad'?'<span class="k">SQUAD</span> ':c.kind==='dm'?'<span class="k dm">DM</span> ':''; const who=c.kind==='dm'&&c.me?'to '+esc(c.to):esc(c.from); return `<div class="${c.me?'me':''} ${c.kind||'raid'}">${tag}<b>${who}</b> ${esc(c.text)}</div>`; }
function raidNote(text){ if(!R) return; R.chat.push({kind:'sys',text,t:R.t}); if(R.chat.length>30) R.chat.shift(); R.hudT=0; }
function closeRaidChat(){ if(!R) return; R.chatOpen=false; R.chatClosedAt=performance.now(); $('#rchatForm').hidden=true; $('#rchatIn').blur(); R.hudT=0; }
function playerColor(id){ let h=0; for(const ch of id) h=(h*31+ch.charCodeAt(0))>>>0; return [0xb03030,0x3060b0,0x30a060,0xb08030,0x8030b0,0x30a0a0,0xd06020,0x607080][h%8]; }
// a name over someone's head, with their goal title under it (only titles the game actually gives out)
function makeTag(name,col='#fff',title){ const ti=TITLES.includes(title)?title:''; const c=document.createElement('canvas'); c.width=160; c.height=ti?48:32; const g=c.getContext('2d'); g.font='bold 22px monospace'; g.textAlign='center'; g.fillStyle='#000'; g.fillText(name,81,24); g.fillStyle=col; g.fillText(name,80,23); if(ti){ g.font='bold 14px monospace'; g.fillStyle='#000'; g.fillText(ti,81,42); g.fillStyle='#e8c55a'; g.fillText(ti,80,41); } const t=new THREE.CanvasTexture(c); t.magFilter=THREE.NearestFilter; const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false,fog:false})); sp.scale.set(2,ti?0.6:0.4,1); return sp; }
function ensureRemote(id){ const p=NET.players[id]; if(!p||p.g||!scene||!R) return; p.lk=(p.st&&p.st.lk)||''; const L=parseLook(p.lk); const h=humanoid(Object.assign(lookOpts(L.fit,L.hv,L.av),{ud:{player:id}})); setHeldGun(h.rig,p.st&&p.st.gw!=null?p.st.gw:'akr'); h.g.rotation.order='YXZ'; p.g=h.g; p.rig=h.rig; p.parts=h.parts; const tag=makeTag(p.name||'?',isMate(id)?'#7cc9a4':'#fff',p.st&&p.st.ti); p.tag=tag; tag.position.set(0,2.25,0); h.g.add(tag); h.g.visible=false; if(p.st){ h.g.position.set(p.st.x,0,p.st.z); } h.g.traverse(o=>o.layers.enable(1)); scene.add(h.g); R.targets.push(...h.parts); }
const mySquad=()=>NET.squad?NET.squad.id:null;
function isMate(id){ const q=NET.players[id]; if(R&&R.mode==='ffa') return false; if(R&&R.mode==='tdm') return !!(q&&q.side&&q.side===(R.side||1)); return !!q&&(coopRaid()||!!(q.squad&&q.squad===mySquad())||!!(R&&R.sides&&q.side&&q.side===R.side)); }
function retag(){ for(const id in NET.players){ const q=NET.players[id]; if(!q.g||!q.tag) continue; q.g.remove(q.tag); const t=makeTag(q.name||'?',isMate(id)?'#7cc9a4':'#fff',q.st&&q.st.ti); t.position.set(0,2.25,0); q.g.add(t); q.tag=t; } }
function friendlyFire(id,pt){ puff(pt,0xffffff,3,1); if(!R.ffWarn||R.t-R.ffWarn>3){ R.ffWarn=R.t; msg(`Hold fire: ${NET.players[id].name} is ${coopRaid()||(R&&R.sides)?'on your side':'in your squad'}`); } }
function squadHud(hd){
  if(!NET.on||(!mySquad()&&!coopRaid())) return; let html='';
  for(const id in NET.players){ const q=NET.players[id]; if(!isMate(id)||!q.st||q.st.dead) continue; const dx=q.st.x-P.pos.x, dz=q.st.z-P.pos.z; const rel=Math.atan2(dx,-dz)*180/Math.PI-hd; html+=`<div class="mate${q.st.down?' down':''}"><span>◆ ${esc(q.name)}${q.st.down?' · DOWN':''}</span><span>${Math.round(Math.hypot(dx,dz))} m</span><span class="arr" style="transform:rotate(${rel}deg)">▲</span></div>`; }
  if(html) $('#exlist').insertAdjacentHTML('beforeend',html);
}
function removeRemote(id){ const p=NET.players[id]; if(p&&p.sledM&&scene) scene.remove(p.sledM); if(p&&p.heli&&scene){ scene.remove(p.heli.g); rotorStop(p.heli.snd); p.heli=null; } if(p&&p.g&&scene&&R){ scene.remove(p.g); R.targets=R.targets.filter(m=>!p.parts.includes(m)); } delete NET.players[id]; }
function contById(cid){ return R?allConts().find(c=>c.cid===cid):null; }
function removeUid(cont,uid){ const i=cont.items.findIndex(x=>x.uid===uid); if(i>=0){ cont.items.splice(i,1); return true; } return false; }
function netTake(it){ if(!NET.on||!R.lootTarget) return; nsend({t:'take',cid:R.lootTarget.cid,uid:it.uid}); }
function netPut(it){ if(!NET.on||!R.lootTarget) return; reUid(it); const c=JSON.parse(JSON.stringify(it)); delete c.hid; nsend({t:'put',cid:R.lootTarget.cid,item:c}); }
function netApplyWelcome(m){
  for(const uid of (m.taken||[])) for(const c of allConts()) if(removeUid(c.cont,uid)) break;
  for(const b of (m.bodies||[])) addBody(b.cid,b.x,b.z,b.name,b.items);
  for(const pt of (m.puts||[])){ const c=contById(pt.cid); if(c) place(c.cont,pt.item); }
  for(const uid of (m.taken||[])) for(const c of allConts()) if(removeUid(c.cont,uid)) break;
  for(const ev of (m.events||[])) applyBossEv(ev,true);
  for(const id of (m.doors||[])) applyDoorMsg(id);
  if(m.estate){ applyEstate(m.estate,true); }
  for(const p of m.players) if(p.id!==NET.id&&p.st) NET.players[p.id].st=p.st;
}
function applyEstate(m,snap){
  if(!R) return;
  (m.e||[]).forEach((a,i)=>{ const e=R.enemies[i]; if(!e) return; e.nx=a[0]; e.nz=a[1]; e.nyaw=a[2]; e.hp=a[3]; e.headHp=a[4]; e.moving=!!a[6]; e.np={b:a[7]||0,aim:a[8]||0}; if(snap){ e.pos.x=a[0]; e.pos.z=a[1]; e.yaw=a[2]; } if(a[5]&&!e.dead){ e.dead=true; e.deathT=snap?1:0; if(snap){ bodySnapDead(e.rig,1); e.g.position.y=(R.terrain?R.terrain(e.pos.x,e.pos.z):0)+0.18; } R.targets=R.targets.filter(x=>!e.parts.includes(x)); } });
  if(m.ap&&R.airMap) airApplyEstate(m.ap,snap);
  if(m.dr) applyDroneState(m.dr);
  if(m.bs&&R.boss){ R.boss.maxHp=m.bs[0]; R.boss.phase=m.bs[1]; R.boss.e.enraged=m.bs[1]>=3; if(m.bs[2]) R.boss.awake=true; }
  if(m.shots&&!snap) for(const s of m.shots){ tracer(s[0],1.4,s[1],s[2],s[3],s[4],0xffcf7a); sfxShot('akr',Math.hypot(s[0]-P.pos.x,s[1]-P.pos.z)); }
}
function netMsg(m){
  if(netHubMsg(m)) return;
  if(!R&&!['pjoin','pleave','state','host'].includes(m.t)) return;
  switch(m.t){
    case 'pjoin': NET.players[m.p.id]={name:m.p.name,st:null,g:null,squad:m.p.squad||null,side:m.p.side||0}; msg(`${m.p.name} entered the raid`); break;
    case 'pleave': if(NET.players[m.id]) msg(`${NET.players[m.id].name} left`); removeRemote(m.id); break;
    case 'host': { const was=NET.host; NET.host=(m.id===NET.id); if(NET.host&&!was) msg('You are now running the AI for this raid'); break; }
    case 'state': { const p=NET.players[m.id]; if(p) p.st=m; break; }
    case 'take': { if(m.cid==='d'+NET.id){ takeMine(m.uid,m.from); if(R.invOpen) R.dirty=true; break; } const c=contById(m.cid); if(c&&removeUid(c.cont,m.uid)&&R.invOpen&&R.lootTarget===c) R.dirty=true; break; }
    case 'deny': { for(const c of playerConts()) if(removeUid(c,m.uid)){ toast('Someone else grabbed that first.'); if(R.invOpen) R.dirty=true; break; } break; }
    case 'put': { const c=contById(m.cid); if(c){ place(c.cont,m.item); if(R.invOpen&&R.lootTarget===c) R.dirty=true; } break; }
    case 'pdmg': case 'adm': case 'pev': airMsg(m); break;
    case 'phit': { R.lastHitBy=m.from; R.lastHitT=R.t; const am=m.ammo==='fist'?{dmg:34,pen:6}:ITEMS[m.ammo]; const who=NET.players[m.from]?NET.players[m.from].name:'a player'; playerHit(am.dmg,am.pen,who,m.part); break; }
    case 'eshot': R.hitGun=ITEMS[m.gun]?m.gun:null; for(let i=0;i<m.hits;i++) playerHit(m.dmg,m.pen,m.name,null,m.x!=null?{x:m.x,z:m.z}:null); R.hitGun=null; break;
    case 'ehit': { if(!NET.host) break; const e=R.enemies[m.i]; if(e&&!e.dead){ e.lastW=m.w; const am=m.ammo==='fist'?{dmg:34,pen:6}:m.ammo==='sled'?{dmg:Math.min(400,+m.dmg||0),pen:99,id:'sled'}:ITEMS[m.ammo]; if(!am) break; hitEnemy(e,m.part,am,new THREE.Vector3(m.px,m.py,m.pz),m.from); } break; }
    case 'shot': if(NET.host) hearShot(m.x,m.z,m.r); break;
    case 'pshot': remoteShot(m); break;
    case 'nade': nadeNet(m); break;
    case 'arrow': arrowNet(m); break;
    case 'spot': spotNet(m); break;
    case 'pdhit': pdHit(+m.dmg||0); break;
    case 'estate': if(!NET.host) applyEstate(m,false); break;
    case 'body': addBody(m.cid,m.x,m.z,m.name,m.items); break;
    case 'dbox': addDbox(m,m.from); break;
    case 'dboxgone': removeDbox(m.cid); break;
    case 'reviving': if(P.down) P.down.by=m.on&&NET.players[m.from]?NET.players[m.from].name:null; break;
    case 'revive': revived(m.from); break;
    case 'boss': applyBossEv(m,false); break;
    case 'msg': msg(m.text); break;
    case 'door': applyDoorMsg(m.id); break;
    case 'runover': runOverMe(Math.min(400,+m.dmg||0),m.from); break;
    case 'dhit': { if(!NET.host) break; const d=R.drones&&R.drones[m.i]; if(d&&!d.dead) droneHit(d,{dmg:Math.min(200,+m.dmg||0)},{x:d.x,y:d.y,z:d.z},true); break; }
    case 'kcredit': { const e=R.enemies[m.i]; R.kills++; qKill(e||{kind:m.kind,pos:P.pos},m.head,m.w); goalKill(e||{kind:m.kind},m.head); break; }
    case 'dmscore': case 'dmend': dmNet(m); break;
    case 'end': if(R&&R.dm){ endRaid('dm'); break; } endRaid(P&&P.dead?'kia':'mia',P&&P.dead?R.cause:'The raid timer ran out'); break;
  }
}
function netTick(dt){
  if(!NET.on||!R||R.over) return;
  NET.sendT-=dt; if(NET.sendT<=0){ NET.sendT=0.07; if(R.lkBase==null) R.lkBase=lookStr(); { const st={t:'state',pd:R.pd?[+R.pd.x.toFixed(1),+R.pd.y.toFixed(1),+R.pd.z.toFixed(1),+R.pd.yaw.toFixed(2)]:0,gw:(curW()||{}).id||'',ln:+(P.lean||0).toFixed(2),rd:R.ride?(R.ride.mode==='drive'?1:2):0,sh:R.sled?+R.sled.h.toFixed(2):0,sa:R.ride&&R.sled?[+(R.sled.pitch||0).toFixed(2),+(R.sled.roll||0).toFixed(2)]:0,cr:R.crashes||0,ps:(R.sled&&!R.ride)?[+R.sled.x.toFixed(1),+R.sled.y.toFixed(1),+R.sled.z.toFixed(1),+R.sled.h.toFixed(2)]:0,lk:R.lkBase+'|'+gearLook(),y:+P.y.toFixed(2),p:+P.pitch.toFixed(2),down:P.down?1:0,dt:P.down?Math.ceil(P.down.t):0,hp:Math.round(totalHP()),heli:(R.heli&&R.heli.phase==='in')?[+R.heli.g.position.x.toFixed(1),+R.heli.g.position.y.toFixed(1),+R.heli.g.position.z.toFixed(1),+R.heli.yaw.toFixed(2)]:0,grace:P.grace>0,x:+P.pos.x.toFixed(2),z:+P.pos.z.toFixed(2),yaw:+P.yaw.toFixed(3),crouch:P.crouch,sneak:P.sneak,sprint:P.sprint,moving:Math.hypot(P.vx,P.vz)>0.6,dead:P.dead,ti:(S.goals&&S.goals.title)||'',jam:myJammer(),gf:+freshness().toFixed(2)}; if(R.airMap) airState(st); nsend(st); } }
  if(R.airMap) airRemoteBegin();
  for(const id in NET.players){ const p=NET.players[id]; if(!p.st) continue; if(p.g&&(p.st.lk||'')!==p.lk){ const pos=p.g.position.clone(), ry=p.g.rotation.y; scene.remove(p.g); R.targets=R.targets.filter(m=>!p.parts.includes(m)); p.g=null; ensureRemote(id); if(p.g){ p.g.position.copy(pos); p.g.rotation.y=ry; } } ensureRemote(id); if(!p.g) continue; if(p.rig&&p.st.gw!=null&&p.st.gw!==(p.rig.gunId||'')) setHeldGun(p.rig,p.st.gw); if(Math.hypot(p.st.x-p.g.position.x,p.st.z-p.g.position.z)>15){ p.g.position.x=p.st.x; p.g.position.z=p.st.z; } remoteHeli(p,dt); p.g.visible=!p.st.dead&&!p.st.heli&&!(R.spec&&R.spec.id===id); const k=Math.min(1,dt*12); p.g.position.x+=(p.st.x-p.g.position.x)*k; p.g.position.z+=(p.st.z-p.g.position.z)*k; p.g.position.y+=(((p.st.y||0)+(p.st.down?0.22:0)+(p.st.rd?0.42:0))-p.g.position.y)*k; if(R.sleds) remoteSled(p,k); if(R.airMap) airRemote(id,p); p.g.rotation.x+=((p.st.down?-1.35:0)-p.g.rotation.x)*k; if(p.st.down){ const db=R.conts.find(c=>c.cid==='d'+id); if(db){ db.x=p.g.position.x; db.z=p.g.position.z; } } p.g.rotation.y=lerpA(p.g.rotation.y,p.st.yaw,k); if(p.g.visible) remotePose(p,dt); }
  if(NET.host){ NET.estT-=dt; if(NET.estT<=0){ NET.estT=0.1; nsend({t:'estate',e:R.enemies.map(e=>[+e.pos.x.toFixed(2),+e.pos.z.toFixed(2),+e.yaw.toFixed(2),Math.round(e.hp),Math.round(e.headHp),e.dead?1:0,e.moving?1:0,enemyPoseBits(e),e.rig?Math.round(e.rig.s.aimP*100)/100:0]),shots:R.shots,dr:R.drones&&R.drones.length?droneState():undefined,bs:R.boss?[R.boss.maxHp,R.boss.phase,R.boss.awake?1:0]:undefined,ap:R.airMap?airEstate():undefined}); R.shots=[]; } }
}
