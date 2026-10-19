// Run with the Vite dev server on :1420. These are UI contract tests, not native IPC tests.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseUrl = process.env.NODE_GUI_URL || 'http://127.0.0.1:1420/';
let browser;
before(async () => {
  browser = process.env.BROWSER_ENGINE === 'webkit'
    ? await webkit.launch({ headless: true })
    : await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
});
after(async () => { await browser?.close(); });

test('node identity is not repeated in the page header or overview navigation', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(new URL('/peers',baseUrl).href);
    await page.getByRole('heading',{name:'Peers',exact:true}).waitFor();
    for (const width of [1200,800,760,320]) {
      await page.setViewportSize({width,height:750});
      assert.equal(await page.locator('[data-burst-icon="node"]:visible').count(),1,'node branding at '+width);
      assert.equal(await page.locator('.mobile-brand').isVisible(),width <= 760);
      assert.equal(await page.locator('.brand-lockup').isVisible(),width > 760);
    }
    await page.setViewportSize({width:1200,height:800});
    await page.screenshot({path:'/tmp/burst-node-header.png'});
  } finally {await page.close();}
});

test('metrics and chart share card geometry without a resizing SVG skin', async () => {
  const page = await browser.newPage();
  try {
    await page.addInitScript(() => {
      window.isTauri = true;
      window.__TAURI_INTERNALS__ = {invoke: async command => {
        if (command === 'get_protocol_params') return {brn_rate:'0',trst_expiry_secs:31536000};
        if (command === 'get_telemetry') return {network:'test',block_count:42,account_count:2,peer_count:1,protocol_version:1,uptime_secs:120,verified_count:1,unverified_count:1,trst_circulating:'0',trst_expired_total:'0',trst_revoked_total:'0',ntp_offset_ms:0};
        throw new Error('Unexpected fixture command: '+command);
      }};
    });
    await page.goto(baseUrl);
    await page.getByText('42',{exact:true}).waitFor();
    for (const dark of [false,true]) {
      await page.evaluate(dark => document.documentElement.classList.toggle('dark',dark),dark);
      const surfaces = await page.locator('.metric-group, [aria-label="Node activity"]').evaluateAll(elements => elements.map(el => {
        const style=getComputedStyle(el);
        return {radius:style.borderRadius,border:style.borderTopWidth,shadow:style.boxShadow};
      }));
      assert.equal(surfaces.length,3);
      for (const surface of surfaces) {
        assert.deepEqual(surface,surfaces[0]);
        assert.equal(surface.radius,'16px');
        assert.equal(surface.border,'0px');
        assert.notEqual(surface.shadow,'none');
      }
    }
    assert.equal(await page.locator('.surface-skin').count(),0);
    await page.emulateMedia({forcedColors:'active'});
    assert.equal(await page.locator('[aria-label="Node activity"]').evaluate(el => getComputedStyle(el).outlineStyle),'solid');
  } finally {await page.close();}
});

