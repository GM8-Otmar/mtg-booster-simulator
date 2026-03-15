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

  // Auto-scroll to top on new actions (newest first)
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
  }, [actions.length]);

  const cardByName = (name: string) => {
    if (!room) return null;
    return Object.values(room.cards).find(card => card.name === name) ?? null;
  };

  /** Render a card name as a hoverable span that triggers the inspector. */
  const renderCardName = (name: string, key?: string) => {
    const card = cardByName(name.trim());
    if (!card) return name;
    return (
      <span
        key={key}
        className="underline decoration-dotted underline-offset-2 cursor-help"
        onMouseEnter={() => hoverInspect({ name: card.name, imageUri: card.imageUri ?? null, instanceId: card.instanceId })}
        onMouseLeave={clearHoverInspect}
      >
        {name}
      </span>
    );
  };

  /** Split a comma-separated card-name string into hoverable spans. */
  const renderCardNames = (namesStr: string) => {
    const names = namesStr.split(',');
    if (names.length === 1) return renderCardName(names[0]!);
    return names.map((n, i) => (
      <span key={i}>
        {i > 0 && ', '}
        {renderCardName(n.trim(), `card-${i}`)}
      </span>
    ));
  };

  const renderDescription = (action: GameAction) => {
    // ── zone_change: "Player moved CardA, CardB to graveyard" ──
    if (action.type === 'zone_change') {
      const movedMatch = action.description.match(/^(.*? moved )(.+)( to .+)$/);
      const arrowMatch = action.description.match(/^(.*?: )(.+?)( → .+)$/);
      const match = movedMatch ?? arrowMatch;
      if (!match) return action.description;
      const namesStr = match[2] ?? '';
      return (
        <>
          {match[1]}
          {renderCardNames(namesStr)}
          {match[3]}
        </>
      );
    }

    // ── reveal: "Player revealed CardA, CardB." / "Player hid CardA." ──
    if (action.type === 'reveal') {
      const revealMatch = action.description.match(/^(.*? (?:revealed|hid) )(.+?)(\.)(.*)$/);
      if (!revealMatch) return action.description;
      const namesStr = revealMatch[2] ?? '';
      const rest = revealMatch[4] ?? '';
      // If the rest contains another sentence (e.g. " Player hid X."), render it plainly
      return (
        <>
          {revealMatch[1]}
          {renderCardNames(namesStr)}
          {revealMatch[3]}
          {rest}
        </>
      );
    }

    return action.description;
  };

  return (
    <div className="flex flex-col h-full">
      <p className="text-[10px] uppercase tracking-widest text-cream-muted px-3 pt-2 pb-1">Action Log</p>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5">
        {actions.length === 0 ? (
          <p className="text-cream-muted/40 text-xs italic">No actions yet…</p>
        ) : (
          [...actions].reverse().map(action => (
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
