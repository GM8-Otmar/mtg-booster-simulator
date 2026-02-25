import axios, { AxiosError } from 'axios';
import type { ScryfallCard, ScryfallSet } from '../types/card';

export function getCardTreatment(card: ScryfallCard): string | null {
  if (card.border_color === 'borderless') return 'Borderless';
  const effects = card.frame_effects ?? [];
  if (effects.includes('extendedart')) return 'Extended Art';
  if (effects.includes('showcase')) return 'Showcase';
  return null;
}
import { BOOSTER_SET_TYPES } from '../types/card';

const SCRYFALL_API = 'https://api.scryfall.com';

const scryfallClient = axios.create({
  baseURL: SCRYFALL_API,
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Use crypto when available for better randomness; fallback to Math.random */
function secureRandom(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0]! / (0xffffffff + 1);
  }
  return Math.random();
}

/** Cache-bust param to reduce duplicate responses from Scryfall */
function cacheBust(): string {
  return `${Date.now()}-${secureRandom().toString(36).slice(2)}`;
}

// ============ SETS API ============

interface SetsResponse {
  data: ScryfallSet[];
}

const BOOSTER_SETS_CACHE_KEY = 'mtg-booster-sets-v1';
const BOOSTER_SETS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function fetchSets(): Promise<ScryfallSet[]> {
  const response = await scryfallClient.get<SetsResponse>('/sets');
  return response.data.data;
}

export async function fetchBoosterSets(): Promise<ScryfallSet[]> {
  if (typeof window !== 'undefined') {
    const cachedRaw = window.localStorage.getItem(BOOSTER_SETS_CACHE_KEY);
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw) as { timestamp: number; sets: ScryfallSet[] };
        if (Date.now() - cached.timestamp < BOOSTER_SETS_CACHE_TTL_MS && Array.isArray(cached.sets)) {
          return cached.sets;
        }
      } catch {
        // Ignore cache parse errors and fetch fresh data.
      }
    }
  }

  const allSets = await fetchSets();

  const boosterSets = allSets
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

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      BOOSTER_SETS_CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), sets: boosterSets })
    );
  }

  return boosterSets;
}

// ============ CARDS API ============

