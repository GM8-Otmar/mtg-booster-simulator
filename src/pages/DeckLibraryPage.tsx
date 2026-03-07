/**
 * Top-level Deck Library page.
 *
 * Owns deck library entry and routing into the builder experience.
 */

import { useState } from 'react';
import DeckLibrary from '../components/decks/DeckLibrary';
import { DeckLibraryProvider } from '../contexts/DeckLibraryContext';
import type { DeckRecord } from '../types/deck';
import DeckBuilderPage from './DeckBuilderPage';

interface DeckLibraryPageProps {
  onBack: () => void;
  onPlayDeck: (deck: DeckRecord) => void;
}

export default function DeckLibraryPage({ onBack, onPlayDeck }: DeckLibraryPageProps) {
  const [openDeckId, setOpenDeckId] = useState<string | null>(null);

  return (
    <DeckLibraryProvider>
      {openDeckId ? (
        <DeckBuilderPage
          deckId={openDeckId}
          onBack={() => setOpenDeckId(null)}
          onPlayDeck={onPlayDeck}
        />
      ) : (
        <div className="min-h-screen bg-navy text-cream p-8">
          <button
            onClick={onBack}
            className="fixed top-4 left-4 px-4 py-2 bg-navy-light hover:bg-navy-light/80 rounded-lg transition-colors z-50 text-cream border border-cyan-dim"
          >
            Back
          </button>
          <div className="pt-12">
            <DeckLibrary onOpenDeck={setOpenDeckId} onPlayDeck={onPlayDeck} />
          </div>
        </div>
      )}
    </DeckLibraryProvider>
  );
}
