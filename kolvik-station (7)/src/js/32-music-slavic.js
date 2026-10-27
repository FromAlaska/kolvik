/* 32-music-slavic: Russian / Slavic pieces. New instruments (balalaika, contrabass balalaika, gusli, bayan, church
   bells, a low male choir, buben) and four original tracks appended to TRACKS: Zvon, Steppe Wind, Birch Waltz, Trepak.
   A track may give barAt(i) instead of a fixed bar length when its tempo changes (Trepak speeds up, the waltz slows
   at the end); musicTick in 30-music.js uses it. */

/* ---- plucked strings by Karplus-Strong: a burst of noise circulating in a delay line that loses its highs each pass.
   Each pitch/tone is computed once into a buffer and cached; the buffer plays back at a rate that corrects the
   tuning to the exact frequency. ---- */
const KS_CACHE=new Map();
function ksBuffer(midi,o){
  const a=MUS.ctx, sr=a.sampleRate, bright=o.bright!=null?o.bright:0.7, sus=o.sus||1.4, pos=o.pos!=null?o.pos:0.12;
  const key=`${midi}|${bright}|${sus}|${pos}|${sr}`; const hit=KS_CACHE.get(key); if(hit) return hit;
  if(KS_CACHE.size>400) KS_CACHE.clear();
  const f=mtof(midi), s=0.5, N=Math.max(4,Math.floor(sr/f-s)), len=Math.ceil(sr*Math.min(6,sus*1.15+0.1)), d=new Float32Array(len);
  const g=Math.pow(0.001,1/(sus*f)); // loss per pass, for the requested ring time
  let lp=0; for(let i=0;i<N;i++){ lp+=((Math.random()*2-1)-lp)*bright; d[i]=lp; }
  const P=Math.max(1,Math.round(N*pos)); for(let i=N-1;i>=P;i--) d[i]-=d[i-P]; // where the string is plucked
  let mean=0; for(let i=0;i<N;i++) mean+=d[i]; mean/=N; for(let i=0;i<N;i++) d[i]-=mean;
  d[N]=g*d[0]; for(let i=N+1;i<len;i++) d[i]=g*((1-s)*d[i-N]+s*d[i-N-1]);
  let pk=1e-6; for(let i=0;i<len;i++){ const v=Math.abs(d[i]); if(v>pk) pk=v; }
  const fade=Math.min(len,Math.floor(sr*0.05)); for(let i=0;i<len;i++){ d[i]/=pk; if(i>len-fade) d[i]*=(len-i)/fade; }
  const buf=a.createBuffer(1,len,sr); buf.copyToChannel(d,0);
  const e={buf,rate:f*(N+s)/sr}; KS_CACHE.set(key,e); return e;
}
// o.stop damps the string (the next tremolo stroke, or a hand on the strings); o.body = resonances [[Hz,dB,Q]]
function pluck(t,midi,vol,o={}){
  const a=MUS.ctx, e=ksBuffer(midi,o); const src=a.createBufferSource(); src.buffer=e.buf; src.playbackRate.value=e.rate;
  const g=a.createGain(); g.gain.setValueAtTime(vol,t);
  const end=t+e.buf.duration/e.rate; let stop=end;
  if(o.stop!=null&&o.stop<end){ stop=o.stop+0.035; g.gain.setValueAtTime(vol,o.stop); g.gain.linearRampToValueAtTime(0.0001,stop); }
  let node=src; for(const [fq,gain,q] of (o.body||[])){ const b=a.createBiquadFilter(); b.type='peaking'; b.frequency.value=fq; b.gain.value=gain; b.Q.value=q; node.connect(b); node=b; }
  if(o.lp){ const l=a.createBiquadFilter(); l.type='lowpass'; l.frequency.value=o.lp; node.connect(l); node=l; }
  node.connect(g); src.start(t); src.stop(stop+0.01);
  outNode(g,o.pan!=null?o.pan:clamp((midi-64)/40,-0.5,0.5),o.wet!=null?o.wet:0.55);
}
// balalaika: steel strings plucked close to the bridge, a small triangular body
const balalaika=(t,m,v,o={})=>pluck(t,m,v,Object.assign({bright:0.88,sus:1.1,pos:0.07,body:[[330,5,1.4],[2700,4,1.1]],wet:0.5},o));
// contrabass balalaika: the big one that plays the bass
const contrabass=(t,m,v,o={})=>pluck(t,m,v,Object.assign({bright:0.42,sus:1.2,pos:0.22,body:[[120,5,1]],lp:1800,pan:-0.2,wet:0.4},o));
// gusli: a zither with long-ringing strings
const gusli=(t,m,v,o={})=>pluck(t,m,v,Object.assign({bright:0.6,sus:3.4,pos:0.17,body:[[520,3,1]],wet:0.95},o));
// tremolo: the same note re-plucked quickly, each stroke damping the last (how balalaika and domra sustain a tune)
function tremolo(t,midi,dur,vol,o={}){
  const rate=o.rate||12.5, n=Math.max(1,Math.round(dur*rate)), inst=o.inst||balalaika;
  for(let k=0;k<n;k++){ const tt=t+k/rate+(Math.random()-0.5)*0.005; const sw=n>3?0.85+0.3*Math.sin(Math.PI*k/(n-1)):1;
    inst(tt,midi,vol*(k%2?0.7:1)*sw,Object.assign({},o,{stop:k<n-1?t+(k+1)/rate:t+dur+(o.ring||0.12)})); }
}
// strum a chord: a quick roll across the strings, down (low to high) or up
function strum(t,notes,vol,o={}){ const ns=o.up?notes.slice().reverse():notes; ns.forEach((m,j)=>(o.inst||balalaika)(t+j*(o.roll||0.011),m,vol*(j===0?1:0.85),{stop:o.stop,pan:o.pan})); }

