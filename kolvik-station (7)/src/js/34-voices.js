/* 34-voices: people sound like people
   - Sounds placed in the world: louder when close, panned left or right by where they are relative to you, duller
     behind you and muffled through walls.
   - Footsteps for everyone you can see move (enemies and other players), one per foot as it lands (58-body.js
     counts them): snow crunch outside, hard taps on floors, louder running, nearly silent crouched; some kit rattle.
   - Voices: every enemy has its own voice (pitch and timbre) synthesized from vowel formants, so it sounds like
     speech you can't quite make out. They shout when they spot someone, call to their squad, mutter when they lose
     you, call a reload, grunt when hit and groan when they go down. Raiders and guards key a radio first. Calm ones
     cough, sniff and mutter on patrol.
   - You: a grunt when you're hit, a heartbeat when you're badly hurt, effort on hard landings (breathing is in
     61-player.js).
   - Locks: keys, picks, rattles and heavy doors (63-locks.js). */
const VOX={max:34, cool:3.5, global:0.9};
// a sound source in the world; returns the node to connect into, or null if it's too far to hear
function spatial(x,z,maxD,o={}){
  const a=MUS.ctx; if(!a||!P||!MUS.sfx) return null; const dx=x-P.pos.x, dz=z-P.pos.z, d=Math.hypot(dx,dz); if(d>maxD) return null;
  const rel=Math.atan2(-dx,-dz)-P.yaw, side=Math.sin(rel), front=Math.cos(rel);
  let occ=false; if(o.occl!==false&&d>2&&R&&R.ray){ try{ occ=!los(P.pos.x,P.y+P.eye,P.pos.z,x,(o.y||1.4)+(R.terrain?R.terrain(x,z):0),z); }catch(e){} }
  const g=a.createGain(); g.gain.value=Math.pow(Math.max(0,1-d/maxD),1.5)*(occ?0.55:1);
  const lp=a.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=occ?650:Math.max(900,(o.bright||7000)*(front<0?0.6:1)-d*70);
  g.connect(lp); let out=lp;
  if(a.createStereoPanner){ const pn=a.createStereoPanner(); pn.pan.value=clamp(-side*0.85,-1,1); out.connect(pn); out=pn; }
  out.connect(MUS.sfx); return g;
}
function nz(dest,t,dur,freq,vol,type='lowpass',q=1){ const a=MUS.ctx, s=a.createBufferSource(); s.buffer=MUS.noise; s.loop=dur>0.7; const f=a.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=q; const g=a.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+Math.min(0.01,dur*0.2)); g.gain.exponentialRampToValueAtTime(0.0006,t+dur); s.connect(f); f.connect(g); g.connect(dest); s.start(t,Math.random()*0.5); s.stop(t+dur+0.05); }
function tn(dest,t,freq,dur,vol,type='sine',slide){ const a=MUS.ctx, o=a.createOscillator(), g=a.createGain(); o.type=type; o.frequency.setValueAtTime(freq,t); if(slide) o.frequency.exponentialRampToValueAtTime(slide,t+dur); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0006,t+dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t+dur+0.03); }

/* ---- footsteps ---- */
function footAt(x,z,speed,crouch,indoor,heavy){
  const loud=crouch?0.25:speed>4?1.25:speed>2.2?0.9:0.6, dest=spatial(x,z,crouch?8:speed>2.6?32:18,{y:0.2,bright:indoor?6000:2600}); if(!dest) return;
  const t=MUS.ctx.currentTime, v=0.2*loud*(0.85+Math.random()*0.3)*(heavy?1.35:1), f=0.9+Math.random()*0.2;
  if(indoor){ nz(dest,t,0.06,1500*f,v); tn(dest,t,(heavy?70:95)*f,0.07,v*0.6); }
  else { nz(dest,t,0.13,650*f,v); nz(dest,t+0.03,0.12,320*f,v*0.7); }
  if(!crouch&&Math.random()<0.4) nz(dest,t+0.05,0.05,3200,v*0.25,'bandpass',4);   // kit rattling
}

