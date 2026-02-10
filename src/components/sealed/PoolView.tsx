import { useState } from 'react';
import { useSealedEvent } from '../../contexts/SealedEventContext';
import { sortByColor, sortByType, getColorName } from '../../utils/cardSorting';
import type { Color } from '../../utils/cardSorting';
import { CardDisplay } from '../CardDisplay';

export default function PoolView() {
  const { currentPlayer } = useSealedEvent();
  const [selectedColor, setSelectedColor] = useState<Color | 'all'>('all');

  if (!currentPlayer) return null;

  const { pool, selectedLegend } = currentPlayer;
  const colorGroups = sortByColor(pool);

  const filteredCards = selectedColor === 'all'
    ? pool
    : colorGroups.find(g => g.color === selectedColor)?.cards || [];

  const typeGroups = sortByType(filteredCards);

  const getColorClass = (color: Color | 'all'): string => {
    const colors: Record<Color | 'all', string> = {
      all: 'bg-gray-700',
      W: 'bg-yellow-100 text-gray-900',
      U: 'bg-blue-500',
      B: 'bg-gray-900 border-gray-600',
      R: 'bg-red-600',
      G: 'bg-green-600',
      C: 'bg-gray-500',
      M: 'bg-gradient-to-r from-blue-500 via-red-500 to-green-500',
    };
    return colors[color];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          Card Pool
        </h1>

        {/* Stats */}
        <div className="text-center text-gray-300 mb-8">
          <p className="text-lg">
            {pool.length} cards {selectedLegend && '+ 1 Commander'}
          </p>
        </div>

        {/* Commander Section */}
        {selectedLegend && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-amber-400 mb-4 text-center">Commander</h2>
            <div className="flex justify-center">
              <div className="w-64">
                <CardDisplay card={selectedLegend} />
              </div>
            </div>
          </div>
        )}

        {/* Color Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <button
            onClick={() => setSelectedColor('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedColor === 'all'
                ? 'bg-purple-600 scale-105'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            All ({pool.length})
          </button>

          {colorGroups.map(({ color, cards }) => (
            cards.length > 0 && (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedColor === color
                    ? `${getColorClass(color)} scale-105`
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {getColorName(color)} ({cards.length})
              </button>
            )
          ))}
        </div>

        {/* Cards by Type */}
        <div className="space-y-8">
          {typeGroups.map(({ type, cards }) => (
            <div key={type}>
              <h3 className="text-xl font-bold text-purple-400 mb-4">
                {type} ({cards.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {cards.map((card) => (
                  <CardDisplay key={card.id} card={card} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredCards.length === 0 && (
          <p className="text-center text-gray-400 mt-8">
            No cards in this color
          </p>
        )}
      </div>
    </div>
  );
}
