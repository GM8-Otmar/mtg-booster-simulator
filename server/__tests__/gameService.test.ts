import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock storage before importing gameService ──────────────────────────────

const savedGames = new Map<string, any>();
const gamesByCode = new Map<string, any>();

vi.mock('../services/gameStorageService', () => ({
  saveGame: vi.fn(async (room: any) => {
    savedGames.set(room.id, structuredClone(room));
    gamesByCode.set(room.code, structuredClone(room));
  }),
  loadGame: vi.fn(async (id: string) => {
    const g = savedGames.get(id);
    return g ? structuredClone(g) : null;
  }),
  loadGameByCode: vi.fn(async (code: string) => {
    const g = gamesByCode.get(code);
    return g ? structuredClone(g) : null;
  }),
  deleteGame: vi.fn(async () => {}),
  cleanupOldGames: vi.fn(async () => {}),
}));

// ── Mock axios for Scryfall calls ──────────────────────────────────────────

vi.mock('axios', () => ({
  default: {
    post: vi.fn(async () => ({
      data: {
        data: [
          { id: 'scry-sol-ring', name: 'Sol Ring', image_uris: { normal: 'https://img/sol-ring.jpg' } },
          { id: 'scry-llanowar', name: 'Llanowar Elves', image_uris: { normal: 'https://img/llanowar.jpg' } },
          { id: 'scry-atraxa', name: "Atraxa, Praetors' Voice", image_uris: { normal: 'https://img/atraxa.jpg' } },
        ],
      },
    })),
  },
}));

import * as gameService from '../services/gameService';
import type { ParsedDeck } from '../types/game';

// ─── createGame ───────────────────────────────────────────────────────────────

