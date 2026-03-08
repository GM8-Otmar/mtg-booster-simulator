/**
 * Deck serialization — JSON ↔ DeckRecord conversion with migration.
 *
 * This module sits between raw file content and the domain model.
 * It handles parsing, validation, and schema migration on load,
 * and clean JSON serialization on save.
 */

import type { DeckRecord } from '../types/deck';
import { migrateDeck } from '../utils/deckMigration';

/**
 * Parse raw JSON text into a validated, migrated DeckRecord.
 * Throws if the content is invalid or unrecoverable.
 */
export function deserializeDeck(jsonText: string): DeckRecord {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    throw new Error('Invalid deck file: not valid JSON');
  }

  return migrateDeck(raw);
}

/**
 * Serialize a DeckRecord to formatted JSON text for storage.
 */
export function serializeDeck(deck: DeckRecord): string {
  return JSON.stringify(deck, null, 2);
}
