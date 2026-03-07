# Deck Experience Overhaul Epic

## Executive Summary

The current deck workflow is fragmented, shallow, and temporary. It technically works, but only in the way a prototype works: enough to demo, not enough to live in.

This document should not be read as an MVP brief. The intent is the opposite.

We are not designing the smallest possible deck feature that can limp into production. We are designing a fully fledged deck architecture that can carry the entire app's deck experience for the long term. That means the implementation needs to be durable, modular, extensible, and explicit about ownership of deck state across import, editing, persistence, and play.

Right now the app has:
- a text parser for Arena-style lists
- a one-shot game import modal
- a sealed pool builder that is isolated from the rest of the app
- export helpers
- no real deck persistence model
- no local deck library
- no reusable deck editing surface
- no printing/art preference model

That means the app can accept decks, but it does not actually own the deck experience.

This epic fixes that.

The target state is a local-first deck system where a user can:
1. Create or import a deck.
2. Save it locally.
3. Reopen and edit it later.
4. Choose preferred printings/art.
5. Import from Arena format as a first-class supported starting path.
6. Load it directly into the game table.
7. Start commander-capable games with the commander already placed into the command zone.
8. Reuse sealed builds instead of losing them to export-only workflows.

No database. No accounts. No cloud dependency. Just a strong local deck workflow.

---

## Architectural Stance

This feature must be built as a platform, not a patch.

### What that means
- decks become a first-class domain in the codebase
- deck state gets its own data model, services, and UI surfaces
- deck persistence is a system, not an export button
- sealed and game table flows become consumers of the deck domain instead of each inventing their own deck logic
- print preferences, validation, import, save, and play are built on shared primitives

### What we are explicitly not doing
- we are not bolting more behavior onto `ParsedDeck`
- we are not keeping deck editing trapped inside modal-local React state
- we are not treating file persistence as a UI concern
- we are not solving this with one giant component and a pile of helper functions

### Quality bar
The code should be structured so that six months from now we can add:
- multiple deck formats
- richer validation policies
- maybeboard workflows
- deck history/versioning
- print filtering
- direct provider imports
- collection-aware features

without rewriting the entire subsystem.

That is the bar. Anything less is temporary code pretending to be architecture.

---

## Problem Statement

The current implementation is structurally weak in a few specific ways.

### 1. Decks are transient, not first-class
`DeckImportModal.tsx` is effectively a paste box with a submit button. That is not a deck system. It is an escape hatch.

### 2. Deckbuilding logic is duplicated and siloed
There are at least two separate mental models in the app:
- sealed deck assembly in `PoolView`
- game import via pasted text in `DeckImportModal`

These do not converge on a shared deck domain model. That is exactly how codebases become expensive to change.

### 3. There is no persistent local deck abstraction
The repo persists game rooms and events on disk, but not decks. The most important reusable player asset has no real home.

### 4. Import is too lossy
Arena text import throws away useful data:
- preferred printing
- card identity beyond normalized name
- user metadata like tags, notes, or deck format semantics

### 5. The app cannot currently support a serious deckbuilding UX
Without a canonical deck record, every future deck feature becomes harder:
- recent decks
- deck editing
- duplicate/rename
- autosave
- maybeboard
- alternate printings
- sealed-to-saved-deck
- play-from-library

The current design is cheap now and expensive later.

---

## Product Goals

The deck overhaul should achieve the following:

### Primary goals
- support Arena import as a first-class day-one workflow
- make decks first-class local assets
- support importing from text and local files
- support editing without re-pasting
- support local persistence without a database
- support choosing alternate printings/art
- support one-click loading into the table
- support commander-aware game start behavior
- unify sealed deck output with saved deck workflows

### Secondary goals
- improve discoverability of saved decks
- reduce friction between building and playing
- allow deck reuse across sessions
- keep browser-first deployment viable
- avoid turning this into a bloated collection manager in v1

### Explicit non-goals for v1
- accounts
- cloud sync
- remote deck sync providers
- public deck sharing
- collection ownership tracking
- economy/pricing-aware deck management
- full draft companion or collection database

### Important clarification
Even though some product capabilities are out of scope, the architecture must still be built to support them later without structural surgery.

In other words:
- feature scope can be staged
- architecture scope cannot be half-done

---

## Intended User Experience

This is the primary deckbuilding flow the product should optimize for.

### Core flow
1. The user creates or opens a deck from outside the Game Table.
2. That opens a dedicated deckbuilding UI.
3. Inside the builder, the user searches Scryfall-backed card data.
4. The user adds cards manually to the deck from search results.
5. The user removes cards manually from deck sections just as easily.
6. The user selects or changes the commander through a dedicated commander selection flow.
7. The user optionally chooses a specific printing for any card already in the deck.
8. The user saves the deck locally.
9. Later, the user can load that deck back into the builder or launch it into the table.

### UX principle
The experience should feel familiar to players who know Arena and other digital card games:
- create deck
- search cards
- add or remove cards quickly
- choose commander clearly
- customize printings when desired
- save and reopen naturally

It should not feel like:
- using a file utility
- pasting text into a temporary modal
- doing manual cleanup after import
- navigating through unrelated screens to do simple deck edits

### Product stance
Arena import is supported from day one, but manual deckbuilding through card search is also a first-class workflow. The builder is not just an import shell. It is the primary place where decks are authored and maintained.

---

## Screen-by-Screen UI Flow

This is the recommended starting UX based on the intended experience described so far.

## Screen 1: Deck Entry Screen

This is the place users land when they want to work on decks outside the Game Table.

### Purpose
- enter the deck system
- create a new deck
- open an existing deck
- quickly resume recent work

### Primary actions
- `New Deck`
- `Open Deck`
- `Recent Decks`

### Layout
- top area: page title and a short subtitle like `Build, save, and launch decks`
- primary action row:
  - `New Deck`
  - `Open Deck`
- below that: recent decks list
- below or beside that: full saved deck list with search/filter

### Expected interactions
- `New Deck` opens the new-deck creation flow
- `Open Deck` prompts the user to open a local JSON deck file when needed
- clicking a saved deck opens it in the builder
- clicking a recent deck resumes it directly

### UX intent
This should feel like the deck hub in a card game, not a file browser.

### Library presentation
Saved decks should feel like actual decks, not plain rows of data.

