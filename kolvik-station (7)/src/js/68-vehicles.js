/* 68-vehicles: running people over
   A snowmobile at speed knocks down whoever it hits: an enemy, or another player who isn't on your side (online).
   Damage rises steeply with speed: a nudge at walking pace does nothing, about 45 at 5 m/s, a kill at full speed.
   The sled loses some speed in the hit and anyone who survives is thrown aside. */
const RUNOVER={min:3.5, r:1.6, k:9, pow:1.6};
const runDmg=spd=>Math.round(Math.pow(Math.max(0,spd-2),RUNOVER.pow)*RUNOVER.k);
function sledRunOver(sl,spd){
  if(spd<RUNOVER.min||!R.ride||R.ride.mode!=='drive') return; const c=Math.cos(sl.h), s=Math.sin(sl.h);
  for(const e of R.enemies){ if(e.dead||R.t<(e.sledT||0)) continue; const dx=e.pos.x-sl.x, dz=e.pos.z-sl.z; if(dx*dx+dz*dz>RUNOVER.r*RUNOVER.r||Math.abs(e.pos.y-sl.y)>1.6) continue;
    e.sledT=R.t+0.8; const dmg=runDmg(spd); e.lastW='sled';
    hitEnemy(e,'thorax',{dmg,pen:99,id:'sled'},{x:e.pos.x,y:e.pos.y+1,z:e.pos.z});
    if(e.dead){ goalBump('roadkill'); msg(`Ran down ${e.k.name}`); } else { const side=(dx*c-dz*s)>=0?1:-1; moveCol(e.pos,c*side*1.4,-s*side*1.4,0.35); }
    sfxThud(spd); sl.u*=0.82; P.shake=0.35; }
  if(NET.on) for(const id in NET.players){ const q=NET.players[id], st=q.st; if(!st||st.dead||st.rd||isMate(id)) continue; const gp=q.g?q.g.position:st; const dx=gp.x-sl.x, dz=gp.z-sl.z;
    if(dx*dx+dz*dz>RUNOVER.r*RUNOVER.r||Math.abs((st.y||0)-sl.y)>1.6||R.t<(q.sledT||0)) continue; q.sledT=R.t+0.8; nsend({t:'runover',pid:id,dmg:runDmg(spd)}); sfxThud(spd); sl.u*=0.85; P.shake=0.35; }
}
// someone ran you down
function runOverMe(dmg,from){ if(!P||P.dead) return; R.lastHitBy=from; R.lastHitT=R.t; const who=from&&NET.players[from]?NET.players[from].name+"'s snowmobile":'a snowmobile';
  playerHit(dmg*0.45,99,who,'lleg'); playerHit(dmg*0.25,99,who,'rleg'); playerHit(dmg*0.3,99,who,'thorax'); P.vx+=(Math.random()-0.5)*6; P.vz+=(Math.random()-0.5)*6; }
function sfxThud(spd){ sfxTone(70,0.25,0.35,'sine',38); sfxNoise(0.2,600,0.3); if(spd>7) setTimeout(()=>sfxNoise(0.15,1800,0.15,'bandpass'),60); }
