"use client";

import { useState } from "react";
import { Plus, Hash, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/genlayer/wallet";
import { useCreateRoom, useJoinRoom, usePromptArenaContract } from "@/lib/hooks/usePromptArena";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";

export function RoomPanel() {
  const router = useRouter();
  const { isConnected, address } = useWallet();
  const contract = usePromptArenaContract();
  const queryClient = useQueryClient();

  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();

  const handleCreate = async () => {
    if (!contract) return;
    try {
      const countBefore = await contract.getRoomCount();
      await createRoom.mutateAsync();
      queryClient.invalidateQueries({ queryKey: ["roomCount"] });
      router.push(`/room/${countBefore}`);
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
      router.push(`/room/${id}`);
    } catch (err) {
      console.error("Failed to join room:", err);
      setJoinError("Failed to join room. It might be full or finished.");
    }
  };

  return (
    <div className="space-y-6">
      {!isConnected ? (
        <div className="studio-panel p-12 text-center bg-white/5 backdrop-blur-xl border-[#0E1922]/30 dark:border-white/10">
          <p className="text-sm text-muted-foreground italic">
            Connect your wallet to access the Multiplayer Arena.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Create room */}
          <div className="studio-panel p-6 flex flex-col justify-between space-y-6 bg-white/5 border-[#0E1922]/30 dark:border-white/10 hover:bg-white/10 transition-all">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3 flex items-center gap-2 text-secondary">
                <Plus className="w-4 h-4" />
                NEW BATTLE
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Host a fresh arena. You'll be the host and can share the generated access code with your rival.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full justify-between group rounded-sm px-6 h-11 border-secondary/30 text-secondary hover:bg-secondary hover:text-white transition-all"
              onClick={handleCreate}
              disabled={createRoom.isPending}
            >
              {createRoom.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                <>
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em]">CREATE ARENA</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </div>

          {/* Join room */}
          <div className="studio-panel p-6 flex flex-col justify-between space-y-6 bg-white/5 border-[#0E1922]/30 dark:border-white/10 hover:bg-white/10 transition-all">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3 flex items-center gap-2 text-primary">
                <Hash className="w-4 h-4" />
                JOIN ARENA
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enter an active arena code to synchronize with an existing battle instance.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="042"
                className="flex-1 h-11 px-5 py-2 text-sm bg-background border border-border focus:border-primary focus:outline-none transition-all rounded-sm mono-text"
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
              <Button
                variant="outline"
                className="w-11 h-11 p-0 rounded-sm border-primary/30 text-primary hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/5"
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
      )}
      {joinError && (
        <p className="text-[11px] text-destructive text-center font-bold uppercase tracking-[0.2em] animate-pulse">
          {joinError}
        </p>
      )}
    </div>
  );
}
