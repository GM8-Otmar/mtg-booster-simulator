import type { BoosterPack, PlayBoosterPack, CollectorBoosterPack } from '../api/scryfall';
import { getPackCards } from '../api/scryfall';
import { getCardPrice, formatPrice } from '../types/card';
import { CardDisplay } from './CardDisplay';

interface CardGridProps {
  pack: BoosterPack | null;
}

function calculatePackValue(pack: BoosterPack): number {
  const allCards = getPackCards(pack).filter(card => card != null);
  return allCards.reduce((total, card) => {
    const price = getCardPrice(card);
    return total + (price || 0);
  }, 0);
}

function countFoils(pack: BoosterPack): number {
  return getPackCards(pack).filter(card => card && card.isFoilPull).length;
}

function PlayBoosterGrid({ pack }: { pack: PlayBoosterPack }) {
  return (
    <div className="space-y-8">
      {/* Foil Wildcard - Guaranteed foil! */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
          <span className="text-2xl">🌟</span>
          Foil {pack.foilWildcard.rarity.charAt(0).toUpperCase() + pack.foilWildcard.rarity.slice(1)}!
        </h2>
        <div className="flex justify-center">
          <CardDisplay card={pack.foilWildcard} />
        </div>
      </section>

      {/* Rare/Mythic */}
      <section>
        <h2 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
          <span className="text-2xl">✨</span>
          {pack.rareOrMythic.rarity === 'mythic' ? 'Mythic Rare!' : 'Rare'}
        </h2>
        <div className="flex justify-center">
          <CardDisplay card={pack.rareOrMythic} />
        </div>
      </section>

      {/* Land */}
      <section>
        <h2 className="text-lg font-semibold text-green-300 mb-4 flex items-center gap-2">
          <span className="text-xl">🌿</span>
          Land Slot
        </h2>
        <div className="flex justify-center">
          <CardDisplay card={pack.land} />
        </div>
      </section>

      {/* Wildcard (if rare/mythic) */}
      {(pack.wildcard.rarity === 'rare' || pack.wildcard.rarity === 'mythic') && (
        <section>
          <h2 className="text-lg font-bold text-amber-300 mb-4 flex items-center gap-2">
            <span className="text-xl">🎰</span>
            Wildcard {pack.wildcard.rarity.charAt(0).toUpperCase() + pack.wildcard.rarity.slice(1)}!
          </h2>
          <div className="flex justify-center">
            <CardDisplay card={pack.wildcard} />
          </div>
        </section>
      )}

      {/* Uncommons */}
      <section>
        <h2 className="text-lg font-semibold text-gray-300 mb-4">
          Uncommons ({pack.uncommons.length}{pack.wildcard.rarity === 'uncommon' ? ' + 1 wildcard' : ''})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 justify-items-center">
          {pack.uncommons.map((card, index) => (
            <CardDisplay key={`uncommon-${index}-${card.id}`} card={card} />
          ))}
          {pack.wildcard.rarity === 'uncommon' && (
            <CardDisplay key={`wildcard-${pack.wildcard.id}`} card={pack.wildcard} />
          )}
        </div>
      </section>

      {/* Commons */}
      <section>
        <h2 className="text-lg font-semibold text-gray-400 mb-4">
          Commons ({pack.commons.length}{pack.wildcard.rarity === 'common' ? ' + 1 wildcard' : ''})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center">
          {pack.commons.map((card, index) => (
            <CardDisplay key={`common-${index}-${card.id}`} card={card} />
          ))}
          {pack.wildcard.rarity === 'common' && (
            <CardDisplay key={`wildcard-${pack.wildcard.id}`} card={pack.wildcard} />
          )}
        </div>
      </section>
    </div>
  );
}

function CollectorBoosterGrid({ pack }: { pack: CollectorBoosterPack }) {
  return (
    <div className="space-y-8">
      {/* Foil Rare/Mythic - The big pull! */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
          <span className="text-2xl">💎</span>
          Foil {pack.foilRare.rarity === 'mythic' ? 'Mythic Rare!' : 'Rare'}
        </h2>
        <div className="flex justify-center">
          <CardDisplay card={pack.foilRare} />
        </div>
      </section>

      {/* Non-foil Rares/Mythics */}
      <section>
        <h2 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
          <span className="text-2xl">✨</span>
          Rares & Mythics ({pack.rares.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 justify-items-center">
          {pack.rares.map((card, index) => (
            <CardDisplay key={`rare-${index}-${card.id}`} card={card} />
          ))}
        </div>
      </section>

      {/* Foil Uncommons */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-300">
          <span>🌟</span>
          Foil Uncommons ({pack.foilUncommons.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 justify-items-center">
          {pack.foilUncommons.map((card, index) => (
            <CardDisplay key={`foil-uncommon-${index}-${card.id}`} card={card} />
          ))}
        </div>
      </section>

      {/* Foil Commons */}
      <section>
        <h2 className="text-lg font-semibold text-gray-400 mb-4 flex items-center gap-2">
          <span>🌟</span>
          Foil Commons ({pack.foilCommons.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 justify-items-center">
          {pack.foilCommons.map((card, index) => (
            <CardDisplay key={`foil-common-${index}-${card.id}`} card={card} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function CardGrid({ pack }: CardGridProps) {
  if (!pack) {
    return null;
  }

  const packValue = calculatePackValue(pack);
  const foilCount = countFoils(pack);
  const isCollector = pack.type === 'collector';

  return (
    <div className="space-y-8">
      {/* Pack Value Summary */}
      <div className={`text-center rounded-xl p-4 max-w-md mx-auto ${isCollector ? 'bg-purple-900/30 border border-purple-500/30' : 'bg-gray-800/50'}`}>
        <div className="text-gray-400 text-sm uppercase tracking-wide mb-1">
          {isCollector ? '💎 Collector Pack Value' : '📦 Play Pack Value'}
        </div>
        <div className={`text-3xl font-bold ${packValue >= 10 ? 'text-green-400' : packValue >= 3 ? 'text-yellow-400' : 'text-gray-300'}`}>
          {formatPrice(packValue)}
        </div>
        <div className="text-xs text-purple-400 mt-1">
          {foilCount} foil{foilCount !== 1 ? 's' : ''} in pack
        </div>
      </div>

      {/* Render appropriate grid based on pack type */}
      {pack.type === 'play' ? (
        <PlayBoosterGrid pack={pack} />
      ) : (
        <CollectorBoosterGrid pack={pack} />
      )}
    </div>
  );
}
