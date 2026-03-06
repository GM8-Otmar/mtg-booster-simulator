/**
 * GameControls — collapsible floating icon menu (top-left).
 * Click the `›` chevron to expand; each icon has a tooltip.
 */
import { useState } from 'react';
import {
  ChevronRight, ArrowRight, CreditCard, Layers,
  RefreshCw, ToggleRight, ToggleLeft, Dices,
  CircleDot, Plus, Upload,
} from 'lucide-react';
import { useGameTable } from '../../contexts/GameTableContext';
import DeckImportModal from './DeckImportModal';
import TokenCreatorModal from './TokenCreatorModal';
import DiceRollerModal from './DiceRollerModal';
import CoinFlipModal from './CoinFlipModal';
import type { TokenTemplate } from '../../types/game';

interface GameControlsProps {
  onConcede: () => void;
}

// Quick token templates
const COMMON_TOKENS: TokenTemplate[] = [
  { name: '1/1 White Soldier', typeLine: 'Token Creature \u2014 Soldier', power: '1', toughness: '1', colors: ['W'] },
  { name: '1/1 Green Elf', typeLine: 'Token Creature \u2014 Elf', power: '1', toughness: '1', colors: ['G'] },
  { name: '2/2 Black Zombie', typeLine: 'Token Creature \u2014 Zombie', power: '2', toughness: '2', colors: ['B'] },
  { name: '1/1 Blue Bird', typeLine: 'Token Creature \u2014 Bird', power: '1', toughness: '1', colors: ['U'] },
  { name: '3/3 Green Beast', typeLine: 'Token Creature \u2014 Beast', power: '3', toughness: '3', colors: ['G'] },
  { name: '1/1 Red Goblin', typeLine: 'Token Creature \u2014 Goblin', power: '1', toughness: '1', colors: ['R'] },
  { name: 'Gold', typeLine: 'Token Artifact \u2014 Gold', power: '0', toughness: '0', colors: [] },
  { name: 'Treasure', typeLine: 'Token Artifact \u2014 Treasure', power: '0', toughness: '0', colors: [] },
  { name: 'Clue', typeLine: 'Token Artifact \u2014 Clue', power: '0', toughness: '0', colors: [] },
];

