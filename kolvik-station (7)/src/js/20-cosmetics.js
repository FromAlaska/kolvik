/* 20-cosmetics: outfits, weapon skins, patterns, sealed caches, operator preview */
/* ================= COSMETICS (outfits, weapon skins, sealed caches) ================= */
// Cosmetic only: nothing here changes armor, damage or stats. Rarity 0 items are owned by everyone; ex = earned only from a task.
const SNOWC=['#dfe6ea','#a9b6bd','#7d8b94'], WOODC=['#4f5b3a','#2f3a24','#6e5a3a','#1d211a'], TUNDC=['#c9d3d8','#8fa0a8','#5e7078','#e9eef0'], TIGC=['#6f7a4a','#2a2d1e','#a08a52'], CARBC=['#1d2023','#2c3135'], AURC=['#0d1630','#142a3a','#3cf0a0','#a46cff'], ICEC=['#0b1118','#5fe0ff','#e0faff'], GOLDC=['#c9981f','#f0cd5a','#fff2b0'], NORC=['#dfe8ec','#3cf0c0','#7a8cff'];
const COS=[
 // parkas
 {id:'c_issue',slot:'coat',name:'Issue parka',rar:0,p:'solid',c:['#4d5a48']},
 {id:'c_orange',slot:'coat',name:'Expedition orange',rar:0,p:'solid',c:['#c8641e']},
 {id:'c_navy',slot:'coat',name:'Navy parka',rar:0,p:'solid',c:['#26344c']},
 {id:'c_snow',slot:'coat',name:'Snow camo parka',rar:1,p:'camo',c:SNOWC},
 {id:'c_wood',slot:'coat',name:'Woodland parka',rar:1,p:'camo',c:WOODC},
 {id:'c_urban',slot:'coat',name:'Urban digital parka',rar:1,p:'digital',c:['#7d8388','#5a6065','#a5abaf','#3a3f43']},
 {id:'c_tiger',slot:'coat',name:'Tiger stripe parka',rar:2,p:'tiger',c:TIGC},
 {id:'c_redfox',slot:'coat',name:'Red fox parka',rar:2,p:'twotone',c:['#a8321f','#e8e4dc','#2a1a14']},
 {id:'c_tundra',slot:'coat',name:'Digital tundra parka',rar:2,p:'digital',c:TUNDC},
 {id:'c_carbon',slot:'coat',name:'Carbon weave parka',rar:3,p:'carbon',c:CARBC},
 {id:'c_aurora',slot:'coat',name:'Aurora parka',rar:3,p:'aurora',c:AURC,glow:1},
 {id:'c_blackice',slot:'coat',name:'Black Ice parka',rar:4,p:'blackice',c:ICEC,glow:1},
 {id:'c_polar',slot:'coat',name:'Polar night parka',rar:4,p:'stars',c:['#060a18','#1a2448','#ffd27a'],glow:1},
 {id:'c_nordlys',slot:'coat',name:'Nordlys parka',rar:4,p:'nordlys',c:NORC,glow:1,ex:'q18'},
 // trousers
 {id:'p_issue',slot:'pants',name:'Issue trousers',rar:0,p:'solid',c:['#2b2f33']},
 {id:'p_khaki',slot:'pants',name:'Work khaki',rar:0,p:'solid',c:['#6b5f45']},
 {id:'p_snow',slot:'pants',name:'Snow camo trousers',rar:1,p:'camo',c:SNOWC},
 {id:'p_wood',slot:'pants',name:'Woodland trousers',rar:1,p:'camo',c:WOODC},
 {id:'p_digital',slot:'pants',name:'Digital tundra trousers',rar:2,p:'digital',c:TUNDC},
 {id:'p_tiger',slot:'pants',name:'Tiger stripe trousers',rar:2,p:'tiger',c:TIGC},
 {id:'p_carbon',slot:'pants',name:'Carbon weave trousers',rar:3,p:'carbon',c:CARBC},
 {id:'p_blackice',slot:'pants',name:'Black Ice trousers',rar:4,p:'blackice',c:ICEC,glow:1},
 // headgear (hidden while you wear a helmet)
 {id:'h_beanie',slot:'head',name:'Black watch cap',rar:0,style:'beanie',p:'solid',c:['#23262a']},
 {id:'h_cap',slot:'head',name:'Station cap',rar:0,style:'cap',p:'solid',c:['#4a5236']},
 {id:'h_blaze',slot:'head',name:'Blaze beanie',rar:0,style:'beanie',p:'solid',c:['#d0601c']},
 {id:'h_ushanka',slot:'head',name:'Fur ushanka',rar:1,style:'ushanka',p:'fur',c:['#5a3e28','#7a5a3a','#3a2818']},
 {id:'h_hood',slot:'head',name:'Snow camo hood',rar:1,style:'hood',p:'camo',c:SNOWC},
 {id:'h_fox',slot:'head',name:'Arctic fox ushanka',rar:2,style:'ushanka',p:'fur',c:['#e6e6e0','#ffffff','#b8bcb8']},
 {id:'h_tigerhood',slot:'head',name:'Tiger stripe hood',rar:2,style:'hood',p:'tiger',c:TIGC},
 {id:'h_officer',slot:'head',name:"Officer's cap",rar:3,style:'officer',p:'solid',c:['#1f2a3a'],acc:'#a8261e'},
 {id:'h_aurora',slot:'head',name:'Aurora beanie',rar:3,style:'beanie',p:'aurora',c:AURC,glow:1},
 {id:'h_blackice',slot:'head',name:'Black Ice hood',rar:4,style:'hood',p:'blackice',c:ICEC,glow:1},
 {id:'h_nordlys',slot:'head',name:'Nordlys hood',rar:4,style:'hood',p:'nordlys',c:NORC,glow:1,ex:'q18'},
 // masks
 {id:'m_bala',slot:'mask',name:'Balaclava',rar:0,face:'slit',c:['#1f2225']},
 {id:'m_bare',slot:'mask',name:'No mask',rar:0,face:'bare',c:['#c9a487']},
 {id:'m_red',slot:'mask',name:'Red balaclava',rar:1,face:'slit',c:['#8e2a20']},
 {id:'m_goggles',slot:'mask',name:'Snow goggles',rar:1,face:'goggles',c:['#2a2d30','#ff8a2a']},
 {id:'m_skull',slot:'mask',name:'Skull balaclava',rar:2,face:'skull',c:['#111315','#e8e4dc']},
 {id:'m_gas',slot:'mask',name:'Gas mask',rar:3,face:'gas',c:['#3a3f38','#7fa0a8']},
 {id:'m_ice',slot:'mask',name:'Ice visor',rar:4,face:'visor',c:['#0f141a','#5fe0ff'],glow:1},
 // gloves (you see these on your own hands)
 {id:'g_issue',slot:'gloves',name:'Issue gloves',rar:0,p:'solid',c:['#3a3a2c']},
 {id:'g_tan',slot:'gloves',name:'Tan leather',rar:0,p:'solid',c:['#8a6f4a']},
 {id:'g_white',slot:'gloves',name:'Arctic white gloves',rar:1,p:'solid',c:['#d8dee0']},
 {id:'g_red',slot:'gloves',name:'Signal red gloves',rar:2,p:'solid',c:['#a8261e']},
 {id:'g_carbon',slot:'gloves',name:'Carbon gloves',rar:3,p:'carbon',c:CARBC},
 {id:'g_gold',slot:'gloves',name:'Gilded gloves',rar:4,p:'gold',c:GOLDC},
 // weapon skins (own once, apply to any gun)
 {id:'w_factory',slot:'gun',name:'Factory finish',rar:0,p:'solid',c:['#5a5e62']},
 {id:'w_snow',slot:'gun',name:'Snow camo',rar:1,p:'camo',c:SNOWC,dk:'#4a555c'},
 {id:'w_wood',slot:'gun',name:'Woodland',rar:1,p:'camo',c:WOODC},
 {id:'w_sand',slot:'gun',name:'Sand',rar:1,p:'solid',c:['#b49a6a'],dk:'#5a4c34'},
 {id:'w_digital',slot:'gun',name:'Digital tundra',rar:2,p:'digital',c:TUNDC,dk:'#3e4c54'},
 {id:'w_tiger',slot:'gun',name:'Tiger stripe',rar:2,p:'tiger',c:TIGC},
 {id:'w_redline',slot:'gun',name:'Redline',rar:2,p:'redline',c:['#1b1d20','#c0392b'],dk:'#121315'},
 {id:'w_carbon',slot:'gun',name:'Carbon weave',rar:3,p:'carbon',c:CARBC,dk:'#111214'},
 {id:'w_damascus',slot:'gun',name:'Damascus',rar:3,p:'damascus',c:['#6d757a','#a7b0b5','#3d4347'],dk:'#2a2e31'},
 {id:'w_aurora',slot:'gun',name:'Aurora',rar:3,p:'aurora',c:AURC,glow:1,dk:'#0a0f1e'},
 {id:'w_gold',slot:'gun',name:'Gold',rar:4,p:'gold',c:GOLDC,dk:'#6a4c10'},
 {id:'w_blackice',slot:'gun',name:'Black Ice',rar:4,p:'blackice',c:ICEC,glow:1,dk:'#070b10'},
 {id:'w_nordlys',slot:'gun',name:'Nordlys',rar:4,p:'nordlys',c:NORC,glow:1,dk:'#26323a',ex:'q18'},
];
const COSM=Object.fromEntries(COS.map(c=>[c.id,c]));
const COS_SLOTS=[['coat','Parka'],['pants','Trousers'],['head','Headgear'],['mask','Mask'],['gloves','Gloves'],['gun','Weapon skins']];
const COS_DEF={coat:'c_issue',pants:'p_issue',head:'h_beanie',mask:'m_bala',gloves:'g_issue'};
const SKIN_GUNS=['makar','vintik','tundra','nord','akr','kestrel','nordlys','jarlmg'];
const CACHE_ODDS=[[1,60],[2,28],[3,9],[4,3]];
const PITY_VR=10, PITY_LEG=30, SCRIP_BASE=10, SCRIP_DUP={1:15,2:40,3:90,4:200}, SCRIP_MAKE={1:60,2:150,3:350,4:800};
const RAR_TXT=['#9fb0b8','#6fc2a0','#7ea6e6','#c08ae0','#e8b04a'];
function ensureCos(){
  if(!S.cos) S.cos={own:[],fit:Object.assign({},COS_DEF),guns:{},caches:1,scrip:0,opened:0,pity:{vr:0,leg:0},log:[]};
  const c=S.cos; c.own=(c.own||[]).filter(id=>COSM[id]); c.fit=Object.assign({},COS_DEF,c.fit||{}); for(const k in COS_DEF) if(!COSM[c.fit[k]]||COSM[c.fit[k]].slot!==k||!cosOwned(c.fit[k])) c.fit[k]=COS_DEF[k];
  c.guns=c.guns||{}; for(const g in c.guns) if(!COSM[c.guns[g]]||!cosOwned(c.guns[g])) delete c.guns[g];
  c.pity=c.pity||{vr:0,leg:0}; c.log=c.log||[]; c.caches=c.caches||0; c.scrip=c.scrip||0; c.opened=c.opened||0;
}
const cosOwned=id=>COSM[id]&&(COSM[id].rar===0||(S.cos&&S.cos.own.includes(id)));
const gunSkin=id=>(S.cos&&S.cos.guns[id])||'w_factory';
function grantCos(id){ if(!COSM[id]||cosOwned(id)) return false; S.cos.own.push(id); return true; }

