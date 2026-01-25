import type { BoosterPack } from '../api/scryfall';
import { CardDisplay } from './CardDisplay';

interface CardGridProps {
  pack: BoosterPack | null;
}

export function CardGrid({ pack }: CardGridProps) {
  if (!pack) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Rare/Mythic - The money card! */}
      <section>
        <h2 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
          <span className="text-2xl">✨</span>
          {pack.rareOrMythic.rarity === 'mythic' ? 'Mythic Rare!' : 'Rare'}
        </h2>
        <div className="flex justify-center">
          <CardDisplay card={pack.rareOrMythic} />
        </div>
      </section>

      {/* Uncommons */}
      <section>
        <h2 className="text-lg font-semibold text-gray-300 mb-4">
          Uncommons ({pack.uncommons.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 justify-items-center">
          {pack.uncommons.map((card, index) => (
            <CardDisplay key={`uncommon-${index}-${card.id}`} card={card} />
          ))}
        </div>
      </section>

      {/* Commons */}
      <section>
        <h2 className="text-lg font-semibold text-gray-400 mb-4">
          Commons ({pack.commons.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center">
          {pack.commons.map((card, index) => (
            <CardDisplay key={`common-${index}-${card.id}`} card={card} />
          ))}
        </div>
      </section>
    </div>
  );
}
