use serde::{Deserialize, Serialize};

async fn rpc_call(url: &str, body: serde_json::Value) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let resp = client
        .post(url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("RPC request failed: {e}"))?;
    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Invalid JSON response: {e}"))?;
    if let Some(err) = json.get("error").and_then(|e| e.as_str()) {
        return Err(format!("Node error: {err}"));
    }
    Ok(json.get("result").cloned().unwrap_or(json))
}

// ── Network overview ────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct Telemetry {
    pub block_count: u64,
    pub account_count: u64,
    pub peer_count: u64,
    pub protocol_version: u64,
    pub uptime_secs: u64,
    #[serde(default)]
    pub verified_count: u64,
    #[serde(default)]
    pub unverified_count: u64,
    #[serde(default)]
    pub trst_circulating: String,
    #[serde(default)]
    pub trst_expired_total: String,
    #[serde(default)]
    pub trst_revoked_total: String,
    #[serde(default)]
    pub ntp_offset_ms: i64,
}

#[tauri::command]
pub async fn get_telemetry(rpc_url: String) -> Result<Telemetry, String> {
    let result = rpc_call(&rpc_url, serde_json::json!({"action": "telemetry"})).await?;
    serde_json::from_value(result).map_err(|e| format!("Parse error: {e}"))
}

// ── Protocol parameters ─────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct ProtocolParams {
    pub brn_rate: String,
    pub trst_expiry_secs: u64,
    pub endorsement_threshold: u32,
    pub verification_threshold: u32,
    pub endorsement_burn_amount: String,
    pub verifier_stake_amount: String,
    pub challenge_stake_amount: String,
    pub max_revotes: u32,
    pub governance_quorum: String,
    pub governance_supermajority: String,
    pub governance_proposal_window_secs: u64,
    pub governance_voting_window_secs: u64,
    pub governance_cooldown_secs: u64,
    pub spending_limit_new_wallets: String,
}

#[tauri::command]
pub async fn get_protocol_params(rpc_url: String) -> Result<ProtocolParams, String> {
    let result = rpc_call(
        &rpc_url,
        serde_json::json!({"action": "protocol_params"}),
    )
    .await
    .map_err(|e| format!("RPC not available: {e}"))?;
    serde_json::from_value(result).map_err(|e| format!("Parse error: {e}"))
}

// ── Peers with clock sync ───────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct PeerInfo {
    pub address: String,
    #[serde(default)]
    pub protocol_version: u64,
    #[serde(default)]
    pub node_id: String,
    #[serde(default)]
    pub clock_offset_ms: i64,
    #[serde(default)]
    pub last_seen: u64,
    #[serde(default)]
    pub connection_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PeerList {
    pub peers: Vec<PeerInfo>,
    pub count: u64,
}

#[tauri::command]
pub async fn get_peers(rpc_url: String) -> Result<PeerList, String> {
    let result = rpc_call(&rpc_url, serde_json::json!({"action": "peers_detailed"})).await;
    match result {
        Ok(val) => serde_json::from_value(val).map_err(|e| format!("Parse error: {e}")),
        Err(_) => {
            let fallback =
                rpc_call(&rpc_url, serde_json::json!({"action": "peers"})).await?;
            if let Some(peers_arr) = fallback.get("peers").and_then(|p| p.as_array()) {
                let peers: Vec<PeerInfo> = peers_arr
                    .iter()
                    .filter_map(|p| {
                        p.as_str().map(|addr| PeerInfo {
                            address: addr.to_string(),
                            protocol_version: 0,
                            node_id: String::new(),
                            clock_offset_ms: 0,
                            last_seen: 0,
                            connection_type: String::new(),
                        })
                    })
                    .collect();
                let count = peers.len() as u64;
                Ok(PeerList { peers, count })
            } else {
                serde_json::from_value(fallback).map_err(|e| format!("Parse error: {e}"))
            }
        }
    }
}

// ── Block explorer ──────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct BlockInfo {
    pub block_type: String,
    pub account: String,
    #[serde(default)]
    pub previous: String,
    #[serde(default)]
    pub representative: String,
    #[serde(default)]
    pub brn_balance: String,
    #[serde(default)]
    pub trst_balance: String,
    #[serde(default)]
    pub link: String,
    #[serde(default)]
    pub origin: String,
    #[serde(default)]
    pub destination: String,
    #[serde(default)]
    pub amount: String,
    #[serde(default)]
    pub timestamp: u64,
    #[serde(default)]
    pub confirmed: bool,
}

