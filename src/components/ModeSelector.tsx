interface ModeSelectorProps {
  onSelectMode: (mode: 'random' | 'sealed' | 'game' | 'decks') => void;
}

function FeatureList({
  color,
  items,
}: {
  color: string;
  items: string[];
}) {
  return (
    <ul className="space-y-2 text-cream-muted">
      {items.map(item => (
        <li key={item} className="flex items-center gap-2">
          <span className={color}>*</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  return (
    <div className="min-h-screen bg-navy text-cream p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-4 text-cream">
          Kitchen Table Magic
        </h1>
        <p className="text-center text-cream-muted mb-12">
          Choose your experience
        </p>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-8">
          <button
            onClick={() => onSelectMode('random')}
            className="group relative bg-navy-light rounded-xl p-8 border-2 border-cyan-dim hover:border-cyan transition-all duration-300 hover:scale-105 text-left"
          >
            <div className="absolute inset-0 bg-cyan-dim/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <h2 className="text-3xl font-bold mb-4 text-cyan">Random Pack</h2>
              <p className="text-cream-muted mb-4">
                Open booster packs one at a time and enjoy the thrill of the pull!
              </p>
              <FeatureList
                color="text-cyan"
                items={[
                  'Open Play or Collector Boosters',
                  'See card prices and pack values',
                  'Experience realistic foil pulls',
                  'Solo play, instant gratification',
                ]}
              />
            </div>
          </button>

          <button
            onClick={() => onSelectMode('sealed')}
            className="group relative bg-navy-light rounded-xl p-8 border-2 border-cyan-dim hover:border-magenta transition-all duration-300 hover:scale-105 text-left"
          >
            <div className="absolute inset-0 bg-magenta-dim/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <h2 className="text-3xl font-bold mb-4 text-magenta">Sealed Event</h2>
              <p className="text-cream-muted mb-4">
                Host or join a sealed event with friends for competitive play!
              </p>
              <FeatureList
                color="text-magenta"
                items={[
                  'Open 6 packs to build a card pool',
                  'Select a legendary commander',
                  'View pool organized by color',
                  'Export deck for untap.gg',
                ]}
              />
            </div>
          </button>

          <button
            onClick={() => onSelectMode('decks')}
            className="group relative bg-navy-light rounded-xl p-8 border-2 border-cyan-dim hover:border-amber-400 transition-all duration-300 hover:scale-105 text-left"
          >
            <div className="absolute inset-0 bg-amber-900/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <h2 className="text-3xl font-bold mb-4 text-amber-400">Deck Library</h2>
              <p className="text-cream-muted mb-4">
                Build, save, and organize decks outside the game table.
              </p>
              <FeatureList
                color="text-amber-400"
                items={[
                  'Start new decks manually or from Arena text',
                  'Open local JSON deck files',
                  'Save decks locally with folder sync when supported',
                  'Resume recent decks from a real deck shelf',
                ]}
              />
            </div>
          </button>

          <button
            onClick={() => onSelectMode('game')}
            className="group relative bg-navy-light rounded-xl p-8 border-2 border-cyan-dim hover:border-green-400 transition-all duration-300 hover:scale-105 text-left"
          >
            <div className="absolute inset-0 bg-green-900/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <h2 className="text-3xl font-bold mb-4 text-green-400">Game Table</h2>
              <p className="text-cream-muted mb-4">
                Play MTG online with friends - import any deck, any format!
              </p>
              <FeatureList
                color="text-green-400"
                items={[
                  'Real-time multiplayer via WebSocket',
                  'Drag cards, tap/untap, move zones',
                  'Commander support with tax tracking',
                  'Import any Arena deck list',
                ]}
              />
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
