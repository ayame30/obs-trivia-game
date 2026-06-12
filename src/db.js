import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.join(__dirname, '..', 'data', 'stream-trivia.db');
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : defaultDbPath;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath, { enableForeignKeyConstraints: true });
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS twitch_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    access_token TEXT NOT NULL,
    login TEXT NOT NULL,
    user_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL REFERENCES questions(id),
    status TEXT NOT NULL CHECK (status IN ('active', 'ended')) DEFAULT 'active',
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id INTEGER NOT NULL REFERENCES rounds(id),
    twitch_user_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    answer TEXT NOT NULL CHECK (answer IN ('A', 'B', 'C', 'D')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (round_id, twitch_user_id)
  );

  CREATE TABLE IF NOT EXISTS scoreboard (
    twitch_user_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((col) => col.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

ensureColumn('questions', 'countdown_seconds', 'countdown_seconds INTEGER NOT NULL DEFAULT 30');
ensureColumn('rounds', 'countdown_seconds', 'countdown_seconds INTEGER NOT NULL DEFAULT 30');
ensureColumn('rounds', 'countdown_ends_at', 'countdown_ends_at TEXT');
ensureColumn('rounds', 'countdown_paused', 'countdown_paused INTEGER NOT NULL DEFAULT 0');
ensureColumn('rounds', 'countdown_remaining_ms', 'countdown_remaining_ms INTEGER');

const DEFAULT_COUNTDOWN_SECONDS = 30;
const MIN_COUNTDOWN_SECONDS = 5;
const MAX_COUNTDOWN_SECONDS = 600;

function clampCountdownSeconds(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return DEFAULT_COUNTDOWN_SECONDS;
  return Math.min(MAX_COUNTDOWN_SECONDS, Math.max(MIN_COUNTDOWN_SECONDS, Math.round(seconds)));
}

export function getCountdownRemainingSeconds(row) {
  if (!row || row.status !== 'active') return 0;
  if (row.countdown_paused) {
    return Math.max(0, Math.ceil((row.countdown_remaining_ms ?? 0) / 1000));
  }
  if (!row.countdown_ends_at) {
    return row.countdown_seconds ?? DEFAULT_COUNTDOWN_SECONDS;
  }
  const endMs = new Date(row.countdown_ends_at).getTime();
  return Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
}

export function isRoundAcceptingVotes(row) {
  if (!row || row.status !== 'active') return false;
  return getCountdownRemainingSeconds(row) > 0;
}

const activeRoundStmt = db.prepare(`
  SELECT r.*, q.text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.countdown_seconds AS question_countdown_seconds
  FROM rounds r
  JOIN questions q ON q.id = r.question_id
  WHERE r.status = 'active'
  ORDER BY r.id DESC
  LIMIT 1
`);

export function getQuestions() {
  return db.prepare('SELECT * FROM questions ORDER BY id ASC').all();
}

export function getQuestion(id) {
  return db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
}

export function createQuestion({
  text,
  optionA,
  optionB,
  optionC,
  optionD,
  correctAnswer,
  countdownSeconds,
}) {
  const seconds = clampCountdownSeconds(countdownSeconds ?? DEFAULT_COUNTDOWN_SECONDS);
  const result = db
    .prepare(
      `INSERT INTO questions (text, option_a, option_b, option_c, option_d, correct_answer, countdown_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(text, optionA, optionB, optionC, optionD, correctAnswer, seconds);
  return getQuestion(Number(result.lastInsertRowid));
}

export function updateQuestion(id, fields) {
  const existing = getQuestion(id);
  if (!existing) return null;
  db.prepare(
    `UPDATE questions SET
      text = ?,
      option_a = ?,
      option_b = ?,
      option_c = ?,
      option_d = ?,
      correct_answer = ?,
      countdown_seconds = ?
     WHERE id = ?`
  ).run(
    fields.text ?? existing.text,
    fields.optionA ?? existing.option_a,
    fields.optionB ?? existing.option_b,
    fields.optionC ?? existing.option_c,
    fields.optionD ?? existing.option_d,
    fields.correctAnswer ?? existing.correct_answer,
    fields.countdownSeconds !== undefined && fields.countdownSeconds !== null
      ? clampCountdownSeconds(fields.countdownSeconds)
      : existing.countdown_seconds,
    id
  );
  return getQuestion(id);
}

export function deleteQuestion(id) {
  const result = db.prepare('DELETE FROM questions WHERE id = ?').run(id);
  return Number(result.changes) > 0;
}

export function getTwitchConfig() {
  return db.prepare('SELECT * FROM twitch_config WHERE id = 1').get();
}

export function setTwitchConfig({ accessToken, login, userId, channel }) {
  db.prepare(
    `INSERT INTO twitch_config (id, access_token, login, user_id, channel, updated_at)
     VALUES (1, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       access_token = excluded.access_token,
       login = excluded.login,
       user_id = excluded.user_id,
       channel = excluded.channel,
       updated_at = datetime('now')`
  ).run(accessToken, login, userId, channel);
  return getTwitchConfig();
}

export function getActiveRound() {
  return activeRoundStmt.get();
}

export function startRound(questionId) {
  const existing = getActiveRound();
  if (existing) {
    throw new Error('A question round is already active. Stop it before starting another.');
  }
  const question = getQuestion(questionId);
  if (!question) {
    throw new Error('Question not found');
  }
  const seconds = clampCountdownSeconds(question.countdown_seconds);
  const endsAt = new Date(Date.now() + seconds * 1000).toISOString();
  const result = db
    .prepare(
      `INSERT INTO rounds (question_id, status, countdown_seconds, countdown_ends_at, countdown_paused, countdown_remaining_ms)
       VALUES (?, ?, ?, ?, 0, NULL)`
    )
    .run(questionId, 'active', seconds, endsAt);
  return getRound(Number(result.lastInsertRowid));
}

export function getRound(id) {
  return db
    .prepare(
      `SELECT r.*, q.text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.countdown_seconds AS question_countdown_seconds
       FROM rounds r
       JOIN questions q ON q.id = r.question_id
       WHERE r.id = ?`
    )
    .get(id);
}

export function pauseCountdown(roundId) {
  const round = getRound(roundId);
  if (!round || round.status !== 'active') {
    throw new Error('No active round to pause');
  }
  if (round.countdown_paused) {
    return round;
  }
  const remainingMs = Math.max(0, new Date(round.countdown_ends_at).getTime() - Date.now());
  db.prepare(
    `UPDATE rounds
     SET countdown_paused = 1,
         countdown_remaining_ms = ?,
         countdown_ends_at = NULL
     WHERE id = ?`
  ).run(remainingMs, roundId);
  return getRound(roundId);
}

export function resumeCountdown(roundId) {
  const round = getRound(roundId);
  if (!round || round.status !== 'active') {
    throw new Error('No active round to resume');
  }
  if (!round.countdown_paused) {
    return round;
  }
  const remainingMs = Math.max(0, round.countdown_remaining_ms ?? 0);
  const endsAt = new Date(Date.now() + remainingMs).toISOString();
  db.prepare(
    `UPDATE rounds
     SET countdown_paused = 0,
         countdown_remaining_ms = NULL,
         countdown_ends_at = ?
     WHERE id = ?`
  ).run(endsAt, roundId);
  return getRound(roundId);
}

export function stopRound(roundId) {
  const round = getRound(roundId);
  if (!round || round.status !== 'active') {
    throw new Error('No active round to stop');
  }
  db.prepare(`UPDATE rounds SET status = 'ended', ended_at = datetime('now') WHERE id = ?`).run(
    roundId
  );

  const correct = round.correct_answer;
  const voters = db
    .prepare('SELECT * FROM votes WHERE round_id = ? AND answer = ?')
    .all(roundId, correct);

  const upsertScore = db.prepare(
    `INSERT INTO scoreboard (twitch_user_id, display_name, score, updated_at)
     VALUES (?, ?, 1, datetime('now'))
     ON CONFLICT(twitch_user_id) DO UPDATE SET
       display_name = excluded.display_name,
       score = score + 1,
       updated_at = datetime('now')`
  );

  for (const vote of voters) {
    upsertScore.run(vote.twitch_user_id, vote.display_name);
  }

  return getRound(roundId);
}

export function recordVote({ roundId, twitchUserId, displayName, answer }) {
  const round = getRound(roundId);
  if (!round || round.status !== 'active' || !isRoundAcceptingVotes(round)) {
    return null;
  }
  try {
    db.prepare(
      `INSERT INTO votes (round_id, twitch_user_id, display_name, answer)
       VALUES (?, ?, ?, ?)`
    ).run(roundId, twitchUserId, displayName, answer);
    return { roundId, twitchUserId, displayName, answer, isNew: true };
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.code === 'SQLITE_CONSTRAINT') {
      return null;
    }
    return null;
  }
}

export function getVoteCounts(roundId) {
  const rows = db
    .prepare(
      `SELECT answer, COUNT(*) as count FROM votes WHERE round_id = ? GROUP BY answer`
    )
    .all(roundId);
  const counts = { A: 0, B: 0, C: 0, D: 0, total: 0 };
  for (const row of rows) {
    counts[row.answer] = row.count;
    counts.total += row.count;
  }
  return counts;
}

export function getScoreboard() {
  return db
    .prepare('SELECT * FROM scoreboard ORDER BY score DESC, display_name ASC')
    .all();
}

export function resetScoreboard() {
  db.prepare('DELETE FROM scoreboard').run();
  return [];
}

/**
 * Batch update existing scoreboard rows only. Each item must include exactly one of
 * `score` (absolute) or `delta` (relative). Unknown twitchUserId values are rejected.
 */
export function batchUpdateScoreboard(updates) {
  if (!updates?.length) {
    return getScoreboard();
  }

  const getEntry = db.prepare('SELECT * FROM scoreboard WHERE twitch_user_id = ?');
  const setScore = db.prepare(
    `UPDATE scoreboard
     SET score = ?,
         display_name = COALESCE(?, display_name),
         updated_at = datetime('now')
     WHERE twitch_user_id = ?`
  );

  const apply = (items) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const item of items) {
        const { twitchUserId, displayName, score, delta } = item;
        const hasScore = score !== undefined && score !== null;
        const hasDelta = delta !== undefined && delta !== null;

        if (hasScore === hasDelta) {
          throw new Error(
            `Each update must include exactly one of score or delta (${twitchUserId})`
          );
        }

        const existing = getEntry.get(twitchUserId);
        if (!existing) {
          throw new Error(`Scoreboard entry not found (${twitchUserId})`);
        }

        if (hasScore) {
          setScore.run(Math.max(0, Math.round(score)), displayName ?? null, twitchUserId);
        } else {
          setScore.run(
            Math.max(0, existing.score + Math.round(delta)),
            displayName ?? null,
            twitchUserId
          );
        }
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };

  apply(updates);
  return getScoreboard();
}

/** Clear all rounds/votes and reset round id counter so the next round is #1. */
export function resetRounds() {
  db.exec('DELETE FROM votes');
  db.exec('DELETE FROM rounds');
  db.exec("DELETE FROM sqlite_sequence WHERE name = 'rounds'");
  return true;
}

export function mapQuestion(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    text: row.text,
    optionA: row.option_a,
    optionB: row.option_b,
    optionC: row.option_c,
    optionD: row.option_d,
    correctAnswer: row.correct_answer,
    countdownSeconds: row.countdown_seconds ?? DEFAULT_COUNTDOWN_SECONDS,
    createdAt: row.created_at,
  };
}

export function mapRound(row, { revealAnswer = false } = {}) {
  if (!row) return null;
  const question = {
    id: String(row.question_id),
    text: row.text,
    optionA: row.option_a,
    optionB: row.option_b,
    optionC: row.option_c,
    optionD: row.option_d,
    correctAnswer: revealAnswer || row.status === 'ended' ? row.correct_answer : null,
    countdownSeconds: row.question_countdown_seconds ?? row.countdown_seconds ?? DEFAULT_COUNTDOWN_SECONDS,
    createdAt: null,
  };
  return {
    id: String(row.id),
    questionId: String(row.question_id),
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    question,
    voteCounts: getVoteCounts(row.id),
    countdownSeconds: row.countdown_seconds ?? DEFAULT_COUNTDOWN_SECONDS,
    countdownRemainingSeconds: getCountdownRemainingSeconds(row),
    countdownPaused: Boolean(row.countdown_paused),
    countdownEndsAt: row.countdown_ends_at ?? null,
  };
}

export function mapTwitchConfig(row) {
  if (!row) return null;
  return {
    login: row.login,
    userId: row.user_id,
    channel: row.channel,
    updatedAt: row.updated_at,
    hasToken: Boolean(row.access_token),
  };
}

export function mapScoreboardEntry(row) {
  return {
    twitchUserId: row.twitch_user_id,
    displayName: row.display_name,
    score: row.score,
  };
}

export function getTwitchAccessToken() {
  const row = db.prepare('SELECT access_token FROM twitch_config WHERE id = 1').get();
  return row?.access_token ?? null;
}

export default db;
