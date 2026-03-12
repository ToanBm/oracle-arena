"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { RoomLobby } from "@/components/RoomLobby";
import { RoomSession } from "@/components/RoomSession";
import { SessionResults } from "@/components/SessionResults";
import { Button } from "@/components/ui/button";
import {
  useRoom,
  useRoomPlayers,
  useRoomResults,
  useWeeklyChallenge,
  useStartSession,
  useSubmitRoomPrompt,
  useFinalizeRoom,
  useJoinRoom,
} from "@/lib/hooks/usePromptArena";
import { useWallet } from "@/lib/genlayer/wallet";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useWallet();
  const roomId = params.roomId ? Number(params.roomId) : null;

  const { data: room, isLoading: roomLoading, isError: roomError } = useRoom(roomId);
  const { data: players = [] } = useRoomPlayers(roomId);
  const { data: results = [] } = useRoomResults(roomId);
  const { data: weeklyChallenge } = useWeeklyChallenge();

  const { mutate: startSession, isPending: isStarting } = useStartSession();
  const { mutate: joinRoom, isPending: isJoining } = useJoinRoom();
  const { mutate: submitRoomPrompt, isSubmitting } = useSubmitRoomPrompt();
  const { mutate: finalizeRoom, isPending: isFinalizing } = useFinalizeRoom();

  // Auto-finalize once the window closes
  const [finalizeCalled, setFinalizeCalled] = useState(false);
  useEffect(() => {
    if (!room || room.status !== 1 || finalizeCalled) return;
    const elapsed = Math.floor(Date.now() / 1000) - room.start_time;
    if (elapsed > room.duration) {
      setFinalizeCalled(true);
      finalizeRoom(roomId!);
    }
  }, [room, finalizeRoom, roomId, finalizeCalled]);

  if (roomId === null || isNaN(roomId)) {
    return <ErrorPage message="Invalid room ID." onBack={() => router.push("/")} />;
  }

  if (roomLoading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </PageShell>
    );
  }

  if (roomError || !room) {
    return (
      <ErrorPage
        message="Room not found or failed to load."
        onBack={() => router.push("/")}
      />
    );
  }

  // ── State machine ──────────────────────────────────────────────────────────

  // 0 = waiting (lobby)
  if (room.status === 0) {
    return (
      <PageShell>
        <RoomLobby
          room={room}
          players={players}
          roomId={roomId}
          onStart={() => startSession(roomId)}
          isStarting={isStarting}
          onJoin={() => joinRoom(roomId)}
          isJoining={isJoining}
        />
      </PageShell>
    );
  }

  // 1 = active (game session)
  if (room.status === 1) {
    const challenge = weeklyChallenge ?? {
      scenario: "Loading challenge...",
      objective: "Please wait.",
      week_number: 0,
    };

    return (
      <PageShell>
        <RoomSession
          room={room}
          challenge={challenge}
          results={results}
          players={players}
          onSubmit={(prompt) => submitRoomPrompt({ roomId, prompt })}
          isSubmitting={isSubmitting}
        />
        {isFinalizing && (
          <div className="text-center mt-4 text-sm text-muted-foreground animate-pulse">
            Finalizing room and distributing XP...
          </div>
        )}
      </PageShell>
    );
  }

  // 2 = finished (results)
  return (
    <PageShell>
      <SessionResults
        results={results}
        roomId={roomId}
        onPlayAgain={() => router.push("/")}
      />
    </PageShell>
  );
}

// ── Layout helpers ─────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <main className="flex-grow pb-12">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

function ErrorPage({
  message,
  onBack,
}: {
  message: string;
  onBack: () => void;
}) {
  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">{message}</p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>
    </PageShell>
  );
}
