import { useEffect, useMemo, useState } from 'react';
import { computeDeckStats } from '../../utils/deckSummary';
import { getCachedOracle, parseCmcFromManaCost, prefetchOracles } from '../../utils/scryfallOracle';
import type { DeckCardEntry, DeckRecord } from '../../types/deck';

interface DeckStatsPanelProps {
  deck: DeckRecord;
}

const COLOR_META: { key: string; label: string; bg: string; text: string }[] = [
  { key: 'W', label: 'W', bg: 'bg-yellow-100', text: 'text-yellow-900' },
  { key: 'U', label: 'U', bg: 'bg-blue-400',   text: 'text-white' },
  { key: 'B', label: 'B', bg: 'bg-gray-700',   text: 'text-white' },
  { key: 'R', label: 'R', bg: 'bg-red-500',     text: 'text-white' },
  { key: 'G', label: 'G', bg: 'bg-green-600',   text: 'text-white' },
];

function getCardCmc(entry: DeckCardEntry): number {
  const oracle = getCachedOracle(entry.cardName);
  if (!oracle) return 0;
  if (oracle.cmc != null) return Math.min(oracle.cmc, 7);
  return Math.min(parseCmcFromManaCost(oracle.manaCost), 7);
}

function isLand(entry: DeckCardEntry): boolean {
  const oracle = getCachedOracle(entry.cardName);
  return oracle?.typeLine.toLowerCase().includes('land') ?? false;
}

function getCardColors(entry: DeckCardEntry): string[] {
  const oracle = getCachedOracle(entry.cardName);
  return oracle?.colors ?? [];
}

export default function DeckStatsPanel({ deck }: DeckStatsPanelProps) {
  const stats = computeDeckStats(deck);
  const [oracleReady, setOracleReady] = useState(false);

  const allEntries = useMemo(() => [
    ...deck.commander,
    ...deck.mainboard,
    ...deck.sideboard,
  ], [deck.commander, deck.mainboard, deck.sideboard]);

  const allNames = useMemo(() => (
    [...new Set(allEntries.map(e => e.cardName))]
  ), [allEntries]);

  useEffect(() => {
    if (allNames.length === 0) {
      setOracleReady(true);
      return;
    }
    setOracleReady(false);
    prefetchOracles(allNames).then(() => setOracleReady(true));
  }, [allNames]);

  // Mana curve (non-lands, CMC 0–7+)
  const curve = useMemo(() => {
    if (!oracleReady) return Array(8).fill(0) as number[];
    const buckets: number[] = Array(8).fill(0);
    for (const entry of allEntries) {
      if (isLand(entry)) continue;
      const cmc = getCardCmc(entry);
      buckets[cmc] += entry.count;
    }
    return buckets;
  }, [allEntries, oracleReady]);

  const maxBucket = Math.max(...curve, 1);

  // Color distribution
  const colorCounts = useMemo(() => {
    if (!oracleReady) return { W: 0, U: 0, B: 0, R: 0, G: 0 };
    const counts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    for (const entry of allEntries) {
      if (isLand(entry)) continue;
      for (const color of getCardColors(entry)) {
        if (color in counts) counts[color] += entry.count;
      }
    }
    return counts;
  }, [allEntries, oracleReady]);

  const totalPips = Object.values(colorCounts).reduce((a, b) => a + b, 0) || 1;

  // Land / non-land split
  const { landCount, nonLandCount } = useMemo(() => {
    if (!oracleReady) return { landCount: 0, nonLandCount: 0 };
    let lands = 0;
    let nonLands = 0;
    for (const entry of allEntries) {
      if (isLand(entry)) {
        lands += entry.count;
      } else {
        nonLands += entry.count;
      }
    }
    return { landCount: lands, nonLandCount: nonLands };
  }, [allEntries, oracleReady]);

  return (
    <div className="bg-navy-light rounded-xl p-4 border border-cyan-dim space-y-4">
      <h3 className="text-lg font-semibold text-cream">Deck Stats</h3>

      {!oracleReady && allNames.length > 0 ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-navy rounded w-2/3" />
          <div className="h-20 bg-navy rounded" />
          <div className="h-3 bg-navy rounded w-1/2" />
          <div className="h-8 bg-navy rounded" />
        </div>
      ) : (
        <>
          {/* Mana Curve */}
          {allEntries.length > 0 && (
            <div>
              <p className="text-sm text-cream-muted mb-2">Mana Curve (non-lands)</p>
              <div className="flex items-end gap-1.5 h-20">
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
            </div>
          )}

          {/* Color Distribution */}
          {allEntries.length > 0 && (
            <div>
              <p className="text-sm text-cream-muted mb-2">Color Split</p>
              <div className="flex gap-3 flex-wrap">
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
            </div>
          )}

          {/* Quick health line */}
          {allEntries.length > 0 && (
            <div className="pt-3 border-t border-cyan-dim flex flex-wrap gap-4 text-xs text-cream-muted">
              <span>Total: <span className="font-bold text-cyan">{stats.totalCards}</span></span>
              <span>Non-lands: <span className="text-cream font-bold">{nonLandCount}</span></span>
              <span>Lands: <span className="text-cream font-bold">{landCount}</span></span>
            </div>
          )}
        </>
      )}

      {/* Section counts grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-navy p-3 border border-cyan-dim">
          <p className="text-cream-muted text-xs uppercase tracking-wide">Commander</p>
          <p className="text-cream font-bold text-xl">{stats.commanderCount}</p>
        </div>
        <div className="rounded-lg bg-navy p-3 border border-cyan-dim">
          <p className="text-cream-muted text-xs uppercase tracking-wide">Mainboard</p>
          <p className="text-cream font-bold text-xl">{stats.mainboardCount}</p>
        </div>
        <div className="rounded-lg bg-navy p-3 border border-cyan-dim">
          <p className="text-cream-muted text-xs uppercase tracking-wide">Sideboard</p>
          <p className="text-cream font-bold text-xl">{stats.sideboardCount}</p>
        </div>
        <div className="rounded-lg bg-navy p-3 border border-cyan-dim">
          <p className="text-cream-muted text-xs uppercase tracking-wide">Maybeboard</p>
          <p className="text-cream font-bold text-xl">{stats.maybeboardCount}</p>
        </div>
      </div>
    </div>
  );
}
