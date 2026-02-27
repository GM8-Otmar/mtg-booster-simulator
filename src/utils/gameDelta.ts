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
      return {
        ...room,
        cards: { ...room.cards, [delta.instanceId]: { ...card, x: delta.x, y: delta.y } },
      };
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
      const newCard = { ...baseCard, zone: delta.toZone as GameZone };
      const players = reZonePlayer(room.players, baseCard.controller, delta.instanceId, fromZone, delta.toZone, delta.toIndex);
      return {
        ...room,
        cards: { ...room.cards, [delta.instanceId]: newCard },
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

    case 'card_facedown': {
      const card = room.cards[delta.instanceId];
      if (!card) return room;
      return {
        ...room,
        cards: { ...room.cards, [delta.instanceId]: { ...card, faceDown: delta.faceDown } },
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

    case 'commander_cast': {
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
      const newLibIds = player.libraryCardIds.slice(delta.count);
      const newHandIds = [...player.handCardIds];
      for (let i = 0; i < delta.count; i++) {
        newHandIds.push(`hidden-${Date.now()}-${i}`);
      }
      return {
        ...room,
        players: {
          ...room.players,
          [delta.playerId]: { ...player, libraryCardIds: newLibIds, handCardIds: newHandIds },
        },
        actionLog: appendLog(room.actionLog, delta.log),
      };
    }

    case 'library_shuffled':
    case 'scry_resolved':
    case 'player_conceded':
    case 'message':
    case 'cards_revealed': {
      return { ...room, actionLog: appendLog(room.actionLog, delta.log) };
    }

    case 'mulligan': {
      if (!myPlayerId) return room;
      const player = room.players[myPlayerId];
      if (!player) return room;
      const newCards = { ...room.cards };
      const newHandIds: string[] = [];
      const newLibIds: string[] = [];
      for (const id of player.handCardIds) {
        if (newCards[id]) newCards[id] = { ...newCards[id]!, zone: 'library' };
        newLibIds.push(id);
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
      return {
        ...room,
        players: {
          ...room.players,
          [delta.playerId]: { ...player, handCardIds: Array(delta.handCount).fill('?') },
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
      const newCards = delta.cards ? { ...room.cards, ...delta.cards } : room.cards;
      const incomingCardCount = delta.cards ? Object.keys(delta.cards).length : 0;
      console.log(`[MTG-delta] ${delta.type}: player=${delta.player.playerName} (${delta.player.playerId?.slice(0, 8)}), incoming cards=${incomingCardCount}, total cards after merge=${Object.keys(newCards).length}, turnOrder=`, delta.turnOrder);
      return {
        ...room,
        players: { ...room.players, [delta.player.playerId]: delta.player },
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
