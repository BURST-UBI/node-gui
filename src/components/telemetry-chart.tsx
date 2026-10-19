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
export interface TelemetrySnapshot {
  time: string;
  blocks: number;
  peers: number;
  trst: number;
  verified: number;
}

export default function MiniChart({
  data,
  dataKey,
  color,
  type,
}: {
  data: TelemetrySnapshot[];
  dataKey: keyof TelemetrySnapshot;
  color: string;
  type: "line" | "area";
}) {
  if (data.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center text-caption text-muted-foreground">
        Collecting data…
      </div>
    );
  }

  const Chart = type === "area" ? AreaChart : LineChart;

  return (
    <ResponsiveContainer width="100%" minWidth={0} height={96}>
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
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            color: "var(--color-foreground)",
            borderRadius: "12px",
            fontSize: "13px",
          }}
          labelStyle={{ color: "var(--color-muted-foreground)" }}
        />
        {type === "area" ? (
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${dataKey})`}
            dot={false}
            isAnimationActive={false}
          />
        ) : (
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        )}
      </Chart>
    </ResponsiveContainer>
  );
}
