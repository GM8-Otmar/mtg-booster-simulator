/**
 * Deck Library state management context.
 *
 * Owns the list of saved decks, folder connection status, and CRUD actions.
 * Wraps deck library and builder flows so deck operations share one source of truth.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { arenaTextToDeckRecord } from '../utils/deckArena';
import { createEmptyDeck, renameDeck as renameRecord } from '../utils/deckRecord';
import { getDeckStorage } from '../services/deckStorage';
import type { DeckStorage } from '../services/deckStorage';
import type {
  DeckFormat,
  DeckRecord,
  DeckStorageCapability,
  DeckSummary,
} from '../types/deck';

// Context type

export interface DeckLibraryContextType {
  decks: DeckSummary[];
  loading: boolean;
  error: string | null;
  capability: DeckStorageCapability;
  connected: boolean;
  connectFolder: () => Promise<boolean>;
  disconnectFolder: () => Promise<void>;
  createDeck: (name?: string, format?: DeckFormat) => Promise<DeckRecord>;
  importArenaText: (text: string, name?: string, format?: DeckFormat) => Promise<DeckRecord>;
  importFile: (file: File) => Promise<DeckRecord>;
  loadDeck: (deckId: string) => Promise<DeckRecord>;
  saveDeck: (deck: DeckRecord) => Promise<void>;
  deleteDeck: (deckId: string) => Promise<void>;
  duplicateDeck: (deckId: string, newName: string) => Promise<DeckRecord>;
  renameDeck: (deckId: string, newName: string) => Promise<void>;
  exportDeck: (deck: DeckRecord) => void;
  refresh: () => Promise<void>;
}

const DeckLibraryContext = createContext<DeckLibraryContextType | undefined>(undefined);

// Provider

export function DeckLibraryProvider({ children }: { children: React.ReactNode }) {
  const [storage] = useState<DeckStorage>(() => getDeckStorage());
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const capability = storage.getCapability();

  useEffect(() => {
    (async () => {
      try {
        setConnected(storage.isConnected());
        const list = await storage.listDecks();
        setDecks(list);
        setConnected(storage.isConnected());
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : 'Failed to load decks');
      } finally {
        setLoading(false);
      }
    })();
  }, [storage]);

  const refresh = useCallback(async () => {
    setError(null);

    try {
      const list = await storage.rescan();
      setDecks(list);
      setConnected(storage.isConnected());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to refresh decks');
    }
  }, [storage]);

  const connectFolder = useCallback(async () => {
    setError(null);
    const ok = await storage.connectFolder();

    if (ok) {
      setConnected(true);
      await refresh();
    }

    return ok;
  }, [refresh, storage]);

  const disconnectFolder = useCallback(async () => {
    await storage.disconnectFolder();
    setConnected(false);
    setDecks([]);
  }, [storage]);

  const createDeck = useCallback(async (name?: string, format?: DeckFormat) => {
    setError(null);

    try {
      const deck = createEmptyDeck({ name: name ?? 'Untitled Deck', format });
      await storage.saveDeck(deck);
      await refresh();
      return deck;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to create deck');
      throw nextError;
    }
  }, [refresh, storage]);

  const importArenaText = useCallback(async (text: string, name?: string, format?: DeckFormat) => {
    setError(null);

    try {
      const deck = arenaTextToDeckRecord(text, { name, format });
      await storage.saveDeck(deck);
      await refresh();
      return deck;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to import deck');
      throw nextError;
    }
  }, [refresh, storage]);

  const importFile = useCallback(async (file: File) => {
    setError(null);

    try {
      const deck = await storage.importDeckFromFile(file);
      await refresh();
      return deck;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to import file');
      throw nextError;
    }
  }, [refresh, storage]);

  const loadDeck = useCallback(async (deckId: string) => {
    setError(null);

    try {
      return await storage.loadDeck(deckId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load deck');
      throw nextError;
    }
  }, [storage]);

  const saveDeck = useCallback(async (deck: DeckRecord) => {
    setError(null);

    try {
      await storage.saveDeck(deck);
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to save deck');
      throw nextError;
    }
  }, [refresh, storage]);

  const deleteDeck = useCallback(async (deckId: string) => {
    setError(null);

    try {
      await storage.deleteDeck(deckId);
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to delete deck');
      throw nextError;
    }
  }, [refresh, storage]);

  const duplicateDeck = useCallback(async (deckId: string, newName: string) => {
    setError(null);

    try {
      const copy = await storage.duplicateDeck(deckId, newName);
      await refresh();
      return copy;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to duplicate deck');
      throw nextError;
    }
  }, [refresh, storage]);

  const renameDeck = useCallback(async (deckId: string, newName: string) => {
    setError(null);

    try {
      const deck = await storage.loadDeck(deckId);
      const renamed = renameRecord(deck, newName);
      await storage.saveDeck(renamed);
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to rename deck');
      throw nextError;
    }
  }, [refresh, storage]);

  const exportDeck = useCallback((deck: DeckRecord) => {
    storage.exportDeckToFile(deck);
  }, [storage]);

  const value: DeckLibraryContextType = {
    decks,
    loading,
    error,
    capability,
    connected,
    connectFolder,
    disconnectFolder,
    createDeck,
    importArenaText,
    importFile,
    loadDeck,
    saveDeck,
    deleteDeck,
    duplicateDeck,
    renameDeck,
    exportDeck,
    refresh,
  };

  return (
    <DeckLibraryContext.Provider value={value}>
      {children}
    </DeckLibraryContext.Provider>
  );
}

// Hook

export function useDeckLibrary(): DeckLibraryContextType {
  const context = useContext(DeckLibraryContext);
  if (!context) {
    throw new Error('useDeckLibrary must be used within DeckLibraryProvider');
  }
  return context;
}
