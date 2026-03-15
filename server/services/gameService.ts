import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import type {
  GameRoom, GameFormat, GamePlayerState, BattlefieldCard,
  ParsedDeck, GameAction, ImportedDeckPayload, ImportedDeckCard,
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
    turnOrder: [playerId],
    activePlayerIndex: 0,
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

  // ── Rejoin: if a player with the same name already exists, return them ──
  const existingEntry = Object.entries(room.players).find(
    ([, p]) => p.playerName.toLowerCase() === playerName.toLowerCase(),
  );
  if (existingEntry) {
    const [existingId] = existingEntry;
    console.log(`[MTG-SERVER] joinGame — player "${playerName}" already exists (${existingId.slice(0, 8)}), rejoining`);
    room.lastActivity = new Date().toISOString();
    await storage.saveGame(room);
    return { room, playerId: existingId };
  }

  // ── New player ──
  const playerId = uuidv4();
  room.players[playerId] = makePlayer(playerId, playerName, startingLife(room.format));
  room.lastActivity = new Date().toISOString();

  // Rebuild and shuffle turn order with Fisher-Yates
  const newOrder = Object.keys(room.players);
  for (let i = newOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newOrder[i], newOrder[j]] = [newOrder[j]!, newOrder[i]!];
  }
  room.turnOrder = newOrder;
  room.activePlayerIndex = 0;

  await storage.saveGame(room);
  return { room, playerId };
}

// ── Deck import ──────────────────────────────────────────────────────────────

/** Resolved card info returned by resolveNames. */
interface ResolvedCard {
  scryfallId: string;
  imageUri: string | null;
  backImageUri?: string | null;
  backName?: string | null;
}

/** Sanitized deck card: name and count guaranteed safe for resolveNames/makeInstance. */
interface SanitizedDeckCard {
  name: string;
  count: number;
  preferredPrinting?: ImportedDeckCard['preferredPrinting'];
}

function isImportedDeckPayload(deck: ParsedDeck | ImportedDeckPayload): deck is ImportedDeckPayload {
  // typeof null === 'object' in JS, so we must exclude null explicitly
  return (deck.commander !== null && typeof deck.commander === 'object') ||
    (Array.isArray(deck.mainboard) && !!deck.mainboard[0] && 'preferredPrinting' in deck.mainboard[0]);
}

function sanitizeImportedEntry(entry: ImportedDeckCard | { name: string; count: number } | null | undefined): SanitizedDeckCard {
  const rawName = entry && typeof entry === 'object' && 'name' in entry ? entry.name : undefined;
  const name = typeof rawName === 'string' ? rawName.trim() || 'Unknown' : String(rawName ?? 'Unknown').trim() || 'Unknown';
  const count = entry && typeof entry.count === 'number' && Number.isInteger(entry.count) && entry.count > 0
    ? entry.count
    : 1;
  const preferredPrinting = entry && 'preferredPrinting' in entry && entry.preferredPrinting != null
    ? (typeof entry.preferredPrinting === 'object' && typeof (entry.preferredPrinting as any).scryfallId === 'string')
      ? {
          scryfallId: (entry.preferredPrinting as any).scryfallId,
          imageUri: (entry.preferredPrinting as any).imageUri ?? null,
          backImageUri: (entry.preferredPrinting as any).backImageUri ?? null,
          backName: (entry.preferredPrinting as any).backName ?? null,
        }
      : undefined
    : undefined;
  return { name, count, preferredPrinting };
}

function normalizeImportedDeck(deck: ParsedDeck | ImportedDeckPayload): {
  commander: SanitizedDeckCard | null;
  mainboard: SanitizedDeckCard[];
  sideboard: SanitizedDeckCard[];
} {
  if (isImportedDeckPayload(deck)) {
    return {
      commander: deck.commander ? sanitizeImportedEntry(deck.commander) : null,
      mainboard: (Array.isArray(deck.mainboard) ? deck.mainboard : []).map(sanitizeImportedEntry),
      sideboard: (Array.isArray(deck.sideboard) ? deck.sideboard : []).map(sanitizeImportedEntry),
    };
  }
  const mainboard = Array.isArray(deck.mainboard) ? deck.mainboard : [];
  const sideboard = Array.isArray(deck.sideboard) ? deck.sideboard : [];
  return {
    commander: deck.commander ? sanitizeImportedEntry({ name: String(deck.commander ?? 'Unknown'), count: 1 }) : null,
    mainboard: mainboard.map(e => sanitizeImportedEntry({ name: e?.name ?? 'Unknown', count: e?.count ?? 1 })),
    sideboard: sideboard.map(e => sanitizeImportedEntry({ name: e?.name ?? 'Unknown', count: e?.count ?? 1 })),
  };
}

