import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

assert(process.env.NODE_RPC_URL, 'Set NODE_RPC_URL to a disposable development node');
const root = fileURLToPath(new URL('../', import.meta.url));
const evidence = await mkdtemp(join(tmpdir(), 'burst-native-dashboard-'));
const env = {
  ...process.env,
  XDG_CONFIG_HOME: join(evidence, 'config'),
  XDG_DATA_HOME: join(evidence, 'data'),
  XDG_CACHE_HOME: join(evidence, 'cache'),
  GDK_BACKEND: 'x11',
};
delete env.WAYLAND_DISPLAY;
for (const directory of [env.XDG_CONFIG_HOME, env.XDG_DATA_HOME, env.XDG_CACHE_HOME]) {
  await mkdir(directory, { mode: 0o700 });
}
const log = await open(join(evidence, 'webdriver.log'), 'w', 0o600);
const driver = spawn('xvfb-run', ['-a', '-s', '-screen 0 1440x1000x24', process.env.TAURI_DRIVER || 'tauri-driver',
  '--port', '4446', '--native-port', '4447', '--native-driver', '/usr/bin/WebKitWebDriver'], {
  env, detached: true, stdio: ['ignore', log.fd, log.fd],
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
      'tauri:options': { application: process.env.NODE_BINARY || resolve(root, 'src-tauri/target/debug/burst-node-gui') },
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
  for (const test of ['native-rpc.mjs', 'native-dashboard.mjs']) {
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
  if (driver.pid && driver.exitCode === null) {
    process.kill(-driver.pid, 'SIGTERM');
    const timer = setTimeout(() => {
      if (driver.exitCode === null) process.kill(-driver.pid, 'SIGKILL');
    }, 5000);
    await exited;
    clearTimeout(timer);
  }
  await log.close();
  console.log(`Native test evidence and isolated app data: ${evidence}`);
}
