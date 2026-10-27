/* 33-music-chant: more Orthodox church pieces in the style of Zvon: a low male choir, a drone (ison), bells.
   Uses the instruments from 32-music-slavic.js (choirM, bell, dia). Five tracks appended to TRACKS:
   Vespers, Perezvon, Trezvon, Night Vigil, and Zvon (Long), which starts as Zvon and keeps going. */
const G_MIN=[0,2,3,5,7,9,10], E_MIN=[0,2,4,6,7,9,11], D_MAJ=[1,2,4,6,7,9,11];
const VOW=['o','a','o','e','o','u','a'];
// a sung line; each note takes the next vowel so the line sounds like words. o.map transposes it (a harmony line)
function sing(t,beat,str,o={}){ let k=o.v0||0; const vs=o.vowels||VOW;
  playMel(t,beat,str,(tt,m,d)=>{ const mm=o.map?o.map(m):m+(o.tr||0); choirM(tt,mm,d*0.97,o.vol||0.07,{att:o.att||0.15,rel:o.rel||0.45,vowel:o.vowel||vs[(k++)%vs.length],voices:o.voices||4,pan:o.pan||0,vib:o.vib,wet:o.wet}); }); }
// octavist: the basses who sing an octave under the bass line; a little sine underneath for the weight you feel more than hear
function octavist(t,midi,dur,vol){ choirM(t,midi,dur,vol,{att:1,rel:1.2,vowel:'u',voices:3,vib:0,spread:6,pan:-0.1});
  const a=MUS.ctx, o=a.createOscillator(), g=a.createGain(); o.type='sine'; o.frequency.value=mtof(midi); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol*1.4,t+1); g.gain.setValueAtTime(vol*1.4,t+Math.max(1,dur)); g.gain.linearRampToValueAtTime(0.0001,t+dur+1.2);
  o.connect(g); o.start(t); o.stop(t+dur+1.3); outNode(g,0,0.5); }
// a chord sung on each syllable: [[beats,'G2 D3 Bb3 D4'],...]
function respond(t,beat,seq,vol,vowels){ let tt=t; seq.forEach(([b,ch],j)=>{ chordM(ch).forEach((m,i)=>choirM(tt,m,b*beat*0.97,vol*(i===0?1.25:1),{att:0.12,rel:0.5,vowel:vowels[j%vowels.length],voices:3,pan:(i-1.5)*0.22})); tt+=b*beat; }); }
// perezvon: every bell struck once in turn, smallest to largest, over dur seconds (how a funeral is rung)
function perezvon(t,dur,bells,amt=1){ bells.forEach((n,j)=>{ const m=nm(n); bell(t+j*dur/bells.length,m,(m>=72?0.055:m>=55?0.065:0.085)*amt,{dec:m>=72?2.2:m>=55?4:9,pan:0.55-1.1*j/(bells.length-1)}); }); }
// a bell tower ringing in time: little bells in sixteenths, middle bells in one of three figures, the big bells on the strong beats
const TOWER_PATS=[[0,2,1,3,0,2,1,2,0,2,1,3,2,1,0,1],[0,-1,2,1,-1,3,0,-1,2,-1,1,3,-1,0,2,1],[0,1,2,3,2,1,0,1,0,1,2,3,3,2,1,0]];
function tower(t,bar,T,amt,variant=0){
  const B=bar/4, pat=TOWER_PATS[variant%3];
  for(let s=0;s<16;s++){ const ix=pat[s]; if(ix<0||(amt<0.6&&s%2)) continue; bell(t+s*B/4+(Math.random()-0.5)*0.01,nm(T.small[ix]),(s%4===0?0.05:0.032)*amt,{dec:1.6,pan:0.5-ix*0.25,wet:0.8}); }
  const mid=(b,j,v)=>bell(t+b*B,nm(T.mid[j]),0.07*amt*(v||1),{dec:3.2,pan:j?0.25:-0.3});
  if(variant%3===0) [0.5,1.5,2.5,3.5].forEach((b,j)=>mid(b,j%2));
  else if(variant%3===1) [[0.5,1],[0.75,0],[2.5,1],[2.75,0]].forEach(([b,j])=>mid(b,j));
  else [1,2,3].forEach((b,j)=>mid(b,j%2,b===2?1.2:1));
  bell(t,nm(T.big),0.16*amt,{dec:9}); if(variant%3!==2) bell(t+2*B,nm(T.big2),0.09*amt,{dec:6,pan:0.2}); else bell(t+2*B,nm(T.big),0.1*amt,{dec:7});
}