/* ---- bayan (button accordion): free reeds, bright and buzzy, sounding as long as the bellows push ---- */
function reedWave(){ const a=MUS.ctx; if(MUS._rw&&MUS._rwCtx===a) return MUS._rw; const n=48, re=new Float32Array(n), im=new Float32Array(n);
  for(let k=1;k<n;k++) im[k]=Math.pow(k,-0.85)*(1+1.1*Math.exp(-Math.pow((k-5)/3,2)))*(k%2?1:0.7);
  MUS._rw=a.createPeriodicWave(re,im); MUS._rwCtx=a; return MUS._rw; }
// o.reeds = detune in cents for each reed (two slightly apart is the "musette" wobble), o.low adds the bassoon reed an octave down
function bayan(t,midi,dur,vol,o={}){
  const a=MUS.ctx, f=mtof(midi), att=o.att!=null?o.att:0.03, rel=o.rel!=null?o.rel:0.09;
  const g=a.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+att);
  if(dur>0.8){ g.gain.linearRampToValueAtTime(vol*(o.swell||1.12),t+dur*0.55); g.gain.linearRampToValueAtTime(vol*0.95,t+dur); }
  else g.gain.setValueAtTime(vol,t+Math.max(att,dur));
  g.gain.linearRampToValueAtTime(0.0001,t+Math.max(att,dur)+rel);
  const reeds=(o.reeds||[0,7]).map(c=>[c,1]); if(o.low) reeds.push([0,0.55,-12]);
  const mix=a.createGain(); mix.gain.value=0.6/reeds.length;
  for(const [c,gv,oct] of reeds){ const os=a.createOscillator(); os.setPeriodicWave(reedWave()); os.frequency.value=f*(oct?0.5:1); os.detune.value=c+(Math.random()-0.5)*2;
    const og=a.createGain(); og.gain.value=gv; os.connect(og); og.connect(mix); os.start(t); os.stop(t+Math.max(att,dur)+rel+0.05); }
  const lp=a.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=Math.min(6000,f*(o.bright||9)); lp.Q.value=0.5;
  const pk=a.createBiquadFilter(); pk.type='peaking'; pk.frequency.value=1100; pk.gain.value=3; pk.Q.value=0.9;
  mix.connect(lp); lp.connect(pk); pk.connect(g); outNode(g,o.pan!=null?o.pan:0.12,o.wet!=null?o.wet:0.5);
}

