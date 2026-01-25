import { ScryfallCard } from '../types/card';
import { CardDisplay } from './CardDisplay';

interface CardGridProps {
  cards: ScryfallCard[];
}

export function CardGrid({ cards }: CardGridProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4">
      {cards.map((card) => (
        <CardDisplay key={card.id} card={card} />
      ))}
    </div>
  );
}
