/* 57-ai: how enemies think. Runs only where the AI runs (solo, or the online AI host).

   1. BELIEF: sensor fusion with a particle filter. For every player the enemies know about there is one shared
      "radio picture": AI.N particles, each a guess at where that player is and how they are moving.
      - predict: every guess keeps moving the way it was going, with random turns and stops, and only through
        walkable ground (the nav grid), so the cloud flows down corridors and around buildings
      - sight: a strong clue; guesses far from what was seen die out, and the survivors take on the velocity the
        tracker measured, so the cloud keeps running the way you were running when you broke line of sight
      - footsteps and gunfire: weaker clues, noisier with distance
      - being shot: a bearing only (where it came from, not how far)
      - looking and not seeing: guesses inside an alert enemy's view lose most of their weight, so the cloud empties
        out of every place they have checked
      Resampling keeps the cloud on the plausible guesses. The densest 4 m patch is the best estimate, and the next
      few dense patches are places worth searching.
   2. TRACKING: an alpha-beta filter (a light Kalman filter) on sightings gives position and velocity, for aiming
      where you will come back out and seeding the cloud's motion.
   3. TACTICS: each enemy scores its options (engage, cover, suppress, hold the angle, flank, search, retreat) and
      takes the best. Flanking routes use A* with an exposure cost (cells the threat can see are expensive); cover is
      a breadth-first search for a cell the threat can't see, next to one it can (a corner to peek from).
   4. ADAPTATION: a genetic algorithm. Each enemy carries a genome (aggression, flanking, patience, caution,
      suppression, search focus, peeking, comms). After a raid every genome that fought is scored on how it did
      against you, and the population breeds: elites kept, tournament selection, blend crossover, mutation. It is
      saved in this browser (the AI host's), so the enemies keep adapting to how you play. Accuracy and reaction time
      are never evolved, only behaviour.

   5. WHO KNOWS WHAT: enemies are in groups (whoever spawned together). A group shares one picture; other groups only
      know what reaches them: a shout carries about 18 m, and raiders, guards and the like carry radios. A radio
      report arrives a couple of seconds late and only says roughly where (±8 m), and the group that hears it sends at
      most one or two people to check while the rest just get wary (they look that way and notice you sooner). Across
      the whole map only a few are ever sent at once, so a sighting doesn't pull every enemy onto you. A radio jammer
      in your gear cuts reports (and drone links) within 40 m of you.
   6. BODIES: an enemy that comes across a dead comrade stops, calls it in, goes to the body, crouches by it and looks
      around, then searches the places a shooter could have fired from.

   Fairness: enemies still only shoot what they actually see. Suppressive fire at a predicted spot is real fire:
   it only hurts if you are actually standing in the line of it. */
const AI={
  N:160,                  // particles per tracked player
  run:5.8,                // fastest a guess may move (sprint speed)
  tick:0.25,              // belief update period, seconds
  forget:40,              // seconds without any clue before the enemies give up
  negEvery:0.45,          // how often each alert enemy rules out what it can see
};
const GENES=['aggr','flank','patience','caution','suppress','focus','peek','comms'];
const _gauss=()=>{ let u=0,v=0; while(!u) u=Math.random(); while(!v) v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(6.2832*v); };

/* ---------------- belief ---------------- */
function aiState(){ return R.ai||(R.ai={bel:{},tick:0,reports:[],groups:[],radioT:{}}); }
// beliefs are per target and per group: key 'target|group'
const bk=(tid,g)=>tid+'|'+(g||0);
const eBel=(e,make=false)=>e.tid?aiBel(bk(e.tid,e.grp),make):null;
function aiBel(tid,make=true){ const A=aiState(); let b=A.bel[tid]; if(!b&&make){ const N=AI.N, F=()=>new Float32Array(N);
  b=A.bel[tid]={tid:String(tid).split('|')[0],key:tid,grp:+String(tid).split('|')[1]||0,x:F(),z:F(),vx:F(),vz:F(),w:F(),x2:F(),z2:F(),vx2:F(),vz2:F(),mv:new Uint8Array(N),mv2:new Uint8Array(N),init:false,lastClue:-1e9,lastSeen:-1e9,est:null,spread:99,conf:0,spots:[],track:null,vis:null,visT:-9,visX:0,visZ:0}; } return b; }
function aiWalk(x,z){ if(!R.nav) return Math.abs(x)<R.bound&&Math.abs(z)<R.bound; return navFree(navCell(x,z)); }
function aiSeed(b,x,z,sig,moving){
  const T=b.track, fresh=T&&R.t-T.t<1;
  for(let i=0;i<AI.N;i++){ let px=x+_gauss()*sig, pz=z+_gauss()*sig; if(!aiWalk(px,pz)){ px=x; pz=z; } b.x[i]=px; b.z[i]=pz;
    aiSetMotion(b,i,fresh?T:null,moving); b.w[i]=1/AI.N; }
  b.init=true; aiEstimate(b);
}
// alpha-beta tracker on sightings
function aiTrack(b,x,z){ const t=R.t, T=b.track; if(!T||t-T.t>2.5){ b.track={x,z,vx:0,vz:0,t}; return; } const dt=t-T.t; if(dt<0.04) return;
  const px=T.x+T.vx*dt, pz=T.z+T.vz*dt, rx=x-px, rz=z-pz; T.x=px+0.65*rx; T.z=pz+0.65*rz; T.vx+=0.4*rx/dt; T.vz+=0.4*rz/dt;
  const s=Math.hypot(T.vx,T.vz); if(s>AI.run){ T.vx*=AI.run/s; T.vz*=AI.run/s; } T.t=t; }