/* ---- church bells: inharmonic partials (hum a octave down, the minor-third tierce, quint, nominal...) each with a
   slightly detuned twin so they beat, low ones ringing longest; a clang of noise for the clapper ---- */
const BELL_P=[[0.5,0.9,1],[1,0.75,0.62],[1.19,0.55,0.5],[1.5,0.3,0.38],[2,0.45,0.33],[2.51,0.25,0.22],[2.66,0.22,0.2],[3.01,0.14,0.15],[4.16,0.1,0.1],[5.43,0.06,0.07]];
// Each pitch and ring time is computed once into a sample (two takes for small bells, so repeats differ a little) and
// cached; a strike then costs one buffer source instead of twenty oscillators, which matters when a tower rings fast.
const BELL_CACHE=new Map();
function bellBuffer(midi,dec){
  const sr=MUS.ctx.sampleRate, small=midi>=72, take=small?Math.floor(Math.random()*2):0, key=`${midi}|${dec}|${sr}|${take}`;
  const hit=BELL_CACHE.get(key); if(hit) return hit; if(BELL_CACHE.size>120) BELL_CACHE.clear();
  const f=mtof(midi), len=Math.ceil(sr*(dec+0.1)), d=new Float32Array(len), atk=Math.round(sr*0.003);
  BELL_P.forEach(([r,amp,dk],ix)=>{ if(small&&ix>6) return; const fr=f*r*(1+(Math.random()-0.5)*0.004); if(fr>12000) return;
    for(const det of (small?[0]:[0,1.1+Math.random()*0.8])){
      const a0=amp*(det?0.6:1), n=Math.min(len,Math.ceil(sr*dec*dk)), k=Math.exp(Math.log(0.0001)/(sr*dec*dk));
      const w=2*Math.PI*(fr+det)/sr, cw=Math.cos(w), sw=Math.sin(w); let sn=0, cs=1, env=a0; // a rotating phasor: sine without calling sin()
      for(let i=0;i<n;i++){ d[i]+=sn*env*(i<atk?i/atk:1); const s2=sn*cw+cs*sw; cs=cs*cw-sn*sw; sn=s2; env*=k; } } });
  const fade=Math.floor(sr*0.05); for(let i=len-fade;i<len;i++) d[i]*=(len-i)/fade;
  const buf=MUS.ctx.createBuffer(1,len,sr); buf.copyToChannel(d,0); BELL_CACHE.set(key,buf); return buf;
}
function bell(t,midi,vol,o={}){
  const a=MUS.ctx, f=mtof(midi), dec=o.dec||6; const g=a.createGain(); g.gain.value=vol;
  const src=a.createBufferSource(); src.buffer=bellBuffer(midi,dec); src.connect(g); src.start(t);
  const nz=a.createBufferSource(); nz.buffer=MUS.noise; const bp=a.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=Math.min(9000,f*3.2); bp.Q.value=1.5;
  const ng=a.createGain(); ng.gain.setValueAtTime(0.35,t); ng.gain.exponentialRampToValueAtTime(0.0001,t+0.04); nz.connect(bp); bp.connect(ng); ng.connect(g); nz.start(t,Math.random()*0.5); nz.stop(t+0.05);
  outNode(g,o.pan!=null?o.pan:0,o.wet!=null?o.wet:0.95);
}

