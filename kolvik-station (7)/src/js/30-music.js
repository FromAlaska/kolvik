/* 30-music: synthesized menu music: instruments and the eight original tracks (32-music-slavic and 33-music-chant add eight more) */
/* ================= MENU MUSIC (original, synthesized) ================= */
// Slow monastic chant over choir pads, then piano and low drums. Original composition in D minor.
const MUS = {ctx:null, on:false, master:null, rev:null, timer:null, step:0, next:0};
function ensureAudio(){
  if(!MUS.ctx){ try{ MUS.ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; } buildAudioGraph(); }
  if(MUS.ctx.state==='suspended') MUS.ctx.resume();
  return MUS.ctx;
}
function buildAudioGraph(){
  const a=MUS.ctx;
  MUS.out=a.createGain(); MUS.out.gain.value=0.9; MUS.out.connect(a.destination);
  MUS.master=a.createGain(); MUS.master.gain.value=0; MUS.master.connect(MUS.out);
  // generated hall reverb
  const len=a.sampleRate*4.5, ir=a.createBuffer(2,len,a.sampleRate);
  for(let c=0;c<2;c++){ const d=ir.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6); }
  MUS.rev=a.createConvolver(); MUS.rev.buffer=ir; const rg=a.createGain(); rg.gain.value=0.75; MUS.rev.connect(rg); rg.connect(MUS.master);
  MUS.dry=a.createGain(); MUS.dry.gain.value=0.45; MUS.dry.connect(MUS.master);
  // sfx bus
  MUS.sfx=a.createGain(); MUS.sfx.gain.value=0.8; MUS.sfx.connect(MUS.out);
  const nl=a.sampleRate*0.8; MUS.noise=a.createBuffer(1,nl,a.sampleRate); const nd=MUS.noise.getChannelData(0); for(let i=0;i<nl;i++) nd[i]=Math.random()*2-1;
}
const mtof = m => 440*Math.pow(2,(m-69)/12);
function send(node){ node.connect(MUS.dry); node.connect(MUS.rev); }
// choir "aah" voice: two detuned saws through vowel formants
function voice(t, midi, dur, vol, att=1.6){
  const a=MUS.ctx, g=a.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+att); g.gain.setValueAtTime(vol,t+Math.max(att,dur-1.2)); g.gain.linearRampToValueAtTime(0,t+dur+1.5);
  const sum=a.createGain(); sum.gain.value=0.5;
  [-7,6].forEach(cents=>{ const o=a.createOscillator(); o.type='sawtooth'; o.frequency.value=mtof(midi); o.detune.value=cents; const lfo=a.createOscillator(), lg=a.createGain(); lfo.frequency.value=4.6+Math.random()*0.8; lg.gain.value=5; lfo.connect(lg); lg.connect(o.detune); o.connect(sum); o.start(t); o.stop(t+dur+1.6); lfo.start(t); lfo.stop(t+dur+1.6); });
  [[700,6,1],[1150,7,.55],[2600,9,.18]].forEach(([f,q,gn])=>{ const bp=a.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=f; bp.Q.value=q; const fg=a.createGain(); fg.gain.value=gn; sum.connect(bp); bp.connect(fg); fg.connect(g); });
  send(g);
}
function piano(t, midi, vol){
  const a=MUS.ctx, g=a.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+0.008); g.gain.exponentialRampToValueAtTime(vol*0.25,t+0.6); g.gain.exponentialRampToValueAtTime(0.0008,t+3.2);
  [[1,'triangle',1],[2,'sine',.35],[3,'sine',.12]].forEach(([h,ty,gv])=>{ const o=a.createOscillator(); o.type=ty; o.frequency.value=mtof(midi)*h; const og=a.createGain(); og.gain.value=gv; o.connect(og); og.connect(g); o.start(t); o.stop(t+3.3); });
  send(g);
}
function strings(t, midi, dur, vol){
  const a=MUS.ctx, g=a.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+2); g.gain.setValueAtTime(vol,t+dur-1); g.gain.linearRampToValueAtTime(0,t+dur+1);
  const lp=a.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=520; lp.connect(g);
  [-4,4].forEach(c=>{ const o=a.createOscillator(); o.type='sawtooth'; o.frequency.value=mtof(midi); o.detune.value=c; o.connect(lp); o.start(t); o.stop(t+dur+1.1); });
  send(g);
}
function drum(t, vol, pitch=58){
  const a=MUS.ctx, o=a.createOscillator(), g=a.createGain(); o.type='sine'; o.frequency.setValueAtTime(pitch*2.2,t); o.frequency.exponentialRampToValueAtTime(pitch,t+0.18);
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+1.1); o.connect(g); send(g); o.start(t); o.stop(t+1.2);
  const n=a.createBufferSource(); n.buffer=MUS.noise; const f=a.createBiquadFilter(); f.type='lowpass'; f.frequency.value=900; const ng=a.createGain(); ng.gain.setValueAtTime(vol*0.25,t); ng.gain.exponentialRampToValueAtTime(0.001,t+0.12); n.connect(f); f.connect(ng); send(ng); n.start(t); n.stop(t+0.15);
}
// chord roots + voicings (original progression), 1 bar = 4.4s
const BAR=4.4;
const PROG=[[50,[62,65,69]],[46,[62,65,70]],[53,[60,65,69]],[48,[60,64,67]],[50,[62,65,69]],[43,[62,67,70]],[46,[62,65,70]],[45,[61,64,69]]];
// chant melody per bar: [beat offset in bars, midi, length in bars]
const CHANT=[
 [[0,62,.5],[.5,64,.25],[.75,65,.25]],[[0,67,.5],[.5,65,.5]],[[0,64,.75],[.75,62,.25]],[[0,64,1]],
 [[0,62,.25],[.25,65,.25],[.5,69,.5]],[[0,67,.5],[.5,70,.5]],[[0,69,.5],[.5,67,.25],[.75,65,.25]],[[0,64,.5],[.5,61,.5]]];
