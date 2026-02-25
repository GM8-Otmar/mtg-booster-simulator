import { useState } from 'react';
import type { BattlefieldCard } from '../../types/game';
import { useGameTable } from '../../contexts/GameTableContext';
import CardContextMenu from './CardContextMenu';

interface CommandZoneProps {
  cards: BattlefieldCard[];
  commanderTax: number;
  playerId: string;
}

export default function CommandZone({ cards, commanderTax, playerId: ownerId }: CommandZoneProps) {
  const { notifyCommanderCast, changeZone, playerId: myId } = useGameTable();
  const [menuInfo, setMenuInfo] = useState<{ card: BattlefieldCard; x: number; y: number } | null>(null);

  const isOwner = ownerId === myId;
  const taxCost = commanderTax * 2;

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="w-16 h-[90px] rounded-md border-2 border-dashed border-magenta/30 flex items-center justify-center">
          <span className="text-magenta/30 text-lg">⚔</span>
        </div>
        <p className="text-[10px] text-cream-muted">Command Zone</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-1">
        {cards.map(card => (
          <div key={card.instanceId} className="flex flex-col items-center gap-1">
            <div
              className="relative w-16 h-[90px] rounded-md overflow-hidden border-2 border-magenta shadow-lg shadow-magenta/20 cursor-pointer"
              onContextMenu={e => {
                e.preventDefault();
                setMenuInfo({ card, x: e.clientX, y: e.clientY });
              }}
              onDoubleClick={() => {
                if (!isOwner) return;
                // Cast commander: notify tax, move to battlefield
                notifyCommanderCast(card.instanceId);
                changeZone(card.instanceId, 'battlefield');
              }}
              title={isOwner ? 'Double-click to cast' : card.name}
            >
              {card.imageUri ? (
                <img src={card.imageUri} alt={card.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-navy-light flex items-center justify-center p-1">
                  <span className="text-[9px] text-cream text-center">{card.name}</span>
                </div>
              )}

              {/* Star badge */}
              <div className="absolute top-1 right-1 bg-magenta rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold shadow">
                ★
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-cream-muted">Command Zone</p>

      {commanderTax > 0 && (
        <p className="text-[10px] text-magenta font-bold">+{taxCost} tax</p>
      )}

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