test('overview separates labels from values and puts secondary readings in an accessible disclosure', async () => {
  const page = await browser.newPage({viewport:{width:1200,height:1000}});
  page.setDefaultTimeout(5000);
  try {
    await page.clock.install();
    await page.addInitScript(() => {
      window.isTauri=true;window.telemetryTicks=0;
      window.__TAURI_INTERNALS__={invoke:async command => {
        if(command === 'get_protocol_params') return {brn_rate:'277777777777777',trst_expiry_secs:Number(18446744073709551615n)};
        if(command === 'get_telemetry') return {network:'test',block_count:1,account_count:1,peer_count:0,protocol_version:1,uptime_secs:8160 + window.telemetryTicks++,verified_count:1,unverified_count:0,trst_circulating:'0',trst_expired_total:'0',trst_revoked_total:'0',ntp_offset_ms:-841};
        throw new Error('Unexpected fixture command: '+command);
      }};
    });
    await page.goto(baseUrl);
    await page.getByRole('heading',{name:'Your node is isolated',exact:true}).waitFor();
    assert.equal(await page.getByText('No peers connected',{exact:true}).count(),0);
    assert.equal(await page.locator('.metric-group:visible').count(),1);
    assert.equal(await page.locator('.metric-group .metric-row').count(),8);
    assert.ok((await page.locator('.overview-summary').boundingBox()).height <= 98,'compact summary, not four rows of details');
    const rows=await page.locator('.overview-summary .metric-row').evaluateAll(rows=>rows.map(row=>{
      const style=getComputedStyle(row),label=row.querySelector('dt'),value=row.querySelector('dd');return {height:row.getBoundingClientRect().height,left:style.borderLeftWidth,gap:value.getBoundingClientRect().top-label.getBoundingClientRect().bottom,labelSize:getComputedStyle(label).fontSize,valueSize:getComputedStyle(value).fontSize,labelColor:getComputedStyle(label).color,valueColor:getComputedStyle(value).color};
    }));
    for(const [index,row] of rows.entries()) {assert.ok(row.height <= 98);assert.equal(row.left,index > 0 ? '1px' : '0px');assert.equal(row.gap,6);assert.equal(row.labelSize,'14px');assert.equal(row.valueSize,'24px');assert.notEqual(row.labelColor,row.valueColor);}
    assert.ok((await page.locator('[aria-label="Node activity"]').boundingBox()).height <= 184,'compact chart');
    assert.equal(await page.getByText('1 verified',{exact:true}).count(),0);
    assert.equal(await page.locator('.metric-group [data-burst-icon]').count(),2);
    assert.equal(await page.getByText('0 expired',{exact:true}).count(),0);
    assert.equal(await page.getByText('0 revoked',{exact:true}).count(),0);
    assert.equal(await page.getByText('No expiry',{exact:true}).isVisible(),false);
    await page.clock.fastForward(5100);
    await page.locator('.recharts-surface').waitFor();
    for(const theme of ['light','dark']) {
      if(await page.evaluate(() => document.body.classList.contains('dark')) !== (theme === 'dark')) await page.getByRole('button',{name:theme === 'dark' ? 'Use dark appearance' : 'Use light appearance'}).click();
      await page.waitForFunction(() => !document.documentElement.classList.contains('theme-switching'));
      await page.screenshot({path:'/tmp/burst-node-grouped-'+theme+'.png'});
    }
    await page.locator('.overview-details > summary').focus();
    await page.keyboard.press('Enter');
    await page.getByText('No expiry',{exact:true}).waitFor();
    await page.getByText('-841 ms',{exact:true}).waitFor();
    await page.getByText('Acceptable',{exact:true}).waitFor();
    for(const icon of await page.locator('.metric-group [data-burst-icon]').all()) {
      const size=await icon.boundingBox();assert.equal(size.width,28);assert.equal(size.height,28);
    }
    await page.screenshot({path:'/tmp/burst-node-details-dark.png'});
    await page.getByRole('button',{name:'BRN',exact:true}).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('tooltip').filter({hasText:'BRN earned per second by each verified wallet.'}).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Accounts',exact:true}).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('tooltip').filter({hasText:'1 verified · 0 unverified'}).waitFor();
    await page.keyboard.press('Escape');
    await page.locator('#main-content').focus();
    for(const width of [800,500,320]) {
      await page.setViewportSize({width,height:800});
      assert.equal(await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth),true,'overflow at '+width);
      assert.equal(await page.locator('.metric-group .metric-row').count(),8);
      const values=await page.locator('.overview-detail-values dd').evaluateAll(values=>values.map(value=>value.getBoundingClientRect().left));
      assert.ok(values.every(left=>left === values[0]),'details share a value alignment rail at '+width);
      const labels=await page.locator('.overview-summary .metric-row').evaluateAll(rows=>rows.map(row=>({label:row.querySelector('dt').getBoundingClientRect().bottom,value:row.querySelector('dd').getBoundingClientRect().top})));
      assert.ok(labels.every(row=>row.value-row.label === 6),'clear label/value separation at '+width);
    }
    await page.screenshot({path:'/tmp/burst-node-details-mobile.png'});
    await page.locator('.overview-details > summary').click();
    await page.locator('.overview-summary').scrollIntoViewIfNeeded();
    await page.screenshot({path:'/tmp/burst-node-grouped-mobile.png'});
  } finally {await page.close();}
});

test('compact token groups retain finite expiry and nonzero expired and revoked amounts', async () => {
  const page=await browser.newPage();
  try {
    await page.addInitScript(() => {
      window.isTauri=true;
      window.__TAURI_INTERNALS__={invoke:async command => {
        if(command === 'get_protocol_params') return {brn_rate:'277777777777777',trst_expiry_secs:86400};
        if(command === 'get_telemetry') return {network:'test',block_count:1,account_count:1,peer_count:0,protocol_version:1,uptime_secs:8160,verified_count:1,unverified_count:0,trst_circulating:'3000000000000000000',trst_expired_total:'2000000000000000000',trst_revoked_total:'1000000000000000000',ntp_offset_ms:0};
        throw new Error('Unexpected fixture command: '+command);
      }};
    });
    await page.goto(baseUrl);
    await page.getByText('2 expired TRST',{exact:true}).waitFor();
    await page.getByText('1 revoked TRST',{exact:true}).waitFor();
    assert.equal(await page.locator('.overview-details').getAttribute('open'),null);
    await page.locator('.overview-details > summary').click();
    await page.getByText('Expiry 1 day',{exact:true}).waitFor();
    await page.getByText('2 expired',{exact:true}).waitFor();
    await page.getByText('1 revoked',{exact:true}).waitFor();
    assert.match(await page.locator('.metric-row').filter({has:page.locator('[data-burst-icon="trst"]')}).innerText(),/Active TRST:\s*3/);
  } finally {await page.close();}
});

