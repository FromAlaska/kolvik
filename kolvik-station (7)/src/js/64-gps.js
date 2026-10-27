/* 64-gps: the raid map and GPS
   M opens the map: the whole raid area drawn from the map's own walls, buildings and terrain, with you, your squad,
   the extracts (green when open), locked rooms (gold lock when you carry the key), task spots, the supply drop and the
   evac. Click to drop a waypoint (right-click clears it), or let it pick the nearest open extract. The GPS plans a
   walking route with the same A* the AI uses and keeps re-planning as you go; the minimap in the corner turns with
   you and shows the route, and the line above it says what's next ("Left in 20 m · North gate 140 m").
   N hides or shows the minimap. Air and race maps get the map and a straight-line pointer instead of a route. */
const GPS={img:1024, mini:168, miniR:46, replan:1.2, offRoute:6};
function gpsInit(){
  const B=Math.max(R.bound+8,(R.navB||0)); const g={B,img:null,wp:null,route:null,routeT:0,line:'',open:false,zoom:1,cx:0,cz:0,drag:null,miniT:0,noRoute:!!(R.airMap||R.race||R.map==='hrimfell')};
  R.gps=g; g.img=gpsImage(B);
}
// the base map, drawn once per raid
function gpsImage(B){
  const N=GPS.img, cv=document.createElement('canvas'); cv.width=cv.height=N; const c=cv.getContext('2d'), s=N/(2*B), P_=(x,z)=>[(x+B)*s,(z+B)*s];
  c.fillStyle='#16242b'; c.fillRect(0,0,N,N);
  // terrain: height shading, sea in blue
  if(R.terrain){ const n=200, cell=N/n; for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const x=-B+(i+0.5)*2*B/n, z=-B+(j+0.5)*2*B/n; let h=0; try{ h=R.terrain(x,z); }catch(e){}
      if(R.sea&&h<0.2){ c.fillStyle=h<-6?'#0c2233':'#123247'; } else if(R.iceAt&&R.iceAt(x,z)>0.5){ c.fillStyle='#2a4a5c'; } else { const k=clamp(h/40,-0.4,1); const v=Math.round(30+k*34); c.fillStyle=`rgb(${v-8},${v+6},${v+10})`; }
      c.fillRect(i*cell,j*cell,cell+0.6,cell+0.6); } }
  else { c.fillStyle='#1b2a31'; c.fillRect(...P_(-R.bound,-R.bound),2*R.bound*s,2*R.bound*s); }
  // the edge of the raid area
  c.strokeStyle='rgba(226,87,74,.45)'; c.setLineDash([6,6]); c.strokeRect(...P_(-R.bound,-R.bound),2*R.bound*s,2*R.bound*s); c.setLineDash([]);
  c.fillStyle='rgba(120,145,155,.18)'; for(const [x,z,w,d] of (R.decor||[])){ const [a,b]=P_(x,z); c.fillRect(a,b,Math.max(1,w*s),Math.max(1,d*s)); }
  // buildings: floor, then the walls on top
  for(const b of R.bld){ const [x,y]=P_(b.x0,b.z0), w=(b.x1-b.x0)*s, h=(b.z1-b.z0)*s; if(b.outline){ c.strokeStyle='#5b7581'; c.lineWidth=2; c.strokeRect(x,y,w,h); c.lineWidth=1; continue; }
    c.fillStyle=b.locked?'#3a3220':'#2a3d46'; c.fillRect(x,y,Math.max(2,w),Math.max(2,h)); }
  // trees and boulders as faint specks, everything built as solid grey
  c.fillStyle='rgba(40,70,52,.55)'; for(const b of R.cols){ if(!b.terrain) continue; const [x,y]=P_((b.x0+b.x1)/2,(b.z0+b.z1)/2); c.fillRect(x-0.6,y-0.6,1.2,1.2); }
  c.fillStyle='#8aa0a8'; for(const b of R.cols){ if(b.terrain) continue; const w=(b.x1-b.x0), d=(b.z1-b.z0); if(w*d>900) continue; const [x,y]=P_(b.x0,b.z0); c.fillRect(x,y,Math.max(1,w*s),Math.max(1,d*s)); }
  // doorways show as gaps in the walls above; mark them so they read at a glance
  c.fillStyle='#9fd4bc'; for(const b of R.bld) for(const [x,z] of (b.doors||[])){ const [a,y]=P_(x,z); c.fillRect(a-1.5,y-1.5,3,3); }
  return cv;
}
function gpsTick(dt){
  if(!R.gps) gpsInit(); const g=R.gps;
  // keep the route fresh: on a timer, or at once if you wander off it
  g.routeT-=dt;
  if(g.wp&&!g.noRoute&&!P.dead){ const off=g.route?gpsOff(g.route):1e9; if(g.routeT<=0||off>GPS.offRoute){ g.routeT=GPS.replan; gpsPlan(); } }
  if(g.wp&&Math.hypot(g.wp.x-P.pos.x,g.wp.z-P.pos.z)<3){ msg(`Arrived${g.wp.name?' at '+g.wp.name:''}.`); sfxBeep(); g.wp=null; g.route=null; }
  g.miniT-=dt; if(g.miniT<=0){ g.miniT=1/30; drawMini(); }
  if(g.open) drawGpsMap();
}
// how far you are from the route line
function gpsOff(rt){ let best=1e9; for(let i=0;i+1<rt.length;i++){ const [ax,az]=rt[i], [bx,bz]=rt[i+1]; const vx=bx-ax, vz=bz-az, L=vx*vx+vz*vz||1; const t=clamp(((P.pos.x-ax)*vx+(P.pos.z-az)*vz)/L,0,1); best=Math.min(best,Math.hypot(ax+vx*t-P.pos.x,az+vz*t-P.pos.z)); } return best; }
function gpsPlan(){
  const g=R.gps; if(!g.wp) return; if(!R.nav) buildNav();
  // the AI's grid only covers the middle of the big open maps: out there, head straight for it
  if(navCell(P.pos.x,P.pos.z)<0||navCell(g.wp.x,g.wp.z)<0){ g.route=[[P.pos.x,P.pos.z],[g.wp.x,g.wp.z]]; g.straight=true; g.direct=true; return; } g.direct=false;
  const path=navPath(P.pos.x,P.pos.z,g.wp.x,g.wp.z,R.nav.n>600?90000:40000);
  if(!path){ g.route=[[P.pos.x,P.pos.z],[g.wp.x,g.wp.z]]; g.straight=true; return; }
  // straighten: keep only the corners you can't see past
  const pts=[[P.pos.x,P.pos.z],...path]; const out=[pts[0]]; let i=0;
  while(i<pts.length-1){ let j=pts.length-1; while(j>i+1&&!navClear(pts[i][0],pts[i][1],pts[j][0],pts[j][1])) j--; out.push(pts[j]); i=j; }
  g.route=out; g.straight=false;
}
function gpsSet(x,z,name){ const g=R.gps; g.wp={x,z,name:name||''}; g.route=null; g.routeT=0; sfxClick(); }
function gpsNearestExtract(){ let best=null, bd=1e9; for(const e of R.extracts) if(e.active){ const d=Math.hypot(e.x-P.pos.x,e.z-P.pos.z); if(d<bd){ bd=d; best=e; } } if(best) gpsSet(best.x,best.z,best.name); else msg('No extract is open yet.'); }
function routeLen(rt){ let L=0; for(let i=0;i+1<rt.length;i++) L+=Math.hypot(rt[i+1][0]-rt[i][0],rt[i+1][1]-rt[i][1]); return L; }
// the next instruction: which way the route bends next, and how far
function gpsInstr(){
  const g=R.gps; if(!g.wp) return ''; const name=g.wp.name||'Waypoint';
  if(g.noRoute||!g.route||g.straight){ const d=Math.hypot(g.wp.x-P.pos.x,g.wp.z-P.pos.z); const rel=_relDeg(g.wp.x,g.wp.z); return `${arrowFor(rel)} ${esc(name)} ${Math.round(d)} m${g.straight&&!g.noRoute?(g.direct?' · open ground, head straight':' · no path found, straight line'):''}`; }
  const rt=g.route, total=routeLen(rt);
  // the first corner at least 3 m ahead
  let acc=Math.hypot(rt[1][0]-P.pos.x,rt[1][1]-P.pos.z);
  for(let i=1;i<rt.length-1;i++){ const a=Math.atan2(rt[i][0]-rt[i-1][0],rt[i][1]-rt[i-1][1]), b=Math.atan2(rt[i+1][0]-rt[i][0],rt[i+1][1]-rt[i][1]); let turn=Math.atan2(Math.sin(b-a),Math.cos(b-a))*180/Math.PI;
    if(Math.abs(turn)>28&&acc>2){ return `${turn>0?'↰ Left':'↱ Right'} in ${Math.round(acc)} m · ${esc(name)} ${Math.round(total)} m`; }
    acc+=Math.hypot(rt[i+1][0]-rt[i][0],rt[i+1][1]-rt[i][1]); }
  return `↑ ${esc(name)} ${Math.round(total)} m`;
}
// bearing of a point relative to where you face, in degrees (+ = to your left)
function _relDeg(x,z){ const a=Math.atan2(-(x-P.pos.x),-(z-P.pos.z)); return Math.atan2(Math.sin(a-P.yaw),Math.cos(a-P.yaw))*180/Math.PI; }
const arrowFor=r=>Math.abs(r)<22?'↑':Math.abs(r)>158?'↓':r>0?(r>90?'↙':'↖'):(r<-90?'↘':'↗');

