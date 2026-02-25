/**
 * Parses MTG Arena export format into a structured deck.
 *
 * Arena format example:
 *   Commander
 *   1 Atraxa, Praetors' Voice
 *
 *   Deck
 *   3 Llanowar Elves
 *   1 Sol Ring
 *   ...
 *
 *   Sideboard
 *   1 Swords to Plowshares
 */

export interface ParsedDeck {
  commander: string | null;
  mainboard: { name: string; count: number }[];
  sideboard: { name: string; count: number }[];
}

type Section = 'commander' | 'deck' | 'sideboard' | 'companion' | null;

export function parseArenaFormat(text: string): ParsedDeck {
  const result: ParsedDeck = {
    commander: null,
    mainboard: [],
    sideboard: [],
  };

  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let section: Section = null;

  // Section header keywords (case-insensitive)
  const SECTION_HEADERS: Record<string, Section> = {
    commander: 'commander',
    deck: 'deck',
    mainboard: 'deck',
    main: 'deck',
    sideboard: 'sideboard',
    side: 'sideboard',
    companion: 'companion',
  };

  // Card line pattern: optional count, then card name
  // Handles: "3 Lightning Bolt", "1x Lightning Bolt", "Lightning Bolt"
  const CARD_LINE_RE = /^(\d+)[xX]?\s+(.+)$/;

  for (const line of lines) {
    // Check if it's a section header
    const lower = line.toLowerCase().replace(/:$/, '');
    if (SECTION_HEADERS[lower] !== undefined) {
      section = SECTION_HEADERS[lower];
      continue;
    }

    // If no section set yet, treat as deck
    if (section === null) {
      section = 'deck';
    }

    const match = line.match(CARD_LINE_RE);
    if (!match) {
      // Could be a bare card name (count = 1), e.g. in some editors
      // Only accept if it looks like a card name (no numbers at start)
      if (/^[A-Za-z]/.test(line)) {
        const entry = { name: cleanCardName(line), count: 1 };
        pushEntry(result, section, entry);
      }
      continue;
    }

    const count = parseInt(match[1], 10);
    const name = cleanCardName(match[2]);

    const entry = { name, count };
    pushEntry(result, section, entry);
  }

  return result;
}

function pushEntry(
  result: ParsedDeck,
  section: Section,
  entry: { name: string; count: number },
) {
  if (!entry.name) return;

  switch (section) {
    case 'commander':
    case 'companion':
      // Only take first commander
      if (!result.commander) {
        result.commander = entry.name;
      }
      break;
    case 'sideboard':
      result.sideboard.push(entry);
      break;
    case 'deck':
    default:
      result.mainboard.push(entry);
      break;
  }
}

/**
 * Strips Arena set codes and collector numbers from card names.
 * e.g. "Lightning Bolt (M10) 149" → "Lightning Bolt"
 */
function cleanCardName(raw: string): string {
  return raw
    .replace(/\s*\([A-Z0-9]+\)\s*\d*\s*$/, '') // "(SET) 123" suffix
    .replace(/\s*#\d+$/, '')                      // "#123" suffix
    .trim();
}

/** Total card count (mainboard only) */
export function deckCardCount(deck: ParsedDeck): number {
  return deck.mainboard.reduce((sum, e) => sum + e.count, 0);
}

/** Flatten deck into an array of individual card names (duplicated per count) */
export function flattenDeck(deck: ParsedDeck): string[] {
  const names: string[] = [];
  for (const entry of deck.mainboard) {
    for (let i = 0; i < entry.count; i++) {
      names.push(entry.name);
    }
  }
  return names;
}
