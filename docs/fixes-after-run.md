# Fixes Applied After Initial Run

This document tracks all the fixes that were applied to get the sealed event mode working after the initial implementation.

## Critical Fixes Applied

### 1. PowerShell Execution Policy (npm commands failing)
**Problem**: Windows PowerShell blocked npm script execution with error:
```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled
```

**Solution**:
- Use Command Prompt (cmd.exe) instead of PowerShell, OR
- Run in PowerShell: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

---

### 2. TypeScript Module Export Errors (Circular Dependencies)
**Problem**: Multiple "does not provide an export named X" errors for `ScryfallCard`, `BoosterPack`, `Color` types

**Root Cause**: Circular dependencies between type files caused by value imports

**Solution**: Changed all type imports to use `import type` syntax:

**Files Modified**:
- `src/api/sealedApi.ts`
- `src/contexts/SealedEventContext.tsx`
- `src/utils/cardSorting.ts`
- `src/utils/deckExport.ts`
- `src/components/sealed/LegendSelector.tsx`
- `src/components/sealed/PoolView.tsx`

**Example Fix**:
```typescript
// ❌ Before (causes circular dependency)
import { ScryfallCard } from '../types/card';

// ✅ After (type-only import)
import type { ScryfallCard } from '../types/card';
```

**Additional Fix for PoolView.tsx**:
```typescript
// Separate type imports from value imports
import { sortByColor, sortByType, getColorName } from '../../utils/cardSorting';
import type { Color } from '../../utils/cardSorting';
```

**Cache Clear**: Required clearing Vite cache after fixing:
```bash
rm -rf node_modules/.vite
```

---

### 3. Type Definition Order (Forward References)
**Problem**: `BoosterPack` referenced `Player` before it was defined in `src/types/sealed.ts`

**Solution**: Reordered type definitions in `src/types/sealed.ts`:
```typescript
// ✅ Correct order:
import type { ScryfallCard } from './card';

export interface BoosterPack {
  type: 'play' | 'collector';
  cards: ScryfallCard[];
}

export interface Player {
  // ... can now reference BoosterPack
  currentPack: BoosterPack | null;
}
```

---

### 4. Component Prop Name Mismatch (BoosterTypeSelector)
**Problem**: `EventCreator.tsx` was passing wrong prop names to `BoosterTypeSelector`

**Error**:
```
Uncaught TypeError: onChange is not a function
```

**Solution in `src/components/sealed/EventCreator.tsx`**:
```typescript
// ❌ Before
<BoosterTypeSelector
  boosterType={boosterType}
  onTypeChange={setBoosterType}
  disabled={false}
/>

// ✅ After
<BoosterTypeSelector
  selected={boosterType}
  onChange={setBoosterType}
  disabled={false}
/>
```

---

### 5. Undefined Card Handling (isFoilPull property)
**Problem**: `getCardPrice()` tried to read `card.isFoilPull` on undefined cards

**Error**:
```
Uncaught TypeError: Cannot read properties of undefined (reading 'isFoilPull')
```

**Solution in `src/types/card.ts`**:
```typescript
// ✅ Added null/undefined check
export function getCardPrice(card: ScryfallCard | undefined): number | null {
  if (!card || !card.prices) return null;

  const priceStr = card.isFoilPull ? card.prices.usd_foil : card.prices.usd;
  if (!priceStr) return null;
  return parseFloat(priceStr);
}
```

**Solution in `src/components/CardGrid.tsx`**:
```typescript
// ✅ Filter out null/undefined cards
function calculatePackValue(pack: BoosterPack): number {
  const allCards = getPackCards(pack).filter(card => card != null);
  return allCards.reduce((total, card) => {
    const price = getCardPrice(card);
    return total + (price || 0);
  }, 0);
}

function countFoils(pack: BoosterPack): number {
  return getPackCards(pack).filter(card => card && card.isFoilPull).length;
}
```

---

### 6. Pack Structure Mismatch (Backend vs Frontend)
**Problem**: Backend pack structure used different field names than frontend `CardGrid` expected

**Backend Returns**:
```typescript
{
  type: 'play',
  commons: [...],
  uncommons: [...],
  wildcard: {...},
  rareSlot: {...},      // ❌ Different name
  foilWildcard: {...},
  cards: [...]          // ✅ Flat array of all cards
}
```

**Frontend CardGrid Expected**:
```typescript
{
  type: 'play',
  commons: [...],
  uncommons: [...],
  wildcard: {...},
  rareOrMythic: {...},  // ❌ Expected this name
  foilWildcard: {...}
}
```

