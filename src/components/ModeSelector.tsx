interface ModeSelectorProps {
  onSelectMode: (mode: 'random' | 'sealed' | 'game') => void;
}

export default function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  return (
    <div className="min-h-screen bg-navy text-cream p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-4 text-cream">
          MTG Booster Simulator
        </h1>
        <p className="text-center text-cream-muted mb-12">
          Choose your experience
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Random Pack Mode */}
          <button
            onClick={() => onSelectMode('random')}
            className="group relative bg-navy-light rounded-xl p-8 border-2 border-cyan-dim hover:border-cyan transition-all duration-300 hover:scale-105 text-left"
          >
            <div className="absolute inset-0 bg-cyan-dim/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative">
              <h2 className="text-3xl font-bold mb-4 text-cyan">
                Random Pack Mode
              </h2>
              <p className="text-cream-muted mb-4">
                Open booster packs one at a time and enjoy the thrill of the pull!
              </p>
              <ul className="space-y-2 text-cream-muted">
                <li className="flex items-center gap-2">
                  <span className="text-cyan">•</span>
                  Open Play or Collector Boosters
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan">•</span>
                  See card prices and pack values
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan">•</span>
                  Experience realistic foil pulls
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan">•</span>
                  Solo play, instant gratification
                </li>
              </ul>
            </div>
          </button>

          {/* Sealed Event Mode */}
          <button
            onClick={() => onSelectMode('sealed')}
            className="group relative bg-navy-light rounded-xl p-8 border-2 border-cyan-dim hover:border-magenta transition-all duration-300 hover:scale-105 text-left"
          >
            <div className="absolute inset-0 bg-magenta-dim/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative">
              <h2 className="text-3xl font-bold mb-4 text-magenta">
                Sealed Event Mode
              </h2>
              <p className="text-cream-muted mb-4">
                Host or join a sealed event with friends for competitive play!
              </p>
              <ul className="space-y-2 text-cream-muted">
                <li className="flex items-center gap-2">
                  <span className="text-magenta">•</span>
                  Open 6 packs to build a card pool
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-magenta">•</span>
                  Select a legendary commander
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-magenta">•</span>
                  View pool organized by color
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-magenta">•</span>
                  Export deck for untap.gg
                </li>
              </ul>
            </div>
          </button>

          {/* Game Table Mode */}
          <button
            onClick={() => onSelectMode('game')}
            className="group relative bg-navy-light rounded-xl p-8 border-2 border-cyan-dim hover:border-green-400 transition-all duration-300 hover:scale-105 text-left"
          >
            <div className="absolute inset-0 bg-green-900/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative">
              <h2 className="text-3xl font-bold mb-4 text-green-400">
                Game Table
              </h2>
              <p className="text-cream-muted mb-4">
                Play MTG online with friends — import any deck, any format!
              </p>
              <ul className="space-y-2 text-cream-muted">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">•</span>
                  Real-time multiplayer via WebSocket
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">•</span>
                  Drag cards, tap/untap, move zones
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">•</span>
                  Commander support with tax tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">•</span>
                  Import any Arena deck list
                </li>
              </ul>
            </div>
          </button>
        </div>

        <p className="text-center text-cream-muted mt-8 text-sm">
          All data fetched from Scryfall API
        </p>
      </div>
    </div>
  );
}