// where the tracker says they are now (it coasts on the last velocity for a little while, then stops guessing)
function aiTrackAt(b,ahead=0){ const T=b.track; if(!T) return null; const dt=Math.min(1.6,R.t-T.t+ahead); return {x:T.x+T.vx*dt,z:T.z+T.vz*dt}; }
// a position clue with a given uncertainty (metres, one standard deviation)
function aiObserve(tid,x,z,sig,src){
  const b=aiBel(tid); b.lastClue=R.t; if(src==='sight'){ b.lastSeen=R.t; aiTrack(b,x,z); }
  if(!b.init){ aiSeed(b,x,z,Math.max(sig,0.6),src!=='sight'); return; }
  const k=-0.5/(sig*sig); let s=0;
  for(let i=0;i<AI.N;i++){ const dx=b.x[i]-x, dz=b.z[i]-z; b.w[i]*=Math.exp((dx*dx+dz*dz)*k)+1e-6; s+=b.w[i]; }
  // nothing in the cloud explains it: they were somewhere we never imagined; start again from the clue
  if(s<1e-5*AI.N/160){ aiSeed(b,x,z,Math.max(sig,0.6),true); return; }
  for(let i=0;i<AI.N;i++) b.w[i]/=s;
  if(src==='sight'&&b.track) for(let i=0;i<AI.N;i++) aiSetMotion(b,i,b.track,true);
  aiResample(b,src==='sight');
}
// a direction clue: shot at from bearing ang (radians, atan2(dx,dz) convention) with uncertainty sig
function aiBearing(tid,ox,oz,ang,sig){
  const b=aiBel(tid); b.lastClue=R.t;
  if(!b.init){ const d=25; aiSeed(b,ox+Math.sin(ang)*d,oz+Math.cos(ang)*d,10,true); return; }
  const k=-0.5/(sig*sig); let s=0;
  for(let i=0;i<AI.N;i++){ let a=Math.atan2(b.x[i]-ox,b.z[i]-oz)-ang; a=Math.atan2(Math.sin(a),Math.cos(a)); b.w[i]*=Math.exp(a*a*k)+1e-6; s+=b.w[i]; }
  if(s<1e-5){ aiSeed(b,ox+Math.sin(ang)*25,oz+Math.cos(ang)*25,10,true); return; }
  for(let i=0;i<AI.N;i++) b.w[i]/=s; aiResample(b);
}
// each guess is either moving (keeps its heading with gentle turns) or stopped (in cover, waiting). A sighting
// sets most guesses to the measured velocity and some to "stopped": people who break line of sight often hold still.
function aiSetMotion(b,i,T,moving){
  const sp=T?Math.hypot(T.vx,T.vz):0;
  if(T&&sp>0.8){ if(Math.random()<0.8){ b.mv[i]=1; const a=Math.atan2(T.vx,T.vz)+_gauss()*0.25, s=clamp(sp+_gauss()*0.6,1,AI.run); b.vx[i]=Math.sin(a)*s; b.vz[i]=Math.cos(a)*s; } else { b.mv[i]=0; b.vx[i]=b.vz[i]=0; } }
  else if(moving&&Math.random()<0.5){ b.mv[i]=1; const a=Math.random()*6.283, s=2+Math.random()*3.5; b.vx[i]=Math.sin(a)*s; b.vz[i]=Math.cos(a)*s; }
  else { b.mv[i]=0; b.vx[i]=b.vz[i]=0; }
}
const AI_MOTION={stop:0.3, start:0.05, turn:0.45};   // per second: moving guesses stop, stopped ones set off, heading wander (rad/sqrt s)
function aiPredict(b,dt){
  const M=AI_MOTION, sq=Math.sqrt(dt);
  for(let i=0;i<AI.N;i++){
    let vx=b.vx[i], vz=b.vz[i];
    if(b.mv[i]){ if(Math.random()<M.stop*dt){ b.mv[i]=0; b.vx[i]=b.vz[i]=0; continue; }
      const a=Math.atan2(vx,vz)+_gauss()*M.turn*sq, s=clamp(Math.hypot(vx,vz)+_gauss()*0.6*sq,0.8,AI.run); vx=Math.sin(a)*s; vz=Math.cos(a)*s; }
    else { if(Math.random()<M.start*dt){ b.mv[i]=1; const a=Math.random()*6.283, s=2+Math.random()*3.5; b.vx[i]=Math.sin(a)*s; b.vz[i]=Math.cos(a)*s; } continue; }
    const nx=b.x[i]+vx*dt, nz=b.z[i]+vz*dt;
    if(aiWalk(nx,nz)){ b.x[i]=nx; b.z[i]=nz; }
    else if(aiWalk(nx,b.z[i])){ b.x[i]=nx; vz=-vz*0.4; }
    else if(aiWalk(b.x[i],nz)){ b.z[i]=nz; vx=-vx*0.4; }
    else { vx=-vx*0.5; vz=-vz*0.5; }
    b.vx[i]=vx; b.vz[i]=vz; }
}
// systematic resampling when the weight has piled onto a few guesses
function aiResample(b,force){
  let s2=0; for(let i=0;i<AI.N;i++) s2+=b.w[i]*b.w[i]; if(!force&&1/s2>AI.N*0.5) return;
  const N=AI.N, step=1/N; let u=Math.random()*step, c=b.w[0], j=0;
  for(let i=0;i<N;i++){ while(u>c&&j<N-1){ j++; c+=b.w[j]; } b.x2[i]=b.x[j]+_gauss()*0.25; b.z2[i]=b.z[j]+_gauss()*0.25; b.vx2[i]=b.vx[j]; b.vz2[i]=b.vz[j]; b.mv2[i]=b.mv[j]; u+=step; }
  for(const [a,c2] of [['x','x2'],['z','z2'],['vx','vx2'],['vz','vz2'],['mv','mv2']]){ const t=b[a]; b[a]=b[c2]; b[c2]=t; }
  for(let i=0;i<N;i++){ if(!aiWalk(b.x[i],b.z[i])){ b.x[i]=b.x2[i]; b.z[i]=b.z2[i]; } b.w[i]=step; }
}
// the densest patch is the estimate; the next dense patches are worth searching
function aiEstimate(b){
  const bins=new Map();
  for(let i=0;i<AI.N;i++){ const k=(Math.floor(b.x[i]/4)+2000)*4096+(Math.floor(b.z[i]/4)+2000); bins.set(k,(bins.get(k)||0)+b.w[i]); }
  const list=[...bins.entries()].sort((a,c)=>c[1]-a[1]);
  const centre=k=>({x:(Math.floor(k/4096)-2000)*4+2,z:(k%4096-2000)*4+2});
  const spots=[]; for(const [k,m] of list){ const c=centre(k); if(spots.some(s=>Math.hypot(s.x-c.x,s.z-c.z)<8)) continue; spots.push({x:c.x,z:c.z,m}); if(spots.length>=5) break; }
  // refine the best patch with the guesses around it, and fold neighbouring patches' mass into its confidence
  const c0=spots[0]; let sx=0,sz=0,sw=0; for(let i=0;i<AI.N;i++){ const d=Math.hypot(b.x[i]-c0.x,b.z[i]-c0.z); if(d<6){ sx+=b.x[i]*b.w[i]; sz+=b.z[i]*b.w[i]; sw+=b.w[i]; } }
  b.est=sw>0?{x:sx/sw,z:sz/sw}:{x:c0.x,z:c0.z}; b.conf=sw;
  let v=0; for(let i=0;i<AI.N;i++){ const dx=b.x[i]-b.est.x, dz=b.z[i]-b.est.z; v+=(dx*dx+dz*dz)*b.w[i]; } b.spread=Math.sqrt(v);
  for(const s of spots) s.m=0; for(let i=0;i<AI.N;i++){ let bi=0,bd=1e9; for(let k=0;k<spots.length;k++){ const d=Math.hypot(b.x[i]-spots[k].x,b.z[i]-spots[k].z); if(d<bd){ bd=d; bi=k; } } spots[bi].m+=b.w[i]; }
  spots.sort((a,c)=>c.m-a.m); b.spots=spots;
}
// grid line of sight (the nav grid's blocked cells stand in for walls)
function aiLos(ax,az,bx,bz){ if(!R.nav) return true; return navClear(ax,az,bx,bz); }
// an alert enemy looking around: the guesses it can see are probably wrong
function aiNegative(e,b){
  const range=aiSightRange(e), r2=range*range, ex=e.pos.x, ez=e.pos.z, fx=-Math.sin(e.yaw), fz=-Math.cos(e.yaw); let hit=0;
  for(let i=0;i<AI.N;i++){ const dx=b.x[i]-ex, dz=b.z[i]-ez, d2=dx*dx+dz*dz; if(d2>r2) continue; const d=Math.sqrt(d2)||0.01;
    if(d>4&&(dx*fx+dz*fz)/d<0.25) continue;       // eyes only look one way at a time
    if(!aiLos(ex,ez,b.x[i],b.z[i])) continue; b.w[i]*=0.1; hit++; }
  if(!hit) return; let s=0; for(let i=0;i<AI.N;i++) s+=b.w[i];
  if(s<1e-6){ b.lastClue=Math.min(b.lastClue,R.t-AI.forget*0.6); for(let i=0;i<AI.N;i++) b.w[i]=1/AI.N; return; } // ruled everything out: losing the trail
  for(let i=0;i<AI.N;i++) b.w[i]/=s; aiResample(b);
}
function aiSightRange(e){ let r=(R.map==='whiteout'?40:R.map==='vault'?34:R.map==='skarsvik'?80:70)*(R.sight||1); if(scene.fog&&scene.fog.density) r=Math.min(r,1.1/scene.fog.density); return Math.min(r,45); }
// runs a few times a second for all beliefs: move the clouds, fold in what everyone is looking at
function aiTick(dt){
  const A=aiState(); A.tick-=dt; if(A.tick>0) return; const step=AI.tick-A.tick; A.tick=AI.tick; aiReports();
  for(const tid in A.bel){ const b=A.bel[tid]; if(!b.init) continue;
    if(R.t-b.lastClue>AI.forget*1.5){ delete A.bel[tid]; continue; }
    if(R.t-b.lastSeen>0.15) aiPredict(b,step);
    for(const e of R.enemies){ if(e.dead||e.state!=='combat'||e.sees||!e.tid||bk(e.tid,e.grp)!==tid) continue; if(R.t>(e.negT||0)){ e.negT=R.t+AI.negEvery*(0.8+Math.random()*0.4); aiNegative(e,b); } }
    aiEstimate(b); }
}

