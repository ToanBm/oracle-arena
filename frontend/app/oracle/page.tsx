"use client";

import { useState, useEffect } from "react";
import { Plus, Hash, ArrowRight, Loader2, Terminal, Activity, Sparkles, Zap, Globe, Trophy, Award, Medal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/genlayer/wallet";
import { useCreateOracleRoom, useJoinOracleRoom, useOracleArenaContract } from "@/lib/hooks/useOracleArena";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AddressDisplay } from "@/components/AddressDisplay";
import { useOracleXpLeaderboard } from "@/lib/hooks/useOracleArena";

function OracleRoomPanel() {
  const router = useRouter();
  const { isConnected, address } = useWallet();
  const contract = useOracleArenaContract();
  const queryClient = useQueryClient();

  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const createRoom = useCreateOracleRoom();
  const joinRoom = useJoinOracleRoom();

  const handleCreate = async () => {
    if (!contract) return;
    try {
      const countBefore = await contract.getRoomCount();
      await createRoom.mutateAsync();
      queryClient.invalidateQueries({ queryKey: ["oracleRoomCount"] });
      router.push(`/oracle/room/${countBefore}`);
    } catch (err) {
      console.error("Failed to create room:", err);
    }
  };

  const handleJoin = async () => {
    const id = parseInt(joinCode.replace(/\D/g, ""), 10);
    if (isNaN(id) || id < 0) {
      setJoinError("Enter a valid room code.");
      return;
    }
    setJoinError("");
    try {
      await joinRoom.mutateAsync(id);
      router.push(`/oracle/room/${id}`);
    } catch (err) {
      console.error("Failed to join room:", err);
      setJoinError("Failed to join room. It might be full or finished.");
    }
  };

  if (!isConnected) {
    return (
      <div className="studio-panel p-12 text-center bg-white/5 backdrop-blur-xl border-[#0E1922]/30 dark:border-white/10">
        <p className="text-sm text-muted-foreground italic">
          Connect your wallet to access the Oracle Arena.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* Create room */}
        <div className="studio-panel p-6 flex flex-col justify-between bg-white/5 border-[#0E1922]/30 dark:border-white/10 hover:bg-white/10 transition-all min-h-[180px]">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-2 text-primary">
              <Plus className="w-4 h-4" />
              NEW ORACLE SESSION
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Initialize a multi-agent trivia instance as primary node. Invite up to 7 peers.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full justify-between group rounded-sm px-6 h-10 border-primary/30 text-primary hover:bg-primary hover:text-white transition-all mt-4"
            onClick={handleCreate}
            disabled={createRoom.isPending}
          >
            {createRoom.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              <>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em]">INITIALIZE SESSION</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </div>

        {/* Join room */}
        <div className="studio-panel p-6 flex flex-col justify-between bg-white/5 border-[#0E1922]/30 dark:border-white/10 hover:bg-white/10 transition-all min-h-[180px]">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-2 text-secondary">
              <Hash className="w-4 h-4" />
              JOIN SESSION
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Synchronize with an active oracle instance using a 4-digit synchronization key.
            </p>
          </div>
          <div className="flex gap-2 mt-4">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="042"
              className="flex-1 h-10 px-5 py-2 text-sm bg-background border border-border/50 dark:border-border focus:border-secondary focus:outline-none transition-all rounded-sm mono-text"
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <Button
              variant="outline"
              className="w-10 h-10 p-0 rounded-sm border-secondary/30 text-secondary hover:bg-secondary hover:text-white transition-all"
              onClick={handleJoin}
              disabled={joinRoom.isPending || !joinCode.trim()}
            >
              {joinRoom.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
      {joinError && (
        <p className="text-[11px] text-destructive text-center font-bold uppercase tracking-[0.2em] animate-pulse">
          {joinError}
        </p>
      )}
    </div>
  );
}

function OracleLeaderboard() {
  const { data: leaderboard = [] } = useOracleXpLeaderboard();
  const { address } = useWallet();

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 1: return <Medal className="w-4 h-4 text-slate-400" />;
      case 2: return <Award className="w-4 h-4 text-amber-700" />;
      default: return null;
    }
  };

  return (
    <div className="divide-y divide-border/30 dark:divide-white/10">
      {leaderboard.length === 0 ? (
        <p className="text-center py-10 text-[11px] text-muted-foreground italic uppercase tracking-[0.2em]">
          NO SYNCHRONIZATION DATA AVAILABLE.
        </p>
      ) : (
        leaderboard.slice(0, 8).map((entry, i) => {
          const isMe = address?.toLowerCase() === entry.address?.toLowerCase();
          const rankIcon = getRankIcon(i);
          
          return (
            <div
              key={entry.address}
              className={`flex items-center gap-4 p-3 transition-all ${
                isMe ? "bg-primary/5" : "hover:bg-white/5"
              }`}
            >
              <div className="w-8 shrink-0 flex justify-center">
                {rankIcon ? (
                  rankIcon
                ) : (
                  <span className="text-xs font-mono text-muted-foreground font-bold opacity-50">
                    {(i + 1).toString().padStart(2, '0')}
                  </span>
                )}
              </div>
              <AddressDisplay address={entry.address} maxLength={14} className={`text-sm mono-text flex-1 ${isMe ? "font-bold text-primary" : "text-foreground"}`} showCopy={false} />
              <div className="text-right flex items-center gap-2">
                <span className={`text-sm font-bold font-mono ${isMe ? "text-primary" : "text-foreground"}`}>{entry.xp}</span>
                <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-tighter">XP</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function OraclePage() {
  return (
    <div className="py-2 space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        {/* Main Content Area (8/12) */}
        <div className="xl:col-span-8 space-y-12">

          {/* Trivia Arena Section */}
          <section className="space-y-8 animate-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium tracking-tight flex items-center gap-3 italic text-foreground">
                <Terminal className="w-5 h-5 text-secondary" />
                Trivia Tables
              </h2>
              <div className="flex items-center gap-2 px-3 py-1 rounded-sm bg-secondary/10 border border-[#0E1922]/20 text-[11px] font-bold text-secondary uppercase tracking-[0.2em]">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                SYNCHRONIZED
              </div>
            </div>
            <OracleRoomPanel />
          </section>

          {/* System Mechanics Section */}
          <section className="space-y-8 animate-in" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-xl font-medium tracking-tight italic text-foreground">System Mechanics</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  step: "MULTI-VALIDATOR GEN",
                  desc: "Validators source and verify facts independently to reach absolute consensus on every query.",
                  icon: Sparkles,
                  color: "text-primary"
                },
                {
                  step: "REAL-TIME ROUNDS",
                  desc: "Synchronize with 5 AI-vetted questions. Accuracy is mandatory; submission latency breaks ties.",
                  icon: Zap,
                  color: "text-secondary"
                },
                {
                  step: "EQUIVALENCE LAYER",
                  desc: "The protocol ensures no single entity can bias or manipulate the question stream.",
                  icon: Globe,
                  color: "text-primary"
                },
                {
                  step: "REWARD DISTRIBUTION",
                  desc: "Performance is logged on-chain. Top Oracles receive XP directly proportional to their influence.",
                  icon: Trophy,
                  color: "text-secondary"
                },
              ].map(({ step, desc, icon: Icon, color }) => (
                <div key={step} className="studio-panel p-8 space-y-4 hover:bg-white/5 transition-all bg-white/5 border-border/30 dark:border-white/10">
                  <div className={`${color} font-bold uppercase tracking-[0.2em] text-[11px] flex items-center gap-2`}>
                    <Icon className="w-3.5 h-3.5" />
                    {step}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">{desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar Rank Area (4/12) */}
        <div className="xl:col-span-4 space-y-12">
          <section className="space-y-8 animate-in" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-medium tracking-tight italic text-foreground">Oracle Rank</h2>
            </div>
            <div className="studio-panel overflow-hidden border-border/30 dark:border-white/20">
              <OracleLeaderboard />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