Each saved deck item should show:
- commander art as the default deck image when a commander exists
- optional custom deck icon or badge if the user sets one later
- deck name
- format
- last updated timestamp

Commander art should be the default visual identity of a deck in the library so the user feels like they are looking at a real deck shelf.

---

## Screen 2: New Deck Flow

This is the simplest possible start for manual deckbuilding.

### Purpose
- create a blank deck record
- establish deck identity before editing
- choose how the deck is created

### Fields
- deck name
- format selector
  - Commander
  - Limited / Sealed
  - Freeform

### Creation options
- `Build Manually`
- `Import Arena-Format Deck`

### Primary actions
- `Continue`
- `Cancel`

### Result
If the user chooses `Build Manually`:
- continue into the Deck Builder with:
  - empty mainboard
  - empty sideboard
  - empty maybeboard if supported
  - empty commander slot if format supports commander

If the user chooses `Import Arena-Format Deck`:
- continue into the Arena import screen as part of new deck creation
- after import, open the resulting deck in the builder so the user can edit cards, commander choice, and printings

### UX intent
This step should be lightweight. `New Deck` should mean "start building a deck however I want", not only "open a blank shell."

---

## Screen 3: Arena Import Flow

This is the primary non-manual ingestion path.

### Purpose
- paste Arena-format text
- create a new deck from it as part of the New Deck flow
- then hand the resulting deck into the builder for editing

### Layout
- large paste area
- parsed summary preview
- detected commander preview
- mainboard count preview

### Parsed preview should show
- deck name if available or generated
- commander if detected
- mainboard count
- sideboard count
- validation notes if obvious parsing issues exist

### Primary actions
- `Create Deck From Import`
- `Cancel`

### UX intent
The import should feel like one of the normal ways to create a deck. Importing from Arena is the start of deckbuilding, not the end of it.

---

## Screen 4: Deck Builder

This is the core screen. Most of the deck experience lives here.

### Purpose
- manually build the deck
- edit imported decks
- choose commander
- manage printings
- save and prepare to play

### Overall layout recommendation
Three-column desktop layout:
- left: card search and search results
- center: deck sections
- right: inspector, validation, stats, and save state

On smaller screens:
- search and deck sections stack
- inspector and stats collapse into tabs or drawers

### Top bar
The top bar should contain:
- deck name
- format
- save state
- `Save`
- `Save As`
- `Play This Deck`
- `Back to Decks`

### Left panel: Card Search
This is the main manual entry flow.

#### Contains
- search input
- optional filters:
  - card type
  - color
  - mana value
  - set
- result list with card image, name, type, set

#### Result actions
- `Add to Mainboard`
- `Add to Sideboard`
- `Set as Commander` when legal/appropriate

#### Interaction expectation
- typing updates results quickly
- clicking add inserts immediately into the chosen section
- if the card already exists, its count increases

### Center panel: Deck Sections
This is the editable deck itself.

#### Sections
- Commander
- Mainboard
- Sideboard
- Maybeboard if enabled

#### Each row should support
- card name
- count
- increment
- decrement
- remove
- open printing picker
- inspect card
- move between sections where appropriate

#### Commander section behavior
- only one commander slot by default for Commander support unless future rules say otherwise
- selecting a commander should be obvious and visible
- replacing commander should be easy
- the commander row should define the default deck image in the deck library unless a custom icon system later overrides it

### Right panel: Inspector / Validation / Stats

#### Inspector area
- larger card preview
- oracle text
- selected printing details

#### Validation area
- deck count
- commander presence
- singleton warnings
- unresolved issues
- readiness for game start

#### Stats area
- mana curve
- color spread
- type summary

### UX intent
This screen should make it obvious how to build a deck manually without requiring import. Search on the left, deck in the center, details on the right is the simplest high-confidence starting point.

---

## Screen 5: Commander Selection Interaction

Commander selection should be treated as a clear first-class action inside the builder, not as a hidden side effect.

### Entry points
- `Set as Commander` from search results
- `Choose Commander` button in the commander section
- `Replace Commander` action on the current commander row

### Expected behavior
- selecting a commander places it into the Commander section immediately
- if a commander already exists, the UI asks whether to replace it
- once the deck is played, that commander should enter the game in the command zone automatically

### UX intent
Players should never wonder where the commander went or whether it will be imported correctly.

---

## Screen 6: Printing Picker

This is a secondary customization flow, not the primary deckbuilding surface.

### Purpose
- choose alternate art/printing for a card already in the deck

### Entry point
- click `Art` or `Printing` on a deck row

### Layout
- selected card summary at top
- list/grid of available printings below
- each printing shows:
  - image
  - set code
  - set name
  - collector number
  - treatment label if relevant

### Primary actions
- `Use Default`
- `Use This Printing`
- `Cancel`

### UX intent
This should be optional and quick. Users build first, customize second.

---

## Screen 7: Save / Load Flow

This should feel application-native, not filesystem-native.

### Save behavior
- `Save` updates the current deck
- autosave may also run in the background when supported
- save state is always visible in the builder

### Save As behavior
- `Save As` prompts for a new deck name
- duplicates the current deck into a new saved deck

### Open behavior
- `Open Deck` returns to or overlays the deck list
- selecting a deck replaces the current builder contents after confirmation if dirty
- from the deck entry screen, `Open Deck` should also support choosing a local JSON-formatted deck file directly

### UX intent
The user should think in terms of decks, not files.

---

## Screen 8: Play This Deck Flow

This is the transition from deckbuilding to gameplay.

### Entry point
- `Play This Deck` in the builder top bar

### Purpose
- send the current saved or in-memory deck into a playable table flow

### Recommended options
- `Play in Sandbox`
- `Load Into Multiplayer Table`

### Expected behavior
- the deck is normalized before import
- if the format/deck includes a commander, that commander is already assigned correctly
- on game initialization, commander appears in the command zone automatically
- preferred printings carry into the imported deck state

### UX intent
This should feel like the natural final step after building.

---

## Screen 9: Reopen / Resume Flow

This is how the app should behave when the user comes back later.

### Entry behavior
- open the Deck Entry Screen
- show recent decks first
- allow one-click resume into the builder

### Expected behavior
- most recently worked-on decks are easy to find
- no manual import is required for normal saved-deck usage