/* ---- Vespers: the deacon intones, the choir answers three times, then the evening hymn (G minor, 56 bpm) ---- */
const VS={beat:60/56,
 deacon:['D3:.5 D3:.5 D3:.5 D3:.5 D3:.5 D3:.5 Eb3:.5 D3:.5','D3:.5 D3:.5 D3:.5 D3:.5 F3:.5 Eb3:.5 D3:1','D3:.5 D3:.5 D3:.5 G3:1 F3:.5 Eb3:.5 D3:.5'],
 resp:[[[.5,'G2 D3 Bb3 D4'],[.5,'G2 D3 Bb3 D4'],[1,'F2 C3 A3 C4'],[.5,'Eb2 Eb3 G3 Bb3'],[.5,'D2 D3 F#3 A3'],[1,'G2 D3 G3 Bb3']],
       [[.5,'G2 D3 Bb3 D4'],[.5,'Eb2 Eb3 Bb3 Eb4'],[1,'F2 C3 A3 F4'],[.5,'Bb1 F3 Bb3 D4'],[.5,'D2 D3 F#3 A3'],[1,'G2 D3 G3 Bb3']],
       [[.5,'Bb2 F3 Bb3 D4'],[.5,'C3 G3 C4 Eb4'],[1,'D3 F#3 A3 D4'],[.5,'Eb2 G3 Bb3 Eb4'],[.5,'D2 F#3 A3 D4'],[1,'G2 D3 G3 B3']]],
 mel:['D4:2 D4:1 Eb4:1','D4:1 C4:1 Bb3:2','C4:1 D4:1 Eb4:1 C4:1','D4:4','G4:2 F4:1 Eb4:1','D4:1 Eb4:1 C4:2','Bb3:1 A3:1 G3:1 A3:1','G3:4'],
 bass:['G2','G2','C2','D2','Eb2','C2','D2','G2'],
 set:{small:['G5','Bb5','C6','D6'],mid:['G3','D4'],big:'G2',big2:'D2'},
};
// 2 bars of bell and drone, deacon and choir three times, the hymn in four parts, the hymn again with octavists and bells, 2 bars to close
function vespersBar(i,t,bar){
  const B=VS.beat;
  if(i<2){ bell(t,nm('G2'),0.16,{dec:10}); if(i===1) choirM(t,nm('G2'),bar,0.05,{att:2,vowel:'u',voices:4}); return; }
  if(i<8){ const k=i-2, r=Math.floor(k/2);
    if(k%2===0){ choirM(t,nm('G2'),bar,0.035,{att:0.8,vowel:'u',voices:4}); sing(t,B,VS.deacon[r],{vol:0.12,voices:2,att:0.05,rel:0.25,vib:4,pan:-0.12,wet:0.75,v0:r*3}); }
    else { respond(t,B,VS.resp[r],0.075+r*0.01,['o','o','e','o','e','u']); if(r===2) bell(t,nm('G2'),0.12,{dec:9}); }
    return; }
  if(i<24){ const k=(i-8)%8, full=i>=16, bs=nm(VS.bass[k]);
    choirM(t,bs,bar,0.055,{att:0.4,vowel:'o',voices:4}); choirM(t,bs+7,bar,0.028,{att:0.4,vowel:'o',pan:-0.25});
    sing(t,B,VS.mel[k],{vol:full?0.065:0.072,pan:0.05,v0:k*4});
    sing(t,B,VS.mel[k],{vol:0.045,map:m=>dia(m,-2,G_MIN),vowel:'a',voices:3,pan:0.3});
    if(full){ octavist(t,bs-12,bar,0.03); sing(t,B,VS.mel[k],{vol:0.018,tr:12,vowel:'a',voices:3,pan:-0.3}); if(k>=4) tower(t,bar,VS.set,k<6?0.55:0.8,k); else if(k%2===0) bell(t,nm('G2'),0.12,{dec:9}); }
    else if(k%4===0) bell(t,nm('G2'),0.1,{dec:9});
    return; }
  if(i===24){ bell(t,nm('G2'),0.16,{dec:12}); chordM('G2 D3 G3 B3 D4').forEach((m,j)=>choirM(t,m,bar*1.7,j<2?0.05:0.04,{att:1.2,rel:2.5,vowel:j<2?'u':'o',pan:(j-2)*0.15})); octavist(t,nm('G1'),bar*1.7,0.035); }
  if(i===25){ bell(t+B*2,nm('G2'),0.12,{dec:12}); bell(t+B*2.02,nm('D4'),0.04,{dec:4}); }
}

