# Game Table — Implementation Spec

Self-contained multiplayer MTG play table. No rules engine. Think untap.in: shared visual board, manual card movement, tap/untap, life tracking. Everything runs inside this app.

---

## Scope

**In scope**
- Shared battlefield with drag-and-drop card placement
- Tap / untap, face-down, counters
- Hand (private), library (face-down stack), graveyard, exile, command zone
- Life totals, poison counters, commander tax, commander damage tracking
- Deck import: paste Arena format, or load straight from sealed pool
- Token creation (predefined common tokens + custom)
- Scry N, draw N, shuffle, London mulligan
- 2–6 players, real-time via Socket.IO
- Commander format and free-form (no format enforcement)

**Out of scope**
- Rules enforcement of any kind
- Turn/phase automation
- Stack resolution
- Triggered ability tracking

---

## Data Model

### Card instance on the table

Every physical card is one `BattlefieldCard` record, keyed by a unique `instanceId` (UUID generated at deck import). `scryfallId` links back to card data for image lookup.

```ts
type GameZone =
  | 'battlefield'
  | 'hand'
  | 'library'
  | 'graveyard'
  | 'exile'
  | 'command_zone'
  | 'sideboard';

interface CardCounter {
  type: 'plus1plus1' | 'minus1minus1' | 'loyalty' | 'charge' | 'custom';
  value: number;
  label?: string;   // for custom counters
}

interface BattlefieldCard {
  instanceId: string;       // UUID, unique per copy on table
  scryfallId: string;       // links to ScryfallCard; 'token' for tokens
  name: string;             // denormalized
  imageUri: string | null;  // front-face normal image, denormalized

  zone: GameZone;
  controller: string;       // playerId

  // Position — percentage of battlefield dimensions, ignored outside battlefield
  x: number;
  y: number;

  // Visual state
  tapped: boolean;
  faceDown: boolean;
  flipped: boolean;         // for double-faced flip mechanic

  // Counters
  counters: CardCounter[];

  // Render order (client-only, not persisted)
  zIndex: number;
}
```

### Per-player state

```ts
interface GamePlayerState {
  playerId: string;
  playerName: string;
  life: number;             // 40 for Commander, 20 for others
  poisonCounters: number;
  commanderTax: number;     // add 2× this to commander's mana cost per cast

  // Commander damage received, keyed by the attacking commander's instanceId
  commanderDamageReceived: Record<string, number>;

  // Ordered zone membership — all values are instanceIds
  handCardIds: string[];        // index 0 = leftmost in hand
  libraryCardIds: string[];     // index 0 = top of library
  graveyardCardIds: string[];   // index 0 = most recently added
  exileCardIds: string[];
  commandZoneCardIds: string[];
  sideboardCardIds: string[];
}
```

### Game room

```ts
type GameFormat = 'commander' | 'standard' | 'limited' | 'free';
type GameStatus  = 'waiting' | 'active' | 'finished';

interface GameAction {
  id: string;
  timestamp: string;
  playerId: string;
  playerName: string;
  type: string;
  description: string;   // "Alice tapped Llanowar Elves"
}

interface GameRoom {
  id: string;
  code: string;           // 6-char shareable code
  hostId: string;
  format: GameFormat;
  status: GameStatus;
  createdAt: string;
  lastActivity: string;

  // Flat card store — single source of truth for all card state
  cards: Record<string, BattlefieldCard>;

  // Per-player state
  players: Record<string, GamePlayerState>;

  // Rolling action log, last 50 entries
  actionLog: GameAction[];
}
```

**Design note:** The `cards` record is flat and keyed by `instanceId`. Zone membership is tracked both in the card's `zone` field (fast lookup) and in the player's ordered `*CardIds` arrays (for ordering). These must stay in sync on every mutation. The server is the only place mutations happen.

---

## Socket.IO Event Schema

All events live in a Socket.IO room named `game:{gameRoomId}`.

### Client → Server

