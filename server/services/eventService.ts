import { v4 as uuidv4 } from 'uuid';
import { SealedEvent, Player, CreateEventRequest, BoosterPack } from '../types/server';
import * as storage from './storageService';
import axios from 'axios';

const SCRYFALL_API = 'https://api.scryfall.com';

/**
 * Generate a random 6-character alphanumeric code for sharing
 */
function generateEventCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new sealed event
 */
export async function createEvent(request: CreateEventRequest): Promise<{ event: SealedEvent; playerId: string }> {
  const eventId = uuidv4();
  const playerId = uuidv4();
  const code = generateEventCode();

  const host: Player = {
    id: playerId,
    name: request.hostName,
    eventId,
    pool: [],
    selectedLegend: null,
    packsOpened: 0,
    currentPack: null,
    lastActivity: new Date().toISOString(),
  };

  const event: SealedEvent = {
    id: eventId,
    code,
    hostId: playerId,
    setCode: request.setCode,
    boosterType: request.boosterType,
    status: 'waiting',
    createdAt: new Date().toISOString(),
    players: [host],
  };

  await storage.saveEvent(event);
  return { event, playerId };
}

/**
 * Join an existing event
 */
export async function joinEvent(code: string, playerName: string): Promise<{ event: SealedEvent; playerId: string }> {
  const event = await storage.loadEventByCode(code);

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.status !== 'waiting') {
    throw new Error('Event has already started');
  }

  const playerId = uuidv4();
  const player: Player = {
    id: playerId,
    name: playerName,
    eventId: event.id,
    pool: [],
    selectedLegend: null,
    packsOpened: 0,
    currentPack: null,
    lastActivity: new Date().toISOString(),
  };

  event.players.push(player);
  await storage.saveEvent(event);

  return { event, playerId };
}

/**
 * Start a sealed event (host only)
 */
export async function startEvent(eventId: string, playerId: string): Promise<SealedEvent> {
  const event = await storage.loadEvent(eventId);

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.hostId !== playerId) {
    throw new Error('Only the host can start the event');
  }

  if (event.status !== 'waiting') {
    throw new Error('Event has already started');
  }

  event.status = 'in_progress';
  await storage.saveEvent(event);

  return event;
}

/**
 * Helper to fetch pack from Scryfall (reusing frontend logic)
 */
