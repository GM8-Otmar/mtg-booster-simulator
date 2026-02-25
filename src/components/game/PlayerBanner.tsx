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
  const { room } = useGameTable();
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

  const handCount = player.handCardIds.length;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-xl border
        ${isCurrentPlayer
          ? 'bg-navy-light border-cyan/40'
          : 'bg-navy border-cyan-dim/30'
        }`}
    >
      {/* Player name + hand count */}
      <div className="flex flex-col min-w-[80px]">
        <span className={`font-bold text-sm truncate ${isCurrentPlayer ? 'text-cyan' : 'text-cream'}`}>
          {player.playerName}
        </span>
        <span className="text-[10px] text-cream-muted">
          Hand: {handCount} {isCurrentPlayer ? '' : '(hidden)'}
        </span>
      </div>

      {/* Life + poison */}
      <LifeCounter
        life={player.life}
        poison={player.poisonCounters}
        playerId={player.playerId}
      />

      {/* Library */}
      <LibraryStack count={player.libraryCardIds.length} playerId={player.playerId} />

      {/* Graveyard */}
      <GraveyardPile cards={graveyardCards} />

      {/* Exile */}
      <ExilePile cards={exileCards} />

      {/* Command Zone (only if commander format) */}
      {commandCards.length > 0 && (
        <CommandZone
          cards={commandCards}
          commanderTax={player.commanderTax}
          playerId={player.playerId}
        />
      )}
    </div>
  );
}
