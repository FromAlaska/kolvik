/* 76-bows: the hunting bow and the compound bow
   Dirt cheap and nearly silent. Hold fire to draw (the longer you hold, up to full draw, the faster and harder the
   arrow flies), let go to loose. Holding full draw slowly tires you. Arrows are real projectiles: they drop, take
   time to arrive and stick in whatever they hit. One arrow at a time: the next is nocked automatically from your rig,
   pockets or pack. Online, other players see your arrows fly (arrow) and barely hear the string. */
function bowTick(w,dt,can){ const d=ITEMS[w.id]; P.draw=P.draw||0;
  const drawing=P.trigger&&can&&!P.down&&w.mag>0&&P.reloadT<=0&&!P.using&&!P.sprint&&!R.cutting;
  if(drawing){ if(P.draw===0) sfxNoise(0.25,400,0.04); P.draw=Math.min(1,P.draw+dt/d.draw); if(P.draw>=1) P.stam=Math.max(0,P.stam-dt*5); }
  else if(P.draw>0){ if(P.draw>0.2&&w.mag>0&&can&&!P.down) loose(w,P.draw); P.draw=0; }
  if(P.trigger&&w.mag<=0&&P.reloadT<=0&&!P.semiLock){ P.semiLock=true; startReload(); }
}
function loose(w,power){ const d=ITEMS[w.id], am=ITEMS[w.ammo]; if(w.mag<=0) return; if(!DBG.ammo) w.mag--; R.fired=true; if(P.grace>0.5) P.grace=0.5; camera.updateMatrixWorld();
  const sp=d.spread*(P.adsT>0.6?0.45:1)*(1.5-power*0.5); _dir.set((rand()-0.5)*2*sp,(rand()-0.5)*2*sp,-1).normalize().applyQuaternion(camera.quaternion); const v=d.speed*(0.35+0.65*power);
  const a={x:camera.position.x+_dir.x*0.4,y:camera.position.y-0.04+_dir.y*0.4,z:camera.position.z+_dir.z*0.4,vx:_dir.x*v,vy:_dir.y*v,vz:_dir.z*v,dmg:am.dmg*(0.35+0.65*power),pen:am.pen*(0.5+0.5*power),id:w.ammo,own:true};
  arrowSpawn(a); sfxTone(170,0.09,0.07,'triangle',80); sfxNoise(0.06,2600,0.06,'bandpass'); P.kick=0.25;
  hearShot(P.pos.x,P.pos.z,6); sendShot(w,null,2,6); nsend({t:'arrow',x:+a.x.toFixed(2),y:+a.y.toFixed(2),z:+a.z.toFixed(2),vx:+a.vx.toFixed(2),vy:+a.vy.toFixed(2),vz:+a.vz.toFixed(2)});
  // nock the next one if there is one
  if(w.mag<=0&&playerConts().some(c=>c.items.some(i=>i.id===w.ammo))) setTimeout(()=>{ if(R&&curW()===w&&w.mag<=0&&P.reloadT<=0) startReload(); },150);
}
function arrowMesh(){ const g=new THREE.Group(); const sh=new THREE.Mesh(new THREE.BoxGeometry(0.012,0.012,0.7),MC(0x6b4a2a)); g.add(sh); const tip=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.02,0.06),MC(0x8a9096)); tip.position.z=0.36; g.add(tip);
  const fl=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.004,0.1),MC(0xc03a2a)); fl.position.z=-0.3; g.add(fl); scene.add(g); return g; }
function arrowSpawn(a){ if(!R) return; R.arrows=R.arrows||[]; a.g=arrowMesh(); a.t=0; R.arrows.push(a); if(R.arrows.length>60){ const o=R.arrows.shift(); scene.remove(o.g); } }
function arrowNet(m){ if(!R) return; arrowSpawn({x:+m.x,y:+m.y,z:+m.z,vx:+m.vx,vy:+m.vy,vz:+m.vz,own:false}); }
const _av=new THREE.Vector3();
function arrowTick(dt){ if(!R.arrows||!R.arrows.length) return;
  for(const a of R.arrows){ if(a.stuck){ a.life-=dt; if(a.life<=0){ scene.remove(a.g); a.gone=true; } continue; }
    a.t+=dt; a.vy-=9.8*dt; const nx=a.x+a.vx*dt, ny=a.y+a.vy*dt, nz=a.z+a.vz*dt; _a.set(a.x,a.y,a.z); _b.set(nx-a.x,ny-a.y,nz-a.z); const L=_b.length(); _b.divideScalar(L||1);
    ray.set(_a,_b); ray.far=L; const hits=ray.intersectObjects(a.own?R.targets:R.ray,false); let stop=null;
    for(const h of hits){ const ud=h.object.userData;
      if(ud.drone){ if(ud.drone.dead) continue; if(a.own) droneHit(ud.drone,{dmg:a.dmg},h.point); stop=h.point; break; }
      if(ud.enemy){ if(ud.enemy.dead) continue; if(a.own) hitEnemy(ud.enemy,ud.part,{dmg:a.dmg,pen:a.pen,id:a.id},h.point); stop=null; a.gone=true; scene.remove(a.g); break; }
      if(ud.player){ const st=NET.players[ud.player]&&NET.players[ud.player].st; if(st&&st.dead) continue; if(a.own){ if(isMate(ud.player)) friendlyFire(ud.player,h.point); else { puff(h.point,0x8a1010,5,1.2); hitmark(ud.part==='head'); nsend({t:'phit',pid:ud.player,part:ud.part,ammo:a.id}); } } a.gone=true; scene.remove(a.g); break; }
      stop=h.point; break; }
    if(a.gone) continue;
    const g=groundAt(nx,nz,ny+0.3); if(!stop&&ny<g){ stop=new THREE.Vector3(nx,g,nz); }
    if(stop||a.t>8){ a.stuck=true; a.life=25; if(stop){ a.g.position.copy(stop); puff(stop,0xc9d2d6,2,0.8); } continue; }
    a.x=nx; a.y=ny; a.z=nz; a.g.position.set(nx,ny,nz); _av.set(nx+a.vx,ny+a.vy,nz+a.vz); a.g.lookAt(_av); }
  R.arrows=R.arrows.filter(a=>!a.gone); }
