import { useEffect, useMemo, useState } from 'react';
import DeckMetadataPanel from '../components/decks/DeckMetadataPanel';
import DeckSearchPanel from '../components/decks/DeckSearchPanel';
import DeckSectionView from '../components/decks/DeckSectionView';
import DeckStatsPanel from '../components/decks/DeckStatsPanel';
import DeckValidationPanel from '../components/decks/DeckValidationPanel';
import PrintingPickerModal from '../components/decks/PrintingPickerModal';
import { useDeckLibrary } from '../contexts/DeckLibraryContext';
import { searchCardPrintings, searchDeckCards } from '../services/deckCardSearch';
import type { ScryfallCard } from '../types/card';
import type { DeckRecord, DeckSection, PreferredPrinting } from '../types/deck';
import {
  addCardToSection,
  changeCardCount,
  clearPreferredPrinting,
  removeCardFromSection,
  renameDeck as renameDeckRecord,
  setFormat as setDeckFormat,
  setNotes as setDeckNotes,
  setCommander,
  setPreferredPrinting,
  touchUpdatedAt,
} from '../utils/deckRecord';

interface DeckBuilderPageProps {
  deckId: string;
  onBack: () => void;
  onPlayDeck: (deck: DeckRecord) => void;
}

function toPreferredPrinting(card: ScryfallCard): PreferredPrinting {
  const imageUri = card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null;
  const backImageUri = card.card_faces?.[1]?.image_uris?.normal ?? null;
  const backName = card.card_faces?.[1]?.name ?? null;

  return {
    scryfallId: card.id,
    set: card.set,
    setName: card.set_name,
    collectorNumber: card.collector_number,
    imageUri,
    backImageUri,
    backName,
  };
}

