/* 48-year: the time of year
   Four seasons go round every 8 real days (two days each), the same for everyone, and change every raid: how cold it
   is, how light, how far everyone sees, how slippery the ground is, how far sound carries, and which weather turns up.
   (Not to be confused with the leaderboard seasons, which wipe progress.) conditions() in 41-deploy.js folds the time
   of year into each raid's weather; applyWeather() in 51-maps.js turns it into gameplay. */
const YEAR_DAYS=2;
const YEAR=[
  {id:'polar',name:'Polar night',cold:1.25,light:0.6,sight:0.85,fog:1,dark:true,wx:{aurora:2.5,clear:0.6,calm:1.5,sleet:0.5},
   desc:'The sun never comes up. Every raid is dark and colder, everyone sees less far, and the aurora is out more often.'},
  {id:'thaw',name:'Thaw',cold:0.85,light:1,sight:1,fog:1.25,slip:0.7,wx:{sleet:3,icefog:2,blizzard:0.6,clear:0.8,calm:0.6},
   desc:'Wet snow and slush: the ground is slippery and sleet and ice fog roll in, but it is milder.'},
  {id:'sun',name:'Midnight sun',cold:0.7,light:1.22,sight:1.2,fog:0.8,wx:{clear:2.5,calm:2,blizzard:0.4,aurora:0.15,sleet:0.6,windstorm:0.5},
   desc:'It never gets dark. Warmer and brighter, and everyone, enemies included, sees farther.'},
  {id:'storm',name:'Storm season',cold:1.1,light:0.9,sight:0.95,fog:1.1,hear:0.85,wx:{windstorm:3,blizzard:2,clear:0.5,calm:0.5},
   desc:'Gales off the sea: windstorms and blizzards are common, and the wind covers footsteps.'},
];
const yearIdx=ms=>{ const d=Math.floor(ms/864e5/YEAR_DAYS); return ((d%4)+4)%4; };
const yearAt=ms=>YEAR[yearIdx(ms)];
function yearLeft(){ const P0=YEAR_DAYS*864e5, ms=P0-(Date.now()%P0); const h=Math.floor(ms/36e5); return h>=24?`${Math.floor(h/24)} d ${h%24} h`:`${h} h ${Math.floor(ms/6e4)%60} min`; }
function yearHtml(){ const Y=yearAt(Date.now()), N=YEAR[(yearIdx(Date.now())+1)%4]; return `<div class="yearbar yr-${Y.id}"><span class="lbl">Time of year</span><b>${esc(Y.name)}</b><span class="muted">${esc(Y.desc)}</span><span class="lbl">${esc(N.name)} in ${yearLeft()}</span></div>`; }
