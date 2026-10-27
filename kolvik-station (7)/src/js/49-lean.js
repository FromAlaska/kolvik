/* 49-lean: leaning, and hearing other players' gunfire
   Hold Q to lean left and E to lean right (E still opens, searches and uses things when there is something to use).
   The view slides about 38 cm sideways and tilts; it stops short of walls. Other players see your upper body lean, and
   your head is where you're peeking from as far as enemies are concerned. Can't lean while sprinting, riding, flying or
   down.
   Gunfire: every shot you fire is sent to everyone in the raid (pshot). They hear it with distance (a sharp crack up
   close, a dull thump far off, audible to about 600 m, arriving late at the speed of sound) and see the tracer and
   muzzle flash when they're near enough. Bows are almost silent. */
const LEAN={off:0.38, roll:0.16, rate:7, drop:0.05};
function leanTick(dt){
  const k=P.keys, busy=P.dead||P.down||R.invOpen||R.ride||R.fly||(R.pd&&R.pd.ctl)||(R.gps&&R.gps.open);
  let want=0; if(!busy){ if(k.KeyQ) want-=1; if(k.KeyE&&!R.near&&!R.nearDoor&&R.nearTree==null) want+=1; }
  if(want) P.sprint=false;
  P.lean=(P.lean||0)+clamp(want-(P.lean||0),-LEAN.rate*dt,LEAN.rate*dt);
  // stop short of walls: walk the offset out in 8 cm steps and stop at the first box at head height
  let off=LEAN.off*P.lean; const s=Math.sign(off), rx=Math.cos(P.yaw), rz=-Math.sin(P.yaw), ey=P.y+P.eye;
  if(Math.abs(off)>0.01){ let ok=0; for(let d=0.08;d<=Math.abs(off)+0.12;d+=0.08){ const x=P.pos.x+rx*d*s, z=P.pos.z+rz*d*s; let hit=false;
      for(const b of colsNear(x,z)){ if(b.terrain) continue; if(x>b.x0&&x<b.x1&&z>b.z0&&z<b.z1&&ey>b.y0-0.1&&ey<b.y1+0.1){ hit=true; break; } } if(hit) break; ok=d; }
    off=s*Math.max(0,Math.min(Math.abs(off),ok-0.12)); }
  P.leanX=off;
}
const leanRoll=()=>-LEAN.roll*(P.lean||0);

/* ---- other players' shots ---- */
function sendShot(w,end,quiet,r){ if(!NET.on) return; const m={t:'pshot',w:w.id,r:r||0,x:+P.pos.x.toFixed(1),y:+(P.y+P.eye-0.15).toFixed(1),z:+P.pos.z.toFixed(1),q:quiet};
  if(end){ m.ex=+end.x.toFixed(1); m.ey=+end.y.toFixed(1); m.ez=+end.z.toFixed(1); } nsend(m); }
// sound travels: a shot 300 m away arrives almost a second later
function sfxShotAt(id,dist,noise){ if(dist<60) return sfxShot(id,dist,noise); setTimeout(()=>{ if(R) sfxShot(id,dist,noise); },dist/340*1000); }
function remoteShot(m){ if(!R||!P) return; const d=Math.hypot(m.x-P.pos.x,m.z-P.pos.z);
  if(m.q===2){ if(d<30) sfxBowAt(d); }
  else { sfxShotAt(m.w,d,m.q?0.5:1); if(d<160&&m.ex!=null) tracer(m.x,m.y,m.z,m.ex,m.ey,m.ez,0xffcf7a); if(d<140&&!m.q){ flashAt(m.x,m.y,m.z); muzzleSpark(m.x,m.y,m.z,d); } }
  if(NET.host&&m.r) hearShot(m.x,m.z,m.r); }
function sfxBowAt(d){ const v=Math.max(0,1-d/30); if(v<=0) return; sfxTone(180,0.08,0.06*v,'triangle',90); sfxNoise(0.05,2500,0.05*v,'bandpass'); }
