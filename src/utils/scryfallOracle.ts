/**
 * Shared Scryfall oracle data cache.
 * Used by CardInspectorPanel and LibrarySearchOverlay so oracle data
 * fetched by the inspector is immediately available to search, and vice-versa.
 */

export interface OracleData {
  typeLine: string;
  oracleText: string;
  manaCost: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
}

// Keyed by exact card name
const cache = new Map<string, OracleData | null>();

/** Returns the cached entry, or `undefined` if not yet fetched */
export function getCachedOracle(name: string): OracleData | null | undefined {
  return cache.has(name) ? (cache.get(name) ?? null) : undefined;
}

/** Fetch a single card by name (with fuzzy matching) */
export async function fetchOracle(name: string): Promise<OracleData | null> {
  if (cache.has(name)) return cache.get(name) ?? null;
  try {
    const r = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);
    if (!r.ok) throw new Error('not found');
    const card = await r.json();
    const oracle: OracleData = {
      typeLine: card.type_line ?? '',
      oracleText: card.oracle_text ?? card.card_faces?.[0]?.oracle_text ?? '',
      manaCost: card.mana_cost ?? card.card_faces?.[0]?.mana_cost ?? '',
      power: card.power,
      toughness: card.toughness,
      loyalty: card.loyalty,
    };
    cache.set(name, oracle);
    return oracle;
  } catch {
    cache.set(name, null);
    return null;
  }
}

/**
 * Batch-fetch oracle data for many cards at once using Scryfall's collection
 * endpoint (up to 75 identifiers per POST). Only fetches cards not already cached.
 * Returns when all batches are complete.
 */
export async function prefetchOracles(names: string[]): Promise<void> {
  const unfetched = [...new Set(names)].filter(n => !cache.has(n));
  if (unfetched.length === 0) return;

  const BATCH = 75;
  const promises: Promise<void>[] = [];

  for (let i = 0; i < unfetched.length; i += BATCH) {
    const batch = unfetched.slice(i, i + BATCH);
    const p = fetch('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: batch.map(name => ({ name })) }),
    })
      .then(r => r.json())
      .then((data: { data?: Record<string, unknown>[] }) => {
        const seen = new Set<string>();
        if (data.data) {
          for (const card of data.data) {
            const cardName = card.name as string;
            seen.add(cardName);
            cache.set(cardName, {
              typeLine: (card.type_line as string) ?? '',
              oracleText:
                (card.oracle_text as string) ??
                ((card.card_faces as { oracle_text?: string }[])?.[0]?.oracle_text ?? ''),
              manaCost:
                (card.mana_cost as string) ??
                ((card.card_faces as { mana_cost?: string }[])?.[0]?.mana_cost ?? ''),
              power: card.power as string | undefined,
              toughness: card.toughness as string | undefined,
              loyalty: card.loyalty as string | undefined,
            });
          }
        }
        // Cache null for any names that didn't come back
        for (const name of batch) {
          if (!seen.has(name)) cache.set(name, null);
        }
      })
      .catch(() => {
        for (const name of batch) {
          if (!cache.has(name)) cache.set(name, null);
        }
      });
    promises.push(p);
  }

  await Promise.all(promises);
}