/* ---------------- exposure and cover ---------------- */
// cells the threat at (tx,tz) can see, by casting rays over the nav grid (cached while the estimate holds still)
function aiVis(b){
  if(!R.nav||!b.est) return null; const N=R.nav;
  if(b.vis&&R.t-b.visT<1.5&&Math.hypot(b.visX-b.est.x,b.visZ-b.est.z)<2) return b.vis;
  const vis=b.vis&&b.vis.length===N.n*N.n?b.vis.fill(0):new Uint8Array(N.n*N.n), ox=b.est.x, oz=b.est.z, reach=55, st=N.c*0.7;
  for(let r=0;r<360;r++){ const a=r/360*6.2832, dx=Math.sin(a), dz=Math.cos(a);
    for(let d=0;d<reach;d+=st){ const i=navCell(ox+dx*d,oz+dz*d); if(i<0||N.grid[i]) break; vis[i]=1; } }
  b.vis=vis; b.visT=R.t; b.visX=ox; b.visZ=oz; return vis;
}
// nearest hidden cell next to a visible one, by breadth-first search over the grid (path distance, not straight line)
function aiFindCover(e,b,maxR=14){
  const vis=aiVis(b); if(!vis) return null; const N=R.nav, n=N.n, s=navNearestFree(navCell(e.pos.x,e.pos.z)); if(s<0) return null;
  const maxSteps=Math.ceil(maxR/N.c), seen=new Map([[s,0]]), q=[s]; let best=null, bs=1e9;
  for(let qi=0;qi<q.length&&q.length<6000;qi++){ const i=q[qi], d=seen.get(i); if(d>maxSteps) continue;
    if(!vis[i]){ const x=i%n, z=(i/n)|0; let peek=-1; for(let r=1;r<=2&&peek<0;r++) for(let dz=-r;dz<=r&&peek<0;dz++) for(let dx=-r;dx<=r;dx++){ const j=(z+dz)*n+(x+dx); if(j>=0&&j<n*n&&vis[j]&&!N.grid[j]){ peek=j; break; } }
      const [cx,cz]=navXZ(i), td=Math.hypot(cx-b.est.x,cz-b.est.z); const sc=d*N.c+(peek<0?5:0)+(td<7?12:0)+Math.max(0,td-30)*0.3;
      if(sc<bs){ bs=sc; best={x:cx,z:cz,peek:peek>=0?navXZ(peek):null}; } }
    const x=i%n, z=(i/n)|0; for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx, nz=z+dz; if(nx<0||nz<0||nx>=n||nz>=n) continue; const j=nz*n+nx; if(N.grid[j]||seen.has(j)) continue; seen.set(j,d+1); q.push(j); } }
  return best;
}
// a spot off to the side of the estimate with a view of it, reached by a route the threat can't see if possible
function aiFlankPoint(e,b,G){
  const ex=e.pos.x, ez=e.pos.z, tx=b.est.x, tz=b.est.z, base=Math.atan2(ex-tx,ez-tz), rad=clamp(e.pref*0.9,9,24);
  let best=null, bs=-1e9;
  for(const side of [-1,1]) for(const off of [1.0,1.35,1.7]){ const a=base+side*off, x=tx+Math.sin(a)*rad, z=tz+Math.cos(a)*rad;
    if(Math.abs(x)>R.bound-2||Math.abs(z)>R.bound-2) continue; let i=navCell(x,z); if(i<0) continue; if(R.nav.grid[i]) i=navNearestFree(i); if(i<0) continue; const [cx,cz]=navXZ(i);
    if(!aiLos(cx,cz,tx,tz)) continue;                                    // must actually have a view of them from there
    // spread out: avoid where the others already are or are heading
    let crowd=0; for(const o of R.enemies){ if(o===e||o.dead||o.state!=='combat') continue; const ox=o.goal?o.goal.x:o.pos.x, oz=o.goal?o.goal.z:o.pos.z; if(Math.hypot(ox-cx,oz-cz)<8) crowd++; }
    const sc=-Math.hypot(cx-ex,cz-ez)*0.05-crowd*3+Math.random()*0.5; if(sc>bs){ bs=sc; best={x:cx,z:cz}; } }
  return best;
}

