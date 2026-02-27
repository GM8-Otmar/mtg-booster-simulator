# Plan: Fix Player Join Bug + 2x2 Multiplayer Grid

## Part 1: Fix Player Join Visibility Bug

**Root cause**: When Player B joins, the server broadcasts a `player_connected` delta to Player A, but:
1. The server only sends `{ type: 'player_connected', playerId, playerName }` — no full player state
2. The client's `applyDelta` in `gameDelta.ts:223-225` ignores `player_connected` entirely — just `return room`

So Player A never learns about Player B's existence until they refresh.

### Fix (2 files):

**A. Server — `server/socket/gameHandlers.ts` lines 33-37**
Change the `player_connected` delta to include the full `GamePlayerState` and that player's cards:
```ts
socket.to(ROOM(gameRoomId)).emit('game:delta', {
  type: 'player_joined',
  player: gameService.sanitiseForPlayer(room, playerId).players[playerId],
  cards: Object.fromEntries(
    Object.entries(room.cards).filter(([_, c]) => c.controller === playerId)
  ),
});
```

**B. Client — `src/utils/gameDelta.ts` lines 223-225**
Replace the no-op `player_connected` handler with real logic:
```ts
case 'player_joined':
case 'player_connected': {
  if (!delta.player) return room;
  const newCards = delta.cards ? { ...room.cards, ...delta.cards } : room.cards;
  return {
    ...room,
    players: { ...room.players, [delta.player.playerId]: delta.player },
    cards: newCards,
  };
}
```

---

## Part 2: 2x2 Multiplayer Grid Layout

### Approach: Adaptive grid in center, collapsible right sidebar

When there are **3 opponents** (4 total), the center area switches from vertical stack to a **2x2 CSS Grid**. The right sidebar becomes a collapsible overlay to reclaim width.

### Layout (4 players):

```
┌──────────────────────────────────────────────────────────────┐
│ Top Bar: Leave | Game Table | Code | Player Count            │
├────────┬─────────────────────────────────────────────────────┤
│ LEFT   │  CENTER (CSS Grid 2x2)                             │
│ w-44   │ ┌───────────────────────┬───────────────────────┐  │
│        │ │ Opponent 1            │ Opponent 2            │  │
│Controls│ │ [banner] + BF         │ [banner] + BF         │  │
│ + Log  │ ├───────────────────────┼───────────────────────┤  │
│        │ │ Opponent 3            │ ME                    │  │
│        │ │ [banner] + BF         │ [banner] + BF + Hand  │  │
│        │ └───────────────────────┴───────────────────────┘  │
├────────┴─────────────────────────────────────────────────────┤
│ (Right sidebar collapsed — toggle button in top bar)         │
└──────────────────────────────────────────────────────────────┘
```

### Layout (1-2 opponents, current behavior preserved):

```
Same as today — vertical stack with right sidebar visible.
```

### Changes by file:

**C. `src/pages/GameTablePage.tsx`**

- Add state: `const [showHUD, setShowHUD] = useState(true)`
- When `opponents.length >= 3`: render 2x2 grid layout, auto-hide right sidebar
- When `opponents.length < 3`: keep current vertical stack layout
- Add a HUD toggle button in top bar (always visible)
- The 2x2 grid:
  - `display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr`
  - Each cell gets a compact OpponentView (or my area in bottom-right)
  - My cell contains: inline banner + battlefield + hand (hand shrinks to h-28)
- Right sidebar becomes a fixed overlay panel (`position: fixed, right: 0, z-50`) when toggled

**D. `src/components/game/OpponentView.tsx`**

- Accept a new `compact` prop for grid mode
- In compact mode: banner is a single-line strip (name + life + hand count), battlefield takes remaining space
- Remove fixed `h-40`, use `flex-1 min-h-0` so the battlefield fills its grid cell

**E. `src/components/game/PlayerBanner.tsx`**

- Add `compact` prop
- When compact: render as a single horizontal row — name, life, hand count, library count — no GY/exile/command sections
- Full details accessible via clicking to open the right sidebar overlay

**F. `src/components/game/HandZone.tsx`**

- No structural changes needed — it already uses `h-full` internally
- The parent container height changes from `h-36` to `h-28` in grid mode

**G. `src/components/game/BattlefieldZone.tsx`**

- Already accepts `heightClass` prop — no changes needed
- Grid cells will pass `flex-1 min-h-0` (the default)

### Grid cell sizing math:

Assuming 1920x1080 viewport:
- Top bar: ~44px
- Left sidebar: 176px
- Center width: 1920 - 176 = **1744px** (no right sidebar in grid mode)
- Each grid column: ~872px
- Each grid row: ~(1080 - 44) / 2 = ~518px
- Opponent BF per cell: ~518px - 32px (banner) = ~486px tall
- My cell: ~518px - 32px (banner) - 112px (hand) = ~374px for BF

At 1366x768:
- Center: 1366 - 176 = **1190px**
- Each column: ~595px (fits ~7 cards at 80px)
- Each row: ~362px
- My BF: ~362 - 32 - 112 = **218px** (tight but workable)

### Implementation order:

1. Fix player join bug (Part 1 — server + client delta)
2. Add `compact` prop to PlayerBanner
3. Add `compact` prop to OpponentView
4. Make right sidebar collapsible with overlay mode
5. Add 2x2 grid layout branch in GameTablePage
6. Test with 1, 2, 3, and 4 players
