import * as fs from 'fs/promises';
import * as path from 'path';
import type { GameRoom } from '../types/game';

const GAMES_DIR = path.join(process.cwd(), 'data', 'games');

async function ensureGamesDir(): Promise<void> {
  await fs.mkdir(GAMES_DIR, { recursive: true });
}

function gamePath(gameId: string): string {
  return path.join(GAMES_DIR, `${gameId}.json`);
}

// ── In-memory cache ──────────────────────────────────────────────────────────
// Keeps the authoritative game state in memory.  Handlers mutate the cached
// object directly (no cloning) so concurrent handlers that run between the
// same tick always see the latest state.  Disk writes are debounced so we
// don't hammer the filesystem on every tap/drag.

const cache = new Map<string, GameRoom>();
const dirtyRooms = new Set<string>();
const pendingTimers = new Map<string, NodeJS.Timeout>();
const FLUSH_DELAY_MS = 800;

/** Flush a single room to disk immediately. */
async function flushToDisk(roomId: string): Promise<void> {
  const room = cache.get(roomId);
  if (!room) return;
  try {
    await ensureGamesDir();
    await fs.writeFile(gamePath(roomId), JSON.stringify(room), 'utf-8');
    dirtyRooms.delete(roomId);
  } catch (err) {
    console.error(`[gameStorage] flush FAILED room=${roomId.slice(0, 8)}:`, err instanceof Error ? err.message : err);
  }
}

/** Schedule a debounced disk write for a room. */
function scheduleDiskWrite(roomId: string): void {
  dirtyRooms.add(roomId);
  const existing = pendingTimers.get(roomId);
  if (existing) clearTimeout(existing);
  pendingTimers.set(
    roomId,
    setTimeout(() => {
      pendingTimers.delete(roomId);
      void flushToDisk(roomId);
    }, FLUSH_DELAY_MS),
  );
}

/**
 * Save game state.  Updates the in-memory cache and schedules a disk write.
 * The room object is stored by reference — callers should already be mutating
 * the object returned by loadGame(), so this is effectively a "mark dirty".
 */
export async function saveGame(room: GameRoom): Promise<void> {
  cache.set(room.id, room);
  scheduleDiskWrite(room.id);
}

/**
 * Load game state.  Returns the **live** cached object (not a clone) so that
 * all handlers within the same event-loop tick see the same state.  This is
 * safe because Node.js is single-threaded — the synchronous mutation code in
 * each handler cannot interleave with another handler's synchronous code.
 */
export async function loadGame(gameId: string): Promise<GameRoom | null> {
  const cached = cache.get(gameId);
  if (cached) return cached;

  // Cold start — load from disk and cache
  try {
    const data = await fs.readFile(gamePath(gameId), 'utf-8');
    const room = JSON.parse(data) as GameRoom;
    cache.set(room.id, room);
    return room;
  } catch {
    return null;
  }
}

export async function loadGameByCode(code: string): Promise<GameRoom | null> {
  // Check cache first
  for (const room of cache.values()) {
    if (room.code.toUpperCase() === code.toUpperCase()) return room;
  }

  // Fall back to disk scan
  await ensureGamesDir();
  const files = await fs.readdir(GAMES_DIR);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const data = await fs.readFile(path.join(GAMES_DIR, file), 'utf-8');
      const room = JSON.parse(data) as GameRoom;
      if (room.code.toUpperCase() === code.toUpperCase()) {
        cache.set(room.id, room);
        return room;
      }
    } catch (err) {
      console.warn(`[gameStorage] skipping unreadable game file ${file}:`, err instanceof Error ? err.message : String(err));
    }
  }
  return null;
}

export async function deleteGame(gameId: string): Promise<void> {
  cache.delete(gameId);
  dirtyRooms.delete(gameId);
  const pending = pendingTimers.get(gameId);
  if (pending) { clearTimeout(pending); pendingTimers.delete(gameId); }
  try { await fs.unlink(gamePath(gameId)); } catch { /* */ }
}

export async function cleanupOldGames(): Promise<void> {
  const cutoff = Date.now() - 12 * 60 * 60 * 1000;

  // Evict stale rooms from cache
  for (const [id, room] of cache.entries()) {
    if (new Date(room.lastActivity).getTime() < cutoff) {
      cache.delete(id);
      dirtyRooms.delete(id);
      const pending = pendingTimers.get(id);
      if (pending) { clearTimeout(pending); pendingTimers.delete(id); }
    }
  }

  // Clean disk
  await ensureGamesDir();
  const files = await fs.readdir(GAMES_DIR);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const data = await fs.readFile(path.join(GAMES_DIR, file), 'utf-8');
      const room = JSON.parse(data) as GameRoom;
      if (new Date(room.lastActivity).getTime() < cutoff) {
        await fs.unlink(path.join(GAMES_DIR, file));
      }
    } catch (err) {
      console.warn(`[gameStorage] cleanup skipped ${file}:`, err instanceof Error ? err.message : String(err));
    }
  }
}

/** Force-flush all dirty rooms to disk (call on server shutdown). */
export async function flushAll(): Promise<void> {
  for (const [id, timer] of pendingTimers.entries()) {
    clearTimeout(timer);
    pendingTimers.delete(id);
  }
  const flushes = [...dirtyRooms].map(id => flushToDisk(id));
  await Promise.all(flushes);
  console.log(`[gameStorage] flushed ${flushes.length} room(s) to disk`);
}
