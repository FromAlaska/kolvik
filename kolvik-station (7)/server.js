'use strict';
// Kolvik Station game server.
// Serves the page, keeps accounts and saves, runs lobbies and chat, keeps a leaderboard, and relays
// raid traffic between players. Every connected player has one WebSocket for all of it.
// In a raid, one player simulates the AI (the "host"); the server hands that job on if they leave.
// Loot pickups are settled first-come on the server.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT) || 8080;
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS) || 8;
const DUR = { holdout: 2400, kolvik: 540, whiteout: 420, vault: 360, skarsvik: 900, ironfjord: 600, ravnskar: 780, hrimfell: 720, storvidda: 900, skerries: 1200, kaldfjord: 1800 };
const TEAM_MAPS = new Set(['skerries']);
// co-op maps: everyone in the raid is on the same side (no player damage; revives and downed looting for all)
const COOP_MAPS = new Set(['ravnskar', 'holdout']);
const DIFFS = new Set(['easy', 'normal', 'hard', 'brutal']);
// PvP-only maps: no AI, so a raid needs at least two sides (players not in the same squad)
const PVP_MAPS = new Set(['ironfjord', 'hrimfell']);
/* deathmatch modes: no AI, a fixed loadout (your own gear stays home), respawns, first to the kill limit or most kills
   when the 10 minutes run out. Only on the compact maps. */
const DM_MODES = { tdm: { limit: 40, dur: 600, name: 'Team deathmatch' }, ffa: { limit: 20, dur: 600, name: 'Free for all' } };
const DM_MAPS = new Set(['ironfjord', 'kolvik', 'whiteout']);
const teamMode = l => TEAM_MAPS.has(l.map) || l.mode === 'tdm';
const MAP_NAMES = { holdout: 'Last Light', kolvik: 'Kolvik Station', whiteout: 'Whiteout', vault: 'Black Ice Vault', skarsvik: 'Skarsvik Island', ironfjord: 'Ironfjord Depot', ravnskar: 'Fort Ravnskar', hrimfell: 'Hrimfell Run', storvidda: 'Storvidda', skerries: 'Skjærgård', kaldfjord: 'Kaldfjord Reach' };
const COND_SLOT_MS = 3 * 3600 * 1000; // raid conditions rotate on this clock; clients compute the same table
const SQUAD_MAX = 4;
/* trading between friends (44-trade.js): both sides put items and cash up, both press Ready on the same version of
   the deal, then each game gets what it gives and what it gets. Each side's offer sits in escrow in its own save
   until then, so nothing can be used twice. */
const trades = new Map(); let nextTrade = 1;
function tradeState(T, q) { const o = T.a === q ? T.b : T.a; return { t: 'trade', id: T.id, with: o.account, mine: T.offer[q.id], theirs: T.offer[o.id], okMe: !!T.ok[q.id], okThem: !!T.ok[o.id], ver: T.ver }; }
function tradeSend(T) { for (const q of [T.a, T.b]) send(q, tradeState(T, q)); }
function tradeEnd(p, why) { const T = p.trade; if (!T) return; trades.delete(T.id); for (const q of [T.a, T.b]) { q.trade = null; send(q, { t: 'trend', id: T.id, reason: q === p ? 'Trade cancelled.' : `${p.account || p.name} ${why}.` }); } }
function cleanOffer(m) {
  const cash = Math.max(0, Math.min(1e9, Math.floor(+m.cash || 0)));
  const items = Array.isArray(m.items) ? m.items.slice(0, 30).filter(x => x && typeof x === 'object' && typeof x.id === 'string' && JSON.stringify(x).length < 6000) : [];
  return { cash, items };
}
const MG_SECS = { fish: 30, drop: 30, freq: 60, draw: 25 }; let nextMg = 1;
function mgFinish(sq, mg) {
  clearTimeout(mg.timer); if (sq.mg !== mg) return; sq.mg = null;
  const rank = mg.players.map(id => ({ id, name: mg.names[id], score: mg.scores[id] || 0 })).sort((a, b) => b.score - a.score);
  for (const id of mg.players) { const q = conns.get(id); if (q) send(q, { t: 'mgend', id: mg.id, rank }); }
}
// accounts allowed to use the debug tools (comma-separated usernames). Nobody else is even sent the debug code.
const ADMINS = new Set(String(process.env.ADMINS || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean));
const isAdmin = name => !!name && ADMINS.has(name);
const DEBUG_JS = path.join(__dirname, 'debug.js'), TESTS_JS = path.join(__dirname, 'item-tests.js');
const STARTED = Date.now();
// uncaught errors reported by players' browsers (kept in memory for the debug panel, and printed to the log)
const clientErrors = []; const errRate = new Map();

const GAME = path.join(__dirname, 'game.html');
const THREE = path.join(__dirname, 'node_modules', 'three', 'build', 'three.min.js');
// the page is built from src/ when that folder is present (see build.js); otherwise the shipped game.html is served as is
let builder = null; try { if (fs.existsSync(path.join(__dirname, 'src', 'index.html'))) builder = require('./build.js'); } catch (e) { console.log('build.js: ' + e.message); }
function loadPage() { if (builder) { try { return wrap(builder.build()); } catch (e) { console.log('build failed, serving the last game.html: ' + e.message); } } return wrap(fs.readFileSync(GAME, 'utf8')); }
let page = loadPage(); if (builder) console.log('game.html built from src/');
// the workshop (/workshop, see workshop.js) also needs the rebuild-on-change watcher
const WORKSHOP_ON = !!(process.env.WORKSHOP || process.env.DEV); let WS = null;
if (process.env.DEV || WORKSHOP_ON) {
  if (builder) { // poll every source file, and rescan the folders so files you add or delete are picked up too
    let t = null; const watched = new Set(); const rebuild = f => { clearTimeout(t); t = setTimeout(() => { page = loadPage(); const i = builder.info; console.log(`src/ changed: game.html rebuilt${i.errors.length ? ` (${i.errors.length} error${i.errors.length > 1 ? 's' : ''}: ${i.errors[0].file}:${i.errors[0].line} ${i.errors[0].message})` : ''}`); if (WS) WS.built(f); }, 100); };
    const scan = () => { const now = builder.sourceFiles(); let changed = now.length !== watched.size; for (const f of now) if (!watched.has(f)) { watched.add(f); fs.watchFile(f, { interval: 500 }, () => rebuild(f)); changed = true; }
      for (const f of [...watched]) if (!now.includes(f)) { fs.unwatchFile(f); watched.delete(f); changed = true; } return changed; };
    scan(); setInterval(() => { if (scan()) rebuild(null); }, 1000); }
  else fs.watchFile(GAME, { interval: 500 }, () => { page = wrap(fs.readFileSync(GAME, 'utf8')); console.log('game.html reloaded'); });
}
function wrap(body) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + body + '</body></html>';
}

/* ---------------- accounts: username + password, one JSON save per user under DATA_DIR ---------------- */
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
// everything persistent lives in one SQLite file, kolvik.sqlite in the data directory (see db.js)
const db = require('./db.js').open(DATA);
let users = db.users();
const tokens = new Map(); // token -> username
for (const [n, u] of Object.entries(users)) if (u.token) tokens.set(u.token, n);
function saveUser(name) { if (users[name]) db.putUser(name, users[name]); else db.delUser(name); }
// daily snapshots of the database, kept for a week, in data/backups/ (plus the download buttons in the admin panel)
const BACKUP_DIR = path.join(DATA, 'backups');
function snapshot() { try { fs.mkdirSync(BACKUP_DIR, { recursive: true }); const f = path.join(BACKUP_DIR, `kolvik-${new Date().toISOString().slice(0, 10)}.sqlite`); db.copyTo(f);
  const old = fs.readdirSync(BACKUP_DIR).filter(x => /^kolvik-\d{4}-\d\d-\d\d\.sqlite$/.test(x)).sort(); while (old.length > 7) fs.unlinkSync(path.join(BACKUP_DIR, old.shift())); return f; } catch (e) { console.log('backup failed: ' + e.message); return null; } }
