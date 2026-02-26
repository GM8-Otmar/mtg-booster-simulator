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
} from '../types/game';
import type { ParsedDeck } from '../utils/deckImport';
import { applyDelta } from '../utils/gameDelta';

// ─── Types exposed to components ─────────────────────────────────────────────

export interface GameTableContextType {
  // state
  room: GameRoom | null;
  playerId: string | null;
  playerName: string | null;
  gameRoomId: string | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  // scry overlay
  scryCards: BattlefieldCard[];
  scryInstanceIds: string[];
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

  // game actions
  moveCard: (instanceId: string, x: number, y: number, persist: boolean) => void;
  changeZone: (instanceId: string, toZone: GameZone, toIndex?: number) => void;
  tapCard: (instanceId: string, tapped: boolean) => void;
  tapAll: (filter?: 'all' | 'lands') => void;
  untapAll: () => void;
  setFaceDown: (instanceId: string, faceDown: boolean) => void;
  addCounter: (instanceId: string, counterType: string, delta: number, label?: string) => void;

  // player actions
  adjustLife: (delta: number) => void;
  setLife: (value: number) => void;
  adjustPoison: (delta: number) => void;
  dealCommanderDamage: (victimId: string, commanderInstanceId: string, amount: number) => void;
  notifyCommanderCast: (instanceId: string) => void;

  // library actions
  drawCards: (count: number) => void;
  shuffleLibrary: () => void;
  scry: (count: number) => void;
  resolveScry: (keep: string[], bottom: string[]) => void;
  mulligan: (keepCount: number) => void;

  // tokens
  createToken: (template: TokenTemplate, x: number, y: number) => void;

  // social
  concede: () => void;
  sendMessage: (text: string) => void;
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
  const [isSandbox, setIsSandbox] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const gameRoomIdRef = useRef<string | null>(null);

