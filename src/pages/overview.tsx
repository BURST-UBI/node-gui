import { MetricGroup, MetricItem } from "@/components/metric-group";
import { BrnIcon, TrstIcon } from "@/components/burst-icons";
import { HelpLabel } from "@/components/help-label";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import type { TelemetrySnapshot } from "@/components/telemetry-chart";
import { Card, CardContent } from "@/components/ui/card";
import { Surface } from "@/components/ui/surface";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useRpc, useRpcUrl } from "@/hooks/use-rpc";
import { formatUptime, formatAmount, formatExpiryPeriod } from "@/lib/utils";
import type { Telemetry, ProtocolParams } from "@/lib/types";

const MiniChart = lazy(() => import("@/components/telemetry-chart"));

function NtpIndicator({ offsetMs }: { offsetMs: number | null }) {
  if (offsetMs === null) return <p className="text-sm text-muted-foreground">No recent successful clock synchronization</p>;
  const abs = Math.abs(offsetMs);
  let color = "bg-success";
  let label = "Excellent";
  if (abs > 2000) {
    color = "bg-destructive";
    label = "Poor";
  } else if (abs > 500) {
    color = "bg-warning";
    label = "Acceptable";
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      <span className="tabular-nums">{offsetMs} ms</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export default function Overview() {
  const { rpcUrl } = useRpcUrl();
  const { data, loading, error, refetch } = useRpc<Telemetry>(
    "get_telemetry",
    { rpcUrl },
    5000,
  );
  const { data: params, error: paramsError } = useRpc<ProtocolParams>(
    "get_protocol_params",
    { rpcUrl },
    30000,
  );

  const [chart, setChart] = useState<"blocks" | "peers" | "trst" | "verified">("blocks");
  const [history, setHistory] = useState<TelemetrySnapshot[]>([]);
  const lastDataRef = useRef<string>("");

  useEffect(() => {
    setHistory([]);
    lastDataRef.current = "";
  }, [rpcUrl]);

  useEffect(() => {
    if (!data) return;
    const sig = `${data.uptime_secs}-${data.block_count}-${data.peer_count}-${data.trst_circulating}-${data.verified_count}`;
    if (sig === lastDataRef.current) return;
    lastDataRef.current = sig;

    const snapshot: TelemetrySnapshot = {
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      blocks: data.block_count,
      peers: data.peer_count,
      trst: Number(data.trst_circulating) / 1e18,
      verified: data.verified_count,
    };

    setHistory((prev) => {
      const next = [...prev, snapshot];
      return next.length > 60 ? next.slice(-60) : next;
    });
  }, [data]);

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <Card role="alert" className="w-full max-w-lg border-warning/30">
          <CardContent className="space-y-4 pt-6">
            <h2 className="text-heading font-normal">Node unavailable</h2>
            <p className="text-sm text-muted-foreground">Start your node or choose a different endpoint using Connection above.</p>
            <p className="break-all font-mono text-caption text-muted-foreground">{rpcUrl}</p>
            <p className="break-words text-caption text-muted-foreground">{error}</p>
            <Button onClick={refetch} disabled={loading}>{loading ? "Connecting…" : "Try again"}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = loading && !data;
  const clockNeedsAttention = data && (data.ntp_offset_ms === null || Math.abs(data.ntp_offset_ms) > 2000);

  return (
    <div className="node-overview space-y-6">
      <div role="status" className="network-notice">
        {!data ? "Checking network…" : data.network === "dev" || data.network === "test"
          ? `${data.network === "dev" ? "Devnet" : "Testnet"} — test funds only, no real value. ${data.faucet_enabled ? "Test faucet enabled." : "Test faucet disabled."}`
          : data.network === "live"
            ? "Mainnet — test tools are unavailable."
            : "Network not reported by this node — upgrade the node to identify its network."}
      </div>
      <div className="node-status">
        <div>
          <h1>{!data ? "Connecting to your node" : data.peer_count > 0 ? "Your node is connected" : "Your node is isolated"}</h1>
          <p>{!data ? "Waiting for a response…" : data.peer_count > 0 ? `Connected to ${data.peer_count} ${data.peer_count === 1 ? "peer" : "peers"}. Running for ${formatUptime(data.uptime_secs)}.` : "The node is running, but it cannot exchange blocks without peers."}</p>
        </div>
        <span aria-hidden="true" className="status-orb" style={{ background: !data || !data.peer_count ? "var(--color-warning)" : "var(--color-success)" }} />
      </div>
      <MetricGroup aria-label="Node summary" className="overview-summary">
        {[
          { label: "Blocks", value: data?.block_count.toLocaleString() },
          { label: "Accounts", value: data?.account_count.toLocaleString() },
          { label: "Peers", value: data?.peer_count.toLocaleString() },
          { label: "Uptime", value: data ? formatUptime(data.uptime_secs) : undefined },
        ].map(metric => (
          <MetricItem key={metric.label} label={metric.label === "Accounts" && data
            ? <HelpLabel label="Accounts" explanation={`${data.verified_count.toLocaleString()} verified · ${data.unverified_count.toLocaleString()} unverified`} />
            : metric.label}>
            {isLoading ? <Skeleton className="h-5 w-12" /> : metric.value ?? "—"}
          </MetricItem>
        ))}
      </MetricGroup>

      {(clockNeedsAttention || paramsError || (data && (BigInt(data.trst_expired_total) > 0n || BigInt(data.trst_revoked_total) > 0n))) && (
        <div className="overview-notices" role="status">
          {clockNeedsAttention && <p className="text-warning">{data.ntp_offset_ms === null ? "No recent successful clock synchronization" : `Clock offset ${data.ntp_offset_ms} ms — Poor synchronization`}</p>}
          {paramsError && <p className="text-warning">Network parameters unavailable. Retrying…</p>}
          {data && BigInt(data.trst_expired_total) > 0n && <p>{formatAmount(data.trst_expired_total)} expired TRST</p>}
          {data && BigInt(data.trst_revoked_total) > 0n && <p className="text-destructive">{formatAmount(data.trst_revoked_total)} revoked TRST</p>}
        </div>
      )}

      <Surface aria-label="Node activity">
        <div className="flex flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-ui"><HelpLabel label="Activity" explanation="This session’s last 60 samples, updated every 5 seconds." /></h2>
            <div role="group" aria-label="Activity chart" className="overview-chart-controls flex flex-wrap gap-1">
              {([["blocks", "Blocks"], ["peers", "Peers"], ["trst", "TRST"], ["verified", "Verified"]] as const).map(([key, label]) => (
                <Button key={key} size="sm" variant={chart === key ? "secondary" : "ghost"} aria-pressed={chart === key} onClick={() => setChart(key)}>{label}</Button>
              ))}
            </div>
          </div>
          <div className="min-w-0 overflow-hidden" role="img" aria-label={`${chart} over this session; ${history.length} samples collected`}>
            <Suspense fallback={<div className="flex h-24 items-center justify-center text-caption text-muted-foreground">Loading chart…</div>}>
            {history.length < 2 ? <div className="flex h-24 items-center justify-center text-caption text-muted-foreground">Collecting data…</div> : <MiniChart data={history} dataKey={chart} color="var(--color-primary)" type={chart === "blocks" || chart === "verified" ? "line" : "area"} />}
            </Suspense>
          </div>
          {data && <p className="sr-only">Latest: {data.block_count.toLocaleString()} {data.block_count === 1 ? "block" : "blocks"} · {data.peer_count.toLocaleString()} {data.peer_count === 1 ? "peer" : "peers"} · {formatAmount(data.trst_circulating)} TRST · {data.verified_count.toLocaleString()} verified {data.verified_count === 1 ? "wallet" : "wallets"}</p>}
        </div>
      </Surface>

      <details className="overview-details">
        <summary>Network details</summary>
        <MetricGroup aria-label="Network details" className="overview-detail-values">
          <MetricItem label={<HelpLabel label="Clock offset" explanation="Difference from network time. Large clock errors can disrupt node operation." />}>
            {isLoading ? <Skeleton className="h-5 w-24" /> : data ? <NtpIndicator offsetMs={data.ntp_offset_ms} /> : "—"}
          </MetricItem>
          <MetricItem label="Protocol version">{isLoading ? <Skeleton className="h-5 w-8" /> : data?.protocol_version ?? "—"}</MetricItem>
          <MetricItem label={<span className="metric-symbol-label">
              <BrnIcon className="size-7" />
              <HelpLabel label="BRN" explanation="BRN earned per second by each verified wallet." />
            </span>}>
            {paramsError ? <p role="status" className="text-caption text-warning">Parameters unavailable. Retrying…</p> : !params ? (
              <Skeleton className="h-6 w-28" />
            ) : (
              <p className="metric-amount">
                {formatAmount(params.brn_rate)}<span className="text-caption text-muted-foreground">/ sec</span>
              </p>
            )}
          </MetricItem>
          <MetricItem label={<span className="metric-symbol-label">
              <TrstIcon className="size-7" />
              <HelpLabel label="TRST" explanation="Active TRST held across accounts known to this node. Expiry is measured from creation; no expiry means it does not expire with time." />
            </span>}>
            {isLoading ? (
              <Skeleton className="h-6 w-12" />
            ) : (
              <p className="metric-amount">
                <span className="sr-only">Active TRST: </span>{data ? formatAmount(data.trst_circulating) : "—"}
              </p>
            )}
            <div className="metric-meta">
              {paramsError ? <p role="status" className="text-caption text-warning">Parameters unavailable. Retrying…</p> : !params ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <p>{params.trst_expiry_secs === Number(18446744073709551615n) ? "No expiry" : `Expiry ${formatExpiryPeriod(params.trst_expiry_secs)}`}</p>
              )}
              {data && BigInt(data.trst_expired_total) > 0n && <p>{formatAmount(data.trst_expired_total)} expired</p>}
              {data && BigInt(data.trst_revoked_total) > 0n && <p className="text-destructive">{formatAmount(data.trst_revoked_total)} revoked</p>}
            </div>
          </MetricItem>

        </MetricGroup>
      </details>

    </div>
  );
}
