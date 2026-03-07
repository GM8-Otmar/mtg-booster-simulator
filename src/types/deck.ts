/**
 * Deck domain types — the canonical model for saved decks.
 *
 * This is the single source of truth for deck shapes across the app.
 * Import/export, storage, builder, and play integration all target these types.
 */

// ── Format & source ──────────────────────────────────────────────────────────

export type DeckFormat =
  | 'commander'
  | 'standard'
  | 'modern'
  | 'legacy'
  | 'vintage'
  | 'pauper'
  | 'limited'
  | 'free';

export type DeckSource =
  | 'manual'
  | 'arena-import'
  | 'file-import'
  | 'sealed-export';

// ── Card entry ───────────────────────────────────────────────────────────────

export interface PreferredPrinting {
  scryfallId: string;
  set: string;
  setName: string;
  collectorNumber: string;
  imageUri: string | null;
  backImageUri?: string | null;
  backName?: string | null;
}

export interface DeckCardEntry {
  cardName: string;
  count: number;
  preferredPrinting?: PreferredPrinting | null;
  notes?: string;
  /** Used during import normalization (e.g. 'commander' role inferred from sideboard) */
  role?: string;
}

// ── Deck record ──────────────────────────────────────────────────────────────

export interface DeckPreferences {
  defaultFormat?: DeckFormat;
}

export interface DeckRecord {
  id: string;
  version: number;
  name: string;
  format: DeckFormat;
  source: DeckSource;
  createdAt: string;
  updatedAt: string;
  lastPlayedAt?: string | null;
  tags: string[];
  notes: string;
  commander: DeckCardEntry[];
  mainboard: DeckCardEntry[];
  sideboard: DeckCardEntry[];
  maybeboard: DeckCardEntry[];
  preferences: DeckPreferences;
}

/** Section names that hold cards. */
export type DeckSection = 'commander' | 'mainboard' | 'sideboard' | 'maybeboard';

// ── Summary (lightweight, for list views) ────────────────────────────────────

export interface DeckSummary {
  id: string;
  name: string;
  format: DeckFormat;
  source: DeckSource;
  cardCount: number;
  commanderNames: string[];
  updatedAt: string;
  lastPlayedAt?: string | null;
}

// ── Validation ───────────────────────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface DeckValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  section?: DeckSection;
}

// ── Stats ────────────────────────────────────────────────────────────────────

export interface DeckStats {
  totalCards: number;
  commanderCount: number;
  mainboardCount: number;
  sideboardCount: number;
  maybeboardCount: number;
}

// ── Storage ──────────────────────────────────────────────────────────────────

export type DeckStorageCapability = 'folder' | 'fallback';

export interface DeckLoadResult {
  success: boolean;
  deck?: DeckRecord;
  error?: string;
}

export interface DeckSaveResult {
  success: boolean;
  error?: string;
}
