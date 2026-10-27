// Snowmobile: drive one around with WASD
// sledModel() from src/js/70-hrimfell.js. This is a simple drive for looking at the model and its lean, not the
// game's sled physics (those need a map under them; ride one in Hrimfell or Storvidda for that).
const p = params({
  colour: '#b03030',
  power: [12, 2, 30],
  grip: [3, 0.5, 8],
  lean: [0.25, 0, 0.6],         // how far it rolls into a turn
  follow: true,                 // camera follows the sled
});

const g = add(sledModel(hex(p.colour)));
g.name = 'snowmobile'; g.rotation.order = 'YXZ';
const s = { x: 0, z: 0, h: 0, v: 0, steer: 0 };

onUpdate(dt => {
  const thr = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 0.6 : 0), turn = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0);
  s.v += (thr * p.power - s.v * 0.6) * dt;
  s.steer += (turn - s.steer) * Math.min(1, dt * p.grip);
  s.h += s.steer * dt * Math.min(1, Math.abs(s.v) / 4) * Math.sign(s.v || 1);
  s.x -= Math.sin(s.h) * s.v * dt; s.z -= Math.cos(s.h) * s.v * dt;
  g.position.set(s.x, Math.abs(Math.sin(performance.now() / 90)) * 0.02 * Math.min(1, Math.abs(s.v) / 5), s.z);
  g.rotation.y = s.h; g.rotation.z = s.steer * p.lean * Math.min(1, Math.abs(s.v) / 8);
  if (p.follow) {
    const tx = s.x, tz = s.z;
    ws.controls.target.lerp(new ws.THREE.Vector3(tx, 0.8, tz), Math.min(1, dt * 4));
    const back = new ws.THREE.Vector3(tx + Math.sin(s.h) * 5, 2.4, tz + Math.cos(s.h) * 5);
    ws.camera.position.lerp(back, Math.min(1, dt * 2));
  }
});
log('Click the preview, then W/S for throttle and A/D to steer.');
