import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export class PageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <div role="alert" className="space-y-3 py-8">
        <h2 className="text-lg">This page couldn’t load</h2>
        <p className="text-sm text-muted-foreground">Reload the dashboard to try again. Your node will keep running.</p>
        <Button onClick={() => window.location.reload()}>Reload dashboard</Button>
      </div>;
    }
    return this.props.children;
  }
}
