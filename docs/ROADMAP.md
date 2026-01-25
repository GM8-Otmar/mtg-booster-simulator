# MTG Booster Simulator - Roadmap & Improvements

## Current Features (v1.0)

- **Set Selection**: Dropdown with all physical booster sets, sorted by release date
- **Play Booster Simulation**: 7 commons, 3 uncommons, 1 wildcard, 1 rare/mythic, 1 guaranteed foil
- **Collector Booster Simulation**: 5 foil commons, 4 foil uncommons, 2-3 rares, 1 foil rare
- **Card Pricing**: USD prices displayed, foil prices for foil pulls
- **Pack Value**: Total pack value calculated and displayed
- **Visual Polish**: Rarity-colored borders, foil indicators, gradient styling

---

## Missing Features

### Pack Composition Accuracy

#### The List / Special Guests
- Modern Play Boosters have a ~12.5% chance to replace a common with a card from "The List" or "Special Guests"
- These are reprints or thematic cards from outside the set
- Would require fetching cards from a separate pool

#### Land Slot
- Play Boosters include a basic land (sometimes full-art)
- Currently omitted from simulation
- Could add with ~10% chance for full-art variant

#### Art Cards (Collector Boosters)
- Collector Boosters include art cards
- Not available via Scryfall API (not actual game cards)

#### Extended Art / Borderless / Showcase
- Collector Boosters guarantee special frame treatments
- Scryfall has frame data (`frame_effects`, `border_color`, `promo_types`)
- Could filter for `frame_effects:extendedart` or `is:showcase`

#### Serialized Cards
- Some Collector Boosters have serialized numbered cards (e.g., 001/500)
- Extremely rare, could simulate with very low probability

### Set-Specific Variations

#### Commander Cards
- Some sets include Commander-legal cards in boosters
- Different pool from the main set

#### Double-Faced Cards (DFCs)
- Some sets guarantee DFC slots
- Would need `is:dfc` filter and special display handling

#### Bonus Sheet Cards
- Sets like MOM, BRO have "bonus sheets" (multiverse legends, retro artifacts)
- Separate card pool with own rarity distribution

### Historical Booster Types

#### Draft Boosters (Pre-2024)
- 10 commons, 3 uncommons, 1 rare/mythic, 1 basic land
- No guaranteed foil (1:8 packs had a foil)

#### Set Boosters (2020-2024)
- 12 cards with "art card", "connected commons", "head turner" slots
- More complex structure than Play Boosters

---

## Potential Improvements

### User Experience

#### Collection Tracking
- Save opened packs to localStorage
- Track total value opened
- "Collection" page showing all pulled cards
- Statistics (mythic rate, foil rate, best pulls)

#### Pack Opening Animation
- Reveal cards one at a time with flip animation
- Sound effects for rare/mythic pulls
- Confetti for mythic pulls

#### Card Zoom/Details
- Click card to see larger version
- Show oracle text, set info, legality
- Link to Scryfall page

#### Favorites/Wishlist
- Mark cards as favorites
- Track "want list" for cards you're hoping to pull

### Technical Improvements

#### Caching
- Cache set list in localStorage (refreshed daily)
- Cache card images with service worker
- Reduce API calls for repeated opens

#### Offline Support
- PWA with offline capability
- Pre-cache common cards per set

#### Error Recovery
- Retry failed API calls with exponential backoff
- Better error messages for specific failures
- "Partial pack" display if some cards fail

### API Optimization

#### Bulk Data
- Scryfall offers bulk data downloads
- Could pre-download set data for faster simulation
- Trade-off: larger initial download vs. faster packs

#### Card Pool Pre-fetch
- When set is selected, pre-fetch the card pool
- Faster pack opening after initial load

### Additional Features

#### Multi-Pack Opening
- Open 6 packs (draft sim)
- Open a box (36 packs with box-topper logic)
- Track "box EV" vs actual value

#### Draft Simulator
- Open packs in sequence
- Pick one card, pass the rest
- Build a 40-card deck

#### Sealed Simulator
- Open 6 packs
- Build a 40-card deck from the pool

#### Price Tracking
- Historical price charts
- "Best time to open" analysis
- Compare pack EV to pack price

#### Social Features
- Share pack opening results
- "Pack battles" - compare pulls with friends
- Leaderboard for best single pack value

---

## Known Limitations

### API Constraints
- Scryfall rate limit: 50-100ms between requests
- No true "random from pool" endpoint
- Must make sequential calls for unique cards

### Price Data
- Prices update ~daily on Scryfall
- Some cards have no USD price (foreign-only, etc.)
- Foil prices sometimes missing

### Set Coverage
- Very old sets may have incomplete data
- Some promotional sets have unusual structures
- Digital-only sets excluded

### Accuracy
- Collation algorithms not public
- Real boosters have print run variations
- Our simulation is "close enough" but not exact

---

## Priority Order (Suggested)

1. **Land slot** - Easy win, adds realism
2. **Card zoom modal** - Better UX
3. **localStorage collection** - Engagement feature
4. **The List cards** - Accuracy improvement
5. **Pack opening animation** - Polish
6. **Extended art filtering** - Collector accuracy
7. **Multi-pack opening** - Power user feature
8. **Draft simulator** - Major feature addition

---

## Resources

- [Scryfall API Docs](https://scryfall.com/docs/api)
- [MTG Wiki - Play Booster](https://mtg.fandom.com/wiki/Play_Booster)
- [MTG Wiki - Collector Booster](https://mtg.fandom.com/wiki/Collector_Booster)
- [Wizards Product Pages](https://magic.wizards.com/en/products)
