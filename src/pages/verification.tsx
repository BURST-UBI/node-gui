import { ContextHelp } from "@/components/context-help";
import { MetricGroup, MetricItem } from "@/components/metric-group";
import { Identifier } from "@/components/identifier";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { HelpLabel } from "@/components/help-label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRpc, useRpcUrl } from "@/hooks/use-rpc";
import {
  formatTimestamp,
  formatAmount,
} from "@/lib/utils";
import type { VerificationActivity, AccountVerification } from "@/lib/types";

function resultBadge(result: string) {
  const lower = result.toLowerCase();
  if (lower === "verified" || lower === "legitimate")
    return <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-400 text-caption">{result}</Badge>;
  if (lower === "rejected" || lower === "illegitimate")
    return <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-400 text-caption">{result}</Badge>;
  return <Badge variant="outline" className="text-caption">{result}</Badge>;
}

function statusBadge(status: string) {
  const lower = status.toLowerCase();
  if (lower === "active")
    return <Badge variant="outline" className="border-blue-500/50 bg-blue-500/10 text-blue-400 text-caption">{status}</Badge>;
  if (lower === "succeeded")
    return <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-400 text-caption">{status}</Badge>;
  if (lower === "failed")
    return <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-400 text-caption">{status}</Badge>;
  return <Badge variant="outline" className="text-caption">{status}</Badge>;
}

