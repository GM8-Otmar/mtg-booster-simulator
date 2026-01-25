/**
 * Scryfall API types
 * Docs: https://scryfall.com/docs/api
 */

// ============ SET TYPES ============

export interface ScryfallSet {
  id: string;
  code: string;
  name: string;
  set_type: string;
  released_at: string;
  card_count: number;
  digital: boolean;
  icon_svg_uri: string;
}

// Set types that typically have booster packs
export const BOOSTER_SET_TYPES = [
  'core',
  'expansion',
  'draft_innovation',
  'masters',
] as const;

// ============ CARD TYPES ============

export interface ScryfallImageUris {
  small: string;
  normal: string;
  large: string;
  png: string;
  art_crop: string;
  border_crop: string;
}

export interface ScryfallCardFace {
  name: string;
  mana_cost?: string;
  type_line: string;
  oracle_text?: string;
  image_uris?: ScryfallImageUris;
}

export interface ScryfallPrices {
  usd: string | null;
  usd_foil: string | null;
  usd_etched: string | null;
  eur: string | null;
  eur_foil: string | null;
  tix: string | null;
}

export interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  type_line: string;
  oracle_text?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic' | 'special' | 'bonus';
  set: string;
  set_name: string;
  collector_number: string;
  prices: ScryfallPrices;

  // Note: Scryfall returns 'foil' field = whether card EXISTS in foil
  // We use 'isFoilPull' to track if THIS card was pulled as a foil
  isFoilPull?: boolean;

  // Single-faced cards have image_uris
  image_uris?: ScryfallImageUris;

  // Double-faced cards use card_faces instead
  card_faces?: ScryfallCardFace[];
}

/**
 * Helper to get the front image URL from a card
 * Handles both single-faced and double-faced cards
 */
export function getCardImageUrl(card: ScryfallCard, size: keyof ScryfallImageUris = 'normal'): string | null {
  // Single-faced card
  if (card.image_uris) {
    return card.image_uris[size];
  }

  // Double-faced card - get front face
  if (card.card_faces && card.card_faces[0]?.image_uris) {
    return card.card_faces[0].image_uris[size];
  }

  return null;
}

/**
 * Get the USD price of a card (foil price if card is a foil pull)
 */
export function getCardPrice(card: ScryfallCard): number | null {
  const priceStr = card.isFoilPull ? card.prices.usd_foil : card.prices.usd;
  if (!priceStr) return null;
  return parseFloat(priceStr);
}

/**
 * Format price as USD string
 */
export function formatPrice(price: number | null): string {
  if (price === null) return '—';
  return `$${price.toFixed(2)}`;
}
