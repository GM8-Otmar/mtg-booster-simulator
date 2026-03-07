import axios from 'axios';
import type { ScryfallCard } from '../types/card';

const SCRYFALL_API = 'https://api.scryfall.com';

type SearchResponse = {
  data: ScryfallCard[];
};

const client = axios.create({
  baseURL: SCRYFALL_API,
});

export async function searchDeckCards(query: string): Promise<ScryfallCard[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const response = await client.get<SearchResponse>('/cards/search', {
    params: {
      q: `${trimmed} game:paper`,
      unique: 'cards',
      order: 'name',
    },
  });

  return response.data.data ?? [];
}
