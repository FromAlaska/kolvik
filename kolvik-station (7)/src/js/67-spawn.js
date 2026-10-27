/* 67-spawn: a fair start
   - 30 seconds of insertion cover on every map (nobody sees or hears you, and drones ignore you) unless you fire.
   - For 25 seconds after that, enemies spot you at only half their usual range, growing back to normal.
   - At the start of a raid no enemy patrols within 60 m of any insertion point.
   - Low concrete barriers and snowbanks at every insertion point, either side of the way in, so there's
     something to duck behind. Placed the same way for everyone in an online raid (no randomness). */
const SPAWN={grace:30, fade:25, clear:60};
// 0 right after your cover ends, rising to 1: how far enemies can spot you (half range at first)
const freshness=()=>!P||P.grace>0?0:clamp((R.t-(P.graceEnd??-99))/SPAWN.fade,0,1);
function spawnCover(sps){
  if(!sps||!sps.length||R.airMap||R.race||R.map==='vault'||R.noCover) return;
  const wall=M('concrete');
  for(const sp of sps){
    // face into the map: the spawn's heading if it has one, else toward the middle
    const h=sp.h!=null?sp.h:Math.atan2(sp.x,sp.z); const fx=-Math.sin(h), fz=-Math.cos(h), rx=Math.cos(h), rz=-Math.sin(h);
    for(const side of [-1,1]){ const x=sp.x+fx*4+rx*side*3.6, z=sp.z+fz*4+rz*side*3.6, alongX=Math.abs(rx)>Math.abs(rz);
      const w=alongX?3.2:0.55, d=alongX?0.55:3.2; if(!spawnFree(x,z,w,d)) continue;
      const keep=R.yOff||0; R.yOff=R.terrain?R.terrain(x,z):keep; R.targets.push(solid(x,0.6,z,w,1.2,d,wall,{ts:1.5})); R.yOff=keep;
      drift(x-fx*0.9,z-fz*0.9,1.1); }
  }
}
function spawnFree(x,z,w,d){ const x0=x-w/2-0.4, x1=x+w/2+0.4, z0=z-d/2-0.4, z1=z+d/2+0.4; if(Math.max(Math.abs(x),Math.abs(z))>R.bound-3) return false;
  if(R.terrain){ const y=R.terrain(x,z); for(const [px,pz] of [[x0,z0],[x1,z0],[x0,z1],[x1,z1]]) if(Math.abs(R.terrain(px,pz)-y)>0.6) return false; }
  for(const b of R.cols) if(b.x1>x0&&b.x0<x1&&b.z1>z0&&b.z0<z1) return false;
  for(const b of R.bld) if(b.x1+0.6>x0&&b.x0-0.6<x1&&b.z1+0.6>z0&&b.z0-0.6<z1) return false;
  for(const e of R.extracts) if(Math.hypot(e.x-x,e.z-z)<(e.r||4)+2) return false;
  return true; }
// nobody patrols near an insertion point when the raid starts: they're moved out to their own areas
function clearSpawns(sps){ if(R.map==='vault') return; for(const e of R.enemies){ for(const sp of sps){ const d=Math.hypot(e.pos.x-sp.x,e.pos.z-sp.z); if(d>=SPAWN.clear) continue;
  const ang=Math.atan2(e.pos.z-sp.z,e.pos.x-sp.x); const nx=clamp(sp.x+Math.cos(ang)*(SPAWN.clear+6),-R.bound+2,R.bound-2), nz=clamp(sp.z+Math.sin(ang)*(SPAWN.clear+6),-R.bound+2,R.bound-2);
  e.pos.set(nx,R.terrain?R.terrain(nx,nz):0,nz); resolve(e.pos,0.4); e.home={x:e.pos.x,z:e.pos.z}; e.nx=e.pos.x; e.nz=e.pos.z; e.wp=null; } } }
