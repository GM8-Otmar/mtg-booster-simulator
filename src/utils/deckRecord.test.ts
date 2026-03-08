import { describe, it, expect } from 'vitest';
import {
  createEmptyDeck,
  duplicateDeck,
  addCardToSection,
  removeCardFromSection,
  changeCardCount,
  moveCardBetweenSections,
  setCommander,
  addCommander,
  removeCommander,
  setPreferredPrinting,
  clearPreferredPrinting,
  renameDeck,
  setFormat,
  setNotes,
  getDeckCardCount,
  getDeckStats,
  getDeckSummary,
  DECK_SECTION_NAMES,
} from './deckRecord';
import type { PreferredPrinting } from '../types/deck';

// ── createEmptyDeck ──────────────────────────────────────────────────────────

describe('createEmptyDeck', () => {
  it('creates a deck with defaults', () => {
    const deck = createEmptyDeck();
    expect(deck.name).toBe('Untitled Deck');
    expect(deck.format).toBe('free');
    expect(deck.source).toBe('manual');
    expect(deck.version).toBe(1);
    expect(deck.commander).toEqual([]);
    expect(deck.mainboard).toEqual([]);
    expect(deck.sideboard).toEqual([]);
    expect(deck.maybeboard).toEqual([]);
    expect(deck.tags).toEqual([]);
    expect(deck.notes).toBe('');
    expect(deck.id).toBeTruthy();
    expect(deck.createdAt).toBeTruthy();
    expect(deck.updatedAt).toBeTruthy();
  });

  it('accepts custom name and format', () => {
    const deck = createEmptyDeck({ name: 'My Deck', format: 'commander' });
    expect(deck.name).toBe('My Deck');
    expect(deck.format).toBe('commander');
  });
});

// ── duplicateDeck ────────────────────────────────────────────────────────────

describe('duplicateDeck', () => {
  it('creates a copy with new id and name', () => {
    const original = createEmptyDeck({ name: 'Original' });
    const copy = duplicateDeck(original, 'Copy');
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe('Copy');
    expect(copy.format).toBe(original.format);
    expect(copy.lastPlayedAt).toBeNull();
  });

  it('deep copies card arrays', () => {
    let deck = createEmptyDeck();
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);
    const copy = duplicateDeck(deck, 'Copy');
    expect(copy.mainboard).toEqual(deck.mainboard);
    expect(copy.mainboard).not.toBe(deck.mainboard);
    expect(copy.mainboard[0]).not.toBe(deck.mainboard[0]);
  });
});

// ── addCardToSection ─────────────────────────────────────────────────────────

describe('addCardToSection', () => {
  it('adds a new card to mainboard', () => {
    const deck = createEmptyDeck();
    const result = addCardToSection(deck, 'mainboard', 'Lightning Bolt', 4);
    expect(result.mainboard).toHaveLength(1);
    expect(result.mainboard[0]).toEqual({ cardName: 'Lightning Bolt', count: 4 });
  });

  it('increments count for existing card (case-insensitive)', () => {
    let deck = createEmptyDeck();
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);
    const result = addCardToSection(deck, 'mainboard', 'sol ring', 1);
    expect(result.mainboard).toHaveLength(1);
    expect(result.mainboard[0]!.count).toBe(2);
  });

  it('defaults count to 1', () => {
    const deck = createEmptyDeck();
    const result = addCardToSection(deck, 'mainboard', 'Birds of Paradise');
    expect(result.mainboard[0]!.count).toBe(1);
  });

  it('does not mutate original deck', () => {
    const deck = createEmptyDeck();
    const result = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);
    expect(deck.mainboard).toHaveLength(0);
    expect(result.mainboard).toHaveLength(1);
  });
});

// ── removeCardFromSection ────────────────────────────────────────────────────

