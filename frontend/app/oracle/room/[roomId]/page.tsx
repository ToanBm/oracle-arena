"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { OracleRoomLobby } from "@/components/OracleRoomLobby";
import { OracleSession } from "@/components/OracleSession";
import { OracleResults } from "@/components/OracleResults";
import { Button } from "@/components/ui/button";
import {
  useOracleRoom,
  useOracleRoomPlayers,
  useOracleRoomResults,
  useWeeklyQuestions,
  useWeeklyAnswers,
  useStartOracleSession,
  useSubmitOracleAnswers,
  useFinalizeOracleRoom,
  useJoinOracleRoom,
} from "@/lib/hooks/useOracleArena";

export default function OracleRoomPage() {
  const params = useParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const roomId = params.roomId ? Number(params.roomId) : null;

  const { data: room, isLoading: roomLoading, isError: roomError } = useOracleRoom(roomId);
  // ... rest of hooks ...

  if (!mounted) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
            INITIALIZING_ORACLE...
          </p>
        </div>
      </PageShell>
    );
  }

  const effectiveStatus = room?.status ?? 0;

  const { data: players = [] } = useOracleRoomPlayers(roomId);
  // Only fetch results when room is active or finished — avoids gen_call error on waiting rooms
  const { data: results = [] } = useOracleRoomResults(
    effectiveStatus > 0 ? roomId : null
  );
  const { data: questions = [], isError: questionsError } = useWeeklyQuestions();
  const { data: correctAnswers = [] } = useWeeklyAnswers();

  const { mutate: startSession, isPending: isStarting } = useStartOracleSession();
  const { mutate: submitAnswers, isSubmitting } = useSubmitOracleAnswers();
  const { mutate: finalizeRoom, isPending: isFinalizing } = useFinalizeOracleRoom();
  const { mutate: joinRoom, isPending: isJoining } = useJoinOracleRoom();

  const [finalizeCalled, setFinalizeCalled] = useState(false);
  useEffect(() => {
    if (!room || effectiveStatus !== 1 || finalizeCalled) return;
    const elapsed = Math.floor(Date.now() / 1000) - room.start_time;
    if (elapsed > room.duration) {
      setFinalizeCalled(true);
      finalizeRoom(roomId!);
    }
  }, [room, effectiveStatus, finalizeRoom, roomId, finalizeCalled]);

  if (roomId === null || isNaN(roomId)) {
    return <ErrorPage message="Invalid room ID." onBack={() => router.push("/oracle")} />;
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
    return <ErrorPage message="Room not found or failed to load." onBack={() => router.push("/oracle")} />;
  }

  if (effectiveStatus === 0) {
    return (
      <PageShell>
        <OracleRoomLobby
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

  if (effectiveStatus === 1) {
    return (
      <PageShell>
        <OracleSession
          room={room}
          questions={questions}
          questionsError={questionsError}
          results={results}
          players={players}
          onSubmit={(answers) => submitAnswers({ roomId, answers })}
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

  return (
    <PageShell>
      <OracleResults
        results={results}
        questions={questions}
        correctAnswers={correctAnswers}
        roomId={roomId}
        onPlayAgain={() => router.push("/oracle")}
      />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-20 pb-12 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

function ErrorPage({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">{message}</p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Oracle Arena
        </Button>
      </div>
    </PageShell>
  );
}
