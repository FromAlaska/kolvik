// Weapons: every gun and attachment, as seen in your hands
// buildGun() from src/js/55-fx-viewmodel.js builds the same model the first-person view uses. Hold Space (click
// the preview first) to fire at the gun's real rate of fire, with its sound and kick.
const guns = Object.values(ITEMS).filter(d => d.type === 'weapon').map(d => d.id);
const att = slot => ['none', ...Object.values(ITEMS).filter(d => d.type === 'att' && d.aslot === slot).map(d => d.id)];
const p = params({
  gun: guns,
  optic: att('optic'),
  muzzle: att('muzzle'),
  mag: att('mag'),
  spin: [0.4, -3, 3],
  kick: [1, 0, 3],              // how far a shot throws the gun back
});

const w = mk(p.gun);
for (const slot of ['optic', 'muzzle', 'mag']) {
  const id = p[slot]; if (id === 'none') continue;
  if (ITEMS[id].fits.includes(p.gun)) w.att[slot] = mk(id);
  else log(`${ITEMS[id].name} doesn't fit the ${ITEMS[p.gun].name}`);
}
const g = buildGun(p.gun, w); g.name = ITEMS[p.gun].name;
const holder = add(new THREE.Group(), 0, 1.2, 0); holder.name = 'turntable'; holder.add(g);
frame(holder);

let cool = 0, kickT = 0;
onUpdate(dt => {
  holder.rotation.y += dt * p.spin;
  cool -= dt;
  if (keys.Space && cool <= 0) {
    cool = 60 / ITEMS[p.gun].rpm; kickT = 1;
    try { ensureAudio(); sfxShot(p.gun, 0, w.att.muzzle ? 0.35 : 1); } catch (err) {}
  }
  kickT = Math.max(0, kickT - dt * 9);
  g.position.z = kickT * 0.05 * p.kick; g.rotation.x = kickT * 0.07 * p.kick;
  if (g.userData.flash) g.userData.flash.visible = kickT > 0.75 && !w.att.muzzle;
});