/* ---- low male choir: three saws per part through vowel formants, very little vibrato (the Orthodox sound) ---- */
const VOWELS={a:[[700,6,1],[1150,7,.5],[2600,9,.16]],o:[[480,6,1],[820,7,.45],[2600,10,.12]],u:[[330,5,1],[700,7,.3],[2500,10,.08]],e:[[480,6,1],[1750,9,.4],[2550,10,.15]]};
function choirM(t,midi,dur,vol,o={}){
  const a=MUS.ctx, f=mtof(midi), att=o.att!=null?o.att:0.5, rel=o.rel!=null?o.rel:0.9, n=o.voices||3, end=t+dur+rel;
  const g=a.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+att); g.gain.setValueAtTime(vol,t+Math.max(att,dur)); g.gain.linearRampToValueAtTime(0.0001,end);
  const sum=a.createGain(); sum.gain.value=1/n;
  let lg=null; if(o.vib!==0){ const lfo=a.createOscillator(); lfo.frequency.value=4.6+Math.random()*0.9; lg=a.createGain(); lg.gain.setValueAtTime(0,t); lg.gain.linearRampToValueAtTime(o.vib||6,t+Math.min(dur,1)); lfo.connect(lg); lfo.start(t); lfo.stop(end+0.05); } // one vibrato for the section
  for(let i=0;i<n;i++){ const os=a.createOscillator(); os.type='sawtooth'; os.frequency.setValueAtTime(f*(o.glide?Math.pow(2,o.glide/24):1),t); if(o.glide) os.frequency.exponentialRampToValueAtTime(f*Math.pow(2,-o.glide/24),end);
    os.detune.value=(i-(n-1)/2)*(o.spread||9)+(Math.random()-0.5)*4; if(lg) lg.connect(os.detune);
    os.connect(sum); os.start(t); os.stop(end+0.05); }
  const sc=midi<48?0.9:1;
  for(const [fq,q,gn] of VOWELS[o.vowel||'o']){ const bp=a.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=fq*sc; bp.Q.value=q; const fg=a.createGain(); fg.gain.value=gn*3; sum.connect(bp); bp.connect(fg); fg.connect(g); }
  outNode(g,o.pan||0,o.wet!=null?o.wet:0.95);
}
// a shout from the dancers
function hey(t,vol){ [45,50,53,57].forEach((m,i)=>choirM(t+i*0.012,m,0.16,vol,{att:0.015,rel:0.12,vowel:'e',vib:0,glide:-4,pan:(i-1.5)*0.25,wet:0.6})); }
// buben (tambourine): jingles and a skin
function buben(t,vol,o={}){
  const a=MUS.ctx; for(let k=0;k<(o.roll?5:2);k++){ const tt=t+k*0.013; const nz=a.createBufferSource(); nz.buffer=MUS.noise; const hp=a.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=6500;
    const bp=a.createBiquadFilter(); bp.type='peaking'; bp.frequency.value=9500; bp.gain.value=8; bp.Q.value=2; const g=a.createGain(); g.gain.setValueAtTime(vol*(k?0.45:1),tt); g.gain.exponentialRampToValueAtTime(0.0001,tt+0.11);
    nz.connect(hp); hp.connect(bp); bp.connect(g); outNode(g,0.3,0.4); nz.start(tt,Math.random()*0.5); nz.stop(tt+0.12); }
  if(o.skin){ const os=a.createOscillator(); os.type='sine'; os.frequency.setValueAtTime(240,t); os.frequency.exponentialRampToValueAtTime(130,t+0.08); const g=a.createGain(); g.gain.setValueAtTime(vol*o.skin,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.2); os.connect(g); outNode(g,0.3,0.4); os.start(t); os.stop(t+0.22); }
}
// a step along a scale: dia(m, +2, scale) is the diatonic third above m
function dia(m,steps,sc){ const pc=((m%12)+12)%12; let ix=sc.indexOf(pc), oct=Math.floor(m/12); if(ix<0) return m+(steps>0?3:-3); ix+=steps; while(ix<0){ ix+=sc.length; oct--; } while(ix>=sc.length){ ix-=sc.length; oct++; } return oct*12+sc[ix]; }
const D_MIN=[0,2,4,5,7,9,10], A_MIN=[0,2,4,5,7,9,11];

