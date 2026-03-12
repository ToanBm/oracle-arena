"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import PromptArena from "../contracts/PromptArena";
import type {
  Challenge,
  PlayerProgress,
  LeaderboardEntry,
  Room,
  RoomResult,
  WeeklyChallenge,
  XpLeaderboardEntry,
} from "../contracts/PromptArena";
import { getContractAddress, getStudioUrl } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { success, error } from "../utils/toast";

export function usePromptArenaContract(): PromptArena | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();
  const studioUrl = getStudioUrl();
  const pathname = usePathname();
  const isOraclePage = pathname?.startsWith("/oracle");

  return useMemo(() => {
    // Don't create a PromptArena contract instance on oracle pages
    if (isOraclePage) return null;
    if (!contractAddress) return null;
    return new PromptArena(contractAddress, address, studioUrl);
  }, [contractAddress, address, studioUrl, isOraclePage]);
}

// ── Solo-mode hooks ────────────────────────────────────────────────────────────

export function useChallenges() {
  const contract = usePromptArenaContract();

  return useQuery<Challenge[], Error>({
    queryKey: ["challenges"],
    queryFn: () => (contract ? contract.getChallenges() : Promise.resolve([])),
    refetchOnWindowFocus: true,
    staleTime: 30000,
    enabled: !!contract,
  });
}

export function usePlayerProgress(address: string | null) {
  const contract = usePromptArenaContract();

  return useQuery<PlayerProgress, Error>({
    queryKey: ["playerProgress", address],
    queryFn: () =>
      contract && address
        ? contract.getPlayerProgress(address)
        : Promise.resolve({}),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!address && !!contract,
  });
}

export function usePlayerPoints(address: string | null) {
  const contract = usePromptArenaContract();

  return useQuery<number, Error>({
    queryKey: ["playerPoints", address],
    queryFn: () =>
      contract ? contract.getPlayerPoints(address) : Promise.resolve(0),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!address && !!contract,
  });
}

export function useLeaderboard() {
  const contract = usePromptArenaContract();

  return useQuery<LeaderboardEntry[], Error>({
    queryKey: ["leaderboard"],
    queryFn: () =>
      contract ? contract.getLeaderboard() : Promise.resolve([]),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract,
  });
}

