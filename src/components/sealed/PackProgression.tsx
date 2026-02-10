import { useState } from 'react';
import { useSealedEvent } from '../../contexts/SealedEventContext';
import { CardDisplay } from '../CardDisplay';
import type { BoosterPack } from '../../types/sealed';

export default function PackProgression() {
  const { currentPlayer, openNextPack, loading, error } = useSealedEvent();
  const [currentPack, setCurrentPack] = useState<BoosterPack | null>(null);

  if (!currentPlayer) return null;

  const handleOpenPack = async () => {
    try {
      const pack = await openNextPack();
      setCurrentPack(pack);
    } catch (err) {
      console.error('Failed to open pack:', err);
    }
  };

  const handleContinue = () => {
    setCurrentPack(null);
  };

  const packsOpened = currentPlayer.packsOpened;
  const progress = (packsOpened / 6) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Pack Opening
          </h1>

          {/* Progress Bar */}
          <div className="max-w-xl mx-auto">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Pack {packsOpened} of 6</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Pack Display or Open Button */}
        {currentPack ? (
          <div>
            {/* Simple grid display for cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
              {currentPack.cards?.filter((card: any) => card != null).map((card: any, index: number) => (
                <CardDisplay key={`${card.id}-${index}`} card={card} />
              ))}
            </div>

            <div className="text-center mt-8">
              <button
                onClick={handleContinue}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold text-lg transition-all"
              >
                {packsOpened < 6 ? 'Add to Pool & Continue' : 'View Full Pool'}
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <div className="bg-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-300 mb-6">
                {packsOpened === 0
                  ? 'Ready to open your first pack?'
                  : `You've opened ${packsOpened} pack${packsOpened > 1 ? 's' : ''}. Open the next one!`}
              </p>

              <button
                onClick={handleOpenPack}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 rounded-xl font-bold text-lg text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Opening Pack...' : `Open Pack ${packsOpened + 1}`}
              </button>

              {error && (
                <p className="text-red-400 mt-4">{error}</p>
              )}
            </div>

            {/* Pool Stats */}
            {packsOpened > 0 && (
              <div className="mt-6 bg-gray-800 rounded-lg p-4">
                <p className="text-center text-gray-400">
                  Current Pool: <span className="text-white font-bold">{currentPlayer.pool.length}</span> cards
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
