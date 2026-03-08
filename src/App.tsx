import { useState } from 'react';
import ModeSelector from './components/ModeSelector';
import RandomPackPage from './pages/RandomPackPage';
import SealedEventPage from './pages/SealedEventPage';
import GameTablePage from './pages/GameTablePage';
import DeckLibraryPage from './pages/DeckLibraryPage';
import { GameTableProvider } from './contexts/GameTableContext';
import type { DeckRecord } from './types/deck';

type AppMode = 'random' | 'sealed' | 'game' | 'decks' | null;

function App() {
  const [mode, setMode] = useState<AppMode>(null);
  const [pendingDeck, setPendingDeck] = useState<DeckRecord | null>(null);

  if (!mode) {
    return <ModeSelector onSelectMode={setMode} />;
  }

  if (mode === 'random') {
    return (
      <div>
        <button
          onClick={() => setMode(null)}
          className="fixed top-4 left-4 px-4 py-2 bg-magenta/20 hover:bg-magenta/30 rounded-lg transition-colors z-50 text-magenta border border-magenta/40"
        >
          ← Back
        </button>
        <RandomPackPage />
      </div>
    );
  }

  if (mode === 'sealed') {
    return (
      <div>
        <button
          onClick={() => setMode(null)}
          className="fixed top-4 left-4 px-4 py-2 bg-magenta/20 hover:bg-magenta/30 rounded-lg transition-colors z-50 text-magenta border border-magenta/40"
        >
          ← Back
        </button>
        <SealedEventPage />
      </div>
    );
  }

  if (mode === 'game') {
    return (
      <GameTableProvider>
        <GameTablePage
          pendingDeck={pendingDeck}
          onPendingDeckConsumed={() => setPendingDeck(null)}
          onBack={() => setMode(null)}
        />
      </GameTableProvider>
    );
  }

  if (mode === 'decks') {
    return (
      <DeckLibraryPage
        onBack={() => setMode(null)}
        onPlayDeck={deck => {
          setPendingDeck(deck);
          setMode('game');
        }}
      />
    );
  }

  return null;
}

export default App;
