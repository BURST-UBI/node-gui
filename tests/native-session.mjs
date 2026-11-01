import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

assert(process.env.NODE_RPC_URL, 'Set NODE_RPC_URL to a disposable development node');
const windows = process.platform === 'win32';
if (windows) {
  assert(process.env.USERPROFILE && process.env.APPDATA && process.env.LOCALAPPDATA, 'Windows user profile is not loaded');
  assert(process.env.NATIVE_WINDOWS_ISOLATED_PROFILE, 'Declare the dedicated Windows validation profile');
  assert.equal(resolve(process.env.NATIVE_WINDOWS_ISOLATED_PROFILE).toLowerCase(),
    resolve(process.env.USERPROFILE || '').toLowerCase(), 'Run under the declared isolated Windows account');
  assert(!/systemprofile/i.test(process.env.USERPROFILE), 'SYSTEM profile is not an isolated desktop account');
  assert(process.env.NATIVE_WEBDRIVER, 'Set NATIVE_WEBDRIVER to the matching Edge driver');
}
const root = fileURLToPath(new URL('../', import.meta.url));
const evidence = await mkdtemp(join(tmpdir(), 'burst-native-dashboard-'));
const env = {
  ...process.env,
  NATIVE_EVIDENCE: evidence,
  ...(!windows && {
    XDG_CONFIG_HOME: join(evidence, 'config'),
    XDG_DATA_HOME: join(evidence, 'data'),
    XDG_CACHE_HOME: join(evidence, 'cache'),
    GDK_BACKEND: 'x11',
  }),
};
delete env.WAYLAND_DISPLAY;
for (const directory of windows ? [] : [env.XDG_CONFIG_HOME, env.XDG_DATA_HOME, env.XDG_CACHE_HOME]) {
  await mkdir(directory, { mode: 0o700 });
}
const log = await open(join(evidence, 'webdriver.log'), 'w', 0o600);
const driverBinary = process.env.TAURI_DRIVER || 'tauri-driver';
const driverArgs = ['--port', '4446', '--native-port', '4447', '--native-driver',
  windows ? process.env.NATIVE_WEBDRIVER : '/usr/bin/WebKitWebDriver'];
const driver = spawn(windows ? driverBinary : 'xvfb-run',
  windows ? driverArgs : ['-a', '-s', '-screen 0 1440x1000x24', driverBinary, ...driverArgs], {
    env, detached: !windows, stdio: ['ignore', log.fd, log.fd],
  });
let launchError;
driver.on('error', error => { launchError = error; });
const exited = new Promise(resolveExit => driver.once('exit', resolveExit));
let session;
const server = 'http://127.0.0.1:4446';
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (launchError) throw launchError;
    assert(driver.exitCode === null, `WebDriver exited; see ${evidence}`);
    try {
      await fetch(`${server}/status`, { signal: AbortSignal.timeout(1000) });
      ready = true;
      break;
    } catch {
      await new Promise(resolveWait => setTimeout(resolveWait, 100));
    }
  }
  assert(ready, `WebDriver did not start; see ${evidence}`);
  const response = await (await fetch(`${server}/session`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ capabilities: { alwaysMatch: {
      'tauri:options': { application: process.env.NODE_BINARY || resolve(root, `src-tauri/target/debug/burst-node-gui${windows ? '.exe' : ''}`) },
    } } }), signal: AbortSignal.timeout(30000),
  })).json();
  assert(!response.value?.error, JSON.stringify(response));
  session = response.value.sessionId;
  assert(session, JSON.stringify(response));
  let loaded = false;
  for (let attempt = 0; attempt < 150; attempt++) {
    const { value } = await (await fetch(`${server}/session/${session}/execute/sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script: 'return !!window.__TAURI_INTERNALS__?.invoke && !!document.querySelector("main")', args: [] }),
      signal: AbortSignal.timeout(5000),
    })).json();
    assert(!value?.error, JSON.stringify(value));
    if (value === true) { loaded = true; break; }
    await new Promise(resolveWait => setTimeout(resolveWait, 100));
  }
  assert(loaded, `Native app did not render with IPC; see ${evidence}`);
  if (process.argv.includes('--embedded') || process.env.NATIVE_EMBEDDED === '1') {
    const { checkSecurity } = await import('./native-security.mjs');
    await checkSecurity(async (script, args = [], asynchronous = false) => {
      const response = await fetch(`${server}/session/${session}/execute/${asynchronous ? 'async' : 'sync'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, args }), signal: AbortSignal.timeout(15000),
      });
      const { value } = await response.json();
      assert(response.ok && !value?.error, JSON.stringify(value));
      return value;
    });
  }
  for (const test of ['native-rpc.mjs', 'native-concurrent-reads.mjs', 'native-dashboard.mjs']) {
    const child = spawn(process.execPath, [resolve(root, 'tests', test)], {
      cwd: root, env: { ...env, WEBDRIVER_SESSION: session }, stdio: 'inherit',
    });
    const code = await new Promise((resolveExit, reject) => {
      child.once('error', reject);
      child.once('exit', resolveExit);
    });
    assert.equal(code, 0, `${test} failed; evidence: ${evidence}`);
  }
} finally {
  if (session) {
    await fetch(`${server}/session/${session}`, {
      method: 'DELETE', signal: AbortSignal.timeout(5000),
    }).catch(error => console.error('Session cleanup:', error.message));
  }
  if (driver.pid && driver.exitCode === null && driver.signalCode === null) {
    if (windows) {
      const stop = spawn('taskkill.exe', ['/PID', String(driver.pid), '/T', '/F'], { stdio: ['ignore', log.fd, log.fd] });
      const code = await new Promise((resolveExit, reject) => {
        stop.once('error', reject);
        stop.once('exit', resolveExit);
      });
      assert(code === 0 || driver.exitCode !== null || driver.signalCode !== null, 'Failed to stop owned WebDriver process tree');
      await exited;
    } else {
      process.kill(-driver.pid, 'SIGTERM');
      const timer = setTimeout(() => {
        if (driver.exitCode === null) process.kill(-driver.pid, 'SIGKILL');
      }, 5000);
      await exited;
      clearTimeout(timer);
    }
  }
  await log.close();
  console.log(`Native test evidence and isolated app data: ${evidence}`);
}
