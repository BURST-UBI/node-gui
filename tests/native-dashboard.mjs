// Real Tauri/WebKit navigation against a disposable node, without mocked IPC.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
assert(process.env.WEBDRIVER_SESSION, 'Provide a running native test session');
const base = `http://127.0.0.1:4446/session/${process.env.WEBDRIVER_SESSION}`;
const rpcUrl = process.env.NODE_RPC_URL || 'http://127.0.0.1:29077';
const account = process.env.NODE_ACCOUNT || 'brst_9fo4hh8gptk4tro5o5a4nurfgfkm67dq5qj69bjtr36c54tsuanif4gtwduq';
const selectionEnabled = process.env.NODE_SELECTION_ENABLED === '1';
const pausedMessage = 'Verifier selection is paused on this node.';
function assertSelection(text) {
  assert.equal(text.includes(pausedMessage), !selectionEnabled);
  assert.doesNotMatch(text, /hasn't reported verifier-selection availability/);
}
async function script(script, args = []) {
  const {value} = await (await fetch(`${base}/execute/sync`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({script,args}),
  })).json();
  assert(!value?.error, JSON.stringify(value)); return value;
}
async function wait(condition) {
  for (let i=0;i<150;i++) {
    if (await script(`return ${condition}`)) return;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.fail(`Native page did not reach: ${condition}`);
}
async function fill(selector, value) {
  assert(await script(`const input=document.querySelector(arguments[0]);if(!input)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,arguments[1]);input.dispatchEvent(new Event('input',{bubbles:true}));return true`,[selector,value]));
}
async function click(text) {
  const element = await script(`const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===arguments[0]);return b && !b.disabled ? b : null`,[text]);
  assert(element,text);
  const id = element['element-6066-11e4-a52e-4f735466cecf'];
  assert(id);
  const {value} = await (await fetch(`${base}/element/${id}/click`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json();
  assert(!value?.error,JSON.stringify(value));
}
async function page(path, content) {
  assert(await script(`const link=document.querySelector('a[href="'+arguments[0]+'"]');if(!link)return false;link.click();return true`,[path]));
  await wait(`document.querySelector('main')?.innerText.includes(${JSON.stringify(content)}) && !document.querySelector('main .animate-shimmer')`);
  assert.doesNotMatch(await script(`return document.querySelector('main').innerText`), /not available on this node|Node unavailable|RPC request failed/);
  console.log(`PASS native dashboard page ${path}`);
}
const appUrl = await script('return location.href');
assert.match(appUrl, /^(tauri:\/\/localhost|https?:\/\/tauri\.localhost|http:\/\/localhost:1420)(\/|$)/);
await wait(`!!document.querySelector('main')`);
await click('Connection');
await wait(`!!document.querySelector('input[placeholder="http://127.0.0.1:7077"]')`);
await fill('#node-endpoint',rpcUrl);
await click('Connect');
await wait(`!document.querySelector('[role="dialog"]') && document.querySelector('main').innerText.includes('Blocks') && !document.querySelector('main .animate-shimmer')`);
const {value:telemetry} = await (await fetch(`${base}/execute/async`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({args:[rpcUrl],script:`const done=arguments[arguments.length-1];window.__TAURI_INTERNALS__.invoke('get_telemetry',{rpcUrl:arguments[0]}).then(done,e=>done({error:String(e)}));`})})).json();
assert(!telemetry.error); assert(telemetry.block_count>0);
assert((await script(`return document.querySelector('main').innerText`)).includes(telemetry.block_count.toLocaleString()));
const screenshot=await (await fetch(`${base}/screenshot`)).json();
await writeFile('/tmp/burst-native-node-dashboard.png',Buffer.from(screenshot.value,'base64'));
await page('/parameters','BRN Accrual Rate');
await page('/peers','Connected Peers');
const peers = await script(`return document.querySelector('main').innerText`);
assert.match(peers,/No peers connected|Peer List/);
await page('/verification','Account lookup');
await fill('#verification-account',account);
await click('Check');
await wait(`document.querySelector('[aria-label="Account lookup"] dd') !== null`);
const lookup = await script(`return document.querySelector('[aria-label="Account lookup"]').innerText`);
assert.match(lookup,/verified/i);
assert.match(lookup,/0\s*\/\s*\d+/);
assert.doesNotMatch(lookup,/undefined|NaN|lookup failed/i);
assertSelection(lookup);
console.log('PASS native verification state, endorsement count and selection capability');
await page('/governance','No active proposals');
await click('Consti');
await wait(`document.querySelector('main')?.innerText.includes('Amendment threshold:')`);
await page('/merger-graph','Indexed origins');
await page('/explorer','Account');
await fill('input[placeholder="brst_… account address"]',account);
await click('Lookup');
await wait(`document.querySelector('main').innerText.includes('BRN') && !document.querySelector('main .animate-shimmer')`);
assert.doesNotMatch(await script(`return document.querySelector('main').innerText`),/RPC request failed|account not found/i);
await click('View Verification Details');
await wait(`document.querySelector('[role="dialog"] dd') !== null`);
const verificationDetails = await script(`return document.querySelector('[role="dialog"]').innerText`);
assert.match(verificationDetails,/0\s*\/\s*\d+/);
assertSelection(verificationDetails);
await click('Close');
await wait(`!document.querySelector('[role="dialog"]')`);
assert.equal(await script(`return document.activeElement?.textContent.trim()`),'View Verification Details');
console.log('PASS native explorer verification dialog and restored keyboard focus');
await page('/logs','Local machine only:');
await page('/','Blocks');
console.log('PASS native telemetry rendering, page navigation, explorer, constitution and explicit local-log scope');
