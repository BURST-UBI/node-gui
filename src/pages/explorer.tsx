import { useState } from "react";
import { Search, ArrowRight, CheckCircle2, XCircle, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRpc, useRpcUrl } from "@/hooks/use-rpc";
import {
  formatAmount,
  formatTimestamp,
  truncateHash,
  truncateAddress,
} from "@/lib/utils";
import type {
  BlockInfo,
  AccountInfo,
  AccountHistory,
  AccountVerification,
} from "@/lib/types";

const BLOCK_TYPE_COLORS: Record<string, string> = {
  burn: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  send: "border-blue-500/50 bg-blue-500/10 text-blue-400",
  receive: "border-green-500/50 bg-green-500/10 text-green-400",
  endorse: "border-purple-500/50 bg-purple-500/10 text-purple-400",
  challenge: "border-red-500/50 bg-red-500/10 text-red-400",
  governance_vote: "border-indigo-500/50 bg-indigo-500/10 text-indigo-400",
  merge: "border-teal-500/50 bg-teal-500/10 text-teal-400",
  split: "border-cyan-500/50 bg-cyan-500/10 text-cyan-400",
  delegate: "border-zinc-500/50 bg-zinc-500/10 text-zinc-400",
};

const VERIFICATION_COLORS: Record<string, string> = {
  verified: "border-green-500/50 bg-green-500/10 text-green-400",
  unverified: "border-zinc-500/50 bg-zinc-500/10 text-zinc-400",
  endorsed: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  voting: "border-blue-500/50 bg-blue-500/10 text-blue-400",
  challenged: "border-red-500/50 bg-red-500/10 text-red-400",
  revoked: "border-red-500/50 bg-red-500/10 text-red-400",
};

function blockTypeBadge(type: string) {
  const color = BLOCK_TYPE_COLORS[type] ?? "border-zinc-500/50 bg-zinc-500/10 text-zinc-400";
  return <Badge variant="outline" className={`text-xs ${color}`}>{type}</Badge>;
}

function verificationBadge(state: string) {
  const color = VERIFICATION_COLORS[state.toLowerCase()] ?? VERIFICATION_COLORS.unverified;
  return <Badge variant="outline" className={`text-xs ${color}`}>{state}</Badge>;
}

