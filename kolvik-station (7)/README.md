# Kolvik Station

Browser extraction shooter: PS1-style arctic research station, Tetris-grid inventory, body-part damage,
a cash economy with a trader, hideout and build kits, and PvPvE online raids.

## Run it

```sh
docker compose up -d --build
```

Then open `http://<server-ip>:8080`. Solo raids work the moment the page loads; the **Online** buttons on the
Deploy tab appear when the page is served by this server.

Without Docker:

```sh
npm install
node server.js          # PORT=8080 by default; builds game.html from src/ on startup
DEV=1 node server.js    # rebuilds whenever anything in src/ changes (new files too): edit, save, refresh
```

To change the game, edit the files in `src/` (see *Files* at the end) and either restart the server, run
`node build.js`, or use `DEV=1`. Keep your own `docker-compose.yml` and copy `src/` along with the other files
when you upgrade.

## How online raids work

- **Lobbies.** On the Deploy tab, *Host a lobby* (or *Host lobby* on a map card) opens a lobby everyone on the
  server can see. Others press *Join*. The leader picks the map; changing it un-readies everyone.
- **Ready up.** Every member, leader included, presses *Ready up*. The leader's *Start raid* button unlocks only
  when all are ready, and pressing it drops the whole lobby into the same raid. The Black Ice Vault fee is checked
  before you can ready up.
- **Join in progress.** A lobby that is already in a raid shows *Join raid* while at least 90 seconds remain.
- **After the raid.** The lobby reopens (everyone un-ready) once the last member is out, so the same group can go again.
- **Chat.** The Radio panel has two channels: *Everyone* (all players at the hideout) and *Lobby*. In a raid,
  press Enter or T to talk to the other players in that raid. Five messages per five seconds per player.
- **PvPvE with squads.** Everyone outside your squad is hostile, other players in your lobby included. Dead players
  drop a lootable body with everything they carried except the secure pouch.
- The map is generated from a seed the server hands out, so every player sees the same buildings, containers
  and starting loot. Taking an item is settled first-come on the server.
- **The raid clock is the server's.** Online, the timer counts real time from the server, so a slow frame rate or a
  backgrounded tab can't make your clock lag behind. You get warnings at 2 minutes, 1 minute and 30 seconds. If the
  clock runs out before you extract, you're missing in action and lose what you carried (secure pouch aside).
- One player runs the AI (the "host"). If they leave, the server hands that job to the next player.
- **Accounts.** Register with a name and password from the header. Your stash, cash, hideout and stats are then
  saved on the server (in `kolvik.sqlite` on the `kolvik-data` volume, `/app/data` inside the container) and follow
  you to any browser. Without an account, progress stays in that browser's local storage. Passwords are hashed with
  scrypt; there is no password reset, so keep backups (see *Storage and backups*).
- **Leaderboard.** Accounts that have finished a raid are ranked by net worth, extracts, survival rate, AI kills,
  player kills, best haul and raids (click a column to sort). Player kills are counted by the server (`pvp.json`);
  the other numbers come from each player's save, so they are only as honest as your friends.

## The AI

When an enemy spots you or gets shot it shouts: its own group and anyone within about 18 m join in. Everyone else only
hears about it on the radio, late and roughly, and only a couple of them come to look (see *Who knows what* below), so
one sighting doesn't bring the whole map down on you. Break line of sight and they don't forget you: some hold the angle where you
vanished and fire the moment you peek again, others swing wide to flank where they think you went, and they keep
hunting for about 40 seconds after their last clue. How they work that out is below (*How enemies think*). Raiders and guards often carry armor-piercing rounds, better plates and helmets, and guns with
attachments, all of which they drop.

Fair fights at range:
- **Sight follows the fog.** An enemy can't spot you any deeper into the fog than you could spot them (about 50 m on
  an overcast day at Kolvik, farther on clear days, much less in a blizzard).
- **Distance slows them down.** Noticing you takes longer the farther away you are.
- **Aim settles.** Their first shots at you go wide and get tighter the longer they keep you in sight. Settling takes
  longer at range, and faster on harder difficulties.
- **Range hurts accuracy.** Accuracy drops off steeply past about 30 m.
- **Hit direction.** Red marks around the crosshair point at whoever just hit you; pale ones show near misses.

## Difficulty

Pick **Normal**, **Hardened** or **Brutal** on the Deploy tab for solo raids; in a lobby the leader picks it (changing it
un-readies everyone) and it shows next to the lobby in the list.

| | Enemies | Health | Reactions / aim | Loot | Cash |
|---|---|---|---|---|---|
| Normal | as built | 100% | normal | 100% | 100% |
| Hardened | ~30% more | 125% | 20% faster, 12% more accurate, more AP rounds | ~145% | 150% |
| Brutal | ~60% more | 150% | 38% faster, 25% more accurate, AP rounds everywhere | ~200% | 220% |

On Ironfjord Depot (no AI) difficulty only changes the loot.

## Kaldfjord Reach: the big one

2.2 km by 2.2 km, about three times Storvidda and 30 minutes long. A frozen fjord runs across the south, with the
town of Kaldfjord in the middle (town hall, church, store, hotel, police station, clinic, fuel station, houses) and
its harbor out on the ice, run by **Harbormaster Vinter** (a new boss with a Kestrel). Around it: a mine in the north
(processing plant, mine office, headframe, barracks), a radar base in the east (ops building, radar dome, bunker,
motor pool), a fishing village in the west, an old airstrip with a hangar, a research station with an observatory
across the fjord, and six huts and wrecks out in the hills. Locked rooms: the police evidence room, the mine payroll
office and the radar armory. About 75 enemies, five recon drones, and dense forest between the settlements.

You insert on a snowmobile at the edge (ten insertion pads); three of six extracts are open, all out at the edges,
so the map (M) and the GPS (G) earn their keep here. The AI's walking grid covers the middle 1.2 km where all the
settlements are; out past it the GPS points straight.

## Snowmobile race: Hrimfell Run

PvP only (like Ironfjord, the lobby needs at least two sides). Everyone starts at the summit on their own snowmobile;
the loot camp is at the bottom of an 800-metre run. The raid lasts 12 minutes.

The mountain is generated from fractal noise: ridged, domain-warped noise builds the massif, the groomed run and the
camp are carved into it as a corridor, steep faces are coloured as exposed rock, forests thin out with height, and a
ring of distant peaks makes the skyline. The run itself only has gentle bumps, so the physics and what you see agree.

- **Driving:** W throttle, S brake and reverse, A/D steer, the mouse looks around. Top speed is about 140 km/h downhill.
  Drivers can only use a sidearm.
- **Crashing:** hit a tree, rock, fallen log or building fast, or fall into a crevasse, and you're sent back to the
  summit on a fresh sled. Slow bumps just stop you. The run has four jumps (blue poles); two of them have a crevasse
  right after, which you clear at about 65 km/h or more, or go around through the gap at one side. A third crevasse has
  a narrow bridge in the middle. The HUD shows your speed, how far you are down the run, your crashes and your
  position in the race.
- **Physics:** the sled is simulated as a set of differential equations, solved with 4th-order Runge–Kutta at
  240 steps a second. The state is position, height and vertical speed, heading, forward speed, sideways slip and yaw
  rate. Each step adds up the forces:
  - the skis and track as a bicycle model: grip comes from slip angles and is limited by friction times load. The
    skis let go a little before the track, so pushing too hard washes the nose wide;
  - engine thrust limited by both power and track traction, plus brakes;
  - rolling resistance, snow sinkage at low speed, and air drag (quadratic in speed);
  - gravity along the slope, taken from the terrain's gradient;
  - suspension as a spring and damper. When the ground load hits zero you're airborne, and landing hard (vertical
    impact into the slope) is a crash.

  **Steering assist:** A and D ask for a turn rate, not full lock, the way a rider feathers the bars. At low speed you
  can turn tightly; at 100 km/h you get a long, stable arc. Let go and the sled straightens itself. The camera keeps
  your head mostly level, so going over bumps and banks doesn't throw the view around.

  Traversing a steep bank for too long rolls you. The jumps with a crevasse after them have a speed window: too slow
  and you drop in, too fast and the landing is too hard. You start in a lane near the middle of the run and obstacles
  begin about 35 m down, so steer.
