import { getCardImageUrl, getCardPrice, formatPrice } from '../../types/card';
import type { ScryfallCard } from '../../types/card';

interface CardInspectPanelProps {
  card: ScryfallCard | null;
  title?: string;
}

export default function CardInspectPanel({ card, title = 'Inspect' }: CardInspectPanelProps) {
  if (!card) {
    return (
      <aside className="fixed top-4 right-4 w-56 rounded-lg p-3 bg-navy-light/95 backdrop-blur border border-cyan-dim shadow-xl z-40">
        <p className="text-cream-muted text-xs">Hover a card to inspect</p>
      </aside>
    );
  }

  const imageUrl = getCardImageUrl(card, 'normal');
  const price = getCardPrice(card);

  return (
    <aside className="fixed top-4 right-4 w-56 rounded-lg p-3 bg-navy-light/95 backdrop-blur border border-cyan-dim shadow-xl z-40 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <p className="text-cyan text-xs font-semibold mb-2">{title}</p>
      {imageUrl ? (
        <img src={imageUrl} alt={card.name} className="rounded-lg w-full mb-2" />
      ) : (
        <div className="h-32 rounded-lg bg-navy flex items-center justify-center text-cream-muted text-xs p-2 mb-2">
          {card.name}
        </div>
      )}
      <h3 className="text-sm font-bold text-cream truncate" title={card.name}>{card.name}</h3>
      <p className="text-cream-muted text-xs">{card.type_line}</p>
      {card.mana_cost && <p className="text-cyan text-xs font-medium">{card.mana_cost}</p>}
      <div className="flex justify-between text-xs text-cream-muted mt-2 pt-2 border-t border-cyan-dim">
        <span>{card.rarity}</span>
        <span className="text-cyan font-medium">{formatPrice(price)}</span>
      </div>
    </aside>
  );
}
