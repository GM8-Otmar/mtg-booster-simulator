import { useEffect, useMemo, useRef, useState } from 'react';
import { useCardInspector } from '../game/CardInspectorPanel';
import type { ScryfallCard, ScryfallSet } from '../../types/card';
import { getCardImageUrl } from '../../types/card';
import { fetchSets } from '../../api/scryfall';

// ── Filter helpers ──────────────────────────────────────────────────────────

const COLOR_FILTER_META: { key: string; label: string; bg: string; text: string; ring: string }[] = [
  { key: 'W', label: 'W', bg: 'bg-yellow-100', text: 'text-yellow-900', ring: 'ring-yellow-300' },
  { key: 'U', label: 'U', bg: 'bg-blue-400',   text: 'text-white',      ring: 'ring-blue-300' },
  { key: 'B', label: 'B', bg: 'bg-gray-700',   text: 'text-white',      ring: 'ring-gray-400' },
  { key: 'R', label: 'R', bg: 'bg-red-500',     text: 'text-white',      ring: 'ring-red-300' },
  { key: 'G', label: 'G', bg: 'bg-green-600',   text: 'text-white',      ring: 'ring-green-300' },
  { key: 'C', label: 'C', bg: 'bg-gray-400',   text: 'text-gray-900',   ring: 'ring-gray-300' },
];

const CARD_TYPES = [
  { value: '', label: 'Any' },
  { value: 'creature', label: 'Creature' },
  { value: 'instant', label: 'Instant' },
  { value: 'sorcery', label: 'Sorcery' },
  { value: 'enchantment', label: 'Enchantment' },
  { value: 'artifact', label: 'Artifact' },
  { value: 'planeswalker', label: 'Planeswalker' },
  { value: 'land', label: 'Land' },
  { value: 'battle', label: 'Battle' },
];

function buildSearchQuery(
  baseQuery: string,
  filters: {
    colors: Set<string>;
    cmc: string;
    type: string;
    subtype: string;
    set: string;
  },
): string {
  const parts = [baseQuery.trim()];

  if (filters.colors.size > 0) {
    const colorStr = [...filters.colors].join('').toLowerCase();
    parts.push(`c:${colorStr}`);
  }

  if (filters.cmc) {
    parts.push(filters.cmc === '7+' ? 'cmc>=7' : `cmc=${filters.cmc}`);
  }

  if (filters.type) {
    parts.push(`t:${filters.type}`);
  }

  if (filters.subtype.trim()) {
    parts.push(`t:${filters.subtype.trim()}`);
  }

  if (filters.set) {
    parts.push(`set:${filters.set}`);
  }

  return parts.filter(Boolean).join(' ');
}

// ── Component ───────────────────────────────────────────────────────────────

interface DeckSearchPanelProps {
  loading: boolean;
  results: ScryfallCard[];
  onSearch: (query: string) => void;
  onAddToMainboard: (card: ScryfallCard) => void;
  onAddToSideboard: (card: ScryfallCard) => void;
  onAddToMaybeboard: (card: ScryfallCard) => void;
  onSetCommander: (card: ScryfallCard) => void;
  canSetCommander: boolean;
}

