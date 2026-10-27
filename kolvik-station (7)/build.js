#!/usr/bin/env node
/* Builds game.html from src/.
   src/index.html is the page shell; <!-- @css --> is replaced by src/css/*.css and <!-- @js --> by src/js/*.js,
   each set concatenated in filename order (that's why the JS files have number prefixes: order matters, since
   everything shares one script scope). Run `node build.js` after editing anything in src/, or run the server
   with DEV=1 and it rebuilds whenever a source file changes.

   Every build also checks the scripts and records where each file landed in the page (build.info):
   - errors: a syntax error in a file, with its file and line (the page is still written, so you see what you get)
   - warnings: two functions with the same name in different files. JavaScript allows that silently and the later
     one replaces the earlier one everywhere, which is how the supply-drop plane got the aircraft builder by mistake
   - map: [{file, start, lines}] with the page line each JS file starts on, so an error at game.html line N can be
     reported as the source file and line (the workshop uses this) */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, 'src'), OUT = path.join(__dirname, 'game.html');
const info = { map: [], errors: [], warnings: [], at: 0 };

const list = (dir, ext) => fs.readdirSync(dir).filter(f => f.endsWith(ext)).sort();
const read = (dir, f) => fs.readFileSync(path.join(dir, f), 'utf8').replace(/\s+$/, '');
const lineCount = s => (s.match(/\n/g) || []).length + 1;

function check(jsDir, files, texts) {
  const errors = [], warnings = [], seen = new Map();
  files.forEach((f, i) => {
    try { new vm.Script(texts[i], { filename: 'src/js/' + f }); }
    catch (e) { const m = /:(\d+)\n/.exec(e.stack || ''); errors.push({ file: 'src/js/' + f, line: m ? +m[1] : null, message: e.message }); }
    const re = /^function\s+([A-Za-z_$][\w$]*)/gm; let m;
    while ((m = re.exec(texts[i]))) { const name = m[1], line = lineCount(texts[i].slice(0, m.index));
      if (seen.has(name)) { const p = seen.get(name); warnings.push({ file: 'src/js/' + f, line, message: `function ${name}() is also defined in ${p.file} line ${p.line}; this one replaces it everywhere` }); }
      else seen.set(name, { file: 'src/js/' + f, line }); }
  });
  return { errors, warnings };
}
function build() {
  const shell = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  const cssDir = path.join(SRC, 'css'), jsDir = path.join(SRC, 'js');
  const css = list(cssDir, '.css').map(f => read(cssDir, f)).join('\n\n');
  const files = list(jsDir, '.js'), texts = files.map(f => read(jsDir, f)), js = texts.join('\n\n');
  const withCss = shell.replace('<!-- @css -->', () => css);
  const page = withCss.replace('<!-- @js -->', () => js);
  // the line the scripts start on, then each file follows the previous one after a blank line
  let line = lineCount(withCss.slice(0, withCss.indexOf('<!-- @js -->')));
  info.map = files.map((f, i) => { const e = { file: 'src/js/' + f, start: line, lines: lineCount(texts[i]) }; line += e.lines + 1; return e; });
  Object.assign(info, check(jsDir, files, texts), { at: Date.now() });
  // the files share one scope, so also parse them together: that catches two files declaring the same const/let,
  // which stops the whole game from loading even though each file is fine on its own
  if (!info.errors.length) { try { new vm.Script(js, { filename: 'game.js' }); } catch (e) {
    const m = /game\.js:(\d+)/.exec(e.stack || ''); const at = m ? locate(+m[1] + info.map[0].start - 1) : null;
    const name = (/Identifier '([^']+)'/.exec(e.message) || [])[1]; let first = null;
    if (name) for (let i = 0; i < files.length && !first; i++) { const r = new RegExp(`(?:const|let|var|function|class)\\s+${name.replace(/\$/g, '\\$')}\\b|[,{]\\s*${name.replace(/\$/g, '\\$')}\\s*=`); const mm = r.exec(texts[i]); if (mm) first = { file: 'src/js/' + files[i], line: lineCount(texts[i].slice(0, mm.index)) }; }
    info.errors.push({ file: at ? at.file : 'src/js', line: at ? at.line : null, message: e.message + (first && at && first.file !== at.file ? ` (first declared in ${first.file} line ${first.line})` : '') }); } }
  fs.writeFileSync(OUT, page);
  return page;
}
// game.html line → source file and line
function locate(pageLine) { for (const e of info.map) if (pageLine >= e.start && pageLine < e.start + e.lines) return { file: e.file, line: pageLine - e.start + 1 }; return null; }
function sourceFiles() {
  const out = [path.join(SRC, 'index.html')];
  for (const sub of ['css', 'js']) for (const f of fs.readdirSync(path.join(SRC, sub))) out.push(path.join(SRC, sub, f));
  return out;
}
module.exports = { build, sourceFiles, locate, info, SRC, OUT };
if (require.main === module) {
  const page = build();
  console.log(`built game.html (${(page.length / 1024).toFixed(0)} KB) from ${sourceFiles().length} source files`);
  for (const w of info.warnings) console.log(`warning: ${w.file}:${w.line} ${w.message}`);
  for (const e of info.errors) console.log(`ERROR: ${e.file}:${e.line} ${e.message}`);
  if (info.errors.length) process.exitCode = 1;
}