snapshot(); setInterval(snapshot, 864e5);
function dbInfo() { let files = []; try { files = fs.readdirSync(BACKUP_DIR).filter(x => x.endsWith('.sqlite')).sort().reverse(); } catch (e) {} return Object.assign({ file: db.file, size: ['', '-wal'].reduce((n, x) => { try { return n + fs.statSync(db.file + x).size; } catch (e) { return n; } }, 0), snapshots: files }, db.counts()); }
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const validName = n => typeof n === 'string' && /^[a-z0-9_]{3,16}$/i.test(n);
const readSave = name => db.save(name);
const writeSave = (name, s) => db.putSave(name, s);
function readBody(req) { return new Promise((res, rej) => { let b = ''; req.on('data', c => { b += c; if (b.length > 1e6) { rej(new Error('too big')); req.destroy(); } }); req.on('end', () => { try { res(b ? JSON.parse(b) : {}); } catch (e) { rej(e); } }); }); }
function json(res, code, o) { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(o)); }
function authed(req) { const t = (req.headers.authorization || '').replace(/^Bearer /, ''); return tokens.get(t) || null; }
const attempts = new Map(); // ip -> [count, resetAt]
function throttled(req) { const ip = req.socket.remoteAddress; const a = attempts.get(ip) || [0, Date.now() + 60000]; if (Date.now() > a[1]) { a[0] = 0; a[1] = Date.now() + 60000; } a[0]++; attempts.set(ip, a); return a[0] > 20; }

/* ---------------- leaderboard: save stats plus server-counted player kills ---------------- */
let pvp = db.kv('pvp', {});
let pvpDirty = false;
setInterval(() => { if (pvpDirty) { pvpDirty = false; db.putKv('pvp', pvp); } }, 5000);
/* ---------------- seasons: the server resets everyone's progress every SEASON_DAYS and archives a Hall of Fame ---------------- */
const SEASON_DAYS = Number(process.env.SEASON_DAYS) || 30;
let season = db.kv('season', null);
/* world tuning edited by admins in the debug panel: snowmobile handling and Storvidda's layout. Every raid gets the
   snapshot that was current when its room was created, so everyone in it builds the same map. */
let world = db.kv('world', {}) || {};
function cleanWorld(w) {
  if (!w || typeof w !== 'object') return {};
  const num = (v, lo, hi) => (typeof v === 'number' && isFinite(v)) ? Math.min(hi, Math.max(lo, v)) : undefined;
  const out = {};
  if (w.sled && typeof w.sled === 'object') { const s = {}; for (const k of ['P', 'Fb', 'Cf', 'Cr', 'muF', 'muR', 'Kr', 'CdA', 'm', 'lock', 'turn', 'rMax', 'straight', 'Crr']) { const v = num(w.sled[k], 0, 1e6); if (v !== undefined) s[k] = v; } out.sled = s; }
  if (w.storvidda && typeof w.storvidda === 'object') { const c = w.storvidda, o = {};
    for (const [k, lo, hi] of [['spawnR', 150, 620], ['exR', 150, 625], ['zoneR', 40, 140], ['hill', 0, 4], ['hillScale', 0.3, 4], ['trees', 0, 3], ['rocks', 0, 4]]) { const v = num(c[k], lo, hi); if (v !== undefined) o[k] = v; }
    if (Array.isArray(c.spawns)) o.spawns = c.spawns.slice(0, 16).map(q => ({ x: num(q.x, -640, 640) || 0, z: num(q.z, -640, 640) || 0 }));
    if (Array.isArray(c.props)) o.props = c.props.slice(0, 400).filter(q => q && typeof q.t === 'string').map(q => ({ t: q.t.slice(0, 12), x: num(q.x, -640, 640) || 0, z: num(q.z, -640, 640) || 0, r: num(q.r, -7, 7) || 0 }));
    out.storvidda = o; }
  return out;
}
if (!season || !season.n) { season = { n: 1, start: Date.now(), end: Date.now() + SEASON_DAYS * 864e5 }; db.putKv('season', season); }
let hall = db.kv('hall', []);
function rollSeason() {
  board = null; const rows = leaderboard();
  const best = k => { const r = rows.slice().sort((a, b) => b[k] - a[k])[0]; return r && r[k] > 0 ? { name: r.name, value: r[k] } : null; };
  const entry = { n: season.n, start: season.start, end: Date.now(), players: rows.length,
    top: rows.slice().sort((a, b) => b.worth - a.worth).slice(0, 5).map(r => ({ name: r.name, worth: r.worth, extracts: r.extracts, kills: r.kills, pkills: r.pkills })),
    kills: best('kills'), pkills: best('pkills'), extracts: best('extracts'), haul: best('best') };
  hall.unshift(entry); db.putKv('hall', hall);
  pvp = {}; db.putKv('pvp', pvp);
  season = { n: season.n + 1, start: Date.now(), end: Date.now() + SEASON_DAYS * 864e5 }; db.putKv('season', season);
  board = null; console.log(`season ${entry.n} archived; season ${season.n} begins`);
  sendAll({ t: 'season', season, hall: entry });
}
setInterval(() => { if (Date.now() >= season.end) rollSeason(); }, 60000);
let board = null, boardAt = 0;
function leaderboard() {
  if (board && Date.now() - boardAt < 10000) return board;
  const rows = [];
  for (const name of Object.keys(users)) {
    const s = readSave(name); if (s && s.season != null && s.season !== season.n) continue; const st = (s && s.stats) || {}; const pv = pvp[name] || {};
    if (!(st.raids > 0) && !pv.kills) continue;
    rows.push({ name, worth: Math.round(st.worth || (s && s.cash) || 0), raids: st.raids || 0, extracts: st.extracts || 0, deaths: st.deaths || 0, kills: st.kills || 0, best: Math.round(st.best || 0), pkills: pv.kills || 0, pdeaths: pv.deaths || 0 });
  }
  board = rows; boardAt = Date.now(); return rows;
}