/* ---- Perezvon: the funeral toll, every bell once from the smallest down, under a lament (E minor, 48 bpm) ---- */
const PZ={beat:60/48,
 bells:['E6','D6','B5','A5','G5','E5','B4','E4','B2','E2'],
 mel:['E3:2 F#3:1 G3:1','A3:2 G3:1 F#3:1','G3:1 A3:1 B3:2','A3:4','B3:2 A3:1 G3:1','F#3:1 G3:1 A3:2','G3:1 F#3:1 E3:1 F#3:1','E3:4'],
 bass:['E2','D2','C2','D2','G2','D2','B1','E2'],
};
// 4 tolls alone, the lament in octaves with one bell a bar, the lament in parts with octavists and a toll every other bar, every bell at once to close
function perezvonBar(i,t,bar){
  const B=PZ.beat;
  if(i<4){ perezvon(t,bar,PZ.bells,i===0?0.8:1); if(i>=2) choirM(t,nm('E2'),bar,0.04,{att:2,vowel:'u',voices:4}); if(i===3) choirM(t,nm('B2'),bar,0.025,{att:2,vowel:'u'}); return; }
  if(i<12){ const k=(i-4)%8;
    choirM(t,nm('E2'),bar,0.045,{att:0.6,vowel:'u',voices:4}); choirM(t,nm('B2'),bar,0.025,{att:0.6,vowel:'u'});
    sing(t,B,PZ.mel[k],{vol:0.08,voices:5,v0:k*4,pan:0.05}); sing(t,B,PZ.mel[k],{vol:0.035,tr:-12,vowel:'o',voices:3,pan:-0.2});
    bell(t,nm('E3'),0.09,{dec:8,pan:-0.2}); return; }
  if(i<20){ const k=(i-12)%8, bs=nm(PZ.bass[k]);
    choirM(t,bs,bar,0.055,{att:0.5,vowel:'o',voices:4}); octavist(t,bs-12,bar,0.035); choirM(t,bs+7,bar,0.025,{att:0.5,vowel:'o',pan:-0.25});
    sing(t,B,PZ.mel[k],{vol:0.07,v0:k*4,pan:0.05}); sing(t,B,PZ.mel[k],{vol:0.045,map:m=>dia(m,2,E_MIN),vowel:'a',voices:3,pan:0.3});
    if(k%2===1) perezvon(t,bar,PZ.bells,0.55); else bell(t,nm('E3'),0.07,{dec:8,pan:-0.2});
    return; }
  if(i===20){ PZ.bells.forEach((n,j)=>{ const m=nm(n); bell(t+Math.random()*0.04,m,(m>=72?0.04:m>=55?0.05:0.09),{dec:m>=72?3:m>=55?5:12,pan:0.5-j*0.1}); });
    chordM('E2 B2 E3 G3 B3').forEach((m,j)=>choirM(t+0.3,m,bar*1.8,j<2?0.05:0.04,{att:1.5,rel:3,vowel:j<2?'u':'o',pan:(j-2)*0.15})); octavist(t+0.3,nm('E1'),bar*1.8,0.03); }
  if(i===21) perezvon(t+B,bar*1.3,PZ.bells,0.45);
  if(i===22) bell(t+B,nm('E2'),0.12,{dec:12});
}