test('overview keeps clock problems visible and long readings contained while details are closed', async () => {
  const page=await browser.newPage({viewport:{width:320,height:800}});
  page.setDefaultTimeout(5000);
  try {
    await page.addInitScript(() => {
      window.isTauri=true;
      window.__TAURI_INTERNALS__={invoke:async command => {
        if(command === 'get_protocol_params') return {brn_rate:'277777777777777',trst_expiry_secs:86400};
        if(command === 'get_telemetry') return {network:'test',block_count:1234567890123,account_count:9876543210,peer_count:250,protocol_version:1,uptime_secs:86400000,verified_count:9876543210,unverified_count:0,trst_circulating:'3000000000000000000',trst_expired_total:'0',trst_revoked_total:'0',ntp_offset_ms:2501};
        throw new Error('Unexpected fixture command: '+command);
      }};
    });
    await page.goto(baseUrl);
    await page.getByText('Clock offset 2501 ms — Poor synchronization',{exact:true}).waitFor();
    assert.equal(await page.locator('.overview-details').getAttribute('open'),null);
    for(const width of [320,500,800,1200]) {
      await page.setViewportSize({width,height:900});
      const cells=await page.locator('.overview-summary .metric-row').evaluateAll(rows=>rows.map(row=>({cell:row.getBoundingClientRect().right,value:row.querySelector('dd').getBoundingClientRect().right})));
      assert.ok(cells.every(row=>row.value <= row.cell),'large readings contained at '+width);
      assert.equal(await page.locator('main').evaluate(el=>el.scrollWidth <= el.clientWidth),true);
    }
    await page.setViewportSize({width:320,height:800});
    await page.locator('.overview-details > summary').click();
    await page.getByText('Poor',{exact:true}).waitFor();
    assert.equal(await page.locator('main').evaluate(el=>el.scrollWidth <= el.clientWidth),true);
  } finally {await page.close();}
});

test('verification uses aligned compact activity, keeps all counts and supports lookup and help', async () => {
  const page=await browser.newPage({viewport:{width:1200,height:900}});
  page.setDefaultTimeout(5000);
  try {
    await page.addInitScript(() => {
      window.isTauri=true;window.lookups=[];
      window.__TAURI_INTERNALS__={invoke:async(command,args) => {
        if(command === 'get_verification_activity') return {active_verifications:2,pending_endorsements:3,active_challenges:4,verifier_pool_size:5,total_verified:10,total_revoked:1,recent_verifications:[{account:'brst_'+ 'a'.repeat(60),result:'verified',verifier_count:5,timestamp:1700000000}],recent_endorsements:[{endorser:'brst_'+ 'b'.repeat(60),target:'brst_'+ 'a'.repeat(60),amount:'1000000000000000000',timestamp:1700000000}],recent_challenges:[{challenger:'brst_'+ 'c'.repeat(60),target:'brst_'+ 'a'.repeat(60),stake:'2000000000000000000',status:'active',timestamp:1700000000}]};
        if(command === 'get_account_verification') {
          window.lookups.push(args.account);
          if(args.account === 'missing') throw new Error('Account not found');
          return {account:args.account,state:'verified',challenge_active:false,endorsement_count:3,endorsement_threshold:3,verified_at:1700000000,verifier_votes:[],endorsers:[],selection_available:args.account === 'brst_unknown' ? null : args.account === 'brst_available'};
        }
        throw new Error('Unexpected fixture command: '+command);
      }};
    });
    await page.goto(new URL('/verification',baseUrl).href);
    await page.getByRole('table').waitFor();
    assert.deepEqual(await page.locator('[aria-label="Verification summary"] dd').allTextContents(),['10','1','2','3','4','5']);
    assert.equal(await page.locator('[aria-label="Verification summary"] .metric-rows').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length),2);
    const help=page.locator('.context-help');
    assert.equal(await help.getAttribute('open'),null);
    await help.locator('summary').focus();await page.keyboard.press('Enter');
    await page.getByText(/Endorsers permanently burn BRN/).waitFor();
    await page.keyboard.press('Enter');
    for(const theme of ['light','dark']) {
      if(await page.evaluate(() => document.body.classList.contains('dark')) !== (theme === 'dark')) await page.getByRole('button',{name:theme === 'dark' ? 'Use dark appearance' : 'Use light appearance'}).click();
      await page.waitForFunction(() => !document.documentElement.classList.contains('theme-switching'));
      await page.locator('#main-content').focus();
      await page.screenshot({path:'/tmp/burst-verification-refined-'+theme+'.png'});
    }
    for(const width of [1200,800,320]) {
      await page.setViewportSize({width,height:900});
      for(const name of ['Verifications','Endorsements','Challenges']) {
        const tab=page.getByRole('tab',{name,exact:true});
        await tab.click();
        assert.ok((await tab.boundingBox()).height >= 44);
        await page.getByRole('table').waitFor();
        assert.equal(await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth),true,name+' at '+width);
        if(width === 320) assert.equal(await page.getByRole('table').evaluate(el => el.scrollWidth <= el.clientWidth),true,'table overflow: '+name);
      }
    }
    await page.getByRole('tab',{name:'Verifications',exact:true}).click();
    await page.getByRole('tab',{name:'Verifications',exact:true}).evaluate(el => {if(el.getAttribute('aria-selected') !== 'true') throw new Error('Tab did not activate');});
    await page.locator('#main-content').focus();
    await page.screenshot({path:'/tmp/burst-verification-refined-mobile.png'});
    const input=page.getByRole('textbox',{name:'Account address'});
    await page.getByText('Account lookup',{exact:true}).click();
    assert.equal(await input.evaluate(el => el === document.activeElement),true);
    await input.fill('brst_fixture');await input.press('Enter');
    await page.getByText('brst_fixture',{exact:true}).waitFor();
    assert.deepEqual(await page.evaluate(() => window.lookups),['brst_fixture']);
    await page.getByText('Verifier selection is paused on this node.',{exact:true}).waitFor();
    await input.fill('brst_unknown');await input.press('Enter');
    await page.getByText("This node hasn't reported verifier-selection availability.",{exact:true}).waitFor();
    await input.fill('brst_available');await input.press('Enter');
    await page.getByText('brst_available',{exact:true}).waitFor();
    assert.equal(await page.locator('.verification-lookup [role="status"]').count(),0);
    await input.fill('missing');await input.press('Enter');
    await page.getByText('Verification lookup failed. Account not found',{exact:true}).waitFor();
  } finally {await page.close();}
});

