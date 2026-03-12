"use client";

import { useState } from "react";
import { Send, CheckCircle2, XCircle, Loader2, Lock, Swords } from "lucide-react";
import type { Challenge, ChallengeProgress } from "@/lib/contracts/PromptArena";
import { useWallet } from "@/lib/genlayer/wallet";
import { Button } from "./ui/button";

const MAX_PROMPT_LENGTH = 500;
const MIN_PROMPT_LENGTH = 10;

const DIFFICULTY_CONFIG: Record<
  number,
  { label: string; color: string; bgColor: string }
> = {
  1: {
    label: "Easy",
    color: "text-green-400",
    bgColor: "bg-green-400/10 border-green-400/30",
  },
  2: {
    label: "Medium",
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10 border-yellow-400/30",
  },
  3: {
    label: "Hard",
    color: "text-red-400",
    bgColor: "bg-red-400/10 border-red-400/30",
  },
};

interface ChallengeCardProps {
  challenge: Challenge;
  progress?: ChallengeProgress;
  isSubmitting: boolean;
  onSubmit: (challengeId: number, prompt: string) => void;
}

export function ChallengeCard({
  challenge,
  progress,
  isSubmitting,
  onSubmit,
}: ChallengeCardProps) {
  const [prompt, setPrompt] = useState("");
  const { isConnected } = useWallet();

  const diff = DIFFICULTY_CONFIG[challenge.difficulty] ?? DIFFICULTY_CONFIG[1];
  const status = progress?.status ?? 0;
  const attempted = status > 0;
  const succeeded = status === 2;
  const failed = status === 1;

  const canSubmit =
    isConnected &&
    !attempted &&
    !isSubmitting &&
    prompt.length >= MIN_PROMPT_LENGTH &&
    prompt.length <= MAX_PROMPT_LENGTH;

  return (
    <div
      className={`brand-card p-5 md:p-6 transition-all ${
        succeeded
          ? "border-green-500/40"
          : failed
            ? "border-red-500/30"
            : "brand-card-hover"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-accent" />
          <span className="text-sm text-muted-foreground font-medium">
            Challenge #{challenge.id + 1}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${diff.bgColor} ${diff.color}`}
          >
            {diff.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {challenge.difficulty} {challenge.difficulty === 1 ? "pt" : "pts"}
          </span>
        </div>
      </div>

      {/* Scenario */}
      <div className="mb-3">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
          Scenario
        </h3>
        <p className="text-sm leading-relaxed">{challenge.scenario}</p>
      </div>

      {/* Objective */}
      <div className="mb-4">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
          Objective
        </h3>
        <p className="text-sm leading-relaxed text-accent/90 font-medium">
          {challenge.objective}
        </p>
      </div>

      {/* Result (if attempted) */}
      {attempted && (
        <div
          className={`rounded-lg p-4 mb-4 border ${
            succeeded
              ? "bg-green-500/10 border-green-500/30"
              : "bg-red-500/10 border-red-500/30"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {succeeded ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="font-bold text-green-400">
                  SUCCESS — +{challenge.difficulty}{" "}
                  {challenge.difficulty === 1 ? "point" : "points"}
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-400" />
                <span className="font-bold text-red-400">FAILURE</span>
              </>
            )}
          </div>
          {progress?.feedback && (
            <p className="text-sm text-muted-foreground italic">
              Judge says: &ldquo;{progress.feedback}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Prompt input (if not attempted) */}
      {!attempted && (
        <div className="space-y-3">
          {!isConnected ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-muted/20 border border-muted/30">
              <Lock className="w-4 h-4" />
              Connect your wallet to submit a prompt
            </div>
          ) : (
            <>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Write your prompt here... Be creative, persuasive, and specific. Multiple AI judges will independently evaluate whether your approach would work."
                className="w-full h-28 px-3 py-2 text-sm rounded-lg bg-input/50 border border-border/60 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/40 resize-none placeholder:text-muted-foreground/50 transition-colors"
                disabled={isSubmitting}
                maxLength={MAX_PROMPT_LENGTH}
              />
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs ${
                    prompt.length > MAX_PROMPT_LENGTH
                      ? "text-red-400"
                      : prompt.length >= MIN_PROMPT_LENGTH
                        ? "text-muted-foreground"
                        : "text-muted-foreground/50"
                  }`}
                >
                  {prompt.length}/{MAX_PROMPT_LENGTH}
                </span>
                <Button
                  variant="gradient"
                  size="sm"
                  disabled={!canSubmit}
                  onClick={() => onSubmit(challenge.id, prompt)}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Prompt
                    </>
                  )}
                </Button>
              </div>
              {isSubmitting && (
                <p className="text-xs text-muted-foreground animate-pulse">
                  Multiple AI validators are independently judging your prompt.
                  This may take a minute...
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
