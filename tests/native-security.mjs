import assert from 'node:assert/strict';
import { createServer } from 'node:http';

// Runs in the app runner's existing isolated WebDriver session.
export async function checkSecurity(execute) {
  const origin = await execute('return location.href');
  assert.match(origin, /^(tauri:\/\/localhost|https?:\/\/tauri\.localhost)/,
    'Security checks require embedded assets, not a development server');
  const requests = [];
  const fixture = createServer(async (request, response) => {
    try {
      let body = '';
      for await (const chunk of request) {
        body += chunk;
        assert(body.length < 16384);
      }
      const query = JSON.parse(body);
      requests.push(query);
      assert.equal(query.action, 'governance_proposals');
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ proposals: [], cursor: query.cursor == null ? 'next-page' : null }));
    } catch {
      response.writeHead(400).end();
    }
  });
  await new Promise((resolve, reject) => {
    fixture.once('error', reject);
    fixture.listen(0, '127.0.0.1', resolve);
  });
  try {
    const result = await execute(`
      const rpcUrl = arguments[0], done = arguments[arguments.length - 1];
      (async () => {
        const violations = [];
        const onViolation = event => violations.push(event.effectiveDirective);
        document.addEventListener('securitypolicyviolation', onViolation);
        const injected = document.createElement('script');
        injected.textContent = 'window.__burstUnexpectedInline = true';
        document.body.append(injected);
        const positioned = document.createElement('div');
        positioned.style.width = '17px';
        document.body.append(positioned);
        let blockedFetch = false;
        try { await fetch('https://example.invalid/burst-csp-probe'); } catch { blockedFetch = true; }
        const invoke = window.__TAURI_INTERNALS__.invoke;
        const ipc = {
          first: await invoke('get_governance_proposals', { rpcUrl, cursor: null }),
          next: await invoke('get_governance_proposals', { rpcUrl, cursor: 'next-page' }),
        };
        await new Promise(resolve => setTimeout(resolve, 100));
        const result = { violations, blockedFetch, inlineRan: !!window.__burstUnexpectedInline, ipc,
          font: getComputedStyle(document.body).fontFamily,
          inlineStyles: getComputedStyle(positioned).width === '17px',
          styled: [...document.styleSheets].some(sheet => !!sheet.href) };
        injected.remove();
        positioned.remove();
        document.removeEventListener('securitypolicyviolation', onViolation);
        delete window.__burstUnexpectedInline;
        return result;
      })().then(done, error => done({ error: String(error) }));
    `, [`http://127.0.0.1:${fixture.address().port}`], true);
    assert(!result.error, result.error);
    assert.equal(result.inlineRan, false);
    assert.equal(result.blockedFetch, true);
    assert(result.violations.some(value => value.startsWith('script-src')), 'Inline script must be blocked by CSP');
    assert(result.violations.includes('connect-src'), 'Network request must be blocked by CSP');
    assert(result.styled, 'Bundled stylesheet must load');
    assert(result.inlineStyles, 'Component positioning styles must remain usable');
    assert.deepEqual(result.ipc.first, { proposals: [], cursor: 'next-page' });
    assert.deepEqual(result.ipc.next, { proposals: [], cursor: null });
    assert.deepEqual(requests.map(query => query.cursor), [null, 'next-page']);
    console.log('PASS embedded assets, CSP, styles and native IPC');
  } finally {
    fixture.closeAllConnections();
    await new Promise(done => fixture.close(done));
  }
}