/* ---- voices: babble built from vowels ---- */
const VOX_VOWELS=[[730,1090,2440],[570,840,2410],[300,870,2240],[530,1840,2480],[270,2290,3010],[660,1700,2400]];
const LINES={ // syllables, loudness, pitch contour (start→end multiplier), spacing
 spot:{n:[2,4],vol:1,rise:[1.15,0.95],gap:0.15,shout:true}, call:{n:[3,5],vol:0.9,rise:[1.1,0.9],gap:0.14,shout:true},
 lost:{n:[2,3],vol:0.5,rise:[1,0.85],gap:0.2}, reload:{n:[2,3],vol:0.75,rise:[1.05,1],gap:0.13,shout:true},
 idle:{n:[1,3],vol:0.35,rise:[1,0.9],gap:0.22}, radio:{n:[3,5],vol:0.45,rise:[1.02,0.95],gap:0.12,shout:true,radio:true}, hurt:{grunt:true,vol:0.9}, die:{groan:true,vol:1}, effort:{grunt:true,vol:0.5},
};
function voiceOf(e){ if(e.vox) return e.vox; const r=mulberry32(hashStr('vox'+(e.idx!=null?e.idx:e.name||'p')+(R?R.seed:0))); const boss=e.k&&e.k.boss, deep=e.k&&(e.k.boss||['chief','warden','foreman','relay','harbor'].includes(e.kind));
  return e.vox={f0:(boss?72:deep?92:100)+r()*(boss?10:34), fmt:0.9+r()*0.22, rough:r()*0.5, radio:e.k&&!!['raider','guard','vguard','mguard','huskarl'].includes(e.kind)}; }
function speak(x,z,vx,kind,yAt=1.6){
  const L=LINES[kind], a=MUS.ctx; if(!L||!a) return; const shout=L.shout, dest=spatial(x,z,shout?VOX.max+16:L.groan?28:VOX.max,{y:yAt,bright:5000}); if(!dest) return;
  const t0=a.currentTime+0.02, V=0.34*L.vol;
  if(L.grunt||L.groan){ const dur=L.groan?0.9:0.22, o=a.createOscillator(), g=a.createGain(); o.type='sawtooth'; o.frequency.setValueAtTime(vx.f0*(L.groan?1.1:1.35),t0); o.frequency.exponentialRampToValueAtTime(vx.f0*(L.groan?0.6:0.75),t0+dur);
    g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(V,t0+0.03); g.gain.setValueAtTime(V*0.8,t0+dur*0.6); g.gain.exponentialRampToValueAtTime(0.0006,t0+dur);
    const vw=VOX_VOWELS[L.groan?1:0]; for(const [i,fq] of vw.entries()){ const bp=a.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=fq*vx.fmt; bp.Q.value=7; const fg=a.createGain(); fg.gain.value=[1,0.55,0.18][i]; o.connect(bp); bp.connect(fg); fg.connect(g); }
    g.connect(dest); o.start(t0); o.stop(t0+dur+0.05); nz(dest,t0,dur*0.6,900,V*0.25); return; }
  const n=L.n[0]+Math.floor(Math.random()*(L.n[1]-L.n[0]+1)); let t=t0;
  const rad=(vx.radio&&shout)||L.radio;
  if(rad){ tn(dest,t,1700,0.04,V*0.35,'square'); nz(dest,t,0.12,2600,V*0.25,'bandpass',2); t+=0.12; }
  for(let i=0;i<n;i++){
    const dur=(shout?0.13:0.16)+Math.random()*0.1, vw=VOX_VOWELS[Math.floor(Math.random()*VOX_VOWELS.length)], p=(L.rise[0]+(L.rise[1]-L.rise[0])*i/Math.max(1,n-1))*(shout?1.25:1)*(0.95+Math.random()*0.1);
    // a consonant first, sometimes
    const c=Math.random(); if(c<0.3) nz(dest,t,0.05,4200,V*0.4,'bandpass',3); else if(c<0.55){ nz(dest,t,0.015,2500,V*0.6,'bandpass',1); } else if(c<0.7) tn(dest,t,vx.f0*p*0.8,0.04,V*0.3,'sine');
    t+=c<0.3?0.04:0.015;
    const o=a.createOscillator(), g=a.createGain(); o.type='sawtooth'; o.frequency.setValueAtTime(vx.f0*p,t); o.frequency.linearRampToValueAtTime(vx.f0*p*(shout?0.92:0.97),t+dur);
    const vib=a.createOscillator(), vg=a.createGain(); vib.frequency.value=5+Math.random()*2; vg.gain.value=vx.f0*0.02; vib.connect(vg); vg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(V*(shout?1:0.7),t+0.025); g.gain.setValueAtTime(V*(shout?0.9:0.6),t+dur*0.7); g.gain.exponentialRampToValueAtTime(0.0006,t+dur);
    for(const [k,fq] of vw.entries()){ const bp=a.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=fq*vx.fmt*(shout?1.08:1); bp.Q.value=6+k*2; const fg=a.createGain(); fg.gain.value=[1,0.6,shout?0.3:0.15][k]; o.connect(bp); bp.connect(fg); fg.connect(g); }
    if(vx.rough>0.2) nz(g,t,dur,1200,vx.rough*0.15);
    g.connect(dest); o.start(t); o.stop(t+dur+0.05); vib.start(t); vib.stop(t+dur+0.05);
    t+=dur+L.gap*(0.6+Math.random()*0.8)*(i===Math.floor(n/2)&&n>3?2:1);
  }
  if(rad){ nz(dest,t,0.08,2600,V*0.2,'bandpass',2); tn(dest,t+0.06,1300,0.03,V*0.25,'square'); }
}
// calm noises: a cough, a sniff, a sigh
function idleNoise(x,z,vx){ const dest=spatial(x,z,20,{y:1.6}); if(!dest) return; const t=MUS.ctx.currentTime, r=Math.random();
  if(r<0.35){ nz(dest,t,0.12,900,0.18); nz(dest,t+0.18,0.1,800,0.14); tn(dest,t,vx.f0*1.4,0.1,0.06,'sawtooth',vx.f0); }
  else if(r<0.6){ nz(dest,t,0.18,3500,0.06,'bandpass',2); nz(dest,t+0.25,0.14,3800,0.05,'bandpass',2); }
  else speak(x,z,vx,'idle'); }