- **Squads:** walk up to a squadmate's sled and press E to ride on the back with any weapon. If your driver crashes,
  you both go back to the top. E hops off.
- **The camp:** a lodge with vault safes and guard lockers, a lift station, a garage, a ski shed and a fuel hut, all
  richer than normal. E gets off your sled (once you're slow) and gets back on. Valley road and Ski lift are both open,
  so the first ones down can loot and leave, and the ones behind them can try to stop them.

## Storvidda: open tundra, snowmobiles in, snowmobiles out

A 1.3 km square plateau of generated terrain: rolling hills and ridges from layered, domain-warped noise, forests that
follow their own noise field and thin out on steep ground, boulders, a frozen lake, and a ring of far peaks. Hills
block both sight lines and bullets, so the approach is a real approach.

- **Inserts:** eight pads around the edge. You start on your own snowmobile, facing the middle. Squadmates spawn beside
  you on their own sleds, or hop on the back of yours with a rifle.
- **The relay:** the Storvidda Relay sits in the centre, 500 m from every insert: a radio mast, a relay hall with vault
  safes, a barracks, a garage, a bunker and a fuel depot behind concrete cover. Relay Chief Dahl and his guards hold
  the hall; raiders and scavs hold the rest. Normal, Hardened and Brutal apply.
- **On the way:** a hunter's cabin, a pump station and a fishing hut on the lake, each lightly held.
- **Extracts:** four on the far edges, two open per raid, so plan to ride back out. The sled stays where you leave it
  (E gets off and on), so park it somewhere you can get back to.
- **Crashing** here doesn't reset you. Hit a tree, a rock, a wall or a steep bank at speed and you're thrown off,
  take damage (and maybe a broken leg), and the sled sits on its side for a few seconds before you can remount.
- **Raid length:** 15 minutes. The HUD shows your speed while driving.

The terrain is built from the same noise functions as Hrimfell. Every pad (the relay, the outposts, the lake, each
insert and extract) is flat at height 0 and the hills blend up from the pad edges, so buildings, loot and AI all sit on
solid ground. The mesh is cut into 80 m tiles so bullets and sight checks only test the ground near them, enemies stand
on the terrain, and the AI's navigation grid covers the middle 700 m where the fighting is.

## Skjærgård: aircraft, two teams, islands

A 3 km square of sea with seven islands. Two teams (Skjold and Hauk) each have a home island with a 440 m runway,
a hangar, a tower, a barracks and a fuel dump. The village island in the middle, the lighthouse island and the seal
hunters' skerry hold loot and a few scavs and raiders; the rest are empty. Twenty-minute raids.

- **Teams:** in the lobby everyone is put on the smaller side as they join (squads stay together); *Switch to …*
  changes side, and the leader picks how many AI pilots fly for each side (none, two or four). Solo, you're on
  Skjold against the AI. Everyone on your side is a mate: no friendly fire, shared markers, revives.
- **Aircraft** are lined up on the apron. Walk up to one and press E:
  - **Skylark** light plane: two seats and a light machine gun. The passenger uses their own gun from the seat.
  - **Hauk** fighter: one seat, twin machine guns (700 rounds).
  - **Storm** heavy bomber: five seats. Pilot (with two chin guns), nose gun, dorsal gun, tail gun, and the
    gunship sensor in the belly. Ten bombs (G). It takes a lot of hits.
  - **Gunship sensor (seat 5 on the Storm):** a stabilised thermal camera looking down from the aircraft, like an
    AC-130's sensor operator. White-hot FLIR: snow and sea come out dark, buildings grey, people bright white. The
    mouse aims (it stays pointed at the ground as the plane turns), click fires, **Q** switches between the 25 mm
    cannon and the 105 mm gun (one shell every 4.5 s, big blast), and the scroll wheel zooms (38°, 18°, 8°). Shells
    take a moment to arrive. If you move there from the pilot's seat in the air, the autopilot circles for you;
    with a friend flying, ask them to orbit.
- **Flying:** W/S throttle, S with the throttle closed brakes on the ground, A/D steer the nose wheel on the ground,
  left click fires. Two views, **V** switches:
  - *Cockpit:* the view is fixed to the aircraft and rolls and pitches with it. The mouse is the stick: push it up
    for nose up, sideways to roll, and it springs back to centre when you stop moving it. A/D is the rudder. Hands
    off and the wings ease back toward level.
  - *Chase:* a camera behind the aircraft that rolls and pitches with it. The mouse moves an aim point (the blue
    diamond) and the plane banks and pulls toward it; A/D add roll.
  Gunners and passengers look relative to the aircraft. The HUD shows speed, altitude, throttle, airframe, guns
  and bombs. Take off by lining up on the runway, full throttle, and looking up once you're past about 130 km/h (the
  fighter leaves the ground in 120 m, the bomber in 250 m); hold the nose 10–15° above the horizon to climb. The HUD
  shows your climb rate. Too slow or too steep and you stall (the HUD says so). 
- **Landing:** line up with the runway a long way out (2 km is comfortable), throttle back to about a quarter so
  the speed settles just above the yellow band on the airspeed tape, and let the plane sink at 2–4 m/s (the vertical
  speed bar should sit just below the line). Keep the wings level and the nose level or slightly up. Over the
  threshold, close the throttle, hold the nose up a touch, and let it settle. Once it's rolling, S brakes. You need:
  a runway or a flat island top under you, wings within about 20° of level, sinking slower than 8 m/s, nose between
  about 10° down and 20° up, and speed under about twice the stall speed. Anything else is a crash, and the sea is
  always a crash.
- **Instruments:** an artificial horizon with pitch ladder and bank pointer, airspeed tape with the stall band in
  red and the slow band in yellow, altitude tape, vertical speed bar, heading strip, throttle, angle-of-attack bar
  (it goes red as you approach the stall), airframe, guns and bombs, and STALL / SLOW / PULL UP warnings. A ring
  gunsight shows where the guns point. **V** switches between the cockpit and a chase camera.
- **Flight envelope protection:** the nose only rises as far as the wing can carry at your current speed, so
  hauling the mouse up at low speed gives you the best climb you can get rather than a stall. If the aircraft is
  going to hit water or ground within about four seconds (and it isn't a runway or a flat island top), it pulls up
  on its own and says so. You can still stall by flying too slowly, and a steep enough dive still hits. Both protections can be
  switched off in Settings (Terrain pull-up, Stall protection); with pull-up off you still get the warning, just no
  help.
- **Warmth:** a cockpit or turret is out of the wind, so you warm up while flying. The Skylark's passenger seat
  is open to the air and gets cold like being outside.
- **Autopilot:** Z (once airborne) holds your heading and height, with terrain clearance and a turn back at the
  edge of the chart; Shift+Z circles instead. Move the stick or press Z to take control back.
- **Changing seats:** while aboard, 1 is the pilot's seat and 2–4 are the gun positions (or the Skylark's
  passenger seat). Leave the controls in the air and the autopilot takes over, so a lone Storm pilot can climb
  into a turret and fight. Back to 1 to fly again.
- **Ground fire:** soldiers on the ground can only engage aircraft that are low (under about 35 m) and nearly
  overhead, and their bullets hit the airframe, not you. The Skylark's open passenger seat is the exception.
