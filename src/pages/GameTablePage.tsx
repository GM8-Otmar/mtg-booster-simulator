import { useState } from 'react';
import { useGameTable } from '../contexts/GameTableContext';
import GameLobby from '../components/game/GameLobby';
import BattlefieldZone from '../components/game/BattlefieldZone';
import HandZone from '../components/game/HandZone';
import PlayerBanner from '../components/game/PlayerBanner';
import OpponentView from '../components/game/OpponentView';
import GameControls from '../components/game/GameControls';
import GameActionLog from '../components/game/GameActionLog';
import ScryOverlay from '../components/game/ScryOverlay';
import DeckImportModal from '../components/game/DeckImportModal';
import type { BattlefieldCard } from '../types/game';

export default function GameTablePage() {
  const {
    room, playerId, leaveGame,
    myPlayer, myHandCards, myBattlefieldCards,
    scryCards, scryInstanceIds,
    concede, connected, gameRoomId, isSandbox,
  } = useGameTable();

  const [atTable, setAtTable] = useState(false);
  const [showImportAfterJoin, setShowImportAfterJoin] = useState(false);

  // Not yet in a room — show lobby
  if (!room || !atTable) {
    return (
      <GameLobby
        onEnterTable={(sandbox) => {
          setAtTable(true);
          // Don't auto-show import modal for sandbox (it already has cards)
          setShowImportAfterJoin(!sandbox);
        }}
      />
    );
  }

  // Separate opponents from self
  const allPlayers = Object.values(room.players);
  const opponents = allPlayers.filter(p => p.playerId !== playerId);

  // My cards on battlefield
  const myBfCards: BattlefieldCard[] = myBattlefieldCards;

  const handleConcede = () => {
    concede();
    leaveGame();
    setAtTable(false);
  };

  return (
    <div className="flex flex-col h-screen bg-navy text-cream overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-navy-light border-b border-cyan-dim shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { leaveGame(); setAtTable(false); }}
            className="text-cream-muted hover:text-cream text-sm px-2 py-1 rounded border border-cyan-dim hover:border-cyan transition-all"
          >
            ← Leave
          </button>
          <span className="text-cream font-bold">🃏 Game Table</span>
          {isSandbox ? (
            <span className="bg-yellow-600/20 border border-yellow-600/50 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded-full">
              🧪 SANDBOX
            </span>
          ) : (gameRoomId && room.code && (
            <span className="text-cream-muted text-sm">
              Code: <span className="font-mono font-bold text-cyan">{room.code}</span>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {isSandbox ? (
            <span className="text-yellow-400/60 text-xs">offline · local only</span>
          ) : (
            <>
              <span
                className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}
                title={connected ? 'Connected' : 'Disconnected'}
              />
              <span className="text-cream-muted text-xs">
                {allPlayers.length} player{allPlayers.length !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar: controls + log ──────────────────────────────── */}
        <div className="w-52 shrink-0 flex flex-col border-r border-cyan-dim/30 bg-navy">
          <GameControls onConcede={handleConcede} />
          <div className="flex-1 border-t border-cyan-dim/30 overflow-hidden">
            <GameActionLog actions={room.actionLog} />
          </div>
        </div>

        {/* ── Center: opponents + my battlefield + my hand ──────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Opponents section */}
          {opponents.length > 0 && (
            <div className="shrink-0 p-2 space-y-2 border-b border-cyan-dim/30 bg-navy/50 max-h-[55%] overflow-y-auto">
              {opponents.map(opp => (
                <OpponentView key={opp.playerId} player={opp} />
              ))}
            </div>
          )}

          {/* My battlefield */}
          <div className="flex-1 p-2 overflow-hidden flex flex-col">
            <BattlefieldZone
              cards={myBfCards}
              label="Your Battlefield"
            />
          </div>

          {/* My hand */}
          {myPlayer && (
            <div className="shrink-0 h-36 border-t border-cyan-dim/30 bg-navy/70 px-4">
              <HandZone cards={myHandCards} />
            </div>
          )}
        </div>

        {/* ── Right sidebar: player banner ──────────────────────────────── */}
        {myPlayer && (
          <div className="w-64 shrink-0 border-l border-cyan-dim/30 bg-navy p-3 overflow-y-auto">
            <PlayerBanner player={myPlayer} isCurrentPlayer />
          </div>
        )}
      </div>

      {/* ── Scry overlay ─────────────────────────────────────────────────── */}
      {scryCards.length > 0 && (
        <ScryOverlay cards={scryCards} instanceIds={scryInstanceIds} />
      )}

      {/* ── Deck import modal (prompted after joining) ──────────────────── */}
      {showImportAfterJoin && (
        <DeckImportModal onClose={() => setShowImportAfterJoin(false)} />
      )}
    </div>
  );
}
