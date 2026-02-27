import type { GamePlayerState, BattlefieldCard } from '../../types/game';
import { useGameTable } from '../../contexts/GameTableContext';
import BattlefieldZone from './BattlefieldZone';
import PlayerBanner from './PlayerBanner';

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

  // Always compact strip + battlefield. Never the full HUD.
  return (
    <div className={fillHeight ? 'flex flex-col min-h-0 h-full overflow-hidden' : 'flex flex-col min-h-0 overflow-hidden'}>
      <PlayerBanner player={player} isCurrentPlayer={false} compact />

      <div className="flex-1 min-h-0 overflow-hidden">
        <BattlefieldZone
          cards={battlefieldCards}
          label={`${player.playerName}'s Battlefield`}
        />
      </div>
    </div>
  );
}
