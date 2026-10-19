export interface Telemetry {
  network?: string | null;
  faucet_enabled?: boolean;
  block_count: number;
  account_count: number;
  peer_count: number;
  protocol_version: number;
  uptime_secs: number;
  verified_count: number;
  unverified_count: number;
  trst_circulating: string;
  trst_expired_total: string;
  trst_revoked_total: string;
  ntp_offset_ms: number | null;
}

export interface ProtocolParams {
  brn_rate: string;
  trst_expiry_secs: number;
  endorsement_threshold: number;
  verification_threshold: number;
  endorsement_burn_amount: string;
  verifier_stake_amount: string;
  challenge_stake_amount: string;
  max_revotes: number;
  governance_quorum: number;
  governance_supermajority: number;
  governance_proposal_window_secs: number;
  governance_voting_window_secs: number;
  governance_cooldown_secs: number;
  spending_limit_new_wallets: string;
}

export interface Peer {
  address: string;
  protocol_version: number | null;
  node_id: string;
  clock_offset_ms: number | null;
  last_seen: number;
  connection_type: string;
}

export interface PeerList {
  peers: Peer[];
  count: number;
}

export interface BlockInfo {
  block_type: string;
  account: string;
  previous: string;
  representative: string;
  /** Ascending odometer of cumulative BRN spent (burned+staked) — NOT available balance. */
  brn_balance: string;
  trst_balance: string;
  link: string;
  origin: string;
  destination: string;
  amount: string;
  timestamp: number;
  confirmed: boolean;
}

export interface AccountInfo {
  address: string;
  /** Spendable BRN computed by the account RPC (not the state-block odometer). */
  brn_balance: string;
  trst_balance: string;
  trst_expired: string;
  trst_revoked: string;
  total_brn_burned: string;
  total_brn_staked: string;
  verification_state: string;
  verified_at: number | null;
  block_count: number;
  confirmation_height: number;
  representative: string;
}

export interface AccountBalance {
  /** Spendable BRN computed by the account RPC. */
  brn_balance: string;
  trst_balance: string;
}

export interface HistoryEntry {
  hash: string;
  block_type: string;
  account: string;
  amount: string;
  timestamp: number;
  origin?: string;
  link?: string;
  destination?: string;
}

export interface AccountHistory {
  account: string;
  history: HistoryEntry[];
  cursor?: string;
}

export interface RecentVerification {
  account: string;
  result: string;
  timestamp: number;
  verifier_count: number;
}

export interface RecentEndorsement {
  endorser: string;
  target: string;
  amount: string;
  timestamp: number;
}

export interface RecentChallenge {
  challenger: string;
  target: string;
  stake: string;
  status: string;
  timestamp: number;
}

export interface VerificationActivity {
  active_verifications: number;
  pending_endorsements: number;
  active_challenges: number;
  verifier_pool_size: number;
  total_verified: number;
  total_revoked: number;
  recent_verifications: RecentVerification[];
  recent_endorsements: RecentEndorsement[];
  recent_challenges: RecentChallenge[];
}

export interface VerifierVote {
  verifier: string;
  vote: string;
  timestamp: number;
}

export interface AccountVerification {
  account: string;
  state: string;
  verified_at: number | null;
  endorsement_count: number;
  endorsement_threshold: number | null;
  endorsers: string[];
  verifier_votes: VerifierVote[];
  challenge_active: boolean;
  selection_available?: boolean | null;
}

export interface Proposal {
  hash: string;
  proposer: string;
  phase: string;
  description: string;
  param: string;
  proposed_value: string;
  votes_yea: number;
  votes_nay: number;
  votes_abstain: number;
  created_at: number;
  phase_deadline: number;
}

export interface ProposalList {
  proposals: Proposal[];
  cursor?: string;
}

export interface ConstiArticle {
  id: string;
  title: string;
  text: string;
  adopted_at: number | null;
  amended_at?: number | null;
}

export interface Consti {
  articles: ConstiArticle[];
  amendment_threshold: string;
}

export interface Representative {
  account: string;
  weight: string;
  delegator_count: number;
}

export interface RepresentativeList {
  representatives: Representative[];
}

export interface MergerGraphStats {
  total_origins: number;
  total_merges: number;
  total_active_chains: number;
  total_revoked_origins: number;
  avg_chain_depth: number;
  max_chain_depth: number;
}

export interface ForwardMerge {
  merge_hash: string;
  holder: string | null;
  amount: string;
  timestamp: number;
}

export interface OriginTrace {
  origin: string;
  originator: string;
  timestamp: number;
  amount: string;
  status: string;
  forward_merges: ForwardMerge[];
}