/* ---- minimap: heading up, about 45 m around you ---- */
function drawMini(){
  const cv=$('#minimap'), ln=$('#gpsline'); const g=R.gps; const show=OPTS.minimap!=='off'&&!P.dead&&!(R.heli&&R.heli.phase==='in');
  cv.hidden=!show; ln.hidden=!show||!g.wp; if(!show) return;
  const c=cv.getContext('2d'), S2=GPS.mini, r=S2/2, zoom=(R.ride||R.fly)?3:1, rad=GPS.miniR*zoom, k=r/rad, B=g.B, s=GPS.img/(2*B);
  c.save(); c.clearRect(0,0,S2,S2); c.beginPath(); c.arc(r,r,r-1,0,7); c.clip(); c.fillStyle='#0e181d'; c.fillRect(0,0,S2,S2);
  // rotate the world so where you face is up
  c.translate(r,r); c.rotate(P.yaw); c.scale(k,k); c.translate(-P.pos.x,-P.pos.z);
  c.imageSmoothingEnabled=false; c.drawImage(g.img,-B,-B,2*B,2*B);
  const dot=(x,z,col,rr)=>{ c.fillStyle=col; c.beginPath(); c.arc(x,z,rr/k,0,7); c.fill(); };
  if(g.route){ c.strokeStyle='#ff9a3a'; c.lineWidth=3/k; c.beginPath(); c.moveTo(P.pos.x,P.pos.z); for(let i=1;i<g.route.length;i++) c.lineTo(g.route[i][0],g.route[i][1]); c.stroke(); }
  for(const e of R.extracts) if(e.active) dot(e.x,e.z,'#7cc9a4',4);
  for(const d of (R.doors||[])) dot(d.x,d.z,d.open?'#6a7a72':'#e8c55a',3);
  for(const id in NET.players){ const st=NET.players[id].st; if(st&&!st.dead&&isMate(id)) dot(st.x,st.z,'#5aa8ff',3.5); }
  if(g.wp) dot(g.wp.x,g.wp.z,'#ff9a3a',4.5);
  c.restore();
  // you, always in the middle pointing up; the waypoint pinned to the rim when it's off the minimap
  c.fillStyle='#ff6b1a'; c.beginPath(); c.moveTo(r,r-8); c.lineTo(r+5.5,r+6); c.lineTo(r,r+3); c.lineTo(r-5.5,r+6); c.closePath(); c.fill();
  if(g.wp){ const d=Math.hypot(g.wp.x-P.pos.x,g.wp.z-P.pos.z); if(d>rad*0.92){ const rel=_relDeg(g.wp.x,g.wp.z)*Math.PI/180; const ex=r-Math.sin(rel)*(r-9), ey=r-Math.cos(rel)*(r-9); c.fillStyle='#ff9a3a'; c.beginPath(); c.arc(ex,ey,5,0,7); c.fill(); } }
  c.strokeStyle='rgba(223,233,236,.35)'; c.lineWidth=1.5; c.beginPath(); c.arc(r,r,r-1,0,7); c.stroke();
  c.fillStyle='#dfe9ec'; c.font='600 11px "JetBrains Mono", monospace'; c.textAlign='center'; const nx=r-Math.sin(-P.yaw)*(r-9), ny=r-Math.cos(-P.yaw)*(r-9); c.fillText('N',nx,ny+4); c.textAlign='left';
  const txt=gpsInstr(); if(ln._t!==txt){ ln._t=txt; ln.innerHTML=txt; }
}