/* ---- Trezvon: festival ringing and a bright hymn (D major, 84 bpm) ---- */
const PS={beat:60/84,
 mel:['A3:1 A3:1 D4:1 D4:1','E4:1 F#4:1 E4:1 D4:1','F#4:1 G4:1 A4:2','G4:1 F#4:1 E4:2','D4:1 E4:1 F#4:1 D4:1','G4:2 F#4:1 E4:1','F#4:1 E4:1 D4:1 C#4:1','D4:4'],
 bass:['D2','A2','D2','A1','B1','G2','A1','D2'],
 set:{small:['A5','B5','D6','F#6'],mid:['D4','A4'],big:'D2',big2:'A2'},
};
// the bells alone building up, the hymn over quiet bells, the hymn with the whole tower, the bells alone at full tilt, the hymn once more
function trezvonBar(i,t,bar){
  const B=PS.beat, sec=Math.floor(i/8), k=i%8, last=i===39, bs=nm(PS.bass[k]);
  if(last){ tower(t,bar,PS.set,0.8,0); chordM('D2 A2 D3 F#3 A3 D4').forEach((m,j)=>choirM(t,m,bar*1.8,j<2?0.05:0.042,{att:0.4,rel:2.5,vowel:j<2?'o':'a',pan:(j-2.5)*0.15})); octavist(t,nm('D1'),bar*1.8,0.03); bell(t+bar,nm('D2'),0.16,{dec:12}); return; }
  if(sec===0||sec===3) tower(t,bar,PS.set,sec===0?0.35+k*0.07:0.95,sec===0?(k<4?0:1):k);
  if(sec===1) tower(t,bar,PS.set,0.3,2);
  if(sec===2||sec===4) tower(t,bar,PS.set,sec===2?0.65:0.55,k);
  if(sec===1||sec===2||sec===4){
    choirM(t,bs,bar,0.055,{att:0.15,vowel:'o',voices:4}); choirM(t,bs+7,bar,0.028,{att:0.15,vowel:'a',pan:-0.25});
    sing(t,B,PS.mel[k],{vol:0.07,att:0.06,rel:0.3,vowels:['a','e','o','a','e','o'],v0:k*4,pan:0.05});
    sing(t,B,PS.mel[k],{vol:0.045,att:0.06,rel:0.3,map:m=>dia(m,-2,D_MAJ),vowel:'a',voices:3,pan:0.3});
    if(sec>=2){ sing(t,B,PS.mel[k],{vol:0.022,att:0.06,rel:0.3,tr:12,vowel:'a',voices:3,pan:-0.3}); octavist(t,bs-12,bar,0.025); }
  }
}

