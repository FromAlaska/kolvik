/* 47-melee: branches, shivs and spears
   In a raid, walk up to a tree and press E to cut a branch (2.5 s, it makes some noise; each tree gives two). In the
   item panel, one branch carves into a shiv and two make a spear, in a raid or at the hideout. A shiv or spear you
   carry anywhere (pockets, rig, pack, pouch) replaces your fists on key 3: the best one you have is used. Each hit
   wears it down and it breaks when worn out. Online, the damage comes from the item (ITEMS.shiv / ITEMS.spear). */
const CUT={time:2.5, perTree:2, reach:1.9};
// the best melee item you carry, if any
function meleeItem(){ if(!S||!S.eq) return null; let best=null; for(const sl of ['rig','pockets','pack','pouch']){ const c=S.eq[sl]; if(!c||!c.items) continue; for(const it of c.items){ const d=ITEMS[it.id]; if(d.type==='melee'&&(it.wear??d.wear)>0&&(!best||d.dmg>ITEMS[best.id].dmg)) best=it; } } return best; }
function meleeWear(it){ const d=ITEMS[it.id]; it.wear=(it.wear??d.wear)-1; if(it.wear>0) return;
  for(const c of playerConts()){ const i=c.items.indexOf(it); if(i>=0){ c.items.splice(i,1); break; } } msg(`Your ${d.name.toLowerCase()} broke.`); sfxNoise(0.12,1400,0.2,'bandpass'); vmUid=null; }

/* ---- trees ---- */
function treeGrid(){ if(R.treeGrid) return R.treeGrid; const m=new Map(), C=6; (R.treePts||[]).forEach(([x,y,z],i)=>{ const k=Math.floor(x/C)+','+Math.floor(z/C); let l=m.get(k); if(!l) m.set(k,l=[]); l.push(i); }); return R.treeGrid={m,C}; }
function nearTree(){ if(!R.treePts||!R.treePts.length||P.down||R.ride||R.fly) return null; const G=treeGrid(), cx=Math.floor(P.pos.x/G.C), cz=Math.floor(P.pos.z/G.C); let best=null, bd=CUT.reach;
  for(let a=-1;a<=1;a++) for(let b=-1;b<=1;b++) for(const i of (G.m.get((cx+a)+','+(cz+b))||[])){ const t=R.treePts[i]; const d=Math.hypot(t[0]-P.pos.x,t[2]-P.pos.z); if(d<bd&&((R.treeCut||{})[i]||0)<CUT.perTree){ bd=d; best=i; } }
  return best; }
function startCut(i){ if(R.cutting) return; R.cutting={i,t:0,x:P.pos.x,z:P.pos.z,k:0}; P.trigger=false; hearShot(P.pos.x,P.pos.z,9); }
function cutTick(dt){ const c=R.cutting; if(!c) return;
  if(P.dead||P.down||Math.hypot(P.pos.x-c.x,P.pos.z-c.z)>0.7||P.trigger||R.invOpen){ R.cutting=null; return; }
  c.t+=dt; if(Math.floor(c.t/0.5)>c.k){ c.k++; sfxNoise(0.07,700+Math.random()*300,0.22); }
  if(c.t<CUT.time) return; R.cutting=null; R.treeCut=R.treeCut||{}; R.treeCut[c.i]=(R.treeCut[c.i]||0)+1;
  const it=mk('branch'); if(!addToPlayer(it)){ dropToGround(it); msg('Cut a branch. No room, so it is at your feet.'); } else msg(`Cut a branch${R.treeCut[c.i]>=CUT.perTree?'. Nothing more worth cutting on this tree':''}.`); sfxPickup&&sfxPickup(); if(R.invOpen) R.dirty=true; }

/* ---- crafting from the item panel ---- */
function branchesAround(){ const L=[]; const conts=R?playerConts():[S.stash]; for(const c of conts) for(const it of c.items) if(it.id==='branch') L.push([c,it]); return L; }
function craftMelee(id,need,first){ const L=branchesAround().sort((a,b)=>(b[1]===first)-(a[1]===first)); if(L.length<need) return;
  for(const [c,it] of L.slice(0,need)) c.items.splice(c.items.indexOf(it),1);
  const out=mk(id); const ok=R?addToPlayer(out):place(S.stash,out); if(!ok){ if(R) dropToGround(out); else { for(const [c,it] of L.slice(0,need)) place(c,it); toast('No room in your stash.'); return; } }
  sfxNoise(0.25,900,0.15); toast(`Made a ${ITEMS[id].name.toLowerCase()}.`); SEL={it:out}; afterChange(); }
function craftBox(it){ const box=document.createElement('div'); box.className='atts'; const n=branchesAround().length;
  box.innerHTML=`<span class="lbl">Carve</span>`; const mkb=(label,id,need)=>{ const b=document.createElement('button'); b.className='btn ghost sm'; b.textContent=label; b.disabled=n<need; b.onclick=()=>craftMelee(id,need,it); box.appendChild(b); };
  mkb('Shiv (1 branch)','shiv',1); mkb(`Spear (2 branches${n<2?`, you have ${n}`:''})`,'spear',2); return box; }