### UX intent
Returning to a deck should feel frictionless.

---

## Recommended First UX Baseline

If we simplify all of the above into one strong starting implementation, the baseline should be:

1. Deck Entry Screen with `New Deck`, `Open Deck`, and recent decks.
2. Deck Builder with:
   - left search
   - center deck sections
   - right inspector/stats/validation
3. Commander selection as a dedicated, obvious action.
4. Printing picker attached to deck rows, not to search results.
5. `New Deck` branches into `Build Manually` or `Import Arena-Format Deck`.
6. Save, Save As, Open, and Play always visible in the builder header.

That is the strongest starting point given the workflow you described.

---

## Full-System Requirements

This deck platform must be able to support all of the following as first-class concerns:

### Domain requirements
- canonical saved deck model
- deck metadata and lifecycle fields
- import provenance
- exact or preferred card printing identity
- deck validation output
- deck format semantics
- deck section ownership

### Application requirements
- independent deck library navigation
- dedicated deck builder navigation
- safe transitions between library, builder, sealed, and play
- local persistence and recovery behavior
- recent/open deck tracking
- robust save/load error handling
- intuitive create/open/save/load behavior modeled after familiar digital card game deckbuilders

### Integration requirements
- sealed builder -> deck record
- deck record -> game import payload
- deck record -> Arena/text export
- local file -> deck record
- clipboard/text -> deck record
- imported commander -> command zone initialization at game start
- manual search-driven deck editing -> same canonical deck record as imported decks

### Operational requirements
- testable domain logic outside the UI
- file-system behavior isolated behind a service boundary
- deterministic transforms between representations
- versioned deck documents
- migration points for future schema changes
- non-destructive fallback behavior when local storage capabilities fail

---

## Senior Review of Current Codebase

This section is intentionally blunt.

### What is usable
- `src/utils/deckImport.ts`
  - clean enough as a parser entry point
  - useful as a compatibility layer
- `src/utils/deckExport.ts`
  - fine for text export helpers
- `server/services/gameService.ts`
  - already has a name-resolution path and import pipeline
- `src/components/sealed/PoolView.tsx`
  - proves deck assembly concepts exist in the app
- `src/components/game/CardInspectorPanel.tsx`
  - good reusable pattern for card inspection

### What is weak
- `DeckImportModal.tsx`
  - UI is doing too much domain work for a temporary modal
  - state is local and disposable
  - not reusable as a real deck workflow
- `PoolView.tsx`
  - deck state is embedded inside one screen
  - no promotion of a built deck into a persistent artifact
- `ParsedDeck`
  - too small to represent an actual saved deck domain
  - good import shape, bad canonical model
- `gameService.importDeck()`
  - assumes names are the primary identity
  - not prepared for pinned printings or richer deck metadata
- app information architecture
  - no obvious home for a real deck library
  - Game Table currently absorbs too much responsibility

### Architectural smell
The codebase currently treats decks as payloads instead of products.

That is the central design mistake.

---

## Implementation Context For Future Agents

This section exists to reduce exploration cost. A future agent should not need to scan the entire repo to start this work.

### Read these files first

#### 1. `src/utils/deckImport.ts`
Why it matters:
- this is the current Arena-format parser
- it already handles commander inference in some sideboard-style cases
- it is the current import compatibility layer

What to do with it:
- keep the parsing knowledge
- do not treat `ParsedDeck` as the final deck domain model
- likely wrap or evolve this into `deckArena.ts` / `deckRecord` conversion utilities

#### 2. `src/utils/deckExport.ts`
Why it matters:
- this is the current text export path
- it already knows how to generate Arena-style output

What to do with it:
- preserve the export capability
- move it behind the canonical `DeckRecord` model instead of raw ad hoc card arrays

#### 3. `src/components/game/DeckImportModal.tsx`
Why it matters:
- this is the current game-table deck import UX
- it shows how deck text is parsed and handed into game import today

What to do with it:
- treat it as a compatibility entry point, not the long-term deck UX
- mine it for behavior, then shrink or replace it

#### 4. `src/components/sealed/PoolView.tsx`
Why it matters:
- this is the current manual-ish deck construction surface
- it already manages deck counts, card add/remove, basics, and deck summaries

What to do with it:
- reuse patterns and interaction ideas
- do not duplicate its private deck representation in the new system
- eventually convert sealed output into a shared `DeckRecord`

#### 5. `src/contexts/GameTableContext.tsx`
Why it matters:
- this is the client entry point for creating/joining games and importing decks
- `importDeck` and `importCommander` flow through here

What to do with it:
- this file will need integration updates once the deck platform emits richer deck payloads
- do not put deck-library state in here; this is still game state, not deck-domain state

#### 6. `server/services/gameService.ts`
Why it matters:
- this is the current authoritative game import implementation
- it resolves card names through Scryfall
- it creates the actual in-game card instances
- it already handles commander placement into command zone

What to do with it:
- extend it to accept richer deck card inputs
- preserve the current name-based fallback path
- keep this as the place where final game-import normalization happens

#### 7. `server/routes/games.ts`
Why it matters:
- this is the HTTP boundary for deck import into game rooms

What to do with it:
- update request payload shapes here when the deck platform starts sending richer deck records or resolved deck entries

#### 8. `src/types/card.ts`
Why it matters:
- this defines current Scryfall card shapes used throughout the frontend

What to do with it:
- do not overload `ScryfallCard` into becoming a saved deck document type
- deck types should live separately in `src/types/deck.ts`

#### 9. `src/api/scryfall.ts`
Why it matters:
- current app-facing Scryfall access lives here
- useful reference for search/result normalization and printing support

What to do with it:
- reuse query logic patterns
- do not directly bind builder UI to these raw shapes if a normalized deck search service is introduced

#### 10. `src/App.tsx`
Why it matters:
- this is where top-level app modes are currently chosen

What to do with it:
- if Deck Library becomes a top-level mode, this file will need navigation changes early

### Files that matter later, not first

These files are relevant, but they are not the first thing an implementer should open:
- `src/components/game/GameLobby.tsx`
- `src/pages/GameTablePage.tsx`
- `server/types/game.ts`
- `src/components/game/CardInspectorPanel.tsx`

