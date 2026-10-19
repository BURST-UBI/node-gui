// UI contracts with synthetic IPC, not native/protocol acceptance.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
let browser;
const base = process.env.NODE_GUI_URL || 'http://127.0.0.1:1420';
before(async () => {
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
});
after(async () => browser?.close());

async function fixture() {
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  await page.addInitScript(() => {
    window.isTauri = true;
    window.calls = [];
    window.failDetail = true;
    window.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
      window.calls.push({ command, args });
      if (command === 'get_governance_proposals') return {
        proposals: [{ hash: args.cursor ? 'b'.repeat(64) : 'a'.repeat(64), proposer: 'brst_fixture',
          phase: 'Voting', description: args.cursor ? 'Second page proposal' : 'First page proposal',
          votes_yea: 8, votes_nay: 2 }], cursor: args.cursor ? null : 'next-page',
      };
      if (command === 'get_governance_proposal_info') {
        if (window.failDetail) throw new Error('Detail connection interrupted');
        return { hash: args.hash, proposer: 'brst_fixture', phase: 'Voting', description: 'Complete proposal',
          param: 'min_verification_age_secs', proposed_value: '60', votes_yea: 8, votes_nay: 2,
          votes_abstain: 7, created_at: 1700000000, phase_deadline: 1700001000 };
      }
      if (command === 'get_representatives') return { representatives: [] };
      if (command === 'get_consti') return { articles: [], amendment_threshold: '67' };
      throw new Error('Unexpected fixture: ' + command);
    }};
  });
  return page;
}

test('governance fetches full detail, retries failure and navigates cursor pages', async () => {
  const page = await fixture();
  try {
    await page.goto(base + '/governance');
    const trigger = page.getByRole('button').filter({ hasText: 'First page proposal' });
    await trigger.waitFor();
    assert.equal(await page.getByText(/Abstain:/).count(), 0, 'summary must not invent abstentions');
    await trigger.click();
    await page.getByRole('alert').filter({ hasText: 'Detail connection interrupted' }).waitFor();
    await page.evaluate(() => { window.failDetail = false; });
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await page.getByRole('dialog').getByText('Abstain: 7', { exact: true }).waitFor();
    await page.getByRole('dialog').getByText('min_verification_age_secs', { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement?.textContent.includes('First page proposal'));
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByText('Second page proposal', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Next', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await page.getByText('First page proposal', { exact: true }).waitFor();
    const cursors = await page.evaluate(() => window.calls.filter(c => c.command === 'get_governance_proposals').map(c => c.args.cursor));
    assert.equal(cursors[0], null);
    assert.deepEqual(cursors.slice(-2), ['next-page', null]);
  } finally { await page.close(); }
});

test('render failure keeps navigation and provides reload recovery', async () => {
  const page = await fixture();
  try {
    await page.addInitScript(() => {
      const invoke = window.__TAURI_INTERNALS__.invoke;
      window.__TAURI_INTERNALS__.invoke = (command, args) => command === 'get_governance_proposals'
        ? Promise.resolve({ proposals: [null] }) : invoke(command, args);
    });
    await page.goto(base + '/governance');
    await page.getByRole('button', { name: 'Reload dashboard', exact: true }).waitFor();
    await page.getByRole('link', { name: 'Overview', exact: true }).waitFor();
  } finally { await page.close(); }
});

test('appearance is restored before the application module loads', async () => {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage();
    try {
      await page.addInitScript(theme => localStorage.setItem('burst-appearance', theme), theme);
      await page.route('**/src/main.tsx', route => route.abort());
      await page.goto(base);
      assert.equal(await page.locator('body').evaluate(el => el.classList.contains('dark')), theme === 'dark');
      assert.equal(await page.locator('#root').innerHTML(), '');
    } finally { await page.close(); }
  }
});
