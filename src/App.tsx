import { useState } from 'react';
import ModeSelector from './components/ModeSelector';
import RandomPackPage from './pages/RandomPackPage';
import SealedEventPage from './pages/SealedEventPage';
import GameTablePage from './pages/GameTablePage';
import { GameTableProvider } from './contexts/GameTableContext';

type AppMode = 'random' | 'sealed' | 'game' | null;

function App() {
  const [mode, setMode] = useState<AppMode>(null);

  if (!mode) {
    return <ModeSelector onSelectMode={setMode} />;
  }

  if (mode === 'random') {
    return (
      <div>
        <button
          onClick={() => setMode(null)}
          className="fixed top-4 left-4 px-4 py-2 bg-navy-light hover:bg-navy-light/80 rounded-lg transition-colors z-50 text-cream border border-cyan-dim"
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
          className="fixed top-4 left-4 px-4 py-2 bg-navy-light hover:bg-navy-light/80 rounded-lg transition-colors z-50 text-cream border border-cyan-dim"
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
        <GameTablePage />
      </GameTableProvider>
    );
  }

  return null;
}

export default App;
