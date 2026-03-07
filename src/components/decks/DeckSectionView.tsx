import { useState } from 'react';
import { useCardInspector } from '../game/CardInspectorPanel';
import type { DeckCardEntry, DeckSection, PreferredPrinting } from '../../types/deck';

interface DeckSectionViewProps {
  title: string;
  section: DeckSection;
  entries: DeckCardEntry[];
  fallbackPrintings?: Record<string, PreferredPrinting | null>;
  canAddCommanderFromContext?: boolean;
  onIncrement: (section: DeckSection, cardName: string) => void;
  onDecrement: (section: DeckSection, cardName: string) => void;
  onRemove: (section: DeckSection, cardName: string) => void;
  onChoosePrinting: (section: DeckSection, cardName: string) => void;
  onClearPrinting: (section: DeckSection, cardName: string) => void;
  onSetAsCommander?: (section: DeckSection, cardName: string) => void;
}

export default function DeckSectionView({
  title,
  section,
  entries,
  fallbackPrintings = {},
  canAddCommanderFromContext = false,
  onIncrement,
  onDecrement,
  onRemove,
  onChoosePrinting,
  onClearPrinting,
  onSetAsCommander,
}: DeckSectionViewProps) {
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  const { inspect, hoverInspect, clearHoverInspect } = useCardInspector();
  const [menu, setMenu] = useState<{ cardName: string; x: number; y: number } | null>(null);

  return (
    <div
      className="bg-navy-light rounded-xl border border-cyan-dim overflow-hidden relative"
      onClick={() => setMenu(null)}
    >
      <div className="px-4 py-3 border-b border-cyan-dim flex items-center justify-between">
        <h3 className="text-lg font-semibold text-cream">{title}</h3>
        <span className="text-xs text-cream-muted">{total} cards</span>
      </div>

      {entries.length === 0 ? (
        <p className="px-4 py-6 text-sm text-cream-muted">No cards in this section yet.</p>
      ) : (
        <div className="divide-y divide-cyan-dim/40">
          {entries.map(entry => {
            const displayPrinting = entry.preferredPrinting ?? fallbackPrintings[entry.cardName.toLowerCase()] ?? null;
            const inspectCard = {
              name: entry.cardName,
              imageUri: displayPrinting?.imageUri ?? null,
              instanceId: `deck-row-${section}-${entry.cardName}`,
              backImageUri: displayPrinting?.backImageUri ?? null,
              backName: displayPrinting?.backName ?? null,
            };

            return (
              <div
                key={`${section}-${entry.cardName}`}
                className="px-4 py-3 flex items-center gap-3 cursor-pointer"
                onClick={() => inspect(inspectCard)}
                onMouseEnter={() => hoverInspect(inspectCard)}
                onMouseLeave={clearHoverInspect}
                onContextMenu={event => {
                  if (!canAddCommanderFromContext || !onSetAsCommander) return;
                  event.preventDefault();
                  setMenu({ cardName: entry.cardName, x: event.clientX, y: event.clientY });
                }}
              >
                <div className="w-10 h-14 shrink-0 rounded-md overflow-hidden border border-cyan-dim bg-navy flex items-center justify-center">
                  {displayPrinting?.imageUri ? (
                    <img src={displayPrinting.imageUri} alt={entry.cardName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[9px] text-cream-muted text-center px-1">{entry.cardName}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-cream truncate">{entry.cardName}</p>
                  {displayPrinting && (
                    <p className="text-xs text-cyan truncate">
                      {displayPrinting.setName} ({displayPrinting.set.toUpperCase()}) #{displayPrinting.collectorNumber}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  <button
                    onClick={event => {
                      event.stopPropagation();
                      onChoosePrinting(section, entry.cardName);
                    }}
                    className="px-2 py-1 rounded-md bg-navy hover:bg-navy-light border border-cyan-dim text-cyan text-xs font-semibold"
                  >
                    {entry.preferredPrinting ? 'Art' : 'Pick Art'}
                  </button>
                  {entry.preferredPrinting && (
                    <button
                      onClick={event => {
                        event.stopPropagation();
                        onClearPrinting(section, entry.cardName);
                      }}
                      className="px-2 py-1 rounded-md bg-navy hover:bg-navy-light border border-cyan-dim text-cream-muted text-xs font-semibold"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={event => {
                      event.stopPropagation();
                      onDecrement(section, entry.cardName);
                    }}
                    className="w-7 h-7 rounded-md bg-navy hover:bg-navy-light border border-cyan-dim text-cream"
                  >
                    -
                  </button>
                  <span className="w-9 text-center text-sm font-bold text-cream">{entry.count}</span>
                  <button
                    onClick={event => {
                      event.stopPropagation();
                      onIncrement(section, entry.cardName);
                    }}
                    className="w-7 h-7 rounded-md bg-cyan hover:bg-cyan/90 text-navy font-bold"
                  >
                    +
                  </button>
                  <button
                    onClick={event => {
                      event.stopPropagation();
                      onRemove(section, entry.cardName);
                    }}
                    className="px-2 py-1 rounded-md bg-magenta/20 hover:bg-magenta/30 border border-magenta/40 text-magenta text-xs font-semibold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {menu && canAddCommanderFromContext && onSetAsCommander && (
        <div
          className="fixed z-50 min-w-[160px] rounded-lg border border-cyan-dim bg-navy-light shadow-xl py-1"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            onClick={() => {
              onSetAsCommander(section, menu.cardName);
              setMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-magenta hover:bg-navy transition-colors"
          >
            Add as Commander
          </button>
        </div>
      )}
    </div>
  );
}