Reason:
- they matter for integration and UX polish
- they are not where the deck domain should be born

### Files that should not become the architecture

Future implementers should resist building the system directly inside these:
- `DeckImportModal.tsx`
- `PoolView.tsx`
- `GameTableContext.tsx`

Why:
- they are consumers of deck behavior, not the correct owners of deck architecture

### Recommended implementation order for code reading

If another agent needs the minimum useful reading order, it should be:
1. `src/utils/deckImport.ts`
2. `src/utils/deckExport.ts`
3. `server/services/gameService.ts`
4. `src/components/game/DeckImportModal.tsx`
5. `src/components/sealed/PoolView.tsx`
6. `src/contexts/GameTableContext.tsx`
7. `src/App.tsx`

That is enough to understand:
- current deck ingestion
- current deck export
- current game import
- current manual deck-ish construction
- where the new deck mode will plug into the app

### New files that should probably be introduced rather than avoided

To keep the subsystem clean, the implementation should prefer introducing dedicated files instead of cramming behavior into old ones.

High-confidence additions:
- `src/types/deck.ts`
- `src/utils/deckArena.ts`
- `src/utils/deckValidation.ts`
- `src/utils/deckSummary.ts`
- `src/utils/deckMigration.ts`
- `src/services/deckStorage.ts`
- `src/services/deckFileSystem.ts`
- `src/services/deckSerialization.ts`
- `src/services/deckCardSearch.ts`
- `src/services/deckPrintingService.ts`
- `src/pages/DeckLibraryPage.tsx`
- `src/pages/DeckBuilderPage.tsx`
- `src/components/decks/*`

### Current truths another agent should not rediscover

- Arena import already exists, but only as a parser and temporary import UX.
- Commander import already exists in the game layer, including command-zone placement.
- Sealed already has a partial deckbuilding interaction model, but it is not canonical.
- The app is browser-first, not Electron/Tauri.
- Local persistence for games and events exists, but not for deck documents.
- The right path is to create a deck subsystem, not to "improve the modal."

---

## Desired End State

We need a unified deck platform inside the app with three major surfaces:

1. Deck Library
2. Deck Builder
3. Play Integration

### Deck Library
A persistent local catalog of decks.

Capabilities:
- view saved decks
- create new deck
- import deck
- open/edit deck
- duplicate deck
- rename deck
- delete deck
- sort/filter/search deck list
- show recent decks
- play a deck directly

### Deck Builder
A real editing interface for one deck.

Capabilities:
- create a deck from scratch
- search Scryfall-backed card data
- add cards manually
- remove cards manually
- edit commander
- edit mainboard
- edit sideboard
- optionally support maybeboard
- inspect cards
- adjust counts
- move cards between sections
- validate structure
- autosave changes
- choose preferred printings

### Play Integration
A clean bridge from a saved deck into the game table.

Capabilities:
- load deck into game
- preserve commander placement
- preserve preferred art/printing
- preserve sideboard if supported
- place imported commander into the command zone automatically when the game begins
- work for sandbox and multiplayer flows

---

## Target Architecture

The deck system should be built as four layers with strict responsibilities.

### 1. Domain layer
Owns deck types, validation, normalization, transformations, and business rules.

This layer should know:
- what a deck is
- what sections a deck has
- how commander identity is represented in imported and saved decks
- how print preferences are represented
- how a deck is validated
- how imports normalize into the canonical model

This layer should not know:
- React
- browser file APIs
- route components
- modal state

### 2. Persistence layer
Owns local storage, folder integration, file parsing/serialization, save/load/delete/list behavior, and schema migration.

This layer should know:
- how deck documents are stored
- how folder-backed and fallback modes behave
- how to serialize/deserialize deck files
- how to detect capabilities and permission failures

This layer should not know:
- presentation
- JSX
- deck builder layout

### 3. Application layer
Owns orchestration and state management across library, builder, import flows, and play actions.

This layer should know:
- which deck is open
- whether there are unsaved changes
- when to autosave
- when to route into the game table
- how to coordinate storage and domain services
- how the create/open/save/load builder flows behave from the user's point of view

This layer should not know:
- low-level file API details
- direct Scryfall response parsing beyond service boundaries

### 4. Presentation layer
Owns screens and components for:
- deck library
- deck builder
- import panels
- printing picker
- validation display
- stats display

This layer should be thin. If meaningful business rules end up here, the architecture is already degrading.

---

## Proposed Code Architecture

Below is the concrete code structure this system should grow into.

### Core types
Add `src/types/deck.ts` as the canonical deck domain file.

It should define at minimum:
- `DeckRecord`
- `DeckCardEntry`
- `DeckSection`
- `DeckFormat`
- `DeckSource`
- `DeckPreferences`
- `PreferredPrinting`
- `DeckValidationIssue`
- `DeckSummary`
- `DeckStorageCapability`
- `DeckLoadResult`
- `DeckSaveResult`

### Domain utilities
Add a dedicated deck domain utility set, likely:
- `src/utils/deckRecord.ts`
- `src/utils/deckArena.ts`
- `src/utils/deckValidation.ts`
- `src/utils/deckSummary.ts`
- `src/utils/deckMigration.ts`

Responsibilities:
- normalize imported data into canonical deck records
- convert deck records into exportable Arena text
- compute summaries and derived stats
- compute validation issues
- migrate older deck file versions into the latest schema
- normalize commander semantics for Arena imports, including sideboard-based commander exports

### Persistence services
Add a dedicated storage service layer, likely:
- `src/services/deckStorage.ts`
- `src/services/deckFileSystem.ts`
- `src/services/deckSerialization.ts`

Responsibilities:
- detect file system support
- persist and restore folder handles
- list deck files
- read/write deck JSON
- delete/rename decks
- handle fallback mode
- convert raw file payloads into `DeckRecord`

### Search / card-resolution services
Add a layer responsible for card lookup and printing resolution, likely:
- `src/services/deckCardSearch.ts`
- `src/services/deckPrintingService.ts`

Responsibilities:
- search cards by name
- fetch exact printings
- normalize Scryfall printing metadata into app-safe structures
- support print-picker UI without leaking raw API contracts everywhere
- support a fast builder search experience where add/remove actions are driven from search results and deck sections