/* ---- Night Vigil: the slowest and deepest, a long chant over octavists, one distant bell (A minor, 42 bpm) ---- */
const NV={beat:60/42,
 mel:['A3:2 B3:1 C4:1','B3:1 A3:1 G3:1 A3:1','C4:1 D4:1 E4:2','D4:1 C4:1 B3:2','C4:2 B3:1 A3:1','G3:1 A3:1 B3:1 G3:1','A3:1 G3:1 F3:1 G3:1','A3:4'],
 bass:['A2','E2','C2','G2','F2','E2','D2','A2'],
};
// a distant bell over the octavists' drone, the chant in unison and octaves over the ison, the chant in parts, a long last chord
function vigilBar(i,t,bar){
  const B=NV.beat;
  if(i<4){ bell(t+B,nm('D4'),0.045,{dec:5,pan:0.35}); if(i>=1) octavist(t,nm('A1'),bar,0.04); if(i>=2) choirM(t,nm('A2'),bar,0.04,{att:2,vowel:'u',voices:4}); if(i===3) choirM(t,nm('E3'),bar,0.025,{att:2,vowel:'u',pan:0.2}); return; }
  if(i<12){ const k=(i-4)%8;
    octavist(t,nm('A1'),bar,0.04); choirM(t,nm('A2'),bar,0.045,{att:0.8,vowel:'u',voices:4}); choirM(t,nm('E3'),bar,0.02,{att:0.8,vowel:'u',pan:0.2});
    sing(t,B,NV.mel[k],{vol:0.075,voices:5,att:0.3,rel:0.6,v0:k*4}); sing(t,B,NV.mel[k],{vol:0.04,tr:-12,vowel:'o',voices:3,att:0.3,rel:0.6,pan:-0.2});
    if(k%4===0) bell(t,nm('A2'),0.1,{dec:11}); return; }
  if(i<18){ const k=(i-12)%8, bs=nm(NV.bass[k]);
    octavist(t,bs-12,bar,0.045); choirM(t,bs,bar,0.055,{att:0.6,vowel:'o',voices:4}); choirM(t,bs+7,bar,0.025,{att:0.6,vowel:'o',pan:-0.25});
    sing(t,B,NV.mel[k],{vol:0.068,att:0.3,rel:0.6,v0:k*4}); sing(t,B,NV.mel[k],{vol:0.045,att:0.3,rel:0.6,map:m=>dia(m,-2,A_MIN),vowel:'a',voices:3,pan:0.3});
    if(k%2===0) bell(t+B*2,nm('D4'),0.04,{dec:5,pan:0.35}); return; }
  if(i===18){ chordM('A2 E3 A3 C4 E4').forEach((m,j)=>choirM(t,m,bar*1.8,j<2?0.05:0.04,{att:1.5,rel:3,vowel:j<2?'u':'o',pan:(j-2)*0.15})); octavist(t,nm('A1'),bar*1.8,0.045); bell(t,nm('A2'),0.12,{dec:12}); }
  if(i===19) bell(t+B*2,nm('D4'),0.035,{dec:6,pan:0.35});
}

/* ---- Zvon (Long): Zvon at full length. The same opening, then the peal stays, a second chant joins it, and the
   ringer speeds up from 52 to 96 bpm with the choir riding on top, before slowing to the last bell (D minor) ---- */
