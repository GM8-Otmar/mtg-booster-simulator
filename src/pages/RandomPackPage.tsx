import { useState, useRef, useEffect } from 'react';
import { fetchBoosterPack, getPackCards, PackSimulationError } from '../api/scryfall';
import type { BoosterPack, BoosterType } from '../api/scryfall';
import type { ScryfallCard } from '../types/card';
import { CardGrid } from '../components/CardGrid';
import { PackRevealSlider } from '../components/PackRevealSlider';
import CardInspectPanel from '../components/sealed/CardInspectPanel';
import { SetSelector } from '../components/SetSelector';
import { BoosterTypeSelector } from '../components/BoosterTypeSelector';
import { Package, Gem, Layers } from 'lucide-react';

export default function RandomPackPage() {
  const [selectedSet, setSelectedSet] = useState<string>('');
  const [boosterType, setBoosterType] = useState<BoosterType>('play');
  const [pack, setPack] = useState<BoosterPack | null>(null);
  const [sliderCurrentCard, setSliderCurrentCard] = useState<ScryfallCard | null>(null);
  const [gridHoverCard, setGridHoverCard] = useState<ScryfallCard | null>(null);
  const inspectCard = gridHoverCard ?? sliderCurrentCard;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pack) {
      setGridHoverCard(null);
    }
  }, [pack]);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const sessionSeenIds = useRef<Set<string>>(new Set());
  const lastFetchKey = useRef<string>('');

  const handleOpenPack = async () => {
    if (!selectedSet) return;

    setLoading(true);
    setError(null);
    setPack(null);
    setProgress(`Opening ${boosterType} booster...`);

    try {
      setProgress('Fetching cards...');
      const fetchKey = `${selectedSet}:${boosterType}`;
      if (fetchKey !== lastFetchKey.current) {
        sessionSeenIds.current.clear();
        lastFetchKey.current = fetchKey;
      }
      const previouslySeen = sessionSeenIds.current.size > 0 ? sessionSeenIds.current : undefined;
      const fetchedPack = await fetchBoosterPack(selectedSet, boosterType, { previouslySeenIds: previouslySeen });
      getPackCards(fetchedPack).forEach(c => c?.id && sessionSeenIds.current.add(c.id));
      setProgress('');
      setPack(fetchedPack);
    } catch (err) {
      console.error('Error opening pack:', err);

      if (err instanceof PackSimulationError) {
        setError(`${err.message}`);
      } else if (err instanceof Error) {
        setError(`Failed to open pack: ${err.message}`);
      } else {
        setError('Failed to open pack. Please try again.');
      }
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  const buttonClasses = boosterType === 'collector'
    ? 'bg-magenta hover:bg-magenta/90 text-cream shadow-lg shadow-magenta-dim'
    : 'bg-cyan hover:bg-cyan/90 text-navy shadow-lg shadow-cyan-dim';

  return (
    <div className="min-h-screen bg-navy text-cream">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-2 text-cream">
            MTG Booster Simulator
          </h1>
          <p className="text-cream-muted">Open virtual booster packs from any Magic set</p>
        </header>

        {/* Controls */}
        <div className="flex flex-col gap-6 items-center justify-center mb-10">
          {/* Top row: Set selector and booster type */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <SetSelector
              selectedSet={selectedSet}
              onSetChange={setSelectedSet}
              disabled={loading}
            />
            <BoosterTypeSelector
              selected={boosterType}
              onChange={setBoosterType}
              disabled={loading}
            />
          </div>

          {/* Open button */}
          <button
            onClick={handleOpenPack}
            disabled={loading || !selectedSet}
            className={`${buttonClasses} disabled:bg-navy-light disabled:text-cream-muted disabled:cursor-not-allowed font-bold py-3 px-8 rounded-lg text-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 mx-auto`}
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                Opening...
              </>
            ) : (
              <>
                {boosterType === 'collector' ? <Gem className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                Open {boosterType === 'collector' ? 'Collector' : 'Play'} Booster
              </>
            )}
          </button>
        </div>

        {/* Progress */}
        {progress && (
          <div className="text-center text-cyan mb-6 animate-pulse">
            {progress}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-center mb-6 max-w-lg mx-auto">
            {error}
          </div>
        )}

        {/* Pack Contents */}
        {pack && (
          <>
            <CardInspectPanel card={inspectCard} title="Pack Inspect" />
            {/* Slider — right-pad to keep content clear of the fixed inspect panel */}
            <div className="mb-10 xl:pr-72">
              <PackRevealSlider cards={getPackCards(pack)} onCurrentCardChange={setSliderCurrentCard} />
            </div>
            <CardGrid pack={pack} onCardHover={(c) => setGridHoverCard(c ?? null)} onCardLeave={() => setGridHoverCard(null)} />
          </>
        )}

        {/* Empty state */}
        {!pack && !loading && !error && (
          <div className="text-center text-cream-muted py-20">
            <Layers className="w-16 h-16 mx-auto mb-4 text-cyan-dim" />
            <p>Select a set and booster type, then click to open!</p>
          </div>
        )}
      </div>
    </div>
  );
}
