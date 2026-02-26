import { useState, useEffect } from 'react';
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
import ZoneCountHUD from '../components/game/ZoneCountHUD';
import type { BattlefieldCard } from '../types/game';
import { CardInspectorProvider, CardInspectorPanel } from '../components/game/CardInspectorPanel';

export default function GameTablePage() {
  const {
    room, playerId, leaveGame,
    myPlayer, myHandCards, myBattlefieldCards,
    scryCards, scryInstanceIds, scryMode,
    canUndo, undo,
    concede, connected, gameRoomId, isSandbox,
    activeSandboxPlayerId, setActiveSandboxPlayer,
  } = useGameTable();

  const [atTable, setAtTable] = useState(false);
  const [showImportAfterJoin, setShowImportAfterJoin] = useState(false);

  // ── Ctrl+Z undo listener ───────────────────────────────────────────────────
  useEffect(() => {
    if (!atTable) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [atTable, canUndo, undo]);

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
  const effectiveMyId = isSandbox ? (activeSandboxPlayerId ?? playerId) : playerId;
  const opponents = allPlayers.filter(p => p.playerId !== effectiveMyId);
  const myBfCards: BattlefieldCard[] = myBattlefieldCards;

  const handleConcede = () => {
    concede();
    leaveGame();
    setAtTable(false);
  };

  // Whether to show sandbox player switcher tabs
  const showSandboxTabs = isSandbox && allPlayers.length > 1;

  return (
    <CardInspectorProvider>
    <div className="flex flex-col h-screen bg-navy text-cream overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-navy-light border-b border-cyan-dim/50 shrink-0 z-20 gap-3">
        <div className="flex items-center gap-3 shrink-0">
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

        {/* Zone count HUD — center/right of top bar */}
        <div className="flex-1 flex justify-center">
          <ZoneCountHUD />
        </div>

        <div className="flex items-center gap-2 shrink-0">
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

        {/* ── Center: opponents + my battlefield + my hand ──────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">

          {/* Sandbox multi-player tabs */}
          {showSandboxTabs && (
            <div className="shrink-0 flex gap-0 border-b border-cyan-dim/30 bg-navy/80 px-2 pt-1">
              {allPlayers.map(p => {
                const isActive = p.playerId === effectiveMyId;
                const isYou = p.playerId === playerId;
                return (
                  <button
                    key={p.playerId}
                    onClick={() => setActiveSandboxPlayer(p.playerId)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg mr-0.5 transition-all border-t border-l border-r ${
                      isActive
                        ? 'bg-navy border-cyan-dim/50 text-cyan'
                        : 'bg-navy-light/50 border-cyan-dim/20 text-cream-muted hover:text-cream hover:bg-navy-light'
                    }`}
                  >
                    {p.playerName}
                    {isYou && <span className="ml-1 text-[9px] opacity-50">(you)</span>}
                    <span className="ml-1.5 text-[9px] opacity-60">{p.life}♥</span>
                  </button>
                );
              })}
            </div>
          )}

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

        {/* ── Right sidebar: player HUD + card inspector ────────────────── */}
        {myPlayer && (
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
      </div>

      {/* ── Undo button — pinned bottom-right ──────────────────────────── */}
      {isSandbox && (
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`fixed bottom-4 right-4 z-30 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all shadow-lg ${
            canUndo
              ? 'bg-navy-light border-cyan-dim/50 text-cream hover:border-cyan hover:text-cyan'
              : 'bg-navy-light/50 border-cyan-dim/20 text-cream-muted/30 cursor-not-allowed'
          }`}
          title="Undo last action (Ctrl+Z)"
        >
          <span className="text-sm leading-none">↩</span>
          Undo
        </button>
      )}

      {/* ── Scry / Surveil overlay ─────────────────────────────────────── */}
      {scryCards.length > 0 && (
        <ScryOverlay
          cards={scryCards}
          instanceIds={scryInstanceIds}
          initialMode={scryMode}
        />
      )}

      {/* ── Deck import modal ──────────────────────────────────────────── */}
      {showImportAfterJoin && (
        <DeckImportModal onClose={() => setShowImportAfterJoin(false)} />
      )}
    </div>
    </CardInspectorProvider>
  );
}
