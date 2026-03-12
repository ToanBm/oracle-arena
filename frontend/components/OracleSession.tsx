"use client";

import { useState, useEffect } from "react";
import { 
  Globe, 
  Timer, 
  Loader2, 
  CheckCircle, 
  Trophy,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Terminal,
  Activity,
  ArrowRight,
  CircleDashed
} from "lucide-react";
import type { OracleRoom, OracleQuestion, OracleRoomResult } from "@/lib/contracts/OracleArena";
import { useWallet } from "@/lib/genlayer/wallet";
import { AddressDisplay } from "./AddressDisplay";
import { Button } from "./ui/button";

const QUESTION_COUNT = 5;

function useCountdown(startTime: number, duration: number) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const update = () => {
      const elapsed = Math.floor(Date.now() / 1000) - startTime;
      setRemaining(Math.max(0, duration - elapsed));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startTime, duration]);
  return remaining;
}

const OPTION_LABELS = ["A", "B", "C", "D"] as const;
const OPTION_KEYS = ["a", "b", "c", "d"] as const;

export function OracleSession({ 
  room, 
  questions, 
  questionsError, 
  results, 
  players, 
  onSubmit, 
  isSubmitting 
}: {
  room: OracleRoom;
  questions: OracleQuestion[];
  questionsError?: boolean;
  results: OracleRoomResult[];
  players: string[];
  onSubmit: (answers: string) => void;
  isSubmitting: boolean;
}) {
  const { address, isConnected } = useWallet();
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>(Array(QUESTION_COUNT).fill(""));
  const [currentQ, setCurrentQ] = useState(0);

  const remaining = useCountdown(room.start_time, room.duration);
  const timeLabel = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  const isTimeLow = remaining < 60;

  const myResult = results.find((r) => r.address?.toLowerCase() === address?.toLowerCase());
  const hasSubmitted = myResult?.submitted ?? false;
  const allAnswered = selectedAnswers.every((a) => a !== "");

  const handleSelect = (qIdx: number, opt: string) => {
    if (hasSubmitted || isSubmitting || remaining === 0) return;
    setSelectedAnswers((prev) => {
      const next = [...prev];
      next[qIdx] = opt;
      return next;
    });
  };

  const q = questions[currentQ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700">
      
      {/* Top Progress & Timer Bar */}
      <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${isTimeLow ? "bg-destructive" : "bg-accent"}`}
          style={{ width: `${(remaining / room.duration) * 100}%` }}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-180px)]">
        
        {/* LEFT COLUMN: Controls & Navigation (40%) */}
        <div className="lg:w-[40%] flex flex-col gap-6 overflow-y-auto pr-2">
          
          {/* Synchronization Status */}
          <div className="studio-panel p-8 space-y-6 bg-accent/5 border-accent/20">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-accent font-bold">
                Oracle Sync Active
              </p>
              <div className={`text-6xl font-black italic tracking-tighter mono-text ${isTimeLow ? "text-destructive" : "text-foreground"}`}>
                {remaining === 0 ? "EXPIRED" : timeLabel}
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
               <Activity className="w-4 h-4 text-accent" />
               Consensus Frequency: 1.2Hz
            </div>
          </div>

          {/* Matrix Navigator */}
          <div className="studio-panel p-6 space-y-4">
             <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <Terminal className="w-4 h-4" />
               Question Matrix
             </h3>
             <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: QUESTION_COUNT }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentQ(i)}
                    className={`h-12 border flex items-center justify-center font-mono text-sm font-bold transition-all ${
                      i === currentQ 
                        ? "bg-foreground text-background border-foreground" 
                        : selectedAnswers[i]
                        ? "bg-accent/10 border-accent/30 text-accent"
                        : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {(i + 1).toString().padStart(2, '0')}
                  </button>
                ))}
             </div>
          </div>

          {/* Live Consensus Feed */}
          <div className="studio-panel p-6 flex-grow space-y-4 overflow-hidden">
             <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <ShieldCheck className="w-4 h-4" />
               Peer Validation Status
             </h3>
             <div className="space-y-2 overflow-y-auto max-h-[300px] pr-2">
                {players.map(p => {
                  const res = results.find(r => r.address.toLowerCase() === p.toLowerCase());
                  const isMe = p.toLowerCase() === address?.toLowerCase();
                  return (
                    <div key={p} className={`flex items-center justify-between p-3 border transition-colors ${isMe ? "bg-accent/5 border-accent/30" : "bg-muted/10 border-border"}`}>
                      <AddressDisplay address={p} maxLength={12} className="text-[10px] mono-text" showCopy={false} />
                      {res?.submitted ? (
                        <div className="text-[10px] font-bold text-accent flex items-center gap-1.5 uppercase tracking-tighter">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          Locked
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-tighter">
                          <CircleDashed className="w-3 h-3 animate-spin-slow" />
                          Syncing
                        </div>
                      )}
                    </div>
                  );
                })}
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Stream (60%) */}
        <div className="lg:w-[60%] flex flex-col studio-panel overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/30">
             <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-accent" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Data Stream // Object_{currentQ + 1}
                </span>
             </div>
             <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                {allAnswered ? "Buffer Locked" : "Input Required"}
             </div>
          </div>
          
          <div className="flex-grow p-10 flex flex-col">
             {hasSubmitted ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center space-y-8">
                   <div className="space-y-2">
                      <div className="flex justify-center mb-4">
                         <div className="p-4 rounded-full bg-accent/10 border border-accent/20">
                            <CheckCircle className="w-10 h-10 text-accent" />
                         </div>
                      </div>
                      <h4 className="text-4xl font-black italic uppercase tracking-tighter">Broadcast Complete</h4>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                        Data packets have been synchronized with the GenLayer network. 
                        Awaiting final block validation.
                      </p>
                   </div>
                   <div className="p-6 studio-panel bg-muted/30 w-full max-w-xs space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your Sequence</p>
                      <div className="text-3xl font-mono font-bold tracking-[0.4em] text-foreground">
                        {selectedAnswers.join("")}
                      </div>
                   </div>
                </div>
             ) : !q ? (
                <div className="flex-grow flex items-center justify-center">
                   <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin text-accent" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Decoding...</span>
                   </div>
                </div>
             ) : (
                <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                   <div className="space-y-3">
                      <div className="flex items-center gap-2">
                         <div className="w-1 h-4 bg-accent" />
                         <p className="text-[10px] font-bold text-accent uppercase tracking-[0.3em]">Query Parameter</p>
                      </div>
                      <h2 className="text-3xl font-bold leading-tight tracking-tight">{q.text}</h2>
                   </div>

                   <div className="grid grid-cols-1 gap-4">
                      {OPTION_KEYS.map((key, ki) => {
                        const isSelected = selectedAnswers[currentQ] === key;
                        return (
                          <button
                            key={key}
                            onClick={() => handleSelect(currentQ, key)}
                            className={`group flex items-center gap-6 p-5 border transition-all text-left ${
                              isSelected 
                                ? "bg-foreground text-background border-foreground font-bold" 
                                : "bg-muted/10 border-border hover:bg-muted/30 hover:border-muted-foreground/30"
                            }`}
                          >
                            <div className={`w-10 h-10 border flex items-center justify-center font-mono font-black text-sm transition-colors ${
                              isSelected ? "bg-background text-foreground border-transparent" : "bg-muted/30 text-muted-foreground border-border"
                            }`}>
                              {OPTION_LABELS[ki]}
                            </div>
                            <span className="flex-1 text-sm tracking-tight">{q[key]}</span>
                          </button>
                        );
                      })}
                   </div>
                </div>
             )}
          </div>

          <div className="p-6 border-t border-border bg-muted/10 flex items-center justify-between">
             <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="h-10 px-4 font-bold uppercase tracking-widest text-[10px]"
                  disabled={currentQ === 0}
                  onClick={() => setCurrentQ(prev => prev - 1)}
                >
                   <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <Button 
                  variant="outline" 
                  className="h-10 px-4 font-bold uppercase tracking-widest text-[10px]"
                  disabled={currentQ === QUESTION_COUNT - 1}
                  onClick={() => setCurrentQ(prev => prev + 1)}
                >
                   Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
             </div>
             
             {!hasSubmitted && (
               <Button 
                 variant="outline"
                 className="h-10 px-8 font-bold uppercase tracking-widest text-xs border-accent text-accent hover:bg-accent hover:text-black transition-all group"
                 disabled={!allAnswered || isSubmitting || remaining === 0}
                 onClick={() => onSubmit(selectedAnswers.join(""))}
               >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Commit Selections
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
               </Button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
