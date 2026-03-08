/**
 * DeckPickerModal — lets the player pick a saved deck from their library
 * and load it into the current game (multiplayer or sandbox).
 *
 * Flow:
 *   1. On mount, fetches deck summaries from local storage.
 *   2. Player clicks a deck → full DeckRecord is loaded & all card images
 *      are resolved client-side (Scryfall individual lookups).
 *   3. The fully-resolved ImportedDeckPayload is sent to the server via
 *      importDeck — because every card already has preferredPrinting the
 *      server skips its Scryfall batch call entirely.
 */

import { useEffect, useState } from 'react';
import { Library, Loader2 } from 'lucide-react';
import { useGameTable } from '../../contexts/GameTableContext';
import { getDeckStorage } from '../../services/deckStorage';
import { deckRecordToSandboxImportPayload } from '../../utils/deckArena';
import { getDeckIcon } from '../../utils/deckIcons';
import type { DeckSummary } from '../../types/deck';

interface DeckPickerModalProps {
  onClose: () => void;
  source?: 'manual-load-button' | 'auto-open-after-join';
}

export default function DeckPickerModal({ onClose, source = 'manual-load-button' }: DeckPickerModalProps) {
  const { importDeck, loading: ctxLoading, error: ctxError } = useGameTable();

  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null); // deck id being resolved
  const [localError, setLocalError] = useState<string | null>(null);

  // Fetch deck list on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const storage = getDeckStorage();
        const list = await storage.listDecks();
        console.debug('[DeckPickerModal] listDecks loaded', {
          source,
          capability: storage.getCapability(),
          connected: storage.isConnected(),
          deckCount: list.length,
          deckIds: list.map(d => d.id),
        });
        if (!cancelled) setDecks(list);
      } catch (err) {
        console.error('[DeckPickerModal] listDecks failed', {
          source,
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) setLocalError('Could not load deck library.');
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handlePickDeck = async (deckId: string) => {
    setLocalError(null);
    setResolving(deckId);
    try {
      const storage = getDeckStorage();
      const record = await storage.loadDeck(deckId);
      console.debug('[DeckPickerModal] loadDeck selected', {
        source,
        deckId,
        capability: storage.getCapability(),
        connected: storage.isConnected(),
      });

      // Resolve all card printings client-side so the server doesn't need Scryfall
      const payload = await deckRecordToSandboxImportPayload(record);

      await importDeck(payload);
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to load deck.');
    } finally {
      setResolving(null);
    }
  };

  const isLoading = ctxLoading || resolving !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-navy rounded-2xl border border-cyan-dim w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-dim shrink-0">
          <div className="flex items-center gap-2">
            <Library size={20} className="text-cyan" />
            <h2 className="text-xl font-bold text-cream">My Decks</h2>
          </div>
          <button
            onClick={onClose}
            className="text-cream-muted hover:text-cream transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          {loadingList && (
            <div className="flex items-center justify-center py-12 text-cream-muted">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading decks…
            </div>
          )}

          {!loadingList && decks.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <p className="text-cream-muted text-sm">No saved decks found.</p>
              <p className="text-cream-muted/60 text-xs">
                Build a deck in the Deck Library first, then come back to load it.
              </p>
            </div>
          )}

          {!loadingList && decks.map(deck => {
            const IconComp = getDeckIcon(deck.icon);
            const isResolving = resolving === deck.id;

            return (
              <button
                key={deck.id}
                onClick={() => handlePickDeck(deck.id)}
                disabled={isLoading}
                className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                  isResolving
                    ? 'border-cyan bg-cyan/10'
                    : 'border-cyan-dim/40 bg-navy-light hover:bg-navy-light/80 hover:border-cyan-dim'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {/* Cover art / icon */}
                <div className="w-12 h-12 rounded-lg bg-navy border border-cyan-dim/30 overflow-hidden shrink-0 flex items-center justify-center">
                  {deck.coverImageUri ? (
                    <img
                      src={deck.coverImageUri}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : IconComp ? (
                    <IconComp size={22} className="text-magenta" />
                  ) : (
                    <Library size={18} className="text-cream-muted/40" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-cream font-semibold text-sm truncate">{deck.name}</p>
                  <div className="flex items-center gap-2 text-[11px] text-cream-muted mt-0.5">
                    <span className="capitalize">{deck.format}</span>
                    <span>·</span>
                    <span>{deck.cardCount} cards</span>
                    {deck.commanderNames.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-magenta truncate max-w-[140px]">
                          {deck.commanderNames.join(', ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Loading indicator or chevron */}
                <div className="shrink-0 w-8 flex items-center justify-center">
                  {isResolving ? (
                    <Loader2 className="w-4 h-4 text-cyan animate-spin" />
                  ) : (
                    <span className="text-cream-muted/40 text-lg">›</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Error display */}
        {(localError || ctxError) && (
          <div className="px-6 py-2 border-t border-red-500/30">
            <p className="text-red-400 text-sm">{localError || ctxError}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-cyan-dim shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-cyan-dim text-cream-muted hover:text-cream transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
