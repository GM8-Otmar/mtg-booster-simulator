import type { BoosterPack, PlayBoosterPack, CollectorBoosterPack } from '../api/scryfall';
import { getPackCards } from '../api/scryfall';
import { getCardPrice, formatPrice } from '../types/card';
import type { ScryfallCard } from '../types/card';
import { CardDisplay } from './CardDisplay';
import { Sparkles, Gem, Leaf, Dices, Package } from 'lucide-react';

interface CardGridProps {
  pack: BoosterPack | null;
  onCardHover?: (card: ScryfallCard | null) => void;
  onCardLeave?: () => void;
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

function cardWrap(card: ScryfallCard, key: string, onHover?: (c: ScryfallCard | null) => void, onLeave?: () => void) {
  return (
    <div key={key} onMouseEnter={() => onHover?.(card)} onMouseLeave={onLeave}>
      <CardDisplay card={card} />
    </div>
  );
}

function PlayBoosterGrid({ pack, onCardHover, onCardLeave }: { pack: PlayBoosterPack; onCardHover?: (c: ScryfallCard | null) => void; onCardLeave?: () => void }) {
  const leave = onCardLeave;
  return (
    <div className="space-y-8">
      {/* Foil Wildcard - Guaranteed foil! */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-magenta">
          <Sparkles className="w-6 h-6" />
          Foil {pack.foilWildcard.rarity.charAt(0).toUpperCase() + pack.foilWildcard.rarity.slice(1)}!
        </h2>
        <div className="flex justify-center">{cardWrap(pack.foilWildcard, `foil-${pack.foilWildcard.id}`, onCardHover, leave)}</div>
      </section>

      {/* Rare/Mythic */}
      <section>
        <h2 className="text-xl font-bold text-cyan mb-4 flex items-center gap-2">
          <Sparkles className="w-6 h-6" />
          {pack.rareOrMythic.rarity === 'mythic' ? 'Mythic Rare!' : 'Rare'}
        </h2>
        <div className="flex justify-center">{cardWrap(pack.rareOrMythic, `rare-${pack.rareOrMythic.id}`, onCardHover, leave)}</div>
      </section>

      {/* Land */}
      <section>
        <h2 className="text-lg font-semibold text-cyan mb-4 flex items-center gap-2">
          <Leaf className="w-5 h-5" />
          Land Slot
        </h2>
        <div className="flex justify-center">{cardWrap(pack.land, `land-${pack.land.id}`, onCardHover, leave)}</div>
      </section>

      {/* Wildcard (if rare/mythic) */}
      {(pack.wildcard.rarity === 'rare' || pack.wildcard.rarity === 'mythic') && (
        <section>
          <h2 className="text-lg font-bold text-cyan mb-4 flex items-center gap-2">
            <Dices className="w-5 h-5" />
            Wildcard {pack.wildcard.rarity.charAt(0).toUpperCase() + pack.wildcard.rarity.slice(1)}!
          </h2>
          <div className="flex justify-center">{cardWrap(pack.wildcard, `wildcard-${pack.wildcard.id}`, onCardHover, leave)}</div>
        </section>
      )}

      {/* Uncommons */}
      <section>
        <h2 className="text-lg font-semibold text-cream-muted mb-4">
          Uncommons ({pack.uncommons.length}{pack.wildcard.rarity === 'uncommon' ? ' + 1 wildcard' : ''})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 justify-items-center">
          {pack.uncommons.map((card, index) => cardWrap(card, `uncommon-${index}-${card.id}`, onCardHover, leave))}
          {pack.wildcard.rarity === 'uncommon' && cardWrap(pack.wildcard, `wildcard-${pack.wildcard.id}`, onCardHover, leave)}
        </div>
      </section>

      {/* Commons */}
      <section>
        <h2 className="text-lg font-semibold text-cream-muted mb-4">
          Commons ({pack.commons.length}{pack.wildcard.rarity === 'common' ? ' + 1 wildcard' : ''})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center">
          {pack.commons.map((card, index) => cardWrap(card, `common-${index}-${card.id}`, onCardHover, leave))}
          {pack.wildcard.rarity === 'common' && cardWrap(pack.wildcard, `wildcard-${pack.wildcard.id}`, onCardHover, leave)}
        </div>
      </section>
    </div>
  );
}

function CollectorBoosterGrid({ pack, onCardHover, onCardLeave }: { pack: CollectorBoosterPack; onCardHover?: (c: ScryfallCard | null) => void; onCardLeave?: () => void }) {
  const leave = onCardLeave;
  return (
    <div className="space-y-8">
      {/* Foil Booster Fun Rare - The big pull! */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-magenta">
          <Gem className="w-6 h-6" />
          Foil {pack.foilRare.rarity === 'mythic' ? 'Mythic Rare!' : 'Rare'}
        </h2>
        <p className="text-sm text-cream-muted -mt-2 mb-4">Extended Art • Showcase • Borderless</p>
        <div className="flex justify-center">{cardWrap(pack.foilRare, `foil-rare-${pack.foilRare.id}`, onCardHover, leave)}</div>
      </section>

      {/* Non-foil Booster Fun Rares (Extended Art, Borderless, Showcase) */}
      <section>
        <h2 className="text-xl font-bold text-cyan mb-4 flex items-center gap-2">
          <Sparkles className="w-6 h-6" />
          Booster Fun Rares ({pack.rares.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 justify-items-center">
          {pack.rares.map((card, index) => cardWrap(card, `rare-${index}-${card.id}`, onCardHover, leave))}
        </div>
      </section>

      {/* Foil Uncommons */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-cream-muted">
          <Sparkles className="w-5 h-5" />
          Foil Uncommons ({pack.foilUncommons.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 justify-items-center">
          {pack.foilUncommons.map((card, index) => cardWrap(card, `foil-uncommon-${index}-${card.id}`, onCardHover, leave))}
        </div>
      </section>

      {/* Foil Commons */}
      <section>
        <h2 className="text-lg font-semibold text-cream-muted mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Foil Commons ({pack.foilCommons.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 justify-items-center">
          {pack.foilCommons.map((card, index) => cardWrap(card, `foil-common-${index}-${card.id}`, onCardHover, leave))}
        </div>
      </section>
    </div>
  );
}

export function CardGrid({ pack, onCardHover, onCardLeave }: CardGridProps) {
  if (!pack) {
    return null;
  }

  const packValue = calculatePackValue(pack);
  const foilCount = countFoils(pack);
  const isCollector = pack.type === 'collector';

  return (
    <div className="space-y-8">
      {/* Pack Value Summary */}
      <div className={`text-center rounded-xl p-4 max-w-md mx-auto ${isCollector ? 'bg-magenta-dim border border-magenta/40' : 'bg-navy-light border border-navy-light'}`}>
        <div className="text-cream-muted text-sm uppercase tracking-wide mb-1 flex items-center justify-center gap-2">
          {isCollector ? <Gem className="w-4 h-4" /> : <Package className="w-4 h-4" />}
          {isCollector ? 'Collector Pack Value' : 'Play Pack Value'}
        </div>
        <div className={`text-3xl font-bold ${packValue >= 10 ? 'text-cyan' : packValue >= 3 ? 'text-magenta' : 'text-cream-muted'}`}>
          {formatPrice(packValue)}
        </div>
        <div className="text-xs text-cyan-dim mt-1">
          {foilCount} foil{foilCount !== 1 ? 's' : ''} in pack
        </div>
      </div>

      {/* Render appropriate grid based on pack type */}
      {pack.type === 'play' ? (
        <PlayBoosterGrid pack={pack} onCardHover={onCardHover} onCardLeave={onCardLeave} />
      ) : (
        <CollectorBoosterGrid pack={pack} onCardHover={onCardHover} onCardLeave={onCardLeave} />
      )}
    </div>
  );
}
