/**
 * OpponentInfoPanel — collapsible floating sidebar (top-right).
 * Mirrors the GameControls pattern with a pink expand/collapse button.
 * Shows each opponent's life, zone counts, and clickable GY/Exile to inspect.
 */
import { useState } from 'react';
import { ChevronLeft, Heart, Users, BookOpen, Layers, Skull, Ban } from 'lucide-react';
import { useGameTable } from '../../contexts/GameTableContext';
import type { GamePlayerState } from '../../types/game';
import OpponentZoneInspectModal from './OpponentZoneInspectModal';

/* ── Inline Tooltip (matches GameControls) ───────────────────────────── */
function PanelTooltip({ label, show }: { label: string; show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 z-[200] pointer-events-none
                    opacity-0 group-hover:opacity-100 transition-all duration-150 delay-100
                    whitespace-nowrap">
      {/* Right-pointing triangle */}
      <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-0 h-0
                      border-t-[5px] border-t-transparent
                      border-l-[6px] border-l-gray-900
                      border-b-[5px] border-b-transparent" />
      <div className="bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-xl">
        {label}
      </div>
    </div>
  );
}

/* ── Single opponent row ─────────────────────────────────────────────── */
function OpponentRow({
  player,
  isExpanded,
  onInspect,
}: {
  player: GamePlayerState;
  isExpanded: boolean;
  onInspect: (player: GamePlayerState, zone: 'graveyard' | 'exile') => void;
}) {
  const gyCount = player.graveyardCardIds?.length ?? 0;
  const exileCount = player.exileCardIds?.length ?? 0;
  const handCount = player.handCardIds?.length ?? 0;
  const libCount = player.libraryCardIds?.length ?? 0;

  if (!isExpanded) {
    // Collapsed: just an icon with tooltip
    return (
      <div className="relative group flex items-center justify-end">
        <div className="w-9 h-9 rounded-lg bg-navy-light/80 border border-cyan-dim/30 flex items-center justify-center text-cream text-xs font-bold cursor-default">
          {player.playerName.charAt(0).toUpperCase()}
        </div>
        <PanelTooltip
          label={`${player.playerName} — ❤ ${player.life} | Hand ${handCount} | Lib ${libCount} | GY ${gyCount} | Exile ${exileCount}`}
          show
        />
      </div>
    );
  }

  // Expanded: full info
  return (
    <div className="bg-navy-light/40 rounded-lg border border-cyan-dim/20 p-2 space-y-1.5">
      {/* Name + life */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-cream truncate max-w-[120px]">{player.playerName}</span>
        <span className="flex items-center gap-1 text-xs text-cream">
          <Heart className="w-3 h-3 text-red-400 fill-red-400" />
          <span className="font-bold">{player.life}</span>
          {player.poisonCounters > 0 && (
            <span className="text-green-400 ml-1 text-[10px]">{'\u2620'}{player.poisonCounters}</span>
          )}
        </span>
      </div>

      {/* Zone counts */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-cream-muted flex items-center gap-0.5" title="Hand">
          <Layers className="w-3 h-3 opacity-50" /> {handCount}
        </span>
        <span className="text-[10px] text-cream-muted flex items-center gap-0.5" title="Library">
          <BookOpen className="w-3 h-3 opacity-50" /> {libCount}
        </span>

        {/* GY — clickable */}
        <button
          onClick={() => onInspect(player, 'graveyard')}
          className="text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded
                     bg-cyan-dim/10 hover:bg-cyan-dim/30 border border-cyan-dim/30 hover:border-cyan
                     text-cream-muted hover:text-cyan transition-all cursor-pointer"
          title={`Inspect ${player.playerName}'s Graveyard`}
        >
          <Skull className="w-3 h-3" /> {gyCount}
        </button>

        {/* Exile — clickable */}
        <button
          onClick={() => onInspect(player, 'exile')}
          className="text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded
                     bg-magenta/10 hover:bg-magenta/20 border border-magenta/30 hover:border-magenta
                     text-cream-muted hover:text-magenta transition-all cursor-pointer"
          title={`Inspect ${player.playerName}'s Exile`}
        >
          <Ban className="w-3 h-3" /> {exileCount}
        </button>
      </div>
    </div>
  );
}

/* ── Main Panel ──────────────────────────────────────────────────────── */
export default function OpponentInfoPanel() {
  const { room, effectivePlayerId } = useGameTable();
  const [isOpen, setIsOpen] = useState(false);
  const [inspecting, setInspecting] = useState<{ player: GamePlayerState; zone: 'graveyard' | 'exile' } | null>(null);

  if (!room) return null;

  const opponents = Object.values(room.players).filter(p => p.playerId !== effectivePlayerId);
  if (opponents.length === 0) return null;

  const onInspect = (player: GamePlayerState, zone: 'graveyard' | 'exile') => {
    setInspecting({ player, zone });
  };

  return (
    <>
      <div className="absolute top-2 right-2 z-40 flex flex-col items-end">
        <div className="bg-navy/95 border border-cyan-dim/50 rounded-xl p-1.5 flex flex-col gap-1 backdrop-blur-sm shadow-xl">
          {/* Expand/collapse button */}
          <button
            onClick={() => setIsOpen(o => !o)}
            className={`flex items-center gap-1.5 rounded-lg font-bold transition-all duration-200
              ${isOpen
                ? 'px-2.5 py-1.5 pr-3 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-400/30 text-pink-400'
                : 'w-9 h-9 justify-center bg-pink-500/10 hover:bg-pink-500/20 border border-pink-400/30 text-pink-400'
              }`}
          >
            {isOpen ? (
              <>
                <ChevronLeft className="w-4 h-4 rotate-180 transition-transform duration-300" />
                <span className="text-[11px] font-bold whitespace-nowrap">OPPONENTS</span>
              </>
            ) : (
              <Users className="w-4 h-4" />
            )}
          </button>

          {/* Divider */}
          <div className="border-t border-cyan-dim/30 mx-1" />

          {/* Opponent rows */}
          {opponents.map(opp => (
            <OpponentRow
              key={opp.playerId}
              player={opp}
              isExpanded={isOpen}
              onInspect={onInspect}
            />
          ))}
        </div>
      </div>

      {/* Zone inspection modal */}
      {inspecting && (
        <OpponentZoneInspectModal
          player={inspecting.player}
          zone={inspecting.zone}
          onClose={() => setInspecting(null)}
        />
      )}
    </>
  );
}
