import { describe, it, expect } from 'vitest';
import { isDeckRecord, migrateDeck, CURRENT_DECK_VERSION } from './deckMigration';
import { createEmptyDeck, addCardToSection, setCommander } from './deckRecord';

// ── isDeckRecord ─────────────────────────────────────────────────────────────

describe('isDeckRecord', () => {
  it('returns true for a valid deck', () => {
    const deck = createEmptyDeck();
    expect(isDeckRecord(deck)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isDeckRecord(null)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isDeckRecord('not a deck')).toBe(false);
  });

  it('returns false for an object missing required fields', () => {
    expect(isDeckRecord({ id: 'abc' })).toBe(false);
  });

  it('returns false for an object with wrong types', () => {
    expect(
      isDeckRecord({
        id: 123, // should be string
        version: 1,
        name: 'test',
        format: 'free',
        source: 'manual',
        createdAt: 'now',
        updatedAt: 'now',
        commander: [],
        mainboard: [],
        sideboard: [],
      }),
    ).toBe(false);
  });
});

// ── migrateDeck ──────────────────────────────────────────────────────────────

describe('migrateDeck', () => {
  it('accepts a valid v1 deck JSON', () => {
    const deck = createEmptyDeck({ name: 'Test' });
    deck.mainboard = [{ cardName: 'Sol Ring', count: 1 }];
    const raw = JSON.parse(JSON.stringify(deck));

    const result = migrateDeck(raw);
    expect(result.name).toBe('Test');
    expect(result.mainboard[0]!.cardName).toBe('Sol Ring');
    expect(result.version).toBe(CURRENT_DECK_VERSION);
  });

  it('applies defaults for missing optional fields', () => {
    const raw = {
      id: 'abc-123',
      version: 1,
      name: 'Minimal',
      format: 'free',
      source: 'manual',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      commander: [],
      mainboard: [{ cardName: 'Sol Ring', count: 1 }],
      sideboard: [],
      // missing: maybeboard, tags, notes, preferences, lastPlayedAt
    };

    const result = migrateDeck(raw);
    expect(result.maybeboard).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.notes).toBe('');
    expect(result.preferences).toEqual({});
    expect(result.lastPlayedAt).toBeNull();
  });

  it('throws for non-object input', () => {
    expect(() => migrateDeck('string')).toThrow('not an object');
    expect(() => migrateDeck(null)).toThrow('not an object');
    expect(() => migrateDeck(42)).toThrow('not an object');
  });

  it('throws for missing version', () => {
    expect(() => migrateDeck({ id: 'x' })).toThrow('missing version');
  });

  it('throws for unsupported version', () => {
    expect(() => migrateDeck({ version: 99 })).toThrow('Unsupported deck version');
  });

  it('throws for missing id', () => {
    expect(() =>
      migrateDeck({
        version: 1,
        name: 'Test',
        format: 'free',
        source: 'manual',
        createdAt: 'now',
        updatedAt: 'now',
        commander: [],
        mainboard: [],
        sideboard: [],
      }),
    ).toThrow('missing id');
  });

  it('filters out invalid card entries', () => {
    const raw = {
      id: 'abc',
      version: 1,
      name: 'Test',
      format: 'free',
      source: 'manual',
      createdAt: 'now',
      updatedAt: 'now',
      commander: [],
      mainboard: [
        { cardName: 'Sol Ring', count: 1 },
        { bad: 'entry' },
        { cardName: 123, count: 'nope' },
      ],
      sideboard: [],
    };

    const result = migrateDeck(raw);
    expect(result.mainboard).toHaveLength(1);
    expect(result.mainboard[0]!.cardName).toBe('Sol Ring');
  });

  it('preserves preferredPrinting on card entries', () => {
    const printing = {
      scryfallId: 'abc',
      set: 'cmr',
      setName: 'Commander Legends',
      collectorNumber: '1',
      imageUri: null,
    };

    const raw = {
      id: 'abc',
      version: 1,
      name: 'Test',
      format: 'free',
      source: 'manual',
      createdAt: 'now',
      updatedAt: 'now',
      commander: [],
      mainboard: [
        { cardName: 'Sol Ring', count: 1, preferredPrinting: printing },
      ],
      sideboard: [],
    };

    const result = migrateDeck(raw);
    expect(result.mainboard[0]!.preferredPrinting).toEqual(printing);
  });
});
