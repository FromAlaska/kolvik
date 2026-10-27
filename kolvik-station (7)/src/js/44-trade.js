/* 44-trade: trading with friends
   From the Friends tab, ask an online friend who's at the hideout to trade. Each of you puts up cash and items from
   your stash; the other side sees it live. When both press Ready on the same deal, it goes through: you get theirs,
   they get yours. Any change to either offer un-readies both of you, so nobody can swap something out at the last
   second. What you put up is held in escrow in your save (out of your stash and cash) until the trade completes or is
   cancelled, then it's either gone to them or back with you, even if the page closes. The server only relays the
   deal (trreq, tracc, troffer, trok, trdone, trend in server.js). */
const TRADE={on:false, id:null, with:null, theirs:{cash:0,items:[]}, okMe:false, okThem:false, ver:0, q:''};
const tradeEsc=()=>S.trade||(S.trade={cash:0,items:[]});
// put an escrowed offer back where it came from (a cancelled trade, or one left hanging when the page closed)
function tradeRestore(){ if(!S||!S.trade) return; const e=S.trade; S.cash+=e.cash||0; const left=[];
  for(const it of (e.items||[])) if(!ITEMS[it.id]||!place(S.stash,it)) left.push(it);
  if(left.length){ e.cash=0; e.items=left; toast(`No room in your stash for ${left.length} traded item${left.length>1?'s':''}: they're kept aside until you make space.`); } else S.trade=null; }
// make a received item safe to keep: known ids only (inside containers and attachments too), sane stack sizes, fresh ids
function cleanTraded(o,depth=0){ if(!o||typeof o!=='object'||!ITEMS[o.id]||depth>3) return null; const d=ITEMS[o.id]; const it=JSON.parse(JSON.stringify(o)); it.uid=uid(); delete it.hid;
  if(d.stack) it.n=Math.max(1,Math.min(d.stack,Math.floor(+it.n||1))); else delete it.n;
  if(d.dur!=null&&it.dur!=null) it.dur=Math.max(0,Math.min(d.dur,+it.dur||0)); if(d.hp!=null&&it.hp!=null) it.hp=Math.max(0,Math.min(d.hp,+it.hp||0));
  if(it.ammo&&!ITEMS[it.ammo]) it.ammo=mk(o.id).ammo;
  if(it.att) for(const k in it.att) it.att[k]=it.att[k]?cleanTraded(it.att[k],depth+1):null;
  if(d.grid) it.items=(Array.isArray(it.items)?it.items:[]).map(x=>cleanTraded(x,depth+1)).filter(Boolean); else delete it.items;
  it.x=0; it.y=0; it.r=it.r?1:0; return it; }
// would their items fit in my stash?
function tradeFits(items){ const c={w:S.stash.w,h:S.stash.h,items:JSON.parse(JSON.stringify(S.stash.items))}; for(const x of items){ const it=cleanTraded(x); if(!it||!place(c,it)) return false; } return true; }
const offerValue=o=>(o.cash||0)+(o.items||[]).reduce((s,x)=>{ try{ return s+deepValue(x); }catch(e){ return s; } },0);

function tradeAsk(name){ wsend({t:'trreq',name}); }
function tradeSendOffer(){ const e=tradeEsc(); saveGame(); wsend({t:'troffer',id:TRADE.id,cash:e.cash,items:e.items}); }
function tradeNet(m){
  if(m.t==='trreq'){ NET.trq=(NET.trq||[]).filter(r=>r.from!==m.from); NET.trq.push({from:m.from,at:Date.now()}); tradeReqUI(); sfxTone(660,0.08,0.08,'sine'); setTimeout(()=>sfxTone(990,0.1,0.08,'sine'),90); if(!R) toast(`${m.from} wants to trade.`); return true; }
  if(m.t==='trade'){ if(R){ wsend({t:'trcancel'}); return true; } const fresh=!TRADE.on||TRADE.id!==m.id; Object.assign(TRADE,{on:true,id:m.id,with:m.with,theirs:m.theirs||{cash:0,items:[]},okMe:m.okMe,okThem:m.okThem,ver:m.ver}); if(fresh) TRADE.q=''; NET.trq=(NET.trq||[]).filter(r=>r.from!==m.with); tradeReqUI(); tradeUI(); return true; }
  if(m.t==='trdone'){ tradeComplete(m); return true; }
  if(m.t==='trend'){ if(TRADE.on&&TRADE.id===m.id){ TRADE.on=false; tradeRestore(); saveGame(); tradeUI(); if(!R) renderTab(); toast(m.reason||'Trade cancelled.'); } return true; }
  return false;
}
function tradeComplete(m){
  const got=(m.get&&m.get.items||[]).map(x=>cleanTraded(x)).filter(Boolean), cash=Math.max(0,Math.floor(+(m.get&&m.get.cash)||0));
  S.trade=null; S.cash+=cash; let sold=0; for(const it of got) if(!place(S.stash,it)){ sold+=Math.round(deepValue(it)*0.5); }
  if(sold) S.cash+=sold; S.stats.trades=(S.stats.trades||0)+1; saveGame(); TRADE.on=false; tradeUI(); if(!R) renderTab();
  const parts=[]; if(cash) parts.push(fmt$(cash)); if(got.length) parts.push(`${got.length} item${got.length>1?'s':''}`);
  toast(`Trade with ${m.with} done: you got ${parts.join(' and ')||'nothing'}.${sold?` No room for some of it, so it was sold for ${fmt$(sold)}.`:''}`); sfxExtracted(); }