test('peer guidance is a plain disclosure and explorer has no detached empty-state icons', async () => {
  const page=await browser.newPage({viewport:{width:1200,height:850}});
  try {
    await page.addInitScript(() => {
      window.isTauri=true;
      window.__TAURI_INTERNALS__={invoke:async command => {
        if(command === 'get_peers') return {peers:[],count:0};
        throw new Error('Synthetic lookup unavailable');
      }};
    });
    await page.goto(new URL('/peers',baseUrl).href);
    const help=page.locator('.context-help');
    assert.equal(await help.getAttribute('open'),null);
    const style=await help.evaluate(el => {const s=getComputedStyle(el);return [s.borderLeftWidth,s.boxShadow,s.backgroundColor];});
    assert.deepEqual(style,['0px','none','rgba(0, 0, 0, 0)']);
    await help.locator('summary').focus();await page.keyboard.press('Enter');
    await page.getByText('BRN = rate × (now − verified_at) − total_burned',{exact:true}).waitFor();
    await page.screenshot({path:'/tmp/burst-peer-help-refined.png'});
    await page.goto(new URL('/explorer',baseUrl).href);
    await page.getByText('Look up an account or block on this node.',{exact:true}).waitFor();
    assert.equal(await page.locator('main svg.lucide-arrow-right').count(),0);
    assert.equal(await page.locator('main svg.lucide-search').count(),1);
    await page.screenshot({path:'/tmp/burst-explorer-refined.png'});
    await page.getByRole('textbox',{name:'Account address'}).fill('brst_fixture');
    await page.getByRole('textbox',{name:'Account address'}).press('Enter');
    await page.getByText('Synthetic lookup unavailable',{exact:true}).waitFor();
  } finally {await page.close();}
});

test('configuration editor fits the window and keeps labels and save shortcuts accessible', async () => {
  const page=await browser.newPage({viewport:{width:1200,height:850}});
  try {
    await page.addInitScript(() => {
      window.isTauri=true;window.writes=[];
      window.__TAURI_INTERNALS__={invoke:async(command,args) => {
        if(command === 'read_config') return '# Synthetic configuration\nnetwork = "test"\n';
        if(command === 'write_config') {window.writes.push(args);return;}
        throw new Error('Fixture unavailable: '+command);
      }};
    });
    await page.goto(new URL('/config',baseUrl).href);
    const editor=page.getByLabel('Configuration contents',{exact:true});
    await editor.fill('# Updated synthetic config');
    await editor.press('Control+Enter');
    await page.getByText('No unsaved changes',{exact:true}).waitFor();
    assert.deepEqual(await page.evaluate(() => window.writes),[{path:'/etc/burst/config.toml',content:'# Updated synthetic config'}]);
    await page.waitForFunction(() => document.querySelectorAll('[data-sonner-toast]').length === 0);
    await page.locator('#main-content').focus();
    for(const theme of ['light','dark']) {
      await page.evaluate(theme => document.body.classList.toggle('dark',theme === 'dark'),theme);
      await page.screenshot({path:'/tmp/burst-config-'+theme+'.png'});
      for(const width of [1200,800,320]) {
        await page.setViewportSize({width,height:700});
        assert.equal(await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth),true);
        const style=await editor.evaluate(el => {const s=getComputedStyle(el);return {radius:s.borderRadius,size:s.fontSize,height:parseFloat(s.height)};});
        assert.equal(style.radius,'8px');assert.equal(style.size,'16px');
        assert.ok(style.height >= 240 && style.height <= 440);
      }
      await page.screenshot({path:'/tmp/burst-config-'+theme+'-mobile.png'});
      await page.setViewportSize({width:1200,height:850});
    }
  } finally {await page.close();}
});