async function api(req, res, u) {
  if (u === '/api/leaderboard' && req.method === 'GET') return json(res, 200, { rows: leaderboard(), at: boardAt, season, hall: hall.slice(0, 20) });
  if (u === '/api/admin/season/next' && req.method === 'POST') {
    if (!(process.env.ADMIN_TOKEN && (req.headers.authorization || '') === 'Bearer ' + process.env.ADMIN_TOKEN) && !isAdmin(authed(req))) return json(res, 404, { error: 'No such call.' });
    rollSeason(); return json(res, 200, { ok: true, season });
  }
  if (u === '/api/world' && req.method === 'GET') return json(res, 200, { world });
  if (u === '/api/register' && req.method === 'POST') {
    if (throttled(req)) return json(res, 429, { error: 'Too many attempts. Wait a minute.' });
    const b = await readBody(req); const name = String(b.name || '').toLowerCase();
    if (!validName(name)) return json(res, 400, { error: 'Username: 3–16 letters, numbers or underscores.' });
    if (typeof b.pass !== 'string' || b.pass.length < 6) return json(res, 400, { error: 'Password needs at least 6 characters.' });
    if (users[name]) return json(res, 409, { error: 'That name is taken.' });
    const salt = crypto.randomBytes(16).toString('hex'); const token = crypto.randomBytes(24).toString('hex');
    users[name] = { salt, hash: hashPw(b.pass, salt), token, created: Date.now() }; tokens.set(token, name); saveUser(name);
    if (b.save && typeof b.save === 'object') writeSave(name, b.save);
    console.log(`account created: ${name}`);
    return json(res, 200, { token, name, save: b.save || null });
  }
  if (u === '/api/login' && req.method === 'POST') {
    if (throttled(req)) return json(res, 429, { error: 'Too many attempts. Wait a minute.' });
    const b = await readBody(req); const name = String(b.name || '').toLowerCase(); const usr = users[name];
    if (!usr || hashPw(String(b.pass || ''), usr.salt) !== usr.hash) return json(res, 401, { error: 'Wrong name or password.' });
    return json(res, 200, { token: usr.token, name, save: readSave(name) });
  }
  if (u === '/api/clienterror' && req.method === 'POST') {
    const ip = req.socket.remoteAddress; const r = errRate.get(ip) || [0, Date.now() + 60000]; if (Date.now() > r[1]) { r[0] = 0; r[1] = Date.now() + 60000; } r[0]++; errRate.set(ip, r); if (r[0] > 12) return json(res, 429, { error: 'Slow down.' });
    const b = await readBody(req); const e = { t: Date.now(), name: cleanName(b.name) || '?', account: authed(req), msg: cleanText(b.msg), where: cleanText(b.where).slice(0, 60), stack: String(b.stack || '').slice(0, 800), ua: cleanText(b.ua).slice(0, 120) };
    clientErrors.push(e); if (clientErrors.length > 200) clientErrors.shift(); console.log(`client error from ${e.name} (${e.where}): ${e.msg}`); return json(res, 200, { ok: true });
  }
  const name = authed(req); if (!name) return json(res, 401, { error: 'Not signed in.' });
  if (u.startsWith('/api/admin/')) {
    if (!isAdmin(name)) return json(res, 404, { error: 'No such call.' });
    if (u === '/api/admin/state' && req.method === 'GET') return json(res, 200, {
      uptime: Math.round((Date.now() - STARTED) / 1000), mem: Math.round(process.memoryUsage().rss / 1048576), season,
      players: [...conns.values()].map(q => ({ id: q.id, name: q.name, account: q.account, room: q.room ? q.room.id : null, lobby: q.lobby ? q.lobby.id : null, squad: q.squad ? q.squad.id : null })),
      lobbies: [...lobbies.values()].map(l => Object.assign(lobbyInfo(l), { members: [...l.members.keys()].map(id => (conns.get(id) || {}).name) })),
      rooms: [...rooms.values()].map(r => ({ id: r.id, map: r.map, diff: r.diff, timeLeft: timeLeft(r), host: (conns.get(r.hostId) || {}).name || null, players: [...r.players.values()].map(q => q.name), events: r.events.length, taken: r.taken.size, bodies: r.bodies.length })),
      accounts: Object.keys(users).length, names: Object.keys(users).sort().slice(0, 1000), admins: [...ADMINS], db: dbInfo() });
    if (u === '/api/admin/errors' && req.method === 'GET') return json(res, 200, { errors: clientErrors.slice().reverse() });
    if (u === '/api/admin/errors/clear' && req.method === 'POST') { clientErrors.length = 0; return json(res, 200, { ok: true }); }
    const b = req.method === 'POST' ? await readBody(req) : {};
    if (u === '/api/admin/broadcast' && req.method === 'POST') { const text = cleanText(b.text); if (text) sendAll({ t: 'sys', text: 'Server: ' + text }); return json(res, 200, { ok: true }); }
    if (u === '/api/admin/endroom' && req.method === 'POST') { const r = rooms.get(String(b.id)); if (!r) return json(res, 404, { error: 'No such raid.' }); toRoom(r, { t: 'end' }); closeRoom(r); return json(res, 200, { ok: true }); }
    if (u === '/api/admin/kick' && req.method === 'POST') { const q = conns.get(String(b.id)); if (!q) return json(res, 404, { error: 'No such player.' }); sys(q, 'You were disconnected by an admin.'); setTimeout(() => q.ws.close(), 200); return json(res, 200, { ok: true }); }
    if (u === '/api/admin/season/next' && req.method === 'POST') { rollSeason(); return json(res, 200, { ok: true, season }); }
    if (u === '/api/admin/backup' && req.method === 'GET') { // ?format=sqlite streams a consistent copy of the database; otherwise one JSON document with everything
      const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
      if (/format=sqlite/.test(req.url)) { const tmp = path.join(DATA, `.backup-${process.pid}.sqlite`); db.copyTo(tmp); res.writeHead(200, { 'content-type': 'application/vnd.sqlite3', 'content-disposition': `attachment; filename="kolvik-${stamp}.sqlite"`, 'content-length': fs.statSync(tmp).size }); fs.createReadStream(tmp).on('close', () => fs.unlink(tmp, () => {})).pipe(res); return; }
      res.writeHead(200, { 'content-type': 'application/json', 'content-disposition': `attachment; filename="kolvik-backup-${stamp}.json"` }); return res.end(JSON.stringify(db.exportAll())); }
    if (u === '/api/admin/backup/info' && req.method === 'GET') return json(res, 200, dbInfo());
    if (u === '/api/admin/snapshot' && req.method === 'POST') { const f = snapshot(); return json(res, f ? 200 : 500, { ok: !!f, file: f && path.basename(f) }); }
    if (u === '/api/admin/world' && req.method === 'GET') return json(res, 200, { world });
    if (u === '/api/admin/restore' && req.method === 'POST') { // merges a JSON backup into the database: accounts and saves in the file replace the ones here
      let r; try { r = db.restore(b.backup); } catch (e) { return json(res, 400, { error: e.message }); }
      users = db.users(); tokens.clear(); for (const [n2, u2] of Object.entries(users)) if (u2.token) tokens.set(u2.token, n2);
      pvp = db.kv('pvp', {}); social = db.kv('social', {}); world = db.kv('world', {}) || {}; hall = db.kv('hall', []); dmCache.clear(); board = null;
      console.log(`backup restored by ${name}: ${r.users} accounts, ${r.saves} saves`); return json(res, 200, Object.assign({ ok: true }, r)); }
    if (u === '/api/admin/world' && req.method === 'POST') { world = cleanWorld(b.world); db.putKv('world', world); sendAll({ t: 'world', world }); console.log(`world config updated by ${name}`); return json(res, 200, { ok: true, world }); }
    if (u === '/api/admin/give' && req.method === 'POST') {
      // the account name, or the name someone is showing in game right now
      let who = String(b.name || '').trim().toLowerCase();
      if (!users[who]) { const q = [...conns.values()].find(c => c.account && String(c.name || '').toLowerCase() === who); if (q) who = q.account; }
      if (!users[who]) return json(res, 404, { error: `No account called "${String(b.name || '').slice(0, 30)}".` });
      const g = { cash: Math.max(-1e7, Math.min(1e7, b.cash | 0)), caches: Math.max(0, Math.min(500, b.caches | 0)), scrip: Math.max(0, Math.min(1e5, b.scrip | 0)), items: Array.isArray(b.items) ? b.items.slice(0, 20).map(x => [String(x[0]).slice(0, 20), x[1] | 0]) : [] };
      if (!g.cash && !g.caches && !g.scrip && !g.items.length) return json(res, 400, { error: 'Nothing to send.' });
      console.log(`admin ${name} → ${who}: ${JSON.stringify(g)}`);
      // online: their game adds it (it holds the live save and would overwrite a change made here)
      const online = [...conns.values()].filter(q => q.account === who);
      if (online.length) { for (const q of online) send(q, Object.assign({ t: 'grant' }, g)); return json(res, 200, { ok: true, account: who, delivered: 'online: it shows up in their game now' }); }
      const sv = readSave(who); if (!sv) return json(res, 404, { error: `${who} has never saved a game on this server.` });
      sv.cash = Math.max(0, (sv.cash || 0) + g.cash); if (sv.cos) { sv.cos.caches = (sv.cos.caches || 0) + g.caches; sv.cos.scrip = (sv.cos.scrip || 0) + g.scrip; }
      if (g.items.length) sv.grants = (Array.isArray(sv.grants) ? sv.grants : []).concat([{ items: g.items }]).slice(-20);
      writeSave(who, sv); return json(res, 200, { ok: true, account: who, cash: sv.cash, delivered: `offline: added to their save${g.items.length ? ' (items go into their stash when they next sign in)' : ''}. Balance now $${sv.cash.toLocaleString()}` });
    }
    return json(res, 404, { error: 'No such call.' });
  }
  if (u === '/api/load' && req.method === 'GET') return json(res, 200, { name, save: readSave(name) });
  if (u === '/api/save' && req.method === 'PUT') { const b = await readBody(req); if (!b || typeof b !== 'object' || b.v !== 2) return json(res, 400, { error: 'Bad save.' }); writeSave(name, b); return json(res, 200, { ok: true, at: Date.now() }); }
  if (u === '/api/logout' && req.method === 'POST') { const usr = users[name]; tokens.delete(usr.token); usr.token = crypto.randomBytes(24).toString('hex'); tokens.set(usr.token, name); saveUser(name); for (const p of conns.values()) if (p.account === name) { p.account = null; } return json(res, 200, { ok: true }); }
  json(res, 404, { error: 'No such call.' });
}

/* ---------------- players, lobbies, rooms, chat ---------------- */
const conns = new Map();   // player id -> player
const lobbies = new Map(); // lobby id -> lobby
const rooms = new Map();   // room id -> raid in progress
const globalChat = [];     // last 40 messages on the "everyone" channel
let nextRoom = 1, nextPlayer = 1, nextLobby = 1;

