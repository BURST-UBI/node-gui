import { ContextHelp } from "@/components/context-help";
import { MetricGroup, MetricItem } from "@/components/metric-group";
import { HelpLabel } from "@/components/help-label";
import { Identifier } from "@/components/identifier";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRpc, useRpcUrl } from "@/hooks/use-rpc";
import {
  formatTimestamp,
  formatAmount,
} from "@/lib/utils";
import type { MergerGraphStats, OriginTrace } from "@/lib/types";

function originStatusBadge(status: string) {
  const lower = status.toLowerCase();
  if (lower === "active" || lower === "live")
    return <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-400 text-caption">{status}</Badge>;
  if (lower === "revoked")
    return <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-400 text-caption">{status}</Badge>;
  if (lower === "expired")
    return <Badge variant="outline" className="border-zinc-500/50 bg-zinc-500/10 text-zinc-400 text-caption">{status}</Badge>;
  return <Badge variant="outline" className="text-caption">{status}</Badge>;
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
    if (trimmed === activeOrigin) trace.refetch();
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
            <p className="mt-2 text-caption text-muted-foreground/80">{error}</p>
          </CardContent>
        </Card>
      )}

      <MetricGroup aria-label="Origin summary">
        {[
          { label: "Indexed origins", value: data?.total_origins.toLocaleString() },
          { label: "Merges", value: data?.total_merges.toLocaleString() },
          { label: "Active holdings", value: data?.total_active_chains.toLocaleString() },
          { label: "Revoked origins", value: data?.total_revoked_origins.toLocaleString() },
          { label: "Average depth", value: data?.avg_chain_depth.toFixed(1), help: "Average depth of the provenance chains." },
          { label: "Maximum depth", value: data?.max_chain_depth.toLocaleString(), help: "Maximum depth of the provenance chains." },
        ].map(stat => (
          <MetricItem key={stat.label} label={stat.help ? <HelpLabel label={stat.label} explanation={stat.help} /> : stat.label}>
            {isLoading ? <Skeleton className="h-5 w-12" /> : stat.value ?? "—"}
          </MetricItem>
        ))}
      </MetricGroup>

      <section className="max-w-[640px]" aria-label="Origin lookup">
        <form onSubmit={handleTrace} className="form-field">
          <label htmlFor="origin-hash">Trace an origin</label>
          <div className="field-action">
            <Input
              id="origin-hash"
              aria-label="Origin hash"
              value={originHash}
              onChange={(e) => setOriginHash(e.target.value)}
              placeholder="Burn transaction hash"
              spellCheck={false}
              autoComplete="off"
            />
            <Button type="submit" variant="secondary" disabled={!originHash.trim() || trace.loading}>
              Trace
            </Button>
          </div>
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
                <span className="text-sm font-normal">Origin</span>
                {originStatusBadge(trace.data.status)}
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground text-caption">Origin Hash</dt>
                  <dd className="mt-0.5 font-mono text-caption break-all">
                    {trace.data.origin}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground text-caption">Originator</dt>
                  <dd className="mt-0.5 font-mono text-caption break-all">
                    {trace.data.originator}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-caption">Amount</dt>
                  <dd className="mt-0.5 font-mono font-normal">
                    {formatAmount(trace.data.amount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-caption">Timestamp</dt>
                  <dd className="mt-0.5 font-mono text-sm">
                    {formatTimestamp(trace.data.timestamp)}
                  </dd>
                </div>
              </dl>
            </div>

            {trace.data.forward_merges.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-normal">
                  Forward Merges ({trace.data.forward_merges.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-start text-caption text-muted-foreground">
                        <th className="pb-2 pr-4 font-normal">Merge Hash</th>
                        <th className="pb-2 pr-4 font-normal">Current Holder</th>
                        <th className="pb-2 pr-4 font-normal">Amount</th>
                        <th className="pb-2 font-normal">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {trace.data.forward_merges.map((m) => (
                        <tr key={`${m.merge_hash}:${m.holder ?? "consumed"}`} className="hover:bg-muted/50">
                          <td className="py-2.5 pr-4 font-mono text-caption">
                            <Identifier value={m.merge_hash} />
                          </td>
                          <td className="py-2.5 pr-4 font-mono text-caption">
                            {m.holder ? <Identifier value={m.holder} /> : "No held output"}
                          </td>
                          <td className="py-2.5 pr-4 font-mono text-caption font-normal">
                            {formatAmount(m.amount)}
                          </td>
                          <td className="py-2.5 text-caption text-muted-foreground">
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
                No forward merges found.
              </p>
            )}
          </div>
        )}
      </section>

      <ContextHelp summary="How TRST origins work">
        <p>The merger graph traces TRST from its burn origin through merges to current holdings.</p>
        <p>When fraud is confirmed, the network follows the fraudulent origin forward and proportionally revokes the TRST it created. This work happens at detection, not on every transaction.</p>
      </ContextHelp>
    </div>
  );
}
