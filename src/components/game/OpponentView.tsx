import type { GamePlayerState, BattlefieldCard } from '../../types/game';
import { useGameTable } from '../../contexts/GameTableContext';
import BattlefieldZone from './BattlefieldZone';
import OpponentStrip from './OpponentStrip';

interface OpponentViewProps {
  player: GamePlayerState;
  /** Grid cell mode — fill the entire cell height */
  fillHeight?: boolean;
}

export default function OpponentView({ player, fillHeight = false }: OpponentViewProps) {
  const { room } = useGameTable();
  if (!room) return null;

  const battlefieldCards = Object.values(room.cards).filter(
    (c): c is BattlefieldCard => c.zone === 'battlefield' && c.controller === player.playerId,
  );

  const revealedHandCards = Object.values(room.cards).filter(
    (c): c is BattlefieldCard => c.zone === 'hand' && c.controller === player.playerId && !!c.revealed
  );

  // Periodic logging — only when battlefield changes
  const allCardsForPlayer = Object.values(room.cards).filter(c => c.controller === player.playerId);
  const bfCount = battlefieldCards.length;
  const zones = allCardsForPlayer.reduce<Record<string, number>>((acc, c) => { acc[c.zone] = (acc[c.zone] ?? 0) + 1; return acc; }, {});
  if (bfCount > 0 || allCardsForPlayer.length > 0) {
    console.log(`[MTG-OppView] ${player.playerName} (${player.playerId.slice(0, 8)}): bf=${bfCount}, totalCards=${allCardsForPlayer.length}, zones=`, zones);
  }

  // Minimal strip (name, life, tooltip) + battlefield. Right-click name for GY/exile inspect.
  return (
    <div className={fillHeight ? 'flex flex-col min-h-0 h-full overflow-hidden' : 'flex flex-col min-h-0 overflow-hidden'}>
      <OpponentStrip player={player} />

      {revealedHandCards.length > 0 && (
        <div className="px-2 py-1 bg-navy border-b border-cyan-dim/10 flex gap-2 overflow-x-auto custom-scrollbar">
          {revealedHandCards.map(card => (
            <div 
              key={card.instanceId} 
              className="w-8 h-11 rounded border border-cyan/30 overflow-hidden flex-shrink-0 cursor-help"
              title={`${player.playerName} revealed: ${card.name}`}
            >
              {card.imageUri ? (
                <img src={card.imageUri} alt={card.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-navy-light flex items-center justify-center text-[6px] text-cream text-center p-0.5">
                  {card.name}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <BattlefieldZone
          cards={battlefieldCards}
          label={`${player.playerName}'s Battlefield`}
        />
      </div>
    </div>
  );
}