const send = (p, o) => { if (p.ws.readyState === 1) p.ws.send(JSON.stringify(o)); };
function sendAll(o, filter) { const s = JSON.stringify(o); for (const p of conns.values()) if ((!filter || filter(p)) && p.ws.readyState === 1) p.ws.send(s); }
function toRoom(r, o, except) { const s = JSON.stringify(o); for (const p of r.players.values()) if (p !== except && p.ws.readyState === 1) p.ws.send(s); }
const timeLeft = r => Math.max(0, Math.round(r.dur - (Date.now() - r.start) / 1000));
const cleanText = t => String(t || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200);
const cleanName = n => String(n || '').replace(/[^\w \-]/g, '').trim().slice(0, 14);

function lobbyInfo(l) { return { id: l.id, name: l.name, map: l.map, mode: l.mode || 'raid', diff: l.diff || 'normal', air: l.air == null ? 1 : l.air, state: l.state, players: l.members.size, max: MAX_PLAYERS, timeLeft: l.room ? timeLeft(l.room) : null }; }
function lobbyDetail(l) {
  return Object.assign(lobbyInfo(l), { owner: l.owner, members: [...l.members].map(([id, m]) => { const q = conns.get(id); return { id, name: q ? q.name : '?', guest: !(q && q.account), squad: q && q.squad ? q.squad.id : null, side: m.side || 0, ready: m.ready, inRaid: !!(q && l.room && q.room === l.room) }; }) });
}
let lobbyTimer = null;
function lobbiesChanged() {
  if (lobbyTimer) return;
  lobbyTimer = setTimeout(() => {
    lobbyTimer = null;
    sendAll({ t: 'lobbies', list: [...lobbies.values()].map(lobbyInfo) });
    for (const l of lobbies.values()) { const d = lobbyDetail(l); for (const id of l.members.keys()) { const q = conns.get(id); if (q) send(q, { t: 'lobby', lobby: d }); } }
  }, 40);
}
setInterval(() => { for (const l of lobbies.values()) if (l.room) return lobbiesChanged(); }, 10000);

// team maps: new members go to the smaller side, squadmates stay together
function pickSide(p, l) { if (!teamMode(l)) return 0; if (p.squad) for (const [id, m] of l.members) { const q = conns.get(id); if (q && q !== p && q.squad === p.squad && m.side) return m.side; } let a = 0, b = 0; for (const m of l.members.values()) { if (m.side === 1) a++; else if (m.side === 2) b++; } return a <= b ? 1 : 2; }
function joinLobby(p, l) { if (p.lobby && p.lobby !== l) leaveLobby(p); l.members.set(p.id, { ready: false, side: pickSide(p, l) }); p.lobby = l; lobbiesChanged(); touch(p); }
function leaveLobby(p) {
  const l = p.lobby; if (!l) return;
  p.lobby = null; l.members.delete(p.id); send(p, { t: 'lobby', lobby: null }); touch(p);
  if (l.owner === p.id) l.owner = l.members.keys().next().value || null;
  if (l.members.size === 0 && !l.room) lobbies.delete(l.id);
  lobbiesChanged();
}

function openRoom(l) {
  const r = { id: 'r' + nextRoom++, map: l.map, world: JSON.parse(JSON.stringify(world)), seed: (Math.random() * 1e9) | 0, start: Date.now(), dur: DUR[l.map] || 480, players: new Map(), hostId: null, taken: new Set(), puts: [], bodies: [], doors: new Set(), estate: null, joins: 0, groups: new Map(), events: [], diff: l.diff || 'normal', coop: COOP_MAPS.has(l.map), lobby: l };
  r.air = l.air == null ? 1 : l.air; r.teams = TEAM_MAPS.has(l.map); r.mode = l.mode || 'raid';
  if (DM_MODES[r.mode]) { r.dur = DM_MODES[r.mode].dur; r.teams = r.mode === 'tdm'; r.dm = { limit: DM_MODES[r.mode].limit, kills: {}, deaths: {}, names: {}, sides: {}, team: { 1: 0, 2: 0 }, over: false }; }
  r.timer = setTimeout(() => { if (r.dm && !r.dm.over) return dmEnd(r); toRoom(r, { t: 'end' }); closeRoom(r); }, r.dur * 1000 + 2000);
  rooms.set(r.id, r); console.log(`raid ${r.id} started on ${r.map} from lobby "${l.name}"`);
  return r;
}
function enterRoom(p, r) {
  if (p.room) leaveRoom(p); tradeEnd(p, 'went into a raid');
  p.room = r; p.lastRoom = r.id; p.st = null; r.players.set(p.id, p); if (!r.hostId) r.hostId = p.id;
  p.side = r.teams ? ((r.lobby && r.lobby.members.get(p.id) || {}).side || 1) : 0;
  // squads share an insertion point; everyone else gets the next free one
  const sq = p.squad ? p.squad.id : null; let slot, mate = 0;
  if (sq && r.groups.has(sq)) { const g = r.groups.get(sq); slot = g.slot; mate = ++g.n; } else { slot = r.joins++; if (sq) r.groups.set(sq, { slot, n: 0 }); }
  if (r.dm) { r.dm.names[p.id] = p.name; r.dm.sides[p.id] = p.side; }
  send(p, { t: 'launch', mode: r.mode, dmb: r.dm ? dmBoard(r) : undefined, id: p.id, seed: r.seed, world: r.world, cslot: Math.floor(r.start / COND_SLOT_MS), map: r.map, timeLeft: timeLeft(r), hostId: r.hostId, slot, mate, diff: r.diff, side: p.side, air: r.air, events: r.events, players: [...r.players.values()].map(q => ({ id: q.id, name: q.name, st: q.st, squad: q.squad ? q.squad.id : null, side: q.side || 0 })), taken: [...r.taken], puts: r.puts, bodies: r.bodies, doors: [...r.doors], estate: r.estate });
  toRoom(r, { t: 'pjoin', p: { id: p.id, name: p.name, squad: p.squad ? p.squad.id : null, side: p.side || 0 } }, p);
  if (r.dm) dmBroadcast(r);
  touch(p);
}
function sameSide(r, p, v) { if (r.mode === 'ffa') return false; if (r.mode === 'tdm') return !!p.side && p.side === v.side; return r.coop || (p.squad && v.squad === p.squad) || (p.side && v.side === p.side); }
function dmBoard(r) { const D = r.dm; return { mode: r.mode, limit: D.limit, team: D.team, over: D.over, rows: Object.keys(D.names).map(id => ({ id, name: D.names[id], side: D.sides[id] || 0, kills: D.kills[id] || 0, deaths: D.deaths[id] || 0, here: r.players.has(id) })) }; }
function dmBroadcast(r, feed) { toRoom(r, { t: 'dmscore', board: dmBoard(r), feed }); }
function dmDeath(r, p, k) {
  const D = r.dm; D.deaths[p.id] = (D.deaths[p.id] || 0) + 1; let scored = false;
  if (k && k !== p && !(r.mode === 'tdm' && k.side === p.side)) { D.kills[k.id] = (D.kills[k.id] || 0) + 1; if (r.mode === 'tdm' && k.side) D.team[k.side]++; scored = true; }
  dmBroadcast(r, { k: k && k !== p ? k.name : null, kid: k && k !== p ? k.id : null, v: p.name, vid: p.id, tk: !!(k && k !== p && !scored) });
  if (scored && (r.mode === 'tdm' ? D.team[k.side] >= D.limit : D.kills[k.id] >= D.limit)) dmEnd(r);
}
function dmEnd(r) {
  const D = r.dm; if (D.over) return; D.over = true; const b = dmBoard(r); let winner = null;
  if (r.mode === 'tdm') winner = D.team[1] > D.team[2] ? 1 : D.team[2] > D.team[1] ? 2 : 0;
  else { const top = b.rows.slice().sort((x, y) => y.kills - x.kills); winner = top.length && (top.length < 2 || top[0].kills > top[1].kills) ? top[0].id : null; }
  toRoom(r, { t: 'dmend', board: b, winner }); console.log(`${r.mode} ${r.id} over: ${JSON.stringify(D.team)} ${JSON.stringify(D.kills)}`);
  clearTimeout(r.timer); r.timer = setTimeout(() => { toRoom(r, { t: 'end' }); closeRoom(r); }, 7000);
}
function closeRoom(r) {
  clearTimeout(r.timer); rooms.delete(r.id);
  for (const q of r.players.values()) { q.room = null; q.st = null; touch(q); }
  r.players.clear();
  const l = r.lobby;
  if (l) { l.room = null; l.state = 'waiting'; for (const m of l.members.values()) m.ready = false; if (l.members.size === 0) lobbies.delete(l.id); }
  console.log(`raid ${r.id} closed`); lobbiesChanged();
}
function leaveRoom(p) {
  const r = p.room; if (!r) return;
  r.players.delete(p.id); p.room = null; p.st = null; touch(p);
  toRoom(r, { t: 'pleave', id: p.id }); if (r.dm && r.players.size) dmBroadcast(r);
  if (r.players.size === 0) return closeRoom(r);
  if (r.hostId === p.id) { r.hostId = r.players.keys().next().value; toRoom(r, { t: 'host', id: r.hostId }); }
  lobbiesChanged();
}