test('configuration drafts survive navigation, protect exit, and stay bound to their loaded file', async () => {
  const page = await browser.newPage();
  try {
    await page.addInitScript(() => {
      window.isTauri=true;
      window.writes=[];
      window.__TAURI_INTERNALS__={invoke:async (command,args) => {
        if(command === 'read_config') {if(args.path === '/missing.toml') throw new Error('File not found');return '# original config';}
        if(command === 'write_config') {window.writes.push(args);await new Promise(resolve => {window.finishSave=resolve;});return;}
        throw new Error('No telemetry in config fixture');
      }};
    });
    await page.goto(new URL('/config',baseUrl).href);
    await page.getByLabel('Configuration contents').fill('# my draft');
    await page.evaluate(() => {history.pushState({},'','/');dispatchEvent(new PopStateEvent('popstate'));});
    await page.getByRole('heading',{name:'Node unavailable'}).waitFor();
    assert.equal(await page.evaluate(() => {const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;}),true);
    await page.evaluate(() => {history.pushState({},'','/config');dispatchEvent(new PopStateEvent('popstate'));});
    assert.equal(await page.getByLabel('Configuration contents').inputValue(),'# my draft');
    await page.getByLabel('Config file path').fill('/missing.toml');
    await page.getByRole('button',{name:'Load',exact:true}).click();
    await page.getByRole('button',{name:'Keep editing',exact:true}).click();
    await page.waitForFunction(() => document.activeElement?.textContent.trim() === 'Load');
    assert.equal(await page.getByLabel('Configuration contents').inputValue(),'# my draft');
    await page.getByRole('button',{name:'Load',exact:true}).click();
    await page.getByRole('button',{name:'Discard and load',exact:true}).click();
    await page.getByRole('alert').getByText(/File not found/).waitFor();
    assert.equal(await page.getByLabel('Configuration contents').inputValue(),'# my draft');
    await page.getByRole('button',{name:'Save',exact:true}).click();
    await page.waitForFunction(() => !!window.finishSave);
    assert.equal(await page.getByLabel('Configuration contents').isDisabled(),true);
    assert.deepEqual(await page.evaluate(() => window.writes),[{path:'/etc/burst/config.toml',content:'# my draft'}]);
    await page.evaluate(() => window.finishSave());
    await page.getByText('No unsaved changes',{exact:true}).waitFor();
    assert.equal(await page.evaluate(() => {const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;}),false);
  } finally {await page.close();}
});

test('node polling retains a slow result instead of constantly superseding it', async () => {
  const page = await browser.newPage();
  try {
    await page.clock.install();
    await page.addInitScript(() => {
      window.isTauri=true;window.telemetryReads=0;
      window.__TAURI_INTERNALS__={invoke:async command => {
        if(command === 'get_protocol_params') return {brn_rate:'0',trst_expiry_secs:31536000};
        if(command === 'get_telemetry') {window.telemetryReads++;return new Promise(resolve => {window.releaseTelemetry=() => resolve({block_count:42,account_count:2,peer_count:1,protocol_version:1,uptime_secs:120,verified_count:1,unverified_count:1,trst_circulating:'0',trst_expired_total:'0',trst_revoked_total:'0',ntp_offset_ms:0});});}
        throw new Error('Unexpected fixture command');
      }};
    });
    await page.goto(baseUrl);
    await page.waitForFunction(() => !!window.releaseTelemetry);
    const initial = await page.evaluate(() => window.telemetryReads);
    await page.clock.fastForward(16000);
    assert.equal(await page.evaluate(() => window.telemetryReads),initial);
    await page.evaluate(() => window.releaseTelemetry());
    await page.getByText('42',{exact:true}).waitFor();
  } finally {await page.close();}
});

test('browser preview explains the desktop requirement', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(baseUrl);
    await page.getByRole('heading', { name: 'Node unavailable' }).waitFor();
    assert.match(await page.getByRole('alert').innerText(), /npm run tauri dev/);
    await page.screenshot({ path: '/tmp/burst-node-offline.png', fullPage: true });
  } finally { await page.close(); }
});

test('chosen RPC endpoint survives a reload without claiming a connection', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(baseUrl);
    await page.getByRole('button', { name: 'Connection', exact: true }).click();
    await page.getByPlaceholder('http://127.0.0.1:7077').fill('http://127.0.0.1:29077');
    await page.getByRole('button', { name: 'Connect', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Connection', exact: true }).click();
    assert.equal(await page.getByPlaceholder('http://127.0.0.1:7077').inputValue(), 'http://127.0.0.1:29077');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({state:'hidden'});
    await page.getByRole('heading', { name: 'Node unavailable' }).waitFor();
  } finally { await page.close(); }
});