/* ---- pattern textures (own seeded RNG: the raid's seeded rand must not be touched) ---- */
function speck(g,s,r,amt){ const im=g.getImageData(0,0,s,s); for(let i=0;i<im.data.length;i+=4){ const n=(r()-0.5)*amt; im.data[i]+=n; im.data[i+1]+=n; im.data[i+2]+=n; } g.putImageData(im,0,0); }
const PAT={
 solid:(g,s,c,r)=>{ g.fillStyle=c[0]; g.fillRect(0,0,s,s); speck(g,s,r,16); },
 camo:(g,s,c,r)=>{ g.fillStyle=c[0]; g.fillRect(0,0,s,s); for(let k=1;k<c.length;k++){ g.fillStyle=c[k]; for(let i=0;i<6;i++){ const x=r()*s,y=r()*s,w=3+r()*6,h=2+r()*3.5,a=r()*3; for(const dx of [-s,0,s]) for(const dy of [-s,0,s]){ g.beginPath(); g.ellipse(x+dx,y+dy,w,h,a,0,7); g.fill(); } } } speck(g,s,r,10); },
 digital:(g,s,c,r)=>{ g.fillStyle=c[0]; g.fillRect(0,0,s,s); for(let k=1;k<c.length;k++){ g.fillStyle=c[k]; for(let i=0;i<9;i++){ let x=(r()*s/2|0)*2, y=(r()*s/2|0)*2; for(let j=0;j<5;j++){ g.fillRect(((x%s)+s)%s,((y%s)+s)%s,2,2); x+=(r()<0.5?2:-2); y+=(r()<0.5?2:0); } } } },
 tiger:(g,s,c,r)=>{ g.fillStyle=c[0]; g.fillRect(0,0,s,s); for(let k=1;k<c.length;k++){ g.fillStyle=c[k]; for(let i=0;i<4;i++){ const y0=r()*s, ph=r()*6; for(let x=0;x<s;x++){ const y=y0+Math.sin(x/4+ph)*2.2; const h=1+((Math.sin(x/3+ph*2)+1)*1.3|0); g.fillRect(x,((Math.round(y)%s)+s)%s,1,h); } } } speck(g,s,r,10); },
 carbon:(g,s,c)=>{ for(let y=0;y<s;y+=4) for(let x=0;x<s;x+=4){ const a=((x>>2)+(y>>2))%2; g.fillStyle=a?c[0]:c[1]; g.fillRect(x,y,4,4); g.fillStyle='rgba(255,255,255,.07)'; if(a) g.fillRect(x,y,4,1); else g.fillRect(x,y,1,4); } },
 twotone:(g,s,c,r)=>{ g.fillStyle=c[0]; g.fillRect(0,0,s,s); g.fillStyle=c[1]; g.fillRect(0,Math.round(s*0.56),s,s); g.fillStyle=c[2]; g.fillRect(0,Math.round(s*0.5),s,2); speck(g,s,r,12); },
 damascus:(g,s,c,r)=>{ g.fillStyle=c[0]; g.fillRect(0,0,s,s); for(let i=0;i<10;i++){ g.strokeStyle=i%2?c[1]:c[2]; g.lineWidth=1; g.beginPath(); for(let x=0;x<=s;x++){ const y=i*s/9+Math.sin(x/5+i*1.3)*2.4+Math.sin(x/2.2+i)*0.7; if(x) g.lineTo(x,y); else g.moveTo(x,y); } g.stroke(); } },
 aurora:(g,s,c,r)=>{ const gr=g.createLinearGradient(0,0,0,s); gr.addColorStop(0,c[0]); gr.addColorStop(1,c[1]); g.fillStyle=gr; g.fillRect(0,0,s,s); for(let i=0;i<3;i++){ g.strokeStyle=c[2+i%2]; g.globalAlpha=0.85; g.lineWidth=2+(i%2); g.beginPath(); const y0=6+i*9, ph=r()*6; for(let x=0;x<=s;x++){ const y=y0+Math.sin(x/5+ph)*3; if(x) g.lineTo(x,y); else g.moveTo(x,y); } g.stroke(); } g.globalAlpha=1; },
 blackice:(g,s,c,r)=>{ g.fillStyle=c[0]; g.fillRect(0,0,s,s); speck(g,s,r,10); g.strokeStyle=c[1]; g.lineWidth=1; for(let i=0;i<6;i++){ let x=r()*s, y=r()*s; g.beginPath(); g.moveTo(x,y); for(let j=0;j<4;j++){ x+=(r()-0.5)*14; y+=(r()-0.5)*14; g.lineTo(x,y); } g.stroke(); } g.fillStyle=c[2]; for(let i=0;i<6;i++) g.fillRect(r()*s|0,r()*s|0,1,1); },
 gold:(g,s,c,r)=>{ const gr=g.createLinearGradient(0,0,s,s); gr.addColorStop(0,c[0]); gr.addColorStop(0.45,c[1]); gr.addColorStop(1,c[0]); g.fillStyle=gr; g.fillRect(0,0,s,s); g.fillStyle=c[2]; for(let i=0;i<4;i++){ const o=r()*s*2-s; for(let k=0;k<s;k++) g.fillRect(k,((o+k)%s+s)%s,1,1); } speck(g,s,r,10); },
 stars:(g,s,c,r)=>{ const gr=g.createLinearGradient(0,0,0,s); gr.addColorStop(0,c[0]); gr.addColorStop(1,c[1]); g.fillStyle=gr; g.fillRect(0,0,s,s); g.fillStyle='#fff'; for(let i=0;i<22;i++) g.fillRect(r()*s|0,r()*s|0,1,1); g.fillStyle=c[2]; for(let i=0;i<3;i++){ const x=r()*s|0,y=r()*s|0; g.fillRect(x-1,y,3,1); g.fillRect(x,y-1,1,3); } },
 fur:(g,s,c,r)=>{ g.fillStyle=c[0]; g.fillRect(0,0,s,s); for(let i=0;i<150;i++){ g.fillStyle=r()<0.5?c[1]:c[2]; g.fillRect(r()*s|0,r()*s|0,1,2+(r()*3|0)); } },
 redline:(g,s,c,r)=>{ g.fillStyle=c[0]; g.fillRect(0,0,s,s); speck(g,s,r,10); g.fillStyle=c[1]; g.fillRect(0,Math.round(s*0.42),s,3); g.fillRect(0,Math.round(s*0.6),s,1); },
 nordlys:(g,s,c,r)=>{ g.fillStyle=c[0]; g.fillRect(0,0,s,s); speck(g,s,r,8); for(let i=0;i<2;i++){ g.strokeStyle=c[1+i]; g.lineWidth=2; g.beginPath(); const y0=9+i*12, ph=r()*6; for(let x=0;x<=s;x++){ const y=y0+Math.sin(x/4+ph)*3; if(x) g.lineTo(x,y); else g.moveTo(x,y); } g.stroke(); } },
};
// mask front faces, 16x16
function faceDraw(g,m){
  const F=(x,y,w,h,col)=>{ g.fillStyle=col; g.fillRect(x,y,w,h); }; const skin='#c9a487', b=m.c[0];
  F(0,0,16,16,m.face==='bare'?skin:b);
  if(m.face==='slit'){ F(2,5,12,3,skin); F(4,6,2,1,'#141414'); F(10,6,2,1,'#141414'); }
  else if(m.face==='bare'){ F(3,4,3,1,'#5a3e28'); F(10,4,3,1,'#5a3e28'); F(4,6,2,1,'#141414'); F(10,6,2,1,'#141414'); F(7,7,2,3,'#b8906f'); F(6,11,4,1,'#8a5a48'); }
  else if(m.face==='goggles'){ F(0,4,16,4,'#151618'); F(2,4,5,4,m.c[1]); F(9,4,5,4,m.c[1]); F(3,5,2,1,'#ffe0b0'); F(10,5,2,1,'#ffe0b0'); }
  else if(m.face==='skull'){ const w=m.c[1]; F(3,2,10,8,w); F(4,10,8,4,w); F(4,5,3,3,b); F(9,5,3,3,b); F(7,8,2,2,b); for(let x=5;x<11;x+=2) F(x,11,1,2,b); }
  else if(m.face==='gas'){ F(2,4,5,5,'#1a1a1a'); F(9,4,5,5,'#1a1a1a'); F(3,5,3,3,m.c[1]); F(10,5,3,3,m.c[1]); F(6,10,4,5,'#555b60'); F(5,13,6,2,'#2a2d30'); }
  else if(m.face==='visor'){ F(1,4,14,5,m.c[1]); F(1,4,14,1,'#e0faff'); F(1,9,14,1,'#0a2a33'); }
}
const COSCV={};
function patCanvas(id){
  if(COSCV[id]) return COSCV[id]; const c=COSM[id]; const cv=document.createElement('canvas'); const g=cv.getContext('2d'); const r=mulberry32(hashStr('cos:'+id));
  if(c.face){ cv.width=cv.height=16; faceDraw(g,c); } else { cv.width=cv.height=32; (PAT[c.p]||PAT.solid)(g,32,c.c,r); }
  return COSCV[id]=cv;
}
function shadeHex(hex,k){ const n=parseInt(hex.slice(1),16); const ch=v=>Math.max(0,Math.min(255,Math.round(v*k))); return (ch(n>>16)<<16)|(ch((n>>8)&255)<<8)|ch(n&255); }
function cosMat(id,v=''){
  const key='cos:'+id+v; if(MATS[key]) return MATS[key]; const c=COSM[id]; let m;
  if(v==='dk') m=new THREE.MeshLambertMaterial({color:c.dk?parseInt(c.dk.slice(1),16):shadeHex(c.c[0],0.42)});
  else if(v==='side') m=new THREE.MeshLambertMaterial({color:parseInt(c.c[0].slice(1),16)});
  else { const t=new THREE.CanvasTexture(patCanvas(id)); t.magFilter=t.minFilter=THREE.NearestFilter; t.generateMipmaps=false; const o={map:t}; if(c.glow){ o.emissive=new THREE.Color(0xffffff); o.emissiveMap=t; o.emissiveIntensity=0.4; } m=new THREE.MeshLambertMaterial(o); }
  ps1(m); return MATS[key]=m;
}
// box faces are +x,-x,+y,-y,+z,-z; people face -z
function maskMats(id){ const s=cosMat(id,'side'); return [s,s,s,s,s,cosMat(id)]; }
function addHeadgear(B,c){
  const m=cosMat(c.id);
  if(c.style==='beanie'){ B(0.3,0.13,0.3,0,1.885,0,m,'head'); B(0.31,0.04,0.31,0,1.83,0,m,null); }
  else if(c.style==='cap'){ B(0.3,0.09,0.3,0,1.875,0,m,'head'); B(0.26,0.02,0.13,0,1.835,-0.2,m,null); }
  else if(c.style==='ushanka'){ B(0.34,0.14,0.34,0,1.9,0,m,'head'); B(0.05,0.18,0.24,-0.17,1.75,0.01,m,null); B(0.05,0.18,0.24,0.17,1.75,0.01,m,null); B(0.3,0.06,0.05,0,1.84,-0.17,m,null); }
  else if(c.style==='hood'){ B(0.37,0.08,0.37,0,1.885,0.01,m,'head'); B(0.045,0.34,0.34,-0.17,1.72,0.02,m,null); B(0.045,0.34,0.34,0.17,1.72,0.02,m,null); B(0.37,0.36,0.05,0,1.72,0.17,m,null); }
  else if(c.style==='officer'){ B(0.35,0.1,0.37,0,1.93,-0.01,m,'head'); B(0.3,0.05,0.3,0,1.86,0,MC(parseInt(c.acc.slice(1),16)),null); B(0.27,0.02,0.11,0,1.84,-0.19,MC(0x111111),null); }
}
const helmCol=cls=>cls>=6?0x222a32:cls>=4?0x3e4a3a:0xd8b13a, armorCol=cls=>cls>=6?0xd9e1e4:cls>=4?0x3b4636:0x5b5f50;
// look string carried in each online state message: coat|pants|head|mask|gloves|helmet class|armor class
function lookStr(){ const f=S.cos.fit; return [f.coat,f.pants,f.head,f.mask,f.gloves].join('|'); }
function gearLook(){ return (S.eq.helmet?ITEMS[S.eq.helmet.id].cls:0)+'|'+(S.eq.armor?ITEMS[S.eq.armor.id].cls:0); }
function parseLook(str){ const a=String(str||'').split('|'); const fit={}; ['coat','pants','head','mask','gloves'].forEach((k,i)=>{ fit[k]=COSM[a[i]]&&COSM[a[i]].slot===k?a[i]:COS_DEF[k]; }); return {fit,hv:Math.min(6,Math.max(0,a[5]|0)),av:Math.min(6,Math.max(0,a[6]|0))}; }
function lookOpts(fit,hv,av){ return {coatM:cosMat(fit.coat),pantsM:cosMat(fit.pants),maskM:maskMats(fit.mask),gloveM:cosMat(fit.gloves),hg:COSM[fit.head],helm:hv?helmCol(hv):null,hv,armor:av?armorCol(av):null}; }