export default function DeckSearchPanel({
  loading,
  results,
  onSearch,
  onAddToMainboard,
  onAddToSideboard,
  onAddToMaybeboard,
  onSetCommander,
  canSetCommander,
}: DeckSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(true);
  const { inspect, hoverInspect, clearHoverInspect } = useCardInspector();

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [colorFilters, setColorFilters] = useState<Set<string>>(new Set());
  const [cmcFilter, setCmcFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [subtypeFilter, setSubtypeFilter] = useState('');

  // Set filter
  const [setFilter, setSetFilter] = useState('');
  const [setSearch, setSetSearch] = useState('');
  const [allSets, setAllSets] = useState<ScryfallSet[]>([]);
  const [setsLoading, setSetsLoading] = useState(false);
  const [showSetDropdown, setShowSetDropdown] = useState(false);
  const setDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch sets when filters are first opened
  useEffect(() => {
    if (!showFilters || allSets.length > 0) return;
    setSetsLoading(true);
    fetchSets()
      .then(sets => setAllSets(sets))
      .catch(() => {})
      .finally(() => setSetsLoading(false));
  }, [showFilters, allSets.length]);

  // Close set dropdown on outside click
  useEffect(() => {
    if (!showSetDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (setDropdownRef.current && !setDropdownRef.current.contains(e.target as Node)) {
        setShowSetDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSetDropdown]);

  const filteredSets = useMemo(() => {
    if (!setSearch.trim()) return allSets;
    const lower = setSearch.toLowerCase();
    return allSets.filter(s =>
      s.name.toLowerCase().includes(lower) ||
      s.code.toLowerCase().includes(lower),
    );
  }, [allSets, setSearch]);

  const toggleColor = (color: string) => {
    setColorFilters(current => {
      const next = new Set(current);
      if (next.has(color)) {
        next.delete(color);
      } else {
        next.add(color);
      }
      return next;
    });
  };

  const hasActiveFilters = colorFilters.size > 0 || cmcFilter || typeFilter || subtypeFilter.trim() || setFilter;

  const handleSearchWithFilters = () => {
    const fullQuery = buildSearchQuery(query, {
      colors: colorFilters,
      cmc: cmcFilter,
      type: typeFilter,
      subtype: subtypeFilter,
      set: setFilter,
    });
    onSearch(fullQuery);
  };

  const clearAllFilters = () => {
    setColorFilters(new Set());
    setCmcFilter('');
    setTypeFilter('');
    setSubtypeFilter('');
    setSetFilter('');
    setSetSearch('');
  };

  const visibleResults = useMemo(() => results.slice(0, 24), [results]);

  const selectStyle = 'bg-navy border border-cyan-dim rounded-lg px-2 py-1.5 text-cream text-xs focus:outline-none focus:border-cyan';

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
          {/* Search bar */}
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') handleSearchWithFilters();
              }}
              placeholder="Search Scryfall-backed cards..."
              className="flex-1 bg-navy border border-cyan-dim rounded-lg px-3 py-2 text-cream text-sm placeholder-cream-muted/40 focus:outline-none focus:border-cyan"
            />
            <button
              onClick={handleSearchWithFilters}
              className="px-4 py-2 bg-cyan hover:bg-cyan/90 rounded-lg font-bold text-navy text-sm transition-all"
            >
              Search
            </button>
          </div>

          {/* Filter toggle */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setShowFilters(v => !v)}
              className="text-xs text-cyan font-semibold hover:text-cyan/80 transition-colors"
            >
              {showFilters ? '▾ Hide Filters' : '▸ Show Filters'}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-magenta font-semibold hover:text-magenta/80 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="space-y-3 mb-4 p-3 bg-navy rounded-lg border border-cyan-dim">
              {/* Colors */}
              <div>
                <label className="text-[10px] text-cream-muted uppercase tracking-wide block mb-1.5">Colors</label>
                <div className="flex gap-2">
                  {COLOR_FILTER_META.map(({ key, label, bg, text, ring }) => (
                    <button
                      key={key}
                      onClick={() => toggleColor(key)}
                      className={`w-8 h-8 rounded-full ${bg} ${text} flex items-center justify-center text-xs font-bold transition-all ${
                        colorFilters.has(key) ? `ring-2 ${ring} scale-110` : 'opacity-60 hover:opacity-80'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CMC + Type row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-cream-muted uppercase tracking-wide block mb-1">CMC</label>
                  <select value={cmcFilter} onChange={e => setCmcFilter(e.target.value)} className={selectStyle}>
                    <option value="">Any</option>
                    {[0, 1, 2, 3, 4, 5, 6].map(n => <option key={n} value={String(n)}>{n}</option>)}
                    <option value="7+">7+</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-cream-muted uppercase tracking-wide block mb-1">Type</label>
                  <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectStyle}>
                    {CARD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Subtype */}
              <div>
                <label className="text-[10px] text-cream-muted uppercase tracking-wide block mb-1">Subtype / Tribe</label>
                <input
                  type="text"
                  value={subtypeFilter}
                  onChange={e => setSubtypeFilter(e.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') handleSearchWithFilters();
                  }}
                  placeholder="e.g. elf, dragon, wizard..."
                  className="w-full bg-navy-light border border-cyan-dim rounded-lg px-2 py-1.5 text-cream text-xs placeholder-cream-muted/40 focus:outline-none focus:border-cyan"
                />
              </div>

              {/* Set filter */}
              <div ref={setDropdownRef}>
                <label className="text-[10px] text-cream-muted uppercase tracking-wide block mb-1">Set</label>
                <div className="relative">
                  <input
                    type="text"
                    value={setFilter ? setSearch || setFilter.toUpperCase() : setSearch}
                    onChange={e => {
                      setSetSearch(e.target.value);
                      setShowSetDropdown(true);
                      if (setFilter) {
                        setSetFilter('');
                      }
                    }}
                    onFocus={() => setShowSetDropdown(true)}
                    placeholder={setsLoading ? 'Loading sets...' : 'Search sets...'}
                    className="w-full bg-navy-light border border-cyan-dim rounded-lg px-2 py-1.5 text-cream text-xs placeholder-cream-muted/40 focus:outline-none focus:border-cyan"
                  />
                  {setFilter && (
                    <button
                      onClick={() => { setSetFilter(''); setSetSearch(''); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-cream-muted text-xs hover:text-magenta"
                    >
                      ✕
                    </button>
                  )}
                  {showSetDropdown && !setsLoading && (
                    <div className="absolute z-50 w-full mt-1 max-h-40 overflow-y-auto bg-navy-light border border-cyan-dim rounded-lg shadow-xl">
                      {filteredSets.length === 0 && (
                        <p className="px-3 py-2 text-xs text-cream-muted">No sets found</p>
                      )}
                      {filteredSets.slice(0, 50).map(set => (
                        <button
                          key={set.code}
                          onClick={() => {
                            setSetFilter(set.code);
                            setSetSearch(set.name);
                            setShowSetDropdown(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-cream hover:bg-navy transition-colors"
                        >
                          <span className="font-semibold text-cyan">{set.code.toUpperCase()}</span>
                          {' '}{set.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {loading && (
            <p className="text-cream-muted text-sm">Searching...</p>
          )}

          {!loading && visibleResults.length === 0 && results.length === 0 && query.trim() === '' && (
            <p className="text-cream-muted text-sm">Search for cards to start building manually.</p>
          )}

          {!loading && visibleResults.length === 0 && query.trim() !== '' && (
            <p className="text-cream-muted text-sm">No results found. Try a different search or adjust your filters.</p>
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
                  onMouseEnter={() => { inspect(inspectCard); hoverInspect(inspectCard); }}
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
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <button
                          onClick={event => {
                            event.stopPropagation();
                            onAddToMainboard(card);
                          }}
                          className="px-2 py-1 bg-cyan hover:bg-cyan/90 rounded-md text-[11px] font-semibold text-navy transition-colors"
                        >
                          Main
                        </button>
                        <button
                          onClick={event => {
                            event.stopPropagation();
                            onAddToSideboard(card);
                          }}
                          className="px-2 py-1 bg-navy-light hover:bg-navy border border-cyan-dim rounded-md text-[11px] font-semibold text-cream transition-colors"
                        >
                          Side
                        </button>
                        <button
                          onClick={event => {
                            event.stopPropagation();
                            onAddToMaybeboard(card);
                          }}
                          className="px-2 py-1 bg-navy-light hover:bg-navy border border-cyan-dim/60 rounded-md text-[11px] font-semibold text-cream-muted transition-colors"
                        >
                          Maybe
                        </button>
                        {canSetCommander && (
                          <button
                            onClick={event => {
                              event.stopPropagation();
                              onSetCommander(card);
                            }}
                            className="px-2 py-1 bg-magenta/20 hover:bg-magenta/30 border border-magenta/50 rounded-md text-[11px] font-semibold text-magenta transition-colors"
                          >
                            Commander
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