describe('removeCardFromSection', () => {
  it('decrements count', () => {
    let deck = createEmptyDeck();
    deck = addCardToSection(deck, 'mainboard', 'Lightning Bolt', 4);
    const result = removeCardFromSection(deck, 'mainboard', 'Lightning Bolt', 1);
    expect(result.mainboard[0]!.count).toBe(3);
  });

  it('removes entry when count reaches 0', () => {
    let deck = createEmptyDeck();
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);
    const result = removeCardFromSection(deck, 'mainboard', 'Sol Ring', 1);
    expect(result.mainboard).toHaveLength(0);
  });

  it('is case-insensitive', () => {
    let deck = createEmptyDeck();
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 2);
    const result = removeCardFromSection(deck, 'mainboard', 'sol ring', 1);
    expect(result.mainboard[0]!.count).toBe(1);
  });

  it('no-ops for non-existent card', () => {
    const deck = createEmptyDeck();
    const result = removeCardFromSection(deck, 'mainboard', 'Nonexistent');
    expect(result.mainboard).toHaveLength(0);
  });
});

// ── changeCardCount ──────────────────────────────────────────────────────────

describe('changeCardCount', () => {
  it('sets exact count', () => {
    let deck = createEmptyDeck();
    deck = addCardToSection(deck, 'mainboard', 'Lightning Bolt', 2);
    const result = changeCardCount(deck, 'mainboard', 'Lightning Bolt', 4);
    expect(result.mainboard[0]!.count).toBe(4);
  });

  it('removes card when count is 0', () => {
    let deck = createEmptyDeck();
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);
    const result = changeCardCount(deck, 'mainboard', 'Sol Ring', 0);
    expect(result.mainboard).toHaveLength(0);
  });

  it('adds card if not present', () => {
    const deck = createEmptyDeck();
    const result = changeCardCount(deck, 'sideboard', 'Swords to Plowshares', 2);
    expect(result.sideboard[0]).toEqual({ cardName: 'Swords to Plowshares', count: 2 });
  });
});

// ── moveCardBetweenSections ──────────────────────────────────────────────────

describe('moveCardBetweenSections', () => {
  it('moves card from mainboard to sideboard', () => {
    let deck = createEmptyDeck();
    deck = addCardToSection(deck, 'mainboard', 'Doom Blade', 2);
    const result = moveCardBetweenSections(deck, 'mainboard', 'sideboard', 'Doom Blade');
    expect(result.mainboard).toHaveLength(0);
    expect(result.sideboard).toHaveLength(1);
    expect(result.sideboard[0]!.count).toBe(2);
  });

  it('preserves preferred printing during move', () => {
    let deck = createEmptyDeck();
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);
    const printing: PreferredPrinting = {
      scryfallId: 'abc123',
      set: 'cmr',
      setName: 'Commander Legends',
      collectorNumber: '263',
      imageUri: 'https://example.com/sol-ring.jpg',
    };
    deck = setPreferredPrinting(deck, 'mainboard', 'Sol Ring', printing);
    const result = moveCardBetweenSections(deck, 'mainboard', 'sideboard', 'Sol Ring');
    expect(result.sideboard[0]!.preferredPrinting).toEqual(printing);
  });

  it('no-ops for non-existent card', () => {
    const deck = createEmptyDeck();
    const result = moveCardBetweenSections(deck, 'mainboard', 'sideboard', 'Nonexistent');
    expect(result.mainboard).toHaveLength(0);
    expect(result.sideboard).toHaveLength(0);
  });
});

// ── Commander helpers ────────────────────────────────────────────────────────

describe('setCommander', () => {
  it('sets a single commander', () => {
    const deck = createEmptyDeck();
    const result = setCommander(deck, "Atraxa, Praetors' Voice");
    expect(result.commander).toHaveLength(1);
    expect(result.commander[0]!.cardName).toBe("Atraxa, Praetors' Voice");
    expect(result.commander[0]!.count).toBe(1);
  });

  it('replaces existing commander', () => {
    let deck = createEmptyDeck();
    deck = setCommander(deck, 'Kenrith');
    const result = setCommander(deck, 'Golos');
    expect(result.commander).toHaveLength(1);
    expect(result.commander[0]!.cardName).toBe('Golos');
  });
});

describe('addCommander', () => {
  it('adds a partner commander', () => {
    let deck = createEmptyDeck();
    deck = setCommander(deck, 'Thrasios');
    const result = addCommander(deck, 'Tymna');
    expect(result.commander).toHaveLength(2);
  });

  it('does not duplicate existing commander', () => {
    let deck = createEmptyDeck();
    deck = setCommander(deck, 'Kenrith');
    const result = addCommander(deck, 'Kenrith');
    expect(result.commander).toHaveLength(1);
  });
});

