import { useState } from 'react';
import { fetchRandomCards } from './api/scryfall';
import { CardGrid } from './components/CardGrid';
import { ScryfallCard } from './types/card';

function App() {
  const [cards, setCards] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchCards = async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchedCards = await fetchRandomCards(5);
      setCards(fetchedCards);
    } catch (err) {
      console.error('Error fetching cards:', err);
      setError('Failed to fetch cards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-4xl font-bold text-center mb-8">
          MTG Card Fetcher
        </h1>

        <div className="flex justify-center mb-8">
          <button
            onClick={handleFetchCards}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors cursor-pointer"
          >
            {loading ? 'Fetching Cards...' : 'Fetch Random Cards'}
          </button>
        </div>

        {error && (
          <div className="text-red-400 text-center mb-4">{error}</div>
        )}

        <CardGrid cards={cards} />
      </div>
    </div>
  );
}

export default App;
