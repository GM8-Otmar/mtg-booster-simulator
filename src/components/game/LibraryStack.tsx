import { useState } from 'react';
import { useGameTable } from '../../contexts/GameTableContext';
import LibrarySearchOverlay from './LibrarySearchOverlay';

interface LibraryStackProps {
  count: number;
  playerId: string;
}

export default function LibraryStack({ count, playerId }: LibraryStackProps) {
  const { drawCards, shuffleLibrary, scry, effectivePlayerId: myId } = useGameTable();
  const [scryCount, setScryCount] = useState(1);
  const [showSearch, setShowSearch] = useState(false);
  const isOwner = playerId === myId;

  const cardLayers = Math.min(count, 5);

  return (
    <>
      <div className="flex flex-col items-center gap-2" data-drop-zone="library">
        {/* Stack visual */}
        <div className="relative" style={{ width: 64, height: 90 }}>
          {Array.from({ length: cardLayers }).map((_, i) => (
            <div
              key={i}
              className="absolute border border-cyan-dim/60 rounded-md bg-navy-light"
              style={{
                width: 60,
                height: 84,
                left: i * 1,
                top: i * 1,
                zIndex: i,
              }}
            />
          ))}
          {/* Top card overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-dim/20 to-navy-light rounded-md border-2 border-cyan-dim z-10 cursor-pointer"
            style={{ width: 60, height: 84 }}
            onClick={() => isOwner && drawCards(1)}
            title={isOwner ? 'Click to draw 1' : `${playerId} library`}
          >
            <span className="text-xl font-bold text-cream">{count}</span>
          </div>
        </div>

        <p className="text-[10px] text-cream-muted text-center">Library</p>

        {/* Owner controls */}
        {isOwner && (
          <div className="flex flex-col gap-1 items-center w-full">
            <button
              onClick={() => drawCards(1)}
              disabled={count === 0}
              className="w-full text-xs py-1 px-2 bg-cyan/20 hover:bg-cyan/30 border border-cyan-dim rounded-lg text-cyan disabled:opacity-40 transition-all"
            >
              Draw
            </button>
            <button
              onClick={() => shuffleLibrary()}
              className="w-full text-xs py-1 px-2 bg-navy-light hover:bg-navy border border-cyan-dim rounded-lg text-cream-muted transition-all"
            >
              Shuffle
            </button>
            <button
              onClick={() => setShowSearch(true)}
              disabled={count === 0}
              className="w-full text-xs py-1 px-2 bg-navy-light hover:bg-navy border border-cyan-dim rounded-lg text-cream-muted disabled:opacity-40 transition-all"
            >
              Find
            </button>
            <div className="flex gap-1 items-center w-full">
              <button
                onClick={() => scry(scryCount, 'scry')}
                disabled={count === 0}
                className="flex-1 text-xs py-1 bg-navy-light hover:bg-navy border border-cyan-dim rounded-lg text-cream-muted disabled:opacity-40 transition-all"
              >
                Scry {scryCount}
              </button>
              <button
                onClick={() => scry(scryCount, 'surveil')}
                disabled={count === 0}
                className="flex-1 text-xs py-1 bg-navy-light hover:bg-navy border border-magenta/40 rounded-lg text-magenta/70 disabled:opacity-40 transition-all"
                title="Surveil — can send cards to graveyard"
              >
                Surv.
              </button>
              <select
                value={scryCount}
                onChange={e => setScryCount(Number(e.target.value))}
                className="text-xs bg-navy border border-cyan-dim rounded text-cream-muted py-1"
              >
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {showSearch && <LibrarySearchOverlay onClose={() => setShowSearch(false)} />}
    </>
  );
}
