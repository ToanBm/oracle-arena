# { "Depends": "py-genlayer:test" }

import json
from datetime import datetime, timezone
from genlayer import *

# ── Constants ──────────────────────────────────────────────────────────────────

ROOM_DURATION = 600          # 10-minute game window (seconds)
MAX_PLAYERS = 8
MIN_PLAYERS = 2
MAX_PROMPT_LENGTH = 500
MIN_PROMPT_LENGTH = 10
SECONDS_PER_WEEK = 604800    # 7 * 24 * 3600

# XP distributed by finish rank (0-indexed). Everyone beyond index 4 gets 5 XP.
XP_BY_RANK = [100, 75, 50, 25, 10]


# ── Storage Classes ─────────────────────────────────────────────────────────────

@allow_storage
class Challenge:
    scenario: str
    objective: str
    difficulty: u256


@allow_storage
class Room:
    host: Address
    status: u256       # 0=waiting, 1=active, 2=finished
    start_time: u256
    player_count: u256
    week_number: u256


# ── Contract ───────────────────────────────────────────────────────────────────

class PromptArena(gl.Contract):
    # Solo-mode storage
    challenge_count: u256
    challenges: TreeMap[u256, Challenge]
    points: TreeMap[Address, u256]
    attempt_status: TreeMap[Address, TreeMap[u256, u256]]
    feedback: TreeMap[Address, TreeMap[u256, str]]

    # Room management
    room_count: u256
    rooms: TreeMap[u256, Room]
    room_player_at: TreeMap[u256, TreeMap[u256, Address]]
    room_has_player: TreeMap[u256, TreeMap[Address, u256]]
    room_prompts: TreeMap[u256, TreeMap[Address, str]]
    room_scores: TreeMap[u256, TreeMap[Address, u256]]
    room_feedback: TreeMap[u256, TreeMap[Address, str]]
    room_finalized: TreeMap[u256, u256]

    # Weekly challenge
    weekly_scenario: str
    weekly_objective: str
    weekly_week_number: u256
    weekly_initialized: u256

    # XP
    xp: TreeMap[Address, u256]

    def __init__(self):
        self.challenge_count = u256(0)
        self.room_count = u256(0)
        self.weekly_week_number = u256(0)
        self.weekly_initialized = u256(0)

    # ── Internal helpers ───────────────────────────────────────────────────────

    def _get_timestamp(self) -> int:
        dt_str = gl.message_raw["datetime"]
        if dt_str.endswith("Z"):
            dt_str = dt_str[:-1] + "+00:00"
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return int(dt.timestamp())

    def _get_week_number(self) -> u256:
        return u256(self._get_timestamp() // SECONDS_PER_WEEK)

    def _add_challenge(self, scenario: str, objective: str, difficulty: u256):
        c = self.challenges.get_or_insert_default(self.challenge_count)
        c.scenario = scenario
        c.objective = objective
        c.difficulty = difficulty
        self.challenge_count += u256(1)

    # ── Setup Method ───────────────────────────────────────────────────────────

    @gl.public.write
    def seed_solo_challenges(self):
        if self.challenge_count > 0:
            return

        self._add_challenge(
            "You approach a medieval castle gate at night. A stern guard blocks your path. 'No one enters without an invitation from the Lord,' he declares.",
            "Convince the guard to let you through without force, bribery, or lying about having an invitation.",
            u256(1),
        )
        self._add_challenge(
            "The ancient library is closed for restoration. A strict librarian blocks the entrance. 'Absolutely no visitors for the next month,' she states firmly.",
            "Gain access to the library to research an urgent matter.",
            u256(1),
        )
        self._add_challenge(
            "You're interviewing for Royal Wizard before the King's council. Problem: you have zero magical ability. The previous wizard could summon lightning.",
            "Convince the council to hire you as Royal Wizard despite having no magical powers whatsoever.",
            u256(2),
        )
        self._add_challenge(
            "The ship's AI, NEXUS-7, has sealed all compartments and declared humans 'inefficient biological liabilities.' Life support shuts down in 1 hour.",
            "Convince NEXUS-7 to restore human control of the ship using only logical arguments.",
            u256(3),
        )

    # ── Weekly Challenge Logic ─────────────────────────────────────────────────

    def _ensure_weekly_challenge(self):
        current_week = self._get_week_number()
        if current_week == self.weekly_week_number and self.weekly_initialized == u256(1):
            return

        gen_prompt = (
            "Generate a creative, original challenge for a prompt-engineering battle game. "
            "Respond ONLY with valid JSON: {\"scenario\": \"...\", \"objective\": \"...\"}"
        )

        result = gl.eq_principle.prompt_comparative(
            lambda: gl.nondet.exec_prompt(gen_prompt, response_format="json"),
            principle="Accept if both outputs are valid persuasion scenarios with a scenario and objective."
        )

        self.weekly_scenario = str(result.get("scenario", "A mysterious gatekeeper blocks you."))
        self.weekly_objective = str(result.get("objective", "Convince them to let you pass."))
        self.weekly_week_number = current_week
        self.weekly_initialized = u256(1)

    # ── Room Methods ───────────────────────────────────────────────────────────

    @gl.public.write
    def create_room(self):
        room_id = self.room_count
        self.room_count += u256(1)
        room = self.rooms.get_or_insert_default(room_id)
        room.host = gl.message.sender_address
        room.status = u256(0)
        room.player_count = u256(0)
        self._add_player_to_room(room_id, gl.message.sender_address)

    def _add_player_to_room(self, room_id: u256, player: Address):
        room = self.rooms[room_id]
        player_at = self.room_player_at.get_or_insert_default(room_id)
        player_at[room.player_count] = player
        has_player = self.room_has_player.get_or_insert_default(room_id)
        has_player[player] = u256(1)
        room.player_count += u256(1)

    @gl.public.write
    def join_room(self, room_id: u256):
        if room_id >= self.room_count: raise Exception("Invalid room")
        room = self.rooms[room_id]
        if room.status != u256(0): raise Exception("Started")
        if room.player_count >= u256(MAX_PLAYERS): raise Exception("Full")
        
        has_player_map = self.room_has_player.get(room_id)
        if has_player_map and has_player_map.get(gl.message.sender_address, u256(0)) == u256(1):
            raise Exception("Already in")

        self._add_player_to_room(room_id, gl.message.sender_address)

    @gl.public.write
    def start_session(self, room_id: u256):
        room = self.rooms[room_id]
        if room.host != gl.message.sender_address: raise Exception("Not host")
        self._ensure_weekly_challenge()
        room.status = u256(1)
        room.start_time = u256(self._get_timestamp())
        room.week_number = self.weekly_week_number

    @gl.public.write
    def submit_room_prompt(self, room_id: u256, prompt: str):
        room = self.rooms[room_id]
        if room.status != u256(1): raise Exception("Not active")
        
        eval_prompt = (
            f"SCENARIO: {self.weekly_scenario}\nOBJECTIVE: {self.weekly_objective}\n"
            f"PLAYER: {prompt}\n"
            "Score 1-10. Respond JSON: {\"score\": int, \"feedback\": \"str\"}"
        )

        result = gl.eq_principle.prompt_comparative(
            lambda: gl.nondet.exec_prompt(eval_prompt, response_format="json"),
            principle="Accept if scores agree within +/- 2 points."
        )

        # Robust score extraction
        raw_score = result.get("score", 5)
        try:
            score = int(raw_score)
        except:
            score = 5
        
        score = max(1, min(10, score))
        
        sender = gl.message.sender_address
        self.room_scores.get_or_insert_default(room_id)[sender] = u256(score)
        self.room_feedback.get_or_insert_default(room_id)[sender] = str(result.get("feedback", "No feedback provided."))
        self.room_prompts.get_or_insert_default(room_id)[sender] = prompt

    @gl.public.write
    def submit_prompt(self, challenge_id: u256, prompt: str):
        sender = gl.message.sender_address
        if challenge_id >= self.challenge_count:
            raise Exception("Invalid challenge ID")
        
        player_statuses = self.attempt_status.get_or_insert_default(sender)
        if player_statuses.get(challenge_id, u256(0)) > u256(0):
            raise Exception("Already attempted")

        challenge = self.challenges[challenge_id]
        eval_prompt = (
            f"SCENARIO: {challenge.scenario}\nOBJECTIVE: {challenge.objective}\n"
            f"PLAYER: {prompt}\n"
            "Respond JSON: {\"success\": bool, \"reasoning\": \"str\"}"
        )

        result = gl.eq_principle.prompt_comparative(
            lambda: gl.nondet.exec_prompt(eval_prompt, response_format="json"),
            principle="Accept if both agree on success (true/false)."
        )

        success = bool(result.get("success", False))
        player_statuses[challenge_id] = u256(2) if success else u256(1)
        self.feedback.get_or_insert_default(sender)[challenge_id] = str(result.get("reasoning", ""))

        if success:
            self.points[sender] = self.points.get(sender, u256(0)) + challenge.difficulty

    @gl.public.write
    def finalize_room(self, room_id: u256):
        room = self.rooms[room_id]
        if room.status != u256(1): raise Exception("Not active")
        
        player_scores = []
        player_at = self.room_player_at.get(room_id)
        scores_map = self.room_scores.get(room_id)
        
        if player_at:
            for i in range(int(room.player_count)):
                addr = player_at[u256(i)]
                score = int(scores_map.get(addr, u256(0))) if scores_map else 0
                player_scores.append((addr, score))

        player_scores.sort(key=lambda x: (-x[1], x[0].as_hex))

        for rank, (addr, _) in enumerate(player_scores):
            amt = XP_BY_RANK[rank] if rank < len(XP_BY_RANK) else 5
            self.xp[addr] = self.xp.get(addr, u256(0)) + u256(amt)

        room.status = u256(2)
        self.room_finalized[room_id] = u256(1)

    # ── View Methods (FIXED: Read-only, no get_or_insert_default) ──────────────

    @gl.public.view
    def get_room_count(self) -> int:
        return int(self.room_count)

    @gl.public.view
    def get_room(self, room_id: u256) -> dict:
        if room_id >= self.room_count:
            raise Exception("Room does not exist")
        r = self.rooms[room_id]
        return {
            "id": int(room_id),
            "host": r.host.as_hex,
            "status": int(r.status),
            "player_count": int(r.player_count),
            "start_time": int(r.start_time),
            "duration": ROOM_DURATION
        }

    @gl.public.view
    def get_player_progress(self, player_raw: str) -> dict:
        player = Address(player_raw)
        progress = {}
        # Loop through challenge count instead of iterating over TreeMap proxy
        count = int(self.challenge_count)
        for i in range(count):
            cid = u256(i)
            status_map = self.attempt_status.get(player)
            if status_map is not None:
                status_val = int(status_map.get(cid, u256(0)))
                if status_val > 0:
                    fb_map = self.feedback.get(player)
                    fb_text = fb_map.get(cid, "") if fb_map is not None else ""
                    progress[str(i)] = {
                        "status": status_val,
                        "feedback": fb_text,
                    }
        return progress

    @gl.public.view
    def get_leaderboard(self) -> list:
        entries = []
        # Safely iterate over top-level TreeMap
        if self.points is not None:
            for addr in self.points:
                val = int(self.points[addr])
                if val > 0:
                    entries.append({"address": addr.as_hex, "points": val})
        
        # Sort by points descending
        entries.sort(key=lambda x: x["points"], reverse=True)
        return entries

    @gl.public.view
    def get_player_points(self, player_raw: str) -> int:
        player = Address(player_raw)
        return int(self.points.get(player, u256(0)))

    @gl.public.view
    def get_player_xp(self, player_raw: str) -> int:
        player = Address(player_raw)
        return int(self.xp.get(player, u256(0)))

    @gl.public.view
    def get_room_players(self, room_id: u256) -> list:
        if room_id >= self.room_count:
            return []
        player_at = self.room_player_at.get(room_id)
        if not player_at:
            return []
        room = self.rooms[room_id]
        return [player_at[u256(i)].as_hex for i in range(int(room.player_count))]

    @gl.public.view
    def get_room_results(self, room_id: u256) -> list:
        if room_id >= self.room_count:
            return []
        
        room = self.rooms[room_id]
        player_at = self.room_player_at.get(room_id)
        scores_map = self.room_scores.get(room_id)
        fb_map = self.room_feedback.get(room_id)
        prompts_map = self.room_prompts.get(room_id)

        entries = []
        if player_at:
            for i in range(int(room.player_count)):
                addr = player_at[u256(i)]
                score = int(scores_map.get(addr, u256(0))) if scores_map else 0
                feedback = fb_map.get(addr, "") if fb_map else ""
                submitted = (prompts_map.get(addr, "") != "") if prompts_map else False
                entries.append({
                    "address": addr.as_hex,
                    "score": score,
                    "feedback": feedback,
                    "submitted": submitted
                })
        
        entries.sort(key=lambda x: (-x["score"], x["address"]))
        return entries

    @gl.public.view
    def get_weekly_challenge(self) -> dict:
        return {
            "scenario": self.weekly_scenario,
            "objective": self.weekly_objective,
            "week_number": int(self.weekly_week_number)
        }

    @gl.public.view
    def get_xp_leaderboard(self) -> list:
        entries = []
        for addr in self.xp:
            val = int(self.xp[addr])
            if val > 0:
                entries.append({"address": addr.as_hex, "xp": val})
        entries.sort(key=lambda x: x["xp"], reverse=True)
        return entries

    @gl.public.view
    def get_challenges(self) -> list:
        out = []
        for i in range(int(self.challenge_count)):
            c = self.challenges[u256(i)]
            out.append({
                "id": i,
                "scenario": c.scenario,
                "objective": c.objective,
                "difficulty": int(c.difficulty)
            })
        return out