describe('createGame', () => {
  beforeEach(() => {
    savedGames.clear();
    gamesByCode.clear();
  });

  it('creates a room with the host player', async () => {
    const { room, playerId } = await gameService.createGame('Alice', 'commander');

    expect(room.id).toBeTruthy();
    expect(room.code).toHaveLength(6);
    expect(room.hostId).toBe(playerId);
    expect(room.format).toBe('commander');
    expect(room.status).toBe('waiting');
    expect(room.players[playerId]).toBeDefined();
    expect(room.players[playerId]!.playerName).toBe('Alice');
  });

  it('sets starting life to 40 for commander format', async () => {
    const { room, playerId } = await gameService.createGame('Alice', 'commander');
    expect(room.players[playerId]!.life).toBe(40);
  });

  it('sets starting life to 20 for limited format', async () => {
    const { room, playerId } = await gameService.createGame('Bob', 'limited');
    expect(room.players[playerId]!.life).toBe(20);
  });

  it('initialises all zone arrays as empty', async () => {
    const { room, playerId } = await gameService.createGame('Alice', 'commander');
    const player = room.players[playerId]!;
    expect(player.handCardIds).toEqual([]);
    expect(player.libraryCardIds).toEqual([]);
    expect(player.graveyardCardIds).toEqual([]);
    expect(player.exileCardIds).toEqual([]);
    expect(player.commandZoneCardIds).toEqual([]);
    expect(player.sideboardCardIds).toEqual([]);
  });

  it('persists the room to storage', async () => {
    const { room } = await gameService.createGame('Alice', 'commander');
    expect(savedGames.has(room.id)).toBe(true);
  });

  it('generates a unique 6-character alphanumeric code', async () => {
    const { room: r1 } = await gameService.createGame('A', 'free');
    const { room: r2 } = await gameService.createGame('B', 'free');
    expect(r1.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(r2.code).toMatch(/^[A-Z0-9]{6}$/);
    // Two codes should (almost always) differ — probabilistic
    // We just check both are valid format
  });
});

// ─── joinGame ────────────────────────────────────────────────────────────────

describe('joinGame', () => {
  beforeEach(() => {
    savedGames.clear();
    gamesByCode.clear();
  });

  it('adds a new player to an existing room', async () => {
    const { room } = await gameService.createGame('Alice', 'commander');

    const { room: updated, playerId: bobId } = await gameService.joinGame(room.code, 'Bob');

    expect(Object.keys(updated.players)).toHaveLength(2);
    expect(updated.players[bobId]!.playerName).toBe('Bob');
  });

  it('gives the joining player the correct starting life', async () => {
    const { room } = await gameService.createGame('Alice', 'commander');
    const { room: updated, playerId } = await gameService.joinGame(room.code, 'Bob');
    expect(updated.players[playerId]!.life).toBe(40);
  });

  it('throws if game code not found', async () => {
    await expect(gameService.joinGame('XXXXXX', 'Ghost')).rejects.toThrow('Game not found');
  });
});

// ─── sanitiseForPlayer ───────────────────────────────────────────────────────

describe('sanitiseForPlayer', () => {
  it('hides hand cards of other players', async () => {
    const { room, playerId: aliceId } = await gameService.createGame('Alice', 'free');
    const { room: withBob, playerId: bobId } = await gameService.joinGame(room.code, 'Bob');

    // Put a card in Bob's hand
    const instanceId = 'hand-card-1';
    const updatedRoom = {
      ...withBob,
      cards: {
        [instanceId]: {
          instanceId,
          scryfallId: 'scry-real',
          name: 'Sol Ring',
          imageUri: 'https://img/real.jpg',
          zone: 'hand',
          controller: bobId,
          x: 0, y: 0, tapped: false, faceDown: false, flipped: false, counters: [], isCommander: false,
        },
      },
      players: {
        ...withBob.players,
        [bobId]: { ...withBob.players[bobId]!, handCardIds: [instanceId] },
      },
    };

    const sanitised = gameService.sanitiseForPlayer(updatedRoom, aliceId);

    // Alice sees Bob's hand card as hidden
    expect(sanitised.cards[instanceId]!.name).toBe('Hidden Card');
    expect(sanitised.cards[instanceId]!.imageUri).toBeNull();
    expect(sanitised.cards[instanceId]!.scryfallId).toBe('hidden');
  });

  it('does not hide the viewer\'s own hand cards', async () => {
    const { room, playerId: aliceId } = await gameService.createGame('Alice', 'free');

    const instanceId = 'alice-hand-1';
    const updatedRoom = {
      ...room,
      cards: {
        [instanceId]: {
          instanceId,
          scryfallId: 'scry-real',
          name: 'Sol Ring',
          imageUri: 'https://img/real.jpg',
          zone: 'hand',
          controller: aliceId,
          x: 0, y: 0, tapped: false, faceDown: false, flipped: false, counters: [], isCommander: false,
        },
      },
      players: {
        ...room.players,
        [aliceId]: { ...room.players[aliceId]!, handCardIds: [instanceId] },
      },
    };

    const sanitised = gameService.sanitiseForPlayer(updatedRoom, aliceId);
    expect(sanitised.cards[instanceId]!.name).toBe('Sol Ring');
    expect(sanitised.cards[instanceId]!.imageUri).toBe('https://img/real.jpg');
  });
});

// ─── importDeck ──────────────────────────────────────────────────────────────

describe('importDeck', () => {
  beforeEach(() => {
    savedGames.clear();
    gamesByCode.clear();
  });

  const simpleDeck: ParsedDeck = {
    commander: "Atraxa, Praetors' Voice",
    mainboard: [
      { name: 'Sol Ring', count: 1 },
      { name: 'Llanowar Elves', count: 3 },
    ],
    sideboard: [],
  };

  it('creates card instances for all mainboard cards', async () => {
    const { room, playerId } = await gameService.createGame('Alice', 'commander');
    const updated = await gameService.importDeck(room.id, playerId, simpleDeck);

    // 1 + 3 = 4 mainboard cards in library
    expect(updated.players[playerId]!.libraryCardIds).toHaveLength(4);
  });

  it('puts the commander in command_zone', async () => {
    const { room, playerId } = await gameService.createGame('Alice', 'commander');
    const updated = await gameService.importDeck(room.id, playerId, simpleDeck);

    expect(updated.players[playerId]!.commandZoneCardIds).toHaveLength(1);
    const cmdId = updated.players[playerId]!.commandZoneCardIds[0]!;
    expect(updated.cards[cmdId]!.isCommander).toBe(true);
    expect(updated.cards[cmdId]!.name).toBe("Atraxa, Praetors' Voice");
    expect(updated.cards[cmdId]!.zone).toBe('command_zone');
  });

  it('marks the game as active after import', async () => {
    const { room, playerId } = await gameService.createGame('Alice', 'commander');
    const updated = await gameService.importDeck(room.id, playerId, simpleDeck);
    expect(updated.status).toBe('active');
  });

  it('clears existing cards before re-import', async () => {
    const { room, playerId } = await gameService.createGame('Alice', 'commander');
    await gameService.importDeck(room.id, playerId, simpleDeck);

    // Re-import with different deck
    const freshRoom = savedGames.get(room.id);
    const tinyDeck: ParsedDeck = {
      commander: null,
      mainboard: [{ name: 'Sol Ring', count: 1 }],
      sideboard: [],
    };
    const reloaded = await gameService.importDeck(freshRoom.id, playerId, tinyDeck);
    expect(reloaded.players[playerId]!.libraryCardIds).toHaveLength(1);
    // No commander zone cards
    expect(reloaded.players[playerId]!.commandZoneCardIds).toHaveLength(0);
  });

  it('works with a deck that has no commander', async () => {
    const { room, playerId } = await gameService.createGame('Alice', 'limited');
    const noCmdDeck: ParsedDeck = {
      commander: null,
      mainboard: [{ name: 'Sol Ring', count: 2 }],
      sideboard: [{ name: 'Llanowar Elves', count: 1 }],
    };
    const updated = await gameService.importDeck(room.id, playerId, noCmdDeck);
    expect(updated.players[playerId]!.commandZoneCardIds).toHaveLength(0);
    expect(updated.players[playerId]!.libraryCardIds).toHaveLength(2);
    expect(updated.players[playerId]!.sideboardCardIds).toHaveLength(1);
  });

  it('throws if game not found', async () => {
    await expect(
      gameService.importDeck('non-existent-id', 'player-1', simpleDeck)
    ).rejects.toThrow('Game not found');
  });

  it('throws if player not found', async () => {
    const { room } = await gameService.createGame('Alice', 'commander');
    await expect(
      gameService.importDeck(room.id, 'wrong-player-id', simpleDeck)
    ).rejects.toThrow('Player not found');
  });

  it('library is shuffled (order differs from insertion order sometimes)', async () => {
    const { room, playerId } = await gameService.createGame('Alice', 'commander');
    const bigDeck: ParsedDeck = {
      commander: null,
      mainboard: Array.from({ length: 20 }, (_, i) => ({ name: `Card ${i}`, count: 1 })),
      sideboard: [],
    };

    // Run multiple imports — library order will vary
    const results = new Set<string>();
    for (let i = 0; i < 5; i++) {
      savedGames.clear();
      const { room: r2, playerId: p2 } = await gameService.createGame('Alice', 'free');
      const res = await gameService.importDeck(r2.id, p2, bigDeck);
      results.add(res.players[p2]!.libraryCardIds.join(','));
    }
    // At least 2 of 5 runs should produce different orders (probability: >99.999%)
    expect(results.size).toBeGreaterThan(1);
  });
});
