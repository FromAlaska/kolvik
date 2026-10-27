/* 23-seasons: season wipes */
/* ================= SEASONS ================= */
function notice(title,html){ const m=$('#optModal'); m.hidden=false; m.innerHTML=`<div class="card"><span class="lbl">Kolvik Station</span><h2>${esc(title)}</h2><div class="muted" style="font-size:15px">${html}</div><div class="acts"><button class="btn" id="noticeOk">Got it</button></div></div>`; $('#noticeOk').onclick=()=>{ m.hidden=true; }; }
function applySeason(){
  const sn=NET.season; if(!sn||R||!S) return; normSave();
  if(S.season==null){ S.season=sn.n; saveGame(); renderHeader(); return; }
  if(S.season>=sn.n) return;
  const old=S, career=old.career; const final={n:old.season,worth:worthOf(old),raids:old.stats.raids,extracts:old.stats.extracts,kills:old.stats.kills}; career.seasons.push(final);
  S=newSave(); S.name=old.name; S.music=old.music; S.career=career; S.cos=old.cos; S.goals=old.goals; S.season=sn.n; S.stash.h=STASH_ROWS[S.hide.stash]; normSave(); saveGame(); BOARD.rows=null; renderTab();
  const h=NET.hall&&NET.hall.n===old.season?NET.hall:null; const champ=h&&h.top&&h.top[0];
  notice(`Season ${sn.n} has begun`,`<p>The server wiped everyone's stash, cash, hideout and tasks. You start again with $4,000, a pistol and a sack. Your career totals, goals and titles, collection log, cosmetics, sealed caches and scrip carry over.</p>${champ?`<p>Season ${h.n} champion: <b>${esc(champ.name)}</b> at ${fmt$(champ.worth)}.</p>`:''}<p>You finished season ${final.n} worth <b>${fmt$(final.worth)}</b> after ${final.raids} raid${final.raids===1?'':'s'}.</p>`);
}
function hofHtml(){
  const hall=BOARD.hall||[]; const c=S.career;
  const career=c?`<p class="muted" style="font-size:13px">Your career: ${c.raids} raids · ${c.extracts} extracts · ${c.kills} kills${c.seasons.length?` · ${c.seasons.length} finished season${c.seasons.length===1?'':'s'}`:''}</p>`:'';
  if(!hall.length) return `<h3 class="tsec">Hall of Fame</h3><p class="muted">The first season is still running. When it ends, the top players are recorded here for good.</p>${career}`;
  const fd=t=>new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric'});
  return `<h3 class="tsec">Hall of Fame</h3><div class="hof">${hall.map(h=>`<article class="hofc"><div class="colhead"><b>Season ${h.n}</b><span class="lbl">${fd(h.start)} – ${fd(h.end)} · ${h.players} player${h.players===1?'':'s'}</span></div>
    ${h.top&&h.top[0]?`<div class="champ"><span class="lbl">Champion</span><b>${esc(h.top[0].name)}</b><span class="cash">${fmt$(h.top[0].worth)}</span></div>`:''}
    <ol>${(h.top||[]).slice(1).map(t=>`<li>${esc(t.name)} <span class="cash">${fmt$(t.worth)}</span></li>`).join('')}</ol>
    <div class="hofx">${h.kills?`<span>Most AI kills <b>${esc(h.kills.name)}</b> ${h.kills.value}</span>`:''}${h.pkills?`<span>Most player kills <b>${esc(h.pkills.name)}</b> ${h.pkills.value}</span>`:''}${h.extracts?`<span>Most extracts <b>${esc(h.extracts.name)}</b> ${h.extracts.value}</span>`:''}${h.haul?`<span>Best haul <b>${esc(h.haul.name)}</b> ${fmt$(h.haul.value)}</span>`:''}</div></article>`).join('')}</div>${career}`;
}
