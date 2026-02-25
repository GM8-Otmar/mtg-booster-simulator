import { useState } from 'react';
import { useSealedEvent } from '../../contexts/SealedEventContext';
import type { BoosterPack } from '../../types/sealed';
import type { ScryfallCard } from '../../types/card';
import { getCardImageUrl } from '../../types/card';
import CardInspectPanel from './CardInspectPanel';
import { PackRevealSlider } from '../PackRevealSlider';

// Snapshot of the notable card from each opened pack (rare/mythic or first card)
interface PackHistoryEntry {
  packNumber: number;
  card: ScryfallCard;
}

function getHighlightCard(pack: BoosterPack): ScryfallCard | null {
  const all = pack.cards?.filter((c): c is ScryfallCard => c != null) ?? [];
  return (
    all.find(c => c.rarity === 'mythic') ??
    all.find(c => c.rarity === 'rare') ??
    all[0] ??
    null
  );
}

function PackHistoryStrip({ history }: { history: PackHistoryEntry[] }) {
  if (history.length === 0) return null;

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <p className="text-xs text-cream-muted mb-2 text-center">Opened packs</p>
      <div className="flex gap-3 justify-center flex-wrap">
        {history.map(({ packNumber, card }) => {
          const url = getCardImageUrl(card, 'small');
          const isMythic = card.rarity === 'mythic';
          const isRare = card.rarity === 'rare';
          return (
            <div
              key={packNumber}
              className="flex flex-col items-center gap-1"
              title={`Pack ${packNumber}: ${card.name}`}
            >
              <div
                className={`w-14 h-[77px] rounded-md overflow-hidden border-2 shadow-md
                  ${isMythic ? 'border-magenta shadow-magenta/40' : isRare ? 'border-cyan shadow-cyan/30' : 'border-cyan-dim'}`}
              >
                {url ? (
                  <img src={url} alt={card.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-navy-light flex items-center justify-center">
                    <span className="text-[9px] text-cream-muted text-center px-1">{card.name}</span>
                  </div>
                )}
              </div>
              <span className={`text-[10px] font-bold ${isMythic ? 'text-magenta' : isRare ? 'text-cyan' : 'text-cream-muted'}`}>
                #{packNumber}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PackProgression() {
  const { currentPlayer, openNextPack, loading, error } = useSealedEvent();
  const [currentPack, setCurrentPack] = useState<BoosterPack | null>(null);
  const [inspectCard, setInspectCard] = useState<ScryfallCard | null>(null);
  const [justAddedCount, setJustAddedCount] = useState<number | null>(null);
  const [packHistory, setPackHistory] = useState<PackHistoryEntry[]>([]);

  if (!currentPlayer) return null;

  const handleOpenPack = async () => {
    try {
      const pack = await openNextPack();
      setCurrentPack(pack);
      setInspectCard(pack.cards?.find(Boolean) ?? null);
      setJustAddedCount(null);
    } catch (err) {
      console.error('Failed to open pack:', err);
    }
  };

  const handleContinue = () => {
    if (currentPack) {
      const highlight = getHighlightCard(currentPack);
      if (highlight) {
        setPackHistory(prev => [...prev, { packNumber: prev.length + 1, card: highlight }]);
      }
    }
    const addedCount = currentPack?.cards?.filter(Boolean).length ?? 0;
    setJustAddedCount(addedCount);
    setCurrentPack(null);
    setInspectCard(null);
  };

  const packsOpened = currentPlayer.packsOpened;
  const progress = (packsOpened / 6) * 100;

  return (
    <div className="min-h-screen bg-navy text-cream p-8">
      <div className="max-w-7xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-center mb-4 text-cream">
            Pack Opening
          </h1>

          <div className="max-w-xl mx-auto">
            <div className="flex justify-between text-sm text-cream-muted mb-2">
              <span>Pack {packsOpened} of 6</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="h-4 bg-navy-light rounded-full overflow-hidden">
              <div
                className="h-full bg-magenta transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Pack Display or Open Button */}
        {currentPack ? (
          <div>
            <CardInspectPanel card={inspectCard} title="Pack Inspect" />
            <div className="bg-navy-light border border-cyan-dim rounded-lg p-3 mb-6 text-sm text-cream-muted max-w-2xl mx-auto">
              Use arrows or keyboard to flip through cards. When ready, click{' '}
              <span className="text-cream font-semibold">Add to Pool</span>.
            </div>
            <PackRevealSlider
              cards={currentPack.cards?.filter((card): card is ScryfallCard => card != null) ?? []}
              onCurrentCardChange={setInspectCard}
            />
            <div className="text-center mt-8">
              <button
                onClick={handleContinue}
                className="px-8 py-4 bg-magenta hover:bg-magenta/90 rounded-xl font-bold text-lg transition-all text-cream"
              >
                {packsOpened < 6 ? 'Add to Pool & Continue' : 'Add to Pool & Pick Commander'}
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <div className="bg-navy-light rounded-xl p-8 text-center border border-cyan-dim">
              <p className="text-cream-muted mb-6">
                {packsOpened === 0
                  ? 'Ready to open your first pack?'
                  : `You've opened ${packsOpened} pack${packsOpened > 1 ? 's' : ''}. Open the next one!`}
              </p>

              <button
                onClick={handleOpenPack}
                disabled={loading}
                className="w-full py-4 bg-cyan hover:bg-cyan/90 rounded-xl font-bold text-lg text-navy disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Opening Pack...' : `Open Pack ${packsOpened + 1}`}
              </button>

              {error && <p className="text-red-400 mt-4">{error}</p>}
            </div>

            {justAddedCount !== null && (
              <div className="mt-4 bg-cyan-dim/20 border border-cyan rounded-lg p-3 text-center text-cyan">
                Added {justAddedCount} cards to your pool.
              </div>
            )}

            {packsOpened > 0 && (
              <div className="mt-6 bg-navy-light rounded-lg p-4 border border-cyan-dim">
                <p className="text-center text-cream-muted">
                  Current Pool: <span className="text-cream font-bold">{currentPlayer.pool.length}</span> cards
                </p>
              </div>
            )}

            {/* Pack history thumbnails */}
            <PackHistoryStrip history={packHistory} />
          </div>
        )}
      </div>
    </div>
  );
}
