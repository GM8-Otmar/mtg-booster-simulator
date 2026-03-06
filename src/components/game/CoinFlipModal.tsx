/**
 * CoinFlipModal — coin flip with animated cycling result.
 * Mirrors the DiceRollerModal pattern exactly.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameTable } from '../../contexts/GameTableContext';

interface CoinFlipModalProps {
  onClose: () => void;
}

export default function CoinFlipModal({ onClose }: CoinFlipModalProps) {
  const { flipCoin } = useGameTable();

  const [displayValue, setDisplayValue] = useState<string | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [finalResult, setFinalResult] = useState<string | null>(null);

  const animFrameRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flipEndRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) clearInterval(animFrameRef.current);
      if (flipEndRef.current) clearTimeout(flipEndRef.current);
    };
  }, []);

  const handleFlip = useCallback(() => {
    if (isFlipping) return;
    setIsFlipping(true);
    setFinalResult(null);

    const result = Math.random() < 0.5 ? 'heads' : 'tails';

    // Animate cycling between Heads/Tails for 600ms
    let toggle = false;
    animFrameRef.current = setInterval(() => {
      toggle = !toggle;
      setDisplayValue(toggle ? 'Heads' : 'Tails');
    }, 60);

    flipEndRef.current = setTimeout(() => {
      if (animFrameRef.current) clearInterval(animFrameRef.current);
      animFrameRef.current = null;
      const display = result === 'heads' ? 'Heads' : 'Tails';
      setDisplayValue(display);
      setFinalResult(display);
      setIsFlipping(false);
      flipCoin(result);
    }, 600);
  }, [isFlipping, flipCoin]);

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-navy border border-cyan-dim rounded-2xl shadow-2xl w-72 flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-dim/30 shrink-0">
          <h2 className="font-bold text-cream text-sm">Flip a Coin</h2>
          <button
            onClick={onClose}
            className="text-cream-muted hover:text-cream transition-colors text-lg leading-none"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Result display */}
          <div className="flex items-center justify-center min-h-[100px]">
            {displayValue !== null ? (
              <div className="flex flex-col items-center gap-2">
                <span className="text-5xl">
                  {finalResult === 'Heads' ? '\uD83E\uDE99' : finalResult === 'Tails' ? '\uD83D\uDD19' : isFlipping ? '\uD83E\uDE99' : ''}
                </span>
                <span
                  className={`font-mono font-bold text-3xl transition-colors ${
                    finalResult !== null
                      ? finalResult === 'Heads'
                        ? 'text-amber-300'
                        : 'text-cyan'
                      : 'text-cream-muted/60'
                  } ${isFlipping ? 'animate-pulse' : ''}`}
                >
                  {displayValue}
                </span>
              </div>
            ) : (
              <span className="text-cream-muted/30 text-sm italic">
                Press Flip to flip a coin
              </span>
            )}
          </div>

          {/* Flip button */}
          <button
            onClick={handleFlip}
            disabled={isFlipping}
            className={`w-full py-2.5 rounded-xl text-sm font-bold border transition-all ${
              isFlipping
                ? 'bg-amber-600/20 border-amber-600/40 text-amber-400/50 cursor-not-allowed'
                : 'bg-amber-500/25 hover:bg-amber-500/40 border-amber-500/60 text-amber-300 hover:text-amber-200'
            }`}
          >
            {isFlipping ? 'Flipping\u2026' : 'Flip Coin'}
          </button>
        </div>
      </div>
    </div>
  );
}
