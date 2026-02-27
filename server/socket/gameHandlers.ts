import { v4 as uuidv4 } from 'uuid';
import type { Server as SocketIOServer, Socket } from 'socket.io';
import * as storage from '../services/gameStorageService';
import * as gameService from '../services/gameService';
import type { GameZone, TokenTemplate } from '../types/game';

const ROOM = (id: string) => `game:${id}`;

function ts() { return new Date().toISOString(); }

// Fisher-Yates shuffle in place
function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

export function registerGameHandlers(io: SocketIOServer, socket: Socket): void {

  // ── Join / leave ─────────────────────────────────────────────────────────

  socket.on('game:join', async ({ gameRoomId, playerId }: { gameRoomId: string; playerId: string }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.players[playerId]) {
      socket.emit('game:error', 'Room or player not found');
      return;
    }
    socket.join(ROOM(gameRoomId));
    // full sanitised state to this socket only
    socket.emit('game:state', gameService.sanitiseForPlayer(room, playerId));
    // notify others — send full player state so they can render the new opponent
    const joiningPlayer = room.players[playerId]!;
    const joiningCards: Record<string, typeof room.cards[string]> = {};
    for (const [cid, card] of Object.entries(room.cards)) {
      if (card.controller === playerId) joiningCards[cid] = card;
    }
    socket.to(ROOM(gameRoomId)).emit('game:delta', {
      type: 'player_joined',
      player: joiningPlayer,
      cards: joiningCards,
    });
  });

  socket.on('game:leave', ({ gameRoomId }: { gameRoomId: string }) => {
    socket.leave(ROOM(gameRoomId));
  });

  // ── Card movement (high-frequency during drag) ────────────────────────────

  socket.on('card:move', async ({
    gameRoomId, instanceId, x, y, persist, playerId,
  }: { gameRoomId: string; instanceId: string; x: number; y: number; persist: boolean; playerId: string }) => {
    if (!persist) {
      // relay position to others without saving
      socket.to(ROOM(gameRoomId)).emit('game:delta', { type: 'card_moving', instanceId, x, y });
      return;
    }
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.cards[instanceId]) return;
    if (room.cards[instanceId]!.controller !== playerId) return;
    room.cards[instanceId]!.x = Math.max(0, Math.min(100, x));
    room.cards[instanceId]!.y = Math.max(0, Math.min(100, y));
    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', {
      type: 'card_moved', instanceId,
      x: room.cards[instanceId]!.x, y: room.cards[instanceId]!.y,
    });
  });

  // ── Zone change ───────────────────────────────────────────────────────────

  socket.on('card:zone', async ({
    gameRoomId, instanceId, toZone, toIndex, playerId,
  }: { gameRoomId: string; instanceId: string; toZone: GameZone; toIndex?: number; playerId: string }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room) return;
    const card = room.cards[instanceId];
    if (!card) return;

    const player = room.players[card.controller];
    if (!player) return;

    // remove from current zone array
    const fromZoneKey = zoneKey(card.zone);
    if (fromZoneKey) {
      const arr = (player as any)[fromZoneKey] as string[];
      const idx = arr.indexOf(instanceId);
      if (idx !== -1) arr.splice(idx, 1);
    }

    // add to target zone array
    card.zone = toZone;
    if (toZone === 'battlefield') {
      card.tapped = false;
      card.faceDown = false;
    }

    const toZoneKey = zoneKey(toZone);
    if (toZoneKey) {
      const arr = (player as any)[toZoneKey] as string[];
      if (toIndex !== undefined) arr.splice(toIndex, 0, instanceId);
      else arr.push(instanceId);
    }

    gameService.appendLog(room, playerId,
      'zone_change',
      `${player.playerName} moved ${card.name} to ${toZone.replace('_', ' ')}`);

    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', { type: 'zone_changed', instanceId, toZone, toIndex, log: room.actionLog.at(-1) });
  });

  // ── Tap / untap ───────────────────────────────────────────────────────────

  socket.on('card:tap', async ({
    gameRoomId, instanceId, tapped, playerId,
  }: { gameRoomId: string; instanceId: string; tapped: boolean; playerId: string }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.cards[instanceId]) return;
    room.cards[instanceId]!.tapped = tapped;
    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', { type: 'card_tapped', instanceId, tapped });
  });

  socket.on('cards:tap-all', async ({
    gameRoomId, filter, tapped, playerId,
  }: { gameRoomId: string; filter: 'all' | 'lands'; tapped: boolean; playerId: string }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room) return;
    const changed: string[] = [];
    for (const card of Object.values(room.cards)) {
      if (card.controller !== playerId) continue;
      if (card.zone !== 'battlefield') continue;
      if (filter === 'lands' && !card.name.toLowerCase().includes('land')) {
        // crude check — server has no type_line, use name heuristics
        // client should filter properly; this is a best-effort fallback
      }
      card.tapped = tapped;
      changed.push(card.instanceId);
    }
    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', { type: 'cards_tap_all', changed, tapped });
  });

  // ── Face-down ─────────────────────────────────────────────────────────────

  socket.on('card:facedown', async ({
    gameRoomId, instanceId, faceDown, playerId,
  }: { gameRoomId: string; instanceId: string; faceDown: boolean; playerId: string }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.cards[instanceId]) return;
    if (room.cards[instanceId]!.controller !== playerId) return;
    room.cards[instanceId]!.faceDown = faceDown;
    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', { type: 'card_facedown', instanceId, faceDown });
  });

  // ── Counters ──────────────────────────────────────────────────────────────

  socket.on('card:counter', async ({
    gameRoomId, instanceId, counterType, delta, label, playerId,
  }: { gameRoomId: string; instanceId: string; counterType: string; delta: number; label?: string; playerId: string }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.cards[instanceId]) return;
    const card = room.cards[instanceId]!;
    const existing = card.counters.find(c => c.type === counterType && c.label === label);
    if (existing) {
      existing.value = existing.value + delta;
    } else if (delta !== 0) {
      card.counters.push({ type: counterType as any, value: delta, label });
    }
    const labelText = 'counter';
    const counterSign = delta >= 0 ? '+' : '';
    const player = room.players[playerId];
    const playerName = player?.playerName ?? 'Player';
    gameService.appendLog(room, playerId, 'counter_change',
      `${playerName}: ${card.name} ${counterSign}${delta} ${labelText}`);
    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', { type: 'counters_changed', instanceId, counters: card.counters, log: room.actionLog.at(-1) });
  });

  socket.on('card:counter:reset', async ({
    gameRoomId, instanceId, playerId,
  }: { gameRoomId: string; instanceId: string; playerId: string }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.cards[instanceId]) return;
    const card = room.cards[instanceId]!;
    card.counters = [];
    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', { type: 'counters_changed', instanceId, counters: [] });
  });

  // ── Life / poison ─────────────────────────────────────────────────────────

  socket.on('player:life', async ({
    gameRoomId, playerId, delta,
  }: { gameRoomId: string; playerId: string; delta: number }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.players[playerId]) return;
    room.players[playerId]!.life += delta;
    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', {
      type: 'life_changed', playerId,
      life: room.players[playerId]!.life,
    });
  });

  socket.on('player:life:set', async ({
    gameRoomId, playerId, value,
  }: { gameRoomId: string; playerId: string; value: number }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.players[playerId]) return;
    room.players[playerId]!.life = value;
    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', {
      type: 'life_changed', playerId,
      life: room.players[playerId]!.life,
    });
  });

  socket.on('player:poison', async ({
    gameRoomId, playerId, delta,
  }: { gameRoomId: string; playerId: string; delta: number }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.players[playerId]) return;
    const player = room.players[playerId]!;
    player.poisonCounters = Math.max(0, player.poisonCounters + delta);
    const poisonSign = delta >= 0 ? '+' : '';
    gameService.appendLog(room, playerId, 'poison_change',
      `${player.playerName}: ${player.poisonCounters} poison (${poisonSign}${delta})`);
    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', {
      type: 'poison_changed', playerId,
      poisonCounters: player.poisonCounters,
      log: room.actionLog.at(-1),
    });
  });

  // ── Commander damage ──────────────────────────────────────────────────────

  socket.on('commander:damage', async ({
    gameRoomId, victimId, commanderInstanceId, amount,
  }: { gameRoomId: string; victimId: string; commanderInstanceId: string; amount: number }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.players[victimId]) return;
    const victim = room.players[victimId]!;
    victim.commanderDamageReceived[commanderInstanceId] =
      (victim.commanderDamageReceived[commanderInstanceId] ?? 0) + amount;
    victim.life -= amount;
    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', {
      type: 'commander_damage',
      victimId,
      commanderInstanceId,
      damage: victim.commanderDamageReceived[commanderInstanceId],
      life: victim.life,
    });
  });

  // ── Commander cast (tax) ──────────────────────────────────────────────────

  socket.on('commander:cast', async ({
    gameRoomId, instanceId, playerId,
  }: { gameRoomId: string; instanceId: string; playerId: string }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.players[playerId]) return;
    room.players[playerId]!.commanderTax += 1;
    gameService.appendLog(room, playerId, 'commander_cast',
      `${room.players[playerId]!.playerName} cast their commander (tax now +${room.players[playerId]!.commanderTax * 2})`);
    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', {
      type: 'commander_cast', playerId,
      commanderTax: room.players[playerId]!.commanderTax,
      log: room.actionLog.at(-1),
    });
  });

  // ── Library actions ───────────────────────────────────────────────────────

  socket.on('library:draw', async ({
    gameRoomId, playerId, count,
  }: { gameRoomId: string; playerId: string; count: number }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.players[playerId]) return;
    const player = room.players[playerId]!;
    const drawn = player.libraryCardIds.splice(0, Math.min(count, player.libraryCardIds.length));
    for (const id of drawn) {
      player.handCardIds.push(id);
      if (room.cards[id]) room.cards[id]!.zone = 'hand';
    }
    gameService.appendLog(room, playerId, 'draw',
      `${player.playerName} drew ${drawn.length} card${drawn.length !== 1 ? 's' : ''}`);
    room.lastActivity = ts();
    await storage.saveGame(room);

    // send drawn card details only to this player, backs to others
    const drawnCards = drawn.map(id => room.cards[id]!);
    socket.emit('game:delta', { type: 'cards_drawn', drawn: drawnCards, log: room.actionLog.at(-1) });
    socket.to(ROOM(gameRoomId)).emit('game:delta', {
      type: 'cards_drawn_other', playerId,
      count: drawn.length,
      libraryCount: player.libraryCardIds.length,
      log: room.actionLog.at(-1),
    });
  });

  socket.on('library:shuffle', async ({
    gameRoomId, playerId,
  }: { gameRoomId: string; playerId: string }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.players[playerId]) return;
    shuffle(room.players[playerId]!.libraryCardIds);
    gameService.appendLog(room, playerId, 'shuffle',
      `${room.players[playerId]!.playerName} shuffled their library`);
    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', {
      type: 'library_shuffled', playerId, log: room.actionLog.at(-1),
    });
  });

  socket.on('library:scry', async ({
    gameRoomId, playerId, count,
  }: { gameRoomId: string; playerId: string; count: number }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.players[playerId]) return;
    const player = room.players[playerId]!;
    const topIds = player.libraryCardIds.slice(0, count);
    const topCards = topIds.map(id => room.cards[id]!).filter(Boolean);
    // only reveal to this player's socket
    socket.emit('game:scry:reveal', { cards: topCards, instanceIds: topIds });
  });

  socket.on('library:scry:resolve', async ({
    gameRoomId, playerId, keep, bottom,
  }: { gameRoomId: string; playerId: string; keep: string[]; bottom: string[] }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.players[playerId]) return;
    const player = room.players[playerId]!;
    const scryCount = keep.length + bottom.length;
    // remove top N from library
    player.libraryCardIds.splice(0, scryCount);
    // put kept cards back on top (in chosen order), then bottom cards
    player.libraryCardIds.unshift(...keep);
    player.libraryCardIds.push(...bottom);
    gameService.appendLog(room, playerId, 'scry',
      `${player.playerName} scryed ${scryCount}`);
    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', {
      type: 'scry_resolved', playerId, log: room.actionLog.at(-1),
    });
  });

  socket.on('library:mulligan', async ({
    gameRoomId, playerId, keepCount,
  }: { gameRoomId: string; playerId: string; keepCount: number }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.players[playerId]) return;
    const player = room.players[playerId]!;

    // return hand to library, shuffle, draw 7
    for (const id of player.handCardIds) {
      if (room.cards[id]) room.cards[id]!.zone = 'library';
    }
    player.libraryCardIds.push(...player.handCardIds);
    player.handCardIds = [];
    shuffle(player.libraryCardIds);

    const drawCount = Math.min(7, player.libraryCardIds.length);
    const drawn = player.libraryCardIds.splice(0, drawCount);
    player.handCardIds = drawn;
    for (const id of drawn) {
      if (room.cards[id]) room.cards[id]!.zone = 'hand';
    }

    gameService.appendLog(room, playerId, 'mulligan',
      `${player.playerName} took a mulligan to ${keepCount}`);
    room.lastActivity = ts();
    await storage.saveGame(room);

    const drawnCards = drawn.map(id => room.cards[id]!);
    socket.emit('game:delta', { type: 'mulligan', drawn: drawnCards, keepCount, log: room.actionLog.at(-1) });
    socket.to(ROOM(gameRoomId)).emit('game:delta', {
      type: 'mulligan_other', playerId, keepCount, handCount: drawn.length, log: room.actionLog.at(-1),
    });
  });

  // ── Tokens ────────────────────────────────────────────────────────────────

  socket.on('token:create', async ({
    gameRoomId, playerId, template, x, y,
  }: { gameRoomId: string; playerId: string; template: TokenTemplate; x: number; y: number }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.players[playerId]) return;
    const player = room.players[playerId]!;

    const instanceId = uuidv4();
    const card = {
      instanceId,
      scryfallId: 'token',
      name: template.name,
      imageUri: template.imageUri ?? null,
      zone: 'battlefield' as GameZone,
      controller: playerId,
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
      tapped: false,
      faceDown: false,
      flipped: false,
      counters: [],
      isCommander: false,
    };
    room.cards[instanceId] = card;

    gameService.appendLog(room, playerId, 'token',
      `${player.playerName} created ${template.name}`);
    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', {
      type: 'token_created', card, log: room.actionLog.at(-1),
    });
  });

  // ── Reveal cards ──────────────────────────────────────────────────────────

  socket.on('card:reveal', async ({
    gameRoomId, playerId, instanceIds,
  }: { gameRoomId: string; playerId: string; instanceIds: string[] }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.players[playerId]) return;
    const player = room.players[playerId]!;
    const names = instanceIds.map(id => room.cards[id]?.name).filter((n): n is string => !!n);
    let desc: string;
    if (names.length === 1) {
      desc = `${player.playerName} revealed ${names[0]}`;
    } else {
      desc = `${player.playerName} revealed ${names.length} cards: ${names.join(', ')}`;
    }
    gameService.appendLog(room, playerId, 'reveal', desc);
    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', { type: 'cards_revealed', playerId, log: room.actionLog.at(-1) });
  });

  // ── Dice roll ─────────────────────────────────────────────────────────────

  socket.on('game:dice-roll', async ({
    gameRoomId, playerId, faces, result,
  }: { gameRoomId: string; playerId: string; faces: number; result: number }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.players[playerId]) return;
    const player = room.players[playerId]!;
    gameService.appendLog(room, playerId, 'dice_roll',
      `${player.playerName} rolled a d${faces}: ${result}`);
    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', { type: 'message', log: room.actionLog.at(-1) });
  });

  // ── Pass turn ─────────────────────────────────────────────────────────────

  socket.on('game:pass-turn', async ({
    gameRoomId, playerId,
  }: { gameRoomId: string; playerId: string }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.players[playerId]) return;
    const turnOrder = room.turnOrder ?? [];
    if (turnOrder.length === 0) return;
    const nextIndex = (room.activePlayerIndex + 1) % turnOrder.length;
    room.activePlayerIndex = nextIndex;
    const nextPlayerId = turnOrder[nextIndex];
    const nextPlayer = nextPlayerId ? room.players[nextPlayerId] : undefined;
    const currentPlayer = room.players[playerId]!;
    const passDesc = `${currentPlayer.playerName} passed the turn to ${nextPlayer?.playerName ?? 'next player'}`;
    gameService.appendLog(room, playerId, 'turn_pass', passDesc);
    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', {
      type: 'turn_passed',
      activePlayerIndex: nextIndex,
      log: room.actionLog.at(-1),
    });
  });

  // ── Shake cards ──────────────────────────────────────────────────────────

  socket.on('card:shake', async ({
    gameRoomId, instanceIds,
  }: { gameRoomId: string; playerId: string; instanceIds: string[] }) => {
    // Visual-only broadcast — no persistent state change
    io.to(ROOM(gameRoomId)).emit('game:shake', { instanceIds });
  });

  // ── Concede ───────────────────────────────────────────────────────────────

  socket.on('game:concede', async ({
    gameRoomId, playerId,
  }: { gameRoomId: string; playerId: string }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.players[playerId]) return;
    gameService.appendLog(room, playerId, 'concede',
      `${room.players[playerId]!.playerName} conceded`);
    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', {
      type: 'player_conceded', playerId, log: room.actionLog.at(-1),
    });
  });

  // ── Chat ──────────────────────────────────────────────────────────────────

  socket.on('game:message', async ({
    gameRoomId, playerId, text,
  }: { gameRoomId: string; playerId: string; text: string }) => {
    const room = await storage.loadGame(gameRoomId);
    if (!room || !room.players[playerId]) return;
    gameService.appendLog(room, playerId, 'message',
      `${room.players[playerId]!.playerName}: ${text.slice(0, 200)}`);
    room.lastActivity = ts();
    await storage.saveGame(room);
    io.to(ROOM(gameRoomId)).emit('game:delta', { type: 'message', log: room.actionLog.at(-1) });
  });
}

// helper — map GameZone → player array key
function zoneKey(zone: GameZone): string | null {
  const map: Partial<Record<GameZone, string>> = {
    hand: 'handCardIds',
    library: 'libraryCardIds',
    graveyard: 'graveyardCardIds',
    exile: 'exileCardIds',
    command_zone: 'commandZoneCardIds',
    sideboard: 'sideboardCardIds',
  };
  return map[zone] ?? null;
}
