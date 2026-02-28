import { useState, useEffect, useRef } from "react";
import {
  Blocks,
  Users,
  Radio,
  Clock,
  Coins,
  Timer,
  Activity,
  Info,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRpc, useRpcUrl } from "@/hooks/use-rpc";
import { formatUptime, formatAmount, formatExpiryPeriod } from "@/lib/utils";
import type { Telemetry, ProtocolParams } from "@/lib/types";

interface TelemetrySnapshot {
  time: string;
  blocks: number;
  peers: number;
  trst: number;
  verified: number;
}

function NtpIndicator({ offsetMs }: { offsetMs: number }) {
  const abs = Math.abs(offsetMs);
  let color = "bg-green-500";
  let glowClass = "shadow-green-500/40";
  let label = "Excellent";
  if (abs > 2000) {
    color = "bg-red-500";
    glowClass = "shadow-red-500/40";
    label = "Poor";
  } else if (abs > 500) {
    color = "bg-amber-500";
    glowClass = "shadow-amber-500/40";
    label = "Acceptable";
  }
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-3 w-3 rounded-full ${color} shadow-lg ${glowClass} animate-pulse-glow`} />
      <span className="font-mono text-2xl font-bold">{offsetMs}ms</span>
      <span className="text-sm text-muted-foreground">({label})</span>
    </div>
  );
}

function PulsingIcon({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className="relative">
      <div className={`absolute inset-0 rounded-full ${color} animate-ping opacity-20`} />
      {children}
    </div>
  );
}

function MiniChart({
  data,
  dataKey,
  color,
  type,
  title,
}: {
  data: TelemetrySnapshot[];
  dataKey: keyof TelemetrySnapshot;
  color: string;
  type: "line" | "area";
  title: string;
}) {
  if (data.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
        Collecting data...
      </div>
    );
  }

  const Chart = type === "area" ? AreaChart : LineChart;

  return (
    <ResponsiveContainer width="100%" height={128}>
      <Chart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="time" hide />
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <RechartsTooltip
          contentStyle={{
            background: "oklch(0.13 0.014 265)",
            border: "1px solid oklch(0.22 0.014 265)",
            borderRadius: "8px",
            fontSize: "11px",
          }}
          labelStyle={{ color: "oklch(0.556 0.014 265)" }}
        />
        {type === "area" ? (
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${dataKey})`}
            dot={false}
            animationDuration={300}
          />
        ) : (
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            animationDuration={300}
          />
        )}
      </Chart>
    </ResponsiveContainer>
  );
}

export default function Overview() {
  const { rpcUrl } = useRpcUrl();
  const { data, loading, error } = useRpc<Telemetry>(
    "get_telemetry",
    { rpcUrl },
    5000,
  );
  const { data: params } = useRpc<ProtocolParams>(
    "get_protocol_params",
    { rpcUrl },
    30000,
  );

  const [history, setHistory] = useState<TelemetrySnapshot[]>([]);
  const lastDataRef = useRef<string>("");

  useEffect(() => {
    if (!data) return;
    const sig = `${data.block_count}-${data.peer_count}-${data.trst_circulating}`;
    if (sig === lastDataRef.current) return;
    lastDataRef.current = sig;

    const snapshot: TelemetrySnapshot = {
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      blocks: data.block_count,
      peers: data.peer_count,
      trst: parseFloat(formatAmount(data.trst_circulating)),
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
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              Failed to connect to node: {error}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = loading && !data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-fade-in-up">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Blocks
            </CardTitle>
            <PulsingIcon color="bg-blue-400">
              <Blocks className="h-4 w-4 text-blue-400" />
            </PulsingIcon>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-2xl font-bold font-mono">
                {data?.block_count.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Accounts
            </CardTitle>
            <PulsingIcon color="bg-purple-400">
              <Users className="h-4 w-4 text-purple-400" />
            </PulsingIcon>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <p className="text-2xl font-bold font-mono">
                  {data?.account_count.toLocaleString()}
                </p>
                {data && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="text-green-400">{data.verified_count} verified</span>
                    {" · "}
                    <span className="text-zinc-400">{data.unverified_count} unverified</span>
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Peers
            </CardTitle>
            <PulsingIcon color="bg-cyan-400">
              <Radio className="h-4 w-4 text-cyan-400" />
            </PulsingIcon>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-2xl font-bold font-mono">
                {data?.peer_count.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Uptime
            </CardTitle>
            <PulsingIcon color="bg-emerald-400">
              <Clock className="h-4 w-4 text-emerald-400" />
            </PulsingIcon>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-2xl font-bold font-mono">
                {data ? formatUptime(data.uptime_secs) : "\u2014"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Charts */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Block Count</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniChart data={history} dataKey="blocks" color="#60a5fa" type="line" title="Blocks" />
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up" style={{ animationDelay: "250ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Peer Count</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniChart data={history} dataKey="peers" color="#22d3ee" type="area" title="Peers" />
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">TRST Circulation</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniChart data={history} dataKey="trst" color="#4ade80" type="area" title="TRST" />
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up" style={{ animationDelay: "350ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verified Wallets</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniChart data={history} dataKey="verified" color="#a78bfa" type="line" title="Verified" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              BRN Rate
            </CardTitle>
            <Coins className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            {!params ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <>
                <p className="text-2xl font-bold font-mono text-amber-400">
                  {formatAmount(params.brn_rate)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  BRN/second per verified wallet
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up" style={{ animationDelay: "450ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              TRST Expiry
            </CardTitle>
            <Timer className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            {!params ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <>
                <p className="text-2xl font-bold font-mono text-cyan-400">
                  {formatExpiryPeriod(params.trst_expiry_secs)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Time until TRST expires after creation
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up" style={{ animationDelay: "500ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              TRST Circulation
            </CardTitle>
            <Activity className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <>
                <p className="text-2xl font-bold font-mono text-green-400">
                  {data ? formatAmount(data.trst_circulating) : "\u2014"}
                </p>
                {data && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="text-zinc-400">{formatAmount(data.trst_expired_total)} expired</span>
                    {" · "}
                    <span className="text-red-400">{formatAmount(data.trst_revoked_total)} revoked</span>
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="animate-fade-in-up" style={{ animationDelay: "550ms" }}>
          <CardHeader>
            <CardTitle className="text-sm font-medium">NTP Clock Offset</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-32" />
            ) : data ? (
              <NtpIndicator offsetMs={data.ntp_offset_ms} />
            ) : null}
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up" style={{ animationDelay: "600ms" }}>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Protocol Version</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-2xl font-bold font-mono">
                {data?.protocol_version}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {params && (
        <div className="rounded-lg border-l-4 border-primary bg-muted/50 p-4 animate-fade-in-up" style={{ animationDelay: "650ms" }}>
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">BURST is a parameterized economic protocol.</p>
              <p className="mt-1">
                BRN rate and TRST expiry are the two parameters that define the economic model.
                Normal money is the special case where rate = 0 and expiry = {"\u221E"}.
                Current configuration:{" "}
                <span className="font-mono text-amber-400">{formatAmount(params.brn_rate)} BRN/s</span>,{" "}
                <span className="font-mono text-cyan-400">{formatExpiryPeriod(params.trst_expiry_secs)} expiry</span>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