export default function GameControls({ onConcede: _onConcede }: GameControlsProps) {
  const {
    drawCards, untapAll, tapAll,
    mulligan, createToken, myLibraryCount,
    passTurn, isMyTurn,
  } = useGameTable();

  const [isOpen, setIsOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [showTokenCreator, setShowTokenCreator] = useState(false);
  const [showDiceRoller, setShowDiceRoller] = useState(false);
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [showDrawX, setShowDrawX] = useState(false);
  const [drawXCount, setDrawXCount] = useState('');

  const handleCreateToken = (template: TokenTemplate, count = 1) => {
    for (let i = 0; i < count; i++) {
      const ox = (Math.random() - 0.5) * 10;
      const oy = (Math.random() - 0.5) * 8;
      createToken(template, Math.max(4, Math.min(96, 50 + ox)), Math.max(4, Math.min(96, 50 + oy)));
    }
    setShowTokens(false);
  };

  const handleDrawX = () => {
    const n = parseInt(drawXCount, 10);
    if (n > 0 && n <= myLibraryCount) {
      drawCards(n);
    }
    setShowDrawX(false);
    setDrawXCount('');
  };

  const btnClass = "w-9 h-9 rounded-lg flex items-center justify-center transition-all border";
  const activeBtnClass = `${btnClass} bg-navy-light hover:bg-cyan-dim/30 border-cyan-dim/40 text-cream-muted hover:text-cream`;
  const disabledBtnClass = `${btnClass} bg-navy-light/50 border-cyan-dim/20 text-cream-muted/30 cursor-not-allowed`;

  return (
    <>
      {/* Floating container — top-left of the main area */}
      <div className="absolute top-2 left-2 z-40 flex items-start gap-1">
        {/* Toggle button */}
        <button
          onClick={() => setIsOpen(o => !o)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border ${
            isOpen
              ? 'bg-cyan/15 border-cyan text-cyan'
              : 'bg-navy-light/80 border-cyan-dim/40 text-cream-muted hover:text-cream hover:border-cyan-dim'
          }`}
          title={isOpen ? 'Close menu' : 'Open game controls'}
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Expanded panel */}
        {isOpen && (
          <div className="bg-navy/95 border border-cyan-dim/50 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 backdrop-blur-sm">
            {/* Pass Turn */}
            {isMyTurn && (
              <button
                onClick={passTurn}
                className={`${btnClass} bg-orange-500/20 hover:bg-orange-500/35 border-orange-500/50 text-orange-300`}
                title="Pass Turn (E)"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {/* Draw 1 */}
            <button
              onClick={() => drawCards(1)}
              disabled={myLibraryCount === 0}
              className={myLibraryCount > 0 ? activeBtnClass : disabledBtnClass}
              title="Draw 1 (C)"
            >
              <CreditCard className="w-4 h-4" />
            </button>

            {/* Draw X */}
            <div className="relative">
              <button
                onClick={() => setShowDrawX(d => !d)}
                disabled={myLibraryCount === 0}
                className={myLibraryCount > 0 ? activeBtnClass : disabledBtnClass}
                title="Draw X"
              >
                <Layers className="w-4 h-4" />
              </button>
              {showDrawX && (
                <div className="absolute left-full ml-1 top-0 bg-navy border border-cyan-dim/50 rounded-lg shadow-xl p-2 flex items-center gap-1 z-50">
                  <input
                    type="number"
                    min={1}
                    max={myLibraryCount}
                    autoFocus
                    value={drawXCount}
                    onChange={e => setDrawXCount(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleDrawX(); if (e.key === 'Escape') setShowDrawX(false); }}
                    placeholder="#"
                    className="w-12 text-center text-xs bg-navy-light border border-cyan-dim rounded text-cream py-1 focus:outline-none focus:border-cyan"
                  />
                  <button
                    onClick={handleDrawX}
                    className="text-[10px] px-2 py-1 bg-cyan/20 border border-cyan-dim rounded text-cyan hover:bg-cyan/30 transition-all"
                  >
                    Go
                  </button>
                </div>
              )}
            </div>

            {/* Mulligan */}
            <button
              onClick={() => mulligan(7)}
              className={activeBtnClass}
              title="Mulligan (M)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Tap All */}
            <button
              onClick={() => tapAll('all')}
              className={activeBtnClass}
              title="Tap All"
            >
              <ToggleRight className="w-4 h-4" />
            </button>

            {/* Untap All */}
            <button
              onClick={untapAll}
              className={activeBtnClass}
              title="Untap All (X)"
            >
              <ToggleLeft className="w-4 h-4" />
            </button>

            {/* Roll Dice */}
            <button
              onClick={() => setShowDiceRoller(true)}
              className={`${btnClass} bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300`}
              title="Roll Dice"
            >
              <Dices className="w-4 h-4" />
            </button>

            {/* Flip Coin */}
            <button
              onClick={() => setShowCoinFlip(true)}
              className={`${btnClass} bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300`}
              title="Flip a Coin"
            >
              <CircleDot className="w-4 h-4" />
            </button>

            {/* Create Token */}
            <button
              onClick={() => setShowTokens(t => !t)}
              className={`${btnClass} bg-magenta/10 hover:bg-magenta/20 border-magenta/30 text-magenta`}
              title="Create Token"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Import / Reload Deck */}
            <button
              onClick={() => setShowImport(true)}
              className={activeBtnClass}
              title="Import / Reload Deck"
            >
              <Upload className="w-4 h-4" />
            </button>

            {/* Concede — commented out for now
            <button
              onClick={() => {}}
              className={`${btnClass} border-red-900/50 text-red-400/60 hover:text-red-400 hover:border-red-700`}
              title="Concede"
            >
              <Flag className="w-4 h-4" />
            </button>
            */}
          </div>
        )}
      </div>

      {/* Token picker popover */}
      {showTokens && (
        <div
          className="fixed inset-0 z-[8999]"
          onClick={() => setShowTokens(false)}
        >
          <div
            className="absolute top-14 left-14 bg-navy-light rounded-xl border border-cyan-dim p-2 space-y-1 max-h-48 overflow-y-auto shadow-2xl w-56"
            onClick={e => e.stopPropagation()}
          >
            {COMMON_TOKENS.map(t => (
              <button
                key={t.name}
                onClick={() => handleCreateToken(t)}
                className="w-full text-left text-xs px-2 py-1 rounded hover:bg-cyan-dim/30 text-cream transition-all"
              >
                {t.name}
              </button>
            ))}
            <div className="border-t border-cyan-dim/20 pt-1 mt-1">
              <button
                onClick={() => { setShowTokens(false); setShowTokenCreator(true); }}
                className="w-full text-left text-xs px-2 py-1 rounded hover:bg-magenta/20 text-magenta transition-all font-semibold"
              >
                ✦ Custom token…
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && <DeckImportModal onClose={() => setShowImport(false)} />}
      {showTokenCreator && <TokenCreatorModal onClose={() => setShowTokenCreator(false)} />}
      {showDiceRoller && <DiceRollerModal onClose={() => setShowDiceRoller(false)} />}
      {showCoinFlip && <CoinFlipModal onClose={() => setShowCoinFlip(false)} />}
    </>
  );
}