### State management
Add a dedicated deck app-state layer, likely one of:
- `src/contexts/DeckLibraryContext.tsx`
- `src/contexts/DeckBuilderContext.tsx`

or a hook-driven equivalent:
- `src/hooks/useDeckLibrary.ts`
- `src/hooks/useDeckBuilder.ts`

Responsibilities:
- deck list state
- selected deck state
- open/close builder state
- dirty state
- autosave state
- import workflows
- play workflow dispatch

### Pages and components
Add deck-first surfaces:
- `src/pages/DeckLibraryPage.tsx`
- `src/pages/DeckBuilderPage.tsx`
- `src/components/decks/*`

Expected major components:
- `DeckLibrary`
- `DeckListItem`
- `DeckFilters`
- `DeckImportPanel`
- `DeckBuilder`
- `DeckSearchPanel`
- `DeckSectionView`
- `DeckRowEditor`
- `CommanderSelector`
- `DeckInspectorPanel`
- `DeckValidationPanel`
- `DeckStatsPanel`
- `PrintingPickerModal`
- `SaveStateBadge`

---

## Proposed Product Direction

### Local-first, browser-first
The app remains a web app. That means local storage strategy must respect browser reality rather than pretending this is a desktop app.

### Storage direction
Primary:
- browser-granted folder access when supported

Fallback:
- manual import/export/download when not supported

### Meaning of "save in Documents"
A normal browser cannot just write into `Documents` without permission. So the practical interpretation is:
- user selects a folder, probably inside `Documents`
- app remembers that folder when browser support exists
- app reads/writes deck files there
- if unsupported, app falls back gracefully

This is the right compromise. Anything else is magical thinking.

### UX direction
The storage model should stay under the hood.

The user-facing experience should feel like:
- `New Deck`
- `Open Deck`
- `Save`
- `Save As`
- `Import Arena Deck`

not like direct filesystem management. The app can be powered by folder-backed storage internally without making the user think in terms of browser storage mechanics during normal use.

---

## Core Domain Model

We need a real saved deck model.

### Canonical saved type: `DeckRecord`
A deck document should include:

- `id`
- `version`
- `name`
- `format`
- `source`
- `createdAt`
- `updatedAt`
- `lastPlayedAt`
- `tags`
- `notes`
- `commander`
- `mainboard`
- `sideboard`
- `maybeboard` optional
- `preferences`
- `validation` derived, not persisted unless needed for caching

### `DeckCardEntry`
Each deck row should include:
- `cardName`
- `count`
- `preferredPrinting` optional
- `oracleIdentity` optional normalized identity if we want future support for canonical oracle grouping
- `notes` optional if row-level annotations become useful later
- `role` optional for import normalization cases where commander identity needs to survive source-format cleanup

### `PreferredPrinting`
Should include enough to avoid unnecessary re-resolution:
- `scryfallId`
- `set`
- `setName`
- `collectorNumber`
- `imageUri`
- `backImageUri` optional
- `backName` optional

### Why this matters
If the canonical model is still basically `ParsedDeck`, this epic will fail. We need a durable editing model, not just an import structure.

### Recommended example shape
```ts
export interface DeckRecord {
  id: string;
  version: number;
  name: string;
  format: DeckFormat;
  source: DeckSource;
  createdAt: string;
  updatedAt: string;
  lastPlayedAt?: string | null;
  tags: string[];
  notes: string;
  commander: DeckCardEntry[];
  mainboard: DeckCardEntry[];
  sideboard: DeckCardEntry[];
  maybeboard?: DeckCardEntry[];
  preferences: DeckPreferences;
}

export interface DeckCardEntry {
  cardName: string;
  count: number;
  preferredPrinting?: PreferredPrinting | null;
}

export interface PreferredPrinting {
  scryfallId: string;
  set: string;
  setName: string;
  collectorNumber: string;
  imageUri: string | null;
  backImageUri?: string | null;
  backName?: string | null;
}
```

This does not need to be the final exact schema, but the implementation should target this level of explicitness.

---

## Data Model Principles

### 1. Arena text is an interchange format, not the truth
Arena text is useful for import/export. It is not sufficient as the internal representation.

That said, Arena-format import must be treated as a primary ingestion path from day one. It is the easiest bridge from existing deck sources into this platform, so it cannot be left as a compatibility afterthought.

### 2. Name-based resolution is fallback only
Card name is not stable enough for art preferences and exact printing selection.

### 3. Preferred printing is per card name, not per copy
This is the chosen direction because it avoids gratuitous complexity.

Reason:
- smaller files
- simpler UI
- simpler mental model
- fewer impossible edge cases
- enough power for v1

If later we want copy-level print assignment, we can evolve into it. We should not start there.

### 4. Deck files need versioning
If this is persisted locally, schema changes are inevitable. Versionless local files are amateur hour.

---

## Storage Strategy

## Primary storage path
A local deck folder selected by the user via browser file system APIs when available.

### Required capabilities
- choose deck folder
- remember folder handle
- scan deck files
- read deck files
- write deck files
- rename by rewrite/delete strategy if necessary
- detect missing permission and recover

### Fallback mode
When folder APIs are unavailable:
- import from local `.txt` or `.json`
- edit in memory
- export/download on save
- clearly indicate that autosave/folder sync is unavailable

### Canonical saved format
Use JSON as the primary saved deck format.

### Optional export format
Offer Arena `.txt` export on demand, not as the main storage format.

Reason:
- JSON can carry metadata and print preferences
- text cannot
- dual-writing by default adds complexity and failure modes for little benefit

### Implementation expectation
The persistence layer should expose a stable interface that the app consumes regardless of storage mode.

Something close to:

```ts
export interface DeckStorage {
  getCapability(): Promise<DeckStorageCapability>;
  listDecks(): Promise<DeckSummary[]>;
  loadDeck(deckId: string): Promise<DeckRecord>;
  saveDeck(deck: DeckRecord): Promise<void>;
  deleteDeck(deckId: string): Promise<void>;
  duplicateDeck(deckId: string, nextName: string): Promise<DeckRecord>;
  importDeckFile(file: File): Promise<DeckRecord>;
  rescan(): Promise<DeckSummary[]>;
}
```

The rest of the app should target this abstraction, not the browser APIs directly.

---

## UI Surface Plan

