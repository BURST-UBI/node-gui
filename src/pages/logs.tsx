import { useState, useRef } from "react";
import { useRpc } from "@/hooks/use-rpc";
import { RefreshCw, ArrowDownToLine, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const LOG_LEVELS = ["ALL", "ERROR", "WARN", "INFO", "DEBUG", "TRACE"] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

function getLogLevel(line: string): string | null {
  const upper = line.toUpperCase();
  if (upper.includes("ERROR")) return "ERROR";
  if (upper.includes("WARN")) return "WARN";
  if (upper.includes("INFO")) return "INFO";
  if (upper.includes("DEBUG")) return "DEBUG";
  if (upper.includes("TRACE")) return "TRACE";
  return null;
}

function logLevelColor(level: string | null): string {
  switch (level) {
    case "ERROR":
      return "text-chart-5";
    case "WARN":
      return "text-chart-4";
    case "INFO":
      return "text-chart-1";
    case "DEBUG":
      return "text-chart-3";
    case "TRACE":
      return "text-muted-foreground";
    default:
      return "text-foreground";
  }
}

export default function Logs() {
  const [filter, setFilter] = useState<LogLevel>("ALL");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lineCount, setLineCount] = useState(200);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, loading, error, refetch: fetchLogs } = useRpc<string[]>(
    "read_logs", { lines: lineCount }, autoRefresh ? 3000 : undefined,
  );
  const lines = data ?? [];

  const filteredLines =
    filter === "ALL"
      ? lines
      : lines.filter((line) => {
          const level = getLogLevel(line);
          return level === filter;
        });

  return (
    <div className="space-y-4">
      <p className="text-caption text-muted-foreground">Local machine only: journal entries for the burst-node service. Changing the RPC endpoint does not switch this log source.</p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {LOG_LEVELS.map((level) => (
            <Button
              key={level}
              variant={filter === level ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(level)}
              className="text-caption"
            >
              {level}
            </Button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-caption">
            {filteredLines.length} lines
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setAutoRefresh(!autoRefresh)}
            aria-label={autoRefresh ? "Pause auto-refresh" : "Resume auto-refresh"}
          >
            {autoRefresh ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchLogs}
            aria-label="Refresh logs"
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Jump to latest logs"
            onClick={() =>
              bottomRef.current?.scrollIntoView({ behavior: "instant" })
            }
          >
            <ArrowDownToLine className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-normal">
            Node Logs
            {autoRefresh && (
              <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-chart-2" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[max(240px,calc(100dvh-360px))]">
            <div className="p-4">
              {filteredLines.length === 0 && !loading && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No log entries
                </p>
              )}
              <pre className="whitespace-pre-wrap break-all text-caption leading-5">
                {filteredLines.map((line, i) => {
                  const level = getLogLevel(line);
                  return (
                    <div
                      key={i}
                      className={`font-mono hover:bg-muted/50 px-1 rounded ${logLevelColor(level)}`}
                    >
                      {line}
                    </div>
                  );
                })}
              </pre>
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
