import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Overview from "@/pages/overview";
import Parameters from "@/pages/parameters";
import Peers from "@/pages/peers";
import Explorer from "@/pages/explorer";
import Verification from "@/pages/verification";
import Governance from "@/pages/governance";
import MergerGraph from "@/pages/merger-graph";
import Config from "@/pages/config";
import Logs from "@/pages/logs";

export default function App() {
  return (
    <BrowserRouter>
      <TooltipProvider delayDuration={300}>
        <Layout>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/parameters" element={<Parameters />} />
            <Route path="/peers" element={<Peers />} />
            <Route path="/explorer" element={<Explorer />} />
            <Route path="/verification" element={<Verification />} />
            <Route path="/governance" element={<Governance />} />
            <Route path="/merger-graph" element={<MergerGraph />} />
            <Route path="/config" element={<Config />} />
            <Route path="/logs" element={<Logs />} />
          </Routes>
        </Layout>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            },
          }}
        />
      </TooltipProvider>
    </BrowserRouter>
  );
}