- **Bailing out:** X leaves the aircraft with a parachute. Steer with WASD on the way down. Land in the sea and
  you'll freeze unless you get ashore quickly.
- **Damage:** machine-gun hits chip the airframe; at 0% the plane blows up and everyone aboard is killed in action.
  Bombs hurt anyone within 18 m on the ground, and bomb a parked plane to wreck it. Destroyed aircraft come back on
  the apron after a minute.
- **Flight model:** lift from angle of attack with a soft stall, induced and parasite drag, thrust that tails off
  with speed, and control authority that needs airspeed. The pilot's machine simulates their own aircraft, the host
  simulates the AI pilots, and everyone else renders what they're sent.
- **AI pilots** patrol the far side's island, chase the nearest enemy aircraft, fire in bursts when lined up, break
  off when they overshoot, and pull up when they get low.

## Boss raid: Fort Ravnskar

A co-op map: everyone in the raid is on the same side, lobby or not. Nobody can shoot anybody else, everyone sees
everyone's markers, and anyone can revive or loot anyone who's down. Solo works too.

- **Jarl Hrafn** sleeps in the keep at the north end of the fort until someone gets close, shoots him, or half the raid
  is gone. Then a health bar appears for everyone. He's 1.45× normal size with a belt-fed machine gun, takes reduced
  damage (more from headshots), and his health scales with the number of players and the difficulty.
- **Phases.** At two thirds health he calls a wave of huskarls through the gates; at one third he's enraged (faster
  fire, more mortars) and calls another wave. All fight long he drops **mortar strikes**: a red circle on the ground
  where a player is standing, and two and a half seconds later it explodes. Move.
- **Loot.** His body carries his machine gun (Jarl's machine gun: 60-round belt-fed 7.62R, takes optics and a
  suppressor), heavy armor, two cryo cells, gold, diamonds, a sealed cache and rare extras. The three **hoard chests**
  in the keep stay sealed until he dies. A flare extract opens in the courtyard when he falls.
- **Bounty.** Every player in the raid when he dies gets $20,000 (scaled by difficulty) and two sealed caches,
  paid when they extract alive. Cliff road and Sea stairs are open the whole raid.
- Task: *The Iron Jarl* (Ilse, after *The foreman*).

## How enemies think

Enemies don't know where you are unless they sense you. Each enemy team keeps a shared guess and plans from it, in
four layers (all in `src/js/57-ai.js`):

1. **Where are you? (a particle filter).** The team's guess is 160 "maybe he's here" points spread over the map's
   walkable cells. Every quarter second each point moves the way a player could move: keep running, turn, or stop and
   hold still. Then everything the team senses reweights the points:
   - *Seeing you* pins the guess to where you are, and a small tracker (an alpha-beta filter, a light Kalman filter)
     learns your speed and heading so they can lead you around a corner.
   - *Footsteps* and *gunshots* give a rough position, rougher the farther away they are.
   - *Getting shot* gives only a direction: the shooter is somewhere along that line.
   - *Not seeing you* counts too. Every point an alert enemy is looking at and finds empty is thrown out, so a room
     they've cleared stops pulling them back.

   The densest patch is their best guess. The next few patches become the places they search, so if you could have
   gone two ways they split up and check both. They never get your real position from the game unless they can see
   you.
2. **What should I do? (utility states).** Each enemy scores engage, take cover, suppress, hold the angle, flank,
   search and fall back, from its health, ammo, distance, how sure the team is, how long since anyone saw you, and
   what its squadmates are already doing, and picks the best. A squad spreads out: one holds, one flanks, one searches,
   instead of all doing the same thing. A small bonus for the current choice stops them flip-flopping.
3. **How do I get there? (tactical A\*).** Routes use the same A\* as normal movement, but cells your best guess can
   see cost more, so they approach through cover. Cover is a nearby hidden cell next to a cell that can see you (a
   peek spot). A flank point is off to the side of the guess, with a line of fire to it.
4. **Getting better (a genetic algorithm).** Scavs and trained enemies (raiders, guards, PMCs) each have a population
   of 12 "personalities": aggression, flanking, patience, caution, suppression, focus fire, peeking and how far they
   call for help. Every raid hands personalities out to the enemies and scores each by how much it hurt you, how
   long it lived and whether it got the kill. After each raid the next generation is bred from the best (tournament
   selection, the two best kept as they are, blend crossover, small random mutations), so over many raids they
   lean into whatever works against how *you* play. The populations are saved in the browser of whoever runs the AI
   (the host in online raids). Bosses keep their hand-made behavior.

5. **Who knows what (groups and radios).** Enemies that spawn near each other are a group and share one picture of
   where you are. Other groups only know what reaches them:
   - a **shout** carries about 18 m (30 m within the group);
   - a **radio** report (raiders, guards, mine guards, huskarls, bosses; scavs have no radios) arrives 1.5–3.5 s late
     and only says roughly where you were (about ±8 m). You can hear the chatter if you're close to the ones receiving
     it;
   - the group that hears it sends **at most two** people to check, the rest just get **wary** (they face that way,
     see a bit further and wider, react faster) for about 45 s; across the whole map only 2–5 enemies (by
     difficulty) are ever sent after one person at once.
   - A **radio jammer** in your gear (rare loot, or the trader at loyalty 3) turns every radio within 40 m of you to
     static and cuts recon drone links there. Enemies that hear the static get wary.
6. **Bodies.** An enemy that comes across a dead comrade stops, shouts, radios it in ("man down": others get wary,
   nobody new is sent), walks over, crouches by the body and looks around, then searches the places a shooter could
   have fired from (anywhere with a line of sight to the body). An old body someone already reported just makes them
   wary.
7. **Recon drones** (see *Drones* below) find people from the air and report them over the same radio.

Kept fair on purpose:
- Evolution changes *tactics* only. Accuracy, reaction time and aim settling never evolve, so harder enemies come
  from difficulty, not from the GA.
- They only aim at you when they can actually see you. Suppressing fire at a guessed spot only hurts if the bullet's
  path really passes you.
- Turn it off with Settings → *Enemies learn* → Off: everyone then uses the starting personality and nothing is saved.

Watching it work (admins, F9 → AI): **What they think** draws each team's guess as orange dots (brighter = more
likely), their best guess as a red ring and where the tracker predicts you as a purple square; the F10 overlay shows
each enemy's current choice. **Old AI (compare)** switches back to the previous chase-the-last-seen-spot behavior so
you can feel the difference. The **Adaptive AI** panel below shows both populations, the average of each gene and
fitness by generation, with *Breed a generation now* and *Forget what they learned* (asks twice).

Measured in a test harness that hid or ran a player away from a squad and timed how long they took to find him again
(20 runs each): with three enemies, ten seconds after losing you the new guess was off by about 3 m where the old
last-seen spot was off by about 12 m; a player running away was found again in about 1.9 s instead of 2.3 s. The
whole brain costs about a third of a millisecond per frame with a dozen alert enemies.

## Drones

Recon quadcopters patrol Kolvik, Whiteout, Skarsvik, Storvidda and Kaldfjord Reach (one to five, more on harder
difficulties). They never shoot: they look, and they tell. A drone that sees you holds off about 26 m, circles, and
radios your position every second; ground groups nearby send a couple of people (see *Who knows what*). At most two
drones go after one person; the rest keep searching.

