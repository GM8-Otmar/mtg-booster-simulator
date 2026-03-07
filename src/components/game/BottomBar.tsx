/**
 * BottomBar — untap.in-style 3-section bottom bar.
 * Layout: [ GY | Exile | CmdZone ]  |  [ ~~~ Hand ~~~ ]  |  [ Log / Deck+Life ]
 *
 * The action log overflows ABOVE the bottom bar so it doesn't bloat the hand zone.
 * A pink collapse/expand button toggles the log visibility.
 */
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { BattlefieldCard, GamePlayerState, GameAction } from '../../types/game';
import GraveyardPile from './GraveyardPile';
import ExilePile from './ExilePile';
import CommandZone from './CommandZone';
import HandZone from './HandZone';
import LibraryStack from './LibraryStack';
import LifeCounter from './LifeCounter';
import GameActionLog from './GameActionLog';

interface BottomBarProps {
  graveyardCards: BattlefieldCard[];
  exileCards: BattlefieldCard[];
  commandCards: BattlefieldCard[];
  commanderTax: number;
  handCards: BattlefieldCard[];
  libraryCount: number;
  playerId: string;
  player: GamePlayerState;
  actions: GameAction[];
}

export default function BottomBar({
  graveyardCards,
  exileCards,
  commandCards,
  commanderTax,
  handCards,
  libraryCount,
  playerId,
  player,
  actions,
}: BottomBarProps) {
  const [logOpen, setLogOpen] = useState(true);

  return (
    <div className="shrink-0 border-t border-cyan-dim/30 bg-navy/70 flex items-stretch" style={{ height: 148 }}>
      {/* ── Left section: GY / Exile / Command Zone ──────────────────── */}
      <div className="shrink-0 flex items-center gap-2 px-2 border-r border-cyan-dim/20">
        <GraveyardPile cards={graveyardCards} />
        <ExilePile cards={exileCards} />
        <CommandZone
          cards={commandCards}
          commanderTax={commanderTax}
          playerId={playerId}
        />
      </div>

      {/* ── Center section: Hand ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-hidden px-2">
        <HandZone cards={handCards} />
      </div>

      {/* ── Right section: Action Log (overflows up) + Deck & Life ──── */}
      <div className="shrink-0 w-80 border-l border-cyan-dim/20 relative">
        {/* Toggle button — sits at top-left of the log area */}
        <button
          onClick={() => setLogOpen(o => !o)}
          className="absolute z-10 flex items-center gap-1 rounded-tl-lg rounded-br-lg px-2 py-1
                     bg-pink-500/10 hover:bg-pink-500/20 border border-pink-400/30 text-pink-400
                     transition-all text-[10px] font-bold"
          style={{ top: logOpen ? -260 : -28, left: 0 }}
        >
          {logOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          {logOpen ? 'HIDE LOG' : 'SHOW LOG'}
        </button>

        {/* Action log — positioned absolutely, extends above the bar */}
        {logOpen && (
          <div
            className="absolute left-0 right-0 overflow-hidden bg-navy/95 backdrop-blur-sm border-t border-l border-cyan-dim/30 rounded-tl-xl"
            style={{ top: -236, bottom: 96 }}
          >
            <GameActionLog actions={actions} />
          </div>
        )}

        {/* Deck + Life row — anchored at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-3 px-2 py-1.5">
          <LibraryStack count={libraryCount} playerId={playerId} />
          <LifeCounter
            life={player.life}
            poison={player.poisonCounters}
            playerId={playerId}
          />
        </div>
      </div>
    </div>
  );
}