/* ---- watching everyone for things worth a sound ---- */
function charSoundsTick(dt){
  if(!MUS.ctx||!P) return; const now=R.t; const host=!NET.on||NET.host;
  for(const e of R.enemies){ const rig=e.rig; const d2=(e.pos.x-P.pos.x)**2+(e.pos.z-P.pos.z)**2; const st=e._snd||(e._snd={steps:rig?rig.s.steps||0:0,alert:false,sees:false,rl:false,hp:e.hp+e.headHp,dead:e.dead,vT:0,idleT:8+Math.random()*25});
    if(e.dead){ if(!st.dead){ st.dead=true; if(d2<60*60) speak(e.pos.x,e.pos.z,voiceOf(e),'die',0.8); } continue; }
    if(d2>70*70){ if(rig) st.steps=rig.s.steps||0; continue; }
    // footsteps
    if(rig&&(rig.s.steps||0)!==st.steps){ st.steps=rig.s.steps||0; footAt(e.pos.x,e.pos.z,rig.s.v,rig.s.crouch>0.5,!!bldAt(e.pos.x,e.pos.z),e.k.boss); }
    // what it is doing now, from the AI (host) or from what the host sent us
    const b=e.np?e.np.b:0, alert=host?e.state==='combat':!!(b&4), sees=host?!!e.sees:!!(b&8), rl=host?e.reloadT>0:!!(b&2), hp=e.hp+e.headHp;
    const vx=voiceOf(e), can=now>st.vT&&now>(R.voiceT||0);
    const say=(k,cool=VOX.cool)=>{ if(!can) return; st.vT=now+cool; R.voiceT=now+VOX.global; speak(e.pos.x,e.pos.z,vx,k); };
    if(hp<st.hp-0.5){ if(now>(st.hurtT||0)){ st.hurtT=now+0.6; speak(e.pos.x,e.pos.z,vx,'hurt'); } }
    else if(sees&&!st.sees) say(Math.random()<0.5?'spot':'call');
    else if(alert&&!st.alert) say('call');
    else if(rl&&!st.rl){ if(Math.random()<0.6) say('reload',2); const dest=spatial(e.pos.x,e.pos.z,22,{y:1.3}); if(dest){ const t=MUS.ctx.currentTime; tn(dest,t+0.3,900,0.04,0.12,'square'); tn(dest,t+1.1,650,0.05,0.14,'square'); } }
    else if(st.sees&&!sees&&alert&&Math.random()<0.4) say('lost',5);
    if(!alert){ st.idleT-=dt; if(st.idleT<=0){ st.idleT=18+Math.random()*30; if(d2<22*22) idleNoise(e.pos.x,e.pos.z,vx); } }
    st.alert=alert; st.sees=sees; st.rl=rl; st.hp=hp;
  }
  // other players: their footsteps, and a grunt when they're hit
  for(const id in NET.players){ const p=NET.players[id]; if(!p.rig||!p.st||!p.g||!p.g.visible) continue; const s=p._snd||(p._snd={steps:p.rig.s.steps||0,hp:p.st.hp});
    if((p.rig.s.steps||0)!==s.steps){ s.steps=p.rig.s.steps||0; footAt(p.g.position.x,p.g.position.z,p.rig.s.v,!!p.st.crouch||!!p.st.sneak,!!bldAt(p.g.position.x,p.g.position.z)); }
    if(p.st.hp!=null&&p.st.hp<s.hp-1) speak(p.g.position.x,p.g.position.z,voiceOf(p),'hurt'); s.hp=p.st.hp; }
  // you
  const hp=totalHP(); if(R.myHp!=null&&hp<R.myHp-1&&!P.dead&&now>(R.myHurtT||0)){ R.myHurtT=now+0.5; myGrunt(); } R.myHp=hp;
  if(!P.dead&&hp<154){ R.beatT=(R.beatT||0)-dt; if(R.beatT<=0){ const k=1-hp/154; R.beatT=1.05-0.35*k; sfxHeart(0.12+0.18*k); } }
}
function myGrunt(){ const a=MUS.ctx; if(!a) return; const t=a.currentTime, f=118; const o=a.createOscillator(), g=a.createGain(); o.type='sawtooth'; o.frequency.setValueAtTime(f*1.4,t); o.frequency.exponentialRampToValueAtTime(f*0.8,t+0.2);
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.16,t+0.02); g.gain.exponentialRampToValueAtTime(0.0006,t+0.24);
  for(const [i,fq] of [700,1150,2500].entries()){ const bp=a.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=fq; bp.Q.value=7; const fg=a.createGain(); fg.gain.value=[1,0.5,0.15][i]; o.connect(bp); bp.connect(fg); fg.connect(g); }
  g.connect(MUS.sfx); o.start(t); o.stop(t+0.3); }