function limited(p) {
  const now = Date.now(); p.chatT = (p.chatT || []).filter(t => now - t < 5000);
  if (p.chatT.length >= 5) { send(p, { t: 'chat', ch: 'sys', text: 'Slow down: five messages per five seconds.', ts: now }); return true; }
  p.chatT.push(now); return false;
}
function chat(p, ch, text) {
  text = cleanText(text); if (!text || limited(p)) return;
  const m = { t: 'chat', ch, from: p.name, fromId: p.id, guest: !p.account, text, ts: Date.now() };
  if (ch === 'global') { globalChat.push(m); if (globalChat.length > 40) globalChat.shift(); sendAll(m, q => !q.room); }
  else if (ch === 'lobby' && p.lobby) { for (const id of p.lobby.members.keys()) { const q = conns.get(id); if (q && !q.room) send(q, m); } }
  else if (ch === 'raid' && p.room) toRoom(p.room, m);
  else if (ch === 'squad' && p.squad) { for (const id of p.squad.members) { const q = conns.get(id); if (q) send(q, m); } }
}
function bump(name, key) { if (!name) return; const s = pvp[name] = pvp[name] || { kills: 0, deaths: 0 }; s[key]++; pvpDirty = true; board = null; }

/* ---------------- friends, direct messages, squads ---------------- */
let social = db.kv('social', {});
let socialDirty = false;
setInterval(() => { if (socialDirty) { socialDirty = false; db.putKv('social', social); } }, 3000);
const soc = n => social[n] = social[n] || { friends: [], in: [], out: [], reads: {} };
const without = (arr, x) => arr.filter(v => v !== x);
const pairKey = (a, b) => a < b ? a + '__' + b : b + '__' + a;
const dmCache = new Map(); const dmDirty = new Set();
function dmLoad(a, b) { const k = pairKey(a, b); if (!dmCache.has(k)) dmCache.set(k, db.dm(k) || []); return dmCache.get(k); }
setInterval(() => { for (const k of dmDirty) db.putDm(k, dmCache.get(k)); dmDirty.clear(); }, 2000);
function connsOf(name) { const out = []; if (name) for (const q of conns.values()) if (q.account === name) out.push(q); return out; }
const fmtT = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
function presence(name) {
  const cs = connsOf(name); if (!cs.length) return { online: false, state: 'offline', status: 'Offline' };
  const q = cs.find(c => c.room) || cs.find(c => c.lobby) || cs[0];
  if (q.room) return { online: true, state: 'raid', status: `In raid · ${MAP_NAMES[q.room.map]} · ${fmtT(timeLeft(q.room))} left` };
  if (q.lobby) return { online: true, state: 'lobby', status: `In lobby · ${q.lobby.name}`, lobby: q.lobby.state === 'waiting' ? q.lobby.id : null };
  return { online: true, state: 'hideout', status: 'At the hideout' };
}
function unreadFrom(me, f) { const r = soc(me).reads[f] || 0; let n = 0; for (const m of dmLoad(me, f)) if (m.from === f && m.ts > r) n++; return n; }
function friendsPayload(name) {
  const s = soc(name);
  const friends = s.friends.map(f => Object.assign({ name: f, unread: unreadFrom(name, f) }, presence(f)))
    .sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name));
  return { t: 'friends', friends, incoming: s.in, outgoing: s.out };
}
function sendFriends(name) { const cs = connsOf(name); if (!cs.length) return; const pl = friendsPayload(name); for (const q of cs) send(q, pl); }
const presTouched = new Set(); let presTimer = null;
function presenceChanged(name) {
  if (!name) return; presTouched.add(name); if (presTimer) return;
  presTimer = setTimeout(() => { presTimer = null; const notify = new Set(); for (const n of presTouched) for (const f of soc(n).friends) notify.add(f); presTouched.clear(); for (const n of notify) sendFriends(n); }, 150);
}
setInterval(() => { for (const q of conns.values()) if (q.room && q.account) presenceChanged(q.account); }, 30000);
function makeFriends(a, b) {
  const A = soc(a), B = soc(b);
  A.in = without(A.in, b); A.out = without(A.out, b); B.in = without(B.in, a); B.out = without(B.out, a);
  if (!A.friends.includes(b)) A.friends.push(b); if (!B.friends.includes(a)) B.friends.push(a);
  socialDirty = true; sendFriends(a); sendFriends(b);
  for (const q of connsOf(a)) send(q, { t: 'note', text: `You and ${b} are now friends.` });
  for (const q of connsOf(b)) send(q, { t: 'note', text: `You and ${a} are now friends.` });
}

const squads = new Map(); let nextSquad = 1;
function squadDetail(sq) {
  return { id: sq.id, leader: sq.leader, members: [...sq.members].map(id => { const q = conns.get(id); return { id, name: q ? q.name : '?', account: q ? q.account : null, state: q ? (q.room ? 'raid' : q.lobby ? 'lobby' : 'hideout') : 'gone', map: q && q.room ? q.room.map : null, left: q && q.room ? timeLeft(q.room) : null, room: q && q.room ? q.room.id : null }; }) };
}
function squadSend(sq) { const d = squadDetail(sq); for (const id of sq.members) { const q = conns.get(id); if (q) send(q, { t: 'squad', squad: d }); } }
function squadTag(q) { if (q.room) toRoom(q.room, { t: 'psquad', id: q.id, squad: q.squad ? q.squad.id : null }); }
const sqTouched = new Set(); let sqTimer = null;
function touch(p) {
  presenceChanged(p.account);
  if (p.squad) { sqTouched.add(p.squad); if (!sqTimer) sqTimer = setTimeout(() => { sqTimer = null; for (const sq of sqTouched) if (squads.has(sq.id)) squadSend(sq); sqTouched.clear(); }, 100); }
}
function leaveSquad(p) {
  const sq = p.squad; if (!sq) return;
  sq.members.delete(p.id); p.squad = null; send(p, { t: 'squad', squad: null }); squadTag(p);
  if (sq.members.size <= 1) {
    for (const id of sq.members) { const q = conns.get(id); if (q) { q.squad = null; send(q, { t: 'squad', squad: null }); squadTag(q); send(q, { t: 'note', text: 'Your squad broke up.' }); } }
    squads.delete(sq.id);
  } else {
    if (sq.leader === p.id) sq.leader = sq.members.values().next().value;
    squadSend(sq); for (const id of sq.members) { const q = conns.get(id); if (q) send(q, { t: 'note', text: `${p.name} left the squad.` }); }
  }
  lobbiesChanged();
}
const isFollower = p => p.squad && p.squad.members.size > 1 && p.squad.leader !== p.id;
function followers(p) { if (!p.squad || p.squad.leader !== p.id) return []; return [...p.squad.members].filter(id => id !== p.id).map(id => conns.get(id)).filter(q => q && !q.room); }
const sys = (p, text) => send(p, { t: 'sys', text });
const uname = v => String(v || '').toLowerCase().trim().slice(0, 16);

