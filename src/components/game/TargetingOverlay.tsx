/**
 * TargetingOverlay — full-viewport SVG overlay for rendering targeting arrows.
 *
 * Renders arrows between any two elements on screen (cards in different zones,
 * cards to players, etc.) using DOM queries + getBoundingClientRect().
 * This solves the cross-zone arrow problem where BattlefieldZone could only
 * render arrows between cards within its own zone.
 */
import { useState, useEffect } from 'react';
import { useGameTable } from '../../contexts/GameTableContext';

export default function TargetingOverlay() {
  const { targetingArrows, dismissArrow } = useGameTable();
  const [, setTick] = useState(0);

  // Re-render periodically while arrows exist to track card movements
  useEffect(() => {
    if (targetingArrows.length === 0) return;
    const id = setInterval(() => setTick(t => t + 1), 100);
    return () => clearInterval(id);
  }, [targetingArrows.length]);

  if (targetingArrows.length === 0) return null;

  return (
    <svg
      className="fixed inset-0 z-[150] pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    >
      <defs>
        <marker
          id="target-arrow-tip"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 Z" fill="rgba(239, 68, 68, 0.85)" />
        </marker>
      </defs>

      {targetingArrows.map(arrow => {
        // Find source element — card or player
        const fromEl =
          document.querySelector(`[data-instance-id="${arrow.fromId}"]`) ??
          document.querySelector(`[data-player-id="${arrow.fromId}"]`);
        const toEl =
          document.querySelector(`[data-instance-id="${arrow.toId}"]`) ??
          document.querySelector(`[data-player-id="${arrow.toId}"]`);

        if (!fromEl || !toEl) return null;

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        const x1 = fromRect.left + fromRect.width / 2;
        const y1 = fromRect.top + fromRect.height / 2;
        const x2 = toRect.left + toRect.width / 2;
        const y2 = toRect.top + toRect.height / 2;

        return (
          <line
            key={arrow.id}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(239, 68, 68, 0.7)"
            strokeWidth="3"
            strokeLinecap="round"
            markerEnd="url(#target-arrow-tip)"
            style={{
              pointerEvents: 'stroke',
              cursor: 'pointer',
              animation: 'arrow-fade 5s ease-out forwards',
            }}
            onClick={() => dismissArrow(arrow.id)}
          />
        );
      })}
    </svg>
  );
}
