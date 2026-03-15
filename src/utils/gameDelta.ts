/**
 * Pure functions for applying server game:delta events to local GameRoom state.
 * Extracted from GameTableContext so they can be unit-tested without React.
 */

import type {
  GameRoom,
  GameZone,
  GamePlayerState,
  BattlefieldCard,
  GameAction,
} from '../types/game';

export function applyDelta(room: GameRoom, delta: any, myPlayerId: string | null): GameRoom {
  switch (delta.type) {

    case 'card_moving':
    case 'card_moved': {
      const card = room.cards[delta.instanceId];
      if (!card) return room;
      const dx = delta.x - card.x;
      const dy = delta.y - card.y;
      const updatedCards: Record<string, BattlefieldCard> = {
        ...room.cards,
        [delta.instanceId]: { ...card, x: delta.x, y: delta.y },
      };
      // Move attached cards with parent
      for (const [cid, c] of Object.entries(room.cards)) {
        if (c.attachedTo === delta.instanceId) {
          updatedCards[cid] = { ...c, x: Math.max(2, Math.min(98, c.x + dx)), y: Math.max(2, Math.min(98, c.y + dy)) };
        }
      }
      return { ...room, cards: updatedCards };
    }

    case 'zone_changed': {
      const existing = room.cards[delta.instanceId];
      const publicZones = ['battlefield', 'graveyard', 'exile'];
      const useRevealed = delta.card && publicZones.includes(delta.toZone);
      const baseCard = useRevealed ? delta.card : (existing ?? delta.card);
      console.log(`[MTG-delta] zone_changed id=${delta.instanceId?.slice(0, 8)} ${delta.fromZone}→${delta.toZone}`,
        { existing: existing ? { name: existing.name, zone: existing.zone, controller: existing.controller?.slice(0, 8) } : null,
          deltaCard: delta.card ? { name: delta.card.name, zone: delta.card.zone, controller: delta.card.controller?.slice(0, 8) } : null,
          useRevealed, baseCard: baseCard ? { name: baseCard.name, controller: baseCard.controller?.slice(0, 8) } : null });
      if (!baseCard) { console.warn('[MTG-delta] zone_changed: NO baseCard, skipping!'); return room; }
      const fromZone = delta.fromZone ?? baseCard.zone;
      const newCard = { ...baseCard, zone: delta.toZone as GameZone, attachedTo: delta.toZone === 'battlefield' ? baseCard.attachedTo : null };
      const players = reZonePlayer(room.players, baseCard.controller, delta.instanceId, fromZone, delta.toZone, delta.toIndex);
      // Auto-detach any cards that were attached to this card if it left the battlefield
      let updatedCards = { ...room.cards, [delta.instanceId]: newCard };
      if (fromZone === 'battlefield' && delta.toZone !== 'battlefield') {
        for (const [cid, card] of Object.entries(updatedCards)) {
          if (card.attachedTo === delta.instanceId) {
            updatedCards[cid] = { ...card, attachedTo: null };
          }
        }
      }
      return {
        ...room,
        cards: updatedCards,
        players,
        actionLog: appendLog(room.actionLog, delta.log),
      };
    }

    case 'zones_changed': {
      const changes = Array.isArray(delta.changes) ? delta.changes : [];
      const removed = Array.isArray(delta.removed) ? delta.removed : [];
      let nextRoom = room;
      for (const change of changes) {
        const existing = nextRoom.cards[change.instanceId];
        const publicZones = ['battlefield', 'graveyard', 'exile'];
        const useRevealed = change.card && publicZones.includes(change.toZone);
        const baseCard = useRevealed ? change.card : (existing ?? change.card);
        if (!baseCard) continue;
        const fromZone = change.fromZone ?? baseCard.zone;
        const newCard = { ...baseCard, zone: change.toZone as GameZone };
        const players = reZonePlayer(
          nextRoom.players,
          baseCard.controller,
          change.instanceId,
          fromZone,
          change.toZone,
          change.toIndex,
        );
        nextRoom = {
          ...nextRoom,
          cards: { ...nextRoom.cards, [change.instanceId]: newCard },
          players,
        };
      }
      for (const rem of removed) {
        const existing = nextRoom.cards[rem.instanceId];
        if (!existing) continue;
        const cards = { ...nextRoom.cards };
        delete cards[rem.instanceId];
        const players = removeFromPlayerZone(nextRoom.players, rem.controllerId, rem.instanceId, rem.fromZone);
        nextRoom = {
          ...nextRoom,
          cards,
          players,
        };
      }
      return { ...nextRoom, actionLog: appendLog(nextRoom.actionLog, delta.log) };
    }

    case 'token_removed': {
      const existing = room.cards[delta.instanceId];
      if (!existing) return { ...room, actionLog: appendLog(room.actionLog, delta.log) };
      const cards = { ...room.cards };
      delete cards[delta.instanceId];
      const players = removeFromPlayerZone(room.players, delta.controllerId, delta.instanceId, delta.fromZone);
      return {
        ...room,
        cards,
        players,
        actionLog: appendLog(room.actionLog, delta.log),
      };
    }

    case 'card_tapped': {
      const card = room.cards[delta.instanceId];
      if (!card) return room;
      return {
        ...room,
        cards: { ...room.cards, [delta.instanceId]: { ...card, tapped: delta.tapped } },
      };
    }

    case 'cards_tap_all': {
      const updatedCards = { ...room.cards };
      for (const id of delta.changed) {
        if (updatedCards[id]) {
          updatedCards[id] = { ...updatedCards[id]!, tapped: delta.tapped };
        }
      }
      return { ...room, cards: updatedCards };
    }

    case 'cards_tapped': {
      const updatedCards = { ...room.cards };
      for (const id of delta.changed) {
        if (updatedCards[id]) {
          updatedCards[id] = { ...updatedCards[id]!, tapped: delta.tapped };
        }
      }
      return { ...room, cards: updatedCards };
    }

    case 'card_facedown': {
      const card = room.cards[delta.instanceId];
      if (!card) return room;
      return {
        ...room,
        cards: { ...room.cards, [delta.instanceId]: { ...card, faceDown: delta.faceDown } },
      };
    }

    case 'card_transform': {
      const card = room.cards[delta.instanceId];
      if (!card) return room;
      return {
        ...room,
        cards: { ...room.cards, [delta.instanceId]: { ...card, flipped: delta.flipped } },
      };
    }

    case 'card_attached': {
      const card = room.cards[delta.instanceId];
      if (!card) return room;
      return {
        ...room,
        cards: { ...room.cards, [delta.instanceId]: { ...card, attachedTo: delta.targetId, x: delta.x, y: delta.y } },
      };
    }

    case 'card_detached': {
      const card = room.cards[delta.instanceId];
      if (!card) return room;
      return {
        ...room,
        cards: { ...room.cards, [delta.instanceId]: { ...card, attachedTo: null } },
      };
    }

    case 'counters_changed': {
      const card = room.cards[delta.instanceId];
      if (!card) return room;
      return {
        ...room,
        cards: { ...room.cards, [delta.instanceId]: { ...card, counters: delta.counters } },
        actionLog: appendLog(room.actionLog, delta.log),
      };
    }

    case 'counters_bulk_changed': {
      const updates = Array.isArray(delta.updates) ? delta.updates : [];
      const updatedCards = { ...room.cards };
      for (const update of updates) {
        const card = updatedCards[update.instanceId];
        if (!card) continue;
        updatedCards[update.instanceId] = { ...card, counters: update.counters };
      }
      return {
        ...room,
        cards: updatedCards,
        actionLog: appendLog(room.actionLog, delta.log),
      };
    }

    case 'life_changed': {
      const player = room.players[delta.playerId];
      if (!player) return room;
      return {
        ...room,
        players: { ...room.players, [delta.playerId]: { ...player, life: delta.life } },
        actionLog: appendLog(room.actionLog, delta.log),
      };
    }

    case 'poison_changed': {
      const player = room.players[delta.playerId];
      if (!player) return room;
      return {
        ...room,
        players: {
          ...room.players,
          [delta.playerId]: { ...player, poisonCounters: delta.poisonCounters },
        },
        actionLog: appendLog(room.actionLog, delta.log),
      };
    }

    case 'commander_damage': {
      const victim = room.players[delta.victimId];
      if (!victim) return room;
      return {
        ...room,
        players: {
          ...room.players,
          [delta.victimId]: {
            ...victim,
            life: delta.life,
            commanderDamageReceived: {
              ...victim.commanderDamageReceived,
              [delta.commanderInstanceId]: delta.damage,
            },
          },
        },
      };
    }

    case 'commander_cast':
    case 'commander_tax_set': {
      const player = room.players[delta.playerId];
      if (!player) return room;
      return {
        ...room,
        players: { ...room.players, [delta.playerId]: { ...player, commanderTax: delta.commanderTax } },
        actionLog: appendLog(room.actionLog, delta.log),
      };
    }

    case 'cards_drawn': {
      if (!myPlayerId) return room;
      const player = room.players[myPlayerId];
      if (!player) return room;
      const newCards = { ...room.cards };
      const newHandIds = [...player.handCardIds];
      const newLibIds = [...player.libraryCardIds];
      for (const card of delta.drawn as BattlefieldCard[]) {
        newCards[card.instanceId] = { ...card, zone: 'hand' };
        newHandIds.push(card.instanceId);
        const li = newLibIds.indexOf(card.instanceId);
        if (li !== -1) newLibIds.splice(li, 1);
      }
      return {
        ...room,
        cards: newCards,
        players: {
          ...room.players,
          [myPlayerId]: { ...player, handCardIds: newHandIds, libraryCardIds: newLibIds },
        },
        actionLog: appendLog(room.actionLog, delta.log),
      };
    }

    case 'cards_drawn_other': {
      const player = room.players[delta.playerId];
      if (!player) return room;
      const newLibIds = player.libraryCardIds.slice(delta.instanceIds.length);
      const newHandIds = [...player.handCardIds, ...delta.instanceIds];
      return {
        ...room,
        players: {
          ...room.players,
          [delta.playerId]: { ...player, libraryCardIds: newLibIds, handCardIds: newHandIds },
        },
        actionLog: appendLog(room.actionLog, delta.log),
      };
    }

    case 'hand_reordered': {
      const player = room.players[delta.playerId];
      if (!player) return room;
      return {
        ...room,
        players: {
          ...room.players,
          [delta.playerId]: { ...player, handCardIds: delta.handCardIds },
        },
      };
    }

    case 'library_shuffled':
    case 'scry_resolved':
    case 'player_conceded':
    case 'message':
    case 'cards_revealed': {
      return { ...room, actionLog: appendLog(room.actionLog, delta.log) };
    }

    case 'cards_revealed_state': {
      const newCards = { ...room.cards };
      const updates = delta.updates as { instanceId: string; revealed: boolean }[];
      for (const { instanceId, revealed } of updates) {
        if (newCards[instanceId]) {
          newCards[instanceId] = { ...newCards[instanceId]!, revealed };
        }
      }
      return { ...room, cards: newCards, actionLog: appendLog(room.actionLog, delta.log) };
    }

    case 'mulligan': {
      if (!myPlayerId) return room;
      const player = room.players[myPlayerId];
      if (!player) return room;
      const newCards = { ...room.cards };
      const newHandIds: string[] = [];
      const newLibIds: string[] = [...player.libraryCardIds, ...player.handCardIds];
      for (const id of player.handCardIds) {
        if (newCards[id]) newCards[id] = { ...newCards[id]!, zone: 'library' };
      }
      for (const card of delta.drawn as BattlefieldCard[]) {
        newCards[card.instanceId] = { ...card, zone: 'hand' };
        newHandIds.push(card.instanceId);
        const li = newLibIds.indexOf(card.instanceId);
        if (li !== -1) newLibIds.splice(li, 1);
      }
      return {
        ...room,
        cards: newCards,
        players: {
          ...room.players,
          [myPlayerId]: { ...player, handCardIds: newHandIds, libraryCardIds: newLibIds },
        },
        actionLog: appendLog(room.actionLog, delta.log),
      };
    }

    case 'mulligan_other': {
      const player = room.players[delta.playerId];
      if (!player) return room;
      const reshuffledPool = [...player.libraryCardIds, ...player.handCardIds];
      const newLibraryIds = reshuffledPool.filter(id => !(delta.instanceIds as string[]).includes(id));
      return {
        ...room,
        players: {
          ...room.players,
          [delta.playerId]: { ...player, handCardIds: delta.instanceIds, libraryCardIds: newLibraryIds },
        },
        actionLog: appendLog(room.actionLog, delta.log),
      };
    }

    case 'token_created': {
      const card = delta.card as BattlefieldCard;
      return {
        ...room,
        cards: { ...room.cards, [card.instanceId]: card },
        actionLog: appendLog(room.actionLog, delta.log),
      };
    }

    case 'player_joined':
    case 'player_connected': {
      if (!delta.player) return room;
      const playerId = delta.player.playerId as string;
      const incomingCards = delta.cards ?? {};
      const incomingCardCount = Object.keys(incomingCards).length;

      // Replace this player's known cards atomically. This keeps player_joined idempotent
      // and prevents card explosion when re-join/import emits multiple player snapshots.
      const newCards: Record<string, BattlefieldCard> = {};
      for (const [id, card] of Object.entries(room.cards)) {
        if (card.controller !== playerId) newCards[id] = card;
      }
      for (const [id, card] of Object.entries(incomingCards)) {
        newCards[id] = card as BattlefieldCard;
      }

      console.log(
        `[MTG-delta] ${delta.type}: player=${delta.player.playerName} (${playerId?.slice(0, 8)}), incoming cards=${incomingCardCount}, total cards after merge=${Object.keys(newCards).length}, turnOrder=`,
        delta.turnOrder,
      );
      return {
        ...room,
        players: { ...room.players, [playerId]: delta.player },
        cards: newCards,
        turnOrder: delta.turnOrder ?? room.turnOrder,
        activePlayerIndex: delta.activePlayerIndex ?? room.activePlayerIndex,
      };
    }

    case 'turn_passed': {
      return {
        ...room,
        activePlayerIndex: delta.activePlayerIndex,
        actionLog: appendLog(room.actionLog, delta.log),
      };
    }
    default:
      return room;
  }
}

