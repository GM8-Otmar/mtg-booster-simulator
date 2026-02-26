import { useState } from 'react';
import type { BattlefieldCard } from '../../types/game';
import CardContextMenu from './CardContextMenu';

interface GraveyardPileProps {
  cards: BattlefieldCard[];
  label?: string;
  borderColor?: string;
  dropZone?: string;
}

function GraveyardCard({ card, onContextMenu }: {
  card: BattlefieldCard;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="flex items-center gap-2 p-1.5 rounded hover:bg-navy-light cursor-pointer"
      onContextMenu={onContextMenu}
    >
      {card.imageUri && (
        <img
          src={card.imageUri}
          alt={card.name}
          className="w-8 h-11 object-cover rounded"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <span className="text-sm text-cream truncate">{card.name}</span>
    </div>
  );
}

export default function GraveyardPile({
  cards,
  label = 'GY',
  borderColor = 'border-cyan-dim/60',
  dropZone = 'graveyard',
}: GraveyardPileProps) {
  const [expanded, setExpanded] = useState(false);
  const [menuInfo, setMenuInfo] = useState<{ card: BattlefieldCard; x: number; y: number } | null>(null);

  const topCard = cards[cards.length - 1] ?? null;

  return (
    <div className="flex flex-col items-center gap-1" data-drop-zone={dropZone}>
      {/* Pile face */}
      <div
        className={`relative w-16 h-[90px] rounded-md border-2 ${borderColor} cursor-pointer overflow-hidden shadow-md`}
        onClick={() => cards.length > 0 && setExpanded(v => !v)}
        title={`Graveyard — ${cards.length} card${cards.length !== 1 ? 's' : ''}`}
      >
        {topCard?.imageUri ? (
          <img
            src={topCard.imageUri}
            alt={topCard.name}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full bg-navy-light flex items-center justify-center">
            <span className="text-cream-muted/50 text-xs">{cards.length}</span>
          </div>
        )}
        {cards.length > 1 && (
          <div className="absolute top-1 right-1 bg-black/60 rounded-full px-1.5 text-[9px] text-cream font-bold">
            {cards.length}
          </div>
        )}
      </div>
      <p className="text-[10px] text-cream-muted">{label} ({cards.length})</p>

      {/* Expanded list */}
      {expanded && cards.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setExpanded(false)}
        >
          <div
            className="bg-navy rounded-xl border border-cyan-dim p-4 w-80 max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-cream">{label} ({cards.length})</h3>
              <button onClick={() => setExpanded(false)} className="text-cream-muted hover:text-cream text-lg">✕</button>
            </div>
            <div className="overflow-y-auto space-y-1">
              {[...cards].reverse().map(card => (
                <GraveyardCard
                  key={card.instanceId}
                  card={card}
                  onContextMenu={e => {
                    e.preventDefault();
                    setMenuInfo({ card, x: e.clientX, y: e.clientY });
                  }}
                />
              ))}
            </div>
          </div>
        </div>
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
