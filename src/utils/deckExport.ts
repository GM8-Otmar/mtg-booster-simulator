import type { ScryfallCard } from '../types/card';

/**
 * Generate MTG Arena deck format
 * Format:
 * Commander
 * # [Commander Name]
 *
 * Deck
 * 4 [Card Name]
 * 2 [Card Name]
 */
export function generateArenaFormat(
  deckCards: ScryfallCard[],
  commander: ScryfallCard | null
): string {
  const lines: string[] = [];

  // Commander section
  if (commander) {
    lines.push('Commander');
    lines.push(`# ${commander.name}`);
    lines.push('');
  }

  // Deck section
  lines.push('Deck');

  // Aggregate by name for clean import format
  const counts = new Map<string, number>();
  deckCards.forEach((card) => {
    counts.set(card.name, (counts.get(card.name) ?? 0) + 1);
  });

  Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([name, count]) => {
      lines.push(`${count} ${name}`);
    });

  return lines.join('\n');
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}

/**
 * Download text as a file
 */
export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
