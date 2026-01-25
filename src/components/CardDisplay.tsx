import { getCardImageUrl } from '../types/card';
import type { ScryfallCard } from '../types/card';

interface CardDisplayProps {
  card: ScryfallCard;
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

export function CardDisplay({ card }: CardDisplayProps) {
  const imageUrl = getCardImageUrl(card, 'normal');
  const ringColor = rarityStyles[card.rarity] || 'ring-gray-500';
  const glowEffect = rarityGlow[card.rarity] || '';

  return (
    <div className="flex flex-col items-center group">
      {imageUrl ? (
        <div className={`relative rounded-xl ring-2 ${ringColor} ${glowEffect} shadow-xl hover:scale-105 transition-all duration-200`}>
          <img
            src={imageUrl}
            alt={card.name}
            className="rounded-xl w-full max-w-[223px]"
            loading="lazy"
          />
        </div>
      ) : (
        <div className={`w-[223px] h-[311px] bg-gray-700 rounded-xl ring-2 ${ringColor} flex items-center justify-center`}>
          <p className="text-gray-400 text-center px-4 text-sm">{card.name}</p>
        </div>
      )}
    </div>
  );
}
