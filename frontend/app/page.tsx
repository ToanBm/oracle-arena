"use client";

import { RoomPanel } from "@/components/RoomPanel";
import { ChallengeList } from "@/components/ChallengeList";
import { GameLeaderboard } from "@/components/GameLeaderboard";
import { Swords, FlaskConical, Trophy, Zap, Terminal } from "lucide-react";

export default function HomePage() {
  return (
    <div className="py-2 space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        {/* Left Column (8/12) */}
        <div className="xl:col-span-8 space-y-12">
          
          {/* Arena / Multiplayer Section */}
          <section className="space-y-8 animate-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium tracking-tight flex items-center gap-3 italic">
                <Swords className="w-5 h-5 text-secondary" />
                Multiplayer Arena
              </h2>
              <div className="flex items-center gap-2 px-3 py-1 rounded-sm bg-secondary/10 border border-secondary/20 text-[11px] font-bold text-secondary uppercase tracking-[0.2em]">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                LIVE_SESSIONS
              </div>
            </div>
            <RoomPanel />
          </section>

          {/* Daily Challenges Section */}
          <section className="space-y-8 animate-in" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-3 mb-4">
              <FlaskConical className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-medium tracking-tight italic">Solo Missions</h2>
            </div>
            <ChallengeList />
          </section>

          {/* System Mechanics Section */}
          <section className="space-y-8 animate-in" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-xl font-medium tracking-tight italic">Protocol Specs</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  step: "PROMPT_ENGINEERING",
                  desc: "Craft precise instructions to manipulate the LLM's output towards a specific goal.",
                  icon: Terminal,
                  color: "text-primary"
                },
                {
                  step: "AI_CONSENSUS",
                  desc: "Multiple decentralized nodes verify the outcome to reach an immutable truth.",
                  icon: Zap,
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

        {/* Right Column (4/12) */}
        <div className="xl:col-span-4 space-y-12">
          {/* Global Leaderboard Section */}
          <section className="space-y-8 animate-in" style={{ animationDelay: '0.8s' }}>
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-medium tracking-tight italic">Top Operatives</h2>
            </div>
            <div className="studio-panel overflow-hidden border-border/30 dark:border-white/20">
              <GameLeaderboard gameType="arena" />
            </div>          </section>
        </div>
      </div>
    </div>
  );
}
