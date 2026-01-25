/**
 * Scryfall Card API types
 * Docs: https://scryfall.com/docs/api/cards
 */

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
