import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, SlidersHorizontal, Network, Search, ShieldCheck, Vote, GitBranch, Settings, ScrollText, Ellipsis, Plug } from "lucide-react";
import { NodeIcon } from "@/components/burst-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useRpcUrl } from "@/hooks/use-rpc";
import { AppearanceToggle } from "@/components/appearance-toggle";

const destinations = [
  { to: "/", label: "Overview", icon: LayoutDashboard, group: "node" },
  { to: "/peers", label: "Peers", icon: Network, group: "node" },
  { to: "/explorer", label: "Explorer", icon: Search, group: "node" },
  { to: "/verification", label: "Verification", icon: ShieldCheck, group: "network" },
  { to: "/governance", label: "Governance", icon: Vote, group: "network" },
  { to: "/parameters", label: "Parameters", icon: SlidersHorizontal, group: "network" },
  { to: "/merger-graph", label: "TRST origins", icon: GitBranch, group: "network" },
  { to: "/config", label: "Settings", icon: Settings, group: "tools" },
  { to: "/logs", label: "Logs", icon: ScrollText, group: "tools" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { rpcUrl, setRpcUrl } = useRpcUrl();
  const [draftUrl, setDraftUrl] = useState(rpcUrl);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const menuNavigated = useRef(false);
  const previousPath = useRef(location.pathname);
  const currentPage = destinations.find(item => item.to === location.pathname) ?? destinations[0];

  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      mainRef.current?.scrollTo(0, 0);
      mainRef.current?.focus();
      previousPath.current = location.pathname;
    }
  }, [location.pathname]);

  function connect(event: React.FormEvent) {
    event.preventDefault();
    try {
      const url = new URL(draftUrl.trim());
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error();
      setRpcUrl(draftUrl.trim());
      setConnectionOpen(false);
      setConnectionError("");
    } catch { setConnectionError("Enter an HTTP or HTTPS node URL without embedded credentials."); }
  }

  function link(item: typeof destinations[number], close = false) {
    const Icon = item.icon;
    return <NavLink key={item.to} to={item.to} end={item.to === "/"} className="nav-item" aria-label={item.label} onClick={() => { if (close) { menuNavigated.current = true; setMenuOpen(false); } }}><Icon aria-hidden="true" className="size-[18px] shrink-0" /><span>{item.label}</span></NavLink>;
  }

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="app-sidebar">
      <NavLink to="/" className="brand-lockup" aria-label="Burst node home"><NodeIcon className="size-6" /><span className="brand-wordmark">burst<span className="brand-product">Node</span></span></NavLink>
      <nav className="sidebar-navigation" aria-label="Node navigation">
        <div className="nav-group">{destinations.filter(item => item.group === "node").map(item => link(item))}</div>
        <div className="nav-group"><p className="nav-group-label">Network</p>{destinations.filter(item => item.group === "network").map(item => link(item))}</div>
      </nav>
      <div className="sidebar-footer">{destinations.filter(item => item.group === "tools").map(item => link(item))}</div>
    </aside>
    <div className="app-workspace">
      <header className="app-header">
        <div className="flex min-w-0 items-center gap-3"><NodeIcon className="mobile-brand size-6" /><span className="mobile-page-title truncate text-ui text-muted-foreground">Node</span></div>
        <div className="flex shrink-0 items-center gap-1">
          <Dialog open={connectionOpen} onOpenChange={open => { setConnectionOpen(open); if (open) { setDraftUrl(rpcUrl); setConnectionError(""); } }}>
            <DialogTrigger asChild><Button variant="ghost" className="text-muted-foreground" title={rpcUrl}><Plug />Connection</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Node connection</DialogTitle><DialogDescription>Choose the node this dashboard reads from.</DialogDescription></DialogHeader>
              <form onSubmit={connect} className="space-y-4">
                <div className="space-y-2"><label htmlFor="node-endpoint">Node URL</label><Input id="node-endpoint" value={draftUrl} onChange={e => setDraftUrl(e.target.value)} type="url" spellCheck={false} autoComplete="off" placeholder="http://127.0.0.1:7077" aria-invalid={!!connectionError} aria-describedby={connectionError ? "connection-error" : undefined} /></div>
                {connectionError && <p id="connection-error" role="alert" className="text-destructive text-caption">{connectionError}</p>}
                <Button type="submit" className="w-full">Connect</Button>
              </form>
            </DialogContent>
          </Dialog>
          <AppearanceToggle />
        </div>
      </header>
      <main ref={mainRef} id="main-content" tabIndex={-1}><div className="app-content">{location.pathname !== "/" && <div className="page-heading"><h1>{currentPage.label}</h1></div>}{children}</div></main>
      <nav className="mobile-navigation" aria-label="Mobile node navigation">
        {destinations.slice(0,3).map(item => link(item))}
        <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
          <DialogTrigger asChild><button className="nav-item"><Ellipsis aria-hidden="true" className="size-5" /><span>More</span></button></DialogTrigger>
          <DialogContent onCloseAutoFocus={event => { if (menuNavigated.current) { event.preventDefault(); menuNavigated.current = false; mainRef.current?.focus(); } }}>
            <DialogHeader><DialogTitle>Node tools</DialogTitle><DialogDescription>Network activity and diagnostics.</DialogDescription></DialogHeader>
            <nav aria-label="All node destinations" className="grid grid-cols-2 gap-2">{destinations.slice(3).map(item => link(item,true))}</nav>
          </DialogContent>
        </Dialog>
      </nav>
    </div>
  </div>;
}
