/* 24-save: save state, newSave, normSave */
/* ================= SAVE STATE ================= */
const STASH_ROWS=[0,14,22,30];
const KEY='kolvik-station-v2';
let S;
function newSave(){
  const s={v:2, q:{active:{},done:[],daily:null}, career:{raids:0,extracts:0,kills:0,seasons:[]}, cash:4000, spent:0, stash:{w:10,h:14,items:[]},
    eq:{primary:null, secondary:mk('makar',{mag:8}), helmet:null, armor:null, rig:mk('belt'), pack:null, pockets:mk('pockets'), pouch:mk('pouch')},
    hide:{stash:1,heater:0,workbench:0,med:0,armory:0}, stats:{raids:0,extracts:0,kills:0,deaths:0,best:0}, inRaid:false, music:true};
  [['a918',{n:50}],['a918',{n:50}],['vest'],['sack'],['bandage'],['bandage'],['splint'],['ifak'],['thermos']].forEach(([id,o])=>place(s.stash,mk(id,o)));
  place(contOf(s.eq.rig), mk('a918',{n:24})); place(contOf(s.eq.rig), mk('bandage'));
  return s;
}
function worthOf(o){ let v=o.cash; for(const it of o.stash.items) v+=deepValue(it); for(const k in o.eq) if(o.eq[k]) v+=deepValue(o.eq[k]); return Math.round(v); }
function saveGame(obj=S){ if(R&&R.realEq&&obj===S) obj=Object.assign({},S,{eq:R.realEq}); // deathmatch kit never reaches the save
  try{ obj.stats.worth=worthOf(obj); }catch(e){} try{ localStorage.setItem(KEY, JSON.stringify(obj)); }catch(e){} accPush(obj); }
function loadGame(){ try{ const t=localStorage.getItem(KEY); if(t){ const o=JSON.parse(t); if(o&&o.v===2) return o; } }catch(e){} return null; }
