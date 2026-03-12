"use client";

import { Trophy, Loader2, AlertCircle, User, Swords, Terminal, Award, Medal } from "lucide-react";
import { useXpLeaderboard } from "@/lib/hooks/usePromptArena";
import { useOracleXpLeaderboard } from "@/lib/hooks/useOracleArena";
import { useWallet } from "@/lib/genlayer/wallet";
import { AddressDisplay } from "./AddressDisplay";
import { useMemo, useState, useEffect } from "react";

interface GameLeaderboardProps {
  gameType?: "arena" | "trivia" | "all";
  limit?: number;
}

export function GameLeaderboard({ gameType = "all", limit = 10 }: GameLeaderboardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { address: currentAddress } = useWallet();
  
  const { 
    data: promptEntries = [], 
    isLoading: promptLoading, 
    isError: promptError 
  } = useXpLeaderboard();
  
  const { 
    data: oracleEntries = [], 
    isLoading: oracleLoading, 
    isError: oracleError 
  } = useOracleXpLeaderboard();

  const mergedEntries = useMemo(() => {
    const registry: Record<string, { address: string; promptXp: number; oracleXp: number; totalXp: number }> = {};

    promptEntries.forEach(entry => {
      const addr = entry.address.toLowerCase();
      if (!registry[addr]) {
        registry[addr] = { address: entry.address, promptXp: 0, oracleXp: 0, totalXp: 0 };
      }
      registry[addr].promptXp += Number(entry.xp || 0);
    });

    oracleEntries.forEach(entry => {
      const addr = (entry.address || "").toLowerCase();
      if (!addr) return;
      if (!registry[addr]) {
        registry[addr] = { address: entry.address, promptXp: 0, oracleXp: 0, totalXp: 0 };
      }
      registry[addr].oracleXp += Number(entry.xp || 0);
    });

    return Object.values(registry)
      .map(item => ({
        ...item,
        totalXp: item.promptXp + item.oracleXp
      }))
      .filter(item => {
        if (gameType === "arena") return item.promptXp > 0;
        if (gameType === "trivia") return item.oracleXp > 0;
        return item.totalXp > 0;
      })
      .sort((a, b) => {
        if (gameType === "arena") return b.promptXp - a.promptXp;
        if (gameType === "trivia") return b.oracleXp - a.oracleXp;
        return b.totalXp - a.totalXp;
      });
  }, [promptEntries, oracleEntries, gameType]);

  const isLoading = gameType === "arena" ? promptLoading : (gameType === "trivia" ? oracleLoading : (promptLoading || oracleLoading));
  const isError = gameType === "arena" ? promptError : (gameType === "trivia" ? oracleError : (promptError || oracleError));

  if (!mounted || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
          SYNCHRONIZING_LEDGER...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-destructive">
        <AlertCircle className="w-6 h-6" />
        <p className="text-[11px] font-bold uppercase tracking-[0.2em]">
          DATA_SYNC_FAILURE
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/30 dark:divide-white/10" id="leaderboard">
      {mergedEntries.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] italic">
            NO_DATA_FOUND
          </p>
        </div>
      ) : (
        mergedEntries.slice(0, limit).map((entry, i) => {
          const isMe = entry.address.toLowerCase() === currentAddress?.toLowerCase();
          const displayXp = gameType === "arena" ? entry.promptXp : (gameType === "trivia" ? entry.oracleXp : entry.totalXp);
          
          const getRankDisplay = (index: number) => {
            switch (index) {
              case 0: return <Trophy className="w-4 h-4 text-yellow-500" />;
              case 1: return <Medal className="w-4 h-4 text-slate-400" />;
              case 2: return <Award className="w-4 h-4 text-amber-700" />;
              default: return (
                <span className="text-xs font-mono text-muted-foreground font-bold opacity-50">
                  {(index + 1).toString().padStart(2, '0')}
                </span>
              );
            }
          };
          
          return (
            <div
              key={entry.address}
              className={`flex items-center gap-4 p-4 transition-colors ${
                isMe ? "bg-primary/5" : "hover:bg-muted/30"
              }`}
            >
              <div className="w-8 shrink-0 flex items-center justify-center">
                {getRankDisplay(i)}
              </div>
              
              <div className="flex-grow flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-sm flex items-center justify-center shrink-0 border ${isMe ? "bg-primary/10 border-primary/30" : "bg-muted/5 border-border/50"}`}>
                  <User className={`w-4 h-4 ${isMe ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex flex-col min-w-0">
                  <AddressDisplay address={entry.address} maxLength={14} className={`text-sm mono-text truncate ${isMe ? "font-bold text-primary" : "text-foreground"}`} showCopy={false} />
                  {gameType === "all" && (
                    <div className="flex items-center gap-3 mt-0.5">
                      {entry.promptXp > 0 && (
                        <div className="flex items-center gap-1 opacity-60">
                          <Swords className="w-2.5 h-2.5 text-secondary" />
                          <span className="text-[9px] font-bold text-muted-foreground">{entry.promptXp}</span>
                        </div>
                      )}
                      {entry.oracleXp > 0 && (
                        <div className="flex items-center gap-1 opacity-60">
                          <Terminal className="w-2.5 h-2.5 text-primary" />
                          <span className="text-[9px] font-bold text-muted-foreground">{entry.oracleXp}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="flex items-center gap-1.5 justify-end">
                   <span className={`text-base font-black italic tracking-tighter ${i < 3 ? "text-foreground" : "text-muted-foreground"}`}>
                     {displayXp}
                   </span>
                   <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">XP</span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
