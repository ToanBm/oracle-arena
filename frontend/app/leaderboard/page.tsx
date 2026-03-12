"use client";

import { GameLeaderboard } from "@/components/GameLeaderboard";
import { Trophy, Award, Star, TrendingUp, Users } from "lucide-react";
import { useXpLeaderboard, useRoomCount } from "@/lib/hooks/usePromptArena";
import { useOracleXpLeaderboard, useOracleRoomCount } from "@/lib/hooks/useOracleArena";
import { useMemo } from "react";

export default function LeaderboardPage() {
  const { data: promptLeaderboard = [] } = useXpLeaderboard();
  const { data: oracleLeaderboard = [] } = useOracleXpLeaderboard();
  const { data: promptRoomCount = 0 } = useRoomCount();
  const { data: oracleRoomCount = 0 } = useOracleRoomCount();

  const stats = useMemo(() => {
    const uniquePlayers = new Set([
      ...promptLeaderboard.map(e => (e.address || "").toLowerCase()),
      ...oracleLeaderboard.map(e => (e.address || "").toLowerCase())
    ]);
    uniquePlayers.delete("");

    const totalPromptXp = promptLeaderboard.reduce((sum, e) => sum + Number(e.xp || 0), 0);
    const totalOracleXp = oracleLeaderboard.reduce((sum, e) => sum + Number(e.xp || 0), 0);
    const totalXp = totalPromptXp + totalOracleXp;
    const totalBattles = promptRoomCount + oracleRoomCount;

    const formatNumber = (num: number) => {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
      if (num >= 1000) return (num / 1000).toFixed(1) + "k";
      return num.toString();
    };

    return [
      { label: "ACTIVE PLAYERS", value: uniquePlayers.size.toLocaleString(), icon: Users, color: "text-primary" },
      { label: "TOTAL XP DISTRIBUTED", value: formatNumber(totalXp), icon: Star, color: "text-secondary" },
      { label: "ARENA BATTLES", value: formatNumber(totalBattles), icon: TrendingUp, color: "text-primary" },
    ];
  }, [promptLeaderboard, oracleLeaderboard, promptRoomCount, oracleRoomCount]);

  return (
    <div className="py-2 space-y-4 animate-in">
      <div className="max-w-4xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {stats.map((stat, i) => (
            <div key={i} className="studio-panel p-6 bg-white/5 border-border/30 dark:border-white/10 flex flex-col items-center gap-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <div className="text-2xl font-bold tracking-tight italic text-foreground">{stat.value}</div>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Main Leaderboard */}
        <section className="space-y-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium tracking-tight flex items-center gap-3 italic text-foreground">
              <Award className="w-5 h-5 text-primary" />
              Global Rankings
            </h2>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground bg-white/5 px-3 py-1 rounded-sm border border-border/30 dark:border-white/10">
              SEASON 1 ACTIVE
            </div>
          </div>
          
          <div className="studio-panel overflow-hidden border-border/30 dark:border-white/20 bg-white/5">
            <GameLeaderboard />
          </div>
        </section>
      </div>
    </div>
  );
}
