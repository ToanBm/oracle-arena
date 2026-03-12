"use client";

import { useState } from "react";
import { Copy, Check, Users, Zap, Loader2, Crown, Terminal, ArrowRight } from "lucide-react";
import type { Room } from "@/lib/contracts/PromptArena";
import { useWallet } from "@/lib/genlayer/wallet";
import { AddressDisplay } from "./AddressDisplay";
import { Button } from "./ui/button";

interface RoomLobbyProps {
  room: Room;
  players: string[];
  roomId: number;
  onStart: () => void;
  isStarting: boolean;
  onJoin: () => void;
  isJoining: boolean;
}

export function RoomLobby({
  room,
  players,
  roomId,
  onStart,
  isStarting,
  onJoin,
  isJoining,
}: RoomLobbyProps) {
  const { address } = useWallet();
  const [copied, setCopied] = useState(false);

  const isHost = address?.toLowerCase() === room.host?.toLowerCase();
  const isJoined = players.some(
    (p) => p?.toLowerCase() === address?.toLowerCase()
  );
  const roomCode = String(roomId).padStart(4, "0");
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${roomId}`
      : "";

  const copyRoomCode = () => {
    navigator.clipboard.writeText(shareUrl || roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canStart = isHost && players.length >= 2 && !isStarting;

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Top Header - Consolidated */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-4">
        {/* Session ID - Moved to Left */}
        <div className="studio-panel py-3 px-8 flex flex-col items-center justify-center gap-1.5 bg-primary/5 border-primary/20 order-2 md:order-1">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-primary uppercase tracking-[0.2em] font-bold opacity-70">
              SESSION ID
            </span>
            <span className="text-2xl font-black tracking-widest mono-text text-foreground leading-none">
              {roomCode}
            </span>
          </div>
          <button
            onClick={copyRoomCode}
            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all group"
          >
            {copied ? (
              <><Check className="w-3.5 h-3.5 text-green-500" /> COPIED</>
            ) : (
              <><Copy className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> SHARE INVITATION</>
            )}
          </button>
        </div>

        <div className="space-y-2 text-left md:text-right order-1 md:order-2">
          <div className="inline-flex items-center md:flex-row-reverse gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary/60">
            <Terminal className="w-4 h-4" />
            ARENA SYNCHRONIZATION // P2P
          </div>
          <h1 className="text-3xl font-medium tracking-tight text-foreground italic">
            Waiting for Players
          </h1>
        </div>
      </div>

      {/* Main Content Area - Full Width */}
      <div className="space-y-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium tracking-tight flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            Manifest
          </h2>
          <div className="flex items-center gap-2 px-3 py-1 rounded-sm bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {players.length} / 8 JOINED
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {players.map((player) => {
            const isCurrentUser = address?.toLowerCase() === player?.toLowerCase();
            const isRoomHost = room.host?.toLowerCase() === player?.toLowerCase();

            return (
              <div
                key={player}
                className={`studio-panel p-4 flex items-center gap-4 transition-all ${
                  isCurrentUser ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/10"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isCurrentUser ? "bg-primary animate-pulse" : "bg-white/20"}`} />
                <div className="flex-1">
                  <AddressDisplay address={player} maxLength={14} className="text-sm font-bold mono-text" showCopy={false} />
                  <div className="flex gap-2 mt-0.5">
                    {isRoomHost && (
                       <span className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] bg-primary/10 px-2 py-0.5 rounded-sm">HOST</span>
                    )}
                    {isCurrentUser && (
                       <span className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] bg-white/10 px-2 py-0.5 rounded-sm">LOCAL</span>
                    )}
                  </div>
                </div>
                {isRoomHost && <Crown className="w-4 h-4 text-yellow-500/50" />}
              </div>
            );
          })}
          
          {/* Placeholder slots */}
          {players.length < 2 && Array.from({ length: 2 - players.length }).map((_, i) => (
            <div key={i} className="studio-panel p-4 border-dashed border-white/10 flex items-center justify-center opacity-30">
               <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground italic">
                 AWAITING PEER...
               </p>
            </div>
          ))}
        </div>

        {/* Action Area */}
        <div className="pt-6">
          {!address ? (
            <div className="studio-panel p-6 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground bg-white/5">
              AUTHENTICATION REQUIRED. INTERFACE LOCKED.
            </div>
          ) : isHost ? (
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full py-8 text-base font-bold uppercase tracking-[0.2em] group border-primary text-primary hover:bg-primary hover:text-white rounded-sm transition-all"
                disabled={!canStart}
                onClick={onStart}
              >
                {isStarting ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Syncing Challenge...
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    Initialize Arena
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </div>
                )}
              </Button>
              {players.length < 2 && (
                 <p className="text-center text-[11px] text-muted-foreground italic uppercase tracking-[0.2em]">
                   MULTIPLAYER SEQUENCE REQUIRES MIN. 2 PARTICIPANTS.
                 </p>
              )}
            </div>
          ) : !isJoined ? (
            <Button
              variant="outline"
              className="w-full py-8 text-base font-bold uppercase tracking-[0.2em] border-primary text-primary hover:bg-primary hover:text-white rounded-sm transition-all group"
              onClick={onJoin}
              disabled={isJoining}
            >
              {isJoining ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                <div className="flex items-center gap-3">
                  Join Active Arena
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </Button>
          ) : (
            <div className="studio-panel p-8 text-center space-y-3 bg-primary/5 border-dashed border-primary/20 rounded-md">
              <div className="flex items-center justify-center gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                <p className="text-sm font-bold tracking-[0.2em] uppercase">Neural Link Established</p>
              </div>
              <p className="text-[11px] text-muted-foreground italic uppercase tracking-tighter">Synchronized with host. Awaiting battle initialization.</p>
            </div>
          )}
        </div>
      </div>

      {isStarting && (
        <div className="space-y-2 pt-4">
           <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-consensus-bar" />
           </div>
           <p className="text-[11px] font-mono text-center text-muted-foreground animate-pulse uppercase tracking-[0.2em]">
             BLOCK-LEVEL CONSENSUS IN PROGRESS...
           </p>
        </div>
      )}
    </div>
  );
}
