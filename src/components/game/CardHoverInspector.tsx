/**
 * CardHoverInspector — floating card preview overlay.
 * Fixed top-right, ~30% bigger than sidebar was, triggered by hover.
 * pointer-events-none so it never captures mouse events.
 */
import { useCardInspector, useOracleData } from './CardInspectorPanel';

export default function CardHoverInspector() {
  const { hoveredCard } = useCardInspector();
  const oracle = useOracleData(hoveredCard?.name ?? null);

  if (!hoveredCard) return null;

  return (
    <div className="fixed top-14 right-4 z-[100] w-[280px] pointer-events-none">
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
              <span className="text-cream text-sm text-center font-semibold">{hoveredCard.name}</span>
            </div>
          )}
        </div>

        {/* Oracle data */}
        {oracle === 'loading' && (
          <div className="p-3 space-y-2 animate-pulse">
            <div className="h-3 bg-navy-light rounded w-2/3" />
            <div className="h-3 bg-navy-light rounded w-full" />
            <div className="h-3 bg-navy-light rounded w-5/6" />
          </div>
        )}

        {oracle && oracle !== 'loading' && (
          <div className="p-3 space-y-1.5">
            {/* Card name + mana cost */}
            <div className="flex items-center justify-between">
              <span className="text-cream font-bold text-xs truncate mr-2">{hoveredCard.name}</span>
              {oracle.manaCost && (
                <span className="text-cream-muted text-[10px] font-mono shrink-0">{oracle.manaCost}</span>
              )}
            </div>

            {/* Type line */}
            <p className="text-cream-muted text-[10px] leading-snug">{oracle.typeLine}</p>

            {/* Oracle text */}
            {oracle.oracleText && (
              <p className="text-white/80 text-[10px] leading-relaxed whitespace-pre-line border-t border-white/5 pt-1.5">
                {oracle.oracleText}
              </p>
            )}

            {/* P/T or Loyalty */}
            {(oracle.power != null || oracle.loyalty != null) && (
              <div className="flex gap-2 pt-1 border-t border-white/5">
                {oracle.power != null && (
                  <span className="text-[10px] font-bold text-cream bg-navy-light px-1.5 py-0.5 rounded border border-cyan-dim">
                    {oracle.power}/{oracle.toughness}
                  </span>
                )}
                {oracle.loyalty != null && (
                  <span className="text-[10px] font-bold text-magenta bg-navy-light px-1.5 py-0.5 rounded border border-magenta/30">
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
