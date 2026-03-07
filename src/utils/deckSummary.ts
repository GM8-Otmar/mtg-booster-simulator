/**
 * Deck summary computation — lightweight derived data for list views and stats panels.
 */

import type { DeckRecord, DeckSummary, DeckStats } from '../types/deck';

function sectionCount(entries: { count: number }[]): number {
  return entries.reduce((sum, e) => sum + e.count, 0);
}

/** Compute a lightweight summary for the deck list. */
export function computeDeckSummary(deck: DeckRecord): DeckSummary {
  const commanderCover = deck.commander[0]?.preferredPrinting?.imageUri ?? null;
  return {
    id: deck.id,
    name: deck.name,
    format: deck.format,
    source: deck.source,
    cardCount:
      sectionCount(deck.commander) +
      sectionCount(deck.mainboard) +
      sectionCount(deck.sideboard),
    commanderNames: deck.commander.map(e => e.cardName),
    coverImageUri: commanderCover,
    icon: deck.preferences.icon ?? null,
    updatedAt: deck.updatedAt,
    lastPlayedAt: deck.lastPlayedAt,
  };
}

/** Compute full section-level stats for the builder stats panel. */
export function computeDeckStats(deck: DeckRecord): DeckStats {
  return {
    totalCards:
      sectionCount(deck.commander) +
      sectionCount(deck.mainboard) +
      sectionCount(deck.sideboard),
    commanderCount: sectionCount(deck.commander),
    mainboardCount: sectionCount(deck.mainboard),
    sideboardCount: sectionCount(deck.sideboard),
    maybeboardCount: sectionCount(deck.maybeboard),
  };
}
