import type { DeckCardEntry, DeckSection } from '../../types/deck';

interface DeckSectionViewProps {
  title: string;
  section: DeckSection;
  entries: DeckCardEntry[];
  onIncrement: (section: DeckSection, cardName: string) => void;
  onDecrement: (section: DeckSection, cardName: string) => void;
  onRemove: (section: DeckSection, cardName: string) => void;
}

export default function DeckSectionView({
  title,
  section,
  entries,
  onIncrement,
  onDecrement,
  onRemove,
}: DeckSectionViewProps) {
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="bg-navy-light rounded-xl border border-cyan-dim overflow-hidden">
      <div className="px-4 py-3 border-b border-cyan-dim flex items-center justify-between">
        <h3 className="text-lg font-semibold text-cream">{title}</h3>
        <span className="text-xs text-cream-muted">{total} cards</span>
      </div>

      {entries.length === 0 ? (
        <p className="px-4 py-6 text-sm text-cream-muted">No cards in this section yet.</p>
      ) : (
        <div className="divide-y divide-cyan-dim/40">
          {entries.map(entry => (
            <div key={`${section}-${entry.cardName}`} className="px-4 py-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-cream truncate">{entry.cardName}</p>
                {entry.preferredPrinting && (
                  <p className="text-xs text-cyan truncate">
                    {entry.preferredPrinting.setName} ({entry.preferredPrinting.set.toUpperCase()}) #{entry.preferredPrinting.collectorNumber}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onDecrement(section, entry.cardName)}
                  className="w-7 h-7 rounded-md bg-navy hover:bg-navy-light border border-cyan-dim text-cream"
                >
                  -
                </button>
                <span className="w-9 text-center text-sm font-bold text-cream">{entry.count}</span>
                <button
                  onClick={() => onIncrement(section, entry.cardName)}
                  className="w-7 h-7 rounded-md bg-cyan hover:bg-cyan/90 text-navy font-bold"
                >
                  +
                </button>
                <button
                  onClick={() => onRemove(section, entry.cardName)}
                  className="ml-2 px-2 py-1 rounded-md bg-magenta/20 hover:bg-magenta/30 border border-magenta/40 text-magenta text-xs font-semibold"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
