/* 54-nav: A* navigation grid */
/* ================= AI NAVIGATION ================= */
// A walkability grid built from the raid's collision boxes (padded by a body radius), A* over it, and path smoothing
// so they walk straight whenever nothing is in the way. Falls back to the old door routing if a search runs out.
function buildNav(){
  const B=R.navB||Math.ceil(R.bound+4), c=B>130?0.7:0.5, n=Math.ceil(2*B/c), pad=0.32; const grid=new Uint8Array(n*n);
  for(const b of R.cols){ if(b.y1<=0.35||b.y0>=1.6) continue;
    const x0=Math.max(0,Math.floor((b.x0-pad+B)/c)), x1=Math.min(n-1,Math.floor((b.x1+pad+B)/c)), z0=Math.max(0,Math.floor((b.z0-pad+B)/c)), z1=Math.min(n-1,Math.floor((b.z1+pad+B)/c));
    for(let z=z0;z<=z1;z++){ const cz=-B+(z+0.5)*c; if(cz<=b.z0-pad||cz>=b.z1+pad) continue; for(let x=x0;x<=x1;x++){ const cx=-B+(x+0.5)*c; if(cx>b.x0-pad&&cx<b.x1+pad) grid[z*n+x]=1; } } }
  for(let z=0;z<n;z++) for(let x=0;x<n;x++){ const cx=-B+(x+0.5)*c, cz=-B+(z+0.5)*c; if(Math.abs(cx)>R.bound||Math.abs(cz)>R.bound) grid[z*n+x]=1; }
  R.nav={B,c,n,grid,g:new Float32Array(n*n),par:new Int32Array(n*n),st:new Uint32Array(n*n),sid:0,hi:[],hf:[],stats:{paths:0,fails:0,exp:0}};
}
function navCell(x,z){ const N=R.nav; const cx=Math.floor((x+N.B)/N.c), cz=Math.floor((z+N.B)/N.c); return (cx<0||cz<0||cx>=N.n||cz>=N.n)?-1:cz*N.n+cx; }
const navFree=i=>i>=0&&!R.nav.grid[i];
function navXZ(i){ const N=R.nav; return [-N.B+(i%N.n+0.5)*N.c,-N.B+(((i/N.n)|0)+0.5)*N.c]; }
function navNearestFree(i){ const N=R.nav; if(i<0) return -1; const x0=i%N.n, z0=(i/N.n)|0; for(let r=1;r<=8;r++) for(let dz=-r;dz<=r;dz++) for(let dx=-r;dx<=r;dx++){ if(Math.max(Math.abs(dx),Math.abs(dz))!==r) continue; const x=x0+dx, z=z0+dz; if(x<0||z<0||x>=N.n||z>=N.n) continue; const j=z*N.n+x; if(!N.grid[j]) return j; } return -1; }
// can something walk in a straight line from a to b?
function navClear(ax,az,bx,bz){ const N=R.nav; const d=Math.hypot(bx-ax,bz-az); const steps=Math.ceil(d/(N.c*0.5)); for(let k=1;k<=steps;k++){ const t=k/steps; const i=navCell(ax+(bx-ax)*t,az+(bz-az)*t); if(i<0||N.grid[i]) return false; } return true; }
// extra (optional): a per-cell array; cells where it is set cost (1+ew) per step instead of 1 (the AI's tactical A*: avoid what the threat can see)
function navPath(sx,sz,tx,tz,budget,extra,ew){
  const N=R.nav, n=N.n, grid=N.grid; budget=budget||(n>600?14000:9000); let s=navCell(sx,sz), t=navCell(tx,tz); if(s<0||t<0) return null;
  if(grid[s]) s=navNearestFree(s); const tFree=!grid[t]; if(!tFree) t=navNearestFree(t); if(s<0||t<0) return null; if(s===t) return [[tx,tz]];
  N.sid+=2; const sid=N.sid, g=N.g, par=N.par, st=N.st, hi=N.hi, hf=N.hf; hi.length=0; hf.length=0;
  const tx_=t%n, tz_=(t/n)|0; const H=i=>{ const dx=Math.abs(i%n-tx_), dz=Math.abs(((i/n)|0)-tz_); return dx+dz-0.5858*Math.min(dx,dz); };
  const push=(i,f)=>{ let k=hi.length; hi.push(i); hf.push(f); while(k>0){ const p=(k-1)>>1; if(hf[p]<=f) break; hi[k]=hi[p]; hf[k]=hf[p]; k=p; } hi[k]=i; hf[k]=f; };
  const pop=()=>{ const top=hi[0], li=hi.pop(), lf=hf.pop(); if(hi.length){ let k=0; const L=hi.length; while(true){ let a=2*k+1; if(a>=L) break; if(a+1<L&&hf[a+1]<hf[a]) a++; if(hf[a]>=lf) break; hi[k]=hi[a]; hf[k]=hf[a]; k=a; } hi[k]=li; hf[k]=lf; } return top; };
  g[s]=0; par[s]=-1; st[s]=sid; push(s,H(s)); let exp=0, found=false;
  while(hi.length){ const i=pop(); if(st[i]===sid+1) continue; st[i]=sid+1; if(i===t){ found=true; break; } if(++exp>budget) break;
    const x=i%n, z=(i/n)|0;
    for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++){ if(!dx&&!dz) continue; const nx=x+dx, nz=z+dz; if(nx<0||nz<0||nx>=n||nz>=n) continue; const j=nz*n+nx; if(grid[j]||st[j]===sid+1) continue;
      if(dx&&dz&&(grid[z*n+nx]||grid[nz*n+x])) continue; const ng=g[i]+(dx&&dz?1.4142:1)*(extra&&extra[j]?1+ew:1); if(st[j]!==sid||ng<g[j]){ g[j]=ng; par[j]=i; st[j]=sid; push(j,ng+H(j)); } } }
  N.stats.exp+=exp; if(!found){ N.stats.fails++; return null; } N.stats.paths++;
  const pts=[]; for(let i=t;i!==s&&i!==-1;i=par[i]) pts.push(navXZ(i)); pts.reverse(); if(tFree) pts[pts.length-1]=[tx,tz]; return pts;
}
// next point to walk toward on the way to (tx,tz)
function navStep(e,tx,tz){
  if(!R.nav) return routeVia(e,tx,tz);
  if(R.t>(e.clearT||0)){ e.clearT=R.t+0.25; e.direct=navClear(e.pos.x,e.pos.z,tx,tz); }
  if(e.direct){ e.path=null; return [tx,tz]; }
  const gk=navCell(tx,tz);
  if(!e.path||(e.pathK!==gk&&R.t>(e.pathMin||0))||R.t>(e.pathT||0)){ e.path=navPath(e.pos.x,e.pos.z,tx,tz); e.pathK=gk; e.pathMin=R.t+0.6; e.pathT=R.t+(e.path?3:1); e.pi=0; e.skipT=0; }
  if(!e.path) return routeVia(e,tx,tz);
  if(R.t>(e.skipT||0)){ e.skipT=R.t+0.2; for(let j=Math.min(e.path.length-1,e.pi+10);j>e.pi;j--) if(navClear(e.pos.x,e.pos.z,e.path[j][0],e.path[j][1])){ e.pi=j; break; } }
  let w=e.path[e.pi]; if(Math.hypot(w[0]-e.pos.x,w[1]-e.pos.z)<0.45&&e.pi<e.path.length-1){ e.pi++; w=e.path[e.pi]; }
  return w;
}
// patrol points land on walkable ground, and every one has a time limit
function pickWp(e){ const r=e.k.home||18; let p=null; for(let k=0;k<10;k++){ p={x:clamp(e.home.x+rr(-r,r),-R.bound,R.bound), z:clamp(e.home.z+rr(-r,r),-R.bound,R.bound)}; if(!R.nav||navFree(navCell(p.x,p.z))) break; } e.wpT=R.t+18; return p; }
// bodies are posed in 58-body.js (enemyPose, animDead)
function updEnemy(e,dt){
  if(e.dead){ animDead(e,dt); return; }
  if(DBG.aiOff&&(!NET.on||NET.host)){ e.moving=false; eCoast(e,dt); enemyPose(e,dt); return; }
  if(NET.on&&!NET.host){ const k=Math.min(1,dt*10); e.pos.x+=(e.nx-e.pos.x)*k; e.pos.z+=(e.nz-e.pos.z)*k; e.yaw=lerpA(e.yaw,e.nyaw,k); e.g.rotation.y=e.yaw; enemyPose(e,dt); if(R.terrain) e.pos.y=R.terrain(e.pos.x,e.pos.z); return; }
  // nobody within earshot: idle (keeps big maps cheap)
  if(e.state!=='combat'){ let near=1e9; for(const t of R.tgts){ const d=Math.abs(t.x-e.pos.x)+Math.abs(t.z-e.pos.z); if(d<near) near=d; } if(near>170){ e.moving=false; e.vx=e.vz=0; enemyPose(e,dt); if(R.terrain) e.pos.y=R.terrain(e.pos.x,e.pos.z); return; } }
  e.think-=dt;
  if(e.think<=0){ e.think=0.18+rand()*0.12; let best=null,bd=1e9;
    for(const t of R.tgts){ const d=Math.hypot(t.x-e.pos.x,t.z-e.pos.z)||0.01;
      if(canSeeT(e,t,d)){ if(d<bd){ bd=d; best=t; } }
      else if(d<noiseR(t)){ if(e.state!=='combat'){ e.state='combat'; e.react=0.5; e.lostT=0; e.mode='search'; } if(R.t>(e.hearT||0)){ e.hearT=R.t+1; aiHeardSteps(e,t,d); const b=aiBel(bk(t.id,e.grp),false); if(b&&b.est&&!e.lastSeen0) e.lastSeen={x:b.est.x,z:b.est.z}; } } }
    // someone they just lost sight of who pops back out gets shot at almost at once
    if(best&&!e.sees){ const bb=aiBel(bk(best.id,e.grp),false), pr=bb&&R.t-bb.lastSeen<6?(aiTrackAt(bb)||bb.est):null; const expect=pr&&Math.abs(Math.atan2(Math.sin(Math.atan2(-(best.x-e.pos.x),-(best.z-e.pos.z))-e.yaw),Math.cos(Math.atan2(-(best.x-e.pos.x),-(best.z-e.pos.z))-e.yaw)))<0.35;
      const quick=e.state==='combat'&&e.lostT<6&&e.lastSeen0&&(expect||e.lostT<2); e.react=(rr(...e.k.react)*(quick?0.35:1)+(quick?0:bd/40))*R.D.react*(e.aware>R.t?0.7:1); e.first=!quick; e.aimT=quick?0.3:0; }
    const was=e.state; e.sees=!!best; e.tgtId=best?best.id:null;
    if(best){ e.state='combat'; e.lastSeen={x:best.x,z:best.z}; e.lastSeen0=true; e.lostT=0; e.susp=null; aiSaw(e,best,bd); }
    else if(e.state!=='combat'&&!DBG.aiClassic) aiBodyScan(e);
    if(e.state==='combat'&&(was!=='combat'||best)) callout(e);
    if(e.state==='combat') aiThink(e);
  }
  e.moving=false; e.stepped=false; e.cool-=dt;
  if(e.reloadT>0){ e.reloadT-=dt; if(e.reloadT<=0) e.gun.mag=ITEMS[e.gun.id].magSize; }
  const t=e.sees?R.tgts.find(x=>x.id===e.tgtId):null;
  if(e.state==='combat'){
    if(t){
      const dx=t.x-e.pos.x, dz=t.z-e.pos.z, dist=Math.hypot(dx,dz)||0.01;
      e.yaw=lerpA(e.yaw,Math.atan2(-dx,-dz),Math.min(1,dt*8)); e.react-=dt; e.aimT=(e.aimT||0)+dt;
      // they only open fire inside the range you could see them at; further out they close in first
      if(e.react<=0 && e.cool<=0 && e.reloadT<=0 && dist<=eEngage(e)){ if(e.gun.mag>0) enemyShoot(e,t,dist); else e.reloadT=ITEMS[e.gun.id].reload+0.4; }
      e.strafeT-=dt; if(e.strafeT<=0){ e.strafeT=1+rand()*1.6; e.strafeS=rand()<0.5?-1:1; }
      const fx=dx/dist, fz=dz/dist; let mx=-fz*e.strafeS*0.8, mz=fx*e.strafeS*0.8;
      if(dist>Math.min(e.pref,eEngage(e)-4)){ mx+=fx; mz+=fz; } else if(dist<5){ mx-=fx; mz-=fz; }
      // the plan is cover (hurt, reloading, or a peeker): head for it while still shooting back
      if(e.mode==='cover'&&e.goal){ const gx=e.goal.x-e.pos.x, gz=e.goal.z-e.pos.z, gd=Math.hypot(gx,gz); if(gd>0.6){ mx=gx/gd; mz=gz/gd; } else { mx=0; mz=0; } }
      if(e.k.home && Math.hypot(e.pos.x-e.home.x,e.pos.z-e.home.z)>e.k.home+4){ mx=e.home.x-e.pos.x; mz=e.home.z-e.pos.z; }
      const l=Math.hypot(mx,mz); if(l>0.01){ eWalk(e,mx/l,mz/l,(e.mode==='cover'?3:2.5)*eLimp(e),dt); e.moving=true; }
    } else {
      e.lostT+=dt; e.aimT=0;
      const bel=eBel(e);
      if(bel&&R.t-bel.lastClue>AI.forget){ e.state='patrol'; e.mode=null; e.goal=null; e.wp=null; e.flank=null; e.lastSeen0=false; e.lastSeen=null; e.sent=false; e.susp=null; e.aware=R.t+60; }
      else if(e.susp&&suspAct(e,dt)){ /* checking a body */ }
      else if(bel&&aiAct(e,dt)){ /* the brain is driving (57-ai.js) */ }
      else {
      // holders keep their aim on where you were for a few seconds before creeping up; rushers come around the side
      if(e.lastSeen){ const ls=e.lastSeen; e.yaw=lerpA(e.yaw,Math.atan2(-(ls.x-e.pos.x),-(ls.z-e.pos.z)),Math.min(1,dt*5));
        if(e.role==='hold'&&e.lostT<4){ /* waiting on the angle */ }
        else { if(e.role==='rush'&&!e.flank&&e.lostT<1.5&&!bldAt(ls.x,ls.z)&&!bldAt(e.pos.x,e.pos.z)){ const dx=ls.x-e.pos.x, dz=ls.z-e.pos.z, d=Math.hypot(dx,dz)||1, sd=rand()<0.5?-1:1; e.flank={x:ls.x-dz/d*7*sd,z:ls.z+dx/d*7*sd}; }
          if(e.flank){ if(eMove(e,e.flank.x,e.flank.z,3.4,dt)) e.flank=null; }
          else if(eMove(e,ls.x,ls.z,e.role==='rush'?3.4:(e.k.home?1.8:2.2),dt)){ e.lastSeen=null; e.lastSeen0=false; } } }
      else { e.flank=null; if(!e.wp) e.wp={x:e.pos.x+rr(-10,10),z:e.pos.z+rr(-10,10)}; if(eMove(e,e.wp.x,e.wp.z,2.0,dt)) e.wp=null; }
      if(e.lostT>25){ e.state='patrol'; e.wp=null; e.flank=null; e.lastSeen0=false; e.sent=false; }
      }
    }
  } else {
    if(e.wait>0){ e.wait-=dt; if(e.aware>R.t&&e.awareAt) e.yaw=lerpA(e.yaw,Math.atan2(-(e.awareAt.x-e.pos.x),-(e.awareAt.z-e.pos.z)),Math.min(1,dt*2)); }
    else { if(e.wp&&R.t>(e.wpT||0)) e.wp=null; if(!e.wp) e.wp=pickWp(e); if(eMove(e,e.wp.x,e.wp.z,1.3,dt)){ e.wp=null; e.wait=1+rand()*4; } }
  }
  if(e.state==='combat'){ e.engT=(e.engT||0)+dt; if(e.sees) e.seeT=(e.seeT||0)+dt; }
  if(!e.stepped) eCoast(e,dt);
  e.g.rotation.y=e.yaw; if(R.terrain) e.pos.y=R.terrain(e.pos.x,e.pos.z); enemyPose(e,dt);
}
// a shout reaches the shooter's own group (within 30 m) and anyone else within about 18 m; everyone further away
// only hears about it on the radio (57-ai.js), late and roughly, and only a couple of them come to look
function callout(e){ if(e.alertT>R.t) return; e.alertT=R.t+4; const ls=e.lastSeen; if(!ls) return;
  const shout=RADIO.shout*(e.callMul||1);
  for(const o of R.enemies){ if(o===e||o.dead||o.sees) continue; const d=Math.hypot(o.pos.x-e.pos.x,o.pos.z-e.pos.z); if(d>(o.grp===e.grp?Math.max(30,shout):shout)) continue;
    if(o.state!=='combat'){ o.react=0.4; o.mode=null; } o.state='combat'; o.lastSeen={x:ls.x+rr(-4,4),z:ls.z+rr(-4,4)}; o.lostT=0; aiShare(e,o); }
  if(e.tid) aiRadio(e,e.tid,ls.x,ls.z); }
