import { useState, useRef, useCallback } from 'react';
import type { BattlefieldCard } from '../../types/game';
import CardContextMenu from './CardContextMenu';
import { useCardPreview } from './CardHoverPreview';
import { useGameTable } from '../../contexts/GameTableContext';
import { useCardInspector } from './CardInspectorPanel';

interface HandZoneProps {
  cards: BattlefieldCard[];
}

function HandCard({
  card, i, total, fanAngle, startAngle,
  onContextMenu, onPlayToBattlefield,
}: {
  card: BattlefieldCard;
  i: number;
  total: number;
  fanAngle: number;
  startAngle: number;
  onContextMenu: (e: React.MouseEvent) => void;
  onPlayToBattlefield: (instanceId: string) => void;
}) {
  const cardPreview = useCardPreview(card.imageUri, card.name);
  const { inspect } = useCardInspector();
  const angle = startAngle + i * fanAngle;
  const offsetX = (i - (total - 1) / 2) * 36;

  const elRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startX = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 2) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = false;
    startX.current = e.clientX;
    startY.current = e.clientY;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (!dragging.current && dist < 8) return;

    if (!dragging.current) {
      dragging.current = true;
      setIsDragging(true);
      cardPreview.onMouseLeave(); // hide preview while dragging
    }

    setDragPos({ x: e.clientX, y: e.clientY });
  }, [cardPreview]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (dragging.current) {
      // Check if dragged significantly upward (into the battlefield area)
      const dy = startY.current - e.clientY; // positive = upward
      if (dy > 60) {
        onPlayToBattlefield(card.instanceId);
      }
      dragging.current = false;
      setIsDragging(false);
    } else {
      // Single click → inspect
      inspect({ name: card.name, imageUri: card.imageUri ?? null, instanceId: card.instanceId });
    }
  }, [card.instanceId, card.name, card.imageUri, onPlayToBattlefield, inspect]);

  return (
    <>
      {/* Ghost card at original fan position when dragging */}
      <div
        ref={elRef}
        className="absolute cursor-grab group"
        style={{
          width: 80,
          height: 112,
          left: `calc(50% + ${offsetX}px - 40px)`,
          bottom: 0,
          transform: `rotate(${angle}deg)`,
          transformOrigin: 'bottom center',
          zIndex: i,
          opacity: isDragging ? 0.3 : 1,
          transition: isDragging ? 'none' : 'transform 0.15s ease, opacity 0.1s',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onMouseEnter={isDragging ? undefined : e => {
          (e.currentTarget as HTMLElement).style.transform = `rotate(${angle}deg) translateY(-20px)`;
          (e.currentTarget as HTMLElement).style.zIndex = '99';
          cardPreview.onMouseEnter(e);
        }}
        onMouseLeave={isDragging ? undefined : e => {
          (e.currentTarget as HTMLElement).style.transform = `rotate(${angle}deg)`;
          (e.currentTarget as HTMLElement).style.zIndex = String(i);
          cardPreview.onMouseLeave();
        }}
        onMouseMove={isDragging ? undefined : cardPreview.onMouseMove}
        onContextMenu={onContextMenu}
      >
        <div className="w-full h-full rounded-lg overflow-hidden border-2 border-cyan/50 shadow-lg">
          {card.imageUri ? (
            <img
              src={card.imageUri}
              alt={card.name}
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full bg-navy-light flex items-center justify-center p-1">
              <span className="text-[9px] text-cream text-center leading-tight">{card.name}</span>
            </div>
          )}
        </div>
        {card.isCommander && (
          <div className="absolute -top-2 -right-2 bg-magenta rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-md">★</div>
        )}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
          <span className="bg-navy text-cream text-[9px] rounded px-1.5 py-0.5 border border-cyan-dim shadow">{card.name}</span>
        </div>
      </div>

      {/* Floating card that follows cursor while dragging */}
      {isDragging && (
        <div
          className="fixed pointer-events-none z-[8000]"
          style={{
            left: dragPos.x - 40,
            top: dragPos.y - 56,
            width: 80,
            height: 112,
          }}
        >
          <div className="w-full h-full rounded-lg overflow-hidden border-2 border-cyan shadow-2xl rotate-0 scale-110">
            {card.imageUri ? (
              <img
                src={card.imageUri}
                alt={card.name}
                className="w-full h-full object-cover"
                draggable={false}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full bg-navy-light flex items-center justify-center p-1">
                <span className="text-[9px] text-cream text-center">{card.name}</span>
              </div>
            )}
          </div>
          {/* Drop indicator */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="text-[10px] text-cyan bg-navy/80 px-2 py-0.5 rounded-full border border-cyan/40">
              drag up to play
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export default function HandZone({ cards }: HandZoneProps) {
  const { changeZone } = useGameTable();
  const [menuInfo, setMenuInfo] = useState<{ card: BattlefieldCard; x: number; y: number } | null>(null);

  const total = cards.length;
  const fanAngle = Math.min(4, 60 / Math.max(total, 1));
  const startAngle = -((total - 1) / 2) * fanAngle;

  const handlePlayToBattlefield = useCallback((instanceId: string) => {
    changeZone(instanceId, 'battlefield');
  }, [changeZone]);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-cream-muted/30 text-xs">Empty hand</p>
      </div>
    );
  }

  return (
    <div className="relative flex items-end justify-center h-full">
      <div className="relative flex items-end" style={{ height: 112, minWidth: total * 36 + 44 }}>
        {cards.map((card, i) => (
          <HandCard
            key={card.instanceId}
            card={card}
            i={i}
            total={total}
            fanAngle={fanAngle}
            startAngle={startAngle}
            onContextMenu={e => {
              e.preventDefault();
              setMenuInfo({ card, x: e.clientX, y: e.clientY });
            }}
            onPlayToBattlefield={handlePlayToBattlefield}
          />
        ))}
      </div>
      {menuInfo && (
        <CardContextMenu
          card={menuInfo.card}
          x={menuInfo.x}
          y={menuInfo.y}
          onClose={() => setMenuInfo(null)}
        />
      )}
    </div>
  );
}
