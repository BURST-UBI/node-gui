import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function Identifier({ value }: { value: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return <>
    <Button ref={trigger} variant="ghost" className="max-w-full px-1 font-mono text-caption" aria-label={"Inspect " + value} onClick={() => setOpen(true)}>{value.slice(0, 12)}…{value.slice(-6)}</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent onCloseAutoFocus={event => {event.preventDefault();trigger.current?.focus();}}>
      <DialogHeader><DialogTitle>{value.startsWith("brst_") ? "Wallet address" : "Transaction ID"}</DialogTitle><DialogDescription>Select the full identifier to copy it or use it in a lookup.</DialogDescription></DialogHeader>
      <p className="break-all select-text font-mono text-sm">{value}</p>
    </DialogContent></Dialog>
  </>;
}