/* ---------------- deciding ---------------- */
function aiGenes(e){ return e.genes||(e.genes=GA_DEFAULT); }
const GA_DEFAULT={aggr:0.5,flank:0.5,patience:0.5,caution:0.5,suppress:0.5,focus:0.6,peek:0.5,comms:0.5};
// called from updEnemy's think step for an enemy in combat
function aiThink(e){
  if(DBG.aiClassic){ e.mode=null; return; }          // debug switch: the old chase-the-last-sighting behaviour, for comparison
  const G=aiGenes(e), b=eBel(e);
  if(!b||!b.init){ e.mode=e.sees?'engage':'search'; return; }
  const lost=R.t-b.lastSeen, hp=(e.hp/(e.maxHp||e.hp||1)), thr=0.15+0.5*G.caution, mag=e.gun.mag/(ITEMS[e.gun.id].magSize||1);
  const allies=R.enemies.filter(o=>o!==e&&!o.dead&&o.state==='combat'&&o.tid===e.tid&&o.grp===e.grp).length;
  const S={};
  if(e.sees){ S.engage=1;
    if(hp<thr||e.reloadT>0||(mag<0.15&&G.caution>0.4)) S.cover=0.9+G.caution*0.6;
    if(G.peek>0.55&&R.t-(e.peekT||0)>0.6+(1-G.peek)*1.6&&R.t-(e.modeT||0)>1.5&&e.mode==='engage') S.cover=Math.max(S.cover||0,0.4+G.peek*0.5); }
  else {
    // a squad splits the work: one keeps the angle covered, one lays down fire, the rest go after you
    const doing=m=>R.enemies.filter(o=>o!==e&&!o.dead&&o.tid===e.tid&&o.grp===e.grp&&o.mode===m).length;
    if(lost<1.4&&e.gun.mag>3&&b.lastSeen>0) S.suppress=G.suppress*1.15*(1-lost/1.4)-doing('suppress')*0.5;
    const hold=0.8+G.patience*6; if(lost<hold&&b.lastSeen>0) S.hold=0.55+G.patience*0.5-lost/hold*0.4-doing('hold')*0.45;
    if(lost>0.4&&!e.k.home&&(allies>=1||G.flank>0.75)&&b.est&&Math.hypot(b.est.x-e.pos.x,b.est.z-e.pos.z)<40) S.flank=G.flank*0.95+(e.role==='rush'?0.15:0)-(e.flankFail?0.6:0)-doing('flank')*0.25;
    S.search=0.45+Math.min(1,lost/5)*0.55+(e.role==='rush'?0.15:0)+(allies&&doing('hold')?0.15:0);
    if(hp<thr) S.cover=0.8+G.caution*0.6;
    if(hp<thr*0.6&&G.caution>0.6) S.retreat=0.9+G.caution*0.4; }
  if(e.mode&&S[e.mode]!=null) S[e.mode]+=0.25;                          // stick with a plan for a bit
  let best='search', bv=-1; for(const k in S) if(S[k]>bv){ bv=S[k]; best=k; }
  if(best!==e.mode){ e.mode=best; e.modeT=R.t; e.goal=null; e.path=null; if(best==='cover') e.peekT=R.t; }
  // work out where the chosen plan takes them
  if(!e.goal||R.t-(e.goalT||0)>3){ e.goalT=R.t;
    if(e.mode==='cover'){ const c=aiFindCover(e,b); e.goal=c?{x:c.x,z:c.z,peek:c.peek}:null; if(!c&&!e.sees) e.mode='search'; }
    else if(e.mode==='flank'){ const f=aiFlankPoint(e,b,G); if(f){ e.goal=f; e.flankFail=false; } else { e.flankFail=true; e.mode='search'; } }
    else if(e.mode==='retreat'){ const dx=e.pos.x-b.est.x, dz=e.pos.z-b.est.z, d=Math.hypot(dx,dz)||1; e.goal={x:clamp(e.pos.x+dx/d*15,-R.bound+2,R.bound-2),z:clamp(e.pos.z+dz/d*15,-R.bound+2,R.bound-2)}; }
    if(e.mode==='search'){ e.goal=aiSearchSpot(e,b,G); }
    if(e.goal&&e.k.home){ const dx=e.goal.x-e.home.x, dz=e.goal.z-e.home.z, d=Math.hypot(dx,dz), r=e.k.home+4; if(d>r){ e.goal.x=e.home.x+dx/d*r; e.goal.z=e.home.z+dz/d*r; } } }
}
// pick a patch of the cloud to check: the likely ones, not where a squadmate is already going, nearer is better
function aiSearchSpot(e,b,G){
  if(!b.spots.length) return b.est?{x:b.est.x,z:b.est.z}:null; let best=null, bs=-1e9;
  for(const s of b.spots){ let claimed=0; for(const o of R.enemies){ if(o!==e&&!o.dead&&o.grp===e.grp&&o.mode==='search'&&o.goal&&Math.hypot(o.goal.x-s.x,o.goal.z-s.z)<6) claimed++; }
    const d=Math.hypot(s.x-e.pos.x,s.z-e.pos.z); const sc=Math.pow(s.m,0.5+G.focus)-claimed*0.25-d/120+Math.random()*0.05*(1-G.focus); if(sc>bs){ bs=sc; best=s; } }
  return best?{x:best.x+_gauss()*1.5,z:best.z+_gauss()*1.5}:null;
}
// tactical A*: a path to (tx,tz) that keeps out of the threat's sight as much as it can
function aiTacPath(e,b,tx,tz,G){ const vis=aiVis(b); if(!vis) return navPath(e.pos.x,e.pos.z,tx,tz); return navPath(e.pos.x,e.pos.z,tx,tz,null,vis,1.5+G.caution*6); }
// carry out the plan when they can't see their target (they shoot normally when they can; see updEnemy)
function aiAct(e,dt){
  if(DBG.aiClassic) return false;
  const G=aiGenes(e), b=eBel(e); if(!b||!b.init) return false;
  const look=(x,z,k=5)=>{ e.yaw=lerpA(e.yaw,Math.atan2(-(x-e.pos.x),-(z-e.pos.z)),Math.min(1,dt*k)); };
  const pred=aiTrackAt(b,0.4)||b.est;
  switch(e.mode){
    case 'suppress': { if(pred) look(pred.x,pred.z,8); if(e.cool<=0&&e.reloadT<=0&&e.gun.mag>0&&pred) aiSuppress(e,pred.x,pred.z); return true; }
    case 'hold': { const p=aiTrackAt(b,0.6)||b.est; if(p) look(p.x,p.z,6); e.holding=true; return true; }
    case 'flank': case 'retreat': { if(!e.goal){ e.mode='search'; return true; }
      if(!e.tpath||e.tpathK!==e.goal){ e.tpath=aiTacPath(e,b,e.goal.x,e.goal.z,G)||[[e.goal.x,e.goal.z]]; e.tpathK=e.goal; e.tpi=0; }
      let w=e.tpath[Math.min(e.tpi,e.tpath.length-1)]; if(Math.hypot(w[0]-e.pos.x,w[1]-e.pos.z)<0.6&&e.tpi<e.tpath.length-1){ e.tpi++; w=e.tpath[e.tpi]; }
      const done=eMove(e,w[0],w[1],e.mode==='flank'?3.6:3.4,dt)&&e.tpi>=e.tpath.length-1; // (the tactical route lives in e.tpath; e.path belongs to eMove's own A*)
      if(done){ e.goal=null; e.tpath=null; e.mode=e.mode==='flank'?'hold':'cover'; e.modeT=R.t; if(b.est) look(b.est.x,b.est.z,20); } return true; }
    case 'cover': { if(!e.goal) return false; const peekNow=e.goal.peek&&!e.reloadT&&R.t-(e.peekT||0)>0.8+(1-G.peek)*1.8;
      const tgt=peekNow?{x:e.goal.peek[0],z:e.goal.peek[1]}:e.goal; if(eMove(e,tgt.x,tgt.z,3.2,dt)&&peekNow){ e.peekT=R.t; } if(b.est) look(b.est.x,b.est.z,6); return true; }
    case 'search': default: { if(!e.goal){ e.goal=aiSearchSpot(e,b,G); if(!e.goal) return false; }
      const sp=R.t-b.lastSeen<10?3.0:2.2; if(eMove(e,e.goal.x,e.goal.z,e.k.home?1.8:sp,dt)){ e.goal=null; e.sweepT=R.t+1.2; }
      if(e.sweepT>R.t){ e.yaw+=dt*2.2; } return true; }
  }
}
// suppressive fire at a predicted spot: real bullets, so they only hurt you if you are in the line of fire
function aiSuppress(e,x,z){
  const d=ITEMS[e.gun.id]; e.gun.mag--; e.cool=60/d.rpm*(d.auto?1.6:2.2)+0.15+Math.random()*0.35;
  const mx=e.pos.x-Math.sin(e.yaw)*0.7, mz=e.pos.z-Math.cos(e.yaw)*0.7, my=e.pos.y+eGunY(e), ty=(R.terrain?R.terrain(x,z):0)+1.1+_gauss()*0.4, ex=x+_gauss()*1.2, ez=z+_gauss()*1.2;
  const myD=Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z); flashAt(mx,my,mz); sfxShot(e.gun.id,myD);
  _a.set(mx,my,mz); _b.set(ex-mx,ty-my,ez-mz); const dd=_b.length(); _b.divideScalar(dd); ray.set(_a,_b); ray.far=dd+20;
  const wall=ray.intersectObjects(R.ray,false)[0]; const end=wall?wall.point:{x:mx+_b.x*(dd+20),y:my+_b.y*(dd+20),z:mz+_b.z*(dd+20)};
  tracer(mx,my-0.05,mz,end.x,end.y,end.z,0xffcf7a); R.shots.push([mx,mz,end.x,end.y,end.z]); if(wall) puff(wall.point,0xc9d2d6,3,1.4);
  // does the line pass through a real player before it hits anything?
  for(const t of R.tgts){ const px=t.x-mx, py=(t.eye-0.5)-my, pz=t.z-mz, along=px*_b.x+py*_b.y+pz*_b.z; if(along<0||along>(wall?wall.distance:dd+20)) continue;
    const off=Math.hypot(px-_b.x*along,py-_b.y*along,pz-_b.z*along); if(off>0.45) continue;
    if(Math.random()<0.3*e.k.acc){ const am=ITEMS[e.gun.ammo]; e.dmgDone=(e.dmgDone||0)+am.dmg; R.lastShooter=e;
      if(t.id==='me') playerHit(am.dmg,am.pen,e.k.name,null,e.pos); else nsend({t:'eshot',pid:t.id,hits:1,dmg:am.dmg,pen:am.pen,name:e.k.name,x:e.pos.x,z:e.pos.z}); }
    else if(t.id==='me'){ sfxWhizz(); hitDir(e.pos.x,e.pos.z,true); } break; }
}

