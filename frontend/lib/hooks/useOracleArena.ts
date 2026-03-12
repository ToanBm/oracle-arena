"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { OracleArena } from "../contracts/OracleArena";
import type { OracleRoom, OracleQuestion, OracleRoomResult, XpLeaderboardEntry, RoomStatus } from "../contracts/OracleArena";
import { getStudioUrl } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { success, error, configError } from "../utils/toast";

export function useOracleArenaContract(): OracleArena | null {
  const { address } = useWallet();
  const studioUrl = getStudioUrl();
  const contractAddress = typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_ORACLE_CONTRACT_ADDRESS || ""
    : "";

  return useMemo(() => {
    if (!contractAddress) {
      configError(
        "Setup Required",
        "Oracle Arena contract address not configured. Please set NEXT_PUBLIC_ORACLE_CONTRACT_ADDRESS in your .env file."
      );
      return null;
    }
    return new OracleArena(contractAddress, address, studioUrl);
  }, [contractAddress, address, studioUrl]);
}

export function useOracleRoom(roomId: number | null) {
  const contract = useOracleArenaContract();
  const queryClient = useQueryClient();
  return useQuery<OracleRoom, Error>({
    queryKey: ["oracleRoom", roomId],
    queryFn: async () => {
      const fresh = await contract!.getRoom(roomId!);
      // Never downgrade status or start_time — RPC can return stale data briefly
      const cached = queryClient.getQueryData<OracleRoom>(["oracleRoom", roomId]);
      if (cached && fresh.status < cached.status) {
        return { ...fresh, status: cached.status, start_time: cached.start_time };
      }
      return fresh;
    },
    enabled: !!contract && roomId !== null,
    refetchInterval: 3000,
    staleTime: 1000,
  });
}

export function useOracleRoomPlayers(roomId: number | null) {
  const contract = useOracleArenaContract();
  return useQuery<string[], Error>({
    queryKey: ["oracleRoomPlayers", roomId],
    queryFn: () => contract!.getRoomPlayers(roomId!),
    enabled: !!contract && roomId !== null,
    refetchInterval: 3000,
    staleTime: 1000,
  });
}

export function useWeeklyQuestions() {
  const contract = useOracleArenaContract();
  const queryClient = useQueryClient();
  return useQuery<OracleQuestion[], Error>({
    queryKey: ["oracleWeeklyQuestions"],
    queryFn: async () => {
      const fresh = await contract!.getWeeklyQuestions();
      // Keep questions once loaded — don't overwrite with empty from stale RPC
      if (fresh.length === 0) {
        const cached = queryClient.getQueryData<OracleQuestion[]>(["oracleWeeklyQuestions"]);
        if (cached && cached.length > 0) return cached;
      }
      return fresh;
    },
    enabled: !!contract,
    staleTime: 0,
    refetchInterval: 3000,
    retry: 2,
  });
}

export function useWeeklyAnswers() {
  const contract = useOracleArenaContract();
  return useQuery<string[], Error>({
    queryKey: ["oracleWeeklyAnswers"],
    queryFn: () => contract!.getWeeklyAnswers(),
    enabled: !!contract,
    staleTime: 60000,
  });
}

export function useOracleRoomResults(roomId: number | null) {
  const contract = useOracleArenaContract();
  return useQuery<OracleRoomResult[], Error>({
    queryKey: ["oracleRoomResults", roomId],
    queryFn: async () => {
      try {
        return await contract!.getRoomResults(roomId!);
      } catch {
        return [];
      }
    },
    enabled: !!contract && roomId !== null,
    refetchInterval: 4000,
    staleTime: 2000,
    retry: 0,
  });
}

export function useOracleRoomCount() {
  const contract = useOracleArenaContract();
  return useQuery<number, Error>({
    queryKey: ["oracleRoomCount"],
    queryFn: () => (contract ? contract.getRoomCount() : Promise.resolve(0)),
    enabled: !!contract,
    refetchInterval: 10000,
  });
}

export function useOracleXpLeaderboard() {
  const contract = useOracleArenaContract();
  return useQuery<XpLeaderboardEntry[], Error>({
    queryKey: ["oracleXpLeaderboard"],
    queryFn: () => contract!.getXpLeaderboard(),
    enabled: !!contract,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });
}

export function useOraclePlayerXp(address: string | null) {
  const contract = useOracleArenaContract();
  return useQuery<number, Error>({
    queryKey: ["oraclePlayerXp", address],
    queryFn: () => contract!.getPlayerXp(address),
    enabled: !!contract && !!address,
    refetchOnWindowFocus: true,
    staleTime: 2000,
  });
}

export function useCreateOracleRoom() {
  const contract = useOracleArenaContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      return contract.createRoom();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oracleRoomCount"] });
    },
    onError: (err: any) => {
      error("Failed to create room", { description: err?.message });
    },
  });
}

export function useJoinOracleRoom() {
  const contract = useOracleArenaContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: number) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      return contract.joinRoom(roomId);
    },
    onSuccess: (_data, roomId) => {
      queryClient.invalidateQueries({ queryKey: ["oracleRoom", roomId] });
      queryClient.invalidateQueries({ queryKey: ["oracleRoomPlayers", roomId] });
      success("Joined room!");
    },
    onError: (err: any) => {
      error("Failed to join room", { description: err?.message });
    },
  });
}

export function useStartOracleSession() {
  const contract = useOracleArenaContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: number) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      return contract.startSession(roomId);
    },
    onSuccess: (_data, roomId) => {
      // Optimistically flip room status to 1 so the UI switches immediately
      queryClient.setQueryData(["oracleRoom", roomId], (old: OracleRoom | undefined) =>
        old ? { ...old, status: 1 as RoomStatus, start_time: Math.floor(Date.now() / 1000) } : old
      );
      queryClient.invalidateQueries({ queryKey: ["oracleRoom", roomId] });
      queryClient.invalidateQueries({ queryKey: ["oracleWeeklyQuestions"] });
      success("Game started!", { description: "This week's questions are ready." });
    },
    onError: (err: any) => {
      error("Failed to start session", { description: err?.message });
    },
  });
}

export function useSubmitOracleAnswers() {
  const contract = useOracleArenaContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({ roomId, answers }: { roomId: number; answers: string }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsSubmitting(true);
      return contract.submitAnswers(roomId, answers);
    },
    onSuccess: (_data, { roomId }) => {
      setIsSubmitting(false);
      queryClient.invalidateQueries({ queryKey: ["oracleRoomResults", roomId] });
      success("Answers submitted!", { description: "Your score has been recorded." });
    },
    onError: (err: any) => {
      setIsSubmitting(false);
      error("Submission failed", { description: err?.message });
    },
  });

  return { ...mutation, isSubmitting };
}

export function useFinalizeOracleRoom() {
  const contract = useOracleArenaContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: number) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      return contract.finalizeRoom(roomId);
    },
    onSuccess: (_data, roomId) => {
      queryClient.invalidateQueries({ queryKey: ["oracleRoom", roomId] });
      queryClient.invalidateQueries({ queryKey: ["oracleRoomResults", roomId] });
      queryClient.invalidateQueries({ queryKey: ["oracleXpLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["oraclePlayerXp"] });
      success("Room finalized!", { description: "XP has been distributed." });
    },
    onError: (err: any) => {
      error("Failed to finalize room", { description: err?.message });
    },
  });
}
