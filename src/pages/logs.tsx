import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
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
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LogLevel>("ALL");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lineCount, setLineCount] = useState(200);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchLogs() {
    setLoading(true);
    try {
      const result = await invoke<string[]>("read_logs", { lines: lineCount });
      setLines(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [lineCount]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchLogs, 3000);
    return () => clearInterval(id);
  }, [autoRefresh, lineCount]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const filteredLines =
    filter === "ALL"
      ? lines
      : lines.filter((line) => {
          const level = getLogLevel(line);
          return level === filter;
        });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          {LOG_LEVELS.map((level) => (
            <Button
              key={level}
              variant={filter === level ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(level)}
              className="text-xs"
            >
              {level}
            </Button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            {filteredLines.length} lines
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? "Pause auto-refresh" : "Resume auto-refresh"}
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
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              bottomRef.current?.scrollIntoView({ behavior: "smooth" })
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
          <CardTitle className="text-sm font-medium">
            Node Logs
            {autoRefresh && (
              <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-chart-2" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="p-4">
              {filteredLines.length === 0 && !loading && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No log entries
                </p>
              )}
              <pre className="text-xs leading-5">
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
