import { useState } from "react";
import { GitBranch, Search, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRpc, useRpcUrl } from "@/hooks/use-rpc";
import {
  formatTimestamp,
  formatAmount,
  truncateHash,
  truncateAddress,
} from "@/lib/utils";
import type { MergerGraphStats, OriginTrace } from "@/lib/types";

function originStatusBadge(status: string) {
  const lower = status.toLowerCase();
  if (lower === "active" || lower === "live")
    return <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-400 text-xs">{status}</Badge>;
  if (lower === "revoked")
    return <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-400 text-xs">{status}</Badge>;
  if (lower === "expired")
    return <Badge variant="outline" className="border-zinc-500/50 bg-zinc-500/10 text-zinc-400 text-xs">{status}</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

export default function MergerGraph() {
  const { rpcUrl } = useRpcUrl();
  const { data, loading, error } = useRpc<MergerGraphStats>(
    "get_merger_graph_stats",
    { rpcUrl },
    15000,
  );

  const [originHash, setOriginHash] = useState("");
  const [activeOrigin, setActiveOrigin] = useState<string | null>(null);
  const trace = useRpc<OriginTrace>(
    "trace_origin",
    activeOrigin ? { rpcUrl, origin: activeOrigin } : null,
  );

  function handleTrace(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = originHash.trim();
    if (trimmed) setActiveOrigin(trimmed);
  }

  const isLoading = loading && !data;

  return (
    <div className="space-y-6">
      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Merger graph stats are not available on this node.
            </p>
            <p className="mt-2 text-xs text-muted-foreground/80">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Origins", value: data?.total_origins, color: "text-cyan-400" },
          { label: "Total Merges", value: data?.total_merges, color: "text-teal-400" },
          { label: "Active Chains", value: data?.total_active_chains, color: "text-green-400" },
          { label: "Revoked Origins", value: data?.total_revoked_origins, color: "text-red-400" },
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Chain Depth
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl font-bold font-mono">
                {data?.avg_chain_depth.toFixed(1) ?? "—"}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Maximum Chain Depth
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl font-bold font-mono">
                {data?.max_chain_depth ?? "—"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <GitBranch className="h-4 w-4" />
            Origin Trace
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTrace} className="flex gap-2">
            <Input
              value={originHash}
              onChange={(e) => setOriginHash(e.target.value)}
              placeholder="Origin hash (burn transaction)..."
              className="font-mono"
            />
            <Button type="submit" disabled={!originHash.trim()}>
              <Search className="h-4 w-4" />
              Trace
            </Button>
          </form>

          {trace.loading && (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {trace.error && (
            <p className="mt-4 text-sm text-muted-foreground">
              Origin trace is not available on this node. {trace.error}
            </p>
          )}

          {trace.data && (
            <div className="mt-4 space-y-4">
              <div className="rounded-md border p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-medium">Origin</span>
                  {originStatusBadge(trace.data.status)}
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground text-xs">Origin Hash</dt>
                    <dd className="mt-0.5 font-mono text-xs break-all">
                      {trace.data.origin}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground text-xs">Originator</dt>
                    <dd className="mt-0.5 font-mono text-xs break-all">
                      {trace.data.originator}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Amount</dt>
                    <dd className="mt-0.5 font-mono font-medium">
                      {formatAmount(trace.data.amount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Timestamp</dt>
                    <dd className="mt-0.5 font-mono text-sm">
                      {formatTimestamp(trace.data.timestamp)}
                    </dd>
                  </div>
                </dl>
              </div>

              {trace.data.forward_merges.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium">
                    Forward Merges ({trace.data.forward_merges.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="pb-2 pr-4 font-medium">Merge Hash</th>
                          <th className="pb-2 pr-4 font-medium">Current Holder</th>
                          <th className="pb-2 pr-4 font-medium">Amount</th>
                          <th className="pb-2 font-medium">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {trace.data.forward_merges.map((m) => (
                          <tr key={m.merge_hash} className="hover:bg-muted/50">
                            <td className="py-2.5 pr-4 font-mono text-xs">
                              {truncateHash(m.merge_hash)}
                            </td>
                            <td className="py-2.5 pr-4 font-mono text-xs">
                              {truncateAddress(m.holder)}
                            </td>
                            <td className="py-2.5 pr-4 font-mono text-xs font-medium">
                              {formatAmount(m.amount)}
                            </td>
                            <td className="py-2.5 text-xs text-muted-foreground">
                              {formatTimestamp(m.timestamp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {trace.data.forward_merges.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No forward merges found — TRST remains with the original burner.
                </p>
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
              The merger graph is BURST's inverse index for TRST provenance.
            </p>
            <p className="mt-1">
              It maps from burn origins forward to every merge that consumed them, all the way
              to current live balances. When a sybil is caught, the network traces forward from
              the fraudulent origin and revokes all tainted TRST proportionally. The cost of
              fraud is paid once at catch time, not repeatedly at every transaction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
