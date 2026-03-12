# { "Depends": "py-genlayer:test" }

import json
from datetime import datetime, timezone
from genlayer import *

# ── Constants ──────────────────────────────────────────────────────────────────

ROOM_DURATION = 600        # 10-minute game window (seconds)
MAX_PLAYERS = 8
MIN_PLAYERS = 2
QUESTION_COUNT = 5
SECONDS_PER_WEEK = 604800  # 7 * 24 * 3600

# XP by finish rank (0-indexed). Everyone beyond index 4 gets 10 XP.
XP_BY_RANK = [100, 75, 50, 25, 10]


# ── Storage Classes ─────────────────────────────────────────────────────────────

@allow_storage
class Question:
    text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct: str   # "a", "b", "c", or "d"


@allow_storage
class Room:
    host: Address
    status: u256       # 0=waiting, 1=active, 2=finished
    start_time: u256
    player_count: u256
    week_number: u256


# ── Contract ───────────────────────────────────────────────────────────────────

class OracleArena(gl.Contract):
    # Weekly questions (regenerated once per week)
    weekly_questions: TreeMap[u256, Question]
    weekly_week_number: u256
    weekly_initialized: u256

    # Room management
    room_count: u256
    rooms: TreeMap[u256, Room]
    room_player_at: TreeMap[u256, TreeMap[u256, Address]]
    room_has_player: TreeMap[u256, TreeMap[Address, u256]]

    # Submissions: room_id -> address -> "abcda" (5 chars)
    room_answers: TreeMap[u256, TreeMap[Address, str]]
    # Scores: room_id -> address -> 0-5 correct
    room_scores: TreeMap[u256, TreeMap[Address, u256]]
    # Submission order for tiebreaking (lower = submitted earlier)
    room_submit_order: TreeMap[u256, u256]
    room_player_order: TreeMap[u256, TreeMap[Address, u256]]

    # Finalization flag
    room_finalized: TreeMap[u256, u256]

    # XP (room battle rewards)
    xp: TreeMap[Address, u256]

    # ──────────────────────────────────────────────────────────────────────────

    def __init__(self):
        self.weekly_week_number = u256(0)
        self.weekly_initialized = u256(0)
        self.room_count = u256(0)

    # ── Internal helpers ───────────────────────────────────────────────────────

    def _get_timestamp(self) -> int:
        """Parse gl.message_raw['datetime'] (ISO string) into Unix seconds."""
        dt_str = gl.message_raw["datetime"]
        if dt_str.endswith("Z"):
            dt_str = dt_str[:-1] + "+00:00"
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return int(dt.timestamp())

    def _get_week_number(self) -> u256:
        return u256(self._get_timestamp() // SECONDS_PER_WEEK)

    def _ensure_weekly_questions(self):
        """
        Generate 5 fresh trivia questions every week via LLM consensus.

        HOW OPTIMISTIC DEMOCRACY IS SHOWCASED HERE
        ───────────────────────────────────────────
        1. The LEADER validator's LLM generates 5 trivia questions.
        2. Each VALIDATOR's LLM independently generates its own 5 questions.
        3. The comparative principle asks: do both outputs have 5 valid
           multiple-choice questions with the required JSON structure?
        4. If >66% of validators agree → questions are committed on-chain.

        No human picks the questions —
        they emerge from decentralized AI consensus.
        """
        current_week = self._get_week_number()
        if current_week == self.weekly_week_number and self.weekly_initialized == u256(1):
            return  # Already have this week's questions

        gen_prompt = (
            "You are a trivia question generator for a live blockchain game.\n\n"
            "Generate exactly 5 multiple-choice trivia questions on general knowledge "
            "(science, history, geography, culture, sports, technology).\n\n"
            "Rules:\n"
            "- Each question must have exactly 4 options: a, b, c, d\n"
            "- One option must be clearly correct and verifiable\n"
            "- Wrong options must be plausible but unambiguously incorrect\n"
            "- Difficulty: moderate — not trivial, not obscure\n"
            "- Questions must be self-contained\n\n"
            "Respond ONLY with valid JSON, no extra text:\n"
            '{"questions": ['
            '{"text": "...", "a": "...", "b": "...", "c": "...", "d": "...", "correct": "a"}'
            ", ... (exactly 5 items)]}"
        )

        result = gl.eq_principle.prompt_comparative(
            lambda: gl.nondet.exec_prompt(gen_prompt, response_format="json"),
            principle=(
                "Both outputs must have a 'questions' array with at least 5 items. "
                "Each item must have string fields: 'text', 'a', 'b', 'c', 'd', and 'correct'. "
                "The 'correct' field must be one of: a, b, c, or d. "
                "Accept as long as the structure is valid — content differences are fine."
            ),
        )

        questions = result.get("questions", [])
        for i in range(min(QUESTION_COUNT, len(questions))):
            q = self.weekly_questions.get_or_insert_default(u256(i))
            qdata = questions[i]
            q.text = str(qdata.get("text", f"Question {i + 1}"))
            q.option_a = str(qdata.get("a", "Option A"))
            q.option_b = str(qdata.get("b", "Option B"))
            q.option_c = str(qdata.get("c", "Option C"))
            q.option_d = str(qdata.get("d", "Option D"))
            q.correct = str(qdata.get("correct", "a")).lower()[:1]

        self.weekly_week_number = current_week
        self.weekly_initialized = u256(1)

    def _add_player_to_room(self, room_id: u256, player: Address):
        room = self.rooms[room_id]
        player_at = self.room_player_at.get_or_insert_default(room_id)
        player_at[room.player_count] = player
        has_player = self.room_has_player.get_or_insert_default(room_id)
        has_player[player] = u256(1)
        room.player_count += u256(1)

    # ── Room write methods ─────────────────────────────────────────────────────

    @gl.public.write
    def create_room(self):
        """Create a new room. Caller becomes host and is auto-joined."""
        room_id = self.room_count
        self.room_count += u256(1)

        room = self.rooms.get_or_insert_default(room_id)
        room.host = gl.message.sender_address
        room.status = u256(0)
        room.start_time = u256(0)
        room.player_count = u256(0)
        room.week_number = u256(0)

        self._add_player_to_room(room_id, gl.message.sender_address)

    @gl.public.write
    def join_room(self, room_id: u256):
        """Join a waiting room. Max 8 players."""
        if room_id >= self.room_count:
            raise Exception("Room does not exist")

        room = self.rooms[room_id]
        if room.status != u256(0):
            raise Exception("Room has already started or finished")
        if room.player_count >= u256(MAX_PLAYERS):
            raise Exception("Room is full")

        has_player = self.room_has_player.get_or_insert_default(room_id)
        if has_player.get(gl.message.sender_address, u256(0)) == u256(1):
            raise Exception("Already in this room")

        self._add_player_to_room(room_id, gl.message.sender_address)

    @gl.public.write
    def start_session(self, room_id: u256):
        """
        Host starts the game. Generates this week's 5 questions if not yet done.

        GenLayer validators browse Wikipedia live and reach AI consensus on the
        questions — no human controls the content. All rooms that week use
        the same 5 questions.
        """
        if room_id >= self.room_count:
            raise Exception("Room does not exist")

        room = self.rooms[room_id]
        if room.host != gl.message.sender_address:
            raise Exception("Only the host can start the session")
        if room.status != u256(0):
            raise Exception("Session already started or finished")
        if room.player_count < u256(MIN_PLAYERS):
            raise Exception(f"Need at least {MIN_PLAYERS} players to start")

        # Generate weekly questions via AI consensus (no-op if already done this week)
        self._ensure_weekly_questions()

        room.status = u256(1)
        room.start_time = u256(self._get_timestamp())
        room.week_number = self.weekly_week_number

    @gl.public.write
    def submit_answers(self, room_id: u256, answers: str):
        """
        Submit answers for all 5 questions at once.
        answers: a 5-character string, e.g. "acdba"
        """
        sender = gl.message.sender_address

        if room_id >= self.room_count:
            raise Exception("Room does not exist")

        room = self.rooms[room_id]
        if room.status != u256(1):
            raise Exception("Room is not active")

        elapsed = self._get_timestamp() - int(room.start_time)
        if elapsed > ROOM_DURATION:
            raise Exception("Submission window has closed (10-minute limit)")

        has_player = self.room_has_player.get_or_insert_default(room_id)
        if has_player.get(sender, u256(0)) == u256(0):
            raise Exception("You are not in this room")

        answers_map = self.room_answers.get_or_insert_default(room_id)
        if answers_map.get(sender, "") != "":
            raise Exception("Already submitted answers for this room")

        if len(answers) != QUESTION_COUNT:
            raise Exception(f"Must submit exactly {QUESTION_COUNT} answers")

        valid_chars = {"a", "b", "c", "d"}
        answers_lower = answers.lower()
        for ch in answers_lower:
            if ch not in valid_chars:
                raise Exception("Each answer must be a, b, c, or d")

        # Score immediately
        score = u256(0)
        for i in range(QUESTION_COUNT):
            q = self.weekly_questions[u256(i)]
            if answers_lower[i] == q.correct:
                score += u256(1)

        answers_map[sender] = answers_lower

        scores_map = self.room_scores.get_or_insert_default(room_id)
        scores_map[sender] = score

        # Track submission order for tiebreaking
        current_order = self.room_submit_order.get(room_id, u256(0))
        order_map = self.room_player_order.get_or_insert_default(room_id)
        order_map[sender] = current_order
        self.room_submit_order[room_id] = current_order + u256(1)

    @gl.public.write
    def finalize_room(self, room_id: u256):
        """
        Close the room and distribute XP by rank.
        Can be called by anyone once ROOM_DURATION seconds have elapsed.
        """
        if room_id >= self.room_count:
            raise Exception("Room does not exist")

        room = self.rooms[room_id]
        if room.status != u256(1):
            raise Exception("Room is not active")

        elapsed = self._get_timestamp() - int(room.start_time)
        if elapsed <= ROOM_DURATION:
            raise Exception("Game window has not closed yet")

        if self.room_finalized.get(room_id, u256(0)) == u256(1):
            raise Exception("Room already finalized")

        player_at = self.room_player_at.get_or_insert_default(room_id)
        scores_map = self.room_scores.get_or_insert_default(room_id)
        order_map = self.room_player_order.get_or_insert_default(room_id)

        player_data = []
        for i in range(int(room.player_count)):
            addr = player_at[u256(i)]
            score = int(scores_map.get(addr, u256(0)))
            order = int(order_map.get(addr, u256(9999)))
            player_data.append((addr, score, order))

        player_data.sort(key=lambda x: (-x[1], x[2]))

        for rank, (addr, _score, _order) in enumerate(player_data):
            xp_amount = XP_BY_RANK[rank] if rank < len(XP_BY_RANK) else 10
            current_xp = self.xp.get(addr, u256(0))
            self.xp[addr] = current_xp + u256(xp_amount)

        room.status = u256(2)
        self.room_finalized[room_id] = u256(1)

    # ── View methods ───────────────────────────────────────────────────────────

    @gl.public.view
    def get_room_count(self) -> int:
        return int(self.room_count)

    @gl.public.view
    def get_room(self, room_id: u256) -> dict:
        if room_id >= self.room_count:
            raise Exception("Room does not exist")
        room = self.rooms[room_id]
        return {
            "id": int(room_id),
            "host": room.host.as_hex,
            "status": int(room.status),
            "start_time": int(room.start_time),
            "player_count": int(room.player_count),
            "week_number": int(room.week_number),
            "duration": ROOM_DURATION,
        }

    @gl.public.view
    def get_room_players(self, room_id: u256) -> list:
        if room_id >= self.room_count:
            raise Exception("Room does not exist")
        room = self.rooms[room_id]
        player_at = self.room_player_at.get_or_insert_default(room_id)
        return [player_at[u256(i)].as_hex for i in range(int(room.player_count))]

    @gl.public.view
    def get_weekly_questions(self) -> list:
        """Return the current week's questions WITHOUT correct answers."""
        if self.weekly_initialized == u256(0):
            return []
        out = []
        for i in range(QUESTION_COUNT):
            q = self.weekly_questions[u256(i)]
            out.append({
                "index": i,
                "text": q.text,
                "a": q.option_a,
                "b": q.option_b,
                "c": q.option_c,
                "d": q.option_d,
            })
        return out

    @gl.public.view
    def get_weekly_answers(self) -> list:
        """Return correct answers (for post-game reveal)."""
        if self.weekly_initialized == u256(0):
            return []
        return [
            self.weekly_questions[u256(i)].correct
            for i in range(QUESTION_COUNT)
        ]

    @gl.public.view
    def get_room_results(self, room_id: u256) -> list:
        """Return scored results for all players, sorted by score DESC then order ASC."""
        if room_id >= self.room_count:
            raise Exception("Room does not exist")

        room = self.rooms[room_id]
        player_at = self.room_player_at.get_or_insert_default(room_id)

        # Check if any submissions exist for this room
        submission_count = int(self.room_submit_order.get(room_id, u256(0)))

        entries = []
        if submission_count == 0:
            # No submissions yet — return players with zeroed scores
            for i in range(int(room.player_count)):
                addr = player_at[u256(i)]
                entries.append({
                    "address": addr.as_hex,
                    "score": 0,
                    "answers": "",
                    "submitted": False,
                    "order": 9999,
                })
        else:
            scores_map = self.room_scores.get_or_insert_default(room_id)
            answers_map = self.room_answers.get_or_insert_default(room_id)
            order_map = self.room_player_order.get_or_insert_default(room_id)

            for i in range(int(room.player_count)):
                addr = player_at[u256(i)]
                score = int(scores_map.get(addr, u256(0)))
                submitted_answers = answers_map.get(addr, "")
                order = int(order_map.get(addr, u256(9999)))
                entries.append({
                    "address": addr.as_hex,
                    "score": score,
                    "answers": submitted_answers,
                    "submitted": submitted_answers != "",
                    "order": order,
                })

        entries.sort(key=lambda x: (-x["score"], x["order"]))
        return entries

    @gl.public.view
    def get_xp_leaderboard(self) -> list:
        entries = []
        for addr in self.xp:
            xp_val = int(self.xp[addr])
            if xp_val > 0:
                entries.append({"address": addr.as_hex, "xp": xp_val})
        entries.sort(key=lambda x: x["xp"], reverse=True)
        return entries

    @gl.public.view
    def get_player_xp(self, player: Address) -> int:
        return int(self.xp.get(player, u256(0)))
