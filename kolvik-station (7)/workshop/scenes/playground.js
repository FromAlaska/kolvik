// Playground: a tiny game, to show what a scene can do
// Crates fall and bounce, you push them around with a box you drive with WASD and Space to jump. Copy this file to
// start your own: everything from the game is available (M('crate') is the game's crate texture).
const p = params({
  crates: [12, 1, 60],
  gravity: [9.8, 0, 30],
  bounce: [0.45, 0, 0.95],
  speed: [5, 1, 15],
  colour: '#c8641e',
});

const bodies = [];
for (let i = 0; i < p.crates; i++) {
  const m = add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), M('crate')), (Math.random() - 0.5) * 8, 3 + i * 0.9, (Math.random() - 0.5) * 8);
  m.name = 'crate ' + (i + 1);
  bodies.push({ m, vy: 0, vx: 0, vz: 0 });
}
const me = add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.7), MC(hex(p.colour))), 0, 0.6, 5);
me.name = 'player';
const pl = { vy: 0 };

onUpdate(dt => {
  // player: WASD on the ground plane, Space to jump
  const mx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), mz = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
  me.position.x += mx * p.speed * dt; me.position.z += mz * p.speed * dt;
  if (keys.Space && me.position.y <= 0.61) pl.vy = 6;
  pl.vy -= p.gravity * dt; me.position.y = Math.max(0.6, me.position.y + pl.vy * dt); if (me.position.y === 0.6) pl.vy = 0;
  // crates: gravity, bounce on the snow, a shove when the player walks into one
  for (const b of bodies) {
    b.vy -= p.gravity * dt;
    b.m.position.x += b.vx * dt; b.m.position.y += b.vy * dt; b.m.position.z += b.vz * dt;
    if (b.m.position.y < 0.4) { b.m.position.y = 0.4; b.vy = -b.vy * p.bounce; b.vx *= 0.9; b.vz *= 0.9; if (Math.abs(b.vy) < 0.3) b.vy = 0; }
    const dx = b.m.position.x - me.position.x, dz = b.m.position.z - me.position.z, d = Math.hypot(dx, dz);
    if (d < 0.8 && Math.abs(b.m.position.y - me.position.y) < 1) { b.vx += dx / (d || 1) * 3; b.vz += dz / (d || 1) * 3; b.vy += 1.5; }
  }
});
log('Click the preview, then WASD to move and Space to jump.');