/** Resolve card names via Scryfall /cards/collection (up to 75 per call). */
async function resolveNames(
  entries: SanitizedDeckCard[],
): Promise<Map<string, ResolvedCard>> {
  const result = new Map<string, ResolvedCard>();
  const unresolvedEntries = entries.filter(entry => !entry.preferredPrinting?.scryfallId);

  for (const entry of entries) {
    if (entry.preferredPrinting?.scryfallId) {
      const key = typeof entry.name === 'string' ? entry.name : String(entry.name ?? '').trim() || 'unknown';
      result.set(key.toLowerCase(), {
        scryfallId: entry.preferredPrinting.scryfallId,
        imageUri: entry.preferredPrinting.imageUri,
        backImageUri: entry.preferredPrinting.backImageUri ?? null,
        backName: entry.preferredPrinting.backName ?? null,
      });
    }
  }

  const unique = [...new Set(unresolvedEntries.map(e => e.name))];

  for (let i = 0; i < unique.length; i += 75) {
    const chunk = unique.slice(i, i + 75).map(name => ({ name }));
    try {
      const resp = await axios.post(`${SCRYFALL_API}/cards/collection`, { identifiers: chunk });
      for (const card of resp.data.data ?? []) {
        const scryfallImg = (id: string, face: 'front' | 'back') =>
          `https://cards.scryfall.io/normal/${face}/${id[0]}/${id[1]}/${id}.jpg`;
        const imageUri = card.id
          ? scryfallImg(card.id, 'front')
          : (card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null);
        const hasDFC = card.card_faces && card.card_faces.length >= 2;
        const backImageUri = hasDFC && card.id ? scryfallImg(card.id, 'back') : null;
        const backName = hasDFC ? (card.card_faces[1]?.name ?? null) : null;
        const resolved: ResolvedCard = { scryfallId: card.id, imageUri, backImageUri, backName };
        const cardName = String(card.name ?? '').trim() || 'unknown';
        result.set(cardName.toLowerCase(), resolved);
        if (hasDFC && card.card_faces[0]?.name) {
          result.set(String(card.card_faces[0].name).toLowerCase(), resolved);
        }
      }
    } catch (err) {
      console.warn('[resolveNames] Scryfall batch failed:', err instanceof Error ? err.message : err);
    }
    if (i + 75 < unique.length) await new Promise(r => setTimeout(r, 100));
  }
  return result;
}

export async function importDeck(
  roomId: string,
  playerId: string,
  deck: ParsedDeck | ImportedDeckPayload,
  /** Pass pre-resolved cards (from sealed pool) to skip Scryfall lookup */
  resolvedCards?: Map<string, ResolvedCard>,
): Promise<GameRoom> {
  const room = await storage.loadGame(roomId);
  if (!room) throw new Error('Game not found');

  const player = room.players[playerId];
  if (!player) throw new Error('Player not found');
  // Commander is optional — the user may import the 99 first, then add commander separately

  const normalizedDeck = normalizeImportedDeck(deck);

  const allEntries = [
    ...(normalizedDeck.commander ? [normalizedDeck.commander] : []),
    ...normalizedDeck.mainboard,
    ...normalizedDeck.sideboard,
  ];
  const resolved = resolvedCards ?? await resolveNames(allEntries);

  // Clear existing cards owned by this player and reset life
  for (const [id, card] of Object.entries(room.cards)) {
    if (card.controller === playerId) delete room.cards[id];
  }
  player.handCardIds = [];
  player.libraryCardIds = [];
  player.graveyardCardIds = [];
  player.exileCardIds = [];
  player.commandZoneCardIds = [];
  player.sideboardCardIds = [];
  player.life = startingLife(room.format);
  player.poisonCounters = 0;
  player.commanderTax = 0;
  player.commanderDamageReceived = {};

  function makeInstance(
    rawName: string | unknown,
    zone: BattlefieldCard['zone'],
    isCommander = false,
  ): string {
    const name = typeof rawName === 'string' ? rawName : String(rawName ?? 'unknown');
    const lookupKey = (typeof name === 'string' ? name : String(name ?? '')).toLowerCase();
    const instanceId = uuidv4();
    const info = resolved.get(lookupKey) ?? { scryfallId: 'unknown', imageUri: null };
    const card: BattlefieldCard = {
      instanceId,
      scryfallId: info.scryfallId,
      name,
      imageUri: info.imageUri,
      backImageUri: info.backImageUri ?? null,
      backName: info.backName ?? null,
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
    if (room) {
      room.cards[instanceId] = card;
    }
    return instanceId;
  }

  // Commander → command_zone
  if (normalizedDeck.commander) {
    const id = makeInstance(normalizedDeck.commander.name, 'command_zone', true);
    player.commandZoneCardIds.push(id);
  }

  // Mainboard → library
  for (const entry of normalizedDeck.mainboard) {
    for (let i = 0; i < entry.count; i++) {
      const id = makeInstance(entry.name, 'library');
      player.libraryCardIds.push(id);
    }
  }

  // Sideboard → sideboard zone
  for (const entry of normalizedDeck.sideboard) {
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

/** Import a single commander into the command zone (without clearing the rest of the deck). */
export async function importCommander(
  roomId: string,
  playerId: string,
  commanderName: string,
): Promise<GameRoom> {
  const room = await storage.loadGame(roomId);
  if (!room) throw new Error('Game not found');
  const player = room.players[playerId];
  if (!player) throw new Error('Player not found');

  // Remove any existing commanders from command zone
  for (const id of [...player.commandZoneCardIds]) {
    const card = room.cards[id];
    if (card?.isCommander) {
      delete room.cards[id];
      player.commandZoneCardIds = player.commandZoneCardIds.filter(cid => cid !== id);
    }
  }

  const safeCommanderName = typeof commanderName === 'string' ? commanderName : String(commanderName ?? 'Unknown');
  const resolved = await resolveNames([{ name: safeCommanderName, count: 1 }]);
  const info = resolved.get(safeCommanderName.toLowerCase()) ?? { scryfallId: 'unknown', imageUri: null };

  const instanceId = uuidv4();
  const card: BattlefieldCard = {
    instanceId,
    scryfallId: info.scryfallId,
    name: safeCommanderName,
    imageUri: info.imageUri,
    backImageUri: info.backImageUri ?? null,
    backName: info.backName ?? null,
    zone: 'command_zone',
    controller: playerId,
    x: 50,
    y: 50,
    tapped: false,
    faceDown: false,
    flipped: false,
    counters: [],
    isCommander: true,
  };
  room.cards[instanceId] = card;
  player.commandZoneCardIds.push(instanceId);

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
      const card = sanitised.cards[instanceId];
      if (card && !card.revealed) {
        sanitised.cards[instanceId] = {
          ...card,
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
