"use client";

import { Trophy, Medal, Award, Zap, Globe, CheckCircle, XCircle, Terminal, ArrowRight, Activity } from "lucide-react";
import type { OracleRoomResult, OracleQuestion } from "@/lib/contracts/OracleArena";
import { useWallet } from "@/lib/genlayer/wallet";
import { AddressDisplay } from "./AddressDisplay";
import { Button } from "./ui/button";

const XP_BY_RANK = [100, 75, 50, 25, 10];
const OPTION_LABELS: Record<string, string> = { a: "A", b: "B", c: "C", d: "D" };
const QUESTION_COUNT = 5;

function getXp(rank: number): number {
  return rank < XP_BY_RANK.length ? XP_BY_RANK[rank] : 10;
}

function RankDisplay({ rank }: { rank: number }) {
  const isTop3 = rank < 3;
  const colors = ["text-accent", "text-slate-400", "text-amber-600"];
  
  return (
    <div className="w-8 shrink-0 flex items-center justify-center">
      <span className={`mono-text text-sm font-bold ${isTop3 ? colors[rank] : "text-muted-foreground"}`}>
        {(rank + 1).toString().padStart(2, '0')}
      </span>
    </div>
  );
}

interface OracleResultsProps {
  results: OracleRoomResult[];
  questions: OracleQuestion[];
  correctAnswers: string[];  // ["a","c","d","b","a"]
  roomId: number;
  onPlayAgain: () => void;
}

export function OracleResults({ results, questions, correctAnswers, roomId, onPlayAgain }: OracleResultsProps) {
  const { address } = useWallet();
  const myResult = results.find((r) => r.address?.toLowerCase() === address?.toLowerCase());
  const myRank = myResult ? results.indexOf(myResult) : -1;
  const myXp = myRank >= 0 ? getXp(myRank) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-12 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Info */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
          <Terminal className="w-3 h-3" />
          Oracle Session Finalized
        </div>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter">Final Sync Report</h1>
      </div>

      {/* XP earned banner */}
      {myResult && (
        <div className="studio-panel p-10 text-center space-y-6 bg-accent/5 border-accent/30 shadow-2xl">
          <div className="space-y-2">
            <p className="text-[10px] text-accent uppercase tracking-[0.2em] font-bold">
              Consensus Reward Allocated
            </p>
            <div className="flex items-center justify-center gap-4">
              <Zap className="w-8 h-8 text-accent" />
              <div className="flex items-baseline gap-2">
                <span className="text-7xl font-black italic tracking-tighter text-foreground">{myXp}</span>
                <span className="text-2xl font-bold text-muted-foreground uppercase tracking-widest">XP</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-8 pt-4 border-t border-accent/10">
            <div className="text-center">
              <p className="text-[8px] uppercase text-muted-foreground font-bold tracking-widest">Global Rank</p>
              <p className="text-lg font-bold mono-text text-foreground">#{myRank + 1}</p>
            </div>
            <div className="w-px h-8 bg-accent/10" />
            <div className="text-center">
              <p className="text-[8px] uppercase text-muted-foreground font-bold tracking-widest">Accuracy</p>
              <p className="text-lg font-bold mono-text text-foreground">{myResult.score}/{QUESTION_COUNT}</p>
            </div>
          </div>
        </div>
      )}

      {/* Final leaderboard */}
      <div className="studio-panel overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <Trophy className="w-4 h-4 text-accent" />
            Oracle Table Standings
          </h2>
          <span className="text-[8px] font-mono text-muted-foreground uppercase">
            SYNC_ID: {String(roomId).padStart(4, "0")}
          </span>
        </div>

        <div className="divide-y divide-border">
          {results.map((r, i) => {
            const isMe = r.address?.toLowerCase() === address?.toLowerCase();
            const xp = getXp(i);
            return (
              <div
                key={r.address}
                className={`p-6 transition-colors ${
                  isMe ? "bg-accent/5" : "hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-6">
                  <RankDisplay rank={i} />
                  <div className="flex-grow flex items-center gap-3 min-w-0">
                    <AddressDisplay
                      address={r.address}
                      maxLength={14}
                      className={`text-xs mono-text truncate ${isMe ? "font-bold" : ""}`}
                      showCopy={false}
                    />
                    {isMe && (
                      <span className="text-[8px] font-bold text-accent uppercase border border-accent/30 px-1.5 py-0.5">
                        Local
                      </span>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold mono-text text-foreground">
                      {r.submitted ? `${r.score}/${QUESTION_COUNT}` : "SYNC_ERR"}
                    </div>
                    <div className="text-[8px] font-bold text-accent uppercase tracking-tighter flex items-center gap-1 justify-end">
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

      {/* Answer review */}
      {questions.length > 0 && correctAnswers.length > 0 && (
        <div className="studio-panel overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <h2 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              Consensus Review
            </h2>
          </div>
          <div className="divide-y divide-border">
            {questions.map((q, i) => {
              const correct = correctAnswers[i] ?? "";
              const myAnswer = myResult?.answers?.[i] ?? "";
              const isCorrect = myAnswer === correct;
              return (
                <div key={i} className="p-8 space-y-6 hover:bg-muted/10 transition-colors">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Buffer_{i + 1}</p>
                    <h3 className="text-lg font-bold leading-tight">{q.text}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(["a", "b", "c", "d"] as const).map((key) => {
                      const isCorrectOpt = key === correct;
                      const isMyAnswer = key === myAnswer;
                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-3 px-4 py-3 border text-xs mono-text transition-all ${
                            isCorrectOpt
                              ? "bg-green-500/5 border-green-500/30 text-green-500 font-bold"
                              : isMyAnswer && !isCorrectOpt
                              ? "bg-destructive/5 border-destructive/30 text-destructive font-bold"
                              : "bg-background border-border text-muted-foreground"
                          }`}
                        >
                          <span className={`w-6 h-6 border flex items-center justify-center shrink-0 ${
                            isCorrectOpt ? "bg-green-500 text-background border-transparent" : 
                            isMyAnswer ? "bg-destructive text-background border-transparent" : "bg-muted/30 border-border"
                          }`}>
                            {OPTION_LABELS[key]}
                          </span>
                          <span className="truncate">{q[key]}</span>
                          {isCorrectOpt && <CheckCircle className="w-3 h-3 ml-auto shrink-0" />}
                          {isMyAnswer && !isCorrectOpt && <XCircle className="w-3 h-3 ml-auto shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                  
                  {myResult?.submitted && (
                    <div className="flex items-center gap-2 pt-2">
                       <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Validation Status:</span>
                       <span className={`text-[10px] font-bold uppercase tracking-widest ${isCorrect ? "text-green-500" : "text-destructive"}`}>
                          {isCorrect ? "Success_Pattern_Matched" : "Consensus_Mismatch"}
                       </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full py-6 text-sm font-bold uppercase tracking-[0.2em] group h-14 border-accent text-accent hover:bg-accent hover:text-black"
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
