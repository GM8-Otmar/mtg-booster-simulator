import { useState } from 'react';
import { getCardImageUrl, getCardPrice, formatPrice } from '../types/card';
import { getCardTreatment } from '../api/scryfall';
import type { ScryfallCard } from '../types/card';

interface CardDisplayProps {
  card: ScryfallCard;
  showPrice?: boolean;
  enableZoom?: boolean;
}

// Rarity colors – Neon Sideboard brand
const rarityStyles: Record<string, string> = {
  common: 'ring-cream-muted',
  uncommon: 'ring-cyan-dim',
  rare: 'ring-cyan',
  mythic: 'ring-magenta',
  special: 'ring-magenta',
  bonus: 'ring-cyan',
};

const rarityGlow: Record<string, string> = {
  common: '',
  uncommon: '',
  rare: 'shadow-cyan/30',
  mythic: 'shadow-magenta/50',
  special: 'shadow-magenta/50',
  bonus: 'shadow-cyan/50',
};

export function CardDisplay({ card, showPrice = true, enableZoom = true }: CardDisplayProps) {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const imageUrl = getCardImageUrl(card, 'normal');
  const zoomImageUrl = getCardImageUrl(card, 'large') || imageUrl;
  const ringColor = rarityStyles[card.rarity] || 'ring-cream-muted';
  const glowEffect = rarityGlow[card.rarity] || '';
  const price = getCardPrice(card);
  const isFoil = card.isFoilPull === true;
  const treatment = getCardTreatment(card);

  // Foil cards get brand accent border
  const foilStyle = isFoil
    ? 'ring-2 ring-offset-2 ring-offset-navy ring-magenta'
    : '';

  const openZoom = () => {
    if (enableZoom) {
      setIsZoomOpen(true);
    }
  };

  const closeZoom = () => setIsZoomOpen(false);

  return (
    <>
      <div className="flex flex-col items-center group">
      <div
        className={`relative rounded-xl ring-2 ${isFoil ? foilStyle : ringColor} ${glowEffect} shadow-xl hover:scale-105 transition-all duration-200 ${enableZoom ? 'cursor-zoom-in' : ''}`}
        role={enableZoom ? 'button' : undefined}
        tabIndex={enableZoom ? 0 : undefined}
        onClick={openZoom}
        onKeyDown={(e) => {
          if (!enableZoom) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openZoom();
          }
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={card.name}
            className={`rounded-xl w-full max-w-[223px] ${isFoil ? 'brightness-110 contrast-105' : ''}`}
            loading="lazy"
          />
        ) : (
          <div className={`w-[223px] h-[311px] bg-navy-light rounded-xl flex items-center justify-center`}>
            <p className="text-cream-muted text-center px-4 text-sm">{card.name}</p>
          </div>
        )}

        {/* Foil indicator */}
        {isFoil && (
          <div className="absolute top-2 right-2 bg-magenta text-cream text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            FOIL
          </div>
        )}
        {/* Booster Fun treatment (Extended Art, Showcase, Borderless) */}
        {treatment && (
          <div className="absolute top-2 left-2 bg-cyan text-navy text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            {treatment}
          </div>
        )}
      </div>

      {/* Price tag */}
      {showPrice && (
        <div className={`mt-2 text-sm font-medium ${price && price >= 1 ? 'text-cyan' : 'text-cream-muted'}`}>
          {formatPrice(price)}
        </div>
      )}
      </div>

      {isZoomOpen && (
        <div
          className="fixed inset-0 z-[100] bg-navy/90 backdrop-blur-sm p-4 flex items-center justify-center"
          onClick={closeZoom}
        >
            <div
            className="bg-navy-light border border-cyan-dim rounded-xl max-w-5xl w-full p-4 md:p-6 grid md:grid-cols-[auto,1fr] gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center">
              {zoomImageUrl ? (
                <img
                  src={zoomImageUrl}
                  alt={card.name}
                  className="rounded-xl w-full max-w-[360px]"
                />
              ) : (
                <div className="w-[360px] h-[500px] bg-navy-light rounded-xl flex items-center justify-center">
                  <p className="text-cream-muted text-center px-4">{card.name}</p>
                </div>
              )}
            </div>

            <div className="text-cream-muted">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-2xl font-bold text-cream">{card.name}</h2>
                  <p className="text-cream-muted text-sm mt-1">
                    {card.set_name} ({card.set.toUpperCase()}) #{card.collector_number}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeZoom}
                  className="px-3 py-1 bg-navy-light hover:bg-navy-light/80 rounded-md text-sm text-cream"
                >
                  Close
                </button>
              </div>

              {card.mana_cost && (
                <p className="text-cyan mb-2 font-medium">{card.mana_cost}</p>
              )}
              <p className="text-cream mb-3">{card.type_line}</p>
              {card.oracle_text && (
                <p className="text-cream-muted whitespace-pre-wrap mb-4">{card.oracle_text}</p>
              )}

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <p><span className="text-cream-muted">Rarity:</span> {card.rarity}</p>
                <p><span className="text-cream-muted">Price:</span> {formatPrice(price)}</p>
                <p><span className="text-cream-muted">Foil Pull:</span> {isFoil ? 'Yes' : 'No'}</p>
                {treatment && <p><span className="text-cream-muted">Treatment:</span> {treatment}</p>}
                <a
                  href={`https://scryfall.com/card/${card.set}/${card.collector_number}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan hover:text-cyan-dim underline"
                >
                  View on Scryfall
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
