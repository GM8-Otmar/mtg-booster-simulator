import { useRef, useState, useCallback, useEffect } from 'react';
import type { BattlefieldCard } from '../../types/game';
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

export default function BattlefieldZone({
  cards,
  label,
  heightClass = 'flex-1 min-h-0',
}: BattlefieldZoneProps) {
  const { tapCard, playerId } = useGameTable();
  const containerRef = useRef<HTMLDivElement>(null);

  // Marquee / multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Refs so window listeners never have stale closures
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const isMarqueeingRef = useRef(false); // true once drag threshold crossed
  // Keep cards accessible inside the effect without re-subscribing on every render
  const cardsRef = useRef(cards);
  useEffect(() => { cardsRef.current = cards; }, [cards]);

  // ── Escape clears selection ──────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedIds(new Set());
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Pointer down on empty zone space ────────────────────────────────────
  // Cards call stopPropagation(), so this only fires for genuinely empty clicks.

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    marqueeStartRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    isMarqueeingRef.current = false;
    setIsSelecting(true);
  }, []);

  // ── Window listeners for the marquee drag ────────────────────────────────

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

      // Only engage after a small threshold to avoid accidental micro-drags
      if (width > 6 || height > 6) {
        isMarqueeingRef.current = true;
        setMarquee({ left, top, width, height });

        // Intersect against all cards
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
        // Plain click on empty space → clear selection
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
      {cards.map(card => (
        <BattlefieldCardComponent
          key={card.instanceId}
          card={card}
          containerRef={containerRef}
          isSelected={selectedIds.has(card.instanceId)}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      ))}

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
      {hasSelection && !marquee && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 pointer-events-auto"
          onPointerDown={e => e.stopPropagation()} // don't start a new marquee
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
