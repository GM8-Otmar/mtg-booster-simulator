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
  isSelected,
  onContextMenu, onPlayToBattlefield, onToggleSelect,
}: {
  card: BattlefieldCard;
  i: number;
  total: number;
  fanAngle: number;
  startAngle: number;
  isSelected: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
  onPlayToBattlefield: (instanceId: string, clientX: number, clientY: number) => void;
  onToggleSelect: (instanceId: string) => void;
}) {
  const { inspect } = useCardInspector();
  const angle = startAngle + i * fanAngle;
  const offsetX = (i - (total - 1) / 2) * 36;

  const startX = useRef(0);
  const startY = useRef(0);
  const didDrag = useRef(false);
  const pressedOnCard = useRef(false);

  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

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

    // Shift-click toggles selection without starting drag
    if (e.shiftKey) {
      onToggleSelect(card.instanceId);
      return;
    }

    didDrag.current = false;
    pressedOnCard.current = true;
    startX.current = e.clientX;
    startY.current = e.clientY;
    setDragPos({ x: e.clientX, y: e.clientY });
  }, [card.instanceId, onToggleSelect]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
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
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onMouseEnter={() => { if (!isDragging) setIsHovered(true); }}
        onMouseLeave={() => setIsHovered(false)}
        onContextMenu={onContextMenu}
        onDragStart={e => e.preventDefault()}
      >
        <div className={`w-full h-full rounded-lg overflow-hidden border-2 shadow-lg ${isSelected ? 'border-cyan' : 'border-cyan/50'}`}>
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

        {/* Selection glow */}
        {isSelected && (
          <div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{ boxShadow: '0 0 0 2px rgba(0, 220, 255, 0.9), 0 0 12px rgba(0, 220, 255, 0.5)' }}
          />
        )}
      </div>

      {/* Floating ghost that follows cursor while dragging */}
      {isDragging && (
        <div
          className="fixed pointer-events-none z-[8000]"
          style={{ left: dragPos.x - 40, top: dragPos.y - 56, width: 80, height: 112 }}
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const total = cards.length;
  const fanAngle = Math.min(4, 60 / Math.max(total, 1));
  const startAngle = -((total - 1) / 2) * fanAngle;

  // Clear selection if selected cards leave the hand
  useEffect(() => {
    const handIds = new Set(cards.map(c => c.instanceId));
    setSelectedIds(prev => {
      const next = new Set([...prev].filter(id => handIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [cards]);

  // Clear selection on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedIds(new Set()); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const toggleSelect = useCallback((instanceId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(instanceId)) next.delete(instanceId); else next.add(instanceId);
      return next;
    });
  }, []);

  // When a card is dragged to battlefield: if it's selected and others are too, play all selected
  const handlePlayToBattlefield = useCallback((instanceId: string, clientX: number, clientY: number) => {
    const toPlay = selectedIds.has(instanceId) && selectedIds.size > 1
      ? [...selectedIds]
      : [instanceId];

    const battlefield = document.querySelector('[data-battlefield]') as HTMLElement | null;
    const bfRect = battlefield?.getBoundingClientRect();

    toPlay.forEach((id, idx) => {
      changeZone(id, 'battlefield');
      if (bfRect) {
        // Spread cards out slightly so they don't all land on the same spot
        const offsetX = (idx - Math.floor(toPlay.length / 2)) * 8;
        const x = Math.max(5, Math.min(95, ((clientX - bfRect.left) / bfRect.width) * 100 + offsetX));
        const y = Math.max(5, Math.min(95, ((clientY - bfRect.top) / bfRect.height) * 100));
        setTimeout(() => moveCard(id, x, y, true), 0);
      }
    });

    setSelectedIds(new Set());
  }, [changeZone, moveCard, selectedIds]);

  const hasSelection = selectedIds.size > 0;
  const selectedCards = hasSelection ? cards.filter(c => selectedIds.has(c.instanceId)) : undefined;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full" data-drop-zone="hand" style={{ userSelect: 'none' }}>
        <p className="text-cream-muted/30 text-xs">Empty hand</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-end h-full" data-drop-zone="hand" style={{ userSelect: 'none' }}>
      {/* Selection hint bar */}
      {hasSelection && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 z-[200] pointer-events-auto"
          onPointerDown={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 bg-navy/95 border border-cyan-dim/60 rounded-xl px-3 py-1 shadow-xl backdrop-blur-sm">
            <span className="text-cream-muted text-[11px]">{selectedIds.size} selected</span>
            <span className="text-cream-muted/40 text-[10px]">· right-click for actions · drag up to play all</span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[11px] px-1.5 py-0.5 rounded hover:bg-red-900/30 text-cream-muted/60 hover:text-red-400 transition-colors ml-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="relative flex items-end" style={{ height: 112, minWidth: total * 36 + 44 }}>
        {cards.map((card, i) => (
          <HandCard
            key={card.instanceId}
            card={card}
            i={i}
            total={total}
            fanAngle={fanAngle}
            startAngle={startAngle}
            isSelected={selectedIds.has(card.instanceId)}
            onToggleSelect={toggleSelect}
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
          selectedCards={
            selectedIds.has(menuInfo.card.instanceId) && selectedCards && selectedCards.length > 1
              ? selectedCards
              : undefined
          }
        />
      )}
    </div>
  );
}
