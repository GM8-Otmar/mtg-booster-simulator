/**
 * BottomBar — untap.in-style 3-section bottom bar.
 * Layout: [ GY | Exile | CmdZone ]  |  [ ~~~ Hand ~~~ ]  |  [ Log / Deck+Life ]
 */
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
  return (
    <div className="shrink-0 border-t border-cyan-dim/30 bg-navy/70 flex items-stretch" style={{ height: 160 }}>
      {/* ── Left section: GY / Exile / Command Zone ──────────────────── */}
      <div className="shrink-0 flex items-center gap-2 px-2 border-r border-cyan-dim/20">
        <GraveyardPile cards={graveyardCards} />
        <ExilePile cards={exileCards} />
        {commandCards.length > 0 && (
          <CommandZone
            cards={commandCards}
            commanderTax={commanderTax}
            playerId={playerId}
          />
        )}
      </div>

      {/* ── Center section: Hand ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-hidden px-2">
        <HandZone cards={handCards} />
      </div>

      {/* ── Right section: Action Log + Deck & Life ──────────────────── */}
      <div className="shrink-0 w-52 flex flex-col border-l border-cyan-dim/20">
        {/* Action log — compact scrollable */}
        <div className="flex-1 overflow-hidden min-h-0 border-b border-cyan-dim/15">
          <GameActionLog actions={actions} />
        </div>
        {/* Deck + Life row */}
        <div className="shrink-0 flex items-center justify-center gap-3 px-2 py-1.5">
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
