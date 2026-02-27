import { useState, useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';
import type { GamePlayerState } from '../../types/game';
import OpponentZoneInspectModal from './OpponentZoneInspectModal';

interface OpponentStripProps {
  player: GamePlayerState;
}

/** Minimal strip for opponents: name (right-click for GY/exile inspect), life, poison. Tooltip shows hand/lib/gy/exile counts. */
export default function OpponentStrip({ player }: OpponentStripProps) {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [inspectZone, setInspectZone] = useState<'graveyard' | 'exile' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const tooltip = `Hand: ${player.handCardIds?.length ?? 0}  Library: ${player.libraryCardIds?.length ?? 0}  GY: ${player.graveyardCardIds?.length ?? 0}  Exile: ${player.exileCardIds?.length ?? 0}`;

  useEffect(() => {
    if (!menuPos) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuPos(null);
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuPos(null); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [menuPos]);

  return (
    <>
      <div
        className="flex items-center gap-3 px-2 py-1 bg-navy-light/50 border-b border-cyan-dim/20 shrink-0 group relative"
        title={tooltip}
      >
        <span
          className="text-xs font-bold truncate text-cream cursor-context-menu select-none"
          onContextMenu={e => {
            e.preventDefault();
            setMenuPos({ x: e.clientX, y: e.clientY });
          }}
        >
          {player.playerName}
        </span>
        <span className="text-xs text-cream-muted ml-auto flex items-center gap-2">
          <span title="Life" className="flex items-center gap-1">
            <Heart className="w-3 h-3 text-red-400 fill-red-400" /> <span className="font-bold text-cream">{player.life}</span>
          </span>
          {player.poisonCounters > 0 && (
            <span title="Poison">
              <span className="text-green-400">{'\u2620'}</span> <span className="font-bold text-green-300">{player.poisonCounters}</span>
            </span>
          )}
        </span>
        {/* Tooltip on hover */}
        <div className="absolute left-2 top-full mt-0.5 px-2 py-1 bg-navy border border-cyan-dim/40 rounded text-[10px] text-cream-muted opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap shadow-lg">
          {tooltip}
        </div>
      </div>

      {/* Right-click context menu */}
      {menuPos && (
        <div
          ref={menuRef}
          className="fixed z-40 bg-navy border border-cyan-dim/50 rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ left: menuPos.x + 4, top: menuPos.y + 4 }}
        >
          <button
            className="w-full text-left px-3 py-2 text-sm text-cream hover:bg-navy-light transition-colors"
            onClick={() => {
              setInspectZone('graveyard');
              setMenuPos(null);
            }}
          >
            Inspect Graveyard ({player.graveyardCardIds?.length ?? 0})
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm text-cream hover:bg-navy-light transition-colors"
            onClick={() => {
              setInspectZone('exile');
              setMenuPos(null);
            }}
          >
            Inspect Exile ({player.exileCardIds?.length ?? 0})
          </button>
        </div>
      )}

      {inspectZone && (
        <OpponentZoneInspectModal
          player={player}
          zone={inspectZone}
          onClose={() => setInspectZone(null)}
        />
      )}
    </>
  );
}
