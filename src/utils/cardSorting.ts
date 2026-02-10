import type { ScryfallCard } from '../types/card';

export type Color = 'W' | 'U' | 'B' | 'R' | 'G' | 'C' | 'M'; // C = Colorless, M = Multicolor

export interface ColorGroup {
  color: Color;
  cards: ScryfallCard[];
}

export interface TypeGroup {
  type: string;
  cards: ScryfallCard[];
}

/**
 * Get the color category for a card
 */
export function getCardColor(card: ScryfallCard): Color {
  const colors = card.colors || [];

  if (colors.length === 0) {
    return 'C'; // Colorless
  }

  if (colors.length > 1) {
    return 'M'; // Multicolor
  }

  return colors[0] as Color;
}

/**
 * Sort cards by color
 */
export function sortByColor(cards: ScryfallCard[]): ColorGroup[] {
  const groups = new Map<Color, ScryfallCard[]>();

  // Initialize all color groups
  const allColors: Color[] = ['W', 'U', 'B', 'R', 'G', 'C', 'M'];
  allColors.forEach((color) => groups.set(color, []));

  // Group cards by color
  cards.forEach((card) => {
    const color = getCardColor(card);
    groups.get(color)!.push(card);
  });

  // Convert to array format
  return allColors.map((color) => ({
    color,
    cards: groups.get(color)!,
  }));
}

/**
 * Get the type category for a card
 */
export function getCardType(card: ScryfallCard): string {
  const typeLine = card.type_line.toLowerCase();

  if (typeLine.includes('creature')) return 'Creatures';
  if (typeLine.includes('instant')) return 'Instants & Sorceries';
  if (typeLine.includes('sorcery')) return 'Instants & Sorceries';
  if (typeLine.includes('artifact')) return 'Artifacts';
  if (typeLine.includes('enchantment')) return 'Enchantments';
  if (typeLine.includes('land')) return 'Lands';
  if (typeLine.includes('planeswalker')) return 'Planeswalkers';
  if (typeLine.includes('battle')) return 'Battles';

  return 'Other';
}

/**
 * Sort cards by type within a color group
 */
export function sortByType(cards: ScryfallCard[]): TypeGroup[] {
  const groups = new Map<string, ScryfallCard[]>();

  const typeOrder = [
    'Creatures',
    'Planeswalkers',
    'Instants & Sorceries',
    'Artifacts',
    'Enchantments',
    'Battles',
    'Lands',
    'Other',
  ];

  // Initialize groups
  typeOrder.forEach((type) => groups.set(type, []));

  // Group cards by type
  cards.forEach((card) => {
    const type = getCardType(card);
    groups.get(type)!.push(card);
  });

  // Convert to array format, preserving order
  return typeOrder
    .map((type) => ({
      type,
      cards: groups.get(type)!,
    }))
    .filter((group) => group.cards.length > 0); // Only include non-empty groups
}

/**
 * Get color name for display
 */
export function getColorName(color: Color): string {
  const names: Record<Color, string> = {
    W: 'White',
    U: 'Blue',
    B: 'Black',
    R: 'Red',
    G: 'Green',
    C: 'Colorless',
    M: 'Multicolor',
  };
  return names[color];
}
