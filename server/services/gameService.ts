import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import type {
  GameRoom, GameFormat, GamePlayerState, BattlefieldCard,
  ParsedDeck, GameAction,
} from '../types/game';
import * as storage from './gameStorageService';

const SCRYFALL_API = 'https://api.scryfall.com';

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function makePlayer(playerId: string, playerName: string, life: number): GamePlayerState {
  return {
    playerId,
    playerName,
    life,
    poisonCounters: 0,
    commanderTax: 0,
    commanderDamageReceived: {},
    handCardIds: [],
    libraryCardIds: [],
    graveyardCardIds: [],
    exileCardIds: [],
    commandZoneCardIds: [],
    sideboardCardIds: [],
  };
}

function startingLife(format: GameFormat): number {
  return format === 'commander' ? 40 : 20;
}

export async function createGame(
  hostName: string,
  format: GameFormat,
): Promise<{ room: GameRoom; playerId: string }> {
  const roomId = uuidv4();
  const playerId = uuidv4();
  const code = generateCode();

  const room: GameRoom = {
    id: roomId,
    code,
    hostId: playerId,
    format,
    status: 'waiting',
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    cards: {},
    players: {
      [playerId]: makePlayer(playerId, hostName, startingLife(format)),
    },
    actionLog: [],
  };

  await storage.saveGame(room);
  return { room, playerId };
}

export async function joinGame(
  code: string,
  playerName: string,
): Promise<{ room: GameRoom; playerId: string }> {
  const room = await storage.loadGameByCode(code);
  if (!room) throw new Error('Game not found');
  if (room.status === 'finished') throw new Error('Game is already finished');

  const playerId = uuidv4();
  room.players[playerId] = makePlayer(playerId, playerName, startingLife(room.format));
  room.lastActivity = new Date().toISOString();

  await storage.saveGame(room);
  return { room, playerId };
}

// ── Deck import ──────────────────────────────────────────────────────────────

/** Resolve card names via Scryfall /cards/collection (up to 75 per call). */
async function resolveNames(
  entries: { name: string; count: number }[],
): Promise<Map<string, { scryfallId: string; imageUri: string | null }>> {
  const result = new Map<string, { scryfallId: string; imageUri: string | null }>();
  const unique = [...new Set(entries.map(e => e.name))];

  for (let i = 0; i < unique.length; i += 75) {
    const chunk = unique.slice(i, i + 75).map(name => ({ name }));
    try {
      const resp = await axios.post(`${SCRYFALL_API}/cards/collection`, { identifiers: chunk });
      for (const card of resp.data.data ?? []) {
        const imageUri =
          card.image_uris?.normal ??
          card.card_faces?.[0]?.image_uris?.normal ??
          null;
        result.set(card.name.toLowerCase(), { scryfallId: card.id, imageUri });
      }
    } catch { /* partial failure — cards not found get null imageUri */ }
    if (i + 75 < unique.length) await new Promise(r => setTimeout(r, 100));
  }
  return result;
}

export async function importDeck(
  roomId: string,
  playerId: string,
  deck: ParsedDeck,
  /** Pass pre-resolved cards (from sealed pool) to skip Scryfall lookup */
  resolvedCards?: Map<string, { scryfallId: string; imageUri: string | null }>,
): Promise<GameRoom> {
  const room = await storage.loadGame(roomId);
  if (!room) throw new Error('Game not found');

  const player = room.players[playerId];
  if (!player) throw new Error('Player not found');

  // resolve names via Scryfall unless provided
  const allEntries = [
    ...(deck.commander ? [{ name: deck.commander, count: 1 }] : []),
    ...deck.mainboard,
    ...deck.sideboard,
  ];
  const resolved = resolvedCards ?? await resolveNames(allEntries);

  // Clear existing cards owned by this player
  for (const [id, card] of Object.entries(room.cards)) {
    if (card.controller === playerId) delete room.cards[id];
  }
  player.handCardIds = [];
  player.libraryCardIds = [];
  player.graveyardCardIds = [];
  player.exileCardIds = [];
  player.commandZoneCardIds = [];
  player.sideboardCardIds = [];

  function makeInstance(
    name: string,
    zone: BattlefieldCard['zone'],
    isCommander = false,
  ): string {
    const instanceId = uuidv4();
    const info = resolved.get(name.toLowerCase()) ?? { scryfallId: 'unknown', imageUri: null };
    const card: BattlefieldCard = {
      instanceId,
      scryfallId: info.scryfallId,
      name,
      imageUri: info.imageUri,
      zone,
      controller: playerId,
      x: 10 + Math.random() * 60,
      y: 10 + Math.random() * 60,
      tapped: false,
      faceDown: false,
      flipped: false,
      counters: [],
      isCommander,
    };
    room.cards[instanceId] = card;
    return instanceId;
  }

  // Commander → command_zone
  if (deck.commander) {
    const id = makeInstance(deck.commander, 'command_zone', true);
    player.commandZoneCardIds.push(id);
  }

  // Mainboard → library
  for (const entry of deck.mainboard) {
    for (let i = 0; i < entry.count; i++) {
      const id = makeInstance(entry.name, 'library');
      player.libraryCardIds.push(id);
    }
  }

  // Sideboard → sideboard zone
  for (const entry of deck.sideboard) {
    for (let i = 0; i < entry.count; i++) {
      const id = makeInstance(entry.name, 'sideboard');
      player.sideboardCardIds.push(id);
    }
  }

  // Shuffle library
  for (let i = player.libraryCardIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [player.libraryCardIds[i], player.libraryCardIds[j]] = [
      player.libraryCardIds[j]!,
      player.libraryCardIds[i]!,
    ];
  }

  room.status = 'active';
  room.lastActivity = new Date().toISOString();
  await storage.saveGame(room);
  return room;
}

// ── Sanitise for client ───────────────────────────────────────────────────────

/** Strip hand card details from other players before sending to a client. */
export function sanitiseForPlayer(room: GameRoom, viewerId: string): GameRoom {
  const sanitised: GameRoom = {
    ...room,
    cards: { ...room.cards },
    players: { ...room.players },
  };

  for (const [pid, player] of Object.entries(room.players)) {
    if (pid === viewerId) continue;
    for (const instanceId of player.handCardIds) {
      if (sanitised.cards[instanceId]) {
        sanitised.cards[instanceId] = {
          ...sanitised.cards[instanceId]!,
          scryfallId: 'hidden',
          imageUri: null,
          name: 'Hidden Card',
        };
      }
    }
  }
  return sanitised;
}

// ── Action log helper ─────────────────────────────────────────────────────────

export function appendLog(
  room: GameRoom,
  playerId: string,
  type: string,
  description: string,
): void {
  const action: GameAction = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    playerId,
    playerName: room.players[playerId]?.playerName ?? 'Unknown',
    type,
    description,
  };
  room.actionLog.push(action);
  if (room.actionLog.length > 50) room.actionLog.splice(0, room.actionLog.length - 50);
}
