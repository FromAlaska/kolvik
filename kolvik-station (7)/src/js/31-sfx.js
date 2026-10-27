/* 31-sfx: sound effects */
/* ================= SFX ================= */
function sfxNoise(dur, freq, vol, type='lowpass'){ const a=MUS.ctx; if(!a) return; const s=a.createBufferSource(); s.buffer=MUS.noise; const f=a.createBiquadFilter(); f.type=type; f.frequency.value=freq; const g=a.createGain(); const t=a.currentTime; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0008,t+dur); s.connect(f); f.connect(g); g.connect(MUS.sfx); s.start(t); s.stop(t+dur+0.05); }
function sfxTone(freq, dur, vol, type='square', slide){ const a=MUS.ctx; if(!a) return; const o=a.createOscillator(), g=a.createGain(), t=a.currentTime; o.type=type; o.frequency.setValueAtTime(freq,t); if(slide) o.frequency.exponentialRampToValueAtTime(slide,t+dur); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0008,t+dur); o.connect(g); g.connect(MUS.sfx); o.start(t); o.stop(t+dur+0.02); }
function sfxShot(id, dist=0, noise=1){ const v=0.55*Math.max(0.04,1-dist/140)*(noise<1?0.3:1); const big=(id==='nord'||id==='tundra'||id==='kestrel'||id==='nordlys'||id==='jarlmg'); const bright=dist>40?700:(id==='makar'?3800:3000); sfxNoise(big?0.38:0.2, bright, v); sfxTone(big?90:120, big?0.25:0.14, v*0.7, 'sine', 40); }
const sfxHit = head => sfxTone(head?1800:1200, 0.06, 0.12, 'square');
const sfxHurt = () => { sfxTone(160,0.25,0.35,'sine',60); sfxNoise(0.12,500,0.25); };
const sfxDry = () => sfxTone(2400,0.03,0.08,'square');
const sfxReload = () => { sfxTone(900,0.04,0.08,'square'); setTimeout(()=>sfxTone(650,0.05,0.08,'square'),260); };
const sfxBeep = () => sfxTone(1320,0.08,0.1,'sine');
const sfxWhizz = () => sfxNoise(0.14,4500,0.08,'bandpass');
function sfxGrunt(vol=0.5,pitch=110,dist=0){ const a=MUS.ctx; if(!a) return; const v=vol*Math.max(0.05,1-dist/50); const o=a.createOscillator(), g=a.createGain(), f=a.createBiquadFilter(), t=a.currentTime; o.type='sawtooth'; o.frequency.setValueAtTime(pitch*1.3,t); o.frequency.exponentialRampToValueAtTime(pitch*0.7,t+0.22); f.type='lowpass'; f.frequency.value=700; g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.25); o.connect(f); f.connect(g); g.connect(MUS.sfx); o.start(t); o.stop(t+0.3); sfxNoise(0.18,900,v*0.5); }
const sfxCrack = () => { sfxNoise(0.06,3000,0.5,'highpass'); sfxTone(220,0.12,0.3,'square',60); };
const sfxPlink = () => { sfxTone(2600,0.09,0.18,'triangle',1800); sfxNoise(0.04,5000,0.12,'highpass'); };
const sfxPickup = () => { sfxTone(880,0.05,0.08,'square'); setTimeout(()=>sfxTone(1320,0.06,0.08,'square'),50); };
const sfxOpen = () => { sfxTone(95,0.35,0.18,'sawtooth',70); sfxNoise(0.3,500,0.15); setTimeout(()=>sfxTone(1500,0.03,0.08,'square'),320); };
const sfxClick = () => sfxTone(1800,0.03,0.07,'square');
function sfxRustle(n){ for(let i=0;i<n;i++) setTimeout(()=>sfxNoise(0.14,1400,0.12,'bandpass'),i*220); }
const sfxHealDone = () => { sfxTone(660,0.08,0.1,'sine'); setTimeout(()=>sfxTone(990,0.12,0.1,'sine'),90); };
function sfxDeath(){ const a=MUS.ctx; if(!a) return; const o=a.createOscillator(), g=a.createGain(), t=a.currentTime; o.type='sawtooth'; o.frequency.setValueAtTime(70,t); o.frequency.exponentialRampToValueAtTime(35,t+1.6); g.gain.setValueAtTime(0.35,t); g.gain.exponentialRampToValueAtTime(0.001,t+1.7); const f=a.createBiquadFilter(); f.type='lowpass'; f.frequency.value=300; o.connect(f); f.connect(g); g.connect(MUS.sfx); o.start(t); o.stop(t+1.8); sfxGrunt(0.6,80); }
function sfxExtracted(){ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>sfxTone(f,0.5,0.12,'triangle'),i*120)); }
// foot: 0 or 1, so left and right steps sound slightly different, the way real ones do
function sfxStep(speed,indoor,sneak,foot){ const a=MUS.ctx; if(!a) return; const v=(sneak?0.05:speed>5?0.26:0.14)*(foot?0.9:1)*(0.92+Math.random()*0.16), f=(foot?0.92:1.06)*(0.95+Math.random()*0.1); sfxNoise(indoor?0.07:0.1, (indoor?1400:600)*f, v); if(!indoor) sfxNoise(0.14,300*f,v*0.6); }
const sfxShiver = () => { sfxNoise(0.35,700,0.12,'bandpass'); setTimeout(()=>sfxNoise(0.25,650,0.08,'bandpass'),380); };
// wind: a looped noise bed whose filter wanders; muffled indoors, silent in the vault
const WIND={src:null,filt:null,gain:null};
function windStart(){ const a=MUS.ctx; if(!a||WIND.src) return; const len=a.sampleRate*3, buf=a.createBuffer(1,len,a.sampleRate), d=buf.getChannelData(0); let l=0; for(let i=0;i<len;i++){ l=l*0.985+(Math.random()*2-1)*0.015; d[i]=l*8; } const s=a.createBufferSource(); s.buffer=buf; s.loop=true; const f=a.createBiquadFilter(); f.type='lowpass'; f.frequency.value=400; const g=a.createGain(); g.gain.value=0; const lfo=a.createOscillator(), lg=a.createGain(); lfo.frequency.value=0.13; lg.gain.value=220; lfo.connect(lg); lg.connect(f.frequency); s.connect(f); f.connect(g); g.connect(MUS.sfx); s.start(); lfo.start(); WIND.src=s; WIND.filt=f; WIND.gain=g; WIND.lfo=lfo; }
function windSet(level){ if(!WIND.gain) return; const a=MUS.ctx; WIND.gain.gain.setTargetAtTime(level,a.currentTime,0.6); }
function windStop(){ if(!WIND.src) return; windSet(0); const s=WIND.src, l=WIND.lfo; setTimeout(()=>{ try{ s.stop(); l.stop(); }catch(e){} },1500); WIND.src=null; }