```
game:join            { gameRoomId, playerId }
game:leave           { gameRoomId, playerId }

card:move            { gameRoomId, instanceId, x, y, persist: bool }
                     // persist:false during drag (broadcast only, no save)
                     // persist:true on drop (save + broadcast)

card:zone            { gameRoomId, instanceId, toZone, toIndex? }
                     // toIndex for library (0 = top)

card:tap             { gameRoomId, instanceId, tapped: bool }
cards:tap-all        { gameRoomId, filter: 'all' | 'lands', tapped: bool }

card:facedown        { gameRoomId, instanceId, faceDown: bool }
card:counter         { gameRoomId, instanceId, counterType, delta }

player:life          { gameRoomId, delta }       // relative: +1 / -1
player:life:set      { gameRoomId, value }        // absolute
player:poison        { gameRoomId, delta }

library:draw         { gameRoomId, count }
library:shuffle      { gameRoomId }
library:scry         { gameRoomId, count }
library:scry:resolve { gameRoomId, keep: string[], bottom: string[] }
library:mulligan     { gameRoomId, keepCount }

commander:cast       { gameRoomId, instanceId }  // increments tax

token:create         { gameRoomId, template: TokenTemplate }

game:concede         { gameRoomId }
game:message         { gameRoomId, text }         // chat/table talk
```

### Server → Client

```
game:state           GameRoom                    // full state, sent on join/reconnect
                                                 // sanitized: other players' hands hidden

game:delta           {                           // incremental update after each mutation
  type: string,
  ...type-specific fields,
  log?: GameAction                               // appended to action log
}

game:scry:reveal     { cards: BattlefieldCard[] }  // sent only to scrying player's socket
```

**Delta types:**
`card_moved`, `card_tapped`, `zone_changed`, `counters_changed`, `life_changed`, `poison_changed`, `cards_drawn`, `library_shuffled`, `card_moving` (transient, no save), `commander_cast`, `token_created`, `player_connected`, `player_disconnected`, `player_conceded`

### Privacy model

The server calls `sanitizeRoomForPlayer(room, playerId)` before every outbound `game:state` or `game:delta` that contains hand card data. Other players' hand cards have `imageUri`, `scryfallId`, and `name` replaced with opaque placeholders. Library card identities are never sent — only the count. Graveyard and exile are always public.

---

## REST Endpoints

```
POST /api/games
  Body:    { hostName, format, playerCount? }
  Returns: { gameRoom, playerId }

GET  /api/games/:code
  Returns: { gameRoom }   (sanitized for anonymous viewer)

POST /api/games/:gameId/join
  Body:    { playerName }
  Returns: { gameRoom, playerId }

POST /api/games/:gameId/import-deck
  Body:    { playerId, deck: ParsedDeck }
  Returns: { gameRoom }   (updated)
```

---

## File Structure (new files only)

```
server/
├── routes/games.ts                   REST endpoints for game rooms
├── services/gameService.ts           room creation, deck import logic
├── services/gameStorageService.ts    file JSON CRUD (clone storageService pattern)
├── socket/gameHandlers.ts            all socket event handlers
└── types/game.ts                     server-side game types

src/
├── pages/GameTablePage.tsx           top-level page, registered in App.tsx
├── contexts/GameTableContext.tsx     socket + state, mirrors SealedEventContext
├── utils/deckImport.ts               Arena format parser
└── components/game/
    ├── GameLobby.tsx                 create/join room (mirrors EventCreator/EventJoin)
    ├── GameTable.tsx                 root layout: grid of zones
    ├── BattlefieldZone.tsx           free-form canvas, positions cards absolutely
    ├── BattlefieldCard.tsx           draggable card with tap/counter/menu
    ├── CardContextMenu.tsx           right-click: zone moves, counters, flip
    ├── HandZone.tsx                  fanned private hand
    ├── LibraryStack.tsx              face-down pile + count
    ├── GraveyardPile.tsx             face-up pile, shows top card
    ├── ExilePile.tsx
    ├── CommandZone.tsx               commander + tax counter
    ├── OpponentView.tsx              condensed opponent row at top
    ├── PlayerBanner.tsx              name, life, poison, commander damage
    ├── LifeCounter.tsx               click +/-, hold to repeat, double-tap to set
    ├── CounterBadge.tsx              +1/+1, loyalty, custom on card image
    ├── GameControls.tsx              draw, shuffle, tap-all, scry, token panel
    ├── ScryModal.tsx                 reveal top N, drag keep/bottom, confirm
    ├── TokenPanel.tsx                predefined + custom token templates
    ├── DeckImportModal.tsx           paste Arena text or load from sealed pool
    └── GameActionLog.tsx             scrollable last-N actions
```

