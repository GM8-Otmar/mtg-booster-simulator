import { describe, it, expect } from 'vitest';
import { applyDelta, appendLog, reZonePlayer } from './gameDelta';
import type { GameRoom, BattlefieldCard, GamePlayerState, GameAction } from '../types/game';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCard(overrides: Partial<BattlefieldCard> = {}): BattlefieldCard {
  return {
    instanceId: 'card-1',
    scryfallId: 'scry-1',
    name: 'Lightning Bolt',
    imageUri: null,
    zone: 'library',
    controller: 'player-1',
    x: 50,
    y: 50,
    tapped: false,
    faceDown: false,
    flipped: false,
    counters: [],
    isCommander: false,
    ...overrides,
  };
}

function makePlayer(overrides: Partial<GamePlayerState> = {}): GamePlayerState {
  return {
    playerId: 'player-1',
    playerName: 'Alice',
    life: 40,
    poisonCounters: 0,
    commanderTax: 0,
    commanderDamageReceived: {},
    handCardIds: [],
    libraryCardIds: ['card-1', 'card-2', 'card-3'],
    graveyardCardIds: [],
    exileCardIds: [],
    commandZoneCardIds: [],
    sideboardCardIds: [],
    ...overrides,
  };
}

function makeRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  const card = makeCard();
  const player = makePlayer();
  return {
    id: 'room-1',
    code: 'ABC123',
    hostId: 'player-1',
    format: 'commander',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    lastActivity: '2024-01-01T00:00:00.000Z',
    cards: { [card.instanceId]: card },
    players: { [player.playerId]: player },
    actionLog: [],
    turnOrder: ['player-1'],
    activePlayerIndex: 0,
    ...overrides,
  };
}

function makeLog(overrides: Partial<GameAction> = {}): GameAction {
  return {
    id: 'log-1',
    timestamp: '2024-01-01T00:00:00.000Z',
    playerId: 'player-1',
    playerName: 'Alice',
    type: 'test',
    description: 'test action',
    ...overrides,
  };
}

// ─── applyDelta ───────────────────────────────────────────────────────────────