/* ---- swatch icons for the UI ---- */
const SWATCH={};
function cosSwatch(id){
  if(SWATCH[id]) return SWATCH[id]; const c=COSM[id]; const cv=document.createElement('canvas'); cv.width=cv.height=48; const g=cv.getContext('2d');
  const src=patCanvas(id); const pat=g.createPattern(src,'repeat'); const dk='#'+((c.dk?parseInt(c.dk.slice(1),16):shadeHex(c.c[0],0.42))>>>0).toString(16).padStart(6,'0');
  const R_=(x,y,w,h,f)=>{ g.fillStyle=f; g.fillRect(x,y,w,h); };
  if(c.slot==='coat'){ R_(14,11,20,28,pat); R_(6,13,8,22,pat); R_(34,13,8,22,pat); R_(19,9,10,4,'#0e181d'); R_(23,13,2,26,'rgba(0,0,0,.35)'); }
  else if(c.slot==='pants'){ R_(13,8,22,6,pat); R_(13,13,10,30,pat); R_(25,13,10,30,pat); R_(13,8,22,2,'rgba(0,0,0,.35)'); }
  else if(c.slot==='head'){ R_(15,22,18,18,'#c9a487'); R_(18,28,3,2,'#141414'); R_(27,28,3,2,'#141414');
    if(c.style==='beanie'){ R_(13,10,22,14,pat); R_(12,20,24,5,pat); R_(12,20,24,1,'rgba(0,0,0,.3)'); }
    else if(c.style==='cap'){ R_(14,13,20,10,pat); R_(10,21,16,3,pat); }
    else if(c.style==='ushanka'){ R_(11,9,26,13,pat); R_(9,18,6,16,pat); R_(33,18,6,16,pat); R_(13,20,22,4,pat); }
    else if(c.style==='hood'){ R_(10,8,28,14,pat); R_(9,18,7,26,pat); R_(32,18,7,26,pat); }
    else { R_(12,8,24,12,pat); R_(14,18,20,4,c.acc||'#a8261e'); R_(11,21,18,3,'#111'); } }
  else if(c.slot==='mask'){ g.imageSmoothingEnabled=false; g.drawImage(src,8,8,32,32); }
  else if(c.slot==='gloves'){ R_(7,16,14,18,pat); R_(5,22,4,8,pat); R_(27,16,14,18,pat); R_(39,22,4,8,pat); R_(7,32,14,4,'rgba(0,0,0,.35)'); R_(27,32,14,4,'rgba(0,0,0,.35)'); }
  else { R_(4,20,12,6,pat); R_(15,18,20,7,pat); R_(35,20,11,3,dk); R_(19,25,5,10,dk); R_(27,25,4,8,pat); R_(18,15,10,3,dk); }
  return SWATCH[id]=cv.toDataURL();
}