test('endpoint switch ignores a delayed response from the old node; retry recovers', async () => {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  page.setDefaultTimeout(5000);
  try {
    await page.addInitScript(() => {
      window.isTauri = true;
      window.failRpc = true;
      window.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
        if (command === 'get_protocol_params') return { brn_rate: '277777777777777', trst_expiry_secs: 31536000 };
        if (args.rpcUrl.endsWith(':7077')) {
          await new Promise(resolve => { window.releaseOld = resolve; });
          return { block_count: 99999, account_count: 1, peer_count: 0, protocol_version: 1, uptime_secs: 1, verified_count: 1, unverified_count: 0, trst_circulating: '0', trst_expired_total: '0', trst_revoked_total: '0', ntp_offset_ms: 0 };
        }
        if (window.failRpc) throw new Error('Connection refused');
        return { network: 'dev', faucet_enabled: false, block_count: 42, account_count: 2, peer_count: 1, protocol_version: 1, uptime_secs: 30, verified_count: 1, unverified_count: 1, trst_circulating: '1000000000000000000', trst_expired_total: '0', trst_revoked_total: '0', ntp_offset_ms: 0 };
      } };
    });
    await page.goto(baseUrl);
    await page.waitForFunction(() => !!window.releaseOld);
    await page.getByRole('button', { name: 'Connection', exact: true }).click();
    await page.getByPlaceholder('http://127.0.0.1:7077').fill('http://127.0.0.1:9999');
    await page.getByRole('button', { name: 'Connect', exact: true }).click();
    await page.getByRole('heading', { name: 'Node unavailable' }).waitFor();
    await page.evaluate(() => window.releaseOld());
    await page.evaluate(() => { window.failRpc = false; });
    await page.getByRole('button', { name: 'Try again' }).click();
    await page.getByText('42', { exact: true }).waitFor();
    await page.getByText('Devnet — test funds only, no real value. Test faucet disabled.', { exact: true }).waitFor();
    assert.equal(await page.getByText('99,999', { exact: true }).count(), 0);
    for (const label of ['Blocks', 'Peers', 'TRST', 'Verified']) {
      const button = page.getByRole('group', { name: 'Activity chart' }).getByRole('button', { name: label, exact: true });
      await button.click();
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
    }
    await page.screenshot({ path: '/tmp/burst-node-dashboard.png', fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'Use dark appearance' }).click();
    await page.screenshot({ path: '/tmp/burst-node-dark.png', animations: 'disabled' });
    assert.equal(await page.locator('body').evaluate(el => el.classList.contains('dark')), true);
    await page.setViewportSize({ width: 900, height: 600 });
    await page.getByRole('link', { name: 'Explorer', exact: true }).waitFor();
    assert.equal(await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth), true);
    await page.getByRole('button', { name: 'Use light appearance' }).click();
    await page.screenshot({ path: '/tmp/burst-node-compact.png', animations: 'disabled' });
    await page.setViewportSize({ width: 320, height: 700 });
    await page.waitForFunction(() => { const main = document.querySelector('main'); return main.scrollWidth <= main.clientWidth; });
    assert.equal(await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth), true, '320px main overflow: ' + JSON.stringify(await page.locator('main').evaluate(main => [...main.querySelectorAll('*')].filter(el => el.getBoundingClientRect().right > main.getBoundingClientRect().right).map(el => ({ tag: el.tagName, class: el.className, text: el.textContent?.slice(0, 60) })))));
    await page.getByText('Connection', { exact: true }).click();
    await page.getByRole('dialog', { name: 'Node connection' }).waitFor();
    await page.screenshot({ path: '/tmp/burst-node-narrow.png', animations: 'disabled' });
    assert.equal(await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth), true);
  } finally { await page.close(); }
});

