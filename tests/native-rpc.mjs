import assert from 'node:assert/strict';
const session = process.env.WEBDRIVER_SESSION;
assert(session);
const rpcUrl = process.env.NODE_RPC_URL || 'http://127.0.0.1:29077';
const account = process.env.NODE_ACCOUNT || 'brst_9fo4hh8gptk4tro5o5a4nurfgfkm67dq5qj69bjtr36c54tsuanif4gtwduq';
const {value} = await (await fetch(`http://127.0.0.1:4446/session/${session}/execute/async`, {
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({args:[rpcUrl,account],script:`
    const rpcUrl=arguments[0], account=arguments[1];
    const done=arguments[arguments.length-1];
    (async()=>{
      const commands=['get_telemetry','get_protocol_params','get_peers','get_verification_activity','get_governance_proposals','get_consti','get_merger_graph_stats','get_representatives'];
      const results={};
      for(const command of commands){try {results[command]={ok:true,data:await window.__TAURI_INTERNALS__.invoke(command,{rpcUrl})};}catch(e){results[command]={ok:false,error:String(e)};}}
      const invoke=window.__TAURI_INTERNALS__.invoke;
      for(const command of ['get_account_info','get_account_balance','get_account_verification','get_account_history']) {
        try {results[command]={ok:true,data:await invoke(command,{rpcUrl,account,count:50,cursor:null})};}catch(e){results[command]={ok:false,error:String(e)};}
      }
      const burns=(results.get_account_history.data?.history ?? []).filter(b=>b.block_type.toLowerCase()==='burn');
      for(const burn of burns) {
        try {const trace=await invoke('trace_origin',{rpcUrl,origin:burn.hash});results.trace_origin={ok:true,data:trace};if(trace.forward_merges.length)break;}catch(e){results.trace_origin={ok:false,error:String(e)};}
      }
      if(burns[0]){try{results.get_block_info={ok:true,data:await invoke('get_block_info',{rpcUrl,hash:burns[0].hash})};}catch(e){results.get_block_info={ok:false,error:String(e)};}}
      return results;
    })().then(done,e=>done({error:String(e)}));
  `}),
})).json();
console.log(Object.entries(value ?? {}).map(([command,result])=>`${result.ok ? 'PASS' : 'FAIL'} ${command}${result.error ? ': '+result.error : ''}`).join('\n'));
assert(!value?.error);
assert(Object.values(value).every(v=>v.ok), 'Some native dashboard RPC contracts failed');
const verification = value.get_account_verification.data;
assert.equal(typeof verification.state,'string');
assert.equal(typeof verification.endorsement_count,'number');
assert.equal(typeof verification.endorsement_threshold,'number');
assert.equal(typeof verification.selection_available,'boolean');
assert.equal(verification.selection_available, process.env.NODE_SELECTION_ENABLED === '1');
assert(Array.isArray(verification.endorsers));
assert(Array.isArray(verification.verifier_votes));
assert.equal(verification.status,undefined);
assert.equal(verification.endorser_count,undefined);
console.log('PASS native verification response matches the rendered field names and capability');
