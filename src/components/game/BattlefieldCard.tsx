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
}

const CARD_W_PX = 80;
const CARD_H_PX = 112;

export default function BattlefieldCard({ card, containerRef, isSelected, onClearSelection }: BattlefieldCardProps) {
  const { moveCard, tapCard, changeZone, playerId } = useGameTable();
  const { inspect } = useCardInspector();

  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // isPressed triggers window-level listeners — the only way to not lose the card
  const [isPressed, setIsPressed] = useState(false);

  // All drag bookkeeping in refs so window listeners never have stale closures
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const draggingVisuallyRef = useRef(false);
  const startClientRef = useRef({ x: 0, y: 0 });
  const lastEmitPctRef = useRef({ x: card.x, y: card.y });
  const dragOriginRef = useRef({ x: card.x, y: card.y });

  const isOwner = card.controller === playerId;
  const isFaceDown = card.faceDown;

  const pctToStyle = (pctX: number, pctY: number) => ({
    left: `calc(${pctX}% - ${CARD_W_PX / 2}px)`,
    top: `calc(${pctY}% - ${CARD_H_PX / 2}px)`,
  });

  const [visualPos, setVisualPos] = useState({ x: card.x, y: card.y });

  // Keep visual pos synced with server when not dragging
  useEffect(() => {
    if (!draggingRef.current) {
      setVisualPos({ x: card.x, y: card.y });
    }
  }, [card.x, card.y]);

  // ── Pointer down (on element) ────────────────────────────────────────────

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 2 || !isOwner) return;
    e.stopPropagation();
    // Clicking a card clears any active marquee selection
    onClearSelection?.();
    draggingRef.current = false;
    movedRef.current = false;
    draggingVisuallyRef.current = false;
    startClientRef.current = { x: e.clientX, y: e.clientY };
    lastEmitPctRef.current = { x: card.x, y: card.y };
    dragOriginRef.current = { x: card.x, y: card.y };
    setIsPressed(true);
  }, [card.x, card.y, isOwner, onClearSelection]);

  // ── Window-level listeners — active for the full duration of a press ─────
  // This is the key fix: the card never "loses" the pointer even at high speed.

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
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (!draggingRef.current && dist < 4) return;

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

      // Highlight any drop zone under the cursor
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
        // Check for a zone drop target anywhere on screen
        const hits = document.elementsFromPoint(e.clientX, e.clientY);
        const zoneEl = hits.find(el => (el as HTMLElement).dataset?.dropZone) as HTMLElement | undefined;

        if (zoneEl) {
          changeZone(card.instanceId, zoneEl.dataset.dropZone as GameZone);
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

  // ── Counter badges ────────────────────────────────────────────────────────

  const totalPP = card.counters.filter(c => c.type === 'plus1plus1').reduce((s, c) => s + c.value, 0);
  const totalMM = card.counters.filter(c => c.type === 'minus1minus1').reduce((s, c) => s + c.value, 0);
  const loyalty = card.counters.find(c => c.type === 'loyalty')?.value ?? null;
  const charge = card.counters.find(c => c.type === 'charge')?.value ?? null;

  const borderColor = isOwner ? 'border-cyan/40' : 'border-magenta/40';

  return (
    <>
      {/* Ghost outline at drag origin */}
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
          ...pctToStyle(visualPos.x, visualPos.y),
          width: CARD_W_PX,
          height: CARD_H_PX,
          transform: card.tapped
            ? `rotate(90deg)${isDragging ? ' scale(1.08)' : ''}`
            : isDragging ? 'scale(1.08)' : undefined,
          transition: isDragging ? 'none' : 'transform 0.15s ease',
          zIndex: isDragging ? 50 : 10,
          cursor: isDragging ? 'grabbing' : 'grab',
          boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.65)' : undefined,
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

        {(totalPP !== 0 || totalMM !== 0 || loyalty !== null || charge !== null) && (
          <div className="absolute bottom-0 left-0 right-0 flex gap-1 justify-center pb-1 flex-wrap z-20">
            {totalPP !== 0 && (
              <span className="bg-green-600 text-white text-[9px] font-bold rounded-full px-1.5 shadow">
                +{totalPP}/+{totalPP}
              </span>
            )}
            {totalMM !== 0 && (
              <span className="bg-red-700 text-white text-[9px] font-bold rounded-full px-1.5 shadow">
                −{totalMM}/−{totalMM}
              </span>
            )}
            {loyalty !== null && (
              <span className="bg-blue-600 text-white text-[9px] font-bold rounded-full px-1.5 shadow">
                👁 {loyalty}
              </span>
            )}
            {charge !== null && (
              <span className="bg-yellow-600 text-white text-[9px] font-bold rounded-full px-1.5 shadow">
                ⚡{charge}
              </span>
            )}
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
        />
      )}
    </>
  );
}
