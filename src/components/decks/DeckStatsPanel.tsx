import { computeDeckStats } from '../../utils/deckSummary';
import type { DeckRecord } from '../../types/deck';

interface DeckStatsPanelProps {
  deck: DeckRecord;
}

export default function DeckStatsPanel({ deck }: DeckStatsPanelProps) {
  const stats = computeDeckStats(deck);

  return (
    <div className="bg-navy-light rounded-xl p-4 border border-cyan-dim">
      <h3 className="text-lg font-semibold text-cream mb-3">Deck Stats</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-navy p-3 border border-cyan-dim">
          <p className="text-cream-muted text-xs uppercase tracking-wide">Total</p>
          <p className="text-cream font-bold text-xl">{stats.totalCards}</p>
        </div>
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
      </div>
    </div>
  );
}
