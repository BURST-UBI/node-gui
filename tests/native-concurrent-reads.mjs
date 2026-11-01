import assert from 'node:assert/strict';
const session=process.env.WEBDRIVER_SESSION, rpcUrl=process.env.NODE_RPC_URL;
assert(session&&rpcUrl);
const {value}=await(await fetch(`http://127.0.0.1:4446/session/${session}/execute/async`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({args:[rpcUrl],script:`const rpcUrl=arguments[0],done=arguments[arguments.length-1];
(async()=>{const rows=[];for(let round=0;round<5;round++){
rows.push(...await Promise.all(['get_governance_proposals','get_consti','get_representatives'].map(async command=>{try{await window.__TAURI_INTERNALS__.invoke(command,{rpcUrl,cursor:null});return {round,command,ok:true}}catch(error){return {round,command,ok:false,error:String(error)}}})));
await new Promise(resolve=>setTimeout(resolve,250));}return rows})().then(done,error=>done({error:String(error)}));`})})).json();
console.log(JSON.stringify(value,null,2));assert(Array.isArray(value)&&value.length===15);
assert(value.every(row=>row.ok), 'Concurrent governance-page native reads must all succeed');
console.log('PASS concurrent governance-page native reads:15/15');
