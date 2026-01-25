import type { BoosterPack } from '../api/scryfall';
import { getPackCards } from '../api/scryfall';
import { getCardPrice, formatPrice } from '../types/card';
import { CardDisplay } from './CardDisplay';

interface CardGridProps {
  pack: BoosterPack | null;
}

function calculatePackValue(pack: BoosterPack): number {
  const allCards = getPackCards(pack);
  return allCards.reduce((total, card) => {
    const price = getCardPrice(card);
    return total + (price || 0);
  }, 0);
}

export function CardGrid({ pack }: CardGridProps) {
  if (!pack) {
    return null;
  }

  const packValue = calculatePackValue(pack);
  const hasFoil = pack.foilCard !== null;

  return (
    <div className="space-y-8">
      {/* Pack Value Summary */}
      <div className="text-center bg-gray-800/50 rounded-xl p-4 max-w-md mx-auto">
        <div className="text-gray-400 text-sm uppercase tracking-wide mb-1">Pack Value</div>
        <div className={`text-3xl font-bold ${packValue >= 5 ? 'text-green-400' : packValue >= 1 ? 'text-yellow-400' : 'text-gray-300'}`}>
          {formatPrice(packValue)}
        </div>
        {hasFoil && (
          <div className="text-xs text-purple-400 mt-1">Contains foil!</div>
        )}
      </div>

      {/* Foil Card - Special pull! */}
      {pack.foilCard && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            <span className="text-2xl">🌟</span>
            Foil {pack.foilCard.rarity.charAt(0).toUpperCase() + pack.foilCard.rarity.slice(1)}!
          </h2>
          <div className="flex justify-center">
            <CardDisplay card={pack.foilCard} />
          </div>
        </section>
      )}

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
