/* 10-items: ITEMS catalogue, ammo, weapons, armor, meds, containers of the stash */
/* ================= ITEMS ================= */
// tier = trader loyalty level needed to buy
const ITEMS = {
 makar:{name:'Makar-9 pistol',short:'MKR-9',type:'weapon',slot:'secondary',w:2,h:1,value:900,rar:0,tier:1,cal:'9x18',magSize:8,rpm:380,auto:false,spread:0.014,recoil:0.018,reload:1.7,desc:'Old service pistol from the station armory. Reliable in the cold.'},
 vintik:{name:'Vintik SMG',short:'VNTK',type:'weapon',slot:'primary',w:3,h:2,value:2200,rar:1,tier:1,cal:'9x18',magSize:30,rpm:820,auto:true,spread:0.022,recoil:0.009,reload:2.3,desc:'Compact SMG. Lots of lead, little punch.'},
 tundra:{name:'Tundra-12 shotgun',short:'TND-12',type:'weapon',slot:'primary',w:4,h:1,value:2600,rar:1,tier:1,cal:'12g',magSize:6,rpm:85,auto:false,spread:0.055,pellets:8,recoil:0.05,reload:3.0,desc:'Pump shotgun. Brutal indoors, useless across the ice.'},
 nord:{name:'Nord M38 rifle',short:'M38',type:'weapon',slot:'primary',w:5,h:1,value:3400,rar:1,tier:2,cal:'7.62R',magSize:5,rpm:48,auto:false,spread:0.002,recoil:0.06,reload:3.4,zoom:3.2,desc:'Bolt-action with a 3x scope. Hold right mouse to look through it.'},
 akr:{name:'AKR-5 rifle',short:'AKR-5',type:'weapon',slot:'primary',w:4,h:2,value:5200,rar:2,tier:2,cal:'5.45',magSize:30,rpm:640,auto:true,spread:0.009,recoil:0.014,reload:2.6,desc:'Select-fire rifle. The standard of anyone serious out here.'},
 kestrel:{name:'Kestrel DMR',short:'KSTRL',type:'weapon',slot:'primary',w:5,h:2,value:9800,rar:3,tier:3,cal:'7.62R',magSize:10,rpm:220,auto:false,spread:0.0015,recoil:0.035,reload:2.8,zoom:2.4,desc:'Semi-auto marksman rifle with a 2.4x optic. The best gun money buys here.'},
 a918:{name:'9x18 PM rounds',short:'9x18',type:'ammo',cal:'9x18',w:1,h:1,value:4,rar:0,tier:1,dmg:46,pen:12,stack:50,desc:'Soft pistol rounds. Stopped cold by real armor.'},
 a545:{name:'5.45 PS rounds',short:'5.45 PS',type:'ammo',cal:'5.45',w:1,h:1,value:8,rar:0,tier:2,dmg:44,pen:28,stack:60,desc:'Steel-core rifle rounds.'},
 a545bp:{name:'5.45 BP rounds',short:'5.45 BP',type:'ammo',cal:'5.45',w:1,h:1,value:24,rar:2,tier:3,dmg:41,pen:44,stack:60,desc:'Armor-piercing. Goes through most plates.'},
 a762:{name:'7.62x54R rounds',short:'7.62R',type:'ammo',cal:'7.62R',w:1,h:1,value:20,rar:1,tier:2,dmg:88,pen:42,stack:40,desc:'Full-power rifle cartridge.'},
 a12:{name:'12ga buckshot',short:'12ga',type:'ammo',cal:'12g',w:1,h:1,value:7,rar:0,tier:1,dmg:26,pen:4,stack:20,desc:'Eight pellets per shell.'},
 hardhat:{name:'Hard hat',short:'HAT',type:'helmet',slot:'helmet',w:2,h:2,value:350,rar:0,tier:1,cls:2,dur:18,desc:'Stops pistol rounds sometimes. Better than a beanie.'},
 bastion:{name:'Bastion helmet',short:'BSTN',type:'helmet',slot:'helmet',w:2,h:2,value:3000,rar:2,tier:2,cls:4,dur:36,desc:'Military ballistic helmet.'},
 glacier:{name:'Glacier helmet',short:'GLCR',type:'helmet',slot:'helmet',w:2,h:2,value:7200,rar:3,tier:3,cls:5,dur:45,desc:'Visored heavy helmet. Shrugs off most rifle fire.'},
 vest:{name:'Padded vest',short:'PAD',type:'armor',slot:'armor',w:3,h:3,value:1100,rar:0,tier:1,cls:2,dur:45,desc:'Soft armor sewn into a work vest.'},
 aramid:{name:'Aramid parka',short:'ARMD',type:'armor',slot:'armor',w:3,h:3,value:2600,rar:1,tier:1,cls:3,dur:55,desc:'Insulated parka with aramid panels. Slows heat loss a little.',warmth:0.15},
 plate:{name:'Station plate carrier',short:'PLATE',type:'armor',slot:'armor',w:3,h:3,value:5200,rar:2,tier:2,cls:4,dur:70,desc:'Ceramic plates front and back.'},
 warden:{name:'Arctic Warden armor',short:'WARDN',type:'armor',slot:'armor',w:3,h:4,value:12500,rar:4,tier:3,cls:5,dur:85,desc:'Heated class-5 armor suit. Cuts heat loss by a third.',warmth:0.33},
 belt:{name:'Utility belt',short:'BELT',type:'rig',slot:'rig',w:2,h:2,value:350,rar:0,tier:1,grid:[4,1],desc:'Four small pouches.'},
 chestrig:{name:'Chest rig',short:'RIG',type:'rig',slot:'rig',w:3,h:3,value:1400,rar:1,tier:1,grid:[4,3],desc:'Mag pouches across the chest.'},
 sack:{name:'Flour sack',short:'SACK',type:'pack',slot:'pack',w:3,h:3,value:600,rar:0,tier:1,grid:[4,4],desc:'A sack with a rope strap.'},
 ruck:{name:'Expedition rucksack',short:'RUCK',type:'pack',slot:'pack',w:4,h:5,value:2800,rar:1,tier:2,grid:[6,6],desc:'Polar expedition pack.'},
 sled:{name:'Hauler frame pack',short:'HAULR',type:'pack',slot:'pack',w:5,h:5,value:6400,rar:3,tier:3,grid:[7,8],desc:'External-frame pack for people who plan to carry a lot out.'},
 pockets:{name:'Pockets',short:'POCKETS',type:'pockets',slot:'pockets',w:1,h:1,value:0,rar:0,grid:[4,1],fixed:true,desc:''},
 pouch:{name:'Secure pouch',short:'POUCH',type:'pouch',slot:'pouch',w:2,h:2,value:0,rar:3,grid:[2,2],fixed:true,desc:'Whatever is inside survives your death.'},
 bandage:{name:'Bandage',short:'BNDG',type:'med',med:'bandage',w:1,h:1,value:60,rar:0,tier:1,use:2,desc:'Stops one bleed. Hotkey 4.'},
 splint:{name:'Splint',short:'SPLNT',type:'med',med:'splint',w:1,h:1,value:90,rar:0,tier:1,use:3,desc:'Fixes one fracture. Hotkey 5.'},
 ifak:{name:'IFAK',short:'IFAK',type:'med',med:'heal',hp:150,w:1,h:1,value:550,rar:1,tier:1,use:3,desc:'Heals 150 HP and stops one bleed. Hotkey 6.'},
 fieldkit:{name:'Field surgical kit',short:'FIELD',type:'med',med:'heal',hp:400,w:2,h:1,value:1600,rar:2,tier:2,use:5,desc:'Heals 400 HP, stops all bleeds, restores destroyed limbs. Hotkey 6.'},
 thermos:{name:'Thermos of cocoa',short:'COCOA',type:'warm',w:1,h:2,value:260,rar:0,tier:1,use:2,warm:45,desc:'Restores 45 body heat. Hotkey 7.'},
 cash:{name:'Cash',short:'CASH',type:'cash',w:1,h:1,value:1,rar:1,stack:5000,desc:'Banded dollar bills. Deposited to your balance when you bring them home.'},
 bolts:{name:'Box of bolts',short:'BOLTS',type:'loot',w:1,h:1,value:180,rar:0,desc:'Sells for cash. Workbench material.'},
 tape:{name:'Duct tape',short:'TAPE',type:'loot',w:1,h:1,value:150,rar:0,desc:'Sells for cash. Med station material.'},
 scrap:{name:'Scrap metal',short:'SCRAP',type:'loot',w:2,h:1,value:130,rar:0,desc:'Sells for cash. Workbench material.'},
 wire:{name:'Copper wire',short:'WIRE',type:'loot',w:1,h:1,value:320,rar:0,desc:'Sells for cash.'},
 battery:{name:'Lantern battery',short:'BATT',type:'loot',w:1,h:1,value:280,rar:0,desc:'Sells for cash.'},
 frag:{name:'Frag grenade',short:'FRAG',type:'nade',w:1,h:1,value:420,rar:1,tier:1,desc:'3 second fuse. Up to 190 damage within 7 m of open line of sight. Key 8 throws, 9 picks the type.'},
 flash:{name:'Flashbang',short:'FLASH',type:'nade',w:1,h:1,value:280,rar:1,tier:1,desc:'2 second fuse. Blinds and deafens anyone within 15 m who can see it (less if they look away); enemies cannot shoot for 4 s.'},
 smokew:{name:'White smoke',short:'SMK W',type:'nade',w:1,h:1,value:140,rar:0,tier:1,desc:'An 8 m cloud for 45 s that enemies and their drones cannot see through.'},
 smoker:{name:'Red smoke',short:'SMK R',type:'nade',w:1,h:1,value:160,rar:0,tier:1,desc:'Smoke that also marks "enemy here" on your squad\'s HUD for 60 s.'},
 smokeg:{name:'Green smoke',short:'SMK G',type:'nade',w:1,h:1,value:160,rar:0,tier:1,desc:'Smoke that also marks "friendly, regroup" on your squad\'s HUD for 60 s.'},
 bow:{name:'Hunting bow',short:'BOW',type:'weapon',slot:'primary',w:1,h:4,value:150,rar:0,tier:1,cal:'arrow',magSize:1,rpm:70,auto:false,spread:0.006,recoil:0,reload:0.9,bow:true,draw:0.95,speed:52,desc:'Recurve bow. Nearly silent and dirt cheap. Hold fire to draw, let go to shoot. Arrows drop and take time to arrive.'},
 cbow:{name:'Compound bow',short:'CMPD',type:'weapon',slot:'primary',w:1,h:4,value:900,rar:1,tier:1,cal:'arrow',magSize:1,rpm:80,auto:false,spread:0.0025,recoil:0,reload:0.75,bow:true,draw:0.7,speed:82,desc:'Cams and cables: a faster, flatter arrow for less effort. Still nearly silent.'},
 arrow:{name:'Arrows',short:'ARROW',type:'ammo',cal:'arrow',w:1,h:1,value:3,rar:0,tier:1,dmg:92,pen:14,stack:20,desc:'Broadhead arrows for both bows.'},
 pdrone:{name:'Recon drone',short:'DRONE',type:'pdrone',w:2,h:2,value:4800,rar:2,tier:2,batt:150,desc:'A small quadcopter you fly yourself (key 0). Marks what its camera sees for you and your squad. 150 s of battery, recharged between raids.'},
 branch:{name:'Spruce branch',short:'BRNCH',type:'craft',w:1,h:3,value:15,rar:0,desc:'Cut from a tree in a raid (E at a tree). Carve one into a shiv, or two into a spear.'},
 shiv:{name:'Wooden shiv',short:'SHIV',type:'melee',w:1,h:2,value:60,rar:0,dmg:52,pen:5,reach:1.7,rate:0.42,wear:15,desc:'A sharpened spruce stake. Quick and quiet. Breaks after about 15 hits. Carried anywhere, it replaces your fists (key 3).'},
 spear:{name:'Spruce spear',short:'SPEAR',type:'melee',w:1,h:4,value:160,rar:0,dmg:78,pen:9,reach:2.7,rate:0.85,wear:25,desc:'Two branches lashed together and fire-hardened. Long reach, slow thrust. Breaks after about 25 hits. Carried anywhere, it replaces your fists (key 3).'},
 powder:{name:'Gunpowder tin',short:'POWDR',type:'loot',w:1,h:1,value:220,rar:1,desc:'Workbench material.'},
 medsup:{name:'Medical supplies',short:'MEDSUP',type:'loot',w:2,h:1,value:500,rar:1,desc:'Med station material.'},
 aquavit:{name:'Aquavit bottle',short:'AQVT',type:'loot',w:1,h:2,value:600,rar:1,desc:'Caraway spirit. Trades well.'},
 fuel:{name:'Fuel canister',short:'FUEL',type:'loot',w:2,h:2,value:1400,rar:1,desc:'Arctic diesel. Heavy, but pays.'},
 watch:{name:'Expedition watch',short:'WATCH',type:'loot',w:1,h:1,value:1900,rar:2,desc:'Swiss chronograph. Small and valuable.'},
 notebook:{name:'Field notebook',short:'NOTES',type:'loot',w:1,h:1,value:900,rar:2,desc:'Glaciology notes in a cramped hand.'},
 radio:{name:'Radio module',short:'RADIO',type:'loot',w:2,h:1,value:1600,rar:2,desc:'HF transceiver board.'},
 sensor:{name:'Seismic sensor',short:'SEISM',type:'loot',w:2,h:2,value:3200,rar:3,desc:'Station-grade geophone.'},
 icecore:{name:'Ice core sample',short:'ICE CORE',type:'loot',w:1,h:3,value:6000,rar:3,desc:'A 40,000-year-old cylinder of air bubbles. Keep it frozen.'},
 satphone:{name:'Satellite phone',short:'SATPH',type:'loot',w:1,h:2,value:4500,rar:3,desc:'Works anywhere north of nowhere.'},
 goldbar:{name:'Gold ingot',short:'GOLD',type:'loot',w:1,h:1,value:7000,rar:4,desc:'Someone was paid very well to keep quiet.'},
 thermal:{name:'Thermal camera',short:'THERMAL',type:'loot',w:2,h:2,value:8500,rar:4,desc:'The most valuable thing at Kolvik.'},
 bearer:{name:'Bearer bonds',short:'BONDS',type:'loot',w:1,h:1,value:12000,rar:4,desc:'Payable to whoever is holding them. Vault only.'},
 diamond:{name:'Rough diamonds',short:'DIAMND',type:'loot',w:1,h:1,value:9000,rar:4,desc:'A pouch of uncut stones from somewhere they should not be.'},
 blackbox:{name:'Flight recorder',short:'BLKBOX',type:'loot',w:2,h:2,value:15000,rar:4,desc:'Orange box from a plane nobody admits went down. Someone will pay a lot for it.'},
 reddot:{name:'Red dot sight',short:'RDS',type:'att',aslot:'optic',w:1,h:1,value:700,rar:1,tier:1,fits:['makar','vintik','akr','tundra','nord','kestrel'],ads:0.55,zoom:1.1,reticle:'dot',adsSpeed:7,desc:'A small red dot right where the bullet goes. Fast and clear at close range.'},
 holo:{name:'Holographic sight',short:'HOLO',type:'att',aslot:'optic',w:1,h:1,value:1400,rar:2,tier:1,fits:['vintik','akr','tundra','nord','kestrel'],ads:0.5,zoom:1.15,reticle:'holo',adsSpeed:6.5,desc:'Circle-and-dot reticle in a wide window. The circle frames targets at close range, the dot handles distance.'},
 prism:{name:'2.5x prism sight',short:'PRISM',type:'att',aslot:'optic',w:1,h:1,value:2000,rar:2,tier:2,fits:['vintik','akr','nord','kestrel'],ads:0.42,zoom:2.5,reticle:'prism',adsSpeed:4.8,desc:'Etched chevron at 2.5x with drop marks below it. Mid-range without losing the world around the eyepiece.'},
 scope4:{name:'4x scope',short:'4X',type:'att',aslot:'optic',w:2,h:1,value:2400,rar:2,tier:2,fits:['akr','nord','kestrel'],zoom:4,ads:0.35,reticle:'scope',adsSpeed:3.6,desc:'Four times closer, with mil-dots for holding over at range. Slow to bring up.'},
 supp9:{name:'Pistol suppressor',short:'SUPP-9',type:'att',aslot:'muzzle',w:1,h:1,value:900,rar:1,tier:1,fits:['makar','vintik'],noise:0.35,spreadMul:0.9,desc:'Scavs hear suppressed shots from about a third of the distance.'},
 suppr:{name:'Rifle suppressor',short:'SUPP-R',type:'att',aslot:'muzzle',w:2,h:1,value:2800,rar:2,tier:2,fits:['akr','nord','kestrel'],noise:0.35,spreadMul:0.9,recoilMul:0.85,desc:'Quieter and steadier rifle fire.'},
 extmag:{name:'Extended magazine',short:'EXTMAG',type:'att',aslot:'mag',w:1,h:1,value:1200,rar:2,tier:2,fits:['makar','vintik','akr'],magMul:1.5,desc:'Half again as many rounds before a reload.'},
 tube:{name:'Magazine tube extension',short:'TUBE',type:'att',aslot:'mag',w:2,h:1,value:800,rar:1,tier:1,fits:['tundra'],magMul:1.5,desc:'Three more shells in the tube.'},
 nordlys:{name:'Nordlys battle rifle',short:'NRDLYS',type:'weapon',slot:'primary',w:5,h:2,value:60000,rar:4,tier:9,cal:'7.62R',magSize:20,rpm:460,auto:true,spread:0.0028,recoil:0.022,reload:2.7,relic:true,desc:'Built at the Armory from all three boss trophies. Full-power 7.62R on full auto with recoil that stays put. Takes optics and a rifle suppressor.'},
 jarlmg:{name:"Jarl's machine gun",short:'JARL-MG',type:'weapon',slot:'primary',w:6,h:2,value:45000,rar:4,tier:9,cal:'7.62R',magSize:60,rpm:620,auto:true,spread:0.006,recoil:0.03,reload:4.6,relic:true,desc:'Belt-fed 7.62R taken off Jarl Hrafn. Sixty rounds before a long reload. Takes optics and a rifle suppressor.'},
 wraith:{name:'Wraith helmet',short:'WRAITH',type:'helmet',slot:'helmet',w:2,h:2,value:26000,rar:4,tier:9,cls:6,dur:60,relic:true,desc:'Built at the Armory. Class 6 shell with a ceramic visor. Most rifle rounds glance off.'},
 isbjorn:{name:'Isbjørn armor',short:'ISBJRN',type:'armor',slot:'armor',w:3,h:4,value:42000,rar:4,tier:9,cls:6,dur:110,warmth:0.5,relic:true,desc:'Built at the Armory. Class 6 plates in a heated polar shell. Halves heat loss.'},
 relpouch:{name:'Relic pouch',short:'RELIC',type:'pouch',slot:'pouch',w:3,h:3,value:0,rar:4,grid:[3,3],fixed:true,desc:'Armory-built secure pouch, 3×3. Whatever is inside survives your death.'},
 cache:{name:'Sealed cache',short:'CACHE',type:'cache',w:2,h:2,value:0,rar:3,noPouch:true,desc:'A locked crate of cosmetics. Extract with it and it opens on the Operator tab. It will not fit in the secure pouch.'},
 cryocell:{name:'Cryo cell',short:'CRYO',type:'relic',w:1,h:1,value:9000,rar:4,desc:'Supercooled power cell from the old projects. The Armory needs these. Found in supply drops, vault safes, cargo crates and on bosses.'},
 tr_chief:{name:"Halvorsen's keycard",short:'KEYCARD',type:'relic',w:1,h:1,value:6000,rar:4,desc:'Taken from Station Chief Halvorsen. Armory material for the Wraith helmet and the Nordlys.'},
 tr_warden:{name:"Brekke's signet",short:'SIGNET',type:'relic',w:1,h:1,value:6000,rar:4,desc:'Taken from Vault Warden Brekke. Armory material for the Relic pouch and the Nordlys.'},
 tr_foreman:{name:"Rask's lamp",short:'LAMP',type:'relic',w:1,h:2,value:6000,rar:4,desc:'Taken from Mine Foreman Rask. Armory material for the Isbjørn armor and the Nordlys.'},
 dmrmag:{name:'DMR 20-round magazine',short:'DMR-20',type:'att',aslot:'mag',w:1,h:1,value:1800,rar:2,tier:3,fits:['kestrel'],magMul:2,desc:'Twenty rounds of 7.62R on tap.'},
 // ---- more loot: valuables ----
 smokes:{name:'Carton of cigarettes',short:'SMOKES',type:'loot',w:1,h:1,value:450,rar:0,desc:'Currency everywhere north of the treeline.'},
 caviar:{name:'Tin of caviar',short:'CAVIAR',type:'loot',w:1,h:1,value:900,rar:1,desc:'Black, salty and worth more than the tin suggests.'},
 medal:{name:'Polar service medal',short:'MEDAL',type:'loot',w:1,h:1,value:1300,rar:1,desc:'Awarded for a winter nobody wants to talk about.'},
 compass:{name:'Brass compass',short:'COMPASS',type:'loot',w:1,h:1,value:1500,rar:1,desc:'Expedition compass, still points true. Collectors love them.'},
 binocs:{name:'Field binoculars',short:'BINOCS',type:'loot',w:2,h:1,value:1700,rar:1,desc:'Rubber-armored 8x binoculars with a range scale.'},
 pelt:{name:'Arctic fox pelt',short:'PELT',type:'loot',w:2,h:2,value:2200,rar:1,desc:'A winter pelt, thick and white. Bulky, but furriers pay.'},
 ivory:{name:'Walrus ivory carving',short:'IVORY',type:'loot',w:1,h:1,value:2600,rar:2,desc:'A small carved bear. Old work, and very good.'},
 camera:{name:'Rangefinder camera',short:'CAMERA',type:'loot',w:2,h:1,value:3200,rar:2,desc:'A vintage rangefinder with a roll of film still in it.'},
 blade:{name:'Server blade',short:'BLADE',type:'loot',w:3,h:1,value:3800,rar:2,desc:'Pulled from a station rack. The memory alone is worth the weight.'},
 laptop:{name:'Ruggedized laptop',short:'LAPTOP',type:'loot',w:2,h:2,value:4800,rar:3,desc:'Field laptop that survived forty below. So did whatever is on it.'},
 drive:{name:'Encrypted drive',short:'DRIVE',type:'loot',w:1,h:1,value:5200,rar:3,desc:'A hardened drive with a red label. Somebody wants it back.'},
 meteorite:{name:'Meteorite fragment',short:'METEOR',type:'loot',w:1,h:1,value:14000,rar:4,desc:'Iron-nickel, pulled out of the ice. Heavier than it looks, and rarer than gold.'},
 // ---- more loot: useful ----
 handwarm:{name:'Hand warmers',short:'WARMERS',type:'warm',w:1,h:1,value:120,rar:0,tier:1,use:1,warm:20,desc:'Restores 20 body heat in a second. Hotkey 7.'},
 ration:{name:'Hot meal ration',short:'RATION',type:'warm',w:1,h:2,value:480,rar:1,tier:2,use:4,warm:70,desc:'Self-heating stew. Restores 70 body heat. Hotkey 7.'},
 tourniquet:{name:'Tourniquet',short:'TQ',type:'med',med:'bandage',w:1,h:1,value:140,rar:1,tier:1,use:1,desc:'Stops one bleed in a second. Hotkey 4.'},
 combatkit:{name:'Combat medkit',short:'CMBTKIT',type:'med',med:'heal',hp:260,w:2,h:1,value:1100,rar:2,tier:2,use:4,desc:'Heals 260 HP and stops one bleed. Hotkey 6.'},
 brake:{name:'Muzzle brake',short:'BRAKE',type:'att',aslot:'muzzle',w:1,h:1,value:1600,rar:2,tier:2,fits:['vintik','akr','kestrel'],noise:1,recoilMul:0.72,desc:'Cuts recoil by about a quarter. Just as loud as bare.'},
 dronecam:{name:'Drone camera',short:'DRN CAM',type:'loot',w:2,h:1,value:2600,rar:2,desc:'Gimballed camera pulled from a downed recon drone. The lens is fine.'},
 dronebatt:{name:'Drone battery',short:'DRN BAT',type:'loot',w:1,h:1,value:900,rar:1,desc:'High-density cold-rated cell from a recon drone.'},
 jammer:{name:'Radio jammer',short:'JAMMER',type:'jam',w:2,h:1,value:5200,rar:3,tier:3,desc:'While it is anywhere in your gear, enemy radios within 40 m get only static and recon drones within 40 m lose their link. Enemies that hear the static get wary.'},
 lockpick:{name:'Lockpick set',short:'PICKS',type:'pick',w:1,h:1,value:900,rar:2,tier:2,uses:3,desc:'Opens a locked door in about six seconds of noisy work. A pick can snap. Three picks in the set.'},
 // ---- keys: each opens one locked room (63-locks.js); they wear out after a few uses ----
 k_lab:{name:'Lab cold store key',short:'LAB KEY',type:'key',w:1,h:1,value:2400,rar:2,uses:5,room:'kv_lab',desc:'Kolvik. The cold store behind the Lab, where the expensive samples went.'},
 k_comms:{name:'Comms server room key',short:'COMMS K',type:'key',w:1,h:1,value:1800,rar:2,uses:5,room:'kv_comms',desc:'Kolvik. The server room next to Comms.'},
 k_wxdepot:{name:'Weather depot key',short:'WX KEY',type:'key',w:1,h:1,value:1400,rar:1,uses:5,room:'wo_depot',desc:'Whiteout. A storage depot somewhere out in the snow.'},
 k_fuelcage:{name:'Fuel cage key',short:'FUEL K',type:'key',w:1,h:1,value:1200,rar:1,uses:5,room:'wo_cage',desc:'Whiteout. A locked fuel and supply cage.'},
 k_rail:{name:'Rail warehouse cage key',short:'CAGE K',type:'key',w:1,h:1,value:2000,rar:2,uses:5,room:'if_cage',desc:'Ironfjord. The locked cage beside the warehouse.'},
 k_pantry:{name:'Mess hall pantry key',short:'PANTRY',type:'key',w:1,h:1,value:1300,rar:1,uses:5,room:'if_pantry',desc:'Ironfjord. The mess hall pantry.'},
 k_crypt:{name:'Church crypt key',short:'CRYPT K',type:'key',w:1,h:1,value:3000,rar:3,uses:4,room:'sk_crypt',desc:'Skarsvik. The crypt beside the church. People hid things there.'},
 k_archive:{name:'Town hall archive key',short:'ARCHIVE',type:'key',w:1,h:1,value:2200,rar:2,uses:5,room:'sk_archive',desc:'Skarsvik. The archive room by the town hall.'},
 k_tower:{name:'Tower strongroom key',short:'TOWER K',type:'key',w:1,h:1,value:3400,rar:3,uses:4,room:'sk_tower',desc:'Skarsvik. The airfield strongroom by the control tower.'},
 k_powder:{name:'Powder magazine key',short:'POWDR K',type:'key',w:1,h:1,value:3600,rar:3,uses:4,room:'rv_powder',desc:'Fort Ravnskar. The old powder magazine, now the Jarl\'s armory.'},
 k_relay:{name:'Relay vault key',short:'RELAY K',type:'key',w:1,h:1,value:3200,rar:3,uses:4,room:'td_relay',desc:'Storvidda. The vault room by the relay hall.'},
 k_bunker:{name:'Bunker armory key',short:'BUNKR K',type:'key',w:1,h:1,value:2800,rar:2,uses:5,room:'td_bunker',desc:'Storvidda. The armory next to the bunker.'},
 k_trade:{name:'Trading post safe room key',short:'TRADE K',type:'key',w:1,h:1,value:2600,rar:2,uses:5,room:'sj_trade',desc:'The Skerries. The safe room at the trading post.'},
 k_vestry:{name:'Chapel vestry key',short:'VESTRY',type:'key',w:1,h:1,value:2000,rar:2,uses:5,room:'sj_vestry',desc:'The Skerries. The vestry beside the island chapel.'},
 k_kf_police:{name:'Evidence room key',short:'EVID K',type:'key',w:1,h:1,value:3000,rar:3,uses:4,room:'kf_police',desc:'Kaldfjord Reach. The evidence room behind the police station.'},
 k_kf_payroll:{name:'Payroll office key',short:'PAYROLL',type:'key',w:1,h:1,value:3600,rar:3,uses:4,room:'kf_payroll',desc:'Kaldfjord Reach. The mine payroll office, by the mine office.'},
 k_kf_radar:{name:'Radar armory key',short:'RADAR K',type:'key',w:1,h:1,value:3400,rar:3,uses:4,room:'kf_radar',desc:'Kaldfjord Reach. The armory at the radar base.'},
 k_lodge:{name:'Lodge cellar key',short:'LODGE K',type:'key',w:1,h:1,value:1600,rar:1,uses:5,room:'hr_lodge',desc:'Hrimfell. The cellar by the lodge at the loot camp.'},
};
function wstats(w){
  const d=ITEMS[w.id]; const s={magSize:d.magSize,spread:d.spread,recoil:d.recoil,zoom:d.zoom||0,noise:1,ads:1};
  const g=GUNGEO[w.id]; s.reticle=g&&g.builtin?g.builtin.kind:'iron'; s.adsSpeed=g&&g.builtin?(g.builtin.kind==='scope'?3.6:4.8):6;
  if(w.att&&w.att.optic){ const o=ITEMS[w.att.optic.id]; if(o){ s.reticle=o.reticle; s.adsSpeed=o.adsSpeed; } }
  if(w.att) for(const k in w.att){ const a=w.att[k]&&ITEMS[w.att[k].id]; if(!a) continue; if(a.magMul) s.magSize=Math.round(d.magSize*a.magMul); if(a.zoom) s.zoom=a.zoom; if(a.noise) s.noise*=a.noise; if(a.spreadMul) s.spread*=a.spreadMul; if(a.recoilMul) s.recoil*=a.recoilMul; if(a.ads) s.ads*=a.ads; }
  return s;
}
function fixMag(w){ const m=wstats(w).magSize; if(w.mag>m){ const back=mk(w.ammo,{n:w.mag-m}); w.mag=m; if(!place(S.stash,back)) toast('Some rounds did not fit in the stash.'); } }
for(const k in ITEMS) ITEMS[k].id=k;
for(const k of ['reddot','holo','prism','scope4','suppr','brake']) ITEMS[k].fits.push('nordlys','jarlmg');
const RAR=['Common','Uncommon','Rare','Very rare','Legendary'];
const GLYPH={nade:'●',pdrone:'✈',craft:'≡',melee:'†',jam:'≋',key:'⚿',pick:'⚒',relic:'★',cache:'▩',weapon:'⌐',ammo:'•',armor:'▣',helmet:'◓',rig:'▦',pack:'▤',med:'✚',warm:'♨',loot:'◆',cash:'$',pouch:'■',pockets:'■',att:'⊕'};
const CALS={'arrow':['arrow'],'9x18':['a918'],'5.45':['a545','a545bp'],'7.62R':['a762'],'12g':['a12']};
const SLOTS=['primary','secondary','helmet','armor','rig','pack'];
const SLOT_NAME={primary:'Primary',secondary:'Sidearm',helmet:'Helmet',armor:'Body armor',rig:'Rig',pack:'Backpack',pockets:'Pockets',pouch:'Secure pouch'};
// trader loyalty: lifetime spend thresholds
const LOYAL=[0,0,3000,12000];

