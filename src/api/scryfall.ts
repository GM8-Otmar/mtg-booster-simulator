import axios, { AxiosError } from 'axios';
import type { ScryfallCard, ScryfallSet } from '../types/card';
import { BOOSTER_SET_TYPES } from '../types/card';

const SCRYFALL_API = 'https://api.scryfall.com';

const scryfallClient = axios.create({
  baseURL: SCRYFALL_API,
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ============ SETS API ============

interface SetsResponse {
  data: ScryfallSet[];
}

export async function fetchSets(): Promise<ScryfallSet[]> {
  const response = await scryfallClient.get<SetsResponse>('/sets');
  return response.data.data;
}

export async function fetchBoosterSets(): Promise<ScryfallSet[]> {
  const allSets = await fetchSets();

  return allSets
    .filter((set) => {
      const isBoosterType = BOOSTER_SET_TYPES.includes(
        set.set_type as (typeof BOOSTER_SET_TYPES)[number]
      );
      const isPhysical = !set.digital;
      const hasEnoughCards = set.card_count >= 50;

      return isBoosterType && isPhysical && hasEnoughCards;
    })
    .sort((a, b) => {
      return new Date(b.released_at).getTime() - new Date(a.released_at).getTime();
    });
}

// ============ CARDS API ============

export async function fetchRandomCard(query?: string): Promise<ScryfallCard | null> {
  try {
    const params = query ? { q: query } : {};
    const response = await scryfallClient.get<ScryfallCard>('/cards/random', { params });
    return response.data;
  } catch (err) {
    const axiosError = err as AxiosError;
    if (axiosError.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

// ============ PACK TYPES ============

export type BoosterType = 'play' | 'collector';

export interface PlayBoosterPack {
  type: 'play';
  commons: ScryfallCard[];        // Slots 1-7 (7 commons)
  uncommons: ScryfallCard[];      // Slots 8-10 (3 uncommons)
  wildcard: ScryfallCard;         // Slot 11 (non-foil, any rarity)
  rareOrMythic: ScryfallCard;     // Slot 12 (87.5% rare, 12.5% mythic)
  foilWildcard: ScryfallCard;     // Slot 14 (guaranteed foil, any rarity)
}

export interface CollectorBoosterPack {
  type: 'collector';
  foilCommons: ScryfallCard[];    // 5 foil commons
  foilUncommons: ScryfallCard[];  // 4 foil uncommons
  rares: ScryfallCard[];          // 2-3 non-foil rares/mythics
  foilRare: ScryfallCard;         // 1 foil rare/mythic
}

export type BoosterPack = PlayBoosterPack | CollectorBoosterPack;

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

// ============ HELPERS ============

async function fetchUniqueCards(
  query: string,
  count: number,
  seenIds: Set<string> = new Set(),
  markAsFoil: boolean = false
): Promise<ScryfallCard[]> {
  const cards: ScryfallCard[] = [];
  let retries = 0;
  const maxRetries = count * 3;

  while (cards.length < count && retries < maxRetries) {
    const card = await fetchRandomCard(query);

    if (!card) {
      throw new PackSimulationError(`No cards found for query: ${query}`, query, '');
    }

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

/**
 * Roll for rarity based on weights
 */
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

// ============ PLAY BOOSTER ============
// Based on: https://mtg.fandom.com/wiki/Play_Booster
// 14 cards: 7 commons, 3 uncommons, 1 wildcard (any), 1 rare/mythic, 1 land, 1 foil wildcard

export async function fetchPlayBooster(setCode: string): Promise<PlayBoosterPack> {
  console.log(`📦 Opening PLAY BOOSTER from set: ${setCode}`);
  const seenIds = new Set<string>();

  try {
    // Slots 1-7: Commons
    const commons = await fetchUniqueCards(`set:${setCode} rarity:common`, 7, seenIds);
    console.log(`  Commons: ${commons.length}`);

    // Slots 8-10: Uncommons
    const uncommons = await fetchUniqueCards(`set:${setCode} rarity:uncommon`, 3, seenIds);
    console.log(`  Uncommons: ${uncommons.length}`);

    // Slot 11: Non-foil wildcard (any rarity)
    // Rates estimated: ~70% common, ~20% uncommon, ~9% rare, ~1% mythic
    const wildcardRarity = rollRarity({ common: 0.70, uncommon: 0.20, rare: 0.09, mythic: 0.01 });
    const wildcardQuery = `set:${setCode} rarity:${wildcardRarity}`;
    let wildcard = await fetchRandomCard(wildcardQuery);
    if (!wildcard) {
      wildcard = await fetchRandomCard(`set:${setCode} rarity:common`);
    }
    if (!wildcard) throw new PackSimulationError('Failed to fetch wildcard', 'wildcard', setCode);
    console.log(`  Wildcard: ${wildcard.name} (${wildcardRarity})`);

    // Slot 12: Rare (87.5%) or Mythic (12.5%)
    const isMythic = Math.random() < 0.125;
    let rareQuery = isMythic ? `set:${setCode} rarity:mythic` : `set:${setCode} rarity:rare`;
    let rareOrMythic = await fetchRandomCard(rareQuery);
    if (!rareOrMythic && isMythic) {
      rareOrMythic = await fetchRandomCard(`set:${setCode} rarity:rare`);
    }
    if (!rareOrMythic) throw new PackSimulationError('No rare/mythic found', 'rare/mythic', setCode);
    console.log(`  Rare/Mythic: ${rareOrMythic.name} (${rareOrMythic.rarity}) ${isMythic ? '🌟 MYTHIC ROLL!' : ''}`);

    // Slot 14: Foil wildcard (guaranteed foil, any rarity)
    // Rates: ~60% common, ~25% uncommon, ~12% rare, ~3% mythic
    const foilRarity = rollRarity({ common: 0.60, uncommon: 0.25, rare: 0.12, mythic: 0.03 });
    const foilQuery = `set:${setCode} rarity:${foilRarity}`;
    let foilWildcard = await fetchRandomCard(foilQuery);
    if (!foilWildcard) {
      foilWildcard = await fetchRandomCard(`set:${setCode} rarity:common`);
    }
    if (!foilWildcard) throw new PackSimulationError('Failed to fetch foil wildcard', 'foil', setCode);
    foilWildcard = { ...foilWildcard, isFoilPull: true };
    console.log(`  🌟 Foil Wildcard: ${foilWildcard.name} (${foilRarity})`);

    console.log(`📦 Play Booster complete!`);

    return {
      type: 'play',
      commons,
      uncommons,
      wildcard,
      rareOrMythic,
      foilWildcard,
    };
  } catch (err) {
    if (err instanceof PackSimulationError) throw err;
    throw new PackSimulationError(
      `Failed to simulate play booster: ${err instanceof Error ? err.message : 'Unknown error'}`,
      'unknown',
      setCode
    );
  }
}

// ============ COLLECTOR BOOSTER ============
// Premium product: All foils/special treatments
// ~15 cards: 5 foil commons, 4 foil uncommons, 2-3 rares, 1 foil rare, extended art etc.

export async function fetchCollectorBooster(setCode: string): Promise<CollectorBoosterPack> {
  console.log(`Opening COLLECTOR BOOSTER from set: ${setCode}`);
  const seenIds = new Set<string>();

  try {
    // 5 Foil commons
    const foilCommons = await fetchUniqueCards(`set:${setCode} rarity:common`, 5, seenIds, true);
    console.log(`  Foil Commons: ${foilCommons.length}`);

    // 4 Foil uncommons
    const foilUncommons = await fetchUniqueCards(`set:${setCode} rarity:uncommon`, 4, seenIds, true);
    console.log(`  Foil Uncommons: ${foilUncommons.length}`);

    // 2-3 Non-foil rares/mythics (85% rare, 15% mythic each)
    const rareCount = Math.random() < 0.5 ? 2 : 3;
    const rares: ScryfallCard[] = [];
    for (let i = 0; i < rareCount; i++) {
      const isMythic = Math.random() < 0.15;
      const rareQuery = isMythic
        ? `set:${setCode} rarity:mythic`
        : `set:${setCode} rarity:rare`;
      let card = await fetchRandomCard(rareQuery);
      if (!card && isMythic) {
        card = await fetchRandomCard(`set:${setCode} rarity:rare`);
      }
      if (card && !seenIds.has(card.id)) {
        seenIds.add(card.id);
        rares.push(card);
        console.log(`  Rare ${i + 1}: ${card.name} (${card.rarity})`);
      }
      await delay(100);
    }

    // 1 Foil rare/mythic (85% rare, 15% mythic)
    const foilIsMythic = Math.random() < 0.15;
    const foilRareQuery = foilIsMythic
      ? `set:${setCode} rarity:mythic`
      : `set:${setCode} rarity:rare`;
    let foilRare = await fetchRandomCard(foilRareQuery);
    if (!foilRare && foilIsMythic) {
      foilRare = await fetchRandomCard(`set:${setCode} rarity:rare`);
    }
    if (!foilRare) throw new PackSimulationError('No foil rare found', 'foil rare', setCode);
    foilRare = { ...foilRare, isFoilPull: true };
    console.log(`  🌟 Foil Rare: ${foilRare.name} (${foilRare.rarity})`);

    console.log(`💎 Collector Booster complete!`);

    return {
      type: 'collector',
      foilCommons,
      foilUncommons,
      rares,
      foilRare,
    };
  } catch (err) {
    if (err instanceof PackSimulationError) throw err;
    throw new PackSimulationError(
      `Failed to simulate collector booster: ${err instanceof Error ? err.message : 'Unknown error'}`,
      'unknown',
      setCode
    );
  }
}

// ============ UNIFIED FETCH ============

export async function fetchBoosterPack(setCode: string, type: BoosterType = 'play'): Promise<BoosterPack> {
  if (type === 'collector') {
    return fetchCollectorBooster(setCode);
  }
  return fetchPlayBooster(setCode);
}

// ============ HELPERS ============

export function getPackCards(pack: BoosterPack): ScryfallCard[] {
  if (pack.type === 'play') {
    return [
      ...pack.commons,
      ...pack.uncommons,
      pack.wildcard,
      pack.rareOrMythic,
      pack.foilWildcard,
    ];
  } else {
    return [
      ...pack.foilCommons,
      ...pack.foilUncommons,
      ...pack.rares,
      pack.foilRare,
    ];
  }
}
