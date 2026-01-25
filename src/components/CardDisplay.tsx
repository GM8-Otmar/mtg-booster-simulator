import { ScryfallCard, getCardImageUrl } from '../types/card';

interface CardDisplayProps {
  card: ScryfallCard;
}

export function CardDisplay({ card }: CardDisplayProps) {
  const imageUrl = getCardImageUrl(card, 'normal');

  return (
    <div className="flex flex-col items-center">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={card.name}
          className="rounded-lg shadow-lg w-full max-w-[244px] hover:scale-105 transition-transform"
        />
      ) : (
        <div className="w-[244px] h-[340px] bg-gray-700 rounded-lg flex items-center justify-center">
          <p className="text-gray-400 text-center px-4">{card.name}</p>
        </div>
      )}
    </div>
  );
}