describe('removeCommander', () => {
  it('removes a commander by name', () => {
    let deck = createEmptyDeck();
    deck = setCommander(deck, 'Thrasios');
    deck = addCommander(deck, 'Tymna');
    const result = removeCommander(deck, 'Thrasios');
    expect(result.commander).toHaveLength(1);
    expect(result.commander[0]!.cardName).toBe('Tymna');
  });
});

// ── Printing ─────────────────────────────────────────────────────────────────

describe('setPreferredPrinting / clearPreferredPrinting', () => {
  const printing: PreferredPrinting = {
    scryfallId: 'abc',
    set: 'cmr',
    setName: 'Commander Legends',
    collectorNumber: '1',
    imageUri: null,
  };

  it('sets and clears printing on a card', () => {
    let deck = createEmptyDeck();
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);

    const withPrinting = setPreferredPrinting(deck, 'mainboard', 'Sol Ring', printing);
    expect(withPrinting.mainboard[0]!.preferredPrinting).toEqual(printing);

    const cleared = clearPreferredPrinting(withPrinting, 'mainboard', 'Sol Ring');
    expect(cleared.mainboard[0]!.preferredPrinting).toBeUndefined();
  });
});

// ── Metadata ─────────────────────────────────────────────────────────────────

describe('metadata helpers', () => {
  it('renameDeck updates name', () => {
    const deck = createEmptyDeck({ name: 'Old' });
    const result = renameDeck(deck, 'New');
    expect(result.name).toBe('New');
  });

  it('setFormat updates format', () => {
    const deck = createEmptyDeck();
    const result = setFormat(deck, 'commander');
    expect(result.format).toBe('commander');
  });

  it('setNotes updates notes', () => {
    const deck = createEmptyDeck();
    const result = setNotes(deck, 'Tournament notes');
    expect(result.notes).toBe('Tournament notes');
  });
});

// ── Derived data ─────────────────────────────────────────────────────────────

describe('getDeckCardCount', () => {
  it('sums commander + mainboard + sideboard', () => {
    let deck = createEmptyDeck();
    deck = setCommander(deck, 'Kenrith');
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);
    deck = addCardToSection(deck, 'mainboard', 'Lightning Bolt', 4);
    deck = addCardToSection(deck, 'sideboard', 'Doom Blade', 2);
    expect(getDeckCardCount(deck)).toBe(8); // 1 + 1 + 4 + 2
  });

  it('does not count maybeboard', () => {
    let deck = createEmptyDeck();
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);
    deck = addCardToSection(deck, 'maybeboard', 'Maybe Card', 3);
    expect(getDeckCardCount(deck)).toBe(1);
  });
});

describe('getDeckStats', () => {
  it('returns section counts', () => {
    let deck = createEmptyDeck();
    deck = setCommander(deck, 'Kenrith');
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);
    deck = addCardToSection(deck, 'sideboard', 'Doom Blade', 2);
    deck = addCardToSection(deck, 'maybeboard', 'Maybe', 3);
    const stats = getDeckStats(deck);
    expect(stats.commanderCount).toBe(1);
    expect(stats.mainboardCount).toBe(1);
    expect(stats.sideboardCount).toBe(2);
    expect(stats.maybeboardCount).toBe(3);
    expect(stats.totalCards).toBe(4); // commander + main + side
  });
});

describe('getDeckSummary', () => {
  it('returns summary with commander names', () => {
    let deck = createEmptyDeck({ name: 'Test Deck', format: 'commander' });
    deck = setCommander(deck, 'Kenrith');
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);
    const summary = getDeckSummary(deck);
    expect(summary.name).toBe('Test Deck');
    expect(summary.format).toBe('commander');
    expect(summary.commanderNames).toEqual(['Kenrith']);
    expect(summary.cardCount).toBe(2);
  });
});

// ── Constants ────────────────────────────────────────────────────────────────

describe('DECK_SECTION_NAMES', () => {
  it('has all four sections', () => {
    expect(DECK_SECTION_NAMES).toEqual(['commander', 'mainboard', 'sideboard', 'maybeboard']);
  });
});
