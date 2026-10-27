// Aircraft: the Skylark, Hauk and Storm, and the supply-drop plane
// planeModel() from src/js/72-skjaergard.js (props spin at the throttle the game uses) and dropPlaneModel() from
// src/js/52-helis-drops.js. Turn on "fly" to send it round in a banked circle.
const p = params({
  type: [...Object.keys(PT), 'supply'],
  team: ['own colour', 'Vestholm blue', 'Austholm red'],
  throttle: [0.6, 0, 1],
  bank: [0, -70, 70],           // degrees
  pitch: [0, -30, 30],
  turrets: [0, -1, 1],          // swing the Storm's turrets
  fly: false,
});

let g;
if (p.type === 'supply') g = dropPlaneModel();
else g = planeModel(p.type, p.team === 'Vestholm blue' ? 0x4a6b8a : p.team === 'Austholm red' ? 0x8a4a3a : PT[p.type].col);
g.name = p.type === 'supply' ? 'supply plane' : PT[p.type].name;
g.rotation.order = 'YXZ';
add(g);

onUpdate((dt, t) => {
  const spin = dt * (8 + p.throttle * 40);
  if (g.userData.prop) g.userData.prop.rotation.z += spin;
  for (const pr of g.userData.props || []) pr.rotation.z += spin;
  (g.userData.turrets || []).forEach((tg, i) => { tg.rotation.y = p.turrets * (i % 2 ? -1 : 1) * 1.2; });
  g.rotation.x = p.pitch * Math.PI / 180;
  if (p.fly) {
    const R0 = 60, w = 0.25, a = t * w;
    g.position.set(Math.sin(a) * R0, 25, Math.cos(a) * R0);
    g.rotation.y = a - Math.PI / 2; g.rotation.z = -0.5;
  } else {
    g.position.set(0, 0, 0); g.rotation.y = 0; g.rotation.z = -p.bank * Math.PI / 180;
  }
});
