import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

// ── Types ───────────────────────────────────────────────────────────────────────

export type RoomStatus = 0 | 1 | 2; // 0=waiting, 1=active, 2=finished

export interface OracleRoom {
  id: number;
  host: string;
  status: RoomStatus;
  start_time: number;
  player_count: number;
  week_number: number;
  duration: number;
}

export interface OracleQuestion {
  index: number;
  text: string;
  a: string;
  b: string;
  c: string;
  d: string;
}

export interface OracleRoomResult {
  address: string;
  score: number;   // 0-5
  answers: string; // "abcda" or "" if not submitted
  submitted: boolean;
  order: number;
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

// ── Helpers ─────────────────────────────────────────────────────────────────────

function mapToObject(val: any): any {
  if (val instanceof Map) {
    const obj: any = {};
    for (const [k, v] of val.entries()) {
      obj[String(k)] = mapToObject(v);
    }
    return obj;
  }
  if (Array.isArray(val)) return val.map(mapToObject);
  return val;
}

// ── Contract class ──────────────────────────────────────────────────────────────

export class OracleArena {
  private contractAddress: `0x${string}`;
  private client: ReturnType<typeof createClient>;

  constructor(contractAddress: string, address?: string | null, studioUrl?: string) {
    this.contractAddress = contractAddress as `0x${string}`;
    const config: any = { chain: studionet };
    if (address) config.account = address as `0x${string}`;
    if (studioUrl) config.endpoint = studioUrl;
    this.client = createClient(config);
  }

  private async read(functionName: string, args: any[] = []): Promise<any> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName,
      args,
    });
    return mapToObject(raw);
  }

  private async write(functionName: string, args: any[] = [], retries = 36): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName,
      args,
      value: BigInt(0),
    });
    const receipt = await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries,
      interval: 5000,
    });

    // status 5 = ACCEPTED, 7 = FINALIZED — anything else means failure
    const statusCode = (receipt as any)?.status;
    if (statusCode !== undefined && statusCode !== 5 && statusCode !== 7) {
      throw new Error(`Transaction not accepted (status code: ${statusCode})`);
    }

    // execution_result "ERROR"/"FAILURE" = contract raised an exception
    const execResult = (receipt as any)?.consensus_data?.leader_receipt?.[0]?.execution_result;
    if (execResult === "FAILURE" || execResult === "ERROR") {
      const stderr = (receipt as any)?.consensus_data?.leader_receipt?.[0]?.genvm_result?.stderr ?? "";
      const errDetail = (receipt as any)?.consensus_data?.leader_receipt?.[0]?.error
        ?? stderr.split("\n").filter(Boolean).pop()
        ?? execResult;
      throw new Error(errDetail);
    }
    return receipt as TransactionReceipt;
  }

  async getRoomCount(): Promise<number> {
    const result = await this.read("get_room_count");
    return Number(result) || 0;
  }

  async getRoom(roomId: number): Promise<OracleRoom> {
    const parsed = await this.read("get_room", [roomId]);
    return {
      id: Number(parsed.id ?? roomId),
      host: String(parsed.host ?? ""),
      status: Number(parsed.status ?? 0) as RoomStatus,
      start_time: Number(parsed.start_time ?? 0),
      player_count: Number(parsed.player_count ?? 0),
      week_number: Number(parsed.week_number ?? 0),
      duration: Number(parsed.duration ?? 600),
    };
  }

  async getRoomPlayers(roomId: number): Promise<string[]> {
    const parsed = await this.read("get_room_players", [roomId]);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  }

  async getWeeklyQuestions(): Promise<OracleQuestion[]> {
    let parsed: any;
    try {
      parsed = await this.read("get_weekly_questions");
    } catch (e) {
      throw e;
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.map((q: any) => ({
      index: Number(q.index ?? 0),
      text: String(q.text ?? ""),
      a: String(q.a ?? ""),
      b: String(q.b ?? ""),
      c: String(q.c ?? ""),
      d: String(q.d ?? ""),
    }));
  }

  async getWeeklyAnswers(): Promise<string[]> {
    const parsed = await this.read("get_weekly_answers");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  }

  async getRoomResults(roomId: number): Promise<OracleRoomResult[]> {
    let parsed: any;
    try {
      parsed = await this.read("get_room_results", [roomId]);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.map((e: any) => ({
      address: String(e.address ?? ""),
      score: Number(e.score ?? 0),
      answers: String(e.answers ?? ""),
      submitted: Boolean(e.submitted ?? false),
      order: Number(e.order ?? 9999),
    }));
  }

  async getXpLeaderboard(): Promise<XpLeaderboardEntry[]> {
    const parsed = await this.read("get_xp_leaderboard");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((e: any) => ({ address: String(e.address ?? ""), xp: Number(e.xp ?? 0) }))
      .sort((a, b) => b.xp - a.xp);
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
    // AI consensus + Wikipedia fetch can take 2-5 min — use 72 retries (6 min)
    return this.write("start_session", [roomId], 72);
  }

  async submitAnswers(roomId: number, answers: string): Promise<TransactionReceipt> {
    return this.write("submit_answers", [roomId, answers]);
  }

  async finalizeRoom(roomId: number): Promise<TransactionReceipt> {
    return this.write("finalize_room", [roomId]);
  }
}
