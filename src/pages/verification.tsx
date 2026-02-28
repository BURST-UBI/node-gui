import { useState } from "react";
import { ShieldCheck, Search, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRpc, useRpcUrl } from "@/hooks/use-rpc";
import {
  formatTimestamp,
  formatAmount,
  truncateAddress,
} from "@/lib/utils";
import type { VerificationActivity, AccountVerification } from "@/lib/types";

function resultBadge(result: string) {
  const lower = result.toLowerCase();
  if (lower === "verified" || lower === "legitimate")
    return <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-400 text-xs">{result}</Badge>;
  if (lower === "rejected" || lower === "illegitimate")
    return <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-400 text-xs">{result}</Badge>;
  return <Badge variant="outline" className="text-xs">{result}</Badge>;
}

function statusBadge(status: string) {
  const lower = status.toLowerCase();
  if (lower === "active")
    return <Badge variant="outline" className="border-blue-500/50 bg-blue-500/10 text-blue-400 text-xs">{status}</Badge>;
  if (lower === "succeeded")
    return <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-400 text-xs">{status}</Badge>;
  if (lower === "failed")
    return <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-400 text-xs">{status}</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
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
    if (trimmed) setActiveAddr(trimmed);
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Verification activity is not available on this node.
          </p>
          <p className="mt-2 text-xs text-muted-foreground/80">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const isLoading = loading && !data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active Verifications", value: data?.active_verifications, color: "text-blue-400" },
          { label: "Pending Endorsements", value: data?.pending_endorsements, color: "text-amber-400" },
          { label: "Active Challenges", value: data?.active_challenges, color: "text-red-400" },
          { label: "Verifier Pool Size", value: data?.verifier_pool_size, color: "text-cyan-400" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className={`text-2xl font-bold font-mono ${stat.color}`}>
                  {stat.value?.toLocaleString() ?? "—"}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {data && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Verified
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono text-green-400">
                {data.total_verified.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revoked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono text-red-400">
                {data.total_revoked.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {data && (
        <Tabs defaultValue="verifications">
          <TabsList>
            <TabsTrigger value="verifications">Recent Verifications</TabsTrigger>
            <TabsTrigger value="endorsements">Recent Endorsements</TabsTrigger>
            <TabsTrigger value="challenges">Recent Challenges</TabsTrigger>
          </TabsList>

          <TabsContent value="verifications">
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
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="pb-2 pr-4 font-medium">Account</th>
                          <th className="pb-2 pr-4 font-medium">Result</th>
                          <th className="pb-2 pr-4 font-medium">Verifiers</th>
                          <th className="pb-2 font-medium">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.recent_verifications.map((v, i) => (
                          <tr key={`${v.account}-${i}`} className="hover:bg-muted/50">
                            <td className="py-2.5 pr-4 font-mono text-xs">
                              {truncateAddress(v.account)}
                            </td>
                            <td className="py-2.5 pr-4">{resultBadge(v.result)}</td>
                            <td className="py-2.5 pr-4 font-mono text-xs">
                              {v.verifier_count}
                            </td>
                            <td className="py-2.5 text-xs text-muted-foreground">
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
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="pb-2 pr-4 font-medium">Endorser</th>
                          <th className="pb-2 pr-4 font-medium">Target</th>
                          <th className="pb-2 pr-4 font-medium">Amount Burned</th>
                          <th className="pb-2 font-medium">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.recent_endorsements.map((e, i) => (
                          <tr key={`${e.endorser}-${i}`} className="hover:bg-muted/50">
                            <td className="py-2.5 pr-4 font-mono text-xs">
                              {truncateAddress(e.endorser)}
                            </td>
                            <td className="py-2.5 pr-4 font-mono text-xs">
                              {truncateAddress(e.target)}
                            </td>
                            <td className="py-2.5 pr-4 font-mono text-xs text-amber-400">
                              {formatAmount(e.amount)} BRN
                            </td>
                            <td className="py-2.5 text-xs text-muted-foreground">
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
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="pb-2 pr-4 font-medium">Challenger</th>
                          <th className="pb-2 pr-4 font-medium">Target</th>
                          <th className="pb-2 pr-4 font-medium">Stake</th>
                          <th className="pb-2 pr-4 font-medium">Status</th>
                          <th className="pb-2 font-medium">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.recent_challenges.map((c, i) => (
                          <tr key={`${c.challenger}-${i}`} className="hover:bg-muted/50">
                            <td className="py-2.5 pr-4 font-mono text-xs">
                              {truncateAddress(c.challenger)}
                            </td>
                            <td className="py-2.5 pr-4 font-mono text-xs">
                              {truncateAddress(c.target)}
                            </td>
                            <td className="py-2.5 pr-4 font-mono text-xs">
                              {formatAmount(c.stake)} BRN
                            </td>
                            <td className="py-2.5 pr-4">{statusBadge(c.status)}</td>
                            <td className="py-2.5 text-xs text-muted-foreground">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Verification Lookup</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLookup} className="flex gap-2">
            <Input
              value={lookupAddr}
              onChange={(e) => setLookupAddr(e.target.value)}
              placeholder="burst_3abc...xyz"
              className="font-mono"
            />
            <Button type="submit" disabled={!lookupAddr.trim()}>
              <Search className="h-4 w-4" />
              Check
            </Button>
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
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs break-all">
                  {accountVerif.data.account}
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs ${
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
                  <Badge variant="outline" className="border-red-500/40 text-red-400 text-xs">
                    Challenge Active
                  </Badge>
                )}
              </div>

              <dl className="grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground text-xs">Endorsements</dt>
                  <dd className="font-mono">
                    {accountVerif.data.endorsement_count} / {accountVerif.data.endorsement_threshold}
                  </dd>
                </div>
                {accountVerif.data.verified_at && (
                  <div>
                    <dt className="text-muted-foreground text-xs">Verified At</dt>
                    <dd className="font-mono text-xs">
                      {formatTimestamp(accountVerif.data.verified_at)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground text-xs">Verifier Votes</dt>
                  <dd className="font-mono">{accountVerif.data.verifier_votes.length}</dd>
                </div>
              </dl>

              {accountVerif.data.endorsers.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Endorsers</p>
                  <div className="flex flex-wrap gap-1">
                    {accountVerif.data.endorsers.map((e) => (
                      <span key={e} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                        {truncateAddress(e)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {accountVerif.data.verifier_votes.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Votes</p>
                  <div className="space-y-1">
                    {accountVerif.data.verifier_votes.map((v) => (
                      <div key={v.verifier} className="flex items-center justify-between text-xs">
                        <span className="font-mono text-muted-foreground">
                          {truncateAddress(v.verifier)}
                        </span>
                        <Badge variant="outline" className="text-[10px]">{v.vote}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border-l-4 border-primary bg-muted/50 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              BURST uses a two-phase verification system.
            </p>
            <p className="mt-1">
              Endorsers permanently burn BRN to vouch for a wallet's humanity, then random
              verifiers vote Legitimate/Illegitimate/Neither. Challenges can be filed at any time
              by staking BRN. When fraud is detected, the merger graph enables retroactive TRST
              revocation — all TRST originating from the sybil is proportionally invalidated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
