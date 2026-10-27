/* 45-tips: how to use the main screen, and a reminder for guests to register
   Every hideout tab opens with a short tip strip saying what the tab is for and how to work it. "Got it" hides that
   tab's tip; the Tips button in the header brings them all back. Guests (not signed in, on a server) see a bar asking
   them to register, with a plain warning not to reuse a real password: the game is served over plain HTTP, so the
   password crosses the network unencrypted. */
const TAB_TIPS={
  wayout:`<b>The way out.</b> The goal of the game. Six stages stand between you and a seat on the last flight out of Kolvik: fix the radio, kill a boss, extract from four maps, hold Last Light to wave 5, pay the pilot, then board the evac flight on Kaldfjord Reach. The banner on every tab shows where you are. Getting out puts you in the Hall of Escapees for the season.`,
  gear:`<b>Stash &amp; gear.</b> Drag items between your stash and your loadout (gun slots, armor, rig, pockets, backpack). Double-click (or double-tap) an item to move it in one go, and press <kbd>R</kbd> while dragging to rotate it. Click an item to see its stats and to sell it, load ammo, or fit attachments (you can also drag an optic, muzzle or magazine onto a gun). Whatever is in the <b>secure pouch</b> comes home even if you die. Drop loot on the sell strip, or use <i>Sell all loot</i>.`,
  trader:`<b>Trader.</b> Buy guns, ammo, armor, meds and ready-made kits from Quartermaster Ilse. The more you spend, the higher your loyalty and the better the gear she offers. She buys anything at 60% of its value: drop it on the sell strip on the Stash &amp; gear tab.`,
  tasks:`<b>Tasks.</b> Jobs from the people at the station. Take one, do what it asks in a raid (find something, kill something, extract from somewhere) and claim the reward here. Daily tasks change every day.`,
  goals:`<b>Goals.</b> Long-term counters that tick up over every raid and survive season wipes. Claim each tier for cash, sealed caches, scrip, rare cosmetics and titles other players see. The collection log shows everything you've brought home.`,
  hideout:`<b>Hideout.</b> Spend cash on upgrades: bigger stash racks, a diesel heater (you lose body heat slower in raids), a workbench and med station that craft ammo and medical gear, and the Armory for relic gear.`,
  operator:`<b>Operator.</b> Open sealed caches (from raids, goals and tasks) for cosmetics, and spend scrip to make the exact piece you want. Dress your character and skin your guns here.`,
  rec:`<b>Rec room.</b> Short games that pay cash. They pay double while you're worth under $20,000, so you can always afford a kit again. In a squad, the leader can start a party round for everyone.`,
  deploy:`<b>Deploy.</b> Pick a map and difficulty and go in solo, or host or join a lobby to raid with other people. In a raid: <kbd>WASD</kbd> move, <kbd>Shift</kbd> sprint, <kbd>C</kbd> crouch, <kbd>Ctrl</kbd> sneak, right mouse aim, <kbd>R</kbd> reload, <kbd>1</kbd>–<kbd>3</kbd> weapons, <kbd>4</kbd>–<kbd>7</kbd> bandage, splint, heal, warm up, <kbd>E</kbd> search or use, <kbd>Tab</kbd> inventory, <kbd>M</kbd> map, <kbd>G</kbd> route to the nearest exit, <kbd>Esc</kbd> pause. Get to an extract before the timer runs out or you lose what you carry.`,
  friends:`<b>Friends.</b> Add people by account name, message them, invite them to a squad (you deploy together, show up green and can't hurt each other) and <b>trade</b> cash and gear with them while you're both at the hideout.`,
  board:`<b>Leaderboard.</b> Everyone on this server ranked by net worth, extracts, survival and kills this season, with past champions in the Hall of Fame. When a season ends, stash, cash, hideout and tasks are wiped; goals, cosmetics, titles and career totals carry over.`,
};
function tabTip(body){ if(!body||OPTS.tips==='off') return; const hid=OPTS.tipsHidden||[]; const tip=TAB_TIPS[TAB]; if(!tip||hid.includes(TAB)) return;
  body.insertAdjacentHTML('afterbegin',`<div class="tabtip" role="note"><span class="lbl">Tip</span><p>${tip}</p><button class="btn ghost sm" id="tipOk">Got it</button></div>`);
  $('#tipOk').onclick=()=>{ OPTS.tipsHidden=[...hid,TAB]; saveOpts(); const t=body.querySelector('.tabtip'); if(t) t.remove(); }; }
function tipsReset(){ OPTS.tips='on'; OPTS.tipsHidden=[]; saveOpts(); renderTab(); toast('Tips are back on every tab.'); }

// guests: register so your progress is kept, and use a password that's only for this game
const insecure=()=>location.protocol==='http:'&&!/^(localhost|127\.|\[::1\])/.test(location.hostname);
function pwWarning(){ return insecure()
  ?`<b>Use a new password just for this game.</b> This server runs over plain HTTP, so your password is sent without encryption and anyone on the same network could read it. Never use one you use for email, banking, work or anything else.`
  :`<b>Use a password just for this game,</b> not one you use for email, banking, work or anything else.`; }
function guestBar(){ const el=$('#guestBar'); if(!el) return; let off=false; try{ off=sessionStorage.getItem('kolvik-guestbar')==='off'; }catch(e){}
  if(ACC.name||!NET.avail||off){ el.hidden=true; return; } el.hidden=false;
  el.innerHTML=`<p><b>You're playing as a guest.</b> Your progress only lives in this browser: clear it or switch devices and it's gone, and you can't add friends, squad up or trade. Register a free account to keep it on the server.</p><p class="pw">⚠ ${pwWarning()}</p><div class="acts"><button class="btn sm" id="gbReg">Register</button><button class="btn ghost sm" id="gbLater">Later</button></div>`;
  $('#gbReg').onclick=()=>accModal(); $('#gbLater').onclick=()=>{ try{ sessionStorage.setItem('kolvik-guestbar','off'); }catch(e){} el.hidden=true; }; }