/* ---------------- the senses, called from the game ---------------- */
// an enemy sees a target: exact-ish position (a little noise with distance)
function aiSaw(e,t,dist){ e.tid=t.id; e.contactT=R.t; const s=0.25+dist*0.01; aiObserve(bk(t.id,e.grp),t.x+_gauss()*s*0.5,t.z+_gauss()*s*0.5,s,'sight'); }
// footsteps: rough, and rougher further away
function aiHeardSteps(e,t,dist){ e.tid=t.id; const s=1.5+dist*0.22; aiObserve(bk(t.id,e.grp),t.x+_gauss()*s,t.z+_gauss()*s,s,'sound'); }
// a gunshot at (x,z): one clue for the whole squad, as good as the closest ear that heard it
function aiHeardShot(x,z,radius){ dronesHearShot(x,z,radius); let tgt=null, td=1e9; for(const t of R.tgts){ const d=Math.hypot(t.x-x,t.z-z); if(d<td){ td=d; tgt=t; } } if(!tgt||td>4) return;
  // each group that heard it gets a clue as good as its closest ear
  const near={}; for(const e of R.enemies){ if(e.dead) continue; const d=Math.hypot(e.pos.x-x,e.pos.z-z); if(d<radius){ near[e.grp]=Math.min(near[e.grp]??1e9,d); if(!e.sees) e.tid=tgt.id; } }
  for(const g in near){ const s=2+near[g]*0.1; aiObserve(bk(tgt.id,+g),x+_gauss()*s,z+_gauss()*s,s,'sound'); } }
