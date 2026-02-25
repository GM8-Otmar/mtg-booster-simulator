import { useMemo, useState } from 'react';
import { useSealedEvent } from '../../contexts/SealedEventContext';
import { getCardType } from '../../utils/cardSorting';
import { CardDisplay } from '../CardDisplay';
import type { ScryfallCard } from '../../types/card';
import CardInspectPanel from './CardInspectPanel';
import DeckExporter from './DeckExporter';

// ── Deck stats ───────────────────────────────────────────────────────────────

function parseCmc(card: ScryfallCard): number {
  const raw = (card as any).cmc;
  return typeof raw === 'number' ? Math.min(raw, 7) : 0;
}

const COLOR_META: { key: string; label: string; bg: string; text: string }[] = [
  { key: 'W', label: 'W', bg: 'bg-yellow-100', text: 'text-yellow-900' },
  { key: 'U', label: 'U', bg: 'bg-blue-400',   text: 'text-white' },
  { key: 'B', label: 'B', bg: 'bg-gray-700',   text: 'text-white' },
  { key: 'R', label: 'R', bg: 'bg-red-500',    text: 'text-white' },
  { key: 'G', label: 'G', bg: 'bg-green-600',  text: 'text-white' },
];

function DeckStats({ deckCards, basicLandCounts }: { deckCards: ScryfallCard[]; basicLandCounts: Record<string, number> }) {
  const nonLands = deckCards.filter(c => !c.type_line.toLowerCase().includes('land'));

  // CMC buckets 0–7 (7 = 7+)
  const curve: number[] = Array(8).fill(0);
  for (const c of nonLands) curve[parseCmc(c)]++;
  const maxBucket = Math.max(...curve, 1);

  // Color pip counts
  const colorCounts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const c of nonLands) {
    for (const col of (c.colors ?? [])) {
      if (col in colorCounts) colorCounts[col]++;
    }
  }
  const basicMap: Record<string, string> = { Plains: 'W', Island: 'U', Swamp: 'B', Mountain: 'R', Forest: 'G' };
  for (const [land, col] of Object.entries(basicMap)) {
    colorCounts[col] = (colorCounts[col] ?? 0) + (basicLandCounts[land] ?? 0);
  }
  const totalPips = Object.values(colorCounts).reduce((a, b) => a + b, 0) || 1;

  const total = deckCards.length;
  if (total === 0) return null;

  return (
    <div className="bg-navy-light rounded-xl p-5 border border-cyan-dim">
      <h2 className="text-xl font-semibold text-cream mb-4">Deck Stats</h2>

      {/* Mana curve */}
      <p className="text-sm text-cream-muted mb-2">Mana Curve (non-lands)</p>
      <div className="flex items-end gap-1.5 h-20 mb-5">
        {curve.map((count, cmc) => (
          <div key={cmc} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-[10px] text-cream-muted">{count > 0 ? count : ''}</span>
            <div
              className="w-full rounded-t-sm bg-cyan transition-all duration-300"
              style={{ height: `${(count / maxBucket) * 56}px`, minHeight: count > 0 ? 4 : 0 }}
            />
            <span className="text-[10px] text-cream-muted">{cmc === 7 ? '7+' : cmc}</span>
          </div>
        ))}
      </div>

      {/* Color split */}
      <p className="text-sm text-cream-muted mb-2">Color Split</p>
      <div className="flex gap-3 flex-wrap mb-5">
        {COLOR_META.map(({ key, label, bg, text }) => {
          const count = colorCounts[key] ?? 0;
          const pct = Math.round((count / totalPips) * 100);
          return (
            <div key={key} className="flex flex-col items-center gap-1 min-w-[40px]">
              <div className={`w-8 h-8 rounded-full ${bg} ${text} flex items-center justify-center text-xs font-bold shadow`}>
                {label}
              </div>
              <span className="text-[10px] text-cream-muted">{pct > 0 ? `${pct}%` : '—'}</span>
            </div>
          );
        })}
      </div>

      {/* Quick health line */}
      <div className="pt-3 border-t border-cyan-dim flex flex-wrap gap-4 text-xs text-cream-muted">
        <span>Total: <span className={`font-bold ${total >= 40 ? 'text-cyan' : 'text-magenta'}`}>{total}</span></span>
        <span>Non-lands: <span className="text-cream font-bold">{nonLands.length}</span></span>
        <span>Lands: <span className="text-cream font-bold">{total - nonLands.length}</span></span>
        {total < 40 && <span className="text-magenta font-semibold">Need {40 - total} more for 40-card sealed</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

type FilterColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';
type FilterRarity = 'common' | 'uncommon' | 'rare' | 'mythic' | 'special' | 'bonus';
type BasicLandName = 'Plains' | 'Island' | 'Swamp' | 'Mountain' | 'Forest';

const COLOR_OPTIONS: FilterColor[] = ['W', 'U', 'B', 'R', 'G', 'C'];
const RARITY_OPTIONS: FilterRarity[] = ['common', 'uncommon', 'rare', 'mythic', 'special', 'bonus'];

const TYPE_ORDER = [
  'Creatures',
  'Planeswalkers',
  'Instants & Sorceries',
  'Artifacts',
  'Enchantments',
  'Battles',
  'Lands',
  'Other',
];

function buildBasicLandCard(name: BasicLandName, color: FilterColor): ScryfallCard {
  return {
    id: `basic-${name.toLowerCase()}`,
    name,
    type_line: `Basic Land - ${name}`,
    rarity: 'common',
    set: 'basic',
    set_name: 'Basic Land',
    collector_number: '0',
    colors: color === 'C' ? [] : [color],
    prices: {
      usd: null,
      usd_foil: null,
      usd_etched: null,
      eur: null,
      eur_foil: null,
      tix: null,
    },
  };
}

const BASIC_LAND_CARDS: Record<BasicLandName, ScryfallCard> = {
  Plains: buildBasicLandCard('Plains', 'W'),
  Island: buildBasicLandCard('Island', 'U'),
  Swamp: buildBasicLandCard('Swamp', 'B'),
  Mountain: buildBasicLandCard('Mountain', 'R'),
  Forest: buildBasicLandCard('Forest', 'G'),
};

export default function PoolView() {
  const { currentPlayer } = useSealedEvent();
  const [selectedColors, setSelectedColors] = useState<FilterColor[]>([]);
  const [selectedRarities, setSelectedRarities] = useState<FilterRarity[]>([]);
  const [inspectCard, setInspectCard] = useState<ScryfallCard | null>(null);
  const [deckCounts, setDeckCounts] = useState<Record<string, number>>({});
  const [basicLandCounts, setBasicLandCounts] = useState<Record<BasicLandName, number>>({
    Plains: 0,
    Island: 0,
    Swamp: 0,
    Mountain: 0,
    Forest: 0,
  });

  if (!currentPlayer) return null;

  const { pool } = currentPlayer;

  const poolEntries = useMemo(() => {
    const counts = new Map<string, { card: ScryfallCard; count: number }>();
    for (const card of pool) {
      const current = counts.get(card.id);
      if (current) {
        current.count += 1;
      } else {
        counts.set(card.id, { card, count: 1 });
      }
    }
    return Array.from(counts.values());
  }, [pool]);

  const filteredPoolEntries = useMemo(() => {
    return poolEntries.filter(({ card }) => {
      const colorPass = selectedColors.length === 0 || (() => {
        const colors = card.colors ?? [];
        if (colors.length === 0) {
          return selectedColors.includes('C');
        }
        return colors.some((color) => selectedColors.includes(color as FilterColor));
      })();

      const rarityPass = selectedRarities.length === 0 || selectedRarities.includes(card.rarity as FilterRarity);
      return colorPass && rarityPass;
    });
  }, [poolEntries, selectedColors, selectedRarities]);

  const filteredByType = useMemo(() => {
    const groups = new Map<string, Array<{ card: ScryfallCard; count: number }>>();
    TYPE_ORDER.forEach((type) => groups.set(type, []));
    for (const entry of filteredPoolEntries) {
      const type = getCardType(entry.card);
      groups.get(type)?.push(entry);
    }
    return TYPE_ORDER
      .map((type) => ({ type, entries: groups.get(type) ?? [] }))
      .filter((group) => group.entries.length > 0);
  }, [filteredPoolEntries]);

  const addColorFilter = (color: FilterColor) => {
    setSelectedColors((prev) => (
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    ));
  };

  const addRarityFilter = (rarity: FilterRarity) => {
    setSelectedRarities((prev) => (
      prev.includes(rarity) ? prev.filter((r) => r !== rarity) : [...prev, rarity]
    ));
  };

  const addToDeck = (cardId: string, poolCount: number) => {
    setDeckCounts((prev) => {
      const current = prev[cardId] ?? 0;
      if (current >= poolCount) return prev;
      return { ...prev, [cardId]: current + 1 };
    });
  };

  const removeFromDeck = (cardId: string) => {
    setDeckCounts((prev) => {
      const current = prev[cardId] ?? 0;
      if (current <= 0) return prev;
      const next = { ...prev, [cardId]: current - 1 };
      if (next[cardId] === 0) {
        delete next[cardId];
      }
      return next;
    });
  };

  const addBasicLand = (land: BasicLandName) => {
    setBasicLandCounts((prev) => ({ ...prev, [land]: prev[land] + 1 }));
  };

  const removeBasicLand = (land: BasicLandName) => {
    setBasicLandCounts((prev) => ({ ...prev, [land]: Math.max(0, prev[land] - 1) }));
  };

  const resetDeck = () => {
    setDeckCounts({});
    setBasicLandCounts({
      Plains: 0,
      Island: 0,
      Swamp: 0,
      Mountain: 0,
      Forest: 0,
    });
  };

  const deckPoolEntries = useMemo(() => {
    return poolEntries
      .map(({ card }) => ({ card, count: deckCounts[card.id] ?? 0 }))
      .filter(({ count }) => count > 0);
  }, [poolEntries, deckCounts]);

  const expandedDeckCards = useMemo(() => {
    const cards: ScryfallCard[] = [];
    for (const entry of deckPoolEntries) {
      for (let i = 0; i < entry.count; i++) {
        cards.push(entry.card);
      }
    }
    for (const land of Object.keys(basicLandCounts) as BasicLandName[]) {
      for (let i = 0; i < basicLandCounts[land]; i++) {
        cards.push(BASIC_LAND_CARDS[land]);
      }
    }
    return cards;
  }, [deckPoolEntries, basicLandCounts]);

  const basicLandTotal = Object.values(basicLandCounts).reduce((sum, count) => sum + count, 0);
  const nonBasicTotal = Object.values(deckCounts).reduce((sum, count) => sum + count, 0);
  const deckTotal = nonBasicTotal + basicLandTotal;

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-center text-cream">
        Sealed Pool Builder
      </h1>

      <CardInspectPanel card={inspectCard} title="Pool Inspect" />
      <div className="space-y-6 max-w-5xl mx-auto">
          <div className="bg-navy-light rounded-xl p-5 border border-cyan-dim">
            <h2 className="text-xl font-semibold text-cream mb-3">Pool Filters</h2>
            <p className="text-cream-muted text-sm mb-4">
              Multi-select colors and rarities. Selecting Red + Black includes multicolor/hybrid cards that contain either color.
            </p>

            <div className="mb-4">
              <p className="text-sm text-cream-muted mb-2">Colors</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => {
                  const active = selectedColors.includes(color);
                  return (
                    <button
                      key={color}
                      onClick={() => addColorFilter(color)}
                      className={`px-3 py-1.5 rounded-md text-sm font-semibold border ${
                        active ? 'bg-magenta border-magenta text-cream' : 'bg-navy border-cyan-dim text-cream-muted'
                      }`}
                    >
                      {color}
                    </button>
                  );
                })}
                <button
                  onClick={() => setSelectedColors([])}
                  className="px-3 py-1.5 rounded-md text-sm bg-navy border border-cyan-dim text-cream-muted"
                >
                  Clear
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm text-cream-muted mb-2">Rarity</p>
              <div className="flex flex-wrap gap-2">
                {RARITY_OPTIONS.map((rarity) => {
                  const active = selectedRarities.includes(rarity);
                  return (
                    <button
                      key={rarity}
                      onClick={() => addRarityFilter(rarity)}
                      className={`px-3 py-1.5 rounded-md text-sm capitalize font-semibold border ${
                        active ? 'bg-cyan border-cyan text-navy' : 'bg-navy border-cyan-dim text-cream-muted'
                      }`}
                    >
                      {rarity}
                    </button>
                  );
                })}
                <button
                  onClick={() => setSelectedRarities([])}
                  className="px-3 py-1.5 rounded-md text-sm bg-navy border border-cyan-dim text-cream-muted"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="bg-navy-light rounded-xl p-5 border border-cyan-dim">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h2 className="text-xl font-semibold text-cream">Pool ({pool.length} cards)</h2>
              <p className="text-sm text-cream-muted">Filtered unique cards: {filteredPoolEntries.length}</p>
            </div>

            <div className="space-y-8">
              {filteredByType.map(({ type, entries }) => (
                <section key={type}>
                  <h3 className="text-lg font-bold text-cyan mb-3">{type} ({entries.length})</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {entries.map(({ card, count }) => {
                      const inDeck = deckCounts[card.id] ?? 0;
                      return (
                        <div key={card.id} className="bg-navy/80 rounded-lg p-2 border border-cyan-dim" onMouseEnter={() => setInspectCard(card)}>
                          <CardDisplay card={card} enableZoom={false} />
                          <div className="mt-2 text-xs text-cream-muted">
                            Pool: {count} | Deck: {inDeck}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => addToDeck(card.id, count)}
                              disabled={inDeck >= count}
                              className="flex-1 px-2 py-1.5 rounded bg-cyan hover:bg-cyan/90 disabled:opacity-40 text-xs font-semibold text-navy"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => removeFromDeck(card.id)}
                              disabled={inDeck === 0}
                              className="flex-1 px-2 py-1.5 rounded bg-magenta hover:bg-magenta/90 disabled:opacity-40 text-xs font-semibold text-cream"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {filteredPoolEntries.length === 0 && (
              <p className="text-center text-cream-muted mt-8">No cards match your current filters.</p>
            )}
          </div>

          <div className="bg-navy-light rounded-xl p-5 border border-cyan-dim">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-semibold text-cream">Deck ({deckTotal} cards)</h2>
              <button
                onClick={resetDeck}
                className="px-3 py-2 rounded-md text-sm bg-navy hover:bg-navy-light text-cream-muted border border-cyan-dim"
              >
                Reset Deck
              </button>
            </div>

            <div className="mb-5">
              <p className="text-sm text-cream-muted mb-2">Basic Lands (infinite pool)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {(Object.keys(BASIC_LAND_CARDS) as BasicLandName[]).map((land) => (
                  <div key={land} className="bg-navy/80 rounded-md p-2 border border-cyan-dim">
                    <p className="text-sm text-cream mb-2">{land} ({basicLandCounts[land]})</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => addBasicLand(land)}
                        className="flex-1 px-2 py-1 rounded bg-cyan hover:bg-cyan/90 text-navy text-xs font-semibold"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => removeBasicLand(land)}
                        disabled={basicLandCounts[land] === 0}
                        className="flex-1 px-2 py-1 rounded bg-magenta hover:bg-magenta/90 disabled:opacity-40 text-cream text-xs font-semibold"
                      >
                        -1
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {deckPoolEntries.map(({ card, count }) => (
                <button
                  key={card.id}
                  className="w-full bg-navy/80 rounded-md px-3 py-2 flex items-center justify-between text-left hover:bg-navy border border-cyan-dim"
                  onMouseEnter={() => setInspectCard(card)}
                  onClick={() => setInspectCard(card)}
                >
                  <span className="text-sm text-cream">{card.name}</span>
                  <span className="text-xs text-cream-muted">x{count}</span>
                </button>
              ))}
              {(Object.keys(basicLandCounts) as BasicLandName[])
                .filter((land) => basicLandCounts[land] > 0)
                .map((land) => (
                  <button
                    key={land}
                    className="w-full bg-navy/80 rounded-md px-3 py-2 flex items-center justify-between text-left hover:bg-navy border border-cyan-dim"
                    onMouseEnter={() => setInspectCard(BASIC_LAND_CARDS[land])}
                    onClick={() => setInspectCard(BASIC_LAND_CARDS[land])}
                  >
                    <span className="text-sm text-cream">{land}</span>
                    <span className="text-xs text-cream-muted">x{basicLandCounts[land]}</span>
                  </button>
                ))}
            </div>

            {deckTotal === 0 && (
              <p className="text-cream-muted text-sm mt-3">Add cards from pool and basics to start building your deck.</p>
            )}
          </div>

          <DeckStats deckCards={expandedDeckCards} basicLandCounts={basicLandCounts} />
          <DeckExporter deckCards={expandedDeckCards} />
      </div>
    </div>
  );
}
