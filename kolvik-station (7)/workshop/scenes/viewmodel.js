// Viewmodel: your hands and gun in first person, every animation
// vmAnimate() and its keyframe tables are in src/js/56-vm-anim.js; the hands and forearms are vmHands() in
// src/js/55-fx-viewmodel.js. Pick an action to loop it, slow it down with the speed control, or drag the time slider
// to a moment. Or click the preview and play: R reload · I inspect · Space fire · Q aim · Shift sprint · W walk ·
// B fire-mode flick · H heal.
const guns = Object.values(ITEMS).filter(d => d.type === 'weapon').map(d => d.id);
const att = slot => ['none', ...Object.values(ITEMS).filter(d => d.type === 'att' && d.aslot === slot).map(d => d.id)];
const p = params({
  gun: guns,
  optic: att('optic'),
  muzzle: att('muzzle'),
  mag: att('mag'),
  action: ['idle', 'reload', 'empty reload', 'inspect', 'fire', 'draw', 'sprint', 'walk', 'heal', 'fire mode'],
  every: [4.5, 1, 10],          // seconds between repeats of the action
  aim: [0, 0, 1],               // aim down sights (0 = hip)
  mouseSway: false,             // pretend the mouse is moving side to side
});

const w = mk(p.gun);
for (const slot of ['optic', 'muzzle', 'mag']) {
  const id = p[slot]; if (id === 'none') continue;
  if (ITEMS[id].fits.includes(p.gun)) w.att[slot] = mk(id); else log(`${ITEMS[id].name} doesn't fit the ${ITEMS[p.gun].name}`);
}
const d = ITEMS[p.gun], ws2 = wstats(w);
ws.lockCamera(58, 0.01);                       // the game's viewmodel camera
const rig = add(new THREE.Group(), 0, 1.6, 0); rig.name = 'camera space';
const g = buildGun(p.gun, w); g.name = d.name; rig.add(g);

const s = vmNew();
let reloadT = 0, reloadTot = 0, empty = false, shells = 0, cool = 0, kick = 0, adsT = 0, useT = 0, bob = 0, uid = 1, lastAct = -99, burst = 0;
const reload = e => { reloadTot = reloadT = d.reload; empty = e; shells = e ? ws2.magSize : Math.max(1, Math.round(ws2.magSize / 2)); };

onUpdate((dt, t) => {
  ws.camera.position.set(0, 1.6, 0); ws.controls.target.set(0, 1.6, -1); ws.camera.lookAt(0, 1.6, -1);
  // the looping action
  const a = p.action;
  if (a !== 'idle' && t - lastAct >= p.every) {
    lastAct = t;
    if (a === 'reload') reload(false); else if (a === 'empty reload') reload(true);
    else if (a === 'inspect') s.inspect = 0; else if (a === 'fire') burst = d.auto ? 0.9 : 0.01;
    else if (a === 'draw') uid++; else if (a === 'heal') useT = 2.4; else if (a === 'fire mode') s.flick = 0;
  }
  // keys
  if (keys.KeyR && reloadT <= 0) reload(false);
  if (keys.KeyI && s.inspect < 0 && reloadT <= 0) s.inspect = 0;
  if (keys.KeyB && s.flick > 0.5) s.flick = 0;
  if (keys.KeyH && useT <= 0) useT = 2.4;
  // fire at the gun's real rate
  burst -= dt; cool -= dt;
  if ((keys.Space || burst > 0) && cool <= 0 && reloadT <= 0 && useT <= 0) { cool = 60 / d.rpm; kick = 1; try { ensureAudio(); sfxShot(p.gun, 0, w.att.muzzle ? 0.35 : 1); } catch (e) {} }
  kick = Math.max(0, kick - dt * 9); reloadT = Math.max(0, reloadT - dt); useT = Math.max(0, useT - dt);
  const sprint = keys.ShiftLeft || a === 'sprint', moving = keys.KeyW || sprint || a === 'walk';
  if (moving) bob += dt * (sprint ? 13 : 9);
  const wantAds = (keys.KeyQ ? 1 : p.aim) * (reloadT > 0 || sprint ? 0 : 1);
  adsT = clamp(adsT + (wantAds > adsT ? dt * ws2.adsSpeed : -dt * 7), 0, 1); if (wantAds > 0 && adsT > wantAds) adsT = wantAds;
  const yaw = p.mouseSway ? Math.sin(t * 1.4) * 0.35 : 0;
  vmAnimate(g, s, { ads: adsT, sightY: g.userData.sightY, sprint, moving, bob, kick, yaw, pitch: 0, uid, id: p.gun,
    reload: reloadT > 0 ? { t: reloadTot - reloadT, total: reloadTot, empty, shells } : null,
    using: useT > 0 ? { t: 2.4 - useT, total: 2.4, id: 'bandage' } : null, cool: Math.max(0, cool), coolTot: 60 / d.rpm }, dt, rig);
  if (g.userData.flash) g.userData.flash.visible = kick > 0.8 && !w.att.muzzle;
});
