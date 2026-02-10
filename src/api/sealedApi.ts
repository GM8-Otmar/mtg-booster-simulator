import axios from 'axios';
import type { SealedEvent, Player, BoosterPack } from '../types/sealed';
import type { ScryfallCard } from '../types/card';

// Use relative URL for API calls (goes through Vite proxy in dev)
// In production, VITE_API_URL should be set to the deployed backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const apiClient = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api/events` : '/api/events',
});

export interface CreateEventRequest {
  hostName: string;
  setCode: string;
  boosterType: 'play' | 'collector';
}

export interface CreateEventResponse {
  event: SealedEvent;
  playerId: string;
}

export interface JoinEventResponse {
  event: SealedEvent;
  playerId: string;
}

export interface OpenPackResponse {
  pack: BoosterPack;
  player: Player;
}

export interface GetPoolResponse {
  pool: ScryfallCard[];
  selectedLegend: ScryfallCard | null;
  packsOpened: number;
}

/**
 * Create a new sealed event
 */
export async function createEvent(request: CreateEventRequest): Promise<CreateEventResponse> {
  const response = await apiClient.post<CreateEventResponse>('/', request);
  return response.data;
}

/**
 * Get event by code
 */
export async function getEventByCode(code: string): Promise<{ event: SealedEvent }> {
  const response = await apiClient.get<{ event: SealedEvent }>(`/${code}`);
  return response.data;
}

/**
 * Join an event
 */
export async function joinEvent(eventCode: string, playerName: string): Promise<JoinEventResponse> {
  const response = await apiClient.post<JoinEventResponse>(`/${eventCode}/join`, {
    playerName,
  });
  return response.data;
}

/**
 * Start an event (host only)
 */
export async function startEvent(eventId: string, playerId: string): Promise<{ event: SealedEvent }> {
  const response = await apiClient.post<{ event: SealedEvent }>(`/${eventId}/start`, {
    playerId,
  });
  return response.data;
}

/**
 * Open the next pack
 */
export async function openNextPack(eventId: string, playerId: string): Promise<OpenPackResponse> {
  const response = await apiClient.post<OpenPackResponse>(`/${eventId}/next-pack`, {
    playerId,
  });
  return response.data;
}

/**
 * Select a legendary creature as commander
 */
export async function selectLegend(
  eventId: string,
  playerId: string,
  legendCard: ScryfallCard
): Promise<{ player: Player }> {
  const response = await apiClient.post<{ player: Player }>(`/${eventId}/select-legend`, {
    playerId,
    legendCard,
  });
  return response.data;
}

/**
 * Get player's card pool
 */
export async function getPlayerPool(eventId: string, playerId: string): Promise<GetPoolResponse> {
  const response = await apiClient.get<GetPoolResponse>(`/${eventId}/pool`, {
    params: { playerId },
  });
  return response.data;
}

/**
 * Get all legendary creatures from a set
 */
export async function getLegendaryCreatures(setCode: string): Promise<ScryfallCard[]> {
  const response = await apiClient.get<{ legends: ScryfallCard[] }>(`/sets/${setCode}/legends`);
  return response.data.legends;
}