/* ---- the full map (M) ---- */
function gpsToggle(force){
  const g=R.gps||(gpsInit(),R.gps); const open=force!=null?force:!g.open; if(open===g.open) return;
  g.open=open; const el=$('#gpsmap'); el.hidden=!open;
  if(open){ if(R.invOpen) closeInv(true); g.cx=P.pos.x; g.cz=P.pos.z; g.zoom=Math.min(4,Math.max(1,(g.B)/90)); P.trigger=false; P.adsHeld=false; P.keys={};
    if(document.pointerLockElement) document.exitPointerLock();
    el.innerHTML=`<div class="gps-head"><h2>Map</h2><span class="lbl">${esc(MAPS[R.map].name)} · ${fmtTime(R.timeLeft)} left · the raid keeps running</span>
      <span class="sp"></span><button class="btn sm" id="gpsEx">Route to nearest extract</button><button class="btn ghost sm" id="gpsClr">Clear waypoint</button><button class="btn ghost sm" id="gpsClose">Close · M</button></div>
      <div class="gps-body"><canvas id="gpscv"></canvas><aside class="gps-leg"><span class="lbl">Legend</span>
      <div><i style="background:#ff6b1a"></i>You</div><div><i style="background:#5aa8ff"></i>Squad</div><div><i style="background:#7cc9a4"></i>Extract (open)</div><div><i style="background:#56656b"></i>Extract (closed)</div>
      <div><i style="background:#e8c55a"></i>Locked room · you have the key</div><div><i style="background:#8a6a3a"></i>Locked room · no key</div><div><i style="background:#ff9a3a"></i>Waypoint and route</div><div><i style="background:#c08ae0"></i>Task</div>
      <p class="muted">Click to set a waypoint, right-click to clear it. Scroll to zoom, drag to move the map.</p><div id="gpsInfo"></div></aside></div>`;
    $('#gpsEx').onclick=()=>gpsNearestExtract(); $('#gpsClr').onclick=()=>{ g.wp=null; g.route=null; }; $('#gpsClose').onclick=()=>gpsToggle(false);
    const cv=$('#gpscv'); const toWorld=e=>{ const rc=cv.getBoundingClientRect(), W=rc.width, H=rc.height, sc=Math.min(W,H)/(2*g.B)*g.zoom; return [g.cx+(e.clientX-rc.left-W/2)/sc, g.cz+(e.clientY-rc.top-H/2)/sc]; };
    cv.onwheel=e=>{ e.preventDefault(); const [wx,wz]=toWorld(e); const z0=g.zoom; g.zoom=clamp(g.zoom*(e.deltaY<0?1.25:0.8),1,24); const f=1-z0/g.zoom; g.cx+=(wx-g.cx)*f; g.cz+=(wz-g.cz)*f; };
    cv.onpointerdown=e=>{ g.drag={x:e.clientX,y:e.clientY,cx:g.cx,cz:g.cz,moved:false,btn:e.button}; cv.setPointerCapture(e.pointerId); };
    cv.onpointermove=e=>{ const d=g.drag; if(!d) return; const rc=cv.getBoundingClientRect(), sc=Math.min(rc.width,rc.height)/(2*g.B)*g.zoom; const dx=e.clientX-d.x, dy=e.clientY-d.y; if(Math.abs(dx)+Math.abs(dy)>4) d.moved=true; if(d.moved){ g.cx=d.cx-dx/sc; g.cz=d.cz-dy/sc; } };
    cv.onpointerup=e=>{ const d=g.drag; g.drag=null; if(!d||d.moved) return; if(d.btn===2){ g.wp=null; g.route=null; return; } const [x,z]=toWorld(e); const hit=gpsPick(x,z,12/(Math.min(cv.clientWidth,cv.clientHeight)/(2*g.B)*g.zoom)); gpsSet(hit?hit.x:x,hit?hit.z:z,hit?hit.name:''); };
    cv.oncontextmenu=e=>e.preventDefault();
    drawGpsMap();
  } else { el.innerHTML=''; if(!R.noLock&&!R.over&&!R.paused) lockPointer(); }
}
// clicking near an extract, a locked room or a building snaps the waypoint to it and names it
function gpsPick(x,z,tol){ const c=[]; for(const e of R.extracts) c.push({x:e.x,z:e.z,name:e.name}); for(const d of (R.doors||[])) c.push({x:d.x+d.ox*1.2,z:d.z+d.oz*1.2,name:d.L.name}); for(const b of R.bld) if(b.name) for(const [dx,dz] of (b.doors||[]).slice(0,1)) c.push({x:dx,z:dz,name:b.name});
  let best=null, bd=tol; for(const p of c){ const d=Math.hypot(p.x-x,p.z-z); if(d<bd){ bd=d; best=p; } } return best; }