/* ---- Zvon: an Orthodox chant over a bass drone, the great bell, then a full peal (D minor, 52 bpm) ---- */
const ZV={beat:60/52,
 mel:['A3:2 A3:1 Bb3:1','A3:1 G3:1 A3:2','C4:1 Bb3:1 A3:1 G3:1','A3:4','F3:1 G3:1 A3:1 G3:1','F3:1 E3:1 F3:1 G3:1','F3:1 E3:1 D3:1 E3:1','D3:4'],
 bass:['D2','D2','F2','D2','D2','C2','A1','D2'],
 small:['A5','C6','D6','F6'], pat:[0,2,1,3,0,2,1,2,0,2,1,3,2,1,0,1],
};
// the trezvon: little bells chattering in sixteenths, middle bells on the off-beats, the great bell on one and three
function peal(t,bar,amt){
  const B=bar/4; for(let s=0;s<16;s++){ if(amt<1&&s%2) continue; bell(t+s*B/4+(Math.random()-0.5)*0.01,nm(ZV.small[ZV.pat[s]]),(s%4===0?0.05:0.032)*amt,{dec:1.6,pan:0.5-ZV.pat[s]*0.25,wet:0.8}); }
  for(const b of [0.5,1.5,2.5,3.5]) bell(t+b*B,nm(b%2<1?'D4':'A4'),0.07*amt,{dec:3.2,pan:-0.3});
  bell(t,nm('D2'),0.16*amt,{dec:9}); bell(t+2*B,nm('A2'),0.09*amt,{dec:6,pan:0.2});
}
// 4 bars of bell and drone, the chant in unison, the chant in three parts with the peal joining, 4 bars of bells
function zvonBar(i,t,bar){
  const B=ZV.beat;
  if(i<4){ bell(t,nm('D2'),0.17,{dec:10}); if(i>=1) choirM(t,nm('D2'),bar,0.05,{att:2,vowel:'u',voices:4}); if(i>=2) choirM(t,nm('A2'),bar,0.035,{att:2,vowel:'u'}); if(i===3) choirM(t+B*2,nm('D3'),B*2,0.03,{att:1.2,vowel:'o'}); return; }
  if(i<20){ const k=(i-4)%8, two=i>=12;
    if(!two){ choirM(t,nm('D2'),bar,0.055,{att:0.6,vowel:'u',voices:4}); choirM(t,nm('A2'),bar,0.03,{att:0.6,vowel:'u'}); if(k%2===0) bell(t,nm('D2'),0.13,{dec:9}); }
    else { const bs=nm(ZV.bass[k]); choirM(t,bs,bar,0.06,{att:0.4,vowel:'o',voices:4}); choirM(t,bs-12,bar,0.03,{att:0.6,vowel:'u',vib:0}); choirM(t,bs+7,bar,0.03,{att:0.4,vowel:'o',pan:-0.25}); }
    playMel(t,B,ZV.mel[k],(tt,m,d)=>{ choirM(tt,m,d*0.98,two?0.07:0.08,{att:0.18,rel:0.4,vowel:'o',voices:4,pan:0.05}); if(two) choirM(tt,dia(m,2,D_MIN),d*0.98,0.05,{att:0.18,rel:0.4,vowel:'a',pan:0.3}); });
    if(i>=16) peal(t,bar,i<18?0.55:0.85); else if(two&&k%4===0) bell(t,nm('D2'),0.11,{dec:9});
    return; }
  if(i<22) peal(t,bar,i===20?1:0.7);
  if(i===22){ bell(t,nm('D2'),0.16,{dec:12}); chordM('D2 A2 D3 F3 A3').forEach((m,j)=>choirM(t,m,bar*1.7,j<2?0.05:0.04,{att:1.2,rel:2.5,vowel:j<2?'u':'o',pan:(j-2)*0.15})); }
  if(i===23){ bell(t+B*2,nm('D2'),0.12,{dec:12}); bell(t+B*2.02,nm('A4'),0.04,{dec:4}); }
}

