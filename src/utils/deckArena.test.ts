import { describe, it, expect } from 'vitest';
import {
  arenaTextToDeckRecord,
  deckRecordToArenaText,
  mergeArenaTextIntoDeck,
  deckRecordToParsedDeck,
} from './deckArena';
import { createEmptyDeck, addCardToSection, setCommander } from './deckRecord';

// ── arenaTextToDeckRecord ────────────────────────────────────────────────────

describe('arenaTextToDeckRecord', () => {
  it('converts a commander deck', () => {
    const text = `
Commander
1 Atraxa, Praetors' Voice

Deck
1 Sol Ring
3 Llanowar Elves

Sideboard
1 Swords to Plowshares
    `.trim();

    const deck = arenaTextToDeckRecord(text);
    expect(deck.commander).toHaveLength(1);
    expect(deck.commander[0]!.cardName).toBe("Atraxa, Praetors' Voice");
    expect(deck.commander[0]!.count).toBe(1);
    expect(deck.mainboard).toHaveLength(2);
    expect(deck.mainboard[0]).toEqual({ cardName: 'Sol Ring', count: 1 });
    expect(deck.mainboard[1]).toEqual({ cardName: 'Llanowar Elves', count: 3 });
    expect(deck.sideboard).toHaveLength(1);
    expect(deck.sideboard[0]).toEqual({ cardName: 'Swords to Plowshares', count: 1 });
    expect(deck.format).toBe('commander');
    expect(deck.source).toBe('arena-import');
    expect(deck.id).toBeTruthy();
    expect(deck.version).toBe(1);
  });

  it('infers format as free when no commander', () => {
    const text = `
Deck
4 Lightning Bolt
4 Monastery Swiftspear
    `.trim();

    const deck = arenaTextToDeckRecord(text);
    expect(deck.commander).toHaveLength(0);
    expect(deck.format).toBe('free');
  });

  it('accepts custom name and format', () => {
    const deck = arenaTextToDeckRecord('Deck\n4 Lightning Bolt', {
      name: 'Burn',
      format: 'modern',
    });
    expect(deck.name).toBe('Burn');
    expect(deck.format).toBe('modern');
  });

  it('handles empty input', () => {
    const deck = arenaTextToDeckRecord('');
    expect(deck.commander).toHaveLength(0);
    expect(deck.mainboard).toHaveLength(0);
    expect(deck.sideboard).toHaveLength(0);
  });

  it('infers commander from singleton sideboard (Arena Brawl export)', () => {
    const text = `
Deck
1 Sol Ring
1 Llanowar Elves

Sideboard
1 Kenrith, the Returned King
    `.trim();

    const deck = arenaTextToDeckRecord(text);
    expect(deck.commander[0]!.cardName).toBe('Kenrith, the Returned King');
    expect(deck.sideboard).toHaveLength(0);
    expect(deck.format).toBe('commander');
  });
});

// ── deckRecordToArenaText ────────────────────────────────────────────────────

describe('deckRecordToArenaText', () => {
  it('renders commander + mainboard + sideboard', () => {
    let deck = createEmptyDeck();
    deck = setCommander(deck, "Atraxa, Praetors' Voice");
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);
    deck = addCardToSection(deck, 'mainboard', 'Llanowar Elves', 3);
    deck = addCardToSection(deck, 'sideboard', 'Swords to Plowshares', 1);

    const text = deckRecordToArenaText(deck);
    const lines = text.split('\n');

    expect(lines[0]).toBe('Commander');
    expect(lines[1]).toBe("1 Atraxa, Praetors' Voice");
    expect(lines[2]).toBe('');
    expect(lines[3]).toBe('Deck');
    expect(lines[4]).toBe('1 Sol Ring');
    expect(lines[5]).toBe('3 Llanowar Elves');
    expect(lines[6]).toBe('');
    expect(lines[7]).toBe('Sideboard');
    expect(lines[8]).toBe('1 Swords to Plowshares');
  });

  it('omits empty sections', () => {
    let deck = createEmptyDeck();
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);
    const text = deckRecordToArenaText(deck);
    expect(text).not.toContain('Commander');
    expect(text).not.toContain('Sideboard');
    expect(text).toContain('Deck');
  });

  it('returns empty string for empty deck', () => {
    const deck = createEmptyDeck();
    const text = deckRecordToArenaText(deck);
    expect(text).toBe('');
  });
});

