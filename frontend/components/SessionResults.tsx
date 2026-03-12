"use client";

import { Trophy, Medal, Award, Star, Zap, Terminal, ArrowRight } from "lucide-react";
import type { RoomResult } from "@/lib/contracts/PromptArena";
import { useWallet } from "@/lib/genlayer/wallet";
import { AddressDisplay } from "./AddressDisplay";
import { Button } from "./ui/button";

const XP_BY_RANK = [100, 75, 50, 25, 10];

function getXp(rank: number): number {
  return rank < XP_BY_RANK.length ? XP_BY_RANK[rank] : 5;
}

function RankDisplay({ rank }: { rank: number }) {
  const isTop3 = rank < 3;
  const colors = ["text-yellow-500", "text-slate-400", "text-amber-600"];
  
  return (
    <div className="w-8 shrink-0 flex items-center justify-center">
      <span className={`mono-text text-sm font-bold ${isTop3 ? colors[rank] : "text-muted-foreground"}`}>
        {(rank + 1).toString().padStart(2, '0')}
      </span>
    </div>
  );
}

interface SessionResultsProps {
  results: RoomResult[];
  roomId: number;
  onPlayAgain: () => void;
}

export function SessionResults({
  results,
  roomId,
  onPlayAgain,
}: SessionResultsProps) {
  const { address } = useWallet();
  const myResult = results.find(
    (r) => r.address?.toLowerCase() === address?.toLowerCase()
  );
  const myRank = myResult ? results.indexOf(myResult) : -1;
  const myXp = myRank >= 0 ? getXp(myRank) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-12 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Info */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
          <Terminal className="w-3 h-3" />
          Arena Post-Processing
        </div>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter">Session Results</h1>
      </div>

      {/* XP earned banner */}
      {myResult && (
        <div className="studio-panel p-10 text-center space-y-6 bg-primary/5 border-primary/30 shadow-2xl">
          <div className="space-y-2">
            <p className="text-[10px] text-primary uppercase tracking-[0.2em] font-bold">
              Influence Credit Earned
            </p>
            <div className="flex items-center justify-center gap-4">
              <Zap className="w-8 h-8 text-primary" />
              <div className="flex items-baseline gap-2">
                <span className="text-7xl font-black italic tracking-tighter">{myXp}</span>
                <span className="text-2xl font-bold text-muted-foreground uppercase tracking-widest">XP</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-8 pt-4 border-t border-primary/10">
            <div className="text-center">
              <p className="text-[8px] uppercase text-muted-foreground font-bold tracking-widest">Final Rank</p>
              <p className="text-lg font-bold mono-text text-foreground">#{myRank + 1}</p>
            </div>
            <div className="w-px h-8 bg-primary/10" />
            <div className="text-center">
              <p className="text-[8px] uppercase text-muted-foreground font-bold tracking-widest">Consensus Score</p>
              <p className="text-lg font-bold mono-text text-foreground">{myResult.score}/10</p>
            </div>
          </div>

          {myResult.feedback && (
            <div className="p-4 bg-background/50 border border-primary/10 italic text-xs text-muted-foreground leading-relaxed">
              &ldquo;{myResult.feedback}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Final leaderboard */}
      <div className="studio-panel overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Arena Final Standings
          </h2>
          <span className="text-[8px] font-mono text-muted-foreground uppercase">
            ROOM_ID: {String(roomId).padStart(4, "0")}
          </span>
        </div>

        <div className="divide-y divide-border">
          {results.map((r, i) => {
            const isMe =
              r.address?.toLowerCase() === address?.toLowerCase();
            const xp = getXp(i);

            return (
              <div
                key={r.address}
                className={`p-6 transition-colors ${
                  isMe ? "bg-primary/5" : "hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-6">
                  <RankDisplay rank={i} />
                  <div className="flex-grow flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <AddressDisplay
                        address={r.address}
                        maxLength={14}
                        className={`text-xs mono-text truncate ${isMe ? "font-bold" : ""}`}
                        showCopy={false}
                      />
                      {isMe && (
                        <span className="text-[8px] font-bold text-primary uppercase border border-primary/30 px-1.5 py-0.5">
                          Local
                        </span>
                      )}
                    </div>
                    {r.feedback && (
                      <p className="text-[10px] text-muted-foreground italic truncate">
                        &ldquo;{r.feedback}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold mono-text text-foreground">
                      {r.submitted ? `${r.score}/10` : "DNC"}
                    </div>
                    <div className="text-[8px] font-bold text-primary uppercase tracking-tighter flex items-center gap-1 justify-end">
                      <Zap className="w-2.5 h-2.5" />
                      +{xp} XP
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Note about weekly replayability */}
      <div className="studio-panel p-6 bg-muted/5 border-dashed border-border flex items-start gap-4">
        <Star className="w-5 h-5 text-primary shrink-0 mt-1" />
        <div className="space-y-1">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground">
            Weekly Synchronization Protocol
          </h3>
          <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-wider">
            New AI-generated challenges are synchronized every week. Influence metrics are persistent 
            across all sessions.
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full py-6 text-sm font-bold uppercase tracking-[0.2em] group h-14"
        onClick={onPlayAgain}
      >
        <div className="flex items-center gap-2">
           Return to Terminal
           <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
      </Button>
    </div>
  );
}
