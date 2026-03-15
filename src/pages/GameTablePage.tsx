import { useState, useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';
import { useGameTable } from '../contexts/GameTableContext';
import GameLobby from '../components/game/GameLobby';
import BattlefieldZone from '../components/game/BattlefieldZone';
import PlayerBanner from '../components/game/PlayerBanner';
import OpponentView from '../components/game/OpponentView';
import GameControls from '../components/game/GameControls';
import ScryOverlay from '../components/game/ScryOverlay';
import DeckPickerModal from '../components/game/DeckPickerModal';
import ZoneCountHUD from '../components/game/ZoneCountHUD';
import BottomBar from '../components/game/BottomBar';
import CardHoverInspector from '../components/game/CardHoverInspector';
import LibrarySearchOverlay from '../components/game/LibrarySearchOverlay';
import TargetingOverlay from '../components/game/TargetingOverlay';
import OpponentInfoPanel from '../components/game/OpponentInfoPanel';
import type { DeckRecord } from '../types/deck';
import type { BattlefieldCard } from '../types/game';
import { deckRecordToSandboxImportPayload } from '../utils/deckArena';
import { CardInspectorProvider } from '../components/game/CardInspectorPanel';
import { speakPagas, isTTSSupported } from '../utils/gameTTS';

interface GameTablePageProps {
  pendingDeck?: DeckRecord | null;
  onPendingDeckConsumed?: () => void;
  onBack?: () => void;
}

export default function GameTablePage({ pendingDeck, onPendingDeckConsumed, onBack }: GameTablePageProps) {
  const {
    room, playerId, leaveGame,
    myPlayer, myHandCards, myBattlefieldCards,
    myGraveyardCards, myExileCards, myCommandZoneCards,
    scryCards, scryInstanceIds, scryMode,
    untapAll, drawCards, mulligan, shuffleLibrary,
    concede, connected, gameRoomId, isSandbox,
    activeSandboxPlayerId, setActiveSandboxPlayer,
    passTurn, isMyTurn,
    importDeck,
  } = useGameTable();

  const [atTable, setAtTable] = useState(false);
  const [showImportAfterJoin, setShowImportAfterJoin] = useState(false);
  const [showLibrarySearch, setShowLibrarySearch] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [pendingDeckImported, setPendingDeckImported] = useState(false);
  const pendingImportInFlightRef = useRef(false);

  const copyRoomCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

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
      } else if ((e.key === 'p' || e.key === 'P') && isTTSSupported()) {
        e.preventDefault();
        speakPagas();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [atTable, untapAll, drawCards, mulligan, shuffleLibrary, scryCards?.length ?? 0, isMyTurn, passTurn]);

  // ── Turn change sound + fading banner ────────────────────────────────────
  const prevIsMyTurnRef = useRef(false);
  const [turnBanner, setTurnBanner] = useState<string | null>(null);
  useEffect(() => {
    if (atTable && isMyTurn && !prevIsMyTurnRef.current) {
      // Play a pleasant two-tone chime (~1.2s total)
      try {
        const ctx = new AudioContext();
        const t = ctx.currentTime;
        // First note
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.value = 660;
        gain1.gain.setValueAtTime(0.25, t);
        gain1.gain.exponentialRampToValueAtTime(0.08, t + 0.4);
        gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
        osc1.connect(gain1).connect(ctx.destination);
        osc1.start(t);
        osc1.stop(t + 0.6);
        // Second note (higher, delayed)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = 880;
        gain2.gain.setValueAtTime(0.0001, t);
        gain2.gain.setValueAtTime(0.3, t + 0.3);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 1.2);
        osc2.connect(gain2).connect(ctx.destination);
        osc2.start(t + 0.3);
        osc2.stop(t + 1.2);
      } catch { /* ignore audio errors */ }
      // Show "Your Turn" banner
      setTurnBanner('Your Turn');
    } else if (atTable && !isMyTurn && prevIsMyTurnRef.current && room) {
      // Show who's turn it is now
      const order = room.turnOrder?.length ? room.turnOrder : Object.keys(room.players);
      const idx = room.activePlayerIndex ?? 0;
      const activeId = order[idx % order.length];
      const activeName = activeId ? room.players[activeId]?.playerName : null;
      if (activeName) setTurnBanner(`${activeName}'s Turn`);
    }
    prevIsMyTurnRef.current = isMyTurn;
  }, [isMyTurn, atTable, room]);

  // Auto-dismiss turn banner after 5 seconds
  useEffect(() => {
    if (!turnBanner) return;
    const timer = setTimeout(() => setTurnBanner(null), 5000);
    return () => clearTimeout(timer);
  }, [turnBanner]);

  useEffect(() => {
    if (!pendingDeck) {
      setPendingDeckImported(false);
      pendingImportInFlightRef.current = false;
      return;
    }

    if (!atTable || !playerId || isSandbox || pendingDeckImported || pendingImportInFlightRef.current) {
      return;
    }

    let cancelled = false;
    pendingImportInFlightRef.current = true;

    // Resolve all card printings client-side before sending to server
    // so the server never needs to call Scryfall.
    deckRecordToSandboxImportPayload(pendingDeck)
      .then(payload => {
        if (cancelled) return;
        return importDeck(payload);
      })
      .then(() => {
        if (cancelled) return;
        setPendingDeckImported(true);
        onPendingDeckConsumed?.();
      })
      .catch(() => {
        if (cancelled) return;
        setPendingDeckImported(false);
      })
      .finally(() => {
        if (!cancelled) pendingImportInFlightRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [atTable, importDeck, isSandbox, onPendingDeckConsumed, pendingDeck, pendingDeckImported, playerId]);

  if (!room || !atTable) {
    return (
      <GameLobby
        pendingDeck={pendingDeck}
        onBack={onBack}
        onEnterTable={(sandbox) => {
          setAtTable(true);
          // Don't show import modal if player already has cards (rejoining)
          const myCards = room ? Object.values(room.cards).filter(c => c.controller === playerId) : [];
          setShowImportAfterJoin(!sandbox && !pendingDeck && myCards.length === 0);
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
            className="text-magenta text-sm px-3 py-1.5 rounded-lg bg-magenta/20 hover:bg-magenta/30 border border-magenta/40 transition-all"
          >
            ← Leave
          </button>
          <span className="text-cream font-bold">🃏 Game Table</span>
          {isSandbox ? (
            <span className="bg-yellow-600/20 border border-yellow-600/50 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded-full">
              🧪 SANDBOX
            </span>
          ) : (gameRoomId && room.code && (
            <button
              onClick={() => copyRoomCode(room.code)}
              className="text-cream-muted text-sm hover:text-cream transition-colors cursor-pointer"
              title="Click to copy room code"
            >
              Code: <span className="font-mono font-bold text-cyan">{room.code}</span>
              <span className="ml-1 text-xs">{codeCopied ? '✓' : '⎘'}</span>
            </button>
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
                    <span className="text-magenta text-xs font-bold animate-pulse">Your Turn</span>
                    <button
                      onClick={passTurn}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-magenta/20 hover:bg-magenta/35 border border-magenta/50 text-magenta hover:text-pink-300 font-semibold transition-all"
                    >
                      Pass &rarr;
                    </button>
                  </>
                ) : (
                  <span className="text-magenta/60 text-xs font-semibold">
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

      {/* ── Turn banner — center of board, fades out ──────────────────── */}
      {turnBanner && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none"
          style={{ animation: 'fadeInOut 5s ease forwards' }}
        >
          <div className="px-8 py-4 bg-navy/80 border border-cyan/40 rounded-2xl backdrop-blur-sm shadow-2xl">
            <span className="text-3xl font-black text-cyan tracking-wide">{turnBanner}</span>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: scale(0.9); }
          10% { opacity: 1; transform: scale(1); }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

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

      {/* ── Deck picker modal (load from library) ────────────────────── */}
      {showImportAfterJoin && (
        <DeckPickerModal
          source="auto-open-after-join"
          onClose={() => setShowImportAfterJoin(false)}
        />
      )}
    </div>
    </CardInspectorProvider>
  );
}
