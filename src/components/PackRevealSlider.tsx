import { useState, useEffect, useCallback, useRef } from 'react';
import { getCardImageUrl } from '../types/card';
import type { ScryfallCard } from '../types/card';

interface PackRevealSliderProps {
  cards: ScryfallCard[];
  onCardHover?: (card: ScryfallCard | null) => void;
  onCurrentCardChange?: (card: ScryfallCard | null) => void;
}

function MiniCard({ card, className = '' }: { card: ScryfallCard; className?: string }) {
  const url = getCardImageUrl(card, 'normal');
  return (
    <div className={`w-[140px] h-[196px] rounded-lg overflow-hidden shadow-xl border-2 border-cyan-dim bg-navy-light ${className}`}>
      {url ? (
        <img src={url} alt={card.name} className="w-full h-full object-cover pointer-events-none" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-cream-muted text-xs p-2">{card.name}</div>
      )}
    </div>
  );
}

export function PackRevealSlider({ cards, onCardHover, onCurrentCardChange }: PackRevealSliderProps) {
  const [index, setIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartRef = useRef<{ x: number; startIndex: number; target: EventTarget | null } | null>(null);
  const ripZoneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIndex(0);
  }, [cards]);

  const currentCard = cards[index] ?? null;
  useEffect(() => {
    onCardHover?.(currentCard);
    onCurrentCardChange?.(currentCard);
  }, [index, cards, currentCard, onCardHover, onCurrentCardChange]);

  const goPrev = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setIndex(i => Math.min(cards.length - 1, i + 1)), [cards.length]);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goPrev, goNext]);

  // Swipe/drag to "rip" through pack; tap left/right to flip
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragStartRef.current = { x: e.clientX, startIndex: index, target: e.target };
      ripZoneRef.current?.setPointerCapture?.(e.pointerId);
    },
    [index]
  );
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    setDragOffset(dx);
  }, []);
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = dragOffset;
      const threshold = 50;
      const startTarget = dragStartRef.current.target as HTMLElement | null;
      if (dx < -threshold) goNext();
      else if (dx > threshold) goPrev();
      else if (Math.abs(dx) < 10) {
        // Tap: zone-based or card-based
        const hitPrev = startTarget?.closest('[data-prev-card]');
        const hitNext = startTarget?.closest('[data-next-card]');
        if (hitPrev && index > 0) goPrev();
        else if (hitNext && index < cards.length - 1) goNext();
        else {
          const rect = ripZoneRef.current?.getBoundingClientRect();
          if (rect) {
            const x = e.clientX - rect.left;
            const w = rect.width;
            if (x < w / 3 && index > 0) goPrev();
            else if (x > (2 * w) / 3 && index < cards.length - 1) goNext();
          }
        }
      }
      setDragOffset(0);
      dragStartRef.current = null;
    },
    [dragOffset, goPrev, goNext, index, cards.length]
  );
  const handlePointerCancel = useCallback(() => {
    setDragOffset(0);
    dragStartRef.current = null;
  }, []);

  if (cards.length === 0) return null;

  const prevCard = index > 0 ? cards[index - 1]! : null;
  const nextCard = index < cards.length - 1 ? cards[index + 1]! : null;
  const current = cards[index]!;

  const ripOffset = dragOffset * 0.5;

  return (
    <div className="relative w-full max-w-3xl mx-auto select-none">
      <p className="text-center text-cream-muted text-sm mb-3">
        Swipe or drag to rip through the pack · Card {index + 1} of {cards.length}
      </p>

      {/* Main rip zone - tap left/right to flip, drag to swipe */}
      <div
        ref={el => { ripZoneRef.current = el; }}
        className="relative flex items-center justify-center min-h-[340px] touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerCancel}
        onPointerCancel={handlePointerCancel}
      >
        {/* Card stack: prev | current | next */}
        <div className="relative flex items-center justify-center gap-2">
          {/* Previous card - left */}
          {prevCard && (
            <div
              data-prev-card
              className="shrink-0 transition-transform duration-150 cursor-pointer"
              style={{
                transform: `translateX(${ripOffset}px) scale(0.72)`,
                opacity: 0.9,
              }}
              onMouseEnter={() => onCardHover?.(prevCard)}
              onClick={() => goPrev()}
            >
              <MiniCard card={prevCard} />
            </div>
          )}

          {/* Current card - center */}
          <div
            className="relative shrink-0 transition-transform duration-150"
            style={{ transform: `translateX(${ripOffset}px)` }}
            onMouseEnter={() => onCardHover?.(current)}
          >
            <div
              className="relative rounded-xl overflow-hidden shadow-2xl ring-2 ring-cyan/50"
              style={{ width: 223, height: 311 }}
            >
              {getCardImageUrl(current, 'normal') ? (
                <img
                  src={getCardImageUrl(current, 'normal')!}
                  alt={current.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-navy-light flex items-center justify-center text-cream-muted text-sm p-4">
                  {current.name}
                </div>
              )}
              {current.isFoilPull && (
                <div className="absolute top-2 right-2 bg-magenta text-cream text-xs font-bold px-2 py-1 rounded-full">
                  FOIL
                </div>
              )}
            </div>
          </div>

          {/* Next card - right */}
          {nextCard && (
            <div
              data-next-card
              className="shrink-0 transition-transform duration-150 cursor-pointer"
              style={{
                transform: `translateX(${ripOffset}px) scale(0.72)`,
                opacity: 0.9,
              }}
              onMouseEnter={() => onCardHover?.(nextCard)}
              onClick={() => goNext()}
            >
              <MiniCard card={nextCard} />
            </div>
          )}
        </div>
      </div>

      {/* Dot nav - below */}
      <div className="flex justify-center gap-2 mt-6 flex-wrap">
        {cards.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-cyan' : 'w-2 bg-cyan-dim hover:bg-cyan-dim/80'}`}
            aria-label={`Go to card ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
