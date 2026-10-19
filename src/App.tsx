import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { PageBoundary } from "@/components/page-boundary";
const Overview = lazy(() => import("@/pages/overview"));
const Parameters = lazy(() => import("@/pages/parameters"));
const Peers = lazy(() => import("@/pages/peers"));
const Explorer = lazy(() => import("@/pages/explorer"));
const Verification = lazy(() => import("@/pages/verification"));
const Governance = lazy(() => import("@/pages/governance"));
const MergerGraph = lazy(() => import("@/pages/merger-graph"));
const Config = lazy(() => import("@/pages/config"));
const Logs = lazy(() => import("@/pages/logs"));

export default function App() {
  return (
    <BrowserRouter>
      <TooltipProvider delayDuration={300}>
        <Layout>
          <PageBoundary><Suspense fallback={<div role="status" className="min-h-48 text-muted-foreground">Loading…</div>}><Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/parameters" element={<Parameters />} />
            <Route path="/peers" element={<Peers />} />
            <Route path="/explorer" element={<Explorer />} />
            <Route path="/verification" element={<Verification />} />
            <Route path="/governance" element={<Governance />} />
            <Route path="/merger-graph" element={<MergerGraph />} />
            <Route path="/config" element={<Config />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes></Suspense></PageBoundary>
        </Layout>
        <Toaster
          position="bottom-right"
          mobileOffset={{ bottom: "calc(16px + env(safe-area-inset-bottom, 0px))", left: "calc(16px + env(safe-area-inset-left, 0px))", right: "calc(16px + env(safe-area-inset-right, 0px))" }}
          toastOptions={{
            style: {
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              color: "var(--color-foreground)",
            },
          }}
        />
      </TooltipProvider>
    </BrowserRouter>
  );
}