  // keep refs in sync for use inside socket callbacks
  useEffect(() => { playerIdRef.current = playerId; }, [playerId]);
  useEffect(() => { gameRoomIdRef.current = gameRoomId; }, [gameRoomId]);

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
      // server returns { room: GameRoom, playerId: string }
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
      // Route: POST /api/games/:code/join — server accepts code or gameId as param
      // server returns { room: GameRoom, playerId: string }
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
      // server will not broadcast on import; re-join to get fresh state
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
  }, [gameRoomId]);

  /** Load a fake room locally — no socket, no server, no network. */
  const loadSandbox = useCallback((sandboxRoom: GameRoom, sandboxPlayerId: string, sandboxPlayerName: string) => {
    setRoom(sandboxRoom);
    setPlayerId(sandboxPlayerId);
    setPlayerName(sandboxPlayerName);
    setGameRoomId(sandboxRoom.id);
    setIsSandbox(true);
    setError(null);
  }, []);

  // ── Emit helpers (all fire-and-forget — server is authoritative) ──────────
  // In sandbox mode: apply deltas locally instead of emitting to server.

  const emit = useCallback((event: string, payload: object) => {
    if (!gameRoomId || !playerId) return;
    if (isSandbox) {
      // In sandbox mode, apply the action to local state directly
      setRoom(prev => {
        if (!prev) return prev;
        return applyLocalSandboxAction(prev, event, { gameRoomId, playerId, ...payload }, playerId);
      });
      return;
    }
    if (!socketRef.current) return;
    socketRef.current.emit(event, { gameRoomId, playerId, ...payload });
  }, [gameRoomId, playerId, isSandbox]);

  // ── Card actions ──────────────────────────────────────────────────────────

  const moveCard = useCallback((instanceId: string, x: number, y: number, persist: boolean) => {
    emit('card:move', { instanceId, x, y, persist });
  }, [emit]);

  const changeZone = useCallback((instanceId: string, toZone: GameZone, toIndex?: number) => {
    emit('card:zone', { instanceId, toZone, toIndex });
  }, [emit]);

  const tapCard = useCallback((instanceId: string, tapped: boolean) => {
    emit('card:tap', { instanceId, tapped });
  }, [emit]);

  const tapAll = useCallback((filter: 'all' | 'lands' = 'all') => {
    emit('cards:tap-all', { filter, tapped: true });
  }, [emit]);

  const untapAll = useCallback(() => {
    emit('cards:tap-all', { filter: 'all', tapped: false });
  }, [emit]);

  const setFaceDown = useCallback((instanceId: string, faceDown: boolean) => {
    emit('card:facedown', { instanceId, faceDown });
  }, [emit]);

  const addCounter = useCallback((instanceId: string, counterType: string, delta: number, label?: string) => {
    emit('card:counter', { instanceId, counterType, delta, label });
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

  const scry = useCallback((count: number) => {
    emit('library:scry', { count });
  }, [emit]);

  const resolveScry = useCallback((keep: string[], bottom: string[]) => {
    setScryCards([]);
    setScryInstanceIds([]);
    emit('library:scry:resolve', { keep, bottom });
  }, [emit]);

  const mulligan = useCallback((keepCount: number) => {
    emit('library:mulligan', { keepCount });
  }, [emit]);

  // ── Tokens ────────────────────────────────────────────────────────────────

  const createToken = useCallback((template: TokenTemplate, x: number, y: number) => {
    emit('token:create', { template, x, y });
  }, [emit]);

  // ── Social ────────────────────────────────────────────────────────────────

  const concede = useCallback(() => {
    emit('game:concede', {});
  }, [emit]);

  const sendMessage = useCallback((text: string) => {
    emit('game:message', { text });
  }, [emit]);

  // ── Derived helpers ───────────────────────────────────────────────────────

  const myPlayer = room && playerId ? (room.players[playerId] ?? null) : null;

  const myHandCards = room && myPlayer
    ? myPlayer.handCardIds.map(id => room.cards[id]).filter((c): c is BattlefieldCard => c != null)
    : [];

  const myBattlefieldCards = room && myPlayer
    ? Object.values(room.cards).filter(
        c => c.zone === 'battlefield' && c.controller === playerId,
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
      room, playerId, playerName, gameRoomId,
      loading, error, connected,
      scryCards, scryInstanceIds,
      myPlayer, myHandCards, myBattlefieldCards, myLibraryCount,
      myGraveyardCards, myExileCards, myCommandZoneCards,
      createGame, joinGame, importDeck, leaveGame, loadSandbox, isSandbox,
      moveCard, changeZone, tapCard, tapAll, untapAll, setFaceDown, addCounter,
      adjustLife, setLife, adjustPoison, dealCommanderDamage, notifyCommanderCast,
      drawCards, shuffleLibrary, scry, resolveScry, mulligan,
      createToken,
      concede, sendMessage,
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

// ─── Delta patcher ──────────────────────────────────────────────────────────
// Imported from src/utils/gameDelta.ts (testable without React).
// applyDelta is re-exported from that module; used above in the socket handler.

// ─── Sandbox local action handler ───────────────────────────────────────────
// Converts socket event payloads into delta objects and applies them locally,
// so sandbox mode works without a server.

function applyLocalSandboxAction(room: GameRoom, event: string, payload: any, myPlayerId: string): GameRoom {
  const shuffleArr = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  };

  switch (event) {
    case 'card:move':
      return applyDelta(room, { type: payload.persist ? 'card_moved' : 'card_moving', instanceId: payload.instanceId, x: payload.x, y: payload.y }, myPlayerId);

    case 'card:tap':
      return applyDelta(room, { type: 'card_tapped', instanceId: payload.instanceId, tapped: payload.tapped }, myPlayerId);

    case 'cards:tap-all': {
      const changed = Object.values(room.cards)
        .filter(c => c.controller === myPlayerId && c.zone === 'battlefield')
        .map(c => c.instanceId);
      return applyDelta(room, { type: 'cards_tap_all', changed, tapped: payload.tapped }, myPlayerId);
    }

    case 'card:zone':
      return applyDelta(room, { type: 'zone_changed', instanceId: payload.instanceId, toZone: payload.toZone, toIndex: payload.toIndex }, myPlayerId);

    case 'card:facedown':
      return applyDelta(room, { type: 'card_facedown', instanceId: payload.instanceId, faceDown: payload.faceDown }, myPlayerId);

    case 'card:counter': {
      const card = room.cards[payload.instanceId];
      if (!card) return room;
      const existing = card.counters.find(c => c.type === payload.counterType && c.label === payload.label);
      let counters = [...card.counters];
      if (existing) {
        const val = Math.max(0, existing.value + payload.delta);
        counters = val === 0 ? counters.filter(c => c !== existing) : counters.map(c => c === existing ? { ...c, value: val } : c);
      } else if (payload.delta > 0) {
        counters = [...counters, { type: payload.counterType, value: payload.delta, label: payload.label }];
      }
      return applyDelta(room, { type: 'counters_changed', instanceId: payload.instanceId, counters }, myPlayerId);
    }

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
      return applyDelta(room, { type: 'poison_changed', playerId: myPlayerId, poisonCounters: Math.max(0, player.poisonCounters + payload.delta) }, myPlayerId);
    }

    case 'commander:cast': {
      const player = room.players[myPlayerId];
      if (!player) return room;
      return applyDelta(room, { type: 'commander_cast', playerId: myPlayerId, commanderTax: player.commanderTax + 1 }, myPlayerId);
    }

    case 'library:draw': {
      const player = room.players[myPlayerId];
      if (!player) return room;
      const drawCount = Math.min(payload.count, player.libraryCardIds.length);
      const drawn = player.libraryCardIds.slice(0, drawCount).map(id => room.cards[id]!).filter(Boolean);
      return applyDelta(room, { type: 'cards_drawn', drawn }, myPlayerId);
    }

    case 'library:shuffle': {
      const player = room.players[myPlayerId];
      if (!player) return room;
      const shuffled = shuffleArr(player.libraryCardIds);
      return { ...room, players: { ...room.players, [myPlayerId]: { ...player, libraryCardIds: shuffled } } };
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
      return applyDelta({ ...room, cards: newCards, players: { ...room.players, [myPlayerId]: { ...player, handCardIds: [], libraryCardIds: allIds } } }, { type: 'mulligan', drawn }, myPlayerId);
    }

    case 'token:create': {
      const token = { ...payload.template, instanceId: `sandbox-token-${Date.now()}`, scryfallId: 'token', imageUri: payload.template.imageUri ?? null, zone: 'battlefield', controller: myPlayerId, x: payload.x, y: payload.y, tapped: false, faceDown: false, flipped: false, counters: [], isCommander: false } as const;
      return { ...room, cards: { ...room.cards, [token.instanceId]: token } };
    }

    case 'game:concede':
    case 'game:message':
    default:
      return room;
  }
}
