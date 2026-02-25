import { useRef, useCallback } from 'react';
import type { BattlefieldCard } from '../../types/game';
import BattlefieldCardComponent from './BattlefieldCard';

interface BattlefieldZoneProps {
  /** All cards currently on the battlefield (all players) */
  cards: BattlefieldCard[];
  /** Label shown in the zone (e.g., player name) */
  label?: string;
  /** CSS height class for this zone section */
  heightClass?: string;
}

export default function BattlefieldZone({
  cards,
  label,
  heightClass = 'flex-1 min-h-0',
}: BattlefieldZoneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Prevent context-menu on the zone background
  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative ${heightClass} bg-navy-light/30 rounded-xl border border-cyan-dim/30 overflow-hidden`}
      onContextMenu={onContextMenu}
    >
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(100,200,200,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(100,200,200,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Zone label */}
      {label && (
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <span className="text-[10px] text-cream-muted/50 font-semibold uppercase tracking-widest">
            {label}
          </span>
        </div>
      )}

      {/* Cards */}
      {cards.map(card => (
        <BattlefieldCardComponent
          key={card.instanceId}
          card={card}
          containerRef={containerRef}
        />
      ))}

      {/* Empty hint */}
      {cards.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-cream-muted/20 text-sm">battlefield</p>
        </div>
      )}
    </div>
  );
}