// shot by someone: the direction it came from (the hit enemy also turns toward it)
function aiShotFrom(e,t){ if(!t) return; e.tid=t.id; const ang=Math.atan2(t.x-e.pos.x,t.z-e.pos.z)+_gauss()*0.12; aiBearing(bk(t.id,e.grp),e.pos.x,e.pos.z,ang,0.16); if(!e.sees) e.yaw=Math.atan2(-Math.sin(ang),-Math.cos(ang)); }
// pass what we know to someone in earshot of a callout
function aiShare(from,to){ if(!from.tid) return; to.tid=from.tid; if(to.grp!==from.grp){ const b=eBel(from); if(b&&b.est) aiObserve(bk(from.tid,to.grp),b.est.x+_gauss()*3,b.est.z+_gauss()*3,4,'sound'); } }

/* ---------------- groups, shouting and the radio ---------------- */
const RADIO={range:260, delay:[1.5,3.5], sig:8, every:7, perGroup:2, cap:{easy:2,normal:3,hard:4,brutal:5}, jam:40, shout:18};
const HAS_RADIO=new Set(['raider','guard','vguard','mguard','huskarl','chief','warden','foreman','relay','harbor','jarl']);
// enemies that spawn within 45 m of each other are one group
function aiGroupOf(e){ const A=aiState(); let g=A.groups.find(g=>Math.hypot(g.x-e.pos.x,g.z-e.pos.z)<45);
  if(!g){ g={id:A.groups.length+1,x:e.pos.x,z:e.pos.z,n:0}; A.groups.push(g); } g.x=(g.x*g.n+e.pos.x)/(g.n+1); g.z=(g.z*g.n+e.pos.z)/(g.n+1); g.n++; return g.id; }
