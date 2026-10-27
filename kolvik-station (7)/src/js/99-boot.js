/* 99-boot: boot */
/* ---- boot ---- */
// the workshop (/workshop) loads this page's code as a preview without starting the game: no save, hideout or network
if(window.KOLVIK_WORKSHOP){ S=newSave(); normSave(); }
else {
S=loadGame();
let abandoned=false;
if(!S){ S=newSave(); saveGame(); } else if(S.inRaid){ S.inRaid=false; abandoned=true; saveGame(); }
// older saves: weapons without attachment slots
(function(){ const fix=it=>{ if(!it) return; if(ITEMS[it.id]&&ITEMS[it.id].type==='weapon'&&!it.att) it.att={optic:null,muzzle:null,mag:null}; if(it.items) it.items.forEach(fix); }; S.stash.items.forEach(fix); Object.values(S.eq).forEach(fix); })();
S.stash.h=STASH_ROWS[S.hide.stash];
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$('#musicBtn').onclick=()=>{ if(MUS.on){ musicStop(); S.music=false; } else { S.music=true; musicStart(); } saveGame(); };
$('#nextBtn').onclick=()=>musicNext();
// browsers only allow sound after a click, so start the menu theme on the first interaction
// on click, not pointerdown: starting the music changes the header, and doing that between press and release made the first click on the page miss its button
document.addEventListener('click',function first(){ document.removeEventListener('click',first,true); setTimeout(()=>{ if(S.music&&!R&&!MUS.on) musicStart(); },0); },true);
if(!S.name) S.name=''; if(!S.lastKit) S.lastKit=[]; normSave(); buildHUD(); $('#scope').innerHTML=scopeSvg(); setTab('gear'); $('#accBtn').onclick=accModal; $('#tipsBtn').onclick=tipsReset; $('#optBtn').onclick=openOpts; $('#dbgBtn').onclick=openDebug;
$('#rchatForm').onsubmit=e=>{ e.preventDefault(); const t=$('#rchatIn').value.trim(); let mm;
  if(t){ if((mm=t.match(/^@(\w{3,16})\s+(.+)/))) wsend({t:'dm',to:mm[1].toLowerCase(),text:mm[2]});
    else if((mm=t.match(/^\/r\s+(.+)/))){ if(NET.lastDM) wsend({t:'dm',to:NET.lastDM,text:mm[1]}); else raidNote('Nobody has messaged you yet.'); }
    else if(R.chatCh==='dm'){ if(NET.lastDM) wsend({t:'dm',to:NET.lastDM,text:t}); else raidNote('Start with @name to message a friend.'); }
    else wsend({t:'chat',ch:R.chatCh,text:t}); }
  closeRaidChat(); };
$('#rchatIn').addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.preventDefault(); closeRaidChat(); } else if(e.key==='Tab'){ e.preventDefault(); const c=raidChans(); setRaidCh(c[(c.indexOf(R.chatCh)+1)%c.length]); } });
$('#rchatIn').addEventListener('blur',()=>{ if(R&&R.chatOpen) setTimeout(()=>{ if(R&&R.chatOpen&&document.activeElement!==$('#rchatIn')) closeRaidChat(); },0); }); netProbe().then(()=>{ accBtn(); return accLoad(); });
if(abandoned) toast('You left your last raid early. That gear is gone.');
}
