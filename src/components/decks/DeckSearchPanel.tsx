import { useMemo, useState } from 'react';
import { useCardInspector } from '../game/CardInspectorPanel';
import type { ScryfallCard } from '../../types/card';
import { getCardImageUrl } from '../../types/card';

interface DeckSearchPanelProps {
  loading: boolean;
  results: ScryfallCard[];
  onSearch: (query: string) => void;
  onAddToMainboard: (card: ScryfallCard) => void;
  onAddToSideboard: (card: ScryfallCard) => void;
  onSetCommander: (card: ScryfallCard) => void;
  canSetCommander: boolean;
}

export default function DeckSearchPanel({
  loading,
  results,
  onSearch,
  onAddToMainboard,
  onAddToSideboard,
  onSetCommander,
  canSetCommander,
}: DeckSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(true);
  const { inspect, hoverInspect, clearHoverInspect } = useCardInspector();

  const visibleResults = useMemo(() => results.slice(0, 24), [results]);

  return (
    <div className="bg-navy-light rounded-xl border border-cyan-dim overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(value => !value)}
        className="w-full px-4 py-3 flex items-center justify-between text-left border-b border-cyan-dim"
      >
        <div>
          <h2 className="text-xl font-semibold text-cream">Card Search</h2>
          <p className="text-xs text-cream-muted mt-1">
            {collapsed ? 'Collapsed until you need it.' : 'Search Scryfall and add cards.'}
          </p>
        </div>
        <span className="text-cyan text-sm font-semibold">{collapsed ? 'Show' : 'Hide'}</span>
      </button>

      {!collapsed && (
        <div className="p-4 flex flex-col h-[78vh]">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') onSearch(query);
              }}
              placeholder="Search Scryfall-backed cards..."
              className="flex-1 bg-navy border border-cyan-dim rounded-lg px-3 py-2 text-cream text-sm placeholder-cream-muted/40 focus:outline-none focus:border-cyan"
            />
            <button
              onClick={() => onSearch(query)}
              className="px-4 py-2 bg-cyan hover:bg-cyan/90 rounded-lg font-bold text-navy text-sm transition-all"
            >
              Search
            </button>
          </div>

          {loading && (
            <p className="text-cream-muted text-sm">Searching...</p>
          )}

          {!loading && visibleResults.length === 0 && (
            <p className="text-cream-muted text-sm">Search for cards to start building manually.</p>
          )}

          <div className="space-y-3 overflow-y-auto pr-1 min-h-0">
            {visibleResults.map(card => {
              const smallImageUrl = getCardImageUrl(card, 'small');
              const inspectCard = {
                name: card.name,
                imageUri: getCardImageUrl(card, 'normal'),
                instanceId: `deck-search-${card.id}`,
                backImageUri: card.card_faces?.[1]?.image_uris?.normal ?? null,
                backName: card.card_faces?.[1]?.name ?? null,
              };

              return (
                <div
                  key={`${card.id}-${card.collector_number}`}
                  className="bg-navy rounded-lg border border-cyan-dim p-3 cursor-pointer"
                  onClick={() => inspect(inspectCard)}
                  onMouseEnter={() => hoverInspect(inspectCard)}
                  onMouseLeave={clearHoverInspect}
                >
                  <div className="flex gap-3">
                    <div className="w-16 shrink-0">
                      {smallImageUrl ? (
                        <img src={smallImageUrl} alt={card.name} className="w-16 rounded-md" />
                      ) : (
                        <div className="w-16 h-22 rounded-md bg-navy-light border border-cyan-dim flex items-center justify-center text-[10px] text-cream-muted text-center px-1">
                          {card.name}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-cream font-semibold text-sm truncate">{card.name}</p>
                      <p className="text-cream-muted text-xs truncate">{card.type_line}</p>
                      <p className="text-cyan text-xs mt-1">
                        {card.set_name} ({card.set.toUpperCase()}) #{card.collector_number}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          onClick={event => {
                            event.stopPropagation();
                            onAddToMainboard(card);
                          }}
                          className="px-2.5 py-1.5 bg-cyan hover:bg-cyan/90 rounded-md text-xs font-semibold text-navy transition-colors"
                        >
                          Add Main
                        </button>
                        <button
                          onClick={event => {
                            event.stopPropagation();
                            onAddToSideboard(card);
                          }}
                          className="px-2.5 py-1.5 bg-navy-light hover:bg-navy border border-cyan-dim rounded-md text-xs font-semibold text-cream transition-colors"
                        >
                          Add Side
                        </button>
                        {canSetCommander && (
                          <button
                            onClick={event => {
                              event.stopPropagation();
                              onSetCommander(card);
                            }}
                            className="px-2.5 py-1.5 bg-magenta/20 hover:bg-magenta/30 border border-magenta/50 rounded-md text-xs font-semibold text-magenta transition-colors"
                          >
                            Set Commander
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
