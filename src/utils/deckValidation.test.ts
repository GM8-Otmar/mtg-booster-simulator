import { describe, it, expect } from 'vitest';
import { validateDeck } from './deckValidation';
import { createEmptyDeck, addCardToSection, setCommander, setFormat } from './deckRecord';

// ── Helper ───────────────────────────────────────────────────────────────────

function hasCode(issues: ReturnType<typeof validateDeck>, code: string): boolean {
  return issues.some(i => i.code === code);
}

// ── Universal rules ──────────────────────────────────────────────────────────

describe('universal validation', () => {
  it('warns on completely empty deck', () => {
    const deck = createEmptyDeck();
    const issues = validateDeck(deck);
    expect(hasCode(issues, 'empty-deck')).toBe(true);
  });

  it('warns on empty mainboard when commander exists', () => {
    let deck = createEmptyDeck({ format: 'commander' });
    deck = setCommander(deck, 'Kenrith');
    const issues = validateDeck(deck);
    expect(hasCode(issues, 'empty-mainboard')).toBe(true);
  });

  it('no empty-deck warning when cards exist', () => {
    let deck = createEmptyDeck();
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);
    const issues = validateDeck(deck);
    expect(hasCode(issues, 'empty-deck')).toBe(false);
  });
});

// ── Commander format ─────────────────────────────────────────────────────────

describe('commander validation', () => {
  it('warns when no commander in commander format', () => {
    let deck = createEmptyDeck({ format: 'commander' });
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);
    const issues = validateDeck(deck);
    expect(hasCode(issues, 'no-commander')).toBe(true);
  });

  it('warns on singleton violations', () => {
    let deck = createEmptyDeck({ format: 'commander' });
    deck = setCommander(deck, 'Kenrith');
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 2);
    const issues = validateDeck(deck);
    expect(hasCode(issues, 'singleton-violation')).toBe(true);
  });

  it('allows basic lands to have multiple copies', () => {
    let deck = createEmptyDeck({ format: 'commander' });
    deck = setCommander(deck, 'Kenrith');
    deck = addCardToSection(deck, 'mainboard', 'Forest', 10);
    const issues = validateDeck(deck);
    expect(hasCode(issues, 'singleton-violation')).toBe(false);
  });

  it('allows snow-covered basics', () => {
    let deck = createEmptyDeck({ format: 'commander' });
    deck = setCommander(deck, 'Kenrith');
    deck = addCardToSection(deck, 'mainboard', 'Snow-Covered Island', 5);
    const issues = validateDeck(deck);
    expect(hasCode(issues, 'singleton-violation')).toBe(false);
  });

  it('reports incorrect mainboard size', () => {
    let deck = createEmptyDeck({ format: 'commander' });
    deck = setCommander(deck, 'Kenrith');
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);
    const issues = validateDeck(deck);
    expect(hasCode(issues, 'commander-size')).toBe(true);
    const sizeIssue = issues.find(i => i.code === 'commander-size');
    expect(sizeIssue!.message).toContain('99');
  });

  it('warns on too many commanders', () => {
    let deck = createEmptyDeck({ format: 'commander' });
    deck = {
      ...deck,
      commander: [
        { cardName: 'A', count: 1 },
        { cardName: 'B', count: 1 },
        { cardName: 'C', count: 1 },
      ],
    };
    const issues = validateDeck(deck);
    expect(hasCode(issues, 'too-many-commanders')).toBe(true);
  });
});

// ── Constructed format ───────────────────────────────────────────────────────

describe('constructed validation', () => {
  it('warns when mainboard < 60 for standard', () => {
    let deck = createEmptyDeck({ format: 'standard' });
    deck = addCardToSection(deck, 'mainboard', 'Lightning Bolt', 4);
    const issues = validateDeck(deck);
    expect(hasCode(issues, 'constructed-size')).toBe(true);
  });

  it('no warning at 60 cards', () => {
    let deck = createEmptyDeck({ format: 'modern' });
    // Add 60 cards
    for (let i = 0; i < 15; i++) {
      deck = addCardToSection(deck, 'mainboard', `Card ${i}`, 4);
    }
    const issues = validateDeck(deck);
    expect(hasCode(issues, 'constructed-size')).toBe(false);
  });

  it('reports sideboard > 15', () => {
    let deck = createEmptyDeck({ format: 'standard' });
    deck = addCardToSection(deck, 'mainboard', 'X', 60);
    deck = addCardToSection(deck, 'sideboard', 'Y', 16);
    const issues = validateDeck(deck);
    expect(hasCode(issues, 'sideboard-size')).toBe(true);
  });
});

// ── Limited format ───────────────────────────────────────────────────────────

describe('limited validation', () => {
  it('warns when mainboard < 40', () => {
    let deck = createEmptyDeck({ format: 'limited' });
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);
    const issues = validateDeck(deck);
    expect(hasCode(issues, 'limited-size')).toBe(true);
  });

  it('no warning at 40 cards', () => {
    let deck = createEmptyDeck({ format: 'limited' });
    for (let i = 0; i < 40; i++) {
      deck = addCardToSection(deck, 'mainboard', `Card ${i}`, 1);
    }
    const issues = validateDeck(deck);
    expect(hasCode(issues, 'limited-size')).toBe(false);
  });
});

// ── Free format ──────────────────────────────────────────────────────────────

describe('free format validation', () => {
  it('has no format-specific issues', () => {
    let deck = createEmptyDeck({ format: 'free' });
    deck = addCardToSection(deck, 'mainboard', 'Sol Ring', 1);
    const issues = validateDeck(deck);
    // Only universal checks apply
    const formatCodes = ['no-commander', 'singleton-violation', 'commander-size', 'constructed-size', 'limited-size', 'sideboard-size'];
    expect(issues.every(i => !formatCodes.includes(i.code))).toBe(true);
  });
});
