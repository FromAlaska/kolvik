#!/usr/bin/env node
/* Runs item-tests.js against a running Kolvik Station server in a headless browser and prints what fails.

     node tests/run-item-tests.js [url] [--quick] [--only=akr,ifak] [--json=report.json]

   url defaults to http://localhost:8080/ (use your own port, e.g. http://localhost:8090/).
   Default is the full run (hideout + a solo test raid); --quick skips the raid.
   Exit code 0 when nothing fails (warnings are fine), 1 when something fails, 2 when the run itself broke.

   Needs Playwright, which is not part of the server image:
     npm install --no-save playwright && npx playwright install chromium
   The tests file is injected straight from this folder, so no admin login is needed. */
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const url = args.find(a => !a.startsWith('--')) || 'http://localhost:8080/';
const quick = args.includes('--quick');
const only = (args.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const jsonOut = (args.find(a => a.startsWith('--json=')) || '').slice(7);

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  console.error('Playwright is not installed. Run:\n  npm install --no-save playwright && npx playwright install chromium'); process.exit(2);
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const errors = [];
  try {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    page.on('pageerror', e => errors.push(String(e && e.message || e)));
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof ITEMS === 'object' && typeof S === 'object' && S, null, { timeout: 30000 });
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, '..', 'item-tests.js'), 'utf8') });
    page.on('console', m => { if (process.stdout.isTTY && m.type() === 'log' && /^progress /.test(m.text())) process.stdout.write('\r' + m.text().slice(9).padEnd(30)); });
    const rep = await page.evaluate(async o => {
      return KolvikItemTests.run({ raid: o.raid, noRender: true, only: o.only.length ? o.only : null, progress: t => console.log('progress ' + t) });
    }, { raid: !quick, only });
    if (process.stdout.isTTY) process.stdout.write('\r'.padEnd(32) + '\r');
    const txt = await page.evaluate(r => KolvikItemTests.text(r), rep);
    console.log(txt);
    if (errors.length) console.log(`\nUncaught page errors during the run (${errors.length}):\n` + [...new Set(errors)].map(e => '  ' + e).join('\n'));
    if (jsonOut) { fs.writeFileSync(jsonOut, JSON.stringify(Object.assign(rep, { pageErrors: errors }), null, 1)); console.log(`\nFull report written to ${jsonOut}`); }
    await browser.close();
    process.exit(rep.summary.failed ? 1 : 0);
  } catch (e) {
    console.error('The test run broke: ' + (e && e.message || e)); if (errors.length) console.error(errors.join('\n'));
    await browser.close(); process.exit(2);
  }
})();