/* ---- Steppe Wind: a long-drawn song, balalaika tremolo over gusli and bayan (A minor, 66 bpm) ---- */
const SW={beat:60/66,
 ch:{Am:['A1','A2 E3 A3 C4'],C:['C2','C3 G3 C4 E4'],Dm:['D2','D3 A3 D4 F4'],F:['F1','F2 C3 F3 A3'],E:['E2','E3 B3 E4 G#4']},
 progA:['Am','C','Dm','Am','F','Dm','E','Am'], progB:['F','C','Dm','Am','Dm','Am','E','Am'],
 A:['E5:2 A5:2','G5:1 F5:1 E5:2','D5:1 E5:1 F5:1 D5:1','E5:4','A5:2 C6:1 B5:1','A5:1 G5:1 F5:2','E5:1 D5:1 C5:1 B4:1','A4:4'],
 B:['C6:2 B5:1 A5:1','G5:2 E5:2','F5:1 G5:1 A5:1 F5:1','E5:4','D5:1 E5:1 F5:2','E5:1 D5:1 C5:2','B4:1 C5:1 D5:1 B4:1','A4:4'],
 arp:[0,1,2,3,1,2,3,2],
};
// gusli and balalaika, the second strain with bayan, the tune on bayan with a balalaika a third under and the choir humming, all together
function steppeBar(i,t,bar){
  const B=SW.beat, sec=Math.floor(i/8), k=i%8, isB=sec%2===1, c=SW.ch[(isB?SW.progB:SW.progA)[k]], bass=nm(c[0]), pad=chordM(c[1]), last=i===31;
  const arp=pad.map(m=>m+12); SW.arp.forEach((ix,j)=>gusli(t+j*B/2+(Math.random()-0.5)*0.01,arp[ix],(sec===2?0.07:0.09)*(j===0?1.2:1)));
  contrabass(t,bass+12,0.22,{stop:t+B*1.8}); contrabass(t+B*2,pad[1],0.16,{stop:t+B*3.8});
  const tune=(isB?SW.B:SW.A)[k];
  if(sec===0||sec===1||sec===3) playMel(t,B,tune,(tt,m,d)=>tremolo(tt,m,d*0.97,sec===3?0.13:0.11,{rate:12}));
  if(sec===1||sec===3) pad.slice(1).forEach(m=>bayan(t,m+12,bar*0.98,0.022,{att:0.35,rel:0.3,reeds:[0,6],pan:-0.2}));
  if(sec===2){ playMel(t,B,tune,(tt,m,d)=>bayan(tt,m,d*0.97,0.07,{att:0.06,reeds:[0,8],low:true})); playMel(t,B,tune,(tt,m,d)=>tremolo(tt,dia(m,-2,A_MIN),d*0.97,0.07,{rate:11.5,pan:0.35})); }
  if(sec>=2){ choirM(t,pad[1],bar,0.02,{att:1.2,vowel:'u',pan:-0.3}); choirM(t,pad[2],bar,0.018,{att:1.2,vowel:'u',pan:0.3}); }
  if(sec===3) playMel(t,B,tune,(tt,m,d)=>bayan(tt,m-12,d*0.97,0.035,{att:0.08,reeds:[0,5],pan:-0.25}));
  if(last){ chordM('A1 A2 E3 A3 C4 E4 A4').forEach((m,j)=>gusli(t+B*2+j*0.06,m,0.1)); choirM(t+B*2,nm('A2'),bar,0.035,{att:0.8,rel:2,vowel:'u'}); }
}

