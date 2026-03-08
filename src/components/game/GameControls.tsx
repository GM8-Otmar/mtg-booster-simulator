/**
 * GameControls — always-visible icon sidebar (top-left).
 * Icons are always shown. The EXPAND button slides out text labels.
 * Custom modern tooltips appear on hover when collapsed.
 */
import { useState, type ReactNode } from 'react';
import {
  ChevronRight, ArrowRight, CreditCard, Layers,
  RefreshCw, ToggleRight, ToggleLeft, Dices,
  CircleDot, Plus, Upload,
} from 'lucide-react';
import { useGameTable } from '../../contexts/GameTableContext';
import DeckPickerModal from './DeckPickerModal';
import TokenCreatorModal from './TokenCreatorModal';
import DiceRollerModal from './DiceRollerModal';
import CoinFlipModal from './CoinFlipModal';
import type { TokenTemplate } from '../../types/game';

interface GameControlsProps {
  onConcede: () => void;
}

/* ── Inline Tooltip Component ──────────────────────────────────────────── */
function SidebarTooltip({ label, show }: { label: string; show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-[200] pointer-events-none
                    opacity-0 group-hover:opacity-100 transition-all duration-150 delay-100
                    whitespace-nowrap">
      {/* Left-pointing triangle */}
      <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-0 h-0
                      border-t-[5px] border-t-transparent
                      border-r-[6px] border-r-gray-900
                      border-b-[5px] border-b-transparent" />
      <div className="bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-xl">
        {label}
      </div>
    </div>
  );
}

