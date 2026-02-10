import { useState } from 'react';
import { generateArenaFormat, copyToClipboard, downloadTextFile } from '../../utils/deckExport';
import type { ScryfallCard } from '../../types/card';

interface DeckExporterProps {
  deckCards: ScryfallCard[];
}

export default function DeckExporter({ deckCards }: DeckExporterProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  const isEmpty = deckCards.length === 0;

  const handleCopyToClipboard = async () => {
    if (isEmpty) return;
    const deckText = generateArenaFormat(deckCards, null);
    await copyToClipboard(deckText);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDownload = () => {
    if (isEmpty) return;
    const deckText = generateArenaFormat(deckCards, null);
    const filename = 'sealed_deck.txt';
    downloadTextFile(deckText, filename);
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border-2 border-purple-500">
      <h2 className="text-2xl font-bold text-purple-400 mb-4 text-center">
        Export Deck
      </h2>

      <p className="text-gray-300 text-center mb-6">
        Export your built deck to MTG Arena format for use in untap.gg
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleCopyToClipboard}
          disabled={isEmpty}
          className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy to Clipboard
        </button>

        <button
          onClick={handleDownload}
          disabled={isEmpty}
          className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download .txt
        </button>
      </div>

      {showSuccess && (
        <div className="mt-4 bg-green-500/20 border border-green-500 rounded-lg p-3 text-center">
          <p className="text-green-400 font-medium">
            ✓ Copied to clipboard!
          </p>
        </div>
      )}

      <div className="mt-6 bg-gray-700 rounded-lg p-4">
        <p className="text-gray-400 text-sm text-center">
          <strong className="text-white">Deck Size:</strong> {deckCards.length} cards
        </p>
      </div>
    </div>
  );
}