/* ---------------- the trade window ---------------- */
function tradeUI(){
  let el=$('#trade'); if(!TRADE.on){ if(el){ el.hidden=true; el.innerHTML=''; } return; }
  if(!el){ el=document.createElement('div'); el.id='trade'; el.className='overlay'; document.body.appendChild(el); }
  el.hidden=false; const e=tradeEsc(), th=TRADE.theirs, fits=tradeFits(th.items||[]);
  const row=(it,act,attr)=>`<li><span class="hic" style="background-image:url(${iconFor(it.id)})"></span><span class="nm">${esc(ITEMS[it.id].name)}${ITEMS[it.id].stack&&it.n>1?` ×${it.n}`:''}${it.items&&it.items.length?` <small>+${it.items.length} inside</small>`:''}</span><span class="v">${fmt$(Math.round(deepValue(it)))}</span>${act?`<button class="btn ghost sm" ${attr}="${it.uid}">${act}</button>`:''}</li>`;
  const q=TRADE.q.toLowerCase(); const stash=S.stash.items.filter(it=>!q||ITEMS[it.id].name.toLowerCase().includes(q));
  el.innerHTML=`<div class="tradebox"><div class="colhead"><h2 class="h2">Trade with ${esc(TRADE.with)}</h2><span class="lbl">Changing anything un-readies you both</span></div>
   <div class="tradecols">
    <section class="tcol"><h3>You give <span class="lbl">${fmt$(Math.round(offerValue(e)))}</span></h3>
      <label class="tcash"><span class="lbl">Cash</span><input id="trCash" type="number" min="0" step="100" value="${e.cash||0}"> <small class="muted">of ${fmt$(S.cash+(e.cash||0))}</small></label>
      <ul class="tlist">${e.items.map(it=>row(it,'Take back','data-trback')).join('')||'<li class="muted">Nothing yet. Add items from your stash below.</li>'}</ul>
      <div class="tstash"><div class="colhead"><span class="lbl">Your stash · click to offer</span><input id="trQ" placeholder="Search" value="${esc(TRADE.q)}"></div><ul class="tlist">${stash.map(it=>row(it,'Offer','data-tradd')).join('')||'<li class="muted">Nothing here. Equipped gear has to go back in your stash before you can trade it.</li>'}</ul></div>
      ${TRADE.okMe?'<p class="tok">You\'re ready</p>':''}</section>
    <section class="tcol"><h3>${esc(TRADE.with)} gives <span class="lbl">${fmt$(Math.round(offerValue(th)))}</span></h3>
      <p class="tcash">${fmt$(th.cash||0)} cash</p>
      <ul class="tlist">${(th.items||[]).filter(x=>ITEMS[x.id]).map(it=>row(it)).join('')||'<li class="muted">No items.</li>'}</ul>
      ${TRADE.okThem?`<p class="tok">${esc(TRADE.with)} is ready</p>`:`<p class="muted">Waiting for ${esc(TRADE.with)} to press Ready.</p>`}
      ${fits?'':'<p class="tbad">Not enough room in your stash for their items. Sell or move something first.</p>'}</section>
   </div>
   <div class="acts"><button class="btn ghost" id="trCancel">Cancel trade</button><button class="btn ${TRADE.okMe?'ghost':''}" id="trOk" ${fits?'':'disabled'}>${TRADE.okMe?'Not ready':'Ready'}</button></div></div>`;
  const cin=$('#trCash'); cin.onchange=()=>{ const want=Math.max(0,Math.min(S.cash+(e.cash||0),Math.floor(+cin.value||0))); S.cash+=(e.cash||0)-want; e.cash=want; renderHeader(); tradeSendOffer(); };
  el.querySelectorAll('[data-tradd]').forEach(b=>b.onclick=()=>{ const i=S.stash.items.findIndex(x=>x.uid===b.dataset.tradd); if(i<0) return; if(e.items.length>=30){ toast('30 items per trade at most.'); return; } e.items.push(S.stash.items.splice(i,1)[0]); tradeSendOffer(); });
  el.querySelectorAll('[data-trback]').forEach(b=>b.onclick=()=>{ const i=e.items.findIndex(x=>x.uid===b.dataset.trback); if(i<0) return; const it=e.items[i]; if(!place(S.stash,it)){ toast('No room in your stash for that.'); return; } e.items.splice(i,1); tradeSendOffer(); });
  const qi=$('#trQ'); qi.oninput=()=>{ TRADE.q=qi.value; const pos=qi.selectionStart; tradeUI(); const q2=$('#trQ'); q2.focus(); q2.setSelectionRange(pos,pos); };
  $('#trCancel').onclick=()=>wsend({t:'trcancel'});
  $('#trOk').onclick=()=>wsend({t:'trok',id:TRADE.id,ver:TRADE.ver,ok:!TRADE.okMe});
}
// incoming requests show with the squad invites in the corner (renderInvites in 90-net.js)
function tradeReqUI(){ renderInvites(); }
