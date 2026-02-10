import { useState } from 'react';
import { getCardImageUrl, getCardPrice, formatPrice } from '../types/card';
import type { ScryfallCard } from '../types/card';

interface CardDisplayProps {
  card: ScryfallCard;
  showPrice?: boolean;
  enableZoom?: boolean;
}

// Rarity colors matching MTG set symbols
const rarityStyles: Record<string, string> = {
  common: 'ring-gray-500',
  uncommon: 'ring-gray-300',
  rare: 'ring-amber-500',
  mythic: 'ring-orange-500',
  special: 'ring-purple-500',
  bonus: 'ring-purple-400',
};

const rarityGlow: Record<string, string> = {
  common: '',
  uncommon: '',
  rare: 'shadow-amber-500/30',
  mythic: 'shadow-orange-500/50',
  special: 'shadow-purple-500/50',
  bonus: 'shadow-purple-400/50',
};

export function CardDisplay({ card, showPrice = true, enableZoom = true }: CardDisplayProps) {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const imageUrl = getCardImageUrl(card, 'normal');
  const zoomImageUrl = getCardImageUrl(card, 'large') || imageUrl;
  const ringColor = rarityStyles[card.rarity] || 'ring-gray-500';
  const glowEffect = rarityGlow[card.rarity] || '';
  const price = getCardPrice(card);
  const isFoil = card.isFoilPull === true;

  // Foil cards get a special rainbow border effect
  const foilStyle = isFoil
    ? 'ring-2 ring-offset-2 ring-offset-gray-900 bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500'
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
          <div className={`w-[223px] h-[311px] bg-gray-700 rounded-xl flex items-center justify-center`}>
            <p className="text-gray-400 text-center px-4 text-sm">{card.name}</p>
          </div>
        )}

        {/* Foil indicator */}
        {isFoil && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            FOIL
          </div>
        )}
      </div>

      {/* Price tag */}
      {showPrice && (
        <div className={`mt-2 text-sm font-medium ${price && price >= 1 ? 'text-green-400' : 'text-gray-400'}`}>
          {formatPrice(price)}
        </div>
      )}
      </div>

      {isZoomOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center"
          onClick={closeZoom}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl max-w-5xl w-full p-4 md:p-6 grid md:grid-cols-[auto,1fr] gap-6"
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
                <div className="w-[360px] h-[500px] bg-gray-700 rounded-xl flex items-center justify-center">
                  <p className="text-gray-300 text-center px-4">{card.name}</p>
                </div>
              )}
            </div>

            <div className="text-gray-200">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-2xl font-bold text-white">{card.name}</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {card.set_name} ({card.set.toUpperCase()}) #{card.collector_number}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeZoom}
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-md text-sm"
                >
                  Close
                </button>
              </div>

              {card.mana_cost && (
                <p className="text-amber-300 mb-2 font-medium">{card.mana_cost}</p>
              )}
              <p className="text-gray-100 mb-3">{card.type_line}</p>
              {card.oracle_text && (
                <p className="text-gray-300 whitespace-pre-wrap mb-4">{card.oracle_text}</p>
              )}

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <p><span className="text-gray-400">Rarity:</span> {card.rarity}</p>
                <p><span className="text-gray-400">Price:</span> {formatPrice(price)}</p>
                <p><span className="text-gray-400">Foil Pull:</span> {isFoil ? 'Yes' : 'No'}</p>
                <a
                  href={`https://scryfall.com/card/${card.set}/${card.collector_number}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
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
