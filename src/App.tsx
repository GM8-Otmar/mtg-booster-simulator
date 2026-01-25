import { useState } from 'react';
import { fetchBoosterPack, PackSimulationError } from './api/scryfall';
import type { BoosterPack } from './api/scryfall';
import { CardGrid } from './components/CardGrid';
import { SetSelector } from './components/SetSelector';

function App() {
  const [selectedSet, setSelectedSet] = useState<string>('');
  const [pack, setPack] = useState<BoosterPack | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleOpenPack = async () => {
    if (!selectedSet) return;

    setLoading(true);
    setError(null);
    setPack(null);
    setProgress('Opening pack...');

    try {
      setProgress('Fetching cards...');
      const fetchedPack = await fetchBoosterPack(selectedSet);
      setProgress('');
      setPack(fetchedPack);
    } catch (err) {
      console.error('Error opening pack:', err);

      if (err instanceof PackSimulationError) {
        setError(`${err.message}`);
      } else if (err instanceof Error) {
        setError(`Failed to open pack: ${err.message}`);
      } else {
        setError('Failed to open pack. Please try again.');
      }
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
            MTG Booster Simulator
          </h1>
          <p className="text-gray-400">Open virtual booster packs from any Magic set</p>
        </header>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-end justify-center mb-10">
          <SetSelector
            selectedSet={selectedSet}
            onSetChange={setSelectedSet}
            disabled={loading}
          />

          <button
            onClick={handleOpenPack}
            disabled={loading || !selectedSet}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-black font-bold py-3 px-8 rounded-lg text-lg transition-all duration-200 shadow-lg hover:shadow-amber-500/25 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Opening...
              </span>
            ) : (
              'Open Booster Pack'
            )}
          </button>
        </div>

        {/* Progress */}
        {progress && (
          <div className="text-center text-amber-400 mb-6 animate-pulse">
            {progress}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-center mb-6 max-w-lg mx-auto">
            {error}
          </div>
        )}

        {/* Pack Contents */}
        <CardGrid pack={pack} />

        {/* Empty state */}
        {!pack && !loading && !error && (
          <div className="text-center text-gray-500 py-20">
            <div className="text-6xl mb-4">🎴</div>
            <p>Select a set and click "Open Booster Pack" to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
