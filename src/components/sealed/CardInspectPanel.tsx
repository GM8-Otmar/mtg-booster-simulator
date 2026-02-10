import { getCardImageUrl, getCardPrice, formatPrice } from '../../types/card';
import type { ScryfallCard } from '../../types/card';

interface CardInspectPanelProps {
  card: ScryfallCard | null;
  title?: string;
}

export default function CardInspectPanel({ card, title = 'Inspect' }: CardInspectPanelProps) {
  if (!card) {
    return (
      <aside className="bg-gray-800 rounded-xl p-4 lg:sticky lg:top-4">
        <h2 className="text-lg font-bold text-purple-300 mb-3">{title}</h2>
        <p className="text-gray-400 text-sm">Hover a card to inspect it here.</p>
      </aside>
    );
  }

  const imageUrl = getCardImageUrl(card, 'normal');
  const price = getCardPrice(card);

  return (
    <aside className="bg-gray-800 rounded-xl p-4 lg:sticky lg:top-4">
      <h2 className="text-lg font-bold text-purple-300 mb-3">{title}</h2>
      <div className="space-y-3">
        {imageUrl ? (
          <img src={imageUrl} alt={card.name} className="rounded-lg w-full" />
        ) : (
          <div className="h-64 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300 text-center p-3">
            {card.name}
          </div>
        )}
        <div>
          <h3 className="text-xl font-semibold text-white">{card.name}</h3>
          <p className="text-gray-300">{card.type_line}</p>
        </div>
        {card.mana_cost && (
          <p className="text-amber-300 font-medium">{card.mana_cost}</p>
        )}
        {card.oracle_text && (
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{card.oracle_text}</p>
        )}
        <div className="text-sm text-gray-400 space-y-1">
          <p>Rarity: <span className="text-gray-200">{card.rarity}</span></p>
          <p>Set: <span className="text-gray-200">{card.set.toUpperCase()} #{card.collector_number}</span></p>
          <p>Price: <span className="text-gray-200">{formatPrice(price)}</span></p>
        </div>
      </div>
    </aside>
  );
}
