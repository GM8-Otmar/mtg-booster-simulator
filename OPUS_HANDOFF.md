# MTG Booster Simulator — Opus Handoff Summary

**Date:** 2026-02-27

## Addendum (Latest Session)

### Multiplayer parity with sandbox bulk interactions

- Added atomic multiplayer bulk events for selected-card actions:
  - `cards:tap`
  - `cards:zone`
  - `cards:counter`
- Wired UI multi-select interactions to these bulk paths so sandbox and multiplayer behavior are aligned for:
  - double-click selected tap/untap
  - marquee multi-card zone moves
  - bulk counter adjustments

### Server-side ownership hardening

- Added ownership checks on multiplayer handlers for single-card mutations (`card:tap`, `card:zone`, `card:counter`) to prevent off-controller state updates.

### Game code lookup reliability fix

- `loadGameByCode()` now skips malformed files in `data/games` instead of aborting the entire scan.
- This prevents valid room codes from incorrectly returning `404` when one bad JSON file exists.

## Issues Fixed This Session

### 1. useEffect dependency array warning

**Symptom:** `The final argument passed to useEffect changed size between renders` — Previous had 8 deps, Incoming had 10 (added `isMyTurn`, `passTurn`).

**Cause:** The keyboard shortcut `useEffect` in `GameTablePage.tsx` had a dependency array that was inconsistent between renders (possibly due to conditional code paths or HMR).

**Fix:** Include `isMyTurn` and `passTurn` explicitly in the dependency array so it is always 9 items:  
`[atTable, canUndo, undo, untapAll, drawCards, mulligan, scryCards?.length ?? 0, isMyTurn, passTurn]`

Removed the ref-based workaround; the handler now uses `isMyTurn` and `passTurn` directly.

### 2. Opponent cards not visible on battlefield

**Symptom:** Opponent’s battlefield showed no cards; graveyard/exile worked.

**Cause:** When the opponent plays from hand → battlefield, the client had a sanitized hand entry (`"Hidden Card"`, `imageUri: null`). `applyDelta` used `existing ?? delta.card`, so it kept the sanitized card instead of the full `delta.card` sent by the server.

**Fix:** In `gameDelta.ts`, when moving to a public zone (`battlefield`, `graveyard`, `exile`), prefer `delta.card` over `existing` so the real card data is used:

```typescript
const publicZones = ['battlefield', 'graveyard', 'exile'];
const useRevealed = delta.card && publicZones.includes(delta.toZone);
const baseCard = useRevealed ? delta.card : (existing ?? delta.card);
```

### 3. ZoneCountHUD / OpponentStrip defensive checks

**Fix:** Added optional chaining for player zone arrays in case they’re undefined:

- `ZoneCountHUD.tsx`: `p.handCardIds?.length ?? 0`, `p.graveyardCardIds?.length ?? 0`, `p.exileCardIds?.length ?? 0`
- `OpponentStrip.tsx`: Same for tooltip and Inspect buttons

### 4. scryCards.length crash

**Fix:** Replaced `scryCards.length` with `(scryCards?.length ?? 0)` everywhere in `GameTablePage.tsx`.

---

## Architecture Notes

### Card visibility and sanitization

- `game:state` (on join) is sanitised via `gameService.sanitiseForPlayer()`: opponents’ hand cards are sent as `name: "Hidden Card"`, `imageUri: null`, `scryfallId: "hidden"`.
- `game:delta` (zone_changed) sends full `card` object when a card moves zones. The client must use this when moving to public zones so battlefield/GY/exile show real card data.
- Battlefield, graveyard, and exile are public; hand and library are private.

### Data flow for opponent cards

1. `OpponentView` gets `battlefieldCards = Object.values(room.cards).filter(c => c.zone === 'battlefield' && c.controller === player.playerId)`.
2. When opponent plays a card, server emits `zone_changed` with `fromZone`, `toZone`, and full `card`.
3. `applyDelta` in `gameDelta.ts` updates `room.cards` and `room.players` via `reZonePlayer()`.
4. The change to prefer `delta.card` for public zones fixes battlefield visibility.

### ZoneCountHUD not updating

If counts still do not update in multiplayer, check:

1. `game:delta` handling in `GameTableContext.tsx` (socket listener).
2. `reZonePlayer` correctly updating `handCardIds`, `graveyardCardIds`, `exileCardIds`.
3. Whether deltas are broadcast to all sockets in the room (e.g. `io.to(ROOM(gameRoomId)).emit` vs `socket.emit`).

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/pages/GameTablePage.tsx` | Main game UI, keyboard shortcuts, layout |
| `src/utils/gameDelta.ts` | Applies `game:delta` patches; `zone_changed`, `reZonePlayer` |
| `src/contexts/GameTableContext.tsx` | Room state, socket listener, actions |
| `server/socket/gameHandlers.ts` | Emits `zone_changed` with `card`, `fromZone` |
| `server/services/gameService.ts` | `sanitiseForPlayer` (hides opponent hands) |
| `src/components/game/ZoneCountHUD.tsx` | Hand/GY/Exile counts per player |
| `src/components/game/OpponentStrip.tsx` | Opponent strip with tooltip and inspect |
| `src/components/game/OpponentView.tsx` | Opponent strip + BattlefieldZone |

---

## Suggested Next Steps (if issues remain)

1. **Logging:** Add temporary `console.log` in `applyDelta` for `zone_changed` to confirm `delta.card`, `delta.fromZone`, `delta.toZone`, and `baseCard`.
2. **Server broadcast:** Confirm `zone_changed` is emitted to the room with `io.to(ROOM(gameRoomId)).emit` so all clients receive it.
3. **player_joined:** When a player imports a deck, the server should broadcast `player_joined` so others receive their cards; check `server/routes/games.ts` and `gameHandlers.ts` for this flow.
4. **Turn order:** `room.turnOrder` and `room.activePlayerIndex` drive whose turn it is; verify they are set and emitted correctly.

---

## Testing Checklist

- [ ] Hard refresh (Ctrl+Shift+R) to clear cache
- [ ] No useEffect "changed size" warning
- [ ] Opponent plays card → card appears on their battlefield with correct art/name
- [ ] ZoneCountHUD updates for opponent’s hand / GY / exile
- [ ] Action log updates
- [ ] Graveyard and exile inspect modals show correct cards
