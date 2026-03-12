"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Send, 
  Loader2, 
  Timer, 
  Swords, 
  ShieldCheck, 
  Cpu,
  Zap,
  CheckCircle2,
  CircleDashed,
  Trophy,
  ArrowRight,
  Terminal,
  X
} from "lucide-react";
import type { Room, WeeklyChallenge, RoomResult } from "@/lib/contracts/PromptArena";
import { useWallet } from "@/lib/genlayer/wallet";
import { AddressDisplay } from "./AddressDisplay";
import { Button } from "./ui/button";

const MAX_PROMPT_LENGTH = 500;
const MIN_PROMPT_LENGTH = 10;

function useCountdown(startTime: number, duration: number) {
  const [remaining, setRemaining] = useState<number>(0);
  useEffect(() => {
    const update = () => {
      const elapsed = Math.floor(Date.now() / 1000) - startTime;
      const left = Math.max(0, duration - elapsed);
      setRemaining(left);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime, duration]);
  return remaining;
}

export function RoomSession({
  room,
  challenge,
  results,
  players,
  onSubmit,
  isSubmitting,
}: {
  room: Room;
  challenge: WeeklyChallenge;
  results: RoomResult[];
  players: string[];
  onSubmit: (prompt: string) => void;
  isSubmitting: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const [activeTab, setActiveTab] = useState<"briefing" | "competitors">("briefing");
  const [showResultPopup, setShowResultPopup] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  const { address, isConnected } = useWallet();
  const remaining = useCountdown(room.start_time, room.duration);
  
  const myResult = results.find(r => r.address?.toLowerCase() === address?.toLowerCase());
  const hasSubmitted = myResult?.submitted ?? false;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (myResult?.score && myResult.score > 0) {
      setShowResultPopup(true);
    }
  }, [myResult?.score]);
  
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeLabel = `${minutes}:${String(seconds).padStart(2, "0")}`;

  const ResultModal = (hasSubmitted && showResultPopup) ? (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-10 pointer-events-auto">
       <div 
         className="absolute inset-0 bg-background/80 backdrop-blur-xl cursor-pointer" 
         onClick={() => setShowResultPopup(false)}
       />
       
       <div className="relative max-w-3xl w-full studio-panel p-8 md:p-12 text-center space-y-10 bg-card border-border shadow-2xl animate-in fade-in zoom-in-95 duration-500 overflow-y-auto max-h-[90vh]">
          <button 
            onClick={() => setShowResultPopup(false)}
            className="absolute top-4 right-4 p-2 rounded-sm hover:bg-muted transition-colors text-muted-foreground hover:text-foreground z-50"
          >
            <X className="w-6 h-6" />
          </button>

          {myResult?.score && myResult.score > 0 ? (
            <>
              <div className="space-y-4">
                 <div className="inline-flex items-center gap-2 px-5 py-2 rounded-sm bg-muted/30 border border-border text-[11px] uppercase font-extrabold text-primary tracking-[0.2em] shadow-sm">
                    <Trophy className="w-3.5 h-3.5" />
                    VALIDATION FINALIZED
                 </div>
                 <h4 className="text-7xl font-black italic tracking-tighter text-foreground drop-shadow-sm">
                   {myResult.score}<span className="text-4xl text-muted-foreground ml-1">/10</span>
                 </h4>
              </div>
              
              <div className="space-y-4 text-left">
                <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-[0.2em] text-center">CONSENSUS FEEDBACK</p>
                <div className="p-8 bg-muted/30 border border-border rounded-md italic text-base text-foreground leading-relaxed font-medium shadow-inner">
                  &ldquo;{myResult.feedback}&rdquo;
                </div>
              </div>

              <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-center gap-6">
                 <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-muted-foreground tracking-[0.2em]">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    PROOF OF CONSENSUS VERIFIED
                 </div>
                 <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-muted-foreground tracking-[0.2em]">
                    <ShieldCheck className="w-4 h-4 text-secondary" />
                    IMMUTABLE RECORD LOGGED
                 </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full sm:w-auto px-10 rounded-sm font-bold uppercase tracking-[0.2em] text-[11px] h-12 border-border hover:bg-muted transition-all"
                onClick={() => setShowResultPopup(false)}
              >
                CLOSE TRANSCRIPT
              </Button>
            </>
          ) : (
            <div className="py-10">
               <ConsensusStepper />
            </div>
          )}
       </div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-180px)]">
        <div className="lg:w-[60%] flex flex-col studio-panel overflow-hidden bg-muted/10 border-border">
          <div className="flex items-center justify-between p-1.5 border-b border-border bg-muted/30">
             <div className="flex items-center gap-2 px-4.5 py-1.5">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">PROMPT EDITOR // V1.0</span>
             </div>
             <div className="flex items-center gap-4 px-4.5">
                <span className="text-[11px] font-mono text-muted-foreground tracking-[0.2em]">
                   {prompt.length}/{MAX_PROMPT_LENGTH} CHARS
                </span>
                <div className="w-px h-3 bg-border" />
                <span className={`text-[11px] font-mono font-bold tracking-[0.2em] ${remaining < 60 ? "text-destructive" : "text-primary"}`}>
                   {timeLabel}
                </span>
             </div>
          </div>
          <div className="flex-grow relative overflow-hidden">
             <textarea
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
               disabled={hasSubmitted || isSubmitting}
               placeholder="System awaiting input... Construct your persuasive neural prompt here."
               className="w-full h-full p-8 bg-transparent text-foreground mono-text text-sm resize-none focus:outline-none placeholder:text-muted-foreground/20 leading-relaxed"
             />
             {hasSubmitted && !showResultPopup && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center p-8 z-20">
                   <Button 
                    variant="outline" 
                    className="rounded-sm px-8 py-6 bg-background/80 border-primary/30 text-primary font-bold uppercase tracking-[0.2em] text-[11px] shadow-2xl hover:bg-primary hover:text-white transition-all"
                    onClick={() => setShowResultPopup(true)}
                   >
                     VIEW VALIDATION RESULT
                   </Button>
                </div>
             )}
          </div>
          <div className="p-6 border-t border-border bg-muted/10 flex items-center justify-between">
             <div className="flex gap-6">
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase text-muted-foreground font-bold tracking-[0.2em]">INPUT MODE</span>
                  <span className="text-sm font-mono font-bold">PERSUASIVE_NL</span>
                </div>
                <div className="flex flex-col">
                   <span className="text-[11px] uppercase text-muted-foreground font-bold tracking-[0.2em]">NETWORK</span>
                   <span className="text-sm font-mono font-bold text-green-500">STUDIO_NET</span>
                </div>
             </div>
             <Button 
               variant="outline" 
               className="px-10 font-bold uppercase tracking-[0.2em] text-[11px] h-10 group rounded-sm"
               disabled={hasSubmitted || isSubmitting || prompt.length < MIN_PROMPT_LENGTH}
               onClick={() => onSubmit(prompt)}
             >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    TRANSMIT PROMPT
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </>
                )}
             </Button>
          </div>
        </div>
        <div className="lg:w-[40%] flex flex-col studio-panel overflow-hidden bg-muted/10 border-border">
          <div className="flex border-b border-border bg-muted/30 p-1.5 gap-1.5">
            <button
              onClick={() => setActiveTab("briefing")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-bold uppercase tracking-[0.2em] rounded-sm transition-all ${
                activeTab === "briefing" 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              BRIEFING
            </button>
            <button
              onClick={() => setActiveTab("competitors")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-bold uppercase tracking-[0.2em] rounded-sm transition-all ${
                activeTab === "competitors" 
                  ? "bg-secondary text-white shadow-lg shadow-secondary/20" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              COMPETITORS
            </button>
          </div>
          <div className="flex-grow overflow-y-auto p-8">
            {activeTab === "briefing" ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase text-muted-foreground font-bold tracking-[0.2em] opacity-60">MISSION SCENARIO</p>
                  <p className="text-base leading-relaxed text-foreground font-medium italic border-l-2 border-primary/30 pl-5 py-1">
                    &ldquo;{challenge.scenario}&rdquo;
                  </p>
                </div>
                <div className="space-y-3">
                  <p className="text-[11px] uppercase text-primary font-bold tracking-[0.2em]">PRIMARY OBJECTIVE</p>
                  <div className="p-6 bg-primary/5 border border-primary/20 rounded-md">
                    <p className="text-sm font-bold leading-relaxed text-foreground">
                      {challenge.objective}
                    </p>
                  </div>
                </div>
                <div className="p-6 bg-muted/20 border border-border rounded-md space-y-3">
                   <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-muted-foreground tracking-[0.2em]">
                      <Zap className="w-3.5 h-3.5 text-primary" />
                      CONSENSUS STRATEGY
                   </div>
                   <p className="text-xs text-muted-foreground italic leading-relaxed">
                     Validators will cross-reference your prompt against the objective using decentralized LLM nodes. High logical consistency and persuasive depth are required for a max score.
                   </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[11px] font-bold uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2">
                    BATTLE MANIFEST
                  </h3>
                  <div className="text-[11px] font-bold text-secondary uppercase tracking-[0.2em]">
                    {players.length} ACTIVE NODES
                  </div>
                </div>
                <div className="space-y-3">
                  {players.map(p => {
                    const res = results.find(r => r.address.toLowerCase() === p.toLowerCase());
                    const isMe = p.toLowerCase() === address?.toLowerCase();
                    return (
                      <div key={p} className={`flex items-center justify-between p-4 rounded-md border transition-all ${
                        isMe ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            res?.submitted ? "bg-green-500" : "bg-primary animate-pulse"
                          }`} />
                          <AddressDisplay address={p} maxLength={12} className="text-xs mono-text font-medium" showCopy={false} />
                        </div>
                        {res?.submitted ? (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-green-500 uppercase tracking-[0.2em]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {res.score > 0 ? `SCORE: ${res.score}` : "SYNCING"}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-50">
                            <CircleDashed className="w-3.5 h-3.5 animate-spin-slow" />
                            CODING
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {mounted && createPortal(ResultModal, document.body)}
    </div>
  );
}

function ConsensusStepper() {
  return (
    <div className="space-y-8 py-4">
       <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
             <CircleDashed className="w-12 h-12 text-primary animate-spin-slow absolute inset-0" />
             <div className="absolute inset-0 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-primary animate-pulse" />
             </div>
          </div>
          <div className="text-center">
             <p className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">AI CONSENSUS ENGINE</p>
             <p className="text-[11px] text-muted-foreground mt-1 font-mono">Cross-validating response patterns...</p>
          </div>
       </div>
       <div className="space-y-3 max-w-[240px] mx-auto">
          {[
            { id: 1, label: "VALIDATOR NODE ALPHA", status: "Analyzing..." },
            { id: 2, label: "VALIDATOR NODE BETA", status: "Pending Consensus" },
            { id: 3, label: "VALIDATOR NODE GAMMA", status: "Awaiting Input" }
          ].map((v, i) => (
            <div key={v.id} className="flex items-center justify-between text-[11px] font-mono tracking-tighter">
               <span className="text-muted-foreground flex items-center gap-2">
                  <div className={`w-1 h-1 rounded-full ${i === 0 ? "bg-primary animate-pulse" : "bg-border"}`} />
                  {v.label}
               </span>
               <span className={i === 0 ? "text-primary font-bold" : "text-muted-foreground"}>{v.status.toUpperCase()}</span>
            </div>
          ))}
       </div>
       <div className="w-full h-0.5 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-primary animate-consensus-bar" />
       </div>
    </div>
  );
}
