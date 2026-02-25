import { useState } from 'react';
import { useGameTable } from '../../contexts/GameTableContext';
import DeckImportModal from './DeckImportModal';
import type { TokenTemplate } from '../../types/game';

interface GameControlsProps {
  onConcede: () => void;
}

// Quick token templates
const COMMON_TOKENS: TokenTemplate[] = [
  { name: '1/1 White Soldier', typeLine: 'Token Creature — Soldier', power: '1', toughness: '1', colors: ['W'] },
  { name: '1/1 Green Elf', typeLine: 'Token Creature — Elf', power: '1', toughness: '1', colors: ['G'] },
  { name: '2/2 Black Zombie', typeLine: 'Token Creature — Zombie', power: '2', toughness: '2', colors: ['B'] },
  { name: '1/1 Blue Bird', typeLine: 'Token Creature — Bird', power: '1', toughness: '1', colors: ['U'] },
  { name: '3/3 Green Beast', typeLine: 'Token Creature — Beast', power: '3', toughness: '3', colors: ['G'] },
  { name: '1/1 Red Goblin', typeLine: 'Token Creature — Goblin', power: '1', toughness: '1', colors: ['R'] },
  { name: 'Gold', typeLine: 'Token Artifact — Gold', power: '0', toughness: '0', colors: [] },
  { name: 'Treasure', typeLine: 'Token Artifact — Treasure', power: '0', toughness: '0', colors: [] },
  { name: 'Clue', typeLine: 'Token Artifact — Clue', power: '0', toughness: '0', colors: [] },
];

export default function GameControls({ onConcede }: GameControlsProps) {
  const {
    drawCards, shuffleLibrary, untapAll, tapAll,
    mulligan, createToken, sendMessage, myLibraryCount,
    room,
  } = useGameTable();

  const [showImport, setShowImport] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [showConfirmConcede, setShowConfirmConcede] = useState(false);
  const [chatText, setChatText] = useState('');

  const handleSendChat = () => {
    if (!chatText.trim()) return;
    sendMessage(chatText.trim());
    setChatText('');
  };

  const handleCreateToken = (template: TokenTemplate) => {
    // Spawn near center
    createToken(template, 50 + Math.random() * 10 - 5, 50 + Math.random() * 10 - 5);
    setShowTokens(false);
  };

  return (
    <div className="flex flex-col gap-2 p-3">

      {/* Primary actions */}
      <div className="grid grid-cols-2 gap-1">
        <button
          onClick={() => drawCards(1)}
          disabled={myLibraryCount === 0}
          className="py-1.5 text-xs font-semibold bg-cyan/20 hover:bg-cyan/30 border border-cyan-dim rounded-lg text-cyan disabled:opacity-40 transition-all"
        >
          Draw 1
        </button>
        <button
          onClick={() => drawCards(7)}
          disabled={myLibraryCount === 0}
          className="py-1.5 text-xs font-semibold bg-cyan/10 hover:bg-cyan/20 border border-cyan-dim rounded-lg text-cyan-dim disabled:opacity-40 transition-all"
        >
          Draw 7
        </button>
        <button
          onClick={untapAll}
          className="py-1.5 text-xs font-semibold bg-navy-light hover:bg-navy border border-cyan-dim rounded-lg text-cream transition-all"
        >
          Untap All
        </button>
        <button
          onClick={() => tapAll('all')}
          className="py-1.5 text-xs font-semibold bg-navy-light hover:bg-navy border border-cyan-dim rounded-lg text-cream-muted transition-all"
        >
          Tap All
        </button>
        <button
          onClick={() => shuffleLibrary()}
          className="py-1.5 text-xs font-semibold bg-navy-light hover:bg-navy border border-cyan-dim rounded-lg text-cream-muted transition-all"
        >
          Shuffle
        </button>
        <button
          onClick={() => mulligan(7)}
          className="py-1.5 text-xs font-semibold bg-navy-light hover:bg-navy border border-cyan-dim rounded-lg text-cream-muted transition-all"
        >
          Mulligan
        </button>
      </div>

      {/* Tokens */}
      <button
        onClick={() => setShowTokens(v => !v)}
        className="py-1.5 text-xs font-semibold bg-magenta/10 hover:bg-magenta/20 border border-magenta/30 rounded-lg text-magenta transition-all"
      >
        + Create Token
      </button>

      {showTokens && (
        <div className="bg-navy-light rounded-xl border border-cyan-dim p-2 space-y-1 max-h-48 overflow-y-auto">
          {COMMON_TOKENS.map(t => (
            <button
              key={t.name}
              onClick={() => handleCreateToken(t)}
              className="w-full text-left text-xs px-2 py-1 rounded hover:bg-cyan-dim/30 text-cream transition-all"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* Import deck */}
      <button
        onClick={() => setShowImport(true)}
        className="py-1.5 text-xs bg-navy-light hover:bg-navy border border-cyan-dim rounded-lg text-cream-muted transition-all"
      >
        Import / Reload Deck
      </button>

      {/* Chat */}
      <div className="flex gap-1 mt-1">
        <input
          type="text"
          value={chatText}
          onChange={e => setChatText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendChat()}
          placeholder="Message…"
          className="flex-1 text-xs bg-navy border border-cyan-dim rounded-lg px-2 py-1.5 text-cream placeholder-cream-muted/40 focus:outline-none focus:border-cyan"
        />
        <button
          onClick={handleSendChat}
          disabled={!chatText.trim()}
          className="px-2 py-1.5 bg-navy-light border border-cyan-dim rounded-lg text-cream-muted text-xs hover:text-cream disabled:opacity-40 transition-all"
        >
          →
        </button>
      </div>

      {/* Concede */}
      {!showConfirmConcede ? (
        <button
          onClick={() => setShowConfirmConcede(true)}
          className="py-1.5 text-xs border border-red-900/50 rounded-lg text-red-400/60 hover:text-red-400 hover:border-red-700 transition-all mt-2"
        >
          Concede
        </button>
      ) : (
        <div className="flex gap-1 mt-2">
          <button
            onClick={() => { onConcede(); setShowConfirmConcede(false); }}
            className="flex-1 py-1.5 text-xs bg-red-900/40 border border-red-700 rounded-lg text-red-400 font-bold transition-all"
          >
            Confirm Concede
          </button>
          <button
            onClick={() => setShowConfirmConcede(false)}
            className="flex-1 py-1.5 text-xs bg-navy-light border border-cyan-dim rounded-lg text-cream-muted transition-all"
          >
            Cancel
          </button>
        </div>
      )}

      {showImport && <DeckImportModal onClose={() => setShowImport(false)} />}
    </div>
  );
}
