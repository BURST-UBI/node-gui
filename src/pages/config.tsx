import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Keep unsaved configuration in memory across routes; never persist possible secrets.
let draft = { path: "/etc/burst/config.toml", loadedPath: "", content: "", saved: "", busy: false, error: "" };
const listeners = new Set<() => void>();
function update(next: Partial<typeof draft>) { draft = {...draft, ...next}; listeners.forEach(listener => listener()); }
function subscribe(listener: () => void) { listeners.add(listener); return () => {listeners.delete(listener);}; }

function warnUnsaved(event: BeforeUnloadEvent) {
  if (draft.content !== draft.saved || draft.busy) {event.preventDefault(); event.returnValue = "";}
}
window.addEventListener("beforeunload", warnUnsaved);
if (import.meta.hot) import.meta.hot.dispose(() => window.removeEventListener("beforeunload", warnUnsaved));

async function loadConfig() {
  if (draft.busy) return;
  const path = draft.path;
  update({busy: true, error: ""});
  try {
    const content = await invoke<string>("read_config", {path});
    update({content, saved: content, loadedPath: path});
  } catch (error) { update({error: String(error)}); }
  finally { update({busy: false}); }
}

async function saveConfig() {
  if (draft.busy || !draft.loadedPath) return;
  const {loadedPath: path, content} = draft;
  update({busy: true, error: ""});
  try {
    await invoke("write_config", {path, content});
    update({saved: content});
    toast.success("Configuration saved");
  } catch (error) { update({error: String(error)}); }
  finally { update({busy: false}); }
}

export default function Config() {
  const state = useSyncExternalStore(subscribe, () => draft);
  const [discardOpen, setDiscardOpen] = useState(false);
  const dirty = state.content !== state.saved;
  useEffect(() => { if (!draft.loadedPath && !draft.busy) loadConfig(); }, []);
  const loadButton = useRef<HTMLButtonElement>(null);

  return <div className="node-config">
    <p className="field-help">Edits a file on this computer, not the remote RPC node. Saving does not restart the node.</p>
    <form className="form-field" onSubmit={event => {event.preventDefault(); if (dirty) setDiscardOpen(true); else loadConfig();}}>
      <label htmlFor="config-path">Config file path</label>
      <div className="field-action"><Input id="config-path" value={state.path} onChange={event => update({path: event.target.value})} disabled={state.busy} spellCheck={false} autoComplete="off" /><Button ref={loadButton} type="submit" variant="secondary" disabled={state.busy || !state.path.trim()}>Load</Button></div>
    </form>
    {state.error && <p role="alert" className="field-error break-words">{state.error}</p>}
    <section className="form-field">
      <label htmlFor="config-contents">Configuration contents</label>
      {state.loadedPath && <p id="config-save-path" className="field-help break-all">Editing and saving to <span className="font-mono select-text">{state.loadedPath}</span></p>}
      {state.loadedPath && state.path !== state.loadedPath && <p className="text-caption text-warning">Load the new path to edit it. Save still applies to the file shown above.</p>}
      <textarea id="config-contents" aria-describedby={state.loadedPath ? "config-save-path" : undefined} value={state.content} onChange={event => update({content:event.target.value})} onKeyDown={event => {if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && dirty) {event.preventDefault(); saveConfig();}}} disabled={state.busy || !state.loadedPath} spellCheck={false} autoComplete="off" className="form-control config-editor p-4 font-mono" />
      <div className="config-footer"><p role="status" className="field-help">{state.busy ? "Working…" : dirty ? "Unsaved changes · kept while this app stays open" : "No unsaved changes"}</p><Button type="button" onClick={saveConfig} disabled={state.busy || !dirty || !state.loadedPath}>{state.busy && <Loader2 className="animate-spin" />}Save</Button></div>
    </section>
    <Dialog open={discardOpen} onOpenChange={setDiscardOpen}><DialogContent onCloseAutoFocus={event => {event.preventDefault(); requestAnimationFrame(() => {if (loadButton.current?.disabled) document.getElementById("main-content")?.focus(); else loadButton.current?.focus();});}}>
      <DialogHeader><DialogTitle>Discard unsaved changes?</DialogTitle><DialogDescription>Loading this file will replace your current draft. Save it first if you want to keep it.</DialogDescription></DialogHeader>
      <DialogFooter><Button variant="outline" onClick={() => setDiscardOpen(false)}>Keep editing</Button><Button onClick={() => {setDiscardOpen(false); loadConfig();}}>Discard and load</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}