/* ---- opening caches ---- */
function rollRar(r=Math.random){ return wpick(CACHE_ODDS,r); }
function rollCache(){
  const c=S.cos; let rar=rollRar();
  if(c.pity.leg>=PITY_LEG-1) rar=4; else if(c.pity.vr>=PITY_VR-1&&rar<3) rar=Math.random()<0.25?4:3;
  c.pity.vr=rar>=3?0:c.pity.vr+1; c.pity.leg=rar>=4?0:c.pity.leg+1;
  const pool=COS.filter(x=>x.rar===rar&&!x.ex); const fresh=pool.filter(x=>!cosOwned(x.id)); const from=fresh.length?fresh:pool;
  const item=from[Math.floor(Math.random()*from.length)]; const dup=!fresh.length; const scrip=SCRIP_BASE+(dup?SCRIP_DUP[rar]:0);
  if(!dup) c.own.push(item.id); c.scrip+=scrip; c.caches--; c.opened++;
  c.log.unshift({id:item.id,dup}); if(c.log.length>12) c.log.length=12;
  return {item,dup,scrip};
}
function equipCos(id,gun){ const c=COSM[id]; if(!cosOwned(id)) return; if(c.slot==='gun'){ if(id==='w_factory') delete S.cos.guns[gun]; else S.cos.guns[gun]=id; } else S.cos.fit[c.slot]=id; vmUid=null; saveGame(); }