describe('applyDelta', () => {

  describe('card_moved / card_moving', () => {
    it('updates x and y position', () => {
      const room = makeRoom();
      const result = applyDelta(room, { type: 'card_moved', instanceId: 'card-1', x: 75, y: 25 }, null);
      expect(result.cards['card-1']!.x).toBe(75);
      expect(result.cards['card-1']!.y).toBe(25);
    });

    it('does not mutate the original room', () => {
      const room = makeRoom();
      const origX = room.cards['card-1']!.x;
      applyDelta(room, { type: 'card_moved', instanceId: 'card-1', x: 99, y: 99 }, null);
      expect(room.cards['card-1']!.x).toBe(origX);
    });

    it('returns room unchanged for unknown instanceId', () => {
      const room = makeRoom();
      const result = applyDelta(room, { type: 'card_moved', instanceId: 'nope', x: 10, y: 10 }, null);
      expect(result).toBe(room);
    });

    it('card_moving also updates position (relay event)', () => {
      const room = makeRoom();
      const result = applyDelta(room, { type: 'card_moving', instanceId: 'card-1', x: 30, y: 70 }, null);
      expect(result.cards['card-1']!.x).toBe(30);
    });
  });

  describe('card_tapped', () => {
    it('taps an untapped card', () => {
      const room = makeRoom();
      const result = applyDelta(room, { type: 'card_tapped', instanceId: 'card-1', tapped: true }, null);
      expect(result.cards['card-1']!.tapped).toBe(true);
    });

    it('untaps a tapped card', () => {
      const room = makeRoom({ cards: { 'card-1': makeCard({ tapped: true }) } });
      const result = applyDelta(room, { type: 'card_tapped', instanceId: 'card-1', tapped: false }, null);
      expect(result.cards['card-1']!.tapped).toBe(false);
    });
  });

  describe('cards_tap_all', () => {
    it('taps multiple cards at once', () => {
      const c1 = makeCard({ instanceId: 'c1', zone: 'battlefield' });
      const c2 = makeCard({ instanceId: 'c2', zone: 'battlefield' });
      const room = makeRoom({ cards: { c1, c2 } });

      const result = applyDelta(room, {
        type: 'cards_tap_all',
        changed: ['c1', 'c2'],
        tapped: true,
      }, null);

      expect(result.cards['c1']!.tapped).toBe(true);
      expect(result.cards['c2']!.tapped).toBe(true);
    });

    it('ignores instanceIds not in room', () => {
      const room = makeRoom();
      expect(() => applyDelta(room, { type: 'cards_tap_all', changed: ['nope'], tapped: true }, null))
        .not.toThrow();
    });
  });

  describe('card_facedown', () => {
    it('sets faceDown true', () => {
      const room = makeRoom();
      const result = applyDelta(room, { type: 'card_facedown', instanceId: 'card-1', faceDown: true }, null);
      expect(result.cards['card-1']!.faceDown).toBe(true);
    });
  });

  describe('counters_changed', () => {
    it('replaces the counters array', () => {
      const room = makeRoom();
      const newCounters = [{ type: 'plus1plus1' as const, value: 3 }];
      const result = applyDelta(room, { type: 'counters_changed', instanceId: 'card-1', counters: newCounters }, null);
      expect(result.cards['card-1']!.counters).toEqual(newCounters);
    });
  });

  describe('zone_changed', () => {
    it('moves card from library to hand and updates zone arrays', () => {
      const room = makeRoom({
        cards: { 'card-1': makeCard({ zone: 'library' }) },
        players: { 'player-1': makePlayer({ libraryCardIds: ['card-1'] }) },
      });

      const result = applyDelta(room, {
        type: 'zone_changed',
        instanceId: 'card-1',
        toZone: 'hand',
        log: makeLog({ description: 'moved to hand' }),
      }, null);

      expect(result.cards['card-1']!.zone).toBe('hand');
      expect(result.players['player-1']!.handCardIds).toContain('card-1');
      expect(result.players['player-1']!.libraryCardIds).not.toContain('card-1');
    });

    it('moves card from hand to graveyard', () => {
      const room = makeRoom({
        cards: { 'card-1': makeCard({ zone: 'hand' }) },
        players: { 'player-1': makePlayer({ handCardIds: ['card-1'], libraryCardIds: [] }) },
      });

      const result = applyDelta(room, {
        type: 'zone_changed', instanceId: 'card-1', toZone: 'graveyard', log: undefined,
      }, null);

      expect(result.cards['card-1']!.zone).toBe('graveyard');
      expect(result.players['player-1']!.graveyardCardIds).toContain('card-1');
      expect(result.players['player-1']!.handCardIds).not.toContain('card-1');
    });

    it('from battlefield (no zone array) to graveyard', () => {
      const room = makeRoom({
        cards: { 'card-1': makeCard({ zone: 'battlefield' }) },
        players: { 'player-1': makePlayer({ libraryCardIds: [] }) },
      });

      const result = applyDelta(room, {
        type: 'zone_changed', instanceId: 'card-1', toZone: 'graveyard', log: undefined,
      }, null);

      expect(result.cards['card-1']!.zone).toBe('graveyard');
      expect(result.players['player-1']!.graveyardCardIds).toContain('card-1');
    });

    it('appends log entry', () => {
      const room = makeRoom({
        cards: { 'card-1': makeCard({ zone: 'library' }) },
        players: { 'player-1': makePlayer({ libraryCardIds: ['card-1'] }) },
      });
      const log = makeLog({ description: 'Alice moved Lightning Bolt to graveyard' });
      const result = applyDelta(room, { type: 'zone_changed', instanceId: 'card-1', toZone: 'graveyard', log }, null);
      expect(result.actionLog[0]).toEqual(log);
    });
  });

  describe('life_changed', () => {
    it('updates life total', () => {
      const room = makeRoom();
      const result = applyDelta(room, { type: 'life_changed', playerId: 'player-1', life: 35 }, null);
      expect(result.players['player-1']!.life).toBe(35);
    });

    it('returns room unchanged for unknown player', () => {
      const room = makeRoom();
      const result = applyDelta(room, { type: 'life_changed', playerId: 'ghost', life: 10 }, null);
      expect(result).toBe(room);
    });
  });

  describe('poison_changed', () => {
    it('updates poison counter count', () => {
      const room = makeRoom();
      const result = applyDelta(room, { type: 'poison_changed', playerId: 'player-1', poisonCounters: 3 }, null);
      expect(result.players['player-1']!.poisonCounters).toBe(3);
    });
  });

  describe('commander_damage', () => {
    it('records commander damage and updates life', () => {
      const room = makeRoom();
      const result = applyDelta(room, {
        type: 'commander_damage',
        victimId: 'player-1',
        commanderInstanceId: 'cmd-1',
        damage: 7,
        life: 33,
      }, null);

      expect(result.players['player-1']!.commanderDamageReceived['cmd-1']).toBe(7);
      expect(result.players['player-1']!.life).toBe(33);
    });
  });

  describe('commander_cast', () => {
    it('increments commanderTax', () => {
      const room = makeRoom();
      const result = applyDelta(room, {
        type: 'commander_cast', playerId: 'player-1', commanderTax: 2, log: makeLog(),
      }, null);
      expect(result.players['player-1']!.commanderTax).toBe(2);
    });
  });

  describe('cards_drawn', () => {
    it('adds drawn cards to my hand and removes from library', () => {
      const card1 = makeCard({ instanceId: 'card-1', zone: 'library' });
      const room = makeRoom({
        cards: { 'card-1': card1 },
        players: { 'player-1': makePlayer({ handCardIds: [], libraryCardIds: ['card-1', 'card-2'] }) },
      });

      const result = applyDelta(room, {
        type: 'cards_drawn',
        drawn: [card1],
        log: makeLog(),
      }, 'player-1');

      expect(result.players['player-1']!.handCardIds).toContain('card-1');
      expect(result.players['player-1']!.libraryCardIds).not.toContain('card-1');
      expect(result.cards['card-1']!.zone).toBe('hand');
    });

    it('ignores delta if myPlayerId is null (wrong recipient)', () => {
      const room = makeRoom();
      const result = applyDelta(room, { type: 'cards_drawn', drawn: [], log: undefined }, null);
      expect(result).toBe(room);
    });
  });

  describe('cards_drawn_other', () => {
    it('trims library count for another player', () => {
      const room = makeRoom({
        players: { 'player-1': makePlayer({ libraryCardIds: ['a', 'b', 'c'] }) },
      });

      const result = applyDelta(room, {
        type: 'cards_drawn_other',
        playerId: 'player-1',
        count: 2,
        libraryCount: 1,
        log: undefined,
      }, 'player-2');

      expect(result.players['player-1']!.libraryCardIds).toHaveLength(1);
      expect(result.players['player-1']!.libraryCardIds[0]).toBe('c');
    });
  });

  describe('token_created', () => {
    it('adds token card to the room', () => {
      const room = makeRoom();
      const token = makeCard({ instanceId: 'token-1', name: '1/1 Goblin', scryfallId: 'token', zone: 'battlefield' });

      const result = applyDelta(room, { type: 'token_created', card: token, log: makeLog() }, null);
      expect(result.cards['token-1']).toBeDefined();
      expect(result.cards['token-1']!.name).toBe('1/1 Goblin');
    });
  });

  describe('mulligan', () => {
    it('clears old hand, adds new cards', () => {
      const oldCard = makeCard({ instanceId: 'old-1', zone: 'hand' });
      const newCard = makeCard({ instanceId: 'new-1', zone: 'library' });
      const room = makeRoom({
        cards: { 'old-1': oldCard, 'new-1': newCard },
        players: {
          'player-1': makePlayer({
            handCardIds: ['old-1'],
            libraryCardIds: ['new-1'],
          }),
        },
      });

      const result = applyDelta(room, {
        type: 'mulligan',
        drawn: [newCard],
        keepCount: 6,
        log: makeLog(),
      }, 'player-1');

      expect(result.players['player-1']!.handCardIds).toContain('new-1');
      expect(result.players['player-1']!.handCardIds).not.toContain('old-1');
      expect(result.cards['old-1']!.zone).toBe('library');
      expect(result.cards['new-1']!.zone).toBe('hand');
    });
  });

  describe('unknown delta type', () => {
    it('returns room unchanged for unrecognised delta', () => {
      const room = makeRoom();
      const result = applyDelta(room, { type: 'something_weird', data: 42 }, null);
      expect(result).toBe(room);
    });
  });

});

