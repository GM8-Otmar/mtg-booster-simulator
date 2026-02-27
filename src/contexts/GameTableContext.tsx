import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  GameRoom,
  GamePlayerState,
  BattlefieldCard,
  GameZone,
  TokenTemplate,
  GameAction,
} from '../types/game';
import type { ParsedDeck } from '../utils/deckImport';
import { applyDelta, appendLog } from '../utils/gameDelta';

// ─── Types exposed to components ─────────────────────────────────────────────

export interface GameTableContextType {
  // state
  room: GameRoom | null;
  playerId: string | null;
  /** In sandbox multi-player, this is the active sandbox player; otherwise same as playerId */
  effectivePlayerId: string | null;
  playerName: string | null;
  gameRoomId: string | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  // scry overlay
  scryCards: BattlefieldCard[];
  scryInstanceIds: string[];
  scryMode: 'scry' | 'surveil';
  // undo
  canUndo: boolean;
  undo: () => void;
  // derived helpers
  myPlayer: GamePlayerState | null;
  myHandCards: BattlefieldCard[];
  myBattlefieldCards: BattlefieldCard[];
  myLibraryCount: number;
  myGraveyardCards: BattlefieldCard[];
  myExileCards: BattlefieldCard[];
  myCommandZoneCards: BattlefieldCard[];

  // lobby actions
  createGame: (playerName: string, format?: string) => Promise<string>; // returns code
  joinGame: (code: string, playerName: string) => Promise<void>;
  importDeck: (deck: ParsedDeck) => Promise<void>;
  leaveGame: () => void;
  /** Load a pre-built fake room for offline sandbox testing (no server needed) */
  loadSandbox: (room: GameRoom, sandboxPlayerId: string, sandboxPlayerName: string) => void;
  isSandbox: boolean;
  /** Active player in sandbox multi-player mode */
  activeSandboxPlayerId: string | null;
  setActiveSandboxPlayer: (id: string) => void;

  // game actions
  moveCard: (instanceId: string, x: number, y: number, persist: boolean) => void;
  changeZone: (instanceId: string, toZone: GameZone, toIndex?: number) => void;
  tapCard: (instanceId: string, tapped: boolean) => void;
  tapAll: (filter?: 'all' | 'lands') => void;
  untapAll: () => void;
  setFaceDown: (instanceId: string, faceDown: boolean) => void;
  addCounter: (instanceId: string, counterType: string, delta: number, label?: string) => void;
  resetCounters: (instanceId: string) => void;
  revealCards: (instanceIds: string[]) => void;
  shakeCards: (instanceIds: string[]) => void;
  shakingCardIds: Set<string>;

  // player actions
  adjustLife: (delta: number) => void;
  setLife: (value: number) => void;
  adjustPoison: (delta: number) => void;
  dealCommanderDamage: (victimId: string, commanderInstanceId: string, amount: number) => void;
  notifyCommanderCast: (instanceId: string) => void;

  // library actions
  drawCards: (count: number) => void;
  shuffleLibrary: () => void;
  scry: (count: number, mode?: 'scry' | 'surveil') => void;
  resolveScry: (keep: string[], bottom: string[], graveyard?: string[]) => void;
  mulligan: (keepCount: number) => void;

  // tokens
  createToken: (template: TokenTemplate, x: number, y: number) => void;

  // turn order
  passTurn: () => void;
  activePlayerId: string | null;
  isMyTurn: boolean;

  // targeting arrows (client-only state)
  targetingArrows: Array<{ id: string; fromId: string; toId: string; createdAt: number }>;
  isTargetingMode: boolean;
  startTargeting: (sourceInstanceId: string) => void;
  cancelTargeting: () => void;
  completeTargeting: (targetId: string) => void;
  dismissArrow: (arrowId: string) => void;
  clearAllArrows: () => void;

  // social
  concede: () => void;
  sendMessage: (text: string) => void;

  // dice
  rollDice: (faces: number, result: number) => void;
}

// ─── Context init ──────────────────────────────────────────────────────────

const GameTableContext = createContext<GameTableContextType | undefined>(undefined);

const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

// ─── Provider ────────────────────────────────────────────────────────────────