const grpRadio=g=>R.enemies.some(o=>!o.dead&&o.grp===g&&HAS_RADIO.has(o.kind));
// is there a player carrying a radio jammer near (x,z)?
// carrying a radio jammer (checked once a second)
function myJammer(){ if(!R||!P) return false; if(R.t<(P.jamT||-1)) return !!P.jam; P.jamT=R.t+1; P.jam=!!findCarried(it=>it.id==='jammer'); return P.jam; }
function jammed(x,z){ for(const t of (R.tgts||[])) if(t.jam&&Math.hypot(t.x-x,t.z-z)<RADIO.jam) return true; return false; }
// how many enemies are already after this target: anyone who sees it, plus everyone sent to check on it
function aiCommitted(tid){ let n=0; for(const o of R.enemies) if(!o.dead&&o.state==='combat'&&o.tid===tid&&(o.sees||o.sent||R.t-(o.contactT||-99)<8)) n++; return n; }
// someone saw something: report it on the radio (if they have one and aren't jammed)
function aiRadio(from,tid,x,z,o={}){
  const A=aiState(); if(!tid) return false; if(from&&!HAS_RADIO.has(from.kind)&&!o.drone) return false;
  const fx=from?from.pos.x:(o.fx??x), fz=from?from.pos.z:(o.fz??z);
  if(jammed(fx,fz)){ if(from&&R.t>(from.jamT||0)){ from.jamT=R.t+6; from.aware=R.t+40; from.awareAt={x,z}; } return false; }
  const key=(o.key||(from?from.grp:'d'))+'|'+tid; if(R.t<(A.radioT[key]||0)) return false; A.radioT[key]=R.t+(o.every||RADIO.every);
  A.reports.push({at:R.t+(o.delay??(RADIO.delay[0]+Math.random()*(RADIO.delay[1]-RADIO.delay[0]))),tid,x,z,sig:o.sig||RADIO.sig,from:from?from.grp:-1,fx,fz,send:o.send??RADIO.perGroup,kind:o.kind||'contact'});
  return true;
}
// reports arrive: each other group with a radio in range updates its picture, sends a couple of people if there's
// room, and the rest keep an eye out that way
function aiReports(){
  const A=aiState(); if(!A.reports.length) return; const cap=RADIO.cap[R.diff]||3;
  for(let i=A.reports.length-1;i>=0;i--){ const r=A.reports[i]; if(R.t<r.at) continue; A.reports.splice(i,1);
    const groups=new Map(); for(const o of R.enemies){ if(o.dead||o.grp===r.from) continue; if(!groups.has(o.grp)) groups.set(o.grp,[]); groups.get(o.grp).push(o); }
    for(const [g,mem] of groups){ if(!mem.some(o=>HAS_RADIO.has(o.kind))) continue; const cx=mem.reduce((s,o)=>s+o.pos.x,0)/mem.length, cz=mem.reduce((s,o)=>s+o.pos.z,0)/mem.length;
      if(Math.hypot(cx-r.fx,cz-r.fz)>RADIO.range) continue;
      const nx=r.x+_gauss()*r.sig*0.5, nz=r.z+_gauss()*r.sig*0.5; aiObserve(bk(r.tid,g),nx,nz,r.sig,'radio');
      // radio chatter you can overhear if you're close to the ones receiving it
      const sp=mem.find(o=>HAS_RADIO.has(o.kind)); if(sp&&typeof speak==='function') speak(sp.pos.x,sp.pos.z,voiceOf(sp),'radio');
      const busy=mem.filter(o=>o.state==='combat'&&o.tid===r.tid).length;
      let slots=busy?0:Math.max(0,Math.min(r.send,cap-aiCommitted(r.tid)));
      const free=mem.filter(o=>o.state!=='combat').sort((a,b)=>Math.hypot(a.pos.x-nx,a.pos.z-nz)-Math.hypot(b.pos.x-nx,b.pos.z-nz));
      for(const o of free){ o.aware=R.t+45; o.awareAt={x:nx,z:nz};
        if(slots>0&&!o.k.home){ slots--; o.state='combat'; o.tid=r.tid; o.sent=true; o.react=0.4; o.lostT=0; o.mode='search'; o.goal=null; o.lastSeen={x:nx,z:nz}; o.lastSeen0=false; } } }
  }
}
// a dead comrade: who did it is a fair guess (it's whoever is in the raid), where they shot from is not, so the
// picture starts as a ring of places with a line of sight to the body
function aiSeedBody(e,c){
  const tid=c.killer||'me'; e.tid=tid; const b=aiBel(bk(tid,e.grp)); if(b.init&&R.t-b.lastClue<20) return b;
  const N=AI.N; let k=0; for(let t=0;t<N*6&&k<N;t++){ const a=Math.random()*6.2832, r=6+Math.random()*34, x=c.x+Math.cos(a)*r, z=c.z+Math.sin(a)*r; if(!aiWalk(x,z)||!aiLos(c.x,c.z,x,z)) continue; b.x[k]=x; b.z[k]=z; b.vx[k]=b.vz[k]=0; b.mv[k]=0; b.w[k]=1/N; k++; }
  for(;k<N;k++){ b.x[k]=c.x+_gauss()*12; b.z[k]=c.z+_gauss()*12; b.vx[k]=b.vz[k]=0; b.mv[k]=0; b.w[k]=1/N; }
  b.init=true; b.lastClue=R.t; aiEstimate(b); return b;
}

/* ---------------- adaptation: the genetic algorithm ---------------- */
const GA={key:'kolvik-ai-v1', size:12, elite:2, mut:0.12, mutP:0.35};
function gaLoad(){ if(GA.data) return GA.data; let d=null; try{ d=JSON.parse(localStorage.getItem(GA.key)||'null'); }catch(e){}
  if(!d||d.v!==1) d={v:1,pops:{}}; GA.data=d; return d; }
function gaSave(){ try{ localStorage.setItem(GA.key,JSON.stringify(GA.data)); }catch(e){} }
function gaPop(name){ const d=gaLoad(); let p=d.pops[name]; if(!p){ p=d.pops[name]={gen:1,ind:[],best:null,history:[]};
  for(let i=0;i<GA.size;i++){ const g={}; for(const k of GENES) g[k]=clamp(0.5+_gauss()*0.18,0,1); p.ind.push({g,fs:0,n:0}); } } return p; }
const gaPopName=k=>k==='scav'?'scav':'trained';
// a genome for a new enemy: untested ones first, otherwise a tournament on average fitness
function gaPick(kind){ if(EK[kind]&&EK[kind].boss) return null; if(OPTS.aiLearn==='off'||(NET.on&&!NET.host)) return null;
  const name=gaPopName(kind), p=gaPop(name); const fresh=p.ind.map((x,i)=>i).filter(i=>p.ind[i].n===0);
  let i; if(fresh.length&&Math.random()<0.7) i=fresh[Math.floor(Math.random()*fresh.length)];
  else { const a=Math.floor(Math.random()*p.ind.length), c=Math.floor(Math.random()*p.ind.length), fa=p.ind[a].n?p.ind[a].fs/p.ind[a].n:0, fc=p.ind[c].n?p.ind[c].fs/p.ind[c].n:0; i=fa>=fc?a:c; }
  return {pop:name,i,gen:p.gen,g:Object.assign({},p.ind[i].g)}; }
