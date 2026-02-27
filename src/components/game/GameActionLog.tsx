import { useEffect, useRef } from 'react';
import type { GameAction } from '../../types/game';

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
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new actions
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [actions.length]);

  return (
    <div className="flex flex-col h-full">
      <p className="text-[10px] uppercase tracking-widest text-cream-muted px-3 pt-2 pb-1">Action Log</p>
      <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5">
        {actions.length === 0 ? (
          <p className="text-cream-muted/40 text-xs italic">No actions yet…</p>
        ) : (
          actions.map(action => (
            <div key={action.id} className="flex gap-2 items-start">
              <span className="text-[9px] text-cream-muted/50 font-mono shrink-0 mt-0.5">
                {formatTime(action.timestamp)}
              </span>
              <p className={`text-xs leading-snug ${ACTION_COLORS[action.type] ?? 'text-cream-muted'}`}>
                {action.description}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
