/* Kolvik Workshop, server side. Switched on by WORKSHOP=1 (or DEV=1); otherwise every route here is a 404.
   Pages:   /workshop          the workshop (workshop/index.html)
            /workshop-frame    the game page with the game switched off and the preview runtime added
   Events:  /workshop/events   server-sent events: 'build' after src/ is rebuilt (with syntax errors and warnings),
                               'file' when a file changes on disk (so edits from your own editor show up too)
   API (admins only, Authorization: Bearer <token>):
            GET    /api/workshop/files                list of scenes and source files
            GET    /api/workshop/file?path=...        read one
            PUT    /api/workshop/file  {path,text,base}  write one (base = the mtime you loaded; 409 if it changed since)
            DELETE /api/workshop/file?path=...        delete a scene
            GET    /api/workshop/map                  where each src/js file sits in the built page (for error lines)
   Only src/js/*.js, src/css/*.css, src/index.html and workshop/scenes/*.js can be read or written. */
const fs = require('fs'), path = require('path');

module.exports = function workshop({ root, enabled, builder, getPage, userFor, nameForToken, isAdmin, readBody, json }) {
  const DIR = path.join(root, 'workshop'), SCENES = path.join(DIR, 'scenes');
  const ORBIT = path.join(root, 'node_modules', 'three', 'examples', 'js', 'controls', 'OrbitControls.js');
  const ALLOWED = [/^src\/js\/[\w.-]+\.js$/, /^src\/css\/[\w.-]+\.css$/, /^src\/index\.html$/, /^workshop\/scenes\/[\w.-]+\.js$/];
  const clients = new Set();
  const rel = f => path.relative(root, f).split(path.sep).join('/');
  const safe = p => { p = String(p || '').replace(/\\/g, '/'); return ALLOWED.some(r => r.test(p)) && !p.includes('..') ? path.join(root, p) : null; };
  const mtime = f => { try { return fs.statSync(f).mtimeMs; } catch (e) { return 0; } };
  function send(ev, data) { const s = `event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`; for (const c of clients) { try { c.write(s); } catch (e) { clients.delete(c); } } }

  // the scenes folder: report new, changed and deleted scenes
  const sceneSeen = new Map();
  function scanScenes(quiet) {
    let names = []; try { names = fs.readdirSync(SCENES).filter(f => f.endsWith('.js')); } catch (e) {}
    for (const n of names) { const f = path.join(SCENES, n), m = mtime(f); if (sceneSeen.get(n) !== m) { const fresh = !sceneSeen.has(n); sceneSeen.set(n, m); if (!quiet) send('file', { path: 'workshop/scenes/' + n, mtime: m, added: fresh }); } }
    for (const n of [...sceneSeen.keys()]) if (!names.includes(n)) { sceneSeen.delete(n); if (!quiet) send('file', { path: 'workshop/scenes/' + n, deleted: true }); }
  }
  if (enabled) { scanScenes(true); setInterval(() => { if (clients.size) scanScenes(false); else scanScenes(true); }, 700); setInterval(() => send('ping', {}), 25000); }

  // called by the server's watcher after it rebuilt game.html
  function built(file) {
    if (!enabled || !builder) return; const i = builder.info;
    send('build', { ok: !i.errors.length, errors: i.errors, warnings: i.warnings, at: i.at, file: file ? rel(file) : null, mtime: file ? mtime(file) : 0 });
  }
  function framePage() {
    const early = '<script>window.KOLVIK_WORKSHOP=true;window.__kwErrs=[];addEventListener("error",function(e){__kwErrs.push({message:e.message,line:e.lineno,col:e.colno,file:e.filename,stack:String(e.error&&e.error.stack||"")})});</script>';
    return getPage().replace('<body>', '<body>' + early).replace(/<\/body><\/html>$/, '<script src="vendor/OrbitControls.js"></script><script src="workshop/runtime.js"></script></body></html>');
  }
  function sceneTitle(text) { const m = /^\s*\/\/\s*(.+)/.exec(text); return m ? m[1].trim() : null; }
  function files() {
    const scenes = []; try { for (const n of fs.readdirSync(SCENES).filter(f => f.endsWith('.js')).sort()) { const f = path.join(SCENES, n), t = fs.readFileSync(f, 'utf8'); scenes.push({ path: 'workshop/scenes/' + n, name: n, title: sceneTitle(t) || n, mtime: mtime(f), size: t.length }); } } catch (e) {}
    const src = []; for (const [sub, ext] of [['js', '.js'], ['css', '.css']]) { try { for (const n of fs.readdirSync(path.join(root, 'src', sub)).filter(f => f.endsWith(ext)).sort()) src.push({ path: `src/${sub}/${n}`, mtime: mtime(path.join(root, 'src', sub, n)) }); } catch (e) {} }
    if (fs.existsSync(path.join(root, 'src', 'index.html'))) src.push({ path: 'src/index.html', mtime: mtime(path.join(root, 'src', 'index.html')) });
    return { scenes, src, build: builder ? { errors: builder.info.errors, warnings: builder.info.warnings, at: builder.info.at } : null, sourceBuild: !!builder };
  }
  const sendFile = (res, f, type) => fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' }); res.end(b); });

  async function apiCall(req, res, u) {
    const who = userFor(req); if (!isAdmin(who)) return json(res, 403, { error: 'The workshop is for admins: sign in to the game as an account listed in ADMINS.' });
    const q = new URL(req.url, 'http://x').searchParams;
    if (u === '/api/workshop/files' && req.method === 'GET') return json(res, 200, files());
    if (u === '/api/workshop/map' && req.method === 'GET') return json(res, 200, { map: builder ? builder.info.map : [] });
    if (u === '/api/workshop/file') {
      if (req.method === 'GET') { const f = safe(q.get('path')); if (!f) return json(res, 400, { error: 'That file is not part of the workshop.' }); try { return json(res, 200, { path: rel(f), text: fs.readFileSync(f, 'utf8'), mtime: mtime(f) }); } catch (e) { return json(res, 404, { error: 'No such file.' }); } }
      if (req.method === 'PUT') {
        const b = await readBody(req); const f = safe(b.path); if (!f) return json(res, 400, { error: 'That file is not part of the workshop.' });
        if (typeof b.text !== 'string') return json(res, 400, { error: 'No text.' });
        const cur = mtime(f); if (b.base && cur && Math.abs(cur - b.base) > 1 && !b.force) { let text = ''; try { text = fs.readFileSync(f, 'utf8'); } catch (e) {} return json(res, 409, { error: 'The file changed on disk since you opened it.', mtime: cur, text }); }
        try { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, b.text); }
        catch (e) { return json(res, 500, { error: `Could not write ${rel(f)} (${e.code || e.message}). In Docker, run with the workshop override so src/ and workshop/ are your own folders (see README).` }); }
        console.log(`workshop: ${who} saved ${rel(f)}`); if (f.startsWith(SCENES)) scanScenes(false);
        return json(res, 200, { ok: true, path: rel(f), mtime: mtime(f) });
      }
      if (req.method === 'DELETE') { const f = safe(q.get('path')); if (!f || !f.startsWith(SCENES)) return json(res, 400, { error: 'Only scenes can be deleted from the workshop.' }); try { fs.unlinkSync(f); } catch (e) {} console.log(`workshop: ${who} deleted ${rel(f)}`); scanScenes(false); return json(res, 200, { ok: true }); }
    }
    return json(res, 404, { error: 'Unknown workshop call.' });
  }

  // returns true when it handled the request
  function handle(req, res, u) {
    if (!(u === '/workshop' || u === '/workshop/' || u === '/workshop-frame' || u.startsWith('/workshop/') || u.startsWith('/api/workshop/') || u === '/vendor/OrbitControls.js')) return false;
    if (!enabled) { res.writeHead(404); res.end('not found'); return true; }
    if (u === '/workshop' || u === '/workshop/') { if (u === '/workshop/') { res.writeHead(301, { location: '../workshop' }); res.end(); return true; } sendFile(res, path.join(DIR, 'index.html'), 'text/html; charset=utf-8'); return true; }
    if (u === '/workshop-frame') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(framePage()); return true; }
    if (u === '/workshop/runtime.js') { sendFile(res, path.join(DIR, 'runtime.js'), 'application/javascript'); return true; }
    if (u === '/vendor/OrbitControls.js') { sendFile(res, ORBIT, 'application/javascript'); return true; }
    if (u === '/workshop/events') {
      const t = new URL(req.url, 'http://x').searchParams.get('t'); if (!isAdmin(nameForToken(t))) { res.writeHead(403); res.end(); return true; }
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
      res.write('retry: 2000\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return true;
    }
    if (u.startsWith('/api/workshop/')) { apiCall(req, res, u).catch(e => json(res, 400, { error: e.message || 'Bad request.' })); return true; }
    res.writeHead(404); res.end('not found'); return true;
  }
  return { handle, built, enabled };
};
