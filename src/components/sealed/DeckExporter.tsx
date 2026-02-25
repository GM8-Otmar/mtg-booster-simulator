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
    <div className="bg-navy-light rounded-xl p-6 border-2 border-magenta">
      <h2 className="text-2xl font-bold text-magenta mb-4 text-center">
        Export Deck
      </h2>

      <p className="text-cream-muted text-center mb-6">
        Export your built deck to MTG Arena format for use in untap.gg
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleCopyToClipboard}
          disabled={isEmpty}
          className="flex-1 py-3 bg-magenta hover:bg-magenta/90 disabled:bg-navy-light disabled:cursor-not-allowed rounded-lg font-bold transition-colors flex items-center justify-center gap-2 text-cream"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy to Clipboard
        </button>

        <button
          onClick={handleDownload}
          disabled={isEmpty}
          className="flex-1 py-3 bg-cyan hover:bg-cyan/90 disabled:bg-navy-light disabled:cursor-not-allowed rounded-lg font-bold transition-colors flex items-center justify-center gap-2 text-navy"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download .txt
        </button>
      </div>

      {showSuccess && (
        <div className="mt-4 bg-cyan-dim/20 border border-cyan rounded-lg p-3 text-center">
          <p className="text-cyan font-medium">
            Copied to clipboard!
          </p>
        </div>
      )}

      <div className="mt-6 bg-navy rounded-lg p-4 border border-cyan-dim">
        <p className="text-cream-muted text-sm text-center">
          <strong className="text-cream">Deck Size:</strong> {deckCards.length} cards
        </p>
      </div>
    </div>
  );
}
