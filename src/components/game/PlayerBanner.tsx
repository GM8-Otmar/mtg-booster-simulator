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
  /** Single-line strip for grid cells — shows name, life, hand, library only */
  compact?: boolean;
}

export default function PlayerBanner({ player, isCurrentPlayer = false, compact = false }: PlayerBannerProps) {
  const { room, isTargetingMode, completeTargeting } = useGameTable();
  if (!room) return null;

  /* ── Compact single-line banner for 2x2 grid cells ────────────────────── */
  if (compact) {
    return (
      <div className="flex items-center gap-3 px-3 py-1.5 bg-navy-light/60 border-b border-cyan-dim/30 shrink-0">
        <span className={`text-xs font-bold truncate ${isCurrentPlayer ? 'text-cyan' : 'text-cream'}`}>
          {player.playerName}
          {isCurrentPlayer && <span className="text-cream-muted font-normal ml-1">(you)</span>}
        </span>
        <span className="text-xs text-cream-muted ml-auto flex items-center gap-3">
          <span title="Life">
            <span className="text-red-400">{'\u2764'}</span> <span className="font-bold text-cream">{player.life}</span>
          </span>
          {player.poisonCounters > 0 && (
            <span title="Poison">
              <span className="text-green-400">{'\u2620'}</span> <span className="font-bold text-green-300">{player.poisonCounters}</span>
            </span>
          )}
          <span title="Hand">
            <span className="opacity-60">{'\uD83C\uDCCF'}</span> {player.handCardIds.length}
          </span>
          <span title="Library">
            <span className="opacity-60">{'\uD83D\uDCDA'}</span> {player.libraryCardIds.length}
          </span>
          <span title="Graveyard">
            <span className="opacity-60">{'\uD83D\uDDD1'}</span> {player.graveyardCardIds.length}
          </span>
        </span>
      </div>
    );
  }

  /* ── Full banner (sidebar HUD) ────────────────────────────────────────── */

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
