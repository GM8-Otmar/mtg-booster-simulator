import { useState, useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';
import type { GamePlayerState } from '../../types/game';
import { useGameTable } from '../../contexts/GameTableContext';
import { useCardInspector } from './CardInspectorPanel';
import OpponentZoneInspectModal from './OpponentZoneInspectModal';

interface OpponentStripProps {
  player: GamePlayerState;
}

/** Minimal strip for opponents: name (right-click for GY/exile/command inspect), life, poison, commanders. */
export default function OpponentStrip({ player }: OpponentStripProps) {
  const { room, isTargetingMode, completeTargeting } = useGameTable();
  const { hoverInspect, clearHoverInspect } = useCardInspector();
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [inspectZone, setInspectZone] = useState<'graveyard' | 'exile' | 'command_zone' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Get commander cards for this opponent
  const commandZoneCards = room
    ? (player.commandZoneCardIds ?? []).map(id => room.cards[id]).filter(Boolean)
    : [];

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
          data-player-id={player.playerId}
          className={`text-xs font-bold truncate text-cream select-none ${isTargetingMode ? 'cursor-crosshair hover:text-red-300 transition-colors' : 'cursor-context-menu'}`}
          onClick={isTargetingMode ? () => completeTargeting(player.playerId) : undefined}
          onContextMenu={e => {
            e.preventDefault();
            if (!isTargetingMode) setMenuPos({ x: e.clientX, y: e.clientY });
          }}
        >
          {player.playerName}
        </span>

        {/* Commander thumbnails */}
        {commandZoneCards.length > 0 && (
          <div className="flex items-center gap-1">
            {commandZoneCards.map(card => card && (
              <div
                key={card.instanceId}
                className="w-6 h-8 rounded border border-magenta/50 overflow-hidden flex-shrink-0 cursor-help"
                title={card.name}
                onMouseEnter={() => hoverInspect({ name: card.name, imageUri: card.imageUri ?? null, instanceId: card.instanceId })}
                onMouseLeave={clearHoverInspect}
              >
                {card.imageUri ? (
                  <img src={card.imageUri} alt={card.name} className="w-full h-full object-cover" draggable={false} />
                ) : (
                  <div className="w-full h-full bg-navy-light flex items-center justify-center text-[5px] text-magenta text-center p-0.5">
                    {card.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

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
          <button
            className="w-full text-left px-3 py-2 text-sm text-cream hover:bg-navy-light transition-colors"
            onClick={() => {
              setInspectZone('command_zone');
              setMenuPos(null);
            }}
          >
            Inspect Command Zone ({player.commandZoneCardIds?.length ?? 0})
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
