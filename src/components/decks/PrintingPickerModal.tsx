import { useEffect, useState } from 'react';
import { getCardImageUrl, type ScryfallCard } from '../../types/card';

interface PrintingPickerModalProps {
  cardName: string;
  currentPrintingId?: string | null;
  loading: boolean;
  printings: ScryfallCard[];
  error?: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onChoose: (card: ScryfallCard) => void;
  onClear: () => void;
}

export default function PrintingPickerModal({
  cardName,
  currentPrintingId,
  loading,
  printings,
  error,
  onClose,
  onRefresh,
  onChoose,
  onClear,
}: PrintingPickerModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(currentPrintingId ?? null);

  useEffect(() => {
    setSelectedId(currentPrintingId ?? null);
  }, [currentPrintingId, cardName]);

  const selectedCard = printings.find(card => card.id === selectedId) ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={event => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-6xl max-h-[90vh] bg-navy border border-cyan-dim rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-dim">
          <div>
            <h2 className="text-xl font-bold text-cream">Choose Printing</h2>
            <p className="text-sm text-cream-muted">{cardName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="px-3 py-2 bg-navy-light hover:bg-navy-light/80 border border-cyan-dim rounded-lg text-xs font-semibold text-cream"
            >
              Refresh
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-navy-light hover:bg-navy-light/80 border border-cyan-dim rounded-lg text-xs font-semibold text-cream"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[340px_minmax(0,1fr)] max-h-[calc(90vh-73px)]">
          <div className="border-r border-cyan-dim p-5 bg-navy-light/50">
            <div className="rounded-xl border border-cyan-dim bg-navy p-4 space-y-4 sticky top-0">
              {selectedCard ? (
                <>
                  {getCardImageUrl(selectedCard, 'normal') ? (
                    <img
                      src={getCardImageUrl(selectedCard, 'normal') ?? undefined}
                      alt={selectedCard.name}
                      className="w-full rounded-xl border border-cyan-dim"
                    />
                  ) : (
                    <div className="aspect-[0.72] w-full rounded-xl border border-cyan-dim bg-navy-light flex items-center justify-center text-sm text-cream-muted text-center px-4">
                      {selectedCard.name}
                    </div>
                  )}
                  <div>
                    <p className="text-lg font-semibold text-cream">{selectedCard.name}</p>
                    <p className="text-sm text-cream-muted">{selectedCard.type_line}</p>
                    <p className="text-sm text-cyan mt-2">
                      {selectedCard.set_name} ({selectedCard.set.toUpperCase()}) #{selectedCard.collector_number}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onChoose(selectedCard)}
                      className="flex-1 px-4 py-2 bg-cyan hover:bg-cyan/90 rounded-lg font-bold text-navy text-sm"
                    >
                      Use This Art
                    </button>
                    <button
                      onClick={onClear}
                      className="px-4 py-2 bg-magenta/20 hover:bg-magenta/30 border border-magenta/40 rounded-lg text-magenta text-sm font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="aspect-[0.72] w-full rounded-xl border border-cyan-dim bg-navy flex items-center justify-center text-sm text-cream-muted text-center px-4">
                    Select a printing to preview it here.
                  </div>
                  <button
                    onClick={onClear}
                    className="w-full px-4 py-2 bg-magenta/20 hover:bg-magenta/30 border border-magenta/40 rounded-lg text-magenta text-sm font-semibold"
                  >
                    Clear Preferred Printing
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-y-auto p-5">
            {loading && (
              <p className="text-cream-muted text-sm">Loading printings...</p>
            )}

            {!loading && error && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {!loading && !error && printings.length === 0 && (
              <p className="text-cream-muted text-sm">No paper printings found for this card.</p>
            )}

            {!loading && printings.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {printings.map(card => {
                  const imageUrl = getCardImageUrl(card, 'small');
                  const isSelected = selectedId === card.id;
                  const isCurrent = currentPrintingId === card.id;

                  return (
                    <button
                      key={`${card.id}-${card.collector_number}`}
                      type="button"
                      onClick={() => setSelectedId(card.id)}
                      className={`text-left rounded-xl border p-3 transition-colors ${
                        isSelected
                          ? 'border-cyan bg-cyan/10'
                          : 'border-cyan-dim bg-navy-light hover:border-cyan/50'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="w-16 shrink-0">
                          {imageUrl ? (
                            <img src={imageUrl} alt={card.name} className="w-16 rounded-md border border-cyan-dim" />
                          ) : (
                            <div className="w-16 h-22 rounded-md border border-cyan-dim bg-navy flex items-center justify-center text-[10px] text-cream-muted text-center px-1">
                              {card.name}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-cream truncate">{card.set.toUpperCase()}</p>
                            {isCurrent && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan/20 text-cyan">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-cream truncate">{card.set_name}</p>
                          <p className="text-xs text-cream-muted truncate mt-1">
                            #{card.collector_number} · {card.rarity}
                          </p>
                          <p className="text-xs text-cream-muted truncate">{card.type_line}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
