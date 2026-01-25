import axios from 'axios';
import { ScryfallCard } from '../types/card';

const SCRYFALL_API = 'https://api.scryfall.com';

// Scryfall requires a proper User-Agent header
const scryfallClient = axios.create({
  baseURL: SCRYFALL_API,
  headers: {
    'User-Agent': 'MTGBoosterSimulator/1.0',
    'Accept': 'application/json',
  },
});

/**
 * Fetch a single random card from Scryfall
 * Optionally filter with a Scryfall search query
 */
export async function fetchRandomCard(query?: string): Promise<ScryfallCard> {
  const params = query ? { q: query } : {};
  const response = await scryfallClient.get<ScryfallCard>('/cards/random', { params });
  return response.data;
}

/**
 * Fetch multiple random cards
 * Uses staggered requests to respect Scryfall rate limits (50-100ms between requests)
 */
export async function fetchRandomCards(count: number = 5): Promise<ScryfallCard[]> {
  const cards: ScryfallCard[] = [];

  for (let i = 0; i < count; i++) {
    const card = await fetchRandomCard();
    cards.push(card);

    // Rate limiting: wait 100ms between requests (Scryfall asks for 50-100ms)
    if (i < count - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return cards;
}
