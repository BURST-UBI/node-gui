import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Save, FolderOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function Config() {
  const [configPath, setConfigPath] = useState("/etc/burst/config.toml");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  async function loadConfig() {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<string>("read_config", { path: configPath });
      setContent(result);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      await invoke("write_config", { path: configPath, content });
      setDirty(false);
      toast.success("Configuration saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <label className="text-sm font-medium">Config File Path</label>
          <Input
            value={configPath}
            onChange={(e) => setConfigPath(e.target.value)}
            className="font-mono"
          />
        </div>
        <Button variant="outline" size="sm" onClick={loadConfig}>
          <FolderOpen className="h-4 w-4" />
          Load
        </Button>
        <Button
          size="sm"
          onClick={saveConfig}
          disabled={saving || !dirty}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save
        </Button>
      </div>

      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Configuration Editor
            {dirty && (
              <span className="ml-2 text-xs text-chart-4">(unsaved changes)</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[500px] w-full" />
          ) : (
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setDirty(true);
              }}
              spellCheck={false}
              className="h-[500px] w-full resize-none rounded-md border border-input bg-background p-4 font-mono text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
