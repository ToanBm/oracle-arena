"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  Trophy,
  Loader2,
  Target,
  Swords,
  X
} from "lucide-react";
import {
  useChallenges,
  usePlayerProgress,
  useSubmitPrompt
} from "@/lib/hooks/usePromptArena";
import { useWallet } from "@/lib/genlayer/wallet";
import { Button } from "./ui/button";

const DIFFICULTY_MAP: Record<number, { label: string; color: string }> = {
  1: { label: "EASY", color: "text-green-500" },
  2: { label: "MEDIUM", color: "text-yellow-500" },
  3: { label: "HARD", color: "text-red-500" },
};

export function ChallengeList() {
  const { address } = useWallet();
  const { data: challenges = [] } = useChallenges();
  const { data: progress = {} } = usePlayerProgress(address);
  const { mutate: submitPrompt, isPending } = useSubmitPrompt();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedId !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedId]);

  const selectedChallenge = challenges.find((c) => Number(c.id) === selectedId);
  const challengeProgress = selectedId !== null ? progress[selectedId.toString()] : null;

  const handleSubmit = () => {
    if (selectedId === null) return;
    submitPrompt({ challengeId: selectedId, prompt });
  };

  return (
    <div className="space-y-6" id="solo">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {challenges.slice(0, 4).map((c) => {
          const id = Number(c.id);
          const diff = DIFFICULTY_MAP[Number(c.difficulty)] || DIFFICULTY_MAP[1];
          const prog = progress[id.toString()];
          const isCompleted = prog?.status === 2;

          return (
            <div
              key={id}
              onClick={() => {
                setSelectedId(id);
                setPrompt("");
              }}
              className="studio-panel p-6 flex flex-col space-y-4 bg-white/5 border-[#0E1922]/30 dark:border-white/10 hover:bg-white/10 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                  <Swords className="w-3.5 h-3.5" />
                  MISSION_{id.toString().padStart(3, "0")}
                </div>
                {isCompleted ? (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-green-500 uppercase tracking-[0.2em]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    COMPLETED
                  </div>
                ) : (
                  <div className={`text-[11px] font-bold uppercase tracking-[0.2em] ${diff.color}`}>
                    {diff.label}
                  </div>
                )}
              </div>
              
              <div className="flex-grow">
                <h3 className="text-sm font-medium leading-relaxed italic text-foreground/90 line-clamp-3">
                  {c.scenario}
                </h3>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#0E1922]/10 dark:border-white/5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                  VIEW MISSION DETAILS
                </span>
                <Loader2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal logic placed directly in the main return flow to prevent focus loss */}
      {mounted && selectedChallenge && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-md cursor-pointer"
            onClick={() => setSelectedId(null)}
          />
          
          {/* Modal Container */}
          <div className="relative w-full max-w-5xl h-[90vh] sm:h-auto sm:max-h-[85vh] studio-panel animate-in fade-in zoom-in-95 duration-300 overflow-hidden bg-card border-[#0E1922]/30 dark:border-white/20 shadow-2xl flex flex-col mx-4">
            {/* Close Button */}
            <button
              onClick={() => setSelectedId(null)}
              className="absolute top-4 right-4 z-50 p-2 rounded-sm hover:bg-muted transition-colors text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col lg:flex-row flex-grow overflow-hidden">
              {/* Left Column: Context (40%) */}
              <div className="lg:w-[40%] p-6 md:p-10 border-b lg:border-b-0 lg:border-r border-[#0E1922]/20 dark:border-white/10 bg-muted/5 space-y-8 overflow-y-auto">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-primary tracking-[0.2em]">
                    <Target className="w-4 h-4" />
                    MISSION PROFILE
                  </div>
                  <h2 className="text-2xl md:text-3xl font-medium tracking-tight italic text-foreground">Mission #{selectedChallenge.id}</h2>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-[0.2em] opacity-60">SCENARIO</p>
                    <p className="text-sm md:text-base leading-relaxed text-foreground font-light italic">
                      &ldquo;{selectedChallenge.scenario}&rdquo;
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase text-secondary tracking-[0.2em]">YOUR OBJECTIVE</p>
                    <p className="text-sm md:text-base font-medium leading-relaxed text-foreground tracking-tight">
                      {selectedChallenge.objective}
                    </p>
                  </div>
                </div>

                {challengeProgress?.status === 2 && (
                  <div className="p-5 bg-green-500/10 border border-green-500/20 rounded-md space-y-2 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-green-500 font-bold text-[11px] uppercase tracking-[0.2em]">
                      <Trophy className="w-4 h-4" />
                      VALIDATION SUCCESSFUL
                    </div>
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      &ldquo;{challengeProgress.feedback}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Editor (60%) */}
              <div className="flex-grow flex flex-col p-0 bg-muted/10 overflow-hidden">
                <div className="flex-grow relative overflow-hidden">
                  <textarea
                    autoFocus
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isPending || challengeProgress?.status === 2}
                    placeholder="Enter your persuasive response..."
                    className="w-full h-full min-h-[300px] p-6 md:p-10 bg-transparent text-base mono-text focus:outline-none resize-none leading-relaxed placeholder:text-muted-foreground/30 font-medium text-foreground"
                  />
                  {isPending && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-md flex items-center justify-center z-20">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                          <Loader2 className="w-10 h-10 animate-spin text-primary relative z-10" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary animate-pulse">
                          SYNCING WITH AI CONSENSUS
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 md:p-8 border-t border-[#0E1922]/20 dark:border-white/10 bg-muted/5 flex flex-col sm:flex-row justify-between items-center gap-4 md:gap-6">
                  <div className="flex items-center gap-6">
                    <div className="px-3 py-1 rounded-sm bg-muted/10 border border-[#0E1922]/30 mono-text text-[11px] text-muted-foreground uppercase font-bold tracking-[0.2em]">
                      {prompt.length} CHARS
                    </div>
                    {prompt.length > 0 && !isPending && challengeProgress?.status !== 2 && (
                      <button
                        onClick={() => setPrompt("")}
                        className="text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-[0.2em]"
                      >
                        CLEAR BUFFER
                      </button>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto px-10 rounded-sm font-bold uppercase tracking-[0.2em] text-[11px] h-12 group border-primary/30 text-primary hover:bg-primary hover:text-white transition-all"
                    onClick={handleSubmit}
                    disabled={isPending || !prompt.trim() || challengeProgress?.status === 2}
                  >
                    {isPending
                      ? "PROCESSING..."
                      : challengeProgress?.status === 2
                      ? "MISSION_COMPLETED"
                      : "TRANSMIT PAYLOAD"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
