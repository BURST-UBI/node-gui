import { ContextHelp } from "@/components/context-help";
import { MetricGroup, MetricItem } from "@/components/metric-group";
import { Network, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRpc, useRpcUrl } from "@/hooks/use-rpc";
import { formatTimestamp } from "@/lib/utils";
import type { PeerList } from "@/lib/types";

function offsetColor(ms: number | null): string {
  if (ms === null) return "text-muted-foreground";
  const abs = Math.abs(ms);
  if (abs < 100) return "text-green-400";
  if (abs < 500) return "text-amber-400";
  return "text-red-400";
}

function SignalBars({ offsetMs }: { offsetMs: number | null }) {
  if (offsetMs === null) return <span className="text-muted-foreground">—</span>;
  const abs = Math.abs(offsetMs);
  let bars = 4;
  if (abs > 2000) bars = 1;
  else if (abs > 500) bars = 2;
  else if (abs > 100) bars = 3;

  const barColor = bars >= 3 ? "bg-green-400" : bars >= 2 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="flex items-end gap-0.5 h-4">
      {[1, 2, 3, 4].map((level) => (
        <div
          key={level}
          className={`w-1 rounded-sm transition-opacity duration-300 ${
            level <= bars ? barColor : "bg-muted"
          }`}
          style={{ height: `${level * 25}%` }}
        />
      ))}
    </div>
  );
}

function qualityLabel(offsetMs: number | null): { label: string; color: string } {
  if (offsetMs === null) return { label:"Unknown", color:"text-muted-foreground" };
  const abs = Math.abs(offsetMs);
  if (abs < 100) return { label: "Excellent", color: "text-green-400" };
  if (abs < 500) return { label: "Good", color: "text-green-400" };
  if (abs < 2000) return { label: "Fair", color: "text-amber-400" };
  return { label: "Poor", color: "text-red-400" };
}

export default function Peers() {
  const { rpcUrl } = useRpcUrl();
  const { data, loading, error, refetch } = useRpc<PeerList>(
    "get_peers",
    { rpcUrl },
    10000,
  );

  const offsets = (data?.peers ?? []).flatMap(p => p.clock_offset_ms === null ? [] : [Math.abs(p.clock_offset_ms)]);
  const avgOffset = offsets.length ? Math.round(offsets.reduce((a,b)=>a+b,0)/offsets.length) : null;
  const worstOffset = offsets.length ? Math.max(...offsets) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-heading font-normal">Connected Peers</h2>
          {data && (
            <Badge variant="secondary" className="font-mono">
              {data.count}
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          disabled={loading}
        >
          <RefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {data && data.peers.length > 0 && (
        <MetricGroup aria-label="Peer summary">
          <MetricItem label="Average clock offset">{avgOffset !== null ? `${avgOffset} ms` : "—"}</MetricItem>
          <MetricItem label="Largest clock offset">{worstOffset !== null ? `${worstOffset} ms` : "—"}</MetricItem>
        </MetricGroup>
      )}

      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && !data && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {data && data.peers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Network className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No peers connected</p>
          </CardContent>
        </Card>
      )}

      {data && data.peers.length > 0 && (
        <Card className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
          <CardHeader>
            <CardTitle className="text-sm font-normal">Peer List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-start text-caption text-muted-foreground">
                    <th className="pb-2 pr-4 font-normal">Address</th>
                    <th className="pb-2 pr-4 font-normal">Version</th>
                    <th className="pb-2 pr-4 font-normal">Clock Offset</th>
                    <th className="pb-2 pr-4 font-normal">Quality</th>
                    <th className="pb-2 pr-4 font-normal">Type</th>
                    <th className="pb-2 font-normal">Last Seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.peers.map((peer) => {
                    const quality = qualityLabel(peer.clock_offset_ms);
                    return (
                      <tr
                        key={peer.node_id || peer.address}
                        className="transition-opacity duration-200 hover:bg-muted/50 hover:shadow-sm"
                      >
                        <td className="py-2.5 pr-4 font-mono text-caption">
                          {peer.address}
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-caption">
                          {peer.protocol_version ?? "—"}
                        </td>
                        <td className={`py-2.5 pr-4 font-mono text-caption font-normal ${offsetColor(peer.clock_offset_ms)}`}>
                          {peer.clock_offset_ms === null ? "—" : `${peer.clock_offset_ms}ms`}
                        </td>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <SignalBars offsetMs={peer.clock_offset_ms} />
                            <span className={`text-caption ${quality.color}`}>{quality.label}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge variant="outline" className="text-caption">
                            {peer.connection_type}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-caption text-muted-foreground">
                          {formatTimestamp(peer.last_seen)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <ContextHelp summary="Why clock sync matters">
        <p>BRN accrues with time. Nodes need synchronized clocks to calculate it consistently.</p>
        <p className="font-mono text-caption">BRN = rate × (now − verified_at) − total_burned</p>
      </ContextHelp>
    </div>
  );
}
