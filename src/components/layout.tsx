import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Sliders,
  Network,
  Search,
  ShieldCheck,
  Vote,
  GitBranch,
  Settings,
  ScrollText,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRpcUrl } from "@/hooks/use-rpc";

const navItems = [
  { to: "/", label: "Network Overview", short: "Dashboard", icon: LayoutDashboard },
  { to: "/parameters", label: "Protocol Parameters", short: "Parameters", icon: Sliders },
  { to: "/peers", label: "Peers & Clock Sync", short: "Peers", icon: Network },
  { to: "/explorer", label: "Block & Account Explorer", short: "Explorer", icon: Search },
  { to: "/verification", label: "Verification Activity", short: "Verification", icon: ShieldCheck },
  { to: "/governance", label: "Governance & Consti", short: "Governance", icon: Vote },
  { to: "/merger-graph", label: "TRST Merger Graph", short: "Merger Graph", icon: GitBranch },
  { to: "/config", label: "Node Configuration", short: "Config", icon: Settings },
  { to: "/logs", label: "Node Logs", short: "Logs", icon: ScrollText },
] as const;

export function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { rpcUrl, setRpcUrl } = useRpcUrl();
  const location = useLocation();

  const currentPage =
    navItems.find(
      (item) =>
        item.to === location.pathname ||
        (item.to !== "/" && location.pathname.startsWith(item.to)),
    ) ?? navItems[0];

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={cn(
          "flex flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-lg transition-all duration-300",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 animate-glow-ring">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && (
            <span className="text-sm font-bold tracking-wide gradient-text">
              BURST Node
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === location.pathname ||
              (item.to !== "/" && location.pathname.startsWith(item.to)) ||
              (item.to === "/" && location.pathname === "/");

            const link = (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  collapsed && "justify-center px-2",
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary to-primary/60" />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.short}</span>}
              </NavLink>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.to} delayDuration={0}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}
        </nav>

        <div className="p-2">
          <Separator className="mb-2" />
          {!collapsed && (
            <div className="space-y-1.5 px-1 pb-1">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                RPC Endpoint
              </label>
              <Input
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                className="h-7 bg-sidebar-accent text-xs font-mono"
                placeholder="http://127.0.0.1:7077"
              />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center border-b bg-card/30 backdrop-blur-sm px-6">
          <h1 className="text-lg font-semibold">{currentPage.label}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