function sfxHeart(v){ const a=MUS.ctx; if(!a) return; const t=a.currentTime; tn(MUS.sfx,t,58,0.12,v,'sine',40); tn(MUS.sfx,t+0.2,52,0.1,v*0.7,'sine',38); }

/* ---- locks and doors ---- */
const sfxKey=()=>{ const a=MUS.ctx; if(!a) return; const t=a.currentTime; nz(MUS.sfx,t,0.05,4000,0.08,'bandpass',4); tn(MUS.sfx,t+0.35,1400,0.03,0.08,'square'); tn(MUS.sfx,t+0.9,500,0.08,0.14,'square',300); nz(MUS.sfx,t+0.9,0.08,1200,0.12); };
const sfxRattle=()=>{ const a=MUS.ctx; if(!a) return; const t=a.currentTime; for(let i=0;i<3;i++){ nz(MUS.sfx,t+i*0.09,0.06,900,0.12); tn(MUS.sfx,t+i*0.09,180,0.05,0.08,'square',120); } };
const sfxPick=()=>{ const a=MUS.ctx; if(!a) return; const t=a.currentTime; for(let i=0;i<5;i++) nz(MUS.sfx,t+i*0.11+Math.random()*0.05,0.03,5200,0.06,'bandpass',6); };
const sfxSnap=()=>{ const a=MUS.ctx; if(!a) return; const t=a.currentTime; nz(MUS.sfx,t,0.04,6000,0.18,'highpass'); tn(MUS.sfx,t,2600,0.05,0.08,'triangle',1800); };
function sfxDoor(dist=0){ const a=MUS.ctx; if(!a) return; const v=Math.max(0.05,1-dist/40); const t=a.currentTime; tn(MUS.sfx,t,70,0.6,0.22*v,'sawtooth',48); nz(MUS.sfx,t,0.7,400,0.16*v); tn(MUS.sfx,t+0.05,330,0.5,0.05*v,'triangle',260); }