#[tauri::command]
pub async fn get_block_info(rpc_url: String, hash: String) -> Result<BlockInfo, String> {
    let result =
        rpc_call(&rpc_url, serde_json::json!({"action": "block_info", "hash": hash})).await?;
    serde_json::from_value(result).map_err(|e| format!("Parse error: {e}"))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AccountInfo {
    pub address: String,
    pub brn_balance: String,
    pub trst_balance: String,
    #[serde(default)]
    pub trst_expired: String,
    #[serde(default)]
    pub trst_revoked: String,
    #[serde(default)]
    pub total_brn_burned: String,
    #[serde(default)]
    pub total_brn_staked: String,
    pub verification_state: String,
    #[serde(default)]
    pub verified_at: Option<u64>,
    pub block_count: u64,
    #[serde(default)]
    pub confirmation_height: u64,
    pub representative: String,
}

#[tauri::command]
pub async fn get_account_info(rpc_url: String, account: String) -> Result<AccountInfo, String> {
    let result = rpc_call(
        &rpc_url,
        serde_json::json!({"action": "account_info", "account": account}),
    )
    .await?;
    serde_json::from_value(result).map_err(|e| format!("Parse error: {e}"))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AccountBalance {
    pub brn_balance: String,
    pub trst_balance: String,
}

#[tauri::command]
pub async fn get_account_balance(
    rpc_url: String,
    account: String,
) -> Result<AccountBalance, String> {
    let result = rpc_call(
        &rpc_url,
        serde_json::json!({"action": "account_balance", "account": account}),
    )
    .await?;
    serde_json::from_value(result).map_err(|e| format!("Parse error: {e}"))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub hash: String,
    pub block_type: String,
    pub account: String,
    pub amount: String,
    pub timestamp: u64,
    #[serde(default)]
    pub origin: Option<String>,
    #[serde(default)]
    pub link: Option<String>,
    #[serde(default)]
    pub destination: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AccountHistory {
    pub account: String,
    pub history: Vec<HistoryEntry>,
    #[serde(default)]
    pub cursor: Option<String>,
}

#[tauri::command]
pub async fn get_account_history(
    rpc_url: String,
    account: String,
    cursor: Option<String>,
    count: u32,
) -> Result<AccountHistory, String> {
    let mut params = serde_json::json!({
        "action": "account_history",
        "account": account,
        "count": count,
    });
    if let Some(c) = cursor {
        params["cursor"] = serde_json::json!(c);
    }
    let result = rpc_call(&rpc_url, params).await?;
    serde_json::from_value(result).map_err(|e| format!("Parse error: {e}"))
}

// ── Verification network activity ───────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct VerificationActivity {
    pub active_verifications: u64,
    pub pending_endorsements: u64,
    pub active_challenges: u64,
    pub verifier_pool_size: u64,
    pub total_verified: u64,
    pub total_revoked: u64,
    #[serde(default)]
    pub recent_verifications: Vec<RecentVerification>,
    #[serde(default)]
    pub recent_endorsements: Vec<RecentEndorsement>,
    #[serde(default)]
    pub recent_challenges: Vec<RecentChallenge>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecentVerification {
    pub account: String,
    pub result: String,
    pub timestamp: u64,
    pub verifier_count: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecentEndorsement {
    pub endorser: String,
    pub target: String,
    pub amount: String,
    pub timestamp: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecentChallenge {
    pub challenger: String,
    pub target: String,
    pub stake: String,
    pub status: String,
    pub timestamp: u64,
}

#[tauri::command]
pub async fn get_verification_activity(rpc_url: String) -> Result<VerificationActivity, String> {
    let result =
        rpc_call(&rpc_url, serde_json::json!({"action": "verification_activity"})).await?;
    serde_json::from_value(result).map_err(|e| format!("Parse error: {e}"))
}

/// Matches the actual RPC response from verification_status.
#[derive(Debug, Serialize, Deserialize)]
pub struct AccountVerificationDetail {
    pub account: String,
    pub status: String,
    pub verified_at: Option<u64>,
    pub endorser_count: u32,
    pub challenge_active: bool,
    /// Not returned by node; populated from endorsement_threshold param if available.
    #[serde(default)]
    pub endorsement_threshold: Option<u32>,
    #[serde(default)]
    pub endorsers: Vec<String>,
    #[serde(default)]
    pub verifier_votes: Vec<VerifierVoteEntry>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VerifierVoteEntry {
    pub verifier: String,
    pub vote: String,
    pub timestamp: u64,
}

#[tauri::command]
pub async fn get_account_verification(
    rpc_url: String,
    account: String,
) -> Result<AccountVerificationDetail, String> {
    let result = rpc_call(
        &rpc_url,
        serde_json::json!({"action": "verification_status", "account": account}),
    )
    .await?;
    serde_json::from_value(result).map_err(|e| format!("Parse error: {e}"))
}

// ── Governance ──────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct Proposal {
    pub hash: String,
    pub proposer: String,
    pub phase: String,
    pub description: String,
    #[serde(default)]
    pub param: String,
    #[serde(default)]
    pub proposed_value: String,
    #[serde(default)]
    pub votes_yea: u64,
    #[serde(default)]
    pub votes_nay: u64,
    #[serde(default)]
    pub votes_abstain: u64,
    #[serde(default)]
    pub created_at: u64,
    #[serde(default)]
    pub phase_deadline: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProposalList {
    pub proposals: Vec<Proposal>,
    #[serde(default)]
    pub cursor: Option<String>,
}

#[tauri::command]
pub async fn get_governance_proposals(rpc_url: String) -> Result<ProposalList, String> {
    let result =
        rpc_call(&rpc_url, serde_json::json!({"action": "governance_proposals"})).await?;
    serde_json::from_value(result).map_err(|e| format!("Parse error: {e}"))
}

#[tauri::command]
pub async fn get_governance_proposal_info(
    rpc_url: String,
    hash: String,
) -> Result<Proposal, String> {
    let result = rpc_call(
        &rpc_url,
        serde_json::json!({"action": "governance_proposal_info", "hash": hash}),
    )
    .await?;
    serde_json::from_value(result).map_err(|e| format!("Parse error: {e}"))
}

// ── Consti (on-chain constitution) ──────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct ConstiArticle {
    pub id: String,
    pub title: String,
    pub text: String,
    pub adopted_at: u64,
    #[serde(default)]
    pub amended_at: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Consti {
    pub articles: Vec<ConstiArticle>,
    pub amendment_threshold: String,
}

#[tauri::command]
pub async fn get_consti(rpc_url: String) -> Result<Consti, String> {
    let result = rpc_call(&rpc_url, serde_json::json!({"action": "consti"})).await?;
    serde_json::from_value(result).map_err(|e| format!("Parse error: {e}"))
}

// ── Merger Graph ────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct MergerGraphStats {
    pub total_origins: u64,
    pub total_merges: u64,
    pub total_active_chains: u64,
    pub total_revoked_origins: u64,
    pub avg_chain_depth: f64,
    pub max_chain_depth: u64,
}

#[tauri::command]
pub async fn get_merger_graph_stats(rpc_url: String) -> Result<MergerGraphStats, String> {
    let result =
        rpc_call(&rpc_url, serde_json::json!({"action": "merger_graph_stats"})).await?;
    serde_json::from_value(result).map_err(|e| format!("Parse error: {e}"))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OriginTrace {
    pub origin: String,
    pub originator: String,
    pub timestamp: u64,
    pub amount: String,
    pub status: String,
    #[serde(default)]
    pub forward_merges: Vec<MergeEntry>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MergeEntry {
    pub merge_hash: String,
    pub holder: String,
    pub amount: String,
    pub timestamp: u64,
}

#[tauri::command]
pub async fn trace_origin(rpc_url: String, origin: String) -> Result<OriginTrace, String> {
    let result = rpc_call(
        &rpc_url,
        serde_json::json!({"action": "trace_origin", "origin": origin}),
    )
    .await?;
    serde_json::from_value(result).map_err(|e| format!("Parse error: {e}"))
}

// ── Representatives ─────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct Representative {
    pub account: String,
    pub weight: String,
    #[serde(default)]
    pub delegator_count: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RepresentativeList {
    pub representatives: Vec<Representative>,
}

#[tauri::command]
pub async fn get_representatives(rpc_url: String) -> Result<RepresentativeList, String> {
    let result = rpc_call(&rpc_url, serde_json::json!({"action": "representatives"})).await?;
    serde_json::from_value(result).map_err(|e| format!("Parse error: {e}"))
}

// ── Config & Logs ───────────────────────────────────────────────────────

#[tauri::command]
pub async fn read_config(path: String) -> Result<String, String> {
    tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read config: {e}"))
}

#[tauri::command]
pub async fn write_config(path: String, content: String) -> Result<(), String> {
    tokio::fs::write(&path, &content)
        .await
        .map_err(|e| format!("Failed to write config: {e}"))
}

#[tauri::command]
pub async fn read_logs(lines: u32) -> Result<Vec<String>, String> {
    let output = tokio::process::Command::new("journalctl")
        .args([
            "-u",
            "burst-node",
            "--no-pager",
            "-n",
            &lines.to_string(),
            "--output=cat",
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to read logs: {e}"))?;
    let text = String::from_utf8_lossy(&output.stdout);
    Ok(text.lines().map(|l| l.to_string()).collect())
}
