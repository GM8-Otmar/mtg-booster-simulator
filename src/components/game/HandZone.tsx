import { useState, useRef, useCallback, useEffect } from 'react';
import type { BattlefieldCard } from '../../types/game';
import CardContextMenu from './CardContextMenu';
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
  onPlayToBattlefield: (instanceId: string, clientX: number, clientY: number) => void;
}) {
  const { inspect } = useCardInspector();
  const angle = startAngle + i * fanAngle;
  const offsetX = (i - (total - 1) / 2) * 36;

  const startX = useRef(0);
  const startY = useRef(0);
  const didDrag = useRef(false);
  const pressedOnCard = useRef(false); // only true after pointerdown on this card

  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

  // When dragging starts, attach window-level listeners so we catch
  // pointer moves and releases even if the pointer leaves the card.
  // This avoids setPointerCapture which was causing stuck drag states.
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: PointerEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY });
    };

    const onUp = (e: PointerEvent) => {
      const dy = startY.current - e.clientY;
      if (dy > 60) {
        onPlayToBattlefield(card.instanceId, e.clientX, e.clientY);
      }
      setIsDragging(false);
      setIsHovered(false);
    };

    const onCancel = () => {
      setIsDragging(false);
      setIsHovered(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [isDragging, card.instanceId, onPlayToBattlefield]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 2) return;
    e.stopPropagation();
    didDrag.current = false;
    pressedOnCard.current = true;
    startX.current = e.clientX;
    startY.current = e.clientY;
    setDragPos({ x: e.clientX, y: e.clientY });
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    // Only start drag if pointer was pressed on this specific card
    if (!pressedOnCard.current) return;
    if (!(e.buttons & 1)) { pressedOnCard.current = false; return; }
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (!didDrag.current && Math.sqrt(dx * dx + dy * dy) < 8) return;

    if (!didDrag.current) {
      didDrag.current = true;
      setIsDragging(true);
      setIsHovered(false);
    }
  }, []);

  const onPointerUp = useCallback((_e: React.PointerEvent) => {
    // Only fires for clicks (drag handled by window listener)
    if (pressedOnCard.current && !didDrag.current) {
      inspect({ name: card.name, imageUri: card.imageUri ?? null, instanceId: card.instanceId });
    }
    didDrag.current = false;
    pressedOnCard.current = false;
  }, [card.instanceId, card.name, card.imageUri, inspect]);

  return (
    <>
      {/* Card in fan */}
      <div
        className="absolute cursor-grab group"
        style={{
          width: 80,
          height: 112,
          left: `calc(50% + ${offsetX}px - 40px)`,
          bottom: 0,
          transform: isHovered && !isDragging
            ? `rotate(${angle}deg) translateY(-20px)`
            : `rotate(${angle}deg)`,
          transformOrigin: 'bottom center',
          zIndex: isHovered && !isDragging ? 99 : i,
          opacity: isDragging ? 0.3 : 1,
          transition: isDragging ? 'none' : 'transform 0.15s ease, opacity 0.1s',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onMouseEnter={() => { if (!isDragging) setIsHovered(true); }}
        onMouseLeave={() => setIsHovered(false)}
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
        {/* Name tooltip on hover */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
          <span className="bg-navy text-cream text-[9px] rounded px-1.5 py-0.5 border border-cyan-dim shadow">{card.name}</span>
        </div>
      </div>

      {/* Floating ghost that follows cursor while dragging */}
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
          <div className="w-full h-full rounded-lg overflow-hidden border-2 border-cyan shadow-2xl scale-110">
            {card.imageUri ? (
              <img
                src={card.imageUri}
                alt={card.name}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-navy-light flex items-center justify-center p-1">
                <span className="text-[9px] text-cream text-center">{card.name}</span>
              </div>
            )}
          </div>
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
  const { changeZone, moveCard } = useGameTable();
  const [menuInfo, setMenuInfo] = useState<{ card: BattlefieldCard; x: number; y: number } | null>(null);

  const total = cards.length;
  const fanAngle = Math.min(4, 60 / Math.max(total, 1));
  const startAngle = -((total - 1) / 2) * fanAngle;

  const handlePlayToBattlefield = useCallback((instanceId: string, clientX: number, clientY: number) => {
    changeZone(instanceId, 'battlefield');
    const battlefield = document.querySelector('[data-battlefield]') as HTMLElement | null;
    if (battlefield) {
      const rect = battlefield.getBoundingClientRect();
      const x = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100));
      setTimeout(() => moveCard(instanceId, x, y, true), 0);
    }
  }, [changeZone, moveCard]);

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
