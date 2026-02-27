export type GameZone =
  | 'battlefield'
  | 'hand'
  | 'library'
  | 'graveyard'
  | 'exile'
  | 'command_zone'
  | 'sideboard';

export type GameFormat = 'commander' | 'standard' | 'limited' | 'free';
export type GameStatus = 'waiting' | 'active' | 'finished';

export interface CardCounter {
  type: 'plus1plus1' | 'minus1minus1' | 'loyalty' | 'charge' | 'custom';
  value: number;
  label?: string;
}

export interface BattlefieldCard {
  instanceId: string;       // UUID — unique per copy on table
  scryfallId: string;       // Scryfall card id; 'token' for tokens
  name: string;             // denormalised
  imageUri: string | null;  // front-face normal image, denormalised

  zone: GameZone;
  controller: string;       // playerId

  // Position — percentage of battlefield size (ignored outside battlefield)
  x: number;
  y: number;

  tapped: boolean;
  faceDown: boolean;
  flipped: boolean;

  counters: CardCounter[];

  // is this the player's designated commander?
  isCommander: boolean;
}

export interface GamePlayerState {
  playerId: string;
  playerName: string;
  life: number;
  poisonCounters: number;
  commanderTax: number;
  // damage received from each commander, keyed by instanceId
  commanderDamageReceived: Record<string, number>;

  // ordered zone membership (values = instanceIds)
  handCardIds: string[];
  libraryCardIds: string[];
  graveyardCardIds: string[];
  exileCardIds: string[];
  commandZoneCardIds: string[];
  sideboardCardIds: string[];
}

export interface GameAction {
  id: string;
  timestamp: string;
  playerId: string;
  playerName: string;
  type: string;
  description: string;
}

export interface GameRoom {
  id: string;
  code: string;
  hostId: string;
  format: GameFormat;
  status: GameStatus;
  createdAt: string;
  lastActivity: string;

  // flat card store — single source of truth
  cards: Record<string, BattlefieldCard>;

  // per-player state
  players: Record<string, GamePlayerState>;

  // rolling action log, last 50
  actionLog: GameAction[];

  // turn order
  turnOrder: string[];        // player IDs in play order
  activePlayerIndex: number;  // index into turnOrder
}

// ---------- request / response shapes ----------

export interface TokenTemplate {
  name: string;
  typeLine: string;
  power: string;
  toughness: string;
  colors: string[];
  imageUri?: string;
}

export interface ParsedDeck {
  commander: string | null;
  mainboard: { name: string; count: number }[];
  sideboard: { name: string; count: number }[];
}

export interface ImportedCard {
  name: string;
  scryfallId: string;
  imageUri: string | null;
  count: number;
}