---

## Component Layout

```
┌─────────────────────────────────────────────────────────┐
│  OpponentView (scrollable row, condensed per opponent)  │
│  [Name / Life] [Hand (N backs)] [Battlefield mini-view] │
├─────────────┬───────────────────────────────────────────┤
│  Left panel │  BattlefieldZone (shared, free-form)      │
│             │  Cards: position:absolute, left/top as %  │
│  HandZone   │  Tap = rotate(90deg) CSS transition       │
│  (fanned)   │  Drag via pointer events, no library      │
│             │                                           │
│  [Library]  ├───────────────────────────────────────────┤
│  [Graveyard]│  GameControls + ActionLog                 │
│  [Exile]    │  [Draw N] [Shuffle] [Tap Lands] [Untap]  │
│  [Cmd Zone] │  [Scry N] [Tokens] [Concede]             │
└─────────────┴───────────────────────────────────────────┘
```

For 3+ opponents: collapse each opponent into a minimal tile (name + life + hand count). Clicking a tile expands a modal with their full battlefield.

---

## Drag and Drop

No external library. Pointer events on `BattlefieldCard`, same pattern as `PackRevealSlider`:

```ts
// BattlefieldCard.tsx (simplified)
const handlePointerDown = (e: PointerEvent) => {
  e.currentTarget.setPointerCapture(e.pointerId);
  dragStart.current = { px: e.clientX, py: e.clientY, cardX: card.x, cardY: card.y };
};

const handlePointerMove = (e: PointerEvent) => {
  if (!dragStart.current) return;
  const rect = battlefieldRef.current!.getBoundingClientRect(); // always fresh
  const newX = dragStart.current.cardX + ((e.clientX - dragStart.current.px) / rect.width)  * 100;
  const newY = dragStart.current.cardY + ((e.clientY - dragStart.current.py) / rect.height) * 100;
  setLocalPos({ x: newX, y: newY });                            // optimistic
  throttledEmit('card:move', { instanceId, x: newX, y: newY, persist: false });
};

const handlePointerUp = () => {
  socket.emit('card:move', { instanceId, ...localPos, persist: true });
  dragStart.current = null;
};
```

**Z-index:** Maintained client-only. A `maxZIndex` ref in `GameTableContext` increments on every `pointerdown` on any card. Never synced to server — render order only matters locally.

**Coordinate system:** Percentage of battlefield dimensions. Resolution-independent. Read `getBoundingClientRect()` in the move handler directly; never cache it.

---

## Deck Import

### Arena format parser (`src/utils/deckImport.ts`)

```ts
interface ParsedDeck {
  commander: string | null;
  mainboard: { name: string; count: number }[];
  sideboard: { name: string; count: number }[];
}

export function parseArenaFormat(text: string): ParsedDeck
```

Handles:
- Section headers: `Commander`, `Deck`, `Sideboard`
- Commander lines: `# Card Name` or plain `1 Card Name`
- Main/side lines: `N Card Name`
- Blank lines, `//` comments, set codes like `1 Lightning Bolt (M21) 150`

### Server-side name resolution

