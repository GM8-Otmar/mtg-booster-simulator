/**
 * Shared game table types — mirrors server/types/game.ts
 * Kept in sync manually (or could use a monorepo tool).
 */

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
  instanceId: string;
  scryfallId: string;
  name: string;
  imageUri: string | null;

  zone: GameZone;
  controller: string;

  x: number;
  y: number;

  tapped: boolean;
  faceDown: boolean;
  flipped: boolean;

  counters: CardCounter[];

  isCommander: boolean;
}

export interface GamePlayerState {
  playerId: string;
  playerName: string;
  life: number;
  poisonCounters: number;
  commanderTax: number;
  commanderDamageReceived: Record<string, number>;

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

  cards: Record<string, BattlefieldCard>;
  players: Record<string, GamePlayerState>;
  actionLog: GameAction[];
}

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
