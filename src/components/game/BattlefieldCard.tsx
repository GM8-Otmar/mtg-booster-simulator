import { useRef, useState, useCallback, useEffect } from 'react';
import type { BattlefieldCard as BFCard, GameZone } from '../../types/game';
import { useGameTable } from '../../contexts/GameTableContext';
import CardContextMenu from './CardContextMenu';
import { useCardInspector } from './CardInspectorPanel';

interface BattlefieldCardProps {
  card: BFCard;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isSelected?: boolean;
  onClearSelection?: () => void;
  /** All currently-selected cards — forwarded to context menu for bulk actions */
  selectedCards?: BFCard[];
  /** Zone calls this instead of the card handling its own drag (multi-select mode) */
  onMultiDragStart?: (instanceId: string, clientX: number, clientY: number) => void;
  /** Zone-controlled position during a multi-drag */
  multiDragPos?: { x: number; y: number };
  /** True for the card the user grabbed to start the multi-drag */
  isMultiDragLead?: boolean;
}

const CARD_W_PX = 80;
const CARD_H_PX = 112;

export default function BattlefieldCard({
  card,
  containerRef,
  isSelected,
  onClearSelection,
  selectedCards,
  onMultiDragStart,
  multiDragPos,
  isMultiDragLead,
}: BattlefieldCardProps) {
  const { moveCard, tapCard, changeZone, addCounter, playerId } = useGameTable();
  const { inspect } = useCardInspector();

  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // isPressed gates window-level listeners — keeps the card even at high mouse speed
  const [isPressed, setIsPressed] = useState(false);

  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const draggingVisuallyRef = useRef(false);
  const startClientRef = useRef({ x: 0, y: 0 });
  const lastEmitPctRef = useRef({ x: card.x, y: card.y });
  const dragOriginRef = useRef({ x: card.x, y: card.y });

  const isOwner = card.controller === playerId;
  const isFaceDown = card.faceDown;

  // During multi-drag the zone controls position; otherwise self-managed
  const [visualPos, setVisualPos] = useState({ x: card.x, y: card.y });
  const effectivePos = multiDragPos ?? visualPos;
  // Show "dragging" styling either when self-dragging or leading a multi-drag
  const effectiveDragging = isDragging || (!!isMultiDragLead && !!multiDragPos);

  const pctToStyle = (pctX: number, pctY: number) => ({
    left: `calc(${pctX}% - ${CARD_W_PX / 2}px)`,
    top: `calc(${pctY}% - ${CARD_H_PX / 2}px)`,
  });

  // Keep visual pos synced with server when not dragging
  useEffect(() => {
    if (!draggingRef.current && !multiDragPos) {
      setVisualPos({ x: card.x, y: card.y });
    }
  }, [card.x, card.y, multiDragPos]);

  // ── Pointer down ─────────────────────────────────────────────────────────

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 2 || !isOwner) return;
    e.stopPropagation();

    // If this card belongs to a multi-selection, hand the drag off to the zone
    if (onMultiDragStart) {
      onMultiDragStart(card.instanceId, e.clientX, e.clientY);
      return;
    }

    // Single-card drag: clear any existing selection and handle ourselves
    onClearSelection?.();
    draggingRef.current = false;
    movedRef.current = false;
    draggingVisuallyRef.current = false;
    startClientRef.current = { x: e.clientX, y: e.clientY };
    lastEmitPctRef.current = { x: card.x, y: card.y };
    dragOriginRef.current = { x: card.x, y: card.y };
    setIsPressed(true);
  }, [card.x, card.y, card.instanceId, isOwner, onClearSelection, onMultiDragStart]);

  // ── Window-level listeners — single-card drag ────────────────────────────

  useEffect(() => {
    if (!isPressed) return;

    const clearZoneHighlights = () => {
      document.querySelectorAll('[data-drop-zone]').forEach(el => {
        (el as HTMLElement).style.outline = '';
      });
    };

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startClientRef.current.x;
      const dy = e.clientY - startClientRef.current.y;
      if (!draggingRef.current && Math.sqrt(dx * dx + dy * dy) < 4) return;

      draggingRef.current = true;
      movedRef.current = true;

      if (!draggingVisuallyRef.current) {
        draggingVisuallyRef.current = true;
        setIsDragging(true);
      }

      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const clampedX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const clampedY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setVisualPos({ x: clampedX, y: clampedY });

      // Throttled relay to server (≥1% movement)
      const last = lastEmitPctRef.current;
      if (Math.abs(clampedX - last.x) >= 1 || Math.abs(clampedY - last.y) >= 1) {
        moveCard(card.instanceId, clampedX, clampedY, false);
        lastEmitPctRef.current = { x: clampedX, y: clampedY };
      }

      clearZoneHighlights();
      const hits = document.elementsFromPoint(e.clientX, e.clientY);
      const zoneEl = hits.find(el => (el as HTMLElement).dataset?.dropZone) as HTMLElement | undefined;
      if (zoneEl) {
        zoneEl.style.outline = '3px solid rgba(0, 220, 255, 0.85)';
      }
    };

    const onUp = (e: PointerEvent) => {
      clearZoneHighlights();

      if (draggingRef.current) {
        const hits = document.elementsFromPoint(e.clientX, e.clientY);
        const zoneEl = hits.find(el => (el as HTMLElement).dataset?.dropZone) as HTMLElement | undefined;

        if (zoneEl) {
          const dropZone = zoneEl.dataset.dropZone as GameZone;
          changeZone(card.instanceId, dropZone, dropZone === 'library' ? 0 : undefined);
          setVisualPos({ x: dragOriginRef.current.x, y: dragOriginRef.current.y });
        } else {
          const container = containerRef.current;
          if (container) {
            const rect = container.getBoundingClientRect();
            const finalX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            const finalY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
            moveCard(card.instanceId, finalX, finalY, true);
            setVisualPos({ x: finalX, y: finalY });
          }
        }
      } else if (!movedRef.current) {
        // Clean click → inspect
        inspect({ name: card.name, imageUri: isFaceDown ? null : card.imageUri, instanceId: card.instanceId });
      }

      draggingRef.current = false;
      draggingVisuallyRef.current = false;
      setIsDragging(false);
      setIsPressed(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      clearZoneHighlights();
    };
  }, [isPressed, card.instanceId, card.name, card.imageUri, isFaceDown, containerRef, moveCard, changeZone, inspect]);

  // ── Double-click: tap/untap ──────────────────────────────────────────────

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!isOwner || movedRef.current) return;
    e.stopPropagation();
    tapCard(card.instanceId, !card.tapped);
  }, [card.instanceId, card.tapped, isOwner, tapCard]);

  // ── Right-click: context menu ────────────────────────────────────────────

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  // ── Counter badge ─────────────────────────────────────────────────────────

  const counterTotal = card.counters.reduce((sum, c) => sum + c.value, 0);
  const hasCounters = card.counters.length > 0;
  const firstCounter = card.counters[0] ?? null;
  const counterBgColor = counterTotal > 0
    ? 'bg-green-600'
    : counterTotal < 0
      ? 'bg-red-600'
      : 'bg-gray-500';

  const borderColor = isOwner ? 'border-cyan/40' : 'border-magenta/40';

  // Pass all selected cards to the menu when right-clicking a selected card
  const bulkCards = isSelected && selectedCards && selectedCards.length > 1 ? selectedCards : undefined;

  return (
    <>
      {/* Ghost outline at drag origin (single-card drag only) */}
      {isDragging && (
        <div
          className="absolute pointer-events-none"
          style={{
            ...pctToStyle(dragOriginRef.current.x, dragOriginRef.current.y),
            width: CARD_W_PX,
            height: CARD_H_PX,
            border: '2px dashed rgba(0, 200, 255, 0.5)',
            borderRadius: 8,
            opacity: 0.4,
            background: 'rgba(0, 0, 0, 0.2)',
            zIndex: 8,
          }}
        />
      )}

      <div
        className="absolute select-none"
        style={{
          ...pctToStyle(effectivePos.x, effectivePos.y),
          width: CARD_W_PX,
          height: CARD_H_PX,
          transform: card.tapped
            ? `rotate(90deg)${effectiveDragging ? ' scale(1.08)' : ''}`
            : effectiveDragging ? 'scale(1.08)' : undefined,
          transition: effectiveDragging ? 'none' : 'transform 0.15s ease',
          zIndex: effectiveDragging ? 50 : 10,
          cursor: effectiveDragging ? 'grabbing' : 'grab',
          boxShadow: effectiveDragging ? '0 8px 24px rgba(0,0,0,0.65)' : undefined,
        }}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      >
        <div className={`w-full h-full rounded-lg overflow-hidden border-2 ${borderColor} shadow-lg`}>
          {isFaceDown ? (
            <div className="w-full h-full bg-gradient-to-br from-navy-light to-navy flex items-center justify-center rounded-lg">
              <span className="text-2xl opacity-30">🃏</span>
            </div>
          ) : card.imageUri ? (
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
          <div className="absolute -top-2 -right-2 bg-magenta rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-md z-20">
            ★
          </div>
        )}

        {hasCounters && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-1 z-20">
            <span
              title={firstCounter ? (firstCounter.label ?? firstCounter.type) : undefined}
              className={`${counterBgColor} text-white text-[10px] font-bold rounded-full min-w-[24px] h-6 flex items-center justify-center px-1.5 shadow cursor-pointer select-none`}
              onClick={e => {
                e.stopPropagation();
                if (firstCounter) addCounter(card.instanceId, firstCounter.type, 1, firstCounter.label);
              }}
              onContextMenu={e => {
                e.preventDefault();
                e.stopPropagation();
                if (firstCounter) addCounter(card.instanceId, firstCounter.type, -1, firstCounter.label);
              }}
            >
              {counterTotal > 0 ? `+${counterTotal}` : counterTotal}
            </span>
          </div>
        )}

        {card.tapped && (
          <div className="absolute inset-0 rounded-lg ring-2 ring-yellow-400/50 pointer-events-none" />
        )}

        {/* Selection highlight */}
        {isSelected && (
          <div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{ boxShadow: '0 0 0 2px rgba(0, 220, 255, 0.9), 0 0 10px rgba(0, 220, 255, 0.4)' }}
          />
        )}
      </div>

      {menuPos && (
        <CardContextMenu
          card={card}
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuPos(null)}
          selectedCards={bulkCards}
        />
      )}
    </>
  );
}