Each drone is flown by a small brain laid out like circuits from the fruit fly connectome (the FlyWire map of a
fruit fly's brain):
- **Eye:** 16 columns around the drone, each reporting a small moving target in its slice of view: stronger when
  you move or sprint, weaker crouched, nothing through walls, roofs or past the fog.
- **Lobula:** lateral inhibition between columns sharpens that into one bearing.
- **Compass (ring attractor):** a bump of activity in a ring of 16 neurons holds the drone's heading. Turning pushes
  the bump round (each drone's sense of its own turning is a few percent off, so it drifts), the ring's wiring keeps
  it in one piece, and the sky pulls it back. In a blizzard the sky is weak and the compass drifts more. The drone
  steers by this compass, not the true heading.
- **Goal and steering (PFL3):** a second bump holds the heading it wants; two populations compare it with the compass
  shifted ±45° and the difference is the turn command, the way flies steer to a goal.
- **Looming (giant fibre):** aiming down your sights at it from close, or shots going past, builds up a looming
  signal; past a threshold it darts sideways and up.
- **Memory (mushroom body):** it remembers where it found people and which patches it searched recently, and leans
  its search toward likely, unvisited places.
- **Behaviour** works like a fly following a scent: Lévy-flight searching (mostly short hops, now and then a long
  one), a surge toward a cue (a gunshot within a few hundred metres, a snowmobile engine within 250 m, or a fresh
  radio report), tracking, then zigzag casting around where it lost you, wider each pass. On a low battery it flies
  home, lands and recharges.

You hear them coming (a buzz you can place), see their red, green and white lights, and can shoot them down (45 HP).
A wreck holds a drone camera, a battery, and sometimes a jammer or a server blade. *Drone hunter* on the Goals tab
counts the kills.

## Dropping things

In a raid, drag anything onto **Drop on the ground** (or press *Drop on the ground* in its details) and it lands at
your feet in a small bag; drops close together share a bag. Anyone can press **E** at a bag to pick things up, other
players online included, and empty bags disappear. In the hideout, throwing things away still deletes them.

## AI navigation

Every raid builds a walkability grid from the map's walls and furniture (half-metre cells, a bit coarser on Skarsvik),
and the AI plans routes over it with A*, walks straight whenever nothing is in the way, picks patrol points only on open
ground, and replans or gives up a patrol point if it gets stuck.

## Loot

Containers roll about 25% more items, the weapon crates, desks, lockers, safes and cargo lean toward better gear, and
any container has a small chance of a rare extra (gold, thermal cameras, sensors, top-tier armor, scopes). Bodies
carry more ammo, more cash and more valuables, and raiders, guards and bosses can carry a rare extra too. Every
supply drop has a guaranteed rare extra and a sealed cache.

More to find: cigarettes, caviar, a polar service medal, a brass compass, field binoculars, a fox pelt, a walrus ivory
carving, a rangefinder camera, server blades, a ruggedized laptop, an encrypted drive and, very rarely, a meteorite
fragment; and useful things: hand warmers and hot meal rations (body heat, hotkey 7), a tourniquet (a one-second
bleed stop, hotkey 4), a combat medkit (hotkey 6), a muzzle brake (less recoil on the Vintik, AKR and Kestrel) and
lockpicks. The trader sells the supplies, the brake and lockpicks; the valuables only come from raids.

## Locked rooms and keys

Every map except the Vault has one to three small concrete rooms with a steel door and a red lock light, next to a
landmark: the Lab cold store and the Comms server room at Kolvik, the church crypt, town hall archive and tower
strongroom on Skarsvik, the warehouse cage and mess hall pantry at Ironfjord, the Jarl's powder magazine at Ravnskar,
the relay vault and bunker armory on Storvidda, the trading post safe room and chapel vestry on the Skerries, the
lodge cellar on Hrimfell, and a depot and fuel cage somewhere on Whiteout. Inside are strongboxes, weapon racks and
supply shelves with about a third more loot than anything else on the map.

- **Keys** turn up in desks, lockers, safes, cargo, supply drops and on bodies, usually one for the map you're on.
  Each works a few times (it shows *4/5* on the item) and is worth more the fresher it is. Keep the good ones.
- **E at the door** unlocks it in about a second if the key is anywhere in your gear. The light turns green, the door
  swings in, and it stays open for everyone in the raid (and anyone who joins later). The AI can walk through it too.
- **Lockpick set:** with no key, E at the door picks the lock: six seconds of scratching that nearby enemies can hear,
  and a pick can snap (three picks per set).
- The map (M) marks every locked room: gold if you carry its key.

## Map and GPS

**M** opens the map of the raid: drawn from the map itself (walls, buildings, doors, terrain and sea), with you,
your squad, the extracts (green when open), locked rooms, your task spots, the supply drop and the evac. Scroll to
zoom, drag to move. Click to drop a waypoint (it snaps to an extract, a locked room or a building door and takes its
name), right-click to clear it, or press *Route to nearest extract*. The raid keeps running while it's open.

The GPS then plans a walking route with the same A* the AI uses, re-plans every second or so and whenever you leave
the route, and shows it on the **minimap** (bottom right, turning with you, about 45 m around you, wider on a
snowmobile or in an aircraft). The line above it says what's next: *↰ Left in 20 m · North gate 140 m*. **G** routes
to the nearest open extract (G again clears it), **N** hides or shows the minimap. On the open tundra outside
Storvidda's middle, and on the air and race maps, it points straight at the waypoint instead.

## Goals, titles and the collection log

The **Goals** tab tracks long-term goals across every raid, and keeps them through season wipes: extracts, kills,
headshot kills, different bosses killed, locked rooms opened, different keys brought home, maps extracted from, km on
foot, valuables collected, your best single haul, containers searched, extracts without firing, and extracts in a
blizzard. Each has three or four tiers; claim each tier on the tab for cash, sealed caches, scrip, a lockpick set,
cosmetics you can't get from caches (the Veteran and Cartographer parkas, Trailbreaker trousers, a Locksmith's cap,
Frost skull and Ghost balaclava masks, Hunter gloves, and Brass and Starfall weapon skins), and **titles**. Pick the
title you want to show; other players see it in gold under your name.

The **collection log** fills in as you extract with things you haven't brought home before (only what you found, not
what you took in), grouped into valuables, keys, weapons, armor, attachments, supplies and relics. The results screen
lists anything new.

## Sounds of people

Footsteps for every enemy and player you can hear, one per foot as it lands: snow crunch outside, hard taps indoors,
louder running and nearly silent crouching, with some kit rattle. They're placed in the world: panned to where they
are, quieter with distance, duller behind you, muffled through walls. Enemies talk: each has its own voice, made from
vowel sounds so it sounds like speech you can't quite make out. They shout when they spot someone and call to their
squad, call a reload (and you hear the magazine), mutter when they lose you, grunt when hit and groan when they go
down; raiders and guards key a radio first, and calm ones cough, sniff and mutter on patrol. You grunt when you're
hit, your heartbeat comes up when you're badly hurt, and you breathe hard when you're out of stamina.

## Maps, conditions and events

