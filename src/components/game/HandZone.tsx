import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { BattlefieldCard, GameZone } from '../../types/game';
import CardContextMenu from './CardContextMenu';
import { useGameTable } from '../../contexts/GameTableContext';
import { useCardInspector } from './CardInspectorPanel';

interface HandZoneProps {
  cards: BattlefieldCard[];
}

function HandCard({
  card,
  isSelected,
  onContextMenu, onPlayToBattlefield, onSendToZone, onToggleSelect, onReorder, onDragMove, onDragEnd
}: {
  card: BattlefieldCard;
  isSelected: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
  onPlayToBattlefield: (instanceId: string, clientX: number, clientY: number) => void;
  onSendToZone: (instanceId: string, zone: string, clientX: number, clientY: number) => void;
  onToggleSelect: (instanceId: string) => void;
  onReorder?: (instanceId: string, clientX: number) => void;
  onDragMove?: (instanceId: string, clientX: number) => void;
  onDragEnd?: () => void;
}) {
  const { inspect, hoverInspect, clearHoverInspect } = useCardInspector();

  const startX = useRef(0);
  const startY = useRef(0);
  const didDrag = useRef(false);
  const pressedOnCard = useRef(false);

  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isDragging) return;

    const clearHighlights = () => {
      document.querySelectorAll('[data-drop-zone]').forEach(el => {
        (el as HTMLElement).style.outline = '';
      });
    };

    const onMove = (e: PointerEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY });

      // Highlight any non-hand drop zone under cursor
      clearHighlights();
      const hits = document.elementsFromPoint(e.clientX, e.clientY);
      const zoneEl = hits.find(el => (el as HTMLElement).dataset?.dropZone) as HTMLElement | undefined;
      let hoveringHand = false;
      if (zoneEl) {
        if (zoneEl.dataset.dropZone !== 'hand') {
          zoneEl.style.outline = '3px solid rgba(0, 220, 255, 0.85)';
        } else {
          hoveringHand = true;
        }
      } else if (hits.some(el => el.closest('[data-drop-zone="hand"]'))) {
        hoveringHand = true;
      }

      const dy = startY.current - e.clientY;
      if (hoveringHand && dy < 60 && onDragMove) {
        onDragMove(card.instanceId, e.clientX);
      } else if (onDragEnd) {
        onDragEnd(); // Hide shadow if we move out of hand
      }
    };

    const onUp = (e: PointerEvent) => {
      clearHighlights();

      // Zone drop takes priority over the "drag up" gesture
      const hits = document.elementsFromPoint(e.clientX, e.clientY);
      const zoneEl = hits.find(el => (el as HTMLElement).dataset?.dropZone) as HTMLElement | undefined;
      const dropZone = zoneEl?.dataset.dropZone;

      if (dropZone && dropZone !== 'hand') {
        onSendToZone(card.instanceId, dropZone, e.clientX, e.clientY);
      } else {
        const dy = startY.current - e.clientY;
        if (dy > 60) {
          onPlayToBattlefield(card.instanceId, e.clientX, e.clientY);
        } else if (onReorder) {
          // If dropped in the hand zone (or nearby) without playing it, trigger reorder
          // We can use the drop X coordinate to determine its new place in the hand
          onReorder(card.instanceId, e.clientX);
        }
      }
      setIsDragging(false);
      setIsHovered(false);
      if (onDragEnd) onDragEnd();
    };

    const onCancel = () => {
      clearHighlights();
      setIsDragging(false);
      setIsHovered(false);
      if (onDragEnd) onDragEnd();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      clearHighlights();
    };
  }, [isDragging, card.instanceId, onPlayToBattlefield, onSendToZone, onReorder, onDragMove, onDragEnd]);

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
      {/* Card in set */}
      <div
        className="relative cursor-grab group flex-shrink-0 animate-card-fly-in"
        style={{
          width: 80,
          height: 112,
          transform: isHovered && !isDragging
            ? `translateY(-20px)`
            : `translateY(0)`,
          transformOrigin: 'bottom center',
          zIndex: isHovered && !isDragging ? 99 : 1,
          opacity: isDragging ? 0.3 : 1,
          transition: isDragging ? 'none' : 'transform 0.15s ease, opacity 0.1s',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onMouseEnter={() => {
          if (!isDragging) {
            setIsHovered(true);
            hoverInspect({ name: card.name, imageUri: card.imageUri ?? null, instanceId: card.instanceId });
          }
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          clearHoverInspect();
        }}
        onContextMenu={onContextMenu}
        onDragStart={e => e.preventDefault()}
      >
        <div className={`w-full h-full rounded-lg overflow-hidden border-2 shadow-neon-pink ${isSelected ? 'border-cyan' : 'border-cyan/50'}`}>
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

        {card.revealed && (
          <div className="absolute top-1 left-1 bg-navy/90 text-cyan border border-cyan/40 rounded-full p-1 shadow-md pointer-events-none" title="Revealed to everyone">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
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
          <div className="w-full h-full rounded-lg overflow-hidden border-2 border-cyan shadow-neon-pink-lg scale-110">
            {card.imageUri ? (
              <img
                src={card.imageUri!}
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
              ↑ play · drag to GY / exile / library
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export default function HandZone({ cards }: HandZoneProps) {
  const { changeZone, reorderHand } = useGameTable();
  const [menuInfo, setMenuInfo] = useState<{ card: BattlefieldCard; x: number; y: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragShadowIndex, setDragShadowIndex] = useState<number | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  const total = cards.length;

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

  // Send one card (or all selected) to any zone via drag
  const handleSendToZone = useCallback((instanceId: string, zone: string, clientX: number, clientY: number) => {
    const toSend = selectedIds.has(instanceId) && selectedIds.size > 1
      ? [...selectedIds]
      : [instanceId];
    const toIndex = zone === 'library' ? 0 : undefined;

    // If dropping on battlefield, compute position from cursor
    if (zone === 'battlefield') {
      const battlefield = document.querySelector('[data-battlefield="mine"]') as HTMLElement | null;
      const bfRect = battlefield?.getBoundingClientRect();
      toSend.forEach((id, idx) => {
        if (bfRect) {
          const offsetX = (idx - Math.floor(toSend.length / 2)) * 8;
          const x = Math.max(5, Math.min(95, ((clientX - bfRect.left) / bfRect.width) * 100 + offsetX));
          const y = Math.max(5, Math.min(95, ((clientY - bfRect.top) / bfRect.height) * 100));
          changeZone(id, 'battlefield', undefined, x, y);
        } else {
          changeZone(id, 'battlefield');
        }
      });
    } else {
      toSend.forEach(id => changeZone(id, zone as GameZone, toIndex));
    }
    setSelectedIds(new Set());
  }, [changeZone, selectedIds]);

  // When a card is dragged to battlefield: if it's selected and others are too, play all selected
  const handlePlayToBattlefield = useCallback((instanceId: string, clientX: number, clientY: number) => {
    const toPlay = selectedIds.has(instanceId) && selectedIds.size > 1
      ? [...selectedIds]
      : [instanceId];

    const battlefield = document.querySelector('[data-battlefield="mine"]') as HTMLElement | null;
    const bfRect = battlefield?.getBoundingClientRect();

    toPlay.forEach((id, idx) => {
      if (bfRect) {
        const offsetX = (idx - Math.floor(toPlay.length / 2)) * 8;
        const x = Math.max(5, Math.min(95, ((clientX - bfRect.left) / bfRect.width) * 100 + offsetX));
        const y = Math.max(5, Math.min(95, ((clientY - bfRect.top) / bfRect.height) * 100));
        changeZone(id, 'battlefield', undefined, x, y);
      } else {
        changeZone(id, 'battlefield');
      }
    });

    setSelectedIds(new Set());
  }, [changeZone, selectedIds]);

  const getReorderDropIndex = useCallback((instanceId: string, clientX: number) => {
    const handZone = document.querySelector('[data-drop-zone="hand"]') as HTMLElement | null;
    if (!handZone) return null;

    // Get the container that actually holds the cards (the gap layout)
    const cardContainer = handZone.querySelector('.hand-cards-container') as HTMLElement | null;
    if (!cardContainer) return null;

    const cardsArray = Array.from(cardContainer.querySelectorAll('.hand-card-wrapper')) as HTMLElement[];
    // Find where the drag happened relative to the cards
    let newIndex = cards.findIndex(c => c.instanceId === instanceId);
    
    for (let i = 0; i < cardsArray.length; i++) {
        const rect = cardsArray[i]!.getBoundingClientRect();
        // If the mouse is to the left of the card's horizontal center point
        if (clientX < rect.left + rect.width / 2) {
            newIndex = i;
            break;
        }
        newIndex = i; // if it's the rightmost, it'll end up here
    }
    return newIndex;
  }, [cards]);

  const handleDragMove = useCallback((instanceId: string, clientX: number) => {
    const dropIndex = getReorderDropIndex(instanceId, clientX);
    if (dropIndex !== null) {
      const currentIndex = cards.findIndex(c => c.instanceId === instanceId);
      // Only show shadow if it's moving to a DIFFERENT spot
      if (dropIndex !== currentIndex && dropIndex !== currentIndex + 1) {
        setDragShadowIndex(dropIndex);
        setDraggedCardId(instanceId);
      } else {
        setDragShadowIndex(null);
      }
    }
  }, [getReorderDropIndex, cards]);

  const handleDragEnd = useCallback(() => {
    setDragShadowIndex(null);
    setDraggedCardId(null);
  }, []);

  const handleReorder = useCallback((instanceId: string, clientX: number) => {
    setDragShadowIndex(null);
    setDraggedCardId(null);

    const newIndex = getReorderDropIndex(instanceId, clientX);
    if (newIndex === null) return;

    const currentIndex = cards.findIndex(c => c.instanceId === instanceId);
    // If dropping a card that comes before the target position, it shifts everyone left
    if (currentIndex !== -1 && currentIndex < newIndex) {
        // Example: arr = [0, 1, 2, 3], drag 0 to right half of 2. newIndex=2. Result: [1, 2, 0, 3]
        // But since we are removing one, we have to adjust
    }

    if (currentIndex === -1 || currentIndex === newIndex) return; // No change

    const newHandIds = cards.map(c => c.instanceId);
    newHandIds.splice(currentIndex, 1);
    newHandIds.splice(newIndex, 0, instanceId);

    reorderHand(newHandIds);
  }, [cards, reorderHand]);

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

      <div className="relative flex items-end justify-center w-full overflow-visible max-w-[calc(100vw-32px)]">
        {/* We use negative margins to overlap them slightly, or just gap if they want them completely side-by-side.
            The user asked for [][][][][] instead of fanned stacking. A small gap is best. */}
        <div className="hand-cards-container flex gap-[4px] px-4 overflow-x-auto items-end pb-2 pt-8 snap-x custom-scrollbar" style={{ height: 140 }}>
          {cards.map((card, i) => (
            <React.Fragment key={card.instanceId}>
              {dragShadowIndex === i && (
                <div className="w-[80px] h-[112px] rounded-lg bg-black/40 border-2 border-white/20 border-dashed flex-shrink-0" />
              )}
              <div className={`snap-center hand-card-wrapper ${draggedCardId === card.instanceId ? 'opacity-30' : ''}`}>
                <HandCard
                  card={card}
                  isSelected={selectedIds.has(card.instanceId)}
                  onToggleSelect={toggleSelect}
                  onContextMenu={e => {
                    e.preventDefault();
                    setMenuInfo({ card, x: e.clientX, y: e.clientY });
                  }}
                  onPlayToBattlefield={handlePlayToBattlefield}
                  onSendToZone={handleSendToZone}
                  onReorder={handleReorder}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                />
              </div>
            </React.Fragment>
          ))}
          {dragShadowIndex === cards.length && (
            <div className="w-[80px] h-[112px] rounded-lg bg-black/40 border-2 border-white/20 border-dashed flex-shrink-0" />
          )}
        </div>
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
