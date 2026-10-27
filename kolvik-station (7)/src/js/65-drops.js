/* 65-drops: dropping things on the ground and picking them back up
   In a raid, dragging an item onto "Drop on the ground" (or the Drop button) puts it at your feet in a small bag.
   Drops close together go in the same bag. Anyone can walk up to a bag and press E to look through it and take
   things, including other players online (the bag and what's taken from it are shared). Empty bags disappear. In the
   hideout, discarding still throws things away. */
function dropBagMesh(x,y,z){ const g=new THREE.Group(); const bag=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.28,0.38),MC(0x3e4a34)); bag.position.y=0.14; g.add(bag);
  const strap=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.04,0.42),MC(0x22261e)); strap.position.set(0.12,0.29,0); g.add(strap); const tag=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.06,0.02),MB(0xffc070)); tag.position.set(-0.2,0.2,0.2); g.add(tag);
  g.position.set(x,y,z); g.rotation.y=Math.random()*6.28; scene.add(g); return g; }
function dropToGround(it){
  if(!R||!P) return false; delete it.hid;
  // reuse a bag right here, or put a new one down just in front of you
  let c=R.conts.find(c=>c.drop&&!c.gone&&Math.hypot(c.x-P.pos.x,c.z-P.pos.z)<1.8);
  if(c&&place(c.cont,it)){ if(NET.on){ const cp=JSON.parse(JSON.stringify(it)); nsend({t:'put',cid:c.cid,item:cp}); } sfxDrop(); return true; }
  const x=P.pos.x-Math.sin(P.yaw)*0.7, z=P.pos.z-Math.cos(P.yaw)*0.7, cid='g'+(NET.id||'s')+'-'+(R.dropN=(R.dropN||0)+1);
  c=addDrop(cid,x,z,[it],P.y); if(NET.on) nsend({t:'body',cid,x,z,name:'Dropped items',items:JSON.parse(JSON.stringify([it]))}); sfxDrop(); return !!c;
}
function addDrop(cid,x,z,items,y){
  const cont={w:8,h:9,items:[]}; for(const it of items){ delete it.hid; place(cont,it); }
  const gy=y!=null?y:groundAt(x,z,(R.terrain?R.terrain(x,z):0)+0.5);
  const c={cid,type:'drop',name:'Dropped items',x,z,mesh:null,bag:dropBagMesh(x,gy,z),cont,opened:true,drop:true}; R.conts.push(c); return c;
}
// bags nobody needs any more go away (a bag being looked through stays until it's closed)
function dropsTick(){ if(!R.conts) return; for(const c of R.conts){ if(!c.drop||c.gone) continue; if(!c.cont.items.length&&R.lootTarget!==c){ c.gone=true; scene.remove(c.bag); } } if(R.conts.some(c=>c.gone)) R.conts=R.conts.filter(c=>!c.gone); }
const sfxDrop=()=>{ sfxNoise(0.12,500,0.12); setTimeout(()=>sfxNoise(0.06,300,0.1),60); };