const ARP=[0,2,1,2,0,2,1,3];
function scheduleBar(i, t){
  const cycle=Math.floor(i/8), b=i%8, [root,ch]=PROG[b];
  const section = cycle%4; // 0 pads, 1 +chant, 2 +piano+drums, 3 full
  ch.forEach((m,k)=>voice(t+k*0.05, m, BAR, 0.05));
  voice(t, root+12, BAR, 0.045);
  strings(t, root-12, BAR, 0.05);
  if(section>=1) CHANT[b].forEach(([o,m,l])=>voice(t+o*BAR, m-12, l*BAR, 0.075, 0.25));
  if(section>=2){ const notes=[root+24, ...ch.map(m=>m+12)]; for(let s=0;s<8;s++){ pianoN(t+s*BAR/8, notes[ARP[s]], 0.28, BAR*0.6); } }
  if(section===3) playMel(t, BAR/4, CHANT_VLN[b], (tt,m,d)=>violin(tt,m,d,0.05,{pan:0.25}));
  if(section>=2){ drum(t,0.5); drum(t+BAR*0.5,0.28); if(section===3){ drum(t+BAR*0.75,0.2,70); drum(t+BAR*0.875,0.2,70); } }
}
/* ---- instruments ---- */
function outNode(node,pan=0,wet=0.8){ const a=MUS.ctx; if(MUS.vmul&&MUS.vmul!==1){ const vg=a.createGain(); vg.gain.value=MUS.vmul; node.connect(vg); node=vg; } let pn=node; if(a.createStereoPanner){ pn=a.createStereoPanner(); pn.pan.value=clamp(pan,-1,1); node.connect(pn); } pn.connect(MUS.dry); const w=a.createGain(); w.gain.value=wet; pn.connect(w); w.connect(MUS.rev); }
// bowed strings: detuned saws through violin-body resonances, vibrato that blooms after the attack, a little bow noise
function bowed(t,midi,dur,vol,o={}){
  const a=MUS.ctx, f=mtof(midi), n=o.voices||3, att=o.att!=null?o.att:0.12, rel=o.rel!=null?o.rel:0.35;
  const g=a.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+att);
  if(dur>1.2){ g.gain.linearRampToValueAtTime(vol*1.15,t+dur*0.6); g.gain.linearRampToValueAtTime(vol*0.95,t+dur); } else g.gain.setValueAtTime(vol,t+Math.max(att,dur));
  g.gain.linearRampToValueAtTime(0.0001,t+dur+rel);
  const mix=a.createGain(); mix.gain.value=1/n;
  for(let i=0;i<n;i++){ const osc=a.createOscillator(); osc.type='sawtooth'; osc.frequency.value=f; osc.detune.value=(i-(n-1)/2)*(o.detune!=null?o.detune:6)+(Math.random()-0.5)*3;
    if(o.vib!==0){ const lfo=a.createOscillator(); lfo.frequency.value=(o.vibHz||5.4)+(Math.random()-0.5)*0.7; const lg=a.createGain(); lg.gain.setValueAtTime(0,t); lg.gain.linearRampToValueAtTime(o.vib||13,t+Math.min(dur,0.55)); lfo.connect(lg); lg.connect(osc.detune); lfo.start(t); lfo.stop(t+dur+rel+0.05); }
    osc.connect(mix); osc.start(t); osc.stop(t+dur+rel+0.05); }
  const hp=a.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=Math.max(50,f*0.6);
  const b1=a.createBiquadFilter(); b1.type='peaking'; b1.frequency.value=o.f1||480; b1.gain.value=4; b1.Q.value=1.2;
  const b2=a.createBiquadFilter(); b2.type='peaking'; b2.frequency.value=o.f2||2900; b2.gain.value=5; b2.Q.value=1.4;
  const lp=a.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=o.bright||3800; lp.Q.value=0.6;
  mix.connect(hp); hp.connect(b1); b1.connect(b2); b2.connect(lp); lp.connect(g);
  if(att<0.3){ const nz=a.createBufferSource(); nz.buffer=MUS.noise; const nf=a.createBiquadFilter(); nf.type='bandpass'; nf.frequency.value=Math.min(8000,f*3); nf.Q.value=2; const ng=a.createGain(); ng.gain.setValueAtTime(vol*0.22,t); ng.gain.exponentialRampToValueAtTime(0.0001,t+0.14); nz.connect(nf); nf.connect(ng); ng.connect(g); nz.start(t,Math.random()*0.5); nz.stop(t+0.16); }
  outNode(g,o.pan||0,o.wet!=null?o.wet:0.85);
}
const violin=(t,m,d,v,o={})=>bowed(t,m,d,v,Object.assign({voices:2,detune:4,vib:16,bright:5200,att:0.1},o));
const vSection=(t,m,d,v,o={})=>bowed(t,m,d,v,Object.assign({voices:4,detune:10,vib:10,bright:3800,att:0.35,rel:0.6},o));
const cello=(t,m,d,v,o={})=>bowed(t,m,d,v,Object.assign({voices:3,detune:7,vib:9,vibHz:5,bright:1700,f1:250,f2:1200,att:0.2,pan:-0.3},o));
const spicc=(t,m,v,o={})=>bowed(t,m,0.06,v,Object.assign({voices:2,detune:8,vib:0,bright:4200,att:0.008,rel:0.09,wet:0.5},o));
// piano: slightly inharmonic partials on two detuned strings, hammer thump, low notes ring longer; dur is when the damper falls
function pianoN(t,midi,vel=0.4,dur=2.5,pan){
  const a=MUS.ctx, f=mtof(midi); const g=a.createGain(); g.gain.setValueAtTime(vel,t); g.gain.setValueAtTime(vel,t+dur); g.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.4);
  const lp=a.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=Math.min(11000,900+vel*7000+f*1.5);
  const dec=Math.max(1.4,7-(midi-40)*0.09); const end=t+Math.min(dec,dur+0.45)+0.05;
  for(let k=1;k<=5;k++){ const fk=f*k*Math.sqrt(1+0.0004*k*k); if(fk>14000) break; const amp=(k===1?0.5:0.32)/Math.pow(k,1.2); const d=dec/(1+(k-1)*0.6);
    for(const det of (k<=2?[-1.4,1.4]:[0])){ const o=a.createOscillator(); o.type='sine'; o.frequency.value=fk; o.detune.value=det; const og=a.createGain();
      og.gain.setValueAtTime(0,t); og.gain.linearRampToValueAtTime(amp,t+0.004); og.gain.exponentialRampToValueAtTime(amp*0.4,t+Math.min(0.3,d*0.12)); og.gain.exponentialRampToValueAtTime(0.0001,t+d);
      o.connect(og); og.connect(lp); o.start(t); o.stop(end); } }
  const nz=a.createBufferSource(); nz.buffer=MUS.noise; const nf=a.createBiquadFilter(); nf.type='bandpass'; nf.frequency.value=Math.min(6000,f*4); nf.Q.value=1; const ng=a.createGain(); ng.gain.setValueAtTime(vel*0.12,t); ng.gain.exponentialRampToValueAtTime(0.0001,t+0.03); nz.connect(nf); nf.connect(ng); ng.connect(g); nz.start(t,Math.random()*0.5); nz.stop(t+0.04);
  lp.connect(g); outNode(g,pan!=null?pan:clamp((midi-62)/36,-0.6,0.6),0.6);
}
function timp(t,midi,vel=0.5){ const a=MUS.ctx, f=mtof(midi); const o=a.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(f*1.08,t); o.frequency.exponentialRampToValueAtTime(f,t+0.08); const g=a.createGain(); g.gain.setValueAtTime(vel,t); g.gain.exponentialRampToValueAtTime(0.0001,t+1.8); o.connect(g); o.start(t); o.stop(t+1.9);
  const o2=a.createOscillator(); o2.type='sine'; o2.frequency.value=f*1.5; const g2=a.createGain(); g2.gain.setValueAtTime(vel*0.3,t); g2.gain.exponentialRampToValueAtTime(0.0001,t+0.6); o2.connect(g2); g2.connect(g); o2.start(t); o2.stop(t+0.7);
  const nz=a.createBufferSource(); nz.buffer=MUS.noise; const nf=a.createBiquadFilter(); nf.type='lowpass'; nf.frequency.value=500; const ng=a.createGain(); ng.gain.setValueAtTime(vel*0.4,t); ng.gain.exponentialRampToValueAtTime(0.0001,t+0.08); nz.connect(nf); nf.connect(ng); ng.connect(g); nz.start(t); nz.stop(t+0.1); outNode(g,-0.1,0.7); }
