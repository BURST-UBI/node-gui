import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useRpc, useRpcUrl } from "@/hooks/use-rpc";
import { formatAmount, formatExpiryPeriod, formatDuration, formatPercent } from "@/lib/utils";
import type { ProtocolParams } from "@/lib/types";

interface ParamRowProps {
  label: string;
  value: string;
  description: string;
  accent?: string;
}

function ParamRow({ label, value, description, accent }: ParamRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <span className={`shrink-0 font-mono text-sm font-semibold ${accent ?? ""}`}>
        {value}
      </span>
    </div>
  );
}

export default function Parameters() {
  const { rpcUrl } = useRpcUrl();
  const { data, loading, error } = useRpc<ProtocolParams>(
    "get_protocol_params",
    { rpcUrl },
    30000,
  );

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Protocol parameters are not available on this node.
          </p>
          <p className="mt-2 text-xs text-muted-foreground/80">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Economic Parameters</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <ParamRow
            label="BRN Accrual Rate"
            value={`${formatAmount(data.brn_rate)} / sec`}
            description="BRN accrued per second per verified wallet. BRN = rate × (now − verified_at) − total_burned."
            accent="text-amber-400"
          />
          <ParamRow
            label="TRST Expiry Period"
            value={formatExpiryPeriod(data.trst_expiry_secs)}
            description="How long TRST remains transferable after creation. Value declines as expiry approaches."
            accent="text-cyan-400"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verification Parameters</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <ParamRow
            label="Endorsement Threshold"
            value={String(data.endorsement_threshold)}
            description="Number of endorsements required before verification voting begins."
          />
          <ParamRow
            label="Verification Threshold"
            value={formatPercent(data.verification_threshold)}
            description="Supermajority of verifier votes required to confirm humanity (~90%)."
          />
          <ParamRow
            label="Endorsement Burn Amount"
            value={`${formatAmount(data.endorsement_burn_amount)} BRN`}
            description="BRN permanently burned by each endorser. Skin-in-the-game commitment."
            accent="text-amber-400"
          />
          <ParamRow
            label="Verifier Stake Amount"
            value={`${formatAmount(data.verifier_stake_amount)} BRN`}
            description="BRN temporarily staked by each randomly-selected verifier during voting."
          />
          <ParamRow
            label="Challenge Stake Amount"
            value={`${formatAmount(data.challenge_stake_amount)} BRN`}
            description="BRN staked to challenge a wallet's verification. Lost if challenge fails."
          />
          <ParamRow
            label="Max Revotes"
            value={String(data.max_revotes)}
            description="Maximum number of revote rounds allowed during a verification."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Governance Parameters</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <ParamRow
            label="Quorum"
            value={formatPercent(data.governance_quorum)}
            description="Minimum participation required for a governance vote to be valid."
          />
          <ParamRow
            label="Supermajority"
            value={formatPercent(data.governance_supermajority)}
            description="Percentage of yea votes required to pass a proposal."
          />
          <ParamRow
            label="Proposal Window"
            value={formatDuration(data.governance_proposal_window_secs)}
            description="Duration of the proposal collection phase."
          />
          <ParamRow
            label="Voting Window"
            value={formatDuration(data.governance_voting_window_secs)}
            description="Duration of the active voting phase."
          />
          <ParamRow
            label="Cooldown Period"
            value={formatDuration(data.governance_cooldown_secs)}
            description="Mandatory delay between vote conclusion and parameter activation."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Other</CardTitle>
        </CardHeader>
        <CardContent>
          <ParamRow
            label="Spending Limit for New Wallets"
            value={`${formatAmount(data.spending_limit_new_wallets)} TRST`}
            description="Maximum TRST a newly verified wallet can transact before building history."
          />
        </CardContent>
      </Card>

      <div className="rounded-lg border-l-4 border-primary bg-muted/50 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">All parameters are democratically governable.</p>
            <p className="mt-1">
              Any verified wallet can propose a change. Changes follow the 4-phase process:
              Proposal → Voting → Cooldown → Activation. The BRN rate and TRST expiry period
              together span the full economic spectrum — from pure capitalism to pure communism.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
