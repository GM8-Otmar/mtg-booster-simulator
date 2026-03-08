import { useEffect, useMemo, useState } from 'react';
import { useCardInspector } from '../game/CardInspectorPanel';
import { getCachedOracle, prefetchOracles } from '../../utils/scryfallOracle';
import type { DeckCardEntry, DeckSection, PreferredPrinting } from '../../types/deck';

interface DeckSectionViewProps {
  title: string;
  section: DeckSection;
  entries: DeckCardEntry[];
  fallbackPrintings?: Record<string, PreferredPrinting | null>;
  canAddCommanderFromContext?: boolean;
  searchable?: boolean;
  onIncrement: (section: DeckSection, cardName: string) => void;
  onDecrement: (section: DeckSection, cardName: string) => void;
  onRemove: (section: DeckSection, cardName: string) => void;
  onChoosePrinting: (section: DeckSection, cardName: string) => void;
  onClearPrinting: (section: DeckSection, cardName: string) => void;
  onSetAsCommander?: (section: DeckSection, cardName: string) => void;
  onRemoveCommander?: (cardName: string) => void;
}

export default function DeckSectionView({
  title,
  section,
  entries,
  fallbackPrintings = {},
  canAddCommanderFromContext = false,
  searchable = false,
  onIncrement,
  onDecrement,
  onRemove,
  onChoosePrinting,
  onClearPrinting,
  onSetAsCommander,
  onRemoveCommander,
}: DeckSectionViewProps) {
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  const { inspect, hoverInspect, clearHoverInspect } = useCardInspector();
  const [menu, setMenu] = useState<{ cardName: string; x: number; y: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [oracleReady, setOracleReady] = useState(false);

  // Prefetch oracle data for all cards in the section so type/text search works
  useEffect(() => {
    if (!searchable || entries.length === 0) return;
    const names = entries.map(e => e.cardName);
    const allCached = names.every(n => getCachedOracle(n) !== undefined);
    if (allCached) { setOracleReady(true); return; }
    prefetchOracles(names).then(() => setOracleReady(true)).catch(() => setOracleReady(true));
  }, [searchable, entries]);

  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) return entries;
    const q = searchTerm.toLowerCase().trim();

    // Score each entry: name > type line > oracle text (same logic as LibrarySearchOverlay)
    const scored = entries.map(entry => {
      const name = entry.cardName.toLowerCase();
      // Name matches — highest priority
      if (name === q) return { entry, score: 10 };
      if (name.startsWith(q)) return { entry, score: 8 };
      if (name.includes(q)) return { entry, score: 6 };

      // Type line + oracle text from cached Scryfall data
      const oracle = getCachedOracle(entry.cardName);
      if (oracle) {
        const typeLine = oracle.typeLine.toLowerCase();
        if (typeLine === q) return { entry, score: 5 };
        if (typeLine.includes(q)) return { entry, score: 4 };

        const oracleText = oracle.oracleText.toLowerCase();
        if (oracleText.includes(q)) return { entry, score: 2 };
      }

      return { entry, score: 0 };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score || a.entry.cardName.localeCompare(b.entry.cardName))
      .map(s => s.entry);
  }, [entries, searchTerm, oracleReady]);

  return (
    <div
      className="bg-navy-light rounded-xl border border-cyan-dim overflow-hidden relative"
      onClick={() => setMenu(null)}
    >
      <div className="px-4 py-3 border-b border-cyan-dim flex items-center justify-between">
        <h3 className="text-lg font-semibold text-cream">{title}</h3>
        <span className="text-xs text-cream-muted">{total} cards</span>
      </div>

      {searchable && entries.length > 0 && (
        <div className="px-4 pt-3 pb-1">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Name, type, or rules text…"
            className="w-full bg-navy border border-cyan-dim rounded-lg px-3 py-1.5 text-cream text-xs placeholder-cream-muted/40 focus:outline-none focus:border-cyan"
          />
          {searchTerm.trim() && (
            <p className="text-[10px] text-cream-muted mt-1">
              Showing {filteredEntries.length} of {entries.length} cards
            </p>
          )}
        </div>
      )}

      {entries.length === 0 ? (
        <p className="px-4 py-6 text-sm text-cream-muted">No cards in this section yet.</p>
      ) : filteredEntries.length === 0 ? (
        <p className="px-4 py-6 text-sm text-cream-muted">No cards match &ldquo;{searchTerm}&rdquo;</p>
      ) : (
        <div className="divide-y divide-cyan-dim/40">
          {filteredEntries.map(entry => {
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
                onMouseEnter={() => { inspect(inspectCard); hoverInspect(inspectCard); }}
                onMouseLeave={clearHoverInspect}
                onContextMenu={event => {
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
                </div>
              </div>
            );
          })}
        </div>
      )}

      {menu && (
        <div
          className="fixed z-50 min-w-[180px] rounded-lg border border-cyan-dim bg-navy-light shadow-xl py-1"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            onClick={() => {
              onChoosePrinting(section, menu.cardName);
              setMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-cream hover:bg-navy transition-colors"
          >
            Pick Art
          </button>

          {section !== 'commander' && canAddCommanderFromContext && onSetAsCommander && (
            <button
              onClick={() => {
                onSetAsCommander(section, menu.cardName);
                setMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-sm text-cyan hover:bg-navy transition-colors"
            >
              Set as Commander
            </button>
          )}

          {section === 'commander' && onRemoveCommander && (
            <button
              onClick={() => {
                onRemoveCommander(menu.cardName);
                setMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-sm text-magenta hover:bg-navy transition-colors"
            >
              Remove Commander
            </button>
          )}

          <button
            onClick={() => {
              onRemove(section, menu.cardName);
              setMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-magenta hover:bg-navy transition-colors"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