/* ---- 3D preview on the Operator tab (its own small renderer; the canvas is kept between renders) ---- */
const PV={cv:null,r:null,scene:null,cam:null,char:null,gun:null,raf:0,key:'',slot:'coat',gunId:'akr',sel:null,spin:0,drag:null,last:0};
function pvInit(){
  if(PV.r) return true; if(!window.THREE) return false;
  PV.cv=document.createElement('canvas'); PV.cv.width=240; PV.cv.height=300; PV.cv.className='pvcv'; PV.cv.setAttribute('aria-label','Preview of your operator. Drag to turn.');
  try{ PV.r=new THREE.WebGLRenderer({canvas:PV.cv,antialias:false}); }catch(e){ PV.r=null; return false; }
  PV.r.setPixelRatio(1); PV.r.setSize(240,300,false); PV.r.setClearColor(0x0e181d);
  PV.scene=new THREE.Scene(); PV.scene.fog=new THREE.Fog(0x0e181d,6,14);
  PV.scene.add(new THREE.HemisphereLight(0xcfe3ff,0x3a4248,0.85)); const dl=new THREE.DirectionalLight(0xffe6cc,0.65); dl.position.set(2,3,2.5); PV.scene.add(dl);
  const fl=new THREE.Mesh(new THREE.CircleGeometry(1.4,20),new THREE.MeshLambertMaterial({color:0x9fb0b8})); fl.rotation.x=-Math.PI/2; PV.scene.add(fl);
  PV.cam=new THREE.PerspectiveCamera(34,240/300,0.05,30);
  PV.cv.addEventListener('pointerdown',e=>{ PV.drag={x:e.clientX,s:PV.spin}; PV.cv.setPointerCapture(e.pointerId); });
  PV.cv.addEventListener('pointermove',e=>{ if(PV.drag) PV.spin=PV.drag.s+(e.clientX-PV.drag.x)*0.012; });
  PV.cv.addEventListener('pointerup',()=>{ PV.drag=null; }); PV.cv.addEventListener('pointercancel',()=>{ PV.drag=null; });
  return true;
}
function pvFit(){ const f=Object.assign({},S.cos.fit); if(PV.sel&&COSM[PV.sel]&&COSM[PV.sel].slot!=='gun') f[COSM[PV.sel].slot]=PV.sel; return f; }
function pvSkin(){ return PV.sel&&COSM[PV.sel]&&COSM[PV.sel].slot==='gun'?PV.sel:gunSkin(PV.gunId); }
function pvDispose(o){ if(!o) return; PV.scene.remove(o); o.traverse(x=>{ if(x.geometry) x.geometry.dispose(); }); }
function pvBuild(){
  if(!PV.r) return; const fit=pvFit(), skin=pvSkin(); const key=JSON.stringify([fit,skin,PV.gunId,PV.slot,S.eq.helmet&&S.eq.helmet.id,S.eq.armor&&S.eq.armor.id]); if(key===PV.key) return; PV.key=key;
  pvDispose(PV.char); pvDispose(PV.gun);
  const h=humanoid(Object.assign(lookOpts(fit,0,0),{ud:{}})); PV.char=h.g; PV.scene.add(PV.char);
  const gw={att:{}}; PV.gun=buildGun(PV.gunId,gw,{noHands:true,skin,gloves:fit.gloves}); PV.gun.scale.setScalar(2.1); const wrap=new THREE.Group(); wrap.add(PV.gun);
  const bb=new THREE.Box3().setFromObject(PV.gun); const ctr=bb.getCenter(new THREE.Vector3()); PV.gun.position.sub(ctr); PV.gun=wrap; PV.scene.add(wrap);
  const gunView=PV.slot==='gun'; PV.char.visible=!gunView; wrap.visible=gunView; wrap.position.set(0,1.1,0);
}
function pvLoop(now){
  if(TAB!=='operator'||R||!PV.cv||!PV.cv.isConnected||$('#hub').hidden){ PV.raf=0; return; }
  PV.raf=requestAnimationFrame(pvLoop); const dt=Math.min(0.05,(now-(PV.last||now))/1000); PV.last=now;
  if(!PV.drag&&!matchMedia('(prefers-reduced-motion: reduce)').matches) PV.spin+=dt*0.5;
  const gunView=PV.slot==='gun';
  if(gunView){ PV.gun.rotation.y=Math.PI/2+Math.sin(PV.spin)*0.9; PV.gun.rotation.x=0.12; PV.cam.position.set(0,1.16,3.3); PV.cam.lookAt(0,1.1,0); }
  else { PV.char.rotation.y=PV.spin+Math.PI; const close=PV.slot==='head'||PV.slot==='mask'; if(close){ PV.cam.position.set(0,1.8,1.6); PV.cam.lookAt(0,1.76,0); } else { PV.cam.position.set(0,1.05,4.9); PV.cam.lookAt(0,0.95,0); } }
  PV.r.render(PV.scene,PV.cam);
}
function pvMount(host){ if(!pvInit()){ host.innerHTML='<p class="muted" style="padding:14px">3D preview needs WebGL.</p>'; return; } host.appendChild(PV.cv); pvBuild(); if(!PV.raf){ PV.last=0; PV.raf=requestAnimationFrame(pvLoop); } }

