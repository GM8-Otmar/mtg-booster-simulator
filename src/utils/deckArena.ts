/**
 * Arena text <-> DeckRecord conversion.
 *
 * Reuses parseArenaFormat() from deckImport.ts without duplicating parsing logic.
 * This module bridges the legacy import path into the new deck domain model.
 */

import { parseArenaFormat } from './deckImport';
import { createEmptyDeck, addCardToSection, touchUpdatedAt } from './deckRecord';
import type { DeckRecord, DeckFormat, DeckSource } from '../types/deck';

// Arena text -> DeckRecord

export function arenaTextToDeckRecord(
  text: string,
  opts?: {
    name?: string;
    format?: DeckFormat;
    source?: DeckSource;
  },
): DeckRecord {
  const parsed = parseArenaFormat(text);

  const deck = createEmptyDeck({
    name: opts?.name ?? 'Imported Deck',
    format: opts?.format ?? (parsed.commander ? 'commander' : 'free'),
    source: opts?.source ?? 'arena-import',
  });

  if (parsed.commander) {
    deck.commander = [{ cardName: parsed.commander, count: 1 }];
  }

  deck.mainboard = parsed.mainboard.map(e => ({
    cardName: e.name,
    count: e.count,
  }));

  deck.sideboard = parsed.sideboard.map(e => ({
    cardName: e.name,
    count: e.count,
  }));

  return deck;
}

// DeckRecord -> Arena text

export function deckRecordToArenaText(deck: DeckRecord): string {
  const lines: string[] = [];

  if (deck.commander.length > 0) {
    lines.push('Commander');
    for (const entry of deck.commander) {
      lines.push(`${entry.count} ${entry.cardName}`);
    }
    lines.push('');
  }

  if (deck.mainboard.length > 0) {
    lines.push('Deck');
    for (const entry of deck.mainboard) {
      lines.push(`${entry.count} ${entry.cardName}`);
    }
  }

  if (deck.sideboard.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('Sideboard');
    for (const entry of deck.sideboard) {
      lines.push(`${entry.count} ${entry.cardName}`);
    }
  }

  return lines.join('\n');
}

// Merge Arena text into existing deck

export function mergeArenaTextIntoDeck(
  existing: DeckRecord,
  text: string,
): DeckRecord {
  const parsed = parseArenaFormat(text);
  let result = { ...existing };

  if (parsed.commander && existing.commander.length === 0) {
    result = {
      ...result,
      commander: [{ cardName: parsed.commander, count: 1 }],
    };
  }

  result = mergeEntries(result, 'mainboard', parsed.mainboard);
  result = mergeEntries(result, 'sideboard', parsed.sideboard);

  return touchUpdatedAt(result);
}

function mergeEntries(
  deck: DeckRecord,
  section: 'mainboard' | 'sideboard',
  incoming: { name: string; count: number }[],
): DeckRecord {
  let result = deck;
  for (const entry of incoming) {
    result = addCardToSection(result, section, entry.name, entry.count);
  }
  return result;
}

// DeckRecord -> ParsedDeck (for legacy game import)

/**
 * Convert a DeckRecord into the legacy ParsedDeck shape used by the game import API.
 * This keeps backwards compatibility with the existing server-side import path.
 */
export function deckRecordToParsedDeck(deck: DeckRecord): {
  commander: string | null;
  mainboard: { name: string; count: number }[];
  sideboard: { name: string; count: number }[];
} {
  return {
    commander: deck.commander[0]?.cardName ?? null,
    mainboard: deck.mainboard.map(e => ({ name: e.cardName, count: e.count })),
    sideboard: deck.sideboard.map(e => ({ name: e.cardName, count: e.count })),
  };
}