export async function fetchRandomCard(query?: string): Promise<ScryfallCard | null> {
  try {
    const params: Record<string, string> = { _: cacheBust() };
    if (query) params.q = query;
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
  land: ScryfallCard;             // Slot 13 (basic land)
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
  public readonly rarity: string;
  public readonly setCode: string;

  constructor(
    message: string,
    rarity: string,
    setCode: string
  ) {
    super(message);
    this.name = 'PackSimulationError';
    this.rarity = rarity;
    this.setCode = setCode;
  }
}

// ============ HELPERS ============

async function fetchUniqueCards(
  query: string,
  count: number,
  seenIds: Set<string> = new Set(),
  markAsFoil: boolean = false,
  previouslySeenIds?: Set<string>
): Promise<ScryfallCard[]> {
  const cards: ScryfallCard[] = [];
  let retries = 0;
  const maxRetries = count * 8; // Higher limit for cross-pack dedupe

  while (cards.length < count && retries < maxRetries) {
    const card = await fetchRandomCard(query);

    if (!card) {
      throw new PackSimulationError(`No cards found for query: ${query}`, query, '');
    }

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

    await delay(50 + secureRandom() * 100); // Variable delay reduces request clustering
  }

  return cards;
}

/** Fetch a single card, retrying if it was seen in a previous pack */
async function fetchUniqueWildcard(
  query: string,
  seenIds: Set<string>,
  previouslySeenIds?: Set<string>,
  fallbackQuery?: string
): Promise<ScryfallCard | null> {
  for (let i = 0; i < 12; i++) {
    let card = await fetchRandomCard(query);
    if (!card && fallbackQuery) card = await fetchRandomCard(fallbackQuery);
    if (!card) return null;
    const alreadySeen = seenIds.has(card.id) || (previouslySeenIds?.has(card.id) ?? false);
    if (!alreadySeen) {
      seenIds.add(card.id);
      return card;
    }
    await delay(50);
  }
  const card = await fetchRandomCard(query) ?? (fallbackQuery ? await fetchRandomCard(fallbackQuery) : null);
  if (card) seenIds.add(card.id);
  return card;
}

/**
 * Roll for rarity based on weights
 */
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

async function fetchLandSlot(setCode: string, previouslySeenIds?: Set<string>): Promise<ScryfallCard> {
  const useFullArt = secureRandom() < 0.1;
  const fullArtQuery = `set:${setCode} type:basic is:fullart`;
  const basicLandQuery = `set:${setCode} type:basic`;
  const fallbackQuery = 'game:paper type:basic';

  for (let attempt = 0; attempt < 15; attempt++) {
    let land = useFullArt && attempt < 3 ? await fetchRandomCard(fullArtQuery) : null;
    if (!land) land = await fetchRandomCard(basicLandQuery);
    if (!land) land = await fetchRandomCard(fallbackQuery);
    if (!land) throw new PackSimulationError('Failed to fetch land slot', 'land', setCode);
    if (!previouslySeenIds?.has(land.id)) return land;
    await delay(50);
  }
  // After retries, accept duplicate to avoid infinite loop
  let land = await fetchRandomCard(basicLandQuery);
  if (!land) land = await fetchRandomCard(fallbackQuery);
  if (!land) throw new PackSimulationError('Failed to fetch land slot', 'land', setCode);
  return land;
}

// ============ PLAY BOOSTER ============
// Based on: https://mtg.fandom.com/wiki/Play_Booster
// 14 cards: 7 commons, 3 uncommons, 1 wildcard (any), 1 rare/mythic, 1 land, 1 foil wildcard

export async function fetchPlayBooster(
  setCode: string,
  options?: { previouslySeenIds?: Set<string> }
): Promise<PlayBoosterPack> {
  const previouslySeen = options?.previouslySeenIds;
  console.log(`Opening PLAY BOOSTER from set: ${setCode}`);
  const seenIds = new Set<string>(previouslySeen);

  try {
    // Slots 1-7: Commons
    const commons = await fetchUniqueCards(`set:${setCode} rarity:common`, 7, seenIds, false, previouslySeen);
    console.log(`  Commons: ${commons.length}`);

    // Slots 8-10: Uncommons
    const uncommons = await fetchUniqueCards(`set:${setCode} rarity:uncommon`, 3, seenIds, false, previouslySeen);
    console.log(`  Uncommons: ${uncommons.length}`);

    // Slot 11: Non-foil wildcard (any rarity)
    // Rates estimated: ~70% common, ~20% uncommon, ~9% rare, ~1% mythic
    const wildcardRarity = rollRarity({ common: 0.70, uncommon: 0.20, rare: 0.09, mythic: 0.01 });
    const wildcardQuery = `set:${setCode} rarity:${wildcardRarity}`;
    let wildcard = await fetchUniqueWildcard(wildcardQuery, seenIds, previouslySeen, `set:${setCode} rarity:common`);
    if (!wildcard) throw new PackSimulationError('Failed to fetch wildcard', 'wildcard', setCode);
    console.log(`  Wildcard: ${wildcard.name} (${wildcardRarity})`);

    // Slot 12: Rare (87.5%) or Mythic (12.5%)
    const isMythic = secureRandom() < 0.125;
    let rareQuery = isMythic ? `set:${setCode} rarity:mythic` : `set:${setCode} rarity:rare`;
    let rareOrMythic = await fetchUniqueWildcard(rareQuery, seenIds, previouslySeen, `set:${setCode} rarity:rare`);
    if (!rareOrMythic) throw new PackSimulationError('No rare/mythic found', 'rare/mythic', setCode);
    seenIds.add(rareOrMythic.id);
    console.log(`  Rare/Mythic: ${rareOrMythic.name} (${rareOrMythic.rarity}) ${isMythic ? '[MYTHIC ROLL!]' : ''}`);

    // Slot 13: Basic land (10% full-art attempt)
    const land = await fetchLandSlot(setCode, previouslySeen);
    console.log(`  Land: ${land.name}`);

    // Slot 14: Foil wildcard (guaranteed foil, any rarity)
    // Rates: ~60% common, ~25% uncommon, ~12% rare, ~3% mythic
    const foilRarity = rollRarity({ common: 0.60, uncommon: 0.25, rare: 0.12, mythic: 0.03 });
    const foilQuery = `set:${setCode} rarity:${foilRarity}`;
    let foilWildcard = await fetchUniqueWildcard(foilQuery, seenIds, previouslySeen, `set:${setCode} rarity:common`);
    if (!foilWildcard) throw new PackSimulationError('Failed to fetch foil wildcard', 'foil', setCode);
    foilWildcard = { ...foilWildcard, isFoilPull: true };
    console.log(`  Foil Wildcard: ${foilWildcard.name} (${foilRarity})`);

    console.log(`Play Booster complete!`);

    return {
      type: 'play',
      commons,
      uncommons,
      wildcard,
      rareOrMythic,
      land,
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
// Based on Wizards' Collector Booster structure:
// Slots 1-5: Foil commons | 6-9: Foil uncommons
// Slots 10-11 (or 10-12): 2-3 non-foil "Booster Fun" rares (extended art, borderless, showcase)
// Slot 12 (or 13): 1 foil "Booster Fun" rare (extended art, borderless, showcase)
// Rates: ~85% rare / 15% mythic per rare slot
// Treatment mix when available: ~50% extended art, ~30% showcase, ~20% borderless

const BOOSTER_FUN_QUERY = '(frame:extendedart or frame:showcase or border:borderless)';

function getTreatmentLabel(card: ScryfallCard): string {
  if (card.border_color === 'borderless') return 'Borderless';
  const effects = card.frame_effects ?? [];
  if (effects.includes('extendedart')) return 'Extended Art';
  if (effects.includes('showcase')) return 'Showcase';
  return '';
}

async function fetchBoosterFunRare(
  setCode: string,
  isMythic: boolean,
  foil: boolean,
  seenIds: Set<string>,
  previouslySeenIds?: Set<string>
): Promise<ScryfallCard | null> {
  const rarity = isMythic ? 'mythic' : 'rare';
  const treatmentQuery = `set:${setCode} ${BOOSTER_FUN_QUERY} rarity:${rarity}`;
  const fallbackQuery = `set:${setCode} rarity:${rarity}`;

  const card = await fetchUniqueWildcard(treatmentQuery, seenIds, previouslySeenIds, fallbackQuery);
  if (card && foil) {
    return { ...card, isFoilPull: true };
  }
  return card;
}

export async function fetchCollectorBooster(
  setCode: string,
  options?: { previouslySeenIds?: Set<string> }
): Promise<CollectorBoosterPack> {
  const previouslySeen = options?.previouslySeenIds;
  console.log(`Opening COLLECTOR BOOSTER from set: ${setCode}`);
  const seenIds = new Set<string>(previouslySeen);

  try {
    // 5 Foil commons
    const foilCommons = await fetchUniqueCards(`set:${setCode} rarity:common`, 5, seenIds, true, previouslySeen);
    console.log(`  Foil Commons: ${foilCommons.length}`);

    // 4 Foil uncommons
    const foilUncommons = await fetchUniqueCards(`set:${setCode} rarity:uncommon`, 4, seenIds, true, previouslySeen);
    console.log(`  Foil Uncommons: ${foilUncommons.length}`);

    // 2-3 Non-foil "Booster Fun" rares (extended art, borderless, showcase) — 85% rare / 15% mythic
    const rareCount = secureRandom() < 0.5 ? 2 : 3;
    const rares: ScryfallCard[] = [];
    for (let i = 0; i < rareCount; i++) {
      const isMythic = secureRandom() < 0.15;
      const card = await fetchBoosterFunRare(setCode, isMythic, false, seenIds, previouslySeen);
      if (card) {
        seenIds.add(card.id);
        rares.push(card);
        const treatment = getTreatmentLabel(card);
        console.log(`  Rare ${i + 1}: ${card.name} (${card.rarity})${treatment ? ` [${treatment}]` : ''}`);
      }
      await delay(100);
    }

    // 1 Foil "Booster Fun" rare (extended art, borderless, showcase) — 85% rare / 15% mythic
    const foilIsMythic = secureRandom() < 0.15;
    let foilRare = await fetchBoosterFunRare(setCode, foilIsMythic, true, seenIds, previouslySeen);
    if (!foilRare) throw new PackSimulationError('No foil rare found', 'foil rare', setCode);
    const foilTreatment = getTreatmentLabel(foilRare);
    console.log(`  Foil Rare: ${foilRare.name} (${foilRare.rarity})${foilTreatment ? ` [${foilTreatment}]` : ''}`);

    console.log(`Collector Booster complete!`);

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

export async function fetchBoosterPack(
  setCode: string,
  type: BoosterType = 'play',
  options?: { previouslySeenIds?: Set<string> }
): Promise<BoosterPack> {
  if (type === 'collector') {
    return fetchCollectorBooster(setCode, options);
  }
  return fetchPlayBooster(setCode, options);
}

// ============ HELPERS ============

export function getPackCards(pack: BoosterPack): ScryfallCard[] {
  if (pack.type === 'play') {
    return [
      ...pack.commons,
      ...pack.uncommons,
      pack.wildcard,
      pack.rareOrMythic,
      pack.land,
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