Use Scryfall's **collection endpoint** (`POST /cards/collection`) — accepts up to 75 card identifiers per request. For a 60-card deck: 1–2 API calls total instead of 60.

```ts
// Batch all names, split into chunks of 75
const identifiers = names.map(name => ({ name }));
const chunks = chunk(identifiers, 75);
const cards = (await Promise.all(chunks.map(c => scryfallCollection(c)))).flat();
```

On resolution: create `BattlefieldCard` instances with `zone: 'library'`. Commander goes to `zone: 'command_zone'`. Shuffle library. Broadcast full updated state.

### Load from sealed pool

`PoolView` gets a **"Play This Deck"** button. It serialises `expandedDeckCards` (already `ScryfallCard[]`) directly — no Scryfall lookup needed. Creates a game room and navigates to it.

---

## Commander Features

- **Command zone:** Sidebar slot showing the commander card. Tax badge: `+{commanderTax * 2} mana`.
- **Commander tax:** Server increments `commanderTax` on each `commander:cast` event.
- **Commander damage:** Right-click attacking commander → "Deal Commander Damage to [Player]" → number input → updates `commanderDamageReceived`. Warning badge at 21.
- **Zone return:** Right-click menu on commander in graveyard/exile shows "Return to Command Zone" — moves card without incrementing tax.

---

## Life Counter

- Click `+` / `−` buttons: ±1
- Hold `+` / `−`: repeat every 80ms after 400ms hold delay
- Double-tap / double-click the number: inline input for direct set
- Starting life: 40 for Commander, 20 otherwise (set at room creation)

---

## Tokens

Predefined templates in `src/components/game/TokenPanel.tsx`:

```ts
interface TokenTemplate {
  name: string;
  typeLine: string;
  power: string;
  toughness: string;
  colors: string[];
  scryfallImageUri?: string;  // Scryfall token image if known
}
```

Common tokens ship as constants. Custom token form: name, P/T, colour, optional image URL. Token instances use `scryfallId: 'token'`. Rendered as a coloured card back with name/P/T text overlay when no image.

---

## Scry

1. Player clicks Scry N in GameControls
2. Emit `library:scry { count: N }`
3. Server sends `game:scry:reveal { cards }` **only to that player's socket**
4. `ScryModal` opens: two drop zones — "Keep on Top" and "Put on Bottom"
5. Cards start in "Keep on Top". Player drags to rearrange or move to bottom
6. Confirm → emit `library:scry:resolve { keep: [...ids], bottom: [...ids] }`
7. Server reorders library, broadcasts delta (no card identities revealed to others)

---

## London Mulligan

1. Player clicks "Mulligan (keep N)" — opens prompt asking how many to keep
2. Emit `library:mulligan { keepCount }`
3. Server: shuffle hand back into library, draw 7 (or library size if less)
4. Client: player selects which cards to bottom (count = 7 − keepCount)
5. Those selections emit `card:zone` for each card to `library` at bottom
6. Broadcast to table: "Alice mulliganed to 6" — no card identities revealed

---

## Multiplayer Visibility Rules

| Zone | Own cards | Opponents' cards |
|---|---|---|
| Battlefield | Full data | Full data |
| Hand | Full data | Count only + opaque backs |
| Library | Count only | Count only |
| Graveyard | Full data | Full data |
| Exile | Full data | Full data |
| Command Zone | Full data | Full data |

Enforced server-side in `sanitizeRoomForPlayer()`. Never trust the client to hide data.

---

## Phase 1 — Playable (build order)

