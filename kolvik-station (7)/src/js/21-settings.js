/* 21-settings: OPTS, settings modal */
/* ================= SETTINGS (per browser) ================= */
const OPTS={flash:'reduced',fx:'full',sens:1,musicMode:'all',musicVol:0.8,cacheAnim:'full',diff:'normal',chase:false,air:1,pullup:'on',aoa:'on',aiLearn:'on',minimap:'on',raidMusic:'quiet'};
try{ Object.assign(OPTS,JSON.parse(localStorage.getItem('kolvik-opts')||'{}')); }catch(e){}
function saveOpts(){ try{ localStorage.setItem('kolvik-opts',JSON.stringify(OPTS)); }catch(e){} }
function openOpts(){
  const m=$('#optModal'); m.hidden=false;
  const seg=(key,vals)=>`<div class="seg" role="radiogroup">${vals.map(([v,l])=>`<button type="button" role="radio" aria-checked="${OPTS[key]===v}" data-opt="${key}" data-val="${v}">${l}</button>`).join('')}</div>`;
  m.innerHTML=`<div class="card opts"><span class="lbl">Settings · saved in this browser</span><h2>Settings</h2>
    <div class="optrow"><div><b>Muzzle flash</b><small>Reduced dims the light from every shot and shortens your own flash. Off removes both.</small></div>${seg('flash',[['full','Full'],['reduced','Reduced'],['off','Off']])}</div>
    <div class="optrow"><div><b>Hit effects</b><small>Red screen edge and camera shake when you are shot.</small></div>${seg('fx',[['full','Full'],['reduced','Reduced']])}</div>
    <div class="optrow tracks"><div><b>Music</b><small>Original pieces for the hideout. Pick one or let them play through.</small></div><div class="tlist">${TRACKS.map((tr,k)=>`<button type="button" class="trk" data-track="${k}" aria-pressed="${MUS.on&&MUS.ti===k}">${esc(tr.name)}<small>${fmtTime(tr.len*tr.bar)}</small></button>`).join('')}</div></div>
    <div class="optrow"><div><b>Music in raids</b><small>A quiet score under the raid that gets tenser when you're hunted or fighting. Quiet sits well under the footsteps; Normal is a little more present.</small></div>${seg('raidMusic',[['off','Off'],['quiet','Quiet'],['normal','Normal']])}</div>
    <div class="optrow"><div><b>Play order</b></div>${seg('musicMode',[['all','In order'],['shuffle','Shuffle'],['one','Repeat one']])}</div>
    <div class="optrow"><div><b>Music volume</b><small id="mvolVal">${Math.round((OPTS.musicVol!=null?OPTS.musicVol:0.8)*100)}%</small></div><input type="range" id="mvol" min="0" max="1" step="0.05" value="${OPTS.musicVol!=null?OPTS.musicVol:0.8}" aria-label="Music volume"></div>
    <div class="optrow"><div><b>Minimap</b><small>The GPS minimap in the corner during raids (N toggles it in a raid; M opens the full map).</small></div>${seg('minimap',[['on','On'],['off','Off']])}</div>
    <div class="optrow"><div><b>Opening caches</b><small>Full plays the whole spin, Short a quick one, Instant just shows what you got.</small></div>${seg('cacheAnim',[['full','Full'],['short','Short'],['instant','Instant']])}</div>
    <div class="optrow"><div><b>Terrain pull-up</b><small>Aircraft pull up on their own when they are about to hit water or ground. Off is a real crash.</small></div>${seg('pullup',[['on','On'],['off','Off']])}</div>
    <div class="optrow"><div><b>Enemies learn</b><small>Enemy tactics (aggression, flanking, patience, caution…) evolve between raids from how well they did against you. Accuracy never changes. Kept in this browser.</small></div>${seg('aiLearn',[['on','On'],['off','Off']])}</div>
    <div class="optrow"><div><b>Stall protection</b><small>Limits how hard you can pull so the wing keeps flying. Off lets you yank it into a stall.</small></div>${seg('aoa',[['on','On'],['off','Off']])}</div>
    <div class="optrow"><div><b>Mouse sensitivity</b><small id="sensVal">${OPTS.sens.toFixed(2)}×</small></div><input type="range" id="sens" min="0.3" max="2.5" step="0.05" value="${OPTS.sens}" aria-label="Mouse sensitivity"></div>
    <div class="acts"><button class="btn" id="optDone">Done</button></div></div>`;
  m.querySelectorAll('[data-opt]').forEach(b=>b.onclick=()=>{ OPTS[b.dataset.opt]=b.dataset.val; saveOpts(); vmUid=null; m.querySelectorAll(`[data-opt="${b.dataset.opt}"]`).forEach(x=>x.setAttribute('aria-checked',String(x===b))); });
  $('#sens').oninput=e=>{ OPTS.sens=+e.target.value; $('#sensVal').textContent=OPTS.sens.toFixed(2)+'×'; saveOpts(); };
  $('#optDone').onclick=()=>{ m.hidden=true; };
  m.querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>{ musicPlay(+b.dataset.track); m.querySelectorAll('[data-track]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); });
  $('#mvol').oninput=e=>{ OPTS.musicVol=+e.target.value; $('#mvolVal').textContent=Math.round(OPTS.musicVol*100)+'%'; saveOpts(); if(MUS.on&&MUS.ctx){ MUS.master.gain.cancelScheduledValues(MUS.ctx.currentTime); MUS.master.gain.setTargetAtTime(musicLevel(),MUS.ctx.currentTime,0.1); } };
}
