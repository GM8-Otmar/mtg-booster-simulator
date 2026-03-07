/**
 * Pure helper functions for creating and manipulating DeckRecords immutably.
 * Every builder action flows through these — no React, no side effects.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  DeckRecord,
  DeckCardEntry,
  DeckSection,
  DeckFormat,
  DeckSource,
  DeckSummary,
  DeckStats,
  PreferredPrinting,
} from '../types/deck';

// ── Constants ────────────────────────────────────────────────────────────────

export const DECK_SECTION_NAMES: DeckSection[] = [
  'commander',
  'mainboard',
  'sideboard',
  'maybeboard',
];

export const CURRENT_DECK_VERSION = 1;

// ── Factory ──────────────────────────────────────────────────────────────────

export function createEmptyDeck(opts?: {
  name?: string;
  format?: DeckFormat;
  source?: DeckSource;
}): DeckRecord {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    version: CURRENT_DECK_VERSION,
    name: opts?.name ?? 'Untitled Deck',
    format: opts?.format ?? 'free',
    source: opts?.source ?? 'manual',
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: null,
    tags: [],
    notes: '',
    commander: [],
    mainboard: [],
    sideboard: [],
    maybeboard: [],
    preferences: {},
  };
}

export function duplicateDeck(deck: DeckRecord, newName: string): DeckRecord {
  const now = new Date().toISOString();
  return {
    ...deck,
    id: uuidv4(),
    name: newName,
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: null,
    commander: deck.commander.map(e => ({ ...e })),
    mainboard: deck.mainboard.map(e => ({ ...e })),
    sideboard: deck.sideboard.map(e => ({ ...e })),
    maybeboard: deck.maybeboard.map(e => ({ ...e })),
    tags: [...deck.tags],
    preferences: { ...deck.preferences },
  };
}

// ── Section helpers ──────────────────────────────────────────────────────────

function updateSection(
  deck: DeckRecord,
  section: DeckSection,
  updater: (entries: DeckCardEntry[]) => DeckCardEntry[],
): DeckRecord {
  return touchUpdatedAt({
    ...deck,
    [section]: updater(deck[section]),
  });
}

function findEntry(entries: DeckCardEntry[], cardName: string): number {
  return entries.findIndex(
    e => e.cardName.toLowerCase() === cardName.toLowerCase(),
  );
}

// ── Card manipulation ────────────────────────────────────────────────────────

export function addCardToSection(
  deck: DeckRecord,
  section: DeckSection,
  cardName: string,
  count: number = 1,
): DeckRecord {
  return updateSection(deck, section, entries => {
    const idx = findEntry(entries, cardName);
    if (idx >= 0) {
      const updated = [...entries];
      updated[idx] = { ...updated[idx]!, count: updated[idx]!.count + count };
      return updated;
    }
    return [...entries, { cardName, count }];
  });
}

export function removeCardFromSection(
  deck: DeckRecord,
  section: DeckSection,
  cardName: string,
  count: number = 1,
): DeckRecord {
  return updateSection(deck, section, entries => {
    const idx = findEntry(entries, cardName);
    if (idx < 0) return entries;
    const entry = entries[idx]!;
    const newCount = entry.count - count;
    if (newCount <= 0) {
      return entries.filter((_, i) => i !== idx);
    }
    const updated = [...entries];
    updated[idx] = { ...entry, count: newCount };
    return updated;
  });
}

export function changeCardCount(
  deck: DeckRecord,
  section: DeckSection,
  cardName: string,
  newCount: number,
): DeckRecord {
  if (newCount <= 0) {
    return removeCardFromSection(deck, section, cardName, Infinity);
  }
  return updateSection(deck, section, entries => {
    const idx = findEntry(entries, cardName);
    if (idx < 0) return [...entries, { cardName, count: newCount }];
    const updated = [...entries];
    updated[idx] = { ...updated[idx]!, count: newCount };
    return updated;
  });
}

export function moveCardBetweenSections(
  deck: DeckRecord,
  fromSection: DeckSection,
  toSection: DeckSection,
  cardName: string,
): DeckRecord {
  const fromIdx = findEntry(deck[fromSection], cardName);
  if (fromIdx < 0) return deck;

  const entry = deck[fromSection][fromIdx]!;
  let result = removeCardFromSection(deck, fromSection, cardName, Infinity);
  result = addCardToSection(result, toSection, entry.cardName, entry.count);

  // Preserve preferred printing
  if (entry.preferredPrinting) {
    result = setPreferredPrinting(result, toSection, entry.cardName, entry.preferredPrinting);
  }

  return result;
}

export function setCommander(deck: DeckRecord, cardName: string): DeckRecord {
  const entry: DeckCardEntry = { cardName, count: 1 };
  return touchUpdatedAt({
    ...deck,
    commander: [entry],
  });
}

export function addCommander(deck: DeckRecord, cardName: string): DeckRecord {
  const existing = findEntry(deck.commander, cardName);
  if (existing >= 0) return deck;
  return touchUpdatedAt({
    ...deck,
    commander: [...deck.commander, { cardName, count: 1 }],
  });
}

export function removeCommander(deck: DeckRecord, cardName: string): DeckRecord {
  const idx = findEntry(deck.commander, cardName);
  if (idx < 0) return deck;
  return touchUpdatedAt({
    ...deck,
    commander: deck.commander.filter((_, i) => i !== idx),
  });
}

// ── Printing ─────────────────────────────────────────────────────────────────

export function setPreferredPrinting(
  deck: DeckRecord,
  section: DeckSection,
  cardName: string,
  printing: PreferredPrinting,
): DeckRecord {
  return updateSection(deck, section, entries => {
    const idx = findEntry(entries, cardName);
    if (idx < 0) return entries;
    const updated = [...entries];
    updated[idx] = { ...updated[idx]!, preferredPrinting: printing };
    return updated;
  });
}

export function clearPreferredPrinting(
  deck: DeckRecord,
  section: DeckSection,
  cardName: string,
): DeckRecord {
  return updateSection(deck, section, entries => {
    const idx = findEntry(entries, cardName);
    if (idx < 0) return entries;
    const updated = [...entries];
    const { preferredPrinting: _, ...rest } = updated[idx]!;
    updated[idx] = rest as DeckCardEntry;
    return updated;
  });
}

// ── Metadata ─────────────────────────────────────────────────────────────────

export function renameDeck(deck: DeckRecord, name: string): DeckRecord {
  return touchUpdatedAt({ ...deck, name });
}

export function setFormat(deck: DeckRecord, format: DeckFormat): DeckRecord {
  return touchUpdatedAt({ ...deck, format });
}

export function setNotes(deck: DeckRecord, notes: string): DeckRecord {
  return touchUpdatedAt({ ...deck, notes });
}

export function setTags(deck: DeckRecord, tags: string[]): DeckRecord {
  return touchUpdatedAt({ ...deck, tags: [...tags] });
}

export function touchUpdatedAt(deck: DeckRecord): DeckRecord {
  return { ...deck, updatedAt: new Date().toISOString() };
}

// ── Derived data ─────────────────────────────────────────────────────────────

function sectionCount(entries: DeckCardEntry[]): number {
  return entries.reduce((sum, e) => sum + e.count, 0);
}

export function getDeckCardCount(deck: DeckRecord): number {
  return (
    sectionCount(deck.commander) +
    sectionCount(deck.mainboard) +
    sectionCount(deck.sideboard)
  );
}

export function getDeckStats(deck: DeckRecord): DeckStats {
  return {
    totalCards: getDeckCardCount(deck),
    commanderCount: sectionCount(deck.commander),
    mainboardCount: sectionCount(deck.mainboard),
    sideboardCount: sectionCount(deck.sideboard),
    maybeboardCount: sectionCount(deck.maybeboard),
  };
}

export function getDeckSummary(deck: DeckRecord): DeckSummary {
  return {
    id: deck.id,
    name: deck.name,
    format: deck.format,
    source: deck.source,
    cardCount: getDeckCardCount(deck),
    commanderNames: deck.commander.map(e => e.cardName),
    updatedAt: deck.updatedAt,
    lastPlayedAt: deck.lastPlayedAt,
  };
}