// how well an enemy did against you this raid
function gaFitness(e,killer){ return (e.dmgDone||0)+(killer?150:0)+Math.min(e.engT||0,120)*0.4+(e.seeT||0)*0.3+(e.dead?Math.min(e.lifeEng||0,30)*0.3-15:12); }
// after a raid: score every genome that fought, then breed the next generation when everyone has been tried
function gaRaidEnd(kind){
  if(!R||OPTS.aiLearn==='off'||(NET.on&&!NET.host)) return; const d=gaLoad(); let any=false;
  const killer=kind==='kia'&&R.lastShooter&&!R.lastShooter.dead?R.lastShooter:(kind==='kia'?R.lastShooter:null);
  for(const e of R.enemies){ if(!e.gen||(e.engT||0)<3) continue; const p=d.pops[e.gen.pop]; if(!p||p.gen!==e.gen.gen) continue; const ind=p.ind[e.gen.i]; if(!ind) continue;
    ind.fs+=gaFitness(e,e===killer); ind.n++; any=true; }
  if(!any) return; for(const name in d.pops){ const p=d.pops[name]; const tried=p.ind.filter(x=>x.n>0).length; if(tried>=p.ind.length-1&&p.ind.reduce((s,x)=>s+x.n,0)>=p.ind.length*1.5) gaEvolve(p); }
  gaSave();
}
function gaEvolve(p){
  const mean=x=>x.n?x.fs/x.n:-1e9; const sorted=p.ind.slice().sort((a,c)=>mean(c)-mean(a)); const med=mean(sorted[Math.floor(sorted.length/2)]);
  for(const x of p.ind) if(!x.n){ x.fs=med; x.n=1; }
  const tour=()=>{ let best=null; for(let k=0;k<3;k++){ const c=p.ind[Math.floor(Math.random()*p.ind.length)]; if(!best||mean(c)>mean(best)) best=c; } return best; };
  const next=sorted.slice(0,GA.elite).map(x=>({g:Object.assign({},x.g),fs:x.fs/x.n,n:1}));    // elites carry a damped record forward
  while(next.length<GA.size){ const a=tour(), c=tour(), g={};
    for(const k of GENES){ const lo=Math.min(a.g[k],c.g[k]), hi=Math.max(a.g[k],c.g[k]), ext=(hi-lo)*0.25; let v=lo-ext+Math.random()*(hi-lo+2*ext);   // blend crossover (BLX-0.25)
      if(Math.random()<GA.mutP) v+=_gauss()*GA.mut; g[k]=clamp(v,0,1); }
    next.push({g,fs:0,n:0}); }
  p.history.push({gen:p.gen,best:+mean(sorted[0]).toFixed(1),avg:+(p.ind.reduce((s,x)=>s+mean(x),0)/p.ind.length).toFixed(1),genes:Object.fromEntries(GENES.map(k=>[k,+(p.ind.reduce((s,x)=>s+x.g[k],0)/p.ind.length).toFixed(2)]))}); if(p.history.length>40) p.history.shift();
  p.best={g:Object.assign({},sorted[0].g),fit:+mean(sorted[0]).toFixed(1),gen:p.gen}; p.ind=next; p.gen++;
}
function gaReset(){ GA.data={v:1,pops:{}}; gaSave(); }
// turn genes into concrete behaviour numbers on a new enemy (within fair limits)
function aiApplyGenes(e){ const G=aiGenes(e); e.pref=e.pref*(1.35-0.7*G.aggr); if(!e.k.home) e.role=Math.random()<0.25+0.6*G.aggr?'rush':'hold'; e.callMul=0.7+0.8*G.comms; }

/* ---------------- a dead comrade ---------------- */
// a calm enemy that can see a body of one of its own reacts to it (once per body per enemy)
function aiBodyScan(e){
  if(R.t<(e.bodyT||0)) return; e.bodyT=R.t+0.6; const range=Math.min(40,aiSightRange(e)*0.6), fx=-Math.sin(e.yaw), fz=-Math.cos(e.yaw);
  for(const c of R.conts){ if(!c.ally||(c.seenBy&&c.seenBy.has(e))) continue; const dx=c.x-e.pos.x, dz=c.z-e.pos.z, d=Math.hypot(dx,dz); if(d>range) continue;
    if(d>4&&(fx*dx+fz*dz)/d<(e.aware>R.t?-0.2:0.25)) continue;
    if(!los(e.pos.x,e.pos.y+eEye(e),e.pos.z,c.x,(R.terrain?R.terrain(c.x,c.z):0)+0.35,c.z)) continue;
    (c.seenBy||(c.seenBy=new Set())).add(e);
    if(c.found&&R.t-c.found>25){ e.aware=R.t+60; e.awareAt={x:c.x,z:c.z}; continue; }   // an old one, already called in: just wary
    c.found=c.found||R.t; aiDiscoverBody(e,c); return; }
}
function aiDiscoverBody(e,c){
  e.state='combat'; e.lostT=0; e.react=0.4; e.susp={x:c.x,z:c.z,t:R.t,phase:'go'}; e.mode='search'; e.goal=null; e.lastSeen={x:c.x,z:c.z}; e.lastSeen0=false;
  aiSeedBody(e,c); e.aware=R.t+90; e.awareAt={x:c.x,z:c.z};
  // the rest of the group close by come with them; other groups hear "man down" on the radio and get wary, but nobody new is sent
  for(const o of R.enemies) if(o!==e&&!o.dead&&o.grp===e.grp&&o.state!=='combat'&&Math.hypot(o.pos.x-e.pos.x,o.pos.z-e.pos.z)<30){ o.state='combat'; o.tid=e.tid; o.lostT=0; o.react=0.5; o.mode='search'; o.goal=null; o.aware=R.t+90; o.awareAt={x:c.x,z:c.z}; }
  aiRadio(e,e.tid,c.x,c.z,{sig:14,send:0,kind:'mandown'});
  if(typeof speak==='function') speak(e.pos.x,e.pos.z,voiceOf(e),'call');
}
// walk over carefully, crouch by the body and look around, then hand over to the ordinary search
function suspAct(e,dt){
  const s=e.susp, T=R.t-s.t;
  if(s.phase==='go'){ const d=Math.hypot(s.x-e.pos.x,s.z-e.pos.z); if(d>2.4&&T<14){ eMove(e,s.x,s.z,2.2,dt); return true; } s.phase='check'; s.ct=R.t; s.yaw0=e.yaw; }
  if(s.phase==='check'){ const t2=R.t-s.ct; e.yaw=lerpA(e.yaw,s.yaw0+(t2<1.2?0:Math.sin((t2-1.2)*1.3)*1.6),Math.min(1,dt*4)); if(t2>5){ e.susp=null; e.mode='search'; e.goal=null; } return true; }
  return false;
}