export default function DeckBuilderPage({ deckId, onBack, onPlayDeck }: DeckBuilderPageProps) {
  const { error, exportDeck, loadDeck, saveDeck } = useDeckLibrary();
  const [deck, setDeck] = useState<DeckRecord | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ScryfallCard[]>([]);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [printingPicker, setPrintingPicker] = useState<{ section: DeckSection; cardName: string } | null>(null);
  const [printingResults, setPrintingResults] = useState<ScryfallCard[]>([]);
  const [printingLoading, setPrintingLoading] = useState(false);
  const [printingError, setPrintingError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setInitialLoading(true);
    setBuilderError(null);

    loadDeck(deckId)
      .then(nextDeck => {
        if (!mounted) return;
        setDeck(nextDeck);
        setIsDirty(false);
      })
      .catch(nextError => {
        if (!mounted) return;
        setBuilderError(nextError instanceof Error ? nextError.message : 'Failed to load deck');
      })
      .finally(() => {
        if (mounted) {
          setInitialLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [deckId, loadDeck]);

  const commanderName = deck?.commander[0]?.cardName ?? null;
  const title = useMemo(() => {
    if (!deck) return 'Deck Builder';
    return `${deck.name} Builder`;
  }, [deck]);

  const updateDeck = (updater: (current: DeckRecord) => DeckRecord) => {
    setDeck(current => {
      if (!current) return current;
      const next = touchUpdatedAt(updater(current));
      setIsDirty(true);
      setSaveMessage(null);
      return next;
    });
  };

  const handleAddToSection = (section: DeckSection, card: ScryfallCard) => {
    const printing = toPreferredPrinting(card);
    updateDeck(current => {
      let next = addCardToSection(current, section, card.name, 1);
      next = setPreferredPrinting(next, section, card.name, printing);
      return next;
    });
  };

  const handleSetCommander = (card: ScryfallCard) => {
    const printing = toPreferredPrinting(card);
    updateDeck(current => {
      let next = setCommander(current, card.name);
      next = setPreferredPrinting(next, 'commander', card.name, printing);
      return next;
    });
  };

  const handleIncrement = (section: DeckSection, cardName: string) => {
    updateDeck(current => changeCardCount(
      current,
      section,
      cardName,
      (current[section].find(entry => entry.cardName.toLowerCase() === cardName.toLowerCase())?.count ?? 0) + 1,
    ));
  };

  const handleDecrement = (section: DeckSection, cardName: string) => {
    updateDeck(current => {
      const currentCount = current[section].find(
        entry => entry.cardName.toLowerCase() === cardName.toLowerCase()
      )?.count ?? 0;
      return changeCardCount(current, section, cardName, Math.max(0, currentCount - 1));
    });
  };

  const handleRemove = (section: DeckSection, cardName: string) => {
    updateDeck(current =>
      removeCardFromSection(current, section, cardName, Number.MAX_SAFE_INTEGER)
    );
  };

  const handleSearch = async (query: string) => {
    setSearchLoading(true);
    setBuilderError(null);

    try {
      const results = await searchDeckCards(query);
      setSearchResults(results);
    } catch (nextError) {
      setBuilderError(nextError instanceof Error ? nextError.message : 'Card search failed');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSave = async () => {
    if (!deck) return;

    setIsSaving(true);
    setBuilderError(null);

    try {
      await saveDeck(deck);
      setIsDirty(false);
      setSaveMessage('Saved');
    } catch (nextError) {
      setBuilderError(nextError instanceof Error ? nextError.message : 'Failed to save deck');
    } finally {
      setIsSaving(false);
    }
  };

  const loadPrintings = async (cardName: string) => {
    setPrintingLoading(true);
    setPrintingError(null);
    try {
      const results = await searchCardPrintings(cardName);
      setPrintingResults(results);
    } catch (nextError) {
      setPrintingError(nextError instanceof Error ? nextError.message : 'Failed to load printings');
      setPrintingResults([]);
    } finally {
      setPrintingLoading(false);
    }
  };

  const handleOpenPrintingPicker = (section: DeckSection, cardName: string) => {
    setPrintingPicker({ section, cardName });
    void loadPrintings(cardName);
  };

  const handleChoosePrinting = (card: ScryfallCard) => {
    if (!printingPicker) return;
    updateDeck(current =>
      setPreferredPrinting(current, printingPicker.section, printingPicker.cardName, toPreferredPrinting(card))
    );
    setPrintingPicker(null);
    setPrintingResults([]);
    setPrintingError(null);
  };

  const handleClearPrinting = (section: DeckSection, cardName: string) => {
    updateDeck(current => clearPreferredPrinting(current, section, cardName));
    if (printingPicker?.section === section && printingPicker.cardName === cardName) {
      setPrintingPicker(null);
      setPrintingResults([]);
      setPrintingError(null);
    }
  };

  const activePrintingEntry = printingPicker && deck
    ? deck[printingPicker.section].find(entry => entry.cardName.toLowerCase() === printingPicker.cardName.toLowerCase()) ?? null
    : null;

  const handleNameChange = (name: string) => {
    updateDeck(current => renameDeckRecord(current, name || 'Untitled Deck'));
  };

  const handleFormatChange = (format: DeckRecord['format']) => {
    updateDeck(current => setDeckFormat(current, format));
  };

  const handleNotesChange = (notes: string) => {
    updateDeck(current => setDeckNotes(current, notes));
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-navy text-cream p-8 flex items-center justify-center">
        <p className="text-cream-muted">Loading deck...</p>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-navy text-cream p-8 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-red-400">{builderError ?? error ?? 'Deck not found'}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-navy-light hover:bg-navy-light/80 rounded-lg border border-cyan-dim"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy text-cream p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="mb-3 px-4 py-2 bg-navy-light hover:bg-navy-light/80 rounded-lg border border-cyan-dim text-sm"
          >
            Back to Library
          </button>
          <h1 className="text-3xl font-bold text-cream">{title}</h1>
          <p className="text-cream-muted text-sm">
            {deck.format} {commanderName ? `- Commander: ${commanderName}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-1 rounded-full border ${
              isDirty ? 'text-yellow-400 border-yellow-500/40' : 'text-green-400 border-green-500/40'
            }`}
          >
            {isSaving ? 'Saving...' : isDirty ? 'Unsaved changes' : 'Saved'}
          </span>
          {saveMessage && (
            <span className="text-xs text-cyan">{saveMessage}</span>
          )}
          <button
            onClick={() => onPlayDeck(deck)}
            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-sm font-semibold text-green-300"
          >
            Play This Deck
          </button>
          <button
            onClick={() => exportDeck(deck)}
            className="px-4 py-2 bg-navy hover:bg-navy-light border border-cyan-dim rounded-lg text-sm font-semibold"
          >
            Export
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-cyan hover:bg-cyan/90 rounded-lg font-bold text-navy text-sm disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>

      {(builderError || error) && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
          {builderError ?? error}
        </div>
      )}

      <div className="grid xl:grid-cols-[360px_minmax(0,1fr)_320px] gap-6 items-start">
        <DeckSearchPanel
          loading={searchLoading}
          results={searchResults}
          onSearch={handleSearch}
          onAddToMainboard={card => handleAddToSection('mainboard', card)}
          onAddToSideboard={card => handleAddToSection('sideboard', card)}
          onSetCommander={handleSetCommander}
        />

        <div className="space-y-4">
          <DeckSectionView
            title="Commander"
            section="commander"
            entries={deck.commander}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onRemove={handleRemove}
            onChoosePrinting={handleOpenPrintingPicker}
            onClearPrinting={handleClearPrinting}
          />
          <DeckSectionView
            title="Mainboard"
            section="mainboard"
            entries={deck.mainboard}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onRemove={handleRemove}
            onChoosePrinting={handleOpenPrintingPicker}
            onClearPrinting={handleClearPrinting}
          />
          <DeckSectionView
            title="Sideboard"
            section="sideboard"
            entries={deck.sideboard}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onRemove={handleRemove}
            onChoosePrinting={handleOpenPrintingPicker}
            onClearPrinting={handleClearPrinting}
          />
          <DeckSectionView
            title="Maybeboard"
            section="maybeboard"
            entries={deck.maybeboard}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onRemove={handleRemove}
            onChoosePrinting={handleOpenPrintingPicker}
            onClearPrinting={handleClearPrinting}
          />
        </div>

        <div className="space-y-4">
          <DeckMetadataPanel
            name={deck.name}
            format={deck.format}
            notes={deck.notes}
            onNameChange={handleNameChange}
            onFormatChange={handleFormatChange}
            onNotesChange={handleNotesChange}
          />
          <DeckStatsPanel deck={deck} />
          <DeckValidationPanel deck={deck} />
        </div>
      </div>

      {printingPicker && (
        <PrintingPickerModal
          cardName={printingPicker.cardName}
          currentPrintingId={activePrintingEntry?.preferredPrinting?.scryfallId ?? null}
          loading={printingLoading}
          printings={printingResults}
          error={printingError}
          onClose={() => {
            setPrintingPicker(null);
            setPrintingResults([]);
            setPrintingError(null);
          }}
          onRefresh={() => void loadPrintings(printingPicker.cardName)}
          onChoose={handleChoosePrinting}
          onClear={() => handleClearPrinting(printingPicker.section, printingPicker.cardName)}
        />
      )}
    </div>
  );
}