| # | Task | Complexity |
|---|---|---|
| 1 | `server/types/game.ts` — all interfaces | Low |
| 2 | `server/services/gameStorageService.ts` — clone storageService | Low |
| 3 | `server/services/gameService.ts` — room creation, deck import, sanitize | Medium |
| 4 | `server/routes/games.ts` — 4 REST endpoints | Low |
| 5 | `server/socket/gameHandlers.ts` — all socket handlers | Medium |
| 6 | Register routes + handlers in `server/index.ts` | Low |
| 7 | `src/utils/deckImport.ts` — Arena format parser | Low |
| 8 | `src/contexts/GameTableContext.tsx` — socket + state + delta patching | Medium |
| 9 | `GameLobby.tsx` — create/join forms | Low |
| 10 | `DeckImportModal.tsx` — paste + pool load | Medium |
| 11 | `BattlefieldZone.tsx` + `BattlefieldCard.tsx` — drag, tap, context menu | **High** |
| 12 | `HandZone.tsx` + `LibraryStack.tsx` + `GraveyardPile.tsx` + `ExilePile.tsx` | Medium |
| 13 | `CommandZone.tsx` — card display + tax badge | Low |
| 14 | `PlayerBanner.tsx` + `LifeCounter.tsx` | Low |
| 15 | `OpponentView.tsx` — condensed + expand modal | Medium |
| 16 | `GameControls.tsx` — draw, shuffle, tap-all, untap-all | Low |
| 17 | `GameActionLog.tsx` | Low |
| 18 | `GameTablePage.tsx` — wire everything | Low |
| 19 | Add `'game'` mode to `App.tsx` + `ModeSelector` | Low |
| 20 | "Play This Deck" button in `PoolView` | Low |

## Phase 2 — Nice-to-Haves

| Task | Complexity |
|---|---|
| `ScryModal.tsx` — drag keep/bottom, confirm | Medium |
| `TokenPanel.tsx` — predefined + custom tokens | Low |
| London mulligan UI | Medium |
| Commander damage matrix modal | Medium |
| Poison counter UI | Low |
| Face-down cards (morph/manifest) | Low |
| Chat / table talk messages | Low |
| Tap-all lands button | Low |
| Card search within library | Medium |
| Undo last own action | High |

---

## Hard Problems & Gotchas

**Hand privacy** — `sanitizeRoomForPlayer()` must be called on every outbound broadcast. Missing one call leaks hand cards. Unit-test this function in isolation before wiring anything else.

**Drag coordinate system** — Always read `getBoundingClientRect()` fresh inside the pointer-move handler. Stale cached rects break dragging after scroll or resize.

**Z-index** — Client-only. Never sync to server. Keep a `maxZIndexRef` in context, increment on every card `pointerdown`. Avoids stale-closure bugs entirely.

**Deck import latency** — Use Scryfall `/cards/collection` (75 cards/request) not individual `/cards/named` calls. A 99-card Commander deck = 2 API requests instead of 99.

**Reconnect** — `game:join` handler always sends full `game:state` to the joining socket, regardless of whether the player was already in the room. Server state persists to disk on every mutation.

**6-player layout** — With 5 opponents, the top row gets too cramped to show mini-battlefields. Render each opponent as a tile (name + life + hand count) by default; clicking expands a modal with their full battlefield. Decide this before building `OpponentView`.

**Commander zone return** — Very common action. Must be a distinct right-click menu option on commander cards in graveyard or exile. Moving to command zone does **not** increment `commanderTax` — only casting does.

---

## Connecting the Dots to Existing Code

| Existing file | What to reuse |
|---|---|
| `server/services/storageService.ts` | Clone wholesale for `gameStorageService.ts` |
| `server/types/server.ts` | Pattern for new `server/types/game.ts` |
| `src/contexts/SealedEventContext.tsx` | Mirror for `GameTableContext.tsx` (socket init, delta handling) |
| `src/components/PackRevealSlider.tsx` | Pointer-event drag pattern for `BattlefieldCard.tsx` |
| `src/components/sealed/CardInspectPanel.tsx` | Card detail display pattern |
| `src/components/CardDisplay.tsx` | Image rendering, foil shimmer |
| `src/utils/deckExport.ts` | Invert for `deckImport.ts` |
| `server/routes/events.ts` | Pattern for `server/routes/games.ts` |
| `server/socket.ts` | Broadcast helper (already extracted) |