export function GameTableProvider({ children }: { children: React.ReactNode }) {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [gameRoomId, setGameRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [scryCards, setScryCards] = useState<BattlefieldCard[]>([]);
  const [scryInstanceIds, setScryInstanceIds] = useState<string[]>([]);
  const [scryMode, setScryMode] = useState<'scry' | 'surveil'>('scry');
  const [isSandbox, setIsSandbox] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<GameRoom | null>(null);
  const [activeSandboxPlayerId, setActiveSandboxPlayerIdState] = useState<string | null>(null);

  // targeting arrows (client-only)
  const [targetingArrows, setTargetingArrows] = useState<Array<{ id: string; fromId: string; toId: string; createdAt: number }>>([]);
  const [targetingSource, setTargetingSource] = useState<string | null>(null);

  // shaking cards (visual-only, temporary)
  const [shakingCardIds, setShakingCardIds] = useState<Set<string>>(new Set());

  const socketRef = useRef<Socket | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const gameRoomIdRef = useRef<string | null>(null);
  const roomRef = useRef<GameRoom | null>(null);
  const pendingLifeLogRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; startLife: number } | null>(null);
  const isSandboxRef = useRef(false);
  const activeSandboxPlayerIdRef = useRef<string | null>(null);

  // keep refs in sync
  useEffect(() => { playerIdRef.current = playerId; }, [playerId]);
  useEffect(() => { gameRoomIdRef.current = gameRoomId; }, [gameRoomId]);
  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { isSandboxRef.current = isSandbox; }, [isSandbox]);
  useEffect(() => { activeSandboxPlayerIdRef.current = activeSandboxPlayerId; }, [activeSandboxPlayerId]);

  // ── Socket setup ──────────────────────────────────────────────────────────

  useEffect(() => {
    const sock = io(SOCKET_URL);
    socketRef.current = sock;

    sock.on('connect', () => setConnected(true));
    sock.on('disconnect', () => setConnected(false));
    sock.on('game:error', (msg: string) => setError(msg));

    // Full state snapshot (on join)
    sock.on('game:state', (snapshot: GameRoom) => {
      setRoom(snapshot);
    });

    // Delta patches — apply to local state
    sock.on('game:delta', (delta: any) => {
      setRoom(prev => {
        if (!prev) return prev;
        return applyDelta(prev, delta, playerIdRef.current);
      });
    });

    // Shake effect — visual only, auto-clears after 600ms
    sock.on('game:shake', ({ instanceIds }: { instanceIds: string[] }) => {
      const ids = new Set<string>(instanceIds);
      setShakingCardIds(prev => new Set([...prev, ...ids]));
      setTimeout(() => {
        setShakingCardIds(prev => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        });
      }, 600);
    });

    // Scry reveal — only arrives at the scryer's socket
    sock.on('game:scry:reveal', ({ cards, instanceIds }: { cards: BattlefieldCard[]; instanceIds: string[] }) => {
      setScryCards(cards);
      setScryInstanceIds(instanceIds);
    });

    return () => { sock.close(); };
  }, []);

  // ── Join socket room when gameRoomId set ──────────────────────────────────

  useEffect(() => {
    const sock = socketRef.current;
    if (!sock || !gameRoomId || !playerId) return;
    sock.emit('game:join', { gameRoomId, playerId });
    return () => {
      sock.emit('game:leave', { gameRoomId });
    };
  }, [gameRoomId, playerId]);

  // ── REST helpers ──────────────────────────────────────────────────────────

  const post = useCallback(async (path: string, body: unknown): Promise<any> => {
    const res = await fetch(`/api/games${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => 'Request failed');
      throw new Error(text);
    }
    return res.json();
  }, []);

  // ── Lobby actions ─────────────────────────────────────────────────────────

  const createGame = useCallback(async (name: string, format = 'free'): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const data = await post('', { hostName: name, format });
      setPlayerId(data.playerId);
      setPlayerName(name);
      setGameRoomId(data.room.id);
      return data.room.code as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create game');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [post]);

  const joinGame = useCallback(async (code: string, name: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await post(`/${code}/join`, { playerName: name });
      setPlayerId(data.playerId);
      setPlayerName(name);
      setGameRoomId(data.room.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join game');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [post]);

  const importDeck = useCallback(async (deck: ParsedDeck): Promise<void> => {
    if (!gameRoomId || !playerId) throw new Error('Not in a game');
    setLoading(true);
    setError(null);
    try {
      await post(`/${gameRoomId}/import-deck`, { playerId, deck });
      socketRef.current?.emit('game:join', { gameRoomId, playerId });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to import deck');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [gameRoomId, playerId, post]);

  const leaveGame = useCallback(() => {
    if (socketRef.current && gameRoomId) {
      socketRef.current.emit('game:leave', { gameRoomId });
    }
    setRoom(null);
    setPlayerId(null);
    setPlayerName(null);
    setGameRoomId(null);
    setError(null);
    setScryCards([]);
    setScryInstanceIds([]);
    setIsSandbox(false);
    setUndoSnapshot(null);
    setActiveSandboxPlayerIdState(null);
  }, [gameRoomId]);

  /** Load a fake room locally — no socket, no server, no network. */
  const loadSandbox = useCallback((sandboxRoom: GameRoom, sandboxPlayerId: string, sandboxPlayerName: string) => {
    setRoom(sandboxRoom);
    setPlayerId(sandboxPlayerId);
    setPlayerName(sandboxPlayerName);
    setGameRoomId(sandboxRoom.id);
    setIsSandbox(true);
    setError(null);
    setUndoSnapshot(null);
    setActiveSandboxPlayerIdState(sandboxPlayerId);
  }, []);

  const setActiveSandboxPlayer = useCallback((id: string) => {
    setActiveSandboxPlayerIdState(id);
  }, []);

  // ── Emit helpers ──────────────────────────────────────────────────────────
  // In sandbox mode: apply deltas locally instead of emitting to server.

  const emit = useCallback((event: string, payload: object) => {
    const pid = playerIdRef.current;
    const roomId = gameRoomIdRef.current;
    if (!roomId || !pid) return;
    if (isSandboxRef.current) {
      // Use the active sandbox player for actions (supports multi-player switching)
      const activePid = activeSandboxPlayerIdRef.current ?? pid;

      // ── Life changes: apply immediately but debounce the log entry ──────────
      if (event === 'player:life' || event === 'player:life:set') {
        setRoom(prev => {
          if (!prev) return prev;
          return applyLocalSandboxAction(prev, event, { gameRoomId: roomId, playerId: activePid, ...payload }, activePid);
        });
        const currentLife = roomRef.current?.players[activePid]?.life ?? 20;
        if (!pendingLifeLogRef.current) {
          pendingLifeLogRef.current = { timer: null, startLife: currentLife };
        }
        if (pendingLifeLogRef.current.timer) {
          clearTimeout(pendingLifeLogRef.current.timer);
        }
        pendingLifeLogRef.current.timer = setTimeout(() => {
          const currentPid = activeSandboxPlayerIdRef.current ?? playerIdRef.current;
          if (!currentPid || !pendingLifeLogRef.current) return;
          const snapshot = roomRef.current;
          if (!snapshot) { pendingLifeLogRef.current = null; return; }
          const player = snapshot.players[currentPid];
          if (!player) { pendingLifeLogRef.current = null; return; }
          const finalLife = player.life;
          const lifeDelta = finalLife - pendingLifeLogRef.current.startLife;
          const sign = lifeDelta >= 0 ? '+' : '';
          const desc = lifeDelta === 0
            ? `${player.playerName}: ${finalLife} life`
            : `${player.playerName}: ${finalLife} life (${sign}${lifeDelta})`;
          const entry: GameAction = {
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
            playerId: currentPid,
            playerName: player.playerName,
            type: 'life_change',
            description: desc,
          };
          setRoom(prev => prev ? { ...prev, actionLog: appendLog(prev.actionLog, entry) } : prev);
          pendingLifeLogRef.current = null;
        }, 1500);
        return;
      }

      // ── Shake: visual-only, no room state change ──────────────────────────────
      if (event === 'card:shake') {
        const ids = new Set<string>((payload as any).instanceIds as string[]);
        setShakingCardIds(prev => new Set([...prev, ...ids]));
        setTimeout(() => {
          setShakingCardIds(prev => {
            const next = new Set(prev);
            for (const id of ids) next.delete(id);
            return next;
          });
        }, 600);
        return;
      }

      // ── All other sandbox events ─────────────────────────────────────────────
      setRoom(prev => {
        if (!prev) return prev;
        return applyLocalSandboxAction(prev, event, { gameRoomId: roomId, playerId: activePid, ...payload }, activePid);
      });
      return;
    }
    if (!socketRef.current) return;
    socketRef.current.emit(event, { gameRoomId: roomId, playerId: pid, ...payload });
  }, []);

  // ── Undo helpers ──────────────────────────────────────────────────────────

  const saveUndoSnapshot = useCallback(() => {
    if (isSandboxRef.current && roomRef.current) {
      setUndoSnapshot(roomRef.current);
    }
  }, []);

  const undo = useCallback(() => {
    if (undoSnapshot) {
      setRoom(undoSnapshot);
      setUndoSnapshot(null);
    }
  }, [undoSnapshot]);

  const canUndo = undoSnapshot !== null && isSandbox;

  // ── Card actions ──────────────────────────────────────────────────────────

  const moveCard = useCallback((instanceId: string, x: number, y: number, persist: boolean) => {
    emit('card:move', { instanceId, x, y, persist });
  }, [emit]);

  const changeZone = useCallback((instanceId: string, toZone: GameZone, toIndex?: number) => {
    saveUndoSnapshot();
    emit('card:zone', { instanceId, toZone, toIndex });
  }, [emit, saveUndoSnapshot]);

  const tapCard = useCallback((instanceId: string, tapped: boolean) => {
    saveUndoSnapshot();
    emit('card:tap', { instanceId, tapped });
  }, [emit, saveUndoSnapshot]);

  const tapAll = useCallback((filter: 'all' | 'lands' = 'all') => {
    saveUndoSnapshot();
    emit('cards:tap-all', { filter, tapped: true });
  }, [emit, saveUndoSnapshot]);

  const untapAll = useCallback(() => {
    saveUndoSnapshot();
    emit('cards:tap-all', { filter: 'all', tapped: false });
  }, [emit, saveUndoSnapshot]);

  const setFaceDown = useCallback((instanceId: string, faceDown: boolean) => {
    emit('card:facedown', { instanceId, faceDown });
  }, [emit]);

  const addCounter = useCallback((instanceId: string, counterType: string, delta: number, label?: string) => {
    saveUndoSnapshot();
    emit('card:counter', { instanceId, counterType, delta, label });
  }, [emit, saveUndoSnapshot]);

  const resetCounters = useCallback((instanceId: string) => {
    saveUndoSnapshot();
    emit('card:counter:reset', { instanceId });
  }, [emit, saveUndoSnapshot]);

  const revealCards = useCallback((instanceIds: string[]) => {
    emit('card:reveal', { instanceIds });
  }, [emit]);

  const shakeCards = useCallback((instanceIds: string[]) => {
    emit('card:shake', { instanceIds });
  }, [emit]);

  // ── Player actions ────────────────────────────────────────────────────────

  const adjustLife = useCallback((delta: number) => {
    emit('player:life', { delta });
  }, [emit]);

  const setLife = useCallback((value: number) => {
    emit('player:life:set', { value });
  }, [emit]);

  const adjustPoison = useCallback((delta: number) => {
    emit('player:poison', { delta });
  }, [emit]);

  const dealCommanderDamage = useCallback((victimId: string, commanderInstanceId: string, amount: number) => {
    if (!socketRef.current || !gameRoomId) return;
    socketRef.current.emit('commander:damage', { gameRoomId, victimId, commanderInstanceId, amount });
  }, [gameRoomId]);

  const notifyCommanderCast = useCallback((instanceId: string) => {
    emit('commander:cast', { instanceId });
  }, [emit]);

  // ── Library ───────────────────────────────────────────────────────────────

  const drawCards = useCallback((count: number) => {
    emit('library:draw', { count });
  }, [emit]);

  const shuffleLibrary = useCallback(() => {
    emit('library:shuffle', {});
  }, [emit]);

  const scry = useCallback((count: number, mode: 'scry' | 'surveil' = 'scry') => {
    setScryMode(mode);
    if (isSandboxRef.current) {
      const activePid = activeSandboxPlayerIdRef.current ?? playerIdRef.current;
      const currentRoom = roomRef.current;
      if (!activePid || !currentRoom) return;
      const player = currentRoom.players[activePid];
      if (!player) return;
      const scryCount = Math.min(count, player.libraryCardIds.length);
      const ids = player.libraryCardIds.slice(0, scryCount);
      const cards = ids.map(id => currentRoom.cards[id]).filter((c): c is BattlefieldCard => c != null);
      setScryCards(cards);
      setScryInstanceIds(ids);
      // Log the scry/surveil action
      if (scryCount > 0) {
        const verb = mode === 'surveil' ? 'surveilled' : 'scryed';
        const entry: GameAction = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          playerId: activePid,
          playerName: player.playerName,
          type: 'scry',
          description: `${player.playerName} ${verb} ${scryCount}`,
        };
        setRoom(prev => prev ? { ...prev, actionLog: appendLog(prev.actionLog, entry) } : prev);
      }
      return;
    }
    emit('library:scry', { count });
  }, [emit]);

  const resolveScry = useCallback((keep: string[], bottom: string[], graveyard?: string[]) => {
    setScryCards([]);
    setScryInstanceIds([]);
    if (isSandboxRef.current) {
      const activePid = activeSandboxPlayerIdRef.current ?? playerIdRef.current;
      if (!activePid) return;
      setRoom(prev => {
        if (!prev) return prev;
        const player = prev.players[activePid];
        if (!player) return prev;
        const allScried = [...keep, ...bottom, ...(graveyard ?? [])];
        // Remove these from library, then put keep at front and bottom at back
        let libIds = player.libraryCardIds.filter(id => !allScried.includes(id));
        libIds = [...keep, ...libIds, ...bottom];
        const newGraveIds = graveyard ? [...player.graveyardCardIds, ...graveyard] : player.graveyardCardIds;
        const newCards = { ...prev.cards };
        for (const id of graveyard ?? []) {
          if (newCards[id]) newCards[id] = { ...newCards[id]!, zone: 'graveyard' };
        }
        const logEntry: GameAction = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          playerId: activePid,
          playerName: player.playerName,
          type: 'scry',
          description: `${player.playerName} resolved scry`,
        };
        return {
          ...prev,
          cards: newCards,
          players: {
            ...prev.players,
            [activePid]: { ...player, libraryCardIds: libIds, graveyardCardIds: newGraveIds },
          },
          actionLog: appendLog(prev.actionLog, logEntry),
        };
      });
      return;
    }
    emit('library:scry:resolve', { keep, bottom, graveyard });
  }, [emit]);

  const mulligan = useCallback((keepCount: number) => {
    emit('library:mulligan', { keepCount });
  }, [emit]);

  // ── Tokens ────────────────────────────────────────────────────────────────

  const createToken = useCallback((template: TokenTemplate, x: number, y: number) => {
    saveUndoSnapshot();
    emit('token:create', { template, x, y });
  }, [emit, saveUndoSnapshot]);

  // ── Social ────────────────────────────────────────────────────────────────

  const concede = useCallback(() => {
    emit('game:concede', {});
  }, [emit]);

  const sendMessage = useCallback((text: string) => {
    emit('game:message', { text });
  }, [emit]);

  const rollDice = useCallback((faces: number, result: number) => {
    emit('game:dice-roll', { faces, result });
  }, [emit]);

  // ── Turn order ────────────────────────────────────────────────────────────

  const passTurn = useCallback(() => {
    emit('game:pass-turn', {});
  }, [emit]);

  // ── Targeting arrows (client-only) ────────────────────────────────────────

  const isTargetingMode = targetingSource !== null;

  const startTargeting = useCallback((sourceInstanceId: string) => {
    setTargetingSource(sourceInstanceId);
  }, []);

  const cancelTargeting = useCallback(() => {
    setTargetingSource(null);
  }, []);

  const completeTargeting = useCallback((targetId: string) => {
    const source = targetingSource;
    if (!source) return;
    setTargetingSource(null);
    const arrowId = makeLogId();
    const createdAt = Date.now();
    setTargetingArrows(prev => [...prev, { id: arrowId, fromId: source, toId: targetId, createdAt }]);
    // Auto-remove arrow after 5 seconds
    setTimeout(() => {
      setTargetingArrows(prev => prev.filter(a => a.id !== arrowId));
    }, 5000);
    // Append client-side log entry
    const currentRoom = roomRef.current;
    const activePid = activeSandboxPlayerIdRef.current ?? playerIdRef.current;
    if (currentRoom && activePid) {
      const me = currentRoom.players[activePid];
      const myName = me?.playerName ?? 'Player';
      const fromCard = currentRoom.cards[source];
      // targetId may be a card instanceId or a playerId
      const toCard = currentRoom.cards[targetId];
      const toPlayer = currentRoom.players[targetId];
      const fromName = fromCard?.name ?? source;
      const toName = toCard?.name ?? toPlayer?.playerName ?? targetId;
      const entry: GameAction = {
        id: makeLogId(),
        timestamp: new Date().toISOString(),
        playerId: activePid,
        playerName: myName,
        type: 'targeting',
        description: `${myName}: ${fromName} targets ${toName}`,
      };
      setRoom(prev => prev ? { ...prev, actionLog: appendLog(prev.actionLog, entry) } : prev);
    }
  }, [targetingSource]);

  const dismissArrow = useCallback((arrowId: string) => {
    setTargetingArrows(prev => prev.filter(a => a.id !== arrowId));
  }, []);

  const clearAllArrows = useCallback(() => {
    setTargetingArrows([]);
  }, []);

  // ── Derived helpers (use activeSandboxPlayerId in sandbox) ────────────────

  const effectivePlayerId = isSandbox ? (activeSandboxPlayerId ?? playerId) : playerId;

  // Turn order derived values
  const activePlayerId = room?.turnOrder?.length
    ? room.turnOrder[room.activePlayerIndex % room.turnOrder.length] ?? null
    : null;
  const isMyTurn = activePlayerId === effectivePlayerId;

  const myPlayer = room && effectivePlayerId ? (room.players[effectivePlayerId] ?? null) : null;

  const myHandCards = room && myPlayer
    ? myPlayer.handCardIds.map(id => room.cards[id]).filter((c): c is BattlefieldCard => c != null)
    : [];

  const myBattlefieldCards = room && effectivePlayerId
    ? Object.values(room.cards).filter(
        c => c.zone === 'battlefield' && c.controller === effectivePlayerId,
      )
    : [];

  const myLibraryCount = myPlayer?.libraryCardIds.length ?? 0;

  const myGraveyardCards = room && myPlayer
    ? myPlayer.graveyardCardIds.map(id => room.cards[id]).filter((c): c is BattlefieldCard => c != null)
    : [];

  const myExileCards = room && myPlayer
    ? myPlayer.exileCardIds.map(id => room.cards[id]).filter((c): c is BattlefieldCard => c != null)
    : [];

  const myCommandZoneCards = room && myPlayer
    ? myPlayer.commandZoneCardIds.map(id => room.cards[id]).filter((c): c is BattlefieldCard => c != null)
    : [];

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <GameTableContext.Provider value={{
      room, playerId, effectivePlayerId, playerName, gameRoomId,
      loading, error, connected,
      scryCards, scryInstanceIds, scryMode,
      canUndo, undo,
      myPlayer, myHandCards, myBattlefieldCards, myLibraryCount,
      myGraveyardCards, myExileCards, myCommandZoneCards,
      createGame, joinGame, importDeck, leaveGame, loadSandbox, isSandbox,
      activeSandboxPlayerId, setActiveSandboxPlayer,
      moveCard, changeZone, tapCard, tapAll, untapAll, setFaceDown, addCounter, resetCounters, revealCards, shakeCards, shakingCardIds,
      adjustLife, setLife, adjustPoison, dealCommanderDamage, notifyCommanderCast,
      drawCards, shuffleLibrary, scry, resolveScry, mulligan,
      createToken,
      passTurn, activePlayerId, isMyTurn,
      targetingArrows, isTargetingMode, startTargeting, cancelTargeting, completeTargeting, dismissArrow, clearAllArrows,
      concede, sendMessage,
      rollDice,
    }}>
      {children}
    </GameTableContext.Provider>
  );
}

export function useGameTable() {
  const ctx = useContext(GameTableContext);
  if (!ctx) throw new Error('useGameTable must be used within GameTableProvider');
  return ctx;
}

// ─── Sandbox local action handler ───────────────────────────────────────────

const ZONE_LABELS: Record<string, string> = {
  battlefield: 'Battlefield',
  hand: 'Hand',
  library: 'Library',
  graveyard: 'Graveyard',
  exile: 'Exile',
  command_zone: 'Command Zone',
  sideboard: 'Sideboard',
};

function makeLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function sandboxLog(playerId: string, playerName: string, type: string, description: string): GameAction {
  return { id: makeLogId(), timestamp: new Date().toISOString(), playerId, playerName, type, description };
}

function applyLocalSandboxAction(room: GameRoom, event: string, payload: any, myPlayerId: string): GameRoom {
  const shuffleArr = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  };

  const me = room.players[myPlayerId];
  const myName = me?.playerName ?? 'Player';
  const log = (type: string, desc: string) => sandboxLog(myPlayerId, myName, type, desc);

  switch (event) {
    case 'card:move':
      return applyDelta(room, { type: payload.persist ? 'card_moved' : 'card_moving', instanceId: payload.instanceId, x: payload.x, y: payload.y }, myPlayerId);

    case 'card:tap':
      return applyDelta(room, { type: 'card_tapped', instanceId: payload.instanceId, tapped: payload.tapped }, myPlayerId);

    case 'cards:tap-all': {
      const changed = Object.values(room.cards)
        .filter(c => c.controller === myPlayerId && c.zone === 'battlefield')
        .map(c => c.instanceId);
      const result = applyDelta(room, { type: 'cards_tap_all', changed, tapped: payload.tapped }, myPlayerId);
      let tapDesc: string;
      if (!payload.tapped) tapDesc = `${myName} untapped all permanents`;
      else if (payload.filter === 'lands') tapDesc = `${myName} tapped all lands`;
      else tapDesc = `${myName} tapped all permanents`;
      return { ...result, actionLog: appendLog(result.actionLog, log('tap_all', tapDesc)) };
    }

    case 'card:zone': {
      const card = room.cards[payload.instanceId];
      const fromZone = card?.zone ?? 'battlefield';
      const cardName = card?.name ?? 'a card';
      let zoneDesc: string;
      if (fromZone === 'hand' && payload.toZone === 'battlefield') {
        zoneDesc = `${myName} played ${cardName}`;
      } else {
        const toLabel = ZONE_LABELS[payload.toZone as string] ?? payload.toZone;
        zoneDesc = `${myName}: ${cardName} → ${toLabel}`;
      }
      return applyDelta(room, {
        type: 'zone_changed',
        instanceId: payload.instanceId,
        toZone: payload.toZone,
        toIndex: payload.toIndex,
        log: log('zone_change', zoneDesc),
      }, myPlayerId);
    }

    case 'card:facedown':
      return applyDelta(room, { type: 'card_facedown', instanceId: payload.instanceId, faceDown: payload.faceDown }, myPlayerId);

    case 'card:counter': {
      const card = room.cards[payload.instanceId];
      if (!card) return room;
      const existing = card.counters.find(c => c.type === payload.counterType && c.label === payload.label);
      let counters = [...card.counters];
      if (existing) {
        const val = existing.value + payload.delta;
        counters = counters.map(c => c === existing ? { ...c, value: val } : c);
      } else if (payload.delta !== 0) {
        counters = [...counters, { type: payload.counterType, value: payload.delta, label: payload.label }];
      }
      const labelText = 'counter';
      const counterSign = (payload.delta as number) >= 0 ? '+' : '';
      const counterDesc = `${myName}: ${card.name} ${counterSign}${payload.delta} ${labelText}`;
      const afterCounters = applyDelta(room, { type: 'counters_changed', instanceId: payload.instanceId, counters }, myPlayerId);
      return { ...afterCounters, actionLog: appendLog(afterCounters.actionLog, log('counter_change', counterDesc)) };
    }

    case 'card:counter:reset': {
      const card = room.cards[payload.instanceId];
      if (!card) return room;
      return applyDelta(room, { type: 'counters_changed', instanceId: payload.instanceId, counters: [] }, myPlayerId);
    }

    case 'card:reveal': {
      const instanceIds = payload.instanceIds as string[];
      const names = instanceIds.map(id => room.cards[id]?.name).filter((n): n is string => !!n);
      let desc: string;
      if (names.length === 1) {
        desc = `${myName} revealed ${names[0]}`;
      } else {
        desc = `${myName} revealed ${names.length} cards: ${names.join(', ')}`;
      }
      return { ...room, actionLog: appendLog(room.actionLog, log('reveal', desc)) };
    }

    // Note: life events are intercepted in emit() for debounced logging — these just apply the state change.
    case 'player:life': {
      const player = room.players[myPlayerId];
      if (!player) return room;
      return applyDelta(room, { type: 'life_changed', playerId: myPlayerId, life: player.life + payload.delta }, myPlayerId);
    }

    case 'player:life:set':
      return applyDelta(room, { type: 'life_changed', playerId: myPlayerId, life: payload.value }, myPlayerId);

    case 'player:poison': {
      const player = room.players[myPlayerId];
      if (!player) return room;
      const newPoison = Math.max(0, player.poisonCounters + payload.delta);
      const poisonSign = (payload.delta as number) >= 0 ? '+' : '';
      const poisonDesc = `${myName}: ${newPoison} poison (${poisonSign}${payload.delta})`;
      const afterPoison = applyDelta(room, { type: 'poison_changed', playerId: myPlayerId, poisonCounters: newPoison }, myPlayerId);
      return { ...afterPoison, actionLog: appendLog(afterPoison.actionLog, log('poison_change', poisonDesc)) };
    }

    case 'commander:cast': {
      const player = room.players[myPlayerId];
      if (!player) return room;
      const commanderCard = Object.values(room.cards).find(c => c.controller === myPlayerId && c.isCommander);
      const commanderName = commanderCard?.name ?? 'commander';
      return applyDelta(room, {
        type: 'commander_cast',
        playerId: myPlayerId,
        commanderTax: player.commanderTax + 1,
        log: log('commander_cast', `${myName} cast ${commanderName}`),
      }, myPlayerId);
    }

    case 'library:draw': {
      const player = room.players[myPlayerId];
      if (!player) return room;
      const drawCount = Math.min(payload.count, player.libraryCardIds.length);
      const drawn = player.libraryCardIds.slice(0, drawCount).map(id => room.cards[id]!).filter(Boolean);
      const drawDesc = `${myName} drew ${drawn.length} card${drawn.length !== 1 ? 's' : ''}`;
      return applyDelta(room, {
        type: 'cards_drawn',
        drawn,
        log: drawCount > 0 ? log('draw', drawDesc) : undefined,
      }, myPlayerId);
    }

    case 'library:shuffle': {
      const player = room.players[myPlayerId];
      if (!player) return room;
      const shuffled = shuffleArr(player.libraryCardIds);
      const shuffleResult = { ...room, players: { ...room.players, [myPlayerId]: { ...player, libraryCardIds: shuffled } } };
      return { ...shuffleResult, actionLog: appendLog(shuffleResult.actionLog, log('shuffle', `${myName} shuffled their library`)) };
    }

    case 'library:scry:resolve': {
      const player = room.players[myPlayerId];
      if (!player) return room;
      const scryCount = (payload.keep as string[]).length + (payload.bottom as string[]).length;
      const remaining = player.libraryCardIds.slice(scryCount);
      const newLibrary = [...(payload.keep as string[]), ...remaining, ...(payload.bottom as string[])];
      return {
        ...room,
        players: { ...room.players, [myPlayerId]: { ...player, libraryCardIds: newLibrary } },
        actionLog: appendLog(room.actionLog, log('scry', `${myName} resolved scry`)),
      };
    }

    case 'library:mulligan': {
      const player = room.players[myPlayerId];
      if (!player) return room;
      const allIds = shuffleArr([...player.handCardIds, ...player.libraryCardIds]);
      const newHand = allIds.slice(0, 7);
      const newLib = allIds.slice(7);
      const newCards = { ...room.cards };
      for (const id of newHand) { if (newCards[id]) newCards[id] = { ...newCards[id]!, zone: 'hand' }; }
      for (const id of newLib) { if (newCards[id]) newCards[id] = { ...newCards[id]!, zone: 'library' }; }
      const drawn = newHand.map(id => newCards[id]!).filter(Boolean);
      return applyDelta(
        { ...room, cards: newCards, players: { ...room.players, [myPlayerId]: { ...player, handCardIds: [], libraryCardIds: allIds } } },
        { type: 'mulligan', drawn, log: log('mulligan', `${myName} took a mulligan (${newHand.length} cards)`) },
        myPlayerId,
      );
    }

    case 'token:create': {
      const token = { ...payload.template, instanceId: `sandbox-token-${Date.now()}`, scryfallId: 'token', imageUri: payload.template.imageUri ?? null, zone: 'battlefield', controller: myPlayerId, x: payload.x, y: payload.y, tapped: false, faceDown: false, flipped: false, counters: [], isCommander: false } as const;
      const tokenResult = { ...room, cards: { ...room.cards, [token.instanceId]: token } };
      return { ...tokenResult, actionLog: appendLog(tokenResult.actionLog, log('token', `${myName} created ${payload.template.name}`)) };
    }

    case 'game:dice-roll': {
      const diceDesc = `${myName} rolled a d${payload.faces}: ${payload.result}`;
      return { ...room, actionLog: appendLog(room.actionLog, log('dice_roll', diceDesc)) };
    }

    case 'game:pass-turn': {
      const turnOrder = room.turnOrder ?? [];
      if (turnOrder.length === 0) return room;
      const nextIndex = (room.activePlayerIndex + 1) % turnOrder.length;
      const nextPlayerId = turnOrder[nextIndex];
      const nextPlayer = nextPlayerId ? room.players[nextPlayerId] : undefined;
      const nextName = nextPlayer?.playerName ?? 'next player';
      const passDesc = `${myName} passed the turn to ${nextName}`;
      return {
        ...room,
        activePlayerIndex: nextIndex,
        actionLog: appendLog(room.actionLog, log('turn_pass', passDesc)),
      };
    }

    case 'game:concede':
      return { ...room, actionLog: appendLog(room.actionLog, log('concede', `${myName} conceded`)) };

    case 'game:message':
    default:
      return room;
  }
}
