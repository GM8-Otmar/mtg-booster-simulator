import { useState } from 'react';
import { useSealedEvent } from '../../contexts/SealedEventContext';
import { generateArenaFormat, copyToClipboard, downloadTextFile } from '../../utils/deckExport';

export default function DeckExporter() {
  const { currentPlayer } = useSealedEvent();
  const [showSuccess, setShowSuccess] = useState(false);

  if (!currentPlayer) return null;

  const { pool, selectedLegend } = currentPlayer;

  const handleCopyToClipboard = async () => {
    const deckText = generateArenaFormat(pool, selectedLegend);
    await copyToClipboard(deckText);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDownload = () => {
    const deckText = generateArenaFormat(pool, selectedLegend);
    const filename = selectedLegend
      ? `${selectedLegend.name.replace(/[^a-z0-9]/gi, '_')}_deck.txt`
      : 'sealed_deck.txt';
    downloadTextFile(deckText, filename);
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border-2 border-purple-500">
      <h2 className="text-2xl font-bold text-purple-400 mb-4 text-center">
        Export Deck
      </h2>

      <p className="text-gray-300 text-center mb-6">
        Export your deck to MTG Arena format for use in untap.gg
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleCopyToClipboard}
          className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy to Clipboard
        </button>

        <button
          onClick={handleDownload}
          className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
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
          <strong className="text-white">Next steps:</strong> Go to untap.gg, create a game, and import your deck
        </p>
      </div>
    </div>
  );
}