/* ---------------- http + websocket ---------------- */
WS = require('./workshop.js')({ root: __dirname, enabled: WORKSHOP_ON, builder, getPage: () => page, userFor: authed, nameForToken: t => tokens.get(String(t || '')) || null, isAdmin, readBody, json });
if (WORKSHOP_ON) console.log('workshop on: /workshop (admins only)');
const server = http.createServer((req, res) => {
  const u = (req.url || '/').split('?')[0];
  if (u === '/' || u === '/index.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' }); return res.end(page); }
  if (u === '/api/ping') return json(res, 200, { ok: true, accounts: true, lobbies: lobbies.size, online: conns.size, season });
  if (u === '/vendor/three.min.js') { res.writeHead(200, { 'content-type': 'application/javascript', 'cache-control': 'public, max-age=86400' }); return fs.createReadStream(THREE).pipe(res); }
  if (u === '/healthz') { res.writeHead(200); return res.end('ok'); }
  if (u === '/item-tests.js') { if (!isAdmin(authed(req))) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, { 'content-type': 'application/javascript', 'cache-control': 'no-store' }); return fs.createReadStream(TESTS_JS).pipe(res); }
  if (u === '/debug.js') { if (!isAdmin(authed(req))) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, { 'content-type': 'application/javascript', 'cache-control': 'no-store' }); return fs.createReadStream(DEBUG_JS).on('error', () => res.end()).pipe(res); }
  if (WS.handle(req, res, u)) return;
  if (u.startsWith('/api/')) return api(req, res, u).catch(() => json(res, 400, { error: 'Bad request.' }));
  res.writeHead(404); res.end('not found');
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 256 * 1024 });
wss.on('connection', ws => {
  const p = { id: 'p' + nextPlayer++, name: 'Nomad', account: null, ws, room: null, lobby: null, st: null };
  conns.set(p.id, p);
  ws.on('message', data => {
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    switch (m.t) {
      case 'hello': {
        const acct = tokens.get(String(m.token || '')) || null;
        if (p.account !== acct) { const old = p.account; leaveSquad(p); p.account = acct; presenceChanged(old); }
        p.name = acct || cleanName(m.name) || 'Nomad';
        send(p, { t: 'hello', id: p.id, name: p.name, account: acct, admin: isAdmin(acct), world, chat: globalChat, list: [...lobbies.values()].map(lobbyInfo), season, hall: hall[0] || null });
        if (acct) { send(p, friendsPayload(acct)); presenceChanged(acct); }
        if (p.squad) squadSend(p.squad);
        if (p.lobby) { lobbiesChanged(); send(p, { t: 'lobby', lobby: lobbyDetail(p.lobby) }); }
        return;
      }
      case 'lcreate': {
        if (p.room) return;
        if (isFollower(p)) return sys(p, 'Your squad leader picks the lobby.');
        if (lobbies.size >= 100) return send(p, { t: 'sys', text: 'Too many lobbies are open right now.' });
        const l = { id: 'l' + nextLobby++, name: cleanText(m.name).slice(0, 32) || `${p.name}'s raid`, map: DUR[m.map] ? m.map : 'kolvik', diff: DIFFS.has(m.diff) ? m.diff : 'normal', owner: p.id, members: new Map(), state: 'waiting', room: null };
        lobbies.set(l.id, l); joinLobby(p, l); for (const f of followers(p)) joinLobby(f, l); return;
      }
      case 'ljoin': {
        const l = lobbies.get(m.id);
        if (!l) return send(p, { t: 'sys', text: 'That lobby is gone.' });
        if (l.state !== 'waiting') return send(p, { t: 'sys', text: 'That raid has already started.' });
        if (l.banned && l.banned.has(p.account || p.id)) return sys(p, 'The leader of that lobby removed you, so you cannot rejoin it.');
        if (isFollower(p)) return sys(p, 'Your squad leader picks the lobby.');
        const fl = followers(p).filter(f => f.lobby !== l);
        if (l.members.size + 1 + fl.length > MAX_PLAYERS) return send(p, { t: 'sys', text: fl.length ? 'Not enough room in that lobby for your squad.' : 'That lobby is full.' });
        joinLobby(p, l); for (const f of fl) joinLobby(f, l); return;
      }
      case 'lleave': { const l = p.lobby; if (l && !p.room) for (const f of followers(p)) if (f.lobby === l) leaveLobby(f); return leaveLobby(p); }
      case 'lkick': { const l = p.lobby; if (!l || l.owner !== p.id) return; const q = conns.get(m.id); if (!q || q === p || q.lobby !== l) return;
        if (q.room && l.room === q.room) return sys(p, `${q.name} is in the raid; you can kick them once they're back.`);
        (l.banned = l.banned || new Set()).add(q.account || q.id); leaveLobby(q); sys(q, `${p.name} removed you from the lobby.`); sys(p, `${q.name} was removed from the lobby.`); return; }
      case 'lready': { const l = p.lobby; if (l && l.state === 'waiting') { const me = l.members.get(p.id); if (me) { me.ready = !!m.ready; lobbiesChanged(); } } return; }
      case 'ldiff': { const l = p.lobby; if (l && l.owner === p.id && l.state === 'waiting' && DIFFS.has(m.diff)) { l.diff = m.diff; lobbiesChanged(); } return; }
      case 'lmode': { const l = p.lobby; const mode = DM_MODES[m.mode] ? m.mode : 'raid'; if (l && l.owner === p.id && l.state === 'waiting') { l.mode = mode; if (mode !== 'raid' && !DM_MAPS.has(l.map)) l.map = 'ironfjord'; for (const x of l.members.values()) x.side = 0; if (teamMode(l)) for (const id of l.members.keys()) { const q = conns.get(id); if (q) l.members.get(id).side = pickSide(q, l); } lobbiesChanged(); } return; }
      case 'lmap': { const l = p.lobby; if (l && l.owner === p.id && l.state === 'waiting' && DUR[m.map] && (!l.mode || l.mode === 'raid' || DM_MAPS.has(m.map))) { l.map = m.map; for (const x of l.members.values()) x.side = 0; if (teamMode(l)) for (const id of l.members.keys()) { const q = conns.get(id); if (q) l.members.get(id).side = pickSide(q, l); } lobbiesChanged(); } return; }
      case 'lside': { const l = p.lobby; if (l && l.state === 'waiting' && teamMode(l)) { const me = l.members.get(p.id); if (me) { me.side = me.side === 1 ? 2 : 1; lobbiesChanged(); } } return; }
      case 'lair': { const l = p.lobby; if (l && l.owner === p.id && l.state === 'waiting' && [0, 1, 2].includes(m.air)) { l.air = m.air; lobbiesChanged(); } return; }
      case 'lstart': {
        const l = p.lobby; if (!l || l.owner !== p.id || l.state !== 'waiting') return;
        if (![...l.members.values()].every(x => x.ready)) return send(p, { t: 'sys', text: 'Not everyone is ready.' });
        if (DM_MODES[l.mode] && l.members.size < 2) return sys(p, `${DM_MODES[l.mode].name} needs at least two players.`);
        if (PVP_MAPS.has(l.map) && !DM_MODES[l.mode]) { const sides = new Set([...l.members.keys()].map(id => { const q = conns.get(id); return q && q.squad ? 's' + q.squad.id : id; })); if (sides.size < 2) return send(p, { t: 'sys', text: `${MAP_NAMES[l.map]} is PvP only: it needs at least two players who are not in the same squad.` }); }
        const r = openRoom(l); l.room = r; l.state = 'raid';
        for (const id of l.members.keys()) { const q = conns.get(id); if (q) enterRoom(q, r); }
        return lobbiesChanged();
      }
      case 'ljoinraid': {
        const l = lobbies.get(m.id);
        if (!l || !l.room) return send(p, { t: 'sys', text: 'That raid has ended.' });
        if (timeLeft(l.room) < 90) return send(p, { t: 'sys', text: 'Too little time left in that raid.' });
        if (l.room.map === 'holdout') return sys(p, 'Last Light cannot be joined once the waves have started.');
        if (l.banned && l.banned.has(p.account || p.id)) return sys(p, 'The leader of that lobby removed you, so you cannot rejoin it.');
        if (isFollower(p)) return sys(p, 'Your squad leader picks the lobby.');
        const fl = followers(p);
        if (l.room.players.size + 1 + fl.length > MAX_PLAYERS) return send(p, { t: 'sys', text: 'That raid is full.' });
        joinLobby(p, l); enterRoom(p, l.room); for (const f of fl) { joinLobby(f, l); enterRoom(f, l.room); } return lobbiesChanged();
      }
      case 'leaveRaid': case 'leave': return leaveRoom(p);
      case 'chat': return chat(p, m.ch, m.text);

      case 'fadd': {
        if (!p.account) return sys(p, 'Sign in to add friends.');
        const n = uname(m.name), me = p.account;
        if (!n) return; if (n === me) return sys(p, "That's you.");
        if (!users[n]) return sys(p, `Nobody here is called ${n}.`);
        const a = soc(me), b = soc(n);
        if (a.friends.includes(n)) return sys(p, `You and ${n} are already friends.`);
        if (a.friends.length >= 100) return sys(p, 'Your friend list is full.');
        if (a.in.includes(n)) return makeFriends(me, n);
        if (!a.out.includes(n)) a.out.push(n); if (!b.in.includes(me)) b.in.push(me);
        socialDirty = true; sendFriends(me); sendFriends(n); sys(p, `Friend request sent to ${n}.`);
        for (const q of connsOf(n)) send(q, { t: 'note', text: `${me} sent you a friend request.`, kind: 'freq' });
        return;
      }
      case 'faccept': { const n = uname(m.name); if (p.account && soc(p.account).in.includes(n)) makeFriends(p.account, n); return; }
      case 'fdecline': case 'fcancel': {
        if (!p.account) return; const n = uname(m.name), a = soc(p.account), b = soc(n);
        if (m.t === 'fdecline') { a.in = without(a.in, n); b.out = without(b.out, p.account); } else { a.out = without(a.out, n); b.in = without(b.in, p.account); }
        socialDirty = true; sendFriends(p.account); sendFriends(n); return;
      }
      case 'fremove': {
        if (!p.account) return; const n = uname(m.name), a = soc(p.account), b = soc(n);
        a.friends = without(a.friends, n); b.friends = without(b.friends, p.account); socialDirty = true; sendFriends(p.account); sendFriends(n); return;
      }
      case 'dm': {
        if (!p.account) return sys(p, 'Sign in to message friends.');
        const to = uname(m.to); if (!soc(p.account).friends.includes(to)) return sys(p, to ? `${to} isn't on your friend list.` : 'Who is that for?');
        const text = cleanText(m.text); if (!text || limited(p)) return;
        const msg = { from: p.account, to, text, ts: Date.now() };
        const arr = dmLoad(p.account, to); arr.push(msg); if (arr.length > 200) arr.splice(0, arr.length - 200); dmDirty.add(pairKey(p.account, to));
        const out = Object.assign({ t: 'dm' }, msg);
        for (const q of connsOf(to)) send(q, out); for (const q of connsOf(p.account)) send(q, out);
        sendFriends(to); return;
      }
      case 'dmhist': { if (!p.account) return; const w = uname(m.with); if (soc(p.account).friends.includes(w)) send(p, { t: 'dmhist', with: w, msgs: dmLoad(p.account, w).slice(-100) }); return; }
      case 'dmread': { if (!p.account) return; const w = uname(m.with); soc(p.account).reads[w] = Date.now(); socialDirty = true; sendFriends(p.account); return; }

      // rec-room party rounds (43-recroom.js): the squad leader starts one, everyone in the squad who isn't in a raid plays it
      case 'mgparty': {
        const sq = p.squad; if (!sq || sq.leader !== p.id) return sys(p, 'Only the squad leader can start a party round.');
        const game = String(m.game || ''); if (!MG_SECS[game]) return;
        if (sq.mg && Date.now() < sq.mg.ends) return sys(p, 'A party round is already running.');
        const ids = [...sq.members].filter(id => { const q = conns.get(id); return q && !q.room; }); if (ids.length < 2) return sys(p, 'Nobody else in your squad is free right now.');
        const mg = { id: 'm' + (nextMg++), game, seed: (Math.random() * 2147483647) | 0, ends: Date.now() + 4000 + MG_SECS[game] * 1000 + 15000, players: ids, names: {}, scores: {}, final: new Set() };
        for (const id of ids) mg.names[id] = conns.get(id).name;
        sq.mg = mg; mg.timer = setTimeout(() => mgFinish(sq, mg), mg.ends - Date.now());
        const players = ids.map(id => ({ id, name: mg.names[id] }));
        for (const id of ids) send(conns.get(id), { t: 'mgstart', id: mg.id, game, seed: mg.seed, in: 4000, players });
        return;
      }
      case 'mgscore': {
        const sq = p.squad, mg = sq && sq.mg; if (!mg || mg.id !== m.id || !mg.players.includes(p.id)) return;
        const sc = Math.max(0, Math.min(99999, Math.round(+m.score || 0))); mg.scores[p.id] = sc; if (m.final) mg.final.add(p.id);
        for (const id of mg.players) { const q = conns.get(id); if (q && q !== p) send(q, { t: 'mgscore', id: mg.id, pid: p.id, score: sc, final: !!m.final }); }
        if (mg.players.every(id => mg.final.has(id) || !conns.get(id) || conns.get(id).squad !== sq)) mgFinish(sq, mg);
        return;
      }
      case 'trreq': {
        if (!p.account) return sys(p, 'Sign in to trade.'); const n = uname(m.name);
        if (!soc(p.account).friends.includes(n)) return sys(p, 'You can only trade with friends.');
        if (p.room) return sys(p, 'Finish your raid first.'); if (p.trade) return sys(p, 'You are already trading.');
        const t = connsOf(n).find(q => !q.room); if (!t) return sys(p, `${n} isn't at the hideout right now.`);
        if (t.trade) return sys(p, `${n} is busy with another trade.`);
        t.trq = t.trq || new Map(); t.trq.set(p.account, { pid: p.id, at: Date.now() });
        send(t, { t: 'trreq', from: p.account }); sys(p, `Trade request sent to ${n}.`); return;
      }
      case 'trdecline': { const from = uname(m.from); if (p.trq) p.trq.delete(from); for (const q of connsOf(from)) sys(q, `${p.account || p.name} declined your trade.`); return; }
      case 'tracc': {
        const from = uname(m.from); const rq = p.trq && p.trq.get(from); if (p.trq) p.trq.delete(from);
        if (!rq || Date.now() - rq.at > 120000) return sys(p, 'That trade request has expired.');
        const a = conns.get(rq.pid); if (!a || a.account !== from || a.room) return sys(p, `${from} isn't at the hideout any more.`);
        if (a.trade || p.trade || p.room) return sys(p, 'One of you is already trading.');
        const T = { id: 't' + (nextTrade++), a, b: p, offer: { [a.id]: { cash: 0, items: [] }, [p.id]: { cash: 0, items: [] } }, ok: {}, ver: 0 };
        trades.set(T.id, T); a.trade = p.trade = T; tradeSend(T); return;
      }
      case 'troffer': { const T = p.trade; if (!T || T.id !== m.id) return; T.offer[p.id] = cleanOffer(m); T.ver++; T.ok = {}; tradeSend(T); return; }
      case 'trok': {
        const T = p.trade; if (!T || T.id !== m.id || m.ver !== T.ver) return; T.ok[p.id] = !!m.ok;
        if (T.ok[T.a.id] && T.ok[T.b.id]) {
          trades.delete(T.id); T.a.trade = T.b.trade = null;
          for (const [q, o] of [[T.a, T.b], [T.b, T.a]]) send(q, { t: 'trdone', id: T.id, with: o.account, give: T.offer[q.id], get: T.offer[o.id] });
          console.log(`trade ${T.id}: ${T.a.account} gave $${T.offer[T.a.id].cash} + ${T.offer[T.a.id].items.length} items, ${T.b.account} gave $${T.offer[T.b.id].cash} + ${T.offer[T.b.id].items.length} items`);
        } else tradeSend(T);
        return;
      }
      case 'trcancel': return tradeEnd(p, 'cancelled the trade');
      case 'sinvite': {
        if (!p.account) return sys(p, 'Sign in to form a squad.');
        const n = uname(m.name); if (!soc(p.account).friends.includes(n)) return sys(p, 'You can only invite friends.');
        const ts = connsOf(n); if (!ts.length) return sys(p, `${n} is offline.`);
        if (p.squad && p.squad.members.size >= SQUAD_MAX) return sys(p, `Your squad is full (${SQUAD_MAX}).`);
        const t = ts.find(q => !q.room) || ts[0];
        if (p.squad && t.squad === p.squad) return sys(p, `${n} is already in your squad.`);
        t.invites = t.invites || new Map(); t.invites.set(p.account, { pid: p.id, at: Date.now() });
        send(t, { t: 'sinvite', from: p.account }); sys(p, `Squad invite sent to ${n}.`); return;
      }
      case 'saccept': {
        const from = uname(m.from); const inv = p.invites && p.invites.get(from);
        if (!inv || Date.now() - inv.at > 180000) return sys(p, 'That invite has expired.');
        p.invites.delete(from);
        const host = conns.get(inv.pid); if (!host || host.account !== from) return sys(p, `${from} went offline.`);
        let sq = host.squad;
        if (sq && sq === p.squad) return;
        if (sq && sq.members.size >= SQUAD_MAX) return sys(p, 'That squad is full.');
        leaveSquad(p);
        if (!sq) { sq = { id: 's' + nextSquad++, leader: host.id, members: new Set([host.id]) }; squads.set(sq.id, sq); host.squad = sq; squadTag(host); }
        sq.members.add(p.id); p.squad = sq; squadTag(p);
        const leader = conns.get(sq.leader);
        if (leader && leader.lobby && !p.room && leader.lobby.state === 'waiting' && p.lobby !== leader.lobby && leader.lobby.members.size < MAX_PLAYERS) joinLobby(p, leader.lobby);
        squadSend(sq); lobbiesChanged();
        for (const id of sq.members) { const q = conns.get(id); if (q && q !== p) send(q, { t: 'note', text: `${p.name} joined the squad.` }); }
        return;
      }
      case 'sdecline': { const from = uname(m.from); if (p.invites) p.invites.delete(from); for (const q of connsOf(from)) sys(q, `${p.name} declined your squad invite.`); return; }
      case 'sleave': return leaveSquad(p);
      case 'skick': { const sq = p.squad; if (!sq || sq.leader !== p.id) return; const q = conns.get(m.id);
        if (q && q.squad === sq && q !== p) { leaveSquad(q); sys(q, 'The squad leader removed you from the squad.'); sys(p, `${q.name} was removed from the squad.`); }
        else if (!q && sq.members.has(m.id)) { sq.members.delete(m.id); squadSend(sq); }
        return; }
      case 'sdisband': { const sq = p.squad; if (!sq || sq.leader !== p.id) return; for (const id of [...sq.members]) { const q = conns.get(id); if (q && q !== p) { leaveSquad(q); sys(q, `${p.name} disbanded the squad.`); } } leaveSquad(p); return; }
      case 'spromote': { const sq = p.squad; if (!sq || sq.leader !== p.id || !sq.members.has(m.id)) return; sq.leader = m.id; squadSend(sq); lobbiesChanged(); return; }
    }
    const r = p.room; if (!r) return;
    switch (m.t) {
      case 'state': p.st = m; m.id = p.id; toRoom(r, m, p); break;
      case 'take': if (r.taken.has(m.uid)) send(p, { t: 'deny', uid: m.uid }); else { r.taken.add(m.uid); toRoom(r, { t: 'take', cid: m.cid, uid: m.uid, from: p.id }, p); } break;
      case 'put': if (m.item && typeof m.item === 'object') { r.puts.push({ cid: m.cid, item: m.item }); toRoom(r, { t: 'put', cid: m.cid, item: m.item, from: p.id }, p); } break;
      case 'body': if (Array.isArray(m.items) && m.items.length <= 60) { r.bodies.push({ cid: m.cid, x: m.x, z: m.z, name: m.name, items: m.items }); toRoom(r, { t: 'body', cid: m.cid, x: m.x, z: m.z, name: m.name, items: m.items }, p); } break;
      case 'phit': { const v = r.players.get(m.pid); if (v && !sameSide(r, p, v)) send(v, { t: 'phit', part: m.part, ammo: m.ammo, from: p.id }); break; }
      case 'eshot': { const v = r.players.get(m.pid); if (v && p.id === r.hostId) send(v, { t: 'eshot', hits: m.hits, dmg: m.dmg, pen: m.pen, name: m.name, x: Number.isFinite(m.x) ? m.x : undefined, z: Number.isFinite(m.z) ? m.z : undefined, gun: typeof m.gun === 'string' ? m.gun.slice(0, 24) : undefined }); break; }
      case 'pdhit': { const v = r.players.get(m.pid); if (v && v !== p) send(v, { t: 'pdhit', dmg: Math.min(200, +m.dmg || 0), from: p.id }); break; }
      case 'pshot': case 'nade': case 'arrow': case 'tdspawn': case 'tdbuild': case 'tdrepair': case 'tdend': toRoom(r, Object.assign({}, m, { from: p.id }), p); break;
      case 'spot': case 'sig': for (const q of r.players.values()) if (q !== p && sameSide(r, p, q) && (p.squad && q.squad === p.squad || r.mode === 'tdm' || r.coop)) send(q, Object.assign({}, m, { from: p.id })); break;
      case 'ehit': case 'shot': case 'dhit': { const h = r.players.get(r.hostId); if (h && h !== p) send(h, Object.assign({}, m, { from: p.id })); break; }
      case 'estate': if (p.id === r.hostId) { r.estate = { e: m.e, ap: m.ap, dr: m.dr }; toRoom(r, m, p); } break;
      case 'pdmg': { const v = r.players.get(m.pid); if (v && v !== p && (!sameSide(r, p, v) || (m.ai && p.id === r.hostId))) send(v, { t: 'pdmg', i: m.i | 0, dmg: Math.min(5000, +m.dmg || 0), from: m.ai ? null : p.id }); break; }
      case 'adm': { const h = r.players.get(r.hostId); if (h && h !== p) send(h, { t: 'adm', i: m.i | 0, dmg: Math.min(5000, +m.dmg || 0), from: p.id }); break; }
      case 'pev': if (['dead', 'dmg', 'boom'].includes(m.k)) toRoom(r, { t: 'pev', k: m.k, i: m.i | 0, dmg: Math.min(5000, +m.dmg || 0), by: m.by ? String(m.by) : null, x: +m.x || 0, y: +m.y || 0, z: +m.z || 0 }, p); break;
      case 'msg': toRoom(r, { t: 'msg', text: String(m.text || '').slice(0, 120) }, p); break;
      case 'runover': { const v = r.players.get(m.pid); if (v && v !== p && !sameSide(r, p, v)) send(v, { t: 'runover', dmg: Math.min(400, +m.dmg || 0), from: p.id }); break; }
      // a locked room someone opened stays open for everyone, including players who join later
      case 'door': if (typeof m.id === 'string' && m.id.length < 32 && r.doors.size < 40) { r.doors.add(m.id); toRoom(r, { t: 'door', id: m.id }, p); } break;
      // squad-only: going down, being looted while down, revives
      case 'dbox': if ((p.squad || r.coop || p.side) && Array.isArray(m.items) && m.items.length <= 80) for (const q of r.players.values()) if (q !== p && (r.coop || q.squad === p.squad)) send(q, { t: 'dbox', cid: 'd' + p.id, x: +m.x || 0, z: +m.z || 0, name: p.name, items: m.items, from: p.id }); break;
      case 'dboxgone': toRoom(r, { t: 'dboxgone', cid: 'd' + p.id }, p); break;
      case 'reviving': case 'revive': { const v = r.players.get(m.pid); if (v && v !== p) send(v, { t: m.t, on: !!m.on, from: p.id }); break; }
      // boss fight events come from whoever runs the AI; lasting ones are kept for players who join late
      case 'boss': if (p.id === r.hostId && typeof m.k === 'string') { const ev = { t: 'boss', k: m.k, x: +m.x || 0, z: +m.z || 0, p: m.p | 0, d: +m.d || 0, list: Array.isArray(m.list) ? m.list.slice(0, 16) : undefined }; if (ev.k !== 'mortar' && r.events.length < 40) r.events.push(ev); toRoom(r, ev, p); } break;
      case 'kcredit': { const v = r.players.get(m.pid); if (v && p.id === r.hostId) send(v, { t: 'kcredit', i: m.i, kind: m.kind, head: !!m.head, w: m.w }); break; }
      case 'pdied': { const k = conns.get(m.by); if (k && k !== p && (k.room === r || k.lastRoom === r.id)) { bump(k.account, 'kills'); bump(p.account, 'deaths'); } if (r.dm && !r.dm.over) dmDeath(r, p, k && k.room === r ? k : null); break; }
    }
  });
  const gone = () => { if (!conns.has(p.id)) return; tradeEnd(p, 'went offline'); leaveRoom(p); leaveLobby(p); leaveSquad(p); conns.delete(p.id); presenceChanged(p.account); };
  ws.on('close', gone); ws.on('error', gone);
});

server.listen(PORT, () => console.log(`Kolvik Station listening on http://0.0.0.0:${PORT}`));
