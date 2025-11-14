import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DATABASE_PATH || join(__dirname, 'locusfocus.db');
console.log('Database path:', dbPath);
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize database schema
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      last_updated INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS room_users (
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (room_id, user_id),
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS locks (
      room_id TEXT NOT NULL,
      target_user_id TEXT NOT NULL,
      locked_by_user_id TEXT NOT NULL,
      locked INTEGER NOT NULL DEFAULT 0,
      timestamp INTEGER NOT NULL,
      PRIMARY KEY (room_id, target_user_id),
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_locks_room ON locks(room_id);
    CREATE INDEX IF NOT EXISTS idx_room_users_room ON room_users(room_id);
  `);
}

// Room operations
export function createRoom(roomId) {
  const now = Date.now();
  const stmt = db.prepare('INSERT OR IGNORE INTO rooms (id, created_at, last_updated) VALUES (?, ?, ?)');
  stmt.run(roomId, now, now);
  return { id: roomId, created_at: now };
}

export function getRoom(roomId) {
  const stmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
  return stmt.get(roomId);
}

export function updateRoomTimestamp(roomId) {
  const stmt = db.prepare('UPDATE rooms SET last_updated = ? WHERE id = ?');
  stmt.run(Date.now(), roomId);
}

// User operations
export function addUserToRoom(roomId, userId, username) {
  const stmt = db.prepare('INSERT OR REPLACE INTO room_users (room_id, user_id, username, joined_at) VALUES (?, ?, ?, ?)');
  stmt.run(roomId, userId, username, Date.now());
}

export function getRoomUsers(roomId) {
  const stmt = db.prepare('SELECT user_id, username, joined_at FROM room_users WHERE room_id = ?');
  return stmt.all(roomId);
}

export function removeUserFromRoom(roomId, userId) {
  const stmt = db.prepare('DELETE FROM room_users WHERE room_id = ? AND user_id = ?');
  stmt.run(roomId, userId);
}

// Lock operations
export function setLock(roomId, targetUserId, lockedByUserId, locked) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO locks (room_id, target_user_id, locked_by_user_id, locked, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(roomId, targetUserId, lockedByUserId, locked ? 1 : 0, Date.now());
  updateRoomTimestamp(roomId);
}

export function getLock(roomId, targetUserId) {
  const stmt = db.prepare('SELECT * FROM locks WHERE room_id = ? AND target_user_id = ?');
  return stmt.get(roomId, targetUserId);
}

export function getAllLocks(roomId) {
  const stmt = db.prepare('SELECT * FROM locks WHERE room_id = ?');
  return stmt.all(roomId);
}

export function getRoomState(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;

  const users = getRoomUsers(roomId);
  const locks = getAllLocks(roomId);

  const locksMap = {};
  locks.forEach(lock => {
    locksMap[lock.target_user_id] = {
      locked: lock.locked === 1,
      lockedBy: lock.locked_by_user_id,
      timestamp: lock.timestamp
    };
  });

  return {
    roomId: room.id,
    lastUpdated: room.last_updated,
    users,
    locks: locksMap
  };
}

// Cleanup old rooms (optional - rooms inactive for 30 days)
export function cleanupOldRooms(daysOld = 30) {
  const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
  const stmt = db.prepare('DELETE FROM rooms WHERE last_updated < ?');
  const result = stmt.run(cutoff);
  return result.changes;
}

export default db;