/* ---- Birch Waltz: a bayan waltz, oom-pah-pah in the left hand (E minor, 156 bpm in 3) ---- */
const BW={beat:60/156,
 ch:{Em:['E2','E3 G3 B3'],Am:['A1','A3 C4 E4'],D:['D2','D3 F#3 A3'],G:['G1','G3 B3 D4'],C:['C2','C3 E3 G3'],B7:['B1','B2 D#3 A3']},
 progA:['Em','Em','Am','Am','D','D','G','G','C','C','Am','B7','Em','C','B7','Em'],
 progB:['G','G','C','C','D','D','G','G','Am','Am','D','B7','Em','B7','B7','Em'],
 A:['B4:1 E5:1 G5:1','B5:2 A5:1','G5:1 F#5:1 E5:1','C6:3','B5:1 A5:1 G5:1','F#5:2 E5:1','D5:1 E5:1 F#5:1','G5:3','E5:1 G5:1 B5:1','E6:2 D6:1','C6:1 B5:1 A5:1','F#5:3','G5:1 F#5:1 E5:1','B5:2 G5:1','F#5:1 A5:1 D#5:1','E5:3'],
 B:['D5:1 G5:1 B5:1','D6:2 C6:1','B5:1 A5:1 G5:1','E5:3','F#5:1 G5:1 A5:1','D6:2 C6:1','B5:1 A5:1 B5:1','G5:3','E5:1 F#5:1 G5:1','A5:2 B5:1','C6:1 B5:1 A5:1','G5:2 F#5:1','E5:1 F#5:1 G5:1','A5:2 F#5:1','D#5:1 E5:1 F#5:1','E5:3'],
};
// bayan alone, the B strain with balalaika chords, the tune on balalaika tremolo with bayan underneath, bayan and balalaika together; it slows at the end
function waltzBar(i,t,bar){
  const B=bar/3, sec=Math.floor(i/16), k=i%16, isB=sec===1, c=BW.ch[(isB?BW.progB:BW.progA)[k]], bass=nm(c[0]), ch=chordM(c[1]), last=i===63;
  // left hand: bass button on one (root, fifth on alternate bars), chord buttons on two and three
  const lb=k%2&&!last?bass+7:bass; bayan(t,lb,B*0.85,0.06,{reeds:[0],low:true,pan:-0.25,bright:5});
  if(!last){ ch.forEach(m=>{ bayan(t+B,m,B*0.5,0.022,{reeds:[0],pan:-0.15,bright:6}); bayan(t+B*2,m,B*0.5,0.02,{reeds:[0],pan:-0.15,bright:6}); }); }
  if(sec>=1) contrabass(t,lb+12,0.16,{stop:t+B*0.95});
  if(sec===1&&!last){ strum(t+B,ch.map(m=>m+12),0.06,{stop:t+B*1.6,pan:0.3}); strum(t+B*2,ch.map(m=>m+12),0.05,{stop:t+B*2.6,up:true,pan:0.3}); }
  const tune=(isB?BW.B:BW.A)[k];
  if(sec===0||sec===1) playMel(t,B,tune,(tt,m,d)=>bayan(tt,m,d*0.92,0.075,{reeds:[0,9],pan:0.1}));
  if(sec===2){ playMel(t,B,tune,(tt,m,d)=>tremolo(tt,m,d*0.95,0.12,{rate:13,pan:0.2})); playMel(t,B,tune,(tt,m,d)=>bayan(tt,dia(m,-2,[2,4,6,7,9,11,0]),d*0.92,0.04,{reeds:[0,6],pan:-0.1})); }
  if(sec===3){ playMel(t,B,tune,(tt,m,d)=>{ bayan(tt,m,d*0.92,0.07,{reeds:[0,10],low:true,pan:0.05}); tremolo(tt,m+12,d*0.95,0.06,{rate:13,pan:0.35}); }); }
  if(last){ chordM('E2 B2 E3 G3 B3 E4').forEach(m=>bayan(t,m,bar*2.2,0.03,{att:0.2,rel:0.6,reeds:[0,7]})); strum(t,chordM('E3 B3 E4 G4 B4'),0.09,{roll:0.04}); }
}
const waltzBarAt=i=>BW.beat*3*(i>=59?1+(i-58)*0.09:1);

