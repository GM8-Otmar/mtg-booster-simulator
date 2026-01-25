import { getCardImageUrl, getCardPrice, formatPrice } from '../types/card';
import type { ScryfallCard } from '../types/card';

interface CardDisplayProps {
  card: ScryfallCard;
  showPrice?: boolean;
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

export function CardDisplay({ card, showPrice = true }: CardDisplayProps) {
  const imageUrl = getCardImageUrl(card, 'normal');
  const ringColor = rarityStyles[card.rarity] || 'ring-gray-500';
  const glowEffect = rarityGlow[card.rarity] || '';
  const price = getCardPrice(card);
  const isFoil = card.foil;

  // Foil cards get a special rainbow border effect
  const foilStyle = isFoil
    ? 'ring-2 ring-offset-2 ring-offset-gray-900 bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500'
    : '';

  return (
    <div className="flex flex-col items-center group">
      <div className={`relative rounded-xl ring-2 ${isFoil ? foilStyle : ringColor} ${glowEffect} shadow-xl hover:scale-105 transition-all duration-200`}>
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
  );
}
