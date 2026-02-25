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

export async function saveGame(room: GameRoom): Promise<void> {
  await ensureGamesDir();
  await fs.writeFile(gamePath(room.id), JSON.stringify(room, null, 2), 'utf-8');
}

export async function loadGame(gameId: string): Promise<GameRoom | null> {
  try {
    const data = await fs.readFile(gamePath(gameId), 'utf-8');
    return JSON.parse(data) as GameRoom;
  } catch {
    return null;
  }
}

export async function loadGameByCode(code: string): Promise<GameRoom | null> {
  await ensureGamesDir();
  try {
    const files = await fs.readdir(GAMES_DIR);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const data = await fs.readFile(path.join(GAMES_DIR, file), 'utf-8');
      const room = JSON.parse(data) as GameRoom;
      if (room.code.toUpperCase() === code.toUpperCase()) return room;
    }
  } catch { /* */ }
  return null;
}

export async function deleteGame(gameId: string): Promise<void> {
  try { await fs.unlink(gamePath(gameId)); } catch { /* */ }
}

export async function cleanupOldGames(): Promise<void> {
  await ensureGamesDir();
  const files = await fs.readdir(GAMES_DIR);
  const cutoff = Date.now() - 12 * 60 * 60 * 1000; // 12 hours
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const data = await fs.readFile(path.join(GAMES_DIR, file), 'utf-8');
      const room = JSON.parse(data) as GameRoom;
      if (new Date(room.lastActivity).getTime() < cutoff) {
        await fs.unlink(path.join(GAMES_DIR, file));
      }
    } catch { /* */ }
  }
}
