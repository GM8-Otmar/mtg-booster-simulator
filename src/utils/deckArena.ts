/**
 * Arena text <-> DeckRecord conversion.
 *
 * Reuses parseArenaFormat() from deckImport.ts without duplicating parsing logic.
 * This module bridges the legacy import path into the new deck domain model.
 */

import { parseArenaFormat } from './deckImport';
import { createEmptyDeck, addCardToSection, touchUpdatedAt } from './deckRecord';
import { getLatestCardPrinting } from '../services/deckCardSearch';
import type { ScryfallCard } from '../types/card';
import type { DeckCardEntry, DeckRecord, DeckFormat, DeckSource, PreferredPrinting } from '../types/deck';
import type { ImportedDeckCard, ImportedDeckPayload } from '../types/game';

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

/** Strip to only the fields the server needs (scryfallId, imageUri, back face). */
function stripPrinting(p: PreferredPrinting | null | undefined): ImportedDeckCard['preferredPrinting'] {
  if (!p) return null;
  return {
    scryfallId: p.scryfallId,
    imageUri: p.imageUri,
    backImageUri: p.backImageUri ?? null,
    backName: p.backName ?? null,
  };
}

export function deckRecordToImportPayload(deck: DeckRecord): ImportedDeckPayload {
  return {
    commander: deck.commander[0]
      ? {
          name: String(deck.commander[0].cardName ?? 'Unknown'),
          count: 1,
          preferredPrinting: stripPrinting(deck.commander[0].preferredPrinting),
        }
      : null,
    mainboard: deck.mainboard.map(entry => ({
      name: String(entry.cardName ?? 'Unknown'),
      count: entry.count,
      preferredPrinting: stripPrinting(entry.preferredPrinting),
    })),
    sideboard: deck.sideboard.map(entry => ({
      name: String(entry.cardName ?? 'Unknown'),
      count: entry.count,
      preferredPrinting: stripPrinting(entry.preferredPrinting),
    })),
  };
}

export async function deckRecordToSandboxImportPayload(
  deck: DeckRecord,
): Promise<ImportedDeckPayload> {
  const [commander, mainboard, sideboard] = await Promise.all([
    deck.commander[0] ? buildImportedEntry(deck.commander[0]) : Promise.resolve(null),
    Promise.all(deck.mainboard.map(buildImportedEntry)),
    Promise.all(deck.sideboard.map(buildImportedEntry)),
  ]);

  return {
    commander,
    mainboard,
    sideboard,
  };
}

async function buildImportedEntry(entry: DeckCardEntry): Promise<ImportedDeckCard> {
  const printing = entry.preferredPrinting ?? (await getFallbackPrinting(entry.cardName));
  return {
    name: String(entry.cardName ?? 'Unknown'),
    count: entry.count,
    preferredPrinting: printing ? stripPrinting(printing) : null,
  };
}

async function getFallbackPrinting(cardName: string): Promise<PreferredPrinting | null> {
  try {
    const card = await getLatestCardPrinting(cardName);
    return card ? toPreferredPrinting(card) : null;
  } catch {
    return null;
  }
}

function toPreferredPrinting(card: ScryfallCard): PreferredPrinting {
  return {
    scryfallId: card.id,
    set: card.set,
    setName: card.set_name,
    collectorNumber: card.collector_number,
    imageUri: card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null,
    backImageUri: card.card_faces?.[1]?.image_uris?.normal ?? null,
    backName: card.card_faces?.[1]?.name ?? null,
  };
}