export function useSubmitPrompt() {
  const contract = usePromptArenaContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [submittingChallengeId, setSubmittingChallengeId] = useState<
    number | null
  >(null);

  const mutation = useMutation({
    mutationFn: async ({
      challengeId,
      prompt,
    }: {
      challengeId: number;
      prompt: string;
    }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setSubmittingChallengeId(challengeId);
      return contract.submitPrompt(challengeId, prompt);
    },
    onSuccess: async () => {
      // Small delay to allow the state to propagate to the RPC before refetching
      await new Promise((r) => setTimeout(r, 2000));
      queryClient.invalidateQueries({ queryKey: ["playerProgress"] });
      queryClient.invalidateQueries({ queryKey: ["playerPoints"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      setSubmittingChallengeId(null);
      success("Prompt evaluated!", {
        description: "Check your result on the challenge card.",
      });
    },
    onError: (err: any) => {
      console.error("Error submitting prompt:", err);
      setSubmittingChallengeId(null);
      error("Submission failed", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    submittingChallengeId,
    submitPrompt: mutation.mutate,
    submitPromptAsync: mutation.mutateAsync,
  };
}

// ── Room hooks ────────────────────────────────────────────────────────────────

export function useRoom(roomId: number | null) {
  const contract = usePromptArenaContract();

  return useQuery<Room, Error>({
    queryKey: ["room", roomId],
    queryFn: () => contract!.getRoom(roomId!),
    enabled: !!contract && roomId !== null,
    refetchInterval: 3000, // poll for status changes
    staleTime: 1000,
  });
}

export function useRoomPlayers(roomId: number | null) {
  const contract = usePromptArenaContract();

  return useQuery<string[], Error>({
    queryKey: ["roomPlayers", roomId],
    queryFn: () => contract!.getRoomPlayers(roomId!),
    enabled: !!contract && roomId !== null,
    refetchInterval: 3000,
    staleTime: 1000,
  });
}

export function useRoomResults(roomId: number | null) {
  const contract = usePromptArenaContract();

  return useQuery<RoomResult[], Error>({
    queryKey: ["roomResults", roomId],
    queryFn: () => contract!.getRoomResults(roomId!),
    enabled: !!contract && roomId !== null,
    refetchInterval: 5000,
    staleTime: 2000,
  });
}

export function useRoomCount() {
  const contract = usePromptArenaContract();

  return useQuery<number, Error>({
    queryKey: ["roomCount"],
    queryFn: () => (contract ? contract.getRoomCount() : Promise.resolve(0)),
    enabled: !!contract,
    refetchInterval: 10000,
  });
}

export function useWeeklyChallenge() {
  const contract = usePromptArenaContract();

  return useQuery<WeeklyChallenge, Error>({
    queryKey: ["weeklyChallenge"],
    queryFn: () => contract!.getWeeklyChallenge(),
    enabled: !!contract,
    staleTime: 60000, // challenge changes weekly
  });
}

export function usePlayerXp(address: string | null) {
  const contract = usePromptArenaContract();

  return useQuery<number, Error>({
    queryKey: ["playerXp", address],
    queryFn: () => contract!.getPlayerXp(address),
    enabled: !!contract && !!address,
    refetchOnWindowFocus: true,
    staleTime: 2000,
  });
}

export function useXpLeaderboard() {
  const contract = usePromptArenaContract();

  return useQuery<XpLeaderboardEntry[], Error>({
    queryKey: ["xpLeaderboard"],
    queryFn: () => contract!.getXpLeaderboard(),
    enabled: !!contract,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });
}

export function useCreateRoom() {
  const contract = usePromptArenaContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      return contract.createRoom();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roomCount"] });
    },
    onError: (err: any) => {
      error("Failed to create room", { description: err?.message });
    },
  });
}

export function useJoinRoom() {
  const contract = usePromptArenaContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: number) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      return contract.joinRoom(roomId);
    },
    onSuccess: (_data, roomId) => {
      queryClient.invalidateQueries({ queryKey: ["room", roomId] });
      queryClient.invalidateQueries({ queryKey: ["roomPlayers", roomId] });
      success("Joined room!");
    },
    onError: (err: any) => {
      error("Failed to join room", { description: err?.message });
    },
  });
}

export function useStartSession() {
  const contract = usePromptArenaContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: number) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      return contract.startSession(roomId);
    },
    onSuccess: (_data, roomId) => {
      queryClient.invalidateQueries({ queryKey: ["room", roomId] });
      queryClient.invalidateQueries({ queryKey: ["weeklyChallenge"] });
      success("Battle started!", {
        description: "The weekly challenge has been revealed.",
      });
    },
    onError: (err: any) => {
      error("Failed to start session", { description: err?.message });
    },
  });
}

export function useSubmitRoomPrompt() {
  const contract = usePromptArenaContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      roomId,
      prompt,
    }: {
      roomId: number;
      prompt: string;
    }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsSubmitting(true);
      return contract.submitRoomPrompt(roomId, prompt);
    },
    onSuccess: async (_data, { roomId }) => {
      // Small delay to allow state to propagate to RPC before refetching
      await new Promise((r) => setTimeout(r, 2000));
      setIsSubmitting(false);
      queryClient.invalidateQueries({ queryKey: ["roomResults", roomId] });
      success("Prompt submitted!", {
        description: "Your score will appear once validators reach consensus.",
      });
    },
    onError: (err: any) => {
      setIsSubmitting(false);
      error("Submission failed", { description: err?.message });
    },
  });

  return { ...mutation, isSubmitting };
}

export function useFinalizeRoom() {
  const contract = usePromptArenaContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: number) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      return contract.finalizeRoom(roomId);
    },
    onSuccess: (_data, roomId) => {
      queryClient.invalidateQueries({ queryKey: ["room", roomId] });
      queryClient.invalidateQueries({ queryKey: ["roomResults", roomId] });
      queryClient.invalidateQueries({ queryKey: ["xpLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["playerXp"] });
      success("Room finalized!", {
        description: "XP has been distributed to all players.",
      });
    },
    onError: (err: any) => {
      error("Failed to finalize room", { description: err?.message });
    },
  });
}
