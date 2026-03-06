/**
 * DeckContextMenu — right-click context menu for the library deck.
 * Provides Shuffle, Draw, Find, Scry/Surveil options.
 */
import { useState, useEffect, useRef, useLayoutEffect } from 'react';

interface DeckContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onShuffle: () => void;
  onDraw: () => void;
  onFind: () => void;
  onScry: (count: number, mode: 'scry' | 'surveil') => void;
  libraryCount: number;
}

export default function DeckContextMenu({
  x, y, onClose, onShuffle, onDraw, onFind, onScry, libraryCount,
}: DeckContextMenuProps) {
  const [scryCount, setScryCount] = useState(1);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  // Viewport clamping
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let nx = x, ny = y;
    if (x + rect.width > window.innerWidth - 8) nx = window.innerWidth - rect.width - 8;
    if (y + rect.height > window.innerHeight - 8) ny = window.innerHeight - rect.height - 8;
    if (nx < 4) nx = 4;
    if (ny < 4) ny = 4;
    setPos({ x: nx, y: ny });
  }, [x, y]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const btnClass = "w-full text-left px-3 py-1.5 text-xs hover:bg-cyan-dim/30 text-cream transition-colors flex items-center justify-between gap-2";
  const disabled = libraryCount === 0;

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-navy border border-cyan-dim/60 rounded-xl shadow-2xl py-1.5 w-52 overflow-hidden"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Shuffle */}
      <button className={btnClass} onClick={() => { onShuffle(); onClose(); }}>
        <span>Shuffle</span>
        <span className="text-cream-muted/40 text-[10px] font-mono">V</span>
      </button>

      {/* Draw */}
      <button
        className={btnClass}
        disabled={disabled}
        onClick={() => { onDraw(); onClose(); }}
        style={{ opacity: disabled ? 0.4 : 1 }}
      >
        <span>Draw</span>
        <span className="text-cream-muted/40 text-[10px] font-mono">C</span>
      </button>

      {/* Find */}
      <button
        className={btnClass}
        disabled={disabled}
        onClick={() => { onFind(); onClose(); }}
        style={{ opacity: disabled ? 0.4 : 1 }}
      >
        <span>Find</span>
        <span className="text-cream-muted/40 text-[10px] font-mono">F</span>
      </button>

      {/* Divider */}
      <div className="border-t border-cyan-dim/20 my-1" />

      {/* Scry / Surveil with counter */}
      <div className="px-3 py-1.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-cream-muted uppercase tracking-wider">Scry / Surveil</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setScryCount(c => Math.max(1, c - 1))}
              className="w-5 h-5 rounded bg-navy-light border border-cyan-dim/40 text-cream-muted text-xs flex items-center justify-center hover:text-cream transition-colors"
            >
              {'\u2212'}
            </button>
            <span className="text-xs font-mono font-bold text-cream w-4 text-center">{scryCount}</span>
            <button
              onClick={() => setScryCount(c => Math.min(10, c + 1))}
              className="w-5 h-5 rounded bg-navy-light border border-cyan-dim/40 text-cream-muted text-xs flex items-center justify-center hover:text-cream transition-colors"
            >
              +
            </button>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            disabled={disabled}
            onClick={() => { onScry(scryCount, 'scry'); onClose(); }}
            className="flex-1 text-xs py-1 bg-cyan/15 hover:bg-cyan/25 border border-cyan-dim/50 rounded-lg text-cyan disabled:opacity-40 transition-all"
          >
            Scry {scryCount}
          </button>
          <button
            disabled={disabled}
            onClick={() => { onScry(scryCount, 'surveil'); onClose(); }}
            className="flex-1 text-xs py-1 bg-magenta/10 hover:bg-magenta/20 border border-magenta/30 rounded-lg text-magenta/70 disabled:opacity-40 transition-all"
          >
            Surveil {scryCount}
          </button>
        </div>
      </div>
    </div>
  );
}