// ─── appendLog ────────────────────────────────────────────────────────────────

describe('appendLog', () => {
  it('appends a new entry', () => {
    const log: GameAction[] = [];
    const entry = makeLog({ id: 'entry-1' });
    const result = appendLog(log, entry);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(entry);
  });

  it('returns existing log unchanged when entry is undefined', () => {
    const log: GameAction[] = [makeLog()];
    const result = appendLog(log, undefined);
    expect(result).toEqual(log);
  });

  it('caps log at 50 entries', () => {
    const log: GameAction[] = Array.from({ length: 50 }, (_, i) =>
      makeLog({ id: `log-${i}` }),
    );
    const extra = makeLog({ id: 'extra' });
    const result = appendLog(log, extra);
    expect(result).toHaveLength(50);
    expect(result[49]).toEqual(extra);
    // First entry should be gone
    expect(result.find(e => e.id === 'log-0')).toBeUndefined();
  });

  it('does not mutate the original array', () => {
    const log: GameAction[] = [makeLog({ id: 'orig' })];
    appendLog(log, makeLog({ id: 'new' }));
    expect(log).toHaveLength(1);
  });
});

// ─── reZonePlayer ────────────────────────────────────────────────────────────

describe('reZonePlayer', () => {
  it('moves instanceId from library to hand', () => {
    const players = { 'player-1': makePlayer({ handCardIds: [], libraryCardIds: ['card-1'] }) };
    const result = reZonePlayer(players, 'player-1', 'card-1', 'library', 'hand');
    expect(result['player-1']!.handCardIds).toContain('card-1');
    expect(result['player-1']!.libraryCardIds).not.toContain('card-1');
  });

  it('handles from-battlefield (no array) cleanly', () => {
    const players = { 'player-1': makePlayer({ libraryCardIds: [] }) };
    const result = reZonePlayer(players, 'player-1', 'card-1', 'battlefield', 'graveyard');
    expect(result['player-1']!.graveyardCardIds).toContain('card-1');
  });

  it('returns unchanged players if controller not found', () => {
    const players = { 'player-1': makePlayer() };
    const result = reZonePlayer(players, 'ghost', 'card-1', 'library', 'hand');
    expect(result).toBe(players);
  });

  it('does not mutate original players object', () => {
    const players = { 'player-1': makePlayer({ handCardIds: [], libraryCardIds: ['card-1'] }) };
    const origHand = players['player-1']!.handCardIds;
    reZonePlayer(players, 'player-1', 'card-1', 'library', 'hand');
    expect(players['player-1']!.handCardIds).toBe(origHand);
  });
});
