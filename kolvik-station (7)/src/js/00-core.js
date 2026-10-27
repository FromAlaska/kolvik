/* 00-core: helpers: $, rand, clamp, rr, fmt$, uid, esc */
'use strict';
const $ = s => document.querySelector(s);
let rand = Math.random;
const clamp = (v,a,b) => v<a?a:v>b?b:v;
const rr = (a,b) => a + rand()*(b-a);
const fmt$ = n => '$' + Math.round(n).toLocaleString('en-US');
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function wpick(list, r=rand){ let s=0; for(const [,w] of list) s+=w; let x=r()*s; for(const [v,w] of list){ x-=w; if(x<=0) return v; } return list[list.length-1][0]; }
let uidC = 0, BUILD=null;
const uid = () => BUILD ? 'm'+(BUILD.n++).toString(36) : (Date.now()%1e7).toString(36) + (uidC++).toString(36) + Math.floor(Math.random()*1e5).toString(36);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
