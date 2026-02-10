import type { ScryfallCard } from './card';

export type EventStatus = 'waiting' | 'in_progress' | 'completed';

export interface BoosterPack {
  type: 'play' | 'collector';
  cards: ScryfallCard[];
  [key: string]: any;
}

export interface Player {
  id: string;
  name: string;
  eventId: string;
  pool: ScryfallCard[];
  selectedLegend: ScryfallCard | null;
  packsOpened: number;
  currentPack: BoosterPack | null;
  lastActivity: string;
}

export interface SealedEvent {
  id: string;
  code: string;
  hostId: string;
  setCode: string;
  boosterType: 'play' | 'collector';
  status: EventStatus;
  createdAt: string;
  players: Player[];
}

export type EventPhase =
  | 'idle'
  | 'lobby'
  | 'opening'
  | 'selecting_legend'
  | 'complete';
