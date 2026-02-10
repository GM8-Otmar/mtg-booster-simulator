// Define ScryfallCard locally for server-side use
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
  colors?: string[];
  prices: {
    usd: string | null;
    usd_foil: string | null;
    usd_etched: string | null;
    eur: string | null;
    eur_foil: string | null;
    tix: string | null;
  };
  isFoilPull?: boolean;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
  card_faces?: Array<{
    name: string;
    mana_cost?: string;
    type_line: string;
    oracle_text?: string;
    image_uris?: {
      small: string;
      normal: string;
      large: string;
      png: string;
      art_crop: string;
      border_crop: string;
    };
  }>;
}

export interface BoosterPack {
  cards: ScryfallCard[];
  type: 'play' | 'collector';
}

export interface PlayBoosterPack extends BoosterPack {
  type: 'play';
  commons: ScryfallCard[];
  uncommons: ScryfallCard[];
  rareSlot: ScryfallCard;
  wildcardSlot: ScryfallCard;
  foilWildcard: ScryfallCard;
}

export interface CollectorBoosterPack extends BoosterPack {
  type: 'collector';
  foilCommons: ScryfallCard[];
  foilUncommons: ScryfallCard[];
  raresOrMythics: ScryfallCard[];
  foilRareOrMythic: ScryfallCard;
}

export type EventStatus = 'waiting' | 'in_progress' | 'completed';

export interface Player {
  id: string;                              // UUID
  name: string;
  eventId: string;
  pool: ScryfallCard[];                    // All cards from 6 packs
  selectedLegend: ScryfallCard | null;     // Commander wildcard
  packsOpened: number;                     // 0-6
  currentPack: BoosterPack | null;         // Most recent opened pack
  lastActivity: string;                    // ISO timestamp
}

export interface SealedEvent {
  id: string;                              // UUID
  code: string;                            // 6-char alphanumeric (shareable)
  hostId: string;                          // Player ID who created event
  setCode: string;                         // e.g., "blb", "mkm"
  boosterType: 'play' | 'collector';
  status: EventStatus;
  createdAt: string;                       // ISO timestamp
  players: Player[];
}

export interface CreateEventRequest {
  hostName: string;
  setCode: string;
  boosterType: 'play' | 'collector';
}

export interface CreateEventResponse {
  event: SealedEvent;
  playerId: string;
}

export interface JoinEventRequest {
  playerName: string;
}

export interface JoinEventResponse {
  event: SealedEvent;
  playerId: string;
}

export interface OpenPackResponse {
  pack: BoosterPack;
  player: Player;
}

export interface SelectLegendRequest {
  legendCard: ScryfallCard;
}

export interface GetPoolResponse {
  pool: ScryfallCard[];
  selectedLegend: ScryfallCard | null;
  packsOpened: number;
}
