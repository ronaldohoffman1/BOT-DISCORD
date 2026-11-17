const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbDir = process.env.DATA_DIR || path.resolve(__dirname, "../../../data");
if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch (err) {
    console.error("Erro ao criar pasta data para sqlite:", err.message);
  }
}

const dbPath = process.env.DATABASE_PATH || path.join(dbDir, "attendance.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    closed_at TEXT,
    is_open INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    checked_in_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (event_id) REFERENCES events(id)
  );

  CREATE UNIQUE INDEX IF NOT EXISTS ix_attendance_event_user
    ON attendance(event_id, user_id);
`);

// Migrações seguras (ignoram erro se coluna já existir)
try { db.exec("ALTER TABLE events ADD COLUMN message_id TEXT"); } catch {}
try { db.exec("ALTER TABLE events ADD COLUMN channel_id TEXT"); } catch {}
try { db.exec("ALTER TABLE events ADD COLUMN category TEXT NOT NULL DEFAULT 'Geral'"); } catch {}
try { db.exec("ALTER TABLE events ADD COLUMN start_at TEXT"); } catch {}

// ── Eventos ───────────────────────────────────────────────────────────────────

function createEvent(name, description, createdBy, category, startAt = null) {
  return db
    .prepare("INSERT INTO events (name, description, created_by, category, start_at) VALUES (?, ?, ?, ?, ?)")
    .run(name, description || "", createdBy, category, startAt);
}

function getOpenEventByName(name) {
  return db
    .prepare("SELECT * FROM events WHERE is_open = 1 AND name = ? COLLATE NOCASE")
    .get(name);
}

function closeEvent(eventId) {
  return db
    .prepare("UPDATE events SET is_open = 0, closed_at = datetime('now','localtime') WHERE id = ? AND is_open = 1")
    .run(eventId);
}

function getOpenEvents() {
  return db.prepare("SELECT * FROM events WHERE is_open = 1 ORDER BY created_at DESC").all();
}

function getEventById(id) {
  return db.prepare("SELECT * FROM events WHERE id = ?").get(id);
}

function getAllEvents() {
  return db.prepare("SELECT * FROM events ORDER BY created_at DESC").all();
}

function updateEventMessage(eventId, messageId, channelId) {
  return db
    .prepare("UPDATE events SET message_id = ?, channel_id = ? WHERE id = ?")
    .run(messageId, channelId, eventId);
}

// ── Categorias ────────────────────────────────────────────────────────────────

function createCategory(name, description, createdBy) {
  return db
    .prepare("INSERT INTO categories (name, description, created_by) VALUES (?, ?, ?)")
    .run(name, description || "", createdBy);
}

function deleteCategory(name) {
  return db.prepare("DELETE FROM categories WHERE name = ? COLLATE NOCASE").run(name);
}

function getCategoryByName(name) {
  return db.prepare("SELECT * FROM categories WHERE name = ? COLLATE NOCASE").get(name);
}

/** Lista categorias com estatísticas vindas dos eventos vinculados */
function getCategories() {
  return db
    .prepare(
      `SELECT
         c.id,
         c.name,
         c.description,
         c.created_by,
         c.created_at,
         COUNT(DISTINCT e.id)  AS total_events,
         COUNT(a.id)           AS total_attendances,
         COALESCE(SUM(e.is_open), 0) AS open_events
       FROM categories c
       LEFT JOIN events e ON e.category = c.name COLLATE NOCASE
       LEFT JOIN attendance a ON a.event_id = e.id
       GROUP BY c.id
       ORDER BY c.name COLLATE NOCASE`
    )
    .all();
}

/** Nomes de categorias para o select menu */
function getCategoryNames() {
  return db
    .prepare("SELECT name FROM categories ORDER BY name COLLATE NOCASE")
    .all()
    .map((r) => r.name);
}

// ── Presenças ─────────────────────────────────────────────────────────────────

function checkIn(eventId, userId, username) {
  return db
    .prepare(
      `INSERT INTO attendance (event_id, user_id, username) VALUES (?, ?, ?)
       ON CONFLICT(event_id, user_id) DO UPDATE SET username = excluded.username`
    )
    .run(eventId, userId, username);
}

function checkOut(eventId, userId) {
  return db
    .prepare("DELETE FROM attendance WHERE event_id = ? AND user_id = ?")
    .run(eventId, userId);
}

function getAttendance(eventId) {
  return db
    .prepare("SELECT * FROM attendance WHERE event_id = ? ORDER BY checked_in_at ASC")
    .all(eventId);
}

function hasCheckedIn(eventId, userId) {
  return !!db
    .prepare("SELECT 1 FROM attendance WHERE event_id = ? AND user_id = ?")
    .get(eventId, userId);
}

// ── Ranking ───────────────────────────────────────────────────────────────────

/** Ranking global — todos os eventos */
function getRanking(limit = 20) {
  return db
    .prepare(
      `SELECT a.user_id, a.username, COUNT(*) AS total
       FROM attendance a
       GROUP BY a.user_id
       ORDER BY total DESC
       LIMIT ?`
    )
    .all(limit);
}

/** Ranking filtrado por categoria */
function getRankingByCategory(category, limit = 20) {
  return db
    .prepare(
      `SELECT a.user_id, a.username, COUNT(*) AS total
       FROM attendance a
       JOIN events e ON e.id = a.event_id
       WHERE e.category = ? COLLATE NOCASE
       GROUP BY a.user_id
       ORDER BY total DESC
       LIMIT ?`
    )
    .all(category, limit);
}

/** Stats de um usuário, opcionalmente filtrado por categoria */
function getUserStats(userId, category = null) {
  if (category) {
    return db
      .prepare(
        `SELECT
           a.user_id,
           a.username,
           COUNT(*) AS total,
           GROUP_CONCAT(e.name, ' | ') AS events
         FROM attendance a
         JOIN events e ON e.id = a.event_id
         WHERE a.user_id = ? AND e.category = ? COLLATE NOCASE
         GROUP BY a.user_id`
      )
      .get(userId, category);
  }
  return db
    .prepare(
      `SELECT
         a.user_id,
         a.username,
         COUNT(*) AS total,
         GROUP_CONCAT(e.name || ' [' || e.category || ']', ' | ') AS events
       FROM attendance a
       JOIN events e ON e.id = a.event_id
       WHERE a.user_id = ?
       GROUP BY a.user_id`
    )
    .get(userId);
}

/** Resumo de categorias por usuário */
function getUserCategoryBreakdown(userId) {
  return db
    .prepare(
      `SELECT e.category, COUNT(*) AS total
       FROM attendance a
       JOIN events e ON e.id = a.event_id
       WHERE a.user_id = ?
       GROUP BY e.category
       ORDER BY total DESC`
    )
    .all(userId);
}

module.exports = {
  // categorias
  createCategory,
  deleteCategory,
  getCategoryByName,
  getCategories,
  getCategoryNames,
  // eventos
  createEvent,
  getOpenEventByName,
  closeEvent,
  getOpenEvents,
  getEventById,
  getAllEvents,
  updateEventMessage,
  checkIn,
  checkOut,
  getAttendance,
  hasCheckedIn,
  getRanking,
  getRankingByCategory,
  getUserStats,
  getUserCategoryBreakdown,
};
