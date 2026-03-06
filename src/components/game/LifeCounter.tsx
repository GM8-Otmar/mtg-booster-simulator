import { useState } from 'react';
import { useGameTable } from '../../contexts/GameTableContext';

interface LifeCounterProps {
  life: number;
  poison: number;
  playerId: string;
}

export default function LifeCounter({ life, poison, playerId }: LifeCounterProps) {
  const { adjustLife, setLife, adjustPoison, effectivePlayerId: myId } = useGameTable();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const isOwner = playerId === myId;

  const lifeColor =
    life <= 0  ? 'text-red-400' :
    life <= 5  ? 'text-orange-400' :
    life <= 10 ? 'text-yellow-400' :
    'text-cream';

  const handleSetLife = () => {
    const val = parseInt(editValue, 10);
    if (!isNaN(val)) setLife(val);
    setEditing(false);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Life total */}
      <div className="flex items-center gap-1.5">
        {isOwner && (
          <button
            onClick={() => adjustLife(-1)}
            className="w-6 h-6 rounded-full bg-navy-light hover:bg-red-900/50 border border-cyan-dim text-cream text-sm font-bold transition-all active:scale-95"
          >
            {'\u2212'}
          </button>
        )}

        {editing ? (
          <input
            type="number"
            autoFocus
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={handleSetLife}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSetLife();
              if (e.key === 'Escape') setEditing(false);
            }}
            className="w-14 text-center text-xl font-bold bg-navy border-2 border-cyan rounded-lg text-cream focus:outline-none"
          />
        ) : (
          <span
            className={`text-2xl font-bold font-mono min-w-[2rem] text-center leading-none ${lifeColor} ${isOwner ? 'cursor-pointer hover:opacity-80' : ''} transition-opacity`}
            onClick={() => isOwner && (setEditValue(String(life)), setEditing(true))}
            title={isOwner ? 'Click to set life total' : undefined}
          >
            {life}
          </span>
        )}

        {isOwner && (
          <button
            onClick={() => adjustLife(1)}
            className="w-6 h-6 rounded-full bg-navy-light hover:bg-green-900/50 border border-cyan-dim text-cream text-sm font-bold transition-all active:scale-95"
          >
            +
          </button>
        )}
      </div>

      {/* Poison counters — compact */}
      {(poison > 0 || isOwner) && (
        <div className="flex items-center gap-1">
          {isOwner && (
            <button
              onClick={() => adjustPoison(-1)}
              disabled={poison === 0}
              className="w-5 h-5 rounded-full bg-navy-light hover:bg-navy border border-cyan-dim text-cream-muted text-[10px] disabled:opacity-30 transition-all"
            >
              {'\u2212'}
            </button>
          )}
          <span className={`text-xs font-mono font-bold min-w-[2rem] text-center ${poison > 0 ? 'text-green-400' : 'text-cream-muted/40'}`}>
            {'\u2620'} {poison}
          </span>
          {isOwner && (
            <button
              onClick={() => adjustPoison(1)}
              className="w-5 h-5 rounded-full bg-navy-light hover:bg-navy border border-cyan-dim text-cream-muted text-[10px] transition-all"
            >
              +
            </button>
          )}
        </div>
      )}
    </div>
  );
}
