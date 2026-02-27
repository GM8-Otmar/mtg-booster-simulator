/**
 * DiceRollerModal — dice roller with d4/d6/d8/d10/d12/d20/d100 options.
 * Animates a cycling random number for ~600ms before landing on the result.
 * Calls rollDice(faces, result) from context on final result.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameTable } from '../../contexts/GameTableContext';

interface DiceRollerModalProps {
  onClose: () => void;
}

const DICE_OPTIONS = [4, 6, 8, 10, 12, 20, 100];

export default function DiceRollerModal({ onClose }: DiceRollerModalProps) {
  const { rollDice } = useGameTable();

  const [selectedFaces, setSelectedFaces] = useState(20);
  const [displayNumber, setDisplayNumber] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [finalResult, setFinalResult] = useState<number | null>(null);

  const animFrameRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rollEndRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (rollEndRef.current) clearTimeout(rollEndRef.current);
    };
  }, []);

  const handleRoll = useCallback(() => {
    if (isRolling) return;
    setIsRolling(true);
    setFinalResult(null);

    const result = Math.floor(Math.random() * selectedFaces) + 1;

    // Animate cycling numbers for 600ms
    animFrameRef.current = setInterval(() => {
      setDisplayNumber(Math.floor(Math.random() * selectedFaces) + 1);
    }, 60);

    rollEndRef.current = setTimeout(() => {
      if (animFrameRef.current) clearInterval(animFrameRef.current);
      animFrameRef.current = null;
      setDisplayNumber(result);
      setFinalResult(result);
      setIsRolling(false);
      rollDice(selectedFaces, result);
    }, 600);
  }, [isRolling, selectedFaces, rollDice]);

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
          <h2 className="font-bold text-cream text-sm">Roll Dice</h2>
          <button
            onClick={onClose}
            className="text-cream-muted hover:text-cream transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">

          {/* Die selector */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-cream-muted/50 mb-2">Select Die</p>
            <div className="flex flex-wrap gap-1.5">
              {DICE_OPTIONS.map(faces => (
                <button
                  key={faces}
                  onClick={() => { setSelectedFaces(faces); setDisplayNumber(null); setFinalResult(null); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                    selectedFaces === faces
                      ? 'bg-amber-500/30 border-amber-400 text-amber-300'
                      : 'bg-navy-light border-cyan-dim/40 text-cream-muted hover:border-cyan-dim hover:text-cream'
                  }`}
                >
                  d{faces}
                </button>
              ))}
            </div>
          </div>

          {/* Result display */}
          <div className="flex items-center justify-center min-h-[80px]">
            {displayNumber !== null ? (
              <span
                className={`font-mono font-bold text-6xl transition-colors ${
                  finalResult !== null
                    ? finalResult === selectedFaces
                      ? 'text-green-300'
                      : finalResult === 1
                      ? 'text-red-400'
                      : 'text-cyan'
                    : 'text-cream-muted/60'
                } ${isRolling ? 'animate-pulse' : ''}`}
              >
                {displayNumber}
              </span>
            ) : (
              <span className="text-cream-muted/30 text-sm italic">
                Press Roll to roll a d{selectedFaces}
              </span>
            )}
          </div>

          {/* Natural max / min labels */}
          {finalResult !== null && (
            <div className="text-center text-xs">
              {finalResult === selectedFaces && (
                <span className="text-green-300 font-bold">Natural {selectedFaces}!</span>
              )}
              {finalResult === 1 && (
                <span className="text-red-400 font-bold">Natural 1!</span>
              )}
            </div>
          )}

          {/* Roll button */}
          <button
            onClick={handleRoll}
            disabled={isRolling}
            className={`w-full py-2.5 rounded-xl text-sm font-bold border transition-all ${
              isRolling
                ? 'bg-amber-600/20 border-amber-600/40 text-amber-400/50 cursor-not-allowed'
                : 'bg-amber-500/25 hover:bg-amber-500/40 border-amber-500/60 text-amber-300 hover:text-amber-200'
            }`}
          >
            {isRolling ? 'Rolling…' : `Roll d${selectedFaces}`}
          </button>
        </div>
      </div>
    </div>
  );
}