## Option A: Decks as top-level app mode
Add a dedicated `Decks` mode beside:
- Random Pack
- Sealed Event
- Game Table

### Pros
- better information architecture
- makes decks a first-class concept
- easier to grow over time
- less pressure on Game mode to do everything

### Cons
- broader app nav changes
- more up-front work

## Option B: Decks embedded under Game mode
Keep Deck Library attached to the Game Table flow.

### Pros
- less nav change
- faster first implementation

### Cons
- still conceptually wrong
- decks are broader than "play a game"
- sealed integration becomes awkward

### Recommendation
Make Deck Library a top-level app mode.

That is the correct product structure. Decks are not merely a pre-game utility. They are a core app capability.

---

## Proposed Major Components

### 1. Deck Library Page
Responsibilities:
- display all saved decks
- import/create/open/play
- folder configuration
- recent deck list
- empty states
- unsupported-browser fallback messaging

Likely additions:
- `src/pages/DeckLibraryPage.tsx`
- `src/components/decks/DeckLibrary.tsx`
- `src/components/decks/DeckListItem.tsx`
- `src/components/decks/DeckImportPanel.tsx`

Expected UX:
- `New Deck`
- `Import Arena Deck`
- `Open Deck`
- recent deck list
- search/filter existing saved decks

This should feel like the deck shelf that leads into editing, not a technical dashboard.

### 2. Deck Builder Page
Responsibilities:
- edit a single deck
- sectioned list editing
- card search and manual add/remove
- commander selection
- validation
- print/art selection
- stats
- autosave state

Likely additions:
- `src/pages/DeckBuilderPage.tsx`
- `src/components/decks/DeckBuilder.tsx`
- `src/components/decks/DeckSearchPanel.tsx`
- `src/components/decks/DeckSection.tsx`
- `src/components/decks/DeckRow.tsx`
- `src/components/decks/CommanderSelector.tsx`
- `src/components/decks/DeckValidationPanel.tsx`
- `src/components/decks/DeckStatsPanel.tsx`

Expected UX:
- visible card search area
- obvious commander slot/section
- easy click-to-add and remove controls
- mainboard and sideboard always visible and editable
- printing selection available from the card row, but not required to add the card
- save/load actions obvious and always accessible

### 3. Printing Picker
Responsibilities:
- show printings for a card
- select preferred version
- preview art/treatment

Likely additions:
- `src/components/decks/PrintingPickerModal.tsx`

### 4. Local Deck Service
Responsibilities:
- folder handle management
- file scan/read/write
- import/export conversions
- save/update/delete deck records
- permission/fallback handling

Likely additions:
- `src/services/deckStorage.ts`
- `src/services/deckImportService.ts`
- `src/services/deckExportService.ts`

### 5. Shared deck types
Likely additions:
- `src/types/deck.ts`

### Component ownership rule
Components should render and dispatch actions. They should not be responsible for:
- schema migration
- file writes
- deck validation rules
- import parsing
- print resolution logic

If a component is doing those things, the implementation is already heading in the wrong direction.

---

## Code-Level Implementation Requirements

## Frontend domain layer
We need a proper deck domain package in the frontend.

### Add `src/types/deck.ts`
Must define:
- `DeckRecord`
- `DeckCardEntry`
- `PreferredPrinting`
- `DeckFormat`
- `DeckSource`
- `DeckSummary`
- local capability/result types where needed

### Add deck conversion utilities
Likely files:
- `src/utils/deckArena.ts`
- `src/utils/deckRecord.ts`
- `src/utils/deckValidation.ts`
- `src/utils/deckSummary.ts`
- `src/utils/deckMigration.ts`

Responsibilities:
- Arena text -> `DeckRecord`
- `DeckRecord` -> Arena text
- import file normalization
- validation logic
- deck summary generation
- schema upgrades between persisted versions
- commander inference and normalization for Arena imports, including exports where commander is encoded outside a dedicated Commander section
- search-result card normalization into a builder-safe card representation

## Frontend persistence layer
We need a clean service abstraction, not file API calls sprayed through components.

### Add `src/services/deckStorage.ts`
Must handle:
- capability detection
- folder handle persistence
- permission checks
- list decks
- load deck
- save deck
- delete deck
- rescan folder
- fallback mode support

### Important requirement
This service must hide browser API ugliness from React components. If file system calls leak into UI components everywhere, this will turn into untestable garbage.

### Additional requirement
Do not mix serialization concerns and folder-access concerns in the same utility blob. Those should be separate modules:
- one for deck schema read/write
- one for filesystem capability and handle management
- one facade service consumed by application state

## Frontend state management
Deck state should not live entirely in random component locals.

### Likely need
A deck context or dedicated state hook:
- `src/contexts/DeckLibraryContext.tsx`
or
- `src/hooks/useDeckLibrary.ts`
- `src/hooks/useDeckBuilder.ts`

Responsibilities:
- current deck list
- current deck record
- dirty state
- save state
- folder capability state
- import flows
- deck selection/open state
- search query state
- card search result state
- commander selection flow state

### Requirement
Do not let `DeckBuilderPage` directly own every domain mutation inline. That is how editing logic becomes impossible to test.

### State mutation expectation
The builder should operate through explicit actions or reducer-driven state transitions such as:
- `renameDeck`
- `setFormat`
- `setNotes`
- `searchCards`
- `selectCommander`
- `addCardToSection`
- `removeCardFromSection`
- `changeCardCount`
- `moveCardBetweenSections`
- `setPreferredPrinting`
- `replaceFromImport`
- `mergeFromImport`

That gives us testable deck editing semantics instead of event-handler spaghetti.

### Builder interaction expectation
The builder should support a simple manual loop:
1. user types into search
2. results appear from normalized Scryfall-backed data
3. user adds the result to commander/mainboard/sideboard
4. section counts update immediately
5. user removes or decrements cards from the deck sections directly
6. printing selection remains optional per card row

---

## Backend / Game Import Changes

The backend does not need to become a deck database, but it does need to stop assuming that card names are the only meaningful identity.

### Existing backend path
`server/services/gameService.ts`:
- resolves card names via Scryfall collection endpoint
- creates game card instances
- imports commander/mainboard/sideboard by name

### Required evolution
Support richer deck import entries.

### New requirement
The game import path must accept deck entries that optionally include:
- pinned `scryfallId`
- known front/back images
- explicit printing metadata

