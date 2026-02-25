import { useState } from 'react';
import type { BattlefieldCard } from '../../types/game';
import { useGameTable } from '../../contexts/GameTableContext';

interface ScryOverlayProps {
  cards: BattlefieldCard[];
  instanceIds: string[];
}

export default function ScryOverlay({ cards, instanceIds }: ScryOverlayProps) {
  const { resolveScry } = useGameTable();
  const [keep, setKeep] = useState<string[]>([...instanceIds]);
  const [bottom, setBottom] = useState<string[]>([]);

  const toggleBottom = (id: string) => {
    if (bottom.includes(id)) {
      setBottom(prev => prev.filter(i => i !== id));
      setKeep(prev => [...prev, id]);
    } else {
      setKeep(prev => prev.filter(i => i !== id));
      setBottom(prev => [...prev, id]);
    }
  };

  const handleResolve = () => {
    resolveScry(keep, bottom);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-navy rounded-2xl border border-cyan p-6 max-w-2xl w-full mx-4">
        <h2 className="text-xl font-bold text-cream mb-1">Scry {instanceIds.length}</h2>
        <p className="text-cream-muted text-sm mb-4">
          Click a card to send it to the bottom. Leave cards on top or reorder them.
        </p>

        <div className="flex gap-4 flex-wrap justify-center mb-6">
          {cards.map(card => {
            const isBottom = bottom.includes(card.instanceId);
            return (
              <div key={card.instanceId} className="flex flex-col items-center gap-2">
                <div
                  className={`w-20 h-28 rounded-lg overflow-hidden border-2 cursor-pointer transition-all shadow-lg
                    ${isBottom
                      ? 'border-red-500 opacity-50 scale-95'
                      : 'border-cyan hover:border-cyan/80'
                    }`}
                  onClick={() => toggleBottom(card.instanceId)}
                  title={isBottom ? 'Bottom of library' : 'Top of library'}
                >
                  {card.imageUri ? (
                    <img src={card.imageUri} alt={card.name} className="w-full h-full object-cover" draggable={false} />
                  ) : (
                    <div className="w-full h-full bg-navy-light flex items-center justify-center p-1">
                      <span className="text-[9px] text-cream text-center leading-tight">{card.name}</span>
                    </div>
                  )}
                </div>
                <span className={`text-[10px] font-bold ${isBottom ? 'text-red-400' : 'text-cyan'}`}>
                  {isBottom ? '↓ Bottom' : '↑ Top'}
                </span>
                <span className="text-[9px] text-cream-muted text-center max-w-[80px] truncate">
                  {card.name}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <div className="flex-1 text-sm text-cream-muted">
            <span className="text-cream font-bold">{keep.length}</span> on top,{' '}
            <span className="text-red-400 font-bold">{bottom.length}</span> on bottom
          </div>
          <button
            onClick={handleResolve}
            className="px-6 py-2 bg-cyan hover:bg-cyan/90 rounded-lg font-bold text-navy transition-all"
          >
            Confirm Scry
          </button>
        </div>
      </div>
    </div>
  );
}
