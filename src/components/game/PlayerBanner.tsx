import type { GamePlayerState } from '../../types/game';
import LifeCounter from './LifeCounter';
import LibraryStack from './LibraryStack';
import GraveyardPile from './GraveyardPile';
import ExilePile from './ExilePile';
import CommandZone from './CommandZone';
import { useGameTable } from '../../contexts/GameTableContext';

interface PlayerBannerProps {
  player: GamePlayerState;
  isCurrentPlayer?: boolean;
}

export default function PlayerBanner({ player, isCurrentPlayer = false }: PlayerBannerProps) {
  const { room, isTargetingMode, completeTargeting } = useGameTable();
  if (!room) return null;

  const graveyardCards = player.graveyardCardIds
    .map(id => room.cards[id])
    .filter(Boolean) as any[];

  const exileCards = player.exileCardIds
    .map(id => room.cards[id])
    .filter(Boolean) as any[];

  const commandCards = player.commandZoneCardIds
    .map(id => room.cards[id])
    .filter(Boolean) as any[];

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* Player name */}
      <div
        className={`text-sm font-bold truncate ${isCurrentPlayer ? 'text-cyan' : 'text-cream'} ${isTargetingMode ? 'cursor-crosshair hover:text-red-300 transition-colors' : ''}`}
        onClick={isTargetingMode ? () => completeTargeting(player.playerId) : undefined}
      >
        {player.playerName}
        {isCurrentPlayer && <span className="text-cream-muted text-xs font-normal ml-1">(you)</span>}
        {isTargetingMode && <span className="ml-1 text-red-300 text-xs animate-pulse">⎯ target</span>}
      </div>

      {/* Life counter — big and prominent */}
      <LifeCounter
        life={player.life}
        poison={player.poisonCounters}
        playerId={player.playerId}
      />

      {/* Hand count */}
      <div className="flex items-center justify-between text-xs text-cream-muted border-t border-cyan-dim/20 pt-2">
        <span>Hand</span>
        <span className="font-bold text-cream">{player.handCardIds.length}</span>
      </div>

      {/* Library */}
      <div className="border-t border-cyan-dim/20 pt-2">
        <LibraryStack count={player.libraryCardIds.length} playerId={player.playerId} />
      </div>

      {/* Graveyard + Exile side by side */}
      <div className="flex gap-3 justify-center border-t border-cyan-dim/20 pt-2">
        <GraveyardPile cards={graveyardCards} />
        <ExilePile cards={exileCards} />
      </div>

      {/* Command Zone */}
      {commandCards.length > 0 && (
        <div className="border-t border-cyan-dim/20 pt-2">
          <CommandZone
            cards={commandCards}
            commanderTax={player.commanderTax}
            playerId={player.playerId}
          />
        </div>
      )}
    </div>
  );
}