function cosCard(c){
  const own=cosOwned(c.id); const on=c.slot==='gun'?gunSkin(PV.gunId)===c.id:S.cos.fit[c.slot]===c.id;
  return `<button type="button" class="cos r${c.rar} ${own?'':'locked'} ${PV.sel===c.id?'sel':''}" data-cos="${c.id}" aria-pressed="${on}"><img src="${cosSwatch(c.id)}" alt=""><span class="cn">${esc(c.name)}</span><span class="cm" style="color:${RAR_TXT[c.rar]}">${RAR[c.rar]}${on?' · worn':own?'':c.ex?' · task reward':' · not owned'}</span></button>`;
}
function cosInfo(){
  const id=PV.sel; if(!id) return `<span class="lbl">Selected</span><p class="muted" style="margin:0">Click anything to try it on. Owned items are worn right away; locked ones show in the preview so you can see what you are chasing.</p>`;
  const c=COSM[id]; const own=cosOwned(id); const cost=SCRIP_MAKE[c.rar];
  const src=c.rar===0?'Standard issue: everyone has it.':c.ex?`Reward for the task <b>${esc(QMAP[c.ex]?QMAP[c.ex].title:c.ex)}</b>. Not in caches.`:`Drops from sealed caches (${RAR[c.rar]}, ${CACHE_ODDS.find(o=>o[0]===c.rar)[1]}% per cache), or make it with scrip.`;
  return `<span class="rtag r${c.rar}">${RAR[c.rar]}</span><h3>${esc(c.name)}</h3><p class="muted" style="margin:0">${src}${c.slot==='head'?' Hidden while you wear a helmet.':''}${c.slot==='gun'?` Applies to the ${esc(ITEMS[PV.gunId].name)}; pick another gun above to skin it too.`:''}</p>
   <div class="acts">${own?`<span class="tag ok">Owned</span>`:c.ex||!c.rar?'':`<button class="btn sm" id="cosMake" ${S.cos.scrip>=cost?'':'disabled'}>Make for ${cost} scrip</button>`}</div>`;
}
function renderOperator(body){
  ensureCos(); const c=S.cos; const owned=COS.filter(x=>cosOwned(x.id)).length;
  const items=COS.filter(x=>x.slot===PV.slot);
  body.innerHTML=`<section class="op">
   <div class="col">
    <div class="opview"><div id="pvHost" class="pvhost"></div><div class="pvbar"><span class="lbl">${PV.sel&&!cosOwned(PV.sel)?'Previewing · not owned':'Drag to turn'}</span><span class="lbl">Cosmetic only · no stats</span></div>
     <div class="opcache">
      <div class="colhead"><span class="lbl">Sealed caches</span><span class="lbl">Scrip <b class="scrip">${c.scrip}</b></span></div>
      <div class="cachecount"><b>${c.caches}</b><span class="muted">${c.caches===1?'cache':'caches'} ready to open</span></div>
      <button class="btn" id="openCache" ${c.caches?'':'disabled'}>${c.caches?'Open a cache':'No caches yet'}</button>
      <div class="odds">${CACHE_ODDS.map(([r,w])=>`<span class="r${r}"><b style="color:${RAR_TXT[r]}">${w}%</b>${RAR[r]}</span>`).join('')}</div>
      <p class="muted small">Very rare or better at least every ${PITY_VR} caches (next within ${PITY_VR-c.pity.vr}). Legendary at least every ${PITY_LEG} (within ${PITY_LEG-c.pity.leg}). You never get a duplicate until you own every item of that rarity; after that, duplicates turn into scrip. Every cache also gives ${SCRIP_BASE} scrip.</p>
      <details class="srcs"><summary>Where caches come from</summary><ul>
       <li>One for your first extraction each day</li><li>One for every daily task you turn in</li><li>One for every 10th extraction of your career</li>
       <li>Boss bodies always carry one; raiders and guards sometimes do</li><li>Every supply drop; sometimes lab safes, vault safes and cargo crates</li>
       <li>Some tasks</li></ul><p class="muted small">Caches you find in a raid only count if you extract with them, and they will not fit in the secure pouch.</p></details>
      ${c.log.length?`<div class="pulls"><span class="lbl">Recent</span>${c.log.slice(0,6).map(l=>`<span class="hchip r${COSM[l.id].rar}"><span class="hic" style="background-image:url(${cosSwatch(l.id)})"></span>${esc(COSM[l.id].name)}${l.dup?' · scrip':''}</span>`).join('')}</div>`:''}
     </div></div>
   </div>
   <div class="col">
    <div class="colhead"><h2 class="h2">Operator</h2><span class="lbl">Collection ${owned}/${COS.length}</span></div>
    <div class="seg cosslots" role="tablist">${COS_SLOTS.map(([k,l])=>`<button type="button" role="tab" aria-selected="${PV.slot===k}" data-cslot="${k}">${l}</button>`).join('')}</div>
    ${PV.slot==='gun'?`<div class="gunpick">${SKIN_GUNS.map(g=>`<button type="button" class="btn ghost sm ${PV.gunId===g?'on':''}" data-gpick="${g}">${esc(ITEMS[g].short)}</button>`).join('')}</div>`:''}
    <div class="cosgrid">${items.map(cosCard).join('')}</div>
    <div class="cosinfo" id="cosInfo">${cosInfo()}</div>
   </div></section>`;
  pvMount($('#pvHost'));
  body.querySelectorAll('[data-cslot]').forEach(b=>b.onclick=()=>{ PV.slot=b.dataset.cslot; PV.sel=null; renderTab(); });
  body.querySelectorAll('[data-gpick]').forEach(b=>b.onclick=()=>{ PV.gunId=b.dataset.gpick; PV.sel=null; renderTab(); });
  body.querySelectorAll('[data-cos]').forEach(b=>b.onclick=()=>{ const id=b.dataset.cos; PV.sel=id; if(cosOwned(id)){ equipCos(id,PV.gunId); sfxClick(); } renderTab(); });
  const mkb=$('#cosMake'); if(mkb) mkb.onclick=()=>{ const it=COSM[PV.sel]; const cost=SCRIP_MAKE[it.rar]; if(S.cos.scrip<cost||cosOwned(it.id)) return; S.cos.scrip-=cost; grantCos(it.id); equipCos(it.id,PV.gunId); sfxExtracted(); toast(`Made ${it.name} for ${cost} scrip.`); renderTab(); };
  $('#openCache').onclick=()=>openCache();
}
function cacheChime(rar){ const base=[392,440,523,587,659][rar]; const n=rar>=3?5:3; for(let i=0;i<n;i++) setTimeout(()=>sfxTone(base*Math.pow(1.26,i),0.5+(i===n-1?0.6:0),rar>=4?0.13:0.1,'triangle'),i*(rar>=4?140:110)); }
function openCache(){
  ensureCos(); if(!S.cos.caches) return; const res=rollCache(); saveGame(); const m=$('#cacheModal'); m.hidden=false;
  const N=44, WIN=38, CW=118; const cards=[]; const fill=()=>{ const rr_=rollRar(); const pool=COS.filter(x=>x.rar===rr_&&!x.ex); return pool[Math.floor(Math.random()*pool.length)]; };
  for(let i=0;i<N;i++) cards.push(i===WIN?res.item:fill());
  m.innerHTML=`<div class="card cachecard"><span class="lbl">Sealed cache · ${S.cos.caches} left after this one</span><h2>Opening…</h2>
   <div class="reelwrap" id="reelWrap"><div class="reel" id="reel">${cards.map((c,i)=>`<div class="rc r${c.rar}" data-i="${i}"><img src="${cosSwatch(c.id)}" alt=""><span>${esc(c.name)}</span></div>`).join('')}</div><div class="reelmark"></div></div>
   <div class="reveal" id="reveal" aria-live="polite"></div>
   <div class="acts" id="cacheActs"><button class="btn ghost" id="cacheSkip">Skip</button></div></div>`;
  const reel=$('#reel'), wrap=$('#reelWrap'); const W=wrap.getBoundingClientRect().width||600; const target=-(WIN*CW+55-W/2)+Math.round((Math.random()-0.5)*60);
  let done=false; const mode=OPTS.cacheAnim||'full'; let lastIdx=-1;
  const tick=()=>{ if(done) return; const mt=new DOMMatrixReadOnly(getComputedStyle(reel).transform); const idx=Math.floor((-mt.m41+W/2)/CW); if(idx!==lastIdx){ lastIdx=idx; sfxTone(1500,0.025,0.035,'square'); } requestAnimationFrame(tick); };
  const finish=()=>{ if(done) return; done=true; reel.style.transition='none'; reel.style.transform=`translateX(${target}px)`; const wc=reel.querySelector(`[data-i="${WIN}"]`); wc.classList.add('win');
    const it=res.item; cacheChime(it.rar); m.querySelector('h2').innerHTML=`<span style="color:${RAR_TXT[it.rar]}">${esc(it.name)}</span>`;
    $('#reveal').innerHTML=`<span class="rtag r${it.rar}">${RAR[it.rar]}</span> <span class="muted">${{coat:'Parka',pants:'Trousers',head:'Headgear',mask:'Mask',gloves:'Gloves',gun:'Weapon skin'}[it.slot]}</span><p style="margin:6px 0 0">${res.dup?`You already own every ${RAR[it.rar].toLowerCase()} item, so this one became <b>${res.scrip} scrip</b>.`:`New for your collection. +${res.scrip} scrip.`}</p>`;
    const gunNow=PV.gunId; $('#cacheActs').innerHTML=`${!res.dup?`<button class="btn" id="cacheEquip">${it.slot==='gun'?`Put on ${esc(ITEMS[gunNow].short)}`:'Wear it'}</button>`:''}${S.cos.caches?`<button class="btn ${res.dup?'':'ghost'}" id="cacheAgain">Open another (${S.cos.caches})</button>`:''}<button class="btn ghost" id="cacheDone">Done</button>`;
    const close=()=>{ m.hidden=true; m.innerHTML=''; if(TAB==='operator') renderTab(); else renderHeader(); };
    if($('#cacheEquip')) $('#cacheEquip').onclick=()=>{ if(it.slot!=='gun') PV.slot=it.slot; PV.sel=it.id; equipCos(it.id,gunNow); close(); };
    if($('#cacheAgain')) $('#cacheAgain').onclick=()=>openCache();
    $('#cacheDone').onclick=close; };
  $('#cacheSkip').onclick=finish; wrap.onclick=finish;
  if(mode==='instant'){ finish(); return; }
  const dur=mode==='short'?1.6:4.4;
  sfxNoise(0.4,500,0.25);
  // start from a laid-out frame, then animate; a timer backs up transitionend (some browsers drop it when the tab is busy)
  reel.style.transform='translateX(0px)'; void reel.offsetWidth;
  setTimeout(()=>{ if(done) return; reel.style.transition=`transform ${dur}s cubic-bezier(.1,.62,.1,1)`; reel.style.transform=`translateX(${target}px)`; tick(); },60);
  reel.addEventListener('transitionend',e=>{ if(e.target===reel) finish(); });
  setTimeout(finish,(dur+0.6)*1000);
}