### Target behavior
For each deck entry:
1. Prefer pinned `scryfallId` if provided.
2. Fall back to name-based resolution if missing.
3. Preserve image and DFC metadata.
4. Keep commander/sideboard behavior intact.

For commander-aware decks:
5. Create commander instances directly in the command zone before the initial game state is presented.
6. Ensure the imported room state is already correct at first render rather than relying on later repair steps.

### Likely backend changes
- extend import request types in `server/types/game.ts`
- update `server/routes/games.ts`
- update `server/services/gameService.ts`

### Important note
This should be additive. Do not break plain name-based imports just because richer saved decks exist now.

### Arena import expectation
Arena-imported decks must remain a first-class supported path:
- paste Arena list into the library or builder
- normalize into `DeckRecord`
- preserve or infer commander correctly
- import into the table with commander already in the command zone

### Code-level expectation
Introduce a resolved import shape on the server side instead of overloading the current minimal request indefinitely.

For example:

```ts
interface ResolvedDeckCardInput {
  cardName: string;
  count: number;
  preferredPrinting?: {
    scryfallId: string;
    imageUri: string | null;
    backImageUri?: string | null;
    backName?: string | null;
  } | null;
}
```

Then adapt `gameService.importDeck()` to resolve by:
- `preferredPrinting.scryfallId` first
- exact card name second

This will keep the game table import path aligned with saved deck semantics.

Commander placement should be part of deck initialization, not a separate manual recovery step after import.

---

## Sealed Integration Requirements

The sealed flow currently produces a deck-like thing but not a reusable deck artifact.

That is bad product design.

### Required additions
From sealed builder:
- save current build as deck
- name the deck
- open in Deck Builder
- export as Arena text if wanted
- play directly

### Code implications
`src/components/sealed/PoolView.tsx` currently owns temporary deck state:
- `deckCounts`
- `basicLandCounts`

That needs a bridge into `DeckRecord` creation.

### Requirement
Do not reimplement deck persistence separately inside sealed mode. Sealed should publish into the shared deck model.

### Code-level expectation
`PoolView.tsx` should eventually stop being the owner of a private deck representation. It should either:
- emit a `DeckRecord` directly, or
- emit a neutral builder payload that is converted once into `DeckRecord`

Anything else just recreates the same fragmentation in a new place.

---

## Printing / Art Selection Requirements

This is a major feature and should not be hacked on top.

### Desired behavior
A user can select a preferred printing for a card entry in the deck.

This should happen after the card is already in the deck. Printing selection is customization, not a gate on basic deckbuilding.

### UI requirements
- inspect current selected art
- browse alternate printings
- see set code and collector number
- show treatment if relevant
- save preferred printing
- clear preferred printing

### Data requirements
Store enough information to avoid repeated ambiguous resolution.

### Resolution strategy
Search by card name, fetch printings, then let user choose one.

### Important UX requirement
Do not flood the user with every weird variant up front. The picker should be scoped and readable.

Likely useful filters:
- exact card name only
- paper printings only
- maybe hide undesirable novelty variants unless requested

### Code-level expectation
Do not couple the print-picker directly to raw Scryfall response types in the component. Add a normalized printing model in a service boundary first, then render that.

That keeps API drift and UI churn from infecting each other.

### UX expectation
The intuitive flow is:
- search and add the card first
- open printing options only if the user wants a different art
- save that choice onto the deck row

That matches how players think. They build first, then customize.

---

## Validation Requirements

Validation should be advisory in v1, not blocking.

### Deck validation should report
- total card count
- commander missing/present
- commander format assumptions
- commander readiness for game start
- singleton violations for Commander
- suspicious sideboard counts
- empty deck sections
- unresolved card entries if any

### Why advisory
Blocking validation is high-friction and format rules are messy. Inform first, enforce later only if truly necessary.

### Code placement
Validation logic belongs in shared utilities, not in UI components.

---

## Autosave and Dirty State

This is mandatory if we want the builder to feel serious.

### Requirements
- detect unsaved changes
- autosave when folder-backed storage is available
- show save state clearly
- handle permission loss gracefully
- avoid save spam through debounce or save queue

### Save states
Need explicit UI states:
- saved
- saving
- unsaved changes
- save failed
- manual export required

### Requirement
Autosave must not silently fail. If local persistence breaks, the user needs to know.

### Implementation expectation
Autosave should be queue-based or debounced with a clear last-write-wins policy. Do not fire overlapping writes from every keystroke without coordination.

At minimum, builder state should track:
- `isDirty`
- `isSaving`
- `saveError`
- `lastSavedAt`

---

## Import Flows

### v1 supported imports
- pasted Arena text
- local `.txt` Arena files
- local `.json` saved deck files

### Arena import must support
- dedicated Commander sections
- sideboard-encoded commander exports common to Arena-style tooling
- normalization into saved deck state without requiring the user to manually reselect the commander afterward

### Manual deck creation must support
- creating an empty deck from the library
- searching Scryfall-backed results inside the builder
- adding cards directly into commander/mainboard/sideboard
- removing cards directly from those sections
- transitioning from manual build into saved deck state without extra conversion ceremony

### Required import modes
- create new deck from import
- replace current deck
- merge into current deck

### Why merge matters
Users will use this for iterations and sideboard/maybeboard edits. Replace-only is lazy design.

### Parsing requirement
Imported text should normalize:
- section headers
- sideboard/commander inference
- Arena set-code suffixes

We already do some of this. That logic should be reused, not duplicated.

---

## Save / Load UX Requirements

The save/load behavior should feel intuitive in the same way digital card games do.

### Desired mental model
- `New Deck` opens a blank builder
- `Open Deck` restores an existing saved deck into the builder
- `Save` updates the current deck
- `Save As` duplicates into a new deck
- `Import Arena Deck` creates or replaces deck contents cleanly

### UX requirement
The user should not have to think about file mechanics during normal use. Save/load should feel like application actions first, storage actions second.

### Code expectation
Builder interactions should target application-level commands like:
- `createDeck`
- `openDeck`
- `saveDeck`
- `saveDeckAs`
- `importArenaText`
- `loadDeckIntoGame`

not raw filesystem calls from button handlers.

---

## Export Flows

