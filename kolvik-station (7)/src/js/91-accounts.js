/* 91-accounts: server accounts */
/* ================= ACCOUNTS (server only) ================= */
const ACC={token:null,name:null,timer:null,pending:null};
try{ const a=JSON.parse(localStorage.getItem('kolvik-acc')||'null'); if(a&&a.token){ ACC.token=a.token; ACC.name=a.name; } }catch(e){}
function accStore(){ try{ if(ACC.token) localStorage.setItem('kolvik-acc',JSON.stringify({token:ACC.token,name:ACC.name})); else localStorage.removeItem('kolvik-acc'); }catch(e){} }
async function accFetch(url,method,body){ const r=await fetch(url,{method,headers:Object.assign({'content-type':'application/json'},ACC.token?{authorization:'Bearer '+ACC.token}:{}),body:body?JSON.stringify(body):undefined,cache:'no-store'}); const j=await r.json().catch(()=>({})); if(!r.ok) throw new Error(j.error||('HTTP '+r.status)); return j; }
function accPush(obj){ if(!ACC.token||!NET.avail) return; ACC.pending=JSON.parse(JSON.stringify(obj)); clearTimeout(ACC.timer); ACC.timer=setTimeout(accFlush,400); }
async function accFlush(){ if(!ACC.token||!ACC.pending) return; const body=ACC.pending; ACC.pending=null; try{ await accFetch('api/save','PUT',body); }catch(e){ if(/signed/.test(e.message)){ ACC.token=null; ACC.name=null; accStore(); accBtn(); toast('Signed out: your session expired.'); } } }
addEventListener('beforeunload',()=>{ if(ACC.token&&ACC.pending&&navigator.sendBeacon){ /* best effort */ } });
function accBtn(){ const b=$('#accBtn'); b.hidden=!NET.avail; b.textContent=ACC.name?`◉ ${ACC.name}`:'Sign in'; }
async function accLoad(){ if(!ACC.token||!NET.avail) return; try{ const j=await accFetch('api/load','GET'); if(j.save&&j.save.v===2){ S=j.save; S.inRaid=false; S.stash.h=STASH_ROWS[S.hide.stash]; normSave(); applySeason(); try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} if(!R) renderTab(); } }catch(e){ if(/signed/.test(e.message)){ ACC.token=null; ACC.name=null; accStore(); } } accBtn(); }
function accModal(){
  const m=$('#accModal'); m.hidden=false;
  if(ACC.name){ m.innerHTML=`<div class="card acc"><span class="lbl">Account</span><h2>${esc(ACC.name)}</h2><p class="muted" style="margin:0">Your stash, cash, hideout and stats are saved on this server after every change. Sign in on any device to pick up where you left off.</p><div class="acts"><button class="btn ghost" id="accOut">Sign out</button><button class="btn" id="accClose">Close</button></div></div>`;
    $('#accOut').onclick=async()=>{ await accFlush(); try{ await accFetch('api/logout','POST'); }catch(e){} ACC.token=null; ACC.name=null; accStore(); accBtn(); m.hidden=true; NET.friends=[]; NET.fin=[]; NET.fout=[]; NET.dms=new Map(); NET.dmWith=null; NET.invites=[]; renderInvites(); socialBadge(); netHello(); renderTab(); toast('Signed out. This browser keeps a local copy.'); };
    $('#accClose').onclick=()=>m.hidden=true; return; }
  m.innerHTML=`<div class="card acc"><span class="lbl">Account</span><h2>Sign in</h2><p class="muted" style="margin:0">New name registers an account and keeps the progress in this browser. Existing name signs in and loads your server save.</p>
    <label class="lbl" for="accName">Name</label><input id="accName" maxlength="16" autocomplete="username" placeholder="3–16 letters, numbers, _">
    <label class="lbl" for="accPass">Password</label><input id="accPass" type="password" maxlength="64" autocomplete="current-password" placeholder="at least 6 characters">
    <div class="err" id="accErr"></div><div class="acts"><button class="btn" id="accIn">Sign in</button><button class="btn ghost" id="accReg">Register</button><button class="btn ghost" id="accClose">Cancel</button></div></div>`;
  const go=async(reg)=>{ const name=$('#accName').value.trim(), pass=$('#accPass').value; $('#accErr').textContent='';
    try{ const j=await accFetch(reg?'api/register':'api/login','POST',reg?{name,pass,save:S}:{name,pass}); ACC.token=j.token; ACC.name=j.name; accStore(); NET.dms=new Map(); NET.dmWith=null; netHello(); if(!reg){ if(j.save&&j.save.v===2){ S=j.save; S.inRaid=false; S.stash.h=STASH_ROWS[S.hide.stash]; normSave(); applySeason(); try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} } else accPush(S); } m.hidden=true; accBtn(); if(!S.name) S.name=j.name.slice(0,14); renderTab(); toast(reg?`Account ${j.name} created.`:`Signed in as ${j.name}.`); }
    catch(e){ $('#accErr').textContent=e.message; } };
  $('#accIn').onclick=()=>go(false); $('#accReg').onclick=()=>go(true); $('#accClose').onclick=()=>m.hidden=true;
  $('#accPass').onkeydown=e=>{ if(e.key==='Enter') go(false); };
}
