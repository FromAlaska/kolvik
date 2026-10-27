// Helicopter: the insertion and extraction heli
// heliModel() from src/js/52-helis-drops.js, with the rotor and tail rotor turning at the game's rates (heliStep).
const p = params({
  rotor: [26, 0, 40],           // radians per second (the game uses 26)
  tail: [40, 0, 80],
  hover: [0, 0, 20],            // height above the snow
  bob: true,
});
const g = add(heliModel()); g.name = 'helicopter';
onUpdate((dt, t) => {
  g.userData.rotor.rotation.y += dt * p.rotor;
  g.userData.tail.rotation.x += dt * p.tail;
  g.position.y = p.hover + (p.bob && p.hover > 0 ? Math.sin(t * 1.3) * 0.25 : 0);
});
