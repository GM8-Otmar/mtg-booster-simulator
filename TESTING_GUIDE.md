# Testing Guide - MTG Sealed Event Simulator

## 🚀 Implementation Complete!

All components have been built! Here's how to test everything.

## Prerequisites

You should have two terminal windows running:

**Terminal 1 - Backend:**
```bash
npm run dev:server
```
Output should show:
```
🚀 MTG Sealed Event Server running on port 3001
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```
Output should show Vite running on `http://localhost:5173`

## Test Plan

### ✅ Phase 1: Random Pack Mode (Existing Functionality)

1. Open `http://localhost:5173`
2. Click "Random Pack Mode"
3. Select a set (e.g., Bloomburrow)
4. Select booster type (Play or Collector)
5. Click "Open Booster"
6. Verify cards display with:
   - Correct rarity borders
   - Foil effects (pink-purple-cyan gradient)
   - Prices displayed
   - Pack value calculated

**Expected**: This should work exactly as before!

### ✅ Phase 2: Create Sealed Event

1. Go back to mode selector (← Back button)
2. Click "Sealed Event Mode"
3. Click "Host Event"
4. Fill in:
   - Your Name: "TestHost"
   - Select a set: "Bloomburrow" (blb)
   - Booster Type: Play Booster
5. Click "Create Event"

**Expected**:
- Event code appears (6 characters, e.g., "ABC123")
- Your name shows in players list with "HOST" badge
- "Start Event" button appears

### ✅ Phase 3: Join Event (Multi-Player Test)

1. Open a **second browser tab/window** (or incognito)
2. Go to `http://localhost:5173`
3. Click "Sealed Event Mode"
4. Click "Join Event"
5. Enter the event code from step 2
6. Enter name: "TestPlayer"
7. Click "Join Event"

**Expected**:
- Both tabs show updated player list
- Host tab shows "TestPlayer" joined
- Both see "Waiting for host to start"

### ✅ Phase 4: Start Event & Open Packs

1. In **HOST tab**, click "Start Event"
2. Both players should see "Pack Opening" screen
3. Click "Open Pack 1"
4. Verify pack opens with existing animations
5. Click "Add to Pool & Continue"
6. Repeat for packs 2-6

**Expected**:
- Progress bar updates (Pack X of 6)
- Each pack shows 14 cards (Play Booster)
- Cards get added to pool (counter shows total)
- Each player has their own unique cards

### ✅ Phase 5: Select Legend

After opening pack 6:

1. "Select Your Commander" screen appears
2. Grid of legendary creatures from the set loads
3. Click on a legend to select
4. Click "Confirm Commander"

**Expected**:
- All legendary creatures from the set displayed
- Selection highlights with amber border
- Commander confirmed and saved

### ✅ Phase 6: View Pool

1. Pool view displays automatically
2. Verify:
   - Commander shown in special section at top
   - "All" tab shows all cards
   - Color tabs (White, Blue, Black, Red, Green, etc.) with card counts
   - Within each color, cards grouped by type (Creatures, Instants & Sorceries, etc.)

**Expected**:
- 84 cards in pool (6 packs × 14 cards)
- Correct color sorting
- Card images display properly

### ✅ Phase 7: Export Deck

1. Scroll to "Export Deck" section
2. Click "Copy to Clipboard"
3. Verify success message appears
4. Paste into a text editor to verify format:

```
Commander
# [Commander Name]

Deck
# Card Name 1
# Card Name 2
...
```

5. Click "Download .txt"
6. Verify file downloads with correct name

**Expected**:
- Clipboard contains properly formatted deck
- Download works
- Format matches MTG Arena import format

### ✅ Phase 8: Import to untap.gg (Optional)

1. Go to [untap.gg](https://untap.gg)
2. Create a free account / log in
3. Go to "Deck Builder"
4. Click "Import"
5. Paste your exported deck
6. Verify it imports correctly

## 🐛 Common Issues & Fixes

### Backend won't start
**Error**: `Cannot find module`
**Fix**: Run `npm install` again

### Frontend can't reach backend
**Error**: Network errors in console
**Fix**: Make sure backend is running on port 3001

### Socket disconnected
**Error**: WebSocket connection failed
**Fix**: Refresh the page, backend should reconnect automatically

### No legends appear
**Issue**: Set might not have legendary creatures
**Fix**: Try a different set like "Bloomburrow" or "Murders at Karlov Manor"

### TypeScript errors in IDE
**Issue**: IDE might not recognize new files
**Fix**: Restart your IDE/VSCode

## 📊 Performance Checks

- Pack opening should complete in 10-15 seconds (Scryfall rate limiting)
- UI should be responsive during loading
- Multiple players can join without issues
- Real-time updates work via WebSocket

## 🎉 Success Criteria

- ✅ Can create and join events
- ✅ Multiple players see each other
- ✅ Packs open with correct card distributions
- ✅ Legends load and can be selected
- ✅ Pool displays organized by color/type
- ✅ Deck exports in correct format
- ✅ Random pack mode still works perfectly

## 🔧 If Something's Wrong

1. Check both terminals for errors
2. Check browser console (F12)
3. Verify you're on `http://localhost:5173` (not 3001)
4. Make sure no other app is using port 3001 or 5173
5. Try `npm install` again
6. Restart both servers

## 📝 Feedback

Once you've tested, let me know:
- What works great?
- Any bugs or issues?
- Features you'd like to add?
- UI improvements?

Enjoy your sealed events! 🎴