const ZL={
 B:['D4:2 C4:1 Bb3:1','A3:1 Bb3:1 C4:2','D4:1 E4:1 F4:1 E4:1','D4:4','C4:1 Bb3:1 A3:1 G3:1','A3:1 Bb3:1 A3:2','F3:1 G3:1 E3:2','D3:4'],
 bassB:['Bb1','F2','D2','Bb1','C2','F2','A1','D2'],
 set:{small:['A5','C6','D6','F6'],mid:['D4','A4'],big:'D2',big2:'A2'},
};
// tempo per bar: Zvon's 52 for the first 28 bars, then a steady push to 96 by bar 51, then a slowing to the end
function zlBpm(i){ if(i<28) return 52; if(i<52) return 52+(i-28)*(96-52)/23; return Math.max(56,96-(i-51)*10); }
const zvonLongBarAt=i=>4*60/zlBpm(i);
// the chant in three parts, as in Zvon: bass and its octave and fifth, the tune, a third above it
function zlChant(t,B,bar,mel,bass,o={}){
  const bs=nm(bass); choirM(t,bs,bar,0.06,{att:0.3,vowel:'o',voices:4}); choirM(t,bs-12,bar,0.03,{att:0.5,vowel:'u',vib:0}); choirM(t,bs+7,bar,0.03,{att:0.3,vowel:'o',pan:-0.25});
  if(o.oct) octavist(t,bs-12,bar,0.03);
  const att=Math.min(0.18,B*0.25);
  playMel(t,B,mel,(tt,m,d)=>{ choirM(tt,m,d*0.98,o.vol||0.07,{att,rel:0.4,vowel:'o',voices:4,pan:0.05}); choirM(tt,dia(m,2,D_MIN),d*0.98,0.05,{att,rel:0.4,vowel:'a',pan:0.3}); if(o.high) choirM(tt,m+12,d*0.98,0.02,{att,rel:0.4,vowel:'a',voices:3,pan:-0.3}); });
}
// extra little bells between the sixteenths, for the climax
function zlSparkle(t,bar,amt){ const B=bar/4; for(let s=0;s<16;s++){ if(Math.random()<0.5) continue; const ix=Math.floor(Math.random()*4); bell(t+(s+0.5)*B/4,nm(ZL.set.small[ix]),0.022*amt,{dec:1.2,pan:0.6-ix*0.3,wet:0.85}); } }
function zvonLongBar(i,t,bar){
  const B=bar/4;
  if(i<20) return zvonBar(i,t,bar); // the opening is Zvon itself
  if(i<28){ const k=i-20; zlChant(t,B,bar,ZL.B[k],ZL.bassB[k]); tower(t,bar,ZL.set,0.8,k%2); return; }
  if(i<36){ const k=i-28; // the peal alone, getting faster, over the drone
    tower(t,bar,ZL.set,0.85+k*0.02,k); choirM(t,nm('D2'),bar,0.05,{att:0.5,vowel:'u',voices:4}); choirM(t,nm('A2'),bar,0.03,{att:0.5,vowel:'u'}); octavist(t,nm('D1'),bar,0.02+k*0.003);
    if(k>=6) choirM(t+B*2,nm('D3'),B*2,0.035,{att:0.4,vowel:'o'}); return; }
  if(i<44){ const k=i-36; zlChant(t,B,bar,ZV.mel[k],ZV.bass[k],{oct:true}); tower(t,bar,ZL.set,0.72,k); return; }
  if(i<52){ const k=i-44; zlChant(t,B,bar,ZL.B[k],ZL.bassB[k],{oct:true,high:true,vol:0.075}); tower(t,bar,ZL.set,0.95,k); zlSparkle(t,bar,k<4?0.6:1);
    if(k>=4){ bell(t+B,nm('A2'),0.07,{dec:4,pan:0.2}); bell(t+B*3,nm('A2'),0.07,{dec:4,pan:0.2}); } return; }
  if(i===52){ zlChant(t,B,bar,'F3:1 E3:1 D3:1 E3:1','A1',{oct:true}); tower(t,bar,ZL.set,0.6,0); return; }
  if(i===53){ tower(t,bar,ZL.set,0.35,0); bell(t,nm('D2'),0.16,{dec:12}); chordM('D2 A2 D3 F3 A3').forEach((m,j)=>choirM(t,m,bar*2,j<2?0.05:0.04,{att:0.8,rel:3,vowel:j<2?'u':'o',pan:(j-2)*0.15})); octavist(t,nm('D1'),bar*2,0.035); return; }
  if(i===54){ ['F6','D6','C6','A5','A4','D4'].forEach((n,j)=>bell(t+j*bar/6,nm(n),nm(n)>=72?0.04:0.06,{dec:3,pan:0.5-j*0.2})); return; }
  if(i===55){ bell(t+B*0.5,nm('D2'),0.13,{dec:12}); bell(t+B*0.52,nm('A4'),0.035,{dec:4}); }
}

TRACKS.push(
 {id:'vespers',name:'Vespers',bar:VS.beat*4,len:26,play:vespersBar,tail:9,gain:2.4},
 {id:'perezvon',name:'Perezvon',bar:PZ.beat*4,len:23,play:perezvonBar,tail:10,gain:2.5},
 {id:'trezvon',name:'Trezvon',bar:PS.beat*4,len:40,play:trezvonBar,tail:9,gain:1.8},
 {id:'vigil',name:'Night Vigil',bar:NV.beat*4,len:20,play:vigilBar,tail:11,gain:2.7},
 {id:'zvonlong',name:'Zvon (Long)',bar:4*60/52,barAt:zvonLongBarAt,len:56,play:zvonLongBar,tail:11,gain:2.2},
);