/* ── Sidebar Button Wrapper ────────────────────────────────────────────── */
function SidebarItem({
  icon,
  label,
  shortcut,
  onClick,
  disabled,
  className,
  isExpanded,
  children,
}: {
  icon: ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  className: string;
  isExpanded: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="relative group flex items-center">
      <button
        onClick={onClick}
        disabled={disabled}
        className={className}
      >
        {icon}
        {isExpanded && (
          <span className="text-[11px] font-medium whitespace-nowrap">
            {label}
            {shortcut && <span className="ml-1 opacity-40 text-[9px]">({shortcut})</span>}
          </span>
        )}
      </button>
      <SidebarTooltip
        label={shortcut ? `${label} (${shortcut})` : label}
        show={!isExpanded}
      />
      {children}
    </div>
  );
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

  // Button style helpers
  const iconSize = "w-4 h-4 shrink-0";
  const btnBase = `flex items-center gap-2 rounded-lg transition-all border`;
  const btnSizing = isOpen ? 'px-2.5 py-1.5 pr-3' : 'w-9 h-9 justify-center';
  const activeBtn = `${btnBase} ${btnSizing} bg-navy-light hover:bg-cyan-dim/30 border-cyan-dim/40 text-cream-muted hover:text-cream`;
  const disabledBtn = `${btnBase} ${btnSizing} bg-navy-light/50 border-cyan-dim/20 text-cream-muted/30 cursor-not-allowed`;
  const amberBtn = `${btnBase} ${btnSizing} bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300`;
  const magentaBtn = `${btnBase} ${btnSizing} bg-magenta/10 hover:bg-magenta/20 border-magenta/30 text-magenta`;
  const orangeBtn = `${btnBase} ${btnSizing} bg-orange-500/20 hover:bg-orange-500/35 border-orange-500/50 text-orange-300`;

  return (
    <>
      {/* Sidebar container — always visible, top-left */}
      <div className="absolute top-2 left-2 z-40">
        <div className="bg-navy/95 border border-cyan-dim/50 rounded-xl shadow-2xl backdrop-blur-sm p-1.5 flex flex-col gap-1">

          {/* ── EXPAND / COLLAPSE button ──────────────────────────────── */}
          <div className="relative group">
            <button
              onClick={() => setIsOpen(o => !o)}
              className={`flex items-center gap-2 rounded-lg transition-all border font-bold ${
                isOpen
                  ? 'px-2.5 py-1.5 pr-3 bg-pink-500/10 hover:bg-pink-500/20 border-pink-400/30 text-pink-400'
                  : 'w-9 h-9 justify-center bg-pink-500/10 hover:bg-pink-500/20 border-pink-400/30 text-pink-400'
              }`}
            >
              <ChevronRight className={`w-4 h-4 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
              {isOpen && <span className="text-[11px] font-bold whitespace-nowrap">COLLAPSE</span>}
              {!isOpen && <span className="sr-only">EXPAND</span>}
            </button>
            <SidebarTooltip label="EXPAND" show={!isOpen} />
          </div>

          {/* ── Divider ──────────────────────────────────────────────── */}
          <div className="border-t border-cyan-dim/20 my-0.5" />

          {/* ── Pass Turn ────────────────────────────────────────────── */}
          {isMyTurn && (
            <SidebarItem
              icon={<ArrowRight className={iconSize} />}
              label="Pass Turn"
              shortcut="E"
              onClick={passTurn}
              className={orangeBtn}
              isExpanded={isOpen}
            />
          )}

          {/* ── Draw 1 ───────────────────────────────────────────────── */}
          <SidebarItem
            icon={<CreditCard className={iconSize} />}
            label="Draw 1"
            shortcut="C"
            onClick={() => drawCards(1)}
            disabled={myLibraryCount === 0}
            className={myLibraryCount > 0 ? activeBtn : disabledBtn}
            isExpanded={isOpen}
          />

          {/* ── Draw X ───────────────────────────────────────────────── */}
          <SidebarItem
            icon={<Layers className={iconSize} />}
            label="Draw X"
            onClick={() => setShowDrawX(d => !d)}
            disabled={myLibraryCount === 0}
            className={myLibraryCount > 0 ? activeBtn : disabledBtn}
            isExpanded={isOpen}
          >
            {showDrawX && (
              <div className="absolute left-full ml-3 top-0 bg-navy border border-cyan-dim/50 rounded-lg shadow-xl p-2 flex items-center gap-1 z-50">
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
          </SidebarItem>

          {/* ── Mulligan ─────────────────────────────────────────────── */}
          <SidebarItem
            icon={<RefreshCw className={iconSize} />}
            label="Mulligan"
            shortcut="M"
            onClick={() => mulligan(7)}
            className={activeBtn}
            isExpanded={isOpen}
          />

          {/* ── Tap All ──────────────────────────────────────────────── */}
          <SidebarItem
            icon={<ToggleRight className={iconSize} />}
            label="Tap All"
            onClick={() => tapAll('all')}
            className={activeBtn}
            isExpanded={isOpen}
          />

          {/* ── Untap All ────────────────────────────────────────────── */}
          <SidebarItem
            icon={<ToggleLeft className={iconSize} />}
            label="Untap All"
            shortcut="X"
            onClick={untapAll}
            className={activeBtn}
            isExpanded={isOpen}
          />

          {/* ── Divider ──────────────────────────────────────────────── */}
          <div className="border-t border-cyan-dim/20 my-0.5" />

          {/* ── Roll Dice ────────────────────────────────────────────── */}
          <SidebarItem
            icon={<Dices className={iconSize} />}
            label="Roll Dice"
            onClick={() => setShowDiceRoller(true)}
            className={amberBtn}
            isExpanded={isOpen}
          />

          {/* ── Flip Coin ────────────────────────────────────────────── */}
          <SidebarItem
            icon={<CircleDot className={iconSize} />}
            label="Flip Coin"
            onClick={() => setShowCoinFlip(true)}
            className={amberBtn}
            isExpanded={isOpen}
          />

          {/* ── Divider ──────────────────────────────────────────────── */}
          <div className="border-t border-cyan-dim/20 my-0.5" />

          {/* ── Create Token ─────────────────────────────────────────── */}
          <SidebarItem
            icon={<Plus className={iconSize} />}
            label="Create Token"
            onClick={() => setShowTokens(t => !t)}
            className={magentaBtn}
            isExpanded={isOpen}
          />

          {/* ── Load Deck (from library) ─────────────────────────────── */}
          <SidebarItem
            icon={<Upload className={iconSize} />}
            label="Load Deck"
            onClick={() => setShowImport(true)}
            className={activeBtn}
            isExpanded={isOpen}
          />
        </div>
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

      {showImport && (
        <DeckPickerModal
          source="manual-load-button"
          onClose={() => setShowImport(false)}
        />
      )}
      {showTokenCreator && <TokenCreatorModal onClose={() => setShowTokenCreator(false)} />}
      {showDiceRoller && <DiceRollerModal onClose={() => setShowDiceRoller(false)} />}
      {showCoinFlip && <CoinFlipModal onClose={() => setShowCoinFlip(false)} />}
    </>
  );
}