### v1 exports
- export Arena text
- export JSON deck file
- optionally duplicate as file download if folder sync is unavailable

### Requirement
Export should come from the canonical `DeckRecord`, not from ad hoc UI state.

---

## Recommended Technical Decomposition

## Phase 1: Deck Domain Foundation
Implement:
- `src/types/deck.ts`
- conversion utilities
- validation utilities
- file format versioning

Acceptance criteria:
- can round-trip `DeckRecord` <-> Arena text where possible
- can import/export canonical JSON
- validation works independently of UI
- migration utilities can upgrade prior deck versions safely
- Arena commander imports normalize correctly into canonical commander data

## Phase 2: Local Deck Storage Service
Implement:
- folder capability detection
- folder handle persistence
- list/load/save/delete APIs
- fallback mode support

Acceptance criteria:
- deck service can be tested without UI
- unsupported browser mode does not crash
- save/load works with clean error surfaces
- all file access is behind a single stable facade

## Phase 3: Deck Library UI
Implement:
- deck list
- create/import/open/delete/duplicate/rename
- folder selection and status
- recent decks

Acceptance criteria:
- user can manage a persistent local set of decks
- library works in both folder-backed and fallback modes
- create/open/import flows feel like a normal deck game UX rather than a storage management UI

## Phase 4: Deck Builder UI
Implement:
- sectioned editor
- card search and manual add/remove
- commander selector
- count editing
- move between sections
- validation panel
- stats panel
- autosave/dirty states

Acceptance criteria:
- user can fully edit a deck without leaving the builder
- save state is visible and reliable
- builder actions are testable without rendering the full page
- users can build a deck entirely manually through search without relying on import text

## Phase 5: Printing Preference Flow
Implement:
- printing picker
- preferred printing persistence
- image/art preview updates
- import path changes for game load

Acceptance criteria:
- preferred printing survives save/load
- chosen art appears in builder and table import

## Phase 6: Table + Sealed Integration
Implement:
- play saved deck into table
- save sealed build as deck
- open sealed build in builder
- recent decks in game lobby

Acceptance criteria:
- sealed mode and game mode both consume the same deck model
- no duplicate deck logic is introduced
- commander decks enter the table with commander already in the command zone on initial game state

---

## Files Likely To Change

### Existing files likely to be modified
- `src/App.tsx`
- `src/components/game/DeckImportModal.tsx`
- `src/components/game/GameLobby.tsx`
- `src/components/sealed/PoolView.tsx`
- `src/utils/deckImport.ts`
- `src/utils/deckExport.ts`
- `server/services/gameService.ts`
- `server/routes/games.ts`
- `server/types/game.ts`
- `src/contexts/GameTableContext.tsx`

### New files likely to be added
- `src/types/deck.ts`
- `src/services/deckStorage.ts`
- `src/services/deckFileSystem.ts`
- `src/services/deckSerialization.ts`
- `src/services/deckImportService.ts`
- `src/services/deckExportService.ts`
- `src/services/deckPrintingService.ts`
- `src/utils/deckValidation.ts`
- `src/utils/deckSummary.ts`
- `src/utils/deckMigration.ts`
- `src/pages/DeckLibraryPage.tsx`
- `src/pages/DeckBuilderPage.tsx`
- `src/components/decks/*`
- optionally `src/contexts/DeckLibraryContext.tsx`

---

## Key Risks

### 1. Scope explosion
If we let this drift into collection management, the epic will sprawl.

### 2. Browser filesystem inconsistency
Folder access support is not universal. Fallback UX must be real, not an afterthought.

### 3. Over-coupling UI to file APIs
If components own persistence logic, this will become brittle immediately.

### 4. Breaking current game import
The current table import flow works. Richer deck support must extend it without regressing it.

### 5. Sealed duplication
If sealed gets its own deck persistence path, we will recreate the same architectural mess we are trying to remove.

---

## Strong Recommendations

### Recommendation 1
Make Deck Library a top-level app mode.

### Recommendation 2
Use JSON as the canonical saved deck format.

### Recommendation 3
Keep Arena text as compatibility import/export only.

### Recommendation 4
Store preferred printing per card name, not per copy.

### Recommendation 5
Make validation advisory in v1.

### Recommendation 6
Hide all local file/folder logic behind a dedicated storage service.

### Recommendation 7
Do not let `DeckImportModal` become the permanent home of deck UX. It should either shrink to a compatibility entry point or be replaced by library-driven flows.

### Recommendation 8
Treat this as a subsystem introduction, not a feature patch. The code should land with clear module boundaries even if product capabilities are phased.

### Recommendation 9
Prefer reducer/action-driven deck editing semantics over ad hoc local state mutations across many components.

---

## Review Questions

These need to be answered before implementation starts:

1. Is Deck Library a top-level mode or nested under Game mode?
2. Is `maybeboard` in v1 or deferred?
3. Should `Play This Deck` support sandbox from day one?
4. Do we want JSON-only save files, or optional paired text export?
5. Should recent decks appear globally or only in the game lobby?
6. How much validation do we want to show in v1?
7. Should import support `merge` in v1 or only `replace` and `new deck`?

---

## Proposed Next Planning Artifacts

After review, the next docs should be:

1. `deck-json-schema.md`
   - exact saved file shape
   - versioning and migration rules

2. `deck-storage-design.md`
   - browser capability matrix
   - folder-backed behavior
   - fallback behavior
   - error handling

3. `deck-ui-map.md`
   - app navigation changes
   - deck library screen
   - deck builder screen
   - sealed and game entry points

4. `deck-import-play-contract.md`
   - client/server payload contract
   - print preference handling
   - fallback resolution rules

---

## Final Senior-Dev Assessment

The current code is not bad in the sense that it is broken. It is bad in the more dangerous sense: it gives the illusion that decks are already supported well enough.

They are not.

The app has enough fragments to suggest a deck platform, but not the structure required to sustain one. If we keep layering features onto `ParsedDeck`, modal-local state, and one-shot imports, the next six months of deck work will be slower, uglier, and more brittle than necessary.

The right move is to stop treating decks as temporary input and start treating them as owned application state.

That is what this epic does.

More importantly, it does it in the only way that will age well: by introducing an actual deck architecture instead of pretending a few more helpers and modals count as system design.