function BlockDetail({ data }: { data: BlockInfo }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle className="text-sm font-medium">Block Detail</CardTitle>
          {blockTypeBadge(data.block_type)}
        </div>
        {data.confirmed ? (
          <Badge className="border-green-500/40 bg-green-500/10 text-green-400">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Confirmed
          </Badge>
        ) : (
          <Badge variant="outline" className="border-amber-500/40 text-amber-400">
            <XCircle className="mr-1 h-3 w-3" />
            Unconfirmed
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Account</dt>
            <dd className="mt-0.5 font-mono text-xs break-all">{data.account}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Amount</dt>
            <dd className="mt-0.5 font-mono font-medium">{formatAmount(data.amount)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Timestamp</dt>
            <dd className="mt-0.5 font-mono text-sm">{formatTimestamp(data.timestamp)}</dd>
          </div>
          {data.origin && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground flex items-center gap-1">
                Origin
                <span className="text-xs text-muted-foreground/60">(original burn transaction)</span>
              </dt>
              <dd className="mt-0.5 font-mono text-xs break-all">{data.origin}</dd>
            </div>
          )}
          {data.link && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground flex items-center gap-1">
                Link
                <span className="text-xs text-muted-foreground/60">(previous in chain)</span>
              </dt>
              <dd className="mt-0.5 font-mono text-xs break-all">{data.link}</dd>
            </div>
          )}
          {data.destination && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Destination</dt>
              <dd className="mt-0.5 font-mono text-xs break-all">{data.destination}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">BRN Balance</dt>
            <dd className="mt-0.5 font-mono font-medium">{formatAmount(data.brn_balance)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">TRST Balance</dt>
            <dd className="mt-0.5 font-mono font-medium">{formatAmount(data.trst_balance)}</dd>
          </div>
          {data.representative && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Representative</dt>
              <dd className="mt-0.5 font-mono text-xs break-all">{data.representative}</dd>
            </div>
          )}
          {data.previous && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Previous Block</dt>
              <dd className="mt-0.5 font-mono text-xs break-all">{data.previous}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

function VerificationDialog({
  data,
  open,
  onClose,
}: {
  data: AccountVerification | null;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Verification Details</DialogTitle>
        </DialogHeader>
        {data ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {verificationBadge(data.state)}
              {data.challenge_active && (
                <Badge variant="outline" className="border-red-500/40 text-red-400 text-xs">
                  Challenge Active
                </Badge>
              )}
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Account</dt>
                <dd className="mt-0.5 font-mono text-xs break-all">{data.account}</dd>
              </div>
              {data.verified_at && (
                <div>
                  <dt className="text-muted-foreground">Verified At</dt>
                  <dd className="mt-0.5 font-mono text-sm">{formatTimestamp(data.verified_at)}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Endorsements</dt>
                <dd className="mt-0.5 font-mono">
                  {data.endorsement_count} / {data.endorsement_threshold}
                </dd>
              </div>
            </dl>
            {data.endorsers.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Endorsers</p>
                <div className="space-y-1">
                  {data.endorsers.map((e) => (
                    <p key={e} className="font-mono text-xs text-muted-foreground break-all">{e}</p>
                  ))}
                </div>
              </div>
            )}
            {data.verifier_votes.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Verifier Votes</p>
                <div className="space-y-1">
                  {data.verifier_votes.map((v) => (
                    <div key={v.verifier} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-muted-foreground">{truncateAddress(v.verifier)}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{v.vote}</Badge>
                        <span className="text-muted-foreground">{formatTimestamp(v.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Skeleton className="h-32 w-full" />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AccountDetail({
  info,
  history,
  historyCursor,
  onLoadMore,
}: {
  info: AccountInfo;
  history: AccountHistory | null;
  historyCursor?: string;
  onLoadMore?: () => void;
}) {
  const { rpcUrl } = useRpcUrl();
  const [showVerification, setShowVerification] = useState(false);
  const verification = useRpc<AccountVerification>(
    "get_account_verification",
    showVerification ? { rpcUrl, account: info.address } : null,
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Account Info</CardTitle>
          {verificationBadge(info.verification_state)}
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="mt-0.5 font-mono text-xs break-all">{info.address}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">BRN Balance</dt>
              <dd className="mt-0.5 font-mono font-medium text-amber-400">
                {formatAmount(info.brn_balance)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">TRST Balance (active)</dt>
              <dd className="mt-0.5 font-mono font-medium text-green-400">
                {formatAmount(info.trst_balance)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">TRST Expired</dt>
              <dd className="mt-0.5 font-mono text-zinc-400">{formatAmount(info.trst_expired)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">TRST Revoked</dt>
              <dd className="mt-0.5 font-mono text-red-400">{formatAmount(info.trst_revoked)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total BRN Burned</dt>
              <dd className="mt-0.5 font-mono">{formatAmount(info.total_brn_burned)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total BRN Staked</dt>
              <dd className="mt-0.5 font-mono">{formatAmount(info.total_brn_staked)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Block Count</dt>
              <dd className="mt-0.5 font-mono">{info.block_count}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Confirmation Height</dt>
              <dd className="mt-0.5 font-mono">{info.confirmation_height}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Representative</dt>
              <dd className="mt-0.5 font-mono text-xs break-all">{info.representative}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVerification(true)}
            >
              View Verification Details
            </Button>
          </div>
        </CardContent>
      </Card>

      <VerificationDialog
        data={verification.data}
        open={showVerification}
        onClose={() => setShowVerification(false)}
      />

      {history && history.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.history.map((tx) => (
                <div
                  key={tx.hash}
                  className="flex items-center justify-between rounded-md border px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {blockTypeBadge(tx.block_type)}
                      <span className="font-mono text-xs text-muted-foreground truncate">
                        {truncateHash(tx.hash)}
                      </span>
                    </div>
                    {tx.origin && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        origin: <span className="font-mono">{truncateHash(tx.origin)}</span>
                      </p>
                    )}
                  </div>
                  <div className="ml-4 text-right shrink-0">
                    <p className="font-mono font-medium">{formatAmount(tx.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(tx.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {historyCursor && onLoadMore && (
              <div className="mt-3 flex justify-center">
                <Button variant="outline" size="sm" onClick={onLoadMore}>
                  Load More
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Explorer() {
  const { rpcUrl } = useRpcUrl();
  const [searchType, setSearchType] = useState<"block" | "account">("account");
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"block" | "account">("account");

  const block = useRpc<BlockInfo>(
    "get_block_info",
    activeType === "block" && activeQuery
      ? { rpcUrl, hash: activeQuery }
      : null,
  );

  const account = useRpc<AccountInfo>(
    "get_account_info",
    activeType === "account" && activeQuery
      ? { rpcUrl, account: activeQuery }
      : null,
  );

  const history = useRpc<AccountHistory>(
    "get_account_history",
    activeType === "account" && activeQuery
      ? { rpcUrl, account: activeQuery, count: 20 }
      : null,
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setActiveQuery(trimmed);
    setActiveType(searchType);
  }

  const isLoading =
    (activeType === "block" && block.loading) ||
    (activeType === "account" && account.loading);
  const searchError =
    activeType === "block" ? block.error : account.error;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Tabs
            value={searchType}
            onValueChange={(v) => setSearchType(v as "block" | "account")}
          >
            <TabsList>
              <TabsTrigger value="account">Account Address</TabsTrigger>
              <TabsTrigger value="block">Block Hash</TabsTrigger>
            </TabsList>
            <TabsContent value="account">
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="burst_3abc...xyz"
                  className="font-mono"
                />
                <Button type="submit" disabled={!query.trim()}>
                  <Search className="h-4 w-4" />
                  Lookup
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="block">
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Block hash..."
                  className="font-mono"
                />
                <Button type="submit" disabled={!query.trim()}>
                  <Search className="h-4 w-4" />
                  Lookup
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {searchError && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{searchError}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && activeType === "block" && block.data && (
        <BlockDetail data={block.data} />
      )}

      {!isLoading && activeType === "account" && account.data && (
        <AccountDetail info={account.data} history={history.data} />
      )}

      {!activeQuery && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Search className="mb-3 h-10 w-10" />
          <p className="text-sm">
            Enter an account address or block hash to explore the BURST ledger
          </p>
          <ArrowRight className="mt-2 h-4 w-4" />
        </div>
      )}
    </div>
  );
}
