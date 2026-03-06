import { Heart } from 'lucide-react';
import type { GamePlayerState } from '../../types/game';
import { useGameTable } from '../../contexts/GameTableContext';

interface PlayerBannerProps {
  player: GamePlayerState;
  isCurrentPlayer?: boolean;
  /** Single-line strip for grid cells — shows name, life, hand, library only */
  compact?: boolean;
}

/**
 * PlayerBanner — compact single-line variant only.
 * The full sidebar banner has been replaced by BottomBar.
 */
export default function PlayerBanner({ player, isCurrentPlayer = false, compact = false }: PlayerBannerProps) {
  const { isTargetingMode, completeTargeting } = useGameTable();

  if (!compact) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-navy-light/60 border-b border-cyan-dim/30 shrink-0">
      <span
        data-player-id={player.playerId}
        className={`text-xs font-bold truncate ${isCurrentPlayer ? 'text-cyan' : 'text-cream'} ${isTargetingMode ? 'cursor-crosshair hover:text-red-300 transition-colors' : ''}`}
        onClick={isTargetingMode ? () => completeTargeting(player.playerId) : undefined}
      >
        {player.playerName}
        {isCurrentPlayer && <span className="text-cream-muted font-normal ml-1">(you)</span>}
      </span>
      <span className="text-xs text-cream-muted ml-auto flex items-center gap-3">
        <span title="Life" className="flex items-center gap-1">
          <Heart className="w-3 h-3 text-red-400 fill-red-400" /> <span className="font-bold text-cream">{player.life}</span>
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
