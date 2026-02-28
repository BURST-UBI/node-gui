import { useState } from "react";
import { Vote, ChevronRight, Info, BookOpen, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useRpc, useRpcUrl } from "@/hooks/use-rpc";
import {
  formatTimestamp,
  formatAmount,
  truncateHash,
  truncateAddress,
} from "@/lib/utils";
import type {
  ProposalList,
  Proposal,
  Consti,
  RepresentativeList,
} from "@/lib/types";

const PHASE_COLORS: Record<string, string> = {
  proposal: "border-zinc-500/50 bg-zinc-500/10 text-zinc-400",
  voting: "border-blue-500/50 bg-blue-500/10 text-blue-400",
  cooldown: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  activated: "border-green-500/50 bg-green-500/10 text-green-400",
  rejected: "border-red-500/50 bg-red-500/10 text-red-400",
};

function phaseBadge(phase: string) {
  const color = PHASE_COLORS[phase.toLowerCase()] ?? PHASE_COLORS.proposal;
  return <Badge variant="outline" className={`text-xs ${color}`}>{phase}</Badge>;
}

function VoteBar({ yea, nay, abstain }: { yea: number; nay: number; abstain: number }) {
  const total = yea + nay + abstain;
  if (total === 0) {
    return <div className="h-2 w-full rounded-full bg-muted" />;
  }
  const yeaPct = (yea / total) * 100;
  const nayPct = (nay / total) * 100;

  return (
    <div className="space-y-1">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="bg-green-500 transition-all" style={{ width: `${yeaPct}%` }} />
        <div className="bg-red-500 transition-all" style={{ width: `${nayPct}%` }} />
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
        <span className="text-green-400">Yea: {yea.toLocaleString()} ({yeaPct.toFixed(1)}%)</span>
        <span className="text-red-400">Nay: {nay.toLocaleString()} ({nayPct.toFixed(1)}%)</span>
        <span>Abstain: {abstain.toLocaleString()}</span>
      </div>
    </div>
  );
}

function Countdown({ deadline }: { deadline: number }) {
  const now = Math.floor(Date.now() / 1000);
  const remaining = deadline - now;
  if (remaining <= 0) return <span className="text-muted-foreground">Expired</span>;
  const hours = Math.floor(remaining / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return <span className="font-mono text-xs">{days}d {hours % 24}h remaining</span>;
  }
  return <span className="font-mono text-xs">{hours}h {mins}m remaining</span>;
}

