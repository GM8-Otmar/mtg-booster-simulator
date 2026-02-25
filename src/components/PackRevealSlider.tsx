import { useState, useEffect, useRef, useCallback } from 'react';
import { getCardImageUrl } from '../types/card';
import type { ScryfallCard } from '../types/card';

interface PackRevealSliderProps {
  cards: ScryfallCard[];
  onCurrentCardChange?: (card: ScryfallCard | null) => void;
}

// Rarity of incoming card determines the flash colour on reveal
const REVEAL_FLASH: Record<string, string> = {
  mythic: 'rgba(255,0,128,0.18)',
  rare:   'rgba(0,255,255,0.13)',
  special:'rgba(255,0,128,0.18)',
};

function MiniCard({ card, className = '' }: { card: ScryfallCard; className?: string }) {
  const url = getCardImageUrl(card, 'normal');
  return (
    <div className={`w-[140px] h-[196px] rounded-lg overflow-hidden shadow-xl border-2 border-cyan-dim bg-navy-light ${className}`}>
      {url ? (
        <img src={url} alt={card.name} className="w-full h-full object-cover pointer-events-none" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-cream-muted text-xs p-2 pointer-events-none">{card.name}</div>
      )}
    </div>
  );
}

export function PackRevealSlider({ cards, onCurrentCardChange }: PackRevealSliderProps) {
  const [index, setIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Flip animation state: 'idle' | 'flipping'
  const [flipState, setFlipState] = useState<'idle' | 'flipping'>('idle');
  // Flash overlay for mythic/rare reveals
  const [flashColor, setFlashColor] = useState<string | null>(null);

  // Stable refs so pointer handlers have zero deps and never go stale
  const indexRef = useRef(index);
  const cardsLenRef = useRef(cards.length);
  const cardsRef = useRef(cards);
  const dragOffsetRef = useRef(0);
  const dragStartXRef = useRef<number | null>(null);
  const ripZoneRef = useRef<HTMLDivElement | null>(null);
  const flipInFlight = useRef(false);

  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { cardsLenRef.current = cards.length; cardsRef.current = cards; }, [cards]);

  // Reset to card 0 only when the pack itself changes (stable ID string dep)
  const cardIdKey = cards.map(c => c.id).join(',');
  useEffect(() => {
    setIndex(0);
    setFlipState('idle');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardIdKey]);

  // Notify parent whenever current card changes
  useEffect(() => {
    onCurrentCardChange?.(cards[index] ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, cardIdKey]);

  // Animate flip then commit index change
  const navigateTo = useCallback((next: number) => {
    if (flipInFlight.current) return;
    const target = Math.max(0, Math.min(cardsLenRef.current - 1, next));
    if (target === indexRef.current) return;

    flipInFlight.current = true;
    setFlipState('flipping');

    setTimeout(() => {
      setIndex(target);
      const card = cardsRef.current[target];
      if (card) {
        const fc = REVEAL_FLASH[card.rarity] ?? null;
        setFlashColor(fc);
        if (fc) setTimeout(() => setFlashColor(null), 400);
      }
      setFlipState('idle');
      flipInFlight.current = false;
    }, 160); // half-flip duration
  }, []);

  const goPrev = useCallback(() => navigateTo(indexRef.current - 1), [navigateTo]);
  const goNext = useCallback(() => navigateTo(indexRef.current + 1), [navigateTo]);

  // Keyboard nav
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

  // Pointer handlers — all via refs, zero stale closures
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStartXRef.current = e.clientX;
    dragOffsetRef.current = 0;
    ripZoneRef.current?.setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartXRef.current === null) return;
    const dx = e.clientX - dragStartXRef.current;
    dragOffsetRef.current = dx;
    setDragOffset(dx);
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragStartXRef.current === null) return;
    const dx = dragOffsetRef.current;
    const threshold = 50;

    if (dx < -threshold) goNext();
    else if (dx > threshold) goPrev();
    else if (Math.abs(dx) < 10) {
      const rect = ripZoneRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const w = rect.width;
        if (x < w / 3) goPrev();
        else if (x > (2 * w) / 3) goNext();
      }
    }

    setDragOffset(0);
    dragOffsetRef.current = 0;
    dragStartXRef.current = null;
  }, [goPrev, goNext]);

  const handlePointerCancel = useCallback(() => {
    setDragOffset(0);
    dragOffsetRef.current = 0;
    dragStartXRef.current = null;
  }, []);

  if (cards.length === 0) return null;

  const prevCard = index > 0 ? cards[index - 1]! : null;
  const nextCard = index < cards.length - 1 ? cards[index + 1]! : null;
  const current = cards[index]!;
  const ripOffset = dragOffset * 0.5;

  const isMythicOrRare = current.rarity === 'mythic' || current.rarity === 'rare';

  return (
    <div className="relative w-full max-w-3xl mx-auto select-none">
      <p className="text-center text-cream-muted text-sm mb-3">
        Swipe or use arrow keys · Card {index + 1} of {cards.length}
      </p>

      {/* Rip zone — owns the full pointer stream */}
      <div
        ref={el => { ripZoneRef.current = el; }}
        className="relative flex items-center justify-center min-h-[340px] touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerCancel}
        onPointerCancel={handlePointerCancel}
      >
        <div className="relative flex items-center justify-center gap-2 pointer-events-none">
          {/* Previous card */}
          {prevCard && (
            <div
              className="shrink-0 transition-transform duration-150"
              style={{ transform: `translateX(${ripOffset}px) scale(0.72)`, opacity: 0.9 }}
            >
              <MiniCard card={prevCard} />
            </div>
          )}

          {/* Current card with flip animation */}
          <div
            className="shrink-0"
            style={{
              transform: `translateX(${ripOffset}px)`,
              perspective: '800px',
            }}
          >
            <div
              style={{
                width: 223,
                height: 311,
                transformStyle: 'preserve-3d',
                transform: flipState === 'flipping' ? 'rotateY(90deg)' : 'rotateY(0deg)',
                transition: flipState === 'flipping'
                  ? 'transform 0.16s ease-in'
                  : 'transform 0.16s ease-out',
              }}
            >
              <div
                className={`
                  absolute inset-0 rounded-xl overflow-hidden shadow-2xl
                  ${isMythicOrRare ? (current.rarity === 'mythic' ? 'ring-2 ring-magenta' : 'ring-2 ring-cyan') : 'ring-2 ring-cyan/50'}
                `}
                style={{ backfaceVisibility: 'hidden' }}
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
          </div>

          {/* Next card */}
          {nextCard && (
            <div
              className="shrink-0 transition-transform duration-150"
              style={{ transform: `translateX(${ripOffset}px) scale(0.72)`, opacity: 0.9 }}
            >
              <MiniCard card={nextCard} />
            </div>
          )}
        </div>

        {/* Mythic/rare reveal flash */}
        {flashColor && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, ${flashColor} 0%, transparent 70%)`,
              animation: 'none',
              opacity: 1,
              transition: 'opacity 0.4s ease-out',
            }}
          />
        )}
      </div>

      {/* Card name + rarity label under slider */}
      <div className="text-center mt-2 mb-1 h-5">
        {current.rarity === 'mythic' && (
          <span className="text-magenta text-sm font-bold tracking-wide animate-pulse">✦ Mythic Rare ✦</span>
        )}
        {current.rarity === 'rare' && (
          <span className="text-cyan text-sm font-semibold">◆ Rare</span>
        )}
      </div>

      {/* Dot nav */}
      <div className="flex justify-center gap-2 mt-3 flex-wrap">
        {cards.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => navigateTo(i)}
            className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-cyan' : 'w-2 bg-cyan-dim hover:bg-cyan-dim/80'}`}
            aria-label={`Go to card ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