export function appendLog(log: GameAction[], entry: GameAction | undefined): GameAction[] {
  if (!entry) return log;
  return [...log.slice(-49), entry];
}

export function reZonePlayer(
  players: Record<string, GamePlayerState>,
  controllerId: string,
  instanceId: string,
  fromZone: GameZone,
  toZone: GameZone,
  toIndex?: number,
): Record<string, GamePlayerState> {
  const player = players[controllerId];
  if (!player) return players;

  const zoneMap: Partial<Record<GameZone, keyof GamePlayerState>> = {
    hand: 'handCardIds',
    library: 'libraryCardIds',
    graveyard: 'graveyardCardIds',
    exile: 'exileCardIds',
    command_zone: 'commandZoneCardIds',
    sideboard: 'sideboardCardIds',
  };

  const fromKey = zoneMap[fromZone];
  const toKey = zoneMap[toZone];

  let updated = { ...player };

  if (fromKey) {
    const arr = updated[fromKey] as string[];
    const idx = arr.indexOf(instanceId);
    if (idx !== -1) {
      updated = { ...updated, [fromKey]: arr.filter(id => id !== instanceId) };
    } else {
      // ID not found — the client may have placeholder entries for opponent's
      // private zones (e.g. 'hidden-*' from draws, '?' from mulligans).
      // Remove one placeholder to keep the count accurate.
      const placeholderIdx = arr.findIndex(id => id.startsWith('hidden-') || id === '?');
      if (placeholderIdx !== -1) {
        const newArr = [...arr];
        newArr.splice(placeholderIdx, 1);
        updated = { ...updated, [fromKey]: newArr };
      }
    }
  }
  if (toKey) {
    const toArr = [...(updated[toKey] as string[])];
    if (toIndex !== undefined) {
      toArr.splice(toIndex, 0, instanceId);
    } else {
      toArr.push(instanceId);
    }
    updated = { ...updated, [toKey]: toArr };
  }

  return { ...players, [controllerId]: updated };
}

function removeFromPlayerZone(
  players: Record<string, GamePlayerState>,
  controllerId: string,
  instanceId: string,
  fromZone: GameZone,
): Record<string, GamePlayerState> {
  const player = players[controllerId];
  if (!player) return players;
  const zoneMap: Partial<Record<GameZone, keyof GamePlayerState>> = {
    hand: 'handCardIds',
    library: 'libraryCardIds',
    graveyard: 'graveyardCardIds',
    exile: 'exileCardIds',
    command_zone: 'commandZoneCardIds',
    sideboard: 'sideboardCardIds',
  };
  const fromKey = zoneMap[fromZone];
  if (!fromKey) return players;
  const arr = player[fromKey] as string[];
  if (!arr.includes(instanceId)) return players;
  return {
    ...players,
    [controllerId]: {
      ...player,
      [fromKey]: arr.filter(id => id !== instanceId),
    },
  };
}
