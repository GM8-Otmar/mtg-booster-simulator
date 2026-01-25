import { useState } from 'react';
import { fetchBoosterPack, PackSimulationError } from './api/scryfall';
import type { BoosterPack, BoosterType } from './api/scryfall';
import { CardGrid } from './components/CardGrid';
import { SetSelector } from './components/SetSelector';
import { BoosterTypeSelector } from './components/BoosterTypeSelector';

function App() {
  const [selectedSet, setSelectedSet] = useState<string>('');
  const [boosterType, setBoosterType] = useState<BoosterType>('play');
  const [pack, setPack] = useState<BoosterPack | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleOpenPack = async () => {
    if (!selectedSet) return;

    setLoading(true);
    setError(null);
    setPack(null);
    setProgress(`Opening ${boosterType} booster...`);

    try {
      setProgress('Fetching cards...');
      const fetchedPack = await fetchBoosterPack(selectedSet, boosterType);
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

  const buttonGradient = boosterType === 'collector'
    ? 'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hover:shadow-purple-500/25'
    : 'from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 hover:shadow-amber-500/25';

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
        <div className="flex flex-col gap-6 items-center justify-center mb-10">
          {/* Top row: Set selector and booster type */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <SetSelector
              selectedSet={selectedSet}
              onSetChange={setSelectedSet}
              disabled={loading}
            />
            <BoosterTypeSelector
              selected={boosterType}
              onChange={setBoosterType}
              disabled={loading}
            />
          </div>

          {/* Open button */}
          <button
            onClick={handleOpenPack}
            disabled={loading || !selectedSet}
            className={`bg-gradient-to-r ${buttonGradient} disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-black font-bold py-3 px-8 rounded-lg text-lg transition-all duration-200 shadow-lg cursor-pointer`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Opening...
              </span>
            ) : (
              `Open ${boosterType === 'collector' ? '💎 Collector' : '📦 Play'} Booster`
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
            <p>Select a set and booster type, then click to open!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
