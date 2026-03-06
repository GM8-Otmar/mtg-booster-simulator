import { useState } from 'react';
import { useGameTable } from '../../contexts/GameTableContext';
import LibrarySearchOverlay from './LibrarySearchOverlay';
import DeckContextMenu from './DeckContextMenu';

interface LibraryStackProps {
  count: number;
  playerId: string;
}

export default function LibraryStack({ count, playerId }: LibraryStackProps) {
  const { drawCards, shuffleLibrary, scry, effectivePlayerId: myId } = useGameTable();
  const [showSearch, setShowSearch] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const isOwner = playerId === myId;

  const cardLayers = Math.min(count, 5);

  return (
    <>
      <div className="flex flex-col items-center gap-1" data-drop-zone="library">
        {/* Stack visual */}
        <div
          className="relative cursor-pointer"
          style={{ width: 54, height: 76 }}
          onClick={() => isOwner && count > 0 && drawCards(1)}
          onContextMenu={(e) => {
            e.preventDefault();
            if (isOwner) setMenuPos({ x: e.clientX, y: e.clientY });
          }}
          title={isOwner ? 'Click to draw 1 \u00b7 Right-click for options' : `${playerId} library`}
        >
          {Array.from({ length: cardLayers }).map((_, i) => (
            <div
              key={i}
              className="absolute border border-cyan-dim/60 rounded-md bg-navy-light"
              style={{
                width: 50,
                height: 70,
                left: i * 1,
                top: i * 1,
                zIndex: i,
              }}
            />
          ))}
          {/* Top card overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-dim/20 to-navy-light rounded-md border-2 border-cyan-dim z-10"
            style={{ width: 50, height: 70 }}
          >
            <span className="text-lg font-bold text-cream">{count}</span>
          </div>
        </div>

        <p className="text-[9px] text-cream-muted text-center">Deck</p>
      </div>

      {menuPos && (
        <DeckContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuPos(null)}
          onShuffle={() => shuffleLibrary()}
          onDraw={() => drawCards(1)}
          onFind={() => setShowSearch(true)}
          onScry={(n, mode) => scry(n, mode)}
          libraryCount={count}
        />
      )}

      {showSearch && <LibrarySearchOverlay onClose={() => setShowSearch(false)} />}
    </>
  );
}