function enemyShoot(e,t,dist){
  const d=ITEMS[e.gun.id], am=ITEMS[e.gun.ammo]; e.gun.mag--;
  e.cool=60/d.rpm*(d.auto?1:1.4)+(d.auto?0:rand()*0.5); e.burst--; if(e.burst<=0){ e.burst=d.auto?(e.k.boss?8+Math.floor(rand()*8):3+Math.floor(rand()*4)):1; e.cool+=e.k.boss?0.7+rand()*0.6:0.45+rand()*0.8; } if(e.enraged) e.cool*=0.7;
  const mx=e.pos.x-Math.sin(e.yaw)*0.7, mz=e.pos.z-Math.cos(e.yaw)*0.7, ty=t.eye-0.35, my=e.pos.y+eGunY(e); e.shotT=R.t; bodyKick(e.rig);
  const myD=Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z); flashAt(mx,my,mz); muzzleSpark(mx,my,mz,myD); sfxShot(e.gun.id,myD);
  // the bullet has to actually get there: anything solid in the way eats it
  _a.set(mx,my,mz); _b.set(t.x-mx,ty-my,t.z-mz); const dd=_b.length(); _b.divideScalar(dd); ray.set(_a,_b); ray.far=dd-0.2;
  const wall=ray.intersectObjects(R.ray,false)[0];
  if(wall){ tracer(mx,my,mz,wall.point.x,wall.point.y,wall.point.z,0xffcf7a); puff(wall.point,0xc9d2d6,3,1.4); e.sees=false; e.think=0; R.shots.push([mx,mz,wall.point.x,wall.point.y,wall.point.z]); return; }
  // hit chance per bullet: falls off hard with range, and starts low while they're still settling their aim
  // (settling takes longer at range; harder difficulties settle faster)
  const settle=(0.9+dist/30)*R.D.react, aim=0.35+0.65*Math.min(1,(e.aimT||0)/settle);
  let p=e.k.acc*Math.max(0.04,1-dist/50)*aim; if(t.vel>4.5) p*=0.62; else if(t.vel>1) p*=0.82; if(t.crouch) p*=0.86; if(e.first){ p*=0.7; e.first=false; } p=Math.min(0.95,p*R.D.acc);
  const pel=d.pellets||1; let hits=0; for(let i=0;i<pel;i++){ const pp=pel>1?p*Math.max(0,1-dist/30)*0.6:p; if(rand()<pp) hits++; }
  const ex=t.x+(hits?0:rr(-1.2,1.2)), ey=ty+rr(-0.3,0.4), ez=t.z+(hits?0:rr(-1.2,1.2));
  tracer(mx,my-0.05,mz,ex,ey,ez,0xffcf7a); R.shots.push([mx,mz,ex,ey,ez]);
  if(hits){ e.dmgDone=(e.dmgDone||0)+hits*am.dmg; R.lastShooter=e; }
  const dmg=am.dmg*(R.D.dmg||1);
  if(t.id==='me'){ if(hits) for(let i=0;i<hits;i++) playerHit(dmg,am.pen,e.k.name,null,e.pos); else { if(dist<40) sfxWhizz(); if(dist<70) hitDir(e.pos.x,e.pos.z,true); } }
  else if(hits) nsend({t:'eshot',pid:t.id,hits,dmg,pen:am.pen,name:e.k.name,x:e.pos.x,z:e.pos.z,gun:e.gun.id});
}
function hearShot(x,z,radius){ radius*=Math.sqrt((R&&R.hear)||1); if(!NET.on||NET.host) aiHeardShot(x,z,radius); for(const e of R.enemies){ if(e.dead||e.sees) continue; const d=Math.hypot(e.pos.x-x,e.pos.z-z); if(d<radius){ e.state='combat'; e.lastSeen={x:x+rr(-5,5),z:z+rr(-5,5)}; e.lostT=0; } } }
function armorRes(a,dmg,pen){ const d=ITEMS[a.id]; const ratio=a.dur/d.dur; const eff=d.cls*10*(0.5+0.5*ratio); const chance=pen>=eff?0.92:Math.pow(pen/eff,2.2)*0.85; const through=rand()<chance; a.dur=Math.max(0,a.dur-(pen/10+(through?0.6:1.4))*(dmg/40)); return through?{d:dmg*(1-0.07*d.cls),pen:true}:{d:dmg*0.12+2,pen:false}; }
function hitEnemy(e,part,am,pt,by){
  { const sh=by?R.tgts.find(t=>t.id===by):null; e.lastHitFrom=sh?{x:sh.x,z:sh.z}:{x:P.pos.x,z:P.pos.z}; bodyHit(e.rig,e.lastHitFrom.x,e.lastHitFrom.z,part); }
  if(NET.on&&!NET.host){ puff(pt,0x8a1010,6,1.5); hitmark(part==='head'); nsend({t:'ehit',i:e.idx,part,ammo:am.id||'fist',dmg:am.id==='sled'?am.dmg:undefined,px:pt.x,py:pt.y,pz:pt.z,w:curW()?curW().id:'fists'}); return; }
  let dmg=am.dmg; const gear=part==='head'?e.helm:(part==='thorax'?e.armor:null);
  if(gear&&gear.dur>0){ const r=armorRes(gear,dmg,am.pen); dmg=r.d; if(!r.pen){ if(part==='head') dmg=am.dmg*0.32+4; puff(pt,0xffe08a,4,2); if(!by) sfxPlink(); } } // a stopped headshot still rings their bell
  if(part==='legs') dmg*=0.65; if(part==='arm') dmg*=0.7;
  puff(pt,0x8a1010,6,1.5);
  if(e.k.boss){ e.hp-=dmg*(part==='head'?1.8:1)*e.k.dr; } else if(part==='head') e.headHp-=dmg; else e.hp-=dmg;
  if(!by){ hitmark(part==='head'); e.lastW=curW()?curW().id:'fists'; }
  if(e.headHp<=0||e.hp<=0) return killEnemy(e,part==='head',by);
  e.state='combat'; const at=by?R.tgts.find(t=>t.id===by):R.tgts.find(t=>t.id==='me'); if(!e.sees&&at) aiShotFrom(e,at); e.contactT=R.t; const bb=eBel(e); e.lastSeen=bb&&bb.est?{x:bb.est.x,z:bb.est.z}:(at?{x:at.x+rr(-6,6),z:at.z+rr(-6,6)}:null); e.lastSeen0=true; e.lostT=0; if(!e.sees) e.react=Math.min(e.react||0.3,0.3); callout(e);
}
function killEnemy(e,head,by){
  e.dead=true; e.deathT=0; e.killFrom=e.lastHitFrom||null; e.lifeEng=e.engT||0; if(!by){ R.kills++; qKill(e,head); goalKill(e,head); } else nsend({t:'kcredit',pid:by,i:e.idx,kind:e.kind,head:!!head,w:e.lastW}); 
  const who=by&&NET.players[by]?NET.players[by].name:null;
  const text=`${who?who+' killed':'Killed'} ${e.k.name}${head?' · headshot':''}`; msg(text); if(NET.on) nsend({t:'msg',text});
  R.targets=R.targets.filter(m=>!e.parts.includes(m));
  const items=[e.gun, mk(e.gun.ammo,{n:Math.floor(rr(20,60))})]; if(e.armor) items.push(e.armor); if(e.helm) items.push(e.helm);
  items.push(mk('cash',{n:Math.round(rr(...e.k.cash)*R.D.cash/10)*10}));
  const n=Math.round(Math.floor(rr(e.k.loot[0],e.k.loot[1]+0.99))*R.D.loot); for(let i=0;i<n;i++) items.push(mkLoot(localKey(wpick(ELOOT)))); if(rand()<0.035*R.D.loot) items.push(mkLoot(localKey(wpick(KEYPOOL()))));
  if(e.k.special) e.k.special.forEach(id=>items.push(mk(id)));
  if(e.k.boss&&(!NET.on||NET.host)) bossEv({k:'dead'});
  if(e.k.trophy||(e.k.bonus&&rand()<e.k.bonus*R.D.loot)) items.push(mkLoot(wpick(JACKPOT)));
  if(e.k.boss){ items.push(mk('cache'),mkLoot(wpick(JACKPOT)),mkLoot(wpick(JACKPOT))); if(rand()<0.5) items.push(mkLoot(wpick(JACKPOT))); }
  if(e.k.trophy){ items.push(mk(e.k.trophy),mk('cache')); if(rand()<0.5) items.push(mk('cryocell')); }
  else if((['guard','vguard','mguard'].includes(e.kind)&&rand()<0.06)||(e.kind==='raider'&&rand()<0.03)) items.push(mk('cache'));
  if(e.bounty){ items.push(mk('cash',{n:e.bounty})); msg(`Bounty on ${e.k.name} is on the body: ${fmt$(e.bounty)}`); }
  const cid='b'+(NET.id||'s')+'-'+(R.bodyN++);
  if(NET.on) nsend({t:'body',cid,x:e.pos.x,z:e.pos.z,name:e.k.name,items:JSON.parse(JSON.stringify(items))});
  addBody(cid,e.pos.x,e.pos.z,e.k.name,items); { const bc=R.conts[R.conts.length-1]; bc.ally=true; bc.killer=by||'me'; }
}
function addBody(cid,x,z,name,items){ if(cid[0]==='g') return addDrop(cid,x,z,items); const cont={w:8,h:9,items:[]}; for(const it of items){ it.hid=true; place(cont,it); } const corpse=cid[0]==='b'?addCorpse(cid,x,z,name):null; R.conts.push({cid,type:'body',name,x,z,mesh:null,cont,opened:false,body:true,corpse}); }
