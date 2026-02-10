interface ModeSelectorProps {
  onSelectMode: (mode: 'random' | 'sealed') => void;
}

export default function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-4 bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
          MTG Booster Simulator
        </h1>
        <p className="text-center text-gray-300 mb-12">
          Choose your experience
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Random Pack Mode */}
          <button
            onClick={() => onSelectMode('random')}
            className="group relative bg-gray-800 rounded-xl p-8 border-2 border-gray-700 hover:border-amber-500 transition-all duration-300 hover:scale-105 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative">
              <h2 className="text-3xl font-bold mb-4 text-amber-400">
                Random Pack Mode
              </h2>
              <p className="text-gray-300 mb-4">
                Open booster packs one at a time and enjoy the thrill of the pull!
              </p>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">•</span>
                  Open Play or Collector Boosters
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">•</span>
                  See card prices and pack values
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">•</span>
                  Experience realistic foil pulls
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">•</span>
                  Solo play, instant gratification
                </li>
              </ul>
            </div>
          </button>

          {/* Sealed Event Mode */}
          <button
            onClick={() => onSelectMode('sealed')}
            className="group relative bg-gray-800 rounded-xl p-8 border-2 border-gray-700 hover:border-purple-500 transition-all duration-300 hover:scale-105 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative">
              <h2 className="text-3xl font-bold mb-4 text-purple-400">
                Sealed Event Mode
              </h2>
              <p className="text-gray-300 mb-4">
                Host or join a sealed event with friends for competitive play!
              </p>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">•</span>
                  Open 6 packs to build a card pool
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">•</span>
                  Select a legendary commander
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">•</span>
                  View pool organized by color
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">•</span>
                  Export deck for untap.gg
                </li>
              </ul>
            </div>
          </button>
        </div>

        <p className="text-center text-gray-500 mt-8 text-sm">
          All data fetched from Scryfall API
        </p>
      </div>
    </div>
  );
}