// ── Round-trip ───────────────────────────────────────────────────────────────

describe('round-trip Arena text ↔ DeckRecord', () => {
  it('preserves card data through conversion', () => {
    const original = `
Commander
1 Kenrith, the Returned King

Deck
1 Sol Ring
4 Lightning Bolt
2 Llanowar Elves

Sideboard
1 Swords to Plowshares
2 Doom Blade
    `.trim();

    const deck = arenaTextToDeckRecord(original);
    const exported = deckRecordToArenaText(deck);
    const reimported = arenaTextToDeckRecord(exported);

    expect(reimported.commander[0]!.cardName).toBe(deck.commander[0]!.cardName);
    expect(reimported.mainboard).toEqual(deck.mainboard);
    expect(reimported.sideboard).toEqual(deck.sideboard);
  });
});

// ── mergeArenaTextIntoDeck ───────────────────────────────────────────────────

describe('mergeArenaTextIntoDeck', () => {
  it('adds new cards to existing deck', () => {
    let deck = createEmptyDeck();
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);

    const text = `
Deck
4 Lightning Bolt
    `.trim();

    const result = mergeArenaTextIntoDeck(deck, text);
    expect(result.mainboard).toHaveLength(2);
    expect(result.mainboard.find(e => e.cardName === 'Sol Ring')!.count).toBe(1);
    expect(result.mainboard.find(e => e.cardName === 'Lightning Bolt')!.count).toBe(4);
  });

  it('increases count for existing cards', () => {
    let deck = createEmptyDeck();
    deck = addCardToSection(deck, 'mainboard', 'Lightning Bolt', 2);

    const result = mergeArenaTextIntoDeck(deck, 'Deck\n2 Lightning Bolt');
    expect(result.mainboard.find(e => e.cardName === 'Lightning Bolt')!.count).toBe(4);
  });

  it('does not override existing commander', () => {
    let deck = createEmptyDeck();
    deck = setCommander(deck, 'Kenrith');

    const text = `
Commander
1 Atraxa, Praetors' Voice

Deck
1 Sol Ring
    `.trim();

    const result = mergeArenaTextIntoDeck(deck, text);
    expect(result.commander[0]!.cardName).toBe('Kenrith');
  });

  it('adds commander if existing deck has none', () => {
    const deck = createEmptyDeck();
    const text = `
Commander
1 Kenrith, the Returned King

Deck
1 Sol Ring
    `.trim();

    const result = mergeArenaTextIntoDeck(deck, text);
    expect(result.commander[0]!.cardName).toBe('Kenrith, the Returned King');
  });
});

// ── deckRecordToParsedDeck ───────────────────────────────────────────────────

describe('deckRecordToParsedDeck', () => {
  it('converts to legacy ParsedDeck shape', () => {
    let deck = createEmptyDeck();
    deck = setCommander(deck, 'Kenrith');
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);
    deck = addCardToSection(deck, 'sideboard', 'Doom Blade', 2);

    const parsed = deckRecordToParsedDeck(deck);
    expect(parsed.commander).toBe('Kenrith');
    expect(parsed.mainboard).toEqual([{ name: 'Sol Ring', count: 1 }]);
    expect(parsed.sideboard).toEqual([{ name: 'Doom Blade', count: 2 }]);
  });

  it('returns null commander when none set', () => {
    const deck = createEmptyDeck();
    const parsed = deckRecordToParsedDeck(deck);
    expect(parsed.commander).toBeNull();
  });
});
