/* 81-loop-input: main loop, keyboard and mouse */
/* ---- loop & input ---- */
let last=performance.now();
function loop(now){
  requestAnimationFrame(loop); const dt=Math.min(0.1,(now-last)/1000)*(DBG.scale||1); last=now;
  if(!R||!scene) return;
  if(P&&P.dead&&!R.over) deathTick(dt); if(!R||!scene) return; // runs even when paused (66-recap.js)
  if(!R.paused&&!R.over){
    R.t+=dt; const tl0=R.timeLeft;
    // online, the server's clock decides when the raid ends, so follow real time even if the frame rate drops
    if(R.endAt) R.timeLeft=(R.endAt-performance.now())/1000; else R.timeLeft-=dt;
    for(const w of [120,60,30]) if(tl0>w&&R.timeLeft<=w){ msg(`${w>=60?w/60+' minute'+(w>60?'s':''):w+' seconds'} left${R.dm?'':': get to an extract or lose everything you carry'}`); sfxBeep(); setTimeout(sfxBeep,180); }
    if(R.timeLeft<=0){ endRaid(P.dead?'kia':'mia',P.dead?R.cause:'The raid timer ran out'); return; }
    updHelis(dt); updEvents(dt); updatePlayer(dt); if(!R||R.over) return; doorsTick(dt); dropsTick(); gpsTick(dt); charSoundsTick(dt); raidMusicTick(dt); goalsTick(dt);
    R.tgts=targets(); if(!NET.on||NET.host) aiTick(dt); for(const e of R.enemies) updEnemy(e,dt); updDrones(dt); if(R.boss&&(!NET.on||NET.host)) updBoss(dt); updMortars(dt); if(R.airMap) updAir(dt); netTick(dt);
    updFx(dt); updSnow(dt); updCulling(dt); updExtract(dt); if(!R||R.over) return;
    if(R.invOpen){ revealTick(dt); if(R.dirty&&!drag){ R.dirty=false; renderRaidInv(); } }
    updHUD(dt);
  }
  if(DBG.tick&&R) DBG.tick(dt);
  if(!R) return;
  renderer.clear(); if(R&&R.fly&&R.fly.tv&&!P.dead){ const bg=scene.background, fd=scene.fog&&scene.fog.density; scene.background=THERM.sky; if(scene.fog){ scene.fog.density=fd*0.35; scene.fog.color.copy(THERM.sky); }
    // vegetation is barely warmer than the snow: lighten it so it comes out mid-grey once inverted
    if(!R.thermV){ R.thermV=[]; for(const o of scene.children) if(o.isInstancedMesh&&o.material&&o.material.color) R.thermV.push([o.material,o.material.color.clone()]); } for(const [m] of R.thermV) m.color.setHex(0x9a9a9a);
    renderer.render(scene,camera); for(const [m,c] of R.thermV) m.color.copy(c); scene.background=null; scene.overrideMaterial=THERM.hot; camera.layers.set(1); renderer.autoClear=false; renderer.render(scene,camera); renderer.autoClear=true; camera.layers.set(0); scene.overrideMaterial=null; scene.background=bg; if(scene.fog){ scene.fog.density=fd; scene.fog.color.copy(bg); } } else renderer.render(scene,camera); if(vmGun&&vmGun.visible){ renderer.clearDepth(); renderer.render(vmScene,vmCam); }
}
requestAnimationFrame(loop);
addEventListener('keydown',e=>{
  const tg=e.target; if(tg&&(tg.tagName==='INPUT'||tg.tagName==='SELECT'||tg.tagName==='TEXTAREA')) return;
  if(drag&&e.code==='KeyR'){ e.preventDefault(); rotateDrag(); return; }
  if(!R||R.over||R.paused&&e.code!=='Escape') return;
  if(e.code==='Space'&&R.heli&&R.heli.phase==='in'){ e.preventDefault(); R.heli.t=R.heli.T; return; }
  if((e.code==='Enter'||e.code==='KeyT')&&NET.connected&&!R.invOpen&&!R.chatOpen){ e.preventDefault(); openRaidChat(); return; }
  if(e.code==='KeyM'&&!R.chatOpen){ e.preventDefault(); gpsToggle(); return; }
  if(R.gps&&R.gps.open){ if(e.code==='Escape'||e.code==='Tab'){ e.preventDefault(); gpsToggle(false); } return; }
  if(e.code==='Tab'){ e.preventDefault(); if(R.invOpen) closeInv(); else openInv(null); return; }
  if(e.code==='Escape'){ if(R.invOpen) closeInv(true); if(R.noLock&&!R.paused) showPause(); return; }
  if(R.invOpen){ if(e.code==='KeyE') closeInv(); return; }
  if(P.dead){ if(R.spec&&e.code==='Space'){ e.preventDefault(); specNext(); } return; }
  P.keys[e.code]=true;
  switch(e.code){
    case 'KeyR': startReload(); break;
    case 'Digit1': if(R.airMap&&R.fly){ seatSwap(0); break; } if(S.eq.primary&&P.slot!=='primary'){ P.slot='primary'; P.reloadT=0; } break;
    case 'Digit2': if(R.airMap&&R.fly){ seatSwap(1); break; } if(S.eq.secondary&&P.slot!=='secondary'){ P.slot='secondary'; P.reloadT=0; } break;
    case 'Digit3': if(R.airMap&&R.fly){ seatSwap(2); break; } if(P.slot!=='fists'){ P.slot='fists'; P.reloadT=0; P.adsHeld=false; } break;
    case 'ControlLeft': case 'ControlRight': e.preventDefault(); P.sneak=!P.sneak; msg(P.sneak?'Sneaking: quiet and harder to spot':'Walking normally'); break;
    case 'KeyB': { const w=curW(); if(w&&ITEMS[w.id].auto){ P.auto=!P.auto; msg(P.auto?'Full auto':'Semi auto'); if(P.vm) P.vm.flick=0; } break; }
    case 'KeyI': if(curW()&&P.vm&&P.reloadT<=0&&!P.using&&P.adsT<0.1&&!(R.fly&&!R.fly.hand)) P.vm.inspect=P.vm.inspect>=0?-1:0; break; // inspect your weapon (again to stop)
    case 'KeyC': if(!P.down) P.crouch=!P.crouch; break;
    case 'KeyN': OPTS.minimap=OPTS.minimap==='off'?'on':'off'; saveOpts(); msg(OPTS.minimap==='off'?'Minimap hidden (N)':'Minimap on (N)'); break;
    case 'KeyG': if(R.airMap&&R.fly) break; if(R.gps){ if(R.gps.wp){ R.gps.wp=null; R.gps.route=null; msg('Waypoint cleared.'); } else gpsNearestExtract(); } break;
    case 'KeyQ': if(R.fly&&R.fly.tv){ const tv=R.tv||(R.tv={w:0,z:1,cool:0,load:[0,0]}); tv.w=1-tv.w; msg(`${TVW[tv.w].name} selected`); break; } break;
    case 'KeyZ': if(R.airMap&&R.fly){ const pl=R.planes[R.fly.i]; if(pl&&!pl.onG&&(R.fly.seat===0||!pl.crew[0])){ if(pl.ap&&!e.shiftKey) apToggle(pl,false); else apToggle(pl,true,e.shiftKey); } else if(pl&&pl.onG) msg('Autopilot works once you are airborne.'); } break;
    case 'KeyV': if(R.airMap&&R.fly){ OPTS.chase=!OPTS.chase; saveOpts(); R.stick={x:0,y:0}; if(R.fly.seat===0){ const pl=R.planes[R.fly.i]; if(pl){ planeAxes(pl); P.yaw=Math.atan2(-_pf.x,-_pf.z); P.pitch=Math.asin(clamp(_pf.y,-1,1)); } } msg(OPTS.chase?'Chase camera: the plane flies toward where you point. V for the cockpit.':'Cockpit: the mouse is your stick, A/D rudder. V for the chase camera.'); } break;
    case 'Space': if(P.crouch) P.crouch=false; else P.jumpReq=true; break;
    case 'KeyX': if(R.airMap&&R.fly&&R.planes[R.fly.i]&&!R.planes[R.fly.i].onG) bailOut(); break;
    case 'KeyE': { if(R.airMap&&airKey()) break; if(R.sleds&&rideKey()) break; if(R.nearDoor&&!R.near){ doorUse(R.nearDoor); break; } const c=R.near||nearestCont(); if(c) openInv(c); break; }
    case 'Digit4': if(R.airMap&&R.fly){ seatSwap(3); break; } hotUse(d=>d.med==='bandage'); break;
    case 'Digit5': if(R.airMap&&R.fly){ seatSwap(4); break; } hotUse(d=>d.med==='splint'); break;
    case 'Digit6': hotUse(d=>d.med==='heal'); break;
    case 'Digit7': hotUse(d=>d.type==='warm'); break;
  }
  if(['Space','ArrowUp','ArrowDown','ControlLeft'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup',e=>{ if(P) P.keys[e.code]=false; });
addEventListener('blur',()=>{ if(P){ P.keys={}; P.trigger=false; P.adsHeld=false; } });
const cvEl=$('#cv');
cvEl.addEventListener('mousedown',e=>{ if(R&&R.spec&&!R.over){ specNext(); return; } if(!R||R.over||R.invOpen||(R.gps&&R.gps.open)||R.paused||P.dead) return; if(!document.pointerLockElement&&!R.noLock){ lockPointer(); return; } if(e.button===0){ P.trigger=true; } if(e.button===2) P.adsHeld=true; });
addEventListener('mouseup',e=>{ if(!P) return; if(e.button===0){ P.trigger=false; P.semiLock=false; } if(e.button===2) P.adsHeld=false; });
cvEl.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('wheel',e=>{ if(R&&R.fly&&R.fly.tv){ const tv=R.tv||(R.tv={w:0,z:1,cool:0,load:[0,0]}); tv.z=clamp(tv.z+(e.deltaY>0?-1:1),0,TVZ.length-1); } },{passive:true});
addEventListener('mousemove',e=>{ if(!R||R.over||R.invOpen||(R.gps&&R.gps.open)||R.paused||!P||P.dead) return; if(document.pointerLockElement===cvEl||R.noLock){ const s=0.0022*OPTS.sens*(P.fov/72); if(R.fly&&R.fly.seat===0&&!OPTS.chase){ const st=R.stick||(R.stick={x:0,y:0}); st.x=clamp(st.x+e.movementX*s*1.3,-0.6,0.6); st.y=clamp(st.y-e.movementY*s*1.3,-0.6,0.6); return; } P.yaw-=e.movementX*s; P.pitch=clamp(P.pitch-e.movementY*s,-1.45,1.45); } });
