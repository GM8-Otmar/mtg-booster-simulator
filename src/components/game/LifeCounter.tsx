import { useState } from 'react';
import { useGameTable } from '../../contexts/GameTableContext';

interface LifeCounterProps {
  life: number;
  poison: number;
  playerId: string;
}

export default function LifeCounter({ life, poison, playerId }: LifeCounterProps) {
  const { adjustLife, setLife, adjustPoison, playerId: myId } = useGameTable();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const isOwner = playerId === myId;

  const lifeColor =
    life <= 0 ? 'text-red-500' :
    life <= 5 ? 'text-orange-400' :
    life <= 10 ? 'text-yellow-400' :
    'text-cream';

  const handleSetLife = () => {
    const val = parseInt(editValue, 10);
    if (!isNaN(val)) {
      setLife(val);
    }
    setEditing(false);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Life */}
      <div className="flex items-center gap-1">
        {isOwner && (
          <button
            onClick={() => adjustLife(-1)}
            className="w-6 h-6 rounded-full bg-navy-light hover:bg-red-900/40 border border-cyan-dim text-cream text-sm font-bold transition-all"
          >
            −
          </button>
        )}

        {editing ? (
          <input
            type="number"
            autoFocus
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={handleSetLife}
            onKeyDown={e => { if (e.key === 'Enter') handleSetLife(); if (e.key === 'Escape') setEditing(false); }}
            className="w-14 text-center text-xl font-bold bg-navy border border-cyan rounded text-cream focus:outline-none"
          />
        ) : (
          <span
            className={`text-2xl font-bold font-mono cursor-pointer min-w-[2.5rem] text-center ${lifeColor}`}
            onClick={() => isOwner && (setEditValue(String(life)), setEditing(true))}
            title={isOwner ? 'Click to set life total' : undefined}
          >
            {life}
          </span>
        )}

        {isOwner && (
          <button
            onClick={() => adjustLife(1)}
            className="w-6 h-6 rounded-full bg-navy-light hover:bg-green-900/40 border border-cyan-dim text-cream text-sm font-bold transition-all"
          >
            +
          </button>
        )}
      </div>

      <span className="text-[10px] text-cream-muted">Life</span>

      {/* Poison counters */}
      {(poison > 0 || isOwner) && (
        <div className="flex items-center gap-1 mt-1">
          {isOwner && (
            <button
              onClick={() => adjustPoison(-1)}
              disabled={poison === 0}
              className="w-5 h-5 rounded-full bg-navy-light hover:bg-navy border border-cyan-dim text-cream-muted text-xs disabled:opacity-40 transition-all"
            >
              −
            </button>
          )}
          <span className="text-xs text-green-400 font-mono min-w-[1.5rem] text-center">
            {poison > 0 ? `☠ ${poison}` : '☠ 0'}
          </span>
          {isOwner && (
            <button
              onClick={() => adjustPoison(1)}
              className="w-5 h-5 rounded-full bg-navy-light hover:bg-navy border border-cyan-dim text-cream-muted text-xs transition-all"
            >
              +
            </button>
          )}
        </div>
      )}
    </div>
  );
}