function timpRoll(t,midi,dur,v0,v1){ const n=Math.floor(dur/0.07); for(let i=0;i<n;i++) timp(t+i*0.07,midi,(v0+(v1-v0)*i/n)*(0.8+Math.random()*0.3)); }
function swell(t,dur,vol){ const a=MUS.ctx; const nz=a.createBufferSource(); nz.buffer=MUS.noise; nz.loop=true; const hp=a.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=5000; const g=a.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+dur); g.gain.linearRampToValueAtTime(0,t+dur+0.4); nz.connect(hp); hp.connect(g); outNode(g,0,1); nz.start(t); nz.stop(t+dur+0.5); }
function snare(t,vol){ const a=MUS.ctx; const nz=a.createBufferSource(); nz.buffer=MUS.noise; const bp=a.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1800; bp.Q.value=0.8; const g=a.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.18); nz.connect(bp); bp.connect(g); outNode(g,0.1,0.6); nz.start(t,Math.random()*0.5); nz.stop(t+0.2); }

/* ---- notation helpers: "E5:1.5 G5:.5 r:1" = note:beats ---- */
const NOTE_IX={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function nm(x){ const m=/^([A-G])([#b]?)(-?\d)$/.exec(x); return 12*(+m[3]+1)+NOTE_IX[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0); }
function mel(str){ const out=[]; let b=0; for(const tok of str.trim().split(/\s+/)){ const [n,l]=tok.split(':'); const len=+l; if(n!=='r') out.push([b,nm(n),len]); b+=len; } return out; }
function playMel(t,beat,str,fn){ if(!str) return; for(const [b,m,l] of mel(str)) fn(t+b*beat,m,l*beat); }
const chordM=str=>str.trim().split(/\s+/).map(nm);
const CHANT_VLN=['A5:2 F5:2','F5:2 D5:2','C6:2 A5:2','G5:4','A5:1 C6:1 D6:2','D6:2 Bb5:2','F6:2 D6:2','E6:4'];

/* ---- Frost Line: piano motif, violins take it, full strings, piano alone again (E minor, 72 bpm) ---- */
const FL={beat:60/72,
 ch:{Em:['E2','E3 B3 E4 G4 B4 G4 E4 B3','E3 G3 B3 E4'],C:['C2','C3 G3 C4 E4 G4 E4 C4 G3','C3 E3 G3 C4'],G:['G1','G2 D3 G3 B3 D4 B3 G3 D3','G2 B2 D3 G3'],DF:['F#2','D3 A3 D4 F#4 A4 F#4 D4 A3','D3 F#3 A3 D4'],
     Am:['A1','A2 E3 A3 C4 E4 C4 A3 E3','A2 C3 E3 A3'],B:['B1','B2 F#3 B3 D#4 F#4 D#4 B3 F#3','B2 D#3 F#3 B3'],D:['D2','D3 A3 D4 F#4 A4 F#4 D4 A3','D3 F#3 A3 D4'],EmD:['D2','E3 B3 E4 G4 B4 G4 E4 B3','D3 G3 B3 E4']},
 prog:['Em','C','G','DF','Em','Am','C','B', 'Em','C','G','DF','Em','Am','C','B', 'C','D','Em','EmD','C','D','B','B', 'Em','C','G','DF','Em','Am','C','Em'],
 motif:['E5:1.5 G5:.5 F#5:1 D5:1','E5:2 C5:1 B4:1','D5:1.5 E5:.5 G5:1 B5:1','A5:3 F#5:1','G5:1.5 F#5:.5 E5:1 B4:1','C5:1.5 D5:.5 E5:1 A5:1','G5:2 E5:1 D5:1','D#5:3 r:1'],
 answer:['B4:1 E5:1 G5:1 B5:1','C6:2 B5:1 A5:1','G5:2 E5:1 G5:1','F#5:3 D#5:1'],
 climax:['E5:1 G5:1 B5:2','A5:1 F#5:1 D5:2','E5:1 G5:1 B5:1 E6:1','D6:4','C6:1 B5:1 A5:2','B5:1 A5:1 F#5:2','D#5:2 F#5:2','B5:4'],
};
function frostBar(i,t,bar){
  const B=FL.beat, c=FL.ch[FL.prog[i]], bass=nm(c[0]), arp=chordM(c[1]), pad=chordM(c[2]);
  const sec=i<8?0:i<16?1:i<24?2:3;
  // piano arpeggio in eighths with the pedal down for the bar
  const soft=sec===2?0.2:sec===3?0.17:0.22;
  if(i<31) arp.forEach((m,k)=>pianoN(t+k*B/2,m,soft*(k===0?1.25:1),bar*0.95));
  if(i<31) pianoN(t,bass,0.3,bar);
  if(sec===0) playMel(t,B,FL.motif[i],(tt,m,d)=>pianoN(tt,m,0.42,d*1.1,0.15));
  if(sec===1){ const ph=i<12?FL.motif[i-8]:FL.answer[i-12]; playMel(t,B,ph,(tt,m,d)=>violin(tt,m,d,0.075,{pan:0.2}));
    cello(t,bass+12,bar,0.06); }
  if(sec===2){ playMel(t,B,FL.climax[i-16],(tt,m,d)=>{ vSection(tt,m,d,0.07,{pan:0.25,att:0.15}); violin(tt,m+12,d,0.03,{pan:-0.15}); });
    pad.slice(1).forEach(m=>vSection(t,m+12,bar,0.035,{pan:-0.35})); cello(t,bass+12,bar,0.07); cello(t,bass,bar,0.05,{pan:0});
    pad.forEach(m=>voice(t,m+12,bar,0.022,0.8));
    pianoN(t,bass,0.45,bar); pianoN(t,bass-12,0.35,bar);
    if(i===16||i===20) timp(t,40,0.55); if(i===19) swell(t+bar*0.5,bar*0.5,0.03); if(i===22) timpRoll(t,47,bar*2,0.12,0.5); if(i===23){ timp(t+bar-0.01,40,0.6); } }
  if(sec===3){ if(i<30) playMel(t,B,FL.motif[i-24],(tt,m,d)=>pianoN(tt,m,0.36,d*1.2,0.15));
    vSection(t,nm('E6'),bar,0.018,{pan:0.3,att:1.2}); cello(t,bass,bar,0.04);
    if(i===31){ chordM('E2 B2 E3 G3 B3 F#4 B4').forEach((m,k)=>pianoN(t+k*0.06,m,0.3,bar*2.2)); vSection(t,nm('B5'),bar*1.8,0.03,{att:0.8}); vSection(t,nm('G5'),bar*1.8,0.03,{att:0.8,pan:-0.3}); } }
}

/* ---- Aurora: a waltz, piano first, then a solo violin (D major, 3/4, 66 bpm) ---- */
const AU={beat:60/66,
 ch:{D:['D2','D3 A3 D4 F#4 D4 A3'],AC:['C#2','C#3 A3 C#4 E4 C#4 A3'],Bm:['B1','B2 F#3 B3 D4 B3 F#3'],G:['G1','G2 D3 G3 B3 G3 D3'],DF:['F#2','F#3 A3 D4 F#4 D4 A3'],Em7:['E2','E3 B3 D4 G4 D4 B3'],
     A:['A1','A2 E3 A3 C#4 A3 E3'],A7:['A1','A2 E3 G3 C#4 G3 E3'],Fm:['F#2','F#3 C#4 F#4 A4 F#4 C#4'],Em:['E2','E3 B3 E4 G4 E4 B3'],As:['A1','A2 E3 A3 D4 A3 E3']},
 progA:['D','AC','Bm','G','DF','Em7','A','A7'], progB:['G','A','Fm','Bm','G','Em','As','A'],
 melA:['F#5:2 E5:1','C#5:1.5 D5:.5 E5:1','D5:2 B4:1','B4:1 D5:1 G5:1','F#5:2 A5:1','G5:1.5 F#5:.5 E5:1','E5:3','E5:1 F#5:1 G5:1'],
 melB:['B5:2 G5:1','C#6:1.5 B5:.5 A5:1','A5:2 F#5:1','F#5:1 D5:1 B4:1','B4:1 D5:1 G5:1','G5:1.5 F#5:.5 E5:1','D5:1 E5:1 A5:1','A5:3'],
};
function auroraBar(i,t,bar){
  const B=AU.beat, sec=Math.floor(i/8), k=i%8, name=(sec%2===0?AU.progA:AU.progB)[k], c=AU.ch[name], bass=nm(c[0]), arp=chordM(c[1]);
  const last=i===31;
  const pv=[0.18,0.15,0.2,0.12][sec];
  if(!last){ arp.forEach((m,j)=>pianoN(t+j*B/2,m,pv*(j===0?1.2:1),bar*0.95)); pianoN(t,bass,pv*1.4,bar); }
  if(sec===0) playMel(t,B,AU.melA[k],(tt,m,d)=>pianoN(tt,m,0.4,d*1.1,0.2));
  if(sec===1){ playMel(t,B,AU.melB[k],(tt,m,d)=>violin(tt,m,d,0.08,{pan:0.2,vib:18})); cello(t,bass+12,bar,0.045); }
  if(sec===2){ playMel(t,B,AU.melA[k],(tt,m,d)=>{ vSection(tt,m,d,0.15,{pan:0.25,att:0.18}); violin(tt,m+12,d,0.065,{pan:-0.2,vib:18}); });
    arp.slice(2,4).forEach(m=>vSection(t,m+12,bar,0.075,{pan:-0.3})); cello(t,bass+12,bar,0.12); cello(t,bass,bar,0.07,{pan:0}); arp.slice(2,4).forEach(m=>voice(t,m+12,bar,0.02,0.6)); if(k%4===0) timp(t,bass+12,0.4); pianoN(t+B*2,arp[3]+24,0.12,bar,0.4); if(k===0) swell(t-bar*0.5,bar*0.5,0.02); if(k===7) timpRoll(t,45,bar,0.08,0.3); }
  if(sec===3&&!last){ playMel(t,B,AU.melB[k],(tt,m,d)=>cello(tt,m-24,d,0.07,{pan:0})); vSection(t,arp[3]+12,bar,0.02,{att:1}); }
  if(last){ chordM('D2 A2 D3 F#3 A3 E4 F#4 A4').forEach((m,j)=>pianoN(t+j*0.07,m,0.28,bar*2.5)); violin(t+0.3,nm('A5'),bar*2,0.05,{att:0.8}); cello(t,nm('D3'),bar*2,0.05,{att:0.6}); }
}

/* ---- Ice Road: cello ostinato, spiccato violins, a long violin line over drums (C minor, 100 bpm) ---- */
const IR={beat:0.6,
 ch:{Cm:['C2','G4 C5 Eb5 C5'],Ab:['Ab1','Ab4 C5 Eb5 C5'],Eb:['Eb2','G4 Bb4 Eb5 Bb4'],Bb:['Bb1','F4 Bb4 D5 Bb4'],Fm:['F2','F4 Ab4 C5 Ab4'],G:['G1','G4 B4 D5 B4']},
 prog:['Cm','Ab','Eb','Bb','Cm','Ab','Fm','G'],
 mel:['G5:2 Ab5:1 G5:1','Eb5:4','F5:2 G5:1 Ab5:1','Bb5:4','C6:3 Bb5:1','Ab5:2 G5:2','F5:2 Eb5:1 D5:1','G5:4'],
};
function iceBar(i,t,bar){
  const B=IR.beat, name=IR.prog[i%8], c=IR.ch[name], R0=nm(c[0]), sp=chordM(c[1]), sec=Math.floor(i/8);
  if(i===31){ pianoN(t,R0-12,0.6,bar*2); pianoN(t,R0,0.5,bar*2); cello(t,R0,bar*1.5,0.08,{pan:0}); timp(t,36,0.7); vSection(t,nm('G5'),bar*1.5,0.04); vSection(t,nm('C6'),bar*1.5,0.04,{pan:-0.3}); return; }
  // ostinato: root, root, fifth, octave, minor third above, octave, fifth, root
  const third=['Cm','Fm'].includes(name)?3:['Eb','Ab','Bb'].includes(name)?4:4;
  [0,0,7,12,12+third,12,7,0].forEach((iv,k)=>cello(t+k*B/2,R0+12+iv,B*0.42,0.06*(k%2?0.8:1),{att:0.02,rel:0.12,vib:0,wet:0.5}));
  timp(t,R0<40?R0+12:R0,0.35);
  if(sec>=1){ for(let k=0;k<16;k++) spicc(t+k*B/4,sp[k%4],0.035*(k%4===0?1.4:1),{pan:0.3}); pianoN(t,R0-12,0.42,B*1.5); pianoN(t,R0,0.35,B*1.5); pianoN(t+B*2,R0+12,0.2,B); }
  if(sec>=2){ playMel(t,B,IR.mel[i%8],(tt,m,d)=>{ violin(tt,m,d,0.075,{pan:-0.1,vib:15}); if(sec===3) vSection(tt,m-12,d,0.04,{pan:0.3}); });
    drum(t,0.45); drum(t+B*1.5,0.25); drum(t+B*2,0.4); snare(t+B,0.08); snare(t+B*3,0.08); }
  if(sec===3){ voice(t,R0+24,bar,0.025,0.4); if(i%8===7) swell(t,bar,0.035); }
}

/* ---- more instruments ---- */
// French horn: two saws and a triangle through a lowpass that opens as the note speaks, a touch of vibrato
function horn(t,midi,dur,vol,o={}){
  const a=MUS.ctx, f=mtof(midi), att=o.att!=null?o.att:0.09, rel=o.rel!=null?o.rel:0.4;
  const g=a.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+att); g.gain.setValueAtTime(vol,t+Math.max(att,dur-0.05)); g.gain.linearRampToValueAtTime(0.0001,t+dur+rel);
  const lp=a.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=0.8; const top=Math.min(4200,f*(o.bright||3.2)); lp.frequency.setValueAtTime(f*1.2,t); lp.frequency.linearRampToValueAtTime(top,t+att*1.6); lp.frequency.linearRampToValueAtTime(top*0.75,t+Math.max(att*2,dur));
  const pk=a.createBiquadFilter(); pk.type='peaking'; pk.frequency.value=480; pk.gain.value=5; pk.Q.value=1;
  const mix=a.createGain(); mix.gain.value=0.33;
  for(const [ty,det] of [['sawtooth',-4],['sawtooth',5],['triangle',0]]){ const osc=a.createOscillator(); osc.type=ty; osc.frequency.value=f; osc.detune.value=det;
    const lfo=a.createOscillator(); lfo.frequency.value=4.8+Math.random()*0.5; const lg=a.createGain(); lg.gain.setValueAtTime(0,t); lg.gain.linearRampToValueAtTime(o.vib!=null?o.vib:6,t+Math.min(dur,0.7)); lfo.connect(lg); lg.connect(osc.detune); lfo.start(t); lfo.stop(t+dur+rel+0.1);
    osc.connect(mix); osc.start(t); osc.stop(t+dur+rel+0.1); }
  mix.connect(lp); lp.connect(pk); pk.connect(g); outNode(g,o.pan||0,o.wet!=null?o.wet:0.9);
}
// harp: a plucked string, bright for an instant and then round
function harp(t,midi,vol,pan){
  const a=MUS.ctx, f=mtof(midi), dec=Math.max(1.2,4.5-(midi-48)*0.06); const g=a.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+0.004); g.gain.exponentialRampToValueAtTime(vol*0.35,t+0.25); g.gain.exponentialRampToValueAtTime(0.0001,t+dec);
  const lp=a.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(Math.min(9000,f*8),t); lp.frequency.exponentialRampToValueAtTime(Math.max(400,f*2),t+0.4);
  for(const [h,gv,ty] of [[1,0.6,'triangle'],[2,0.25,'sine'],[3,0.08,'sine']]){ const o=a.createOscillator(); o.type=ty; o.frequency.value=f*h; const og=a.createGain(); og.gain.value=gv; o.connect(og); og.connect(lp); o.start(t); o.stop(t+dec+0.05); }
  lp.connect(g); outNode(g,pan!=null?pan:clamp((midi-60)/30,-0.5,0.5),0.75);
}
// celesta / glockenspiel: a sine with a bell partial a few octaves up, long gentle decay
function celesta(t,midi,vol,o={}){
  const a=MUS.ctx, f=mtof(midi), dec=o.dec||3.2; const g=a.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+0.003); g.gain.exponentialRampToValueAtTime(0.0001,t+dec);
  for(const [h,gv,d] of [[1,0.7,1],[4,0.18,0.35],[o.glock?2.76:3,o.glock?0.2:0.06,0.5]]){ const os=a.createOscillator(); os.type='sine'; os.frequency.value=f*h; const og=a.createGain(); og.gain.setValueAtTime(gv,t); og.gain.exponentialRampToValueAtTime(0.0001,t+dec*d); os.connect(og); og.connect(g); os.start(t); os.stop(t+dec+0.05); }
  outNode(g,o.pan!=null?o.pan:0.35,0.9);
}
// frame drum: a low skin with a slap of noise on top
function frameDrum(t,vol,pitch=52){ drum(t,vol,pitch); const a=MUS.ctx; const nz=a.createBufferSource(); nz.buffer=MUS.noise; const bp=a.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=700; bp.Q.value=1.2; const g=a.createGain(); g.gain.setValueAtTime(vol*0.18,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.09); nz.connect(bp); bp.connect(g); outNode(g,-0.15,0.5); nz.start(t,Math.random()*0.5); nz.stop(t+0.1); }
// Hardanger fiddle: a bright violin with its sympathetic strings ringing a fifth and an octave under it
const fiddle=(t,m,d,v,o={})=>{ violin(t,m,d,v,Object.assign({vib:9,vibHz:6,bright:6400,f2:3400,att:0.04,rel:0.18,pan:-0.12},o)); };
// one step down the white-key (D dorian) scale, twice: a third below in the mode
function dorian3rd(m){ const W=[0,2,4,5,7,9,11]; const pc=((m%12)+12)%12, oct=Math.floor(m/12); let ix=W.indexOf(pc); if(ix<0) return m-3; ix-=2; let o2=oct; if(ix<0){ ix+=7; o2--; } return o2*12+W[ix]; }

/* ---- Hardanger: a halling for the mountain, fiddle over drones and a frame drum (D dorian, 6/8, dotted quarter 72) ---- */
const HD={beat:60/216,
 ch:{Dm:['D2','D3 A3 D4 F4'],C:['C2','C3 G3 C4 E4'],G:['G1','G2 D3 G3 B3'],Am:['A1','A2 E3 A3 C4']},
 progA:['Dm','C','C','Dm','G','G','Dm','Dm'], progB:['Dm','C','Am','Dm','G','C','C','Dm'],
 A:['D5:1 E5:1 F5:1 A5:2 G5:1','F5:1 E5:1 D5:1 E5:3','C5:1 D5:1 E5:1 G5:2 F5:1','E5:1 D5:1 C5:1 D5:3','A5:1 B5:1 C6:1 D6:2 C6:1','B5:1 A5:1 G5:1 A5:3','F5:1 G5:1 A5:1 G5:1 F5:1 E5:1','D5:3 A4:3'],
 B:['A5:2 A5:1 B5:2 A5:1','G5:1 F5:1 G5:1 A5:3','C6:2 B5:1 A5:2 G5:1','A5:3 r:3','D6:1 C6:1 B5:1 A5:1 G5:1 F5:1','E5:1 F5:1 G5:1 A5:3','G5:1 F5:1 E5:1 C5:1 D5:1 E5:1','D5:6'],
};
// 4 bars of drone and drum, A, A with a second fiddle, B, A full, B full, 4 bars to close
function hardangerBar(i,t,bar){
  const B=HD.beat; let sec, k;
  if(i<4){ sec='in'; k=i; } else if(i<44){ sec=['A','A2','B','A3','B2'][Math.floor((i-4)/8)]; k=(i-4)%8; } else { sec='out'; k=i-44; }
  const name=(sec==='B'||sec==='B2')?HD.progB[k]:(sec==='in'||sec==='out')?'Dm':HD.progA[k], c=HD.ch[name], bass=nm(c[0]), pad=chordM(c[1]);
  // drones: the open D and A strings under everything, a low cello root
  if(k%2===0||sec==='in'){ cello(t,nm('D3'),bar*2,0.035,{att:0.5,vib:4,pan:-0.25}); cello(t,nm('A3'),bar*2,0.025,{att:0.5,vib:4,pan:0.25}); }
  if(sec!=='in'&&sec!=='out') cello(t,bass+12,bar,0.04,{att:0.15,pan:-0.35});
  // the dance: frame drum on the two big beats, a lighter tap on the last eighth, foot stamps in the full sections
  const full=sec==='A3'||sec==='B2';
  if(sec!=='out'||k<2){ frameDrum(t,full?0.5:0.38,50); frameDrum(t+B*3,full?0.36:0.26,50); frameDrum(t+B*5,0.12,62); }
  if(full){ drum(t+B*3,0.2,40); snare(t+B*1.5,0.04); snare(t+B*4.5,0.04); }
  // plucked chords on the off-beats (a langeleik or a harp)
  if(sec!=='in'){ harp(t+B,pad[1]+12,0.09); harp(t+B*2,pad[2]+12,0.08); harp(t+B*4,pad[1]+12,0.09); harp(t+B*5,pad[3]+12,0.07); }
  else harp(t+B*3,nm('A4'),0.07);
  // the tune
  const tune=(sec==='B'||sec==='B2')?HD.B[k]:HD.A[k];
  if(sec==='A'||sec==='A2'||sec==='A3'||sec==='B'||sec==='B2') playMel(t,B,tune,(tt,m,d)=>fiddle(tt,m,d*0.96,sec==='A'?0.075:0.085));
  if(sec==='A2'||sec==='A3'||sec==='B2') playMel(t,B,tune,(tt,m,d)=>fiddle(tt,dorian3rd(m),d*0.96,0.05,{pan:0.3,vib:7}));
  if(full){ pad.slice(1).forEach(m=>vSection(t,m+12,bar,0.022,{att:0.2,pan:-0.2})); horn(t,bass+12,bar*0.95,0.045,{pan:0.1}); }
  if(sec==='out'){ if(k===0) playMel(t,B,'A5:3 F5:3',(tt,m,d)=>fiddle(tt,m,d,0.06)); if(k===1) playMel(t,B,'E5:3 D5:3',(tt,m,d)=>fiddle(tt,m,d,0.06)); if(k===2){ fiddle(t,nm('D5'),bar*2,0.055,{att:0.3}); fiddle(t,nm('A4'),bar*2,0.035,{att:0.3,pan:0.3}); harp(t,nm('D3'),0.12); harp(t+0.08,nm('A3'),0.1); harp(t+0.16,nm('D4'),0.1); harp(t+0.24,nm('F4'),0.09); } }
}

/* ---- Open Sky: horns and harp for the air, a lifting Lydian second chord (F major, 84 bpm) ---- */
const OS={beat:60/84,
 ch:{F:['F2','F3 C4 F4 A4 C5 A4 F4 C4'],GF:['F2','G3 D4 G4 B4 D5 B4 G4 D4'],Dm:['D2','D3 A3 D4 F4 A4 F4 D4 A3'],Bb:['Bb1','Bb2 F3 Bb3 D4 F4 D4 Bb3 F3'],C:['C2','C3 G3 C4 E4 G4 E4 C4 G3'],C7:['C2','C3 G3 Bb3 E4 G4 E4 Bb3 G3']},
 progA:['F','GF','F','GF','Dm','Bb','C','C'], progB:['F','GF','F','GF','Dm','Bb','C7','F'],
 A:['C5:1.5 F5:.5 G5:2','A5:1.5 G5:.5 B5:2','A5:1 G5:1 F5:1 C5:1','D5:3 r:1','F5:1.5 E5:.5 D5:1 A4:1','Bb4:1.5 C5:.5 D5:2','E5:1 F5:1 G5:1 A5:1','G5:4'],
 B:['C6:2 A5:1 F5:1','G5:1 A5:1 B5:2','A5:2 F5:1 C5:1','D5:4','D6:1.5 C6:.5 A5:2','Bb5:1.5 A5:.5 F5:2','G5:1 A5:1 Bb5:1 E5:1','F5:4'],
 sparkle:['C6:1 F6:1 A6:2','D6:1 G6:1 B6:2','C6:1 F6:1 A6:2','B5:1 D6:1 G6:2','A5:1 D6:1 F6:2','F5:1 Bb5:1 D6:2','G5:1 C6:1 E6:2','E6:4'],
};
// harp and celesta, the horn tune, horns and strings and timpani, the tune on celesta to land
function openSkyBar(i,t,bar){
  const B=OS.beat, sec=Math.floor(i/8), k=i%8, prog=(sec===2||sec===3)?OS.progB:OS.progA, c=OS.ch[prog[k]], bass=nm(c[0]), arp=chordM(c[1]);
  const last=i===31;
  if(!last) arp.forEach((m,j)=>harp(t+j*B/2,m,(sec===2?0.1:0.08)*(j===0?1.2:1)));
  if(!last){ cello(t,bass+12,bar,sec===2?0.06:0.035,{att:0.4}); vSection(t,arp[3],bar,sec===2?0.04:0.022,{att:0.6,pan:0.3}); vSection(t,arp[2],bar,sec===2?0.035:0.02,{att:0.6,pan:-0.3}); }
  if(sec===0) playMel(t,B,OS.sparkle[k],(tt,m,d)=>celesta(tt,m,0.07,{dec:d+1.5}));
  if(sec===1){ playMel(t,B,OS.A[k],(tt,m,d)=>horn(tt,m-12,d*0.95,0.08,{pan:-0.1})); if(k%2===1) celesta(t+B*2,arp[5]+12,0.04); }
  if(sec===2){ playMel(t,B,OS.B[k],(tt,m,d)=>{ horn(tt,m-12,d*0.95,0.085,{pan:-0.15}); violin(tt,m,d,0.06,{pan:0.2}); vSection(tt,m-12,d,0.04,{pan:0.35}); });
    horn(t,arp[2],bar*0.95,0.035,{pan:0.3,att:0.25}); horn(t,arp[3],bar*0.95,0.03,{pan:0.35,att:0.25});
    if(k===0||k===4) timp(t,bass<41?bass+12:bass,0.45); if(k===3) swell(t+bar*0.5,bar*0.5,0.025); if(k===6) timpRoll(t,nm('C3'),bar,0.1,0.4); }
  if(sec===3&&!last){ playMel(t,B,OS.A[k],(tt,m,d)=>celesta(tt,m+12,0.06,{dec:d+1.2,glock:true})); vSection(t,nm('F5'),bar,0.012,{att:1}); }
  if(last){ chordM('F2 C3 F3 A3 C4 G4 A4 C5').forEach((m,j)=>harp(t+j*0.07,m,0.1)); horn(t+0.2,nm('A4'),bar*1.6,0.05,{att:0.6}); horn(t+0.2,nm('F4'),bar*1.6,0.04,{att:0.6,pan:0.3}); celesta(t+0.6,nm('C7'),0.05,{dec:4}); cello(t,nm('F2'),bar*1.8,0.05,{att:0.5}); }
}

/* ---- Polar Night: sparse piano under a long dark sky, for the hideout (A minor, 54 bpm) ---- */
const PN={beat:60/54,
 ch:{Am:['A1','A2 E3 B3 C4'],F:['F1','F2 C3 E3 A3'],C:['C2','C3 G3 E4'],Em:['E2','E3 B3 D4 G4'],Dm:['D2','D3 A3 E4 F4'],E:['E2','E3 B3 E4 G#4'],Esus:['E2','E3 B3 E4 A4']},
 prog:['Am','F','C','Em','Am','Dm','F','E'],
 mel:['E5:3 D5:1','C5:4','G5:2 E5:2','B4:4','E5:2 A5:2','F5:3 E5:1','C5:2 B4:1 A4:1','B4:2 G#4:2'],
};
// piano alone, piano with celesta stars, the tune on a cello and a high violin above it
function polarBar(i,t,bar){
  const B=PN.beat, sec=Math.floor(i/8), k=i%8, name=(k===7&&sec<2)?'Esus':PN.prog[k], c=PN.ch[name], bass=nm(c[0]), ch=chordM(c[1]); const last=i===23;
  voice(t,bass+24,bar,0.018,2); vSection(t,ch[ch.length-1]+12,bar,0.012,{att:1.6,rel:1.5,pan:0.35});
  pianoN(t,bass,0.24,bar); ch.forEach((m,j)=>pianoN(t+B*(0.5+j*0.5),m,0.13,bar*0.9));
  if(last){ chordM('A2 E3 B3 C4 E4 A4').forEach((m,j)=>pianoN(t+j*0.15,m,0.17,bar*2.5)); celesta(t+1,nm('E6'),0.04,{dec:5}); cello(t,nm('A2'),bar*2,0.045,{att:1}); return; }
  if(sec===0) playMel(t,B,PN.mel[k],(tt,m,d)=>pianoN(tt,m,0.3,d*1.1,0.2));
  if(sec===1){ playMel(t,B,PN.mel[k],(tt,m,d)=>pianoN(tt,m,0.28,d*1.1,0.2)); [1.5,3].forEach(o=>{ const m=ch[Math.floor(Math.random()*ch.length)]; celesta(t+B*o,m+24,0.035,{dec:3.5,pan:Math.random()-0.5}); }); }
  if(sec===2){ playMel(t,B,PN.mel[k],(tt,m,d)=>{ cello(tt,m-12,d,0.06,{att:0.35,pan:-0.1}); if(k>=4) violin(tt,m+12,d,0.03,{att:0.4,pan:0.3}); }); celesta(t+B*2,ch[1]+24,0.03,{dec:3}); }
}

/* ---- Storvidda: a march over the plateau, horns over snare and pulsing low strings (G minor, 96 bpm) ---- */
const SV={beat:60/96,
 ch:{Gm:['G1','G3 Bb3 D4'],Eb:['Eb2','Eb3 G3 Bb3'],D:['D2','D3 F#3 A3'],Cm:['C2','C3 Eb3 G3'],F:['F1','F3 A3 C4'],Bb:['Bb1','Bb2 D3 F3']},
 progA:['Gm','Gm','Eb','D','Gm','Cm','D','D'], progB:['Eb','F','Bb','Gm','Cm','D','Gm','D'],
 A:['G4:1.5 Bb4:.5 D5:2','C5:1 Bb4:1 A4:1 G4:1','Eb5:1.5 D5:.5 C5:1 Bb4:1','A4:3 r:1','G4:1.5 Bb4:.5 D5:1.5 G5:.5','G5:1 F5:1 Eb5:1 C5:1','D5:1 C5:1 Bb4:1 A4:1','D5:4'],
 B:['G5:1.5 F5:.5 Eb5:2','F5:1.5 Eb5:.5 D5:1 C5:1','D5:1 F5:1 Bb5:2','A5:1 G5:1 D5:2','Eb5:1 G5:1 C6:1.5 Bb5:.5','A5:2 F#5:1 D5:1','G5:1.5 D5:.5 Bb4:1 G4:1','F#4:2 A4:2'],
};
// snare and low strings, the horn tune, the second strain with strings, the tune again with everyone
function marchBar(i,t,bar){
  const B=SV.beat, sec=Math.floor(i/8), k=i%8, name=(sec===2?SV.progB:SV.progA)[k], c=SV.ch[name], bass=nm(c[0]), ch=chordM(c[1]); const last=i===31;
  if(last){ chordM('G1 G2 D3 G3 Bb3 D4 G4').forEach((m,j)=>pianoN(t+j*0.03,m,0.35,bar*2)); horn(t,nm('G4'),bar*1.5,0.07); horn(t,nm('D4'),bar*1.5,0.06,{pan:0.3}); horn(t,nm('Bb3'),bar*1.5,0.055,{pan:-0.3}); timp(t,nm('G2'),0.7); cello(t,nm('G2'),bar*1.5,0.08); drum(t,0.6,45); return; }
  // pulsing low strings in eighths, the root and its octave
  for(let e=0;e<8;e++) cello(t+e*B/2,bass+12+(e%4===2?12:0),B*0.38,0.045*(e%2?0.75:1),{att:0.02,rel:0.1,vib:0,wet:0.5});
  // the drum line: snare on 2 and 4 with a roll into every fourth bar, a bass drum on 1 and 3
  drum(t,0.42,48); drum(t+B*2,0.32,48); snare(t+B,0.07); snare(t+B*3,0.07); snare(t+B*3.5,0.035); if(k%4===3){ for(let r=0;r<6;r++) snare(t+B*2+r*B/6,0.025+r*0.007); }
  if(sec>=1){ const tune=sec===2?SV.B[k]:SV.A[k]; playMel(t,B,tune,(tt,m,d)=>{ horn(tt,m,d*0.92,sec===3?0.085:0.075,{pan:-0.1}); if(sec===3) horn(tt,m-12,d*0.92,0.05,{pan:0.25}); }); }
  if(sec>=2){ ch.forEach(m=>vSection(t,m+12,bar,0.025,{att:0.25,pan:0.3})); }
  if(sec===2) playMel(t,B,SV.B[k],(tt,m,d)=>violin(tt,m+12,d,0.035,{pan:0.25}));
  if(sec===3){ timp(t,bass<41?bass+12:bass,0.4); if(k%2) timp(t+B*2,bass<41?bass+12:bass,0.25); ch.forEach(m=>horn(t,m,bar*0.9,0.025,{pan:0.35,att:0.3})); }
  if(sec===0&&k>=4) horn(t,ch[0]+12,bar*0.9,0.03,{att:0.4,pan:0.2});
}

const TRACKS=[
 {id:'chant',name:'Station Chant',bar:BAR,len:32,play:(i,t)=>scheduleBar(i,t)},
 {id:'frost',name:'Frost Line',bar:FL.beat*4,len:32,play:frostBar,tail:9},
 {id:'aurora',name:'Aurora',bar:AU.beat*3,len:32,play:auroraBar,tail:8},
 {id:'iceroad',name:'Ice Road',bar:IR.beat*4,len:32,play:iceBar,tail:5},
 {id:'hardanger',name:'Hardanger',bar:HD.beat*6,len:48,play:hardangerBar,tail:6,gain:1.15},
 {id:'opensky',name:'Open Sky',bar:OS.beat*4,len:32,play:openSkyBar,tail:7,gain:2.1},
 {id:'polar',name:'Polar Night',bar:PN.beat*4,len:24,play:polarBar,tail:10,gain:1.9},
 {id:'march',name:'Storvidda March',bar:SV.beat*4,len:32,play:marchBar,tail:5},
];
function nextTrack(cur){ const mode=OPTS.musicMode||'all'; if(mode==='one') return cur; if(mode==='shuffle'){ let n=cur; while(n===cur&&TRACKS.length>1) n=Math.floor(Math.random()*TRACKS.length); return n; } return (cur+1)%TRACKS.length; }
function musicTick(){
  const a=MUS.ctx; if(!a||!MUS.on) return;
  while(MUS.next < a.currentTime+1.2){
    const tr=TRACKS[MUS.ti];
    if(MUS.step>=tr.len){ MUS.next+=(tr.tail||3); MUS.ti=nextTrack(MUS.ti); MUS.step=0; MUS.annT=MUS.next; continue; }
    const bl=tr.barAt?tr.barAt(MUS.step):tr.bar; MUS.vmul=tr.gain||1; tr.play(MUS.step,MUS.next,bl); MUS.vmul=1; MUS.step++; MUS.next+=bl;
  }
  if(MUS.annT&&a.currentTime>=MUS.annT){ MUS.annT=0; updMusicBtn(); }
}
const musicLevel=()=>0.9*(OPTS.musicVol!=null?OPTS.musicVol:0.8);
function musicStart(ti){
  const a=ensureAudio(); if(!a||MUS.on) return; MUS.on=true; MUS.step=0; MUS.next=a.currentTime+0.15;
  MUS.ti=ti!=null?ti:(OPTS.musicTrack!=null&&OPTS.musicTrack<TRACKS.length?OPTS.musicTrack:0);
  MUS.master.gain.cancelScheduledValues(a.currentTime); MUS.master.gain.setValueAtTime(MUS.master.gain.value,a.currentTime); MUS.master.gain.linearRampToValueAtTime(musicLevel(),a.currentTime+2);
  musicTick(); MUS.timer=setInterval(musicTick,250); updMusicBtn();
}
function musicPlay(ti){ OPTS.musicTrack=ti; saveOpts(); if(S){ S.music=true; saveGame(); } if(MUS.on){ musicStop(0.6); setTimeout(()=>musicStart(ti),650); } else musicStart(ti); }
function musicNext(){ const cur=MUS.on?MUS.ti:(OPTS.musicTrack||0); musicPlay(OPTS.musicMode==='shuffle'?nextTrack(cur):(cur+1)%TRACKS.length); }
// short cues on the results screen
function stinger(kind){
  const a=ensureAudio(); if(!a||!S||!S.music||MUS.on) return; const t=a.currentTime+0.25;
  MUS.master.gain.cancelScheduledValues(a.currentTime); MUS.master.gain.setValueAtTime(musicLevel(),a.currentTime);
  if(kind==='extract'){ chordM('C3 G3 C4 E4').forEach((m,k)=>pianoN(t+k*0.09,m,0.3,4)); violin(t+0.2,nm('G5'),0.6,0.06); violin(t+0.8,nm('C6'),0.6,0.06); violin(t+1.4,nm('E6'),2.4,0.07,{vib:18}); vSection(t+0.3,nm('E5'),3,0.04); vSection(t+0.3,nm('G4'),3,0.04,{pan:-0.3}); cello(t,nm('C3'),3.5,0.06); }
  else { cello(t,nm('C2'),4,0.08,{att:0.5}); chordM('C2 G2 C3 Eb3 G3').forEach((m,k)=>pianoN(t+k*0.12,m,0.26,4.5)); violin(t+1,nm('Eb5'),1.2,0.05,{att:0.4}); violin(t+2.2,nm('D5'),2.2,0.05,{att:0.3}); timp(t,36,0.4); }
}
function musicStop(fade=1.5){
  if(!MUS.ctx||!MUS.on) return; const a=MUS.ctx; MUS.on=false; clearInterval(MUS.timer);
  MUS.master.gain.cancelScheduledValues(a.currentTime); MUS.master.gain.setValueAtTime(MUS.master.gain.value,a.currentTime); MUS.master.gain.linearRampToValueAtTime(0,a.currentTime+fade);
  // replace master so queued notes go silent
  const old=MUS.master; setTimeout(()=>{ try{ old.disconnect(); }catch(e){} },fade*1000+50);
  MUS.master=a.createGain(); MUS.master.gain.value=0; MUS.master.connect(MUS.out);
  rebuildSends(); updMusicBtn();
}
function rebuildSends(){
  const a=MUS.ctx; const len=a.sampleRate*4.5, ir=a.createBuffer(2,len,a.sampleRate);
  for(let c=0;c<2;c++){ const d=ir.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6); }
  MUS.rev=a.createConvolver(); MUS.rev.buffer=ir; const rg=a.createGain(); rg.gain.value=0.75; MUS.rev.connect(rg); rg.connect(MUS.master);
  MUS.dry=a.createGain(); MUS.dry.gain.value=0.45; MUS.dry.connect(MUS.master);
}
function updMusicBtn(){ const b=$('#musicBtn'); b.setAttribute('aria-pressed', MUS.on?'true':'false'); const tr=MUS.on&&TRACKS[MUS.ti]; b.textContent = tr ? `♪ ${tr.name}` : '♪ Music off'; b.title=tr?'Music on · click to turn off':'Turn music on'; const n=$('#nextBtn'); if(n) n.hidden=!MUS.on; const m=$('#optModal'); if(m&&!m.hidden) m.querySelectorAll('[data-track]').forEach(x=>x.setAttribute('aria-pressed',String(MUS.on&&+x.dataset.track===MUS.ti))); }
