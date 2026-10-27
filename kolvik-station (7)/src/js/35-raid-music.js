/* 35-raid-music: a quiet score under the raid
   Not a tune to follow: a low pad that changes chord every ten seconds or so, a distant celesta or harp note now and
   then, all well under the wind. It listens to the raid:
   - calm: just the pad and the odd note;
   - someone is hunting you (an enemy alert nearby): a slow heartbeat drum and a cello drone come in;
   - a fight (you're seen, shot at, or shooting): a soft cello ostinato and frame drum push it along.
   It ducks under your own gunfire and fades back to calm a while after things go quiet. Each map has its own key.
   Settings → Music in raids: Off, Quiet (the default) or Normal; the music volume slider scales it too. */
const RAIDKEY={kaldfjord:[47,'dorian'],kolvik:[50,'dorian'],whiteout:[52,'minor'],skarsvik:[45,'minor'],ironfjord:[48,'minor'],vault:[46,'phrygian'],ravnskar:[43,'minor'],storvidda:[54,'minor'],skerries:[50,'minor'],hrimfell:[52,'dorian']};
const MODES={minor:[0,2,3,5,7,8,10],dorian:[0,2,3,5,7,9,10],phrygian:[0,1,3,5,7,8,10]};
// chord roots as scale degrees, two bars each: i – VI – iv – v (and a second half that leans on VII)
const RM_PROG=[[0,5,3,4],[0,6,5,4]];
const RM={on:false,timer:0,next:0,beat:0,int:0,beatLen:0.6,level:{off:0,quiet:0.17,normal:0.32}};
function rmScale(deg,oct=0){ const [root,mode]=RAIDKEY[R&&R.map]||[50,'minor'], sc=MODES[mode]; const d=((deg%7)+7)%7, o=Math.floor(deg/7); return root+sc[d]+12*(o+oct); }
function rmLevel(){ return (RM.level[OPTS.raidMusic||'quiet']||0)*(OPTS.musicVol!=null?OPTS.musicVol:0.8); }
function raidMusicStart(){
  const a=ensureAudio(); if(!a||RM.on||rmLevel()<=0) return; if(MUS.on) musicStop(0.4);
  RM.on=true; RM.beat=0; RM.int=0; RM.next=a.currentTime+0.3;
  MUS.master.gain.cancelScheduledValues(a.currentTime); MUS.master.gain.setValueAtTime(0,a.currentTime); MUS.master.gain.linearRampToValueAtTime(rmLevel(),a.currentTime+6);
  RM.timer=setInterval(rmSchedule,200);
}
function raidMusicStop(fade=0.6){
  if(!RM.on||!MUS.ctx) return; RM.on=false; clearInterval(RM.timer); const a=MUS.ctx;
  MUS.master.gain.cancelScheduledValues(a.currentTime); MUS.master.gain.setValueAtTime(MUS.master.gain.value,a.currentTime); MUS.master.gain.linearRampToValueAtTime(0,a.currentTime+fade);
  const old=MUS.master; setTimeout(()=>{ try{ old.disconnect(); }catch(e){} },fade*1000+50);
  MUS.master=a.createGain(); MUS.master.gain.value=0; MUS.master.connect(MUS.out); rebuildSends();
}
// how tense things are, 0 to 1, from what's going on around you
function raidMusicTick(dt){
  if(!RM.on){ if(R&&!R.paused&&rmLevel()>0&&MUS.ctx&&!R.over) raidMusicStart(); return; }
  if(rmLevel()<=0){ raidMusicStop(1); return; }
  if(P.kick>0.6) R.shotT=R.t;
  let target=0; const host=!NET.on||NET.host;
  for(const e of R.enemies){ if(e.dead) continue; const d=Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z); if(d>90) continue;
    const alert=host?e.state==='combat':!!(e.np&&e.np.b&4), sees=host?(e.sees&&e.tgtId==='me'):!!(e.np&&e.np.b&8)&&d<60;
    if(sees){ target=1; break; } if(alert) target=Math.max(target,0.5); }
  if(R.t-(R.shotT||-99)<5||R.t-(R.lastHitT||-99)<6||(P.hurt||0)>0.3) target=1;
  if(R.boss&&R.boss.awake&&!R.bossDown) target=Math.max(target,0.8);
  RM.int+=(target-RM.int)*Math.min(1,dt*(target>RM.int?1.5:0.06));
  // duck under your own gunfire; a touch louder when it matters
  const a=MUS.ctx, duck=R.t-(R.shotT||-99)<0.5?0.55:1, lv=rmLevel()*(0.85+0.35*RM.int)*duck*(R.paused?0.6:1);
  if(Math.abs(MUS.master.gain.value-lv)>0.004&&a.currentTime>(RM.rampT||0)){ MUS.master.gain.setTargetAtTime(lv,a.currentTime,0.4); RM.rampT=a.currentTime+0.25; }
}
function rmSchedule(){
  const a=MUS.ctx; if(!a||!RM.on||!R) return; const B=RM.beatLen;
  while(RM.next<a.currentTime+1.5){ rmBeat(RM.beat,RM.next,B); RM.beat++; RM.next+=B; }
}
function rmBeat(i,t,B){
  const I=RM.int, bar=Math.floor(i/8), inBar=i%8, prog=RM_PROG[Math.floor(bar/8)%2], deg=prog[Math.floor(bar/2)%4];
  const root=rmScale(deg,-1), third=rmScale(deg+2,0), fifth=rmScale(deg+4,0);
  // the pad: a new chord every two bars, low and filtered
  if(inBar===0&&bar%2===0){ const dur=B*16+1; strings(t,root,dur,0.05); strings(t+0.3,third,dur,0.032); strings(t+0.6,fifth,dur,0.03); if(I>0.3) cello(t,root-12,dur-1,0.03+0.03*I,{att:1.5,rel:2}); }
  // now and then a far-off note from the scale, more often when it's calm
  if(Math.random()<(I<0.4?0.09:0.04)){ const m=rmScale([0,2,4,7,9][Math.floor(Math.random()*5)],1+(Math.random()<0.3?1:0)); if(Math.random()<0.55) celesta(t,m,0.035,{pan:(Math.random()-0.5)*0.8,dec:4}); else harp(t,m,0.05,(Math.random()-0.5)*0.8); }
  // hunted: a slow heartbeat
  if(I>0.35&&(inBar===0||inBar===1)) drum(t,(0.06+0.08*I)*(inBar?0.6:1),46);
  // fighting: a quiet ostinato on root and fifth, frame drum on one and five
  if(I>0.7){ const pat=[0,0,7,0,12,0,7,3], m=root+12+pat[inBar]; spicc(t,m,0.025+0.02*(I-0.7)*3); spicc(t+B/2,m,0.018); if(inBar===0||inBar===4) frameDrum(t,0.07,50); if(inBar===0&&bar%2===0) timpRoll(t,root-12,B*2,0.02,0.09); }
}
