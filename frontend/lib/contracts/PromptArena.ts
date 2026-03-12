import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Challenge {
  id: number;
  scenario: string;
  objective: string;
  difficulty: number; // 1=Easy, 2=Medium, 3=Hard
}

export interface ChallengeProgress {
  status: number; // 0=not tried, 1=failed, 2=succeeded
  feedback: string;
}

export interface PlayerProgress {
  [challengeId: string]: ChallengeProgress;
}

export interface LeaderboardEntry {
  address: string;
  points: number;
}

// ── Room types ─────────────────────────────────────────────────────────────────

export type RoomStatus = 0 | 1 | 2; // 0=waiting, 1=active, 2=finished

export interface Room {
  id: number;
  host: string;
  status: RoomStatus;
  start_time: number;
  player_count: number;
  week_number: number;
  duration: number; // seconds (always 600)
}

export interface RoomResult {
  address: string;
  score: number;   // 1–10 (0 = didn't submit)
  feedback: string;
  submitted: boolean;
}

export interface WeeklyChallenge {
  scenario: string;
  objective: string;
  week_number: number;
}

export interface XpLeaderboardEntry {
  address: string;
  xp: number;
}

export interface TransactionReceipt {
  status: string;
  hash: string;
  [key: string]: any;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function mapToObject(val: any): any {
  if (val instanceof Map) {
    const obj: any = {};
    for (const [k, v] of val.entries()) {
      obj[String(k)] = mapToObject(v);
    }
    return obj;
  }
  if (Array.isArray(val)) {
    return val.map(mapToObject);
  }
  return val;
}

// ── Contract class ─────────────────────────────────────────────────────────────

class PromptArena {
  private contractAddress: `0x${string}`;
  private client: ReturnType<typeof createClient>;

  constructor(
    contractAddress: string,
    address?: string | null,
    studioUrl?: string
  ) {
    this.contractAddress = contractAddress as `0x${string}`;

    const config: any = { chain: studionet };
    if (address) config.account = address as `0x${string}`;
    if (studioUrl) config.endpoint = studioUrl;

    this.client = createClient(config);
  }

  // ── Read helpers ─────────────────────────────────────────────────────────────

  private async read(functionName: string, args: any[] = []): Promise<any> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName,
      args,
    });
    return mapToObject(raw);
  }

  private async write(
    functionName: string,
    args: any[] = []
  ): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName,
      args,
      value: BigInt(0),
    });

    // LLM evaluation can take up to ~3 minutes
    const receipt = await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries: 36,
      interval: 5000,
    });

    return receipt as TransactionReceipt;
  }

  // ── Solo-mode methods ─────────────────────────────────────────────────────────

  async getChallenges(): Promise<Challenge[]> {
    const parsed = await this.read("get_challenges");
    if (Array.isArray(parsed)) {
      return parsed.map((c: any) => ({
        id: Number(c.id),
        scenario: String(c.scenario ?? ""),
        objective: String(c.objective ?? ""),
        difficulty: Number(c.difficulty ?? 1),
      }));
    }
    return [];
  }

  async getPlayerProgress(address: string): Promise<PlayerProgress> {
    const parsed = await this.read("get_player_progress", [address]);
    if (parsed && typeof parsed === "object") {
      const progress: PlayerProgress = {};
      for (const [key, val] of Object.entries(
        parsed as Record<string, any>
      )) {
        progress[key] = {
          status: Number((val as any)?.status ?? 0),
          feedback: String((val as any)?.feedback ?? ""),
        };
      }
      return progress;
    }
    return {};
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const parsed = await this.read("get_leaderboard");
    if (Array.isArray(parsed)) {
      return parsed
        .map((e: any) => ({
          address: String(e.address ?? ""),
          points: Number(e.points ?? 0),
        }))
        .sort((a, b) => b.points - a.points);
    }
    return [];
  }

  async getPlayerPoints(address: string | null): Promise<number> {
    if (!address) return 0;
    const result = await this.read("get_player_points", [address]);
    return Number(result) || 0;
  }

  async submitPrompt(
    challengeId: number,
    prompt: string
  ): Promise<TransactionReceipt> {
    return this.write("submit_prompt", [challengeId, prompt]);
  }

  // ── Room methods ─────────────────────────────────────────────────────────────

  async getRoomCount(): Promise<number> {
    const result = await this.read("get_room_count");
    return Number(result) || 0;
  }

  async getRoom(roomId: number): Promise<Room> {
    const parsed = await this.read("get_room", [roomId]);
    return {
      id: Number(parsed.id ?? roomId),
      host: String(parsed.host ?? ""),
      status: (Number(parsed.status ?? 0) as RoomStatus),
      start_time: Number(parsed.start_time ?? 0),
      player_count: Number(parsed.player_count ?? 0),
      week_number: Number(parsed.week_number ?? 0),
      duration: Number(parsed.duration ?? 600),
    };
  }

  async getRoomPlayers(roomId: number): Promise<string[]> {
    const parsed = await this.read("get_room_players", [roomId]);
    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
    return [];
  }

  async getRoomResults(roomId: number): Promise<RoomResult[]> {
    const parsed = await this.read("get_room_results", [roomId]);
    if (Array.isArray(parsed)) {
      return parsed.map((e: any) => ({
        address: String(e.address ?? ""),
        score: Number(e.score ?? 0),
        feedback: String(e.feedback ?? ""),
        submitted: Boolean(e.submitted ?? false),
      }));
    }
    return [];
  }

  async getWeeklyChallenge(): Promise<WeeklyChallenge> {
    const parsed = await this.read("get_weekly_challenge");
    return {
      scenario: String(parsed?.scenario ?? ""),
      objective: String(parsed?.objective ?? ""),
      week_number: Number(parsed?.week_number ?? 0),
    };
  }

  async getXpLeaderboard(): Promise<XpLeaderboardEntry[]> {
    const parsed = await this.read("get_xp_leaderboard");
    if (Array.isArray(parsed)) {
      return parsed
        .map((e: any) => ({
          address: String(e.address ?? ""),
          xp: Number(e.xp ?? 0),
        }))
        .sort((a, b) => b.xp - a.xp);
    }
    return [];
  }

  async getPlayerXp(address: string | null): Promise<number> {
    if (!address) return 0;
    const result = await this.read("get_player_xp", [address]);
    return Number(result) || 0;
  }

  async createRoom(): Promise<TransactionReceipt> {
    return this.write("create_room", []);
  }

  async joinRoom(roomId: number): Promise<TransactionReceipt> {
    return this.write("join_room", [roomId]);
  }

  async startSession(roomId: number): Promise<TransactionReceipt> {
    // start_session generates the weekly challenge via AI — allow up to 3 min
    return this.write("start_session", [roomId]);
  }

  async submitRoomPrompt(
    roomId: number,
    prompt: string
  ): Promise<TransactionReceipt> {
    return this.write("submit_room_prompt", [roomId, prompt]);
  }

  async finalizeRoom(roomId: number): Promise<TransactionReceipt> {
    return this.write("finalize_room", [roomId]);
  }
}

export default PromptArena;
