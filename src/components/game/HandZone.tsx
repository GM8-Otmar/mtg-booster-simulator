import { useState } from 'react';
import type { BattlefieldCard } from '../../types/game';
import { useGameTable } from '../../contexts/GameTableContext';
import CardContextMenu from './CardContextMenu';

interface HandZoneProps {
  cards: BattlefieldCard[];
}

export default function HandZone({ cards }: HandZoneProps) {
  const [menuInfo, setMenuInfo] = useState<{ card: BattlefieldCard; x: number; y: number } | null>(null);

  const total = cards.length;

  // Fan parameters
  const fanAngle = Math.min(4, 60 / Math.max(total, 1)); // degrees per card
  const startAngle = -((total - 1) / 2) * fanAngle;
  const hoverLift = -20; // px

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-cream-muted/30 text-xs">Empty hand</p>
      </div>
    );
  }

  return (
    <div className="relative flex items-end justify-center h-full">
      <div className="relative flex items-end" style={{ height: 112, minWidth: total * 36 + 44 }}>
        {cards.map((card, i) => {
          const angle = startAngle + i * fanAngle;
          const offsetX = (i - (total - 1) / 2) * 36;

          return (
            <div
              key={card.instanceId}
              className="absolute group cursor-pointer"
              style={{
                width: 80,
                height: 112,
                left: `calc(50% + ${offsetX}px - 40px)`,
                bottom: 0,
                transform: `rotate(${angle}deg)`,
                transformOrigin: 'bottom center',
                zIndex: i,
                transition: 'transform 0.15s ease, z-index 0s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = `rotate(${angle}deg) translateY(${hoverLift}px)`;
                (e.currentTarget as HTMLElement).style.zIndex = '99';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = `rotate(${angle}deg)`;
                (e.currentTarget as HTMLElement).style.zIndex = String(i);
              }}
              onContextMenu={e => {
                e.preventDefault();
                setMenuInfo({ card, x: e.clientX, y: e.clientY });
              }}
              onDoubleClick={() => {
                // Play to battlefield: zone change
                // Use context menu for more options
              }}
            >
              <div className="w-full h-full rounded-lg overflow-hidden border-2 border-cyan/50 shadow-lg">
                {card.imageUri ? (
                  <img
                    src={card.imageUri}
                    alt={card.name}
                    className="w-full h-full object-cover pointer-events-none"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full bg-navy-light flex items-center justify-center p-1">
                    <span className="text-[9px] text-cream text-center leading-tight">{card.name}</span>
                  </div>
                )}
              </div>

              {/* Commander star */}
              {card.isCommander && (
                <div className="absolute -top-2 -right-2 bg-magenta rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-md">
                  ★
                </div>
              )}

              {/* Name tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                <span className="bg-navy text-cream text-[9px] rounded px-1.5 py-0.5 border border-cyan-dim shadow">
                  {card.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {menuInfo && (
        <CardContextMenu
          card={menuInfo.card}
          x={menuInfo.x}
          y={menuInfo.y}
          onClose={() => setMenuInfo(null)}
        />
      )}
    </div>
  );
}
