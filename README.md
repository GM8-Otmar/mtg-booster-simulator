# Kitchen Table Magic

A web application for simulating Magic: The Gathering booster pack openings, hosting sealed events with friends, and playing multiplayer games at the kitchen table!

## 🎴 Features

### Random Pack Mode
- Open Play Boosters or Collector Boosters from any set
- Realistic card distributions and rarity rolls
- Foil card detection with visual effects
- Real-time pricing from Scryfall
- Pack value calculations

### Game Table Mode
- **Sandbox Mode**: Jump straight in with a prebuilt hand, no server needed
- **Multiplayer**: Connect with friends via shareable room code
- **Full Game Actions**: Draw, tap/untap, move cards, add counters, track life
- **Drag to Zones**: Drag cards from battlefield to graveyard, exile, or hand
- **Library Search**: Find any card in your library by name
- **Commander Support**: Commander zone, tax tracking, damage dealt
- **Scry & Mulligan**: Full rules-accurate library actions
- **Card Inspector**: Click any card for full oracle text and art

### Sealed Event Mode
- **Host or Join Events**: Create events with shareable codes
- **Multiplayer Support**: Play with friends on your local network
- **6-Pack Sealed**: Open 6 packs to build your card pool
- **Commander Selection**: Pick any legendary creature from the set
- **Auto-Organized Pool**: Cards sorted by color and type
- **Deck Export**: Export to MTG Arena format for untap.gg

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Development (Two Terminals)

**Terminal 1 - Backend:**
```bash
npm run dev:server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Then open `http://localhost:5173` in your browser.

### Development (Single Command)

Run both frontend and backend together:

```bash
npm run dev:full
```

### Share with Friends

**Same WiFi (Local Network):**

1. Find your local IP:
   - **Windows**: `ipconfig` (look for IPv4 Address)
   - **Mac/Linux**: `ifconfig` (look for inet)

2. Share: `http://YOUR_IP:5173`

Example: `http://192.168.1.100:5173`

**Remote Play (Over Internet):**

For friends NOT on your WiFi, use ngrok:

```bash
# Terminal 3: Start ngrok tunnel
ngrok http 5173
```

Share the ngrok URL (e.g., `https://abc-xyz.ngrok-free.dev`)

📖 **[Full Remote Setup Guide](docs/REMOTE-SETUP.md)** - Step-by-step instructions for playing with remote friends

## 📁 Project Structure

```
kitchen-table-magic/
├── server/                  # Backend (Express + Socket.io)
│   ├── index.ts            # Server entry point
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   └── types/              # TypeScript types
│
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # Reusable UI components
│   │   └── sealed/         # Sealed event components
│   ├── pages/              # Main pages
│   ├── contexts/           # React Context (state management)
│   ├── api/                # API clients
│   ├── utils/              # Helper functions
│   └── types/              # TypeScript types
│
├── data/                   # Persistent storage
│   └── events/             # Sealed event JSON files
│
└── public/                 # Static assets
```

## 🎮 How to Use

### Random Pack Mode

1. Select mode: **Random Pack Mode**
2. Choose a Magic set
3. Select booster type (Play or Collector)
4. Click "Open Booster"
5. View your cards with pricing!

### Sealed Event Mode

#### As Host:
1. Select mode: **Sealed Event Mode**
2. Click "Host Event"
3. Enter your name and select a set
4. Share the event code with friends
5. Click "Start Event" when everyone has joined
6. Open your 6 packs
7. Select your commander
8. View and export your deck

#### As Player:
1. Select mode: **Sealed Event Mode**
2. Click "Join Event"
3. Enter the event code from the host
4. Wait for host to start
5. Open your 6 packs
6. Select your commander
7. View and export your deck

## 🛠️ Tech Stack

**Frontend:**
- React 19
- TypeScript
- Tailwind CSS
- Socket.io Client
- Axios

**Backend:**
- Node.js
- Express
- Socket.io (real-time events)
- TypeScript
- File-based storage (JSON)

**API:**
- Scryfall API (card data)

## 📦 Available Scripts

```bash
# Development
npm run dev              # Start frontend dev server
npm run dev:server       # Start backend dev server
npm run dev:full         # Start both via concurrently

# Production Build
npm run build            # Build frontend
npm run build:server     # Build backend
npm run start            # Run production server

# Other
npm run lint             # Run ESLint
npm run preview          # Preview production build
```

## 🎯 Use Cases

- **Solo Fun**: Open random packs and see what you pull
- **Sealed Events**: Draft with friends remotely
- **Deck Testing**: Build sealed pools and export for testing
- **Learning**: See realistic pack distributions
- **Price Checking**: View real-time card prices

## 🔧 Configuration

### Environment Variables

Create a `.env` file (optional):

```env
VITE_API_URL=http://localhost:3001
PORT=3001
```

### Backend Settings

- **Event Cleanup**: Old events auto-delete after 24 hours
- **Storage**: Events saved to `./data/events/`; game table state is saved to `./data/games/`
- **WebSocket**: Real-time updates for multiplayer

### Game Table Multiplayer Notes

- Sandbox and multiplayer now share the same bulk interaction model for multi-select tap, zone moves, and counters.
- Multiplayer bulk actions are processed atomically (`cards:tap`, `cards:zone`, `cards:counter`) to reduce race conditions from per-card emits.
- Game code lookup skips malformed JSON files in `data/games` instead of failing the whole scan.
- TODO: Investigate remaining bulk-action instability under heavier load/playtesting (intermittent misses in larger selections).
- TODO: Explore deck import UX with tabs (`Import Full Deck` vs `Add Commander`) so commander can be added independently of the 99.
- TODO: Tokens/cloned cards should be ephemeral (if they leave battlefield, remove them instead of persisting as normal card objects).
- TODO: Command zone commander-tax controls should use the same `X / + / -` style interaction pattern as Scry/Surveil, with tax increments in steps of 2.
- TODO: Card finder should support sending cards to `Top`, `Hand`, and `Battlefield` (new option) from the finder overlay.

## 📝 Data Persistence

Sealed events are saved as JSON files in `data/events/`:
- Events persist across server restarts
- Players can rejoin events
- Auto-cleanup prevents disk bloat

## 🤝 Contributing

This is a personal project, but feel free to fork and customize!

### Potential Improvements

- Draft mode (passing packs)
- Deck builder UI (drag-and-drop)
- Match tracking
- Persistent user accounts
- Cloud hosting option
- Mobile app version

## 📄 License

This project uses data from the Scryfall API. Card images and data are property of Wizards of the Coast.

## 🙏 Acknowledgments

- [Scryfall](https://scryfall.com) for the amazing API
- Wizards of the Coast for Magic: The Gathering
- The MTG community for sealed format inspiration

## ⚠️ Disclaimer

This is a fan-made simulator for entertainment purposes. Not affiliated with or endorsed by Wizards of the Coast.

---

Built with ❤️ for kitchen table Magic players everywhere
