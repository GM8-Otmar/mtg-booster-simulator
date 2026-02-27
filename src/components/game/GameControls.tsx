import { useState } from 'react';
import { Dices } from 'lucide-react';
import { useGameTable } from '../../contexts/GameTableContext';
import DeckImportModal from './DeckImportModal';
import TokenCreatorModal from './TokenCreatorModal';
import DiceRollerModal from './DiceRollerModal';
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
    mulligan, createToken, myLibraryCount,
    passTurn, isMyTurn,
  } = useGameTable();

  const [showImport, setShowImport] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [showTokenCreator, setShowTokenCreator] = useState(false);
  const [showDiceRoller, setShowDiceRoller] = useState(false);
  const [showConfirmConcede, setShowConfirmConcede] = useState(false);

  const handleCreateToken = (template: TokenTemplate, count = 1) => {
    for (let i = 0; i < count; i++) {
      const ox = (Math.random() - 0.5) * 10;
      const oy = (Math.random() - 0.5) * 8;
      createToken(template, Math.max(4, Math.min(96, 50 + ox)), Math.max(4, Math.min(96, 50 + oy)));
    }
    setShowTokens(false);
  };

  return (
    <div className="flex flex-col gap-2 p-3">

      {/* Primary actions */}
      <div className="flex flex-col gap-1">
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
        {isMyTurn && (
          <button
            onClick={passTurn}
            className="py-1.5 text-xs font-bold bg-orange-500/25 hover:bg-orange-500/35 border border-orange-500/50 rounded-lg text-orange-300 transition-all"
          >
            Pass Turn →
          </button>
        )}
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
          onClick={() => setShowDiceRoller(true)}
          className="py-1.5 text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-lg text-amber-300 transition-all flex items-center justify-center gap-1"
        >
          <Dices className="w-3.5 h-3.5" /> Roll Dice
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
          {/* Divider + custom entry */}
          <div className="border-t border-cyan-dim/20 pt-1 mt-1">
            <button
              onClick={() => { setShowTokens(false); setShowTokenCreator(true); }}
              className="w-full text-left text-xs px-2 py-1 rounded hover:bg-magenta/20 text-magenta transition-all font-semibold"
            >
              ✦ Custom token…
            </button>
          </div>
        </div>
      )}

      {/* Import deck */}
      <button
        onClick={() => setShowImport(true)}
        className="py-1.5 text-xs bg-navy-light hover:bg-navy border border-cyan-dim rounded-lg text-cream-muted transition-all"
      >
        Import / Reload Deck
      </button>

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
      {showTokenCreator && <TokenCreatorModal onClose={() => setShowTokenCreator(false)} />}
      {showDiceRoller && <DiceRollerModal onClose={() => setShowDiceRoller(false)} />}
    </div>
  );
}