test('appearance persists across reload and reduced motion is honored', async () => {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  try {
    await page.goto(baseUrl);
    await page.getByRole('button', { name: 'Use dark appearance' }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Use light appearance' }).waitFor();
    assert.equal(await page.locator('body').evaluate(el => el.classList.contains('dark')), true);
    const duration = await page.getByRole('button', { name: 'Use light appearance' }).evaluate(el => parseFloat(getComputedStyle(el).transitionDuration));
    assert(duration < 0.01);
  } finally { await page.close(); }
});

test('protocol parameter failure is explicit while telemetry remains available', async () => {
  const page = await browser.newPage();
  try {
    await page.addInitScript(() => {
      window.isTauri = true;
      window.__TAURI_INTERNALS__ = { invoke: async command => {
        if (command === 'get_protocol_params') throw new Error('Parameters unavailable');
        if (command === 'get_telemetry') return {
          network: 'test', faucet_enabled: false, block_count: 42, account_count: 2,
          peer_count: 0, protocol_version: 1, uptime_secs: 30, verified_count: 1,
          unverified_count: 1, trst_circulating: '0', trst_expired_total: '0',
          trst_revoked_total: '0', ntp_offset_ms: null,
        };
        throw new Error('Unexpected fixture command: ' + command);
      } };
    });
    await page.goto(baseUrl);
    await page.getByText('42', { exact: true }).waitFor();
    assert.equal(await page.getByText('Parameters unavailable. Retrying…', { exact: true }).count(), 2);
    await page.getByRole('heading',{name:'Your node is isolated',exact:true}).waitFor();
    await page.locator('.overview-notices').getByText('No recent successful clock synchronization', { exact: true }).waitFor();
    await page.getByText('Network parameters unavailable. Retrying…', { exact: true }).waitFor();
  } finally { await page.close(); }
});


test('node tools fit a 320px touch viewport in light and dark appearances', async () => {
  const page = await browser.newPage({viewport:{width:320,height:700},hasTouch:true,isMobile:true});
  const errors = [];
  page.on('pageerror',error => errors.push(error.message));
  try {
    await page.addInitScript(() => {
      window.isTauri = true;
      window.__TAURI_INTERNALS__ = {invoke:async command => {
        switch(command) {
          case 'get_telemetry': return {network:'dev',faucet_enabled:false,block_count:42,account_count:2,peer_count:1,protocol_version:1,uptime_secs:120,verified_count:1,unverified_count:1,trst_circulating:'1234000000000000000000',trst_expired_total:'0',trst_revoked_total:'0',ntp_offset_ms:0};
          case 'get_protocol_params': return {brn_rate:'277777777777777',trst_expiry_secs:31536000,endorsement_threshold:3,verification_threshold:67,endorsement_burn_amount:'1000000000000000000',verifier_stake_amount:'1000000000000000000',challenge_stake_amount:'1000000000000000000',max_revotes:3,governance_quorum:50,governance_supermajority:67,governance_proposal_window_secs:86400,governance_voting_window_secs:86400,governance_cooldown_secs:86400,spending_limit_new_wallets:'1000000000000000000'};
          case 'get_verification_activity': return {active_verifications:0,pending_endorsements:0,active_challenges:0,verifier_pool_size:1,total_verified:1,total_revoked:0,recent_verifications:[],recent_endorsements:[],recent_challenges:[]};
          case 'get_governance_proposals': return {proposals:[]};
          case 'get_consti': return {articles:[],amendment_threshold:'67'};
          case 'get_representatives': return {representatives:[]};
          case 'get_peers': return {peers:[{address:'127.0.0.1:7075',protocol_version:1,node_id:'synthetic-peer',clock_offset_ms:20,last_seen:1700000000,connection_type:'outbound'}],count:1};
          case 'get_merger_graph_stats': return {total_origins:0,total_merges:0,total_active_chains:0,total_revoked_origins:0,avg_chain_depth:0,max_chain_depth:0};
          case 'read_logs': return ['INFO synthetic UI test only'];
          case 'read_config': return '# Synthetic config; no disk access';
          default: throw new Error('Fixture unavailable: '+command);
        }
      }};
    });
    await page.goto(baseUrl);
    for (const theme of ['light','dark']) {
      await page.evaluate(theme => document.body.classList.toggle('dark',theme === 'dark'),theme);
      for (const route of ['/','/peers','/explorer','/verification','/governance','/parameters','/merger-graph','/config','/logs']) {
        await page.evaluate(route => { history.pushState({},'',route); dispatchEvent(new PopStateEvent('popstate')); },route);
        await page.waitForFunction(() => document.querySelector('main')?.textContent?.trim() && !/^Loading…$/.test(document.querySelector('main').textContent.trim()));
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        for (const selector of ['main','header']) {
          const size = await page.locator(selector).evaluate(el => ({scroll:el.scrollWidth,client:el.clientWidth}));
          assert(size.scroll <= size.client,theme+' '+route+' '+selector+': '+JSON.stringify(size));
        }
        if (route === '/verification') {
          const tabs = page.getByRole('tab');
          for (let index=0;index<await tabs.count();index++) assert((await tabs.nth(index).boundingBox()).height >= 44);
        }
        if (['/peers','/verification','/parameters','/merger-graph'].includes(route)) {
          const help=page.locator('.context-help');
          await help.waitFor();
          assert.equal(await help.getAttribute('open'),null);
          assert.equal(await help.evaluate(el=>getComputedStyle(el).borderLeftWidth),'0px');
          await help.locator('summary').click();
          assert.equal(await help.evaluate(el=>el.open),true);
          await help.locator('summary').click();
        }
        if (['/peers','/verification','/merger-graph'].includes(route)) {
          await page.locator('.metric-group').waitFor();
          await page.screenshot({path:'/tmp/burst-node-summary-'+route.slice(1)+'-'+theme+'-mobile.png'});
          await page.setViewportSize({width:1200,height:900});
          await page.screenshot({path:'/tmp/burst-node-summary-'+route.slice(1)+'-'+theme+'.png'});
          await page.setViewportSize({width:320,height:700});
        }
      }
    }
    assert.deepEqual(errors,[]);
  } finally { await page.close(); }
});


test('origin summary uses the shared neutral rows and retains trace and failure states', async () => {
  const page=await browser.newPage({viewport:{width:1200,height:900}});
  page.setDefaultTimeout(5000);
  try {
    await page.clock.install();
    await page.addInitScript(() => {
      window.isTauri=true;window.failStats=false;window.lookups=[];
      window.__TAURI_INTERNALS__={invoke:async(command,args)=>{
        if(command === 'get_merger_graph_stats') {
          if(window.failStats) throw new Error('Stats unavailable');
          return {total_origins:0,total_merges:0,total_active_chains:0,total_revoked_origins:0,avg_chain_depth:0,max_chain_depth:0};
        }
        if(command === 'trace_origin') {
          window.lookups.push(args.origin);
          if(args.origin === 'missing') throw new Error('Origin not found');
          return {origin:args.origin,originator:'brst_fixture',timestamp:1700000000,amount:'1000000000000000000',status:'revoked',forward_merges:[]};
        }
        throw new Error('Unexpected fixture: '+command);
      }};
    });
    await page.goto(new URL('/merger-graph',baseUrl).href);
    const group=page.getByRole('group',{name:'Origin summary'});
    await group.getByText('0.0',{exact:true}).waitFor();
    assert.deepEqual(await group.locator('dd').allTextContents(),['0','0','0','0','0.0','0']);
    assert.ok((await group.boundingBox()).height <= 160);
    const styles=await group.locator('.metric-row').evaluateAll(rows=>rows.map(row=>({height:row.getBoundingClientRect().height,color:getComputedStyle(row.querySelector('dd')).color,font:getComputedStyle(row.querySelector('dd')).fontFamily,left:getComputedStyle(row).borderLeftWidth})));
    for(const [index,style] of styles.entries()) {assert.deepEqual({...style,left:'0px'},styles[0]);assert.equal(style.left,index % 2 === 1 ? '1px' : '0px');}
    for(const theme of ['light','dark']) {
      if(await page.evaluate(()=>document.body.classList.contains('dark')) !== (theme === 'dark')) await page.getByRole('button',{name:theme === 'dark' ? 'Use dark appearance':'Use light appearance'}).click();
      await page.waitForFunction(()=>!document.documentElement.classList.contains('theme-switching'));
      await page.mouse.move(0,0);
      await page.screenshot({path:'/tmp/burst-origins-unified-'+theme+'.png'});
    }
    await page.setViewportSize({width:320,height:850});
    assert.equal(await group.locator('.metric-rows').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),1);
    assert.deepEqual(await group.locator('.metric-row').evaluateAll(rows=>rows.map(row=>getComputedStyle(row).borderInlineStartWidth)),['0px','0px','0px','0px','0px','0px']);
    assert.equal(await page.locator('main').evaluate(el=>el.scrollWidth <= el.clientWidth),true);
    await page.screenshot({path:'/tmp/burst-origins-unified-mobile.png'});
    const input=page.getByRole('textbox',{name:'Origin hash'});
    await page.getByText('Trace an origin',{exact:true}).click();
    assert.equal(await input.evaluate(el=>el === document.activeElement),true);
    await input.fill('a'.repeat(64));await input.press('Enter');
    await page.getByText('revoked',{exact:true}).waitFor();
    await page.getByText('No forward merges found.',{exact:true}).waitFor();
    assert.deepEqual(await page.evaluate(()=>window.lookups),['a'.repeat(64)]);
    await input.fill('missing');await input.press('Enter');
    await page.getByText('Origin trace is not available on this node. Origin not found',{exact:true}).waitFor();
    await page.evaluate(()=>{window.failStats=true;});
    await page.clock.fastForward(15100);
    await page.getByText('Merger graph stats are not available on this node.',{exact:true}).waitFor();
    assert.equal(await page.locator('main').evaluate(el=>el.scrollWidth <= el.clientWidth),true);
  } finally {await page.close();}
});

