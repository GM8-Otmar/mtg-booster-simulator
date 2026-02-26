import { useRef, useState, useCallback, useEffect } from 'react';
import type { BattlefieldCard as BFCard } from '../../types/game';
import { useGameTable } from '../../contexts/GameTableContext';
import CardContextMenu from './CardContextMenu';
import { useCardInspector } from './CardInspectorPanel';

interface BattlefieldCardProps {
  card: BFCard;
  /** percentage-based battlefield size (passed from parent) */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const CARD_W_PX = 80;
const CARD_H_PX = 112;

export default function BattlefieldCard({ card, containerRef }: BattlefieldCardProps) {
  const { moveCard, tapCard, playerId } = useGameTable();
  const { inspect } = useCardInspector();

  // Context menu
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  // Drag state — all in refs for zero stale-closure issues
  const draggingRef = useRef(false);
  const pressedRef = useRef(false); // true only after pointerdown on this card
  const startClientRef = useRef({ x: 0, y: 0 });
  const startPctRef = useRef({ x: card.x, y: card.y });
  const lastEmitPctRef = useRef({ x: card.x, y: card.y });
  const movedRef = useRef(false);

  const isOwner = card.controller === playerId;
  const isFaceDown = card.faceDown;

  // Convert percentage coords → pixel offset within container
  const pctToStyle = (pctX: number, pctY: number) => ({
    left: `calc(${pctX}% - ${CARD_W_PX / 2}px)`,
    top: `calc(${pctY}% - ${CARD_H_PX / 2}px)`,
  });

  const [visualPos, setVisualPos] = useState({ x: card.x, y: card.y });

  // Sync visual position with authoritative server position (unless dragging)
  useEffect(() => {
    if (!draggingRef.current) {
      setVisualPos({ x: card.x, y: card.y });
    }
  }, [card.x, card.y]);

  // ── Pointer handlers ────────────────────────────────────────────────────

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 2 || !isOwner) return; // right-click handled separately
    e.stopPropagation();

    draggingRef.current = false; // will flip to true on first move
    pressedRef.current = true;
    movedRef.current = false;
    startClientRef.current = { x: e.clientX, y: e.clientY };
    startPctRef.current = { x: card.x, y: card.y };
    lastEmitPctRef.current = { x: card.x, y: card.y };
  }, [card.x, card.y, isOwner]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isOwner || !pressedRef.current) return;
    const dx = e.clientX - startClientRef.current.x;
    const dy = e.clientY - startClientRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (!draggingRef.current && dist < 4) return;

    draggingRef.current = true;
    movedRef.current = true;
    e.stopPropagation();

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const newX = ((e.clientX - rect.left) / rect.width) * 100;
    const newY = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(0, Math.min(100, newX));
    const clampedY = Math.max(0, Math.min(100, newY));

    setVisualPos({ x: clampedX, y: clampedY });

    // Throttle relay: only emit if moved ≥ 1%
    const lastE = lastEmitPctRef.current;
    if (Math.abs(clampedX - lastE.x) >= 1 || Math.abs(clampedY - lastE.y) >= 1) {
      moveCard(card.instanceId, clampedX, clampedY, false);
      lastEmitPctRef.current = { x: clampedX, y: clampedY };
    }
  }, [card.instanceId, containerRef, moveCard, isOwner]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isOwner) return;
    if (draggingRef.current) {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const finalX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const finalY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        moveCard(card.instanceId, finalX, finalY, true); // persist
        setVisualPos({ x: finalX, y: finalY });
      }
    } else {
      // Single click (no drag) → inspect
      if (!movedRef.current) {
        inspect({ name: card.name, imageUri: isFaceDown ? null : card.imageUri, instanceId: card.instanceId });
      }
    }
    draggingRef.current = false;
    pressedRef.current = false;
  }, [card.instanceId, card.name, card.imageUri, containerRef, moveCard, isOwner, inspect, isFaceDown]);

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

  // ── Counter badge ────────────────────────────────────────────────────────

  const totalPP = card.counters
    .filter(c => c.type === 'plus1plus1')
    .reduce((s, c) => s + c.value, 0);
  const totalMM = card.counters
    .filter(c => c.type === 'minus1minus1')
    .reduce((s, c) => s + c.value, 0);
  const loyalty = card.counters.find(c => c.type === 'loyalty')?.value ?? null;
  const charge = card.counters.find(c => c.type === 'charge')?.value ?? null;

  const borderColor = isOwner ? 'border-cyan/40' : 'border-magenta/40';

  return (
    <>
      <div
        className={`absolute select-none cursor-pointer`}
        style={{
          ...pctToStyle(visualPos.x, visualPos.y),
          width: CARD_W_PX,
          height: CARD_H_PX,
          transform: card.tapped ? 'rotate(90deg)' : undefined,
          transition: draggingRef.current ? 'none' : 'transform 0.15s ease',
          zIndex: draggingRef.current ? 50 : 10,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { draggingRef.current = false; pressedRef.current = false; }}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      >
        {/* Card image or face-down back */}
        <div className={`w-full h-full rounded-lg overflow-hidden border-2 ${borderColor} shadow-lg`}>
          {isFaceDown ? (
            <div className="w-full h-full bg-navy-light flex items-center justify-center rounded-lg">
              <div className="w-full h-full bg-gradient-to-br from-navy-light to-navy flex items-center justify-center">
                <span className="text-2xl opacity-30">🃏</span>
              </div>
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

        {/* Commander star */}
        {card.isCommander && (
          <div className="absolute -top-2 -right-2 bg-magenta rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-md z-20">
            ★
          </div>
        )}

        {/* Counter badges */}
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

        {/* Tap overlay */}
        {card.tapped && (
          <div className="absolute inset-0 rounded-lg ring-2 ring-yellow-400/50 pointer-events-none" />
        )}
      </div>

      {/* Context menu portal */}
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