**Solution in `src/components/sealed/PackProgression.tsx`**:

Bypassed the complex `CardGrid` component and used simple `CardDisplay` grid:

```typescript
// ❌ Before (relied on specific pack structure)
<CardGrid pack={currentPack} />

// ✅ After (uses generic cards array)
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
  {currentPack.cards?.filter((card: any) => card != null).map((card: any, index: number) => (
    <CardDisplay key={`${card.id}-${index}`} card={card} />
  ))}
</div>
```

**Why This Works**:
- Backend includes `cards: [...]` array with ALL cards from the pack (lines 205 & 238 in `server/services/eventService.ts`)
- Frontend just displays this flat array, no need to know about structure
- Preserves existing `CardGrid` for Random Pack Mode (which uses frontend pack generation)

---

## Backend Pack Structure (Reference)

The backend correctly generates packs with a `cards` array:

**Play Booster** (`server/services/eventService.ts:205`):
```typescript
return {
  type: 'play',
  commons,
  uncommons,
  wildcard,
  rareSlot: rareOrMythic,
  foilWildcard,
  cards: [...commons, ...uncommons, wildcard, rareOrMythic, foilWildcard].filter(Boolean),
};
```

**Collector Booster** (`server/services/eventService.ts:238`):
```typescript
return {
  type: 'collector',
  foilCommons,
  foilUncommons,
  raresOrMythics,
  foilRareOrMythic: foilRare,
  cards: [...foilCommons, ...foilUncommons, ...raresOrMythics, foilRare].filter(Boolean),
};
```

---

## Current Status

✅ **Working Features**:
- Mode selection (Random vs Sealed)
- Event creation and joining
- WebSocket connection
- Pack opening with card display
- Progress tracking
- Pool building

🧪 **Needs Testing**:
- Full 6-pack flow
- Legend selection
- Pool view organization
- Deck export
- Multiplayer with multiple browsers

---

## How to Start Testing

```bash
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev

# Browser
# Go to http://localhost:5173
# Select "Sealed Event Mode"
# Create event, join, and test pack opening
```

---

## Known Working Components

### Random Pack Mode
- Fully preserved from original implementation
- Uses frontend pack generation (`src/api/scryfall.ts`)
- Displays with `CardGrid` component (structured display)

### Sealed Event Mode
- Uses backend pack generation (`server/services/eventService.ts`)
- Displays with simple `CardDisplay` grid (flat array display)
- Both modes work correctly with their respective pack structures

---

## Future Considerations

If you want to use the fancy `CardGrid` component in sealed mode:

**Option 1**: Normalize backend pack structure to match frontend:
```typescript
// In server/services/eventService.ts
return {
  type: 'play',
  commons,
  uncommons,
  wildcard,
  rareOrMythic: rareOrMythic,  // ✅ Change rareSlot to rareOrMythic
  foilWildcard,
  cards: [...commons, ...uncommons, wildcard, rareOrMythic, foilWildcard].filter(Boolean),
};
```

**Option 2**: Keep current solution (simpler, works perfectly)
- PackProgression uses simple grid
- CardGrid reserved for Random Pack Mode
- Less complexity, same functionality

---

## Files Modified Summary

**Backend** (New):
- `server/index.ts`
- `server/services/eventService.ts`
- `server/services/storageService.ts`
- `server/routes/events.ts`
- `server/types/server.ts`
- `tsconfig.server.json`

**Frontend Types**:
- `src/types/sealed.ts` - Reordered definitions
- `src/types/card.ts` - Added null checks to `getCardPrice()`

**Frontend API**:
- `src/api/sealedApi.ts` - Changed to `import type`

**Frontend Context**:
- `src/contexts/SealedEventContext.tsx` - Changed to `import type`

**Frontend Components**:
- `src/components/sealed/PackProgression.tsx` - Bypassed CardGrid, use simple grid
- `src/components/sealed/EventCreator.tsx` - Fixed BoosterTypeSelector props
- `src/components/sealed/PoolView.tsx` - Separated type imports
- `src/components/sealed/LegendSelector.tsx` - Changed to `import type`
- `src/components/CardGrid.tsx` - Added null filtering

**Frontend Utils**:
- `src/utils/cardSorting.ts` - Changed to `import type`
- `src/utils/deckExport.ts` - Changed to `import type`

**Config**:
- `package.json` - Added server scripts and dependencies
- `vite.config.ts` - Added API proxy
