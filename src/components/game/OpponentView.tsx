import type { GamePlayerState, BattlefieldCard } from '../../types/game';
import { useGameTable } from '../../contexts/GameTableContext';
import BattlefieldZone from './BattlefieldZone';
import PlayerBanner from './PlayerBanner';

interface OpponentViewProps {
  player: GamePlayerState;
}

export default function OpponentView({ player }: OpponentViewProps) {
  const { room } = useGameTable();
  if (!room) return null;

  const battlefieldCards = Object.values(room.cards).filter(
    (c): c is BattlefieldCard => c.zone === 'battlefield' && c.controller === player.playerId,
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Compact banner */}
      <PlayerBanner player={player} isCurrentPlayer={false} />

      {/* Opponent battlefield (smaller) */}
      <BattlefieldZone
        cards={battlefieldCards}
        label={`${player.playerName}'s Battlefield`}
        heightClass="h-40"
      />
    </div>
  );
}
