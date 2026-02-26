/**
 * CardInspectorPanel — fixed right-side panel showing full card detail.
 * Click any card to populate. Fetches oracle text from Scryfall API by name.
 * Used as a React context so any card component can trigger it.
 */
import { createContext, useContext, useState, useCallback, useRef } from 'react';

interface InspectedCard {
  name: string;
  imageUri: string | null;
  instanceId: string;
}

interface OracleData {
  typeLine: string;
  oracleText: string;
  manaCost: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
}

interface InspectorCtx {
  inspect: (card: InspectedCard) => void;
  inspected: InspectedCard | null;
}

const InspectorContext = createContext<InspectorCtx>({
  inspect: () => {},
  inspected: null,
});

export function CardInspectorProvider({ children }: { children: React.ReactNode }) {
  const [inspected, setInspected] = useState<InspectedCard | null>(null);

  const inspect = useCallback((card: InspectedCard) => {
    setInspected(card);
  }, []);

  return (
    <InspectorContext.Provider value={{ inspect, inspected }}>
      {children}
    </InspectorContext.Provider>
  );
}

export function useCardInspector() {
  return useContext(InspectorContext);
}

// Cache oracle data by card name
const oracleCache = new Map<string, OracleData | null>();

function useOracleData(name: string | null) {
  const [data, setData] = useState<OracleData | null | 'loading'>(null);
  const fetchedFor = useRef<string | null>(null);

  if (name && fetchedFor.current !== name) {
    fetchedFor.current = name;

    if (oracleCache.has(name)) {
      const cached = oracleCache.get(name)!;
      if (data !== cached) setData(cached);
    } else {
      setData('loading');
      fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`)
        .then(r => r.json())
        .then(card => {
          const oracle: OracleData = {
            typeLine: card.type_line ?? '',
            oracleText: card.oracle_text ?? card.card_faces?.[0]?.oracle_text ?? '',
            manaCost: card.mana_cost ?? card.card_faces?.[0]?.mana_cost ?? '',
            power: card.power,
            toughness: card.toughness,
            loyalty: card.loyalty,
          };
          oracleCache.set(name, oracle);
          setData(oracle);
        })
        .catch(() => {
          oracleCache.set(name, null);
          setData(null);
        });
    }
  }

  return data;
}

export function CardInspectorPanel() {
  const { inspected } = useContext(InspectorContext);
  const oracle = useOracleData(inspected?.name ?? null);

  if (!inspected) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="w-16 h-24 rounded-lg border-2 border-dashed border-cyan-dim/20 mb-3 flex items-center justify-center">
          <span className="text-cream-muted/20 text-2xl">🃏</span>
        </div>
        <p className="text-cream-muted/30 text-xs">Click any card to inspect</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Card image — large */}
      <div className="rounded-lg overflow-hidden shadow-xl border border-white/5">
        {inspected.imageUri ? (
          <img
            src={inspected.imageUri}
            alt={inspected.name}
            className="w-full"
            style={{ aspectRatio: '63/88' }}
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full bg-navy-light flex items-center justify-center p-4" style={{ aspectRatio: '63/88' }}>
            <span className="text-cream text-sm text-center font-semibold">{inspected.name}</span>
          </div>
        )}
      </div>

      {/* Oracle data */}
      {oracle === 'loading' && (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-navy-light rounded w-2/3" />
          <div className="h-3 bg-navy-light rounded w-full" />
          <div className="h-3 bg-navy-light rounded w-5/6" />
          <div className="h-3 bg-navy-light rounded w-full" />
          <div className="h-3 bg-navy-light rounded w-3/4" />
        </div>
      )}

      {oracle && oracle !== 'loading' && (
        <div className="space-y-2">
          {/* Mana cost */}
          {oracle.manaCost && (
            <div className="flex items-center justify-between">
              <span className="text-cream-muted/60 text-[10px] uppercase tracking-wider">Cost</span>
              <span className="text-cream text-xs font-mono">{oracle.manaCost}</span>
            </div>
          )}

          {/* Type line */}
          <div>
            <p className="text-cream-muted/50 text-[9px] uppercase tracking-wider mb-0.5">Type</p>
            <p className="text-white text-xs leading-snug">{oracle.typeLine}</p>
          </div>

          {/* Oracle text */}
          {oracle.oracleText && (
            <div>
              <p className="text-cream-muted/50 text-[9px] uppercase tracking-wider mb-0.5">Text</p>
              <p className="text-white text-[11px] leading-relaxed whitespace-pre-line border-t border-white/5 pt-2">
                {oracle.oracleText}
              </p>
            </div>
          )}

          {/* P/T or Loyalty */}
          {(oracle.power != null || oracle.loyalty != null) && (
            <div className="flex gap-2 pt-1 border-t border-white/5">
              {oracle.power != null && (
                <span className="text-xs font-bold text-cream bg-navy-light px-2 py-0.5 rounded border border-cyan-dim">
                  {oracle.power}/{oracle.toughness}
                </span>
              )}
              {oracle.loyalty != null && (
                <span className="text-xs font-bold text-magenta bg-navy-light px-2 py-0.5 rounded border border-magenta/30">
                  ◆ {oracle.loyalty}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
