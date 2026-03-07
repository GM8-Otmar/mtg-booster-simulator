/**
 * Main deck library component: deck list, filters, and actions.
 */

import { useMemo, useRef, useState } from 'react';
import { useDeckLibrary } from '../../contexts/DeckLibraryContext';
import type { DeckRecord } from '../../types/deck';
import DeckListItem from './DeckListItem';
import NewDeckPanel from './NewDeckPanel';

interface DeckLibraryProps {
  onOpenDeck: (deckId: string) => void;
}

export default function DeckLibrary({ onOpenDeck }: DeckLibraryProps) {
  const {
    decks,
    loading,
    error,
    capability,
    connected,
    connectFolder,
    disconnectFolder,
    importFile,
    deleteDeck,
    duplicateDeck,
    renameDeck,
  } = useDeckLibrary();

  const [showNewDeck, setShowNewDeck] = useState(false);
  const [search, setSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredDecks = useMemo(() => (
    search.trim()
      ? decks.filter(deck =>
          deck.name.toLowerCase().includes(search.toLowerCase()) ||
          deck.commanderNames.some(name => name.toLowerCase().includes(search.toLowerCase()))
        )
      : decks
  ), [decks, search]);

  const recentDecks = useMemo(() => (
    [...decks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4)
  ), [decks]);

  const visibleDecks = useMemo(() => {
    if (search.trim()) return filteredDecks;
    const recentIds = new Set(recentDecks.map(deck => deck.id));
    return filteredDecks.filter(deck => !recentIds.has(deck.id));
  }, [filteredDecks, recentDecks, search]);

  const handleDelete = async (deckId: string) => {
    if (!confirm('Delete this deck? This cannot be undone.')) return;

    try {
      await deleteDeck(deckId);
    } catch {
      // Error shown via context.
    }
  };

  const handleDuplicate = async (deckId: string) => {
    const original = decks.find(deck => deck.id === deckId);

    try {
      await duplicateDeck(deckId, `${original?.name ?? 'Deck'} (Copy)`);
    } catch {
      // Error shown via context.
    }
  };

  const handleRename = async (deckId: string, newName: string) => {
    try {
      await renameDeck(deckId, newName);
    } catch {
      // Error shown via context.
    }
  };

  const handleCreated = (deck: DeckRecord) => {
    setShowNewDeck(false);
    onOpenDeck(deck.id);
  };

  const handleOpenLocalDeck = async (file: File) => {
    try {
      const deck = await importFile(file);
      onOpenDeck(deck.id);
    } catch {
      // Error shown via context.
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <input
        ref={fileRef}
        type="file"
        accept=".json,.deck.json"
        className="hidden"
        onChange={event => {
          const file = event.target.files?.[0];
          if (file) {
            void handleOpenLocalDeck(file);
          }
          event.currentTarget.value = '';
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-bold text-cream">Deck Library</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewDeck(true)}
            className="px-4 py-2 bg-cyan hover:bg-cyan/90 rounded-lg font-bold text-navy text-sm transition-all"
          >
            + New Deck
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 bg-navy hover:bg-navy-light border border-cyan-dim rounded-lg text-cream font-semibold text-sm transition-all"
          >
            Open Deck
          </button>
        </div>
      </div>

      {capability === 'folder' && (
        <div className="bg-navy-light rounded-lg p-3 border border-cyan-dim flex items-center justify-between">
          {connected ? (
            <>
              <span className="text-sm text-cream-muted">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2" />
                Folder connected - decks auto-save
              </span>
              <button
                onClick={disconnectFolder}
                className="text-xs text-cream-muted hover:text-cream transition-colors"
              >
                Disconnect
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-cream-muted">
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-2" />
                No folder connected - decks stored in memory only
              </span>
              <button
                onClick={connectFolder}
                className="px-3 py-1 bg-cyan/20 hover:bg-cyan/30 border border-cyan/40 rounded-md text-cyan text-xs font-semibold transition-colors"
              >
                Connect Folder
              </button>
            </>
          )}
        </div>
      )}

      {capability === 'fallback' && (
        <div className="bg-navy-light rounded-lg p-3 border border-cyan-dim">
          <span className="text-sm text-cream-muted">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-2" />
            Your browser doesn't support folder sync. Decks are stored in memory - use Export to save.
          </span>
        </div>
      )}

      {decks.length > 0 && (
        <input
          type="text"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search decks..."
          className="w-full bg-navy-light border border-cyan-dim rounded-lg px-4 py-2 text-cream text-sm placeholder-cream-muted/40 focus:outline-none focus:border-cyan"
        />
      )}

      {!loading && recentDecks.length > 0 && !search.trim() && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-cream">Recent Decks</h2>
            <span className="text-xs text-cream-muted">Last updated</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentDecks.map(deck => (
              <DeckListItem
                key={`recent-${deck.id}`}
                deck={deck}
                onOpen={onOpenDeck}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onRename={handleRename}
              />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-center text-cream-muted py-12">Loading decks...</p>
      )}

      {!loading && visibleDecks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-cream">
              {search.trim() ? 'Search Results' : 'All Decks'}
            </h2>
            <span className="text-xs text-cream-muted">
              {visibleDecks.length} deck{visibleDecks.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleDecks.map(deck => (
              <DeckListItem
                key={deck.id}
                deck={deck}
                onOpen={onOpenDeck}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onRename={handleRename}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && decks.length === 0 && (
        <div className="text-center py-16 space-y-4">
          <p className="text-cream-muted text-lg">No decks yet</p>
          <p className="text-cream-muted text-sm">
            Start a new deck manually, import one from Arena format, or open a local deck file.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setShowNewDeck(true)}
              className="px-5 py-2 bg-cyan hover:bg-cyan/90 rounded-lg font-bold text-navy text-sm transition-all"
            >
              + New Deck
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="px-5 py-2 bg-navy hover:bg-navy-light border border-cyan-dim rounded-lg text-cream font-semibold text-sm transition-all"
            >
              Open Deck File
            </button>
          </div>
        </div>
      )}

      {!loading && decks.length > 0 && filteredDecks.length === 0 && (
        <p className="text-center text-cream-muted py-8">
          No decks match "{search}"
        </p>
      )}

      {showNewDeck && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={event => {
            if (event.target === event.currentTarget) {
              setShowNewDeck(false);
            }
          }}
        >
          <NewDeckPanel
            onCreated={handleCreated}
            onCancel={() => setShowNewDeck(false)}
          />
        </div>
      )}
    </div>
  );
}
