/**
 * CardHoverPreview — shows a large card image near the cursor when hovering any card.
 * Uses a React portal so it renders above everything, positioned next to the mouse.
 *
 * Usage:
 *   import { useCardPreview } from './CardHoverPreview';
 *   const { onMouseEnter, onMouseLeave, onMouseMove } = useCardPreview(card.imageUri, card.name);
 *   <div {...{ onMouseEnter, onMouseLeave, onMouseMove }} />
 *
 * Mount <CardHoverPreview /> once at the root of the game table.
 */
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

// ── Context ───────────────────────────────────────────────────────────────────

interface PreviewState {
  imageUri: string | null;
  name: string;
  x: number;
  y: number;
}

interface CardPreviewCtx {
  show: (imageUri: string | null, name: string, x: number, y: number) => void;
  move: (x: number, y: number) => void;
  hide: () => void;
}

const CardPreviewContext = createContext<CardPreviewCtx>({
  show: () => {},
  move: () => {},
  hide: () => {},
});

// ── Provider (mount once inside GameTablePage) ────────────────────────────────

export function CardPreviewProvider({ children }: { children: React.ReactNode }) {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((imageUri: string | null, name: string, x: number, y: number) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setPreview({ imageUri, name, x, y });
  }, []);

  const move = useCallback((x: number, y: number) => {
    setPreview(prev => prev ? { ...prev, x, y } : prev);
  }, []);

  const hide = useCallback(() => {
    // small delay prevents flicker when moving between cards
    hideTimer.current = setTimeout(() => setPreview(null), 80);
  }, []);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  return (
    <CardPreviewContext.Provider value={{ show, move, hide }}>
      {children}
      {preview && createPortal(
        <HoverCard preview={preview} />,
        document.body,
      )}
    </CardPreviewContext.Provider>
  );
}

// ── Floating card image ───────────────────────────────────────────────────────

const CARD_W = 220;   // px — standard card ratio ≈ 63×88mm → 220×308
const CARD_H = 308;
const OFFSET_X = 16;  // px right of cursor
const OFFSET_Y = -60; // px above cursor centre

function HoverCard({ preview }: { preview: PreviewState }) {
  const { x, y } = preview;

  // Clamp so the card stays inside the viewport
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = x + OFFSET_X;
  let top  = y + OFFSET_Y;
  if (left + CARD_W > vw - 8) left = x - CARD_W - OFFSET_X;
  if (top + CARD_H > vh - 8)  top  = vh - CARD_H - 8;
  if (top < 8)                 top  = 8;

  return (
    <div
      className="fixed z-[9000] pointer-events-none"
      style={{ left, top, width: CARD_W, height: CARD_H }}
    >
      {preview.imageUri ? (
        <img
          src={preview.imageUri}
          alt={preview.name}
          className="w-full h-full rounded-xl shadow-2xl"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06)' }}
          draggable={false}
        />
      ) : (
        /* Fallback: just name on dark background */
        <div
          className="w-full h-full rounded-xl bg-navy-light border border-cyan-dim/40 flex items-center justify-center p-4"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.85)' }}
        >
          <span className="text-cream text-sm text-center font-semibold leading-snug">
            {preview.name}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Hook — use inside any card component ──────────────────────────────────────

export function useCardPreview(imageUri: string | null | undefined, name: string) {
  const { show, move, hide } = useContext(CardPreviewContext);

  const onMouseEnter = useCallback((e: React.MouseEvent) => {
    show(imageUri ?? null, name, e.clientX, e.clientY);
  }, [show, imageUri, name]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    move(e.clientX, e.clientY);
  }, [move]);

  const onMouseLeave = useCallback(() => {
    hide();
  }, [hide]);

  return { onMouseEnter, onMouseMove, onMouseLeave };
}
