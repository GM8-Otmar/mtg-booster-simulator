import { useState, useEffect } from 'react';
import type { ScryfallCard } from '../../types/card';
import { getLegendaryCreatures } from '../../api/sealedApi';
import { useSealedEvent } from '../../contexts/SealedEventContext';
import { CardDisplay } from '../CardDisplay';

export default function LegendSelector() {
  const { event, selectLegend, loading: contextLoading } = useSealedEvent();
  const [legends, setLegends] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLegend, setSelectedLegend] = useState<ScryfallCard | null>(null);

  useEffect(() => {
    if (event) {
      fetchLegends();
    }
  }, [event]);

  const fetchLegends = async () => {
    if (!event) return;

    setLoading(true);
    setError(null);

    try {
      const legendCards = await getLegendaryCreatures(event.setCode);
      setLegends(legendCards);
    } catch (err) {
      setError('Failed to load legendary creatures');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLegend = (legend: ScryfallCard) => {
    setSelectedLegend(legend);
  };

  const handleConfirm = async () => {
    if (!selectedLegend) return;

    try {
      await selectLegend(selectedLegend);
    } catch (err) {
      console.error('Failed to select legend:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4" />
          <p className="text-gray-300">Loading legendary creatures...</p>
        </div>
      </div>
    );
  }

  if (error || legends.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">
            {error || 'No legendary creatures found in this set'}
          </p>
          <button
            onClick={fetchLegends}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
          Select Your Commander
        </h1>
        <p className="text-center text-gray-300 mb-8">
          Choose one legendary creature from {event?.setCode.toUpperCase()} to be your commander
        </p>

        {/* Selected Legend Preview */}
        {selectedLegend && (
          <div className="max-w-md mx-auto mb-8 bg-gray-800 rounded-xl p-6 border-2 border-amber-500">
            <p className="text-center text-gray-300 mb-4">Selected Commander:</p>
            <p className="text-center text-2xl font-bold text-amber-400 mb-4">
              {selectedLegend.name}
            </p>
            <button
              onClick={handleConfirm}
              disabled={contextLoading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 rounded-lg font-bold text-gray-900 disabled:opacity-50 transition-all"
            >
              {contextLoading ? 'Confirming...' : 'Confirm Commander'}
            </button>
          </div>
        )}

        {/* Legends Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {legends.map((legend) => (
            <button
              key={legend.id}
              onClick={() => handleSelectLegend(legend)}
              className={`transition-all duration-200 ${
                selectedLegend?.id === legend.id
                  ? 'ring-4 ring-amber-500 scale-105'
                  : 'hover:scale-105'
              }`}
            >
              <CardDisplay card={legend} enableZoom={false} />
            </button>
          ))}
        </div>

        {legends.length === 0 && (
          <p className="text-center text-gray-400 mt-8">
            No legendary creatures available in this set
          </p>
        )}
      </div>
    </div>
  );
}
