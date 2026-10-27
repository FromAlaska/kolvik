// Character: how enemies move
// The real humanoid() from src/js/53-enemies.js posed by bodyAnim() from src/js/58-body.js, the same rig every enemy
// and every other player uses in a raid. BODY at the top of 58-body.js holds the gait numbers (stride, lift, lean...).
// Change any of it and save: the preview reloads with your change.
const p = params({
  kind: Object.keys(EK),        // which enemy type (coat colour and face come from EK)
  helmet: true,
  armor: true,
  boss: false,                  // bosses are drawn 1.45x bigger
  path: ['treadmill', 'circle', 'still'],   // circle: really walks round a 2.5 m circle, so you can see the feet plant (zoom out)
  speed: [1.3, 0, 6],           // m/s: patrol 1.3, searching 2.2, rushing 3.4, the walk turns into a run from 2 to 3.2
  heading: [0, -180, 180, 15],  // degrees between where it walks and where it faces: 90 = strafing, 180 = backpedalling
  crouch: false,
  alert: false,                 // in a fight: soft knees, no looking around
  aim: [0, -40, 40, 1],         // degrees up or down it aims
  reloadEvery: [0, 0, 6],       // seconds between reloads (0 = never)
  hitEvery: [0, 0, 4],          // seconds between hits from the front (0 = never)
  legHit: false,                // hits land on the legs: buckle and limp
  turn: [0.3, -2, 2],           // turntable when still or on the treadmill, radians per second
  dead: false,                  // play the death fall
});

const k = EK[p.kind];
const h = humanoid({
  coat: k.coat,
  face: p.kind === 'chief' || p.kind === 'warden' ? 0xc9a487 : 0x1f2225,
  hat: p.kind === 'chief',
  helm: p.helmet ? 0x3e4a3a : null,
  armor: p.armor ? 0x3b4636 : null,
});
if (p.boss || k.boss) h.g.scale.setScalar(1.45);
h.g.name = k.name; h.lp.name = 'left hip'; h.rp.name = 'right hip';
add(h.g);
const rig = h.rig;
let ang = 0, face = 0, rlT = 0, hitT = 0, wasDead = false;

onUpdate((dt, t) => {
  if (p.dead) { if (!wasDead) { wasDead = true; bodyDie(rig, h.g.position.x - Math.sin(face) * 5, h.g.position.z - Math.cos(face) * 5); } bodyAnim(rig, {}, dt); h.g.position.y = rig.s.fallY; return; }
  if (wasDead) { wasDead = false; Object.assign(rig.s, bodyNew()); h.g.rotation.set(0, face, 0); h.g.position.y = 0; }
  const hd = p.heading * Math.PI / 180;
  let vx = 0, vz = 0;
  if (p.path === 'circle' && p.speed > 0) {
    // walk round the circle; face is the walking direction turned by 'heading'
    const r = 2.5; ang += p.speed * dt / r;
    h.g.position.x = Math.cos(ang) * r; h.g.position.z = Math.sin(ang) * r;
    const mv = Math.atan2(-(-Math.sin(ang)), -(Math.cos(ang)));   // yaw that faces along the circle
    face = mv + hd;
  } else {
    face += dt * p.turn;
    if (p.path === 'treadmill') { const mv = face - hd; vx = -Math.sin(mv) * p.speed; vz = -Math.cos(mv) * p.speed; }
  }
  h.g.rotation.y = face;
  rlT += dt; hitT += dt;
  let reload = -1;
  if (p.reloadEvery > 0) { const tot = 2.6; if (rlT > p.reloadEvery + tot) rlT = 0; if (rlT > p.reloadEvery) reload = (rlT - p.reloadEvery) / tot; }
  if (p.hitEvery > 0 && hitT > p.hitEvery) { hitT = 0; bodyHit(rig, h.g.position.x - Math.sin(face) * 5, h.g.position.z - Math.cos(face) * 5, p.legHit ? 'legs' : 'thorax'); }
  bodyAnim(rig, { yaw: face, vx: p.path === 'treadmill' ? vx : undefined, vz: p.path === 'treadmill' ? vz : undefined,
    crouch: p.crouch, alert: p.alert, aim: p.aim * Math.PI / 180, reload }, dt);
});