- **Ironfjord Depot** is the PvP map: a rail freight depot on a frozen fjord with no AI at all. Ten-minute raids,
  eight insertion points around the edge, rich loot in the warehouse, signal box, boxcars and container yard, and two of
  four extracts open. It's online only: there is no solo button, and the leader can't start the raid until the
  lobby has at least two sides (two players who aren't in the same squad).
- Squads now drop in together at the same insertion point on every map (a few metres apart; on Skarsvik each
  helicopter lands beside the other).
- **Kolvik Station**, **Whiteout**, **Black Ice Vault** ($5,000 entry) and **Skarsvik Island**, a ~570 m island with a
  mining town, a mine held by Foreman Rask, an airstrip and hangar, a crashed cargo plane (its cockpit always holds the
  flight recorder), a radar plateau and a frozen harbor. A helicopter flies you in (Space jumps out early), and halfway
  through, an evac helicopter lands somewhere on the island and waits 100 seconds.
- **Skjærgård** is the air map: two teams, runways, three aircraft types, AI pilots (see above).
- **Storvidda** is the big one: a 1.3 km plateau of generated terrain with snowmobile inserts at the edge and a
  fortified relay 500 m away in the middle (see its own section above).
- **Raid conditions rotate every 3 hours** and are shown on each map card: weather (clear, overcast, blizzard, aurora
  night) plus one modifier (hot zone with double loot in a named building, raider patrol, power outage, guaranteed
  supply drop, quiet day, or a $5,000 bounty on the boss). Every player sees the same conditions; nothing needs to be
  stored for this.
- **Supply drops**: a plane flies over and a crate parachutes down under a red flare. The crate holds top-tier gear and
  goes to whoever reaches it first.

## Tasks

The Tasks tab has a chain of 18 tasks from Quartermaster Ilse and Dr. Aune (kill, extract, reach a place, hand over items),
with cash, gear and trader-loyalty rewards, plus three daily tasks that change every day (UTC). Progress counts during the
raid even if you die afterwards; hand-over items come from your stash.

## Operator: cosmetics and sealed caches

The **Operator** tab dresses your character and skins your guns: parka, trousers, headgear, mask, gloves and a skin per
weapon (59 items across five rarities), with a 3D preview you can drag to turn. Cosmetics never change stats. Other
players see your outfit in online raids, and your gloves and gun skin show on your own first-person hands.

- **Sealed caches** are earned only by playing; there is nothing to buy. You get one for your first extraction each
  day, one per daily task, one every 10th career extraction, and some from tasks. In raids they sit on boss bodies
  (always), in supply drops (always), sometimes on raiders and guards, and sometimes in lab safes, vault safes and
  cargo crates. A cache found in a raid only counts if you extract with it, and it will not fit in the secure pouch.
- **Odds** are shown on the tab: Uncommon 60%, Rare 28%, Very rare 9%, Legendary 3%. A Very rare or better is
  guaranteed at least every 10 caches and a Legendary at least every 30. You never get a duplicate until you own every
  item of that rarity; after that, duplicates turn into scrip. Every cache also gives 10 scrip.
- **Scrip** makes any specific cosmetic directly (60 / 150 / 350 / 800 by rarity).
- Cosmetics, unopened caches and scrip survive season wipes.

## End game: the Armory

Each boss drops a trophy (Halvorsen's keycard, Brekke's signet, Rask's lamp), a sealed cache and, half the time, a
**cryo cell**. Cryo cells also turn up in supply drops, vault safes and cargo crates. Build the **Armory** in the hideout
($40,000) to turn them into relic gear:

| Build | Needs | Result |
|---|---|---|
| Wraith helmet | keycard, 1 cryo cell, Glacier helmet, $20,000 | class 6 helmet |
| Relic pouch | signet, 1 cryo cell, $25,000 | secure pouch grows to 3×3 |
| Isbjørn armor | lamp, 2 cryo cells, Arctic Warden armor, $30,000 | class 6 armor, halves heat loss |
| Nordlys battle rifle | all three trophies, 2 cryo cells, Kestrel DMR, $50,000 | full-auto 7.62R rifle, 20 rounds |

The final task, **Relic hunter** (after *The Warden's keys*), asks you to build the Nordlys and get 10 kills with it.
It pays $50,000, five caches and the Nordlys parka, hood and weapon skin, which can't be found anywhere else. Relic
gear is normal gear: lose it in a raid and it's gone, and it is wiped with the season. "Sell all" on the haul never
sells trophies, cryo cells, caches or relic gear; they go to the stash instead.

## Seasons

Every `SEASON_DAYS` (default 30) the server ends the season: the leaderboard is archived into the **Hall of Fame**
(champion by net worth, top 5, most kills, most extracts, best haul), player-kill counts reset, and every player's stash,
cash, hideout and tasks are wiped the next time they open the game. Career totals carry over. To end a season early, set
`ADMIN_TOKEN` and call:

```sh
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" http://<server>:8080/api/admin/season/next
```

Season state and the hall of fame live in the database (`season` and `hall` in the `kv` table).

## Friends, messages and squads

All of this needs an account (guests can still use lobbies and the *Everyone* channel).

- **Friends tab.** Add people by the username they registered with. They accept or decline from their Friends tab.
  The list shows who is offline, at the hideout, in a lobby (with a *Join lobby* button), or in a raid with the map
  and time left.
- **Direct messages.** Click a friend to open the conversation. Messages are stored on the server (last 200 per pair,
  in the `dms` table of the database), so friends who were offline see them with an unread count when they sign in.
- **Squads (up to 4).** *Invite* an online friend; they get a card in the corner with *Join squad*. Squad members can't
  hurt each other, see each other's names in green with a distance marker on the HUD, and follow the leader: when the
  leader hosts or joins a lobby, everyone in the squad who is at the hideout comes along. Only the leader picks lobbies.
  The leader can hand over leadership or remove members.
- **Squad markers.** In a raid, each squadmate has a green diamond over their head with name and distance, visible
  through walls; when they are off screen it sticks to the screen edge pointing their way.
- **Down, not dead.** If you take a killing blow while another squadmate is still up, you go down instead: you can crawl,
  but not shoot, heal or open your pack, and the AI stops shooting you. You bleed out after 60 seconds, and other
  players can still finish you. A squadmate holds **F** next to you for 4 seconds to get you back up with every body
  part at 30% or better. If every squadmate is down or dead, you die.
- **Looting a downed squadmate.** Press **E** next to them to take their guns, helmet, armor and anything in their
  pockets, rig or pack (not the secure pouch). It's take-only, and whoever grabs an item first gets it.
- **Spectating.** When you die and a squadmate is still alive in the raid, you watch through their eyes instead of
  leaving. Space or a click switches squadmate, *Leave raid* goes to the results, and if the whole squad is gone the raid
  ends for you automatically. Your gear is already lost at that point; spectating changes nothing on the results.
- **Jumping.** Space jumps, enough to get onto crates and low walls.
- **Chat in a raid.** Press Enter or T. Tab switches between *Squad* and *All* (everyone in the raid), `@name message`
  sends a direct message to a friend, and `/r message` replies to the last friend who messaged you. Direct messages and
  squad chat also work during solo raids.
- Friend lists live in the database (`social` in the `kv` table).

## How people move

**You.** Speed builds up over about a quarter second and drops off a little quicker; a sprint takes a moment more to
wind up, and changing direction carries a little momentum. You can barely steer in the air, and a hard landing
dips the camera and slows you for a moment. The camera bob follows your real footsteps: a dip each time a foot lands
(that's when you hear the step, and left and right sound slightly different), a sway toward the standing foot and a
slight roll, bigger when sprinting and smaller crouched or aiming. Strafing leans the view a touch, a sudden stop nods
it, sprinting widens the field of view a little, and the gun tilts toward a strafe and dips after a landing. When
you're low on stamina your aim rises and falls with slow, deep breaths you can hear; rest and it settles. All the
numbers are in `PMOVE` at the top of the movement code in `src/js/61-player.js`.

**Everyone else** (scavs, bosses and other players) is moved by one rig in `src/js/58-body.js`:
- Legs have knees, and each foot is placed with IK, so a foot on the ground stays planted while the body goes over
  it. The gait goes from a walk to a run with speed (shorter ground contact, higher knees, longer stride, more lean).
- The hips turn toward where they're going while the chest keeps facing where they look, so strafing and
  backpedalling look right; the hips and shoulders counter-twist on each step, the pelvis rises over the standing leg,
  and they lean into turns and against sudden stops. Turning on the spot shuffles the feet.
- Enemies speed up and slow down instead of starting and stopping instantly, and slow for sharp corners.
- They aim up and down at you (the gun and arms tilt together, so the arms keep their angle on the gun), the gun kicks
  when they fire, and a reload takes the left hand down to the pouch and back.
- They crouch behind cover while reloading, holding an angle or waiting in cover, and stand to move. Their eyes and
  gun go down with them, so a crouched enemy sees and shoots only what its head can see.
- A hit knocks the chest away from the shot (a head shot snaps the head); a leg hit buckles the knee and leaves a limp
  for a few seconds, a little slower. Killed, their knees go and they fall away from the shot.
- When calm they breathe, shift their weight and glance around.
- Other players see your gun follow where you look, and your crouch, sprint and sled seat.

The gait numbers (stride, foot lift, lean, crouch depth) are in `BODY` at the top of `58-body.js`; the workshop's
*Character* scene shows every one of them live.

## Weapon handling

Your hands are on the gun in first person: gloves from the Operator tab, forearms in your coat sleeve.
- **Reloads differ by weapon.** Rifles and SMGs tilt, your left hand strips the magazine and brings a fresh one up
  and seats it with a slap; from empty it then racks the charging handle. The Makar drops its mag, takes a new one
  and, from empty, has its slide racked. The Tundra feeds shells one at a time (as many as it needs) and pumps at
  the end if it was empty. The Nord opens its bolt, presses rounds in and closes it.
- **Between shots** the Nord works its bolt and the Tundra pumps; the Makar's slide kicks back.
- **I inspects your weapon:** it comes in and turns to show one side, then the other, with a mag check (a press check
  on the pistol, a bolt lift on the Nord, a short pump on the shotgun). Aiming, firing, reloading or sprinting stops it.
- A draw when you switch weapons, the gun lagging a little behind your mouse, breathing at rest, a figure-eight walk
  bob, a smooth swing into the sprint, a tilt when you change fire mode (B), and your free hand bringing up the
  bandage, kit or thermos while the gun goes down.

All of it is keyframed in `src/js/56-vm-anim.js` (one table per animation, times from 0 to 1 through the action);
the workshop's *Viewmodel* scene loops any of them for any gun so you can tune them live.

## Settings

The header and the pause menu have a Settings panel, saved per browser: muzzle flash (Full, Reduced, Off; Reduced is
the default), hit effects (Full or Reduced), mouse sensitivity, whether enemies learn from your raids (see *How
enemies think*), the minimap, and music in raids.

**Music in raids** (Off, Quiet, Normal; Quiet is the default): a quiet score under the raid, not a tune to follow. A
low string pad changes chord every ten seconds or so with a far-off celesta or harp note now and then. When an enemy
nearby is hunting you a slow heartbeat drum and a cello drone come in; when you're seen, shot at or shooting, a soft
cello ostinato and frame drum push it along. It ducks under your own gunfire, eases back to calm a while after things
go quiet, and each map has its own key. The music volume slider scales it too.

Hideout music: seventeen original pieces synthesized in the browser, with piano, violins, cellos, choir, timpani, French horns,
harp, celesta, a Hardanger fiddle, a frame drum, and for the Russian pieces balalaika, contrabass balalaika, gusli,
bayan (button accordion), church bells, a low male choir and a buben (tambourine). The plucked strings are
Karplus-Strong string models, so they actually ring and decay like strings, and each bell is computed once per pitch
and then replayed from a sample, so a fast peal stays light:
- *Station Chant*, *Frost Line*, *Aurora*, *Ice Road*: the original four.
- *Hardanger*: a halling (a Norwegian folk dance in 6/8) in D dorian. A fiddle over open-string drones, plucked
  chords and a frame drum, with a second fiddle a third below on the repeats. For the mountain.
- *Open Sky*: F major with a lifting Lydian chord, harp arpeggios and a horn tune that the strings and timpani take
  up. For the islands and the aircraft.
- *Polar Night*: slow A minor, sparse piano, celesta and a cello line. For the hideout.
- *Storvidda March*: G minor, horns over a snare and pulsing low strings, the second strain on strings, then
  everyone.
- *Zvon*: an Orthodox chant in D minor. The great bell and a bass drone, the chant in unison, then in three parts,
  with a full peal (little bells chattering, middle bells, the great bell) taking over at the end.
- *Steppe Wind*: a long-drawn A minor song. Balalaika tremolo over gusli arpeggios and contrabass, then the tune on
  bayan with a second balalaika a third below and the choir humming.
- *Birch Waltz*: an E minor bayan waltz with oom-pah-pah in the left hand, balalaika chords in the second strain, the
  tune passed to balalaika tremolo, and a slowing at the end.
- *Trepak*: a dance that starts as a slow balalaika verse and then runs away with itself, 126 bpm accelerating to
  about 190, with bayan, plucked balalaika, buben and the odd shout.
- *Vespers*: G minor. A deacon intones on one note and the choir answers three times, then the evening hymn in four
  parts, sung again with octavists (basses an octave under the bass line) and the bell tower.
- *Perezvon*: the funeral toll, every bell struck once from the smallest to the largest, under an E minor lament
  that is sung in octaves and then in parts; every bell at once to close.
- *Trezvon*: festival ringing. The tower builds up alone, a bright D major hymn over it, the full tower at full tilt,
  the hymn once more.
- *Night Vigil*: the slowest and deepest, A minor at 42 bpm. A distant bell and octavists, a long chant in unison
  over the drone, then in parts.
- *Zvon (Long)*: about four minutes. It opens as Zvon, then the peal stays: a second chant joins it, the bells ring
  alone and the ringer speeds up from 52 to 96 bpm, the chant comes back over the fast peal and climbs to a climax
  with the whole choir and every bell, then it slows to the great bell and a last run down the little bells.
Pick a track, play order and volume in Settings; *Next ›* in the header skips.

Opening caches: *Full* (the whole spin), *Short* or *Instant*, also in Settings.
Short string cues play on the results screen after a raid.

## Debug tools (admins only)

Set `ADMINS` to a comma-separated list of account names, for example `- ADMINS=jim` under `environment:` in
docker-compose.yml, then rebuild. Those accounts get a **Debug** button in the header and **F9** opens the panel anywhere.
Everyone else never receives the debug code: the server only hands `debug.js` and `item-tests.js` to a signed-in admin, and the admin API
answers "No such call" to anyone else.

- **Raid:** god mode, infinite ammo, freeze AI, time scale (0.25× to 2×), add time, heal, go down or die on purpose,
  extract now, open every extract, open every locked room, keys for this map, trigger the supply drop or evac, kill all AI, boss controls (wake, next phase, mortar
  on me, kill), and a map you click to teleport.
- **AI:** an overlay (F10) that labels every enemy with its state, role, health, group, whether it can see you, was
  sent by radio, is wary or is checking a body, and every drone with its mode, battery and how far its compass is off; a
  *Drones* table with *Launch a drone near me* and *Down all drones*. The overlay also draws
  the path it is following; a view of the cells the AI treats as blocked around you; spawn any enemy type; pick the
  enemy under your crosshair to inspect, freeze, teleport to or kill it (including its personality and how it scored
  each choice); pathfinding counters; *What they think*, *Old AI (compare)* and the *Adaptive AI* panel (see *How
  enemies think*).
- **Player / Items:** cash, caches, scrip, every cosmetic, max hideout and loyalty, finish or reset tasks, new dailies,
  copy or load your save, wipe it; give yourself any item, plus end-game and relic-material kits.
- **World:** force the seed, weather and modifier for your next solo raid.
- **Map & sled:** live-editable world tuning that the server stores (`world` in the database) and hands to
  every raid that starts afterwards, so everyone in a raid builds the same map:
  - *Snowmobile handling:* engine power, brakes, ski and track grip and friction, yaw damping, drag, mass, steering
    lock, turn rate, max yaw rate and self-straightening. *Try now* changes the sled under you immediately so you can
    feel it before saving.
  - *Storvidda layout:* insert radius, extract radius, relay pad radius, hill height and size, tree density, rock count.
  - *Insert points:* add inserts where you are standing, move one to where you stand, teleport to one, or clear the
    list to get the standard eight back. Every insert faces the relay.
  - *Placed objects:* put a tree, boulder, drift, concrete cover, shipping container, crate, cargo crate, locker,
    toolbox, medical cabinet or wooden hut where you stand (cover and containers face the way you look; huts get their
    own flat pad). They sit on the terrain, block bullets and movement, and count as sled obstacles.
  - *Save* sends it to the server and tells every connected player; raids already running keep their own version.
- **Server:** who is online, lobbies and raids in progress, kick a player, end a raid, message everyone, send cash /
  caches / scrip / an item to any account (arrives instantly if they're online), end the season.
- **Log:** network traffic, errors in your browser, and uncaught errors reported by every player's browser (each
  browser sends at most 20 per page load; the server keeps the last 200 in memory and prints them to the container log).
- **Tests:** runs every item through the game's own code and lists what fails (see *Testing items*).
- **Debug HUD:** frame rate, draw calls, AI counts, pathfinding counters and network rate while you play.

The game is still client-authoritative: a determined player can edit their own save with the browser console, debug
menu or not. The leaderboard numbers come from saves, so treat them as friendly.

## Workshop: live previews of characters, objects and animations

`/workshop` is a small editor and engine for working on the game's models and animations without playing a raid.
The preview runs **the game's own code**: everything in `src/js/` is loaded (the game just doesn't start), so a
scene that calls `humanoid()` and `bodyAnim()` shows exactly what the game draws. Change the code, save, and the
preview reloads with your change in about two seconds, keeping the camera, the scene and its parameters.

**Turn it on** (it's off unless you ask for it, and only admins can use it):

```sh
# on your own PC, from the project folder
npm install
WORKSHOP=1 ADMINS=yourname node server.js      # or: npm run workshop   (DEV=1 turns it on too)
# then open http://localhost:8080/workshop

# on the server, with Docker: mounts your src/ and workshop/ folders so saves land in your files
sudo docker compose -f docker-compose.yml -f docker-compose.workshop.yml up -d --build
# then open http://<server>:8090/workshop, and go back to normal with: sudo docker compose up -d --build
```

Sign in with an account listed in `ADMINS` (the workshop has its own sign-in; it also signs you in to the game).

**The screen:** scenes and the game's source files on the left, a code editor in the middle (syntax highlighting,
Ctrl+F find, Ctrl+/ comment), and on the right the 3D preview with playback controls, then three tabs:
*Parameters* (sliders, toggles, colours and lists the scene declares), *Scene tree* (everything in the scene; click
a part in the preview or the list to see its position, rotation and scale update live while it animates, type new
values to try them, *Copy as code* for the line to paste) and *Console* (your `log()` output and every error, with
links to the file and line).

**The loop:**
- *Edit a scene* and press **Ctrl+Enter** to run it at once (no save needed), **Ctrl+S** to save.
- *Edit game code* (`src/js/…`) and **Ctrl+S**: the server rebuilds and the preview reloads. Saving from your own
  editor (VS Code etc.) on the same machine does the same, and the workshop's editor picks up the change.
- A **syntax error** never reaches the preview: the workshop shows the file and line, marks the file red and keeps
  showing the last good build. A **runtime error** (in game code or a scene) pauses the preview and shows where it
  happened in your source file, not in the built page.

**Playback:** play/pause (P), one frame (.), restart (R), speed 0.1× to 4×, and a time slider that jumps to a moment
(it rebuilds the scene and plays it forward). *Pivots* marks the groups the game rotates to animate (hips, rotors,
turrets). *Game look* renders at the game's 300-pixel height with its vertex wobble, *Wire* shows the boxes, *Frame*
(F) points the camera at the selection, *PNG* saves a picture. Drag to orbit, right-drag to pan, wheel to zoom.

**Example scenes** (`workshop/scenes/`):
- *Character*: every enemy type from `EK`, moved by the game's `bodyAnim()`: speed from a patrol walk to a sprint,
  strafing or backpedalling (heading), crouch, alert stance, aim up or down, reloads, hits to the chest or legs, and
  the death fall; on a treadmill, or walking a real circle so you can watch the feet plant.
- *Player*: you as other players see you: `humanoid()` dressed by `lookOpts()` with any coat, pants, headgear, mask and
  gloves from the Operator tab, plus helmet and armor class.
- *Viewmodel*: your hands and gun in first person, looping any animation (reload, empty reload, inspect, fire,
  draw, sprint, walk, heal, fire mode) for any gun and attachments, or played with the keys (R, I, Space, Q, Shift, W, B, H).
- *Weapons*: every gun from `buildGun()` with any optic, muzzle and magazine; hold Space to fire at the gun's real
  rate with its sound and kick.
- *Aircraft*: Skylark, Hauk, Storm and the supply-drop plane, props at your throttle, bank and pitch, turret swing,
  or flying a banked circle.
- *Snowmobile*: drive `sledModel()` around with WASD.
- *Helicopter*: the rotor and tail rotor at the game's rates, hovering.
- *Playground*: a tiny game (falling crates, a box you drive and jump) to show what a scene can do.

**Writing a scene.** *+ New* starts one from a template. A scene is plain JavaScript that runs with the game loaded:

```js
// My lantern                                  ← the first comment line is the scene's name in the list
const p = params({
  swing: [0.4, 0, 1.5],                        // slider: [default, min, max] (optional step)
  colour: '#ffd27a',                           // colour picker
  lit: true,                                   // checkbox
  kind: ['hanging', 'standing'],               // drop-down (first is the default)
});
const g = add(new THREE.Group(), 0, 2, 0);     // add(object, x, y, z) puts it in the scene
g.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), MC(hex(p.colour))));
onUpdate((dt, t) => {                          // every frame: dt seconds, t scene time
  g.rotation.z = Math.sin(t * 2) * p.swing;    // read in onUpdate: changes live as you drag
  if (keys.Space) log('space!');               // keys held while the preview has focus
});
```

A parameter read while the scene is being built (like `p.colour` above) rebuilds the scene when you change it; one
read inside `onUpdate` changes live. Also available: `remove(obj)`, `frame(obj)`, `log(...)`, `hex('#rrggbb')`,
`inRaid(() => animDead(e, dt))` for game functions that expect to be in a raid (they read `R`), and `ws.camera`,
`ws.controls`, `ws.scene`, `ws.THREE`. Every function and constant from the game works as is.

What it can edit: `src/js/*.js`, `src/css/*.css`, `src/index.html` and `workshop/scenes/*.js`, nothing else. If two
people (or the workshop and your own editor) change the same file, saving asks which version to keep.

## Testing items

`item-tests.js` checks every item in the catalogue. Two ways to run it:

**In the browser** (admins only, like the debug panel): `` ` `` → *Tests*.
- *Run quick (hideout)* takes a fraction of a second. For each item it checks the definition (required fields for its
  type, sane numbers, a caliber some gun fires, attachment fits, sight reticles), the icon (drawn, not the gray
  placeholder), and then actually uses it: creates it, puts it in the stash, saves and loads it back, shows it in
  the details pane, double-clicks it onto you (equips it, or packs it) and back, sells it, buys it from the trader
  if it's sold there, builds every weapon's 3D model with every attachment that fits, and fills every container.
  Cash and caches are checked for being banked/opened when they reach the stash. It also checks every loot table,
  kit, recipe and trader entry points at a real item, and warns about items nothing in the game ever gives you.
- *Run full (+ raid)* also starts a solo test raid on Kolvik Station (paused, invisible to everyone) and picks every
  item up from a container, shows it in the raid inventory, loads each gun with every ammo type, fires it, reloads it
  through the game loop and fires it empty, mounts every attachment on the viewmodel and draws its reticle, uses
  every med kit and the thermos through the game loop (bleeds stopped, fractures fixed, HP and body heat up, the
  item used up), and shoots every helmet and armor.

Results: failing items with each reason (✗), warnings (!), and *Everything* to see the notes on items that passed.
*Copy report* puts the text and the full JSON on your clipboard. Your save is swapped for a throwaway one while the
tests run, saving to the server is switched off, and everything is put back afterwards.

**From the command line** against any running server, in a headless browser:

```sh
npm install --no-save playwright && npx playwright install chromium   # once
node tests/run-item-tests.js http://localhost:8090/                     # full run
node tests/run-item-tests.js http://localhost:8090/ --quick             # hideout only
node tests/run-item-tests.js http://localhost:8090/ --only=akr,ifak     # just these items
node tests/run-item-tests.js http://localhost:8090/ --json=report.json  # also write the full report
```

It injects `item-tests.js` from the folder, so it needs no login, and exits with 0 when nothing fails, 1 when
something does (warnings don't count) and 2 if the run itself broke, so it can sit in a script or CI. Adding a new
item to `src/js/10-items.js`? Run it: a missing icon, a caliber nothing fires, an attachment that fits a gun that
doesn't exist, a med that does nothing or an item no loot table drops all show up.

## Storage and backups

Everything the server remembers — accounts, saves, friend lists, direct messages, PvP counts, the season, the hall
of fame and the world tuning — is in **one SQLite file**, `kolvik.sqlite`, in the data directory (`/app/data` in
the container, i.e. the `kolvik-data` volume; `DATA_DIR` outside Docker). It uses Node's built-in SQLite, so there
is nothing extra to install; Node 22.13 or newer is required (the Docker image is `node:22-alpine`).
Four tables: `users`, `saves`, `dms` and `kv`, each storing a JSON document per row.

**Upgrading from a version that used JSON files** (`users.json`, `saves/`, `dms/`, `pvp.json`, `season.json`,
`halloffame.json`, `world.json`, `social.json`): nothing to do. The first start imports all of it into
`kolvik.sqlite`, logs how many accounts and saves it found, and moves the old files into `migrated-json/` on the
volume. Delete that folder once you're happy.

**Backing up the current version before you upgrade** (the JSON-file version). The simplest way is to copy the
data folder straight out of the running container:

```sh
sudo docker cp kolvik:/app/data ./kolvik-data-$(date +%F)
```

(`kolvik` is the `container_name` in docker-compose.yml.) For a tarball of the volume itself, find its name with
`sudo docker volume ls` (Compose prefixes it with the folder name, e.g. `kolvik_kolvik-data`), then:

```sh
sudo docker run --rm -v kolvik_kolvik-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/kolvik-data-$(date +%F).tgz -C /data .
```

To restore, stop the container (`sudo docker compose down`), unpack back into the volume with
`sudo docker run --rm -v kolvik_kolvik-data:/data -v "$PWD":/backup alpine sh -c "cd /data && tar xzf
/backup/kolvik-data-<date>.tgz"`, and start it again. Both commands keep working after the upgrade: they just pick
up `kolvik.sqlite` instead of the JSON files.

**Backups in the admin panel** (`` ` `` → Server tab → *Backups*):

- *Download backup (.json)* – one JSON file with every account, save, message thread and setting. This is the one
  you can restore from the panel.
- *Download database (.sqlite)* – a consistent copy of the live database file (made with `VACUUM INTO`, safe while
  people are playing). Open it with any SQLite tool, or put it on the volume as `kolvik.sqlite` with the container
  stopped to restore everything exactly as it was.
- *Snapshot now* – writes `backups/kolvik-<date>.sqlite` on the volume. The server also does this by itself at
  every start and once a day, keeping the last seven.
- *Restore from .json* – choose a backup file and click twice. Every account, save and message thread in the file is
  written back (overwriting rows with the same name); accounts created since the backup are left alone. Everyone
  is reloaded from the database immediately, no restart needed.

The admin API behind the buttons: `GET /api/admin/backup`, `GET /api/admin/backup?format=sqlite`,
`POST /api/admin/snapshot`, `POST /api/admin/restore` (body `{"backup": <the json>}`), all with the usual
`Authorization: Bearer <token>` of an admin account.

## Ports and reverse proxies

The page and the WebSocket both use port 8080 (`/` and `/ws`). If you put it behind nginx, Caddy or
Traefik, make sure WebSocket upgrades are forwarded for `/ws`. Mouse look needs pointer lock, which
browsers allow on `http://localhost` and on any `https://` origin; on a plain `http://` LAN address most
browsers still allow it, but a few do not.

## Files

- `src/` – the game's source, split into files you can edit:
  - `src/index.html` – the page shell (HTML only); `<!-- @css -->` and `<!-- @js -->` mark where the styles and
    scripts go
  - `src/css/hub.css`, `src/css/raid.css` – the hideout and the in-raid HUD styles
  - `src/js/*.js` – one file per system, concatenated in filename order into a single script, so the number prefix
    is the load order and everything shares one scope (a `const` in `10-items.js` is visible in `99-boot.js`):
    `00-core` helpers · `10-items` catalogue · `11-icons` · `12-difficulty` · `20-cosmetics` · `21-settings` ·
    `22-tasks` · `23-seasons` · `24-save` · `25-goals` (goals, titles, collection log) · `30-music` · `31-sfx` · `32-music-slavic` (the Russian instruments and tracks) · `33-music-chant` (the church pieces) · `34-voices` (footsteps, voices, positional sound) · `35-raid-music` · `40-hub` · `41-deploy` (conditions rotation, Deploy tab, lobbies
    and teams) · `42-leaderboard-maps` (leaderboard, overview maps) · `50-engine` (renderer, textures, collision, building helpers) · `51-maps`
    (Kolvik, Whiteout, Vault, Skarsvik, Ironfjord, Ravnskar) · `52-helis-drops` · `53-enemies` · `54-nav` ·
    `55-fx-viewmodel` (gun models and hands) · `56-vm-anim` (first-person animation) · `57-ai` (enemy guesswork, tactics and learning) · `58-body` (how bodies move) · `59-drones` (recon drones and their fly brain) · `60-raid` · `61-player` · `62-squad` · `63-locks` (locked rooms, keys, lockpicks) · `64-gps` (map, GPS, minimap) · `65-drops` (dropping and picking up) · `70-hrimfell` (also the snowmobile physics and the
    world config) · `71-storvidda` · `72-skjaergard` (aircraft) · `73-boss` · `74-kaldfjord` (Kaldfjord Reach) · `80-hud` · `81-loop-input` · `90-net` ·
    `91-accounts` · `99-boot`
- `build.js` – `node build.js` assembles `src/` into `game.html`, and checks it: a syntax error in a file is reported
  with its file and line, and so is a function defined twice (the later one silently replaces the earlier one everywhere)
  and a name declared in two files (which would stop the whole game from loading). The server does this itself on startup when
  `src/` is present, and with `DEV=1` it rebuilds whenever a source file changes, so you can edit and refresh.
  The Docker build runs it too, so `docker compose up --build` picks up your edits.
- `game.html` – the built page (also publishable on its own as a solo build). Edit `src/`, not this.
- `server.js` – static page, accounts and admin API, WebSocket relay
- `db.js` – the SQLite storage layer and the one-time import of the old JSON files
- `debug.js`, `item-tests.js` – the admin debug panel and the item tests (only sent to accounts in `ADMINS`)
- `tests/run-item-tests.js` – runs the item tests in a headless browser from the command line
- `workshop.js` – the workshop's server side; `workshop/index.html` the workshop page, `workshop/runtime.js` the preview,
  `workshop/scenes/*.js` the scenes; `docker-compose.workshop.yml` turns it on in Docker with your folders mounted
- `Dockerfile`, `docker-compose.yml`
