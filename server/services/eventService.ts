import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
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

/** Use crypto for better randomness (Node has crypto built-in) */
function secureRandom(): number {
  const buf = new Uint32Array(1);
  crypto.randomFillSync(buf as any);
  return buf[0]! / (0xffffffff + 1);
}

/** Cache-bust to reduce duplicate Scryfall responses */
function cacheBust(): string {
  return `${Date.now()}-${secureRandom().toString().slice(2, 10)}`;
}

/**
 * Helper to fetch pack from Scryfall (reusing frontend logic)
 */
async function fetchPackFromScryfall(
  setCode: string,
  boosterType: 'play' | 'collector',
  previouslySeenIds?: Set<string>
): Promise<BoosterPack> {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const seenIds = new Set<string>(previouslySeenIds ?? []);

  async function fetchRandomCard(query: string): Promise<any> {
    try {
      const response = await axios.get(`${SCRYFALL_API}/cards/random`, {
        params: { q: query, _: cacheBust() }
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async function fetchUniqueWildcard(query: string, fallbackQuery: string): Promise<any> {
    for (let i = 0; i < 12; i++) {
      let card = await fetchRandomCard(query);
      if (!card) card = await fetchRandomCard(fallbackQuery);
      if (!card) return null;
      if (!seenIds.has(card.id) && !previouslySeenIds?.has(card.id)) {
        seenIds.add(card.id);
        return card;
      }
      await delay(50);
    }
    const card = await fetchRandomCard(query) ?? await fetchRandomCard(fallbackQuery);
    if (card) seenIds.add(card.id);
    return card;
  }

  async function fetchUniqueCards(query: string, count: number, markAsFoil = false): Promise<any[]> {
    const cards: any[] = [];
    let retries = 0;
    const maxRetries = count * 8;

    while (cards.length < count && retries < maxRetries) {
      const card = await fetchRandomCard(query);

      if (!card) break;

      const alreadySeen = seenIds.has(card.id) || (previouslySeenIds?.has(card.id) ?? false);
      if (!alreadySeen) {
        seenIds.add(card.id);
        if (markAsFoil) {
          cards.push({ ...card, isFoilPull: true });
        } else {
          cards.push(card);
        }
      } else {
        retries++;
      }

      await delay(50 + Math.floor(secureRandom() * 100));
    }

    return cards;
  }

  function rollRarity(weights: { common?: number; uncommon?: number; rare?: number; mythic?: number }): string {
    const roll = secureRandom();
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

  if (boosterType === 'play') {
    // Play Booster: 14 cards
    const commons = await fetchUniqueCards(`set:${setCode} rarity:common`, 7);
    const uncommons = await fetchUniqueCards(`set:${setCode} rarity:uncommon`, 3);

    const wildcardRarity = rollRarity({ common: 0.70, uncommon: 0.20, rare: 0.09, mythic: 0.01 });
    let wildcard = await fetchUniqueWildcard(`set:${setCode} rarity:${wildcardRarity}`, `set:${setCode} rarity:common`);

    const isMythic = secureRandom() < 0.125;
    const rareQuery = isMythic ? `set:${setCode} rarity:mythic` : `set:${setCode} rarity:rare`;
    let rareOrMythic = await fetchUniqueWildcard(rareQuery, `set:${setCode} rarity:rare`);

    const foilRarity = rollRarity({ common: 0.60, uncommon: 0.25, rare: 0.12, mythic: 0.03 });
    let foilWildcard = await fetchUniqueWildcard(`set:${setCode} rarity:${foilRarity}`, `set:${setCode} rarity:common`);
    if (foilWildcard) foilWildcard = { ...foilWildcard, isFoilPull: true };

    return {
      type: 'play',
      commons,
      uncommons,
      wildcard,
      rareSlot: rareOrMythic,
      foilWildcard,
      cards: [...commons, ...uncommons, wildcard, rareOrMythic, foilWildcard].filter(Boolean),
    } as BoosterPack;
  } else {
    // Collector Booster: ~15 cards with Booster Fun treatments (extended art, borderless, showcase)
    const BOOSTER_FUN = '(frame:extendedart or frame:showcase or border:borderless)';
    const foilCommons = await fetchUniqueCards(`set:${setCode} rarity:common`, 5, true);
    const foilUncommons = await fetchUniqueCards(`set:${setCode} rarity:uncommon`, 4, true);

    const rareCount = secureRandom() < 0.5 ? 2 : 3;
    const raresOrMythics: any[] = [];
    for (let i = 0; i < rareCount; i++) {
      const isMythic = secureRandom() < 0.15;
      const rarity = isMythic ? 'mythic' : 'rare';
      const treatmentQuery = `set:${setCode} ${BOOSTER_FUN} rarity:${rarity}`;
      const card = await fetchUniqueWildcard(treatmentQuery, `set:${setCode} rarity:${rarity}`);
      if (card) raresOrMythics.push(card);
      await delay(100);
    }

    const foilIsMythic = secureRandom() < 0.15;
    const foilRarity = foilIsMythic ? 'mythic' : 'rare';
    const foilTreatmentQuery = `set:${setCode} ${BOOSTER_FUN} rarity:${foilRarity}`;
    let foilRare = await fetchUniqueWildcard(foilTreatmentQuery, `set:${setCode} rarity:${foilRarity}`);
    if (foilRare) foilRare = { ...foilRare, isFoilPull: true };

    return {
      type: 'collector',
      foilCommons,
      foilUncommons,
      raresOrMythics,
      foilRareOrMythic: foilRare,
      cards: [...foilCommons, ...foilUncommons, ...raresOrMythics, foilRare].filter(Boolean),
    } as BoosterPack;
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

  // Build set of card IDs already in pool (packs 2-6) to reduce duplicates
  const previouslySeenIds = player.pool.length > 0
    ? new Set(player.pool.map(c => c.id))
    : undefined;

  const pack = await fetchPackFromScryfall(event.setCode, event.boosterType, previouslySeenIds);

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
