import { useRef, useState, useCallback, useEffect } from 'react';
import type { BattlefieldCard, GameZone } from '../../types/game';
import BattlefieldCardComponent from './BattlefieldCard';
import { useGameTable } from '../../contexts/GameTableContext';

interface BattlefieldZoneProps {
  cards: BattlefieldCard[];
  label?: string;
  heightClass?: string;
}

const CARD_W_PX = 80;
const CARD_H_PX = 112;

interface MarqueeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

type MultiDragPositions = Map<string, { x: number; y: number }>;

interface MultiDragState {
  leadId: string;
  startClientX: number;
  startClientY: number;
  startPositions: Map<string, { x: number; y: number }>;
}

export default function BattlefieldZone({
  cards,
  label,
  heightClass = 'flex-1 min-h-0',
}: BattlefieldZoneProps) {
  const { tapCard, changeZone, moveCard, playerId } = useGameTable();
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Selection state ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const isMarqueeingRef = useRef(false);
  const cardsRef = useRef(cards);
  useEffect(() => { cardsRef.current = cards; }, [cards]);
  const selectedIdsRef = useRef(selectedIds);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

  // ── Multi-drag state ─────────────────────────────────────────────────────
  const [multiDrag, setMultiDrag] = useState<MultiDragState | null>(null);
  const [multiDragPositions, setMultiDragPositions] = useState<MultiDragPositions>(new Map());
  const multiDragRef = useRef<MultiDragState | null>(null);
  const multiDragPositionsRef = useRef<MultiDragPositions>(new Map());

  // ── Escape clears selection ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedIds(new Set());
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Pointer down on empty zone space (starts marquee) ───────────────────
  // Cards call stopPropagation(), so this only fires on genuinely empty space.
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    marqueeStartRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    isMarqueeingRef.current = false;
    setIsSelecting(true);
  }, []);

  // ── Window listeners for marquee drag ───────────────────────────────────
  useEffect(() => {
    if (!isSelecting) return;

    const onMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container || !marqueeStartRef.current) return;

      const rect = container.getBoundingClientRect();
      const curX = e.clientX - rect.left;
      const curY = e.clientY - rect.top;
      const startX = marqueeStartRef.current.x;
      const startY = marqueeStartRef.current.y;

      const left = Math.min(startX, curX);
      const top = Math.min(startY, curY);
      const width = Math.abs(curX - startX);
      const height = Math.abs(curY - startY);

      if (width > 6 || height > 6) {
        isMarqueeingRef.current = true;
        setMarquee({ left, top, width, height });

        const containerW = rect.width;
        const containerH = rect.height;
        const newSelected = new Set<string>();

        for (const card of cardsRef.current) {
          const cLeft = (card.x / 100) * containerW - CARD_W_PX / 2;
          const cTop  = (card.y / 100) * containerH - CARD_H_PX / 2;
          if (
            cLeft + CARD_W_PX > left &&
            cLeft < left + width &&
            cTop + CARD_H_PX > top &&
            cTop < top + height
          ) {
            newSelected.add(card.instanceId);
          }
        }
        setSelectedIds(newSelected);
      }
    };

    const onUp = () => {
      if (!isMarqueeingRef.current) {
        setSelectedIds(new Set());
      }
      setMarquee(null);
      setIsSelecting(false);
      isMarqueeingRef.current = false;
      marqueeStartRef.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isSelecting]);

  // ── Multi-drag: zone takes control when a selected card starts dragging ──
  const onMultiDragStart = useCallback((leadId: string, clientX: number, clientY: number) => {
    const startPositions = new Map<string, { x: number; y: number }>();
    for (const card of cardsRef.current) {
      if (selectedIdsRef.current.has(card.instanceId)) {
        startPositions.set(card.instanceId, { x: card.x, y: card.y });
      }
    }
    const state: MultiDragState = {
      leadId,
      startClientX: clientX,
      startClientY: clientY,
      startPositions,
    };
    multiDragRef.current = state;
    multiDragPositionsRef.current = new Map(startPositions);
    setMultiDrag(state);
    setMultiDragPositions(new Map(startPositions));
  }, []);

  useEffect(() => {
    if (!multiDrag) return;

    const clearZoneHighlights = () => {
      document.querySelectorAll('[data-drop-zone]').forEach(el => {
        (el as HTMLElement).style.outline = '';
      });
    };

    const onMove = (e: PointerEvent) => {
      const container = containerRef.current;
      const drag = multiDragRef.current;
      if (!container || !drag) return;

      const rect = container.getBoundingClientRect();
      const dxClient = e.clientX - drag.startClientX;
      const dyClient = e.clientY - drag.startClientY;
      const dxPct = (dxClient / rect.width) * 100;
      const dyPct = (dyClient / rect.height) * 100;

      const newPositions: MultiDragPositions = new Map();
      for (const [id, startPos] of drag.startPositions) {
        newPositions.set(id, {
          x: Math.max(2, Math.min(98, startPos.x + dxPct)),
          y: Math.max(2, Math.min(98, startPos.y + dyPct)),
        });
      }
      multiDragPositionsRef.current = newPositions;
      setMultiDragPositions(new Map(newPositions));

      // Highlight drop zone under cursor
      clearZoneHighlights();
      const hits = document.elementsFromPoint(e.clientX, e.clientY);
      const zoneEl = hits.find(el => (el as HTMLElement).dataset?.dropZone) as HTMLElement | undefined;
      if (zoneEl) {
        zoneEl.style.outline = '3px solid rgba(0, 220, 255, 0.85)';
      }
    };

    const onUp = (e: PointerEvent) => {
      clearZoneHighlights();
      const drag = multiDragRef.current;
      if (!drag) return;

      const hits = document.elementsFromPoint(e.clientX, e.clientY);
      const zoneEl = hits.find(el => (el as HTMLElement).dataset?.dropZone) as HTMLElement | undefined;

      if (zoneEl) {
        // Send all selected to the drop zone
        for (const id of drag.startPositions.keys()) {
          changeZone(id, zoneEl.dataset.dropZone as GameZone);
        }
      } else {
        // Persist final positions for all selected cards
        for (const [id, pos] of multiDragPositionsRef.current) {
          moveCard(id, pos.x, pos.y, true);
        }
      }

      multiDragRef.current = null;
      multiDragPositionsRef.current = new Map();
      setMultiDrag(null);
      setMultiDragPositions(new Map());
      setSelectedIds(new Set());
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      clearZoneHighlights();
    };
  }, [multiDrag, changeZone, moveCard]);

  // ── Bulk tap actions ─────────────────────────────────────────────────────
  const tapSelected = useCallback((tapped: boolean) => {
    for (const card of cardsRef.current) {
      if (selectedIds.has(card.instanceId) && card.controller === playerId) {
        tapCard(card.instanceId, tapped);
      }
    }
    setSelectedIds(new Set());
  }, [selectedIds, playerId, tapCard]);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const hasSelection = selectedIds.size > 0;
  const isMultiDragging = multiDrag !== null;
  const selectedCards = hasSelection ? cards.filter(c => selectedIds.has(c.instanceId)) : undefined;

  return (
    <div
      ref={containerRef}
      data-battlefield
      className={`relative ${heightClass} bg-navy-light/30 rounded-xl border border-cyan-dim/30 overflow-hidden`}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
      style={{ userSelect: 'none' }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(100,200,200,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(100,200,200,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Zone label */}
      {label && (
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <span className="text-[10px] text-cream-muted/50 font-semibold uppercase tracking-widest">
            {label}
          </span>
        </div>
      )}

      {/* Cards */}
      {cards.map(card => {
        const isSelected = selectedIds.has(card.instanceId);
        const multiPos = isMultiDragging ? multiDragPositions.get(card.instanceId) : undefined;
        const isLead = multiDrag?.leadId === card.instanceId;
        return (
          <BattlefieldCardComponent
            key={card.instanceId}
            card={card}
            containerRef={containerRef}
            isSelected={isSelected}
            onClearSelection={() => setSelectedIds(new Set())}
            selectedCards={isSelected && selectedCards && selectedCards.length > 1 ? selectedCards : undefined}
            onMultiDragStart={isSelected && selectedIds.size > 1 ? onMultiDragStart : undefined}
            multiDragPos={multiPos}
            isMultiDragLead={isLead}
          />
        );
      })}

      {/* Marquee selection rectangle */}
      {marquee && (
        <div
          className="absolute pointer-events-none z-[200]"
          style={{
            left: marquee.left,
            top: marquee.top,
            width: marquee.width,
            height: marquee.height,
            border: '2px dashed rgba(0, 220, 255, 0.7)',
            background: 'rgba(0, 220, 255, 0.06)',
            borderRadius: 4,
          }}
        />
      )}

      {/* Selection action bar */}
      {hasSelection && !marquee && !isMultiDragging && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 pointer-events-auto"
          onPointerDown={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 bg-navy/95 border border-cyan-dim/60 rounded-xl px-3 py-1.5 shadow-2xl backdrop-blur-sm">
            <span className="text-cream-muted text-[11px] mr-1">
              {selectedIds.size} selected
            </span>
            <button
              onClick={() => tapSelected(true)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan/20 hover:bg-cyan/35 border border-cyan-dim text-cyan transition-colors"
            >
              Tap
            </button>
            <button
              onClick={() => tapSelected(false)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-navy-light hover:bg-navy border border-cyan-dim text-cream-muted hover:text-cream transition-colors"
            >
              Untap
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[11px] px-2 py-1 rounded-lg hover:bg-red-900/30 text-cream-muted/60 hover:text-red-400 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Empty hint */}
      {cards.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-cream-muted/20 text-sm">battlefield</p>
        </div>
      )}
    </div>
  );
}