function ProposalCard({
  proposal,
  onClick,
}: {
  proposal: Proposal;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={onClick}
    >
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {phaseBadge(proposal.phase)}
              <span className="font-mono text-xs text-muted-foreground">
                {truncateHash(proposal.hash)}
              </span>
              {proposal.param && (
                <Badge variant="secondary" className="text-[10px]">
                  {proposal.param} → {proposal.proposed_value}
                </Badge>
              )}
            </div>
            <p className="text-sm">{proposal.description}</p>
            <p className="font-mono text-xs text-muted-foreground">
              Proposer: {truncateAddress(proposal.proposer)}
            </p>
            <VoteBar
              yea={proposal.votes_yea}
              nay={proposal.votes_nay}
              abstain={proposal.votes_abstain}
            />
            {proposal.phase_deadline > 0 && (
              <Countdown deadline={proposal.phase_deadline} />
            )}
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Governance() {
  const { rpcUrl } = useRpcUrl();
  const { data: proposals, loading: pLoading, error: pError } =
    useRpc<ProposalList>("get_governance_proposals", { rpcUrl }, 30000);
  const { data: consti, loading: cLoading, error: constiError } =
    useRpc<Consti>("get_consti", { rpcUrl }, 60000);
  const { data: reps, loading: rLoading } =
    useRpc<RepresentativeList>("get_representatives", { rpcUrl }, 30000);

  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const selectedProposal = selectedHash
    ? proposals?.proposals.find((p) => p.hash === selectedHash)
    : null;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="proposals">
        <TabsList>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="consti">Consti</TabsTrigger>
          <TabsTrigger value="representatives">Representatives</TabsTrigger>
        </TabsList>

        <TabsContent value="proposals" className="space-y-4">
          {pError && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-destructive">{pError}</p>
              </CardContent>
            </Card>
          )}

          {pLoading && !proposals && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full" />
              ))}
            </div>
          )}

          {proposals && proposals.proposals.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Vote className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No active proposals
                </p>
              </CardContent>
            </Card>
          )}

          {proposals && proposals.proposals.length > 0 && (
            <div className="space-y-3">
              {proposals.proposals.map((p) => (
                <ProposalCard
                  key={p.hash}
                  proposal={p}
                  onClick={() => setSelectedHash(p.hash)}
                />
              ))}
            </div>
          )}

          <Dialog
            open={!!selectedProposal}
            onOpenChange={(open) => {
              if (!open) setSelectedHash(null);
            }}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Proposal Detail</DialogTitle>
                <DialogDescription className="font-mono text-xs break-all">
                  {selectedHash}
                </DialogDescription>
              </DialogHeader>

              {selectedProposal && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {phaseBadge(selectedProposal.phase)}
                    {selectedProposal.phase_deadline > 0 && (
                      <Countdown deadline={selectedProposal.phase_deadline} />
                    )}
                  </div>

                  <p className="text-sm">{selectedProposal.description}</p>

                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">Proposer</dt>
                      <dd className="mt-0.5 font-mono text-xs break-all">
                        {selectedProposal.proposer}
                      </dd>
                    </div>
                    {selectedProposal.param && (
                      <div>
                        <dt className="text-muted-foreground">Parameter</dt>
                        <dd className="mt-0.5 font-mono">{selectedProposal.param}</dd>
                      </div>
                    )}
                    {selectedProposal.proposed_value && (
                      <div>
                        <dt className="text-muted-foreground">Proposed Value</dt>
                        <dd className="mt-0.5 font-mono">
                          {selectedProposal.proposed_value}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-muted-foreground">Created</dt>
                      <dd className="mt-0.5 font-mono text-sm">
                        {formatTimestamp(selectedProposal.created_at)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Phase Deadline</dt>
                      <dd className="mt-0.5 font-mono text-sm">
                        {formatTimestamp(selectedProposal.phase_deadline)}
                      </dd>
                    </div>
                  </dl>

                  <VoteBar
                    yea={selectedProposal.votes_yea}
                    nay={selectedProposal.votes_nay}
                    abstain={selectedProposal.votes_abstain}
                  />
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="consti" className="space-y-4">
          {constiError && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Consti (on-chain constitution) is not available on this node.
                </p>
                <p className="mt-2 text-xs text-muted-foreground/80">{constiError}</p>
              </CardContent>
            </Card>
          )}

          {cLoading && !consti && !constiError && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          )}

          {consti && !constiError && consti.articles.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No constitutional articles adopted yet
                </p>
              </CardContent>
            </Card>
          )}

          {consti && !constiError && consti.articles.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground">
                Amendment threshold: <span className="font-mono">{consti.amendment_threshold}</span>
              </p>
              <div className="space-y-3">
                {consti.articles.map((article) => (
                  <Card key={article.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{article.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {article.text}
                      </p>
                      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                        <span>Adopted: {formatTimestamp(article.adopted_at)}</span>
                        {article.amended_at && (
                          <span>Last amended: {formatTimestamp(article.amended_at)}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          <div className="rounded-lg border-l-4 border-primary bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  The Consti is BURST's on-chain constitution.
                </p>
                <p className="mt-1">
                  Governance that can't be reduced to numbers. It defines legitimacy, fraud,
                  evidence standards, and participant rights. Articles can only be amended
                  through the same democratic governance process as protocol parameters.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="representatives" className="space-y-4">
          {rLoading && !reps && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {reps && reps.representatives.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No representatives found
                </p>
              </CardContent>
            </Card>
          )}

          {reps && reps.representatives.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">#</th>
                        <th className="pb-2 pr-4 font-medium">Account</th>
                        <th className="pb-2 pr-4 font-medium">Weight</th>
                        <th className="pb-2 font-medium">Delegators</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {reps.representatives
                        .sort((a, b) => Number(b.weight) - Number(a.weight))
                        .map((rep, i) => (
                          <tr key={rep.account} className="hover:bg-muted/50">
                            <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                              {i + 1}
                            </td>
                            <td className="py-2.5 pr-4 font-mono text-xs">
                              {truncateAddress(rep.account)}
                            </td>
                            <td className="py-2.5 pr-4 font-mono text-xs font-medium">
                              {formatAmount(rep.weight)}
                            </td>
                            <td className="py-2.5 font-mono text-xs">
                              {rep.delegator_count.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