test('governance proposals are keyboard accessible and representative weight is not token-scaled', async () => {
  const page = await browser.newPage();
  try {
    await page.addInitScript(() => {
      window.isTauri = true;
      window.__TAURI_INTERNALS__ = {invoke:async command => {
        if (command === 'get_governance_proposals') return {proposals:[{hash:'a'.repeat(64),proposer:'brst_fixture',phase:'voting',description:'Synthetic proposal',param:'',proposed_value:'',votes_yea:1,votes_nay:0,votes_abstain:0,created_at:1700000000,phase_deadline:0}]};
        if (command === 'get_representatives') return {representatives:[{account:'brst_fixture',weight:'10000',delegator_count:1}]};
        if (command === 'get_consti') return {articles:[],amendment_threshold:'67'};
        throw new Error('Unexpected fixture: '+command);
      }};
    });
    await page.goto(new URL('/governance',baseUrl).href);
    const proposal = page.getByRole('button').filter({hasText:'Synthetic proposal'});
    await proposal.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement?.textContent?.includes('Synthetic proposal'));
    await page.getByRole('tab',{name:'Representatives',exact:true}).click();
    await page.getByRole('cell',{name:'10,000',exact:true}).waitFor();
    assert.equal(await page.getByText('0.000000',{exact:true}).count(),0);
  } finally { await page.close(); }
});