function mk(id, o={}){
  const d=ITEMS[id]; const it={uid:uid(), id, x:0, y:0, r:0};
  if(d.type==='ammo'||d.type==='cash') it.n=d.stack;
  if(d.type==='weapon'){ it.mag=0; it.ammo=CALS[d.cal][0]; it.att={optic:null,muzzle:null,mag:null}; }
  if(d.type==='armor'||d.type==='helmet') it.dur=d.dur;
  if(d.grid) it.items=[];
  if(d.hp) it.hp=d.hp;
  if(d.uses) it.uses=d.uses;
  if(d.wear) it.wear=d.wear;
  if(d.batt) it.batt=d.batt;
  return Object.assign(it,o);
}
const dims = it => { const d=ITEMS[it.id]; return it.r?[d.h,d.w]:[d.w,d.h]; };
function contOf(it){ const d=ITEMS[it.id]; return {w:d.grid[0], h:d.grid[1], items:it.items, own:it.id}; }
function occ(c, ignore){ const g=new Uint8Array(c.w*c.h); for(const it of c.items){ if(it===ignore) continue; const [w,h]=dims(it); for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const gx=it.x+x, gy=it.y+y; if(gx<c.w&&gy<c.h) g[gy*c.w+gx]=1; } } return g; }
function fitsG(c,g,id,x,y,r){ const d=ITEMS[id]; if(d.noPouch&&c.own&&ITEMS[c.own].type==='pouch') return false; const w=r?d.h:d.w, h=r?d.w:d.h; if(x<0||y<0||x+w>c.w||y+h>c.h) return false; for(let yy=0;yy<h;yy++) for(let xx=0;xx<w;xx++) if(g[(y+yy)*c.w+x+xx]) return false; return true; }
function fitsAt(c,it,x,y,r,ignore){ return fitsG(c,occ(c,ignore),it.id,x,y,r); }
function place(c,it){
  const d=ITEMS[it.id];
  if(d.stack){ for(const o of c.items){ if(o.id===it.id && o.n<d.stack && !o.hid && !it.hid){ const mv=Math.min(it.n,d.stack-o.n); o.n+=mv; it.n-=mv; if(it.n<=0) return true; } } }
  const g=occ(c);
  for(const r of [0,1]) for(let y=0;y<c.h;y++) for(let x=0;x<c.w;x++) if(fitsG(c,g,it.id,x,y,r)){ it.x=x; it.y=y; it.r=r; c.items.push(it); return true; }
  return false;
}
function itemAt(c,cx,cy){ for(const it of c.items){ const [w,h]=dims(it); if(cx>=it.x&&cx<it.x+w&&cy>=it.y&&cy<it.y+h) return it; } return null; }
function valueOf(it){ const d=ITEMS[it.id]; let v=d.value*(d.stack?it.n:1); if(d.dur) v*=0.35+0.65*(it.dur/d.dur); if(d.hp) v*=0.3+0.7*(it.hp/d.hp); if(d.uses&&it.uses!=null) v*=0.3+0.7*(it.uses/d.uses); if(d.wear&&it.wear!=null) v*=0.3+0.7*(it.wear/d.wear); if(d.type==='weapon'&&it.mag) v+=ITEMS[it.ammo].value*it.mag; if(it.att) for(const k in it.att) if(it.att[k]) v+=ITEMS[it.att[k].id].value; return v; }
function deepValue(it){ let v=valueOf(it); if(it.items) for(const s of it.items) v+=deepValue(s); return v; }
const sellPrice = it => it.id==='cash' ? it.n : Math.max(1, Math.round(valueOf(it)*0.6));
const buyPrice = id => { const d=ITEMS[id]; return Math.max(5, Math.round(d.value*(d.stack?d.stack:1)*1.25/5)*5); };
