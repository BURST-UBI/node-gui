import { Network, RefreshCw, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRpc, useRpcUrl } from "@/hooks/use-rpc";
import { formatTimestamp } from "@/lib/utils";
import type { PeerList } from "@/lib/types";

function offsetColor(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < 100) return "text-green-400";
  if (abs < 500) return "text-amber-400";
  return "text-red-400";
}

function SignalBars({ offsetMs }: { offsetMs: number }) {
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
          className={`w-1 rounded-sm transition-all duration-300 ${
            level <= bars ? barColor : "bg-muted"
          }`}
          style={{ height: `${level * 25}%` }}
        />
      ))}
    </div>
  );
}

function qualityLabel(offsetMs: number): { label: string; color: string } {
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

  const avgOffset =
    data && data.peers.length > 0
      ? Math.round(
          data.peers.reduce((sum, p) => sum + Math.abs(p.clock_offset_ms), 0) /
            data.peers.length,
        )
      : null;

  const worstOffset =
    data && data.peers.length > 0
      ? data.peers.reduce(
          (max, p) => Math.max(max, Math.abs(p.clock_offset_ms)),
          0,
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Connected Peers</h2>
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
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="animate-fade-in-up">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Peer Count
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono">{data.count}</p>
            </CardContent>
          </Card>
          <Card className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Clock Offset
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold font-mono ${avgOffset !== null ? offsetColor(avgOffset) : ""}`}>
                {avgOffset !== null ? `${avgOffset}ms` : "\u2014"}
              </p>
            </CardContent>
          </Card>
          <Card className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Worst Clock Offset
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold font-mono ${worstOffset !== null ? offsetColor(worstOffset) : ""}`}>
                {worstOffset !== null ? `${worstOffset}ms` : "\u2014"}
              </p>
            </CardContent>
          </Card>
        </div>
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
            <CardTitle className="text-sm font-medium">Peer List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Address</th>
                    <th className="pb-2 pr-4 font-medium">Version</th>
                    <th className="pb-2 pr-4 font-medium">Clock Offset</th>
                    <th className="pb-2 pr-4 font-medium">Quality</th>
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 font-medium">Last Seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.peers.map((peer) => {
                    const quality = qualityLabel(peer.clock_offset_ms);
                    return (
                      <tr
                        key={peer.node_id}
                        className="transition-all duration-200 hover:bg-muted/50 hover:shadow-sm"
                      >
                        <td className="py-2.5 pr-4 font-mono text-xs">
                          {peer.address}
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-xs">
                          {peer.protocol_version}
                        </td>
                        <td className={`py-2.5 pr-4 font-mono text-xs font-semibold ${offsetColor(peer.clock_offset_ms)}`}>
                          {peer.clock_offset_ms}ms
                        </td>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <SignalBars offsetMs={peer.clock_offset_ms} />
                            <span className={`text-xs ${quality.color}`}>{quality.label}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge variant="outline" className="text-xs">
                            {peer.connection_type}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-xs text-muted-foreground">
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

      <div className="rounded-lg border-l-4 border-primary bg-muted/50 p-4 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Clock synchronization is critical for BRN computation.</p>
            <p className="mt-1">
              BRN is a function of time — <span className="font-mono">BRN = rate {"\u00D7"} (now {"\u2212"} verified_at) {"\u2212"} total_burned</span>.
              Nodes must agree on the current time within acceptable margins for consistent BRN calculations across the network.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
