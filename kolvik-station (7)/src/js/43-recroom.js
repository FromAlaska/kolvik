/* 43-recroom: the Rec room — quick party games in the hideout that pay a little cash
   Four short games (ice fishing, catching supply drops, repeating a radio code, a quick-draw duel). Each pays up to
   $2,500 depending on the score, doubled for anyone worth under $20,000 so a broke player can always buy a kit again.
   Earnings above $20,000 a day pay only 10%. A squad leader can start a party round: everyone in the squad who's in the
   hideout plays the same game at the same moment with the same seed (same fish, same drops, same code), sees the
   others' scores live, and the top two get a bonus, Mario Party style. Scores are relayed by the server (mgparty,
   mgscore, mgend in server.js). */
const REC={pay:2500, cap:20000, broke:20000, W:320, H:200};
const MG_GAMES=[
  {id:'fish', name:'Ice hole', secs:30, par:18, unit:'points', how:'Hook the fish when the float goes right under. A twitch is only a nibble: strike then and you scare it off. Grayling 1 · pike 2 · king salmon 5.', keys:'Click, tap or Space'},
  {id:'drop', name:'Supply drop', secs:30, par:40, unit:'points', how:'Catch the crates (+1) and cash bundles (+3) on your sled. Ice chunks cost 2 points and freeze you for a moment.', keys:'Mouse, touch, or A/D and the arrow keys'},
  {id:'freq', name:'Frequency', secs:60, par:9, unit:'tones', how:'Listen to the radio code, then key it back. One more tone every round. One mistake ends it.', keys:'Click the pads, or keys 1 to 4'},
  {id:'draw', name:'Quick draw', secs:25, par:3200, unit:'points', how:'Five rounds. When the flare goes up, fire. Fire early and the round scores nothing.', keys:'Click, tap or Space'},
];
const MGMAP=Object.fromEntries(MG_GAMES.map(g=>[g.id,g]));
function recState(){ S.rec=S.rec||{day:0,earned:0,best:{},plays:0,wins:0}; if(S.rec.day!==dayKey()){ S.rec.day=dayKey(); S.rec.earned=0; } return S.rec; }
const recToday=()=>{ const e=recState().earned; return e>=REC.cap?`daily ${fmt$(REC.cap)} reached: 10% from here until tomorrow`:`${fmt$(e)} of ${fmt$(REC.cap)}`; };
const isBroke=()=>{ try{ return worthOf(S)<REC.broke; }catch(e){ return false; } };
function mgRng(seed){ let a=seed>>>0; return ()=>{ a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
// what a finished game pays: score against par, the placing bonus in a party, the broke bonus, the daily limit
function recPayout(g,score,place,n){
  const st=recState(), notes=[]; let base=REC.pay*Math.min(1.3,Math.max(0,score/g.par));
  if(n>1&&score>0&&place<=2){ const b=place===1?0.5:0.2; base*=1+b; notes.push(`${place===1?'1st':'2nd'} place +${b*100}%`); }
  if(isBroke()){ base*=2; notes.push('scav bonus ×2 (you\'re worth under $20,000)'); }
  base=Math.round(base/10)*10; const left=Math.max(0,REC.cap-st.earned);
  let pay=Math.min(base,left)+Math.round(Math.max(0,base-left)*0.1/10)*10; if(base>left) notes.push('over today\'s $20,000: 10%');
  return {pay,notes};
}

/* ---------------- the games ---------------- */
// each takes a seeded random source and returns {score, done, step(dt,inp), draw(ctx,t)}; inp = {x, taps:[], keys}
const MGF={
  fish(rng){
    const T=[{n:'Grayling',p:1,win:0.72,c:'#9fb4bf',s:12},{n:'Pike',p:2,win:0.56,c:'#7f9a5a',s:16},{n:'King salmon',p:5,win:0.42,c:'#d8a0a0',s:20}];
    const g={score:0,done:false,ph:'wait',t:0,dip:0,rip:[],fish:null,msg:'',msgT:0};
    const next=()=>{ const r=rng(); g.fish=r<0.13?T[2]:r<0.42?T[1]:T[0]; g.ph='wait'; g.t=0.9+rng()*2.4; g.nib=[]; const k=Math.floor(rng()*3); for(let i=0;i<k;i++) g.nib.push(0.3+rng()*(g.t-0.5)); };
    next();
    const say=(m,c)=>{ g.msg=m; g.msgC=c; g.msgT=1.1; };
    g.step=(dt,inp)=>{ g.msgT-=dt; g.t-=dt; for(const r of g.rip) r.r+=dt*26; g.rip=g.rip.filter(r=>r.r<40);
      const tap=inp.taps.length>0;
      if(g.ph==='wait'){ const el=g.t; g.dip=0; // nibbles are timed against the remaining wait: a short twitch, not a bite
        for(const n of g.nib){ if(el<n&&el>n-0.22){ g.dip=2.5*Math.sin((n-el)/0.22*Math.PI); if(g.nibR!==n){ g.nibR=n; g.rip.push({r:4}); sfxTone(220,0.04,0.03,'sine'); } } }
        if(tap){ g.ph='scared'; g.t=1.0; say('Too early: scared it off','bad'); sfxNoise(0.15,900,0.12); return; }
        if(g.t<=0){ g.ph='bite'; g.t=g.fish.win; g.rip.push({r:3},{r:9}); sfxNoise(0.18,700,0.18); } return; }
      if(g.ph==='bite'){ g.dip=10; if(tap){ g.score+=g.fish.p; g.ph='reel'; g.t=0.9; say(`${g.fish.n} +${g.fish.p}`,'ok'); sfxTone(523,0.08,0.08,'triangle'); setTimeout(()=>sfxTone(784,0.12,0.08,'triangle'),80); return; }
        if(g.t<=0){ g.ph='miss'; g.t=0.7; say('It got away','dim'); } return; }
      g.dip*=0.85; if(g.t<=0) next(); };
    g.draw=(c,t)=>{ const W=REC.W,H=REC.H; c.fillStyle='#dfe9ec'; c.fillRect(0,0,W,H); c.fillStyle='#c6d4da'; for(let i=0;i<14;i++){ c.fillRect((i*53)%W,(i*37)%H,22,2); }
      const cx=W/2, cy=H*0.58; c.fillStyle='#9fb2ba'; c.beginPath(); c.ellipse(cx,cy+3,66,25,0,0,7); c.fill(); c.fillStyle='#123040'; c.beginPath(); c.ellipse(cx,cy,62,22,0,0,7); c.fill();
      c.strokeStyle='rgba(160,210,230,.35)'; c.lineWidth=1; for(let i=0;i<3;i++){ const y=cy-8+i*7+Math.sin(t*1.5+i)*1.5; c.beginPath(); c.moveTo(cx-40+i*6,y); c.lineTo(cx+30-i*8,y); c.stroke(); }
      c.save(); c.beginPath(); c.ellipse(cx,cy,62,22,0,0,7); c.clip(); c.strokeStyle='rgba(200,235,245,.6)'; for(const r of g.rip){ c.globalAlpha=Math.max(0,1-r.r/40); c.beginPath(); c.ellipse(cx,cy,r.r,r.r*0.35,0,0,7); c.stroke(); } c.globalAlpha=1;
      if(g.ph==='reel'){ const k=1-g.t/0.9, f=g.fish; const fy=cy+6-k*60; c.restore(); c.save(); c.translate(cx,fy); c.rotate(Math.sin(t*20)*0.3); c.fillStyle=f.c; c.beginPath(); c.ellipse(0,0,f.s,f.s*0.38,0,0,7); c.fill(); c.beginPath(); c.moveTo(f.s-2,0); c.lineTo(f.s+8,-6); c.lineTo(f.s+8,6); c.fill(); c.fillStyle='#111'; c.fillRect(-f.s+5,-2,2,2); c.restore(); c.save(); }
      c.restore();
      const by=cy-6+g.dip+Math.sin(t*2)*0.6; c.strokeStyle='#33424a'; c.beginPath(); c.moveTo(cx+90,0); c.quadraticCurveTo(cx+30,by-60,cx,by-5); c.stroke();
      if(g.ph!=='reel'){ c.save(); c.beginPath(); c.rect(0,0,W,cy+(g.dip>6?-2:4)); c.clip(); c.fillStyle='#e2574a'; c.fillRect(cx-3,by-6,6,6); c.fillStyle='#f4f4f0'; c.fillRect(cx-3,by,6,5); c.fillStyle='#222'; c.fillRect(cx-0.5,by-9,1,3); c.restore(); }
      if(g.msgT>0){ mgText(c,g.msg,W/2,34,14,g.msgC); } };
    return g;
  },
  drop(rng){
    const g={score:0,done:false,x:REC.W/2,stun:0,obj:[],next:0.4,el:0,pop:[]};
    g.step=(dt,inp)=>{ g.el+=dt; g.stun-=dt; const sp=250;
      if(g.stun<=0){ let dir=(inp.keys.ArrowRight||inp.keys.KeyD?1:0)-(inp.keys.ArrowLeft||inp.keys.KeyA?1:0);
        if(dir) g.x+=dir*sp*dt; else if(inp.x!=null){ const d=inp.x-g.x; g.x+=Math.sign(d)*Math.min(Math.abs(d),sp*dt); } }
      g.x=Math.max(18,Math.min(REC.W-18,g.x));
      g.next-=dt; if(g.next<=0){ const r=rng(); const k=r<0.6?'crate':r<0.76?'cash':'ice'; const vy=k==='cash'?120+rng()*35:k==='ice'?95+rng()*40:68+rng()*40+g.el*1.2;
        g.obj.push({k,x:12+rng()*(REC.W-24),y:-14,vy,sw:rng()*6}); g.next=Math.max(0.28,0.62-g.el*0.011)*(0.7+rng()*0.6); }
      for(const o of g.obj){ o.y+=o.vy*dt; const half=o.k==='cash'?5:7;
        if(!o.gone&&o.y+half>=170&&o.y-half<=182&&Math.abs(o.x-g.x)<17+half){ o.gone=true;
          if(o.k==='ice'){ g.score=Math.max(0,g.score-2); g.stun=0.6; g.pop.push({x:o.x,y:160,t:0.8,s:'−2',c:'#e2574a'}); sfxNoise(0.2,1600,0.14,'bandpass'); }
          else { const p=o.k==='cash'?3:1; g.score+=p; g.pop.push({x:o.x,y:160,t:0.8,s:'+'+p,c:o.k==='cash'?'#9fd27a':'#dfe9ec'}); sfxTone(o.k==='cash'?880:560,0.06,0.06,'square'); } } }
      g.obj=g.obj.filter(o=>!o.gone&&o.y<REC.H+20); for(const p of g.pop){ p.t-=dt; p.y-=dt*30; } g.pop=g.pop.filter(p=>p.t>0); };
    g.draw=(c,t)=>{ const W=REC.W,H=REC.H; const gr=c.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#0b1215'); gr.addColorStop(1,'#1d2c33'); c.fillStyle=gr; c.fillRect(0,0,W,H);
      c.fillStyle='#c9d6db'; for(let i=0;i<30;i++){ const sx=(i*67+t*8*(1+i%3))%W, sy=(i*41+t*22*(1+i%2))%H; c.fillRect(sx,sy,1,1); }
      c.fillStyle='#dfe9ec'; c.fillRect(0,184,W,16);
      for(const o of g.obj){ const sway=Math.sin(t*3+o.sw)*2;
        if(o.k==='crate'){ c.strokeStyle='#9aa8ae'; c.beginPath(); c.moveTo(o.x-6+sway,o.y-16); c.lineTo(o.x-5,o.y-6); c.moveTo(o.x+6+sway,o.y-16); c.lineTo(o.x+5,o.y-6); c.stroke(); c.fillStyle='#e8e2d4'; c.beginPath(); c.ellipse(o.x+sway,o.y-17,10,5,0,Math.PI,0); c.fill(); c.fillStyle='#7a5a34'; c.fillRect(o.x-6,o.y-6,12,12); c.fillStyle='#5c4224'; c.fillRect(o.x-6,o.y-1,12,2); }
        else if(o.k==='cash'){ c.fillStyle='#9fd27a'; c.fillRect(o.x-6,o.y-3,12,7); c.fillStyle='#4f7a37'; c.fillRect(o.x-1,o.y-3,2,7); }
        else { c.fillStyle='#bfe3f2'; c.beginPath(); c.moveTo(o.x-7,o.y-5); c.lineTo(o.x+2,o.y-8); c.lineTo(o.x+8,o.y+1); c.lineTo(o.x+1,o.y+8); c.lineTo(o.x-8,o.y+3); c.fill(); c.fillStyle='#ffffff'; c.fillRect(o.x-3,o.y-4,3,2); } }
      const sx=g.x, fl=g.stun>0&&Math.floor(t*16)%2; c.fillStyle=fl?'#bfe3f2':'#ff6b1a'; c.fillRect(sx-17,172,34,9); c.fillStyle='#2a1a10'; c.fillRect(sx-19,181,40,3); c.fillStyle=fl?'#bfe3f2':'#c54f12'; c.fillRect(sx-12,166,18,6);
      for(const p of g.pop){ c.globalAlpha=Math.min(1,p.t*2); mgText(c,p.s,p.x,p.y,11,p.c); } c.globalAlpha=1; };
    return g;
  },
  freq(rng){
    const PAD=[{c:'#ff6b1a',f:330},{c:'#7cc9a4',f:415},{c:'#6fb3e0',f:494},{c:'#e8c55a',f:659}];
    const g={score:0,done:false,seq:[],ph:'show',i:0,t:0.8,lit:-1,litT:0,msg:'',msgT:0};
    const add=()=>{ g.seq.push(Math.floor(rng()*4)); g.ph='show'; g.i=0; g.t=0.7; };
    const flash=(k,d)=>{ g.lit=k; g.litT=d; sfxTone(PAD[k].f,Math.min(0.3,d),0.08,'triangle'); };
    const padAt=(x,y)=>{ for(let k=0;k<4;k++){ const px=34+k*66; if(x>=px&&x<=px+56&&y>=62&&y<=150) return k; } return -1; };
    add();
    g.step=(dt,inp)=>{ g.litT-=dt; if(g.litT<=0) g.lit=-1; g.msgT-=dt; g.t-=dt; const stepD=Math.max(0.24,0.52-g.seq.length*0.025);
      if(g.ph==='show'){ if(g.t<=0){ if(g.i<g.seq.length){ flash(g.seq[g.i],stepD*0.75); g.i++; g.t=stepD; } else { g.ph='input'; g.i=0; g.t=4; } } return; }
      if(g.ph==='input'){ let k=-1; for(const tp of inp.taps){ if(tp.key){ const m=/^(Digit|Numpad)([1-4])$/.exec(tp.key); if(m) k=+m[2]-1; } else if(tp.x!=null) k=padAt(tp.x,tp.y); if(k>=0) break; }
        if(k>=0){ flash(k,0.18); if(k===g.seq[g.i]){ g.i++; g.t=4; if(g.i>=g.seq.length){ g.score=g.seq.length; g.msg=`${g.score} tone${g.score>1?'s':''}`; g.msgC='ok'; g.msgT=0.8; g.ph='gap'; g.t=0.9; } }
          else { g.ph='fail'; g.msg='Wrong tone'; g.msgC='bad'; g.msgT=2; sfxTone(110,0.4,0.1,'sawtooth'); g.t=1.2; } }
        else if(g.t<=0){ g.ph='fail'; g.msg='Too slow'; g.msgC='bad'; g.msgT=2; sfxTone(110,0.4,0.1,'sawtooth'); g.t=1.2; } return; }
      if(g.ph==='gap'&&g.t<=0) add();
      if(g.ph==='fail'&&g.t<=0) g.done=true; };
    g.draw=(c,t)=>{ const W=REC.W,H=REC.H; c.fillStyle='#121c21'; c.fillRect(0,0,W,H); c.fillStyle='#18252b'; c.fillRect(20,50,W-40,112);
      for(let k=0;k<4;k++){ const px=34+k*66, on=g.lit===k; c.fillStyle=on?PAD[k].c:'#26363e'; c.fillRect(px,62,56,88); c.fillStyle=on?'#fff':PAD[k].c; c.fillRect(px+22,70,12,6); mgText(c,String(k+1),px+28,140,12,on?'#121c21':'#7f949b'); }
      mgText(c,g.ph==='show'?'Listen':g.ph==='input'?'Your turn':'',W/2,30,13,g.ph==='input'?'#ff6b1a':'#7f949b');
      for(let i=0;i<g.seq.length;i++){ c.fillStyle=i<(g.ph==='input'?g.i:g.ph==='show'?g.i:g.seq.length)?'#dfe9ec':'#26363e'; c.fillRect(W/2-g.seq.length*4+i*8,176,5,5); }
      if(g.msgT>0) mgText(c,g.msg,W/2,192,11,g.msgC); };
    return g;
  },
  draw(rng){
    const g={score:0,done:false,round:0,ph:'ready',t:0,ms:[],msg:'',flare:0};
    const start=()=>{ g.ph='ready'; g.t=1.3+rng()*2.4; g.react=0; };
    start();
    g.step=(dt,inp)=>{ g.t-=dt; g.flare=Math.max(0,g.flare-dt); const tap=inp.taps.length>0;
      if(g.ph==='ready'){ if(tap){ g.ms.push(null); g.ph='res'; g.t=1.1; g.msg='Too soon!'; g.msgC='bad'; sfxTone(150,0.25,0.08,'sawtooth'); return; }
        if(g.t<=0){ g.ph='go'; g.react=0; g.flare=1; sfxNoise(0.3,2400,0.14,'bandpass'); } return; }
      if(g.ph==='go'){ g.react+=dt; if(tap){ const ms=Math.round(g.react*1000); g.ms.push(ms); g.score+=Math.max(0,1000-ms); g.ph='res'; g.t=1.1; g.msg=`${ms} ms`; g.msgC=ms<300?'ok':''; sfxNoise(0.08,3000,0.2,'highpass'); return; }
        if(g.react>1.2){ g.ms.push(null); g.ph='res'; g.t=1.1; g.msg='Missed it'; g.msgC='bad'; } return; }
      if(g.ph==='res'&&g.t<=0){ g.round++; if(g.round>=5) g.done=true; else start(); } };
    g.draw=(c,t)=>{ const W=REC.W,H=REC.H; const go=g.ph==='go'; c.fillStyle=go?'#2a0f0a':'#0b1215'; c.fillRect(0,0,W,H);
      c.fillStyle='#dfe9ec'; c.fillRect(0,150,W,50); c.fillStyle='#26363e'; c.fillRect(40,118,6,32); c.fillRect(W-46,118,6,32); c.fillStyle='#7f949b'; c.fillRect(34,110,18,10); c.fillRect(W-52,110,18,10);
      if(go||g.flare>0){ const fy=40+(1-Math.min(1,g.react*3))*30; c.fillStyle='#ff6b1a'; c.beginPath(); c.arc(W/2,fy,go?7:4,0,7); c.fill(); c.globalAlpha=0.25; c.beginPath(); c.arc(W/2,fy,22,0,7); c.fill(); c.globalAlpha=1; }
      mgText(c,go?'FIRE!':g.ph==='ready'?'Wait for it…':g.msg,W/2,go?100:96,go?26:16,go?'#ff6b1a':g.ph==='res'?g.msgC:'#7f949b');
      for(let i=0;i<5;i++){ const v=g.ms[i]; c.fillStyle=v===undefined?'#26363e':v===null?'#e2574a':'#7cc9a4'; c.fillRect(W/2-44+i*18,176,12,6); } };
    return g;
  },
};
let MGFONT=null;
function mgText(c,s,x,y,size,col){ MGFONT=MGFONT||(getComputedStyle(document.documentElement).getPropertyValue('--mono').trim()||'monospace'); c.font=`700 ${size}px ${MGFONT}`; c.textAlign='center'; c.textBaseline='middle'; c.fillStyle=col==='ok'?'#7cc9a4':col==='bad'?'#e2574a':col==='dim'?'#7f949b':(col||'#dfe9ec'); c.fillText(s,x,y); }

/* ---------------- running a game ---------------- */
const MG={on:false};
function mgOpen(id,party){
  if(R) return; mgAbort(true); ensureAudio(); const G=MGMAP[id]; if(!G) return;
  const seed=party?party.seed:(Math.random()*2**31)|0;
  Object.assign(MG,{on:true,G,party:party||null,game:MGF[id](mgRng(seed)),t:-(party?party.wait:3),left:G.secs,last:performance.now(),inp:{x:null,taps:[],keys:{}},sent:-1,sendT:0,finished:false,result:null});
  let el=$('#mg'); if(!el){ el=document.createElement('div'); el.id='mg'; el.className='overlay'; document.body.appendChild(el); }
  el.hidden=false;
  el.innerHTML=`<div class="mgbox"><div class="mghead"><div><span class="lbl">${party?'Party round · '+party.players.length+' players':'Rec room'}</span><h2>${esc(G.name)}</h2></div><div class="mghud"><span><small class="lbl">Time</small><b id="mgTime">${G.secs}</b></span><span><small class="lbl">Score</small><b id="mgScore">0</b></span></div></div>
    <div class="mgmain"><div class="mgcv"><canvas id="mgCv" width="${REC.W}" height="${REC.H}"></canvas><div class="mgcount" id="mgCount"></div></div>${party?'<ol class="mgparty" id="mgParty"></ol>':''}</div>
    <p class="muted mghow">${esc(G.how)} <span class="lbl">${esc(G.keys)}</span></p>
    <div class="acts" id="mgActs"><button class="btn ghost" id="mgQuit">${party?'Leave (keeps your score so far)':'Quit'}</button></div></div>`;
  const cv=$('#mgCv'); const pos=e=>{ const r=cv.getBoundingClientRect(); return {x:(e.clientX-r.left)/r.width*REC.W, y:(e.clientY-r.top)/r.height*REC.H}; };
  cv.onpointermove=e=>{ MG.inp.x=pos(e).x; }; cv.onpointerdown=e=>{ e.preventDefault(); const p=pos(e); MG.inp.x=p.x; if(MG.t>=0) MG.inp.taps.push(p); try{ cv.setPointerCapture(e.pointerId); }catch(er){} };
  $('#mgQuit').onclick=()=>mgQuit(); mgPartyList(); requestAnimationFrame(mgLoop);
}
function mgLoop(now){ if(!MG.on) return; requestAnimationFrame(mgLoop); const dt=Math.min(0.05,(now-MG.last)/1000); MG.last=now; const cv=$('#mgCv'); if(!cv) return; const c=cv.getContext('2d');
  MG.t+=dt; const cd=$('#mgCount');
  if(MG.t<0){ cd.textContent=Math.ceil(-MG.t); cd.hidden=false; MG.inp.taps=[]; MG.game.draw(c,now/1000); return; }
  if(!cd.hidden){ cd.hidden=true; sfxTone(880,0.1,0.07,'square'); }
  if(!MG.finished){ MG.left=MG.G.secs-MG.t; MG.game.step(dt,MG.inp); MG.inp.taps=[];
    $('#mgTime').textContent=Math.max(0,Math.ceil(MG.left)); $('#mgScore').textContent=MG.game.score;
    if(MG.party){ MG.sendT-=dt; if(MG.sendT<=0&&MG.sent!==MG.game.score){ MG.sendT=0.4; MG.sent=MG.game.score; wsend({t:'mgscore',id:MG.party.id,score:MG.game.score}); MG.party.scores[NET.id]=MG.game.score; mgPartyList(); } }
    if(MG.left<=0||MG.game.done) mgFinish(); }
  MG.game.draw(c,now/1000); if(MG.finished){ c.fillStyle='rgba(11,18,21,.55)'; c.fillRect(0,0,REC.W,REC.H); mgText(c,MG.left<=0?'Time':MG.G.id==='freq'?'Signal lost':'Done',REC.W/2,REC.H/2,22,'#dfe9ec'); }
}
function mgFinish(){ if(MG.finished) return; MG.finished=true; const sc=MG.game.score; sfxTone(392,0.12,0.08,'square'); setTimeout(()=>sfxTone(523,0.18,0.08,'square'),120);
  if(MG.party){ MG.party.scores[NET.id]=sc; MG.party.final[NET.id]=true; wsend({t:'mgscore',id:MG.party.id,score:sc,final:true}); mgPartyList(); if(MG.party.rank) mgResults(); else $('#mgActs').innerHTML='<span class="muted">Waiting for the others to finish…</span>'; }
  else mgResults(); }
// pays out once the placing is known (straight away solo; when the server sends the final ranking in a party)
function mgResults(){ if(MG.result) return; const G=MG.G, sc=MG.game.score, st=recState(); let place=1, n=1;
  if(MG.party&&MG.party.rank){ n=MG.party.rank.length; place=1+MG.party.rank.filter(r=>r.id!==NET.id&&r.score>sc).length; } // ties share the placing
  const {pay,notes}=recPayout(G,sc,place,n); const best=(st.best[G.id]||0); const nb=sc>best;
  st.best[G.id]=Math.max(best,sc); st.plays++; if(n>1&&place===1) st.wins++; st.earned+=pay; S.cash+=pay; saveGame(); renderHeader(); MG.result={pay};
  const sl=$('#mgActs'); sl.innerHTML=`<div class="mgres"><p><b class="cash">+${fmt$(pay)}</b> · ${sc} ${esc(G.unit)}${nb?' · <span class="tag ok">new best</span>':''}${n>1?` · <b>${place===1?'1st':place===2?'2nd':place===3?'3rd':place+'th'}</b> of ${n}`:''}</p>${notes.length?`<p class="muted">${notes.map(esc).join(' · ')}</p>`:''}<p class="muted">Today: ${recToday()}</p></div>
    ${MG.party?'':`<button class="btn" id="mgAgain">Play again</button>`}<button class="btn ghost" id="mgClose">Close</button>`;
  if($('#mgAgain')) $('#mgAgain').onclick=()=>mgOpen(G.id); $('#mgClose').onclick=()=>mgAbort(); sfxExtracted&&sfxExtracted(); if(TAB==='rec'&&!R) renderTab(); }
function mgQuit(){ if(MG.party&&!MG.finished){ MG.finished=true; MG.party.final[NET.id]=true; wsend({t:'mgscore',id:MG.party.id,score:MG.game.score,final:true}); if(MG.party.rank) return mgResults(); $('#mgActs').innerHTML='<span class="muted">Waiting for the others to finish…</span>'; return; } mgAbort(); }
function mgAbort(silent){ if(!MG.on) return; if(MG.party&&!MG.finished) wsend({t:'mgscore',id:MG.party.id,score:MG.game.score,final:true}); MG.on=false; const el=$('#mg'); if(el){ el.hidden=true; el.innerHTML=''; } if(!silent&&TAB==='rec'&&!R) renderTab(); }
function mgPartyList(){ const el=$('#mgParty'); if(!el||!MG.party) return; const P2=MG.party; const rows=P2.players.map(p=>({...p,score:P2.scores[p.id]||0,fin:!!P2.final[p.id]})).sort((a,b)=>b.score-a.score);
  el.innerHTML=rows.map((r,i)=>`<li class="${r.id===NET.id?'me':''}"><span class="pl">${i+1}</span><span class="nm">${esc(r.name)}</span><b>${r.score}</b>${r.fin?'<small>done</small>':''}</li>`).join(''); }
// keyboard while a game is open
addEventListener('keydown',e=>{ if(!MG.on) return; const tg=e.target; if(tg&&(tg.tagName==='INPUT'||tg.tagName==='TEXTAREA')) return;
  if(e.code==='Escape'){ e.preventDefault(); if(MG.result||!MG.party) mgAbort(); return; }
  if(['Space','ArrowLeft','ArrowRight','KeyA','KeyD','Digit1','Digit2','Digit3','Digit4','Numpad1','Numpad2','Numpad3','Numpad4'].includes(e.code)){ e.preventDefault(); if(!e.repeat&&MG.t>=0&&!/Arrow|KeyA|KeyD/.test(e.code)) MG.inp.taps.push({key:e.code}); MG.inp.keys[e.code]=true; } },true);
addEventListener('keyup',e=>{ if(MG.on) MG.inp.keys[e.code]=false; });
// party messages from the server
function mgNet(m){
  if(m.t==='mgstart'){ if(R) return true; mgOpen(m.game,{id:m.id,seed:m.seed,wait:Math.max(1,(m.in||3000)/1000),players:m.players||[],scores:{},final:{},rank:null}); return true; }
  if(!MG.on||!MG.party||m.id!==MG.party.id) return true;
  if(m.t==='mgscore'){ MG.party.scores[m.pid]=m.score; if(m.final) MG.party.final[m.pid]=true; mgPartyList(); return true; }
  if(m.t==='mgend'){ MG.party.rank=m.rank||[]; for(const r of MG.party.rank){ MG.party.scores[r.id]=r.score; MG.party.final[r.id]=true; } mgPartyList(); if(MG.finished) mgResults(); else { mgFinish(); } return true; }
  return true;
}

/* ---------------- the tab ---------------- */
function renderRec(body){
  const st=recState(), sq=NET.squad, lead=sq&&sq.leader===NET.id, broke=isBroke();
  const others=sq?sq.members.filter(m=>m.id!==NET.id&&m.state!=='raid'&&m.state!=='gone').length:0;
  body.innerHTML=`<div class="colhead" style="margin-bottom:6px"><h2 class="h2">Rec room</h2><span class="lbl">Today ${recToday()}</span></div>
   <p class="muted" style="margin:0 0 12px;max-width:72ch">Short games in the station's rec room. Each one pays up to ${fmt$(REC.pay)} depending on your score. Past ${fmt$(REC.cap)} in a day they pay only 10%.</p>
   ${broke?`<p class="recbroke"><b>Scav bonus:</b> you're worth under ${fmt$(REC.broke)}, so every game pays double until you're back on your feet.</p>`:''}
   <div class="recparty">${sq?(lead?`<div><b>Party round</b><span class="muted"> · everyone in your squad who's at the hideout plays the same game at once${others?` (${others} ${others>1?'others':'other'} ready)`:', but nobody else is free right now'}. 1st place +50%, 2nd +20%.</span></div><div class="acts"><button class="btn sm" data-party="random" ${others?'':'disabled'}>Random game</button>${MG_GAMES.map(g=>`<button class="btn ghost sm" data-party="${g.id}" ${others?'':'disabled'}>${esc(g.name)}</button>`).join('')}</div>`
      :`<div><b>Party round</b><span class="muted"> · ${esc(squadLeaderName())} starts them. You'll be pulled in automatically when they do.</span></div>`)
      :`<div><b>Party rounds</b><span class="muted"> · ${NET.connected&&ACC.name?'form a squad on the Friends tab and the leader can start a game you all play at once, with a bonus for 1st and 2nd.':'sign in and form a squad with friends to play together.'}</span></div>`}</div>
   <div class="tasks recgames">${MG_GAMES.map(g=>`<article class="task rec-${g.id}"><h3>${esc(g.name)}</h3><p class="muted">${esc(g.how)}</p><div class="rw"><span class="lbl">${g.secs} s · ${esc(g.keys)}</span></div><div class="rw"><span class="lbl">Your best</span> ${st.best[g.id]!=null?`${st.best[g.id]} ${esc(g.unit)}`:'not played yet'}</div><div class="acts"><button class="btn sm" data-play="${g.id}">Play</button></div></article>`).join('')}</div>`;
  body.querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>mgOpen(b.dataset.play));
  body.querySelectorAll('[data-party]').forEach(b=>b.onclick=()=>{ const id=b.dataset.party==='random'?MG_GAMES[Math.floor(Math.random()*MG_GAMES.length)].id:b.dataset.party; wsend({t:'mgparty',game:id}); });
}
