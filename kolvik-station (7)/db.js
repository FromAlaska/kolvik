/* Kolvik Station storage: one SQLite file, kolvik.sqlite in the data directory.
   Uses Node's built-in node:sqlite (Node 22.13 or newer), so there is nothing to compile or install.
   Tables: users (accounts), saves (one JSON save per account), dms (one JSON thread per pair of friends) and kv
   (everything else: pvp counts, season, hall of fame, social graph, world tuning). Values are JSON documents, which
   keeps the server code the same shape it had with the JSON files.
   The first start with an old data directory imports users.json, saves/*.json and the rest, then moves those files
   into migrated-json/ so nothing is lost. */
const fs = require('fs'), path = require('path');
const { DatabaseSync } = require('node:sqlite');

function open(DATA) {
  fs.mkdirSync(DATA, { recursive: true });
  const file = path.join(DATA, 'kolvik.sqlite');
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;
    CREATE TABLE IF NOT EXISTS users(name TEXT PRIMARY KEY, json TEXT NOT NULL, updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS saves(name TEXT PRIMARY KEY, json TEXT NOT NULL, updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS dms(pair TEXT PRIMARY KEY, json TEXT NOT NULL, updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS kv(key TEXT PRIMARY KEY, json TEXT NOT NULL, updated INTEGER NOT NULL);`);
  const st = {
    getUsers: db.prepare('SELECT name, json FROM users'), putUser: db.prepare('INSERT INTO users(name,json,updated) VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET json=excluded.json, updated=excluded.updated'),
    delUser: db.prepare('DELETE FROM users WHERE name=?'),
    getSave: db.prepare('SELECT json FROM saves WHERE name=?'), putSave: db.prepare('INSERT INTO saves(name,json,updated) VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET json=excluded.json, updated=excluded.updated'),
    allSaves: db.prepare('SELECT name, json FROM saves'), delSave: db.prepare('DELETE FROM saves WHERE name=?'),
    getDm: db.prepare('SELECT json FROM dms WHERE pair=?'), putDm: db.prepare('INSERT INTO dms(pair,json,updated) VALUES(?,?,?) ON CONFLICT(pair) DO UPDATE SET json=excluded.json, updated=excluded.updated'),
    allDms: db.prepare('SELECT pair, json FROM dms'),
    getKv: db.prepare('SELECT json FROM kv WHERE key=?'), putKv: db.prepare('INSERT INTO kv(key,json,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET json=excluded.json, updated=excluded.updated'),
    allKv: db.prepare('SELECT key, json FROM kv'),
    counts: db.prepare('SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM saves) AS saves, (SELECT count(*) FROM dms) AS dms'),
  };
  const now = () => Date.now();
  const api = {
    file,
    users() { const o = {}; for (const r of st.getUsers.all()) o[r.name] = JSON.parse(r.json); return o; },
    putUser(name, u) { st.putUser.run(name, JSON.stringify(u), now()); },
    delUser(name) { st.delUser.run(name); },
    save(name) { const r = st.getSave.get(name); return r ? JSON.parse(r.json) : null; },
    putSave(name, s) { st.putSave.run(name, JSON.stringify(s), now()); },
    delSave(name) { st.delSave.run(name); },
    saves() { const o = {}; for (const r of st.allSaves.all()) o[r.name] = JSON.parse(r.json); return o; },
    dm(pair) { const r = st.getDm.get(pair); return r ? JSON.parse(r.json) : null; },
    putDm(pair, arr) { st.putDm.run(pair, JSON.stringify(arr), now()); },
    dms() { const o = {}; for (const r of st.allDms.all()) o[r.pair] = JSON.parse(r.json); return o; },
    kv(key, dflt) { const r = st.getKv.get(key); return r ? JSON.parse(r.json) : dflt; },
    putKv(key, v) { st.putKv.run(key, JSON.stringify(v), now()); },
    kvs() { const o = {}; for (const r of st.allKv.all()) o[r.key] = JSON.parse(r.json); return o; },
    counts() { return st.counts.get(); },
    transaction(fn) { db.exec('BEGIN'); try { fn(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } },
    // a consistent copy of the whole database as a file (VACUUM INTO works while the server keeps running)
    copyTo(dest) { try { fs.unlinkSync(dest); } catch (e) {} db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`); return dest; },
    // everything as one JSON document (what the admin panel's backup button downloads; restore() takes it back)
    exportAll() { return { format: 'kolvik-backup', v: 1, at: new Date().toISOString(), users: api.users(), saves: api.saves(), dms: api.dms(), kv: api.kvs() }; },
    restore(doc) {
      if (!doc || doc.format !== 'kolvik-backup') throw new Error('not a Kolvik backup');
      api.transaction(() => {
        for (const [n, u] of Object.entries(doc.users || {})) api.putUser(n, u);
        for (const [n, s] of Object.entries(doc.saves || {})) api.putSave(n, s);
        for (const [p, d] of Object.entries(doc.dms || {})) api.putDm(p, d);
        for (const [k, v] of Object.entries(doc.kv || {})) api.putKv(k, v);
      });
      return { users: Object.keys(doc.users || {}).length, saves: Object.keys(doc.saves || {}).length };
    },
    close() { db.close(); },
  };
  migrateJson(api, DATA);
  return api;
}

// one-time import of the JSON files an older version kept in the data directory
function migrateJson(api, DATA) {
  const rd = f => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch (e) { return null; } };
  const users = rd('users.json'); if (!users) return;
  const n = { users: 0, saves: 0, dms: 0 };
  api.transaction(() => {
    for (const [name, u] of Object.entries(users)) { api.putUser(name, u); n.users++; }
    const sd = path.join(DATA, 'saves'); if (fs.existsSync(sd)) for (const f of fs.readdirSync(sd)) if (f.endsWith('.json')) { const s = rd(path.join('saves', f)); if (s) { api.putSave(f.slice(0, -5), s); n.saves++; } }
    const dd = path.join(DATA, 'dms'); if (fs.existsSync(dd)) for (const f of fs.readdirSync(dd)) if (f.endsWith('.json')) { const d = rd(path.join('dms', f)); if (d) { api.putDm(f.slice(0, -5), d); n.dms++; } }
    for (const [key, f] of [['pvp', 'pvp.json'], ['season', 'season.json'], ['hall', 'halloffame.json'], ['world', 'world.json'], ['social', 'social.json']]) { const v = rd(f); if (v != null) api.putKv(key, v); }
  });
  const dest = path.join(DATA, 'migrated-json'); fs.mkdirSync(dest, { recursive: true });
  for (const f of ['users.json', 'saves', 'dms', 'pvp.json', 'season.json', 'halloffame.json', 'world.json', 'social.json']) { const p = path.join(DATA, f); if (fs.existsSync(p)) fs.renameSync(p, path.join(dest, f)); }
  console.log(`imported the old JSON data into kolvik.sqlite: ${n.users} accounts, ${n.saves} saves, ${n.dms} message threads (the files were moved to migrated-json/)`);
}

module.exports = { open };
