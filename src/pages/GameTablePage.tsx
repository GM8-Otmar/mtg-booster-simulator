import { useState, useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';
import { useGameTable } from '../contexts/GameTableContext';
import GameLobby from '../components/game/GameLobby';
import BattlefieldZone from '../components/game/BattlefieldZone';
import PlayerBanner from '../components/game/PlayerBanner';
import OpponentView from '../components/game/OpponentView';
import GameControls from '../components/game/GameControls';
import ScryOverlay from '../components/game/ScryOverlay';
import DeckImportModal from '../components/game/DeckImportModal';
import ZoneCountHUD from '../components/game/ZoneCountHUD';
import BottomBar from '../components/game/BottomBar';
import CardHoverInspector from '../components/game/CardHoverInspector';
import LibrarySearchOverlay from '../components/game/LibrarySearchOverlay';
import TargetingOverlay from '../components/game/TargetingOverlay';
import OpponentInfoPanel from '../components/game/OpponentInfoPanel';
import type { BattlefieldCard } from '../types/game';
import { CardInspectorProvider } from '../components/game/CardInspectorPanel';

export default function GameTablePage() {
  const {
    room, playerId, leaveGame,
    myPlayer, myHandCards, myBattlefieldCards,
    myGraveyardCards, myExileCards, myCommandZoneCards,
    scryCards, scryInstanceIds, scryMode,
    untapAll, drawCards, mulligan, shuffleLibrary,
    concede, connected, gameRoomId, isSandbox,
    activeSandboxPlayerId, setActiveSandboxPlayer,
    passTurn, isMyTurn,
  } = useGameTable();

  const [atTable, setAtTable] = useState(false);
  const [showImportAfterJoin, setShowImportAfterJoin] = useState(false);
  const [showLibrarySearch, setShowLibrarySearch] = useState(false);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!atTable) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((scryCards?.length ?? 0) > 0) return;

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'x') {
        e.preventDefault();
        untapAll();
      } else if (e.key === 'c') {
        e.preventDefault();
        drawCards(1);
      } else if (e.key === 'm') {
        e.preventDefault();
        mulligan(7);
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        if (isMyTurn) passTurn();
      } else if (e.key === 'v') {
        e.preventDefault();
        shuffleLibrary();
      } else if (e.key === 'f') {
        e.preventDefault();
        setShowLibrarySearch(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [atTable, untapAll, drawCards, mulligan, shuffleLibrary, scryCards?.length ?? 0, isMyTurn, passTurn]);

  // ── Ding sound when it becomes your turn ─────────────────────────────────
  const prevIsMyTurnRef = useRef(false);
  useEffect(() => {
    if (atTable && isMyTurn && !prevIsMyTurnRef.current) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch { /* ignore audio errors */ }
    }
    prevIsMyTurnRef.current = isMyTurn;
  }, [isMyTurn, atTable]);

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

  const allPlayers = Object.values(room?.players ?? {});
  const effectiveMyId = isSandbox ? (activeSandboxPlayerId ?? playerId) : playerId;
  const opponents = allPlayers.filter(p => p.playerId !== effectiveMyId);
  const myBfCards: BattlefieldCard[] = myBattlefieldCards;
  const useGrid = opponents.length >= 1;

  const handleConcede = () => {
    concede();
    leaveGame();
    setAtTable(false);
  };

  const showSandboxTabs = isSandbox && allPlayers.length > 1;
  const myGY = myGraveyardCards ?? [];
  const myExile = myExileCards ?? [];
  const myCmd = myCommandZoneCards ?? [];

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
            &larr; Leave
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
        {/* Zone count HUD — center of top bar */}
        <div className="flex-1 flex justify-center items-center gap-3">
          <ZoneCountHUD />
          {((room.turnOrder?.length ?? 0) > 0 || allPlayers.length > 0) && (() => {
            const order = room.turnOrder?.length ? room.turnOrder : allPlayers.map(p => p.playerId);
            const idx = room.activePlayerIndex ?? 0;
            if (!order?.length) return null;
            const activeId = order[idx % order.length];
            const activeName = room.players[activeId]?.playerName ?? 'Unknown';
            return (
              <div className="flex items-center gap-2">
                {isMyTurn ? (
                  <>
                    <span className="text-orange-400 text-xs font-bold animate-pulse">Your Turn</span>
                    <button
                      onClick={passTurn}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500/35 border border-orange-500/50 text-orange-300 hover:text-orange-200 font-semibold transition-all"
                    >
                      Pass &rarr;
                    </button>
                  </>
                ) : (
                  <span className="text-cream-muted/60 text-xs">
                    {activeName}&apos;s Turn
                  </span>
                )}
              </div>
            );
          })()}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isSandbox ? (
            <span className="text-yellow-400/60 text-xs">offline &middot; local only</span>
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
      <div className="flex flex-1 overflow-hidden min-h-0 relative">

        {/* ── Floating controls (top-left overlay) ─────────────────────── */}
        <GameControls onConcede={handleConcede} />

        {/* ── Opponent info panel (top-right overlay) ──────────────────── */}
        <OpponentInfoPanel />

        {/* ── Center ──────────────────────────────────────────────────── */}
        {useGrid ? (
          /* ── Grid mode (1+ opponents) ───────────────────────────── */
          <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
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
                        isActive ? 'bg-navy border-cyan-dim/50 text-cyan' : 'bg-navy-light/50 border-cyan-dim/20 text-cream-muted hover:text-cream hover:bg-navy-light'
                      }`}
                    >
                      {p.playerName}
                      {isYou && <span className="ml-1 text-[9px] opacity-50">(you)</span>}
                      <span className="ml-1.5 text-[9px] opacity-60 flex items-center gap-0.5"><Heart className="w-2.5 h-2.5 fill-red-400 text-red-400" />{p.life}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div
              className="flex-1 min-w-0 min-h-0 grid gap-px bg-cyan-dim/30 p-px"
              style={{
                gridTemplateColumns: opponents.length === 1 ? '1fr' : '1fr 1fr',
                gridTemplateRows: opponents.length === 1 ? '1fr 1fr' : '1fr 1fr',
              }}
            >
            {opponents[0] && (
              <div className="overflow-hidden bg-navy/60 min-h-0" style={opponents.length === 1 ? { gridColumn: 1 } : undefined}>
                <OpponentView player={opponents[0]} fillHeight />
              </div>
            )}
            {opponents[1] && (
              <div className="overflow-hidden bg-navy/60 min-h-0">
                <OpponentView player={opponents[1]} fillHeight />
              </div>
            )}
            {opponents[2] && (
              <div className="overflow-hidden bg-navy/60 min-h-0">
                <OpponentView player={opponents[2]} fillHeight />
              </div>
            )}

            {myPlayer && (
              <div className="flex flex-col min-h-0 overflow-hidden bg-navy/60" style={opponents.length <= 2 ? { gridColumn: '1 / -1' } : undefined}>
                <PlayerBanner player={myPlayer} isCurrentPlayer compact />
                <div className="flex-1 min-h-0 p-1 overflow-hidden flex flex-col">
                  <BattlefieldZone cards={myBfCards} label={myPlayer.playerName ? `${myPlayer.playerName}'s Battlefield` : 'Your Battlefield'} isOwnBattlefield />
                </div>
              </div>
            )}
            </div>

            {myPlayer && (
              <BottomBar graveyardCards={myGY} exileCards={myExile} commandCards={myCmd} commanderTax={myPlayer.commanderTax} handCards={myHandCards} libraryCount={myPlayer.libraryCardIds.length} playerId={effectiveMyId!} player={myPlayer} actions={room.actionLog ?? []} />
            )}
          </div>
        ) : (
          /* ── Classic stacked mode (0 opponents) ─────────────────── */
          <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
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
                        isActive ? 'bg-navy border-cyan-dim/50 text-cyan' : 'bg-navy-light/50 border-cyan-dim/20 text-cream-muted hover:text-cream hover:bg-navy-light'
                      }`}
                    >
                      {p.playerName}
                      {isYou && <span className="ml-1 text-[9px] opacity-50">(you)</span>}
                      <span className="ml-1.5 text-[9px] opacity-60 flex items-center gap-0.5"><Heart className="w-2.5 h-2.5 fill-red-400 text-red-400" />{p.life}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {opponents.length > 0 && (
              <div className="shrink-0 border-b border-cyan-dim/30 bg-navy/50 flex gap-1 min-h-[100px]" style={{ maxHeight: opponents.length === 1 ? '30%' : '35%' }}>
                {opponents.map(opp => (
                  <div key={opp.playerId} className="flex-1 min-w-0 overflow-hidden">
                    <OpponentView player={opp} fillHeight />
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 p-2 overflow-hidden min-h-0 flex flex-col">
              <BattlefieldZone cards={myBfCards} label={myPlayer?.playerName ? `${myPlayer.playerName}'s Battlefield` : 'Your Battlefield'} isOwnBattlefield />
            </div>

            {myPlayer && (
              <BottomBar graveyardCards={myGY} exileCards={myExile} commandCards={myCmd} commanderTax={myPlayer.commanderTax} handCards={myHandCards} libraryCount={myPlayer.libraryCardIds.length} playerId={effectiveMyId!} player={myPlayer} actions={room.actionLog ?? []} />
            )}
          </div>
        )}
      </div>

      {/* ── Targeting arrows — full-viewport overlay ──────────────────── */}
      <TargetingOverlay />

      {/* ── Floating hover inspector — top-right ─────────────────────── */}
      <CardHoverInspector />

      {/* ── Scry / Surveil overlay ─────────────────────────────────────── */}
      {(scryCards?.length ?? 0) > 0 && (
        <ScryOverlay cards={scryCards} instanceIds={scryInstanceIds} initialMode={scryMode} />
      )}

      {/* ── Library search overlay (F shortcut) ──────────────────────── */}
      {showLibrarySearch && (
        <LibrarySearchOverlay onClose={() => setShowLibrarySearch(false)} />
      )}

      {/* ── Deck import modal ──────────────────────────────────────────── */}
      {showImportAfterJoin && (
        <DeckImportModal onClose={() => setShowImportAfterJoin(false)} />
      )}
    </div>
    </CardInspectorProvider>
  );
}
