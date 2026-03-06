/**
 * CardHoverInspector — floating card preview overlay.
 * Fixed top-right, large & readable, triggered by hover.
 * pointer-events-none so it never captures mouse events.
 */
import { useCardInspector, useOracleData } from './CardInspectorPanel';

export default function CardHoverInspector() {
  const { hoveredCard } = useCardInspector();
  const oracle = useOracleData(hoveredCard?.name ?? null);

  if (!hoveredCard) return null;

  return (
    <div className="fixed top-14 right-4 z-[100] w-[360px] pointer-events-none">
      <div className="bg-navy/95 border border-cyan-dim/50 rounded-xl shadow-2xl overflow-hidden backdrop-blur-sm">
        {/* Card image */}
        <div className="rounded-t-xl overflow-hidden">
          {hoveredCard.imageUri ? (
            <img
              src={hoveredCard.imageUri}
              alt={hoveredCard.name}
              className="w-full"
              style={{ aspectRatio: '63/88' }}
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full bg-navy-light flex items-center justify-center p-6" style={{ aspectRatio: '63/88' }}>
              <span className="text-white text-base text-center font-semibold">{hoveredCard.name}</span>
            </div>
          )}
        </div>

        {/* Oracle data */}
        {oracle === 'loading' && (
          <div className="p-4 space-y-2 animate-pulse">
            <div className="h-4 bg-navy-light rounded w-2/3" />
            <div className="h-4 bg-navy-light rounded w-full" />
            <div className="h-4 bg-navy-light rounded w-5/6" />
          </div>
        )}

        {oracle && oracle !== 'loading' && (
          <div className="p-4 space-y-2">
            {/* Card name + mana cost */}
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-base truncate mr-2">{hoveredCard.name}</span>
              {oracle.manaCost && (
                <span className="text-white/90 text-sm font-mono shrink-0">{oracle.manaCost}</span>
              )}
            </div>

            {/* Type line */}
            <p className="text-white/80 text-sm leading-snug">{oracle.typeLine}</p>

            {/* Oracle text */}
            {oracle.oracleText && (
              <p className="text-white text-sm leading-relaxed whitespace-pre-line border-t border-white/10 pt-2">
                {oracle.oracleText}
              </p>
            )}

            {/* P/T or Loyalty */}
            {(oracle.power != null || oracle.loyalty != null) && (
              <div className="flex gap-2 pt-1.5 border-t border-white/10">
                {oracle.power != null && (
                  <span className="text-sm font-bold text-white bg-navy-light px-2 py-0.5 rounded border border-cyan-dim">
                    {oracle.power}/{oracle.toughness}
                  </span>
                )}
                {oracle.loyalty != null && (
                  <span className="text-sm font-bold text-white bg-navy-light px-2 py-0.5 rounded border border-magenta/30">
                    {'\u25C6'} {oracle.loyalty}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