function drawGpsMap(){
  const g=R.gps, cv=$('#gpscv'); if(!cv) return; const W=cv.clientWidth, H=cv.clientHeight; if(!W||!H) return; if(cv.width!==W||cv.height!==H){ cv.width=W; cv.height=H; }
  const c=cv.getContext('2d'), sc=Math.min(W,H)/(2*g.B)*g.zoom, P_=(x,z)=>[W/2+(x-g.cx)*sc,H/2+(z-g.cz)*sc];
  c.fillStyle='#0b1215'; c.fillRect(0,0,W,H); c.imageSmoothingEnabled=g.zoom<3; const [ix,iy]=P_(-g.B,-g.B); c.drawImage(g.img,ix,iy,2*g.B*sc,2*g.B*sc);
  c.font='600 12px "JetBrains Mono", monospace'; c.textAlign='center';
  // names: buildings and areas
  if(g.zoom>1.4||g.B<130){ c.fillStyle='rgba(200,214,220,.75)'; for(const b of R.bld) if(b.name&&!b.locked){ const [x,y]=P_((b.x0+b.x1)/2,(b.z0+b.z1)/2); c.fillText(b.name.toUpperCase(),x,y+4); } }
  if(R.labels){ c.fillStyle='#7f949b'; for(const [n,x,z] of R.labels){ const [a,b]=P_(x,z); c.fillText(n.toUpperCase(),a,b); } }
  // task places on this map
  qEachActive((o,p,i)=>{ if(o.type!=='visit'||p[i]>=1) return; const zz=ZONES[o.zone]; if(zz.map!==R.map) return; const [x,y]=P_(zz.x,zz.z); c.strokeStyle='#c08ae0'; c.lineWidth=2; c.beginPath(); c.arc(x,y,Math.max(6,zz.r*sc),0,7); c.stroke(); c.fillStyle='#c08ae0'; c.fillText('TASK',x,y-Math.max(8,zz.r*sc)-4); });
  // locked rooms
  for(const d of (R.doors||[])){ const [x,y]=P_(d.x,d.z); const have=!!findCarried(it=>it.id===d.L.key); c.fillStyle=d.open?'#6a7a72':have?'#e8c55a':'#8a6a3a'; c.fillRect(x-5,y-2,10,8); c.strokeStyle=c.fillStyle; c.lineWidth=2; c.beginPath(); c.arc(x,y-2,3.5,Math.PI,0); c.stroke(); c.fillText(d.L.name+(d.open?' · open':have?' · key':''),x,y-10); }
  // extracts
  for(const e of R.extracts){ const [x,y]=P_(e.x,e.z); c.fillStyle=e.active?'#7cc9a4':'#56656b'; c.beginPath(); c.arc(x,y,6,0,7); c.fill(); c.fillText(e.name+(e.active?'':' · closed'),x,y-10); }
  if(R.drop&&R.drop.state!=='pending'){ const [x,y]=P_(R.drop.x,R.drop.z); c.fillStyle='#e8c55a'; c.fillRect(x-5,y-5,10,10); c.fillText('Supply drop',x,y-10); }
  if(R.evac&&(R.evac.state==='called'||R.evac.state==='inbound')){ const [x,y]=P_(R.evac.x,R.evac.z); c.fillStyle='#e8c55a'; c.fillText('H · evac',x,y+4); }
  // route and waypoint
  if(g.route){ c.strokeStyle='#ff9a3a'; c.lineWidth=3; c.setLineDash(g.straight?[8,6]:[]); c.beginPath(); let [x,y]=P_(P.pos.x,P.pos.z); c.moveTo(x,y); for(let i=1;i<g.route.length;i++){ [x,y]=P_(g.route[i][0],g.route[i][1]); c.lineTo(x,y); } c.stroke(); c.setLineDash([]); }
  if(g.wp){ const [x,y]=P_(g.wp.x,g.wp.z); c.fillStyle='#ff9a3a'; c.beginPath(); c.moveTo(x,y); c.lineTo(x-6,y-12); c.lineTo(x+6,y-12); c.closePath(); c.fill(); c.beginPath(); c.arc(x,y-14,6,0,7); c.fill(); }
  // squad and you
  for(const id in NET.players){ const pl=NET.players[id], st=pl.st; if(!st||st.dead||!isMate(id)) continue; const [x,y]=P_(st.x,st.z); c.fillStyle='#5aa8ff'; c.beginPath(); c.arc(x,y,5,0,7); c.fill(); c.fillText(pl.name||'',x,y-9); }
  { const [x,y]=P_(P.pos.x,P.pos.z), a=P.yaw; c.save(); c.translate(x,y); c.rotate(-a); c.fillStyle='#ff6b1a'; c.beginPath(); c.moveTo(0,-11); c.lineTo(7,8); c.lineTo(0,4); c.lineTo(-7,8); c.closePath(); c.fill(); c.restore(); }
  c.textAlign='left';
  const info=$('#gpsInfo'); const t=g.wp?gpsInstr():'No waypoint set.'; if(info&&info._t!==t){ info._t=t; info.innerHTML=`<span class="lbl">GPS</span><p>${t}</p>`; }
}