async function fetchPackFromScryfall(setCode: string, boosterType: 'play' | 'collector'): Promise<BoosterPack> {
  // Import the pack generation logic from frontend
  // For now, we'll make direct Scryfall API calls
  // In production, you might want to move the pack generation logic to a shared module

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  async function fetchRandomCard(query: string): Promise<any> {
    try {
      const response = await axios.get(`${SCRYFALL_API}/cards/random`, {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async function fetchUniqueCards(query: string, count: number, seenIds: Set<string> = new Set(), markAsFoil = false): Promise<any[]> {
    const cards: any[] = [];
    let retries = 0;
    const maxRetries = count * 3;

    while (cards.length < count && retries < maxRetries) {
      const card = await fetchRandomCard(query);

      if (!card) break;

      if (!seenIds.has(card.id)) {
        seenIds.add(card.id);
        if (markAsFoil) {
          cards.push({ ...card, isFoilPull: true });
        } else {
          cards.push(card);
        }
      } else {
        retries++;
      }

      await delay(100);
    }

    return cards;
  }

  function rollRarity(weights: { common?: number; uncommon?: number; rare?: number; mythic?: number }): string {
    const roll = Math.random();
    let cumulative = 0;

    if (weights.common) {
      cumulative += weights.common;
      if (roll < cumulative) return 'common';
    }
    if (weights.uncommon) {
      cumulative += weights.uncommon;
      if (roll < cumulative) return 'uncommon';
    }
    if (weights.rare) {
      cumulative += weights.rare;
      if (roll < cumulative) return 'rare';
    }
    return 'mythic';
  }

  const seenIds = new Set<string>();

  if (boosterType === 'play') {
    // Play Booster: 14 cards
    const commons = await fetchUniqueCards(`set:${setCode} rarity:common`, 7, seenIds);
    const uncommons = await fetchUniqueCards(`set:${setCode} rarity:uncommon`, 3, seenIds);

    const wildcardRarity = rollRarity({ common: 0.70, uncommon: 0.20, rare: 0.09, mythic: 0.01 });
    let wildcard = await fetchRandomCard(`set:${setCode} rarity:${wildcardRarity}`);
    if (!wildcard) wildcard = await fetchRandomCard(`set:${setCode} rarity:common`);

    const isMythic = Math.random() < 0.125;
    const rareQuery = isMythic ? `set:${setCode} rarity:mythic` : `set:${setCode} rarity:rare`;
    let rareOrMythic = await fetchRandomCard(rareQuery);
    if (!rareOrMythic && isMythic) rareOrMythic = await fetchRandomCard(`set:${setCode} rarity:rare`);

    const foilRarity = rollRarity({ common: 0.60, uncommon: 0.25, rare: 0.12, mythic: 0.03 });
    let foilWildcard = await fetchRandomCard(`set:${setCode} rarity:${foilRarity}`);
    if (!foilWildcard) foilWildcard = await fetchRandomCard(`set:${setCode} rarity:common`);
    if (foilWildcard) foilWildcard = { ...foilWildcard, isFoilPull: true };

    return {
      type: 'play',
      commons,
      uncommons,
      wildcard,
      rareSlot: rareOrMythic,
      foilWildcard,
      cards: [...commons, ...uncommons, wildcard, rareOrMythic, foilWildcard].filter(Boolean),
    };
  } else {
    // Collector Booster: ~15 cards
    const foilCommons = await fetchUniqueCards(`set:${setCode} rarity:common`, 5, seenIds, true);
    const foilUncommons = await fetchUniqueCards(`set:${setCode} rarity:uncommon`, 4, seenIds, true);

    const rareCount = Math.random() < 0.5 ? 2 : 3;
    const raresOrMythics: any[] = [];
    for (let i = 0; i < rareCount; i++) {
      const isMythic = Math.random() < 0.15;
      const rareQuery = isMythic ? `set:${setCode} rarity:mythic` : `set:${setCode} rarity:rare`;
      let card = await fetchRandomCard(rareQuery);
      if (!card && isMythic) card = await fetchRandomCard(`set:${setCode} rarity:rare`);
      if (card && !seenIds.has(card.id)) {
        seenIds.add(card.id);
        raresOrMythics.push(card);
      }
      await delay(100);
    }

    const foilIsMythic = Math.random() < 0.15;
    const foilRareQuery = foilIsMythic ? `set:${setCode} rarity:mythic` : `set:${setCode} rarity:rare`;
    let foilRare = await fetchRandomCard(foilRareQuery);
    if (!foilRare && foilIsMythic) foilRare = await fetchRandomCard(`set:${setCode} rarity:rare`);
    if (foilRare) foilRare = { ...foilRare, isFoilPull: true };

    return {
      type: 'collector',
      foilCommons,
      foilUncommons,
      raresOrMythics,
      foilRareOrMythic: foilRare,
      cards: [...foilCommons, ...foilUncommons, ...raresOrMythics, foilRare].filter(Boolean),
    };
  }
}

/**
 * Open the next pack for a player
 */
export async function openNextPack(eventId: string, playerId: string): Promise<{ pack: BoosterPack; player: Player }> {
  const event = await storage.loadEvent(eventId);

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.status !== 'in_progress') {
    throw new Error('Event is not in progress');
  }

  const player = event.players.find(p => p.id === playerId);
  if (!player) {
    throw new Error('Player not found');
  }

  if (player.packsOpened >= 6) {
    throw new Error('All packs have been opened');
  }

  // Fetch pack from Scryfall
  const pack = await fetchPackFromScryfall(event.setCode, event.boosterType);

  // Add cards to player's pool
  player.pool.push(...pack.cards);
  player.currentPack = pack;
  player.packsOpened += 1;
  player.lastActivity = new Date().toISOString();

  await storage.saveEvent(event);

  return { pack, player };
}

/**
 * Select a legendary creature as commander
 */
export async function selectLegend(eventId: string, playerId: string, legendCard: any): Promise<Player> {
  const event = await storage.loadEvent(eventId);

  if (!event) {
    throw new Error('Event not found');
  }

  const player = event.players.find(p => p.id === playerId);
  if (!player) {
    throw new Error('Player not found');
  }

  if (player.packsOpened < 6) {
    throw new Error('Must open all 6 packs before selecting a legend');
  }

  player.selectedLegend = legendCard;
  player.lastActivity = new Date().toISOString();

  await storage.saveEvent(event);

  return player;
}

/**
 * Get a player's card pool
 */
export async function getPlayerPool(eventId: string, playerId: string): Promise<{ pool: any[]; selectedLegend: any | null; packsOpened: number }> {
  const event = await storage.loadEvent(eventId);

  if (!event) {
    throw new Error('Event not found');
  }

  const player = event.players.find(p => p.id === playerId);
  if (!player) {
    throw new Error('Player not found');
  }

  return {
    pool: player.pool,
    selectedLegend: player.selectedLegend,
    packsOpened: player.packsOpened,
  };
}

/**
 * Get event by ID
 */
export async function getEvent(eventId: string): Promise<SealedEvent | null> {
  return storage.loadEvent(eventId);
}

/**
 * Get event by code
 */
export async function getEventByCode(code: string): Promise<SealedEvent | null> {
  return storage.loadEventByCode(code);
}
