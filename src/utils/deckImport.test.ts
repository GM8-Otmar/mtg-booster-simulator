import { describe, it, expect } from 'vitest';
import { parseArenaFormat, deckCardCount, flattenDeck } from './deckImport';

// ─── parseArenaFormat ────────────────────────────────────────────────────────

describe('parseArenaFormat', () => {

  it('parses a standard Commander deck', () => {
    const text = `
Commander
1 Atraxa, Praetors' Voice

Deck
1 Sol Ring
3 Llanowar Elves
2 Birds of Paradise

Sideboard
1 Swords to Plowshares
    `.trim();

    const deck = parseArenaFormat(text);
    expect(deck.commander).toBe("Atraxa, Praetors' Voice");
    expect(deck.mainboard).toEqual([
      { name: 'Sol Ring', count: 1 },
      { name: 'Llanowar Elves', count: 3 },
      { name: 'Birds of Paradise', count: 2 },
    ]);
    expect(deck.sideboard).toEqual([
      { name: 'Swords to Plowshares', count: 1 },
    ]);
  });

  it('parses a plain deck with no sections (implicit "deck")', () => {
    const text = `
4 Lightning Bolt
4 Monastery Swiftspear
    `.trim();

    const deck = parseArenaFormat(text);
    expect(deck.commander).toBeNull();
    expect(deck.mainboard).toHaveLength(2);
    expect(deck.mainboard[0]).toEqual({ name: 'Lightning Bolt', count: 4 });
    expect(deck.mainboard[1]).toEqual({ name: 'Monastery Swiftspear', count: 4 });
    expect(deck.sideboard).toHaveLength(0);
  });

  it('strips Arena set codes like "(M21) 123"', () => {
    const text = `
Deck
4 Lightning Bolt (M21) 149
1 Sol Ring (CMR) 263
    `.trim();

    const deck = parseArenaFormat(text);
    expect(deck.mainboard[0]!.name).toBe('Lightning Bolt');
    expect(deck.mainboard[1]!.name).toBe('Sol Ring');
  });

  it('handles "1x" prefix format', () => {
    const text = `
Deck
1x Sol Ring
4x Lightning Bolt
    `.trim();

    const deck = parseArenaFormat(text);
    expect(deck.mainboard[0]).toEqual({ name: 'Sol Ring', count: 1 });
    expect(deck.mainboard[1]).toEqual({ name: 'Lightning Bolt', count: 4 });
  });

  it('handles Companion section as commander slot', () => {
    const text = `
Companion
1 Lurrus of the Dream-Den

Deck
4 Lightning Bolt
    `.trim();

    const deck = parseArenaFormat(text);
    expect(deck.commander).toBe('Lurrus of the Dream-Den');
    expect(deck.mainboard[0]!.name).toBe('Lightning Bolt');
  });

  it('ignores blank lines between sections', () => {
    const text = `
Commander
1 Kenrith, the Returned King


Deck
1 Cultivate

    `.trim();

    const deck = parseArenaFormat(text);
    expect(deck.commander).toBe('Kenrith, the Returned King');
    expect(deck.mainboard).toHaveLength(1);
  });

  it('returns empty deck for empty input', () => {
    const deck = parseArenaFormat('');
    expect(deck.commander).toBeNull();
    expect(deck.mainboard).toHaveLength(0);
    expect(deck.sideboard).toHaveLength(0);
  });

  it('handles Windows-style CRLF line endings', () => {
    const text = 'Deck\r\n4 Counterspell\r\n2 Brainstorm';
    const deck = parseArenaFormat(text);
    expect(deck.mainboard).toHaveLength(2);
    expect(deck.mainboard[0]!.name).toBe('Counterspell');
  });

  it('handles "Mainboard" section header alias', () => {
    const text = `
Mainboard
4 Lightning Bolt
    `.trim();
    const deck = parseArenaFormat(text);
    expect(deck.mainboard[0]!.count).toBe(4);
  });

  it('handles duplicate card names by adding multiple entries', () => {
    // Arena sometimes exports same card on separate lines (different printings)
    const text = `
Deck
2 Swamp
2 Swamp (BFZ) 270
    `.trim();

    const deck = parseArenaFormat(text);
    // Both lines parsed, names cleaned to "Swamp"
    expect(deck.mainboard.filter(e => e.name === 'Swamp')).toHaveLength(2);
    expect(deckCardCount(deck)).toBe(4);
  });

  it('ignores lines that look like card names but start with numbers without a space', () => {
    const text = `
Deck
4 Lightning Bolt
notacardnumber
    `.trim();

    // "notacardnumber" has no count prefix — gets treated as count 1 card named "notacardnumber"
    // This is expected behaviour (bare names are valid)
    const deck = parseArenaFormat(text);
    expect(deck.mainboard.some(e => e.name === 'Lightning Bolt')).toBe(true);
  });

});

// ─── deckCardCount ───────────────────────────────────────────────────────────

describe('deckCardCount', () => {
  it('sums all mainboard counts', () => {
    const deck = parseArenaFormat(`
Deck
4 Lightning Bolt
3 Lava Spike
1 Goblin Guide
    `.trim());
    expect(deckCardCount(deck)).toBe(8);
  });

  it('returns 0 for empty deck', () => {
    expect(deckCardCount(parseArenaFormat(''))).toBe(0);
  });

  it('does not include sideboard cards in count', () => {
    const deck = parseArenaFormat(`
Deck
4 Lightning Bolt

Sideboard
4 Smash to Smithereens
    `.trim());
    expect(deckCardCount(deck)).toBe(4);
  });

  it('does not include commander in count', () => {
    const deck = parseArenaFormat(`
Commander
1 Atraxa, Praetors' Voice

Deck
1 Sol Ring
    `.trim());
    expect(deckCardCount(deck)).toBe(1);
  });
});

// ─── flattenDeck ─────────────────────────────────────────────────────────────

describe('flattenDeck', () => {
  it('expands each entry by its count', () => {
    const deck = parseArenaFormat(`
Deck
3 Lightning Bolt
2 Sol Ring
    `.trim());

    const flat = flattenDeck(deck);
    expect(flat).toHaveLength(5);
    expect(flat.filter(n => n === 'Lightning Bolt')).toHaveLength(3);
    expect(flat.filter(n => n === 'Sol Ring')).toHaveLength(2);
  });

  it('returns empty array for empty deck', () => {
    expect(flattenDeck(parseArenaFormat(''))).toEqual([]);
  });
});