/* ---- Trepak: a dance that starts slow and runs away with itself (D minor, 2/4) ---- */
const TP={
 ch:{Dm:['D2','A3 D4 F4 A4'],Gm:['G1','G3 Bb3 D4 G4'],A:['A1','A3 C#4 E4 A4'],F:['F1','A3 C4 F4 A4'],C:['C2','G3 C4 E4 G4']},
 progA:['Dm','Dm','Gm','A','Gm','A','A','Dm'], progB:['F','F','C','C','Dm','A','Dm','Dm'],
 A:['D5:.5 E5:.5 F5:.5 G5:.5','A5:1 A5:1','Bb5:.5 A5:.5 G5:.5 F5:.5','E5:1 A4:1','G5:.5 F5:.5 E5:.5 D5:.5','C#5:.5 D5:.5 E5:.5 C#5:.5','D5:.5 F5:.5 E5:.5 C#5:.5','D5:1 r:1'],
 B:['C6:.5 A5:.5 F5:.5 A5:.5','C6:1 C6:1','Bb5:.5 G5:.5 E5:.5 G5:.5','Bb5:1 Bb5:1','A5:.5 F5:.5 D5:.5 F5:.5','G5:.5 E5:.5 C#5:.5 E5:.5','D5:.5 A5:.5 F5:.5 E5:.5','D5:1 D4:1'],
};
const trepakBarAt=i=>i<7?2*60/72:i===7?2*60/52:2*60/(126+(i-8)*1.15);
// a slow balalaika verse with gusli, then fast: bayan, the B strain with balalaika, everything, a lighter verse, then everything faster and faster
function trepakBar(i,t,bar){
  const B=bar/2, sec=Math.floor(i/8), k=i%8, isB=sec%2===0&&sec>0, c=TP.ch[(isB?TP.progB:TP.progA)[k]], bass=nm(c[0]), ch=chordM(c[1]), tune=(isB?TP.B:TP.A)[k], last=i===63;
  if(sec===0){ strum(t,ch.map(m=>m-12),0.07,{inst:gusli,roll:0.05}); contrabass(t,bass+12,0.16);
    playMel(t,B,tune,(tt,m,d)=>tremolo(tt,m,d*0.97,0.12,{rate:11})); if(k===7) choirM(t,nm('D3'),bar,0.03,{att:0.5,vowel:'u'}); return; }
  if(last){ contrabass(t,nm('D2'),0.3); strum(t,chordM('D3 A3 D4 F4 A4'),0.13,{roll:0.006}); bayan(t,nm('D5'),B*0.9,0.08,{low:true}); bayan(t,nm('A4'),B*0.9,0.05);
    strum(t+B,chordM('D3 A3 D4 F4 A4 D5'),0.15,{roll:0.004}); chordM('D3 A3 D4 F4').forEach(m=>bayan(t+B,m,B*1.6,0.03,{rel:0.3})); hey(t+B,0.09); buben(t+B,0.1,{roll:true,skin:0.6}); return; }
  // oom-pah: bass on the beats, chords off the beat
  contrabass(t,bass+12,0.22,{stop:t+B*0.7}); contrabass(t+B,bass+19,0.18,{stop:t+B*1.7});
  strum(t+B*0.5,ch,0.065,{stop:t+B*0.85,pan:0.25}); strum(t+B*1.5,ch,0.06,{stop:t+B*1.85,up:true,pan:0.25});
  if(sec>=2) ch.forEach(m=>{ bayan(t+B*0.5,m-12,B*0.3,0.016,{reeds:[0],pan:-0.2}); bayan(t+B*1.5,m-12,B*0.3,0.016,{reeds:[0],pan:-0.2}); });
  if(sec>=3&&sec!==5){ buben(t,0.07,{skin:0.5}); buben(t+B*0.5,0.04); buben(t+B,0.06,{skin:0.3}); buben(t+B*1.5,0.04,{roll:k%4===3}); } else if(sec===5) buben(t+B,0.035);
  // the tune: bayan, then balalaika plucking it note for note, then both
  if(sec===1||sec>=3) playMel(t,B,tune,(tt,m,d)=>bayan(tt,m,d*0.85,sec>=3?0.065:0.075,{reeds:[0,9],low:sec>=3}));
  if(sec>=2) playMel(t,B,tune,(tt,m,d)=>{ if(d>=B*0.9) tremolo(tt,m,d*0.9,0.1,{rate:13}); else balalaika(tt,m,0.13,{stop:tt+d*0.95}); });
  if(sec===7&&k%2===0) choirM(t,bass+24,bar,0.025,{att:0.1,vowel:'a',pan:-0.3});
  if((sec===3||sec===4||sec===6)&&k===7) hey(t+B,0.08);
}

TRACKS.push(
 {id:'zvon',name:'Zvon',bar:ZV.beat*4,len:24,play:zvonBar,tail:9,gain:2.5},
 {id:'steppe',name:'Steppe Wind',bar:SW.beat*4,len:32,play:steppeBar,tail:6,gain:5.5},
 {id:'waltz',name:'Birch Waltz',bar:BW.beat*3,barAt:waltzBarAt,len:64,play:waltzBar,tail:5,gain:6.5},
 {id:'trepak',name:'Trepak',bar:2*60/126,barAt:trepakBarAt,len:64,play:trepakBar,tail:4,gain:5.5},
);
