import { useEffect, useRef } from 'react';
import type { GameAction } from '../../types/game';
import { useGameTable } from '../../contexts/GameTableContext';
import { useCardInspector } from './CardInspectorPanel';

interface GameActionLogProps {
  actions: GameAction[];
}

const ACTION_COLORS: Record<string, string> = {
  draw: 'text-cyan',
  shuffle: 'text-cream-muted',
  scry: 'text-cyan',
  mulligan: 'text-yellow-400',
  zone_change: 'text-cream',
  commander_cast: 'text-magenta',
  token: 'text-green-400',
  concede: 'text-red-400',
  message: 'text-cream',
  life_change: 'text-green-300',
  tap_all: 'text-cream-muted',
  counter_change: 'text-blue-300',
  poison_change: 'text-purple-400',
  dice_roll: 'text-amber-300',
  coin_flip: 'text-amber-300',
  reveal: 'text-yellow-300',
  turn_pass: 'text-orange-400',
  targeting: 'text-red-300',
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

export default function GameActionLog({ actions }: GameActionLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { room } = useGameTable();
  const { hoverInspect, clearHoverInspect } = useCardInspector();

  // Auto-scroll to bottom on new actions
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [actions.length]);

  const cardByName = (name: string) => {
    if (!room) return null;
    return Object.values(room.cards).find(card => card.name === name) ?? null;
  };

  const renderDescription = (action: GameAction) => {
    if (action.type !== 'zone_change') return action.description;
    const movedMatch = action.description.match(/^(.*? moved )(.+?)( to .+)$/);
    const arrowMatch = action.description.match(/^(.*?: )(.+?)( → .+)$/);
    const match = movedMatch ?? arrowMatch;
    if (!match) return action.description;
    const cardName = match[2] ?? '';
    const card = cardByName(cardName);
    if (!card) return action.description;
    return (
      <>
        {match[1]}
        <span
          className="underline decoration-dotted underline-offset-2 cursor-help"
          onMouseEnter={() => hoverInspect({ name: card.name, imageUri: card.imageUri ?? null, instanceId: card.instanceId })}
          onMouseLeave={clearHoverInspect}
        >
          {cardName}
        </span>
        {match[3]}
      </>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <p className="text-[10px] uppercase tracking-widest text-cream-muted px-3 pt-2 pb-1">Action Log</p>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5">
        {actions.length === 0 ? (
          <p className="text-cream-muted/40 text-xs italic">No actions yet…</p>
        ) : (
          actions.map(action => (
            <div key={action.id} className="py-1 border-b border-cream/5 last:border-b-0">
              <span className="text-[9px] text-cream font-mono block">{formatTime(action.timestamp)}</span>
              <p className={`text-xs leading-snug break-words mt-0.5 ${ACTION_COLORS[action.type] ?? 'text-cream-muted'}`}>
                {renderDescription(action)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