export default function Verification() {
  const { rpcUrl } = useRpcUrl();
  const { data, loading, error } = useRpc<VerificationActivity>(
    "get_verification_activity",
    { rpcUrl },
    15000,
  );

  const [lookupAddr, setLookupAddr] = useState("");
  const [activeAddr, setActiveAddr] = useState<string | null>(null);
  const accountVerif = useRpc<AccountVerification>(
    "get_account_verification",
    activeAddr ? { rpcUrl, account: activeAddr } : null,
  );

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = lookupAddr.trim();
    if (trimmed === activeAddr) accountVerif.refetch();
    if (trimmed) setActiveAddr(trimmed);
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Verification activity is not available on this node.
          </p>
          <p className="mt-2 text-caption text-muted-foreground/80">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const isLoading = loading && !data;

  return (
    <div className="verification-page space-y-6">
      <MetricGroup aria-label="Verification summary">
        {[
          { label: "Verified", value: data?.total_verified, explanation: "Total verified accounts known to this node." },
          { label: "Revoked", value: data?.total_revoked, explanation: "Total revoked accounts known to this node." },
          { label: "Verifying", value: data?.active_verifications, explanation: "Accounts with an active verification." },
          { label: "Endorsements", value: data?.pending_endorsements, explanation: "Pending endorsements." },
          { label: "Challenges", value: data?.active_challenges, explanation: "Active challenges to account verification." },
          { label: "Verifiers", value: data?.verifier_pool_size, explanation: "Number of verifiers in the pool." },
        ].map((stat) => (
          <MetricItem key={stat.label} label={<HelpLabel label={stat.label} explanation={stat.explanation} />}>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                stat.value?.toLocaleString() ?? "—"
              )}
          </MetricItem>
        ))}
      </MetricGroup>

      <section className="verification-lookup" aria-label="Account lookup">
        <form onSubmit={handleLookup} className="space-y-2">
          <label htmlFor="verification-account" className="block text-sm">Account lookup</label>
          <div className="flex gap-2">
            <Input
              id="verification-account"
              aria-label="Account address"
              value={lookupAddr}
              onChange={(e) => setLookupAddr(e.target.value)}
              placeholder="brst_…"
              spellCheck={false}
              autoComplete="off"
            />
            <Button type="submit" variant="secondary" disabled={!lookupAddr.trim() || accountVerif.loading}>
              Check
            </Button>
          </div>
        </form>

        {accountVerif.loading && (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {accountVerif.error && (
          <p className="mt-4 text-sm text-muted-foreground">
            Verification lookup failed. {accountVerif.error}
          </p>
        )}

        {accountVerif.data && (
          <div className="mt-4 rounded-md border p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-caption break-all">
                {accountVerif.data.account}
              </span>
              <Badge
                variant="outline"
                className={`text-caption ${
                  accountVerif.data.state.toLowerCase() === "verified"
                    ? "border-green-500/50 bg-green-500/10 text-green-400"
                    : accountVerif.data.state.toLowerCase() === "revoked"
                      ? "border-red-500/50 bg-red-500/10 text-red-400"
                      : ""
                }`}
              >
                {accountVerif.data.state}
              </Badge>
              {accountVerif.data.challenge_active && (
                <Badge variant="outline" className="border-red-500/40 text-red-400 text-caption">
                  Challenge Active
                </Badge>
              )}
            </div>

            {accountVerif.data.selection_available !== true && <p role="status" className="text-ui text-muted-foreground">{accountVerif.data.selection_available === false ? "Verifier selection is paused on this node." : "This node hasn't reported verifier-selection availability."}</p>}
            <dl className="grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground text-caption">Endorsements</dt>
                <dd className="font-mono">
                  {accountVerif.data.endorsement_count} / {accountVerif.data.endorsement_threshold ?? "—"}
                </dd>
              </div>
              {accountVerif.data.verified_at && (
                <div>
                  <dt className="text-muted-foreground text-caption">Verified At</dt>
                  <dd className="font-mono text-caption">
                    {formatTimestamp(accountVerif.data.verified_at)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground text-caption">Verifier Votes</dt>
                <dd className="font-mono">{accountVerif.data.verifier_votes.length}</dd>
              </div>
            </dl>

            {accountVerif.data.endorsers.length > 0 && (
              <div>
                <p className="mb-1 text-caption font-normal text-muted-foreground">Endorsers</p>
                <div className="flex flex-wrap gap-1">
                  {accountVerif.data.endorsers.map((e) => (
                    <span key={e} className="rounded bg-muted px-1.5 py-0.5 font-mono text-caption">
                      <Identifier value={e} />
                    </span>
                  ))}
                </div>
              </div>
            )}

            {accountVerif.data.verifier_votes.length > 0 && (
              <div>
                <p className="mb-1 text-caption font-normal text-muted-foreground">Votes</p>
                <div className="space-y-1">
                  {accountVerif.data.verifier_votes.map((v) => (
                    <div key={v.verifier} className="flex items-center justify-between text-caption">
                      <span className="font-mono text-muted-foreground">
                        <Identifier value={v.verifier} />
                      </span>
                      <Badge variant="outline" className="text-caption">{v.vote}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {data && (
        <Tabs defaultValue="verifications" className="verification-activity">
          <TabsList className="activity-tabs" aria-label="Recent activity">
            <TabsTrigger value="verifications">Verifications</TabsTrigger>
            <TabsTrigger value="endorsements">Endorsements</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
          </TabsList>

          <TabsContent value="verifications" className="verification-results">
            <Card>
              <CardContent className="pt-6">
                {data.recent_verifications.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No recent verifications
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-start text-caption text-muted-foreground">
                          <th className="pb-2 pr-4 font-normal">Account</th>
                          <th className="pb-2 pr-4 font-normal">Result</th>
                          <th className="pb-2 pr-4 font-normal">Verifiers</th>
                          <th className="pb-2 font-normal">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.recent_verifications.map((v, i) => (
                          <tr key={`${v.account}-${i}`} className="hover:bg-muted/50">
                            <td data-label="Account" className="py-2.5 pr-4 font-mono text-caption">
                              <Identifier value={v.account} />
                            </td>
                            <td data-label="Result" className="py-2.5 pr-4">{resultBadge(v.result)}</td>
                            <td data-label="Verifiers" className="py-2.5 pr-4 font-mono text-caption">
                              {v.verifier_count}
                            </td>
                            <td data-label="Time" className="py-2.5 text-caption text-muted-foreground">
                              {formatTimestamp(v.timestamp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="endorsements">
            <Card>
              <CardContent className="pt-6">
                {data.recent_endorsements.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No recent endorsements
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-start text-caption text-muted-foreground">
                          <th className="pb-2 pr-4 font-normal">Endorser</th>
                          <th className="pb-2 pr-4 font-normal">Target</th>
                          <th className="pb-2 pr-4 font-normal">BRN burned</th>
                          <th className="pb-2 font-normal">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.recent_endorsements.map((e, i) => (
                          <tr key={`${e.endorser}-${i}`} className="hover:bg-muted/50">
                            <td data-label="Endorser" className="py-2.5 pr-4 font-mono text-caption">
                              <Identifier value={e.endorser} />
                            </td>
                            <td data-label="Target" className="py-2.5 pr-4 font-mono text-caption">
                              <Identifier value={e.target} />
                            </td>
                            <td data-label="BRN burned" className="py-2.5 pr-4 font-mono text-caption text-amber-400">
                              {formatAmount(e.amount)} BRN
                            </td>
                            <td data-label="Time" className="py-2.5 text-caption text-muted-foreground">
                              {formatTimestamp(e.timestamp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="challenges">
            <Card>
              <CardContent className="pt-6">
                {data.recent_challenges.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No recent challenges
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-start text-caption text-muted-foreground">
                          <th className="pb-2 pr-4 font-normal">Challenger</th>
                          <th className="pb-2 pr-4 font-normal">Target</th>
                          <th className="pb-2 pr-4 font-normal">Stake</th>
                          <th className="pb-2 pr-4 font-normal">Status</th>
                          <th className="pb-2 font-normal">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.recent_challenges.map((c, i) => (
                          <tr key={`${c.challenger}-${i}`} className="hover:bg-muted/50">
                            <td data-label="Challenger" className="py-2.5 pr-4 font-mono text-caption">
                              <Identifier value={c.challenger} />
                            </td>
                            <td data-label="Target" className="py-2.5 pr-4 font-mono text-caption">
                              <Identifier value={c.target} />
                            </td>
                            <td data-label="Stake" className="py-2.5 pr-4 font-mono text-caption">
                              {formatAmount(c.stake)} BRN
                            </td>
                            <td data-label="Status" className="py-2.5 pr-4">{statusBadge(c.status)}</td>
                            <td data-label="Time" className="py-2.5 text-caption text-muted-foreground">
                              {formatTimestamp(c.timestamp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <ContextHelp summary="How verification works">
        <p>Endorsers permanently burn BRN to vouch for a wallet’s humanity. Random verifiers then vote Legitimate, Illegitimate, or Neither.</p>
        <p>Challenges can be filed at any time by staking BRN. If fraud is confirmed, TRST originating from the fraudulent identity is proportionally revoked through the merger graph.</p>
      </ContextHelp>
    </div>
  );
}
