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
import { CardInspectorProvider, CardInspectorPanel } from '../components/game/CardInspectorPanel';

export default function GameTablePage() {
  const {
    room, playerId, leaveGame,
    myPlayer, myHandCards, myBattlefieldCards,
    scryCards, scryInstanceIds,
    concede, connected, gameRoomId, isSandbox,
  } = useGameTable();

  const [atTable, setAtTable] = useState(false);
  const [showImportAfterJoin, setShowImportAfterJoin] = useState(false);
  const [showHUD, setShowHUD] = useState(true);

  if (!room || !atTable) {
    return (
      <GameLobby
        onEnterTable={(sandbox) => {
          setAtTable(true);
          setShowImportAfterJoin(!sandbox);
        }}
      />
    );
  }

  const allPlayers = Object.values(room.players);
  const opponents = allPlayers.filter(p => p.playerId !== playerId);
  const myBfCards: BattlefieldCard[] = myBattlefieldCards;
  const useGrid = opponents.length >= 3;

  const handleConcede = () => {
    concede();
    leaveGame();
    setAtTable(false);
  };

  return (
    <CardInspectorProvider>
    <div className="flex flex-col h-screen bg-navy text-cream overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-navy-light border-b border-cyan-dim/50 shrink-0 z-20">
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
          {/* HUD toggle */}
          <button
            onClick={() => setShowHUD(h => !h)}
            className={`text-xs px-2 py-1 rounded border transition-all ${
              showHUD
                ? 'border-cyan text-cyan bg-cyan/10'
                : 'border-cyan-dim/40 text-cream-muted hover:text-cream hover:border-cyan-dim'
            }`}
            title={showHUD ? 'Hide player HUD' : 'Show player HUD'}
          >
            {showHUD ? 'HUD ✓' : 'HUD'}
          </button>
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
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Left sidebar: controls + log ──────────────────────────────── */}
        <div className="w-44 shrink-0 flex flex-col border-r border-cyan-dim/30 bg-navy overflow-y-auto">
          <GameControls onConcede={handleConcede} />
          <div className="flex-1 border-t border-cyan-dim/30 overflow-hidden min-h-0">
            <GameActionLog actions={room.actionLog} />
          </div>
        </div>

        {/* ── Center ──────────────────────────────────────────────────── */}
        {useGrid ? (
          /* ── 2x2 Grid mode (3+ opponents) ─────────────────────────── */
          <div
            className="flex-1 min-w-0 min-h-0"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: '2px',
            }}
          >
            {/* Top-left: Opponent 1 */}
            {opponents[0] && (
              <div className="overflow-hidden border-b border-r border-cyan-dim/20 bg-navy/40">
                <OpponentView player={opponents[0]} compact />
              </div>
            )}

            {/* Top-right: Opponent 2 */}
            {opponents[1] && (
              <div className="overflow-hidden border-b border-cyan-dim/20 bg-navy/40">
                <OpponentView player={opponents[1]} compact />
              </div>
            )}

            {/* Bottom-left: Opponent 3 */}
            {opponents[2] && (
              <div className="overflow-hidden border-r border-cyan-dim/20 bg-navy/40">
                <OpponentView player={opponents[2]} compact />
              </div>
            )}

            {/* Bottom-right: Me (banner + battlefield + hand) */}
            {myPlayer && (
              <div className="flex flex-col min-h-0 overflow-hidden">
                <PlayerBanner player={myPlayer} isCurrentPlayer compact />
                <div className="flex-1 min-h-0 p-1 overflow-hidden flex flex-col">
                  <BattlefieldZone
                    cards={myBfCards}
                    label={myPlayer.playerName ? `${myPlayer.playerName}'s Battlefield` : 'Your Battlefield'}
                  />
                </div>
                <div className="shrink-0 h-28 border-t border-cyan-dim/30 bg-navy/70 px-2">
                  <HandZone cards={myHandCards} />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Classic stacked mode (0-2 opponents) ─────────────────── */
          <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">

            {/* Opponents section */}
            {opponents.length > 0 && (
              <div className="shrink-0 border-b border-cyan-dim/30 bg-navy/50 overflow-y-auto" style={{ maxHeight: '40%' }}>
                {opponents.map(opp => (
                  <OpponentView key={opp.playerId} player={opp} />
                ))}
              </div>
            )}

            {/* My battlefield */}
            <div className="flex-1 p-2 overflow-hidden min-h-0 flex flex-col">
              <BattlefieldZone
                cards={myBfCards}
                label={myPlayer?.playerName ? `${myPlayer.playerName}'s Battlefield` : 'Your Battlefield'}
              />
            </div>

            {/* My hand */}
            {myPlayer && (
              <div className="shrink-0 h-36 border-t border-cyan-dim/30 bg-navy/70 px-4">
                <HandZone cards={myHandCards} />
              </div>
            )}
          </div>
        )}

        {/* ── Right sidebar: player HUD + card inspector ──────────────── */}
        {/* In grid mode: collapsible overlay. Classic mode: inline sidebar. */}
        {myPlayer && !useGrid && showHUD && (
          <div className="w-72 shrink-0 border-l border-cyan-dim/30 bg-navy flex flex-col overflow-hidden">
            {/* Player HUD — fixed height */}
            <div className="shrink-0 overflow-y-auto border-b border-cyan-dim/20" style={{ maxHeight: '55%' }}>
              <PlayerBanner player={myPlayer} isCurrentPlayer />
            </div>
            {/* Card inspector — fills remaining space */}
            <div className="flex-1 overflow-y-auto border-t border-cyan-dim/10">
              <p className="text-[9px] uppercase tracking-widest text-cream-muted/30 px-3 pt-2 pb-1">Inspector</p>
              <CardInspectorPanel />
            </div>
          </div>
        )}

        {/* Grid mode: floating HUD overlay */}
        {myPlayer && useGrid && showHUD && (
          <div className="fixed top-12 right-2 z-50 w-72 max-h-[80vh] bg-navy border border-cyan-dim/50 rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-navy-light border-b border-cyan-dim/30">
              <span className="text-xs font-bold text-cyan">Player HUD</span>
              <button
                onClick={() => setShowHUD(false)}
                className="text-cream-muted/60 hover:text-cream text-sm px-1"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: '50%' }}>
              <PlayerBanner player={myPlayer} isCurrentPlayer />
            </div>
            <div className="flex-1 overflow-y-auto border-t border-cyan-dim/10">
              <p className="text-[9px] uppercase tracking-widest text-cream-muted/30 px-3 pt-2 pb-1">Inspector</p>
              <CardInspectorPanel />
            </div>
          </div>
        )}
      </div>

      {/* ── Scry overlay ─────────────────────────────────────────────────── */}
      {scryCards.length > 0 && (
        <ScryOverlay cards={scryCards} instanceIds={scryInstanceIds} />
      )}

      {/* ── Deck import modal ──────────────────────────────────────────── */}
      {showImportAfterJoin && (
        <DeckImportModal onClose={() => setShowImportAfterJoin(false)} />
      )}
    </div>
    </CardInspectorProvider>
  );
}
