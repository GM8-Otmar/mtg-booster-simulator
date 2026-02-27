import type { BattlefieldCard, GamePlayerState } from '../../types/game';
import { useGameTable } from '../../contexts/GameTableContext';
import { useCardInspector } from './CardInspectorPanel';

interface OpponentZoneInspectModalProps {
  player: GamePlayerState;
  zone: 'graveyard' | 'exile';
  onClose: () => void;
}

export default function OpponentZoneInspectModal({ player, zone, onClose }: OpponentZoneInspectModalProps) {
  const { room } = useGameTable();
  const { inspect } = useCardInspector();
  const ids = zone === 'graveyard' ? player.graveyardCardIds : player.exileCardIds;
  const cards = ids.map(id => room?.cards[id]).filter(Boolean) as BattlefieldCard[];
  const label = zone === 'graveyard' ? 'Graveyard' : 'Exile';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-navy rounded-xl border border-cyan-dim p-4 w-80 max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h3 className="font-bold text-cream">
            {player.playerName}&apos;s {label} ({cards.length})
          </h3>
          <button onClick={onClose} className="text-cream-muted hover:text-cream text-lg px-1">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto space-y-1 flex-1 min-h-0">
          {cards.length === 0 ? (
            <p className="text-cream-muted/60 text-sm italic">Empty</p>
          ) : (
            [...cards].reverse().map(card => (
              <div
                key={card.instanceId}
                className="flex items-center gap-2 p-1.5 rounded hover:bg-navy-light cursor-pointer transition-colors"
                onClick={() => inspect({ name: card.name, imageUri: card.imageUri ?? null, instanceId: card.instanceId })}
              >
                {card.imageUri && (
                  <img
                    src={card.imageUri}
                    alt={card.name}
                    className="w-8 h-11 object-cover rounded flex-shrink-0"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <span className="text-sm text-cream truncate">{card.name}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
