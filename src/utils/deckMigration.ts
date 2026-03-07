/**
 * Deck schema versioning and migration.
 *
 * Every saved deck has a `version` field. When the schema evolves,
 * migration functions upgrade older versions to the latest shape.
 * Starting at version 1 — the infrastructure is here so future
 * changes don't break existing saved decks.
 */

import type { DeckRecord } from '../types/deck';

export const CURRENT_DECK_VERSION = 1;

// ── Type guard ───────────────────────────────────────────────────────────────

export function isDeckRecord(raw: unknown): raw is DeckRecord {
  if (typeof raw !== 'object' || raw === null) return false;
  const obj = raw as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.version === 'number' &&
    typeof obj.name === 'string' &&
    typeof obj.format === 'string' &&
    typeof obj.source === 'string' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string' &&
    Array.isArray(obj.commander) &&
    Array.isArray(obj.mainboard) &&
    Array.isArray(obj.sideboard)
  );
}

// ── Migration ────────────────────────────────────────────────────────────────

/**
 * Validate and migrate a raw JSON payload into a current-version DeckRecord.
 * Throws if the payload is unrecoverable.
 */
export function migrateDeck(raw: unknown): DeckRecord {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid deck file: not an object');
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.version !== 'number') {
    throw new Error('Invalid deck file: missing version');
  }

  // Apply migrations in sequence
  let data = obj;

  // Version 0 → 1 (hypothetical, for future reference pattern)
  // if (data.version === 0) {
  //   data = migrateV0ToV1(data);
  // }

  if (data.version !== CURRENT_DECK_VERSION) {
    throw new Error(
      `Unsupported deck version: ${data.version} (expected ${CURRENT_DECK_VERSION})`,
    );
  }

  // Ensure required fields exist with defaults
  const deck: DeckRecord = {
    id: asString(data.id, ''),
    version: CURRENT_DECK_VERSION,
    name: asString(data.name, 'Untitled Deck'),
    format: asString(data.format, 'free') as DeckRecord['format'],
    source: asString(data.source, 'file-import') as DeckRecord['source'],
    createdAt: asString(data.createdAt, new Date().toISOString()),
    updatedAt: asString(data.updatedAt, new Date().toISOString()),
    lastPlayedAt: data.lastPlayedAt != null ? asString(data.lastPlayedAt, null) : null,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    notes: asString(data.notes, ''),
    commander: asCardEntries(data.commander),
    mainboard: asCardEntries(data.mainboard),
    sideboard: asCardEntries(data.sideboard),
    maybeboard: asCardEntries(data.maybeboard),
    preferences: typeof data.preferences === 'object' && data.preferences !== null
      ? (data.preferences as DeckRecord['preferences'])
      : {},
  };

  if (!deck.id) {
    throw new Error('Invalid deck file: missing id');
  }

  return deck;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function asString(value: unknown, fallback: string): string;
function asString(value: unknown, fallback: null): string | null;
function asString(value: unknown, fallback: string | null): string | null {
  return typeof value === 'string' ? value : fallback;
}

function asCardEntries(raw: unknown): DeckRecord['mainboard'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (e): e is { cardName: string; count: number } =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as Record<string, unknown>).cardName === 'string' &&
        typeof (e as Record<string, unknown>).count === 'number',
    )
    .map(e => ({
      cardName: e.cardName,
      count: e.count,
      ...(e.preferredPrinting ? { preferredPrinting: e.preferredPrinting } : {}),
      ...(e.notes ? { notes: e.notes } : {}),
      ...(e.role ? { role: e.role } : {}),
    }));
}
