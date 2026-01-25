import axios, { AxiosError } from 'axios';
import type { ScryfallCard, ScryfallSet } from '../types/card';
import { BOOSTER_SET_TYPES } from '../types/card';

const SCRYFALL_API = 'https://api.scryfall.com';

// Note: User-Agent header can't be set from browsers (security restriction)
// Scryfall works fine without it for client-side requests
const scryfallClient = axios.create({
  baseURL: SCRYFALL_API,
});

// Rate limit helper - wait between requests
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ============ SETS API ============

interface SetsResponse {
  data: ScryfallSet[];
}

/**
 * Fetch all sets from Scryfall
 */
export async function fetchSets(): Promise<ScryfallSet[]> {
  const response = await scryfallClient.get<SetsResponse>('/sets');
  return response.data.data;
}

/**
 * Fetch only sets that have booster packs
 * Filters by set_type and excludes digital-only sets
 */
export async function fetchBoosterSets(): Promise<ScryfallSet[]> {
  const allSets = await fetchSets();

  return allSets
    .filter((set) => {
      // Must be a booster-eligible set type
      const isBoosterType = BOOSTER_SET_TYPES.includes(
        set.set_type as (typeof BOOSTER_SET_TYPES)[number]
      );
      // Must not be digital-only
      const isPhysical = !set.digital;
      // Must have enough cards for a pack
      const hasEnoughCards = set.card_count >= 50;

      return isBoosterType && isPhysical && hasEnoughCards;
    })
    .sort((a, b) => {
      // Sort by release date, newest first
      return new Date(b.released_at).getTime() - new Date(a.released_at).getTime();
    });
}

// ============ CARDS API ============

/**
 * Fetch a single random card from Scryfall
 * Optionally filter with a Scryfall search query
 * Returns null if no cards match the query
 */
export async function fetchRandomCard(query?: string): Promise<ScryfallCard | null> {
  try {
    const params = query ? { q: query } : {};
    const response = await scryfallClient.get<ScryfallCard>('/cards/random', { params });
    return response.data;
  } catch (err) {
    const axiosError = err as AxiosError;
    // 404 means no cards matched the query
    if (axiosError.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

// ============ PACK SIMULATION ============

export interface BoosterPack {
  commons: ScryfallCard[];
  uncommons: ScryfallCard[];
  rareOrMythic: ScryfallCard;
}

export class PackSimulationError extends Error {
  constructor(
    message: string,
    public readonly rarity: string,
    public readonly setCode: string
  ) {
    super(message);
    this.name = 'PackSimulationError';
  }
}

/**
 * Fetch multiple unique random cards of a specific rarity
 * Retries if we get duplicates
 */
async function fetchUniqueCards(
  query: string,
  count: number,
  maxRetries: number = 3
): Promise<ScryfallCard[]> {
  const cards: ScryfallCard[] = [];
  const seenIds = new Set<string>();
  let retries = 0;

  while (cards.length < count && retries < maxRetries * count) {
    const card = await fetchRandomCard(query);

    if (!card) {
      throw new PackSimulationError(
        `No cards found for query: ${query}`,
        query,
        ''
      );
    }

    // Only add if we haven't seen this card
    if (!seenIds.has(card.id)) {
      seenIds.add(card.id);
      cards.push(card);
    } else {
      retries++;
    }

    await delay(100);
  }

  return cards;
}

/**
 * Simulate opening a booster pack from a specific set
 * Standard pack: 10 commons, 3 uncommons, 1 rare (or mythic ~1/8 chance)
 */
export async function fetchBoosterPack(setCode: string): Promise<BoosterPack> {
  // Determine if we get a mythic (roughly 1 in 8 packs)
  const isMythic = Math.random() < 0.125;

  // Try without is:booster first - some sets don't have booster-tagged cards
  // Using just the set and rarity is more reliable
  const commonQuery = `set:${setCode} rarity:common`;
  const uncommonQuery = `set:${setCode} rarity:uncommon`;
  let rareQuery = isMythic
    ? `set:${setCode} rarity:mythic`
    : `set:${setCode} rarity:rare`;

  try {
    // Fetch unique cards for each rarity
    const commons = await fetchUniqueCards(commonQuery, 10);
    const uncommons = await fetchUniqueCards(uncommonQuery, 3);

    // Try to get rare/mythic, fall back to rare if no mythics exist
    let rareOrMythic = await fetchRandomCard(rareQuery);
    if (!rareOrMythic && isMythic) {
      // No mythics in this set, fall back to rare
      rareQuery = `set:${setCode} rarity:rare`;
      rareOrMythic = await fetchRandomCard(rareQuery);
    }

    if (!rareOrMythic) {
      throw new PackSimulationError(
        `No rare or mythic cards found in set ${setCode}`,
        'rare/mythic',
        setCode
      );
    }

    return {
      commons,
      uncommons,
      rareOrMythic,
    };
  } catch (err) {
    if (err instanceof PackSimulationError) {
      throw err;
    }
    throw new PackSimulationError(
      `Failed to simulate pack for set ${setCode}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      'unknown',
      setCode
    );
  }
}

/**
 * Get all cards from a booster pack as a flat array
 * Ordered: commons first, then uncommons, then rare/mythic (like opening a real pack)
 */
export function getPackCards(pack: BoosterPack): ScryfallCard[] {
  return [...pack.commons, ...pack.uncommons, pack.rareOrMythic];
}
