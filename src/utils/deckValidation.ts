/**
 * Advisory deck validation — informative, not blocking.
 *
 * All rules produce issues with severity levels. The UI can display them
 * however it wants. No rule prevents saving or playing.
 */

import type {
  DeckRecord,
  DeckValidationIssue,
  DeckSection,
  ValidationSeverity,
} from '../types/deck';

// ── Main entry point ─────────────────────────────────────────────────────────

export function validateDeck(deck: DeckRecord): DeckValidationIssue[] {
  const issues: DeckValidationIssue[] = [];

  // Universal rules
  checkEmptyDeck(deck, issues);
  checkEmptyMainboard(deck, issues);

  // Format-specific rules
  switch (deck.format) {
    case 'commander':
      checkCommanderFormat(deck, issues);
      break;
    case 'standard':
    case 'modern':
    case 'legacy':
    case 'vintage':
    case 'pauper':
      checkConstructedFormat(deck, issues);
      break;
    case 'limited':
      checkLimitedFormat(deck, issues);
      break;
    // 'free' gets no format-specific validation
  }

  return issues;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function issue(
  severity: ValidationSeverity,
  code: string,
  message: string,
  section?: DeckSection,
): DeckValidationIssue {
  return { severity, code, message, section };
}

function sectionCount(entries: { count: number }[]): number {
  return entries.reduce((sum, e) => sum + e.count, 0);
}

// ── Universal checks ─────────────────────────────────────────────────────────

function checkEmptyDeck(deck: DeckRecord, issues: DeckValidationIssue[]): void {
  const total =
    sectionCount(deck.commander) +
    sectionCount(deck.mainboard) +
    sectionCount(deck.sideboard);
  if (total === 0) {
    issues.push(issue('warning', 'empty-deck', 'Deck has no cards.'));
  }
}

function checkEmptyMainboard(deck: DeckRecord, issues: DeckValidationIssue[]): void {
  if (sectionCount(deck.mainboard) === 0 && sectionCount(deck.commander) > 0) {
    issues.push(
      issue('warning', 'empty-mainboard', 'Mainboard is empty.', 'mainboard'),
    );
  }
}

// ── Commander ────────────────────────────────────────────────────────────────

function checkCommanderFormat(deck: DeckRecord, issues: DeckValidationIssue[]): void {
  const commanderCount = deck.commander.length;

  if (commanderCount === 0) {
    issues.push(
      issue('warning', 'no-commander', 'Commander format deck has no commander.', 'commander'),
    );
  }

  if (commanderCount > 2) {
    issues.push(
      issue('warning', 'too-many-commanders', `${commanderCount} commanders found. Commander allows at most 2 (partners).`, 'commander'),
    );
  }

  // Singleton violations in mainboard
  for (const entry of deck.mainboard) {
    if (entry.count > 1 && !isBasicLand(entry.cardName)) {
      issues.push(
        issue(
          'warning',
          'singleton-violation',
          `${entry.cardName} has ${entry.count} copies (Commander is singleton).`,
          'mainboard',
        ),
      );
    }
  }

  // Mainboard size check
  const mainCount = sectionCount(deck.mainboard);
  const expectedMain = commanderCount <= 1 ? 99 : 98;
  if (mainCount > 0 && mainCount !== expectedMain) {
    issues.push(
      issue(
        'info',
        'commander-size',
        `Mainboard has ${mainCount} cards (expected ${expectedMain} for Commander).`,
        'mainboard',
      ),
    );
  }
}

// ── Constructed (Standard, Modern, etc.) ─────────────────────────────────────

function checkConstructedFormat(deck: DeckRecord, issues: DeckValidationIssue[]): void {
  const mainCount = sectionCount(deck.mainboard);
  if (mainCount > 0 && mainCount < 60) {
    issues.push(
      issue(
        'warning',
        'constructed-size',
        `Mainboard has ${mainCount} cards (minimum 60 for constructed).`,
        'mainboard',
      ),
    );
  }

  const sideCount = sectionCount(deck.sideboard);
  if (sideCount > 15) {
    issues.push(
      issue(
        'info',
        'sideboard-size',
        `Sideboard has ${sideCount} cards (maximum 15 for constructed).`,
        'sideboard',
      ),
    );
  }
}

// ── Limited ──────────────────────────────────────────────────────────────────

function checkLimitedFormat(deck: DeckRecord, issues: DeckValidationIssue[]): void {
  const mainCount = sectionCount(deck.mainboard);
  if (mainCount > 0 && mainCount < 40) {
    issues.push(
      issue(
        'warning',
        'limited-size',
        `Mainboard has ${mainCount} cards (minimum 40 for limited).`,
        'mainboard',
      ),
    );
  }
}

// ── Card knowledge ───────────────────────────────────────────────────────────

const BASIC_LAND_NAMES = new Set([
  'plains',
  'island',
  'swamp',
  'mountain',
  'forest',
  'wastes',
  'snow-covered plains',
  'snow-covered island',
  'snow-covered swamp',
  'snow-covered mountain',
  'snow-covered forest',
]);

function isBasicLand(cardName: string): boolean {
  return BASIC_LAND_NAMES.has(cardName.toLowerCase());
}
