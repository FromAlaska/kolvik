// Player: how you look to everyone else
// The same humanoid() as the scavs (src/js/53-enemies.js), dressed by lookOpts() and addHeadgear() from
// src/js/20-cosmetics.js, exactly as other players and the Operator tab see you, and moved by remotePose() /
// bodyAnim() from src/js/58-body.js the way other players see you move. Pick any cosmetic below.
// Note: humanoid() builds every person in the game, so a change there changes scavs and bosses too.
const bySlot = s => Object.values(COSM).filter(c => c.slot === s);
const pick = s => ['default', ...bySlot(s).map(c => c.name)];
const p = params({
  coat: pick('coat'),
  pants: pick('pants'),
  head: pick('head'),
  mask: pick('mask'),
  gloves: pick('gloves'),
  helmet: [0, 0, 6, 1],         // helmet class worn (0 = none); shows over the headgear
  armor: [0, 0, 6, 1],          // armor class worn (0 = none)
  move: ['walk', 'sprint', 'crouch', 'still', 'on a sled'],
  look: [0, -40, 40, 1],        // degrees you're looking up or down (other players see your gun and head follow it)
  turn: [0.3, -2, 2],
});

const id = (s, name) => name === 'default' ? COS_DEF[s] : bySlot(s).find(c => c.name === name).id;
const fit = { coat: id('coat', p.coat), pants: id('pants', p.pants), head: id('head', p.head), mask: id('mask', p.mask), gloves: id('gloves', p.gloves) };
const h = humanoid(Object.assign(lookOpts(fit, p.helmet, p.armor), { ud: {} }));
h.g.name = 'player'; h.lp.name = 'left hip'; h.rp.name = 'right hip';
add(h.g);

// a stand-in for an online player's state, walking on a treadmill
onUpdate(dt => {
  h.g.rotation.y += dt * p.turn;
  const sp = { walk: 3.5, sprint: 5.9, crouch: 1.9 }[p.move] || 0, y = h.g.rotation.y;
  bodyAnim(h.rig, { yaw: y, vx: -Math.sin(y) * sp, vz: -Math.cos(y) * sp, crouch: p.move === 'crouch', aim: p.look * Math.PI / 180, alert: true, sit: p.move === 'on a sled' }, dt);
});
